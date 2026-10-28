import type { ReviewFilter } from './types.ts'

export interface InlineCommentDraft {
  path: string
  line: number
  side: 'old' | 'new'
  text: string
}

const FILTER_LABEL: Record<ReviewFilter, string> = {
  unstaged: '未提交的更改（已暂存、未暂存和未跟踪文件）',
  staged: '已暂存的更改',
  commit: '指定提交',
  branch: '当前分支相对基础分支的差异',
  'last-turn': '上一轮助手修改',
}

/**
 * Prompt Codex-style `/review` hands to the current agent.
 * The reviewer is read-only: it must not edit the worktree.
 */
export function reviewPrompt(options: {
  filter: ReviewFilter
  baseBranch?: string | null
  commitSha?: string | null
  custom?: string | null
  root?: string | null
}): string {
  const scope = describeScope(options)
  const custom = options.custom?.trim()
  const lines = [
    '请审查下面这个范围里的代码改动。不要修改工作区，不要暂存、还原或提交。',
    '',
    `审查范围：${scope}`,
  ]
  if (options.root) lines.push(`仓库：${options.root}`)
  if (custom) {
    lines.push('', '额外要求：', custom)
  }
  lines.push(
    '',
    '先给出简短结论，再按严重程度列出发现。没有问题时直接说明，并指出还缺哪些测试。',
    '每条发现用下面的块，方便审查侧栏把它贴回对应行：',
    '',
    ':::review',
    'path: 相对路径',
    'line: 行号',
    'side: new',
    'priority: P1',
    'title: 一句话标题',
    '这里写触发条件、期望行为和实际行为。',
    ':::',
    '',
    'priority 使用 P0、P1、P2 或 P3。side 为 new（改动后）或 old（改动前）。',
  )
  return lines.join('\n')
}

function describeScope(options: {
  filter: ReviewFilter
  baseBranch?: string | null
  commitSha?: string | null
}): string {
  if (options.filter === 'branch') {
    const base = options.baseBranch?.trim() || '默认基础分支'
    return `当前分支相对 ${base} 的差异（${FILTER_LABEL.branch}）`
  }
  if (options.filter === 'commit') {
    const sha = options.commitSha?.trim() || '所选提交'
    return `提交 ${sha} 引入的差异`
  }
  return FILTER_LABEL[options.filter]
}

/** Follow-up the review pane sends after the user leaves line comments. */
export function inlineCommentPrompt(comments: InlineCommentDraft[]): string {
  const body = comments.map((comment, index) => {
    const side = comment.side === 'old' ? '改动前' : '改动后'
    return `${index + 1}. \`${comment.path}:${comment.line}\`（${side}）\n${comment.text.trim()}`
  })
  return [
    '处理这些行内评论，并保持改动范围最小。改完后跑相关测试，并让我在审查里看到新的差异。',
    '',
    ...body,
  ].join('\n')
}

export interface ParsedFinding {
  path: string
  line: number
  side: 'old' | 'new'
  priority: string
  title: string
  body: string
}

const FENCE = /:::review\n([\s\S]*?)\n:::/g

/** Pull structured findings out of an assistant message. */
export function parseFindingFences(text: string): ParsedFinding[] {
  const findings: ParsedFinding[] = []
  for (const match of text.matchAll(FENCE)) {
    const block = match[1] ?? ''
    const parsed = parseFindingBlock(block)
    if (parsed) findings.push(parsed)
  }
  return findings
}

function parseFindingBlock(block: string): ParsedFinding | null {
  const lines = block.split('\n')
  const fields = new Map<string, string>()
  const body: string[] = []
  let inBody = false
  for (const line of lines) {
    if (!inBody) {
      const field = /^([a-z]+):\s*(.*)$/.exec(line)
      if (field && field[1] && ['path', 'line', 'side', 'priority', 'title'].includes(field[1])) {
        fields.set(field[1], field[2] ?? '')
        if (field[1] === 'title') inBody = true
        continue
      }
    }
    body.push(line)
  }
  const path = fields.get('path')?.trim()
  const line = Number(fields.get('line'))
  if (!path || !Number.isInteger(line) || line <= 0) return null
  const side = fields.get('side')?.trim() === 'old' ? 'old' : 'new'
  return {
    path,
    line,
    side,
    priority: fields.get('priority')?.trim() || 'P2',
    title: fields.get('title')?.trim() || '审查发现',
    body: body.join('\n').trim(),
  }
}
