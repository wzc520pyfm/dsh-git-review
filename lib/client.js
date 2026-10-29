window.__ModuleLoader__.load({
  id: "dsh-codex-review-sidebar",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/entry.tsx
var entry_exports = {};
__export(entry_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var import_react3 = __toESM(require("react"), 1);

// src/client/http-client.ts
var PREFIX = "/api/codex-review";
function createPluginClient(options) {
  return {
    load: (query) => post("/snapshot", { ...options, ...query }),
    action: (request) => post("/action", { ...options, ...request }),
    init: () => post("/init", options),
    commit: (input) => post("/commit", { ...options, ...input }),
    push: (root) => post("/push", { ...options, root }),
    createPr: (input) => post("/pr", { ...options, ...input }),
    followup: (text) => post("/followup", { ...options, text }),
    fileUrl: (root, filePath) => `${PREFIX}/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(filePath)}`,
    openFile: options.openFile
  };
}
async function post(tail, body) {
  const response = await fetch(PREFIX + tail, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok || payload.data == null) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload.data;
}

// src/client/i18n.ts
var zh = {
  tab: "\u5BA1\u67E5",
  tabDescription: "\u67E5\u770B\u5DEE\u5F02\u3001\u6682\u5B58\u6216\u8FD8\u539F\u66F4\u6539\uFF0C\u5E76\u7559\u4E0B\u884C\u5185\u8BC4\u8BBA",
  openReview: "\u5BA1\u67E5",
  unstaged: "\u672A\u6682\u5B58",
  staged: "\u5DF2\u6682\u5B58",
  commit: "\u63D0\u4EA4",
  branch: "\u5206\u652F",
  lastTurn: "\u4E0A\u8F6E\u5BF9\u8BDD",
  cloud: "\u4E91\u7AEF\u66F4\u6539",
  viewBranchDiff: "\u67E5\u770B\u5206\u652F\u5DEE\u5F02",
  noDiff: "\u5C1A\u65E0\u6587\u4EF6\u66F4\u6539",
  noDiffDescription: "\u6B64\u9879\u76EE\u4E2D\u7684\u66F4\u6539\u5C06\u663E\u793A\u5728\u6B64\u5904\u3002",
  gitRequiredTitle: "\u521B\u5EFA Git \u4EE3\u7801\u4ED3\u5E93",
  gitRequiredDescription: "\u8FFD\u8E2A\u3001\u5BA1\u9605\u548C\u64A4\u9500\u6B64\u9879\u76EE\u7684\u66F4\u6539\u3002",
  createRepo: "\u521B\u5EFA Git \u5B58\u50A8\u5E93",
  creatingRepo: "\u6B63\u5728\u521B\u5EFA\u2026",
  gitInitError: "Git \u521D\u59CB\u5316\u5931\u8D25\uFF1A{message}",
  noStagedTitle: "\u65E0\u6682\u5B58\u66F4\u6539",
  noStagedDescription: "\u63A5\u53D7\u7F16\u8F91\u5185\u5BB9\u5E76\u6682\u5B58",
  noUnstagedTitle: "\u65E0\u672A\u6682\u5B58\u66F4\u6539",
  noUnstagedDescription: "\u4EE3\u7801\u66F4\u6539\u5C06\u5728\u6B64\u5904\u663E\u793A",
  lastTurnMissing: "\u6700\u65B0\u5DEE\u5F02\u5DF2\u4E0D\u518D\u53EF\u7528\u3002",
  lastTurnCommitted: "\u4E0A\u8F6E\u5BF9\u8BDD\u5DF2\u63D0\u4EA4\u6216\u8FD8\u539F\u3002",
  diffTooLargeTitle: "\u5DEE\u5F02\u8FC7\u5927\uFF0C\u65E0\u6CD5\u663E\u793A",
  diffTooLargeDescription: "\u6253\u5F00\u6587\u4EF6\u4EE5\u76F4\u63A5\u5BA1\u9605\u66F4\u6539\u3002",
  loading: "\u6B63\u5728\u52A0\u8F7D\u5DEE\u5F02",
  refreshing: "\u6B63\u5728\u5237\u65B0\u66F4\u6539",
  refresh: "\u5237\u65B0",
  moreOptions: "\u67E5\u770B\u9009\u9879",
  wrapOn: "\u7981\u7528\u81EA\u52A8\u6362\u884C",
  wrapOff: "\u542F\u7528\u81EA\u52A8\u6362\u884C",
  collapseAll: "\u6298\u53E0\u5168\u90E8\u5DEE\u5F02",
  expandAll: "\u5C55\u5F00\u5168\u90E8\u5DEE\u5F02",
  hideWhitespace: "\u9690\u85CF\u7A7A\u767D\u5B57\u7B26",
  showWhitespace: "\u663E\u793A\u7A7A\u767D\u5B57\u7B26",
  wordDiffOn: "\u7981\u7528\u6587\u5B57\u5DEE\u5F02",
  wordDiffOff: "\u542F\u7528\u6587\u5B57\u5DEE\u5F02",
  fullOn: "\u4E0D\u52A0\u8F7D\u5B8C\u6574\u6587\u4EF6",
  fullOff: "\u52A0\u8F7D\u5B8C\u6574\u6587\u4EF6",
  richOn: "\u7981\u7528\u5BCC\u6587\u672C\u9884\u89C8",
  richOff: "\u542F\u7528\u5BCC\u6587\u672C\u9884\u89C8",
  copyApply: "\u590D\u5236 git apply \u547D\u4EE4",
  copiedApply: "\u5DF2\u5C06 git apply \u547D\u4EE4\u590D\u5236\u5230\u526A\u8D34\u677F",
  split: "\u5207\u6362\u5230\u62C6\u5206\u5DEE\u5F02\u89C6\u56FE",
  unified: "\u5207\u6362\u5230\u7EDF\u4E00\u5DEE\u5F02\u89C6\u56FE",
  hideFiles: "\u9690\u85CF\u6587\u4EF6",
  showFiles: "\u663E\u793A\u6587\u4EF6",
  jump: "\u8DF3\u8F6C\u5230\u6587\u4EF6",
  noMatch: "\u6CA1\u6709\u5339\u914D\u7684\u6587\u4EF6",
  searchFiles: "\u7B5B\u9009\u6587\u4EF6",
  stageAll: "\u6682\u5B58\u5168\u90E8",
  unstageAll: "\u5BF9\u5168\u90E8\u53D6\u6D88\u6682\u5B58",
  revertAll: "\u8FD8\u539F\u5168\u90E8",
  stageFile: "\u6682\u5B58\u6587\u4EF6",
  unstageFile: "\u5BF9\u6587\u4EF6\u53D6\u6D88\u6682\u5B58",
  revertFile: "\u8FD8\u539F\u6587\u4EF6",
  stageHunk: "\u6682\u5B58",
  unstageHunk: "\u53D6\u6D88\u6682\u5B58",
  revertHunk: "\u8FD8\u539F",
  viewed: "\u5DF2\u67E5\u770B",
  markViewed: "\u5C06\u6587\u4EF6\u6807\u8BB0\u4E3A\u5DF2\u67E5\u770B",
  markUnviewed: "\u5C06\u6587\u4EF6\u6807\u8BB0\u4E3A\u672A\u67E5\u770B",
  openFile: "\u5728\u6807\u7B7E\u9875\u4E2D\u6253\u5F00\u6587\u4EF6",
  revertTitle: "\u662F\u5426\u8FD8\u539F\u66F4\u6539\uFF1F",
  revertMessage: "\u6B64\u64CD\u4F5C\u5C06\u64A4\u9500\u6240\u6709\u8FD9\u4E9B\u66F4\u6539\u3002",
  dontAsk: "\u4E0D\u518D\u8BE2\u95EE",
  cancel: "\u53D6\u6D88",
  confirm: "\u786E\u8BA4",
  commitOrPush: "\u63D0\u4EA4\u6216\u63A8\u9001",
  commitTo: "\u63D0\u4EA4\u5230",
  commitMessage: "\u63D0\u4EA4\u6D88\u606F",
  commitPlaceholder: "\u63D0\u4EA4\u4FE1\u606F\uFF08\u7559\u7A7A\u5C06\u81EA\u52A8\u751F\u6210\uFF09\u2026",
  includeUnstaged: "\u5305\u542B\u672A\u6682\u5B58\u7684\u66F4\u6539",
  commitAndPush: "\u63D0\u4EA4\u5E76\u63A8\u9001",
  push: "\u63A8\u9001",
  pushing: "\u6B63\u5728\u63A8\u9001\u66F4\u6539\u2026",
  committing: "\u6B63\u5728\u63D0\u4EA4\u2026",
  nothingToCommit: "\u65E0\u53EF\u63D0\u4EA4\u7684\u66F4\u6539",
  committed: "\u5DF2\u63D0\u4EA4\u5230 {branch}",
  pushed: "\u5DF2\u63A8\u9001 {branch}",
  commitFailed: "\u65E0\u6CD5\u63D0\u4EA4\u66F4\u6539",
  pushFailed: "\u65E0\u6CD5\u63A8\u9001\u53D8\u66F4",
  createPr: "\u521B\u5EFA\u62C9\u53D6\u8BF7\u6C42",
  creatingPr: "\u6B63\u5728\u521B\u5EFA PR\u2026",
  prTitle: "\u62C9\u53D6\u8BF7\u6C42\u6807\u9898",
  prCreated: "\u5DF2\u521B\u5EFA\u62C9\u53D6\u8BF7\u6C42",
  installGh: "\u5B89\u88C5 GitHub CLI (gh) \u4EE5\u521B\u5EFA PR",
  comment: "\u6CE8\u91CA",
  commentPlaceholder: "\u6DFB\u52A0\u8BC4\u8BBA\u2026",
  save: "\u4FDD\u5B58",
  delete: "\u5220\u9664",
  localAuthor: "\u672C\u5730\u8BC4\u8BBA",
  findingAuthor: "Codex",
  dismiss: "\u5FFD\u7565",
  sendComments: "\u5904\u7406\u884C\u5185\u8BC4\u8BBA",
  sendCommentsHint: "\u628A\u884C\u5185\u8BC4\u8BBA\u53D1\u7ED9\u5F53\u524D\u4F1A\u8BDD\uFF0C\u5E76\u4FDD\u6301\u6539\u52A8\u8303\u56F4\u6700\u5C0F",
  commentsQueued: "\u5DF2\u628A\u884C\u5185\u8BC4\u8BBA\u4EA4\u7ED9\u5F53\u524D\u4F1A\u8BDD",
  commentsCopied: "\u65E0\u6CD5\u76F4\u63A5\u53D1\u9001\uFF0C\u5185\u5BB9\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
  reviewTitle: "\u4EE3\u7801\u5BA1\u67E5",
  reviewDescription: "\u5BA1\u67E5\u672A\u6682\u5B58\u7684\u66F4\u6539\uFF0C\u6216\u4E0E\u67D0\u4E2A\u5206\u652F\u8FDB\u884C\u6BD4\u8F83",
  reviewUncommitted: "\u5BA1\u67E5\u672A\u63D0\u4EA4\u7684\u66F4\u6539",
  reviewBranch: "\u57FA\u4E8E\u57FA\u7840\u5206\u652F\u8FDB\u884C\u5BA1\u67E5",
  reviewCommit: "\u5BA1\u67E5\u67D0\u4E2A\u63D0\u4EA4",
  reviewCustom: "\u81EA\u5B9A\u4E49\u8981\u6C42",
  reviewCustomPlaceholder: "\u5173\u6CE8\u884C\u4E3A\u56DE\u5F52\u3001\u7F3A\u6D4B\u8BD5\u7684\u8FB9\u754C\uFF0C\u4EE5\u53CA\u8D85\u51FA\u4EFB\u52A1\u8303\u56F4\u7684\u6539\u52A8",
  startReview: "\u5F00\u59CB\u5BA1\u67E5",
  reviewQueued: "\u5DF2\u628A\u5BA1\u67E5\u8BF7\u6C42\u4EA4\u7ED9\u5F53\u524D\u4F1A\u8BDD",
  selectBase: "\u9009\u62E9\u5206\u652F",
  commitsEmpty: "\u5206\u652F\u4E0A\u6682\u65E0\u63D0\u4EA4\u8BB0\u5F55",
  commitsLoading: "\u6B63\u5728\u52A0\u8F7D\u63D0\u4EA4\u2026",
  commitsError: "\u65E0\u6CD5\u52A0\u8F7D\u63D0\u4EA4\u8BB0\u5F55",
  retry: "\u91CD\u8BD5",
  binary: "\u4E8C\u8FDB\u5236\u6587\u4EF6\uFF0C\u65E0\u6CD5\u663E\u793A\u5DEE\u5F02",
  mergeConflict: "\u6587\u4EF6\u6709\u5408\u5E76\u51B2\u7A81",
  loadFailed: "\u91CD\u8BD5\u540E\u4ECD\u65E0\u6CD5\u52A0\u8F7D\u5DEE\u5F02",
  missingCwd: "\u627E\u4E0D\u5230\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u5DE5\u4F5C\u76EE\u5F55",
  missingCwdDescription: "\u5728\u4F1A\u8BDD\u91CC\u6253\u5F00\u4E00\u4E2A\u9879\u76EE\u540E\uFF0C\u66F4\u6539\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002",
  repo: "\u4ED3\u5E93",
  changedFiles: "\u66F4\u6539\u7684\u6587\u4EF6",
  ago: "\u524D",
  yourBranch: "\u4F60\u7684\u5206\u652F",
  copyPath: "\u590D\u5236\u8DEF\u5F84",
  readOnly: "\u8FD9\u4E2A\u8303\u56F4\u662F\u53EA\u8BFB\u7684",
  previewBanner: "\u9884\u89C8\u91CC\u7684\u5BA1\u67E5\u9762\u677F\u548C\u88C5\u8FDB DSH \u540E\u662F\u540C\u4E00\u5957\u3002Git \u64CD\u4F5C\u4F5C\u7528\u5728\u6F14\u793A\u4ED3\u5E93\u4E0A\u3002",
  commandHint: "\u9009\u62E9\u5BA1\u67E5\u8303\u56F4\u3002\u4E5F\u53EF\u4EE5\u8F93\u5165 /review uncommitted\u3001/review branch main\u3001/review commit <sha>\uFF0C\u6216 /review \u540E\u63A5\u4F60\u7684\u8981\u6C42\u3002"
};
var en = {
  tab: "Review",
  tabDescription: "Inspect diffs, stage or revert changes, and leave inline comments",
  openReview: "Review",
  unstaged: "Unstaged",
  staged: "Staged",
  commit: "Commit",
  branch: "Branch",
  lastTurn: "Last turn",
  cloud: "Cloud changes",
  viewBranchDiff: "View branch diff",
  noDiff: "No file changes yet",
  noDiffDescription: "Changes in this project will appear here.",
  gitRequiredTitle: "Create a Git repository",
  gitRequiredDescription: "Track, review, and undo changes in this project.",
  createRepo: "Create git repository",
  creatingRepo: "Creating\u2026",
  gitInitError: "Git init failed: {message}",
  noStagedTitle: "No staged changes",
  noStagedDescription: "Accept edits to stage them",
  noUnstagedTitle: "No unstaged changes",
  noUnstagedDescription: "Code changes will appear here",
  lastTurnMissing: "The latest diffs are no longer available.",
  lastTurnCommitted: "The last turn was committed or reverted.",
  diffTooLargeTitle: "Diff too large to display",
  diffTooLargeDescription: "Open the file to review changes directly.",
  loading: "Loading diff",
  refreshing: "Refreshing changes",
  refresh: "Refresh",
  moreOptions: "Review options",
  wrapOn: "Disable word wrap",
  wrapOff: "Enable word wrap",
  collapseAll: "Collapse all diffs",
  expandAll: "Expand all diffs",
  hideWhitespace: "Hide whitespace",
  showWhitespace: "Show whitespace",
  wordDiffOn: "Disable word diffs",
  wordDiffOff: "Enable word diffs",
  fullOn: "Don\u2019t load full files",
  fullOff: "Load full files",
  richOn: "Disable rich preview",
  richOff: "Enable rich preview",
  copyApply: "Copy git apply command",
  copiedApply: "Copied git apply command to the clipboard",
  split: "Switch to split diff",
  unified: "Switch to unified diff",
  hideFiles: "Hide files",
  showFiles: "Show files",
  jump: "Jump to file",
  noMatch: "No matching files",
  searchFiles: "Filter files",
  stageAll: "Stage all",
  unstageAll: "Unstage all",
  revertAll: "Revert all",
  stageFile: "Stage file",
  unstageFile: "Unstage file",
  revertFile: "Revert file",
  stageHunk: "Stage",
  unstageHunk: "Unstage",
  revertHunk: "Revert",
  viewed: "Viewed",
  markViewed: "Mark file as viewed",
  markUnviewed: "Mark file as unviewed",
  openFile: "Open file in a tab",
  revertTitle: "Revert changes?",
  revertMessage: "This action removes all of these changes.",
  dontAsk: "Don't ask again",
  cancel: "Cancel",
  confirm: "Confirm",
  commitOrPush: "Commit or push",
  commitTo: "Commit to",
  commitMessage: "Commit message",
  commitPlaceholder: "Commit message (leave empty to autogenerate)\u2026",
  includeUnstaged: "Include unstaged changes",
  commitAndPush: "Commit and push",
  push: "Push",
  pushing: "Pushing changes\u2026",
  committing: "Committing\u2026",
  nothingToCommit: "No changes to commit",
  committed: "Committed to {branch}",
  pushed: "Pushed {branch}",
  commitFailed: "Failed to commit changes",
  pushFailed: "Failed to push changes",
  createPr: "Create pull request",
  creatingPr: "Creating PR\u2026",
  prTitle: "Pull request title",
  prCreated: "Pull request created",
  installGh: "Install the GitHub CLI (gh) to create a PR",
  comment: "Comment",
  commentPlaceholder: "Add a comment\u2026",
  save: "Save",
  delete: "Delete",
  localAuthor: "Local comment",
  findingAuthor: "Codex",
  dismiss: "Dismiss",
  sendComments: "Address inline comments",
  sendCommentsHint: "Send the inline comments to the current chat and keep the scope minimal",
  commentsQueued: "Sent the inline comments to the current chat",
  commentsCopied: "Could not send directly. Copied the request to the clipboard",
  reviewTitle: "Code review",
  reviewDescription: "Review unstaged changes, or compare against a branch",
  reviewUncommitted: "Review uncommitted changes",
  reviewBranch: "Review against a base branch",
  reviewCommit: "Review a commit",
  reviewCustom: "Custom instructions",
  reviewCustomPlaceholder: "Focus on behavior regressions, missing edge-case tests, and out-of-scope edits",
  startReview: "Start review",
  reviewQueued: "Sent the review request to the current chat",
  selectBase: "Choose branch",
  commitsEmpty: "No commits on this branch yet",
  commitsLoading: "Loading commits\u2026",
  commitsError: "Could not load commits",
  retry: "Retry",
  binary: "Binary file, no diff to display",
  mergeConflict: "File has merge conflicts",
  loadFailed: "Could not load the diff",
  missingCwd: "No workspace for this session",
  missingCwdDescription: "Open a project in the session and changes will show up here.",
  repo: "Repository",
  changedFiles: "Changed files",
  ago: "ago",
  yourBranch: "your branch",
  copyPath: "Copy path",
  readOnly: "This scope is read-only",
  previewBanner: "This is the same review pane the DSH plugin mounts. Git actions run against the demo repository.",
  commandHint: "Choose a review scope. You can also run /review uncommitted, /review branch main, /review commit <sha>, or /review followed by your own instructions."
};
function detectLang() {
  if (typeof document === "undefined") return "zh";
  const html = document.documentElement.lang.toLowerCase();
  if (html.startsWith("en")) return "en";
  if (html.startsWith("zh")) return "zh";
  const nav = typeof navigator === "undefined" ? "" : navigator.language.toLowerCase();
  return nav.startsWith("en") ? "en" : "zh";
}
function translate(lang, key, values) {
  const template = (lang === "en" ? en : zh)[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

// src/client/pane.tsx
var import_react2 = __toESM(require("react"), 1);

// src/client/diff-view.tsx
var import_react = __toESM(require("react"), 1);

// src/review/word-diff.ts
var TOKEN = /(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]+)/g;
function wordDiff(before, after) {
  const left = tokenize(before);
  const right = tokenize(after);
  const lcs = longestCommon(left, right);
  const beforeTokens = [];
  const afterTokens = [];
  let i = 0;
  let j = 0;
  for (const token of lcs) {
    while (i < left.length && left[i] !== token) {
      beforeTokens.push({ text: left[i] ?? "", changed: true });
      i += 1;
    }
    while (j < right.length && right[j] !== token) {
      afterTokens.push({ text: right[j] ?? "", changed: true });
      j += 1;
    }
    beforeTokens.push({ text: token, changed: false });
    afterTokens.push({ text: token, changed: false });
    i += 1;
    j += 1;
  }
  while (i < left.length) {
    beforeTokens.push({ text: left[i] ?? "", changed: true });
    i += 1;
  }
  while (j < right.length) {
    afterTokens.push({ text: right[j] ?? "", changed: true });
    j += 1;
  }
  return { before: beforeTokens, after: afterTokens };
}
function tokenize(value) {
  return value.match(TOKEN) ?? [];
}
function longestCommon(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const scores = new Array(rows * cols).fill(0);
  const at = (row2, col2) => row2 * cols + col2;
  for (let row2 = 1; row2 < rows; row2 += 1) {
    for (let col2 = 1; col2 < cols; col2 += 1) {
      if (left[row2 - 1] === right[col2 - 1]) scores[at(row2, col2)] = (scores[at(row2 - 1, col2 - 1)] ?? 0) + 1;
      else scores[at(row2, col2)] = Math.max(scores[at(row2 - 1, col2)] ?? 0, scores[at(row2, col2 - 1)] ?? 0);
    }
  }
  const out = [];
  let row = left.length;
  let col = right.length;
  while (row > 0 && col > 0) {
    if (left[row - 1] === right[col - 1]) {
      out.push(left[row - 1] ?? "");
      row -= 1;
      col -= 1;
    } else if ((scores[at(row - 1, col)] ?? 0) >= (scores[at(row, col - 1)] ?? 0)) row -= 1;
    else col -= 1;
  }
  return out.reverse();
}
function pairChangedLines(lines) {
  const pairs = /* @__PURE__ */ new Map();
  let index = 0;
  while (index < lines.length) {
    if (lines[index]?.kind !== "del") {
      index += 1;
      continue;
    }
    const delStart = index;
    while (index < lines.length && lines[index]?.kind === "del") index += 1;
    const addStart = index;
    while (index < lines.length && lines[index]?.kind === "add") index += 1;
    const delCount = addStart - delStart;
    const addCount = index - addStart;
    const count = Math.min(delCount, addCount);
    for (let offset = 0; offset < count; offset += 1) pairs.set(delStart + offset, addStart + offset);
  }
  return pairs;
}

// src/client/diff-view.tsx
function DiffList(props) {
  return /* @__PURE__ */ import_react.default.createElement("div", { className: props.diffMode === "split" ? "cxr-split" : void 0 }, props.files.map((file) => /* @__PURE__ */ import_react.default.createElement(FileCard, { key: file.path, file, ...props })));
}
function FileCard(props) {
  const { file, lang } = props;
  const t = (key) => translate(lang, key);
  const expanded = props.open[file.path] ?? true;
  const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
  const name = file.path.slice(dir.length ? dir.length + 1 : 0);
  const actionable = props.gitActions && file.status !== "unmerged" && !props.busy;
  const viewed = props.viewed[file.path] === true;
  return /* @__PURE__ */ import_react.default.createElement("article", { className: "cxr-file", "data-review-path": file.path }, /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-file-head", onClick: () => props.onToggle(file.path) }, /* @__PURE__ */ import_react.default.createElement("span", { "aria-hidden": "true" }, expanded ? "\u25BE" : "\u25B8"), /* @__PURE__ */ import_react.default.createElement("span", { className: `cxr-status ${file.status === "deleted" ? "cxr-del" : "cxr-add"}` }, statusGlyph(file.status)), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      className: "cxr-file-name",
      title: t("openFile"),
      onClick: (event) => {
        event.stopPropagation();
        props.onOpenFile(file.path, firstLine(file));
      }
    },
    name
  ), dir ? /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-file-dir" }, dir) : null, /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-stats" }, file.additions ? /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-add" }, "+", file.additions) : null, file.deletions ? /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-del" }, "\u2212", file.deletions) : null), /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-file-actions", onClick: (event) => event.stopPropagation() }, props.filter === "branch" ? /* @__PURE__ */ import_react.default.createElement("label", { className: "cxr-check", title: viewed ? t("markUnviewed") : t("markViewed") }, /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: viewed, onChange: (event) => props.onViewed(file.path, event.target.checked) }), /* @__PURE__ */ import_react.default.createElement("span", null, t("viewed"))) : null, actionable ? /* @__PURE__ */ import_react.default.createElement(FileActions, { lang, filter: props.filter, onAction: (action) => props.onAction(action, "file", file.path) }) : null)), expanded ? /* @__PURE__ */ import_react.default.createElement(FileBody, { ...props, file, actionable }) : null);
}
function FileActions({ lang, filter, onAction }) {
  const t = (key) => translate(lang, key);
  const staged = filter === "staged";
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => onAction(staged ? "unstage" : "stage") }, staged ? t("unstageFile") : t("stageFile")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn cxr-danger", onClick: () => onAction("revert") }, t("revertFile")));
}
function FileBody(props) {
  const { file, lang } = props;
  const t = (key) => translate(lang, key);
  if (file.status === "unmerged") return /* @__PURE__ */ import_react.default.createElement("p", { className: "cxr-rich" }, t("mergeConflict"));
  if (file.binary) return /* @__PURE__ */ import_react.default.createElement("p", { className: "cxr-rich" }, t("binary"));
  if (file.tooLarge) {
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-empty" }, /* @__PURE__ */ import_react.default.createElement("h2", null, t("diffTooLargeTitle")), /* @__PURE__ */ import_react.default.createElement("p", null, t("diffTooLargeDescription")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn cxr-primary", onClick: () => props.onOpenFile(file.path) }, t("openFile")));
  }
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, props.rich ? /* @__PURE__ */ import_react.default.createElement(RichPreview, { lang, file, root: props.root, fileUrl: props.fileUrl }) : null, file.hunks.map((hunk) => /* @__PURE__ */ import_react.default.createElement(HunkView, { key: hunk.header, hunk, ...props })));
}
function RichPreview({ file, root, fileUrl }) {
  const ext = file.path.split(".").pop()?.toLowerCase() ?? "";
  if (!root || file.status === "deleted") return null;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    const url = fileUrl(root, file.path);
    if (!url) return null;
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-rich" }, /* @__PURE__ */ import_react.default.createElement("img", { src: url, alt: file.path }));
  }
  if (ext === "md" || ext === "markdown") {
    const text = file.hunks.flatMap((hunk) => hunk.lines.filter((line) => line.kind !== "del").map((line) => line.text)).join("\n");
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-rich" }, /* @__PURE__ */ import_react.default.createElement("pre", null, text));
  }
  return null;
}
function HunkView(props) {
  const { hunk, lang, file } = props;
  const t = (key) => translate(lang, key);
  const staged = props.filter === "staged";
  const pairs = (0, import_react.useMemo)(() => pairChangedLines(hunk.lines), [hunk]);
  return /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-hunk-head" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-hunk-label" }, hunk.header, hunk.section ? ` ${hunk.section}` : ""), props.actionable ? /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-hunk-actions" }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => props.onAction(staged ? "unstage" : "stage", "hunk", file.path, hunk.header) }, staged ? t("unstageHunk") : t("stageHunk")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn cxr-danger", onClick: () => props.onAction("revert", "hunk", file.path, hunk.header) }, t("revertHunk"))) : /* @__PURE__ */ import_react.default.createElement("span", null)), props.diffMode === "split" ? splitRows(hunk.lines).map((row, index) => /* @__PURE__ */ import_react.default.createElement(SplitLine, { key: index, ...props, row, pairs })) : hunk.lines.map((line, index) => /* @__PURE__ */ import_react.default.createElement(UnifiedLine, { key: index, ...props, line, index, pairs })));
}
function UnifiedLine(props) {
  const pairIndex = props.line.kind === "del" ? props.pairs.get(props.index) : pairBack(props.pairs, props.index);
  const other = pairIndex == null ? null : props.hunk.lines[pairIndex];
  const tokens = props.wordDiffs && other && props.line.kind !== "context" ? props.line.kind === "del" ? wordDiff(props.line.text, other.text).before : wordDiff(other.text, props.line.text).after : null;
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement(
    LineShell,
    {
      lang: props.lang,
      kind: props.line.kind,
      oldNo: props.line.oldNo,
      newNo: props.line.newNo,
      text: props.line.text,
      tokens,
      onOpen: (line) => props.onOpenFile(props.file.path, line),
      onComment: (side, line) => props.onComment(draft(props.file.path, side, line, ""))
    }
  ), /* @__PURE__ */ import_react.default.createElement(Annotations, { ...props, side: props.line.kind === "del" ? "old" : "new", lineNo: props.line.kind === "del" ? props.line.oldNo : props.line.newNo }));
}
function SplitLine(props) {
  const left = props.row.left;
  const right = props.row.right;
  const tokens = props.wordDiffs && left && right && left.kind !== "context" ? wordDiff(left.text, right.text) : null;
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-line", "data-kind": left?.kind === "del" ? "del" : right?.kind === "add" ? "add" : "context" }, /* @__PURE__ */ import_react.default.createElement(Plus, { lang: props.lang, line: left, onComment: (side, line) => props.onComment(draft(props.file.path, side, line, "")) }), /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-num" }, left?.oldNo ?? ""), /* @__PURE__ */ import_react.default.createElement("code", { className: "cxr-code", onClick: (event) => clickLine(event, left?.oldNo ?? left?.newNo ?? void 0, props) }, tokens ? /* @__PURE__ */ import_react.default.createElement(Tokens, { tokens: tokens.before }) : left?.text), /* @__PURE__ */ import_react.default.createElement(Plus, { lang: props.lang, line: right, onComment: (side, line) => props.onComment(draft(props.file.path, side, line, "")) }), /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-num" }, right?.newNo ?? ""), /* @__PURE__ */ import_react.default.createElement("code", { className: "cxr-code", onClick: (event) => clickLine(event, right?.newNo ?? void 0, props) }, tokens ? /* @__PURE__ */ import_react.default.createElement(Tokens, { tokens: tokens.after }) : right?.text)), /* @__PURE__ */ import_react.default.createElement(Annotations, { ...props, side: "new", lineNo: right?.newNo ?? null }));
}
function LineShell({ lang, kind, oldNo, newNo, text, tokens, onOpen, onComment }) {
  const line = kind === "del" ? oldNo : newNo;
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-line", "data-kind": kind }, /* @__PURE__ */ import_react.default.createElement(Plus, { lang, line: { kind, text, oldNo, newNo }, onComment }), /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-num" }, oldNo ?? ""), /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-num" }, newNo ?? ""), /* @__PURE__ */ import_react.default.createElement(
    "code",
    {
      className: "cxr-code",
      onClick: (event) => {
        if ((event.metaKey || event.ctrlKey) && line) onOpen(line);
      }
    },
    tokens ? /* @__PURE__ */ import_react.default.createElement(Tokens, { tokens }) : text
  ));
}
function Plus({ lang, line, onComment }) {
  if (!line) return /* @__PURE__ */ import_react.default.createElement("span", null);
  const side = line.kind === "del" ? "old" : "new";
  const number = side === "old" ? line.oldNo : line.newNo;
  if (!number) return /* @__PURE__ */ import_react.default.createElement("span", null);
  return /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      type: "button",
      className: "cxr-plus",
      "aria-label": translate(lang, "comment"),
      onClick: () => onComment(side, number)
    },
    "+"
  );
}
function Tokens({ tokens }) {
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, tokens.map((token, index) => token.changed ? /* @__PURE__ */ import_react.default.createElement("mark", { key: index, className: "cxr-word" }, token.text) : /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, { key: index }, token.text)));
}
function Annotations(props) {
  const lineNo = props.lineNo;
  if (!lineNo) return null;
  const comments = props.comments.filter((comment) => comment.path === props.file.path && comment.line === lineNo && comment.side === props.side);
  const findings = props.findings.filter((finding) => !props.dismissed.includes(finding.id) && finding.path === props.file.path && finding.line === lineNo && finding.side === props.side);
  const draft2 = comments.find((comment) => comment.text === "");
  return /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, findings.map((finding) => /* @__PURE__ */ import_react.default.createElement("aside", { key: finding.id, className: "cxr-finding" }, /* @__PURE__ */ import_react.default.createElement("header", null, /* @__PURE__ */ import_react.default.createElement("span", { className: "cxr-priority" }, finding.priority), /* @__PURE__ */ import_react.default.createElement("strong", null, finding.title), /* @__PURE__ */ import_react.default.createElement("span", null, translate(props.lang, "findingAuthor")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => props.onDismiss(finding.id) }, translate(props.lang, "dismiss"))), finding.body ? /* @__PURE__ */ import_react.default.createElement("p", null, finding.body) : null)), comments.filter((comment) => comment.text !== "").map((comment) => /* @__PURE__ */ import_react.default.createElement("aside", { key: comment.id, className: "cxr-comment" }, /* @__PURE__ */ import_react.default.createElement("header", null, /* @__PURE__ */ import_react.default.createElement("strong", null, translate(props.lang, "localAuthor")), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => props.onDeleteComment(comment.id) }, translate(props.lang, "delete"))), /* @__PURE__ */ import_react.default.createElement("p", null, comment.text))), draft2 ? /* @__PURE__ */ import_react.default.createElement(CommentEditor, { lang: props.lang, comment: draft2, onComment: props.onComment, onDeleteComment: props.onDeleteComment }) : null);
}
function CommentEditor({ lang, comment, onComment, onDeleteComment }) {
  const [text, setText] = (0, import_react.useState)(comment.text);
  return /* @__PURE__ */ import_react.default.createElement(
    "form",
    {
      className: "cxr-comment",
      onSubmit: (event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onComment({ ...comment, text: text.trim() });
      }
    },
    /* @__PURE__ */ import_react.default.createElement("textarea", { className: "cxr-textarea", rows: 3, autoFocus: true, placeholder: translate(lang, "commentPlaceholder"), value: text, onChange: (event) => setText(event.target.value) }),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "cxr-dialog-actions" }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => onDeleteComment(comment.id) }, translate(lang, "cancel")), /* @__PURE__ */ import_react.default.createElement("button", { type: "submit", className: "cxr-btn cxr-primary", disabled: !text.trim() }, translate(lang, "save")))
  );
}
function draft(path, side, line, text) {
  return { id: `${path}:${side}:${line}:${Date.now()}`, path, side, line, text };
}
function pairBack(pairs, addIndex) {
  for (const [delIndex, mapped] of pairs) if (mapped === addIndex) return delIndex;
  return null;
}
function splitRows(lines) {
  const rows = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line || line.kind === "context") {
      rows.push({ left: line ?? null, right: line ?? null });
      index += 1;
      continue;
    }
    const dels = [];
    const adds = [];
    while (index < lines.length && lines[index]?.kind === "del") {
      const current = lines[index];
      if (current) dels.push(current);
      index += 1;
    }
    while (index < lines.length && lines[index]?.kind === "add") {
      const current = lines[index];
      if (current) adds.push(current);
      index += 1;
    }
    const count = Math.max(dels.length, adds.length);
    for (let offset = 0; offset < count; offset += 1) rows.push({ left: dels[offset] ?? null, right: adds[offset] ?? null });
  }
  return rows;
}
function clickLine(event, line, props) {
  if ((event.metaKey || event.ctrlKey) && line) props.onOpenFile(props.file.path, line);
}
function firstLine(file) {
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.kind === "add" && line.newNo) return line.newNo;
    }
  }
  return file.hunks[0]?.newStart || file.hunks[0]?.oldStart || 1;
}
function statusGlyph(status) {
  if (status === "added" || status === "untracked") return "A";
  if (status === "deleted") return "D";
  if (status === "renamed" || status === "copied") return "R";
  if (status === "unmerged") return "U";
  return "M";
}

