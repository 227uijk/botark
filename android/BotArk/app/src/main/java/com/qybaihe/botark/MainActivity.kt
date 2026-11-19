package com.qybaihe.botark

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material.icons.rounded.VerifiedUser
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qybaihe.botark.ui.screens.AddHermesDialog
import com.qybaihe.botark.ui.screens.ApprovalsScreen
import com.qybaihe.botark.ui.screens.BotListScreen
import com.qybaihe.botark.ui.screens.ChatScreen
import com.qybaihe.botark.ui.screens.QRScannerSheet
import com.qybaihe.botark.ui.screens.SyncSettingsScreen
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.ui.theme.BotArkTheme
import com.qybaihe.botark.viewmodel.BotArkViewModel

enum class MainTab { CHATS, APPROVALS, SYNC }

class MainActivity : ComponentActivity() {
    private val viewModel: BotArkViewModel by viewModels()

    private val initialTabState = mutableStateOf(MainTab.CHATS)
    private val initialOpenBotState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
        )
        handleIncomingIntent(intent)

        setContent {
            BotArkTheme {
                BotArkRoot(
                    viewModel = viewModel,
                    initialTab = initialTabState.value,
                    initialOpenBotId = initialOpenBotState.value
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent == null) return
        val data = intent.data
        if (data != null && data.scheme.equals("botark", ignoreCase = true)) {
            viewModel.pair(data.toString())
        }
        if (BuildConfig.DEBUG) {
            intent.getStringExtra("pair_uri")?.takeIf { it.isNotBlank() }?.let { uri ->
                viewModel.pair(uri)
            }
            when (intent.getStringExtra("open_tab")) {
                "approvals" -> initialTabState.value = MainTab.APPROVALS
                "sync" -> initialTabState.value = MainTab.SYNC
                "chats" -> initialTabState.value = MainTab.CHATS
            }
            intent.getStringExtra("open_bot")?.takeIf { it.isNotBlank() }?.let { botId ->
                initialTabState.value = MainTab.CHATS
                initialOpenBotState.value = botId
            }
        }
    }
}

@Composable
private fun BotArkRoot(
    viewModel: BotArkViewModel,
    initialTab: MainTab,
    initialOpenBotId: String?
) {
    val palette = ArkColors.current
    val state by viewModel.uiState.collectAsState()

    var currentTab by remember { mutableStateOf(initialTab) }
    var activeBotId by remember { mutableStateOf(initialOpenBotId) }
    var showScanner by remember { mutableStateOf(false) }
    var showAddHermes by remember { mutableStateOf(false) }

    LaunchedEffect(initialTab) { currentTab = initialTab }
    LaunchedEffect(initialOpenBotId) { if (initialOpenBotId != null) activeBotId = initialOpenBotId }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.canvas)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Box(modifier = Modifier.weight(1f)) {
            if (activeBotId != null && currentTab == MainTab.CHATS) {
                ChatScreen(
                    state = state,
                    botId = activeBotId!!,
                    onBack = { activeBotId = null },
                    onSend = { bot, text -> viewModel.sendMessage(bot, text) },
                    onStop = { bot -> viewModel.stopGeneration(bot) },
                    onNewSession = { bot -> viewModel.startNewSession(bot) },
                    onDecideApproval = { item, dec -> viewModel.decideApproval(item, dec) }
                )
            } else {
                when (currentTab) {
                    MainTab.CHATS -> BotListScreen(
                        state = state,
                        onOpenBot = { activeBotId = it },
                        onOpenScanner = { showScanner = true },
                        onOpenAddHermes = { showAddHermes = true },
                        onReconnect = { viewModel.reconnectDesktop() }
                    )
                    MainTab.APPROVALS -> ApprovalsScreen(
                        state = state,
                        onDecide = { item, dec -> viewModel.decideApproval(item, dec) }
                    )
                    MainTab.SYNC -> SyncSettingsScreen(
                        state = state,
                        onOpenScanner = { showScanner = true },
                        onReconnect = { viewModel.reconnectDesktop() },
                        onUnpair = { viewModel.unpairDesktop() },
                        onOpenAddHermes = { showAddHermes = true },
                        onImportBundle = { bytes, key -> viewModel.importOfflineBundle(bytes, key) },
                        onWipeAll = { viewModel.wipeAllLocalData() }
                    )
                }
            }
        }

        // Sleek minimal bottom tab bar
        HorizontalDivider(thickness = 0.6.dp, color = palette.hairline)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .background(palette.surface)
                .padding(vertical = 6.dp)
        ) {
            BottomTabItem(
                icon = Icons.Rounded.ChatBubble,
                label = "对话",
                selected = currentTab == MainTab.CHATS,
                badgeCount = 0,
                modifier = Modifier.weight(1f)
            ) {
                currentTab = MainTab.CHATS
            }
            BottomTabItem(
                icon = Icons.Rounded.VerifiedUser,
                label = "审批",
                selected = currentTab == MainTab.APPROVALS,
                badgeCount = state.pendingApprovals.size,
                modifier = Modifier.weight(1f)
            ) {
                activeBotId = null
                currentTab = MainTab.APPROVALS
            }
            BottomTabItem(
                icon = Icons.Rounded.QrCodeScanner,
                label = "同步",
                selected = currentTab == MainTab.SYNC,
                badgeCount = 0,
                modifier = Modifier.weight(1f)
            ) {
                activeBotId = null
                currentTab = MainTab.SYNC
            }
        }
    }

    if (showScanner) {
        QRScannerSheet(
            pairingBusy = state.pairingBusy,
            lastError = state.lastError,
            onPair = { uri ->
                viewModel.pair(uri) {
                    showScanner = false
                }
            },
            onDismiss = { showScanner = false }
        )
    }

    if (showAddHermes) {
        AddHermesDialog(
            onAdd = { name, url, key, model ->
                viewModel.addStandaloneHermes(name, url, key, model)
            },
            onDismiss = { showAddHermes = false }
        )
    }
}

@Composable
private fun BottomTabItem(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    badgeCount: Int,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val palette = ArkColors.current
    val tint = if (selected) palette.accent else palette.textTertiary

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
        modifier = modifier
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp)
    ) {
        Box(contentAlignment = Alignment.TopEnd) {
            Icon(icon, contentDescription = label, tint = tint, modifier = Modifier.size(21.dp))
            if (badgeCount > 0) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .offset(x = 7.dp, y = (-3).dp)
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(palette.red)
                ) {
                    Text(
                        text = if (badgeCount > 9) "9+" else badgeCount.toString(),
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
        Text(
            text = label,
            fontSize = 10.5.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            color = tint
        )
    }
}
