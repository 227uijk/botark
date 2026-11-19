package com.qybaihe.botark.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
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
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentPaste
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer
import com.qybaihe.botark.ui.theme.ArkColors
import kotlinx.coroutines.launch
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QRScannerSheet(
    pairingBusy: Boolean,
    lastError: String?,
    onPair: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = ArkColors.current
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current

    var manualUri by remember { mutableStateOf("") }
    var hasCameraPerm by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    var scannedOnce by remember { mutableStateOf(false) }

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasCameraPerm = granted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPerm) {
            permLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = palette.canvas
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .padding(bottom = 24.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("扫码配对", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = palette.textPrimary)
                Spacer(Modifier.weight(1f))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(palette.subtleFill)
                        .clickable(onClick = onDismiss)
                ) {
                    Icon(Icons.Rounded.Close, contentDescription = "关闭", tint = palette.textSecondary, modifier = Modifier.size(16.dp))
                }
            }

            if (hasCameraPerm) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.Black)
                ) {
                    CameraXQrPreview(
                        onCodeScanned = { code ->
                            if (!scannedOnce && !pairingBusy && code.startsWith("botark://", ignoreCase = true)) {
                                scannedOnce = true
                                manualUri = code
                                onPair(code)
                            }
                        }
                    )
                    Box(
                        modifier = Modifier
                            .size(156.dp)
                            .border(2.dp, Color.White.copy(alpha = 0.85f), RoundedCornerShape(16.dp))
                    )
                }
            } else {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.surface)
                        .border(0.8.dp, palette.hairline, RoundedCornerShape(16.dp))
                        .padding(vertical = 26.dp)
                ) {
                    Icon(Icons.Rounded.QrCodeScanner, contentDescription = null, tint = palette.accent, modifier = Modifier.size(32.dp))
                    Text("授予相机权限或粘贴配对链接", fontSize = 13.sp, color = palette.textSecondary)
                }
            }

            // Manual paste card
            val cardShape = RoundedCornerShape(15.dp)
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(palette.surface)
                    .border(0.8.dp, palette.hairline, cardShape)
                    .padding(14.dp)
            ) {
                Text("粘贴配对链接", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = palette.textSecondary)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = manualUri,
                        onValueChange = { manualUri = it },
                        placeholder = { Text("botark://pair?...", fontSize = 12.sp, fontFamily = FontFamily.Monospace) },
                        maxLines = 2,
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp, fontFamily = FontFamily.Monospace),
                        modifier = Modifier.weight(1f)
                    )
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(palette.subtleFill)
                            .clickable {
                                clipboard.getText()?.text?.let { manualUri = it }
                            }
                    ) {
                        Icon(Icons.Rounded.ContentPaste, contentDescription = "粘贴", tint = palette.textPrimary, modifier = Modifier.size(18.dp))
                    }
                }

                val ready = !pairingBusy && manualUri.trim().isNotEmpty()
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(42.dp)
                        .clip(RoundedCornerShape(11.dp))
                        .background(if (ready) palette.accent else palette.textTertiary.copy(alpha = 0.35f))
                        .clickable(enabled = ready) { onPair(manualUri) }
                ) {
                    if (pairingBusy) {
                        CircularProgressIndicator(strokeWidth = 2.dp, color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Icon(Icons.Rounded.Bolt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (pairingBusy) "配对中..." else "立即配对",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                }
            }

            if (!lastError.isNullOrBlank()) {
                Text(
                    text = lastError,
                    fontSize = 12.5.sp,
                    color = palette.orange,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(11.dp))
                        .background(palette.orange.copy(alpha = 0.12f))
                        .padding(11.dp)
                )
            }
        }
    }
}

@Composable
private fun CameraXQrPreview(onCodeScanned: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val reader = remember {
        MultiFormatReader().apply {
            setHints(mapOf(DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE)))
        }
    }

    DisposableEffect(Unit) {
        onDispose { executor.shutdown() }
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val future = ProcessCameraProvider.getInstance(ctx)
            future.addListener({
                runCatching {
                    val provider = future.get()
                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }
                    val analysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                    analysis.setAnalyzer(executor) { imageProxy ->
                        try {
                            val plane = imageProxy.planes[0]
                            val buffer = plane.buffer
                            val data = ByteArray(buffer.remaining())
                            buffer.get(data)
                            val source = PlanarYUVLuminanceSource(
                                data,
                                imageProxy.width,
                                imageProxy.height,
                                0,
                                0,
                                imageProxy.width,
                                imageProxy.height,
                                false
                            )
                            val bitmap = BinaryBitmap(HybridBinarizer(source))
                            val text = reader.decodeWithState(bitmap).text
                            if (!text.isNullOrEmpty()) {
                                ContextCompat.getMainExecutor(ctx).execute { onCodeScanned(text) }
                            }
                        } catch (_: Exception) {
                            // No QR code in frame
                        } finally {
                            reader.reset()
                            imageProxy.close()
                        }
                    }
                    provider.unbindAll()
                    provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                }
            }, ContextCompat.getMainExecutor(ctx))
            previewView
        },
        modifier = Modifier.fillMaxWidth().height(230.dp)
    )
}

@Composable
fun AddHermesDialog(
    onAdd: suspend (name: String, baseUrl: String, apiKey: String?, model: String?) -> Unit,
    onDismiss: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val palette = ArkColors.current
    var name by remember { mutableStateOf("Hermes") }
    var baseUrl by remember { mutableStateOf("http://127.0.0.1:8642") }
    var apiKey by remember { mutableStateOf("") }
    var model by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("接入 Hermes", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("名称", fontSize = 12.sp) }, singleLine = true)
                OutlinedTextField(value = baseUrl, onValueChange = { baseUrl = it }, label = { Text("Base URL", fontSize = 12.sp) }, singleLine = true)
                OutlinedTextField(value = apiKey, onValueChange = { apiKey = it }, label = { Text("API Key（可选）", fontSize = 12.sp) }, singleLine = true)
                OutlinedTextField(value = model, onValueChange = { model = it }, label = { Text("模型（留空自动探测）", fontSize = 12.sp) }, singleLine = true)
                if (error != null) {
                    Text(error!!, fontSize = 12.sp, color = palette.red)
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && baseUrl.trim().isNotEmpty(),
                onClick = {
                    scope.launch {
                        busy = true
                        error = null
                        runCatching {
                            onAdd(name, baseUrl, apiKey.ifBlank { null }, model.ifBlank { null })
                        }.onSuccess {
                            busy = false
                            onDismiss()
                        }.onFailure {
                            busy = false
                            error = it.message ?: "连接失败"
                        }
                    }
                }
            ) { Text(if (busy) "连接中..." else "添加") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
