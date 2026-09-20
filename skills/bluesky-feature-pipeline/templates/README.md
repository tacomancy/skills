# Templates

The tracker files the install script places in an adopting repository, laid out as they land under `.github/`:

| Here | Installed to | Opens |
|---|---|---|
| `ISSUE_TEMPLATE/spec-stub.md` | `.github/ISSUE_TEMPLATE/spec-stub.md` | a **beat** as a spec awaiting its grill: `spec` and `spec:needs-grilling` on it, the beat name as the title, the brief, the scope, and what "ready for tickets" needs |
| `ISSUE_TEMPLATE/ticket.md` | `.github/ISSUE_TEMPLATE/ticket.md` | a ticket in the one shape `to-tickets` produces — `## Parent`, `## What to build`, `## Acceptance criteria`, `## Blocked by` — for a repository without that skill |
| `pull_request_template.md` | `.github/pull_request_template.md` | a PR that names its ticket by a closing keyword and carries the review under `## Code review`, the heading the landing gate reads |

The issue templates are markdown with front matter rather than issue forms: a form renders each field as an `###` heading, and the workflows and `land-ticket` read the `##` sections `to-tickets` writes. This file stays here; it is not installed.

## The family prefix

One label family per beat — `<prefix>/<beat>` — carried by the beat and every ticket under it. The prefix is the adopter's; the beat is per issue, so the filer adds the label at open and the templates say so.

`{{FAMILY_PREFIX}}` is the one substitution point in these files, and the contract the install script keeps:

- The script replaces every occurrence, in every file it installs, with the prefix the adopter names — `skill`, as an example, giving `skill/<beat>` as this repository labels its specs.
- The prefix carries no trailing slash; every occurrence in a template is followed by `/`, so the substituted text reads as a family label.
- The token appears in the templates' comments and label hints only; nothing else in these files is substituted. The workflows' path globs are a separate contract, stated with the workflows.
- After one substitution no `{{`…`}}` remains, so a second run finds nothing to change.

The repository's `tests/bluesky-feature-pipeline/` holds the shape of each template and this contract.
