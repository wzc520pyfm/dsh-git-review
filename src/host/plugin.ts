import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  applyReviewAction,
  blankSnapshot,
  commitReview,
  createPullRequest,
  discoverSessionCwd,
  initRepository,
  loadReview,
  pushReview,
  resolveWorkspace,
} from '../review/git.ts'
import { reviewPrompt } from '../review/prompts.ts'
import type { ActionRequest, CommitInput, LoadQuery, ReviewFilter, ReviewFinding } from '../review/types.ts'
import { isSameOrigin, readBody, sendJson } from './http.ts'
import { findingId, readSessionBlob, scanSessionText, toReviewFindings } from './session-scan.ts'

export const name = 'dsh-codex-review-sidebar'
export const inject = ['webServer']

const PREFIX = '/api/codex-review'
const findingsByKey = new Map<string, ReviewFinding[]>()
const lastTurnByKey = new Map<string, string>()

interface HostContext {
  inject?(names: string[], callback: (ctx: HostContext) => void | (() => void)): void
  effect?(callback: () => void | (() => void), label?: string): void
  webServer?: { register(route: { kind: string; path: string; handler: RouteHandler }): () => void }
  commands?: { register(definition: CommandDefinition): () => void }
  agents?: unknown
  sessions?: unknown
  on?(event: string, listener: (payload: unknown) => void): () => void
}

interface RouteRequest {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}

interface RouteResponse {
  writeHead(status: number, headers: Record<string, string>): void
  end(body?: string): void
}

type RouteHandler = (req: RouteRequest, res: RouteResponse) => Promise<void> | void

interface CommandDefinition {
  name: string
  description: string
  input?: { hint: string }
  handler(invocation: { agent?: { followup?: (message: unknown) => unknown }; rawInput?: string }): Promise<{ kind: 'success' | 'error'; text: string }> | { kind: 'success' | 'error'; text: string }
}

let hostContext: HostContext | null = null

export function apply(ctx: HostContext): void {
  hostContext = ctx
  const register = () => {
    const server = ctx.webServer
    if (!server?.register) return () => undefined
    const dispose = server.register({ kind: 'prefix', path: PREFIX, handler: (req, res) => handle(req, res) })
    return () => dispose()
  }
  if (typeof ctx.inject === 'function') ctx.inject(['webServer'], (injected) => injected.effect ? injected.effect(register, 'dsh-codex-review-sidebar: routes') : register())
  else if (ctx.effect) ctx.effect(register, 'dsh-codex-review-sidebar: routes')
  else register()

  if (typeof ctx.inject === 'function') {
    ctx.inject(['commands'], (injected) => {
      injected.commands?.register({
        name: 'review',
        description: '审查当前改动。用法：/review、/review uncommitted、/review branch <base>、/review commit <sha>、/review <要求>',
        input: { hint: '[uncommitted | branch <base> | commit <sha> | 要求]' },
        handler: async ({ agent, rawInput }) => {
          const parsed = parseReviewCommand(rawInput ?? '')
          if (!parsed) {
            return {
              kind: 'success',
              text: '在审查侧栏选择范围，或使用 /review uncommitted、/review branch main、/review commit <sha>，或 /review 后接你的要求。',
            }
          }
          const queued = await deliver(agent, reviewPrompt(parsed))
          return queued
            ? { kind: 'success', text: '已把审查请求交给当前会话' }
            : { kind: 'error', text: '无法把审查请求交给当前 agent' }
        },
      })
    })
  }

  if (typeof ctx.on === 'function') {
    for (const event of ['tool/result', 'agent/tool-result', 'session/event']) {
      try {
        ctx.on(event, (payload) => {
          const text = JSON.stringify(payload)
          const sessionId = sessionIdOf(payload) ?? 'global'
          absorb(sessionId, text)
        })
      } catch {
        // The host may not declare every event.
      }
    }
  }
}

export function resetReviewState(): void {
  findingsByKey.clear()
  lastTurnByKey.clear()
}

