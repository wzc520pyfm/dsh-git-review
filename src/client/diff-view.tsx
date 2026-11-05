import React, { useMemo, useState } from 'react'
import { getSingularPatch, type DiffLineAnnotation, type FileDiffMetadata } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'
import type { ReviewClient } from './api.ts'
import type { Lang, MessageKey } from './i18n.ts'
import { translate } from './i18n.ts'
import { reviewFileToUnifiedPatch } from '../review/to-patch.ts'
import type { ReviewFile, ReviewFilter, ReviewFinding } from '../review/types.ts'

export interface LocalComment {
  id: string
  path: string
  line: number
  side: 'old' | 'new'
  text: string
}

type AnnotationMeta =
  | { kind: 'comment'; comment: LocalComment }
  | { kind: 'finding'; finding: ReviewFinding }
  | { kind: 'draft'; comment: LocalComment }
  | { kind: 'hunk'; header: string; section: string }

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
    <div className={props.diffMode === 'split' ? 'cxr-split cxr-pierre-list' : 'cxr-pierre-list'}>
      {props.files.map((file) => (
        <PierreFileCard key={file.path} file={file} {...props} />
      ))}
    </div>
  )
}

function PierreFileCard(props: DiffViewProps & { file: ReviewFile }) {
  const { file, lang } = props
  const t = (key: MessageKey) => translate(lang, key)
  const expanded = props.open[file.path] ?? true
  const actionable = props.gitActions && file.status !== 'unmerged' && !props.busy
  const viewed = props.viewed[file.path] === true
  const patch = useMemo(() => reviewFileToUnifiedPatch(file), [file])
  const fileDiff = useMemo(() => {
    if (!patch) return null
    try {
      return getSingularPatch(patch)
    } catch {
      return null
    }
  }, [patch])

  const annotations = useMemo(
    () => buildAnnotations(file, props.comments, props.findings, props.dismissed, actionable),
    [file, props.comments, props.findings, props.dismissed, actionable],
  )

  const options = useMemo(() => ({
    diffStyle: props.diffMode,
    overflow: props.wrap ? 'wrap' as const : 'scroll' as const,
    lineDiffType: props.wordDiffs ? 'word-alt' as const : 'none' as const,
    themeType: 'system' as const,
    theme: { light: 'pierre-light', dark: 'pierre-dark' },
    collapsed: !expanded,
    stickyHeader: true,
    hunkSeparators: 'line-info' as const,
    enableGutterUtility: true,
    expandUnchanged: false,
    preferredHighlighter: 'shiki-js' as const,
  }), [props.diffMode, props.wrap, props.wordDiffs, expanded])

  if (file.status === 'unmerged') {
    return (
      <article className="cxr-file" data-review-path={file.path}>
        <LegacyHead {...props} actionable={false} isViewed={viewed} />
        {expanded ? <p className="cxr-rich">{t('mergeConflict')}</p> : null}
      </article>
    )
  }
  if (file.binary) {
    return (
      <article className="cxr-file" data-review-path={file.path}>
        <LegacyHead {...props} actionable={actionable} isViewed={viewed} />
        {expanded ? <p className="cxr-rich">{t('binary')}</p> : null}
      </article>
    )
  }
  if (file.tooLarge || (!fileDiff && file.hunks.length === 0)) {
    return (
      <article className="cxr-file" data-review-path={file.path}>
        <LegacyHead {...props} actionable={actionable} isViewed={viewed} />
        {expanded ? (
          <div className="cxr-empty">
            <h2>{t('diffTooLargeTitle')}</h2>
            <p>{t('diffTooLargeDescription')}</p>
            <button type="button" className="cxr-btn cxr-primary" onClick={() => props.onOpenFile(file.path)}>{t('openFile')}</button>
          </div>
        ) : null}
      </article>
    )
  }
  if (!fileDiff) {
    return (
      <article className="cxr-file" data-review-path={file.path}>
        <LegacyHead {...props} actionable={actionable} isViewed={viewed} />
        {expanded ? <p className="cxr-rich">{t('loadFailed')}</p> : null}
      </article>
    )
  }

  return (
    <article className="cxr-file cxr-pierre-file" data-review-path={file.path}>
      {props.rich && expanded ? <RichPreview lang={lang} file={file} root={props.root} fileUrl={props.fileUrl} /> : null}
      <FileDiff<AnnotationMeta>
        fileDiff={fileDiff}
        disableWorkerPool
        options={options}
        lineAnnotations={annotations}
        className="cxr-pierre-diff"
        renderCustomHeader={() => (
          <LegacyHead {...props} actionable={actionable} isViewed={viewed} asHeader />
        )}
        renderAnnotation={(annotation) => (
          <AnnotationBlock
            lang={lang}
            meta={annotation.metadata}
            onComment={props.onComment}
            onDeleteComment={props.onDeleteComment}
            onDismiss={props.onDismiss}
            onAction={actionable ? props.onAction : undefined}
            path={file.path}
            filter={props.filter}
          />
        )}
        renderGutterUtility={(getHoveredLine) => (
          <GutterPlus
            lang={lang}
            getHoveredLine={getHoveredLine}
            path={file.path}
            onComment={props.onComment}
          />
        )}
      />
    </article>
  )
}

