import { useState } from 'react'
import { getPlatform } from '@adapters/platforms'
import { ArrowUpRight, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import { Section } from '@/components/info/Section'
import { PaneHeader } from '@/components/layout/PaneHeader'
import {
  ArkExportDocSvg,
  ArkPromptSparkSvg,
  ArkRelayOrbSvg,
  ArkSlackWeaveSvg,
  ArkWorkspaceVaultSvg
} from '@/components/ui/ArkGlyphs'
import { BotAvatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { NumberStepper } from '@/components/ui/Controls'
import { IconButton } from '@/components/ui/IconButton'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import { shortcutLabel } from '@/lib/shortcuts'
import { useBotStore } from '@/store/botStore'
import { roomMarkdown, type CollabRoom } from './model'
import { RoomAvatarCluster } from './RoomAvatarCluster'
import {
  clearRoomTranscript,
  deleteRoom,
  renameRoom,
  updateRoomConfig,
  useRooms
} from './roomStore'
import { SlackPanel } from './SlackPanel'
import { WorkspaceTools } from './WorkspaceTools'

type RoomTab = 'overview' | 'workspace' | 'slack'

export function exportRoomMarkdownFile(room: CollabRoom) {
  const url = URL.createObjectURL(new Blob([roomMarkdown(room)], { type: 'text/markdown' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${room.title}.md`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function RoomInspectorPanel({ room }: { room: CollabRoom }) {
  const toggleInfoPanel = useBotStore((s) => s.toggleInfoPanel)
  const bots = useBotStore((s) => s.bots)
  const accounts = useBotStore((s) => s.accounts)
  const selectBot = useBotStore((s) => s.selectBot)
  const speaker = useRooms((s) => s.speakers[room.id])
  const [tab, setTab] = useState<RoomTab>('overview')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hermesAccount = room.members.find((m) => m.platform === 'hermes')?.accountId

  return (
    <>
      <PaneHeader className="pr-3">
        <IconButton
          label="关闭"
          shortcut={shortcutLabel('I')}
          className="no-drag ml-auto"
          onClick={toggleInfoPanel}
        >
          <X />
        </IconButton>
      </PaneHeader>

      <div className="min-h-0 flex-1 overflow-y-auto pb-5">
        {/* Quiet Room Hero */}
        <div className="flex items-center gap-3 px-4 pb-3">
          <RoomAvatarCluster
            members={room.members}
            speakingName={speaker}
            size="md"
            ringClassName="ring-main"
          />
          <div className="min-w-0 flex-1">
            {editing ? (
              <InlineEdit
                value={room.title}
                label="群聊名称"
                className="h-7 text-[15px] font-semibold"
                onCommit={(next) => renameRoom(room.id, next)}
                onDone={() => setEditing(false)}
              />
            ) : (
              <p className="truncate text-[15px] leading-5 font-semibold tracking-tight text-ink">
                {room.title}
              </p>
            )}
            <p className="mt-0.5 text-[12px] text-ink-muted">{room.members.length} 位成员</p>
          </div>
          <IconButton label="重命名" className="shrink-0" onClick={() => setEditing(true)}>
            <Pencil />
          </IconButton>
        </div>

        {/* Gliding Tabs */}
        <div className="px-4 pb-1">
          <SegmentedControl<RoomTab>
            value={tab}
            onValueChange={setTab}
            fullWidth
            size="xs"
            aria-label="协作设置"
            options={[
              { value: 'overview', label: '编排', icon: <ArkRelayOrbSvg /> },
              { value: 'workspace', label: '工作区', icon: <ArkWorkspaceVaultSvg /> },
              { value: 'slack', label: 'Slack', icon: <ArkSlackWeaveSvg /> }
            ]}
          />
        </div>

        <div key={`${room.id}:${tab}`} className="animate-veil-in">
          {tab === 'overview' && (
            <>
              <Section title="调度">
                <div className="flex flex-col gap-2.5 text-[12px]">
                  <SegmentedControl<CollabRoom['mode']>
                    value={room.mode}
                    onValueChange={(mode) => updateRoomConfig(room.id, { mode })}
                    fullWidth
                    size="xs"
                    options={[
                      { value: 'auto', label: '自主接力', icon: <ArkPromptSparkSvg /> },
                      { value: 'manual', label: '手动 @' }
                    ]}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-secondary">单轮上限</span>
                    <NumberStepper
                      value={room.limit}
                      onChange={(limit) => updateRoomConfig(room.id, { limit })}
                      min={1}
                      max={24}
                      suffix="轮"
                      aria-label="单轮上限"
                    />
                  </div>
                </div>
              </Section>

              <Section title="成员" count={room.members.length} flush>
                <ul className="flex flex-col gap-0.5 px-2">
                  {room.members.map((m) => {
                    const bot = bots.find((b) => b.id === m.botId)
                    const acc = accounts[m.accountId]
                    const status = acc?.status ?? 'offline'
                    const isSpeaking = speaker === m.name
                    const platform = getPlatform(m.platform)
                    return (
                      <li
                        key={m.botId}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors',
                          isSpeaking ? 'bg-accent-50/70' : 'hover:bg-hover'
                        )}
                      >
                        <BotAvatar
                          emoji={bot?.emoji ?? '🤖'}
                          seed={bot?.id ?? m.botId}
                          avatar={bot?.avatar}
                          avatarShape={bot?.avatarShape}
                          avatarColor={bot?.avatarColor}
                          platformId={m.platform}
                          status={status}
                          isWorking={isSpeaking}
                          size="xs"
                          ringClassName="ring-main"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ink">{m.name}</p>
                          <p className="truncate text-[11px] text-ink-muted">{platform.name}</p>
                        </div>
                        {bot && (
                          <button
                            type="button"
                            title={`打开 ${m.name}`}
                            onClick={() => selectBot(bot.id)}
                            className="press-icon grid size-6 shrink-0 place-items-center rounded-full text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-active hover:text-ink"
                          >
                            <ArrowUpRight className="size-3.5" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Section>

              <Section title="操作">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={room.messages.length === 0}
                    onClick={() => exportRoomMarkdownFile(room)}
                    className="flex-1"
                  >
                    <ArkExportDocSvg className="size-3.5" />
                    导出
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={room.messages.length === 0}
                    onClick={() => clearRoomTranscript(room.id)}
                    title="清空对话"
                  >
                    <RotateCcw className="size-3.5" />
                    清空
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmDelete ? 'danger-confirm' : 'danger'}
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true)
                        return
                      }
                      deleteRoom(room.id)
                    }}
                    onBlur={() => setConfirmDelete(false)}
                  >
                    <Trash2 className="size-3.5" />
                    {confirmDelete ? '确认' : '删除'}
                  </Button>
                </div>
              </Section>
            </>
          )}

          {tab === 'workspace' && (
            <WorkspaceTools
              scope={room.id}
              recipient={room.title}
              hermesAccount={hermesAccount}
              variant="inspector"
              append={(value) =>
                window.dispatchEvent(
                  new CustomEvent('botark:room-append-draft', {
                    detail: { roomId: room.id, text: value }
                  })
                )
              }
            />
          )}

          {tab === 'slack' &&
            (room.slackParent ? (
              <Section title="Slack 线程">
                <p className="font-mono text-[11.5px] text-ink-secondary">
                  {room.slackChannel} · {room.slackThread}
                </p>
              </Section>
            ) : (
              <SlackPanel id={room.id} variant="inspector" />
            ))}
        </div>
      </div>
    </>
  )
}
