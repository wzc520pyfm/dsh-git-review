import React, { useMemo, useState } from 'react'
import type { ReviewClient } from './api.ts'
import type { Lang, MessageKey } from './i18n.ts'
import { translate } from './i18n.ts'
import type { DiffHunk, DiffLine, ReviewFile, ReviewFilter, ReviewFinding } from '../review/types.ts'
import { pairChangedLines, wordDiff, type WordToken } from '../review/word-diff.ts'

export interface LocalComment {
  id: string
  path: string
  line: number
  side: 'old' | 'new'
  text: string
}

interface DiffViewProps {
  lang: Lang
  files: ReviewFile[]
  filter: ReviewFilter
  diffMode: 'unified' | 'split'
  wrap: boolean
  wordDiffs: boolean
  rich: boolean
  gitActions: boolean
  busy: boolean
  open: Record<string, boolean>
  viewed: Record<string, boolean>
  comments: LocalComment[]
  findings: ReviewFinding[]
  dismissed: string[]
  fileUrl: ReviewClient['fileUrl']
  root: string | null
  onToggle(path: string): void
  onOpenFile(path: string, line?: number): void
  onViewed(path: string, next: boolean): void
  onAction(action: 'stage' | 'unstage' | 'revert', scope: 'file' | 'hunk', path: string, hunkHeader?: string): void
  onComment(comment: LocalComment): void
  onDeleteComment(id: string): void
  onDismiss(id: string): void
}

export function DiffList(props: DiffViewProps) {
  return (
    <div className={props.diffMode === 'split' ? 'cxr-split' : undefined}>
      {props.files.map((file) => (
        <FileCard key={file.path} file={file} {...props} />
      ))}
    </div>
  )
}

function FileCard(props: DiffViewProps & { file: ReviewFile }) {
  const { file, lang } = props
  const t = (key: MessageKey) => translate(lang, key)
  const expanded = props.open[file.path] ?? true
  const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''
  const name = file.path.slice(dir.length ? dir.length + 1 : 0)
  const actionable = props.gitActions && file.status !== 'unmerged' && !props.busy
  const viewed = props.viewed[file.path] === true
  return (
    <article className="cxr-file" data-review-path={file.path}>
      <div className="cxr-file-head" onClick={() => props.onToggle(file.path)}>
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className={`cxr-status ${file.status === 'deleted' ? 'cxr-del' : 'cxr-add'}`}>{statusGlyph(file.status)}</span>
        <button
          type="button"
          className="cxr-file-name"
          title={t('openFile')}
          onClick={(event) => {
            event.stopPropagation()
            props.onOpenFile(file.path, firstLine(file))
          }}
        >
          {name}
        </button>
        {dir ? <span className="cxr-file-dir">{dir}</span> : null}
        <span className="cxr-stats">
          {file.additions ? <span className="cxr-add">+{file.additions}</span> : null}
          {file.deletions ? <span className="cxr-del">−{file.deletions}</span> : null}
        </span>
        <span className="cxr-file-actions" onClick={(event) => event.stopPropagation()}>
          {props.filter === 'branch' ? (
            <label className="cxr-check" title={viewed ? t('markUnviewed') : t('markViewed')}>
              <input type="checkbox" checked={viewed} onChange={(event) => props.onViewed(file.path, event.target.checked)} />
              <span>{t('viewed')}</span>
            </label>
          ) : null}
          {actionable ? <FileActions lang={lang} filter={props.filter} onAction={(action) => props.onAction(action, 'file', file.path)} /> : null}
        </span>
      </div>
      {expanded ? <FileBody {...props} file={file} actionable={actionable} /> : null}
    </article>
  )
}

function FileActions({ lang, filter, onAction }: { lang: Lang; filter: ReviewFilter; onAction(action: 'stage' | 'unstage' | 'revert'): void }) {
  const t = (key: MessageKey) => translate(lang, key)
  const staged = filter === 'staged'
  return (
    <>
      <button type="button" className="cxr-btn" onClick={() => onAction(staged ? 'unstage' : 'stage')}>
        {staged ? t('unstageFile') : t('stageFile')}
      </button>
      <button type="button" className="cxr-btn cxr-danger" onClick={() => onAction('revert')}>
        {t('revertFile')}
      </button>
    </>
  )
}

