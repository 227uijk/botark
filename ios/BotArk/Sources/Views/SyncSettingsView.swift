import SwiftUI
import UniformTypeIdentifiers

struct SyncSettingsView: View {
    @Bindable var store: BotArkStore
    @Binding var showQRScanner: Bool
    @Binding var showAddHermes: Bool

    @State private var showBundleImporter = false
    @State private var pendingBundleData: Data?
    @State private var pendingBundleName = ""
    @State private var bundleTransferKey = ""
    @State private var showTransferKeyPrompt = false
    @State private var importNotice: String?
    @State private var importError: String?
    @State private var showWipeConfirm = false

    var body: some View {
        NavigationStack {
            List {
                desktopBridgeSection
                airDropOfflineSection
                directHermesSection
                privacyArchitectureSection
                dangerZoneSection
            }
            .listStyle(.insetGrouped)
            .navigationTitle("零服务器同步")
            .fileImporter(
                isPresented: $showBundleImporter,
                allowedContentTypes: [.data, .json],
                allowsMultipleSelection: false
            ) { result in
                handleFileImport(result)
            }
            .alert("输入同步包传输密钥", isPresented: $showTransferKeyPrompt) {
                TextField("粘贴电脑端显示的传输密钥", text: $bundleTransferKey)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("取消", role: .cancel) {
                    pendingBundleData = nil
                    bundleTransferKey = ""
                }
                Button("解密并导入") {
                    decryptPendingBundle()
                }
            } message: {
                Text("正在解密 \(pendingBundleName)，该文件使用 AES-256-GCM 端到端加密。")
            }
            .confirmationDialog("确定清空本机所有同步缓存与密钥？", isPresented: $showWipeConfirm, titleVisibility: .visible) {
                Button("清空全部数据", role: .destructive) {
                    store.wipeAllLocalData()
                }
                Button("取消", role: .cancel) {}
            } message: {
                Text("此操作会解除电脑配对、移除 Keychain 中的 Hermes 直连凭据，并清空本地缓存，不会影响电脑端数据。")
            }
        }
    }

    private var desktopBridgeSection: some View {
        Section {
            if let desktop = store.pairedDesktop {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "laptopcomputer.and.iphone")
                            .font(.title2)
                            .foregroundStyle(Color("AccentColor"))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(desktop.hostName)
                                .font(.headline)
                            Text("\(desktop.activeHost):\(String(desktop.port))")
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        statusBadge
                    }

                    HStack(spacing: 12) {
                        Label("指纹 \(desktop.fingerprint)", systemImage: "checkmark.seal.fill")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(store.snapshot.bots.count) 个智能体")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 10) {
                        Button {
                            Task { await store.reconnectDesktop() }
                        } label: {
                            Label("重新连接", systemImage: "arrow.clockwise")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)

                        Button {
                            showQRScanner = true
                        } label: {
                            Label("重新扫码", systemImage: "qrcode.viewfinder")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }
                }
                .padding(.vertical, 4)

                Button("解除电脑端配对", role: .destructive) {
                    store.unpairDesktop()
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Text("尚未配对电脑端 BotArk")
                        .font(.headline)
                    Text("打开 Mac / Windows 上的 BotArk，点击左侧边栏二维码图标，用 iPhone 扫一扫即可完成零服务器同步。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button {
                        showQRScanner = true
                    } label: {
                        Label("扫一扫配对电脑端", systemImage: "qrcode.viewfinder")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(.vertical, 6)
            }
        } header: {
            Text("通道一 · 局域网 / Tailscale 扫码实时同步")
        } footer: {
            Text("配对后自动记忆所有局域网与 Tailscale IP，支持 Grok Bot、Meta Muse、ChatGPT Dot、Hark 与 Hermes 全平台同步收发。")
        }
    }

