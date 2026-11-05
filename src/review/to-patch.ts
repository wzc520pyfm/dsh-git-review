import type { DiffHunk, ReviewFile } from './types.ts'

/**
 * Rebuild a unified-diff document for one `ReviewFile` so `@pierre/diffs`
 * can parse it via `parsePatchFiles` / `getSingularPatch`.
 */
export function reviewFileToUnifiedPatch(file: ReviewFile): string {
  if (file.binary || file.tooLarge || file.hunks.length === 0) return ''
  const oldName = file.oldPath ?? file.path
  const lines: string[] = [`diff --git a/${oldName} b/${file.path}`]

  if (file.status === 'added' || file.status === 'untracked') {
    lines.push('new file mode 100644', '--- /dev/null', `+++ b/${file.path}`)
  } else if (file.status === 'deleted') {
    lines.push('deleted file mode 100644', `--- a/${file.path}`, '+++ /dev/null')
  } else if (file.status === 'renamed' || file.status === 'copied') {
    if (file.status === 'renamed') lines.push(`rename from ${oldName}`, `rename to ${file.path}`)
    else lines.push(`copy from ${oldName}`, `copy to ${file.path}`)
    lines.push(`--- a/${oldName}`, `+++ b/${file.path}`)
  } else {
    lines.push(`--- a/${file.path}`, `+++ b/${file.path}`)
  }

  for (const hunk of file.hunks) lines.push(...serializeHunk(hunk))
  return `${lines.join('\n')}\n`
}

function serializeHunk(hunk: DiffHunk): string[] {
  const body = [hunk.header]
  for (const line of hunk.lines) {
    const marker = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '
    body.push(marker + line.text)
    if (line.noNewline) body.push('\\ No newline at end of file')
  }
  return body
}
