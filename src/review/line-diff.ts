import type { DiffHunk, DiffLine } from './types.ts'

interface Edit {
  kind: 'equal' | 'del' | 'add'
  text: string
}

/**
 * Line diff used for untracked files and last-turn snapshots that are not
 * already a git diff. Context is three lines, matching `git diff -U3`.
 */
export function diffLines(before: string, after: string): DiffHunk[] {
  const left = splitLines(before)
  const right = splitLines(after)
  const edits = editScript(left, right)
  return hunksFromEdits(edits, left, right)
}

function splitLines(value: string): string[] {
  if (value === '') return []
  const parts = value.split('\n')
  if (value.endsWith('\n')) parts.pop()
  return parts
}

function editScript(left: string[], right: string[]): Edit[] {
  if (left.length * right.length > 1_500_000) {
    return [
      ...left.map((text) => ({ kind: 'del' as const, text })),
      ...right.map((text) => ({ kind: 'add' as const, text })),
    ]
  }
  const rows = left.length + 1
  const cols = right.length + 1
  const scores = new Uint32Array(rows * cols)
  const at = (row: number, col: number) => row * cols + col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      if (left[row - 1] === right[col - 1]) scores[at(row, col)] = (scores[at(row - 1, col - 1)] ?? 0) + 1
      else scores[at(row, col)] = Math.max(scores[at(row - 1, col)] ?? 0, scores[at(row, col - 1)] ?? 0)
    }
  }
  const reversed: Edit[] = []
  let row = left.length
  let col = right.length
  while (row > 0 && col > 0) {
    if (left[row - 1] === right[col - 1]) {
      reversed.push({ kind: 'equal', text: left[row - 1] ?? '' })
      row -= 1
      col -= 1
    } else if ((scores[at(row - 1, col)] ?? 0) >= (scores[at(row, col - 1)] ?? 0)) {
      reversed.push({ kind: 'del', text: left[row - 1] ?? '' })
      row -= 1
    } else {
      reversed.push({ kind: 'add', text: right[col - 1] ?? '' })
      col -= 1
    }
  }
  while (row > 0) {
    reversed.push({ kind: 'del', text: left[row - 1] ?? '' })
    row -= 1
  }
  while (col > 0) {
    reversed.push({ kind: 'add', text: right[col - 1] ?? '' })
    col -= 1
  }
  return reversed.reverse()
}

function hunksFromEdits(edits: Edit[], left: string[], right: string[]): DiffHunk[] {
  const changed: number[] = []
  edits.forEach((edit, index) => {
    if (edit.kind !== 'equal') changed.push(index)
  })
  if (changed.length === 0) return []
  const groups: number[][] = []
  let current: number[] = []
  let last = -1
  for (const index of changed) {
    if (last >= 0 && index - last > 7) {
      groups.push(current)
      current = []
    }
    current.push(index)
    last = index
  }
  if (current.length) groups.push(current)

  let leftPos = 0
  let rightPos = 0
  const positions = edits.map((edit) => {
    const pos = { left: leftPos, right: rightPos }
    if (edit.kind !== 'add') leftPos += 1
    if (edit.kind !== 'del') rightPos += 1
    return pos
  })

  return groups.map((group) => {
    const first = Math.max(0, (group[0] ?? 0) - 3)
    const lastIndex = Math.min(edits.length - 1, (group[group.length - 1] ?? 0) + 3)
    const lines: DiffLine[] = []
    const start = positions[first] ?? { left: 0, right: 0 }
    let oldNo = start.left + 1
    let newNo = start.right + 1
    let oldCount = 0
    let newCount = 0
    for (let index = first; index <= lastIndex; index += 1) {
      const edit = edits[index]
      if (!edit) continue
      if (edit.kind === 'equal') {
        lines.push({ kind: 'context', text: edit.text, oldNo, newNo })
        oldNo += 1
        newNo += 1
        oldCount += 1
        newCount += 1
      } else if (edit.kind === 'del') {
        lines.push({ kind: 'del', text: edit.text, oldNo, newNo: null })
        oldNo += 1
        oldCount += 1
      } else {
        lines.push({ kind: 'add', text: edit.text, oldNo: null, newNo })
        newNo += 1
        newCount += 1
      }
    }
    const oldStart = oldCount === 0 ? 0 : start.left + 1
    const newStart = newCount === 0 ? 0 : start.right + 1
    const header = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`
    return { header, oldStart, oldCount, newStart, newCount, section: '', lines }
  })
}

export function countEdits(hunks: DiffHunk[]): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add') additions += 1
      else if (line.kind === 'del') deletions += 1
    }
  }
  return { additions, deletions }
}

