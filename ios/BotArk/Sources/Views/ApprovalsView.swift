import SwiftUI
import UIKit

struct ApprovalsView: View {
    @Bindable var store: BotArkStore

    var body: some View {
        NavigationStack {
            Group {
                if store.pendingApprovals.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "checkmark.shield")
                            .font(.system(size: 36, weight: .light))
                            .foregroundStyle(.tertiary)
                        Text("暂无待审批")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(store.pendingApprovals) { item in
                                approvalCard(item)
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(ArkTheme.canvas.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text("审批")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                }
            }
        }
    }

    private func approvalCard(_ item: PendingApprovalItem) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 7) {
                PlatformIconView(platform: item.platformId, size: 17)
                Text(item.botName)
                    .font(.system(size: 13, weight: .semibold))
                PlatformBadgePill(platform: item.platformId)
                Spacer()
                if let host = item.approval.host, !host.isEmpty {
                    Text(host)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(.tertiary)
                }
            }

            Text(item.approval.title)
                .font(.system(size: 14, weight: .semibold))

            if let detail = item.approval.detail, !detail.isEmpty {
                Text(detail)
                    .font(.system(size: 11.5, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .padding(9)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(ArkTheme.subtleFill, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            }

            HStack(spacing: 7) {
                pillButton("允许", fill: ArkTheme.accent, fg: .white) { decide(item, decision: "allow_once") }
                pillButton("本次会话", fill: ArkTheme.subtleFill, fg: .primary) { decide(item, decision: "allow_session") }
                pillButton("始终", fill: ArkTheme.subtleFill, fg: .primary) { decide(item, decision: "allow_always") }
                Spacer()
                pillButton("拒绝", fill: Color.red.opacity(0.10), fg: .red) { decide(item, decision: "deny") }
            }
        }
        .padding(13)
        .background(ArkTheme.surface, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .strokeBorder(ArkTheme.hairline, lineWidth: 0.8)
        )
    }

    private func pillButton(_ label: String, fill: Color, fg: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(fg)
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(fill, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func decide(_ item: PendingApprovalItem, decision: String) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        Task { await store.decideApproval(item: item, decision: decision) }
    }
}
