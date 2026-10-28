import type { DiffHunk, DiffLine, FileStatus, ReviewFile } from './types.ts'

const DIFF_GIT = /^diff --git a\/(.+?) b\/(.+)$/
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/

export interface ParsedDiffFile extends ReviewFile {
  /** Raw file header lines up to, but not including, the first hunk. */
  rawHeader: string
}

/**
 * Split a `git diff` document into files and hunks.
 * Paths may be quoted by git; callers should pass `-c core.quotepath=false`.
 */
export function parseUnifiedDiff(text: string): ParsedDiffFile[] {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!normalized.trim()) return []
  const chunks = normalized.split(/\n(?=diff --git )/).filter((chunk) => chunk.startsWith('diff --git '))
  return chunks.map(parseFileChunk).filter((file): file is ParsedDiffFile => file != null)
}

function parseFileChunk(chunk: string): ParsedDiffFile | null {
  const lines = chunk.endsWith('\n') ? chunk.slice(0, -1).split('\n') : chunk.split('\n')
  const headerMatch = lines[0]?.match(DIFF_GIT)
  if (!headerMatch) return null
  const oldPathRaw = unquote(headerMatch[1] ?? '')
  const newPathRaw = unquote(headerMatch[2] ?? '')
  let status: FileStatus = 'modified'
  let binary = false
  let oldPath: string | null = null
  let path = stripPrefix(newPathRaw)
  const headerLines: string[] = []
  let index = 1
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (line.startsWith('@@')) break
    headerLines.push(line)
    if (line.startsWith('new file mode')) status = 'added'
    else if (line.startsWith('deleted file mode')) status = 'deleted'
    else if (line.startsWith('rename from ')) {
      status = 'renamed'
      oldPath = stripPrefix(unquote(line.slice('rename from '.length)))
    } else if (line.startsWith('copy from ')) {
      status = 'copied'
      oldPath = stripPrefix(unquote(line.slice('copy from '.length)))
    } else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
      binary = true
    } else if (line.startsWith('--- ')) {
      const marker = line.slice(4)
      if (marker === '/dev/null') status = status === 'modified' ? 'added' : status
      else oldPath = oldPath ?? stripPrefix(unquote(marker.replace(/^a\//, '')))
    } else if (line.startsWith('+++ ')) {
      const marker = line.slice(4)
      if (marker === '/dev/null') {
        status = 'deleted'
        path = oldPath ?? stripPrefix(oldPathRaw)
      } else {
        path = stripPrefix(unquote(marker.replace(/^b\//, '')))
      }
    }
  }
  if (status !== 'renamed' && status !== 'copied') oldPath = null
  if (oldPathRaw !== newPathRaw && status === 'modified') {
    status = 'renamed'
    oldPath = stripPrefix(oldPathRaw)
    path = stripPrefix(newPathRaw)
  }

  const hunks: DiffHunk[] = []
  while (index < lines.length) {
    const header = lines[index] ?? ''
    if (!header.startsWith('@@')) break
    const parsed = parseHunk(lines, index)
    hunks.push(parsed.hunk)
    index = parsed.next
  }

  let additions = 0
  let deletions = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add') additions += 1
      else if (line.kind === 'del') deletions += 1
    }
  }

  return {
    path,
    oldPath,
    status,
    additions,
    deletions,
    binary,
    tooLarge: false,
    hunks,
    rawHeader: ['diff --git a/' + oldPathRaw + ' b/' + newPathRaw, ...headerLines].join('\n'),
  }
}

function parseHunk(lines: string[], start: number): { hunk: DiffHunk; next: number } {
  const header = lines[start] ?? ''
  const match = header.match(HUNK_HEADER)
  const oldStart = Number(match?.[1] ?? 0)
  const oldCount = Number(match?.[2] ?? 1)
  const newStart = Number(match?.[3] ?? 0)
  const newCount = Number(match?.[4] ?? 1)
  const section = (match?.[5] ?? '').trim()
  const diffLines: DiffLine[] = []
  let oldNo = oldStart
  let newNo = newStart
  let index = start + 1
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (line.startsWith('@@') || line.startsWith('diff --git ')) break
    if (line.startsWith('\\')) {
      const previous = diffLines[diffLines.length - 1]
      if (previous) previous.noNewline = true
      continue
    }
    const marker = line[0]
    const text = line.slice(1)
    if (marker === '+') {
      diffLines.push({ kind: 'add', text, oldNo: null, newNo })
      newNo += 1
    } else if (marker === '-') {
      diffLines.push({ kind: 'del', text, oldNo, newNo: null })
      oldNo += 1
    } else if (marker === ' ') {
      diffLines.push({ kind: 'context', text, oldNo, newNo })
      oldNo += 1
      newNo += 1
    } else if (line === '') {
      diffLines.push({ kind: 'context', text: '', oldNo, newNo })
      oldNo += 1
      newNo += 1
    }
  }
  return {
    hunk: { header, oldStart, oldCount, newStart, newCount, section, lines: diffLines },
    next: index,
  }
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string
    } catch {
      return value.slice(1, -1)
    }
  }
  return value
}

function stripPrefix(value: string): string {
  if (value.startsWith('a/') || value.startsWith('b/')) return value.slice(2)
  return value
}

/** Rebuild a single-hunk patch git apply can consume. */
export function hunkPatch(file: ParsedDiffFile, hunk: DiffHunk): string {
  const body = [hunk.header]
  for (const line of hunk.lines) {
    const marker = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '
    body.push(marker + line.text)
    if (line.noNewline) body.push('\\ No newline at end of file')
  }
  return file.rawHeader + '\n' + body.join('\n') + '\n'
}
