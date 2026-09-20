# Reading goals — design brief

**Repository**: `acme/reader`. **Written at stage 2**; the Changelog is empty until stage 4 writes to it.

## Idea

A reader sets a yearly goal — books or pages — and the library surface shows progress against it. Progress is computed from the finished shelf's dates; nothing is entered twice.

## Decisions

1. **Unit** — books or pages, chosen per year. Pages is the default because the finished shelf already records page counts.
2. **Where progress shows** — on the library surface only, as one line under the shelf list; no separate goals surface.
3. **History** — past years' goals are kept and shown when the year is changed; a goal is never deleted, only edited for the current year.
4. **Storage** — the goal is one row per year in the local store beside the shelves; progress is derived, never stored.

## Open

- Whether a book finished before the goal was set counts toward it. Leaning yes: the goal is about the year, not about the moment it was set.

## Hard to reverse

Storage (4) and the derived-not-stored rule: a stored progress number would have to be migrated away. Unit (1) is per year and cheap to change.

## Changelog

_Empty._
