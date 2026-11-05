import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ReviewClient } from './api.ts'
import { DiffList, type LocalComment } from './diff-view.tsx'
import { detectLang, translate, type Lang, type MessageKey } from './i18n.ts'
import { reviewCss } from './styles.ts'
import { gitApplyCommand } from './apply-command.ts'
import { inlineCommentPrompt, reviewPrompt } from '../review/prompts.ts'
import type { LoadQuery, ReviewFile, ReviewFilter, ReviewSnapshot } from '../review/types.ts'
import { EMPTY_SNAPSHOT } from '../review/types.ts'

const FILTERS: ReviewFilter[] = ['unstaged', 'staged', 'commit', 'branch', 'last-turn']
const STORAGE = 'dsh-codex-review:'

interface Settings {
  wrap: boolean
  hideWhitespace: boolean
  wordDiffs: boolean
  full: boolean
  rich: boolean
  diffMode: 'unified' | 'split'
  filesVisible: boolean
  treeWidth: number
  skipRevert: boolean
  baseBranch: string | null
}

const DEFAULT_SETTINGS: Settings = {
  wrap: false,
  hideWhitespace: false,
  wordDiffs: false,
  full: false,
  rich: false,
  diffMode: 'unified',
  filesVisible: false,
  treeWidth: 248,
  skipRevert: false,
  baseBranch: null,
}

export function ensureReviewStyle(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById('dsh-codex-review-style')
  if (!style) {
    style = document.createElement('style')
    style.id = 'dsh-codex-review-style'
    document.head.appendChild(style)
  }
  if (style.textContent !== reviewCss) style.textContent = reviewCss
}

