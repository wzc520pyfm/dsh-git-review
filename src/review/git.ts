import { execFile } from 'node:child_process'
import type { ExecFileException } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { countEdits, diffLines } from './line-diff.ts'
import { hunkPatch, parseUnifiedDiff, type ParsedDiffFile } from './parse-diff.ts'
import type {
  ActionRequest,
  ActionResult,
  CommitInfo,
  CommitInput,
  FileStatus,
  LoadQuery,
  ReviewFile,
  ReviewFinding,
  ReviewSnapshot,
} from './types.ts'

const MAX_PATCH = 1_000_000
const MAX_FILE_PATCH = 350_000
const MAX_UNTRACKED_BYTES = 400_000

const GIT_PREFIX = ['-c', 'core.quotepath=false', '-c', 'core.pager=cat', '-c', 'advice.detachedHead=false', '-c', 'safe.directory=*']
const MAX_UNTRACKED_LISTED = 200
const MAX_UNTRACKED_EXPANDED = 80
const UNTRACKED_EXCLUDES = [
  ':(exclude,glob)**/node_modules/**',
  ':(exclude,glob)**/dist/**',
  ':(exclude,glob)**/build/**',
  ':(exclude,glob)**/.next/**',
  ':(exclude,glob)**/.nuxt/**',
  ':(exclude,glob)**/.output/**',
  ':(exclude,glob)**/coverage/**',
  ':(exclude,glob)**/vendor/**',
]

interface GitResult {
  code: number
  stdout: string
  stderr: string
}

export async function loadReview(cwd: string, query: LoadQuery, findings: ReviewFinding[] = []): Promise<ReviewSnapshot> {
  const repos = await listRepos(cwd)
  if (repos.length === 0) return notRepo(cwd)
  const selected = repos.find((repo) => repo.root === query.root) ?? repos[0]
  if (!selected) return notRepo(cwd)
  try {
    return await loadRepo(selected.root, query, repos, findings)
  } catch (error) {
    return {
      ...notRepo(cwd),
      kind: 'error',
      error: error instanceof Error ? error.message : String(error),
      repos,
    }
  }
}

export async function applyReviewAction(cwd: string, request: ActionRequest, findings: ReviewFinding[] = []): Promise<ActionResult> {
  const snapshotQuery: LoadQuery = {
    filter: request.filter,
    baseBranch: request.baseBranch,
    commitSha: request.commitSha,
    root: request.root,
  }
  if (request.filter !== 'unstaged' && request.filter !== 'staged') {
    const snapshot = await loadReview(cwd, snapshotQuery, findings)
    return { ok: false, error: '这个范围是只读的', snapshot }
  }
  const repos = await listRepos(cwd)
  const root = (repos.find((repo) => repo.root === request.root) ?? repos[0])?.root
  if (!root) {
    const snapshot = await loadReview(cwd, snapshotQuery, findings)
    return { ok: false, error: '还原需要使用 Git 代码仓库', snapshot }
  }
  try {
    if (request.scope === 'section') await applySection(root, request)
    else if (request.scope === 'file') await applyFile(root, request)
    else await applyHunk(root, request)
    const snapshot = await loadReview(cwd, snapshotQuery, findings)
    return { ok: true, snapshot }
  } catch (error) {
    const snapshot = await loadReview(cwd, snapshotQuery, findings)
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot }
  }
}

export async function initRepository(cwd: string): Promise<void> {
  assertDirectory(cwd)
  if (await gitRoot(cwd)) throw new Error('这里已经是 Git 代码仓库')
  const result = await git(cwd, ['init'])
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'git init 失败')
}

