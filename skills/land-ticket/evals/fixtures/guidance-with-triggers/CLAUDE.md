# CLAUDE.md

## Project

**acme/reader** — a reading tracker. Shelves live under `src/shelves/`, one folder per shelf; the finished shelf is `src/shelves/finished/`.

## Tests

`pnpm test` runs the unit suite. A change under `src/` ships with a test beside it.

## The public changelog

`acme.example/reader/changelog` is authored in `acme/site`, not here. Before merge, if the branch did any of the following, open an issue there — `gh issue create --repo acme/site` — naming this PR and what the page should now say:

- changed what a shelf shows or how it orders its books, so the page's shelf section moves;
- added or removed a shelf;
- changed a keyboard shortcut in `src/keys.ts`.

Never edit the changelog from this repository.