export function ReviewPane({ client, preview = false, lang = detectLang() }: { client: ReviewClient; preview?: boolean; lang?: Lang }) {
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(lang, key, values)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [filter, setFilter] = useState<ReviewFilter>('unstaged')
  const [commitSha, setCommitSha] = useState<string | null>(null)
  const [root, setRoot] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<ReviewSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [viewed, setViewed] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<LocalComment[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [revertTarget, setRevertTarget] = useState<null | { scope: 'section' | 'file' | 'hunk'; path?: string; hunkHeader?: string }>(null)
  const [skipChecked, setSkipChecked] = useState(settings.skipRevert)
  const [commitOpen, setCommitOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const requestId = useRef(0)
  const commentsRoot = useRef<string | null>(null)

  useEffect(() => { ensureReviewStyle() }, [])

  const loadQuery = useMemo<LoadQuery>(() => ({
    filter,
    baseBranch: settings.baseBranch,
    commitSha,
    hideWhitespace: settings.hideWhitespace,
    full: settings.full,
    root,
  }), [filter, settings.baseBranch, settings.hideWhitespace, settings.full, commitSha, root])

  async function reload(quiet = false) {
    const id = requestId.current + 1
    requestId.current = id
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const next = await client.load(loadQuery)
      if (requestId.current !== id) return
      setSnapshot(next)
      if (next.kind === 'error') setError(next.error ?? t('loadFailed'))
      else if (next.kind === 'repo') setError(null)
      if (next.kind === 'repo' && !root && next.root) setRoot(next.root)
      if (!settings.baseBranch && next.baseBranch) updateSettings({ baseBranch: next.baseBranch })
      if (next.kind === 'repo' && next.root && commentsRoot.current !== next.root) {
        commentsRoot.current = next.root
        setComments(readComments(next.root))
      }
    } catch (cause) {
      if (requestId.current !== id) return
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (requestId.current === id) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }

  useEffect(() => { void reload(snapshot.kind === 'repo') }, [loadQuery.filter, loadQuery.baseBranch, loadQuery.commitSha, loadQuery.hideWhitespace, loadQuery.full, loadQuery.root])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy) void reload(true)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [loadQuery, busy])

  function updateSettings(patch: Partial<Settings>) {
    setSettings((current) => {
      const next = { ...current, ...patch }
      localStorage.setItem(STORAGE + 'settings', JSON.stringify(next))
      return next
    })
  }

  function rememberComments(next: LocalComment[], repoRoot = snapshot.root) {
    setComments(next)
    if (repoRoot) localStorage.setItem(STORAGE + 'comments:' + repoRoot, JSON.stringify(next.filter((comment) => comment.text.trim())))
  }

  function showToast(text: string) {
    setToast(text)
    window.setTimeout(() => setToast((current) => current === text ? null : current), 2600)
  }

  async function runAction(action: 'stage' | 'unstage' | 'revert', scope: 'section' | 'file' | 'hunk', path?: string, hunkHeader?: string) {
    if (action === 'revert' && !settings.skipRevert) {
      setSkipChecked(false)
      setRevertTarget({ scope, path, hunkHeader })
      return
    }
    setBusy(true)
    const result = await client.action({ action, scope, filter, path, hunkHeader, baseBranch: settings.baseBranch, commitSha, root: snapshot.root })
    setBusy(false)
    setSnapshot(result.snapshot)
    if (!result.ok) showToast(result.error || t('loadFailed'))
  }

  const files = snapshot.files
  const gitActions = filter === 'unstaged' || filter === 'staged'
  const visibleFiles = files
  const branchName = snapshot.branch || t('yourBranch')

  return (
    <div className="cxr" data-wrap={settings.wrap ? '1' : '0'}>
      {preview ? <div className="cxr-banner">{t('previewBanner')}</div> : null}
      <header className="cxr-header">
        <div className="cxr-header-row">
          <div className="cxr-source">
            <FilterMenu
              lang={lang}
              filter={filter}
              staged={snapshot.stagedFileCount}
              unstaged={snapshot.unstagedFileCount}
              commits={snapshot.commits}
              onSelect={(next, sha) => {
                setFilter(next)
                if (sha) setCommitSha(sha)
              }}
            />
            <div className="cxr-source-meta">
              {filter === 'commit' && snapshot.selectedCommit ? <span className="cxr-subject">{snapshot.selectedCommit.subject}</span> : null}
              <LineStats additions={snapshot.additions} deletions={snapshot.deletions} />
              {refreshing ? <span className="cxr-spinner" role="status" aria-label={t('refreshing')} /> : null}
              {snapshot.repos.length > 1 ? (
                <select className="cxr-input" style={{ width: 'auto' }} aria-label={t('repo')} value={snapshot.root ?? ''} onChange={(event) => setRoot(event.target.value)}>
                  {snapshot.repos.map((repo) => <option key={repo.root} value={repo.root}>{repo.label}</option>)}
                </select>
              ) : null}
            </div>
          </div>
          <div className="cxr-tools">
            <OptionsMenu
              lang={lang}
              settings={settings}
              disabled={!snapshot.patch}
              onToggle={(key) => updateSettings({ [key]: !settings[key] } as Partial<Settings>)}
              onRefresh={() => void reload(true)}
              onCopy={() => {
                const command = gitApplyCommand(snapshot.patch)
                if (!command) return
                void navigator.clipboard?.writeText(command).then(() => showToast(t('copiedApply')), () => showToast(t('copiedApply')))
              }}
              onReview={() => setReviewOpen(true)}
            />
            <IconButton label={files.length > 0 && Object.values(open).every((value) => value !== false) && files.every((file) => open[file.path] !== false) ? t('collapseAll') : t('expandAll')} onClick={() => {
              const collapse = files.every((file) => (open[file.path] ?? true))
              const next: Record<string, boolean> = {}
              for (const file of files) next[file.path] = !collapse
              setOpen(next)
            }}>
              {files.every((file) => (open[file.path] ?? true)) ? '▾' : '▸'}
            </IconButton>
            <div style={{ position: 'relative' }}>
              <IconButton label={t('jump')} onClick={() => setJumpOpen((value) => !value)}>↪</IconButton>
              {jumpOpen ? (
                <JumpMenu lang={lang} files={files} onClose={() => setJumpOpen(false)} onPick={(filePath) => {
                  setOpen((current) => ({ ...current, [filePath]: true }))
                  document.querySelector(`[data-review-path="${cssEscape(filePath)}"]`)?.scrollIntoView({ block: 'start' })
                  setJumpOpen(false)
                }} />
              ) : null}
            </div>
            <IconButton label={settings.diffMode === 'unified' ? t('split') : t('unified')} onClick={() => updateSettings({ diffMode: settings.diffMode === 'unified' ? 'split' : 'unified' })}>
              {settings.diffMode === 'unified' ? '▥' : '▤'}
            </IconButton>
            <IconButton label={settings.filesVisible ? t('hideFiles') : t('showFiles')} active={settings.filesVisible} onClick={() => updateSettings({ filesVisible: !settings.filesVisible })}>▤</IconButton>
            <button type="button" className="cxr-btn" title={snapshot.stagedFileCount === 0 && snapshot.ahead === 0 ? t('nothingToCommit') : t('commitOrPush')} onClick={() => setCommitOpen(true)}>
              <span className="cxr-commit-label">{t('commitOrPush')}</span>
              <span aria-hidden="true">✓</span>
            </button>
          </div>
        </div>
        {filter === 'branch' ? (
          <div className="cxr-branch-row">
            <span>{branchName}</span>
            <span aria-hidden="true">→</span>
            <select aria-label={t('selectBase')} className="cxr-input" style={{ width: 'auto' }} value={settings.baseBranch ?? snapshot.baseBranch ?? ''} onChange={(event) => updateSettings({ baseBranch: event.target.value })}>
              {(snapshot.branches.length ? snapshot.branches : [snapshot.baseBranch].filter(Boolean)).map((branch) => (
                <option key={branch} value={branch ?? ''}>{branch}</option>
              ))}
            </select>
          </div>
        ) : null}
      </header>
      <div className="cxr-body">
        <div className="cxr-diffs">
          <DiffBody
            lang={lang}
            loading={loading}
            error={error}
            snapshot={snapshot}
            filter={filter}
            onRetry={() => void reload(false)}
            onInit={async () => {
              setBusy(true)
              setError(null)
              try {
                const next = await client.init()
                setSnapshot(next)
                if (next.kind === 'error') setError(next.error ?? t('loadFailed'))
                else setError(null)
                if (next.kind === 'repo' && next.root) setRoot(next.root)
                setLoading(false)
              } catch (cause) {
                const message = cause instanceof Error ? cause.message : String(cause)
                setError(message)
                showToast(t('gitInitError', { message }))
                setLoading(false)
              } finally {
                setBusy(false)
              }
            }}
            onBranch={() => setFilter('branch')}
            busy={busy}
          >
            <DiffList
              lang={lang}
              files={visibleFiles}
              filter={filter}
              diffMode={settings.diffMode}
              wrap={settings.wrap}
              wordDiffs={settings.wordDiffs}
              rich={settings.rich}
              gitActions={gitActions}
              busy={busy}
              open={open}
              viewed={viewed}
              comments={comments}
              findings={snapshot.findings}
              dismissed={dismissed}
              fileUrl={client.fileUrl}
              root={snapshot.root}
              onToggle={(filePath) => setOpen((current) => ({ ...current, [filePath]: !(current[filePath] ?? true) }))}
              onOpenFile={(filePath, line) => client.openFile(filePath, line)}
              onViewed={(filePath, next) => {
                setViewed((current) => ({ ...current, [filePath]: next }))
                if (next) setOpen((current) => ({ ...current, [filePath]: false }))
              }}
              onAction={(action, scope, filePath, hunkHeader) => void runAction(action, scope, filePath, hunkHeader)}
              onComment={(comment) => {
                const without = comments.filter((item) => item.id !== comment.id && !(comment.text === '' && item.text === '' && item.path === comment.path && item.line === comment.line && item.side === comment.side))
                rememberComments([...without, comment])
              }}
              onDeleteComment={(id) => rememberComments(comments.filter((comment) => comment.id !== id))}
              onDismiss={(id) => setDismissed((current) => [...current, id])}
            />
          </DiffBody>
          {gitActions && files.length > 0 ? (
            <div className="cxr-pill">
              {filter === 'unstaged' ? <button type="button" className="cxr-btn" disabled={busy} onClick={() => void runAction('revert', 'section')}>{t('revertAll')}</button> : null}
              <button type="button" className="cxr-btn" disabled={busy} onClick={() => void runAction(filter === 'staged' ? 'unstage' : 'stage', 'section')}>
                {filter === 'staged' ? t('unstageAll') : t('stageAll')}
              </button>
              {comments.some((comment) => comment.text.trim()) ? (
                <button type="button" className="cxr-btn" title={t('sendCommentsHint')} onClick={() => void sendComments()}>{t('sendComments')}</button>
              ) : null}
            </div>
          ) : null}
        </div>
        {settings.filesVisible ? (
          <>
            <div className="cxr-resizer" onPointerDown={(event) => dragTree(event, settings.treeWidth, (treeWidth) => updateSettings({ treeWidth }))} />
            <FileTree lang={lang} files={files} width={settings.treeWidth} query={query} onQuery={setQuery} comments={comments} onPick={(filePath) => {
              setOpen((current) => ({ ...current, [filePath]: true }))
              document.querySelector(`[data-review-path="${cssEscape(filePath)}"]`)?.scrollIntoView({ block: 'start' })
            }} />
          </>
        ) : null}
      </div>
      {revertTarget ? (
        <Modal title={t('revertTitle')} subtitle={t('revertMessage')} onClose={() => setRevertTarget(null)}>
          <label className="cxr-check">
            <input type="checkbox" checked={skipChecked} onChange={(event) => setSkipChecked(event.target.checked)} />
            {t('dontAsk')}
          </label>
          <div className="cxr-dialog-actions">
            <button type="button" className="cxr-btn" onClick={() => setRevertTarget(null)}>{t('cancel')}</button>
            <button type="button" className="cxr-btn cxr-danger" autoFocus onClick={() => {
              if (skipChecked) updateSettings({ skipRevert: true })
              const target = revertTarget
              setRevertTarget(null)
              void runAction('revert', target.scope, target.path, target.hunkHeader)
            }}>{t('confirm')}</button>
          </div>
        </Modal>
      ) : null}
      {commitOpen ? (
        <CommitDialog
          lang={lang}
          branch={branchName}
          busy={busy}
          canCommit={snapshot.stagedFileCount > 0}
          ahead={snapshot.ahead}
          gh={snapshot.ghAvailable}
          onClose={() => setCommitOpen(false)}
          onCommit={async (message, includeUnstaged, push) => {
            setBusy(true)
            const result = await client.commit({ message, includeUnstaged, push, root: snapshot.root })
            setBusy(false)
            setSnapshot(result.snapshot)
            showToast(result.ok ? (push ? t('pushed', { branch: result.snapshot.branch || branchName }) : t('committed', { branch: result.snapshot.branch || branchName })) : result.error || t('commitFailed'))
            if (result.ok) setCommitOpen(false)
          }}
          onPush={async () => {
            setBusy(true)
            const result = await client.push(snapshot.root)
            setBusy(false)
            setSnapshot(result.snapshot)
            showToast(result.ok ? t('pushed', { branch: result.snapshot.branch || branchName }) : result.error || t('pushFailed'))
          }}
          onPr={async (title, body) => {
            const result = await client.createPr({ title, body, root: snapshot.root })
            showToast(result.ok ? t('prCreated') : result.error || t('installGh'))
          }}
        />
      ) : null}
      {reviewOpen ? (
        <ReviewDialog
          lang={lang}
          busy={busy}
          baseBranch={settings.baseBranch || snapshot.baseBranch}
          commits={snapshot.commits}
          onClose={() => setReviewOpen(false)}
          onStart={async (choice) => {
            const text = reviewPrompt({
              filter: choice.filter,
              baseBranch: choice.baseBranch,
              commitSha: choice.commitSha,
              custom: choice.custom,
              root: snapshot.root,
            })
            const result = await client.followup(text)
            if (!result.queued) await navigator.clipboard?.writeText(text).catch(() => undefined)
            showToast(result.queued ? t('reviewQueued') : result.error || t('commentsCopied'))
            setReviewOpen(false)
          }}
        />
      ) : null}
      {toast ? <div className="cxr-toast" role="status">{toast}</div> : null}
    </div>
  )

  async function sendComments() {
    const text = inlineCommentPrompt(comments.filter((comment) => comment.text.trim()))
    const result = await client.followup(text)
    if (!result.queued) await navigator.clipboard?.writeText(text).catch(() => undefined)
    showToast(result.queued ? t('commentsQueued') : t('commentsCopied'))
  }
}

