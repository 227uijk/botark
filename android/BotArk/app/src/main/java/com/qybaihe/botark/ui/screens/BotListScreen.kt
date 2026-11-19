package com.qybaihe.botark.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material.icons.rounded.Wifi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qybaihe.botark.R
import com.qybaihe.botark.model.BridgeConnectionState
import com.qybaihe.botark.model.PlatformId
import com.qybaihe.botark.model.SyncedBot
import com.qybaihe.botark.ui.components.BotAvatar
import com.qybaihe.botark.ui.components.PlatformBadgePill
import com.qybaihe.botark.ui.components.PlatformIcon
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.viewmodel.BotArkUiState
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun BotListScreen(
    state: BotArkUiState,
    onOpenBot: (String) -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAddHermes: () -> Unit,
    onReconnect: () -> Unit
) {
    val palette = ArkColors.current
    var selectedPlatform by remember { mutableStateOf<PlatformId?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.canvas)
    ) {
        // Compact refined header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Image(
                painter = painterResource(R.drawable.ic_botark_logo),
                contentDescription = "BotArk",
                modifier = Modifier
                    .size(23.dp)
                    .clip(RoundedCornerShape(6.dp))
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "BotArk",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = palette.textPrimary
            )
            Spacer(Modifier.weight(1f))
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(palette.subtleFill)
                    .clickable(onClick = onOpenAddHermes)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Add,
                    contentDescription = "添加 Hermes",
                    tint = palette.accent,
                    modifier = Modifier.size(17.dp)
                )
            }
            Spacer(Modifier.width(8.dp))
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(palette.accent.copy(alpha = 0.12f))
                    .clickable(onClick = onOpenScanner)
            ) {
                Icon(
                    imageVector = Icons.Rounded.QrCodeScanner,
                    contentDescription = "扫码配对",
                    tint = palette.accent,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        if (state.snapshot.bots.isEmpty()) {
            OnboardingContent(
                onOpenScanner = onOpenScanner,
                onOpenAddHermes = onOpenAddHermes
            )
        } else {
            val filtered = state.snapshot.bots.filter { bot ->
                selectedPlatform == null || bot.platformId == selectedPlatform
            }
            val pinned = filtered.filter { it.pinned == true }
            val unpinned = filtered.filter { it.pinned != true }

            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 2.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    ConnectionStatusPill(
                        state = state,
                        onReconnect = onReconnect,
                        onOpenScanner = onOpenScanner
                    )
                }

                item {
                    PlatformFilterRow(
                        bots = state.snapshot.bots,
                        selected = selectedPlatform,
                        onSelect = { selectedPlatform = it }
                    )
                }

                if (pinned.isNotEmpty()) {
                    item {
                        BotSectionCard(
                            title = "置顶",
                            bots = pinned,
                            state = state,
                            onOpenBot = onOpenBot
                        )
                    }
                }

                if (state.snapshot.groups.isEmpty()) {
                    if (unpinned.isNotEmpty()) {
                        item {
                            BotSectionCard("全部", unpinned, state, onOpenBot)
                        }
                    }
                } else {
                    state.snapshot.groups.forEach { group ->
                        val members = unpinned.filter { it.groupId == group.id }
                        if (members.isNotEmpty()) {
                            item(key = "grp_${group.id}") {
                                BotSectionCard(group.name, members, state, onOpenBot)
                            }
                        }
                    }
                    val knownIds = state.snapshot.groups.map { it.id }.toSet()
                    val ungrouped = unpinned.filter { it.groupId !in knownIds }
                    if (ungrouped.isNotEmpty()) {
                        item(key = "grp_other") {
                            BotSectionCard("其他", ungrouped, state, onOpenBot)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OnboardingContent(
    onOpenScanner: () -> Unit,
    onOpenAddHermes: () -> Unit
) {
    val palette = ArkColors.current
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
    ) {
        Spacer(Modifier.weight(0.7f))

        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(152.dp)) {
            Box(
                modifier = Modifier
                    .size(152.dp)
                    .background(
                        Brush.radialGradient(
                            listOf(palette.accent.copy(alpha = 0.18f), Color.Transparent)
                        )
                    )
            )
            Image(
                painter = painterResource(R.drawable.ic_botark_logo),
                contentDescription = "BotArk",
                modifier = Modifier
                    .size(76.dp)
                    .shadow(14.dp, RoundedCornerShape(20.dp), ambientColor = Color.Black.copy(alpha = 0.2f))
                    .clip(RoundedCornerShape(20.dp))
            )
        }

        Spacer(Modifier.height(4.dp))
        Text(
            text = "把所有 AI 助手装进口袋",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = palette.textPrimary,
            letterSpacing = (-0.3).sp
        )
        Spacer(Modifier.height(5.dp))
        Text(
            text = "零服务器 · 扫码直连电脑端",
            fontSize = 13.sp,
            color = palette.textSecondary
        )

        Spacer(Modifier.height(24.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            PlatformId.entries.forEach { platform ->
                val cardShape = RoundedCornerShape(12.dp)
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                    modifier = Modifier
                        .weight(1f)
                        .clip(cardShape)
                        .background(palette.surface)
                        .border(0.8.dp, palette.hairline, cardShape)
                        .padding(vertical = 10.dp)
                ) {
                    PlatformIcon(platform = platform, size = 22.dp)
                    Text(
                        text = platform.shortLabel,
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = palette.textSecondary
                    )
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .height(46.dp)
                .clip(RoundedCornerShape(13.dp))
                .background(palette.accent)
                .clickable(onClick = onOpenScanner)
        ) {
            Icon(
                imageVector = Icons.Rounded.QrCodeScanner,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(17.dp)
            )
            Spacer(Modifier.width(7.dp))
            Text(
                text = "扫码配对电脑端",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
        }

        Spacer(Modifier.height(10.dp))

        val secondaryShape = RoundedCornerShape(13.dp)
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .clip(secondaryShape)
                .background(palette.surface)
                .border(0.9.dp, palette.hairline, secondaryShape)
                .clickable(onClick = onOpenAddHermes)
        ) {
            Icon(
                imageVector = Icons.Rounded.Dns,
                contentDescription = null,
                tint = palette.textPrimary,
                modifier = Modifier.size(15.dp)
            )
            Spacer(Modifier.width(7.dp))
            Text(
                text = "直连 Hermes 服务器",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = palette.textPrimary
            )
        }

        Spacer(Modifier.weight(1f))

        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 20.dp)
        ) {
            TinyTrustTag(Icons.Rounded.Wifi, "局域网 / Tailscale")
            TinyTrustTag(Icons.Rounded.Lock, "AES-256-GCM")
            TinyTrustTag(Icons.Rounded.Key, "Keystore")
        }
    }
}

@Composable
private fun TinyTrustTag(icon: ImageVector, label: String) {
    val palette = ArkColors.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, tint = palette.textTertiary, modifier = Modifier.size(11.dp))
        Text(label, fontSize = 10.5.sp, fontWeight = FontWeight.Medium, color = palette.textSecondary)
    }
}

@Composable
private fun ConnectionStatusPill(
    state: BotArkUiState,
    onReconnect: () -> Unit,
    onOpenScanner: () -> Unit
) {
    val palette = ArkColors.current
    val shape = RoundedCornerShape(12.dp)
    val dotColor = when (state.connectionState) {
        is BridgeConnectionState.Connected -> palette.green
        is BridgeConnectionState.Connecting -> palette.orange
        else -> if (state.directHermesCredentials.isEmpty()) palette.textTertiary else palette.accent
    }
    val title = when (val cs = state.connectionState) {
        is BridgeConnectionState.Connected -> cs.hostName
        is BridgeConnectionState.Connecting -> "连接中..."
        is BridgeConnectionState.Offline -> "${cs.hostName} 离线"
        is BridgeConnectionState.Unpaired -> if (state.directHermesCredentials.isEmpty()) "未配对" else "Hermes 直连"
    }
    val meta = when (val cs = state.connectionState) {
        is BridgeConnectionState.Connected -> cs.activeHost
        is BridgeConnectionState.Offline -> if (state.directHermesCredentials.isEmpty()) "离线缓存" else "Hermes 可直连"
        else -> null
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(palette.surface)
            .border(0.8.dp, palette.hairline, shape)
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        Box(
            modifier = Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = title,
            fontSize = 12.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = palette.textPrimary,
            maxLines = 1
        )
        if (meta != null) {
            Text(
                text = " · ",
                fontSize = 12.sp,
                color = palette.textTertiary
            )
            Text(
                text = meta,
                fontSize = 11.5.sp,
                fontFamily = FontFamily.Monospace,
                color = palette.textSecondary,
                maxLines = 1
            )
        }
        Spacer(Modifier.weight(1f))
        if (state.pairedDesktop != null && !state.connectionState.isBridgeConnected) {
            Text(
                text = "重连",
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = palette.accent,
                modifier = Modifier.clickable(onClick = onReconnect)
            )
        } else if (state.pairedDesktop == null) {
            Text(
                text = "配对",
                fontSize = 11.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = palette.accent,
                modifier = Modifier.clickable(onClick = onOpenScanner)
            )
        }
    }
}

@Composable
private fun PlatformFilterRow(
    bots: List<SyncedBot>,
    selected: PlatformId?,
    onSelect: (PlatformId?) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
    ) {
        FilterChipPill("全部", null, bots.size, selected == null) { onSelect(null) }
        PlatformId.entries.forEach { platform ->
            val count = bots.count { it.platformId == platform }
            if (count > 0) {
                FilterChipPill(platform.shortLabel, platform, count, selected == platform) {
                    onSelect(platform)
                }
            }
        }
    }
}

