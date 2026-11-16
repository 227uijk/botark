import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const dir = mkdtempSync(join(tmpdir(), 'bothub-hark-proxy-'))
const setProxy = vi.fn(async (_cfg: unknown) => undefined)
const sesFetch = vi.fn(async () => new Response(JSON.stringify({ user: { id: 'u1', email: 'a@b.com' } }), { status: 200 }))

vi.mock('electron', () => ({
  app: { getPath: () => dir },
  safeStorage: {
    isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: async (plain: string) => Buffer.from(`ok:${plain}`, 'utf8'),
    decryptStringAsync: async (buf: Buffer) => {
      const s = buf.toString('utf8')
      if (!s.startsWith('ok:')) throw new Error('keychain denied')
      return { result: s.slice(3), shouldReEncrypt: false }
    }
  },
  session: {
    fromPartition: () => ({
      setProxy,
      fetch: sesFetch,
      cookies: {
        get: vi.fn(async () => []),
        set: vi.fn(async () => undefined),
        flushStore: vi.fn(async () => undefined)
      }
    })
  }
}))

vi.mock('../webContentsViewManager', () => ({
  partitionForAccount: (id: string) => `persist:bothub-account-${id}`
}))

const { ProxyConfigUnreadableError, saveProxyConfig } = await import('../muse/accountProxy')
const { callHarkApi, getAuthSession } = await import('./harkClient')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

beforeEach(() => {
  setProxy.mockClear()
  sesFetch.mockClear()
})

describe('Hark fail-closed proxy enforcement', () => {
  it('blocks partition and refuses network fetch when stored proxy cannot be decrypted', async () => {
    writeFileSync(join(dir, 'muse-account-proxy.json'), JSON.stringify({ acc_hark_1: { enc: 'BAD_DATA' } }))

    await expect(getAuthSession('acc_hark_1')).rejects.toBeInstanceOf(ProxyConfigUnreadableError)
    expect(setProxy).toHaveBeenCalledWith(expect.objectContaining({ proxyRules: 'http://127.0.0.1:9' }))
    expect(sesFetch).not.toHaveBeenCalled()
  })

  it('applies valid account proxy before calling Hark REST API', async () => {
    await saveProxyConfig('acc_hark_2', { mode: 'socks5', host: '127.0.0.1', port: 1080 })
    setProxy.mockClear()

    await callHarkApi('acc_hark_2', { path: '/profile' })
    expect(setProxy).toHaveBeenCalledWith(
      expect.objectContaining({ proxyRules: 'socks5://127.0.0.1:1080' })
    )
    expect(sesFetch).toHaveBeenCalledOnce()
  })
})