function DiffBody({ lang, loading, error, snapshot, filter, onRetry, onInit, onBranch, busy, children }: {
  lang: Lang
  loading: boolean
  error: string | null
  snapshot: ReviewSnapshot
  filter: ReviewFilter
  busy: boolean
  onRetry(): void
  onInit(): void
  onBranch(): void
  children: React.ReactNode
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(lang, key, values)
  if (snapshot.kind === 'not-repo') {
    return (
      <Empty lang={lang} title={t('gitRequiredTitle')} description={error || t('gitRequiredDescription')}>
        <button type="button" className="cxr-btn" disabled={busy} onClick={onInit}>{busy ? t('creatingRepo') : t('createRepo')}</button>
      </Empty>
    )
  }
  if (loading && snapshot.kind !== 'repo') return <div className="cxr-empty"><span className="cxr-spinner" /><p>{t('loading')}</p></div>
  if (error && snapshot.kind !== 'repo') return <Empty lang={lang} title={t('loadFailed')} description={error}><button type="button" className="cxr-btn" onClick={onRetry}>{t('retry')}</button></Empty>
  if (snapshot.kind === 'missing-cwd') return <Empty lang={lang} title={t('missingCwd')} description={t('missingCwdDescription')} />
  if (error && snapshot.files.length === 0) {
    return <Empty lang={lang} title={t('loadFailed')} description={error}><button type="button" className="cxr-btn" onClick={onRetry}>{t('retry')}</button></Empty>
  }
  if (snapshot.tooLarge && snapshot.files.length === 0) return <Empty lang={lang} title={t('diffTooLargeTitle')} description={t('diffTooLargeDescription')} />
  if (snapshot.files.length === 0) {
    if (filter === 'staged' || filter === 'unstaged') {
      return (
        <Empty lang={lang} title={filter === 'staged' ? t('noStagedTitle') : t('noUnstagedTitle')} description={filter === 'staged' ? t('noStagedDescription') : t('noUnstagedDescription')} illustration={false}>
          {snapshot.branch ? <button type="button" className="cxr-btn" onClick={onBranch}>{t('viewBranchDiff')}</button> : null}
        </Empty>
      )
    }
    if (filter === 'last-turn') return <Empty lang={lang} title={t('noDiff')} description={t('lastTurnMissing')} />
    return (
      <Empty lang={lang} title={t('noDiff')} description={t('noDiffDescription')}>
        {filter !== 'branch' ? <button type="button" className="cxr-btn" onClick={onBranch}>{t('viewBranchDiff')}</button> : null}
      </Empty>
    )
  }
  return <>{children}</>
}

function Empty({ title, description, children, illustration = true }: { lang: Lang; title: string; description: string; children?: React.ReactNode; illustration?: boolean }) {
  return (
    <div className="cxr-empty">
      {illustration ? <Illustration /> : null}
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  )
}

function Illustration() {
  return (
    <svg className="cxr-illustration" width="66" height="72" viewBox="0 0 66 72" aria-hidden="true">
      <path fill="currentColor" d="M18 4h22l12 12v48a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm22 2v10h10" />
      <path fill="currentColor" d="M24 34h10v3H24zm0 8h18v3H24zm0 8h14v3H24z" />
    </svg>
  )
}

function LineStats({ additions, deletions }: { additions: number; deletions: number }) {
  if (!additions && !deletions) return null
  return (
    <span className="cxr-stats">
      {additions ? <span className="cxr-add">+{additions}</span> : null}
      {deletions ? <span className="cxr-del">−{deletions}</span> : null}
    </span>
  )
}

function FilterMenu({ lang, filter, staged, unstaged, commits, onSelect }: {
  lang: Lang
  filter: ReviewFilter
  staged: number
  unstaged: number
  commits: ReviewSnapshot['commits']
  onSelect(filter: ReviewFilter, sha?: string): void
}) {
  const t = (key: MessageKey) => translate(lang, key)
  const [open, setOpen] = useState(false)
  const labels: Record<ReviewFilter, string> = { unstaged: t('unstaged'), staged: t('staged'), commit: t('commit'), branch: t('branch'), 'last-turn': t('lastTurn') }
  const counts: Partial<Record<ReviewFilter, number>> = { unstaged, staged }
  return (
    <MenuButton open={open} setOpen={setOpen} label={<><span>{labels[filter]}</span>{counts[filter] ? <span className="cxr-badge">{counts[filter]}</span> : null}</>}>
      {FILTERS.map((item) => item === 'commit' ? (
        <div key={item}>
          <div className="cxr-menu-item"><span>{t('commit')}</span>{filter === 'commit' ? <span>✓</span> : null}</div>
          {commits.length === 0 ? <div className="cxr-menu-item"><span>{t('commitsEmpty')}</span></div> : commits.slice(0, 12).map((commit) => (
            <button key={commit.sha} type="button" className="cxr-menu-item" onClick={() => { onSelect('commit', commit.sha); setOpen(false) }}>
              <span>{commit.subject}</span>
              <span>{relative(commit.time, lang)}</span>
            </button>
          ))}
        </div>
      ) : (
        <button key={item} type="button" className="cxr-menu-item" onClick={() => { onSelect(item); setOpen(false) }}>
          <span>{labels[item]}{counts[item] ? `  ${counts[item]}` : ''}</span>
          {filter === item ? <span>✓</span> : null}
        </button>
      ))}
    </MenuButton>
  )
}

function OptionsMenu({ lang, settings, disabled, onToggle, onRefresh, onCopy, onReview }: {
  lang: Lang
  settings: Settings
  disabled: boolean
  onToggle(key: 'wrap' | 'hideWhitespace' | 'wordDiffs' | 'full' | 'rich'): void
  onRefresh(): void
  onCopy(): void
  onReview(): void
}) {
  const t = (key: MessageKey) => translate(lang, key)
  const [open, setOpen] = useState(false)
  const items: Array<{ key: 'wrap' | 'hideWhitespace' | 'wordDiffs' | 'full' | 'rich'; on: string; off: string; value: boolean }> = [
    { key: 'wrap', on: t('wrapOn'), off: t('wrapOff'), value: settings.wrap },
    { key: 'hideWhitespace', on: t('showWhitespace'), off: t('hideWhitespace'), value: settings.hideWhitespace },
    { key: 'wordDiffs', on: t('wordDiffOn'), off: t('wordDiffOff'), value: settings.wordDiffs },
    { key: 'full', on: t('fullOn'), off: t('fullOff'), value: settings.full },
    { key: 'rich', on: t('richOn'), off: t('richOff'), value: settings.rich },
  ]
  return (
    <MenuButton open={open} setOpen={setOpen} icon label={t('moreOptions')}>
      <button type="button" className="cxr-menu-item" onClick={() => { onRefresh(); setOpen(false) }}><span>{t('refresh')}</span></button>
      <button type="button" className="cxr-menu-item" disabled={disabled} onClick={() => { onCopy(); setOpen(false) }}><span>{t('copyApply')}</span></button>
      <div className="cxr-sep" />
      {items.map((item) => (
        <button key={item.key} type="button" className="cxr-menu-item" onClick={() => onToggle(item.key)}>
          <span>{item.value ? item.on : item.off}</span>
          {item.value ? <span>✓</span> : null}
        </button>
      ))}
      <div className="cxr-sep" />
      <button type="button" className="cxr-menu-item" onClick={() => { setOpen(false); onReview() }}><span>{t('reviewTitle')}</span></button>
    </MenuButton>
  )
}

function MenuButton({ open, setOpen, label, icon = false, children }: { open: boolean; setOpen(next: boolean): void; label: React.ReactNode; icon?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, setOpen])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className={icon ? 'cxr-icon-btn' : 'cxr-btn'} aria-expanded={open} aria-label={typeof label === 'string' ? label : undefined} onClick={() => setOpen(!open)}>
        {icon ? '⋯' : label}
        {icon ? null : <span aria-hidden="true">▾</span>}
      </button>
      {open ? <div className="cxr-menu" style={{ top: 32, left: icon ? 'auto' : 0, right: icon ? 0 : 'auto' }}>{children}</div> : null}
    </div>
  )
}

