# CLAUDE.md

## Project

**acme/reader** — a reading tracker. Shelves live under `src/shelves/`, one folder per shelf; the library surface is `src/library/`; the Book model is `src/model/book.ts`.

## Documentation

`docs/reference/` is the frozen tier: the brief and the pinned prototypes a feature started from, edited only by a dated Changelog entry. `docs/` beside it is the living tier. Where the two disagree, the living tier wins and the reference is amended by a changelog entry, never edited in place.

## Specs and loop

A feature runs through `bluesky-feature-pipeline`. Beats are issues labelled `spec` and `feature/<name>`; tickets carry the same family label and a `## Parent` section. Tickets run one per session on branch `agent/ticket-<n>`; `pnpm test` is green before a PR opens.

## Tests

`pnpm test` runs the unit suite. A change under `src/` ships with a test beside it.

## The public changelog

`acme.example/reader/changelog` is authored in `acme/site`, not here. Before merge, or when a feature's specs or tickets are opened, if the branch or the issues did any of the following, open an issue there — `gh issue create --repo acme/site` — naming this PR or issue and what the page should now say:

- changed what a shelf or the library surface shows, so the page's surface section moves;
- added a feature to the roadmap by opening its beat issues, so the page's "coming" list moves;
- changed a keyboard shortcut in `src/keys.ts`.

Never edit the changelog from this repository.
