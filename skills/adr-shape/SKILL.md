---
name: adr-shape
description: Write and review architecture decision records in one shape — a lead paragraph naming what the ADR closes, numbered decisions with their reasoning inline, a verdict on every considered option, consequences that separate better from worse and list what was deliberately left open, a status that is a condition when it needs to be, and corrections as dated updates. Ships the template and a lint for the mechanical parts. Use when an ADR is to be written from a resolved discussion or an existing one reviewed against the shape.
---

# ADR shape

An ADR in this shape reads without dates and without a separate rationale section: the first paragraph says what it closes, each decision carries its reasoning, each option carries its verdict, and the consequences say what got worse as well as better and what was deliberately left open. Hard-to-reverse choices live in the ADR; reversible detail lives in the architecture document under a section the ADR points at.

## What ships

- [`0000-template.md`](0000-template.md) — the shape as a template. Copy it to the next number in the ADR directory and fill every `<placeholder>`; it replaces the minimal template `guidance-tiers` seeds.
- [`lint-adr.sh`](lint-adr.sh) — checks the mechanical parts: title `NNNN:` agreeing with the file name, the status vocabulary (`Accepted`, `Proposed — becomes Accepted when <gate>`, `Superseded by NNNN`), the sections in order, a verdict word on every option (*Rejected*, *Deferred until*, *Named fallback*), and Update sections dated `YYYY-MM-DD` and appended after Consequences. Pointed at a directory, it also checks the numbering — four digits from `0000` (the template), no gap, no duplicate, every entry `NNNN-*.md` — and lints every ADR in it, the directory findings and the per-file findings in one run; the template at `0000` counts for numbering and is not linted for shape. One line per finding naming the thing at fault; exit 1 on any. Run it over the directory in CI:

  ```bash
  bash lint-adr.sh docs/adr
  ```

  Bash and coreutils only, so a repository's own check can call it.

## With guidance-tiers

`guidance-tiers` scaffolds the ADR directory, seeds a minimal `0000-template.md`, and installs a check script that runs in CI and applies the same numbering rule, so the two compose into one merge gate. When the adopting repository has that check script (`scripts/check-guidance.sh` by default), add one line to it, after its ADR numbering block, calling the lint with the check's own `ADR_DIR`:

```bash
bash path/to/lint-adr.sh "$ADR_DIR" || fail=1
```

The `|| fail=1` folds the lint's findings into the check's own verdict, so one CI job fails for either. Then replace the seeded `0000-template.md` with [`0000-template.md`](0000-template.md), so the first ADR written there already has the shape; the numbering is unchanged, since the template keeps `0000`.

Without `guidance-tiers`, run the lint from CI directly — the command above, on every pull request — and place [`0000-template.md`](0000-template.md) under the ADR directory the repository names (`docs/adr/` when it names none).

Origin: Vitrine's `docs/adr/` (0005–0008 for the shape in full, 0007 for the conditional status and the named fallback, 0002 for the Update section).
