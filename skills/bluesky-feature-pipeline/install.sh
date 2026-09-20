#!/usr/bin/env bash
# Stage 0 of the bluesky-feature-pipeline skill: places the templates beside this script
# under the adopting repository's .github/ with their placeholders substituted, and creates
# the status labels through the tracker's CLI. Bash, git, and coreutils only, because the
# adopting repository may have no other toolchain. Every check that can refuse runs before
# the first write, so a refusal leaves the repository and the tracker untouched.
#
# Usage: install.sh --prefix PREFIX --source-globs GLOBS --test-globs GLOBS [--trigger 'NAME: GLOB, GLOB']... [--unclaimed-label LABEL]
#   --prefix PREFIX           the family-label prefix, without its slash: `skill` gives `skill/<beat>`
#   --source-globs GLOBS      comma-separated globs naming the repository's source files
#   --test-globs GLOBS        comma-separated globs naming its test files
#   --trigger ENTRY           one post-merge trigger from the guidance file, as `<name>: <glob>, <glob>`,
#                             named for what it obliges; repeat per trigger, omit when the section names none
#   --unclaimed-label LABEL   the triage set's ready label, which a ticket carries until a session claims
#                             it; the lifecycle mover lifts it at PR open. Omit when the set has none
# The placeholder contract the values fill is templates/README.md.
set -euo pipefail

usage() { sed -n '/^# Usage:/,/^# The placeholder/p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//' >&2; exit 2; }
fail() { printf '%s\n' "$*" >&2; exit 2; }
say() { printf '%s\n' "$*"; }

prefix=""
source_globs=""
test_globs=""
triggers=""
unclaimed=""
while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) prefix="${2-}"; shift 2 ;;
    --source-globs) source_globs="${2-}"; shift 2 ;;
    --test-globs) test_globs="${2-}"; shift 2 ;;
    --trigger) triggers="${triggers:+$triggers; }${2-}"; shift 2 ;;
    --unclaimed-label) unclaimed="${2-}"; shift 2 ;;
    *) printf 'unknown argument: %s\n' "$1" >&2; usage ;;
  esac
done

# Every value sits in a double-quoted YAML string on one line, and each script exits on a
# blank or malformed parameter; a wrong value fails here rather than on the first PR.
[ -n "$prefix" ] && [ -n "$source_globs" ] && [ -n "$test_globs" ] || usage
one_line() {
  case "$2" in
    *'"'*|*$'\n'*) fail "$1 holds a quote or a newline, which the workflow env cannot carry: $2" ;;
  esac
}
one_line --prefix "$prefix"; one_line --source-globs "$source_globs"; one_line --test-globs "$test_globs"
one_line --unclaimed-label "$unclaimed"
case "$prefix" in
  */|*[[:space:]]*) fail "--prefix is the label family without its slash or spaces, got: $prefix" ;;
esac
if [ -n "$triggers" ]; then
  one_line --trigger "$triggers"
  while IFS= read -r entry; do
    case "$entry" in
      *[![:space:]]*:*[![:space:]]*) ;;
      *) fail "--trigger is '<name>: <glob>, <glob>', got: ${entry# }" ;;
    esac
  done <<<"$(printf '%s\n' "$triggers" | tr ';' '\n')"
fi

skill_dir="$(cd "$(dirname "$0")" && pwd)"
templates="$skill_dir/templates"
root="$(git rev-parse --show-toplevel)"
cd "$root"
command -v gh >/dev/null || fail "the tracker CLI, gh, is not on PATH; the labels are created through it"

# Every template lands at the same relative path under .github/; README.md documents the
# set and stays behind.
template_files() { find "$templates" -type f ! -name README.md | LC_ALL=C sort; }
target_of() { printf '.github/%s\n' "${1#"$templates"/}"; }

# The rendered set is built whole in a scratch directory and compared before anything
# reaches the repository. A target is this script's own output when it is byte-identical
# to what this run renders; anything else at that path is refused, whoever wrote it. Only
# content counts: an executable bit set on an installed script is the adopter's to set.
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
escape() { printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'; }
render() {
  sed \
    -e "s|{{FAMILY_PREFIX}}|$(escape "$prefix")|g" \
    -e "s|{{SOURCE_GLOBS}}|$(escape "$source_globs")|g" \
    -e "s|{{TEST_GLOBS}}|$(escape "$test_globs")|g" \
    -e "s|{{POST_MERGE_TRIGGERS}}|$(escape "$triggers")|g" \
    -e "s|{{UNCLAIMED_LABEL}}|$(escape "$unclaimed")|g" \
    "$1"
}
refused=0
while IFS= read -r file; do
  target="$(target_of "$file")"
  mkdir -p "$scratch/$(dirname "$target")"
  render "$file" >"$scratch/$target"
  if [ -e "$target" ] && [ "$(git hash-object "$target")" != "$(git hash-object "$scratch/$target")" ]; then
    say "refused: $target exists and is not this script's output; ADOPTING.md states the merge path" >&2
    refused=1
  fi
done < <(template_files)
[ "$refused" -eq 0 ] || exit 1

while IFS= read -r file; do
  target="$(target_of "$file")"
  if [ -e "$target" ]; then
    say "found: $target"
  else
    mkdir -p "$(dirname "$target")"
    cp "$scratch/$target" "$target"
    say "created: $target"
  fi
done < <(template_files)

# The status labels, layered on the adopter's own set. The tracker's CLI infers the
# repository from the checkout's remote. Only a label the tracker lacks is created, so a
# rerun issues nothing and an adopter's edit to a description or colour stands.
# The list limit is well above any label set; the CLI's default page would hide labels.
existing="$(gh label list --limit 1000 --json name --jq '.[].name')"
label() {
  if grep -qxF "$1" <<<"$existing"; then
    say "found: label $1"
  else
    gh label create "$1" --color "$2" --description "$3" >/dev/null
    say "created: label $1"
  fi
}
label spec:needs-grilling    d93f0b "Beat stub awaiting its spec session's grill"
label spec:ready-for-tickets fbca04 "Spec grilled; the spec session may open tickets"
label spec:tickets-generated 0e8a16 "Tickets opened under this beat"
label ticket:in-review       1d76db "PR open; moved by the lifecycle workflow"
label ticket:landed          0e8a16 "PR merged; moved by the lifecycle workflow"
label ticket:blocked         b60205 "Ticket session found the spec wrong and flagged it; side state"
