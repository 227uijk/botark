package com.qybaihe.botark.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qybaihe.botark.model.PendingApprovalItem
import com.qybaihe.botark.ui.components.PlatformBadgePill
import com.qybaihe.botark.ui.components.PlatformIcon
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.viewmodel.BotArkUiState

@Composable
fun ApprovalsScreen(
    state: BotArkUiState,
    onDecide: (PendingApprovalItem, String) -> Unit
) {
    val palette = ArkColors.current
    val items = state.pendingApprovals

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.canvas)
    ) {
        Text(
            text = "审批",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = palette.textPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp)
        )

        if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(
                        imageVector = Icons.Rounded.VerifiedUser,
                        contentDescription = null,
                        tint = palette.textTertiary,
                        modifier = Modifier.size(36.dp)
                    )
                    Text("暂无待审批", fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold, color = palette.textSecondary)
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(items, key = { it.id }) { item ->
                    val shape = RoundedCornerShape(15.dp)
                    Column(
                        verticalArrangement = Arrangement.spacedBy(9.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(shape)
                            .background(palette.surface)
                            .border(0.8.dp, palette.hairline, shape)
                            .padding(13.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            PlatformIcon(item.platformId, size = 17.dp)
                            Text(item.botName, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = palette.textPrimary)
                            PlatformBadgePill(item.platformId)
                            Spacer(Modifier.weight(1f))
                            if (!item.approval.host.isNullOrBlank()) {
                                Text(
                                    text = item.approval.host,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = palette.textTertiary
                                )
                            }
                        }

                        Text(
                            text = item.approval.title,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = palette.textPrimary
                        )

                        if (!item.approval.detail.isNullOrBlank()) {
                            Text(
                                text = item.approval.detail,
                                fontSize = 11.5.sp,
                                fontFamily = FontFamily.Monospace,
                                color = palette.textSecondary,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(9.dp))
                                    .background(palette.subtleFill)
                                    .padding(9.dp)
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.fillMaxWidth()) {
                            ApprovalActionPill("允许", palette.accent, Color.White) { onDecide(item, "allow_once") }
                            ApprovalActionPill("本次会话", palette.subtleFill, palette.textPrimary) { onDecide(item, "allow_session") }
                            ApprovalActionPill("始终", palette.subtleFill, palette.textPrimary) { onDecide(item, "allow_always") }
                            Spacer(Modifier.weight(1f))
                            ApprovalActionPill("拒绝", palette.red.copy(alpha = 0.10f), palette.red) { onDecide(item, "deny") }
                        }
                    }
                }
            }
        }
    }
}