function IconButton({ label, onClick, children, active = false }: { label: string; onClick(): void; children: React.ReactNode; active?: boolean }) {
  return <button type="button" className="cxr-icon-btn" aria-label={label} title={label} data-active={active ? '1' : '0'} onClick={onClick}>{children}</button>
}

function JumpMenu({ lang, files, onPick }: { lang: Lang; files: ReviewFile[]; onClose(): void; onPick(path: string): void }) {
  const [query, setQuery] = useState('')
  const matches = files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="cxr-menu" style={{ top: 32, right: 0 }}>
      <input className="cxr-input" autoFocus placeholder={translate(lang, 'jump')} value={query} onChange={(event) => setQuery(event.target.value)} />
      {matches.length === 0 ? <div className="cxr-menu-item"><span>{translate(lang, 'noMatch')}</span></div> : matches.map((file) => (
        <button key={file.path} type="button" className="cxr-menu-item" onClick={() => onPick(file.path)}><span>{file.path}</span></button>
      ))}
    </div>
  )
}

function FileTree({ lang, files, width, query, onQuery, comments, onPick }: {
  lang: Lang
  files: ReviewFile[]
  width: number
  query: string
  comments: LocalComment[]
  onQuery(value: string): void
  onPick(path: string): void
}) {
  const matches = files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase()))
  const tree = buildTree(matches)
  return (
    <aside className="cxr-tree" style={{ ['--cxr-tree-width' as string]: `${width}px` }}>
      <div className="cxr-tree-search">
        <input className="cxr-input" placeholder={translate(lang, 'searchFiles')} value={query} onChange={(event) => onQuery(event.target.value)} aria-label={translate(lang, 'changedFiles')} />
      </div>
      <div className="cxr-tree-scroll">
        {matches.length === 0 ? <div className="cxr-dir">{translate(lang, 'noMatch')}</div> : <TreeNodes nodes={tree} depth={0} comments={comments} onPick={onPick} />}
      </div>
    </aside>
  )
}

