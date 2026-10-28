import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export interface DemoRepository {
  cwd: string
  lastTurnText: string
}

let cached: DemoRepository | null = null

/** A small repository with staged, unstaged, untracked, and last-turn changes. */
export function demoRepository(): DemoRepository {
  if (cached) return cached
  const cwd = path.join(tmpdir(), 'dsh-codex-review-demo')
  rmSync(cwd, { recursive: true, force: true })
  mkdirSync(path.join(cwd, 'src'), { recursive: true })
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.email=review@example.com', '-c', 'user.name=Review', ...args], { cwd, stdio: 'ignore' })
  git('init', '-b', 'main')
  writeFileSync(path.join(cwd, 'src', 'format.ts'), 'export function formatCount(count: number) {\n  return `${count} files`\n}\n')
  writeFileSync(path.join(cwd, 'src', 'first.ts'), 'export function first<T>(items: T[]) {\n  return items[0]\n}\n')
  writeFileSync(path.join(cwd, 'README.md'), '# Review demo\n\nA repository for the Codex-style review pane.\n')
  git('add', '.')
  git('commit', '-m', 'initial review fixture')
  writeFileSync(path.join(cwd, 'src', 'format.ts'), 'export function formatCount(count: number) {\n  if (count === 1) return "1 file"\n  return `${count} files`\n}\n')
  git('add', 'src/format.ts')
  git('commit', '-m', 'singular file label')
  git('checkout', '-b', 'feature')
  writeFileSync(path.join(cwd, 'src', 'first.ts'), 'export function first<T>(items: T[]) {\n  if (items.length === 0) return undefined\n  return items[0]\n}\n')
  git('add', 'src/first.ts')
  const lastTurnText = cachedDiff(cwd)
  git('commit', '-m', 'guard empty lists')
  writeFileSync(path.join(cwd, 'src', 'format.ts'), 'export function formatCount(count: number) {\n  if (count === 1) return "1 file"\n  if (count === 0) return "no files"\n  return `${count} files`\n}\n')
  git('add', 'src/format.ts')
  writeFileSync(path.join(cwd, 'src', 'first.ts'), 'export function first<T>(items: T[]) {\n  if (items.length === 0) return null\n  return items[0]\n}\n')
  writeFileSync(path.join(cwd, 'notes.md'), 'Leave a comment on the empty-list branch.\n')
  cached = { cwd, lastTurnText }
  return cached
}

function cachedDiff(cwd: string): string {
  try {
    return execFileSync('git', ['diff', '--cached', '--unified=3'], { cwd, encoding: 'utf8' })
  } catch (error) {
    const failed = error as { status?: number; stdout?: string | Buffer }
    if (failed.status === 1) return String(failed.stdout ?? '')
    throw error
  }
}