function FileBody(props: DiffViewProps & { file: ReviewFile; actionable: boolean }) {
  const { file, lang } = props
  const t = (key: MessageKey) => translate(lang, key)
  if (file.status === 'unmerged') return <p className="cxr-rich">{t('mergeConflict')}</p>
  if (file.binary) return <p className="cxr-rich">{t('binary')}</p>
  if (file.tooLarge) {
    return (
      <div className="cxr-empty">
        <h2>{t('diffTooLargeTitle')}</h2>
        <p>{t('diffTooLargeDescription')}</p>
        <button type="button" className="cxr-btn cxr-primary" onClick={() => props.onOpenFile(file.path)}>{t('openFile')}</button>
      </div>
    )
  }
  return (
    <>
      {props.rich ? <RichPreview lang={lang} file={file} root={props.root} fileUrl={props.fileUrl} /> : null}
      {file.hunks.map((hunk) => (
        <HunkView key={hunk.header} hunk={hunk} {...props} />
      ))}
    </>
  )
}

function RichPreview({ file, root, fileUrl }: { lang: Lang; file: ReviewFile; root: string | null; fileUrl: ReviewClient['fileUrl'] }) {
  const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
  if (!root || file.status === 'deleted') return null
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    const url = fileUrl(root, file.path)
    if (!url) return null
    return <div className="cxr-rich"><img src={url} alt={file.path} /></div>
  }
  if (ext === 'md' || ext === 'markdown') {
    const text = file.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.kind !== 'del').map((line) => line.text)).join('\n')
    return <div className="cxr-rich"><pre>{text}</pre></div>
  }
  return null
}

function HunkView(props: DiffViewProps & { file: ReviewFile; hunk: DiffHunk; actionable: boolean }) {
  const { hunk, lang, file } = props
  const t = (key: MessageKey) => translate(lang, key)
  const staged = props.filter === 'staged'
  const pairs = useMemo(() => pairChangedLines(hunk.lines), [hunk])
  return (
    <div>
      <div className="cxr-hunk-head">
        <span className="cxr-hunk-label">{hunk.header}{hunk.section ? ` ${hunk.section}` : ''}</span>
        {props.actionable ? (
          <span className="cxr-hunk-actions">
            <button type="button" className="cxr-btn" onClick={() => props.onAction(staged ? 'unstage' : 'stage', 'hunk', file.path, hunk.header)}>
              {staged ? t('unstageHunk') : t('stageHunk')}
            </button>
            <button type="button" className="cxr-btn cxr-danger" onClick={() => props.onAction('revert', 'hunk', file.path, hunk.header)}>
              {t('revertHunk')}
            </button>
          </span>
        ) : <span />}
      </div>
      {props.diffMode === 'split'
        ? splitRows(hunk.lines).map((row, index) => (
          <SplitLine key={index} {...props} row={row} pairs={pairs} />
        ))
        : hunk.lines.map((line, index) => (
          <UnifiedLine key={index} {...props} line={line} index={index} pairs={pairs} />
        ))}
    </div>
  )
}

function UnifiedLine(props: DiffViewProps & { file: ReviewFile; hunk: DiffHunk; line: DiffLine; index: number; pairs: Map<number, number> }) {
  const pairIndex = props.line.kind === 'del' ? props.pairs.get(props.index) : pairBack(props.pairs, props.index)
  const other = pairIndex == null ? null : props.hunk.lines[pairIndex]
  const tokens = props.wordDiffs && other && props.line.kind !== 'context'
    ? (props.line.kind === 'del' ? wordDiff(props.line.text, other.text).before : wordDiff(other.text, props.line.text).after)
    : null
  return (
    <>
      <LineShell
        lang={props.lang}
        kind={props.line.kind}
        oldNo={props.line.oldNo}
        newNo={props.line.newNo}
        text={props.line.text}
        tokens={tokens}
        onOpen={(line) => props.onOpenFile(props.file.path, line)}
        onComment={(side, line) => props.onComment(draft(props.file.path, side, line, ''))}
      />
      <Annotations {...props} side={props.line.kind === 'del' ? 'old' : 'new'} lineNo={props.line.kind === 'del' ? props.line.oldNo : props.line.newNo} />
    </>
  )
}

