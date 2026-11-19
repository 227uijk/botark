import SwiftUI
import UIKit

enum ArkTheme {
    static let canvas = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.043, green: 0.051, blue: 0.071, alpha: 1)
            : UIColor(red: 0.965, green: 0.969, blue: 0.980, alpha: 1)
    })

    static let surface = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.082, green: 0.094, blue: 0.125, alpha: 1)
            : UIColor.white
    })

    static let subtleFill = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 1.0, alpha: 0.06)
            : UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 0.045)
    })

    static let hairline = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 1.0, alpha: 0.09)
            : UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 0.07)
    })

    static let accent = Color(red: 0.145, green: 0.388, blue: 0.922) // #2563EB
}

extension PlatformId {
    var brandColor: Color {
        switch self {
        case .grok: return Color(red: 0.18, green: 0.21, blue: 0.28)
        case .metaMuse: return Color(red: 0.09, green: 0.46, blue: 0.95)
        case .dot: return Color(red: 0.05, green: 0.62, blue: 0.49)
        case .hark: return Color(red: 0.90, green: 0.40, blue: 0.16)
        case .hermes: return Color(red: 0.44, green: 0.32, blue: 0.93)
        }
    }
}

extension ConnectionStatus {
    var dotColor: Color {
        switch self {
        case .online: return Color(red: 0.13, green: 0.77, blue: 0.37)
        case .busy: return ArkTheme.accent
        case .attention: return Color(red: 0.96, green: 0.62, blue: 0.04)
        case .offline: return .secondary.opacity(0.45)
        case .error: return Color(red: 0.94, green: 0.27, blue: 0.27)
        }
    }
}

struct PlatformIconView: View {
    let platform: PlatformId
    var size: CGFloat = 18

    var body: some View {
        Image(platform.assetImageName)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
    }
}

struct BotAvatarView: View {
    let bot: SyncedBot
    let status: ConnectionStatus
    var size: CGFloat = 40

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            avatarCore
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.30, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.30, style: .continuous)
                        .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
                )

            Circle()
                .fill(status.dotColor)
                .frame(width: max(9, size * 0.23), height: max(9, size * 0.23))
                .overlay(
                    Circle()
                        .stroke(ArkTheme.surface, lineWidth: 1.8)
                )
                .offset(x: 1.5, y: 1.5)
        }
    }

    @ViewBuilder
    private var avatarCore: some View {
        if let rawAvatar = bot.avatar, let uiImage = Self.decodeBase64Image(rawAvatar) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
        } else if let emoji = bot.emoji, !emoji.isEmpty {
            ZStack {
                bot.platformId.brandColor.opacity(0.10)
                Text(emoji)
                    .font(.system(size: size * 0.48))
            }
        } else {
            ZStack {
                LinearGradient(
                    colors: [bot.platformId.brandColor.opacity(0.13), bot.platformId.brandColor.opacity(0.04)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(bot.platformId.assetImageName)
                    .resizable()
                    .scaledToFit()
                    .padding(size * 0.17)
            }
        }
    }

    static func decodeBase64Image(_ raw: String) -> UIImage? {
        let base64Part: String
        if let commaRange = raw.range(of: ",") {
            base64Part = String(raw[commaRange.upperBound...])
        } else {
            base64Part = raw
        }
        guard let data = Data(base64Encoded: base64Part, options: .ignoreUnknownCharacters) else {
            return nil
        }
        return UIImage(data: data)
    }
}

struct PlatformBadgePill: View {
    let platform: PlatformId

    var body: some View {
        Text(platform.shortLabel)
            .font(.system(size: 10.5, weight: .semibold))
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: true)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(platform.brandColor.opacity(0.10), in: Capsule())
            .foregroundStyle(platform.brandColor)
    }
}