function LegacyHead(props: DiffViewProps & { file: ReviewFile; actionable: boolean; isViewed: boolean; asHeader?: boolean }) {
  const { file, lang } = props
  const t = (key: MessageKey) => translate(lang, key)
  const expanded = props.open[file.path] ?? true
  const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''
  const name = file.path.slice(dir.length ? dir.length + 1 : 0)
  const Tag = props.asHeader ? 'div' : 'div'
  return (
    <Tag className="cxr-file-head" onClick={() => props.onToggle(file.path)}>
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
          <label className="cxr-check" title={props.isViewed ? t('markUnviewed') : t('markViewed')}>
            <input type="checkbox" checked={props.isViewed} onChange={(event) => props.onViewed(file.path, event.target.checked)} />
            <span>{t('viewed')}</span>
          </label>
        ) : null}
        {props.actionable ? <FileActions lang={lang} filter={props.filter} onAction={(action) => props.onAction(action, 'file', file.path)} /> : null}
      </span>
    </Tag>
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

function AnnotationBlock({ lang, meta, onComment, onDeleteComment, onDismiss, onAction, path, filter }: {
  lang: Lang
  meta: AnnotationMeta
  onComment(comment: LocalComment): void
  onDeleteComment(id: string): void
  onDismiss(id: string): void
  onAction?: DiffViewProps['onAction']
  path: string
  filter: ReviewFilter
}) {
  const t = (key: MessageKey) => translate(lang, key)
  if (meta.kind === 'hunk') {
    if (!onAction) return <div className="cxr-hunk-head"><span className="cxr-hunk-label">{meta.header}{meta.section ? ` ${meta.section}` : ''}</span></div>
    const staged = filter === 'staged'
    return (
      <div className="cxr-hunk-head">
        <span className="cxr-hunk-label">{meta.header}{meta.section ? ` ${meta.section}` : ''}</span>
        <span className="cxr-hunk-actions">
          <button type="button" className="cxr-btn" onClick={() => onAction(staged ? 'unstage' : 'stage', 'hunk', path, meta.header)}>
            {staged ? t('unstageHunk') : t('stageHunk')}
          </button>
          <button type="button" className="cxr-btn cxr-danger" onClick={() => onAction('revert', 'hunk', path, meta.header)}>
            {t('revertHunk')}
          </button>
        </span>
      </div>
    )
  }
  if (meta.kind === 'finding') {
    const finding = meta.finding
    return (
      <aside className="cxr-finding">
        <header>
          <span className="cxr-priority">{finding.priority}</span>
          <strong>{finding.title}</strong>
          <span>{t('findingAuthor')}</span>
          <button type="button" className="cxr-btn" onClick={() => onDismiss(finding.id)}>{t('dismiss')}</button>
        </header>
        {finding.body ? <p>{finding.body}</p> : null}
      </aside>
    )
  }
  if (meta.kind === 'comment') {
    const comment = meta.comment
    return (
      <aside className="cxr-comment">
        <header>
          <strong>{t('localAuthor')}</strong>
          <button type="button" className="cxr-btn" onClick={() => onDeleteComment(comment.id)}>{t('delete')}</button>
        </header>
        <p>{comment.text}</p>
      </aside>
    )
  }
  return <CommentEditor lang={lang} comment={meta.comment} onComment={onComment} onDeleteComment={onDeleteComment} />
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

function GutterPlus({ lang, getHoveredLine, path, onComment }: {
  lang: Lang
  getHoveredLine: () => { lineNumber: number; side: 'additions' | 'deletions' } | undefined
  path: string
  onComment(comment: LocalComment): void
}) {
  return (
    <button
      type="button"
      className="cxr-plus"
      aria-label={translate(lang, 'comment')}
      onClick={() => {
        const hovered = getHoveredLine()
        if (!hovered) return
        const side = hovered.side === 'deletions' ? 'old' : 'new'
        onComment(draft(path, side, hovered.lineNumber, ''))
      }}
    >
      +
    </button>
  )
}

function buildAnnotations(
  file: ReviewFile,
  comments: LocalComment[],
  findings: ReviewFinding[],
  dismissed: string[],
  actionable: boolean,
): DiffLineAnnotation<AnnotationMeta>[] {
  const annotations: Array<{ side: 'additions' | 'deletions'; lineNumber: number; metadata: AnnotationMeta }> = []

  for (const hunk of file.hunks) {
    const lineNumber = hunk.newCount > 0 ? hunk.newStart : hunk.oldStart
    const side = hunk.newCount > 0 ? 'additions' : 'deletions'
    if (lineNumber > 0) {
      annotations.push({
        side,
        lineNumber,
        metadata: { kind: 'hunk', header: hunk.header, section: hunk.section },
      })
    }
  }

  for (const finding of findings) {
    if (dismissed.includes(finding.id) || finding.path !== file.path) continue
    annotations.push({
      side: finding.side === 'old' ? 'deletions' : 'additions',
      lineNumber: finding.line,
      metadata: { kind: 'finding', finding },
    })
  }

  for (const comment of comments) {
    if (comment.path !== file.path) continue
    const metadata: AnnotationMeta = comment.text === ''
      ? { kind: 'draft', comment }
      : { kind: 'comment', comment }
    annotations.push({
      side: comment.side === 'old' ? 'deletions' : 'additions',
      lineNumber: comment.line,
      metadata,
    })
  }

  // Silence unused when no hunks need actions; actionable still drives header.
  void actionable
  return annotations as DiffLineAnnotation<AnnotationMeta>[]
}

function draft(path: string, side: 'old' | 'new', line: number, text: string): LocalComment {
  return { id: `${path}:${side}:${line}:${Date.now()}`, path, side, line, text }
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

/** Exported for tests / jump helpers that still need FileDiffMetadata. */
export function parseReviewFileDiff(file: ReviewFile): FileDiffMetadata | null {
  const patch = reviewFileToUnifiedPatch(file)
  if (!patch) return null
  try {
    return getSingularPatch(patch)
  } catch {
    return null
  }
}
