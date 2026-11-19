package com.qybaihe.botark.ui.screens

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.QrCodeScanner
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
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
import com.qybaihe.botark.ui.theme.ArkMonoFamily
import com.qybaihe.botark.ui.theme.ArkSansFamily
import com.qybaihe.botark.ui.theme.LivingPulseDot
import com.qybaihe.botark.ui.theme.brandColor
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

    Box(modifier = Modifier.fillMaxSize().background(palette.canvas)) {
        // Subtle top prismatic atmosphere
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(210.dp)
                .background(
                    Brush.linearGradient(
                        listOf(
                            palette.prismBlue.copy(alpha = 0.06f),
                            palette.prismViolet.copy(alpha = 0.03f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(modifier = Modifier.fillMaxSize()) {
            // Editorial Top Header Bar
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 10.dp)
            ) {
                Image(
                    painter = painterResource(R.drawable.ic_botark_logo),
                    contentDescription = "BotArk",
                    modifier = Modifier
                        .size(24.dp)
                        .shadow(4.dp, RoundedCornerShape(7.dp))
                        .clip(RoundedCornerShape(7.dp))
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "BotArk",
                    fontSize = 19.sp,
                    fontFamily = ArkSansFamily,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.4).sp,
                    color = palette.textPrimary
                )

                if (state.snapshot.bots.isNotEmpty()) {
                    Spacer(Modifier.width(10.dp))
                    InlineConnectionChip(
                        state = state,
                        onReconnect = onReconnect,
                        onOpenScanner = onOpenScanner
                    )
                }

                Spacer(Modifier.weight(1f))

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(34.dp)
                        .shadow(4.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.08f))
                        .clip(CircleShape)
                        .background(palette.surface)
                        .border(0.8.dp, palette.hairline, CircleShape)
                        .clickable(onClick = onOpenAddHermes)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Add,
                        contentDescription = "添加 Hermes",
                        tint = palette.textPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                }
                Spacer(Modifier.width(8.dp))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(34.dp)
                        .shadow(6.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.18f))
                        .clip(CircleShape)
                        .background(palette.ink)
                        .clickable(onClick = onOpenScanner)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.QrCodeScanner,
                        contentDescription = "扫码配对",
                        tint = palette.onInk,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            if (state.snapshot.bots.isEmpty()) {
                SignatureOnboarding(
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
                    contentPadding = PaddingValues(top = 2.dp, bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item {
                        PlatformFilterRow(
                            bots = state.snapshot.bots,
                            selected = selectedPlatform,
                            onSelect = { selectedPlatform = it }
                        )
                    }

                    // Pinned bots -> Tactile Horizontal Bento Showcase Deck!
                    if (pinned.isNotEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(horizontal = 20.dp)
                                ) {
                                    Text(
                                        text = "置顶",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = palette.textSecondary
                                    )
                                    Text(
                                        text = pinned.size.toString(),
                                        fontSize = 10.5.sp,
                                        fontFamily = ArkMonoFamily,
                                        color = palette.textTertiary
                                    )
                                }

                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 18.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    items(pinned, key = { "pin_${it.id}" }) { bot ->
                                        PinnedBentoCard(
                                            bot = bot,
                                            state = state,
                                            onClick = { onOpenBot(bot.id) }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (state.snapshot.groups.isEmpty()) {
                        if (unpinned.isNotEmpty()) {
                            item {
                                Box(Modifier.padding(horizontal = 18.dp)) {
                                    EditorialBotGroupCard("全部", unpinned, state, onOpenBot)
                                }
                            }
                        }
                    } else {
                        state.snapshot.groups.forEach { group ->
                            val members = unpinned.filter { it.groupId == group.id }
                            if (members.isNotEmpty()) {
                                item(key = "grp_${group.id}") {
                                    Box(Modifier.padding(horizontal = 18.dp)) {
                                        EditorialBotGroupCard(group.name, members, state, onOpenBot)
                                    }
                                }
                            }
                        }
                        val knownIds = state.snapshot.groups.map { it.id }.toSet()
                        val ungrouped = unpinned.filter { it.groupId !in knownIds }
                        if (ungrouped.isNotEmpty()) {
                            item(key = "grp_other") {
                                Box(Modifier.padding(horizontal = 18.dp)) {
                                    EditorialBotGroupCard("其他", ungrouped, state, onOpenBot)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InlineConnectionChip(
    state: BotArkUiState,
    onReconnect: () -> Unit,
    onOpenScanner: () -> Unit
) {
    val palette = ArkColors.current
    val dotColor = when (state.connectionState) {
        is BridgeConnectionState.Connected -> palette.emerald
        is BridgeConnectionState.Connecting -> palette.amber
        else -> if (state.directHermesCredentials.isEmpty()) palette.textTertiary else palette.accent
    }
    val label = when (val cs = state.connectionState) {
        is BridgeConnectionState.Connected -> cs.hostName
        is BridgeConnectionState.Connecting -> "连接中"
        is BridgeConnectionState.Offline -> "${cs.hostName} 离线"
        is BridgeConnectionState.Unpaired -> if (state.directHermesCredentials.isEmpty()) "未配对" else "直连"
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .clip(CircleShape)
            .background(palette.surface)
            .border(0.8.dp, palette.hairline, CircleShape)
            .clickable {
                if (state.pairedDesktop != null && !state.connectionState.isBridgeConnected) {
                    onReconnect()
                } else if (state.pairedDesktop == null) {
                    onOpenScanner()
                }
            }
            .padding(start = 6.dp, end = 9.dp, top = 4.dp, bottom = 4.dp)
    ) {
        LivingPulseDot(
            color = dotColor,
            size = 6.dp,
            animated = state.connectionState.isBridgeConnected
        )
        Text(
            text = label,
            fontSize = 11.sp,
            fontFamily = ArkSansFamily,
            fontWeight = FontWeight.Medium,
            color = palette.textSecondary,
            maxLines = 1
        )
    }
}

@Composable
private fun SignatureOnboarding(
    onOpenScanner: () -> Unit,
    onOpenAddHermes: () -> Unit
) {
    val palette = ArkColors.current

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 22.dp)
    ) {
        Spacer(Modifier.weight(0.55f))

        // Living 4-color prismatic orbital emblem (circular feathering, zero hard edges)
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(196.dp)) {
            Box(
                modifier = Modifier
                    .size(196.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(palette.prismBlue.copy(alpha = 0.22f), Color.Transparent),
                            center = Offset(190f, 180f),
                            radius = 220f
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .size(196.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(palette.prismViolet.copy(alpha = 0.18f), Color.Transparent),
                            center = Offset(340f, 200f),
                            radius = 210f
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .size(196.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(palette.prismAmber.copy(alpha = 0.16f), Color.Transparent),
                            center = Offset(200f, 340f),
                            radius = 200f
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .size(196.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(palette.prismTeal.copy(alpha = 0.16f), Color.Transparent),
                            center = Offset(340f, 330f),
                            radius = 200f
                        )
                    )
            )

            Canvas(modifier = Modifier.size(132.dp)) {
                drawCircle(
                    color = palette.hairline,
                    style = Stroke(
                        width = 2.4f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 14f))
                    )
                )
            }

            Image(
                painter = painterResource(R.drawable.ic_botark_logo),
                contentDescription = "BotArk",
                modifier = Modifier
                    .size(76.dp)
                    .shadow(16.dp, RoundedCornerShape(21.dp), ambientColor = Color.Black.copy(alpha = 0.25f))
                    .clip(RoundedCornerShape(21.dp))
            )
        }

        Spacer(Modifier.height(4.dp))
        Text(
            text = "你的随身 AI 方舟",
            fontSize = 22.sp,
            fontFamily = ArkSansFamily,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.5).sp,
            color = palette.textPrimary
        )
        Spacer(Modifier.height(5.dp))
        Text(
            text = "零服务器 · 扫一扫直连电脑端",
            fontSize = 13.sp,
            color = palette.textSecondary
        )

        // Graceful 2-row staggered platform pill constellation
        Spacer(Modifier.height(24.dp))
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ConstellationPill(PlatformId.GROK)
                ConstellationPill(PlatformId.META_MUSE)
                ConstellationPill(PlatformId.DOT)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ConstellationPill(PlatformId.HARK)
                ConstellationPill(PlatformId.HERMES)
            }
        }

        Spacer(Modifier.height(26.dp))

        // Tactile Obsidian primary capsule button
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .shadow(12.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.2f))
                .clip(CircleShape)
                .background(palette.ink)
                .clickable(onClick = onOpenScanner)
        ) {
            Icon(
                imageVector = Icons.Rounded.QrCodeScanner,
                contentDescription = null,
                tint = palette.onInk,
                modifier = Modifier.size(17.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "扫码配对电脑端",
                fontSize = 14.5.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.SemiBold,
                color = palette.onInk
            )
        }

        Spacer(Modifier.height(10.dp))

        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .clip(CircleShape)
                .background(palette.surface)
                .border(0.9.dp, palette.hairline, CircleShape)
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
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Medium,
                color = palette.textPrimary
            )
        }

        Spacer(Modifier.weight(1f))

        Text(
            text = "LAN · Tailscale · AES-256-GCM",
            fontSize = 10.5.sp,
            fontFamily = ArkMonoFamily,
            color = palette.textTertiary,
            modifier = Modifier.padding(bottom = 78.dp)
        )
    }
}

@Composable
private fun ConstellationPill(platform: PlatformId) {
    val palette = ArkColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .shadow(4.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.06f))
            .clip(CircleShape)
            .background(palette.surface)
            .border(0.8.dp, palette.hairline, CircleShape)
            .padding(horizontal = 11.dp, vertical = 7.dp)
    ) {
        PlatformIcon(platform = platform, size = 16.dp)
        Text(
            text = platform.displayName,
            fontSize = 11.5.sp,
            fontFamily = ArkSansFamily,
            fontWeight = FontWeight.Medium,
            color = palette.textPrimary,
            maxLines = 1
        )
    }
}

