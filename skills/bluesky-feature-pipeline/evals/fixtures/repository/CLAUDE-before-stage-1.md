# CLAUDE.md

The guidance file of `acme/reader` after stage 0 and before stage 1: no documentation tiers, no vocabulary, the pipeline named as the loop. Stage 1 evals run against this file; every later stage runs against `CLAUDE.md` beside it, which is what stage 1 left behind.

## Project

**acme/reader** — a reading tracker. Shelves live under `src/shelves/`, one folder per shelf; the library surface is `src/library/`; the Book model is `src/model/book.ts`.

## Specs and loop

A feature runs through `bluesky-feature-pipeline`. Beats are issues labelled `spec` and `feature/<name>`; tickets carry the same family label and a `## Parent` section. Tickets run one per session on branch `agent/ticket-<n>`; `pnpm test` is green before a PR opens.

## Tests

`pnpm test` runs the unit suite. A change under `src/` ships with a test beside it.

## Owner's answers

What the owner says when asked, for a run on paper: the frozen artefacts are the brief and the pinned prototypes, under `docs/reference/`; the living tier is `docs/`, with `docs/architecture.md` as its architecture document; the vocabulary the project already uses is *shelf*, *surface*, *finished date*, *goal*, and *progress*, and the owner wants *widget* retired in favour of *surface*.
