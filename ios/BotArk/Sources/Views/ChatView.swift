import SwiftUI
import UIKit

struct ChatView: View {
    @Bindable var store: BotArkStore
    let botId: String
    let onBack: () -> Void

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
                studioCanvas(for: bot)
            } else {
                VStack(spacing: 12) {
                    Text("智能体已移除")
                        .font(ArkFont.medium(14))
                        .foregroundStyle(.secondary)
                    Button("返回", action: onBack)
                        .font(ArkFont.semibold(13))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(ArkTheme.canvas.ignoresSafeArea())
            }
        }
    }

    private func studioCanvas(for bot: SyncedBot) -> some View {
        let isTyping = store.typingByBotId[bot.id] == true
        let canSend = store.canSend(to: bot)

        return VStack(spacing: 0) {
            // Custom minimal studio header
            HStack(spacing: 10) {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.primary)
                        .frame(width: 34, height: 34)
                        .background(ArkTheme.surface, in: Circle())
                        .overlay(Circle().strokeBorder(ArkTheme.hairline, lineWidth: 0.8))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("返回")

                PlatformIconView(platform: bot.platformId, size: 22)

                VStack(alignment: .leading, spacing: 1) {
                    Text(bot.name)
                        .font(ArkFont.semibold(14.5))
                        .lineLimit(1)
                    HStack(spacing: 4) {
                        LivingPulseDot(
                            color: store.status(for: bot).dotColor,
                            size: 5.5,
                            animated: store.status(for: bot).isLive
                        )
                        Text(shortTransportLabel(for: bot))
                            .font(ArkFont.medium(10.5))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if bot.platformId.supportsQuickNewSession {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        store.startNewSession(for: bot)
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 13.5, weight: .medium))
                            .foregroundStyle(canSend ? .primary : .tertiary)
                            .frame(width: 34, height: 34)
                            .background(ArkTheme.surface, in: Circle())
                            .overlay(Circle().strokeBorder(ArkTheme.hairline, lineWidth: 0.8))
                    }
                    .buttonStyle(.plain)
                    .disabled(!canSend)
                    .accessibilityLabel("新对话")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(ArkTheme.canvas)

            // Floating editorial approval card(s)
            if !botApprovals.isEmpty {
                VStack(spacing: 6) {
                    ForEach(botApprovals) { item in
                        InlineApprovalCard(item: item) { decision in
                            Task { await store.decideApproval(item: item, decision: decision) }
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 2)
                .padding(.bottom, 6)
            }

            // Messages canvas
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        if messages.isEmpty {
                            VStack(spacing: 8) {
                                BotAvatarView(bot: bot, status: store.status(for: bot), size: 52)
                                Text(bot.name)
                                    .font(ArkFont.semibold(15))
                                PlatformBadgePill(platform: bot.platformId)
                            }
                            .padding(.top, 72)
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
                    .padding(.vertical, 10)
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

            // Floating tactile pill composer
            HStack(alignment: .bottom, spacing: 8) {
                TextField(
                    canSend ? "给 \(bot.name) 发消息..." : "离线只读",
                    text: $draft,
                    axis: .vertical
                )
                .font(ArkFont.regular(14))
                .lineLimit(1...5)
                .focused($composerFocused)
                .disabled(!canSend)
                .padding(.leading, 14)
                .padding(.vertical, 9)

                if isTyping {
                    Button {
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        store.stopGeneration(for: bot)
                    } label: {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(ArkTheme.rose, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .padding(4)
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
                            .font(.system(size: 13.5, weight: .bold))
                            .foregroundStyle(ready ? ArkTheme.onInk : .secondary)
                            .frame(width: 32, height: 32)
                            .background(ready ? ArkTheme.ink : ArkTheme.subtleFill, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(!ready)
                    .padding(4)
                }
            }
            .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .strokeBorder(ArkTheme.hairline, lineWidth: 0.9)
            )
            .shadow(color: ArkTheme.cardShadow, radius: 12, y: 4)
            .padding(.horizontal, 14)
            .padding(.top, 6)
            .padding(.bottom, 10)
        }
        .background(ArkTheme.canvas.ignoresSafeArea())
    }

    private func shortTransportLabel(for bot: SyncedBot) -> String {
        if case .connected(let host, _) = store.connectionState {
            return "\(host) · 桥接"
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
                                .frame(maxWidth: 230, maxHeight: 230)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                    }
                }

                if !message.text.isEmpty {
                    let bubbleShape = UnevenRoundedRectangle(
                        topLeadingRadius: 18,
                        bottomLeadingRadius: message.isUser ? 18 : 6,
                        bottomTrailingRadius: message.isUser ? 6 : 18,
                        topTrailingRadius: 18,
                        style: .continuous
                    )
                    markdownText(message.text)
                        .font(ArkFont.regular(13.8))
                        .lineSpacing(3.5)
                        .foregroundStyle(message.isUser ? ArkTheme.onInk : .primary)
                        .textSelection(.enabled)
                        .padding(.horizontal, 13)
                        .padding(.vertical, 10)
                        .background(message.isUser ? ArkTheme.ink : ArkTheme.surface, in: bubbleShape)
                        .overlay(
                            bubbleShape.strokeBorder(message.isUser ? .clear : ArkTheme.hairline, lineWidth: 0.8)
                        )
                        .shadow(color: ArkTheme.cardShadow, radius: message.isUser ? 10 : 8, y: 3)
                }

                if let error = message.error, !error.isEmpty {
                    Label(error, systemImage: "exclamationmark.circle.fill")
                        .font(ArkFont.medium(11))
                        .foregroundStyle(ArkTheme.rose)
                } else if message.isUser && message.delivery == "sending" {
                    Text("发送中")
                        .font(ArkFont.mono(10))
                        .foregroundStyle(.tertiary)
                }
            }

            if !message.isUser { Spacer(minLength: 36) }
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
                .font(ArkFont.mono(10.5))
                .foregroundStyle(.primary)
            if let summary = tool.summary, !summary.isEmpty {
                Text(summary)
                    .font(ArkFont.regular(11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 4.5)
        .background(ArkTheme.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(ArkTheme.hairline, lineWidth: 0.8))
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch tool.status {
        case "running":
            ProgressView().controlSize(.mini)
        case "completed":
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 11))
                .foregroundStyle(ArkTheme.emerald)
        case "errored", "failed":
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 11))
                .foregroundStyle(ArkTheme.rose)
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
        HStack(spacing: 4.5) {
            ForEach(0..<3, id: \.self) { idx in
                Circle()
                    .fill(Color.secondary.opacity(phase == idx ? 0.85 : 0.25))
                    .frame(width: 6, height: 6)
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 10)
        .background(ArkTheme.surface, in: Capsule())
        .overlay(Capsule().strokeBorder(ArkTheme.hairline, lineWidth: 0.8))
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
                    .foregroundStyle(ArkTheme.amber)
                Text(item.approval.title)
                    .font(ArkFont.semibold(12.5))
                    .lineLimit(1)
                Spacer()
            }

            if let detail = item.approval.detail, !detail.isEmpty {
                Text(detail)
                    .font(ArkFont.mono(10.5))
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
        .padding(12)
        .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(ArkTheme.amber.opacity(0.45), lineWidth: 1)
        )
        .shadow(color: ArkTheme.amber.opacity(0.08), radius: 10, y: 4)
    }

    private enum PillStyle { case primary, secondary, destructive }

    private func actionPill(title: String, style: PillStyle, action: @escaping () -> Void) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        } label: {
            Text(title)
                .font(ArkFont.semibold(11.5))
                .padding(.horizontal, 12)
                .padding(.vertical, 5.5)
                .foregroundStyle(
                    style == .primary ? ArkTheme.onInk : (style == .destructive ? ArkTheme.rose : .primary)
                )
                .background(
                    style == .primary
                        ? ArkTheme.ink
                        : (style == .destructive ? ArkTheme.rose.opacity(0.10) : ArkTheme.subtleFill),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }
}
