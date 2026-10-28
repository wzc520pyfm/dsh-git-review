import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { diffLines } from '../review/line-diff.ts'
import { parseFindingFences, type ParsedFinding } from '../review/prompts.ts'
import type { ReviewFinding } from '../review/types.ts'

interface TextChange {
  path: string
  before: string
  after: string
}

/** Read edit/write payloads and :::review fences out of a session log. */
export function scanSessionText(text: string): { patch: string; findings: ParsedFinding[] } {
  const findings = parseFindingFences(text)
  const changes: TextChange[] = []
  const tail = text.length > 250_000 ? text.slice(-250_000) : text
  for (const line of tail.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{') || !trimmed.includes('path')) continue
    try {
      collectChanges(JSON.parse(trimmed) as unknown, changes, 0)
    } catch {
      // Session lines are not all JSON.
    }
  }
  return { patch: changesToPatch(changes.slice(-30)), findings }
}

/** Best-effort read of a DSH session log so last-turn diffs can be recovered. */
export function readSessionBlob(sessionId: string): string {
  if (!/^[\w.-]{6,200}$/.test(sessionId)) return ''
  const homes = [process.env.DSH_HOME, path.join(homedir(), '.dsh'), path.join(homedir(), '.deepseek')].filter((entry): entry is string => Boolean(entry))
  const chunks: string[] = []
  const state = { budget: 500, chars: 0 }
  for (const home of homes) collectSessionFiles(home, sessionId, chunks, 0, state)
  return chunks.join('\n')
}

function collectSessionFiles(dir: string, sessionId: string, chunks: string[], depth: number, state: { budget: number; chars: number }): void {
  if (depth > 6 || state.budget <= 0 || state.chars > 400_000 || !existsSync(dir)) return
  state.budget -= 1
  let entries: string[] = []
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue
    const full = path.join(dir, entry)
    let info
    try {
      info = statSync(full)
    } catch {
      continue
    }
    if (info.isDirectory()) {
      collectSessionFiles(full, sessionId, chunks, depth + 1, state)
    } else if (info.isFile() && info.size < 1_500_000 && (entry.endsWith('.json') || entry.endsWith('.jsonl') || entry.endsWith('.log'))) {
      if (!full.includes(sessionId)) continue
      try {
        const text = readFileSync(full, 'utf8').slice(-150_000)
        state.chars += text.length
        chunks.push(text)
      } catch {
        // Unreadable session files are skipped.
      }
    }
  }
}

export function findingId(finding: ParsedFinding): string {
  return `${finding.path}:${finding.side}:${finding.line}:${finding.priority}:${finding.title}`
}

export function toReviewFindings(findings: ParsedFinding[]): ReviewFinding[] {
  return findings.map((finding) => ({ ...finding, id: findingId(finding) }))
}

function collectChanges(value: unknown, changes: TextChange[], depth: number): void {
  if (!value || typeof value !== 'object' || depth > 6) return
  if (Array.isArray(value)) {
    for (const entry of value) collectChanges(entry, changes, depth + 1)
    return
  }
  const record = value as Record<string, unknown>
  const pathValue = firstString(record, ['path', 'file', 'filePath'])
  const before = firstString(record, ['oldText', 'old_string', 'before', 'old'])
  const after = firstString(record, ['newText', 'new_string', 'after', 'new'])
  if (pathValue && before != null && after != null && before !== after) {
    changes.push({ path: pathValue, before, after })
  }
  for (const entry of Object.values(record)) collectChanges(entry, changes, depth + 1)
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return null
}

function changesToPatch(changes: TextChange[]): string {
  const byPath = new Map<string, TextChange>()
  for (const change of changes) byPath.set(change.path, change)
  return [...byPath.values()].map((change) => filePatch(change.path, change.before, change.after)).filter(Boolean).join('')
}

function filePatch(filePath: string, before: string, after: string): string {
  const hunks = diffLines(before, after)
  if (hunks.length === 0) return ''
  const header = before === ''
    ? `diff --git a/${filePath} b/${filePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${filePath}\n`
    : `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n`
  const body = hunks.map((hunk) => {
    const lines = hunk.lines.map((line) => `${line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '}${line.text}`)
    return `${hunk.header}\n${lines.join('\n')}\n`
  }).join('')
  return header + body
}
