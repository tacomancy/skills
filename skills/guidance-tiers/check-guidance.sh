#!/usr/bin/env bash
# Checks the guidance tiers. CI runs this on every pull request; run it locally before
# pushing a docs change. It exists because a rule in the guidance file is only a rule
# if something fails when it is broken.
#
# Usage: check-guidance.sh [base-ref]
#   base-ref  the ref the frozen-tier diff compares against
#             (default: origin/main; the diff is skipped when the ref is unknown)
#
# Configuration — edit these to match the repository; the rules below read only them.
FROZEN_DIR="docs/reference"                       # the frozen tier; nothing in it is edited
LIVING_DOCS=("CONTEXT.md" "docs/architecture.md") # living documents that must exist
ADR_DIR="docs/adr"                                # ADRs, numbered NNNN-*.md without gaps
GUIDANCE_FILE=""                                  # optional: file whose backticked names must resolve …
GUIDANCE_SECTION=""                               # … within this "## heading" section …
RESOLVE_DIR=""                                    # … to an entry in this directory

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
say() { printf '%s\n' "$*"; }
bad() { say "FAIL: $*"; fail=1; }

# 1. The frozen tier is never edited. Adding a file is allowed; modifying one is not.
#    The README is the tier's index, not frozen content: it may change, but only
#    alongside a change to what it indexes, so it cannot drift from the directory.
base="${1:-origin/main}"
readme="$FROZEN_DIR/README.md"
if git rev-parse --verify --quiet "$base" >/dev/null; then
  merge_base="$(git merge-base "$base" HEAD)"
  modified="$(git diff --name-only --diff-filter=M "$merge_base" HEAD -- "$FROZEN_DIR/" ":(exclude)$readme")"
  if [ -n "$modified" ]; then
    bad "frozen files modified since $base:"; say "$modified"
  fi
  readme_changed="$(git diff --name-only "$merge_base" HEAD -- "$readme")"
  contents_changed="$(git diff --name-only "$merge_base" HEAD -- "$FROZEN_DIR/" ":(exclude)$readme")"
  if [ -n "$readme_changed" ] && [ -z "$contents_changed" ]; then
    bad "$readme changed without a change to the directory's contents"
  fi
else
  # A fresh clone or a fork may not have the ref; that is not a broken rule.
  say "skip: frozen-tier diff ($base is not a known ref)"
fi

if [ "$fail" -ne 0 ]; then say "guidance check failed"; exit 1; fi
say "guidance check passed"
