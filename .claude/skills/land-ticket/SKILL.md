---
name: land-ticket
description: Merge a ticket's green PR, close the ticket, open the public-site issue when the change moved the page, and report the new frontier.
disable-model-invocation: true
---

# Land ticket

The step after `implement` and `code-review`: a ticket's PR is open and reviewed, and this lands it. The argument is the PR number; without one, use the PR bound to this session, or the open PR for the current branch.

## 1. Gate

Read the PR's merge state first. A branch that is merely **behind** `main` — no conflicts — is brought up to date here, not handed back:

```bash
gh pr update-branch <PR>
```

Then wait on the check run for the PR's **current head SHA** — `gh pr checks --watch` reports the previous head's finished run and returns early, so find the run whose `headSha` is the head and watch that one:

```bash
gh run list --branch <branch> --json databaseId,headSha --jq '.[] | select(.headSha=="<head>") | .databaseId'
gh run watch <run> --exit-status
```

Done when that run passes and the merge state reads `CLEAN`. A red check or a conflicting rebase stops here: say which, and hand back — the fix is the implementing session's work, and Auto-fix on the PR already wakes it.

## 2. Merge

Merge with a **merge commit** — the history is merge commits, one per PR — and delete the branch:

```bash
gh pr merge <PR> --merge --delete-branch
```

Then check out `main` and pull. Done when `git log -1` on `main` is the merge commit.

## 3. Close the ticket

The PR body names its ticket as "Implements #N", which closes nothing on its own. Close the ticket with one comment naming the PR:

```bash
gh issue close <N> --comment "Landed in #<PR>."
```

Leave the spec issue open; it closes with the skill's publish ticket. Done when the ticket reads closed and the spec reads open.

## 4. Site issue

Read `CLAUDE.md` § The public site and take its trigger list against this PR's diff: a skill landed and became installable, a skill added, removed or renamed, a skill's description line changed, an invariant changed. For any trigger that fired, open one issue in the site repository naming the PR and what the page should now say:

```bash
gh issue create --repo tacomancy/tacomancy --title "skills page: <what moved>" --body "<PR link>; the page should now say <…>"
```

Done when each fired trigger has an issue, or the list was checked and none fired — say which.

## 5. Frontier

List the open tickets whose blockers are all closed — the ones a session can start now:

```bash
gh api repos/<owner>/<repo>/issues/<N>/dependencies/blocked_by --jq '.[].state'
```

for each open ticket under the same `skill/<name>` label. Done when the report names the frontier and, for the closed ticket, the tickets it unblocked.

## Report

Five lines: the merge commit, the ticket closed, the site issue opened or "no trigger fired", the frontier, and anything handed back from the gate — or that the branch was updated first.
