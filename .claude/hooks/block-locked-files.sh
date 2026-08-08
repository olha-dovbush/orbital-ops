#!/usr/bin/env bash
# PreToolUse hook: refuse Edit/Write to the files CLAUDE.md marks as locked.
# Exit 2 blocks the tool call and feeds the stderr message back to the agent.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
file=$(jq -r '.tool_input.file_path // empty')
rel="${file#"$root"/}"

case "$rel" in
  public/api/fuel.json)
    # The one exception CLAUDE.md carves out, scoped to *creating* the file.
    # Once it exists it is guarded like the rest of the fixture set.
    [ -e "$root/$rel" ] || exit 0
    reason="public/api/fuel.json already exists. The exception covers creating it, not editing it." ;;
  public/api/*)
    reason="public/api/** is a read-only fixture set. Change what reads it, not it." ;;
  RUBRIC.md|ASSIGNMENT.md)
    reason="$rel is the grading contract. Meet it; don't rewrite it." ;;
  vite.config.ts|eslint.config.js|tsconfig*.json|.jscpd.json|scripts/validate.ts)
    reason="$rel is a locked config. Restructure src/ to fit it, and never suppress a rule." ;;
  *)
    exit 0 ;;
esac

printf 'BLOCKED: %s\n\n%s\n' "$rel" "$reason" >&2
exit 2
