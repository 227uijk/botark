package com.qybaihe.botark.service

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Cross-platform AES-256-GCM helper binary-compatible with:
 * - BotArk Desktop Node.js (`mobileSyncCrypto.ts`)
 * - BotArk iOS Swift CryptoKit (`SyncCrypto.swift`)
 *
 * Combined wire format: base64([12-byte IV][ciphertext][16-byte authTag])
 */
object SyncCrypto {
    private const val IV_BYTES = 12
    private const val TAG_BITS = 128

    fun decodeBase64Url(input: String): ByteArray {
        val trimmed = input.trim()
        return Base64.getUrlDecoder().decode(trimmed)
    }

    fun encodeBase64Url(data: ByteArray): String {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data)
    }

    fun decryptAesGcmCombined(combinedBase64: String, keyBase64Url: String): ByteArray {
        val keyBytes = decodeBase64Url(keyBase64Url)
        require(keyBytes.size == 32) { "AES-256 密钥长度应为 32 字节（当前 ${keyBytes.size} 字节）" }

        val combined = Base64.getDecoder().decode(combinedBase64.trim())
        require(combined.size >= IV_BYTES + 16) { "密文长度损坏" }

        val iv = combined.copyOfRange(0, IV_BYTES)
        val cipherAndTag = combined.copyOfRange(IV_BYTES, combined.size)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(TAG_BITS, iv))
        return cipher.doFinal(cipherAndTag)
    }

    fun encryptAesGcmCombined(
        plaintext: ByteArray,
        keyBase64Url: String,
        ivOverride: ByteArray? = null
    ): String {
        val keyBytes = decodeBase64Url(keyBase64Url)
        require(keyBytes.size == 32) { "AES-256 密钥长度应为 32 字节" }

        val iv = ivOverride ?: ByteArray(IV_BYTES).also { SecureRandom().nextBytes(it) }
        require(iv.size == IV_BYTES) { "GCM IV 必须为 12 字节" }

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(TAG_BITS, iv))
        val cipherAndTag = cipher.doFinal(plaintext)

        val combined = ByteArray(iv.size + cipherAndTag.size)
        System.arraycopy(iv, 0, combined, 0, iv.size)
        System.arraycopy(cipherAndTag, 0, combined, iv.size, cipherAndTag.size)
        return Base64.getEncoder().encodeToString(combined)
    }

    fun fingerprint(keyBase64Url: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(keyBase64Url.toByteArray(Charsets.UTF_8))
        return digest.take(4).joinToString("") { "%02X".format(it) }
    }
}
