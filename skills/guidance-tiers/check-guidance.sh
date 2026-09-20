#!/usr/bin/env bash
# Checks the guidance tiers. CI runs this on every pull request; locally, run it after
# committing to see what CI will say. It exists because a rule in the guidance file is
# only a rule if something fails when it is broken.
#
# Usage: check-guidance.sh [base-ref]
#   base-ref  the ref whose merge base with HEAD the frozen-tier diff starts from
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

# The frozen tier is never edited: a file modified, deleted, or renamed since the base
# fails; a file added passes. Renames are not detected, so a rename-and-edit is reported
# as the old file deleted — the frozen name is what the index README and readers know.
# The README is the tier's index, not frozen content: it may change, but only alongside
# a change to what it indexes, so it cannot drift from the directory.
base="${1:-origin/main}"
readme="$FROZEN_DIR/README.md"
frozen_diff() { git diff --name-only --no-renames "$@" "$merge_base" HEAD -- "$FROZEN_DIR/" ":(exclude)$readme"; }
if git rev-parse --verify --quiet "$base" >/dev/null; then
  merge_base="$(git merge-base "$base" HEAD)"
  while IFS= read -r file; do
    [ -n "$file" ] && bad "frozen file changed since $base: $file"
  done <<< "$(frozen_diff --diff-filter=MD)"
  readme_changed="$(git diff --name-only "$merge_base" HEAD -- "$readme")"
  if [ -n "$readme_changed" ] && [ -z "$(frozen_diff)" ]; then
    bad "$readme changed without a change to the directory's contents"
  fi
else
  # A fresh clone or a fork may not have the ref; that is not a broken rule.
  say "skip: frozen-tier diff ($base is not a known ref)"
fi

if [ "$fail" -ne 0 ]; then say "guidance check failed"; exit 1; fi
say "guidance check passed"