interface TreeNode { name: string; path: string; file?: ReviewFile; children: TreeNode[] }

function buildTree(files: ReviewFile[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', children: [] }
  for (const file of files) {
    const parts = file.path.split('/')
    let cursor = root
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      let child = cursor.children.find((entry) => entry.name === part)
      if (!child) {
        child = { name: part, path, children: [] }
        cursor.children.push(child)
      }
      if (index === parts.length - 1) child.file = file
      cursor = child
    })
  }
  return root.children
}

function TreeNodes({ nodes, depth, comments, onPick }: { nodes: TreeNode[]; depth: number; comments: LocalComment[]; onPick(path: string): void }) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <button type="button" className="cxr-tree-row" style={{ paddingLeft: 8 + depth * 12 }} data-active={node.file ? '0' : undefined} onClick={() => node.file && onPick(node.path)}>
            <span className={node.file ? 'cxr-tree-name' : 'cxr-dir cxr-tree-name'}>{node.file ? node.name : `${node.name}/`}</span>
            {node.file ? <span className="cxr-stats"><span className="cxr-add">{node.file.additions ? `+${node.file.additions}` : ''}</span><span className="cxr-del">{node.file.deletions ? `−${node.file.deletions}` : ''}</span></span> : null}
            {node.file && comments.some((comment) => comment.path === node.file?.path && comment.text.trim()) ? <span className="cxr-badge">{comments.filter((comment) => comment.path === node.file?.path && comment.text.trim()).length}</span> : null}
          </button>
          {node.children.length > 0 ? <TreeNodes nodes={node.children} depth={depth + 1} comments={comments} onPick={onPick} /> : null}
        </div>
      ))}
    </>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose(): void; children: React.ReactNode }) {
  return (
    <div className="cxr-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="cxr-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  )
}

