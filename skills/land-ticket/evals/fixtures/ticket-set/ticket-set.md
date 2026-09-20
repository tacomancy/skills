# Ticket set — `shelf-sort`

A parent spec with three child tickets, in the shape `to-tickets` produces. The repository is `acme/reader`; the base branch is `main`; the history's last five merges into `main` are `Merge pull request` entries.

## Parent

- **#7** `feat: sort the finished shelf by date finished` — label `spec`, `skill/shelf-sort`. Open.

## Children

| Ticket | Title | Label | Blocked by | State |
|---|---|---|---|---|
| #8 | Sort key on the Book model | `skill/shelf-sort` | — | Closed, landed in PR #10 |
| #9 | Finished shelf reads the sort key | `skill/shelf-sort` | #8 | Open, PR #12 open |
| #11 | Sort toggle on the library surface | `skill/shelf-sort` | #9 | Open, no PR |

## PR #12

- Branch `feat/ticket-9-shelf-reads-key`, base `main`, body "Implements #9".
- Reviewed; `code-review` has run.
- Head at invocation: `a1a1a1a`.
- `main` has moved since the branch was cut (PR #10 landed after it); the branch is **behind** with no conflicting files.

## Tracker answers

What the tracker returns, in order, for a run of the skill on PR #12:

1. Merge state: `BEHIND`, mergeable, no conflicts.
2. Update branch: succeeds; head moves `a1a1a1a` → `b2b2b2b`.
3. Runs for branch `feat/ticket-9-shelf-reads-key`:
   - run 501, head `a1a1a1a`, completed, conclusion `success`
   - run 502, head `b2b2b2b`, in progress
4. Watching run 502: completes, conclusion `success`.
5. Merge state after 4: `CLEAN`.

## Close answers

What the tracker returns for the Close step, after PR #12 merges:

1. Close #9 with comment "Landed in #12.": succeeds; #9 reads closed.
2. Body of #9, `## Parent` section: `#7`.
3. Issues labelled `skill/shelf-sort`, all states, excluding #7: #8 closed, #9 closed, #11 open.
4. #7 is left open; one child (#11) remains.

## Frontier answers

What the tracker returns for the Frontier step, after #9 closes:

1. Open issues labelled `skill/shelf-sort`, excluding #7: #11.
2. Blocked-by edges of #11, through the tracker's native dependencies: #9, closed.
3. No other edges. #11 has no open blocker; #9 is among its blockers.

## Variant — last child

The same set later: #8 and #9 closed (PRs #10 and #12), #11 has PR #14 open on branch `feat/ticket-11-sort-toggle`, base `main`, body "Implements #11", reviewed, merge state `CLEAN`, its head's run completed green. After PR #14 merges, the tracker returns:

1. Close #11 with comment "Landed in #14.": succeeds; #11 reads closed.
2. Body of #11, `## Parent` section: `#7`.
3. Issues labelled `skill/shelf-sort`, all states, excluding #7: #8 closed, #9 closed, #11 closed.
4. Closing comments: #8 "Landed in #10."; #9 "Landed in #12."
5. Close #7 with a comment listing the PRs: succeeds; #7 reads closed.

For the Frontier step in this variant, the open issues labelled `skill/shelf-sort`, excluding #7, are none: the frontier is empty and nothing was unblocked.
