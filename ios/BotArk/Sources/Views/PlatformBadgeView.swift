import SwiftUI
import UIKit

extension PlatformId {
    var brandColor: Color {
        switch self {
        case .grok: return Color(red: 0.14, green: 0.16, blue: 0.20)
        case .metaMuse: return Color(red: 0.09, green: 0.48, blue: 0.96)
        case .dot: return Color(red: 0.06, green: 0.65, blue: 0.52)
        case .hark: return Color(red: 0.92, green: 0.42, blue: 0.18)
        case .hermes: return Color(red: 0.46, green: 0.34, blue: 0.95)
        }
    }
}

extension ConnectionStatus {
    var dotColor: Color {
        switch self {
        case .online: return .green
        case .busy: return .blue
        case .attention: return .orange
        case .offline: return .secondary.opacity(0.55)
        case .error: return .red
        }
    }
}

struct PlatformIconView: View {
    let platform: PlatformId
    var size: CGFloat = 20

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
    var size: CGFloat = 44

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            avatarCore
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                        .strokeBorder(bot.platformId.brandColor.opacity(0.18), lineWidth: 1)
                )

            // Status indicator dot
            Circle()
                .fill(status.dotColor)
                .frame(width: max(10, size * 0.25), height: max(10, size * 0.25))
                .overlay(
                    Circle()
                        .stroke(Color(uiColor: .systemBackground), lineWidth: 2)
                )
                .offset(x: 2, y: 2)
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
                LinearGradient(
                    colors: [bot.platformId.brandColor.opacity(0.22), bot.platformId.brandColor.opacity(0.08)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Text(emoji)
                    .font(.system(size: size * 0.5))
            }
        } else {
            ZStack {
                LinearGradient(
                    colors: [bot.platformId.brandColor.opacity(0.18), bot.platformId.brandColor.opacity(0.06)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                Image(bot.platformId.assetImageName)
                    .resizable()
                    .scaledToFit()
                    .padding(size * 0.16)
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
        HStack(spacing: 4) {
            PlatformIconView(platform: platform, size: 13)
            Text(platform.shortLabel)
                .font(.caption2.weight(.semibold))
                .lineLimit(1)
        }
        .fixedSize(horizontal: true, vertical: true)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(platform.brandColor.opacity(0.12), in: Capsule())
        .foregroundStyle(platform.brandColor)
    }
}
