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
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    desktopBridgeCard
                    offlineBundleCard
                    directHermesCard
                    footerActions
                }
                .padding(16)
            }
            .background(ArkTheme.canvas.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("同步")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                }
            }
            .fileImporter(
                isPresented: $showBundleImporter,
                allowedContentTypes: [.data, .json],
                allowsMultipleSelection: false
            ) { result in
                handleFileImport(result)
            }
            .alert("输入传输密钥", isPresented: $showTransferKeyPrompt) {
                TextField("粘贴电脑端密钥", text: $bundleTransferKey)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("取消", role: .cancel) {
                    pendingBundleData = nil
                    bundleTransferKey = ""
                }
                Button("解密导入") {
                    decryptPendingBundle()
                }
            } message: {
                Text(pendingBundleName)
            }
            .confirmationDialog("清空本机同步缓存与密钥？", isPresented: $showWipeConfirm, titleVisibility: .visible) {
                Button("清空全部数据", role: .destructive) {
                    store.wipeAllLocalData()
                }
                Button("取消", role: .cancel) {}
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11.5, weight: .semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 4)
    }

    private var desktopBridgeCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("电脑端桥接")

            VStack(alignment: .leading, spacing: 12) {
                if let desktop = store.pairedDesktop {
                    HStack(spacing: 10) {
                        Image(systemName: "laptopcomputer")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ArkTheme.accent)
                            .frame(width: 36, height: 36)
                            .background(ArkTheme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(desktop.hostName)
                                .font(.system(size: 14.5, weight: .semibold))
                            Text("\(desktop.activeHost):\(String(desktop.port)) · \(desktop.fingerprint)")
                                .font(.system(size: 11.5, design: .monospaced))
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        statusPill
                    }

                    HStack(spacing: 8) {
                        Button {
                            Task { await store.reconnectDesktop() }
                        } label: {
                            Label("重连", systemImage: "arrow.clockwise")
                                .font(.system(size: 12.5, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(ArkTheme.subtleFill, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        Button {
                            showQRScanner = true
                        } label: {
                            Label("重新扫码", systemImage: "qrcode.viewfinder")
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(ArkTheme.accent, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)

                        Button {
                            store.unpairDesktop()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundStyle(.red)
                                .frame(width: 36, height: 33)
                                .background(Color.red.opacity(0.09), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("解绑")
                    }
                } else {
                    HStack(spacing: 10) {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ArkTheme.accent)
                            .frame(width: 36, height: 36)
                            .background(ArkTheme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("未配对电脑端")
                                .font(.system(size: 14.5, weight: .semibold))
                            Text("局域网 / 热点 / Tailscale 直连")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Button("扫码") {
                            showQRScanner = true
                        }
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(ArkTheme.accent, in: Capsule())
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(14)
            .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
            )
        }
    }

    private var statusPill: some View {
        let online = store.connectionState.isBridgeConnected
        return HStack(spacing: 4) {
            Circle()
                .fill(online ? Color(red: 0.13, green: 0.77, blue: 0.37) : .gray)
                .frame(width: 6, height: 6)
            Text(online ? "在线" : "离线")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(online ? Color(red: 0.08, green: 0.56, blue: 0.25) : .secondary)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background((online ? Color.green : Color.gray).opacity(0.12), in: Capsule())
    }

    private var offlineBundleCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("离线同步包")

            VStack(spacing: 0) {
                Button {
                    showBundleImporter = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.down.doc")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(ArkTheme.accent)
                            .frame(width: 28)
                        Text("导入 .botark-sync 加密包")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.primary)
                        Spacer()
                        Text("AirDrop")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)

                if let importNotice {
                    Divider().padding(.leading, 14)
                    Label(importNotice, systemImage: "checkmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.green)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                }
                if let importError {
                    Divider().padding(.leading, 14)
                    Label(importError, systemImage: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                }
            }
            .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
            )
        }
    }

    private var directHermesCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("Hermes 脱机直连")

            VStack(spacing: 0) {
                ForEach(store.directHermesCredentials) { cred in
                    HStack(spacing: 10) {
                        PlatformIconView(platform: .hermes, size: 22)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(cred.botName ?? cred.displayName ?? "Hermes")
                                .font(.system(size: 13.5, weight: .semibold))
                            Text(cred.baseUrl)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        Spacer()
                        Text("Keychain")
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundStyle(Color(red: 0.08, green: 0.56, blue: 0.25))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.green.opacity(0.12), in: Capsule())
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)

                    Divider().padding(.leading, 46)
                }

                Button {
                    showAddHermes = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(ArkTheme.accent)
                            .frame(width: 22)
                        Text("添加独立 Hermes 服务器")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(ArkTheme.accent)
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)
            }
            .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
            )
        }
    }

    private var footerActions: some View {
        VStack(spacing: 12) {
            HStack(spacing: 14) {
                Label("无服务器", systemImage: "cloud.slash")
                Label("AES-256-GCM", systemImage: "lock.shield")
                Label("Keychain", systemImage: "key")
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity)
            .padding(.top, 6)

            Button {
                showWipeConfirm = true
            } label: {
                Text("清空本机缓存与密钥")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 13, style: .continuous)
                            .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
                    )
            }
            .buttonStyle(.plain)
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
                pendingBundleData = try Data(contentsOf: url)
                pendingBundleName = url.lastPathComponent
                bundleTransferKey = ""
                showTransferKeyPrompt = true
            } catch {
                importError = error.localizedDescription
            }
        case .failure(let error):
            importError = error.localizedDescription
        }
    }

    private func decryptPendingBundle() {
        guard let data = pendingBundleData else { return }
        do {
            try store.importOfflineBundle(fileData: data, transferKey: bundleTransferKey)
            importNotice = "已导入 \(store.snapshot.bots.count) 个智能体"
            importError = nil
        } catch {
            importError = "密钥错误或文件已损坏"
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
                Section("连接信息") {
                    TextField("名称", text: $name)
                        .font(.system(size: 14))
                    TextField("Base URL", text: $baseUrl)
                        .font(.system(size: 14, design: .monospaced))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    SecureField("API Key（可选）", text: $apiKey)
                        .font(.system(size: 14))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("模型（留空自动探测）", text: $model)
                        .font(.system(size: 14))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.system(size: 12.5))
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
                        if busy { ProgressView() } else { Text("添加").fontWeight(.semibold) }
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
