// src/host/plugin.ts
import { readFileSync as readFileSync3, statSync as statSync3 } from "node:fs";
import path3 from "node:path";

// src/review/git.ts
import { execFile } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// src/review/line-diff.ts
function diffLines(before, after) {
  const left = splitLines(before);
  const right = splitLines(after);
  const edits = editScript(left, right);
  return hunksFromEdits(edits, left, right);
}
function splitLines(value) {
  if (value === "") return [];
  const parts = value.split("\n");
  if (value.endsWith("\n")) parts.pop();
  return parts;
}
function editScript(left, right) {
  if (left.length * right.length > 15e5) {
    return [
      ...left.map((text) => ({ kind: "del", text })),
      ...right.map((text) => ({ kind: "add", text }))
    ];
  }
  const rows = left.length + 1;
  const cols = right.length + 1;
  const scores = new Uint32Array(rows * cols);
  const at = (row2, col2) => row2 * cols + col2;
  for (let row2 = 1; row2 < rows; row2 += 1) {
    for (let col2 = 1; col2 < cols; col2 += 1) {
      if (left[row2 - 1] === right[col2 - 1]) scores[at(row2, col2)] = (scores[at(row2 - 1, col2 - 1)] ?? 0) + 1;
      else scores[at(row2, col2)] = Math.max(scores[at(row2 - 1, col2)] ?? 0, scores[at(row2, col2 - 1)] ?? 0);
    }
  }
  const reversed = [];
  let row = left.length;
  let col = right.length;
  while (row > 0 && col > 0) {
    if (left[row - 1] === right[col - 1]) {
      reversed.push({ kind: "equal", text: left[row - 1] ?? "" });
      row -= 1;
      col -= 1;
    } else if ((scores[at(row - 1, col)] ?? 0) >= (scores[at(row, col - 1)] ?? 0)) {
      reversed.push({ kind: "del", text: left[row - 1] ?? "" });
      row -= 1;
    } else {
      reversed.push({ kind: "add", text: right[col - 1] ?? "" });
      col -= 1;
    }
  }
  while (row > 0) {
    reversed.push({ kind: "del", text: left[row - 1] ?? "" });
    row -= 1;
  }
  while (col > 0) {
    reversed.push({ kind: "add", text: right[col - 1] ?? "" });
    col -= 1;
  }
  return reversed.reverse();
}
function hunksFromEdits(edits, left, right) {
  const changed = [];
  edits.forEach((edit, index) => {
    if (edit.kind !== "equal") changed.push(index);
  });
  if (changed.length === 0) return [];
  const groups = [];
  let current = [];
  let last = -1;
  for (const index of changed) {
    if (last >= 0 && index - last > 7) {
      groups.push(current);
      current = [];
    }
    current.push(index);
    last = index;
  }
  if (current.length) groups.push(current);
  let leftPos = 0;
  let rightPos = 0;
  const positions = edits.map((edit) => {
    const pos = { left: leftPos, right: rightPos };
    if (edit.kind !== "add") leftPos += 1;
    if (edit.kind !== "del") rightPos += 1;
    return pos;
  });
  return groups.map((group) => {
    const first = Math.max(0, (group[0] ?? 0) - 3);
    const lastIndex = Math.min(edits.length - 1, (group[group.length - 1] ?? 0) + 3);
    const lines = [];
    const start = positions[first] ?? { left: 0, right: 0 };
    let oldNo = start.left + 1;
    let newNo = start.right + 1;
    let oldCount = 0;
    let newCount = 0;
    for (let index = first; index <= lastIndex; index += 1) {
      const edit = edits[index];
      if (!edit) continue;
      if (edit.kind === "equal") {
        lines.push({ kind: "context", text: edit.text, oldNo, newNo });
        oldNo += 1;
        newNo += 1;
        oldCount += 1;
        newCount += 1;
      } else if (edit.kind === "del") {
        lines.push({ kind: "del", text: edit.text, oldNo, newNo: null });
        oldNo += 1;
        oldCount += 1;
      } else {
        lines.push({ kind: "add", text: edit.text, oldNo: null, newNo });
        newNo += 1;
        newCount += 1;
      }
    }
    const oldStart = oldCount === 0 ? 0 : start.left + 1;
    const newStart = newCount === 0 ? 0 : start.right + 1;
    const header2 = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
    return { header: header2, oldStart, oldCount, newStart, newCount, section: "", lines };
  });
}
function countEdits(hunks) {
  let additions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === "add") additions += 1;
      else if (line.kind === "del") deletions += 1;
    }
  }
  return { additions, deletions };
}

// src/review/parse-diff.ts
var DIFF_GIT = /^diff --git a\/(.+?) b\/(.+)$/;
var HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
function parseUnifiedDiff(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return [];
  const chunks = normalized.split(/\n(?=diff --git )/).filter((chunk) => chunk.startsWith("diff --git "));
  return chunks.map(parseFileChunk).filter((file) => file != null);
}
function parseFileChunk(chunk) {
  const lines = chunk.endsWith("\n") ? chunk.slice(0, -1).split("\n") : chunk.split("\n");
  const headerMatch = lines[0]?.match(DIFF_GIT);
  if (!headerMatch) return null;
  const oldPathRaw = unquote(headerMatch[1] ?? "");
  const newPathRaw = unquote(headerMatch[2] ?? "");
  let status = "modified";
  let binary = false;
  let oldPath = null;
  let path4 = stripPrefix(newPathRaw);
  const headerLines = [];
  let index = 1;
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("@@")) break;
    headerLines.push(line);
    if (line.startsWith("new file mode")) status = "added";
    else if (line.startsWith("deleted file mode")) status = "deleted";
    else if (line.startsWith("rename from ")) {
      status = "renamed";
      oldPath = stripPrefix(unquote(line.slice("rename from ".length)));
    } else if (line.startsWith("copy from ")) {
      status = "copied";
      oldPath = stripPrefix(unquote(line.slice("copy from ".length)));
    } else if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      binary = true;
    } else if (line.startsWith("--- ")) {
      const marker = line.slice(4);
      if (marker === "/dev/null") status = status === "modified" ? "added" : status;
      else oldPath = oldPath ?? stripPrefix(unquote(marker.replace(/^a\//, "")));
    } else if (line.startsWith("+++ ")) {
      const marker = line.slice(4);
      if (marker === "/dev/null") {
        status = "deleted";
        path4 = oldPath ?? stripPrefix(oldPathRaw);
      } else {
        path4 = stripPrefix(unquote(marker.replace(/^b\//, "")));
      }
    }
  }
  if (status !== "renamed" && status !== "copied") oldPath = null;
  if (oldPathRaw !== newPathRaw && status === "modified") {
    status = "renamed";
    oldPath = stripPrefix(oldPathRaw);
    path4 = stripPrefix(newPathRaw);
  }
  const hunks = [];
  while (index < lines.length) {
    const header2 = lines[index] ?? "";
    if (!header2.startsWith("@@")) break;
    const parsed = parseHunk(lines, index);
    hunks.push(parsed.hunk);
    index = parsed.next;
  }
  let additions = 0;
  let deletions = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === "add") additions += 1;
      else if (line.kind === "del") deletions += 1;
    }
  }
  return {
    path: path4,
    oldPath,
    status,
    additions,
    deletions,
    binary,
    tooLarge: false,
    hunks,
    rawHeader: ["diff --git a/" + oldPathRaw + " b/" + newPathRaw, ...headerLines].join("\n")
  };
}
function parseHunk(lines, start) {
  const header2 = lines[start] ?? "";
  const match = header2.match(HUNK_HEADER);
  const oldStart = Number(match?.[1] ?? 0);
  const oldCount = Number(match?.[2] ?? 1);
  const newStart = Number(match?.[3] ?? 0);
  const newCount = Number(match?.[4] ?? 1);
  const section = (match?.[5] ?? "").trim();
  const diffLines2 = [];
  let oldNo = oldStart;
  let newNo = newStart;
  let index = start + 1;
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("@@") || line.startsWith("diff --git ")) break;
    if (line.startsWith("\\")) {
      const previous = diffLines2[diffLines2.length - 1];
      if (previous) previous.noNewline = true;
      continue;
    }
    const marker = line[0];
    const text = line.slice(1);
    if (marker === "+") {
      diffLines2.push({ kind: "add", text, oldNo: null, newNo });
      newNo += 1;
    } else if (marker === "-") {
      diffLines2.push({ kind: "del", text, oldNo, newNo: null });
      oldNo += 1;
    } else if (marker === " ") {
      diffLines2.push({ kind: "context", text, oldNo, newNo });
      oldNo += 1;
      newNo += 1;
    } else if (line === "") {
      diffLines2.push({ kind: "context", text: "", oldNo, newNo });
      oldNo += 1;
      newNo += 1;
    }
  }
  return {
    hunk: { header: header2, oldStart, oldCount, newStart, newCount, section, lines: diffLines2 },
    next: index
  };
}
function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}
function stripPrefix(value) {
  if (value.startsWith("a/") || value.startsWith("b/")) return value.slice(2);
  return value;
}
function hunkPatch(file, hunk) {
  const body = [hunk.header];
  for (const line of hunk.lines) {
    const marker = line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ";
    body.push(marker + line.text);
    if (line.noNewline) body.push("\\ No newline at end of file");
  }
  return file.rawHeader + "\n" + body.join("\n") + "\n";
}

