/** Same clipboard text the Codex review header copies for `git apply`. */
export function gitApplyCommand(patch: string | null): string | null {
  if (!patch) return null
  return ` (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'\n${patch}\nEOF\n)`
}