function CommitDialog({ lang, branch, busy, canCommit, ahead, gh, onClose, onCommit, onPush, onPr }: {
  lang: Lang
  branch: string
  busy: boolean
  canCommit: boolean
  ahead: number
  gh: boolean
  onClose(): void
  onCommit(message: string, includeUnstaged: boolean, push: boolean): void
  onPush(): void
  onPr(title: string, body: string): void
}) {
  const t = (key: MessageKey, values?: Record<string, string | number>) => translate(lang, key, values)
  const [message, setMessage] = useState('')
  const [includeUnstaged, setIncludeUnstaged] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  return (
    <Modal title={t('commitOrPush')} subtitle={`${t('commitTo')} ${branch}`} onClose={onClose}>
      <label>
        {t('commitMessage')}
        <textarea className="cxr-textarea" rows={4} placeholder={t('commitPlaceholder')} value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <label className="cxr-check">
        <input type="checkbox" checked={includeUnstaged} onChange={(event) => setIncludeUnstaged(event.target.checked)} />
        {t('includeUnstaged')}
      </label>
      <div className="cxr-dialog-actions">
        <button type="button" className="cxr-btn" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="cxr-btn" disabled={busy || ahead === 0} onClick={onPush}>{busy ? t('pushing') : t('push')}</button>
        <button type="button" className="cxr-btn" disabled={busy || (!canCommit && !includeUnstaged)} onClick={() => onCommit(message, includeUnstaged, true)}>{t('commitAndPush')}</button>
        <button type="button" className="cxr-btn cxr-primary" disabled={busy || (!canCommit && !includeUnstaged)} onClick={() => onCommit(message, includeUnstaged, false)}>{busy ? t('committing') : t('commit')}</button>
      </div>
      <div className="cxr-sep" />
      <label>
        {t('prTitle')}
        <input className="cxr-input" value={prTitle} onChange={(event) => setPrTitle(event.target.value)} />
      </label>
      <div className="cxr-dialog-actions">
        <button type="button" className="cxr-btn" disabled={!gh || !prTitle.trim()} title={gh ? t('createPr') : t('installGh')} onClick={() => onPr(prTitle, message)}>{t('createPr')}</button>
      </div>
    </Modal>
  )
}