// src/review/git.ts
var MAX_PATCH = 1e6;
var MAX_FILE_PATCH = 35e4;
var MAX_UNTRACKED_BYTES = 4e5;
var GIT_PREFIX = ["-c", "core.quotepath=false", "-c", "core.pager=cat", "-c", "advice.detachedHead=false"];
async function loadReview(cwd, query, findings = []) {
  const repos = await listRepos(cwd);
  if (repos.length === 0) return notRepo(cwd);
  const selected = repos.find((repo) => repo.root === query.root) ?? repos[0];
  if (!selected) return notRepo(cwd);
  try {
    return await loadRepo(selected.root, query, repos, findings);
  } catch (error) {
    return {
      ...notRepo(cwd),
      kind: "error",
      error: error instanceof Error ? error.message : String(error),
      repos
    };
  }
}
async function applyReviewAction(cwd, request, findings = []) {
  const snapshotQuery = {
    filter: request.filter,
    baseBranch: request.baseBranch,
    commitSha: request.commitSha,
    root: request.root
  };
  if (request.filter !== "unstaged" && request.filter !== "staged") {
    const snapshot = await loadReview(cwd, snapshotQuery, findings);
    return { ok: false, error: "\u8FD9\u4E2A\u8303\u56F4\u662F\u53EA\u8BFB\u7684", snapshot };
  }
  const repos = await listRepos(cwd);
  const root = (repos.find((repo) => repo.root === request.root) ?? repos[0])?.root;
  if (!root) {
    const snapshot = await loadReview(cwd, snapshotQuery, findings);
    return { ok: false, error: "\u8FD8\u539F\u9700\u8981\u4F7F\u7528 Git \u4EE3\u7801\u4ED3\u5E93", snapshot };
  }
  try {
    if (request.scope === "section") await applySection(root, request);
    else if (request.scope === "file") await applyFile(root, request);
    else await applyHunk(root, request);
    const snapshot = await loadReview(cwd, snapshotQuery, findings);
    return { ok: true, snapshot };
  } catch (error) {
    const snapshot = await loadReview(cwd, snapshotQuery, findings);
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot };
  }
}
async function initRepository(cwd) {
  assertDirectory(cwd);
  if (await gitRoot(cwd)) throw new Error("\u8FD9\u91CC\u5DF2\u7ECF\u662F Git \u4EE3\u7801\u4ED3\u5E93");
  const result = await git(cwd, ["init"]);
  if (result.code !== 0) throw new Error(result.stderr.trim() || "git init \u5931\u8D25");
}
async function commitReview(cwd, input) {
  const snapshot = await loadReview(cwd, { filter: "staged", root: input.root });
  if (snapshot.kind !== "repo" || !snapshot.root) return { ok: false, error: "\u672A\u627E\u5230 Git \u4EE3\u7801\u4ED3\u5E93", snapshot };
  const message = input.message.trim() || defaultCommitMessage(snapshot);
  try {
    if (input.includeUnstaged) {
      const added = await git(snapshot.root, ["add", "-A", "--", "."]);
      if (added.code !== 0) throw new Error(added.stderr.trim() || "\u65E0\u6CD5\u6682\u5B58\u672A\u6682\u5B58\u7684\u66F4\u6539");
    }
    const committed = await git(snapshot.root, ["commit", "-m", message]);
    if (committed.code !== 0) throw new Error(cleanGitError(committed.stderr || committed.stdout) || "\u65E0\u6CD5\u63D0\u4EA4\u66F4\u6539");
    if (input.push) await pushRepository(snapshot.root);
    const next = await loadReview(cwd, { filter: "unstaged", root: snapshot.root });
    return { ok: true, snapshot: next };
  } catch (error) {
    const next = await loadReview(cwd, { filter: "staged", root: snapshot.root });
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot: next };
  }
}
async function pushReview(cwd, root) {
  const snapshot = await loadReview(cwd, { filter: "unstaged", root });
  if (!snapshot.root) return { ok: false, error: "\u672A\u627E\u5230 Git \u4EE3\u7801\u4ED3\u5E93", snapshot };
  try {
    await pushRepository(snapshot.root);
    const next = await loadReview(cwd, { filter: "unstaged", root: snapshot.root });
    return { ok: true, snapshot: next };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), snapshot };
  }
}
async function createPullRequest(cwd, input) {
  const snapshot = await loadReview(cwd, { filter: "branch", root: input.root });
  if (!snapshot.root) return { ok: false, error: "\u672A\u627E\u5230 Git \u4EE3\u7801\u4ED3\u5E93" };
  if (!snapshot.ghAvailable) return { ok: false, error: "\u5B89\u88C5 GitHub CLI (gh) \u4EE5\u521B\u5EFA PR" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "\u62C9\u53D6\u8BF7\u6C42\u9700\u8981\u4E00\u4E2A\u6807\u9898" };
  const result = await gitLike("gh", snapshot.root, ["pr", "create", "--title", title, "--body", input.body.trim() || title]);
  if (result.code !== 0) return { ok: false, error: cleanGitError(result.stderr || result.stdout) || "\u65E0\u6CD5\u521B\u5EFA\u62C9\u53D6\u8BF7\u6C42" };
  const url = result.stdout.trim().split("\n").filter(Boolean).pop();
  return { ok: true, url };
}
async function resolveWorkspace(input) {
  const fromContext = existingDir(input.contextCwd);
  if (fromContext) return fromContext;
  const fromSession = input.sessionId ? discoverSessionCwd(input.sessionId) : null;
  if (fromSession) return fromSession;
  return existingDir(input.cwd);
}
function discoverSessionCwd(sessionId) {
  if (!/^[\w.-]{6,200}$/.test(sessionId)) return null;
  const homes = [process.env.DSH_HOME, path.join(homedir(), ".dsh"), path.join(homedir(), ".deepseek")].filter((entry) => Boolean(entry));
  for (const home of homes) {
    const found = walkForSession(home, sessionId, 0);
    if (found) return found;
  }
  return null;
}
function walkForSession(dir, sessionId, depth) {
  if (depth > 6 || !existsSync(dir)) return null;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = path.join(dir, entry);
    let info;
    try {
      info = lstatSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      if (entry === sessionId) {
        const cwd = cwdFromSessionDir(full);
        if (cwd) return cwd;
      }
      const nested = walkForSession(full, sessionId, depth + 1);
      if (nested) return nested;
    } else if (info.isFile() && info.size < 1e6 && (entry.endsWith(".json") || entry.endsWith(".jsonl"))) {
      if (!entry.includes(sessionId) && !dir.endsWith(sessionId)) continue;
      const cwd = cwdFromText(readSafe(full));
      if (cwd) return cwd;
    }
  }
  return null;
}
function cwdFromSessionDir(dir) {
  for (const name2 of ["session.json", "meta.json", "manifest.json", "state.json"]) {
    const file = path.join(dir, name2);
    if (!existsSync(file)) continue;
    const cwd = cwdFromText(readSafe(file));
    if (cwd) return cwd;
  }
  return null;
}
function cwdFromText(text) {
  const match = /"(?:cwd|working_directory|workingDirectory|workspace)"\s*:\s*"([^"]+)"/.exec(text);
  if (!match?.[1]) return null;
  const decoded = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return existingDir(decoded);
}
function readSafe(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
async function loadRepo(root, query, repos, findings) {
  const meta = await repoMeta(root);
  const counts = await statusCounts(root);
  const commits = await recentCommits(root);
  const selected = query.commitSha ? commits.find((commit) => commit.sha.startsWith(query.commitSha ?? "")) ?? await commitInfo(root, query.commitSha) : commits[0] ?? null;
  const baseBranch = query.baseBranch || meta.baseBranch;
  let files = [];
  let patch = "";
  let tooLarge = false;
  if (query.filter === "last-turn") {
    patch = query.lastTurnText ?? "";
    files = patch ? filesFromDiff(patch) : [];
  } else if (query.filter === "commit") {
    if (selected) {
      const shown = await diffText(root, ["show", "--format=", "--unified=3", selected.sha]);
      patch = shown;
      files = filesFromDiff(shown);
    }
  } else if (query.filter === "branch") {
    const base = await mergeBase(root, baseBranch);
    if (base) {
      const args = ["diff", "--unified=3", base];
      if (query.hideWhitespace) args.push("-w");
      if (query.full) args.push("-U100000");
      patch = await diffText(root, args);
      files = filesFromDiff(patch);
      const untracked = await untrackedFiles(root, counts.untracked);
      files = mergeFiles(files, untracked);
    }
  } else if (query.filter === "staged") {
    const args = ["diff", "--cached", "--unified=3"];
    if (query.hideWhitespace) args.push("-w");
    if (query.full) args.push("-U100000");
    patch = await diffText(root, args);
    files = filesFromDiff(patch);
  } else {
    const args = ["diff", "--unified=3"];
    if (query.hideWhitespace) args.push("-w");
    if (query.full) args.push("-U100000");
    patch = await diffText(root, args);
    files = filesFromDiff(patch);
    files = mergeFiles(files, await untrackedFiles(root, counts.untracked));
  }
  files = annotateStatus(files, counts.byPath, query.filter);
  if (patch.length > MAX_PATCH) {
    tooLarge = true;
    patch = patch.slice(0, MAX_PATCH);
  }
  const metrics = files.reduce(
    (sum, file) => ({ additions: sum.additions + file.additions, deletions: sum.deletions + file.deletions }),
    { additions: 0, deletions: 0 }
  );
  const gh = await commandExists("gh");
  return {
    kind: "repo",
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
    selectedCommit: query.filter === "commit" ? selected : null,
    tooLarge,
    patch: tooLarge ? null : patch || null,
    repos,
    findings
  };
}
async function applySection(root, request) {
  if (request.action === "stage" && request.filter === "unstaged") {
    await must(root, ["add", "-A", "--", "."]);
    return;
  }
  if (request.action === "unstage" && request.filter === "staged") {
    await must(root, ["restore", "--staged", "--", "."]);
    return;
  }
  if (request.action === "revert" && request.filter === "unstaged") {
    await must(root, ["restore", "--worktree", "--", "."]);
    const untracked = await untrackedPaths(root);
    for (const rel of untracked) removeInside(root, rel);
    return;
  }
  throw new Error("\u8FD9\u4E2A\u64CD\u4F5C\u4E0D\u9002\u7528\u4E8E\u5F53\u524D\u8303\u56F4");
}
async function applyFile(root, request) {
  const rel = safeRelative(root, request.path);
  if (request.action === "stage") {
    await must(root, ["add", "--", rel]);
    return;
  }
  if (request.action === "unstage") {
    await must(root, ["restore", "--staged", "--", rel]);
    return;
  }
  if (request.action === "revert") {
    const status = await porcelain(root);
    const entry = status.get(rel);
    if (!entry || entry.untracked) {
      removeInside(root, rel);
      return;
    }
    if (request.filter === "staged" && entry.index === "A") {
      await must(root, ["rm", "-f", "--", rel]);
      return;
    }
    if (request.filter === "staged") {
      await must(root, ["restore", "--source=HEAD", "--staged", "--worktree", "--", rel]);
      return;
    }
    await must(root, ["restore", "--worktree", "--", rel]);
    return;
  }
  throw new Error("\u672A\u77E5\u64CD\u4F5C");
}
async function applyHunk(root, request) {
  const rel = safeRelative(root, request.path);
  if (!request.hunkHeader) throw new Error("\u7F3A\u5C11\u4EE3\u7801\u5757");
  const args = request.filter === "staged" ? ["diff", "--cached", "--unified=3", "--", rel] : ["diff", "--unified=3", "--", rel];
  let parsed = parseUnifiedDiff(await diffText(root, args));
  if (parsed.length === 0 && request.filter === "unstaged") {
    const untracked = await untrackedFiles(root, [rel]);
    parsed = untracked.map((file2) => ({ ...file2, rawHeader: rawHeaderFor(file2) }));
  }
  const file = parsed.find((entry) => entry.path === rel) ?? parsed[0];
  const hunk = file?.hunks.find((entry) => entry.header === request.hunkHeader);
  if (!file || !hunk) throw new Error("\u5DEE\u5F02\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0");
  const patch = hunkPatch(file, hunk);
  if (request.action === "stage") {
    await applyPatch(root, ["apply", "--cached", "--whitespace=nowarn"], patch);
    return;
  }
  if (request.action === "unstage") {
    await applyPatch(root, ["apply", "--cached", "--reverse", "--whitespace=nowarn"], patch);
    return;
  }
  await applyPatch(root, ["apply", "--reverse", "--whitespace=nowarn"], patch);
}
function rawHeaderFor(file) {
  return [
    `diff --git a/${file.path} b/${file.path}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${file.path}`
  ].join("\n");
}
async function applyPatch(root, args, patch) {
  const result = await git(root, args, patch);
  if (result.code !== 0) throw new Error(cleanGitError(result.stderr || result.stdout) || "\u65E0\u6CD5\u5E94\u7528\u5DEE\u5F02");
}
async function pushRepository(root) {
  const result = await git(root, ["push"]);
  if (result.code !== 0) {
    const text = result.stderr || result.stdout;
    if (/no upstream|has no upstream/i.test(text)) {
      const branch = (await git(root, ["branch", "--show-current"])).stdout.trim();
      if (!branch) throw new Error("\u5206\u652F\u4FE1\u606F\u4E0D\u53EF\u7528");
      const set = await git(root, ["push", "-u", "origin", branch]);
      if (set.code !== 0) throw new Error(cleanGitError(set.stderr || set.stdout) || "\u65E0\u6CD5\u63A8\u9001\u53D8\u66F4");
      return;
    }
    throw new Error(cleanGitError(text) || "\u65E0\u6CD5\u63A8\u9001\u53D8\u66F4");
  }
}
async function listRepos(cwd) {
  const direct = await gitRoot(cwd);
  if (direct) return [{ root: direct, label: path.basename(direct) }];
  if (!existingDir(cwd)) return [];
  const found = [];
  let entries = [];
  try {
    entries = readdirSync(cwd);
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry === ".git" || entry === "node_modules") continue;
    const full = path.join(cwd, entry);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    const root = await gitRoot(full);
    if (root) found.push({ root, label: entry });
  }
  return found;
}
async function repoMeta(root) {
  const branchResult = await git(root, ["branch", "--show-current"]);
  const branch = branchResult.stdout.trim() || null;
  const detached = !branch;
  const branchList = await git(root, ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"]);
  const names = branchList.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const local = names.filter((name2) => !name2.includes("/"));
  const baseBranch = await detectBaseBranch(root, branch, names);
  const remote = await git(root, ["remote"]);
  const hasRemote = remote.stdout.trim().length > 0;
  let ahead = 0;
  let behind = 0;
  if (branch && hasRemote) {
    const counts = await git(root, ["rev-list", "--left-right", "--count", `origin/${branch}...HEAD`]);
    const parts = counts.stdout.trim().split(/\s+/);
    if (counts.code === 0 && parts.length >= 2) {
      behind = Number(parts[0] ?? 0);
      ahead = Number(parts[1] ?? 0);
    } else {
      const localCounts = await git(root, ["rev-list", "--count", branch]);
      ahead = Number(localCounts.stdout.trim() || 0);
    }
  }
  return {
    branch,
    detached,
    baseBranch,
    branches: local.filter((name2) => name2 !== branch),
    ahead,
    behind,
    hasRemote
  };
}
async function detectBaseBranch(root, current, names) {
  const originHead = await git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  if (originHead.code === 0) {
    const short = originHead.stdout.trim().replace(/^origin\//, "");
    if (short && short !== current) return short;
  }
  for (const candidate of ["main", "master", "develop", "trunk"]) {
    if (candidate !== current && names.includes(candidate)) return candidate;
  }
  return names.find((name2) => name2 !== current && !name2.includes("/")) ?? null;
}
async function statusCounts(root) {
  const byPath = await porcelain(root);
  let staged = 0;
  let unstaged = 0;
  const untracked = [];
  for (const [rel, entry] of byPath) {
    if (entry.untracked) {
      unstaged += 1;
      untracked.push(rel);
      continue;
    }
    if (entry.index !== " " && entry.index !== "?") staged += 1;
    if (entry.work !== " " && entry.work !== "?") unstaged += 1;
  }
  return { staged, unstaged, untracked, byPath };
}
async function porcelain(root) {
  const result = await git(root, ["status", "--porcelain=v1", "-z", "-uall"]);
  const map = /* @__PURE__ */ new Map();
  const parts = result.stdout.split("\0").filter((part) => part !== "");
  for (let index = 0; index < parts.length; index += 1) {
    const record = parts[index] ?? "";
    if (record.length < 3) continue;
    const xy = record.slice(0, 2);
    const rel = record.slice(3);
    const code = xy[0] === "R" || xy[0] === "C" || xy[1] === "R" || xy[1] === "C";
    if (code) index += 1;
    map.set(rel, {
      index: xy[0] ?? " ",
      work: xy[1] ?? " ",
      untracked: xy === "??",
      unmerged: xy.includes("U") || xy === "AA" || xy === "DD"
    });
  }
  return map;
}
async function untrackedPaths(root) {
  const result = await git(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  return result.stdout.split("\0").filter(Boolean);
}
async function untrackedFiles(root, paths) {
  const files = [];
  for (const rel of paths) {
    const abs = safeJoin(root, rel);
    let info;
    try {
      info = statSync(abs);
    } catch {
      continue;
    }
    if (!info.isFile()) continue;
    if (info.size > MAX_UNTRACKED_BYTES) {
      files.push(fileSkeleton(rel, "untracked", true, true));
      continue;
    }
    const bytes = readFileSync(abs);
    if (isBinary(bytes)) {
      files.push(fileSkeleton(rel, "untracked", true, false));
      continue;
    }
    const text = bytes.toString("utf8");
    const hunks = diffLines("", text);
    const counts = countEdits(hunks);
    const file = {
      ...fileSkeleton(rel, "untracked", false, false),
      additions: counts.additions,
      deletions: counts.deletions,
      hunks,
      rawHeader: rawHeaderFor({ path: rel, oldPath: null, status: "untracked", additions: 0, deletions: 0, binary: false, tooLarge: false, hunks })
    };
    files.push(file);
  }
  return files;
}
function fileSkeleton(rel, status, binary, tooLarge) {
  return {
    path: rel,
    oldPath: null,
    status,
    additions: 0,
    deletions: 0,
    binary,
    tooLarge,
    hunks: [],
    rawHeader: ""
  };
}
function filesFromDiff(text) {
  if (text.length > MAX_PATCH) {
    const parsed = parseUnifiedDiff(text.slice(0, MAX_PATCH));
    return parsed.map((file) => ({ ...file, tooLarge: true, hunks: [], additions: file.additions, deletions: file.deletions }));
  }
  return parseUnifiedDiff(text).map((file) => {
    const serialized = file.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0);
    if (serialized > 8e3 || text.length > MAX_FILE_PATCH) return { ...file, tooLarge: true, hunks: [] };
    return file;
  });
}
function mergeFiles(base, extra) {
  const seen = new Set(base.map((file) => file.path));
  return [...base, ...extra.filter((file) => !seen.has(file.path))];
}
function annotateStatus(files, byPath, filter) {
  return files.map((file) => {
    const entry = byPath.get(file.path);
    if (!entry) return file;
    if (entry.unmerged) return { ...file, status: "unmerged" };
    if (entry.untracked) return { ...file, status: "untracked" };
    if (filter === "staged" && entry.index === "A") return { ...file, status: "added" };
    if (filter === "staged" && entry.index === "D") return { ...file, status: "deleted" };
    if (filter === "unstaged" && entry.work === "D") return { ...file, status: "deleted" };
    return file;
  });
}
async function recentCommits(root) {
  const result = await git(root, ["log", "-n", "30", "--pretty=format:%H%x09%h%x09%ct%x09%s"]);
  if (result.code !== 0 || !result.stdout.trim()) return [];
  return result.stdout.split("\n").map(parseCommitLine).filter((commit) => commit != null);
}
async function commitInfo(root, sha) {
  if (!/^[0-9a-f]{7,64}$/i.test(sha)) return null;
  const result = await git(root, ["log", "-n", "1", "--pretty=format:%H%x09%h%x09%ct%x09%s", sha]);
  if (result.code !== 0) return null;
  return parseCommitLine(result.stdout.trim());
}
function parseCommitLine(line) {
  const [sha, shortSha, time, ...subject] = line.split("	");
  if (!sha || !shortSha || !time) return null;
  return { sha, shortSha, subject: subject.join("	"), time: Number(time) };
}
async function mergeBase(root, base) {
  if (!base) return null;
  const result = await git(root, ["merge-base", "HEAD", base]);
  if (result.code !== 0) return null;
  return result.stdout.trim() || null;
}
async function diffText(root, args) {
  const result = await git(root, args);
  if (result.code > 1) throw new Error(cleanGitError(result.stderr) || "\u65E0\u6CD5\u52A0\u8F7D\u5DEE\u5F02");
  return result.stdout;
}
async function gitRoot(cwd) {
  if (!existingDir(cwd)) return null;
  const result = await git(cwd, ["rev-parse", "--show-toplevel"]);
  if (result.code !== 0) return null;
  return result.stdout.trim() || null;
}
async function must(root, args) {
  const result = await git(root, args);
  if (result.code !== 0) throw new Error(cleanGitError(result.stderr || result.stdout) || "Git \u64CD\u4F5C\u5931\u8D25");
}
async function git(cwd, args, input) {
  return gitLike("git", cwd, [...GIT_PREFIX, ...args], input);
}
function gitLike(command, cwd, args, input) {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd,
        maxBuffer: 12 * 1024 * 1024,
        timeout: args.includes("push") ? 6e4 : 3e4,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "echo",
          GCM_INTERACTIVE: "never"
        }
      },
      (error, stdout, stderr) => {
        const numeric = typeof error?.code === "number" ? error.code : error ? 1 : 0;
        resolve({ code: numeric, stdout: String(stdout ?? ""), stderr: String(stderr ?? error?.message ?? "") });
      }
    );
    if (input != null) {
      child.stdin?.write(input);
      child.stdin?.end();
    }
  });
}
async function commandExists(command) {
  const result = await gitLike("which", process.cwd(), [command]);
  return result.code === 0 && result.stdout.trim().length > 0;
}
function defaultCommitMessage(snapshot) {
  const files = snapshot.files;
  if (files.length === 0) return "\u66F4\u65B0\u5BA1\u67E5\u4E2D\u7684\u66F4\u6539";
  if (files.length === 1) return `\u66F4\u65B0 ${files[0]?.path ?? "\u6587\u4EF6"}`;
  return `\u66F4\u65B0 ${files.length} \u4E2A\u6587\u4EF6`;
}
function cleanGitError(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "").trim().split("\n").filter(Boolean).slice(0, 4).join("\n");
}
function existingDir(value) {
  if (!value) return null;
  try {
    const resolved = path.resolve(value);
    if (statSync(resolved).isDirectory()) return resolved;
  } catch {
    return null;
  }
  return null;
}
function assertDirectory(cwd) {
  if (!existingDir(cwd)) throw new Error("\u5DE5\u4F5C\u76EE\u5F55\u4E0D\u5B58\u5728");
}
function safeRelative(root, rel) {
  if (!rel || rel.includes("\0") || path.isAbsolute(rel)) throw new Error("\u8DEF\u5F84\u65E0\u6548");
  const normalized = path.normalize(rel).replace(/\\/g, "/");
  if (normalized.startsWith("../") || normalized === "..") throw new Error("\u8DEF\u5F84\u65E0\u6548");
  const abs = path.resolve(root, normalized);
  const relative = path.relative(root, abs);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("\u8DEF\u5F84\u65E0\u6548");
  return relative.replace(/\\/g, "/");
}
function safeJoin(root, rel) {
  return path.resolve(root, safeRelative(root, rel));
}
function removeInside(root, rel) {
  const abs = safeJoin(root, rel);
  if (!existsSync(abs)) return;
  rmSync(abs, { force: true });
}
function isBinary(bytes) {
  const sample = bytes.subarray(0, 8e3);
  return sample.includes(0);
}
function blankSnapshot(kind, root, error) {
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
    findings: []
  };
}
function notRepo(cwd) {
  return blankSnapshot("not-repo", existingDir(cwd));
}

