#!/usr/bin/env bash
# UserPromptSubmit hook: re-hang the two rules that are cheapest to break silently.
# stdout on exit 0 joins the agent's context, so this stays to one line — it is
# paid on every prompt, and a paragraph here crowds out what it was defending.
set -uo pipefail

echo 'Convention: never suppress a lint rule and never write `any` in src/api/ — restructure to fit the caps in eslint.config.js.'
