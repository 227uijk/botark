import type { PlatformId } from '@adapters/types'
import type { SecurityVaultStatus } from '@shared/ipc'
import { getBridge } from './bridge'

const DOT_MEMORY_VAULT_KEY = 'dot.memory.snapshot.v1'
const LEGACY_LOCALSTORAGE_KEY = 'bothub.dot.memorySnapshot'

let memoryFallbackCache = ''

/**
 * Load the Dot cross-account memory migration draft from the main-process
 * `safeStorage` vault, automatically migrating and purging any legacy plaintext
 * `window.localStorage` entry left by older builds.
 */
export async function loadDotMemoryDraft(): Promise<string> {
  let legacyPlain = ''
  try {
    if (typeof window !== 'undefined') {
      legacyPlain = window.localStorage.getItem(LEGACY_LOCALSTORAGE_KEY) || ''
    }
  } catch {
    /* ignore */
  }

  const vault = getBridge()?.vault
  if (!vault) {
    return legacyPlain || memoryFallbackCache
  }

  try {
    if (legacyPlain) {
      await vault.setSecret(DOT_MEMORY_VAULT_KEY, legacyPlain)
      try {
        window.localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
      } catch {
        /* ignore */
      }
      memoryFallbackCache = legacyPlain
      return legacyPlain
    }
    const stored = await vault.getSecret(DOT_MEMORY_VAULT_KEY)
    memoryFallbackCache = stored ?? ''
    return memoryFallbackCache
  } catch {
    return memoryFallbackCache
  }
}

/**
 * Persist the Dot cross-account memory migration draft into the encrypted
 * main-process `safeStorage` vault (never into plaintext `localStorage`).
 */
export async function saveDotMemoryDraft(markdown: string): Promise<boolean> {
  memoryFallbackCache = markdown
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY)
    }
  } catch {
    /* ignore */
  }

  const vault = getBridge()?.vault
  if (!vault) return false

  try {
    if (!markdown.trim()) {
      await vault.deleteSecret(DOT_MEMORY_VAULT_KEY)
      return true
    }
    const res = await vault.setSecret(DOT_MEMORY_VAULT_KEY, markdown)
    return res.encrypted
  } catch {
    return false
  }
}

export async function fetchSecurityVaultStatus(
  accountId?: string,
  platformId?: PlatformId
): Promise<SecurityVaultStatus | null> {
  const vault = getBridge()?.vault
  if (!vault?.status) return null
  try {
    return await vault.status({ accountId, platformId })
  } catch {
    return null
  }
}

export async function hardenSecurityVaultPermissions(): Promise<{
  repaired: number
  status: SecurityVaultStatus
} | null> {
  const vault = getBridge()?.vault
  if (!vault?.hardenPermissions) return null
  try {
    return await vault.hardenPermissions()
  } catch {
    return null
  }
}
