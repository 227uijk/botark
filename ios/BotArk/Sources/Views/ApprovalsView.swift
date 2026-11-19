import SwiftUI
import UIKit

struct ApprovalsView: View {
    @Bindable var store: BotArkStore

    var body: some View {
        NavigationStack {
            Group {
                if store.pendingApprovals.isEmpty {
                    ContentUnavailableView(
                        "暂无待审批操作",
                        systemImage: "checkmark.shield",
                        description: Text("当电脑端或 Hermes Agent 请求执行敏感命令、外部网络访问时，会实时推送到这里供你一键审批。")
                    )
                } else {
                    List {
                        ForEach(store.pendingApprovals) { item in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 8) {
                                    PlatformIconView(platform: item.platformId, size: 20)
                                    Text(item.botName)
                                        .font(.subheadline.weight(.semibold))
                                    PlatformBadgePill(platform: item.platformId)
                                    Spacer()
                                    if let host = item.approval.host, !host.isEmpty {
                                        Text(host)
                                            .font(.caption2.monospaced())
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                Text(item.approval.title)
                                    .font(.headline)

                                if let detail = item.approval.detail, !detail.isEmpty {
                                    Text(detail)
                                        .font(.caption.monospaced())
                                        .padding(10)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8))
                                }

                                if let reason = item.approval.reason, !reason.isEmpty {
                                    Text(reason)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                HStack(spacing: 8) {
                                    Button("允许本次") {
                                        decide(item, decision: "allow_once")
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .controlSize(.small)

                                    Button("本次会话") {
                                        decide(item, decision: "allow_session")
                                    }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)

                                    Button("始终允许") {
                                        decide(item, decision: "allow_always")
                                    }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)

                                    Spacer()

                                    Button("拒绝", role: .destructive) {
                                        decide(item, decision: "deny")
                                    }
                                    .buttonStyle(.bordered)
                                    .controlSize(.small)
                                }
                            }
                            .padding(.vertical, 6)
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("安全审批")
        }
    }

    private func decide(_ item: PendingApprovalItem, decision: String) {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        Task {
            await store.decideApproval(item: item, decision: decision)
        }
    }
}