async function handle(req: RouteRequest, res: RouteResponse): Promise<void> {
  if (!isSameOrigin(req.headers)) {
    sendJson(res, 403, { ok: false, error: 'cross-origin requests are refused' })
    return
  }
  const method = String(req.method ?? 'GET').toUpperCase()
  const url = new URL(req.url ?? PREFIX, 'http://dsh.local')
  const tail = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) : url.pathname
  try {
    if (method === 'GET' && (tail === '' || tail === '/' || tail === '/health')) {
      sendJson(res, 200, { ok: true, data: { status: 'ready', kind: 'codex-review' } })
      return
    }
    if (method === 'GET' && tail === '/raw') {
      await sendRaw(url, res)
      return
    }
    const body = method === 'GET' ? {} : parseJson(await readBody(req as unknown as NodeJS.ReadableStream))
    const sessionId = stringField(body, 'sessionId')
    const cwd = await workspaceFor(body, sessionId)
    if (method === 'POST' && tail === '/snapshot') {
      if (!cwd) {
        sendJson(res, 200, { ok: true, data: blankSnapshot('missing-cwd', null) })
        return
      }
      const query = loadQueryFrom(body)
      const key = sessionId || cwd
      const scanned = scanKnownSession(sessionId)
      if (scanned.patch) lastTurnByKey.set(key, scanned.patch)
      absorb(key, scanned.findings.map((finding) => `:::review\npath: ${finding.path}\nline: ${finding.line}\nside: ${finding.side}\npriority: ${finding.priority}\ntitle: ${finding.title}\n${finding.body}\n:::`).join('\n'))
      query.lastTurnText = lastTurnByKey.get(key) ?? null
      const snapshot = await loadReview(cwd, query, findingsByKey.get(key) ?? [])
      sendJson(res, 200, { ok: true, data: snapshot })
      return
    }
    if (!cwd) {
      sendJson(res, 400, { ok: false, error: '找不到这个会话的工作目录' })
      return
    }
    if (method === 'POST' && tail === '/action') {
      const result = await applyReviewAction(cwd, actionFrom(body), findingsByKey.get(sessionId || cwd) ?? [])
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error })
      return
    }
    if (method === 'POST' && tail === '/init') {
      await initRepository(cwd)
      sendJson(res, 200, { ok: true, data: await loadReview(cwd, { filter: 'unstaged' }) })
      return
    }
    if (method === 'POST' && tail === '/commit') {
      const input: CommitInput = {
        message: stringField(body, 'message') ?? '',
        includeUnstaged: Boolean(body.includeUnstaged),
        push: Boolean(body.push),
        root: stringField(body, 'root'),
      }
      const result = await commitReview(cwd, input)
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error })
      return
    }
    if (method === 'POST' && tail === '/push') {
      const result = await pushReview(cwd, stringField(body, 'root'))
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error })
      return
    }
    if (method === 'POST' && tail === '/pr') {
      const result = await createPullRequest(cwd, { title: stringField(body, 'title') ?? '', body: stringField(body, 'body') ?? '', root: stringField(body, 'root') })
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error })
      return
    }
    if (method === 'POST' && tail === '/followup') {
      const text = stringField(body, 'text') ?? ''
      const queued = await deliver(agentFor(sessionId), text)
      sendJson(res, 200, { ok: true, data: { queued, text } })
      return
    }
    if (method === 'POST' && tail === '/finding') {
      rememberFinding(sessionId || cwd, body)
      sendJson(res, 200, { ok: true, data: { id: 'saved' } })
      return
    }
    sendJson(res, 404, { ok: false, error: `no route ${method} ${tail}` })
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

async function workspaceFor(body: Record<string, unknown>, sessionId: string | null): Promise<string | null> {
  return resolveWorkspace({
    sessionId,
    cwd: stringField(body, 'cwd'),
    contextCwd: cwdFromContext(sessionId),
  })
}

function cwdFromContext(sessionId: string | null): string | null {
  // Cordis throws if a service is read without being injected. The browser
  // already sends the session cwd, and the same-origin fence is the trust check.
  if (!sessionId) return null
  return discoverSessionCwd(sessionId)
}

function scanKnownSession(sessionId: string | null): ReturnType<typeof scanSessionText> {
  if (!sessionId) return { patch: '', findings: [] }
  return scanSessionText(readSessionBlob(sessionId))
}

function loadQueryFrom(body: Record<string, unknown>): LoadQuery {
  const filter = stringField(body, 'filter')
  return {
    filter: isFilter(filter) ? filter : 'unstaged',
    baseBranch: stringField(body, 'baseBranch'),
    commitSha: stringField(body, 'commitSha'),
    hideWhitespace: Boolean(body.hideWhitespace),
    full: Boolean(body.full),
    root: stringField(body, 'root'),
  }
}

function actionFrom(body: Record<string, unknown>): ActionRequest {
  const action = stringField(body, 'action')
  const scope = stringField(body, 'scope')
  const filter = stringField(body, 'filter')
  return {
    action: action === 'stage' || action === 'unstage' || action === 'revert' ? action : 'stage',
    scope: scope === 'section' || scope === 'file' || scope === 'hunk' ? scope : 'file',
    filter: isFilter(filter) ? filter : 'unstaged',
    path: stringField(body, 'path') ?? undefined,
    hunkHeader: stringField(body, 'hunkHeader') ?? undefined,
    baseBranch: stringField(body, 'baseBranch'),
    commitSha: stringField(body, 'commitSha'),
    root: stringField(body, 'root'),
  }
}

