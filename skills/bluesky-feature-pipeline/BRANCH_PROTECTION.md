# Branch protection — the stage 0 checklist

The part of setup `install.sh` cannot do. Configure it once on the integration branch — the branch tickets land into — in the tracker's branch-protection or ruleset settings, each item for its reason. Every check below is one CI produces on the PR's current head, so the update-branch step at stage 8 re-runs it rather than orphaning it.

## Required

- [ ] **Require a pull request before merging.** Every change reaches the branch through a PR, so the ticket-link check has a body to read and stage 8 has a PR to land.
- [ ] **Require status checks to pass**, marking these required — the check names are the job names in the workflows the script installed:
  - your existing CI;
  - `ticket-link` — the body names a ticket by a closing keyword and the ticket carries a family label, so nothing lands untraceable;
  - `test-touch` — a source change with no test change fails unless the body or a label says why, so a skipped TDD loop is visible;
  - `post-merge-triggers` — a change that fires a trigger from the guidance file's post-merge section fails until the body links the issue it obliges, or states `none` where the change fired the path but not the condition, so the session that made the change meets the obligation rather than the landing discovering it.
- [ ] **Require branches to be up to date before merging.** A branch behind the base is updated and re-checked before it merges, which is the reconciliation the beat's session owns at stage 8; every required check above then speaks for the head that actually lands.
- [ ] **Block force pushes.** A ticket branch is shared with the reviewer and with stage 8; its history stays as pushed.
- [ ] **Block deletions.** The integration branch outlives every session that pushes to it.

## Convention: who merges

Only stage 8 merges — `land-ticket`, or the manual sequence in [`WORKFLOW.md`](WORKFLOW.md) § 8 — and a ticket session opens its PR and stops. This is stated as a convention rather than a push restriction because every session may act as one identity, and a restriction on that identity would bind stage 8 with the ticket sessions. The skill's stage 7 boundary and the PR template carry the rule; the required PR above is what makes a merge visible when the convention slips.

## Worth adding

- [ ] **Require a linear history**, when the history's merge style is rebase or squash; `land-ticket` merges in the style it reads, so set this only if the style is already linear.
- [ ] **Code owners** on paths that always get human review whatever `code-review` found — security-sensitive code, infrastructure, public APIs.
- [ ] **Require signed commits**, where that is already the norm.

## As code

Rulesets export and import as JSON, and the usual infrastructure-as-code providers have a resource for branch protection. Worth doing once the settings stop moving; hand configuration is enough to start.
