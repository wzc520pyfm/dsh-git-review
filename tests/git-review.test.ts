import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { applyReviewAction, initRepository, loadReview, safeRelative } from '../src/review/git.ts'

function git(cwd: string, args: string[]): void {
  execFileSync('git', ['-c', 'user.email=review@example.com', '-c', 'user.name=Review', ...args], { cwd, stdio: 'ignore' })
}

function seedRepo(): string {
  const cwd = mkdtempSync(path.join(tmpdir(), 'codex-review-'))
  git(cwd, ['init', '-b', 'main'])
  writeFileSync(path.join(cwd, 'src-app.ts'), 'export function format(count: number) {\n  return String(count)\n}\n')
  mkdirSync(path.join(cwd, 'src'))
  writeFileSync(path.join(cwd, 'src', 'util.ts'), 'export function first(items: string[]) {\n  return items[0]\n}\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-m', 'initial'])
  writeFileSync(path.join(cwd, 'src', 'util.ts'), 'export function first(items: string[]) {\n  if (items.length === 0) return null\n  return items[0]\n}\n')
  git(cwd, ['add', 'src/util.ts'])
  writeFileSync(path.join(cwd, 'src-app.ts'), 'export function format(count: number) {\n  if (count === 0) return "none"\n  return String(count)\n}\n')
  writeFileSync(path.join(cwd, 'notes.md'), 'todo\n')
  return cwd
}

test('unstaged snapshot includes edits and untracked files', async () => {
  const cwd = seedRepo()
  const snapshot = await loadReview(cwd, { filter: 'unstaged' })
  assert.equal(snapshot.kind, 'repo')
  assert.equal(snapshot.branch, 'main')
  const paths = snapshot.files.map((file) => file.path).sort()
  assert.deepEqual(paths, ['notes.md', 'src-app.ts'])
  assert.equal(snapshot.unstagedFileCount >= 2, true)
  assert.equal(snapshot.stagedFileCount, 1)
  const staged = await loadReview(cwd, { filter: 'staged' })
  assert.deepEqual(staged.files.map((file) => file.path), ['src/util.ts'])
  assert.equal(staged.files[0]?.additions, 1)
})

test('stage hunk moves one change into the index', async () => {
  const cwd = seedRepo()
  const before = await loadReview(cwd, { filter: 'unstaged' })
  const file = before.files.find((entry) => entry.path === 'src-app.ts')
  assert.ok(file)
  const header = file.hunks[0]?.header
  assert.ok(header)
  const staged = await applyReviewAction(cwd, { action: 'stage', scope: 'hunk', filter: 'unstaged', path: 'src-app.ts', hunkHeader: header })
  assert.equal(staged.ok, true, staged.error)
  const unstaged = await loadReview(cwd, { filter: 'unstaged' })
  assert.equal(unstaged.files.some((entry) => entry.path === 'src-app.ts'), false)
  const index = await loadReview(cwd, { filter: 'staged' })
  assert.equal(index.files.some((entry) => entry.path === 'src-app.ts'), true)
})

test('revert file discards an unstaged edit and keeps the staged one', async () => {
  const cwd = seedRepo()
  const reverted = await applyReviewAction(cwd, { action: 'revert', scope: 'file', filter: 'unstaged', path: 'src-app.ts' })
  assert.equal(reverted.ok, true, reverted.error)
  assert.equal(readFileSync(path.join(cwd, 'src-app.ts'), 'utf8').includes('none'), false)
  const staged = await loadReview(cwd, { filter: 'staged' })
  assert.equal(staged.files.some((entry) => entry.path === 'src/util.ts'), true)
})

test('branch scope sees a commit that main does not have', async () => {
  const cwd = seedRepo()
  git(cwd, ['checkout', '-b', 'feature'])
  writeFileSync(path.join(cwd, 'src', 'extra.ts'), 'export const extra = 1\n')
  git(cwd, ['add', 'src/extra.ts'])
  git(cwd, ['commit', '-m', 'add extra'])
  const snapshot = await loadReview(cwd, { filter: 'branch', baseBranch: 'main' })
  assert.equal(snapshot.files.some((file) => file.path === 'src/extra.ts'), true)
  assert.equal(snapshot.baseBranch, 'main')
})

test('a plain directory is not a repository until init', async () => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'codex-review-empty-'))
  const before = await loadReview(cwd, { filter: 'unstaged' })
  assert.equal(before.kind, 'not-repo')
  await initRepository(cwd)
  const after = await loadReview(cwd, { filter: 'unstaged' })
  assert.equal(after.kind, 'repo')
})

test('paths cannot escape the repository', () => {
  assert.throws(() => safeRelative('/repo', '../secret'), /路径无效/)
  assert.throws(() => safeRelative('/repo', '/etc/passwd'), /路径无效/)
})

test('commit scope shows the selected commit', async () => {
  const cwd = seedRepo()
  git(cwd, ['add', 'src-app.ts'])
  git(cwd, ['commit', '-m', 'format empty'])
  const snapshot = await loadReview(cwd, { filter: 'commit' })
  assert.equal(snapshot.selectedCommit?.subject, 'format empty')
  assert.equal(snapshot.files.some((file) => file.path === 'src-app.ts'), true)
})
