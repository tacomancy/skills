#!/usr/bin/env bash
# The scaffold step of the guidance-tiers skill: writes the frozen tier, the living docs,
# the precedence section, the check script, and the CI job into the current repository,
# each only where absent. The interview's answers arrive as flags; everything else has a
# default. Bash, git, and coreutils only, because the target repository may have no
# other toolchain.
#
# Usage: scaffold.sh [flags]
#   --artefact PATH       the frozen artefact: inside the repository it is moved into the
#                         frozen tier, outside it is copied; omit when not yet in the repo
#   --guidance FILE       the agent guidance file, CLAUDE.md or AGENTS.md (default CLAUDE.md)
#   --architecture PATH   the living architecture document (default docs/architecture.md)
#   --frozen-dir DIR      the frozen tier (default docs/reference)
#   --context PATH        the vocabulary file (default CONTEXT.md)
#   --adr-dir DIR         the ADR directory (default docs/adr)
#   --script PATH         where the check script goes (default scripts/check-guidance.sh)
#   --ci github|other     write a GitHub Actions job, or print the one command to wire
#                         into another CI (default github)
set -euo pipefail

artefact=""
guidance="CLAUDE.md"
architecture="docs/architecture.md"
frozen_dir="docs/reference"
context="CONTEXT.md"
adr_dir="docs/adr"
script="scripts/check-guidance.sh"
ci="github"
while [ $# -gt 0 ]; do
  case "$1" in
    --artefact) artefact="$2"; shift 2 ;;
    --guidance) guidance="$2"; shift 2 ;;
    --architecture) architecture="$2"; shift 2 ;;
    --frozen-dir) frozen_dir="$2"; shift 2 ;;
    --context) context="$2"; shift 2 ;;
    --adr-dir) adr_dir="$2"; shift 2 ;;
    --script) script="$2"; shift 2 ;;
    --ci) ci="$2"; shift 2 ;;
    *) printf 'unknown flag: %s\n' "$1" >&2; exit 2 ;;
  esac
done
case "$guidance" in CLAUDE.md|AGENTS.md) ;; *) printf 'guidance file must be CLAUDE.md or AGENTS.md, got %s\n' "$guidance" >&2; exit 2 ;; esac
case "$ci" in github|other) ;; *) printf -- '--ci must be github or other, got %s\n' "$ci" >&2; exit 2 ;; esac

skill_dir="$(cd "$(dirname "$0")" && pwd)"
root="$(git rev-parse --show-toplevel)"
cd "$root"
say() { printf '%s\n' "$*"; }

# Writes stdin to a file only when the file is absent.
place() {
  if [ -e "$1" ]; then cat >/dev/null; say "found: $1"; else mkdir -p "$(dirname "$1")"; cat >"$1"; say "created: $1"; fi
}

# The frozen tier: the artefact moved or copied in, and the index README.
mkdir -p "$frozen_dir"
artefact_name=""
if [ -n "$artefact" ]; then
  artefact_name="$(basename "$artefact")"
  target="$frozen_dir/$artefact_name"
  if [ -e "$target" ]; then
    say "found: $target"
  else
    case "$(cd "$(dirname "$artefact")" && pwd)/" in
      "$root"/*) git mv "$artefact" "$target" 2>/dev/null || mv "$artefact" "$target"; say "moved: $artefact -> $target" ;;
      *) cp "$artefact" "$target"; say "copied: $artefact -> $target" ;;
    esac
  fi
fi
{
  say "# Reference"
  say
  say "The frozen tier. Nothing here is edited: a correction or a new decision goes in the living docs, and every divergence from a document here traces to an ADR. This README is the tier's index and changes only when the directory's contents change."
  say
  say "## Contents"
  say
  if [ -n "$artefact_name" ]; then say "- \`$artefact_name\` — the frozen artefact, brought in from \`$artefact\`."; else say "_Nothing yet; the artefact is not in the repository._"; fi
} | place "$frozen_dir/README.md"

# The living docs, each seeded with its shape and the one-line rule for what lives there.
{
  say "# Vocabulary"
  say
  say "The project's terms, one definition each. New vocabulary lives here and nowhere else; a term's meaning here wins over the frozen tier where the two differ."
} | place "$context"
{
  say "# Architecture"
  say
  say "Technical decisions, and the questions that block work. A decision that resolves a question moves it from the second list to the first and gets an ADR in \`$adr_dir/\`."
  say
  say "## Decided"
  say
  say "## Open, in the order they block work"
} | place "$architecture"
{
  say "# NNNN: Title"
  say
  say "## Status"
  say
  say "Proposed | Accepted | Superseded by NNNN"
  say
  say "## Context"
  say
  say "The question this closes, and what in the frozen tier or the living docs it diverges from."
  say
  say "## Decision"
  say
  say "## Consequences"
} | place "$adr_dir/0000-template.md"

# The precedence section, appended to the guidance file in its fixed shape: the tiers
# and their rules, precedence, the reading rule, the writing rule.
section() {
  say "## Guidance tiers"
  say
  say "**Frozen tier** — \`$frozen_dir/\`. Nothing in it is edited; its \`README.md\` is the index and changes only when the directory's contents change. A correction or a new decision goes in the living docs."
  say
  say "**Living docs** — \`$context\` holds the vocabulary; \`$architecture\` holds technical decisions, decided and open; \`$adr_dir/\` holds resolved questions, one numbered ADR each."
  say
  say "**Precedence** — where the living docs speak, they win; where they are silent, the frozen tier is the fallback. Every divergence between a living doc and the frozen tier traces to an ADR."
  say
  say "**Reading rule** — before working on any surface the frozen artefact describes, read the artefact in full: the whole document, this session, never a summary."
  say
  say "**Writing rule** — new vocabulary goes in \`$context\`, a technical decision in \`$architecture\`, a resolved question in a new ADR in \`$adr_dir/\`. These three are the only homes for it."
  say
  say "\`$script\` enforces the tiers and runs in CI on every pull request."
}
if [ -e "$guidance" ]; then
  { say; section; } >>"$guidance"; say "appended: $guidance § Guidance tiers"
else
  { say "# ${guidance%.md}"; say; section; } | place "$guidance"
fi

# The check script, copied from beside this one with its configuration block filled in.
# The repository owns the copy from here on: its rules are its own.
if [ -e "$script" ]; then
  say "found: $script"
else
  mkdir -p "$(dirname "$script")"
  sed \
    -e "s|^FROZEN_DIR=\"[^\"]*\"|FROZEN_DIR=\"$frozen_dir\"|" \
    -e "s|^LIVING_DOCS=([^)]*)|LIVING_DOCS=(\"$context\" \"$architecture\")|" \
    -e "s|^ADR_DIR=\"[^\"]*\"|ADR_DIR=\"$adr_dir\"|" \
    "$skill_dir/check-guidance.sh" >"$script"
  chmod +x "$script"
  say "created: $script"
fi

# The CI job. GitHub Actions gets a workflow; any other CI gets the one command to run.
if [ "$ci" = "github" ]; then
  {
    say "name: guidance"
    say
    say "on:"
    say "  pull_request:"
    say
    say "jobs:"
    say "  guidance:"
    say "    runs-on: ubuntu-latest"
    say "    steps:"
    say "      - uses: actions/checkout@v4"
    say "        with:"
    say "          fetch-depth: 0"
    say "      - run: bash $script origin/\${{ github.base_ref }}"
  } | place ".github/workflows/guidance.yml"
else
  say "wire into CI, on every pull request, with the base branch fetched: bash $script origin/<base-branch>"
fi