export async function commitReview(cwd: string, input: CommitInput): Promise<ActionResult> {
  const snapshot = await loadReview(cwd, { filter: 'staged', root: input.root })
  if (snapshot.kind !== 'repo' || !snapshot.root) return { ok: false, error: '未找到 Git 代码仓库', snapshot }
  const message = input.message.trim() || defaultCommitMessage(snapshot)
  try {
    if (input.includeUnstaged) {
      const added = await git(snapshot.root, ['add', '-A', '--', '.'])
      if (added.code !== 0) throw new Error(added.stderr.trim() || '无法暂存未暂存的更改')
    }
    const committed = await git(snapshot.root, ['commit', '-m', message])
    if (committed.code !== 0) throw new Error(cleanGitError(committed.stderr || committed.stdout) || '无法提交更改')
    if (input.push) await pushRepository(snapshot.root)
    const next = await loadReview(cwd, { filter: 'unstaged', root: snapshot.root })
    return { ok: true, snapshot: next }
  } catch (error) {
    const next = await loadReview(cwd, { filter: 'staged', root: snapshot.root })
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot: next }
  }
}

export async function pushReview(cwd: string, root?: string | null): Promise<ActionResult> {
  const snapshot = await loadReview(cwd, { filter: 'unstaged', root })
  if (!snapshot.root) return { ok: false, error: '未找到 Git 代码仓库', snapshot }
  try {
    await pushRepository(snapshot.root)
    const next = await loadReview(cwd, { filter: 'unstaged', root: snapshot.root })
    return { ok: true, snapshot: next }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot }
  }
}

export async function createPullRequest(cwd: string, input: { title: string; body: string; root?: string | null }): Promise<{ ok: boolean; error?: string; url?: string }> {
  const snapshot = await loadReview(cwd, { filter: 'branch', root: input.root })
  if (!snapshot.root) return { ok: false, error: '未找到 Git 代码仓库' }
  if (!snapshot.ghAvailable) return { ok: false, error: '安装 GitHub CLI (gh) 以创建 PR' }
  const title = input.title.trim()
  if (!title) return { ok: false, error: '拉取请求需要一个标题' }
  const result = await gitLike('gh', snapshot.root, ['pr', 'create', '--title', title, '--body', input.body.trim() || title])
  if (result.code !== 0) return { ok: false, error: cleanGitError(result.stderr || result.stdout) || '无法创建拉取请求' }
  const url = result.stdout.trim().split('\n').filter(Boolean).pop()
  return { ok: true, url }
}

export function gitApplyCommand(patch: string | null): string | null {
  if (!patch) return null
  return ` (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'\n${patch}\nEOF\n)`
}

export async function resolveWorkspace(input: { sessionId?: string | null; cwd?: string | null; contextCwd?: string | null }): Promise<string | null> {
  const fromContext = existingDir(input.contextCwd)
  if (fromContext) return fromContext
  const fromSession = input.sessionId ? discoverSessionCwd(input.sessionId) : null
  if (fromSession) return fromSession
  return existingDir(input.cwd)
}

export function discoverSessionCwd(sessionId: string): string | null {
  if (!/^[\w.-]{6,200}$/.test(sessionId)) return null
  const homes = [process.env.DSH_HOME, path.join(homedir(), '.dsh'), path.join(homedir(), '.deepseek')].filter((entry): entry is string => Boolean(entry))
  for (const home of homes) {
    const found = walkForSession(home, sessionId, 0)
    if (found) return found
  }
  return null
}

function walkForSession(dir: string, sessionId: string, depth: number): string | null {
  if (depth > 6 || !existsSync(dir)) return null
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return null
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue
    const full = path.join(dir, entry)
    let info
    try {
      info = lstatSync(full)
    } catch {
      continue
    }
    if (info.isDirectory()) {
      if (entry === sessionId) {
        const cwd = cwdFromSessionDir(full)
        if (cwd) return cwd
      }
      const nested = walkForSession(full, sessionId, depth + 1)
      if (nested) return nested
    } else if (info.isFile() && info.size < 1_000_000 && (entry.endsWith('.json') || entry.endsWith('.jsonl'))) {
      if (!entry.includes(sessionId) && !dir.endsWith(sessionId)) continue
      const cwd = cwdFromText(readSafe(full))
      if (cwd) return cwd
    }
  }
  return null
}

function cwdFromSessionDir(dir: string): string | null {
  for (const name of ['session.json', 'meta.json', 'manifest.json', 'state.json']) {
    const file = path.join(dir, name)
    if (!existsSync(file)) continue
    const cwd = cwdFromText(readSafe(file))
    if (cwd) return cwd
  }
  return null
}

