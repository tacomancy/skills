---
name: land-ticket
description: Merge a ticket's green PR, close the ticket, open the public-site issue when the change moved the page, and report the new frontier.
disable-model-invocation: true
---

# Land ticket

The step after `implement` and `code-review`: a ticket's PR is open and reviewed, and this lands it. The argument is the PR number; without one, use the PR bound to this session, or the open PR for the current branch.

## 1. Gate

**Gate** on the PR's merge state and on the check run for its current head, in that order.

Read the merge state through the tracker: clean, behind, or conflicting. A branch that is merely **behind** the base — no conflicts — is brought up to date here, through the tracker's update-branch operation, and the gate continues on the new head:

```bash
# gh, as an example of the update-branch operation
gh pr update-branch <PR>
```

Then wait on the check run whose head is the PR's **current head**: read the head SHA, list the runs for the branch, pick the one whose head matches, and watch that run to its conclusion. The head, not the PR's aggregate — a watch on the PR's checks reports the previous head's finished run and returns before the new one starts.

```bash
# gh, as an example of list-runs-for-a-head and watch-a-run
gh pr view <PR> --json headRefOid,headRefName --jq '.headRefOid, .headRefName'
gh run list --branch <branch> --json databaseId,headSha --jq '.[] | select(.headSha=="<head>") | .databaseId'
gh run watch <run> --exit-status
```

Done when that run passes and the merge state reads clean.

**Hand back** on a red check or a conflicting update: stop, say which of the two it was and on which head, and go straight to the report — the fix is the implementing session's work, made where the context is. The report's last line carries what was handed back.

## 2. Merge

Read the merge style from the base's recent history — the last ten commits on it — and match it: merge commits (`Merge pull request` entries), squashes (one commit per PR, no merge entries), or rebases (the PR's commits on the base, unchanged). Merge in that style through the tracker and delete the branch:

```bash
# gh, as an example: --merge, --squash, or --rebase, whichever the history reads
git log --oneline -10 <base>
gh pr merge <PR> --merge --delete-branch
```

Then check out the base locally and pull. Done when the base's tip is the merge: `git log -1` on the base shows the merge commit, the squash, or the rebased head, matching the style read.

## 3. Close

**Close** the ticket with one comment naming the PR, whatever the PR body said — a closing keyword, "Implements #N", or nothing at all — so the ticket's state rests on this step rather than on the body's wording. Then read the ticket's parent and list every child of the parent, closed ones included: when every other child reads closed, close the parent with one comment listing each child's PR — this one's, and for each sibling the PR its own closing comment names; while any child is open, leave the parent alone and count the open ones for the report.

The ticket, its parent, and its siblings are the shape `to-tickets` produces: a `## Parent` section naming the parent issue, `## Blocked by` edges, and one label family per skill (`skill/<name>`, as an example) that the parent carries beside its `spec` label and every child carries alone. A ticket with no `## Parent` section has no parent, and the step ends at the ticket's close. Without `to-tickets`, the ticket is the PR's linked issue, closed the same way, and there is no parent step.

```bash
# gh, as an example of close-with-comment, read-the-parent, list-its-children
gh issue close <N> --comment "Landed in #<PR>."
gh issue view <N> --json body --jq '.body' | sed -n '/^## Parent/,/^## /p'
gh issue list --label "skill/<name>" --state all --limit 500 --json number,state \
  --jq '.[] | select(.number != <P>) | "\(.number) \(.state)"'
gh issue view <N1> --json comments --jq '.comments[].body' | grep -o 'Landed in #[0-9]*'
gh issue close <P> --comment "All children landed: #<PR1> (#<N1>), #<PR2> (#<N2>), #<PR3> (#<N3>)."
```

Done when the ticket reads closed and the parent's state is stated: closed with the PR list, or open with the count of children still open.

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

Five lines: the merge commit, the ticket closed and the parent's state, the site issue opened or "no trigger fired", the frontier, and anything handed back from the gate — or that the branch was updated first.