// src/client/styles.ts
var reviewCss = `
.cxr {
  --cxr-fg: var(--dsw-alias-text-primary, var(--dsh-text-primary, #ececec));
  --cxr-muted: var(--dsw-alias-text-tertiary, var(--dsh-text-secondary, #9b9ba4));
  --cxr-border: var(--dsw-alias-border-subtle, rgba(255, 255, 255, 0.1));
  --cxr-hover: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
  --cxr-panel: var(--dsw-alias-bg-elevated, rgba(18, 18, 20, 0.92));
  --cxr-add: #3fb950;
  --cxr-del: #f85149;
  --cxr-add-bg: color-mix(in srgb, var(--cxr-add) 24%, transparent);
  --cxr-del-bg: color-mix(in srgb, var(--cxr-del) 24%, transparent);
  --cxr-word: color-mix(in srgb, var(--cxr-add) 45%, transparent);
  --cxr-word-del: color-mix(in srgb, var(--cxr-del) 45%, transparent);
  --cxr-on-solid: #161616;
  --cxr-sans: var(--dsw-font-sans, ui-sans-serif, system-ui, sans-serif);
  --cxr-mono: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  color: var(--cxr-fg);
  background: var(--dsw-alias-bg-base, var(--dsh-bg-base, #161616));
  font-family: var(--cxr-sans);
  font-size: 13px;
  line-height: 1.45;
}
@media (prefers-color-scheme: light) {
  .cxr {
    --cxr-fg: var(--dsw-alias-text-primary, var(--dsh-text-primary, #1f2328));
    --cxr-muted: var(--dsw-alias-text-tertiary, var(--dsh-text-secondary, #656d76));
    --cxr-border: var(--dsw-alias-border-subtle, rgba(0, 0, 0, 0.12));
    --cxr-hover: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
    --cxr-panel: var(--dsw-alias-bg-elevated, #ffffff);
    --cxr-add: #1a7f37;
    --cxr-del: #cf222e;
    --cxr-on-solid: #ffffff;
    background: var(--dsw-alias-bg-base, var(--dsh-bg-base, #ffffff));
  }
}
.cxr * { box-sizing: border-box; }
.cxr button, .cxr input, .cxr textarea { font: inherit; }
.cxr button { cursor: pointer; }
.cxr button:disabled { cursor: default; opacity: 0.45; }
.cxr-header {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 36px;
  padding: 4px 8px;
  border-bottom: 0.5px solid var(--cxr-border);
}
.cxr-header-row, .cxr-tools, .cxr-source, .cxr-source-meta { display: flex; align-items: center; min-width: 0; gap: 4px; }
.cxr-header-row { justify-content: space-between; }
.cxr-source { flex: 1; overflow: visible; }
.cxr-source-meta { flex: 1; overflow: hidden; }
.cxr-tools { flex: 0 0 auto; }
.cxr-btn, .cxr-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--cxr-muted);
}
.cxr-icon-btn { width: 28px; padding: 0; }
.cxr-btn:hover, .cxr-icon-btn:hover, .cxr-menu-item:hover, .cxr-tree-row:hover { background: var(--cxr-hover); color: var(--cxr-fg); }
.cxr-btn[data-active="1"], .cxr-icon-btn[data-active="1"] { background: var(--cxr-hover); color: var(--cxr-fg); }
.cxr-btn:focus-visible, .cxr-icon-btn:focus-visible, .cxr-menu-item:focus-visible, .cxr-line:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--cxr-fg) 55%, transparent);
  outline-offset: 1px;
}
.cxr-badge {
  display: inline-flex;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--cxr-hover);
  font-size: 11px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}
.cxr-stats { display: inline-flex; gap: 6px; font-family: var(--cxr-mono); font-size: 12px; font-variant-numeric: tabular-nums; }
.cxr-add { color: var(--cxr-add); }
.cxr-del { color: var(--cxr-del); }
.cxr-menu {
  position: absolute;
  z-index: 20;
  min-width: 220px;
  max-width: min(360px, 80vw);
  max-height: 320px;
  overflow: auto;
  padding: 4px;
  border: 0;
  border-radius: 12px;
  background: var(--cxr-panel);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
}
.cxr-menu-item, .cxr-tree-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
}
.cxr-menu-item span:first-child { flex: 1; min-width: 0; }
.cxr-sep { height: 0.5px; margin: 4px 6px; background: var(--cxr-border); }
.cxr-branch-row { display: flex; align-items: center; gap: 4px; min-width: 0; padding: 0 2px 2px; color: var(--cxr-muted); }
.cxr-subject { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--cxr-muted); }
.cxr-body { display: flex; flex: 1 1 auto; min-height: 0; min-width: 0; }
.cxr-diffs { position: relative; flex: 1; min-width: 0; overflow: auto; }
.cxr-tree {
  display: flex;
  flex-direction: column;
  width: var(--cxr-tree-width, 248px);
  min-width: 180px;
  max-width: 420px;
  border-left: 0.5px solid var(--cxr-border);
  min-height: 0;
}
.cxr-resizer { width: 4px; cursor: col-resize; margin-left: -2px; }
.cxr-tree-search { padding: 8px 8px 4px; }
.cxr-input, .cxr-textarea {
  width: 100%;
  border: 0.5px solid var(--cxr-border);
  border-radius: 8px;
  background: transparent;
  padding: 6px 8px;
  outline: none;
}
.cxr-input:focus, .cxr-textarea:focus { border-color: color-mix(in srgb, var(--cxr-fg) 40%, transparent); }
.cxr-tree-scroll { overflow: auto; padding: 4px 6px 24px; }
.cxr-tree-row[data-active="1"] { background: var(--cxr-hover); color: var(--cxr-fg); }
.cxr-tree-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cxr-dir { color: var(--cxr-muted); font-size: 12px; }
.cxr-empty {
  display: flex;
  height: 100%;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  text-align: center;
}
.cxr-empty h2 { margin: 8px 0 0; font-size: 16px; line-height: 1.3; font-weight: 600; }
.cxr-empty p { max-width: 360px; margin: 0; color: var(--cxr-muted); }
.cxr-illustration { color: var(--cxr-muted); }
.cxr-file { border-bottom: 0.5px solid var(--cxr-border); }
.cxr-file-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--cxr-panel) 88%, transparent);
  backdrop-filter: blur(8px);
}
.cxr-file-name { border: 0; background: transparent; padding: 0; font-weight: 600; }
.cxr-file-name:hover { text-decoration: underline; }
.cxr-file-dir { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--cxr-muted); font-family: var(--cxr-mono); font-size: 12px; }
.cxr-file-actions { margin-left: auto; display: flex; align-items: center; gap: 2px; }
.cxr-line {
  display: grid;
  grid-template-columns: 22px 52px 52px minmax(0, 1fr);
  align-items: start;
  font-family: var(--cxr-mono);
  font-size: 12px;
  line-height: 20px;
}
.cxr-hunk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 22px;
  padding: 0 8px;
  color: var(--cxr-muted);
  background: color-mix(in srgb, var(--cxr-hover) 65%, transparent);
  font-family: var(--cxr-mono);
  font-size: 12px;
  line-height: 20px;
}
.cxr-hunk-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cxr-hunk-actions { display: flex; flex: 0 0 auto; gap: 4px; }
.cxr-line[data-kind="add"] { background: var(--cxr-add-bg); }
.cxr-line[data-kind="del"] { background: var(--cxr-del-bg); }
.cxr-gutter, .cxr-num { color: var(--cxr-muted); text-align: right; user-select: none; padding: 0 6px; }
.cxr-code { white-space: pre; padding-right: 12px; }
.cxr[data-wrap="1"] .cxr-code { white-space: pre-wrap; overflow-wrap: anywhere; }
.cxr-word { border-radius: 2px; background: var(--cxr-word); }
.cxr-line[data-kind="del"] .cxr-word { background: var(--cxr-word-del); }
.cxr-plus {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 0;
  border-radius: 999px;
  background: var(--cxr-fg);
  color: var(--cxr-on-solid);
  opacity: 0;
  font-size: 12px;
  line-height: 16px;
}
.cxr-line:hover .cxr-plus, .cxr-plus:focus-visible { opacity: 1; }
.cxr-split .cxr-line { grid-template-columns: 22px 46px minmax(0, 1fr) 22px 46px minmax(0, 1fr); }
.cxr-comment, .cxr-finding {
  margin: 4px 8px 8px 74px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--cxr-hover);
}
.cxr-finding { border: 0.5px solid var(--cxr-border); }
.cxr-comment header, .cxr-finding header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px; }
.cxr-priority { font-weight: 700; color: var(--cxr-del); }
.cxr-pill {
  position: absolute;
  z-index: 5;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--cxr-panel) 92%, transparent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
}
.cxr-modal {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.35);
}
.cxr-dialog {
  width: min(440px, 100%);
  padding: 16px;
  border-radius: 14px;
  background: var(--cxr-panel);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
}
.cxr-dialog h2 { margin: 0 0 4px; font-size: 16px; }
.cxr-dialog p { margin: 0 0 12px; color: var(--cxr-muted); }
.cxr-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.cxr-danger { color: var(--cxr-del); }
.cxr-danger:hover { background: color-mix(in srgb, var(--cxr-del) 14%, transparent); color: var(--cxr-del); }
.cxr-primary { background: var(--cxr-fg); color: var(--cxr-on-solid); }
.cxr-primary:hover { background: color-mix(in srgb, var(--cxr-fg) 86%, var(--cxr-on-solid)); color: var(--cxr-on-solid); }
.cxr-check { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.cxr-toast {
  position: absolute;
  z-index: 40;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  max-width: min(420px, calc(100% - 24px));
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--cxr-panel);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}
.cxr-spinner { width: 12px; height: 12px; border: 1.5px solid var(--cxr-border); border-top-color: var(--cxr-fg); border-radius: 999px; animation: cxr-spin 0.8s linear infinite; }
@keyframes cxr-spin { to { transform: rotate(360deg); } }
.cxr-banner { padding: 6px 10px; color: var(--cxr-muted); background: var(--cxr-hover); font-size: 12px; }
.cxr-rich { padding: 10px 12px; border-bottom: 0.5px solid var(--cxr-border); }
.cxr-rich img { max-width: 100%; border-radius: 8px; }
.cxr-rich pre { white-space: pre-wrap; font-family: var(--cxr-sans); }
@container (max-width: 720px) {
  .cxr-commit-label, .cxr-file-dir { display: none; }
  .cxr-tree { position: absolute; z-index: 6; top: 0; right: 0; bottom: 0; background: var(--cxr-panel); }
}
.cxr-opener {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--cxr-muted);
  font-size: 12px;
  line-height: 22px;
}
.cxr-opener:hover { background: var(--cxr-hover); color: var(--cxr-fg); }
.cxr-choices { display: flex; flex-direction: column; gap: 6px; }
.cxr-status { width: 16px; text-align: center; font-family: var(--cxr-mono); font-size: 11px; }
`;

