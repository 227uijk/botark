import { describe, expect, it } from 'vitest'
import {
  cleanMuseChromeUserAgent,
  hasNonEmptyHatchSession,
  isAllowedMuseUrl,
  isMuseCheckpointUrl
} from './museLoginHelpers'

describe('isAllowedMuseUrl', () => {
  it('allows Muse, Meta, agent.meta.ai OIDC, Facebook, Instagram, Google, Apple, and about:blank', () => {
    expect(isAllowedMuseUrl('about:blank')).toBe(true)
    expect(isAllowedMuseUrl('')).toBe(true)
    expect(isAllowedMuseUrl('https://muse.ai/')).toBe(true)
    expect(isAllowedMuseUrl('https://auth.muse.ai/aymh')).toBe(true)
    expect(isAllowedMuseUrl('https://agent.meta.ai/oidc/start?provider=google')).toBe(true)
    expect(isAllowedMuseUrl('https://auth.meta.com/aymh/redirect-cycle')).toBe(true)
    expect(isAllowedMuseUrl('https://www.facebook.com/aymh/redirect-cycle')).toBe(true)
    expect(isAllowedMuseUrl('https://www.instagram.com/aymh/redirect-cycle')).toBe(true)
    expect(isAllowedMuseUrl('https://accounts.google.com/o/oauth2/v2/auth')).toBe(true)
    expect(isAllowedMuseUrl('https://appleid.apple.com/auth/authorize')).toBe(true)
  })

  it('rejects lookalike domains and non-http protocols', () => {
    expect(isAllowedMuseUrl('https://evilmuse.ai/phish')).toBe(false)
    expect(isAllowedMuseUrl('https://evilmeta.ai/oidc/start')).toBe(false)
    expect(isAllowedMuseUrl('https://muse.ai.evil.com/')).toBe(false)
    expect(isAllowedMuseUrl('https://example.com/')).toBe(false)
    expect(isAllowedMuseUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedMuseUrl('file:///etc/passwd')).toBe(false)
  })
})

describe('cleanMuseChromeUserAgent', () => {
  it('strips Electron and BotArk/BotHub tokens while preserving Chrome version', () => {
    const raw =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) BotArk/0.9.0 Chrome/136.0.7103.48 Electron/36.2.1 Safari/537.36'
    const cleaned = cleanMuseChromeUserAgent(raw)
    expect(cleaned).not.toContain('Electron/')
    expect(cleaned).not.toContain('BotArk/')
    expect(cleaned).toContain('Chrome/136.0.7103.48')
    expect(cleaned).toBe(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.48 Safari/537.36'
    )
  })

  it('also strips legacy BotHub tokens and falls back to desktop Chrome when Chrome is absent', () => {
    const legacy =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) BotHub/0.8.2 Chrome/134.0.0.0 Electron/35.0.0 Safari/537.36'
    expect(cleanMuseChromeUserAgent(legacy)).not.toContain('BotHub/')
    expect(cleanMuseChromeUserAgent(legacy)).not.toContain('Electron/')

    const fallback = cleanMuseChromeUserAgent('CustomAgent/1.0')
    expect(fallback).toContain('Chrome/')
    expect(fallback).not.toContain('Electron/')
  })
})

describe('isMuseCheckpointUrl', () => {
  it('detects checkpoint paths and query parameters', () => {
    expect(isMuseCheckpointUrl('https://muse.ai/checkpoint')).toBe(true)
    expect(isMuseCheckpointUrl('https://www.facebook.com/checkpoints/123456/')).toBe(true)
    expect(isMuseCheckpointUrl('https://auth.meta.com/login?checkpoint=1')).toBe(true)
    expect(isMuseCheckpointUrl('https://muse.ai/')).toBe(false)
    expect(isMuseCheckpointUrl('https://muse.ai/?aymh_complete=1')).toBe(false)
    expect(isMuseCheckpointUrl('')).toBe(false)
  })
})

describe('hasNonEmptyHatchSession', () => {
  it('requires a non-empty hatch_sess cookie value', () => {
    expect(hasNonEmptyHatchSession([])).toBe(false)
    expect(hasNonEmptyHatchSession([{ name: 'hatch_sess', value: '' }])).toBe(false)
    expect(hasNonEmptyHatchSession([{ name: 'hatch_sess', value: '   ' }])).toBe(false)
    expect(hasNonEmptyHatchSession([{ name: 'other', value: 'abc' }])).toBe(false)
    expect(hasNonEmptyHatchSession([{ name: 'hatch_sess', value: 'valid-token-123' }])).toBe(true)
  })
})