function cwdFromText(text: string): string | null {
  const match = /"(?:cwd|working_directory|workingDirectory|workspace)"\s*:\s*"([^"]+)"/.exec(text)
  if (!match?.[1]) return null
  const decoded = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  return existingDir(decoded)
}

function readSafe(file: string): string {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

async function loadRepo(root: string, query: LoadQuery, repos: ReviewSnapshot['repos'], findings: ReviewFinding[]): Promise<ReviewSnapshot> {
  const meta = await repoMeta(root)
  const counts = await statusCounts(root)
  const commits = await recentCommits(root)
  const selected = query.commitSha
    ? commits.find((commit) => commit.sha.startsWith(query.commitSha ?? '')) ?? (await commitInfo(root, query.commitSha))
    : commits[0] ?? null
  const baseBranch = query.baseBranch || meta.baseBranch
  let files: ReviewFile[] = []
  let patch = ''
  let tooLarge = false
  if (query.filter === 'last-turn') {
    patch = query.lastTurnText ?? ''
    files = patch ? filesFromDiff(patch) : []
  } else if (query.filter === 'commit') {
    if (selected) {
      const shown = await diffText(root, ['show', '--format=', '--unified=3', selected.sha])
      patch = shown
      files = filesFromDiff(shown)
    }
  } else if (query.filter === 'branch') {
    const base = await mergeBase(root, baseBranch)
    if (base) {
      const args = ['diff', '--unified=3', base]
      if (query.hideWhitespace) args.push('-w')
      if (query.full) args.push('-U100000')
      patch = await diffText(root, args)
      files = filesFromDiff(patch)
      const untracked = await untrackedFiles(root, counts.untracked)
      files = mergeFiles(files, untracked)
    }
  } else if (query.filter === 'staged') {
    const args = ['diff', '--cached', '--unified=3']
    if (query.hideWhitespace) args.push('-w')
    if (query.full) args.push('-U100000')
    patch = await diffText(root, args)
    files = filesFromDiff(patch)
  } else {
    const args = ['diff', '--unified=3']
    if (query.hideWhitespace) args.push('-w')
    if (query.full) args.push('-U100000')
    patch = await diffText(root, args)
    files = filesFromDiff(patch)
    files = mergeFiles(files, await untrackedFiles(root, counts.untracked))
  }
  files = annotateStatus(files, counts.byPath, query.filter)
  if (patch.length > MAX_PATCH) {
    tooLarge = true
    patch = patch.slice(0, MAX_PATCH)
  }
  const metrics = files.reduce(
    (sum, file) => ({ additions: sum.additions + file.additions, deletions: sum.deletions + file.deletions }),
    { additions: 0, deletions: 0 },
  )
  const gh = await commandExists('gh')
  return {
    kind: 'repo',
    root,
    branch: meta.branch,
    detached: meta.detached,
    baseBranch,
    branches: meta.branches,
    ahead: meta.ahead,
    behind: meta.behind,
    hasRemote: meta.hasRemote,
    ghAvailable: gh,
    stagedFileCount: counts.staged,
    unstagedFileCount: counts.unstaged,
    additions: metrics.additions,
    deletions: metrics.deletions,
    files,
    commits,
    selectedCommit: query.filter === 'commit' ? selected : null,
    tooLarge,
    patch: tooLarge ? null : patch || null,
    repos,
    findings,
  }
}

async function applySection(root: string, request: ActionRequest): Promise<void> {
  if (request.action === 'stage' && request.filter === 'unstaged') {
    await must(root, ['add', '-A', '--', '.'])
    return
  }
  if (request.action === 'unstage' && request.filter === 'staged') {
    await must(root, ['restore', '--staged', '--', '.'])
    return
  }
  if (request.action === 'revert' && request.filter === 'unstaged') {
    await must(root, ['restore', '--worktree', '--', '.'])
    const untracked = await untrackedPaths(root)
    for (const rel of untracked) removeInside(root, rel)
    return
  }
  throw new Error('这个操作不适用于当前范围')
}

async function applyFile(root: string, request: ActionRequest): Promise<void> {
  const rel = safeRelative(root, request.path)
  if (request.action === 'stage') {
    await must(root, ['add', '--', rel])
    return
  }
  if (request.action === 'unstage') {
    await must(root, ['restore', '--staged', '--', rel])
    return
  }
  if (request.action === 'revert') {
    const status = await porcelain(root)
    const entry = status.get(rel)
    if (!entry || entry.untracked) {
      removeInside(root, rel)
      return
    }
    if (request.filter === 'staged' && entry.index === 'A') {
      await must(root, ['rm', '-f', '--', rel])
      return
    }
    if (request.filter === 'staged') {
      await must(root, ['restore', '--source=HEAD', '--staged', '--worktree', '--', rel])
      return
    }
    await must(root, ['restore', '--worktree', '--', rel])
    return
  }
  throw new Error('未知操作')
}

async function applyHunk(root: string, request: ActionRequest): Promise<void> {
  const rel = safeRelative(root, request.path)
  if (!request.hunkHeader) throw new Error('缺少代码块')
  const args = request.filter === 'staged' ? ['diff', '--cached', '--unified=3', '--', rel] : ['diff', '--unified=3', '--', rel]
  let parsed = parseUnifiedDiff(await diffText(root, args))
  if (parsed.length === 0 && request.filter === 'unstaged') {
    const untracked = await untrackedFiles(root, [rel])
    parsed = untracked.map((file) => ({ ...file, rawHeader: rawHeaderFor(file) }))
  }
  const file = parsed.find((entry) => entry.path === rel) ?? parsed[0]
  const hunk = file?.hunks.find((entry) => entry.header === request.hunkHeader)
  if (!file || !hunk) throw new Error('差异已变化，请刷新')
  const patch = hunkPatch(file, hunk)
  if (request.action === 'stage') {
    await applyPatch(root, ['apply', '--cached', '--whitespace=nowarn'], patch)
    return
  }
  if (request.action === 'unstage') {
    await applyPatch(root, ['apply', '--cached', '--reverse', '--whitespace=nowarn'], patch)
    return
  }
  await applyPatch(root, ['apply', '--reverse', '--whitespace=nowarn'], patch)
}

function rawHeaderFor(file: ReviewFile): string {
  return [
    `diff --git a/${file.path} b/${file.path}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${file.path}`,
  ].join('\n')
}

async function applyPatch(root: string, args: string[], patch: string): Promise<void> {
  const result = await git(root, args, patch)
  if (result.code !== 0) throw new Error(cleanGitError(result.stderr || result.stdout) || '无法应用差异')
}

async function pushRepository(root: string): Promise<void> {
  const result = await git(root, ['push'])
  if (result.code !== 0) {
    const text = result.stderr || result.stdout
    if (/no upstream|has no upstream/i.test(text)) {
      const branch = (await git(root, ['branch', '--show-current'])).stdout.trim()
      if (!branch) throw new Error('分支信息不可用')
      const set = await git(root, ['push', '-u', 'origin', branch])
      if (set.code !== 0) throw new Error(cleanGitError(set.stderr || set.stdout) || '无法推送变更')
      return
    }
    throw new Error(cleanGitError(text) || '无法推送变更')
  }
}

async function listRepos(cwd: string): Promise<Array<{ root: string; label: string }>> {
  const direct = await gitRoot(cwd)
  if (direct) return [{ root: direct, label: path.basename(direct) }]
  if (!existingDir(cwd)) return []
  const found: Array<{ root: string; label: string }> = []
  let entries: string[] = []
  try {
    entries = readdirSync(cwd)
  } catch {
    return []
  }
  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') continue
    const full = path.join(cwd, entry)
    try {
      if (!statSync(full).isDirectory()) continue
    } catch {
      continue
    }
    const root = await gitRoot(full)
    if (root) found.push({ root, label: entry })
  }
  return found
}

