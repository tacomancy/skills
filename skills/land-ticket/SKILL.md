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

## 4. Post-merge triggers

Read the repository's guidance file — `CLAUDE.md` or `AGENTS.md` at the root — for the section stating what must happen when a change lands: a list of **triggers**, each an obligation with a condition on the change and a thing to do when it holds. Take every trigger against this PR's diff:

```bash
gh pr diff <PR> --name-only
gh pr diff <PR>
```

Each trigger ends in one of three states, and the step is done when every one is marked:

- **Did not fire** — the diff holds nothing the condition names.
- **Fired, already covered** — the condition holds, and the target already has an open issue for it. Search the target first, before opening anything: an open issue naming this PR, or naming the same change (the skill, the page, the section the trigger is about). Link it in the report, and add one comment there naming this PR when the issue does not name it yet — two sessions landing PRs for one skill make one issue, not two.
- **Fired, done** — the condition holds and nothing covers it; do the thing the trigger says, naming the PR.

```bash
# gh, as an example of search-the-target-first, then open
gh issue list --repo <owner>/<site> --state open --search "<PR link or the change's name>" --json number,title,url
gh issue create --repo <owner>/<site> --title "<page>: <what moved>" --body "<PR link>; the page should now say <…>"
```

A guidance file with no such section, or none at the root, is reported as "no post-merge section" and the step ends there.

As an example of such a section: this repository's `CLAUDE.md § The public site` lists three triggers — a skill landed, a skill added, removed or renamed or its description line changed, an invariant changed — each obliging one issue in the site's repository naming the PR and what the page should now say. A PR that lands `skills/foo/SKILL.md` fires the first; one touching only `tests/` fires none.

## 5. Frontier

The **frontier** is the set of open tickets a session can start now: every open ticket in the closed ticket's label family — the parent excluded, since it carries the family's label too — whose blockers all read closed. List the family's open tickets, read each one's blocking edges through the tracker's native dependencies, and keep the tickets with no open blocker. Of those, the ones whose edges name the ticket just closed are what this merge **unblocked** — their last open blocker was this one — and the report names them apart from the rest of the frontier.

```bash
# gh, as an example of list-the-family's-open-tickets and read-blocked-by-edges
gh issue list --label "skill/<name>" --state open --limit 500 --json number --jq '.[] | select(.number != <P>) | .number'
gh api repos/<owner>/<repo>/issues/<M>/dependencies/blocked_by --jq '.[] | "\(.number) \(.state)"'
```

Without `to-tickets` there is no family and no edges, and the frontier line reads "no ticket set". Done when the report names both the frontier and the tickets unblocked; an empty one is stated as empty.

## Report

Five lines, in this order, one per step so every step's output has a line to land in:

1. **Merge** — the merge commit on the base, in the style read; or that nothing merged.
2. **Close** — the ticket closed, and the parent's state: closed with its PR list, open with the count of children remaining, or no parent.
3. **Triggers** — each trigger's state: fired and done with what was done, fired and already covered with the issue linked, did not fire; or "none fired" or "no post-merge section".
4. **Frontier** — the tickets a session can start now, and which of them this merge unblocked; or "no ticket set".
5. **Handed back** — what the gate handed back and on which head, or that the branch was updated first, or that neither happened.
