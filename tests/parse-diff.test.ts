import assert from 'node:assert/strict'
import test from 'node:test'
import { hunkPatch, parseUnifiedDiff } from '../src/review/parse-diff.ts'
import { inlineCommentPrompt, parseFindingFences, reviewPrompt } from '../src/review/prompts.ts'
import { pairChangedLines, wordDiff } from '../src/review/word-diff.ts'

const SAMPLE = `diff --git a/src/app.ts b/src/app.ts
index 1111111..2222222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@ function format
 export function format(count: number) {
-  return String(count)
+  if (count === 0) return 'none'
+  return String(count)
 }
diff --git a/notes.md b/notes.md
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/notes.md
@@ -0,0 +1 @@
+hello
`

test('parse unified diff files and hunks', () => {
  const files = parseUnifiedDiff(SAMPLE)
  assert.equal(files.length, 2)
  assert.equal(files[0]?.path, 'src/app.ts')
  assert.equal(files[0]?.status, 'modified')
  assert.equal(files[0]?.additions, 2)
  assert.equal(files[0]?.deletions, 1)
  assert.equal(files[0]?.hunks[0]?.lines[1]?.kind, 'del')
  assert.equal(files[1]?.status, 'added')
  assert.equal(files[1]?.additions, 1)
  const patch = hunkPatch(files[0]!, files[0]!.hunks[0]!)
  assert.match(patch, /diff --git a\/src\/app\.ts/)
  assert.match(patch, /\+  if \(count === 0\) return 'none'/)
})

test('review prompt names the scope and finding fence', () => {
  const text = reviewPrompt({ filter: 'branch', baseBranch: 'main' })
  assert.match(text, /main/)
  assert.match(text, /:::review/)
  assert.match(text, /不要修改工作区/)
})

test('inline comments become a follow-up', () => {
  const text = inlineCommentPrompt([{ path: 'src/app.ts', line: 4, side: 'new', text: '空数组呢？' }])
  assert.match(text, /src\/app\.ts:4/)
  assert.match(text, /空数组呢？/)
  assert.match(text, /保持改动范围最小/)
})

test('finding fences parse priority and line', () => {
  const text = `结论\n:::review\npath: src/app.ts\nline: 12\nside: old\npriority: P1\ntitle: 空数组\n会返回 undefined。\n:::`
  const findings = parseFindingFences(text)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.priority, 'P1')
  assert.equal(findings[0]?.side, 'old')
  assert.equal(findings[0]?.line, 12)
  assert.match(findings[0]?.body ?? '', /undefined/)
})

test('word diff marks the changed token', () => {
  const diff = wordDiff('return count', 'return count + 1')
  assert.equal(diff.after.some((token) => token.changed && token.text.includes('1')), true)
  assert.equal(diff.before.some((token) => token.text === 'return' && !token.changed), true)
  const pairs = pairChangedLines([
    { kind: 'del', text: 'a' },
    { kind: 'add', text: 'b' },
    { kind: 'context', text: 'c' },
  ])
  assert.equal(pairs.get(0), 1)
})
