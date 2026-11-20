package com.qybaihe.botark.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qybaihe.botark.model.PlatformId
import com.qybaihe.botark.ui.components.PlatformIcon
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.ui.theme.ArkMonoFamily
import com.qybaihe.botark.ui.theme.ArkSansFamily
import com.qybaihe.botark.ui.theme.brandColor

/**
 * Reusable tactile 2-column platform picker card used right on the launch screen
 * and inside the `+` Add Bot sheet.
 */
@Composable
fun PlatformPickerCard(
    platform: PlatformId,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = ArkColors.current
    val brand = platform.brandColor()

    Column(
        modifier = modifier
            .shadow(6.dp, RoundedCornerShape(17.dp), ambientColor = Color.Black.copy(alpha = 0.08f))
            .clip(RoundedCornerShape(17.dp))
            .background(palette.surface)
            .border(0.8.dp, palette.hairline, RoundedCornerShape(17.dp))
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(brand.copy(alpha = 0.11f))
            ) {
                PlatformIcon(platform = platform, size = 22.dp)
            }
            Spacer(Modifier.weight(1f))
            Text(
                text = platform.standaloneTag,
                fontSize = 9.5.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.Medium,
                color = brand,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(brand.copy(alpha = 0.10f))
                    .padding(horizontal = 6.5.dp, vertical = 2.dp)
            )
        }
        Spacer(Modifier.height(10.dp))
        Text(
            text = platform.displayName,
            fontSize = 13.5.sp,
            fontFamily = ArkSansFamily,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = (-0.2).sp,
            color = palette.textPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = platform.standaloneSubtitle,
            fontSize = 11.sp,
            color = palette.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/** 2-column grid of all 6 platforms. */
@Composable
fun PlatformPickerGrid(
    onPickPlatform: (PlatformId) -> Unit,
    modifier: Modifier = Modifier
) {
    val rows = remember { PlatformId.pickerOrder.chunked(2) }
    Column(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        rows.forEach { pair ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                pair.forEach { platform ->
                    PlatformPickerCard(
                        platform = platform,
                        onClick = { onPickPlatform(platform) },
                        modifier = Modifier.weight(1f)
                    )
                }
                if (pair.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddBotPickerSheet(
    onPickPlatform: (PlatformId) -> Unit,
    onOpenScanner: () -> Unit,
    onDismiss: () -> Unit
) {
    val palette = ArkColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = palette.canvas
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp)
                .padding(bottom = 28.dp)
        ) {
            Text(
                text = "添加独立智能体",
                fontSize = 20.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.4).sp,
                color = palette.textPrimary
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "手机独立运行，无需电脑端在线。",
                fontSize = 12.5.sp,
                color = palette.textSecondary
            )
            Spacer(Modifier.height(16.dp))

            PlatformPickerGrid(
                onPickPlatform = { platform ->
                    onDismiss()
                    onPickPlatform(platform)
                }
            )

            Spacer(Modifier.height(14.dp))

            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .clip(CircleShape)
                    .background(palette.ink)
                    .clickable {
                        onDismiss()
                        onOpenScanner()
                    }
            ) {
                Icon(
                    imageVector = Icons.Rounded.QrCodeScanner,
                    contentDescription = null,
                    tint = palette.onInk,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = "或扫码同步电脑端全部 Bot",
                    fontSize = 13.5.sp,
                    fontFamily = ArkSansFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = palette.onInk
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddStandaloneWebBotSheet(
    platform: PlatformId,
    onCreate: (name: String) -> Unit,
    onSwitchToQR: () -> Unit,
    onDismiss: () -> Unit
) {
    val palette = ArkColors.current
    val brand = platform.brandColor()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var name by remember(platform) { mutableStateOf(platform.displayName) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = palette.canvas
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(64.dp)
                    .shadow(10.dp, RoundedCornerShape(20.dp), ambientColor = brand.copy(alpha = 0.25f))
                    .clip(RoundedCornerShape(20.dp))
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, RoundedCornerShape(20.dp))
            ) {
                PlatformIcon(platform = platform, size = 36.dp)
            }

            Spacer(Modifier.height(12.dp))
            Text(
                text = platform.displayName,
                fontSize = 19.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.Bold,
                letterSpacing = (-0.3).sp,
                color = palette.textPrimary
            )
            Spacer(Modifier.height(3.dp))
            Text(
                text = platform.defaultHomeUrl,
                fontSize = 11.5.sp,
                fontFamily = ArkMonoFamily,
                color = palette.textSecondary
            )

            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                singleLine = true,
                label = { Text("Bot 名称", fontFamily = ArkSansFamily) },
                shape = RoundedCornerShape(13.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(10.dp))
            Text(
                text = "将在手机端创建独立会话并直接打开官方登录页，完全无需电脑在线。",
                fontSize = 12.sp,
                color = palette.textSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(20.dp))

            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .shadow(10.dp, CircleShape, ambientColor = Color.Black.copy(alpha = 0.18f))
                    .clip(CircleShape)
                    .background(palette.ink)
                    .clickable {
                        val finalName = name.trim().ifEmpty { platform.displayName }
                        onDismiss()
                        onCreate(finalName)
                    }
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.OpenInNew,
                    contentDescription = null,
                    tint = palette.onInk,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(7.dp))
                Text(
                    text = "创建并立即登录",
                    fontSize = 14.5.sp,
                    fontFamily = ArkSansFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = palette.onInk
                )
            }

            Spacer(Modifier.height(10.dp))
            Text(
                text = "已有电脑端账号？扫码同步",
                fontSize = 12.5.sp,
                fontFamily = ArkSansFamily,
                fontWeight = FontWeight.Medium,
                color = palette.textSecondary,
                modifier = Modifier
                    .clip(CircleShape)
                    .clickable {
                        onDismiss()
                        onSwitchToQR()
                    }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            )
        }
    }
}
