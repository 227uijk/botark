import { describe, expect, it } from 'vitest'
import { historyAssistants, parseHistoryTranscript, parseMediaParts } from './chat'
import { normalizeMuseFsPath, sniffImageMimeFromBytes } from './fs'

describe('normalizeMuseFsPath', () => {
  it('normalizes raw, prefixed, URL, and VM home paths', () => {
    expect(normalizeMuseFsPath('workspace/out.png')).toBe('workspace/out.png')
    expect(normalizeMuseFsPath('/workspace/out.png')).toBe('workspace/out.png')
    expect(normalizeMuseFsPath('/fs/raw/workspace/out.png')).toBe('workspace/out.png')
    expect(normalizeMuseFsPath('https://muse.ai/fs/raw/workspace/panda%20tea.png?v=2')).toBe(
      'workspace/panda tea.png'
    )
    expect(normalizeMuseFsPath('/home/muse/workspace/images/panda.png')).toBe('workspace/images/panda.png')
  })

  it('rejects traversal segments', () => {
    expect(() => normalizeMuseFsPath('workspace/../secret.txt')).toThrow()
    expect(() => normalizeMuseFsPath('')).toThrow()
  })
})

describe('sniffImageMimeFromBytes', () => {
  it('detects png, jpeg, gif, webp, and svg magic headers', () => {
    expect(sniffImageMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageMimeFromBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('image/gif')
    expect(
      sniffImageMimeFromBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
    ).toBe('image/webp')
    expect(sniffImageMimeFromBytes(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(
      'image/svg+xml'
    )
  })
})

describe('parseMediaParts', () => {
  it('extracts images from transcript content, attachments, tool results, and inline markdown', () => {
    const fakePngB64 = 'iVBORw0KGgo' + 'A'.repeat(64)
    const parts = parseMediaParts({
      display_text: '做好了，四川味儿拉满！\n![熊猫](workspace/inline/panda.png)',
      attachments: [
        { type: 'file_ref', path: '/home/muse/workspace/generated/tea.png', mime_type: 'image/png', filename: 'tea.png' }
      ],
      result: {
        file_paths: ['/fs/raw/workspace/generated/bowl.webp']
      },
      transcript: {
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: fakePngB64 } },
              { type: 'tool_result', content: '{"output_path":"workspace/generated/from_tool.png"}' }
            ]
          }
        ]
      }
    })

    const paths = parts.map((p) => p.path)
    expect(paths).toContain('workspace/generated/tea.png')
    expect(paths).toContain('workspace/generated/bowl.webp')
    expect(paths).toContain('workspace/generated/from_tool.png')
    expect(paths).toContain('workspace/inline/panda.png')
    expect(paths.some((p) => p.startsWith('data:image/png;base64,'))).toBe(true)
    expect(parts.every((p) => p.kind === 'image')).toBe(true)
  })

  it('does not duplicate images from shopping or image_options rich widgets', () => {
    const parts = parseMediaParts({
      widgets: [
        {
          kind: 'shopping_cart',
          widget_id: 'w1',
          data: {
            items: [{ id: '1', name: 'Tea', quantity: 1, image_url: 'https://cdn.example.com/tea.png' }]
          }
        },
        {
          kind: 'image_options',
          widget_id: 'w2',
          data: {
            images: [{ path: 'workspace/opt1.png' }]
          }
        }
      ]
    })
    expect(parts).toEqual([])
  })
})

describe('history media stitching', () => {
  it('attaches preceding tool images to assistant rows in historyAssistants and parseHistoryTranscript', () => {
    const rawHistory = {
      ok: true,
      result: {
        chat_events: [
          {
            event_name: 'message.user',
            message_id: 'u1',
            occurred_at_ms: 1000,
            payload: { display_text: '随机生成一个慌撒子嘛主题图片' }
          },
          {
            event_name: 'tool_call.completed',
            occurred_at_ms: 1500,
            payload: {
              name: 'generate_image',
              result: { output_path: '/home/muse/workspace/generated/sichuan_tea.png' }
            }
          },
          {
            event_name: 'delta.message_done',
            message_id: 'a1',
            occurred_at_ms: 2000,
            payload: {
              status: 'completed',
              display_text: '做好了，四川味儿拉满：慌里慌张的小哥端着盖碗茶，旁边熊猫稳如泰山。'
            }
          },
          {
            event_name: 'message.assistant',
            message_id: 'a1',
            occurred_at_ms: 2100,
            payload: {
              display_text: '做好了，四川味儿拉满：慌里慌张的小哥端着盖碗茶，旁边熊猫稳如泰山。',
              attachments: [{ path: 'workspace/generated/sichuan_tea_v2.png', mime_type: 'image/png' }]
            }
          }
        ]
      }
    }

    const assistants = historyAssistants(rawHistory)
    expect(assistants.length).toBe(2)
    expect(assistants[0]!.media?.map((m) => m.path)).toEqual(['workspace/generated/sichuan_tea.png'])
    expect(assistants[1]!.media?.map((m) => m.path)).toEqual(['workspace/generated/sichuan_tea_v2.png'])

    const transcript = parseHistoryTranscript(rawHistory)
    expect(transcript).toHaveLength(2)
    expect(transcript[1]!.role).toBe('bot')
    expect(transcript[1]!.media?.map((m) => m.path)).toEqual([
      'workspace/generated/sichuan_tea.png',
      'workspace/generated/sichuan_tea_v2.png'
    ])
  })
})
