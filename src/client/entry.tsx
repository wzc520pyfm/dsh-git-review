import React, { useMemo } from 'react'
import { createPluginClient } from './http-client.ts'
import { detectLang, translate } from './i18n.ts'
import { ensureReviewStyle, ReviewPane } from './pane.tsx'
import { reviewPrompt } from '../review/prompts.ts'

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight']

const ID = 'dsh-codex-review'
const KIND = 'codex-review'

interface SlotProps {
  sessionId?: string
  useTabInfo?: () => { sessionId?: string; tab?: { sessionId?: string } } | null
}

interface SidebarRight {
  openTab?: (kind: string) => unknown
  openResource?: (address: string) => unknown
}

interface ClientContext {
  slots: {
    inject(name: string, register: () => () => void): () => void
    register(definition: { name: string; key?: string; id?: string; order?: number; inject?: (sessionId: string) => SlotProps }, component: (props: SlotProps) => React.ReactElement): () => void
  }
  sidebarRightTabs?: { register(definition: Record<string, unknown>): () => void }
  sidebarRight?: SidebarRight
  workingDirectory?: { get?: (sessionId: string) => unknown }
  effect?: (callback: () => void | (() => void), label?: string) => void
  inject?: (names: string[], callback: (ctx: ClientContext) => void) => void
}

let pluginContext: ClientContext | null = null

export function apply(ctx: ClientContext): void {
  pluginContext = ctx
  ensureReviewStyle()
  const register = () => {
    ctx.effect?.(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: ID,
      inject: (sessionId: string) => ({ sessionId }),
    }, ReviewTab)), 'dsh-codex-review: tab body')

    ctx.effect?.(() => {
      if (!ctx.sidebarRightTabs?.register) return () => undefined
      return ctx.sidebarRightTabs.register({
        id: ID,
        kind: KIND,
        priority: 'extension',
        keepMounted: true,
        title: () => translate(detectLang(), 'tab'),
        guide: [{
          order: 12,
          title: translate(detectLang(), 'tab'),
          description: translate(detectLang(), 'tabDescription'),
        }],
      })
    }, 'dsh-codex-review: tab type')

    ctx.effect?.(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: ID,
      order: 18,
      inject: (sessionId: string) => ({ sessionId }),
    }, ReviewOpener)), 'dsh-codex-review: opener')

    ctx.effect?.(() => ctx.slots.inject('conversation.chat.commandview', () => ctx.slots.register({
      name: 'conversation.chat.commandview',
      key: 'review',
      inject: (sessionId: string) => ({ sessionId }),
    }, ReviewCommand)), 'dsh-codex-review: command')
  }
  if (typeof ctx.inject === 'function') ctx.inject(['slots', 'sidebarRightTabs'], register)
  else register()
}

function ReviewTab(props: SlotProps): React.ReactElement {
  const sessionId = props.sessionId || props.useTabInfo?.()?.sessionId || props.useTabInfo?.()?.tab?.sessionId || ''
  const client = useMemo(() => createPluginClient({
    sessionId,
    cwd: cwdOf(sessionId),
    openFile(filePath, line) {
      openFile(sessionId, filePath, line)
    },
  }), [sessionId])
  return <ReviewPane client={client} />
}

function ReviewOpener(): React.ReactElement {
  const lang = detectLang()
  return (
    <button type="button" className="cxr-opener" onClick={() => openReview()}>
      {translate(lang, 'openReview')}
    </button>
  )
}

function ReviewCommand(props: SlotProps): React.ReactElement {
  const lang = detectLang()
  const sessionId = props.sessionId ?? ''
  const client = useMemo(() => createPluginClient({ sessionId, cwd: cwdOf(sessionId), openFile() {} }), [sessionId])
  return (
    <div className="cxr-choices">
      <p>{translate(lang, 'commandHint')}</p>
      <button type="button" className="cxr-btn" onClick={() => void client.followup(reviewPrompt({ filter: 'unstaged' }))}>{translate(lang, 'reviewUncommitted')}</button>
      <button type="button" className="cxr-btn" onClick={() => void client.followup(reviewPrompt({ filter: 'branch' }))}>{translate(lang, 'reviewBranch')}</button>
      <button type="button" className="cxr-btn" onClick={() => openReview()}>{translate(lang, 'tab')}</button>
    </div>
  )
}

function openReview(): void {
  const sidebar = pluginContext?.sidebarRight
  if (!sidebar?.openTab) return
  try {
    sidebar.openTab(KIND)
  } catch {
    // Older hosts reject a string kind; the guide entry remains available.
  }
}

function openFile(sessionId: string, filePath: string, line?: number): void {
  const sidebar = pluginContext?.sidebarRight
  if (!sidebar?.openResource) return
  const suffix = line ? `?line=${line}` : ''
  const candidates = [
    `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${filePath}${suffix}`,
    `dsh-resource://file/absolute/${encodeURIComponent(filePath)}${suffix}`,
  ]
  for (const address of candidates) {
    try {
      sidebar.openResource(address)
      return
    } catch {
      // Try the next address shape.
    }
  }
}

function cwdOf(sessionId: string): string | null {
  const reader = pluginContext?.workingDirectory?.get
  if (!reader || !sessionId) return null
  try {
    const value = reader(sessionId)
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      for (const key of ['cwd', 'path', 'workingDirectory']) {
        if (typeof record[key] === 'string') return record[key]
      }
    }
  } catch {
    return null
  }
  return null
}
