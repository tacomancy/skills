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

# ADRs are numbered NNNN from 0000 (the template) with no gap and no duplicate, so two
# branches cannot both claim a number and merge. Every entry must be NNNN-*.md: a file
# the numbering cannot see would otherwise slip through. Reported at the first gap only:
# every later number is off by the same amount.
if [ -d "$ADR_DIR" ]; then
  nums=""
  for entry in "$ADR_DIR"/*; do
    [ -e "$entry" ] || continue
    name="${entry##*/}"
    case "$name" in
      [0-9][0-9][0-9][0-9]-*.md) nums="$nums ${name%%-*}" ;;
      *) bad "ADR not named NNNN-*.md: $entry" ;;
    esac
  done
  for dupe in $(printf '%s\n' $nums | sort | uniq -d); do bad "duplicate ADR number: $dupe"; done
  expected=0
  for n in $(printf '%s\n' $nums | sort -u); do
    if [ "$((10#$n))" -ne "$expected" ]; then
      bad "ADR numbering gap at $n (expected $(printf '%04d' "$expected"))"; break
    fi
    expected=$((expected + 1))
  done
else
  bad "missing ADR directory: $ADR_DIR"
fi

# Every living document the guidance names exists as a file, so a rename or deletion is
# caught. (The array expansion tolerates an empty list under bash 3.2.)
for doc in ${LIVING_DOCS[@]+"${LIVING_DOCS[@]}"}; do
  [ -f "$doc" ] || bad "missing living document: $doc"
done

# Optional: every backticked name in one section of the guidance file resolves to an
# entry in RESOLVE_DIR, so guidance never points at something that no longer exists.
# A name that is also a path in the repository is left alone: not every backticked word
# names a skill or script. The section runs from its "## heading" to the next "#"/"##".
if [ -n "$GUIDANCE_FILE" ] && [ -n "$GUIDANCE_SECTION" ] && [ -n "$RESOLVE_DIR" ]; then
  if [ ! -f "$GUIDANCE_FILE" ]; then
    bad "missing guidance file: $GUIDANCE_FILE"
  elif ! grep -q "^## $GUIDANCE_SECTION\$" "$GUIDANCE_FILE"; then
    bad "$GUIDANCE_FILE has no section \"## $GUIDANCE_SECTION\""
  else
    section="$(awk -v heading="## $GUIDANCE_SECTION" '$0 == heading { on = 1; next } /^##? / { on = 0 } on' "$GUIDANCE_FILE")"
    for name in $(printf '%s' "$section" | grep -o '`[A-Za-z0-9_./][A-Za-z0-9_./-]*`' | tr -d '`' | sort -u); do
      [ -e "$name" ] && continue
      [ -e "$RESOLVE_DIR/$name" ] || bad "$GUIDANCE_FILE § $GUIDANCE_SECTION names \`$name\` but neither $name nor $RESOLVE_DIR/$name exists"
    done
  fi
fi

if [ "$fail" -ne 0 ]; then say "guidance check failed"; exit 1; fi
say "guidance check passed"