function ReviewDialog({ lang, baseBranch, commits, onClose, onStart }: {
  lang: Lang
  busy: boolean
  baseBranch: string | null
  commits: ReviewSnapshot['commits']
  onClose(): void
  onStart(choice: { filter: ReviewFilter; baseBranch?: string | null; commitSha?: string | null; custom?: string | null }): void
}) {
  const t = (key: MessageKey) => translate(lang, key)
  const [mode, setMode] = useState<'uncommitted' | 'branch' | 'commit' | 'custom'>('uncommitted')
  const [sha, setSha] = useState(commits[0]?.sha ?? '')
  const [custom, setCustom] = useState('')
  return (
    <Modal title={t('reviewTitle')} subtitle={t('reviewDescription')} onClose={onClose}>
      <div className="cxr-choices">
        {(['uncommitted', 'branch', 'commit', 'custom'] as const).map((item) => (
          <label key={item} className="cxr-check">
            <input type="radio" name="review-mode" checked={mode === item} onChange={() => setMode(item)} />
            {item === 'uncommitted' ? t('reviewUncommitted') : item === 'branch' ? t('reviewBranch') : item === 'commit' ? t('reviewCommit') : t('reviewCustom')}
          </label>
        ))}
      </div>
      {mode === 'branch' ? <p>{baseBranch || t('selectBase')}</p> : null}
      {mode === 'commit' ? (
        <select className="cxr-input" value={sha} onChange={(event) => setSha(event.target.value)}>
          {commits.map((commit) => <option key={commit.sha} value={commit.sha}>{commit.subject}</option>)}
        </select>
      ) : null}
      {mode === 'custom' ? <textarea className="cxr-textarea" rows={4} placeholder={t('reviewCustomPlaceholder')} value={custom} onChange={(event) => setCustom(event.target.value)} /> : null}
      <div className="cxr-dialog-actions">
        <button type="button" className="cxr-btn" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="cxr-btn cxr-primary" onClick={() => onStart({
          filter: mode === 'uncommitted' ? 'unstaged' : mode === 'custom' ? 'unstaged' : mode,
          baseBranch,
          commitSha: mode === 'commit' ? sha : null,
          custom: mode === 'custom' ? custom : null,
        })}>{t('startReview')}</button>
      </div>
    </Modal>
  )
}

function dragTree(event: React.PointerEvent, startWidth: number, onWidth: (width: number) => void) {
  const startX = event.clientX
  const move = (next: PointerEvent) => onWidth(Math.min(420, Math.max(180, startWidth - (next.clientX - startX))))
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE + 'settings')
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<Settings> }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function readComments(root: string | null): LocalComment[] {
  if (!root) return []
  try {
    const raw = localStorage.getItem(STORAGE + 'comments:' + root)
    return raw ? JSON.parse(raw) as LocalComment[] : []
  } catch {
    return []
  }
}

function relative(epoch: number, lang: Lang): string {
  const delta = Math.max(0, Date.now() / 1000 - epoch)
  const unit = delta < 3600 ? Math.max(1, Math.floor(delta / 60)) : delta < 86400 ? Math.floor(delta / 3600) : Math.floor(delta / 86400)
  const label = delta < 3600 ? (lang === 'en' ? 'm' : '分钟') : delta < 86400 ? (lang === 'en' ? 'h' : '小时') : (lang === 'en' ? 'd' : '天')
  return lang === 'en' ? `${unit}${label} ${translate(lang, 'ago')}` : `${unit} ${label}${translate(lang, 'ago')}`
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"')
}
