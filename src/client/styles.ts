export const reviewCss = `
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
    background: var(--dsw-alias-bg-base, var(--dsh-bg-base, #ffffff));
  }
}
.cxr * { box-sizing: border-box; }
.cxr button, .cxr input, .cxr textarea { font: inherit; color: inherit; }
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
  color: var(--cxr-panel);
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
.cxr-primary { background: var(--cxr-fg); color: var(--cxr-panel); }
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
`
