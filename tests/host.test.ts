import assert from 'node:assert/strict'
import test from 'node:test'
import { isSameOrigin } from '../src/host/http.ts'
import { parseReviewCommand } from '../src/host/plugin.ts'
import { scanSessionText } from '../src/host/session-scan.ts'

test('same-origin fence refuses cross-site requests', () => {
  assert.equal(isSameOrigin({ 'sec-fetch-site': 'cross-site', origin: 'https://evil.test', host: 'dsh.local' }), false)
  assert.equal(isSameOrigin({ origin: 'http://dsh.local', host: 'dsh.local' }), true)
  assert.equal(isSameOrigin({ origin: 'http://evil.test', host: 'dsh.local' }), false)
})

test('review command parses the Codex scopes', () => {
  assert.equal(parseReviewCommand(''), null)
  assert.equal(parseReviewCommand('uncommitted')?.filter, 'unstaged')
  assert.equal(parseReviewCommand('branch develop')?.baseBranch, 'develop')
  assert.equal(parseReviewCommand('commit abcdef1')?.commitSha, 'abcdef1')
  assert.match(parseReviewCommand('关注空数组')?.custom ?? '', /空数组/)
})

test('session text yields a last-turn patch and a finding', () => {
  const text = [
    JSON.stringify({ path: 'src/first.ts', oldText: 'return items[0]\n', newText: 'return items[0] ?? null\n' }),
    ':::review',
    'path: src/first.ts',
    'line: 2',
    'side: new',
    'priority: P1',
    'title: 空数组',
    'items[0] 在空数组上是 undefined。',
    ':::',
  ].join('\n')
  const scanned = scanSessionText(text)
  assert.match(scanned.patch, /src\/first\.ts/)
  assert.equal(scanned.findings[0]?.priority, 'P1')
  assert.equal(scanned.findings[0]?.line, 2)
})