async function repoMeta(root: string): Promise<{
  branch: string | null
  detached: boolean
  baseBranch: string | null
  branches: string[]
  ahead: number
  behind: number
  hasRemote: boolean
}> {
  const branchResult = await git(root, ['branch', '--show-current'])
  const branch = branchResult.stdout.trim() || null
  const detached = !branch
  const branchList = await git(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes'])
  const names = branchList.stdout.split('\n').map((line) => line.trim()).filter(Boolean)
  const local = names.filter((name) => !name.includes('/'))
  const baseBranch = await detectBaseBranch(root, branch, names)
  const remote = await git(root, ['remote'])
  const hasRemote = remote.stdout.trim().length > 0
  let ahead = 0
  let behind = 0
  if (branch && hasRemote) {
    const counts = await git(root, ['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`])
    const parts = counts.stdout.trim().split(/\s+/)
    if (counts.code === 0 && parts.length >= 2) {
      behind = Number(parts[0] ?? 0)
      ahead = Number(parts[1] ?? 0)
    } else {
      const localCounts = await git(root, ['rev-list', '--count', branch])
      ahead = Number(localCounts.stdout.trim() || 0)
    }
  }
  return {
    branch,
    detached,
    baseBranch,
    branches: local.filter((name) => name !== branch),
    ahead,
    behind,
    hasRemote,
  }
}

async function detectBaseBranch(root: string, current: string | null, names: string[]): Promise<string | null> {
  const originHead = await git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  if (originHead.code === 0) {
    const short = originHead.stdout.trim().replace(/^origin\//, '')
    if (short && short !== current) return short
  }
  for (const candidate of ['main', 'master', 'develop', 'trunk']) {
    if (candidate !== current && names.includes(candidate)) return candidate
  }
  return names.find((name) => name !== current && !name.includes('/')) ?? null
}

async function statusCounts(root: string): Promise<{ staged: number; unstaged: number; untracked: string[]; byPath: Map<string, Porcelain> }> {
  const byPath = await porcelain(root)
  let staged = 0
  let unstaged = 0
  const untracked: string[] = []
  for (const [rel, entry] of byPath) {
    if (entry.untracked) {
      unstaged += 1
      untracked.push(rel)
      continue
    }
    if (entry.index !== ' ' && entry.index !== '?') staged += 1
    if (entry.work !== ' ' && entry.work !== '?') unstaged += 1
  }
  return { staged, unstaged, untracked, byPath }
}

interface Porcelain {
  index: string
  work: string
  untracked: boolean
  unmerged: boolean
}

async function porcelain(root: string): Promise<Map<string, Porcelain>> {
  const listed = ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.']
  let result = await git(root, [...listed, ...UNTRACKED_EXCLUDES])
  if (result.code !== 0 && /pathspec|magic|exclude/i.test(result.stderr)) result = await git(root, listed)
  if (result.code !== 0) throw new Error(cleanGitError(result.stderr || result.stdout) || '无法读取 Git 状态')
  const map = new Map<string, Porcelain>()
  const parts = result.stdout.split('\0').filter((part) => part !== '')
  for (let index = 0; index < parts.length; index += 1) {
    const record = parts[index] ?? ''
    if (record.length < 3) continue
    const xy = record.slice(0, 2)
    const rel = record.slice(3)
    const code = xy[0] === 'R' || xy[0] === 'C' || xy[1] === 'R' || xy[1] === 'C'
    if (code) index += 1
    map.set(rel, {
      index: xy[0] ?? ' ',
      work: xy[1] ?? ' ',
      untracked: xy === '??',
      unmerged: xy.includes('U') || xy === 'AA' || xy === 'DD',
    })
  }
  return map
}

async function untrackedPaths(root: string): Promise<string[]> {
  const result = await git(root, ['ls-files', '--others', '--exclude-standard', '-z'])
  return result.stdout.split('\0').filter(Boolean)
}

async function untrackedFiles(root: string, paths: string[]): Promise<ParsedDiffFile[]> {
  const files: ParsedDiffFile[] = []
  let expanded = 0
  for (const rel of paths) {
    if (files.length >= MAX_UNTRACKED_LISTED || isVendorPath(rel)) continue
    const abs = safeJoin(root, rel)
    let info
    try {
      info = statSync(abs)
    } catch {
      continue
    }
    if (!info.isFile()) continue
    if (expanded >= MAX_UNTRACKED_EXPANDED || info.size > MAX_UNTRACKED_BYTES) {
      files.push(fileSkeleton(rel, 'untracked', info.size > MAX_UNTRACKED_BYTES, true))
      continue
    }
    expanded += 1
    let bytes: Buffer
    try {
      bytes = readFileSync(abs)
    } catch {
      files.push(fileSkeleton(rel, 'untracked', false, true))
      continue
    }
    if (isBinary(bytes)) {
      files.push(fileSkeleton(rel, 'untracked', true, false))
      continue
    }
    const text = bytes.toString('utf8')
    const hunks = diffLines('', text)
    const counts = countEdits(hunks)
    const file: ParsedDiffFile = {
      ...fileSkeleton(rel, 'untracked', false, false),
      additions: counts.additions,
      deletions: counts.deletions,
      hunks,
      rawHeader: rawHeaderFor({ path: rel, oldPath: null, status: 'untracked', additions: 0, deletions: 0, binary: false, tooLarge: false, hunks }),
    }
    files.push(file)
  }
  return files
}

function fileSkeleton(rel: string, status: FileStatus, binary: boolean, tooLarge: boolean): ParsedDiffFile {
  return {
    path: rel,
    oldPath: null,
    status,
    additions: 0,
    deletions: 0,
    binary,
    tooLarge,
    hunks: [],
    rawHeader: '',
  }
}

function filesFromDiff(text: string): ParsedDiffFile[] {
  if (text.length > MAX_PATCH) {
    const parsed = parseUnifiedDiff(text.slice(0, MAX_PATCH))
    return parsed.map((file) => ({ ...file, tooLarge: true, hunks: [], additions: file.additions, deletions: file.deletions }))
  }
  return parseUnifiedDiff(text).map((file) => {
    const serialized = file.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0)
    if (serialized > 8000 || text.length > MAX_FILE_PATCH) return { ...file, tooLarge: true, hunks: [] }
    return file
  })
}

function mergeFiles(base: ReviewFile[], extra: ReviewFile[]): ReviewFile[] {
  const seen = new Set(base.map((file) => file.path))
  return [...base, ...extra.filter((file) => !seen.has(file.path))]
}

function annotateStatus(files: ReviewFile[], byPath: Map<string, Porcelain>, filter: LoadQuery['filter']): ReviewFile[] {
  return files.map((file) => {
    const entry = byPath.get(file.path)
    if (!entry) return file
    if (entry.unmerged) return { ...file, status: 'unmerged' }
    if (entry.untracked) return { ...file, status: 'untracked' }
    if (filter === 'staged' && entry.index === 'A') return { ...file, status: 'added' }
    if (filter === 'staged' && entry.index === 'D') return { ...file, status: 'deleted' }
    if (filter === 'unstaged' && entry.work === 'D') return { ...file, status: 'deleted' }
    return file
  })
}

async function recentCommits(root: string): Promise<CommitInfo[]> {
  const result = await git(root, ['log', '-n', '30', '--pretty=format:%H%x09%h%x09%ct%x09%s'])
  if (result.code !== 0 || !result.stdout.trim()) return []
  return result.stdout.split('\n').map(parseCommitLine).filter((commit): commit is CommitInfo => commit != null)
}

async function commitInfo(root: string, sha: string): Promise<CommitInfo | null> {
  if (!/^[0-9a-f]{7,64}$/i.test(sha)) return null
  const result = await git(root, ['log', '-n', '1', '--pretty=format:%H%x09%h%x09%ct%x09%s', sha])
  if (result.code !== 0) return null
  return parseCommitLine(result.stdout.trim())
}

function parseCommitLine(line: string): CommitInfo | null {
  const [sha, shortSha, time, ...subject] = line.split('\t')
  if (!sha || !shortSha || !time) return null
  return { sha, shortSha, subject: subject.join('\t'), time: Number(time) }
}

async function mergeBase(root: string, base: string | null): Promise<string | null> {
  if (!base) return null
  const result = await git(root, ['merge-base', 'HEAD', base])
  if (result.code !== 0) return null
  return result.stdout.trim() || null
}

async function diffText(root: string, args: string[]): Promise<string> {
  const result = await git(root, args)
  if (result.code > 1) throw new Error(cleanGitError(result.stderr) || '无法加载差异')
  return result.stdout
}

async function gitRoot(cwd: string): Promise<string | null> {
  if (!existingDir(cwd)) return null
  const result = await git(cwd, ['rev-parse', '--show-toplevel'])
  if (result.code !== 0) return null
  return result.stdout.trim() || null
}

async function must(root: string, args: string[]): Promise<void> {
  const result = await git(root, args)
  if (result.code !== 0) throw new Error(cleanGitError(result.stderr || result.stdout) || 'Git 操作失败')
}

async function git(cwd: string, args: string[], input?: string): Promise<GitResult> {
  return gitLike('git', cwd, [...GIT_PREFIX, ...args], input)
}

function gitLike(command: string, cwd: string, args: string[], input?: string): Promise<GitResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: 'echo',
    GCM_INTERACTIVE: 'never',
  }
  delete env.GIT_DIR
  delete env.GIT_WORK_TREE
  delete env.GIT_INDEX_FILE
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd,
        maxBuffer: 12 * 1024 * 1024,
        timeout: args.includes('push') ? 60_000 : 30_000,
        env,
      },
      (error: ExecFileException | null, stdout, stderr) => {
        const numeric = typeof error?.code === 'number' ? error.code : error ? 1 : 0
        resolve({ code: numeric, stdout: String(stdout ?? ''), stderr: String(stderr ?? error?.message ?? '') })
      },
    )
    if (input != null) {
      child.stdin?.write(input)
      child.stdin?.end()
    }
  })
}

