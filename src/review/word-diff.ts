export interface WordToken {
  text: string
  changed: boolean
}

const TOKEN = /(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]+)/g

/**
 * Mark words that differ between a removed line and its replacement.
 * Used by the review pane's "word diffs" option.
 */
export function wordDiff(before: string, after: string): { before: WordToken[]; after: WordToken[] } {
  const left = tokenize(before)
  const right = tokenize(after)
  const lcs = longestCommon(left, right)
  const beforeTokens: WordToken[] = []
  const afterTokens: WordToken[] = []
  let i = 0
  let j = 0
  for (const token of lcs) {
    while (i < left.length && left[i] !== token) {
      beforeTokens.push({ text: left[i] ?? '', changed: true })
      i += 1
    }
    while (j < right.length && right[j] !== token) {
      afterTokens.push({ text: right[j] ?? '', changed: true })
      j += 1
    }
    beforeTokens.push({ text: token, changed: false })
    afterTokens.push({ text: token, changed: false })
    i += 1
    j += 1
  }
  while (i < left.length) {
    beforeTokens.push({ text: left[i] ?? '', changed: true })
    i += 1
  }
  while (j < right.length) {
    afterTokens.push({ text: right[j] ?? '', changed: true })
    j += 1
  }
  return { before: beforeTokens, after: afterTokens }
}

function tokenize(value: string): string[] {
  return value.match(TOKEN) ?? []
}

function longestCommon(left: string[], right: string[]): string[] {
  const rows = left.length + 1
  const cols = right.length + 1
  const scores: number[] = new Array(rows * cols).fill(0)
  const at = (row: number, col: number) => row * cols + col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      if (left[row - 1] === right[col - 1]) scores[at(row, col)] = (scores[at(row - 1, col - 1)] ?? 0) + 1
      else scores[at(row, col)] = Math.max(scores[at(row - 1, col)] ?? 0, scores[at(row, col - 1)] ?? 0)
    }
  }
  const out: string[] = []
  let row = left.length
  let col = right.length
  while (row > 0 && col > 0) {
    if (left[row - 1] === right[col - 1]) {
      out.push(left[row - 1] ?? '')
      row -= 1
      col -= 1
    } else if ((scores[at(row - 1, col)] ?? 0) >= (scores[at(row, col - 1)] ?? 0)) row -= 1
    else col -= 1
  }
  return out.reverse()
}

/** Pair a run of deletions with the following additions so word diffs line up. */
export function pairChangedLines(lines: Array<{ kind: string; text: string }>): Map<number, number> {
  const pairs = new Map<number, number>()
  let index = 0
  while (index < lines.length) {
    if (lines[index]?.kind !== 'del') {
      index += 1
      continue
    }
    const delStart = index
    while (index < lines.length && lines[index]?.kind === 'del') index += 1
    const addStart = index
    while (index < lines.length && lines[index]?.kind === 'add') index += 1
    const delCount = addStart - delStart
    const addCount = index - addStart
    const count = Math.min(delCount, addCount)
    for (let offset = 0; offset < count; offset += 1) pairs.set(delStart + offset, addStart + offset)
  }
  return pairs
}
