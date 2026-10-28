import type { ActionRequest, ActionResult, CommitInput, LoadQuery, ReviewSnapshot } from '../review/types.ts'
import type { FollowupResult, ReviewClient } from './api.ts'

const PREFIX = '/api/codex-review'

export function createPluginClient(options: {
  sessionId: string
  cwd: string | null
  openFile(filePath: string, line?: number): void
}): ReviewClient {
  return {
    load: (query) => post<ReviewSnapshot>('/snapshot', { ...options, ...query }),
    action: (request) => post<ActionResult>('/action', { ...options, ...request }),
    init: () => post<ReviewSnapshot>('/init', options),
    commit: (input) => post<ActionResult>('/commit', { ...options, ...input }),
    push: (root) => post<ActionResult>('/push', { ...options, root }),
    createPr: (input) => post<{ ok: boolean; error?: string; url?: string }>('/pr', { ...options, ...input }),
    followup: (text) => post<FollowupResult>('/followup', { ...options, text }),
    fileUrl: (root, filePath) => `${PREFIX}/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(filePath)}`,
    openFile: options.openFile,
  }
}

async function post<T>(tail: string, body: unknown): Promise<T> {
  const response = await fetch(PREFIX + tail, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as { ok?: boolean; data?: T; error?: string }
  if (!response.ok || payload.data == null) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload.data
}

export type { LoadQuery, CommitInput, ActionRequest }
