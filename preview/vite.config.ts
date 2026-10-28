import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { demoRepository } from './demo.ts'
import { applyReviewAction, commitReview, createPullRequest, loadReview, pushReview } from '../src/review/git.ts'
import type { ActionRequest, CommitInput, LoadQuery, ReviewFilter } from '../src/review/types.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: here,
  server: {
    host: '0.0.0.0',
    port: 43127,
    strictPort: true,
    fs: { allow: [path.resolve(here, '..')] },
  },
  plugins: [reviewApi()],
})

function reviewApi(): Plugin {
  return {
    name: 'codex-review-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://preview.local')
        if (!url.pathname.startsWith('/api/codex-review')) {
          next()
          return
        }
        void route(url, req, res).catch((error: unknown) => {
          send(res, 500, { error: error instanceof Error ? error.message : String(error) })
        })
      })
    },
  }
}

async function route(url: URL, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const demo = demoRepository()
  const tail = url.pathname.replace('/api/codex-review', '') || '/'
  if (req.method === 'GET' && tail === '/raw') {
    const rootPath = url.searchParams.get('root') || demo.cwd
    const rel = url.searchParams.get('path') || ''
    const abs = path.resolve(rootPath, rel)
    if (path.relative(rootPath, abs).startsWith('..')) throw new Error('路径无效')
    res.statusCode = 200
    res.setHeader('content-type', contentType(abs))
    res.end(readFileSync(abs))
    return
  }
  const body = req.method === 'GET' ? {} : await readJson(req)
  const cwd = typeof body.cwd === 'string' && body.cwd ? body.cwd : demo.cwd
  const query: LoadQuery = {
    filter: isFilter(body.filter) ? body.filter : 'unstaged',
    baseBranch: typeof body.baseBranch === 'string' ? body.baseBranch : 'main',
    commitSha: typeof body.commitSha === 'string' ? body.commitSha : null,
    hideWhitespace: Boolean(body.hideWhitespace),
    full: Boolean(body.full),
    root: cwd,
    lastTurnText: demo.lastTurnText,
  }
  if (tail === '/snapshot' || tail === '/' || tail === '') {
    send(res, 200, await loadReview(cwd, query))
    return
  }
  if (tail === '/action') {
    send(res, 200, await applyReviewAction(cwd, {
      action: body.action === 'unstage' || body.action === 'revert' ? body.action : 'stage',
      scope: body.scope === 'section' || body.scope === 'hunk' ? body.scope : 'file',
      filter: isFilter(body.filter) ? body.filter : 'unstaged',
      path: typeof body.path === 'string' ? body.path : undefined,
      hunkHeader: typeof body.hunkHeader === 'string' ? body.hunkHeader : undefined,
      root: cwd,
    } satisfies ActionRequest))
    return
  }
  if (tail === '/commit') {
    const input: CommitInput = {
      message: typeof body.message === 'string' ? body.message : '',
      includeUnstaged: Boolean(body.includeUnstaged),
      push: Boolean(body.push),
      root: cwd,
    }
    send(res, 200, await commitReview(cwd, input))
    return
  }
  if (tail === '/push') {
    send(res, 200, await pushReview(cwd, cwd))
    return
  }
  if (tail === '/pr') {
    send(res, 200, await createPullRequest(cwd, { title: String(body.title ?? ''), body: String(body.body ?? ''), root: cwd }))
    return
  }
  if (tail === '/followup') {
    send(res, 200, { queued: false, text: String(body.text ?? ''), error: '预览没有 DSH 会话，审查请求留在这条返回里' })
    return
  }
  send(res, 404, { error: 'not found' })
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ ok: status < 400, data }))
}

function isFilter(value: unknown): value is ReviewFilter {
  return value === 'unstaged' || value === 'staged' || value === 'commit' || value === 'branch' || value === 'last-turn'
}

function contentType(file: string): string {
  const types: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
  return types[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text) as Record<string, unknown>)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}
