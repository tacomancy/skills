# Guidance file — with a post-merge section

The `CLAUDE.md` of `acme/reader`, the repository in `../ticket-set`, with a section — § The public changelog — stating what must happen when a change lands. Read beside the ticket set's PR #12.

## PR #12's diff

```
src/shelves/finished/shelf.ts      | 14 ++++++++------
src/shelves/finished/shelf.test.ts |  9 +++++++++
```

The finished shelf now orders its books by the sort key from #8 — date finished, newest first — where it read insertion order before. No shelf is added or removed; `src/keys.ts` is untouched.

## Taken against the section

| Trigger | Against the diff | State |
|---|---|---|
| a shelf changed what it shows or how it orders | `src/shelves/finished/shelf.ts` changes the order | fires |
| a shelf added or removed | no folder under `src/shelves/` appears or goes | did not fire |
| a keyboard shortcut changed | `src/keys.ts` untouched | did not fire |

## Target answers

What `acme/site` returns, in two variants:

- **No issue yet** — the open-issue search for PR #12, `shelf-sort`, or the finished shelf returns nothing. Opening an issue succeeds: `acme/site#31`, "changelog: finished shelf orders by date finished", body naming `acme/reader#12` and that the shelf section should now say the finished shelf lists newest-finished first.
- **Existing issue** — the search returns one open issue, `acme/site#29`, "changelog: finished shelf orders by date finished", opened by the session that landed PR #10 (the sort key). Its body names `acme/reader#10` and not #12.