async function sendRaw(url: URL, res: RouteResponse): Promise<void> {
  const root = url.searchParams.get('root')
  const rel = url.searchParams.get('path')
  if (!root || !rel) {
    sendJson(res, 400, { ok: false, error: 'missing path' })
    return
  }
  const abs = path.resolve(root, rel)
  const relative = path.relative(root, abs)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    sendJson(res, 400, { ok: false, error: '路径无效' })
    return
  }
  const info = statSync(abs)
  if (!info.isFile() || info.size > 2_000_000) {
    sendJson(res, 404, { ok: false, error: 'file unavailable' })
    return
  }
  const ext = path.extname(abs).toLowerCase()
  const types: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
  const type = types[ext]
  if (!type) {
    sendJson(res, 415, { ok: false, error: 'unsupported preview' })
    return
  }
  const bytes = readFileSync(abs)
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
  ;(res.end as (body?: Uint8Array) => void)(bytes)
}

function parseJson(text: string): Record<string, unknown> {
  if (!text.trim()) return {}
  const value = JSON.parse(text) as unknown
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function isFilter(value: string | null): value is ReviewFilter {
  return value === 'unstaged' || value === 'staged' || value === 'commit' || value === 'branch' || value === 'last-turn'
}

function rememberFinding(key: string, args: Record<string, unknown>): void {
  const filePath = stringField(args, 'path')
  const line = Number(args.line)
  const body = stringField(args, 'body') ?? stringField(args, 'text')
  if (!filePath || !Number.isInteger(line) || line <= 0 || !body) return
  const finding: ReviewFinding = {
    id: findingId({ path: filePath, line, side: args.side === 'old' ? 'old' : 'new', priority: stringField(args, 'priority') ?? 'P2', title: stringField(args, 'title') ?? '审查发现', body }),
    path: filePath,
    line,
    side: args.side === 'old' ? 'old' : 'new',
    priority: stringField(args, 'priority') ?? 'P2',
    title: stringField(args, 'title') ?? '审查发现',
    body,
  }
  const current = findingsByKey.get(key) ?? []
  findingsByKey.set(key, [...current.filter((item) => item.id !== finding.id), finding])
}

function absorb(key: string, text: string): void {
  const scanned = scanSessionText(text)
  if (scanned.patch) lastTurnByKey.set(key, scanned.patch)
  for (const finding of toReviewFindings(scanned.findings)) {
    const current = findingsByKey.get(key) ?? []
    if (!current.some((item) => item.id === finding.id)) findingsByKey.set(key, [...current, finding])
  }
}

async function deliver(agent: { followup?: (message: unknown) => unknown } | null | undefined, text: string): Promise<boolean> {
  if (!text.trim()) return false
  const message = { content: [{ type: 'text', text }], source: { kind: 'user' } }
  const candidates = [agent, agentFor(null), hostContext?.agents, hostContext?.sessions]
  for (const candidate of candidates) {
    const follow = followupOf(candidate)
    if (!follow) continue
    try {
      await follow(message)
      return true
    } catch {
      // Try the next shape.
    }
  }
  return false
}

function agentFor(sessionId: string | null): { followup?: (message: unknown) => unknown } | null {
  const agents = hostContext?.agents as { get?: (id: string) => unknown; list?: () => unknown[] } | undefined
  if (sessionId && agents?.get) {
    const found = agents.get(sessionId)
    if (found && typeof found === 'object') return found as { followup?: (message: unknown) => unknown }
  }
  return null
}

function followupOf(value: unknown): ((message: unknown) => unknown) | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.followup === 'function') return record.followup.bind(value)
  if (typeof record.submit === 'function') return record.submit.bind(value)
  return null
}

function sessionIdOf(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  for (const key of ['sessionId', 'session_id', 'conversationId']) {
    if (typeof record[key] === 'string') return record[key]
  }
  return null
}

export function parseReviewCommand(raw: string): { filter: ReviewFilter; baseBranch?: string; commitSha?: string; custom?: string } | null {
  const text = raw.trim()
  if (!text) return null
  const [head, ...rest] = text.split(/\s+/)
  const command = head?.toLowerCase()
  if (command === 'uncommitted' || command === 'unstaged' || command === 'working') return { filter: 'unstaged' }
  if (command === 'branch') return { filter: 'branch', baseBranch: rest[0] }
  if (command === 'commit') return rest[0] ? { filter: 'commit', commitSha: rest[0] } : null
  return { filter: 'unstaged', custom: text }
}
