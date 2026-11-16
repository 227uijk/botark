import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPlatformInspector, resolveInspectorTab } from '../components/info/platformInspector'
import { loadDotMemoryDraft, saveDotMemoryDraft } from './vaultClient'

describe('vaultClient & platformInspector', () => {
  const originalWindow = globalThis.window
  let localStore: Record<string, string>
  let vaultStore: Record<string, string>

  beforeEach(() => {
    localStore = {}
    vaultStore = {}
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: vi.fn((k: string) => (k in localStore ? localStore[k]! : null)),
        setItem: vi.fn((k: string, v: string) => {
          localStore[k] = v
        }),
        removeItem: vi.fn((k: string) => {
          delete localStore[k]
        })
      },
      electron: {
        vault: {
          getSecret: vi.fn(async (k: string) => vaultStore[k] ?? null),
          setSecret: vi.fn(async (k: string, v: string) => {
            vaultStore[k] = v
            return { ok: true as const, encrypted: true }
          }),
          deleteSecret: vi.fn(async (k: string) => {
            delete vaultStore[k]
            return { ok: true as const }
          }),
          clearAll: vi.fn(async () => {
            vaultStore = {}
            return { ok: true as const }
          }),
          status: vi.fn(),
          hardenPermissions: vi.fn()
        }
      }
    }
  })

  afterEach(() => {
    ;(globalThis as unknown as { window: unknown }).window = originalWindow
  })

  it('migrates legacy plaintext localStorage Dot memory snapshot into encrypted vault and purges localStorage', async () => {
    localStore['bothub.dot.memorySnapshot'] = '# Secret Memory\n- Project codename Aurora'

    const loaded = await loadDotMemoryDraft()
    expect(loaded).toBe('# Secret Memory\n- Project codename Aurora')
    expect(vaultStore['dot.memory.snapshot.v1']).toBe('# Secret Memory\n- Project codename Aurora')
    expect(localStore['bothub.dot.memorySnapshot']).toBeUndefined()
  })

  it('saves and deletes Dot memory drafts strictly inside the encrypted vault without touching localStorage', async () => {
    const ok = await saveDotMemoryDraft('## Updated Memory')
    expect(ok).toBe(true)
    expect(vaultStore['dot.memory.snapshot.v1']).toBe('## Updated Memory')
    expect(localStore['bothub.dot.memorySnapshot']).toBeUndefined()

    await saveDotMemoryDraft('   ')
    expect(vaultStore['dot.memory.snapshot.v1']).toBeUndefined()
  })

  it('differentiates right-side inspector tabs and capabilities across Muse, Grok Bot, Hark, and Dot', () => {
    const muse = getPlatformInspector('meta-muse')
    const grok = getPlatformInspector('grok')
    const hark = getPlatformInspector('hark')
    const dot = getPlatformInspector('dot')

    expect(muse.supportsWebSession).toBe(true)
    expect(grok.supportsWebSession).toBe(false)
    expect(hark.supportsWebSession).toBe(true)
    expect(dot.supportsWebSession).toBe(true)

    expect(muse.tabs.map((t) => t.label)).toEqual(['Overview', 'Library', 'Computer', 'Sharing'])
    expect(grok.tabs.map((t) => t.label)).toEqual(['Overview', 'Library', 'Sandbox', 'Agents'])
    expect(hark.tabs.map((t) => t.label)).toEqual(['Overview', 'Library', 'Computer', 'Devices'])
    expect(dot.tabs.map((t) => t.label)).toEqual(['Overview', 'Memory', 'Pages'])

    // Switching from Muse's 'computer' tab to Dot falls back cleanly to 'overview'
    expect(resolveInspectorTab('dot', 'computer')).toBe('overview')
    expect(resolveInspectorTab('dot', 'memory')).toBe('memory')
  })
})