// src/client/apply-command.ts
function gitApplyCommand(patch) {
  if (!patch) return null;
  return ` (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
${patch}
EOF
)`;
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
function inlineCommentPrompt(comments) {
  const body = comments.map((comment, index) => {
    const side = comment.side === "old" ? "\u6539\u52A8\u524D" : "\u6539\u52A8\u540E";
    return `${index + 1}. \`${comment.path}:${comment.line}\`\uFF08${side}\uFF09
${comment.text.trim()}`;
  });
  return [
    "\u5904\u7406\u8FD9\u4E9B\u884C\u5185\u8BC4\u8BBA\uFF0C\u5E76\u4FDD\u6301\u6539\u52A8\u8303\u56F4\u6700\u5C0F\u3002\u6539\u5B8C\u540E\u8DD1\u76F8\u5173\u6D4B\u8BD5\uFF0C\u5E76\u8BA9\u6211\u5728\u5BA1\u67E5\u91CC\u770B\u5230\u65B0\u7684\u5DEE\u5F02\u3002",
    "",
    ...body
  ].join("\n");
}

// src/review/types.ts
var EMPTY_SNAPSHOT = {
  kind: "missing-cwd",
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
  findings: []
};

// src/client/pane.tsx
var FILTERS = ["unstaged", "staged", "commit", "branch", "last-turn"];
var STORAGE = "dsh-codex-review:";
var DEFAULT_SETTINGS = {
  wrap: false,
  hideWhitespace: false,
  wordDiffs: false,
  full: false,
  rich: false,
  diffMode: "unified",
  filesVisible: false,
  treeWidth: 248,
  skipRevert: false,
  baseBranch: null
};
function ensureReviewStyle() {
  if (typeof document === "undefined") return;
  let style = document.getElementById("dsh-codex-review-style");
  if (!style) {
    style = document.createElement("style");
    style.id = "dsh-codex-review-style";
    document.head.appendChild(style);
  }
  if (style.textContent !== reviewCss) style.textContent = reviewCss;
}
function ReviewPane({ client, preview = false, lang = detectLang() }) {
  const t = (key, values) => translate(lang, key, values);
  const [settings, setSettings] = (0, import_react2.useState)(() => readSettings());
  const [filter, setFilter] = (0, import_react2.useState)("unstaged");
  const [commitSha, setCommitSha] = (0, import_react2.useState)(null);
  const [root, setRoot] = (0, import_react2.useState)(null);
  const [snapshot, setSnapshot] = (0, import_react2.useState)(EMPTY_SNAPSHOT);
  const [loading, setLoading] = (0, import_react2.useState)(true);
  const [refreshing, setRefreshing] = (0, import_react2.useState)(false);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [toast, setToast] = (0, import_react2.useState)(null);
  const [open, setOpen] = (0, import_react2.useState)({});
  const [viewed, setViewed] = (0, import_react2.useState)({});
  const [comments, setComments] = (0, import_react2.useState)([]);
  const [dismissed, setDismissed] = (0, import_react2.useState)([]);
  const [query, setQuery] = (0, import_react2.useState)("");
  const [revertTarget, setRevertTarget] = (0, import_react2.useState)(null);
  const [skipChecked, setSkipChecked] = (0, import_react2.useState)(settings.skipRevert);
  const [commitOpen, setCommitOpen] = (0, import_react2.useState)(false);
  const [reviewOpen, setReviewOpen] = (0, import_react2.useState)(false);
  const [jumpOpen, setJumpOpen] = (0, import_react2.useState)(false);
  const requestId = (0, import_react2.useRef)(0);
  const commentsRoot = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    ensureReviewStyle();
  }, []);
  const loadQuery = (0, import_react2.useMemo)(() => ({
    filter,
    baseBranch: settings.baseBranch,
    commitSha,
    hideWhitespace: settings.hideWhitespace,
    full: settings.full,
    root
  }), [filter, settings.baseBranch, settings.hideWhitespace, settings.full, commitSha, root]);
  async function reload(quiet = false) {
    const id = requestId.current + 1;
    requestId.current = id;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await client.load(loadQuery);
      if (requestId.current !== id) return;
      setSnapshot(next);
      setError(next.kind === "error" ? next.error ?? t("loadFailed") : null);
      if (!root && next.root) setRoot(next.root);
      if (!settings.baseBranch && next.baseBranch) updateSettings({ baseBranch: next.baseBranch });
      if (next.root && commentsRoot.current !== next.root) {
        commentsRoot.current = next.root;
        setComments(readComments(next.root));
      }
      setLoading(false);
      setRefreshing(false);
    } catch (cause) {
      if (requestId.current !== id) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
      setRefreshing(false);
    }
  }
  (0, import_react2.useEffect)(() => {
    void reload(snapshot.kind === "repo");
  }, [loadQuery.filter, loadQuery.baseBranch, loadQuery.commitSha, loadQuery.hideWhitespace, loadQuery.full, loadQuery.root]);
  (0, import_react2.useEffect)(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !busy) void reload(true);
    }, 4e3);
    return () => window.clearInterval(timer);
  }, [loadQuery, busy]);
  function updateSettings(patch) {
    setSettings((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE + "settings", JSON.stringify(next));
      return next;
    });
  }
  function rememberComments(next, repoRoot = snapshot.root) {
    setComments(next);
    if (repoRoot) localStorage.setItem(STORAGE + "comments:" + repoRoot, JSON.stringify(next.filter((comment) => comment.text.trim())));
  }
  function showToast(text) {
    setToast(text);
    window.setTimeout(() => setToast((current) => current === text ? null : current), 2600);
  }
  async function runAction(action, scope, path, hunkHeader) {
    if (action === "revert" && !settings.skipRevert) {
      setSkipChecked(false);
      setRevertTarget({ scope, path, hunkHeader });
      return;
    }
    setBusy(true);
    const result = await client.action({ action, scope, filter, path, hunkHeader, baseBranch: settings.baseBranch, commitSha, root: snapshot.root });
    setBusy(false);
    setSnapshot(result.snapshot);
    if (!result.ok) showToast(result.error || t("loadFailed"));
  }
  const files = snapshot.files;
  const gitActions = filter === "unstaged" || filter === "staged";
  const visibleFiles = files;
  const branchName = snapshot.branch || t("yourBranch");
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr", "data-wrap": settings.wrap ? "1" : "0" }, preview ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-banner" }, t("previewBanner")) : null, /* @__PURE__ */ import_react2.default.createElement("header", { className: "cxr-header" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-header-row" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-source" }, /* @__PURE__ */ import_react2.default.createElement(
    FilterMenu,
    {
      lang,
      filter,
      staged: snapshot.stagedFileCount,
      unstaged: snapshot.unstagedFileCount,
      commits: snapshot.commits,
      onSelect: (next, sha) => {
        setFilter(next);
        if (sha) setCommitSha(sha);
      }
    }
  ), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-source-meta" }, filter === "commit" && snapshot.selectedCommit ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-subject" }, snapshot.selectedCommit.subject) : null, /* @__PURE__ */ import_react2.default.createElement(LineStats, { additions: snapshot.additions, deletions: snapshot.deletions }), refreshing ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-spinner", role: "status", "aria-label": t("refreshing") }) : null, snapshot.repos.length > 1 ? /* @__PURE__ */ import_react2.default.createElement("select", { className: "cxr-input", style: { width: "auto" }, "aria-label": t("repo"), value: snapshot.root ?? "", onChange: (event) => setRoot(event.target.value) }, snapshot.repos.map((repo) => /* @__PURE__ */ import_react2.default.createElement("option", { key: repo.root, value: repo.root }, repo.label))) : null)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-tools" }, /* @__PURE__ */ import_react2.default.createElement(
    OptionsMenu,
    {
      lang,
      settings,
      disabled: !snapshot.patch,
      onToggle: (key) => updateSettings({ [key]: !settings[key] }),
      onRefresh: () => void reload(true),
      onCopy: () => {
        const command = gitApplyCommand(snapshot.patch);
        if (!command) return;
        void navigator.clipboard?.writeText(command).then(() => showToast(t("copiedApply")), () => showToast(t("copiedApply")));
      },
      onReview: () => setReviewOpen(true)
    }
  ), /* @__PURE__ */ import_react2.default.createElement(IconButton, { label: files.length > 0 && Object.values(open).every((value) => value !== false) && files.every((file) => open[file.path] !== false) ? t("collapseAll") : t("expandAll"), onClick: () => {
    const collapse = files.every((file) => open[file.path] ?? true);
    const next = {};
    for (const file of files) next[file.path] = !collapse;
    setOpen(next);
  } }, files.every((file) => open[file.path] ?? true) ? "\u25BE" : "\u25B8"), /* @__PURE__ */ import_react2.default.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ import_react2.default.createElement(IconButton, { label: t("jump"), onClick: () => setJumpOpen((value) => !value) }, "\u21AA"), jumpOpen ? /* @__PURE__ */ import_react2.default.createElement(JumpMenu, { lang, files, onClose: () => setJumpOpen(false), onPick: (filePath) => {
    setOpen((current) => ({ ...current, [filePath]: true }));
    document.querySelector(`[data-review-path="${cssEscape(filePath)}"]`)?.scrollIntoView({ block: "start" });
    setJumpOpen(false);
  } }) : null), /* @__PURE__ */ import_react2.default.createElement(IconButton, { label: settings.diffMode === "unified" ? t("split") : t("unified"), onClick: () => updateSettings({ diffMode: settings.diffMode === "unified" ? "split" : "unified" }) }, settings.diffMode === "unified" ? "\u25A5" : "\u25A4"), /* @__PURE__ */ import_react2.default.createElement(IconButton, { label: settings.filesVisible ? t("hideFiles") : t("showFiles"), active: settings.filesVisible, onClick: () => updateSettings({ filesVisible: !settings.filesVisible }) }, "\u25A4"), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", title: snapshot.stagedFileCount === 0 && snapshot.ahead === 0 ? t("nothingToCommit") : t("commitOrPush"), onClick: () => setCommitOpen(true) }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-commit-label" }, t("commitOrPush")), /* @__PURE__ */ import_react2.default.createElement("span", { "aria-hidden": "true" }, "\u2713")))), filter === "branch" ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-branch-row" }, /* @__PURE__ */ import_react2.default.createElement("span", null, branchName), /* @__PURE__ */ import_react2.default.createElement("span", { "aria-hidden": "true" }, "\u2192"), /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": t("selectBase"), className: "cxr-input", style: { width: "auto" }, value: settings.baseBranch ?? snapshot.baseBranch ?? "", onChange: (event) => updateSettings({ baseBranch: event.target.value }) }, (snapshot.branches.length ? snapshot.branches : [snapshot.baseBranch].filter(Boolean)).map((branch) => /* @__PURE__ */ import_react2.default.createElement("option", { key: branch, value: branch ?? "" }, branch)))) : null), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-body" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-diffs" }, /* @__PURE__ */ import_react2.default.createElement(
    DiffBody,
    {
      lang,
      loading,
      error,
      snapshot,
      filter,
      onRetry: () => void reload(false),
      onInit: async () => {
        setBusy(true);
        try {
          setSnapshot(await client.init());
        } catch (cause) {
          showToast(t("gitInitError", { message: cause instanceof Error ? cause.message : String(cause) }));
        } finally {
          setBusy(false);
        }
      },
      onBranch: () => setFilter("branch"),
      busy
    },
    /* @__PURE__ */ import_react2.default.createElement(
      DiffList,
      {
        lang,
        files: visibleFiles,
        filter,
        diffMode: settings.diffMode,
        wrap: settings.wrap,
        wordDiffs: settings.wordDiffs,
        rich: settings.rich,
        gitActions,
        busy,
        open,
        viewed,
        comments,
        findings: snapshot.findings,
        dismissed,
        fileUrl: client.fileUrl,
        root: snapshot.root,
        onToggle: (filePath) => setOpen((current) => ({ ...current, [filePath]: !(current[filePath] ?? true) })),
        onOpenFile: (filePath, line) => client.openFile(filePath, line),
        onViewed: (filePath, next) => {
          setViewed((current) => ({ ...current, [filePath]: next }));
          if (next) setOpen((current) => ({ ...current, [filePath]: false }));
        },
        onAction: (action, scope, filePath, hunkHeader) => void runAction(action, scope, filePath, hunkHeader),
        onComment: (comment) => {
          const without = comments.filter((item) => item.id !== comment.id && !(comment.text === "" && item.text === "" && item.path === comment.path && item.line === comment.line && item.side === comment.side));
          rememberComments([...without, comment]);
        },
        onDeleteComment: (id) => rememberComments(comments.filter((comment) => comment.id !== id)),
        onDismiss: (id) => setDismissed((current) => [...current, id])
      }
    )
  ), gitActions && files.length > 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-pill" }, filter === "unstaged" ? /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: busy, onClick: () => void runAction("revert", "section") }, t("revertAll")) : null, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: busy, onClick: () => void runAction(filter === "staged" ? "unstage" : "stage", "section") }, filter === "staged" ? t("unstageAll") : t("stageAll")), comments.some((comment) => comment.text.trim()) ? /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", title: t("sendCommentsHint"), onClick: () => void sendComments() }, t("sendComments")) : null) : null), settings.filesVisible ? /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-resizer", onPointerDown: (event) => dragTree(event, settings.treeWidth, (treeWidth) => updateSettings({ treeWidth })) }), /* @__PURE__ */ import_react2.default.createElement(FileTree, { lang, files, width: settings.treeWidth, query, onQuery: setQuery, comments, onPick: (filePath) => {
    setOpen((current) => ({ ...current, [filePath]: true }));
    document.querySelector(`[data-review-path="${cssEscape(filePath)}"]`)?.scrollIntoView({ block: "start" });
  } })) : null), revertTarget ? /* @__PURE__ */ import_react2.default.createElement(Modal, { title: t("revertTitle"), subtitle: t("revertMessage"), onClose: () => setRevertTarget(null) }, /* @__PURE__ */ import_react2.default.createElement("label", { className: "cxr-check" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: skipChecked, onChange: (event) => setSkipChecked(event.target.checked) }), t("dontAsk")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dialog-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => setRevertTarget(null) }, t("cancel")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn cxr-danger", autoFocus: true, onClick: () => {
    if (skipChecked) updateSettings({ skipRevert: true });
    const target = revertTarget;
    setRevertTarget(null);
    void runAction("revert", target.scope, target.path, target.hunkHeader);
  } }, t("confirm")))) : null, commitOpen ? /* @__PURE__ */ import_react2.default.createElement(
    CommitDialog,
    {
      lang,
      branch: branchName,
      busy,
      canCommit: snapshot.stagedFileCount > 0,
      ahead: snapshot.ahead,
      gh: snapshot.ghAvailable,
      onClose: () => setCommitOpen(false),
      onCommit: async (message, includeUnstaged, push) => {
        setBusy(true);
        const result = await client.commit({ message, includeUnstaged, push, root: snapshot.root });
        setBusy(false);
        setSnapshot(result.snapshot);
        showToast(result.ok ? push ? t("pushed", { branch: result.snapshot.branch || branchName }) : t("committed", { branch: result.snapshot.branch || branchName }) : result.error || t("commitFailed"));
        if (result.ok) setCommitOpen(false);
      },
      onPush: async () => {
        setBusy(true);
        const result = await client.push(snapshot.root);
        setBusy(false);
        setSnapshot(result.snapshot);
        showToast(result.ok ? t("pushed", { branch: result.snapshot.branch || branchName }) : result.error || t("pushFailed"));
      },
      onPr: async (title, body) => {
        const result = await client.createPr({ title, body, root: snapshot.root });
        showToast(result.ok ? t("prCreated") : result.error || t("installGh"));
      }
    }
  ) : null, reviewOpen ? /* @__PURE__ */ import_react2.default.createElement(
    ReviewDialog,
    {
      lang,
      busy,
      baseBranch: settings.baseBranch || snapshot.baseBranch,
      commits: snapshot.commits,
      onClose: () => setReviewOpen(false),
      onStart: async (choice) => {
        const text = reviewPrompt({
          filter: choice.filter,
          baseBranch: choice.baseBranch,
          commitSha: choice.commitSha,
          custom: choice.custom,
          root: snapshot.root
        });
        const result = await client.followup(text);
        if (!result.queued) await navigator.clipboard?.writeText(text).catch(() => void 0);
        showToast(result.queued ? t("reviewQueued") : result.error || t("commentsCopied"));
        setReviewOpen(false);
      }
    }
  ) : null, toast ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-toast", role: "status" }, toast) : null);
  async function sendComments() {
    const text = inlineCommentPrompt(comments.filter((comment) => comment.text.trim()));
    const result = await client.followup(text);
    if (!result.queued) await navigator.clipboard?.writeText(text).catch(() => void 0);
    showToast(result.queued ? t("commentsQueued") : t("commentsCopied"));
  }
}
function DiffBody({ lang, loading, error, snapshot, filter, onRetry, onInit, onBranch, busy, children }) {
  const t = (key, values) => translate(lang, key, values);
  if (loading && snapshot.kind !== "repo") return /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-empty" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-spinner" }), /* @__PURE__ */ import_react2.default.createElement("p", null, t("loading")));
  if (error && snapshot.kind !== "repo") return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("loadFailed"), description: error }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onRetry }, t("retry")));
  if (snapshot.kind === "missing-cwd") return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("missingCwd"), description: t("missingCwdDescription") });
  if (snapshot.kind === "not-repo") {
    return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("gitRequiredTitle"), description: t("gitRequiredDescription") }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: busy, onClick: onInit }, busy ? t("creatingRepo") : t("createRepo")));
  }
  if (error && snapshot.files.length === 0) {
    return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("loadFailed"), description: error }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onRetry }, t("retry")));
  }
  if (snapshot.tooLarge && snapshot.files.length === 0) return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("diffTooLargeTitle"), description: t("diffTooLargeDescription") });
  if (snapshot.files.length === 0) {
    if (filter === "staged" || filter === "unstaged") {
      return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: filter === "staged" ? t("noStagedTitle") : t("noUnstagedTitle"), description: filter === "staged" ? t("noStagedDescription") : t("noUnstagedDescription"), illustration: false }, snapshot.branch ? /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onBranch }, t("viewBranchDiff")) : null);
    }
    if (filter === "last-turn") return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("noDiff"), description: t("lastTurnMissing") });
    return /* @__PURE__ */ import_react2.default.createElement(Empty, { lang, title: t("noDiff"), description: t("noDiffDescription") }, filter !== "branch" ? /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onBranch }, t("viewBranchDiff")) : null);
  }
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, children);
}
function Empty({ title, description, children, illustration = true }) {
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-empty" }, illustration ? /* @__PURE__ */ import_react2.default.createElement(Illustration, null) : null, /* @__PURE__ */ import_react2.default.createElement("h2", null, title), /* @__PURE__ */ import_react2.default.createElement("p", null, description), children);
}
function Illustration() {
  return /* @__PURE__ */ import_react2.default.createElement("svg", { className: "cxr-illustration", width: "66", height: "72", viewBox: "0 0 66 72", "aria-hidden": "true" }, /* @__PURE__ */ import_react2.default.createElement("path", { fill: "currentColor", d: "M18 4h22l12 12v48a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm22 2v10h10" }), /* @__PURE__ */ import_react2.default.createElement("path", { fill: "currentColor", d: "M24 34h10v3H24zm0 8h18v3H24zm0 8h14v3H24z" }));
}
function LineStats({ additions, deletions }) {
  if (!additions && !deletions) return null;
  return /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-stats" }, additions ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-add" }, "+", additions) : null, deletions ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-del" }, "\u2212", deletions) : null);
}
function FilterMenu({ lang, filter, staged, unstaged, commits, onSelect }) {
  const t = (key) => translate(lang, key);
  const [open, setOpen] = (0, import_react2.useState)(false);
  const labels = { unstaged: t("unstaged"), staged: t("staged"), commit: t("commit"), branch: t("branch"), "last-turn": t("lastTurn") };
  const counts = { unstaged, staged };
  return /* @__PURE__ */ import_react2.default.createElement(MenuButton, { open, setOpen, label: /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("span", null, labels[filter]), counts[filter] ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-badge" }, counts[filter]) : null) }, FILTERS.map((item) => item === "commit" ? /* @__PURE__ */ import_react2.default.createElement("div", { key: item }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-menu-item" }, /* @__PURE__ */ import_react2.default.createElement("span", null, t("commit")), filter === "commit" ? /* @__PURE__ */ import_react2.default.createElement("span", null, "\u2713") : null), commits.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-menu-item" }, /* @__PURE__ */ import_react2.default.createElement("span", null, t("commitsEmpty"))) : commits.slice(0, 12).map((commit) => /* @__PURE__ */ import_react2.default.createElement("button", { key: commit.sha, type: "button", className: "cxr-menu-item", onClick: () => {
    onSelect("commit", commit.sha);
    setOpen(false);
  } }, /* @__PURE__ */ import_react2.default.createElement("span", null, commit.subject), /* @__PURE__ */ import_react2.default.createElement("span", null, relative(commit.time, lang))))) : /* @__PURE__ */ import_react2.default.createElement("button", { key: item, type: "button", className: "cxr-menu-item", onClick: () => {
    onSelect(item);
    setOpen(false);
  } }, /* @__PURE__ */ import_react2.default.createElement("span", null, labels[item], counts[item] ? `  ${counts[item]}` : ""), filter === item ? /* @__PURE__ */ import_react2.default.createElement("span", null, "\u2713") : null)));
}
function OptionsMenu({ lang, settings, disabled, onToggle, onRefresh, onCopy, onReview }) {
  const t = (key) => translate(lang, key);
  const [open, setOpen] = (0, import_react2.useState)(false);
  const items = [
    { key: "wrap", on: t("wrapOn"), off: t("wrapOff"), value: settings.wrap },
    { key: "hideWhitespace", on: t("showWhitespace"), off: t("hideWhitespace"), value: settings.hideWhitespace },
    { key: "wordDiffs", on: t("wordDiffOn"), off: t("wordDiffOff"), value: settings.wordDiffs },
    { key: "full", on: t("fullOn"), off: t("fullOff"), value: settings.full },
    { key: "rich", on: t("richOn"), off: t("richOff"), value: settings.rich }
  ];
  return /* @__PURE__ */ import_react2.default.createElement(MenuButton, { open, setOpen, icon: true, label: t("moreOptions") }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-menu-item", onClick: () => {
    onRefresh();
    setOpen(false);
  } }, /* @__PURE__ */ import_react2.default.createElement("span", null, t("refresh"))), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-menu-item", disabled, onClick: () => {
    onCopy();
    setOpen(false);
  } }, /* @__PURE__ */ import_react2.default.createElement("span", null, t("copyApply"))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-sep" }), items.map((item) => /* @__PURE__ */ import_react2.default.createElement("button", { key: item.key, type: "button", className: "cxr-menu-item", onClick: () => onToggle(item.key) }, /* @__PURE__ */ import_react2.default.createElement("span", null, item.value ? item.on : item.off), item.value ? /* @__PURE__ */ import_react2.default.createElement("span", null, "\u2713") : null)), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-sep" }), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-menu-item", onClick: () => {
    setOpen(false);
    onReview();
  } }, /* @__PURE__ */ import_react2.default.createElement("span", null, t("reviewTitle"))));
}
function MenuButton({ open, setOpen, label, icon = false, children }) {
  const ref = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    if (!open) return;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, setOpen]);
  return /* @__PURE__ */ import_react2.default.createElement("div", { ref, style: { position: "relative" } }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: icon ? "cxr-icon-btn" : "cxr-btn", "aria-expanded": open, "aria-label": typeof label === "string" ? label : void 0, onClick: () => setOpen(!open) }, icon ? "\u22EF" : label, icon ? null : /* @__PURE__ */ import_react2.default.createElement("span", { "aria-hidden": "true" }, "\u25BE")), open ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-menu", style: { top: 32, left: icon ? "auto" : 0, right: icon ? 0 : "auto" } }, children) : null);
}
function IconButton({ label, onClick, children, active = false }) {
  return /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-icon-btn", "aria-label": label, title: label, "data-active": active ? "1" : "0", onClick }, children);
}
function JumpMenu({ lang, files, onPick }) {
  const [query, setQuery] = (0, import_react2.useState)("");
  const matches = files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase()));
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-menu", style: { top: 32, right: 0 } }, /* @__PURE__ */ import_react2.default.createElement("input", { className: "cxr-input", autoFocus: true, placeholder: translate(lang, "jump"), value: query, onChange: (event) => setQuery(event.target.value) }), matches.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-menu-item" }, /* @__PURE__ */ import_react2.default.createElement("span", null, translate(lang, "noMatch"))) : matches.map((file) => /* @__PURE__ */ import_react2.default.createElement("button", { key: file.path, type: "button", className: "cxr-menu-item", onClick: () => onPick(file.path) }, /* @__PURE__ */ import_react2.default.createElement("span", null, file.path))));
}
function FileTree({ lang, files, width, query, onQuery, comments, onPick }) {
  const matches = files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase()));
  const tree = buildTree(matches);
  return /* @__PURE__ */ import_react2.default.createElement("aside", { className: "cxr-tree", style: { ["--cxr-tree-width"]: `${width}px` } }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-tree-search" }, /* @__PURE__ */ import_react2.default.createElement("input", { className: "cxr-input", placeholder: translate(lang, "searchFiles"), value: query, onChange: (event) => onQuery(event.target.value), "aria-label": translate(lang, "changedFiles") })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-tree-scroll" }, matches.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dir" }, translate(lang, "noMatch")) : /* @__PURE__ */ import_react2.default.createElement(TreeNodes, { nodes: tree, depth: 0, comments, onPick })));
}
function buildTree(files) {
  const root = { name: "", path: "", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let cursor = root;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let child = cursor.children.find((entry) => entry.name === part);
      if (!child) {
        child = { name: part, path, children: [] };
        cursor.children.push(child);
      }
      if (index === parts.length - 1) child.file = file;
      cursor = child;
    });
  }
  return root.children;
}
function TreeNodes({ nodes, depth, comments, onPick }) {
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, nodes.map((node) => /* @__PURE__ */ import_react2.default.createElement("div", { key: node.path }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-tree-row", style: { paddingLeft: 8 + depth * 12 }, "data-active": node.file ? "0" : void 0, onClick: () => node.file && onPick(node.path) }, /* @__PURE__ */ import_react2.default.createElement("span", { className: node.file ? "cxr-tree-name" : "cxr-dir cxr-tree-name" }, node.file ? node.name : `${node.name}/`), node.file ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-stats" }, /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-add" }, node.file.additions ? `+${node.file.additions}` : ""), /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-del" }, node.file.deletions ? `\u2212${node.file.deletions}` : "")) : null, node.file && comments.some((comment) => comment.path === node.file?.path && comment.text.trim()) ? /* @__PURE__ */ import_react2.default.createElement("span", { className: "cxr-badge" }, comments.filter((comment) => comment.path === node.file?.path && comment.text.trim()).length) : null), node.children.length > 0 ? /* @__PURE__ */ import_react2.default.createElement(TreeNodes, { nodes: node.children, depth: depth + 1, comments, onPick }) : null)));
}
function Modal({ title, subtitle, onClose, children }) {
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-modal", role: "presentation", onMouseDown: (event) => {
    if (event.target === event.currentTarget) onClose();
  } }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dialog", role: "dialog", "aria-modal": "true", "aria-label": title }, /* @__PURE__ */ import_react2.default.createElement("h2", null, title), subtitle ? /* @__PURE__ */ import_react2.default.createElement("p", null, subtitle) : null, children));
}
function CommitDialog({ lang, branch, busy, canCommit, ahead, gh, onClose, onCommit, onPush, onPr }) {
  const t = (key, values) => translate(lang, key, values);
  const [message, setMessage] = (0, import_react2.useState)("");
  const [includeUnstaged, setIncludeUnstaged] = (0, import_react2.useState)(false);
  const [prTitle, setPrTitle] = (0, import_react2.useState)("");
  return /* @__PURE__ */ import_react2.default.createElement(Modal, { title: t("commitOrPush"), subtitle: `${t("commitTo")} ${branch}`, onClose }, /* @__PURE__ */ import_react2.default.createElement("label", null, t("commitMessage"), /* @__PURE__ */ import_react2.default.createElement("textarea", { className: "cxr-textarea", rows: 4, placeholder: t("commitPlaceholder"), value: message, onChange: (event) => setMessage(event.target.value) })), /* @__PURE__ */ import_react2.default.createElement("label", { className: "cxr-check" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: includeUnstaged, onChange: (event) => setIncludeUnstaged(event.target.checked) }), t("includeUnstaged")), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dialog-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onClose }, t("cancel")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: busy || ahead === 0, onClick: onPush }, busy ? t("pushing") : t("push")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: busy || !canCommit && !includeUnstaged, onClick: () => onCommit(message, includeUnstaged, true) }, t("commitAndPush")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn cxr-primary", disabled: busy || !canCommit && !includeUnstaged, onClick: () => onCommit(message, includeUnstaged, false) }, busy ? t("committing") : t("commit"))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-sep" }), /* @__PURE__ */ import_react2.default.createElement("label", null, t("prTitle"), /* @__PURE__ */ import_react2.default.createElement("input", { className: "cxr-input", value: prTitle, onChange: (event) => setPrTitle(event.target.value) })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dialog-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", disabled: !gh || !prTitle.trim(), title: gh ? t("createPr") : t("installGh"), onClick: () => onPr(prTitle, message) }, t("createPr"))));
}
function ReviewDialog({ lang, baseBranch, commits, onClose, onStart }) {
  const t = (key) => translate(lang, key);
  const [mode, setMode] = (0, import_react2.useState)("uncommitted");
  const [sha, setSha] = (0, import_react2.useState)(commits[0]?.sha ?? "");
  const [custom, setCustom] = (0, import_react2.useState)("");
  return /* @__PURE__ */ import_react2.default.createElement(Modal, { title: t("reviewTitle"), subtitle: t("reviewDescription"), onClose }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-choices" }, ["uncommitted", "branch", "commit", "custom"].map((item) => /* @__PURE__ */ import_react2.default.createElement("label", { key: item, className: "cxr-check" }, /* @__PURE__ */ import_react2.default.createElement("input", { type: "radio", name: "review-mode", checked: mode === item, onChange: () => setMode(item) }), item === "uncommitted" ? t("reviewUncommitted") : item === "branch" ? t("reviewBranch") : item === "commit" ? t("reviewCommit") : t("reviewCustom")))), mode === "branch" ? /* @__PURE__ */ import_react2.default.createElement("p", null, baseBranch || t("selectBase")) : null, mode === "commit" ? /* @__PURE__ */ import_react2.default.createElement("select", { className: "cxr-input", value: sha, onChange: (event) => setSha(event.target.value) }, commits.map((commit) => /* @__PURE__ */ import_react2.default.createElement("option", { key: commit.sha, value: commit.sha }, commit.subject))) : null, mode === "custom" ? /* @__PURE__ */ import_react2.default.createElement("textarea", { className: "cxr-textarea", rows: 4, placeholder: t("reviewCustomPlaceholder"), value: custom, onChange: (event) => setCustom(event.target.value) }) : null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "cxr-dialog-actions" }, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn", onClick: onClose }, t("cancel")), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "cxr-btn cxr-primary", onClick: () => onStart({
    filter: mode === "uncommitted" ? "unstaged" : mode === "custom" ? "unstaged" : mode,
    baseBranch,
    commitSha: mode === "commit" ? sha : null,
    custom: mode === "custom" ? custom : null
  }) }, t("startReview"))));
}
function dragTree(event, startWidth, onWidth) {
  const startX = event.clientX;
  const move = (next) => onWidth(Math.min(420, Math.max(180, startWidth - (next.clientX - startX))));
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE + "settings");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function readComments(root) {
  if (!root) return [];
  try {
    const raw = localStorage.getItem(STORAGE + "comments:" + root);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function relative(epoch, lang) {
  const delta = Math.max(0, Date.now() / 1e3 - epoch);
  const unit = delta < 3600 ? Math.max(1, Math.floor(delta / 60)) : delta < 86400 ? Math.floor(delta / 3600) : Math.floor(delta / 86400);
  const label = delta < 3600 ? lang === "en" ? "m" : "\u5206\u949F" : delta < 86400 ? lang === "en" ? "h" : "\u5C0F\u65F6" : lang === "en" ? "d" : "\u5929";
  return lang === "en" ? `${unit}${label} ${translate(lang, "ago")}` : `${unit} ${label}${translate(lang, "ago")}`;
}
function cssEscape(value) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
}

// src/client/entry.tsx
var inject = ["slots", "sidebarRightTabs", "sidebarRight"];
var ID = "dsh-codex-review-sidebar";
var KIND = "codex-review";
var pluginContext = null;
function apply(ctx) {
  pluginContext = ctx;
  ensureReviewStyle();
  const register = () => {
    ctx.effect?.(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: ID
    }, ReviewTab)), "dsh-codex-review-sidebar: tab body");
    ctx.effect?.(() => {
      if (!ctx.sidebarRightTabs?.register) return () => void 0;
      return ctx.sidebarRightTabs.register({
        id: ID,
        kind: KIND,
        priority: "extension",
        keepMounted: true,
        title: () => translate(detectLang(), "tab"),
        guide: [{
          id: "review",
          order: 12,
          title: () => translate(detectLang(), "tab"),
          description: () => translate(detectLang(), "tabDescription")
        }]
      });
    }, "dsh-codex-review-sidebar: tab type");
    ctx.effect?.(() => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
      name: "conversation.session.header.utilities",
      id: ID,
      order: 18,
      inject: (sessionId) => ({ sessionId })
    }, ReviewOpener)), "dsh-codex-review-sidebar: opener");
    ctx.effect?.(() => ctx.slots.inject("conversation.chat.commandview", () => ctx.slots.register({
      name: "conversation.chat.commandview",
      key: "review",
      inject: (sessionId) => ({ sessionId })
    }, ReviewCommand)), "dsh-codex-review-sidebar: command");
  };
  if (typeof ctx.inject === "function") ctx.inject(["slots", "sidebarRightTabs"], register);
  else register();
}
function ReviewTab(props) {
  const sessionId = props.sessionId || props.useTabInfo?.()?.sessionId || props.useTabInfo?.()?.tab?.sessionId || "";
  const selected = props.useSessions?.((sessions) => sessionCwd(sessions, sessionId));
  const cwd = typeof selected === "string" && selected ? selected : cwdOf(sessionId);
  const client = (0, import_react3.useMemo)(() => createPluginClient({
    sessionId,
    cwd,
    openFile(filePath, line) {
      openFile(sessionId, filePath, line);
    }
  }), [sessionId, cwd]);
  return /* @__PURE__ */ import_react3.default.createElement(ReviewPane, { client });
}
function sessionCwd(sessions, sessionId) {
  const record = sessions;
  return record.byId?.[sessionId]?.cwd ?? record.items?.find((item) => item.sessionId === sessionId)?.cwd;
}
function ReviewOpener() {
  const lang = detectLang();
  return /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "cxr-opener", onClick: () => openReview() }, translate(lang, "openReview"));
}
function ReviewCommand(props) {
  const lang = detectLang();
  const sessionId = props.sessionId ?? "";
  const client = (0, import_react3.useMemo)(() => createPluginClient({ sessionId, cwd: cwdOf(sessionId), openFile() {
  } }), [sessionId]);
  return /* @__PURE__ */ import_react3.default.createElement("div", { className: "cxr-choices" }, /* @__PURE__ */ import_react3.default.createElement("p", null, translate(lang, "commandHint")), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => void client.followup(reviewPrompt({ filter: "unstaged" })) }, translate(lang, "reviewUncommitted")), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => void client.followup(reviewPrompt({ filter: "branch" })) }, translate(lang, "reviewBranch")), /* @__PURE__ */ import_react3.default.createElement("button", { type: "button", className: "cxr-btn", onClick: () => openReview() }, translate(lang, "tab")));
}
function openReview() {
  const sidebar = pluginContext?.sidebarRight;
  if (!sidebar?.openTab) return;
  try {
    sidebar.openTab(KIND);
  } catch {
  }
}
function openFile(sessionId, filePath, line) {
  const sidebar = pluginContext?.sidebarRight;
  if (!sidebar?.openResource) return;
  const suffix = line ? `?line=${line}` : "";
  const candidates = [
    `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${filePath}${suffix}`,
    `dsh-resource://file/absolute/${encodeURIComponent(filePath)}${suffix}`
  ];
  for (const address of candidates) {
    try {
      sidebar.openResource(address);
      return;
    } catch {
    }
  }
}
function cwdOf(sessionId) {
  const reader = pluginContext?.workingDirectory?.get;
  if (!reader || !sessionId) return null;
  try {
    const value = reader(sessionId);
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const record = value;
      for (const key of ["cwd", "path", "workingDirectory"]) {
        if (typeof record[key] === "string") return record[key];
      }
    }
  } catch {
    return null;
  }
  return null;
}

    return module.exports;
  }
});