@Composable
private fun PlatformFilterRow(
    bots: List<SyncedBot>,
    selected: PlatformId?,
    onSelect: (PlatformId?) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
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
        horizontalArrangement = Arrangement.spacedBy(5.dp),
        modifier = Modifier
            .clip(CircleShape)
            .background(if (active) palette.ink else palette.surface)
            .border(0.8.dp, if (active) Color.Transparent else palette.hairline, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 11.dp, vertical = 6.5.dp)
    ) {
        if (platform != null) {
            PlatformIcon(platform = platform, size = 13.dp)
        }
        Text(
            text = label,
            fontSize = 12.sp,
            fontFamily = ArkSansFamily,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
            color = if (active) palette.onInk else palette.textPrimary
        )
        Text(
            text = count.toString(),
            fontSize = 10.sp,
            fontFamily = ArkMonoFamily,
            color = if (active) palette.onInk.copy(alpha = 0.72f) else palette.textTertiary
        )
    }
}

@Composable
private fun PinnedBentoCard(
    bot: SyncedBot,
    state: BotArkUiState,
    onClick: () -> Unit
) {
    val palette = ArkColors.current
    val status = state.status(bot)
    val lastMsg = state.snapshot.messages[bot.id]?.lastOrNull()
    val pendingCount = state.snapshot.approvals[bot.activeAccountId].orEmpty().count { it.status == "pending" }
    val shape = RoundedCornerShape(18.dp)

    Box(
        modifier = Modifier
            .width(166.dp)
            .height(122.dp)
            .shadow(6.dp, shape, ambientColor = Color.Black.copy(alpha = 0.06f))
            .clip(shape)
            .background(palette.surface)
            .background(
                Brush.radialGradient(
                    colors = listOf(bot.platformId.brandColor().copy(alpha = 0.11f), Color.Transparent),
                    center = Offset(440f, 30f),
                    radius = 280f
                )
            )
            .border(
                width = if (pendingCount > 0) 1.1.dp else 0.8.dp,
                color = if (pendingCount > 0) palette.amber.copy(alpha = 0.48f) else palette.hairline,
                shape = shape
            )
            .clickable(onClick = onClick)
            .padding(13.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                verticalAlignment = Alignment.Top,
                modifier = Modifier.fillMaxWidth()
            ) {
                BotAvatar(bot = bot, status = status, size = 36.dp)
                Spacer(Modifier.weight(1f))
                if (pendingCount > 0) {
                    Text(
                        text = "$pendingCount 审批",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(palette.amber)
                            .padding(horizontal = 7.dp, vertical = 3.dp)
                    )
                } else {
                    PlatformBadgePill(bot.platformId)
                }
            }

            Spacer(Modifier.weight(1f))

            Text(
                text = bot.name,
                fontSize = 13.5.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.SemiBold,
                color = palette.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = cleanPreview(lastMsg?.text) ?: bot.platformId.displayName,
                fontSize = 11.5.sp,
                lineHeight = 15.sp,
                color = palette.textSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun EditorialBotGroupCard(
    title: String,
    bots: List<SyncedBot>,
    state: BotArkUiState,
    onOpenBot: (String) -> Unit
) {
    val palette = ArkColors.current
    val cardShape = RoundedCornerShape(18.dp)

    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(
            text = title,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = palette.textSecondary,
            modifier = Modifier.padding(horizontal = 2.dp)
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(5.dp, cardShape, ambientColor = Color.Black.copy(alpha = 0.05f))
                .clip(cardShape)
                .background(palette.surface)
                .border(0.8.dp, palette.hairline, cardShape)
        ) {
            bots.forEachIndexed { idx, bot ->
                EditorialBotRow(bot = bot, state = state, onClick = { onOpenBot(bot.id) })
                if (idx < bots.lastIndex) {
                    HorizontalDivider(
                        thickness = 0.6.dp,
                        color = palette.hairline,
                        modifier = Modifier.padding(start = 64.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun EditorialBotRow(
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
            .padding(horizontal = 13.dp, vertical = 11.dp)
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
                        fontSize = 14.sp,
                        fontFamily = ArkSansFamily,
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
                        fontSize = 10.5.sp,
                        fontFamily = ArkMonoFamily,
                        color = palette.textTertiary
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = when {
                        isTyping -> "正在生成..."
                        else -> cleanPreview(lastMsg?.text) ?: bot.platformId.displayName
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
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(palette.amber)
                            .padding(horizontal = 6.5.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

private fun cleanPreview(raw: String?): String? {
    if (raw.isNullOrBlank()) return null
    return raw.replace("**", "").replace("`", "").replace("\n", " ")
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
