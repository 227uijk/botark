import Foundation
import Security

/// Hardware-backed iOS Keychain storage for paired desktop tokens & direct-connect Hermes API keys.
public enum KeychainStore {
    private static let service = "com.qybaihe.botark.ios"
    private static let pairedDesktopKey = "paired_desktop_info_v1"
    private static let directHermesKey = "direct_hermes_credentials_v1"

    private static func simulatorFallbackUrl(forKey account: String) -> URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            .appendingPathComponent("BotArk/.sim-keychain", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("\(account).json")
    }

    public static func save<T: Encodable>(_ value: T, forKey account: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        #if targetEnvironment(simulator)
        if status == errSecMissingEntitlement {
            try? data.write(to: simulatorFallbackUrl(forKey: account), options: [.atomic, .completeFileProtection])
        }
        #else
        _ = status
        #endif
    }

    public static func load<T: Decodable>(_ type: T.Type, forKey account: String) -> T? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecSuccess, let data = result as? Data {
            return try? JSONDecoder().decode(type, from: data)
        }
        #if targetEnvironment(simulator)
        if status == errSecMissingEntitlement,
           let data = try? Data(contentsOf: simulatorFallbackUrl(forKey: account)) {
            return try? JSONDecoder().decode(type, from: data)
        }
        #endif
        return nil
    }

    public static func delete(forKey account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        #if targetEnvironment(simulator)
        try? FileManager.default.removeItem(at: simulatorFallbackUrl(forKey: account))
        #endif
    }

    public static func savePairedDesktop(_ info: PairedDesktopInfo) {
        save(info, forKey: pairedDesktopKey)
    }

    public static func loadPairedDesktop() -> PairedDesktopInfo? {
        load(PairedDesktopInfo.self, forKey: pairedDesktopKey)
    }

    public static func clearPairedDesktop() {
        delete(forKey: pairedDesktopKey)
    }

    public static func saveDirectHermesCredentials(_ creds: [DirectHermesCredential]) {
        save(creds, forKey: directHermesKey)
    }

    public static func loadDirectHermesCredentials() -> [DirectHermesCredential] {
        load([DirectHermesCredential].self, forKey: directHermesKey) ?? []
    }

    public static func clearDirectHermesCredentials() {
        delete(forKey: directHermesKey)
    }
}
