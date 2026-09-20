<!-- One PR lands one ticket. The first line names it by a closing keyword; the
     ticket-link check reads that line and the ticket's family label. -->

Closes #<ticket>

## Scope

One or two sentences: the behaviour this ticket delivers, and nothing outside it.

## Code review

`code-review` ran before this PR opened, and again after any push that moved the branch.
The landing gate reads this section for the review's presence.

- **Findings**: each one and what changed for it, or "none".
- **Declined**: each finding left as it was, with why, or "none".

## Checklist

- [ ] Built with `implement` driving `tdd`: every seam went red before green, or the body says why a test change is absent
- [ ] `code-review` ran on the current head and its result is above
- [ ] This PR touches this ticket only: no other ticket's branch, no file outside its scope
- [ ] Where a post-merge trigger fires on this change, a line naming it says which: the issue it obliges — `<trigger>: owner/repo#N` — or `<trigger>: none` when the change fired the path but not the condition; the post-merge-trigger check reads that line
