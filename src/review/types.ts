/** Review scopes shown in the Codex review header. */
export type ReviewFilter = 'unstaged' | 'staged' | 'commit' | 'branch' | 'last-turn'

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged' | 'untracked'

export type LineKind = 'add' | 'del' | 'context'

export interface DiffLine {
  kind: LineKind
  text: string
  oldNo: number | null
  newNo: number | null
  noNewline?: boolean
}

export interface DiffHunk {
  /** Full `@@` line, used to address the hunk when staging or reverting. */
  header: string
  oldStart: number
  oldCount: number
  newStart: number
  newCount: number
  section: string
  lines: DiffLine[]
}

export interface ReviewFile {
  path: string
  oldPath: string | null
  status: FileStatus
  additions: number
  deletions: number
  binary: boolean
  tooLarge: boolean
  hunks: DiffHunk[]
}

export interface CommitInfo {
  sha: string
  shortSha: string
  subject: string
  time: number
}

export interface RepoChoice {
  root: string
  label: string
}

export interface ReviewSnapshot {
  kind: 'repo' | 'not-repo' | 'missing-cwd' | 'error'
  error?: string
  root: string | null
  branch: string | null
  detached: boolean
  baseBranch: string | null
  branches: string[]
  ahead: number
  behind: number
  hasRemote: boolean
  ghAvailable: boolean
  stagedFileCount: number
  unstagedFileCount: number
  additions: number
  deletions: number
  files: ReviewFile[]
  commits: CommitInfo[]
  selectedCommit: CommitInfo | null
  tooLarge: boolean
  /** Unified diff for the current scope, omitted when it is too large to copy. */
  patch: string | null
  repos: RepoChoice[]
  findings: ReviewFinding[]
}

export interface ReviewFinding {
  id: string
  path: string
  line: number
  side: 'old' | 'new'
  priority: string
  title: string
  body: string
}

export interface LoadQuery {
  filter: ReviewFilter
  baseBranch?: string | null
  commitSha?: string | null
  hideWhitespace?: boolean
  full?: boolean
  /** Selected repository when the workspace contains more than one. */
  root?: string | null
  /** Unified diff captured for the latest assistant turn. */
  lastTurnText?: string | null
}

export type PatchActionName = 'stage' | 'unstage' | 'revert'

export interface ActionRequest {
  action: PatchActionName
  scope: 'section' | 'file' | 'hunk'
  filter: ReviewFilter
  path?: string
  hunkHeader?: string
  baseBranch?: string | null
  commitSha?: string | null
  root?: string | null
}

export interface CommitInput {
  message: string
  includeUnstaged: boolean
  push: boolean
  root?: string | null
}

export interface ActionResult {
  ok: boolean
  error?: string
  snapshot: ReviewSnapshot
}

export const EMPTY_SNAPSHOT: ReviewSnapshot = {
  kind: 'missing-cwd',
  root: null,
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