@Composable
private fun FilterChipPill(
    label: String,
    platform: PlatformId?,
    count: Int,
    active: Boolean,
    onClick: () -> Unit
) {
    val palette = ArkColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .clip(CircleShape)
            .background(if (active) palette.accent else palette.surface)
            .border(0.8.dp, if (active) Color.Transparent else palette.hairline, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        if (platform != null) {
            PlatformIcon(platform = platform, size = 13.dp)
        }
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
            color = if (active) Color.White else palette.textPrimary
        )
        Text(
            text = count.toString(),
            fontSize = 10.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (active) Color.White.copy(alpha = 0.8f) else palette.textSecondary
        )
    }
}

@Composable
private fun BotSectionCard(
    title: String,
    bots: List<SyncedBot>,
    state: BotArkUiState,
    onOpenBot: (String) -> Unit
) {
    val palette = ArkColors.current
    val cardShape = RoundedCornerShape(15.dp)

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = title,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = palette.textSecondary,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(cardShape)
                .background(palette.surface)
                .border(0.8.dp, palette.hairline, cardShape)
        ) {
            bots.forEachIndexed { idx, bot ->
                BotRow(bot = bot, state = state, onClick = { onOpenBot(bot.id) })
                if (idx < bots.lastIndex) {
                    HorizontalDivider(
                        thickness = 0.6.dp,
                        color = palette.hairline,
                        modifier = Modifier.padding(start = 62.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun BotRow(
    bot: SyncedBot,
    state: BotArkUiState,
    onClick: () -> Unit
) {
    val palette = ArkColors.current
    val status = state.status(bot)
    val lastMsg = state.snapshot.messages[bot.id]?.lastOrNull()
    val isTyping = state.typingByBotId[bot.id] == true
    val pendingCount = state.snapshot.approvals[bot.activeAccountId]
        .orEmpty()
        .count { it.status == "pending" }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        BotAvatar(bot = bot, status = status, size = 40.dp)
        Spacer(Modifier.width(11.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = bot.name,
                        fontSize = 14.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = palette.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    PlatformBadgePill(bot.platformId)
                }
                if (lastMsg != null && lastMsg.createdAt > 0) {
                    Text(
                        text = formatShortTime(lastMsg.createdAt),
                        fontSize = 11.sp,
                        color = palette.textTertiary
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = when {
                        isTyping -> "正在回复..."
                        !lastMsg?.text.isNullOrBlank() -> lastMsg!!.text.replace("\n", " ")
                        else -> bot.platformId.displayName
                    },
                    fontSize = 12.5.sp,
                    color = if (isTyping) palette.accent else palette.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (pendingCount > 0) {
                    Text(
                        text = "$pendingCount 审批",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color(0xFFF28F0D))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

private fun formatShortTime(ms: Double): String {
    val date = Date(ms.toLong())
    val nowCal = Calendar.getInstance()
    val cal = Calendar.getInstance().apply { time = date }
    val sameDay = nowCal.get(Calendar.YEAR) == cal.get(Calendar.YEAR) &&
        nowCal.get(Calendar.DAY_OF_YEAR) == cal.get(Calendar.DAY_OF_YEAR)
    val fmt = SimpleDateFormat(if (sameDay) "HH:mm" else "MM/dd", Locale.getDefault())
    return fmt.format(date)
}
