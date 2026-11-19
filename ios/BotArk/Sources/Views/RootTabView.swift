import SwiftUI

enum BotArkTab: Hashable {
    case chats
    case approvals
    case sync
}

struct RootTabView: View {
    @Bindable var store: BotArkStore
    @State private var selectedTab: BotArkTab = .chats
    @State private var showQRScanner = false
    @State private var showAddHermes = false

    var body: some View {
        TabView(selection: $selectedTab) {
            BotListView(
                store: store,
                showQRScanner: $showQRScanner,
                showAddHermes: $showAddHermes
            )
            .tabItem {
                Label("对话", systemImage: "bubble.left.and.bubble.right.fill")
            }
            .tag(BotArkTab.chats)

            ApprovalsView(store: store)
                .tabItem {
                    Label("审批", systemImage: "checkmark.shield.fill")
                }
                .badge(store.pendingApprovals.count)
                .tag(BotArkTab.approvals)

            SyncSettingsView(
                store: store,
                showQRScanner: $showQRScanner,
                showAddHermes: $showAddHermes
            )
            .tabItem {
                Label("同步", systemImage: "qrcode.viewfinder")
            }
            .tag(BotArkTab.sync)
        }
        .tint(Color("AccentColor"))
        .sheet(isPresented: $showQRScanner) {
            QRScannerSheet(store: store)
        }
        .sheet(isPresented: $showAddHermes) {
            AddStandaloneHermesSheet(store: store)
        }
        #if DEBUG
        .onAppear {
            switch ProcessInfo.processInfo.environment["BOTARK_TEST_TAB"] {
            case "approvals": selectedTab = .approvals
            case "sync": selectedTab = .sync
            default: break
            }
        }
        #endif
    }
}