    private var statusBadge: some View {
        let isConnected = store.connectionState.isBridgeConnected
        return Text(isConnected ? "实时在线" : "离线")
            .font(.caption2.weight(.bold))
            .foregroundStyle(isConnected ? .green : .secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background((isConnected ? Color.green : Color.gray).opacity(0.14), in: Capsule())
    }

    private var airDropOfflineSection: some View {
        Section {
            Button {
                showBundleImporter = true
            } label: {
                Label("导入加密同步包 (.botark-sync)", systemImage: "square.and.arrow.down.on.square")
            }

            if let importNotice {
                Label(importNotice, systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
            }
            if let importError {
                Label(importError, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        } header: {
            Text("通道二 · 无 Wi-Fi 隔空投送离线包")
        } footer: {
            Text("即使电脑和手机不在同一局域网，也可在电脑端导出 AES-256-GCM 加密的 .botark-sync 文件，通过隔空投送（AirDrop）传到 iPhone 导入。")
        }
    }

    private var directHermesSection: some View {
        Section {
            if store.directHermesCredentials.isEmpty {
                Text("暂无 Hermes 脱机直连凭据")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(store.directHermesCredentials) { cred in
                    HStack(spacing: 10) {
                        PlatformIconView(platform: .hermes, size: 24)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(cred.botName ?? cred.displayName ?? "Hermes")
                                .font(.subheadline.weight(.semibold))
                            Text(cred.baseUrl)
                                .font(.caption2.monospaced())
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        Spacer()
                        Text("Keychain")
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.green)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.green.opacity(0.14), in: Capsule())
                    }
                }
            }

            Button {
                showAddHermes = true
            } label: {
                Label("手动添加独立 Hermes 服务器", systemImage: "plus.circle.fill")
            }
        } header: {
            Text("Hermes 脱机直连（电脑休眠可用）")
        } footer: {
            Text("电脑端扫码同步时开启「附带 Hermes 直连凭据」，即可将 API 凭据加密转入 iOS Keychain；离开局域网或电脑关机时也能直接与远程 Hermes Agent 对话。")
        }
    }

    private var privacyArchitectureSection: some View {
        Section("零服务器安全说明") {
            Label("无云端账号、无第三方中转服务器", systemImage: "cloud.slash.fill")
                .font(.caption)
            Label("设备令牌与 API Key 仅存 iOS 硬件 Keychain", systemImage: "key.fill")
                .font(.caption)
            Label("扫码传输与离线同步包采用 AES-256-GCM 加密", systemImage: "lock.shield.fill")
                .font(.caption)
        }
    }

    private var dangerZoneSection: some View {
        Section {
            Button("清空本机同步缓存与密钥", role: .destructive) {
                showWipeConfirm = true
            }
        }
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        importNotice = nil
        importError = nil
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            do {
                let data = try Data(contentsOf: url)
                pendingBundleData = data
                pendingBundleName = url.lastPathComponent
                bundleTransferKey = ""
                showTransferKeyPrompt = true
            } catch {
                importError = "读取文件失败：\(error.localizedDescription)"
            }
        case .failure(let error):
            importError = error.localizedDescription
        }
    }

    private func decryptPendingBundle() {
        guard let data = pendingBundleData else { return }
        do {
            try store.importOfflineBundle(fileData: data, transferKey: bundleTransferKey)
            importNotice = "已成功解密并导入 \(store.snapshot.bots.count) 个智能体。"
            importError = nil
        } catch {
            importError = "解密失败，请核对传输密钥是否正确（\(error.localizedDescription)）。"
        }
        pendingBundleData = nil
        bundleTransferKey = ""
    }
}

struct AddStandaloneHermesSheet: View {
    @Bindable var store: BotArkStore
    @Environment(\.dismiss) private var dismiss

    @State private var name = "Hermes"
    @State private var baseUrl = "http://127.0.0.1:8642"
    @State private var apiKey = ""
    @State private var model = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 12) {
                        PlatformIconView(platform: .hermes, size: 36)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Hermes Agent 独立直连")
                                .font(.headline)
                            Text("无需电脑端，直连 OpenAI 兼容 /v1 API Server")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section("服务器连接信息") {
                    TextField("显示名称（如 My Hermes）", text: $name)
                    TextField("Base URL（如 https://hermes.myhost.ts.net:8642）", text: $baseUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    SecureField("API Key（如无鉴权可留空）", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("模型名（留空自动探测默认模型）", text: $model)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("接入 Hermes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await connect() }
                    } label: {
                        if busy {
                            ProgressView()
                        } else {
                            Text("测试并添加")
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(busy || baseUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func connect() async {
        busy = true
        errorMessage = nil
        defer { busy = false }
        do {
            try await store.addStandaloneHermes(
                name: name,
                baseUrl: baseUrl,
                apiKey: apiKey.isEmpty ? nil : apiKey,
                model: model.isEmpty ? nil : model
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
