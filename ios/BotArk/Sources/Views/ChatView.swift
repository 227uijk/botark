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
            if !botApprovals.isEmpty {
                VStack(spacing: 6) {
                    ForEach(botApprovals) { item in
                        InlineApprovalCard(item: item) { decision in
                            Task { await store.decideApproval(item: item, decision: decision) }
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if messages.isEmpty {
                            VStack(spacing: 8) {
                                BotAvatarView(bot: bot, status: store.status(for: bot), size: 50)
                                Text(bot.name)
                                    .font(.system(size: 15, weight: .semibold))
                                PlatformBadgePill(platform: bot.platformId)
                            }
                            .padding(.top, 64)
                        } else {
                            ForEach(messages) { message in
                                MessageBubbleRow(message: message)
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
                    .padding(.vertical, 12)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: messages.count) { _, _ in
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
                .onChange(of: messages.last?.text) { _, _ in
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
                .onChange(of: isTyping) { _, newVal in
                    if newVal { scrollToBottom(proxy: proxy, isTyping: true) }
                }
                .onAppear {
                    scrollToBottom(proxy: proxy, isTyping: isTyping)
                }
            }

            // Sleek floating composer bar
            HStack(alignment: .bottom, spacing: 8) {
                TextField(
                    canSend ? "发消息给 \(bot.name)" : "离线只读",
                    text: $draft,
                    axis: .vertical
                )
                .font(.system(size: 14))
                .lineLimit(1...5)
                .focused($composerFocused)
                .disabled(!canSend)
                .padding(.horizontal, 13)
                .padding(.vertical, 8)
                .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(ArkTheme.hairline, lineWidth: 0.9)
                )

                if isTyping {
                    Button {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        store.stopGeneration(for: bot)
                    } label: {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(Color.red, in: Circle())
                    }
                    .accessibilityLabel("停止")
                } else {
                    let ready = canSend && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    Button {
                        let textToSend = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !textToSend.isEmpty else { return }
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        draft = ""
                        Task { await store.sendMessage(to: bot, text: textToSend) }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(ready ? ArkTheme.accent : Color.secondary.opacity(0.28), in: Circle())
                    }
                    .disabled(!ready)
                    .accessibilityLabel("发送")
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(ArkTheme.canvas)
            .overlay(alignment: .top) {
                Divider()
            }
        }
        .background(ArkTheme.canvas.ignoresSafeArea())
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 7) {
                    PlatformIconView(platform: bot.platformId, size: 17)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(bot.name)
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                        HStack(spacing: 4) {
                            Circle()
                                .fill(store.status(for: bot).dotColor)
                                .frame(width: 5.5, height: 5.5)
                            Text(shortTransportLabel(for: bot))
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                if bot.platformId.supportsQuickNewSession {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        store.startNewSession(for: bot)
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 14))
                    }
                    .disabled(!canSend)
                    .accessibilityLabel("新对话")
                }
            }
        }
    }

    private func shortTransportLabel(for bot: SyncedBot) -> String {
        if case .connected(let host, _) = store.connectionState {
            return "\(host) 桥接"
        }
        if store.directCredential(for: bot) != nil {
            return "Hermes 直连"
        }
        return "离线"
    }

    private func scrollToBottom(proxy: ScrollViewProxy, isTyping: Bool) {
        withAnimation(.easeOut(duration: 0.18)) {
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

    var body: some View {
        HStack(alignment: .bottom) {
            if message.isUser { Spacer(minLength: 52) }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 5) {
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
                                .frame(maxWidth: 230, maxHeight: 230)
                                .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        }
                    }
                }

                if !message.text.isEmpty {
                    markdownText(message.text)
                        .font(.system(size: 14))
                        .lineSpacing(3)
                        .foregroundStyle(message.isUser ? .white : .primary)
                        .textSelection(.enabled)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .background(
                            message.isUser ? ArkTheme.accent : ArkTheme.surface,
                            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(message.isUser ? .clear : ArkTheme.hairline, lineWidth: 0.8)
                        )
                }

                if let error = message.error, !error.isEmpty {
                    Label(error, systemImage: "exclamationmark.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.red)
                } else if message.isUser && message.delivery == "sending" {
                    Text("发送中")
                        .font(.system(size: 10.5))
                        .foregroundStyle(.tertiary)
                }
            }

            if !message.isUser { Spacer(minLength: 42) }
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
        HStack(spacing: 5) {
            statusIcon
            Text(tool.name)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
            if let summary = tool.summary, !summary.isEmpty {
                Text(summary)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(ArkTheme.surface, in: Capsule())
        .overlay(
            Capsule().strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
        )
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch tool.status {
        case "running":
            ProgressView().controlSize(.mini)
        case "completed":
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 11))
                .foregroundStyle(Color(red: 0.13, green: 0.77, blue: 0.37))
        case "errored", "failed":
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 11))
                .foregroundStyle(.red)
        default:
            Image(systemName: "terminal.fill")
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
        }
    }
}

private struct TypingIndicatorBubble: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { idx in
                Circle()
                    .fill(Color.secondary.opacity(phase == idx ? 0.85 : 0.25))
                    .frame(width: 6, height: 6)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
        )
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 340_000_000)
                withAnimation(.easeInOut(duration: 0.22)) {
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
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.orange)
                Text(item.approval.title)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                Spacer()
            }

            if let detail = item.approval.detail, !detail.isEmpty {
                Text(detail)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 7) {
                actionPill(title: "允许", style: .primary) { onDecide("allow_once") }
                actionPill(title: "本次会话", style: .secondary) { onDecide("allow_session") }
                Spacer()
                actionPill(title: "拒绝", style: .destructive) { onDecide("deny") }
            }
        }
        .padding(11)
        .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .strokeBorder(Color.orange.opacity(0.35), lineWidth: 1)
        )
    }

    private enum PillStyle { case primary, secondary, destructive }

    private func actionPill(title: String, style: PillStyle, action: @escaping () -> Void) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        } label: {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .padding(.horizontal, 11)
                .padding(.vertical, 5)
                .foregroundStyle(style == .primary ? .white : (style == .destructive ? .red : .primary))
                .background(
                    style == .primary
                        ? ArkTheme.accent
                        : (style == .destructive ? Color.red.opacity(0.10) : ArkTheme.subtleFill),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }
}
