import SwiftUI
import UIKit

struct ChatView: View {
    @Bindable var store: BotArkStore
    let botId: String

    @State private var draft = ""
    @FocusState private var composerFocused: Bool

    private var bot: SyncedBot? {
        store.snapshot.bots.first { $0.id == botId }
    }

    private var messages: [SyncedMessage] {
        store.snapshot.messages[botId] ?? []
    }

    private var botApprovals: [PendingApprovalItem] {
        guard let bot else { return [] }
        return store.pendingApprovals.filter { $0.accountId == bot.activeAccountId }
    }

    var body: some View {
        Group {
            if let bot {
                chatContent(for: bot)
            } else {
                ContentUnavailableView("智能体已移除", systemImage: "bubble.left.and.exclamationmark.bubble.right")
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func chatContent(for bot: SyncedBot) -> some View {
        let isTyping = store.typingByBotId[bot.id] == true
        let canSend = store.canSend(to: bot)

        return VStack(spacing: 0) {
            // Transport status strip
            HStack(spacing: 6) {
                Circle()
                    .fill(store.status(for: bot).dotColor)
                    .frame(width: 7, height: 7)
                Text(store.transportSummary(for: bot))
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
                if let account = store.snapshot.accounts[bot.activeAccountId], !account.handle.isEmpty {
                    Text(account.handle)
                        .font(.caption2.monospaced())
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(Color(uiColor: .secondarySystemBackground))

            // Inline pending security approvals for this bot
            if !botApprovals.isEmpty {
                VStack(spacing: 8) {
                    ForEach(botApprovals) { item in
                        InlineApprovalCard(item: item) { decision in
                            Task { await store.decideApproval(item: item, decision: decision) }
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.08))
            }

            // Messages list
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            VStack(spacing: 10) {
                                BotAvatarView(bot: bot, status: store.status(for: bot), size: 58)
                                Text(bot.name)
                                    .font(.headline)
                                PlatformBadgePill(platform: bot.platformId)
                                Text("向 \(bot.name) 发送第一条消息")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.top, 56)
                        } else {
                            ForEach(messages) { message in
                                MessageBubbleRow(message: message, platform: bot.platformId)
                                    .id(message.id)
                            }
                        }

                        if isTyping {
                            HStack {
                                TypingIndicatorBubble()
                                Spacer(minLength: 60)
                            }
                            .id("typing-indicator")
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 14)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: messages.count) { _, _ in
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
                .onChange(of: messages.last?.text) { _, _ in
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
                .onChange(of: isTyping) { _, newVal in
                    if newVal {
                        scrollToBottom(proxy: proxy, isTyping: true)
                    }
                }
                .onAppear {
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
            }

            Divider()

            // Composer bar
            HStack(alignment: .bottom, spacing: 10) {
                TextField(
                    canSend ? "给 \(bot.name) 发消息..." : "电脑端离线（只读缓存）",
                    text: $draft,
                    axis: .vertical
                )
                .lineLimit(1...5)
                .focused($composerFocused)
                .disabled(!canSend)
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))

                if isTyping {
                    Button {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        store.stopGeneration(for: bot)
                    } label: {
                        Image(systemName: "stop.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(.red)
                    }
                    .accessibilityLabel("停止生成")
                } else {
                    Button {
                        let textToSend = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !textToSend.isEmpty else { return }
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        draft = ""
                        Task {
                            await store.sendMessage(to: bot, text: textToSend)
                        }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(
                                canSend && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                    ? Color("AccentColor")
                                    : Color.secondary.opacity(0.35)
                            )
                    }
                    .disabled(!canSend || draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityLabel("发送")
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(Color(uiColor: .systemBackground))
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 7) {
                    PlatformIconView(platform: bot.platformId, size: 18)
                    Text(bot.name)
                        .font(.headline)
                        .lineLimit(1)
                }
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                if bot.platformId.supportsQuickNewSession {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        store.startNewSession(for: bot)
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .disabled(!canSend)
                    .accessibilityLabel("开启新对话")
                }
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy, isTyping: Bool) {
        withAnimation(.easeOut(duration: 0.2)) {
            if isTyping {
                proxy.scrollTo("typing-indicator", anchor: .bottom)
            } else if let lastId = messages.last?.id {
                proxy.scrollTo(lastId, anchor: .bottom)
            }
        }
    }
}

private struct MessageBubbleRow: View {
    let message: SyncedMessage
    let platform: PlatformId

    var body: some View {
        HStack(alignment: .bottom) {
            if message.isUser { Spacer(minLength: 48) }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 6) {
                if let tools = message.tools, !tools.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(tools) { tool in
                            ToolCallPill(tool: tool)
                        }
                    }
                }

                if let media = message.media, !media.isEmpty {
                    ForEach(Array(media.enumerated()), id: \.offset) { _, part in
                        if part.kind == "image", let img = BotAvatarView.decodeBase64Image(part.path) {
                            Image(uiImage: img)
                                .resizable()
                                .scaledToFit()
                                .frame(maxWidth: 240, maxHeight: 240)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }
                }

                if !message.text.isEmpty {
                    markdownText(message.text)
                        .font(.body)
                        .foregroundStyle(message.isUser ? .white : .primary)
                        .textSelection(.enabled)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            message.isUser
                                ? AnyShapeStyle(Color("AccentColor"))
                                : AnyShapeStyle(Color(uiColor: .secondarySystemBackground)),
                            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                        )
                }

                if let error = message.error, !error.isEmpty {
                    Label(error, systemImage: "exclamationmark.circle.fill")
                        .font(.caption2)
                        .foregroundStyle(.red)
                } else if message.isUser && message.delivery == "sending" {
                    Text("发送中...")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            if !message.isUser { Spacer(minLength: 44) }
        }
    }

    private func markdownText(_ raw: String) -> Text {
        if let attr = try? AttributedString(
            markdown: raw,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            return Text(attr)
        }
        return Text(raw)
    }
}

private struct ToolCallPill: View {
    let tool: SyncedToolCall

    var body: some View {
        HStack(spacing: 6) {
            statusIcon
            Text(tool.name)
                .font(.caption.weight(.semibold))
            if let summary = tool.summary, !summary.isEmpty {
                Text(summary)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color(uiColor: .tertiarySystemBackground), in: Capsule())
        .overlay(
            Capsule().strokeBorder(Color(uiColor: .separator).opacity(0.45), lineWidth: 0.75)
        )
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch tool.status {
        case "running":
            ProgressView()
                .controlSize(.mini)
        case "completed":
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case "errored", "failed":
            Image(systemName: "xmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.red)
        default:
            Image(systemName: "wrench.and.screwdriver.fill")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct TypingIndicatorBubble: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { idx in
                Circle()
                    .fill(Color.secondary.opacity(phase == idx ? 0.9 : 0.3))
                    .frame(width: 7, height: 7)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 340_000_000)
                withAnimation(.easeInOut(duration: 0.25)) {
                    phase = (phase + 1) % 3
                }
            }
        }
    }
}

struct InlineApprovalCard: View {
    let item: PendingApprovalItem
    let onDecide: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.shield.fill")
                    .foregroundStyle(.orange)
                Text(item.approval.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Spacer()
            }

            if let detail = item.approval.detail, !detail.isEmpty {
                Text(detail)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            HStack(spacing: 8) {
                Button("允许本次") {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onDecide("allow_once")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)

                Button("本次会话允许") {
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    onDecide("allow_session")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                Spacer()

                Button("拒绝", role: .destructive) {
                    UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
                    onDecide("deny")
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(12)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.orange.opacity(0.45), lineWidth: 1)
        )
    }
}
