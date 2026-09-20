# Beat issues — reading goals, beat "progress ring"

The tracker's state for one beat of the reading-goals feature in `acme/reader`, after stage 5 opened the stubs and stage 6 ran on this one. The family label is `feature/reading-goals`.

## Beats opened at stage 5

| Issue | Title | Labels | State |
|---|---|---|---|
| #18 | spec stub: goal storage and the goal editor | `spec`, `feature/reading-goals`, `spec:needs-grilling` | Open, untouched since stage 5 |
| #20 | spec stub: progress ring on the library surface | `spec`, `feature/reading-goals`, `spec:tickets-generated` | Open |

The stage 5 session's handoff document is `docs/handoff/reading-goals.md`: the two beats in order, #18 before #20 because the ring reads the goal row #18 stores, and a note that the brief's changelog entry of 2026-08-04 (the ring instead of the line) is the source for #20's layout.

## Beat #20 — body

```
## Parent

Brief: docs/reference/brief.md, changelog entry 2026-08-04.

## Problem

The library surface shows no progress against the year's goal.

## Solution

A progress ring beside the shelf list showing books finished this year over the year's goal, books by default with pages on hover, reading the goal row #18 stores and computing progress from the finished shelf's dates. Nothing stored.

## Out of scope

The goal editor (#18). Past years on the ring.
```

Comments on #20, in order:

1. 2026-08-06, the spec session: "Grilled to ready; label moved to `spec:ready-for-tickets`."
2. 2026-08-06, the spec session: "Tickets #21, #22, #23 opened with `to-tickets`; label moved to `spec:tickets-generated`. Roadmap issue acme/site#40 opened per the guidance file's changelog section."

## Tickets of #20

| Ticket | Title | Labels | Blocked by | State |
|---|---|---|---|---|
| #21 | Progress computed from the finished shelf's dates | `feature/reading-goals`, `ready`, `ticket:landed` | — | Closed — "Landed in #24." |
| #22 | Progress ring component on the library surface | `feature/reading-goals`, `ready`, `ticket:in-review` | #21 | Open, PR #25 open |
| #23 | Pages on hover | `feature/reading-goals`, `ready` | #22 | Open, no PR |

Each ticket's body has `## Parent` naming `#20`, `## What to build`, `## Acceptance criteria`, `## Blocked by`.

### #22 — body

```
## Parent

#20

## What to build

A `ProgressRing` component under `src/library/` reading `progress(year)` from #21 and the goal from the goal row, rendering books read over books goal.

## Acceptance criteria

- [ ] Ring renders with the finished count and the goal
- [ ] Ring renders empty when no goal row exists for the year
- [ ] Goal row is read through `goals.forYear(year)` from `src/model/goals.ts`

## Blocked by

- #21
```

## PR #25

- Branch `agent/ticket-22`, base `main`, body opens `Closes #22`, carries a `## Code review` section with findings and declined items.
- Head `c3c3c3c`; merge state `CLEAN`; the run for `c3c3c3c` completed green; the ticket-link, test-touch, and post-merge-trigger checks passed.

## Variant — wrong spec

The same state at the moment the ticket session for #22 opens, before any code: `src/model/goals.ts` does not exist and #18 — the beat that would create it — is still `spec:needs-grilling` with no tickets. The third acceptance criterion cannot be met as written, and writing the goal model inside #22 would be #18's work.

## Variant — resume

The spec session for #20 was closed on 2026-08-07. A fresh session opens with no handoff and the prompt "pick up beat #20"; the tracker reads as the tables above.
