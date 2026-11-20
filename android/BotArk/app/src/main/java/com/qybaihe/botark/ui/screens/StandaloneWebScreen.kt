package com.qybaihe.botark.ui.screens

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Message
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.OpenInBrowser
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.WifiOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.qybaihe.botark.ui.components.PlatformIcon
import com.qybaihe.botark.ui.theme.ArkColors
import com.qybaihe.botark.ui.theme.ArkMonoFamily
import com.qybaihe.botark.ui.theme.ArkSansFamily
import com.qybaihe.botark.ui.theme.brandColor
import com.qybaihe.botark.viewmodel.BotArkUiState
import java.net.URI

/**
 * Full-featured standalone in-app WebView session for web-native AI agents (Antigravity,
 * Meta Muse, ChatGPT Dot, Hark, Grok). Strips `; wv)` from User-Agent so Google/Meta OAuth
 * works seamlessly right on-device with zero desktop dependency.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun StandaloneWebScreen(
    state: BotArkUiState,
    botId: String,
    onBack: () -> Unit,
    onRemoveBot: (String) -> Unit
) {
    val palette = ArkColors.current
    val context = LocalContext.current
    val bot = state.snapshot.bots.firstOrNull { it.id == botId }
    val initialUrl = bot?.standaloneUrl?.takeIf { it.isNotBlank() }
        ?: bot?.platformId?.defaultHomeUrl
        ?: "https://antigravity.google.com"

    var currentUrl by remember(botId) { mutableStateOf(initialUrl) }
    var progress by remember(botId) { mutableIntStateOf(0) }
    var isLoading by remember(botId) { mutableStateOf(true) }
    var canGoBack by remember(botId) { mutableStateOf(false) }
    var loadError by remember(botId) { mutableStateOf<String?>(null) }
    var webViewRef by remember(botId) { mutableStateOf<WebView?>(null) }
    var menuExpanded by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    DisposableEffect(botId) {
        onDispose {
            webViewRef?.stopLoading()
            webViewRef?.destroy()
            webViewRef = null
        }
    }

    BackHandler(enabled = canGoBack) {
        webViewRef?.goBack()
    }

    val displayHost = remember(currentUrl) {
        runCatching { URI(currentUrl).host }.getOrNull().orEmpty().ifBlank { currentUrl }
    }

    Column(modifier = Modifier.fillMaxSize().background(palette.canvas)) {
        // Signature Warm Alabaster + Obsidian Chrome Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, CircleShape)
                    .clickable {
                        if (canGoBack) webViewRef?.goBack() else onBack()
                    }
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "返回",
                    tint = palette.textPrimary,
                    modifier = Modifier.size(16.dp)
                )
            }

            Spacer(Modifier.width(10.dp))

            if (bot != null) {
                PlatformIcon(platform = bot.platformId, size = 22.dp)
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp)
                    ) {
                        Text(
                            text = bot.name,
                            fontSize = 14.5.sp,
                            fontFamily = ArkSansFamily,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = (-0.2).sp,
                            color = palette.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "独立",
                            fontSize = 9.5.sp,
                            fontFamily = ArkSansFamily,
                            fontWeight = FontWeight.Medium,
                            color = bot.platformId.brandColor(),
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(bot.platformId.brandColor().copy(alpha = 0.11f))
                                .padding(horizontal = 5.dp, vertical = 1.dp)
                        )
                    }
                    Text(
                        text = displayHost,
                        fontSize = 10.5.sp,
                        fontFamily = ArkMonoFamily,
                        color = palette.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            } else {
                Spacer(Modifier.weight(1f))
            }

            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, CircleShape)
                    .clickable {
                        val wv = webViewRef
                        if (wv != null) {
                            if (isLoading) wv.stopLoading() else wv.reload()
                        }
                    }
            ) {
                Icon(
                    imageVector = if (isLoading) Icons.Rounded.Close else Icons.Rounded.Refresh,
                    contentDescription = "刷新",
                    tint = palette.textPrimary,
                    modifier = Modifier.size(15.dp)
                )
            }

            Spacer(Modifier.width(6.dp))

            Box {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(palette.surface)
                        .border(0.8.dp, palette.hairline, CircleShape)
                        .clickable { menuExpanded = true }
                ) {
                    Icon(
                        imageVector = Icons.Rounded.MoreHoriz,
                        contentDescription = "更多",
                        tint = palette.textPrimary,
                        modifier = Modifier.size(15.dp)
                    )
                }

                DropdownMenu(
                    expanded = menuExpanded,
                    onDismissRequest = { menuExpanded = false }
                ) {
                    if (canGoBack) {
                        DropdownMenuItem(
                            text = { Text("返回 Bot 列表", fontFamily = ArkSansFamily) },
                            leadingIcon = { Icon(Icons.AutoMirrored.Rounded.ArrowBack, null) },
                            onClick = {
                                menuExpanded = false
                                onBack()
                            }
                        )
                    }
                    DropdownMenuItem(
                        text = { Text("在外部浏览器打开", fontFamily = ArkSansFamily) },
                        leadingIcon = { Icon(Icons.Rounded.OpenInBrowser, null) },
                        onClick = {
                            menuExpanded = false
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(currentUrl)))
                            }
                        }
                    )
                    DropdownMenuItem(
                        text = {
                            Text(
                                "移除此独立 Bot",
                                fontFamily = ArkSansFamily,
                                color = palette.rose
                            )
                        },
                        leadingIcon = {
                            Icon(Icons.Rounded.DeleteOutline, null, tint = palette.rose)
                        },
                        onClick = {
                            menuExpanded = false
                            confirmDelete = true
                        }
                    )
                }
            }
        }

        HorizontalDivider(thickness = 0.6.dp, color = palette.hairline)

        // WebView + Brand Hairline Progress Bar
        Box(modifier = Modifier.fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebView(ctx).apply {
                        val cm = CookieManager.getInstance()
                        cm.setAcceptCookie(true)
                        cm.setAcceptThirdPartyCookies(this, true)

                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.loadsImagesAutomatically = true
                        settings.javaScriptCanOpenWindowsAutomatically = true
                        settings.setSupportMultipleWindows(true)
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        // Strip "; wv" so Google Sign-In & Meta CAA treat it as standard Chrome Mobile
                        settings.userAgentString = settings.userAgentString
                            .replace("; wv)", ")")
                            .replace("Version/4.0 ", "")

                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): Boolean {
                                val u = request?.url?.toString() ?: return false
                                return if (u.startsWith("http://") || u.startsWith("https://")) {
                                    false
                                } else {
                                    runCatching {
                                        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(u)))
                                    }
                                    true
                                }
                            }

                            override fun onReceivedError(
                                view: WebView?,
                                request: WebResourceRequest?,
                                error: WebResourceError?
                            ) {
                                if (request?.isForMainFrame == true) {
                                    isLoading = false
                                    loadError = error?.description?.toString()?.ifBlank { null }
                                        ?: "网络连接异常，请检查网络或代理设置"
                                }
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                isLoading = false
                                canGoBack = view?.canGoBack() == true
                                if (!url.isNullOrBlank()) currentUrl = url
                                CookieManager.getInstance().flush()
                            }
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                progress = newProgress
                                isLoading = newProgress in 1..99
                                canGoBack = view?.canGoBack() == true
                            }

                            override fun onCreateWindow(
                                view: WebView?,
                                isDialog: Boolean,
                                isUserGesture: Boolean,
                                resultMsg: Message?
                            ): Boolean {
                                val href = view?.hitTestResult?.extra
                                if (!href.isNullOrBlank()) {
                                    view.loadUrl(href)
                                    return false
                                }
                                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                                val temp = WebView(ctx).apply {
                                    webViewClient = object : WebViewClient() {
                                        override fun shouldOverrideUrlLoading(
                                            wv: WebView?,
                                            req: WebResourceRequest?
                                        ): Boolean {
                                            val target = req?.url?.toString()
                                            if (!target.isNullOrBlank()) view?.loadUrl(target)
                                            return true
                                        }
                                    }
                                }
                                transport.webView = temp
                                resultMsg.sendToTarget()
                                return true
                            }
                        }

                        webViewRef = this
                        loadUrl(initialUrl)
                    }
                }
            )

            loadError?.let { errMsg ->
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .background(palette.canvas)
                        .padding(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.WifiOff,
                        contentDescription = null,
                        tint = palette.textSecondary,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = "页面暂时无法加载",
                        fontSize = 15.sp,
                        fontFamily = ArkSansFamily,
                        fontWeight = FontWeight.SemiBold,
                        color = palette.textPrimary
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = errMsg,
                        fontSize = 12.sp,
                        color = palette.textSecondary,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(16.dp))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .height(38.dp)
                            .clip(CircleShape)
                            .background(palette.ink)
                            .clickable {
                                loadError = null
                                isLoading = true
                                webViewRef?.reload()
                            }
                            .padding(horizontal = 20.dp)
                    ) {
                        Text(
                            text = "重新加载",
                            fontSize = 13.5.sp,
                            fontFamily = ArkSansFamily,
                            fontWeight = FontWeight.SemiBold,
                            color = palette.onInk
                        )
                    }
                }
            }

            if (isLoading && progress in 1..99) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(fraction = (progress / 100f).coerceIn(0.08f, 1f))
                        .height(2.dp)
                        .background(bot?.platformId?.brandColor() ?: palette.accent)
                )
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            shape = RoundedCornerShape(22.dp),
            title = { Text("移除独立 Bot？", fontFamily = ArkSansFamily, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "仅移除手机端此独立 Bot，不会影响电脑端账号。",
                    fontFamily = ArkSansFamily,
                    fontSize = 13.5.sp
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmDelete = false
                        onBack()
                        onRemoveBot(botId)
                    }
                ) {
                    Text("移除", color = palette.rose, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) {
                    Text("取消")
                }
            }
        )
    }
}
