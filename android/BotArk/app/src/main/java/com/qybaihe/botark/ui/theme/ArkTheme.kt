package com.qybaihe.botark.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import com.qybaihe.botark.model.ConnectionStatus
import com.qybaihe.botark.model.PlatformId

data class ArkPalette(
    val canvas: Color,
    val surface: Color,
    val subtleFill: Color,
    val hairline: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val accent: Color,
    val green: Color,
    val orange: Color,
    val red: Color
)

private val LightPalette = ArkPalette(
    canvas = Color(0xFFF6F7F9),
    surface = Color(0xFFFFFFFF),
    subtleFill = Color(0x0B0F172A),
    hairline = Color(0x120F172A),
    textPrimary = Color(0xFF0F172A),
    textSecondary = Color(0xFF64748B),
    textTertiary = Color(0xFF94A3B8),
    accent = Color(0xFF2563EB),
    green = Color(0xFF22C55E),
    orange = Color(0xFFF59E0B),
    red = Color(0xFFEF4444)
)

private val DarkPalette = ArkPalette(
    canvas = Color(0xFF0B0D12),
    surface = Color(0xFF141720),
    subtleFill = Color(0x12FFFFFF),
    hairline = Color(0x17FFFFFF),
    textPrimary = Color(0xFFF8FAFC),
    textSecondary = Color(0xFF94A3B8),
    textTertiary = Color(0xFF64748B),
    accent = Color(0xFF3B82F6),
    green = Color(0xFF22C55E),
    orange = Color(0xFFF59E0B),
    red = Color(0xFFF87171)
)

val LocalArkPalette = staticCompositionLocalOf { LightPalette }

object ArkColors {
    val current: ArkPalette
        @Composable get() = LocalArkPalette.current
}

fun PlatformId.brandColor(): Color = when (this) {
    PlatformId.GROK -> Color(0xFF2E3547)
    PlatformId.META_MUSE -> Color(0xFF1775F2)
    PlatformId.DOT -> Color(0xFF0D9E7D)
    PlatformId.HARK -> Color(0xFFE66629)
    PlatformId.HERMES -> Color(0xFF7052ED)
}

fun ConnectionStatus.dotColor(): Color = when (this) {
    ConnectionStatus.ONLINE -> Color(0xFF22C55E)
    ConnectionStatus.BUSY -> Color(0xFF2563EB)
    ConnectionStatus.ATTENTION -> Color(0xFFF59E0B)
    ConnectionStatus.OFFLINE -> Color(0xFF94A3B8)
    ConnectionStatus.ERROR -> Color(0xFFEF4444)
}

@Composable
fun BotArkTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = palette.accent,
            background = palette.canvas,
            surface = palette.surface,
            onPrimary = Color.White,
            onBackground = palette.textPrimary,
            onSurface = palette.textPrimary
        )
    } else {
        lightColorScheme(
            primary = palette.accent,
            background = palette.canvas,
            surface = palette.surface,
            onPrimary = Color.White,
            onBackground = palette.textPrimary,
            onSurface = palette.textPrimary
        )
    }

    CompositionLocalProvider(LocalArkPalette provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content
        )
    }
}
