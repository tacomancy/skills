# Templates

The tracker files the install script places in an adopting repository, laid out as they land under `.github/`:

| Here | Installed to | Opens |
|---|---|---|
| `ISSUE_TEMPLATE/spec-stub.md` | `.github/ISSUE_TEMPLATE/spec-stub.md` | a **beat** as a spec awaiting its grill: `spec` and `spec:needs-grilling` on it, the beat name as the title, the brief, the scope, and what "ready for tickets" needs |
| `ISSUE_TEMPLATE/ticket.md` | `.github/ISSUE_TEMPLATE/ticket.md` | a ticket in the one shape `to-tickets` produces — `## Parent`, `## What to build`, `## Acceptance criteria`, `## Blocked by` — for a repository without that skill |
| `pull_request_template.md` | `.github/pull_request_template.md` | a PR that names its ticket by a closing keyword and carries the review under `## Code review`, the heading the landing gate reads |
| `workflows/*.yml` | `.github/workflows/*.yml` | one check each on every pull request; each YAML checks out and runs its script, nothing more |
| `workflows/scripts/*.mjs` | `.github/workflows/scripts/*.mjs` | the checks' logic, one single-file Node script each, driven by the tests |
| `workflows/ticket-lifecycle-labels.yml`, `workflows/scripts/ticket-lifecycle.mjs` | the same paths under `.github/` | the one workflow that is not a check: the lifecycle-label mover, `ticket:in-review` on the ticket at PR open, `ticket:landed` on it and a comment on the beat its `## Parent` names at merge |

The issue templates are markdown with front matter rather than issue forms: a form renders each field as an `###` heading, and the workflows and `land-ticket` read the `##` sections `to-tickets` writes. This file stays here; it is not installed.

## The family prefix

One label family per beat — `<prefix>/<beat>` — carried by the beat and every ticket under it. The prefix is the adopter's; the beat is per issue, so the filer adds the label at open and the templates say so.

`{{FAMILY_PREFIX}}` is the substitution point in the issue and PR templates, and the contract the install script keeps:

- The script replaces every occurrence, in every file it installs, with the prefix the adopter names — `skill`, as an example, giving `skill/<beat>` as this repository labels its specs.
- The prefix carries no trailing slash; every occurrence in a template is followed by `/`, so the substituted text reads as a family label.
- The token appears in the templates' comments and label hints, and in the ticket-link workflow's env; nothing else in the issue and PR templates is substituted.
- After one substitution no `{{`…`}}` token remains, so a second run finds nothing to change. An Actions expression, `${{ … }}`, is not a token: the `$` marks it, and the script leaves it as written.

## The workflow parameters

Each check reads its parameters from the `env` of its one `run` step; the YAML carries a token there and the install script writes the value. A script that finds its token unsubstituted, or its parameter missing, exits 2 with an `ERROR` line — an unknown never passes. Every value is one line, so the script substitutes it as it does the prefix.

| Token | In | Value the install script writes |
|---|---|---|
| `{{FAMILY_PREFIX}}` | `ticket-link-check.yml` | the family prefix, as above; the YAML supplies the `/` |
| `{{SOURCE_GLOBS}}` | `test-touch-check.yml` | comma-separated globs naming the repository's source files — `src/**, lib/**/*.ts` as an example |
| `{{TEST_GLOBS}}` | `test-touch-check.yml` | comma-separated globs naming its test files — `tests/**, **/*.test.ts` as an example |
| `{{POST_MERGE_TRIGGERS}}` | `post-merge-trigger-check.yml` | the guidance file's post-merge section as `<name>: <glob>, <glob>; <name>: <glob>` — one trigger per `;`, named for what it obliges, with the paths that fire it; empty when the section names none. `the public site: skills/*/SKILL.md; the invariants: CLAUDE.md` as this repository's example |

Globs, in both scripts: `**` spans directories, `*` and `?` stay within one path segment, and a glob with no `/` matches a file name at any depth. Names and globs carry no `,`, `;`, or `:` beyond the separators, and no `"`, since the value sits in a double-quoted YAML string.

What each check reads from the PR, so a filer knows what passes it:

- **Ticket link**: a closing keyword — `Closes #N`, `Fixes #N`, `Resolves #N` and their forms — naming an issue that carries a `<prefix>/<beat>` label. Every issue so named is checked.
- **Test touch**: a source file changed without a test file changed fails unless the PR carries the label `no-tests-needed` or a body line `No tests needed: <why>` with the reason filled in.
- **Post-merge triggers**: a trigger whose globs match a changed file is linked by a body line that leads with the trigger's name (a list marker before it is fine) and references an issue after it — `the public site: owner/repo#N`, or an issue URL. Each fired trigger needs its own line.

## The lifecycle mover

`ticket-lifecycle-labels.yml` takes no parameter; its script reads what Actions sets — the event payload at `GITHUB_EVENT_PATH`, `GITHUB_REPOSITORY`, `GITHUB_API_URL` — and the token the YAML passes as `GITHUB_TOKEN`, and needs `issues: write`.

The lifecycle mover finds the tickets by the PR body's closing keywords — every one, as GitHub and the ticket-link check read them — and the beat by the ticket's `## Parent` section alone — the first `#<n>` or `/issues/<n>` inside it, matched as a number, never a `Spec:` line or a reference elsewhere in the body. It reads the ticket's labels through every page before it writes, holds one lifecycle label at a time — the other of `ticket:in-review` and `ticket:landed` goes when present, the target comes when absent — and leaves `ticket:blocked` as the side state it is. It writes labels and comments and nothing else: no call closes or reopens an issue or touches a `spec:` label. A PR with no closing keyword, or closed without merging, moves nothing; a tracker error fails the run.

The repository's `tests/bluesky-feature-pipeline/` holds the shape of each template, the placeholder contract, and each script's behaviour driven with fixture payloads against a served API.
