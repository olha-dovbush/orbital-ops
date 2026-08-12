#!/usr/bin/env bash
# PostToolUse hook: after an Edit/Write under src/, run the test suite.
# A failing suite exits 2, so the output is fed straight back to the agent.
set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')

# Only src/ matters; edits to docs, tests fixtures, or config are none of our business.
case "$file" in
  "$root"/src/*) ;;
  *) exit 0 ;;
esac

# @testing-library dumps the whole container into every failed-query error, up to
# DEBUG_PRINT_LIMIT chars (default 7000). A handful of failures buries the assertions
# under DOM. Cap it here only — a human running `npm test` still gets the full dump.
export DEBUG_PRINT_LIMIT=200

# --related walks the module graph from the edited file and runs only the tests
# that depend on it, transitively. Cheap on every keystroke; `npm run validate`
# (full suite, coverage gate included) still runs before commit.
if ! output=$(cd "$root" && npx vitest related "$file" --run 2>&1); then
  # Runaway guard only. With the dump capped a failure costs ~13 lines, so 400 holds
  # a ~30-failure blowup; a 15-failure run at 200 was already losing the first four.
  lines=$(printf '%s\n' "$output" | wc -l)
  if (( lines > 400 )); then
    output="[…$((lines - 400)) earlier lines dropped…]
$(printf '%s\n' "$output" | tail -n 400)"
  fi
  printf 'Tests FAILED after editing %s\n\n%s\n' "${file#"$root"/}" "$output" >&2
  exit 2
fi
