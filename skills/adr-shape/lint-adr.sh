#!/usr/bin/env bash
# Lints ADR files against the shape adr-shape writes. It checks the mechanical parts —
# title and number, status vocabulary, section order, a verdict on every option, dated
# updates after Consequences — so the shape is enforced in CI rather than described.
# One line per finding, naming the thing at fault; exit 1 on any finding, 0 when every
# file conforms, 2 when it was not given anything to lint.
#
# Usage: lint-adr.sh <file-or-directory>...
#   A directory stands for every NNNN-*.md in it. Bash + coreutils only, so a repository
#   can call it from its own check (guidance-tiers' check-guidance.sh, for one).

set -euo pipefail
fail=0
bad() { printf '%s: %s\n' "$file" "$*"; fail=1; }

# Every option carries a verdict word so the ADR says why each lost: Rejected, Deferred
# until, or Named fallback. The finding names the option by its bold lead, or by its
# first words when it has none, so the reader can fix it without opening the lint.
check_option() {
  [ -n "$option" ] || return 0
  case "$option" in
    *Rejected*|*"Deferred until"*|*"Named fallback"*) ;;
    *)
      if [[ "$option" =~ ^\*\*([^*]+)\*\* ]]; then name="${BASH_REMATCH[1]}"; else name="$(printf '%s' "$option" | cut -c1-40)"; fi
      bad "option \"$name\" has no verdict (Rejected, Deferred until, Named fallback)" ;;
  esac
  option=""
}

lint_file() {
  file="$1"
  if [ ! -f "$file" ]; then bad "no such file"; return; fi
  name="${file##*/}"

  # The file name carries the number the title must agree with; a file the numbering
  # cannot see is a finding in its own right (guidance-tiers checks the directory for
  # gaps, this lint checks the file against its own name).
  case "$name" in
    [0-9][0-9][0-9][0-9]-*.md) file_num="${name%%-*}" ;;
    *) bad "file name is not NNNN-<slug>.md"; return ;;
  esac

  # A file saved with CRLF endings is read with its \r stripped, so the findings name the
  # actual fault rather than a status that "is not" itself.
  title="$(head -n 1 "$file" | tr -d '\r')"
  if [[ "$title" =~ ^#\ ([0-9]{4}):\ .+$ ]]; then
    [ "${BASH_REMATCH[1]}" = "$file_num" ] || bad "title number ${BASH_REMATCH[1]} disagrees with file name $name"
  else
    bad "first line is not a title of the form \"# NNNN: <decision as a sentence>\""
  fi

  # Status is a closed vocabulary. Proposed carries its gate in the line so a provisional
  # decision cannot silently become permanent; Superseded names the successor's number
  # and may say in a dash clause what of this ADR still stands. Anything else fails —
  # there is no default that lets an unknown word through.
  status="$(grep -m 1 '^\*\*Status:\*\*' "$file" | tr -d '\r' || true)"
  if [ -z "$status" ]; then
    bad "no **Status:** line"
  else
    value="${status#\*\*Status:\*\*}"; value="${value# }"
    case "$value" in
      Accepted) ;;
      "Proposed — becomes Accepted when "?*) ;;
      "Superseded by "[0-9][0-9][0-9][0-9]|"Superseded by "[0-9][0-9][0-9][0-9]" — "?*) ;;
      *) bad "status \"$value\" is not one of: Accepted, Proposed — becomes Accepted when <gate>, Superseded by NNNN" ;;
    esac
  fi
  # The body is the required sections in the spec's order — lead paragraph, Decisions,
  # Considered options, Consequences — then only dated Update sections, which are
  # appended, never inserted, so the text above them records what was believed when it
  # was written. Any other "## " heading is outside the shape and fails by name.
  seen_decisions=0; seen_options=0; seen_consequences=0; lead=0; section=""; option=""
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    # A bullet under Considered options runs until the next bullet, blank line, or
    # heading; its verdict may sit on a wrapped line, so the bullet is judged whole.
    if [ "$section" = "## Considered options" ]; then
      case "$line" in
        "- "*|"* "*|"## "*|"") check_option; [ "${line#[-*] }" != "$line" ] && option="${line#[-*] }" ;;
        *) [ -n "$option" ] && option="$option ${line#"${line%%[! ]*}"}" ;;
      esac
    fi
    case "$line" in
      "## "*)
        section="$line"
        case "$line" in
          "## Decisions")
            [ $seen_decisions -eq 0 ] || bad "section appears twice: ## Decisions"
            [ $seen_options -eq 0 ] && [ $seen_consequences -eq 0 ] || bad "section out of order: ## Decisions comes before ## Considered options and ## Consequences"
            seen_decisions=1 ;;
          "## Considered options")
            [ $seen_options -eq 0 ] || bad "section appears twice: ## Considered options"
            [ $seen_consequences -eq 0 ] || bad "section out of order: ## Considered options comes before ## Consequences"
            seen_options=1 ;;
          "## Consequences")
            [ $seen_consequences -eq 0 ] || bad "section appears twice: ## Consequences"
            seen_consequences=1 ;;
          "## Update ("[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]")"|"## Update ("[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]", "*")")
            [ $seen_consequences -eq 1 ] || bad "$line appears before ## Consequences; updates are appended below it" ;;
          "## Update"*) bad "$line is not dated: the heading is \"## Update (YYYY-MM-DD)\"" ;;
          *) bad "section outside the shape: $line" ;;
        esac ;;
      "#"*) ;;
      # The status sits under the title; found under a section, it is not the ADR's status.
      "**Status:**"*) [ -z "$section" ] || bad "**Status:** line under $section; it belongs directly under the title" ;;
      "")  ;;
      *) [ -z "$section" ] && lead=1 ;;
    esac
  done < "$file"
  check_option
  [ $lead -eq 1 ] || bad "no lead paragraph between the status line and ## Decisions"
  [ $seen_decisions -eq 1 ] || bad "missing section: ## Decisions"
  [ $seen_options -eq 1 ] || bad "missing section: ## Considered options"
  [ $seen_consequences -eq 1 ] || bad "missing section: ## Consequences"
}

[ "$#" -gt 0 ] || { printf 'usage: lint-adr.sh <file-or-directory>...\n' >&2; exit 2; }
for target in "$@"; do
  if [ -d "$target" ]; then
    for entry in "$target"/[0-9][0-9][0-9][0-9]-*.md; do
      [ -e "$entry" ] && lint_file "$entry"
    done
  else
    lint_file "$target"
  fi
done
exit "$fail"
