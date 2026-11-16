import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const dir = mkdtempSync(join(tmpdir(), 'bothub-vault-'))
let encryptionAvailable = true

vi.mock('electron', () => ({
  app: {
    getPath: () => dir,
    isPackaged: false
  },
  ipcMain: {
    handle: vi.fn()
  },
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    isAsyncEncryptionAvailable: async () => encryptionAvailable,
    encryptStringAsync: async (plain: string) => Buffer.from(`enc:${plain}`, 'utf8'),
    decryptStringAsync: async (buf: Buffer) => {
      const str = buf.toString('utf8')
      if (!str.startsWith('enc:')) throw new Error('corrupt ciphertext')
      return { result: str.slice(4), shouldReEncrypt: false }
    }
  },
  session: {
    fromPartition: () => ({ setProxy: vi.fn(async () => undefined) })
  }
}))

vi.mock('./webContentsViewManager', () => ({
  partitionForAccount: (id: string) => `persist:bothub-account-${id}`
}))

const {
  clearAllVaultSecrets,
  deleteVaultSecret,
  getSecurityVaultStatus,
  getVaultSecret,
  hardenVaultFilePermissions,
  setVaultSecret
} = await import('./securityVault')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

beforeEach(async () => {
  encryptionAvailable = true
  await clearAllVaultSecrets()
})

describe('securityVault', () => {
  it('encrypts secrets via safeStorage with 0600 permissions and never writes plaintext', async () => {
    const secret = 'sensitive-dot-memory-snapshot-markdown'
    const res = await setVaultSecret('dot.memory.draft', secret)
    expect(res.ok).toBe(true)
    expect(res.encrypted).toBe(true)

    const diskRaw = readFileSync(join(dir, 'bothub-vault.json'), 'utf8')
    expect(diskRaw).not.toContain(secret)

    if (process.platform !== 'win32') {
      const mode = statSync(join(dir, 'bothub-vault.json')).mode & 0o777
      expect(mode).toBe(0o600)
    }

    await expect(getVaultSecret('dot.memory.draft')).resolves.toBe(secret)
    await deleteVaultSecret('dot.memory.draft')
    await expect(getVaultSecret('dot.memory.draft')).resolves.toBeNull()
  })

  it('fails closed when safeStorage is unavailable', async () => {
    encryptionAvailable = false
    await expect(setVaultSecret('dot.memory.draft', 'secret')).rejects.toThrow(/safeStorage/)
  })

  it('rejects unsafe vault keys', async () => {
    await expect(setVaultSecret('../escape', 'x')).rejects.toBeInstanceOf(TypeError)
  })

  it('audits and repairs loose file permissions to 0600', async () => {
    const looseFile = join(dir, 'dot-accounts.json')
    writeFileSync(looseFile, JSON.stringify({ acc_1: { encTokens: 'abc' } }), { mode: 0o644 })
    if (process.platform !== 'win32') {
      chmodSync(looseFile, 0o644)
      const before = await getSecurityVaultStatus({ accountId: 'acc_1', platformId: 'dot' })
      const dotStore = before.stores.find((s) => s.id === 'dot-tokens')
      expect(dotStore?.ownerOnly).toBe(false)

      const repaired = hardenVaultFilePermissions()
      expect(repaired).toBeGreaterThanOrEqual(1)

      const after = await getSecurityVaultStatus({ accountId: 'acc_1', platformId: 'dot' })
      expect(after.stores.find((s) => s.id === 'dot-tokens')?.ownerOnly).toBe(true)
      expect(after.accountAudit?.partition).toBe('persist:bothub-account-acc_1')
      expect(after.accountAudit?.failClosedGuard).toBe(true)
    }
  })
})
