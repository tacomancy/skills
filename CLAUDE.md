# CLAUDE.md

## Project

**tacomancy/skills** — agent skills distilled from how tacomancy projects are run (Vitrine first). One folder per skill under `skills/`, each holding a `SKILL.md`; other repositories install them with `npx skills add tacomancy/skills`. The skills are the source; there is no build.

## Specs and loop

A skill exists because a GitHub issue labelled `spec` says what it does; nothing is written without one. The loop, per skill:

1. **`to-tickets`** on the spec — vertical slices, each blocked on its predecessors.
2. **`implement`** per ticket on its own branch — drives **`tdd`** for every script the skill ships, and closes with **`code-review`**.
3. **`code-review`** again before the PR if the branch moved.

Specs #2–#5 are blocked on #1, which lands the repository skeleton (test project, structural checks, CI). Vendored skill names above are the `.agents/skills/` ones; see § Setup.

## Writing standard

- Write every `SKILL.md` with **`writing-for-agents`**: steps in the file, reference behind pointers, leading words over restatement, the positive instruction over the prohibition.
- A skill runs alone. It composes with another skill by naming it as a pointer and saying what to do when it is absent — never by requiring it.
- Nothing project-specific in the body. A Vitrine path, token, or variable name appears only as an example labelled as one; the contract is stated generically first.
- Each `SKILL.md` ends with one **Origin** line naming the project pattern it came from, so drift from the pattern is visible later.
- Scripts a skill ships live in its folder, run on the runtime the spec names and nothing more (bash + git + coreutils, or a single-file Node script), and are the skill's test seam. Comment the *why*; skip anything that restates the code.

## Tests

- `pnpm test` runs the `skills` Vitest project: structural checks over every skill folder (frontmatter, name equals folder, relative links resolve) and black-box tests for every script. A script's test drives it as its user would — exit code, output, files in a fixture directory — and never reaches inside it.
- Behavioural evaluation of the prose runs by hand with **`skill-creator`** before merge, from fixtures kept beside the skill. It is a review step, not a merge gate.

## Invariants

Never silently violate these:

- A check that fails on unknown input stays a failure. No warn-and-continue mode, no default value that lets the unknown through.
- Vendored third-party skills are never edited. Extension goes through the new skill's own trigger description, or one line in the adopting repository's guidance file.
- Tests ship separately from skills: `tests/` mirrors `skills/` so an install carries no test code.

## The public site

`tacomancy.com/skills/` is authored in `tacomancy/tacomancy`, not here. The page carries a status line (which specs are written, which skill is in tickets, what is installable), the five skills each with a one-line description, and the invariants above. Before merge, if the branch did any of the following, open an issue there — `gh issue create --repo tacomancy/tacomancy` — naming this PR and what the page should now say:

- landed a skill, so the install line works for it and the status line moves;
- added, removed, or renamed a skill, or changed the one line its `SKILL.md` frontmatter describes it with;
- changed an invariant in § Invariants.

Never edit the site from this repository.

## Setup

Vendor the loop's skills once per clone with `npx skills add mattpocock/skills`, picking `to-spec`, `to-tickets`, `implement`, `tdd`, `code-review`, `writing-for-agents`, `grill-me`; they land in `.agents/skills/` with symlinks in `.claude/skills/` and a `skills-lock.json`, the same arrangement as Vitrine. `skill-creator` is Anthropic's and needs no vendoring.

## Agent skills

Issues live in GitHub Issues for `tacomancy/skills`, via the `gh` CLI. Labels: `spec` on every spec; `skill/<name>` on everything about one skill; the triage set `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Blocking is GitHub's native issue dependencies.