async function commandExists(command: string): Promise<boolean> {
  const result = await gitLike('which', process.cwd(), [command])
  return result.code === 0 && result.stdout.trim().length > 0
}

function defaultCommitMessage(snapshot: ReviewSnapshot): string {
  const files = snapshot.files
  if (files.length === 0) return '更新审查中的更改'
  if (files.length === 1) return `更新 ${files[0]?.path ?? '文件'}`
  return `更新 ${files.length} 个文件`
}

function cleanGitError(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').filter(Boolean).slice(0, 4).join('\n')
}

function existingDir(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const resolved = path.resolve(value)
    if (statSync(resolved).isDirectory()) return resolved
  } catch {
    return null
  }
  return null
}

function assertDirectory(cwd: string): void {
  if (!existingDir(cwd)) throw new Error('工作目录不存在')
}

export function safeRelative(root: string, rel: string | undefined): string {
  if (!rel || rel.includes('\0') || path.isAbsolute(rel)) throw new Error('路径无效')
  const normalized = path.normalize(rel).replace(/\\/g, '/')
  if (normalized.startsWith('../') || normalized === '..') throw new Error('路径无效')
  const abs = path.resolve(root, normalized)
  const relative = path.relative(root, abs)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('路径无效')
  return relative.replace(/\\/g, '/')
}

