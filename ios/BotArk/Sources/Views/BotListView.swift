import SwiftUI

struct BotListView: View {
    @Bindable var store: BotArkStore
    @Binding var showQRScanner: Bool
    @Binding var showAddHermes: Bool

    @State private var searchText = ""
    @State private var selectedPlatform: PlatformId? = nil
    @State private var navPath = NavigationPath()

    private var filteredBots: [SyncedBot] {
        store.snapshot.bots.filter { bot in
            if let filter = selectedPlatform, bot.platformId != filter {
                return false
            }
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if query.isEmpty { return true }
            if bot.name.lowercased().contains(query) { return true }
            if bot.platformId.displayName.lowercased().contains(query) { return true }
            if let lastMsg = store.snapshot.messages[bot.id]?.last?.text.lowercased(), lastMsg.contains(query) {
                return true
            }
            return false
        }
    }

    private var pinnedBots: [SyncedBot] {
        filteredBots.filter { $0.pinned == true }
    }

    private var unpinnedBots: [SyncedBot] {
        filteredBots.filter { $0.pinned != true }
    }

    var body: some View {
        NavigationStack(path: $navPath) {
            Group {
                if store.snapshot.bots.isEmpty {
                    emptyOnboardingView
                } else {
                    botListContent
                }
            }
            .background(ArkTheme.canvas.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 7) {
                        Image("BotArkLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 22, height: 22)
                            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                        Text("BotArk")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                    }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showAddHermes = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(width: 30, height: 30)
                            .background(ArkTheme.subtleFill, in: Circle())
                    }
                    .accessibilityLabel("添加 Hermes")

                    Button {
                        showQRScanner = true
                    } label: {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(width: 30, height: 30)
                            .background(ArkTheme.accent.opacity(0.12), in: Circle())
                    }
                    .accessibilityLabel("扫码配对")
                }
            }
            .navigationDestination(for: String.self) { botId in
                ChatView(store: store, botId: botId)
            }
            #if DEBUG
            .task {
                if let openBot = ProcessInfo.processInfo.environment["BOTARK_TEST_OPEN_BOT"],
                   !openBot.isEmpty,
                   navPath.isEmpty {
                    try? await Task.sleep(nanoseconds: 400_000_000)
                    if store.snapshot.bots.contains(where: { $0.id == openBot }) {
                        navPath.append(openBot)
                    }
                }
            }
            #endif
        }
    }

    // MARK: - Minimal, Refined Onboarding

    private var emptyOnboardingView: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 28)

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [ArkTheme.accent.opacity(0.18), .clear],
                            center: .center,
                            startRadius: 8,
                            endRadius: 82
                        )
                    )
                    .frame(width: 164, height: 164)

                Image("BotArkLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 78, height: 78)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .shadow(color: .black.opacity(0.16), radius: 16, y: 8)
            }

            VStack(spacing: 6) {
                Text("把所有 AI 助手装进口袋")
                    .font(.system(size: 20, weight: .bold))
                    .tracking(-0.3)

                Text("零服务器 · 扫码直连电脑端")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 4)

            // Compact 5-platform strip
            HStack(spacing: 8) {
                ForEach(PlatformId.allCases) { platform in
                    VStack(spacing: 5) {
                        PlatformIconView(platform: platform, size: 22)
                        Text(platform.shortLabel)
                            .font(.system(size: 10.5, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
                    )
                }
            }
            .padding(.top, 26)

            VStack(spacing: 10) {
                Button {
                    showQRScanner = true
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 15, weight: .semibold))
                        Text("扫码配对电脑端")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 46)
                    .background(ArkTheme.accent, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                }
                .buttonStyle(.plain)

                Button {
                    showAddHermes = true
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "server.rack")
                            .font(.system(size: 13, weight: .medium))
                        Text("直连 Hermes 服务器")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 13, style: .continuous)
                            .strokeBorder(ArkTheme.hairline, lineWidth: 0.9)
                    )
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 24)

            Spacer()

            HStack(spacing: 14) {
                badgeTag(icon: "wifi", label: "局域网 / Tailscale")
                badgeTag(icon: "lock.fill", label: "AES-256-GCM")
                badgeTag(icon: "key.fill", label: "Keychain")
            }
            .padding(.bottom, 22)
        }
        .padding(.horizontal, 20)
    }

    private func badgeTag(icon: String, label: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
            Text(label)
                .font(.system(size: 10.5, weight: .medium))
        }
        .foregroundStyle(.secondary)
    }

    // MARK: - Sleek Bot Workspace List

    private var botListContent: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                connectionStatusBar

                platformFilterStrip

                if !pinnedBots.isEmpty {
                    botSectionCard(title: "置顶", bots: pinnedBots)
                }

                if store.snapshot.groups.isEmpty {
                    botSectionCard(title: "全部", bots: unpinnedBots)
                } else {
                    ForEach(store.snapshot.groups) { group in
                        let members = unpinnedBots.filter { $0.groupId == group.id }
                        if !members.isEmpty {
                            botSectionCard(title: group.name, bots: members)
                        }
                    }
                    let knownGroupIds = Set(store.snapshot.groups.map(\.id))
                    let ungrouped = unpinnedBots.filter { !knownGroupIds.contains($0.groupId) }
                    if !ungrouped.isEmpty {
                        botSectionCard(title: "其他", bots: ungrouped)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "搜索")
        .refreshable {
            await store.reconnectDesktop()
        }
    }

    private var connectionStatusBar: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(connectionDotColor)
                .frame(width: 7, height: 7)

            Text(connectionTitle)
                .font(.system(size: 12.5, weight: .semibold))
                .lineLimit(1)

            if let meta = connectionMeta {
                Text("·")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                Text(meta)
                    .font(.system(size: 11.5, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 4)

            if case .connecting = store.connectionState {
                ProgressView()
                    .controlSize(.mini)
            } else if store.pairedDesktop != nil, !store.connectionState.isBridgeConnected {
                Button("重连") {
                    Task { await store.reconnectDesktop() }
                }
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(ArkTheme.accent)
            } else if store.pairedDesktop == nil {
                Button("配对") {
                    showQRScanner = true
                }
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(ArkTheme.accent)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
        )
    }

    private var connectionDotColor: Color {
        switch store.connectionState {
        case .connected: return Color(red: 0.13, green: 0.77, blue: 0.37)
        case .connecting: return .orange
        case .offline, .unpaired: return store.directHermesCredentials.isEmpty ? .gray : ArkTheme.accent
        }
    }

    private var connectionTitle: String {
        switch store.connectionState {
        case .connected(let hostName, _): return hostName
        case .connecting: return "连接中..."
        case .offline(let hostName): return "\(hostName) 离线"
        case .unpaired: return store.directHermesCredentials.isEmpty ? "未配对" : "Hermes 直连"
        }
    }

    private var connectionMeta: String? {
        switch store.connectionState {
        case .connected(_, let activeHost): return activeHost
        case .offline: return store.directHermesCredentials.isEmpty ? "离线缓存" : "Hermes 可直连"
        default: return nil
        }
    }

    private var platformFilterStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                filterChip(title: "全部", platform: nil, count: store.snapshot.bots.count)
                ForEach(PlatformId.allCases) { platform in
                    let count = store.snapshot.bots.filter { $0.platformId == platform }.count
                    if count > 0 {
                        filterChip(title: platform.shortLabel, platform: platform, count: count)
                    }
                }
            }
        }
    }

    private func filterChip(title: String, platform: PlatformId?, count: Int) -> some View {
        let active = selectedPlatform == platform
        return Button {
            withAnimation(.snappy(duration: 0.18)) {
                selectedPlatform = platform
            }
        } label: {
            HStack(spacing: 4) {
                if let platform {
                    PlatformIconView(platform: platform, size: 13)
                }
                Text(title)
                    .font(.system(size: 12, weight: active ? .semibold : .medium))
                Text("\(count)")
                    .font(.system(size: 10.5, weight: .semibold))
                    .foregroundStyle(active ? .white.opacity(0.8) : .secondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(active ? ArkTheme.accent : ArkTheme.surface, in: Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(active ? .clear : ArkTheme.hairline, lineWidth: 0.8)
            )
            .foregroundStyle(active ? .white : .primary)
        }
        .buttonStyle(.plain)
    }

    private func botSectionCard(title: String, bots: [SyncedBot]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 11.5, weight: .semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)

            VStack(spacing: 0) {
                ForEach(Array(bots.enumerated()), id: \.element.id) { idx, bot in
                    NavigationLink(value: bot.id) {
                        botRow(bot)
                    }
                    .buttonStyle(.plain)

                    if idx < bots.count - 1 {
                        Divider()
                            .padding(.leading, 62)
                    }
                }
            }
            .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
            )
        }
    }

    private func botRow(_ bot: SyncedBot) -> some View {
        let status = store.status(for: bot)
        let lastMsg = store.snapshot.messages[bot.id]?.last
        let isTyping = store.typingByBotId[bot.id] == true
        let pendingCount = (store.snapshot.approvals[bot.activeAccountId] ?? []).filter { $0.status == "pending" }.count

        return HStack(spacing: 11) {
            BotAvatarView(bot: bot, status: status, size: 40)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(bot.name)
                        .font(.system(size: 14.5, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    PlatformBadgePill(platform: bot.platformId)
                    Spacer(minLength: 4)
                    if let ts = lastMsg?.createdAt, ts > 0 {
                        Text(Self.formatShortTime(ts))
                            .font(.system(size: 11))
                            .foregroundStyle(.tertiary)
                            .fixedSize()
                    }
                }

                HStack(spacing: 6) {
                    if isTyping {
                        Text("正在回复...")
                            .font(.system(size: 12.5))
                            .foregroundStyle(ArkTheme.accent)
                    } else if let text = lastMsg?.text, !text.isEmpty {
                        Text(text.replacingOccurrences(of: "\n", with: " "))
                            .font(.system(size: 12.5))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    } else {
                        Text(bot.platformId.displayName)
                            .font(.system(size: 12))
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 4)

                    if pendingCount > 0 {
                        Text("\(pendingCount) 审批")
                            .font(.system(size: 10.5, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.95, green: 0.56, blue: 0.05), in: Capsule())
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    private static func formatShortTime(_ ms: Double) -> String {
        let date = Date(timeIntervalSince1970: ms / 1000)
        let cal = Calendar.current
        let fmt = DateFormatter()
        fmt.dateFormat = cal.isDateInToday(date) ? "HH:mm" : "MM/dd"
        return fmt.string(from: date)
    }
}
