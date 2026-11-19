package com.qybaihe.botark.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.AddCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.FileDownload
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Laptop
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qybaihe.botark.model.PlatformId
import com.qybaihe.botark.ui.components.PlatformIcon
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.viewmodel.BotArkUiState

@Composable
fun SyncSettingsScreen(
    state: BotArkUiState,
    onOpenScanner: () -> Unit,
    onReconnect: () -> Unit,
    onUnpair: () -> Unit,
    onOpenAddHermes: () -> Unit,
    onImportBundle: (ByteArray, String) -> Result<Int>,
    onWipeAll: () -> Unit
) {
    val palette = ArkColors.current
    val context = LocalContext.current

    var pendingBundleBytes by remember { mutableStateOf<ByteArray?>(null) }
    var transferKey by remember { mutableStateOf("") }
    var importNotice by remember { mutableStateOf<String?>(null) }
    var importError by remember { mutableStateOf<String?>(null) }
    var showWipeConfirm by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        importNotice = null
        importError = null
        runCatching {
            context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        }.onSuccess { bytes ->
            if (bytes != null) {
                pendingBundleBytes = bytes
                transferKey = ""
            }
        }.onFailure {
            importError = it.message
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.canvas)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "同步",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = palette.textPrimary
        )

        // Section 1: Desktop Bridge Card
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionTitle("电脑端桥接")
            val cardShape = RoundedCornerShape(15.dp)
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, cardShape)
                    .padding(14.dp)
            ) {
                val desktop = state.pairedDesktop
                if (desktop != null) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(palette.accent.copy(alpha = 0.10f))
                        ) {
                            Icon(Icons.Rounded.Laptop, contentDescription = null, tint = palette.accent, modifier = Modifier.size(18.dp))
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(desktop.hostName, fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold, color = palette.textPrimary)
                            Text(
                                text = "${desktop.activeHost}:${desktop.port} · ${desktop.fingerprint}",
                                fontSize = 11.5.sp,
                                fontFamily = FontFamily.Monospace,
                                color = palette.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        val online = state.connectionState.isBridgeConnected
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier
                                .clip(CircleShape)
                                .background((if (online) palette.green else palette.textTertiary).copy(alpha = 0.12f))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(if (online) palette.green else palette.textTertiary)
                            )
                            Text(
                                text = if (online) "在线" else "离线",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (online) Color(0xFF15803D) else palette.textSecondary
                            )
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .weight(1f)
                                .height(35.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(palette.subtleFill)
                                .clickable(onClick = onReconnect)
                        ) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null, tint = palette.textPrimary, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(5.dp))
                            Text("重连", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = palette.textPrimary)
                        }

                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .weight(1f)
                                .height(35.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(palette.accent)
                                .clickable(onClick = onOpenScanner)
                        ) {
                            Icon(Icons.Rounded.QrCodeScanner, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(5.dp))
                            Text("重新扫码", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        }

                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(35.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(palette.red.copy(alpha = 0.09f))
                                .clickable(onClick = onUnpair)
                        ) {
                            Icon(Icons.Rounded.Close, contentDescription = "解绑", tint = palette.red, modifier = Modifier.size(15.dp))
                        }
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(palette.accent.copy(alpha = 0.10f))
                        ) {
                            Icon(Icons.Rounded.QrCodeScanner, contentDescription = null, tint = palette.accent, modifier = Modifier.size(18.dp))
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("未配对电脑端", fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold, color = palette.textPrimary)
                            Text("局域网 / 热点 / Tailscale 直连", fontSize = 12.sp, color = palette.textSecondary)
                        }
                        Text(
                            text = "扫码",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(palette.accent)
                                .clickable(onClick = onOpenScanner)
                                .padding(horizontal = 14.dp, vertical = 7.dp)
                        )
                    }
                }
            }
        }

        // Section 2: Offline Encrypted Bundle
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionTitle("离线同步包")
            val cardShape = RoundedCornerShape(15.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, cardShape)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { filePicker.launch(arrayOf("*/*")) }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Icon(Icons.Rounded.FileDownload, contentDescription = null, tint = palette.accent, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("导入 .botark-sync 加密包", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = palette.textPrimary)
                    Spacer(Modifier.weight(1f))
                    Text("离线文件", fontSize = 11.sp, color = palette.textSecondary)
                    Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = palette.textTertiary, modifier = Modifier.size(16.dp))
                }
                if (importNotice != null) {
                    HorizontalDivider(thickness = 0.6.dp, color = palette.hairline)
                    Text(
                        text = importNotice!!,
                        fontSize = 12.sp,
                        color = palette.green,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
                if (importError != null) {
                    HorizontalDivider(thickness = 0.6.dp, color = palette.hairline)
                    Text(
                        text = importError!!,
                        fontSize = 12.sp,
                        color = palette.red,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }

        // Section 3: Direct Hermes Keystore
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SectionTitle("Hermes 脱机直连")
            val cardShape = RoundedCornerShape(15.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, cardShape)
            ) {
                state.directHermesCredentials.forEach { cred ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        PlatformIcon(PlatformId.HERMES, size = 22.dp)
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Text(
                                text = cred.botName ?: cred.displayName ?: "Hermes",
                                fontSize = 13.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = palette.textPrimary
                            )
                            Text(
                                text = cred.baseUrl,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = palette.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Text(
                            text = "Keystore",
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF15803D),
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(palette.green.copy(alpha = 0.12f))
                                .padding(horizontal = 7.dp, vertical = 3.dp)
                        )
                    }
                    HorizontalDivider(thickness = 0.6.dp, color = palette.hairline, modifier = Modifier.padding(start = 46.dp))
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onOpenAddHermes)
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Icon(Icons.Rounded.AddCircle, contentDescription = null, tint = palette.accent, modifier = Modifier.size(18.dp))
                    Text("添加独立 Hermes 服务器", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = palette.accent)
                }
            }
        }

        // Minimal security tags + wipe button
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp)
        ) {
            FooterMiniTag(Icons.Rounded.CloudOff, "无服务器")
            FooterMiniTag(Icons.Rounded.Lock, "AES-256-GCM")
            FooterMiniTag(Icons.Rounded.Key, "Keystore")
        }

        val wipeShape = RoundedCornerShape(13.dp)
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .clip(wipeShape)
                .background(palette.surface)
                .border(0.8.dp, palette.hairline, wipeShape)
                .clickable { showWipeConfirm = true }
                .padding(vertical = 11.dp)
        ) {
            Text("清空本机缓存与密钥", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = palette.red)
        }
    }

    if (pendingBundleBytes != null) {
        AlertDialog(
            onDismissRequest = { pendingBundleBytes = null },
            title = { Text("输入传输密钥", fontSize = 16.sp, fontWeight = FontWeight.SemiBold) },
            text = {
                OutlinedTextField(
                    value = transferKey,
                    onValueChange = { transferKey = it },
                    placeholder = { Text("粘贴电脑端显示的密钥", fontSize = 13.sp) },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val bytes = pendingBundleBytes!!
                    val res = onImportBundle(bytes, transferKey)
                    res.onSuccess { count ->
                        importNotice = "已导入 $count 个智能体"
                        importError = null
                    }.onFailure {
                        importError = "密钥错误或文件损坏"
                    }
                    pendingBundleBytes = null
                }) { Text("解密导入") }
            },
            dismissButton = {
                TextButton(onClick = { pendingBundleBytes = null }) { Text("取消") }
            }
        )
    }

    if (showWipeConfirm) {
        AlertDialog(
            onDismissRequest = { showWipeConfirm = false },
            title = { Text("清空本机同步缓存与密钥？", fontSize = 16.sp, fontWeight = FontWeight.SemiBold) },
            confirmButton = {
                TextButton(onClick = {
                    showWipeConfirm = false
                    onWipeAll()
                }) { Text("清空", color = palette.red) }
            },
            dismissButton = {
                TextButton(onClick = { showWipeConfirm = false }) { Text("取消") }
            }
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    val palette = ArkColors.current
    Text(
        text = text,
        fontSize = 11.5.sp,
        fontWeight = FontWeight.SemiBold,
        color = palette.textSecondary,
        modifier = Modifier.padding(horizontal = 4.dp)
    )
}

@Composable
private fun FooterMiniTag(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    val palette = ArkColors.current
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, tint = palette.textTertiary, modifier = Modifier.size(12.dp))
        Text(text, fontSize = 11.sp, color = palette.textTertiary)
    }
}