function safeJoin(root: string, rel: string): string {
  return path.resolve(root, safeRelative(root, rel))
}

function removeInside(root: string, rel: string): void {
  const abs = safeJoin(root, rel)
  if (!existsSync(abs)) return
  rmSync(abs, { force: true })
}

function isVendorPath(rel: string): boolean {
  const parts = rel.replace(/\\/g, '/').split('/')
  return parts.some((part) => part === 'node_modules' || part === 'dist' || part === 'build' || part === '.next' || part === '.nuxt' || part === '.output' || part === 'coverage' || part === 'vendor')
}

function isBinary(bytes: Buffer): boolean {
  const sample = bytes.subarray(0, 8000)
  return sample.includes(0)
}

export function blankSnapshot(kind: ReviewSnapshot['kind'], root: string | null, error?: string): ReviewSnapshot {
  return {
    kind,
    error,
    root,
    branch: null,
    detached: false,
    baseBranch: null,
    branches: [],
    ahead: 0,
    behind: 0,
    hasRemote: false,
    ghAvailable: false,
    stagedFileCount: 0,
    unstagedFileCount: 0,
    additions: 0,
    deletions: 0,
    files: [],
    commits: [],
    selectedCommit: null,
    tooLarge: false,
    patch: null,
    repos: [],
    findings: [],
  }
}

function notRepo(cwd: string): ReviewSnapshot {
  return blankSnapshot('not-repo', existingDir(cwd))
}
