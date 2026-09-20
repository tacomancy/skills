---
name: dangling
description: Links to a file that is not there, beside links that are fine.
---

# Dangling

Fine: [notes](notes.md), [a section](notes.md#notes), [the script](./scripts/run.sh),
[a URL](https://example.com/page.md), [an anchor](#dangling), [titled](notes.md "Notes"),
and a reference-style link to [notes][ref].

Broken: [gone](missing.md), [also gone](scripts/absent.sh), [a directory](scripts/),
[outside the folder](../../elsewhere.md), and [a dangling reference][ref2].

[ref]: notes.md
[ref2]: nowhere.md