// src/review/prompts.ts
var FILTER_LABEL = {
  unstaged: "\u672A\u63D0\u4EA4\u7684\u66F4\u6539\uFF08\u5DF2\u6682\u5B58\u3001\u672A\u6682\u5B58\u548C\u672A\u8DDF\u8E2A\u6587\u4EF6\uFF09",
  staged: "\u5DF2\u6682\u5B58\u7684\u66F4\u6539",
  commit: "\u6307\u5B9A\u63D0\u4EA4",
  branch: "\u5F53\u524D\u5206\u652F\u76F8\u5BF9\u57FA\u7840\u5206\u652F\u7684\u5DEE\u5F02",
  "last-turn": "\u4E0A\u4E00\u8F6E\u52A9\u624B\u4FEE\u6539"
};
function reviewPrompt(options) {
  const scope = describeScope(options);
  const custom = options.custom?.trim();
  const lines = [
    "\u8BF7\u5BA1\u67E5\u4E0B\u9762\u8FD9\u4E2A\u8303\u56F4\u91CC\u7684\u4EE3\u7801\u6539\u52A8\u3002\u4E0D\u8981\u4FEE\u6539\u5DE5\u4F5C\u533A\uFF0C\u4E0D\u8981\u6682\u5B58\u3001\u8FD8\u539F\u6216\u63D0\u4EA4\u3002",
    "",
    `\u5BA1\u67E5\u8303\u56F4\uFF1A${scope}`
  ];
  if (options.root) lines.push(`\u4ED3\u5E93\uFF1A${options.root}`);
  if (custom) {
    lines.push("", "\u989D\u5916\u8981\u6C42\uFF1A", custom);
  }
  lines.push(
    "",
    "\u5148\u7ED9\u51FA\u7B80\u77ED\u7ED3\u8BBA\uFF0C\u518D\u6309\u4E25\u91CD\u7A0B\u5EA6\u5217\u51FA\u53D1\u73B0\u3002\u6CA1\u6709\u95EE\u9898\u65F6\u76F4\u63A5\u8BF4\u660E\uFF0C\u5E76\u6307\u51FA\u8FD8\u7F3A\u54EA\u4E9B\u6D4B\u8BD5\u3002",
    "\u6BCF\u6761\u53D1\u73B0\u7528\u4E0B\u9762\u7684\u5757\uFF0C\u65B9\u4FBF\u5BA1\u67E5\u4FA7\u680F\u628A\u5B83\u8D34\u56DE\u5BF9\u5E94\u884C\uFF1A",
    "",
    ":::review",
    "path: \u76F8\u5BF9\u8DEF\u5F84",
    "line: \u884C\u53F7",
    "side: new",
    "priority: P1",
    "title: \u4E00\u53E5\u8BDD\u6807\u9898",
    "\u8FD9\u91CC\u5199\u89E6\u53D1\u6761\u4EF6\u3001\u671F\u671B\u884C\u4E3A\u548C\u5B9E\u9645\u884C\u4E3A\u3002",
    ":::",
    "",
    "priority \u4F7F\u7528 P0\u3001P1\u3001P2 \u6216 P3\u3002side \u4E3A new\uFF08\u6539\u52A8\u540E\uFF09\u6216 old\uFF08\u6539\u52A8\u524D\uFF09\u3002"
  );
  return lines.join("\n");
}
function describeScope(options) {
  if (options.filter === "branch") {
    const base = options.baseBranch?.trim() || "\u9ED8\u8BA4\u57FA\u7840\u5206\u652F";
    return `\u5F53\u524D\u5206\u652F\u76F8\u5BF9 ${base} \u7684\u5DEE\u5F02\uFF08${FILTER_LABEL.branch}\uFF09`;
  }
  if (options.filter === "commit") {
    const sha = options.commitSha?.trim() || "\u6240\u9009\u63D0\u4EA4";
    return `\u63D0\u4EA4 ${sha} \u5F15\u5165\u7684\u5DEE\u5F02`;
  }
  return FILTER_LABEL[options.filter];
}
var FENCE = /:::review\n([\s\S]*?)\n:::/g;
function parseFindingFences(text) {
  const findings = [];
  for (const match of text.matchAll(FENCE)) {
    const block = match[1] ?? "";
    const parsed = parseFindingBlock(block);
    if (parsed) findings.push(parsed);
  }
  return findings;
}
function parseFindingBlock(block) {
  const lines = block.split("\n");
  const fields = /* @__PURE__ */ new Map();
  const body = [];
  let inBody = false;
  for (const line2 of lines) {
    if (!inBody) {
      const field = /^([a-z]+):\s*(.*)$/.exec(line2);
      if (field && field[1] && ["path", "line", "side", "priority", "title"].includes(field[1])) {
        fields.set(field[1], field[2] ?? "");
        if (field[1] === "title") inBody = true;
        continue;
      }
    }
    body.push(line2);
  }
  const path4 = fields.get("path")?.trim();
  const line = Number(fields.get("line"));
  if (!path4 || !Number.isInteger(line) || line <= 0) return null;
  const side = fields.get("side")?.trim() === "old" ? "old" : "new";
  return {
    path: path4,
    line,
    side,
    priority: fields.get("priority")?.trim() || "P2",
    title: fields.get("title")?.trim() || "\u5BA1\u67E5\u53D1\u73B0",
    body: body.join("\n").trim()
  };
}