function SplitLine(props: DiffViewProps & { file: ReviewFile; hunk: DiffHunk; row: { left: DiffLine | null; right: DiffLine | null }; pairs: Map<number, number> }) {
  const left = props.row.left
  const right = props.row.right
  const tokens = props.wordDiffs && left && right && left.kind !== 'context'
    ? wordDiff(left.text, right.text)
    : null
  return (
    <>
      <div className="cxr-line" data-kind={left?.kind === 'del' ? 'del' : right?.kind === 'add' ? 'add' : 'context'}>
        <Plus lang={props.lang} line={left} onComment={(side, line) => props.onComment(draft(props.file.path, side, line, ''))} />
        <span className="cxr-num">{left?.oldNo ?? ''}</span>
        <code className="cxr-code" onClick={(event) => clickLine(event, left?.oldNo ?? left?.newNo ?? undefined, props)}>{tokens ? <Tokens tokens={tokens.before} /> : left?.text}</code>
        <Plus lang={props.lang} line={right} onComment={(side, line) => props.onComment(draft(props.file.path, side, line, ''))} />
        <span className="cxr-num">{right?.newNo ?? ''}</span>
        <code className="cxr-code" onClick={(event) => clickLine(event, right?.newNo ?? undefined, props)}>{tokens ? <Tokens tokens={tokens.after} /> : right?.text}</code>
      </div>
      <Annotations {...props} side="new" lineNo={right?.newNo ?? null} />
    </>
  )
}

function LineShell({ lang, kind, oldNo, newNo, text, tokens, onOpen, onComment }: {
  lang: Lang
  kind: DiffLine['kind']
  oldNo: number | null
  newNo: number | null
  text: string
  tokens: WordToken[] | null
  onOpen(line: number): void
  onComment(side: 'old' | 'new', line: number): void
}) {
  const line = kind === 'del' ? oldNo : newNo
  return (
    <div className="cxr-line" data-kind={kind}>
      <Plus lang={lang} line={{ kind, text, oldNo, newNo }} onComment={onComment} />
      <span className="cxr-num">{oldNo ?? ''}</span>
      <span className="cxr-num">{newNo ?? ''}</span>
      <code
        className="cxr-code"
        onClick={(event) => {
          if ((event.metaKey || event.ctrlKey) && line) onOpen(line)
        }}
      >
        {tokens ? <Tokens tokens={tokens} /> : text}
      </code>
    </div>
  )
}

function Plus({ lang, line, onComment }: { lang: Lang; line: DiffLine | null; onComment(side: 'old' | 'new', line: number): void }) {
  if (!line) return <span />
  const side = line.kind === 'del' ? 'old' : 'new'
  const number = side === 'old' ? line.oldNo : line.newNo
  if (!number) return <span />
  return (
    <button
      type="button"
      className="cxr-plus"
      aria-label={translate(lang, 'comment')}
      onClick={() => onComment(side, number)}
    >
      +
    </button>
  )
}

function Tokens({ tokens }: { tokens: WordToken[] }) {
  return (
    <>
      {tokens.map((token, index) => token.changed
        ? <mark key={index} className="cxr-word">{token.text}</mark>
        : <React.Fragment key={index}>{token.text}</React.Fragment>)}
    </>
  )
}

