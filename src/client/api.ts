import type { ActionRequest, ActionResult, CommitInput, LoadQuery, ReviewSnapshot } from '../review/types.ts'

export interface FollowupResult {
  queued: boolean
  text: string
  error?: string
}

export interface ReviewClient {
  load(query: LoadQuery): Promise<ReviewSnapshot>
  action(request: ActionRequest): Promise<ActionResult>
  init(): Promise<ReviewSnapshot>
  commit(input: CommitInput): Promise<ActionResult>
  push(root: string | null): Promise<ActionResult>
  createPr(input: { title: string; body: string; root?: string | null }): Promise<{ ok: boolean; error?: string; url?: string }>
  followup(text: string): Promise<FollowupResult>
  fileUrl(root: string, filePath: string): string | null
  openFile(filePath: string, line?: number): void
}

export async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { ok?: boolean; data?: T; error?: string }
  if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`)
  return (body.data ?? body) as T
}