// src/host/http.ts
function isSameOrigin(headers) {
  const site = header(headers, "sec-fetch-site");
  if (site === "cross-site") return false;
  const origin = header(headers, "origin");
  const host = header(headers, "host");
  if (!origin || !host) return site !== "cross-site";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function header(headers, name2) {
  const value = headers[name2] ?? headers[name2.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

// src/host/session-scan.ts
import { existsSync as existsSync2, readdirSync as readdirSync2, readFileSync as readFileSync2, statSync as statSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import path2 from "node:path";
function scanSessionText(text) {
  const findings = parseFindingFences(text);
  const changes = [];
  const tail = text.length > 25e4 ? text.slice(-25e4) : text;
  for (const line of tail.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.includes("path")) continue;
    try {
      collectChanges(JSON.parse(trimmed), changes, 0);
    } catch {
    }
  }
  return { patch: changesToPatch(changes.slice(-30)), findings };
}
function readSessionBlob(sessionId) {
  if (!/^[\w.-]{6,200}$/.test(sessionId)) return "";
  const homes = [process.env.DSH_HOME, path2.join(homedir2(), ".dsh"), path2.join(homedir2(), ".deepseek")].filter((entry) => Boolean(entry));
  const chunks = [];
  const state = { budget: 500, chars: 0 };
  for (const home of homes) collectSessionFiles(home, sessionId, chunks, 0, state);
  return chunks.join("\n");
}
function collectSessionFiles(dir, sessionId, chunks, depth, state) {
  if (depth > 6 || state.budget <= 0 || state.chars > 4e5 || !existsSync2(dir)) return;
  state.budget -= 1;
  let entries = [];
  try {
    entries = readdirSync2(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = path2.join(dir, entry);
    let info;
    try {
      info = statSync2(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      collectSessionFiles(full, sessionId, chunks, depth + 1, state);
    } else if (info.isFile() && info.size < 15e5 && (entry.endsWith(".json") || entry.endsWith(".jsonl") || entry.endsWith(".log"))) {
      if (!full.includes(sessionId)) continue;
      try {
        const text = readFileSync2(full, "utf8").slice(-15e4);
        state.chars += text.length;
        chunks.push(text);
      } catch {
      }
    }
  }
}
function findingId(finding) {
  return `${finding.path}:${finding.side}:${finding.line}:${finding.priority}:${finding.title}`;
}
function toReviewFindings(findings) {
  return findings.map((finding) => ({ ...finding, id: findingId(finding) }));
}
function collectChanges(value, changes, depth) {
  if (!value || typeof value !== "object" || depth > 6) return;
  if (Array.isArray(value)) {
    for (const entry of value) collectChanges(entry, changes, depth + 1);
    return;
  }
  const record = value;
  const pathValue = firstString(record, ["path", "file", "filePath"]);
  const before = firstString(record, ["oldText", "old_string", "before", "old"]);
  const after = firstString(record, ["newText", "new_string", "after", "new"]);
  if (pathValue && before != null && after != null && before !== after) {
    changes.push({ path: pathValue, before, after });
  }
  for (const entry of Object.values(record)) collectChanges(entry, changes, depth + 1);
}
function firstString(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return null;
}
function changesToPatch(changes) {
  const byPath = /* @__PURE__ */ new Map();
  for (const change of changes) byPath.set(change.path, change);
  return [...byPath.values()].map((change) => filePatch(change.path, change.before, change.after)).filter(Boolean).join("");
}
function filePatch(filePath, before, after) {
  const hunks = diffLines(before, after);
  if (hunks.length === 0) return "";
  const header2 = before === "" ? `diff --git a/${filePath} b/${filePath}
new file mode 100644
--- /dev/null
+++ b/${filePath}
` : `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
`;
  const body = hunks.map((hunk) => {
    const lines = hunk.lines.map((line) => `${line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}${line.text}`);
    return `${hunk.header}
${lines.join("\n")}
`;
  }).join("");
  return header2 + body;
}

// src/host/plugin.ts
var name = "dsh-codex-review";
var inject = ["webServer"];
var PREFIX = "/api/codex-review";
var findingsByKey = /* @__PURE__ */ new Map();
var lastTurnByKey = /* @__PURE__ */ new Map();
var hostContext = null;
function apply(ctx) {
  hostContext = ctx;
  const register = () => {
    const server = ctx.webServer;
    if (!server?.register) return () => void 0;
    const dispose = server.register({ kind: "prefix", path: PREFIX, handler: (req, res) => handle(req, res) });
    return () => dispose();
  };
  if (typeof ctx.inject === "function") ctx.inject(["webServer"], (injected) => injected.effect ? injected.effect(register, "dsh-codex-review: routes") : register());
  else if (ctx.effect) ctx.effect(register, "dsh-codex-review: routes");
  else register();
  if (typeof ctx.inject === "function") {
    ctx.inject(["commands"], (injected) => {
      injected.commands?.register({
        name: "review",
        description: "\u5BA1\u67E5\u5F53\u524D\u6539\u52A8\u3002\u7528\u6CD5\uFF1A/review\u3001/review uncommitted\u3001/review branch <base>\u3001/review commit <sha>\u3001/review <\u8981\u6C42>",
        input: { hint: "[uncommitted | branch <base> | commit <sha> | \u8981\u6C42]" },
        handler: async ({ agent, rawInput }) => {
          const parsed = parseReviewCommand(rawInput ?? "");
          if (!parsed) {
            return {
              kind: "success",
              text: "\u5728\u5BA1\u67E5\u4FA7\u680F\u9009\u62E9\u8303\u56F4\uFF0C\u6216\u4F7F\u7528 /review uncommitted\u3001/review branch main\u3001/review commit <sha>\uFF0C\u6216 /review \u540E\u63A5\u4F60\u7684\u8981\u6C42\u3002"
            };
          }
          const queued = await deliver(agent, reviewPrompt(parsed));
          return queued ? { kind: "success", text: "\u5DF2\u628A\u5BA1\u67E5\u8BF7\u6C42\u4EA4\u7ED9\u5F53\u524D\u4F1A\u8BDD" } : { kind: "error", text: "\u65E0\u6CD5\u628A\u5BA1\u67E5\u8BF7\u6C42\u4EA4\u7ED9\u5F53\u524D agent" };
        }
      });
    });
    ctx.inject(["tools"], (injected) => {
      const tool = {
        name: "review_comment",
        description: "\u628A\u4E00\u6761\u4EE3\u7801\u5BA1\u67E5\u53D1\u73B0\u8D34\u5230 DSH \u5BA1\u67E5\u4FA7\u680F\u7684\u5BF9\u5E94\u884C\u4E0A\u3002\u6BCF\u6761\u53D1\u73B0\u8C03\u7528\u4E00\u6B21\uFF0C\u4E0D\u8981\u7528\u5B83\u4FEE\u6539\u6587\u4EF6\u3002",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            line: { type: "integer" },
            side: { type: "string", enum: ["old", "new"] },
            priority: { type: "string" },
            title: { type: "string" },
            body: { type: "string" }
          },
          required: ["path", "line", "body"]
        },
        async execute(args, invocation) {
          rememberFinding(invocation?.sessionId ?? "global", args);
          return { content: "\u5DF2\u663E\u793A\u5728\u5BA1\u67E5\u4FA7\u680F" };
        }
      };
      tool.handler = tool.execute;
      try {
        injected.tools?.register(tool);
      } catch (error) {
        console.warn("[dsh-codex-review] review_comment tool was not registered", error);
      }
    });
  }
  if (typeof ctx.on === "function") {
    for (const event of ["tool/result", "agent/tool-result", "session/event"]) {
      try {
        ctx.on(event, (payload) => {
          const text = JSON.stringify(payload);
          const sessionId = sessionIdOf(payload) ?? "global";
          absorb(sessionId, text);
        });
      } catch {
      }
    }
  }
}
function resetReviewState() {
  findingsByKey.clear();
  lastTurnByKey.clear();
}
async function handle(req, res) {
  if (!isSameOrigin(req.headers)) {
    sendJson(res, 403, { ok: false, error: "cross-origin requests are refused" });
    return;
  }
  const method = String(req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? PREFIX, "http://dsh.local");
  const tail = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) : url.pathname;
  try {
    if (method === "GET" && (tail === "" || tail === "/" || tail === "/health")) {
      sendJson(res, 200, { ok: true, data: { status: "ready", kind: "codex-review" } });
      return;
    }
    if (method === "GET" && tail === "/raw") {
      await sendRaw(url, res);
      return;
    }
    const body = method === "GET" ? {} : parseJson(await readBody(req));
    const sessionId = stringField(body, "sessionId");
    const cwd = await workspaceFor(body, sessionId);
    if (method === "POST" && tail === "/snapshot") {
      if (!cwd) {
        sendJson(res, 200, { ok: true, data: blankSnapshot("missing-cwd", null) });
        return;
      }
      const query = loadQueryFrom(body);
      const key = sessionId || cwd;
      const scanned = scanKnownSession(sessionId);
      if (scanned.patch) lastTurnByKey.set(key, scanned.patch);
      absorb(key, scanned.findings.map((finding) => `:::review
path: ${finding.path}
line: ${finding.line}
side: ${finding.side}
priority: ${finding.priority}
title: ${finding.title}
${finding.body}
:::`).join("\n"));
      query.lastTurnText = lastTurnByKey.get(key) ?? null;
      const snapshot = await loadReview(cwd, query, findingsByKey.get(key) ?? []);
      sendJson(res, 200, { ok: true, data: snapshot });
      return;
    }
    if (!cwd) {
      sendJson(res, 400, { ok: false, error: "\u627E\u4E0D\u5230\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u5DE5\u4F5C\u76EE\u5F55" });
      return;
    }
    if (method === "POST" && tail === "/action") {
      const result = await applyReviewAction(cwd, actionFrom(body), findingsByKey.get(sessionId || cwd) ?? []);
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error });
      return;
    }
    if (method === "POST" && tail === "/init") {
      await initRepository(cwd);
      sendJson(res, 200, { ok: true, data: await loadReview(cwd, { filter: "unstaged" }) });
      return;
    }
    if (method === "POST" && tail === "/commit") {
      const input = {
        message: stringField(body, "message") ?? "",
        includeUnstaged: Boolean(body.includeUnstaged),
        push: Boolean(body.push),
        root: stringField(body, "root")
      };
      const result = await commitReview(cwd, input);
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error });
      return;
    }
    if (method === "POST" && tail === "/push") {
      const result = await pushReview(cwd, stringField(body, "root"));
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error });
      return;
    }
    if (method === "POST" && tail === "/pr") {
      const result = await createPullRequest(cwd, { title: stringField(body, "title") ?? "", body: stringField(body, "body") ?? "", root: stringField(body, "root") });
      sendJson(res, 200, { ok: result.ok, data: result, error: result.error });
      return;
    }
    if (method === "POST" && tail === "/followup") {
      const text = stringField(body, "text") ?? "";
      const queued = await deliver(agentFor(sessionId), text);
      sendJson(res, 200, { ok: true, data: { queued, text } });
      return;
    }
    if (method === "POST" && tail === "/finding") {
      rememberFinding(sessionId || cwd, body);
      sendJson(res, 200, { ok: true, data: { id: "saved" } });
      return;
    }
    sendJson(res, 404, { ok: false, error: `no route ${method} ${tail}` });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
