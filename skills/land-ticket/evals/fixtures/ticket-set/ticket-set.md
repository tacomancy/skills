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
