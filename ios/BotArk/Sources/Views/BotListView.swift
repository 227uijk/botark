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
            .navigationTitle("BotArk")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showAddHermes = true
                    } label: {
                        Image(systemName: "plus.circle")
                    }
                    .accessibilityLabel("添加独立 Hermes")

                    Button {
                        showQRScanner = true
                    } label: {
                        Image(systemName: "qrcode.viewfinder")
                            .fontWeight(.semibold)
                    }
                    .accessibilityLabel("扫码配对电脑端")
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

    private var emptyOnboardingView: some View {
        ScrollView {
            VStack(spacing: 22) {
                Spacer(minLength: 18)

                Image("BotArkLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 96, height: 96)
                    .shadow(color: Color("AccentColor").opacity(0.24), radius: 18, y: 8)

                VStack(spacing: 8) {
                    Text("扫码即刻同步你的 AI 智能体")
                        .font(.title2.bold())
                        .multilineTextAlignment(.center)
                    Text("零服务器、零云端中转。在同一 Wi-Fi、手机热点或 Tailscale 下扫一扫电脑端二维码，即可把 Grok Bot、Meta Muse、ChatGPT Dot、Hark 与 Hermes 全部装进口袋。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                }

                // 5 platform chips showcase
                HStack(spacing: 8) {
                    ForEach(PlatformId.allCases) { platform in
                        VStack(spacing: 5) {
                            PlatformIconView(platform: platform, size: 28)
                            Text(platform.shortLabel)
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                    }
                }

                VStack(spacing: 12) {
                    Button {
                        showQRScanner = true
                    } label: {
                        Label("扫码配对电脑端 BotArk", systemImage: "qrcode.viewfinder")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                    .buttonStyle(.borderedProminent)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                    Button {
                        showAddHermes = true
                    } label: {
                        Label("无需电脑：直接接入 Hermes 服务器", systemImage: "server.rack")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.bordered)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 10) {
                    featureRow(
                        icon: "wifi",
                        color: .blue,
                        title: "局域网 / Tailscale 实时桥接",
                        detail: "扫码建立端到端配对，手机端实时流式收发所有 5 个平台对话与安全审批。"
                    )
                    featureRow(
                        icon: "lock.fill",
                        color: .green,
                        title: "离线 AirDrop 加密包 & 脱机直连",
                        detail: "支持隔空投送 AES-256-GCM 加密的 .botark-sync 同步包；Hermes 凭据写入 iOS Keychain，电脑休眠也能直连。"
                    )
                }
                .padding(16)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Color(uiColor: .systemGroupedBackground))
    }

    private func featureRow(icon: String, color: Color, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(color)
                .frame(width: 30, height: 30)
                .background(color.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var botListContent: some View {
        List {
            Section {
                connectionStatusRow
            }
            .listRowInsets(EdgeInsets(top: 8, leading: 14, bottom: 8, trailing: 14))

            Section {
                platformFilterStrip
            }
            .listRowInsets(EdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12))
            .listRowBackground(Color.clear)

            if !pinnedBots.isEmpty {
                Section("置顶") {
                    ForEach(pinnedBots) { bot in
                        botNavigationRow(bot)
                    }
                }
            }

            if store.snapshot.groups.isEmpty {
                Section("全部智能体") {
                    ForEach(unpinnedBots) { bot in
                        botNavigationRow(bot)
                    }
                }
            } else {
                ForEach(store.snapshot.groups) { group in
                    let members = unpinnedBots.filter { $0.groupId == group.id }
                    if !members.isEmpty {
                        Section(group.name) {
                            ForEach(members) { bot in
                                botNavigationRow(bot)
                            }
                        }
                    }
                }
                let knownGroupIds = Set(store.snapshot.groups.map(\.id))
                let ungrouped = unpinnedBots.filter { !knownGroupIds.contains($0.groupId) }
                if !ungrouped.isEmpty {
                    Section("其他") {
                        ForEach(ungrouped) { bot in
                            botNavigationRow(bot)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .searchable(text: $searchText, prompt: "搜索智能体或聊天内容")
        .refreshable {
            await store.reconnectDesktop()
        }
    }

    private var connectionStatusRow: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(connectionDotColor)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: 2) {
                Text(connectionTitle)
                    .font(.subheadline.weight(.semibold))
                Text(connectionSubtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if case .connecting = store.connectionState {
                ProgressView()
                    .controlSize(.small)
            } else if store.pairedDesktop != nil, !store.connectionState.isBridgeConnected {
                Button("重连") {
                    Task { await store.reconnectDesktop() }
                }
                .font(.caption.weight(.semibold))
                .buttonStyle(.bordered)
                .controlSize(.small)
            } else if store.pairedDesktop == nil {
                Button("扫码同步") {
                    showQRScanner = true
                }
                .font(.caption.weight(.semibold))
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
    }

    private var connectionDotColor: Color {
        switch store.connectionState {
        case .connected: return .green
        case .connecting: return .orange
        case .offline: return store.directHermesCredentials.isEmpty ? .gray : .blue
        case .unpaired: return store.directHermesCredentials.isEmpty ? .gray : .blue
        }
    }

    private var connectionTitle: String {
        switch store.connectionState {
        case .connected(let hostName, _):
            return "已实时连接 \(hostName)"
        case .connecting:
            return "正在连接电脑端..."
        case .offline(let hostName):
            return "\(hostName) 当前离线"
        case .unpaired:
            return store.directHermesCredentials.isEmpty ? "未配对电脑端" : "Hermes 独立直连模式"
        }
    }

    private var connectionSubtitle: String {
        switch store.connectionState {
        case .connected(_, let activeHost):
            return "零服务器局域网直连 · \(activeHost)"
        case .connecting:
            return "正在探测局域网与 Tailscale 地址"
        case .offline:
            return store.directHermesCredentials.isEmpty
                ? "离线浏览缓存，回到同一 Wi-Fi 自动恢复"
                : "已配对 Hermes 仍可脱机直连对话"
        case .unpaired:
            return "点击右上角扫一扫同步电脑端全部智能体"
        }
    }

    private var platformFilterStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterChip(title: "全部", platform: nil, count: store.snapshot.bots.count)
                ForEach(PlatformId.allCases) { platform in
                    let count = store.snapshot.bots.filter { $0.platformId == platform }.count
                    if count > 0 {
                        filterChip(title: platform.shortLabel, platform: platform, count: count)
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func filterChip(title: String, platform: PlatformId?, count: Int) -> some View {
        let active = selectedPlatform == platform
        return Button {
            withAnimation(.snappy(duration: 0.2)) {
                selectedPlatform = platform
            }
        } label: {
            HStack(spacing: 5) {
                if let platform {
                    PlatformIconView(platform: platform, size: 15)
                }
                Text("\(title) \(count)")
                    .font(.caption.weight(.semibold))
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(
                active ? Color("AccentColor") : Color(uiColor: .secondarySystemGroupedBackground),
                in: Capsule()
            )
            .foregroundStyle(active ? .white : .primary)
        }
        .buttonStyle(.plain)
    }

    private func botNavigationRow(_ bot: SyncedBot) -> some View {
        let status = store.status(for: bot)
        let lastMsg = store.snapshot.messages[bot.id]?.last
        let isTyping = store.typingByBotId[bot.id] == true
        let pendingCount = (store.snapshot.approvals[bot.activeAccountId] ?? []).filter { $0.status == "pending" }.count

        return NavigationLink(value: bot.id) {
            HStack(spacing: 12) {
                BotAvatarView(bot: bot, status: status, size: 46)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(bot.name)
                            .font(.body.weight(.semibold))
                            .lineLimit(1)
                            .truncationMode(.tail)
                        PlatformBadgePill(platform: bot.platformId)
                        Spacer(minLength: 4)
                        if let ts = lastMsg?.createdAt, ts > 0 {
                            Text(Self.formatShortTime(ts))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .fixedSize()
                        }
                    }

                    HStack(spacing: 6) {
                        if isTyping {
                            Text("正在生成回复...")
                                .font(.subheadline)
                                .foregroundStyle(Color("AccentColor"))
                        } else if let text = lastMsg?.text, !text.isEmpty {
                            Text(text.replacingOccurrences(of: "\n", with: " "))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        } else {
                            Text(store.transportSummary(for: bot))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }

                        Spacer(minLength: 4)

                        if pendingCount > 0 {
                            Text("\(pendingCount) 审批")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(Color.orange, in: Capsule())
                        }
                    }
                }
            }
            .padding(.vertical, 3)
        }
    }

    private static func formatShortTime(_ ms: Double) -> String {
        let date = Date(timeIntervalSince1970: ms / 1000)
        let cal = Calendar.current
        let fmt = DateFormatter()
        if cal.isDateInToday(date) {
            fmt.dateFormat = "HH:mm"
        } else {
            fmt.dateFormat = "MM/dd"
        }
        return fmt.string(from: date)
    }
}