async function workspaceFor(body, sessionId) {
  return resolveWorkspace({
    sessionId,
    cwd: stringField(body, "cwd"),
    contextCwd: cwdFromContext(sessionId)
  });
}
function cwdFromContext(sessionId) {
  if (!sessionId || !hostContext?.workingDirectory?.get) return null;
  try {
    const value = hostContext.workingDirectory.get(sessionId);
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const record = value;
      for (const key of ["cwd", "path", "workingDirectory", "directory"]) {
        if (typeof record[key] === "string") return record[key];
      }
    }
  } catch {
    return discoverSessionCwd(sessionId);
  }
  return discoverSessionCwd(sessionId);
}
function scanKnownSession(sessionId) {
  if (!sessionId) return { patch: "", findings: [] };
  return scanSessionText(readSessionBlob(sessionId));
}
function loadQueryFrom(body) {
  const filter = stringField(body, "filter");
  return {
    filter: isFilter(filter) ? filter : "unstaged",
    baseBranch: stringField(body, "baseBranch"),
    commitSha: stringField(body, "commitSha"),
    hideWhitespace: Boolean(body.hideWhitespace),
    full: Boolean(body.full),
    root: stringField(body, "root")
  };
}
function actionFrom(body) {
  const action = stringField(body, "action");
  const scope = stringField(body, "scope");
  const filter = stringField(body, "filter");
  return {
    action: action === "stage" || action === "unstage" || action === "revert" ? action : "stage",
    scope: scope === "section" || scope === "file" || scope === "hunk" ? scope : "file",
    filter: isFilter(filter) ? filter : "unstaged",
    path: stringField(body, "path") ?? void 0,
    hunkHeader: stringField(body, "hunkHeader") ?? void 0,
    baseBranch: stringField(body, "baseBranch"),
    commitSha: stringField(body, "commitSha"),
    root: stringField(body, "root")
  };
}
async function sendRaw(url, res) {
  const root = url.searchParams.get("root");
  const rel = url.searchParams.get("path");
  if (!root || !rel) {
    sendJson(res, 400, { ok: false, error: "missing path" });
    return;
  }
  const abs = path3.resolve(root, rel);
  const relative = path3.relative(root, abs);
  if (relative.startsWith("..") || path3.isAbsolute(relative)) {
    sendJson(res, 400, { ok: false, error: "\u8DEF\u5F84\u65E0\u6548" });
    return;
  }
  const info = statSync3(abs);
  if (!info.isFile() || info.size > 2e6) {
    sendJson(res, 404, { ok: false, error: "file unavailable" });
    return;
  }
  const ext = path3.extname(abs).toLowerCase();
  const types = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const type = types[ext];
  if (!type) {
    sendJson(res, 415, { ok: false, error: "unsupported preview" });
    return;
  }
  const bytes = readFileSync3(abs);
  res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
  res.end(bytes);
}
function parseJson(text) {
  if (!text.trim()) return {};
  const value = JSON.parse(text);
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringField(body, key) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value : null;
}
function isFilter(value) {
  return value === "unstaged" || value === "staged" || value === "commit" || value === "branch" || value === "last-turn";
}
function rememberFinding(key, args) {
  const filePath = stringField(args, "path");
  const line = Number(args.line);
  const body = stringField(args, "body") ?? stringField(args, "text");
  if (!filePath || !Number.isInteger(line) || line <= 0 || !body) return;
  const finding = {
    id: findingId({ path: filePath, line, side: args.side === "old" ? "old" : "new", priority: stringField(args, "priority") ?? "P2", title: stringField(args, "title") ?? "\u5BA1\u67E5\u53D1\u73B0", body }),
    path: filePath,
    line,
    side: args.side === "old" ? "old" : "new",
    priority: stringField(args, "priority") ?? "P2",
    title: stringField(args, "title") ?? "\u5BA1\u67E5\u53D1\u73B0",
    body
  };
  const current = findingsByKey.get(key) ?? [];
  findingsByKey.set(key, [...current.filter((item) => item.id !== finding.id), finding]);
}
function absorb(key, text) {
  const scanned = scanSessionText(text);
  if (scanned.patch) lastTurnByKey.set(key, scanned.patch);
  for (const finding of toReviewFindings(scanned.findings)) {
    const current = findingsByKey.get(key) ?? [];
    if (!current.some((item) => item.id === finding.id)) findingsByKey.set(key, [...current, finding]);
  }
}
async function deliver(agent, text) {
  if (!text.trim()) return false;
  const message = { content: [{ type: "text", text }], source: { kind: "user" } };
  const candidates = [agent, agentFor(null), hostContext?.agents, hostContext?.sessions];
  for (const candidate of candidates) {
    const follow = followupOf(candidate);
    if (!follow) continue;
    try {
      await follow(message);
      return true;
    } catch {
    }
  }
  return false;
}
function agentFor(sessionId) {
  const agents = hostContext?.agents;
  if (sessionId && agents?.get) {
    const found = agents.get(sessionId);
    if (found && typeof found === "object") return found;
  }
  return null;
}
function followupOf(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  if (typeof record.followup === "function") return record.followup.bind(value);
  if (typeof record.submit === "function") return record.submit.bind(value);
  return null;
}
function sessionIdOf(payload) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload;
  for (const key of ["sessionId", "session_id", "conversationId"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return null;
}
function parseReviewCommand(raw) {
  const text = raw.trim();
  if (!text) return null;
  const [head, ...rest] = text.split(/\s+/);
  const command = head?.toLowerCase();
  if (command === "uncommitted" || command === "unstaged" || command === "working") return { filter: "unstaged" };
  if (command === "branch") return { filter: "branch", baseBranch: rest[0] };
  if (command === "commit") return rest[0] ? { filter: "commit", commitSha: rest[0] } : null;
  return { filter: "unstaged", custom: text };
}
export {
  apply,
  inject,
  name,
  parseReviewCommand,
  resetReviewState
};
