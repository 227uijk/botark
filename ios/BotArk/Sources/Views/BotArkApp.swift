import SwiftUI

@main
struct BotArkApp: App {
    @State private var store = BotArkStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootTabView(store: store)
                .onOpenURL { url in
                    if url.scheme?.lowercased() == "botark" {
                        Task {
                            await store.pair(withUri: url.absoluteString)
                        }
                    }
                }
                #if DEBUG
                .task {
                    if let testUri = ProcessInfo.processInfo.environment["BOTARK_TEST_PAIR_URI"],
                       !testUri.isEmpty {
                        await store.pair(withUri: testUri)
                    }
                }
                #endif
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active, store.pairedDesktop != nil, !store.connectionState.isBridgeConnected {
                        Task {
                            await store.reconnectDesktop()
                        }
                    }
                }
        }
    }
}