function Annotations(props: DiffViewProps & { file: ReviewFile; side: 'old' | 'new'; lineNo: number | null }) {
  const lineNo = props.lineNo
  if (!lineNo) return null
  const comments = props.comments.filter((comment) => comment.path === props.file.path && comment.line === lineNo && comment.side === props.side)
  const findings = props.findings.filter((finding) => !props.dismissed.includes(finding.id) && finding.path === props.file.path && finding.line === lineNo && finding.side === props.side)
  const draft = comments.find((comment) => comment.text === '')
  return (
    <>
      {findings.map((finding) => (
        <aside key={finding.id} className="cxr-finding">
          <header>
            <span className="cxr-priority">{finding.priority}</span>
            <strong>{finding.title}</strong>
            <span>{translate(props.lang, 'findingAuthor')}</span>
            <button type="button" className="cxr-btn" onClick={() => props.onDismiss(finding.id)}>{translate(props.lang, 'dismiss')}</button>
          </header>
          {finding.body ? <p>{finding.body}</p> : null}
        </aside>
      ))}
      {comments.filter((comment) => comment.text !== '').map((comment) => (
        <aside key={comment.id} className="cxr-comment">
          <header>
            <strong>{translate(props.lang, 'localAuthor')}</strong>
            <button type="button" className="cxr-btn" onClick={() => props.onDeleteComment(comment.id)}>{translate(props.lang, 'delete')}</button>
          </header>
          <p>{comment.text}</p>
        </aside>
      ))}
      {draft ? <CommentEditor lang={props.lang} comment={draft} onComment={props.onComment} onDeleteComment={props.onDeleteComment} /> : null}
    </>
  )
}

function CommentEditor({ lang, comment, onComment, onDeleteComment }: {
  lang: Lang
  comment: LocalComment
  onComment(comment: LocalComment): void
  onDeleteComment(id: string): void
}) {
  const [text, setText] = useState(comment.text)
  return (
    <form
      className="cxr-comment"
      onSubmit={(event) => {
        event.preventDefault()
        if (!text.trim()) return
        onComment({ ...comment, text: text.trim() })
      }}
    >
      <textarea className="cxr-textarea" rows={3} autoFocus placeholder={translate(lang, 'commentPlaceholder')} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="cxr-dialog-actions">
        <button type="button" className="cxr-btn" onClick={() => onDeleteComment(comment.id)}>{translate(lang, 'cancel')}</button>
        <button type="submit" className="cxr-btn cxr-primary" disabled={!text.trim()}>{translate(lang, 'save')}</button>
      </div>
    </form>
  )
}

function draft(path: string, side: 'old' | 'new', line: number, text: string): LocalComment {
  return { id: `${path}:${side}:${line}:${Date.now()}`, path, side, line, text }
}

function pairBack(pairs: Map<number, number>, addIndex: number): number | null {
  for (const [delIndex, mapped] of pairs) if (mapped === addIndex) return delIndex
  return null
}

function splitRows(lines: DiffLine[]): Array<{ left: DiffLine | null; right: DiffLine | null }> {
  const rows: Array<{ left: DiffLine | null; right: DiffLine | null }> = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line || line.kind === 'context') {
      rows.push({ left: line ?? null, right: line ?? null })
      index += 1
      continue
    }
    const dels: DiffLine[] = []
    const adds: DiffLine[] = []
    while (index < lines.length && lines[index]?.kind === 'del') {
      const current = lines[index]
      if (current) dels.push(current)
      index += 1
    }
    while (index < lines.length && lines[index]?.kind === 'add') {
      const current = lines[index]
      if (current) adds.push(current)
      index += 1
    }
    const count = Math.max(dels.length, adds.length)
    for (let offset = 0; offset < count; offset += 1) rows.push({ left: dels[offset] ?? null, right: adds[offset] ?? null })
  }
  return rows
}

function clickLine(event: React.MouseEvent, line: number | undefined, props: DiffViewProps & { file: ReviewFile }) {
  if ((event.metaKey || event.ctrlKey) && line) props.onOpenFile(props.file.path, line)
}

function firstLine(file: ReviewFile): number {
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'add' && line.newNo) return line.newNo
    }
  }
  return file.hunks[0]?.newStart || file.hunks[0]?.oldStart || 1
}

function statusGlyph(status: ReviewFile['status']): string {
  if (status === 'added' || status === 'untracked') return 'A'
  if (status === 'deleted') return 'D'
  if (status === 'renamed' || status === 'copied') return 'R'
  if (status === 'unmerged') return 'U'
  return 'M'
}
