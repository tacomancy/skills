---
name: adr-shape
description: Write and review architecture decision records in one shape — a lead paragraph naming what the ADR closes, numbered decisions with their reasoning inline, a verdict on every considered option, consequences that separate better from worse and list what was deliberately left open, a status that is a condition when it needs to be, and corrections as dated updates. Ships the template and a lint for the mechanical parts. Use when an ADR is to be written from a resolved discussion or an existing one reviewed against the shape.
---

# ADR shape

An ADR in this shape reads without dates and without a separate rationale section: the first paragraph says what it **closes**, each decision carries its reasoning, each option carries its verdict, and the consequences say what got worse as well as better and what was deliberately left open. [The split rule](#the-split-rule) decides what the ADR holds: the **sticky** choices live in the ADR, the reversible detail lives in the architecture document under a section the ADR points at, and the two point at each other.

**Write** drafts a new ADR from a resolved discussion, a `grill-me` or `grill-with-docs` transcript, or a decision the owner states outright. The steps below are the write; a review of an existing ADR is a separate mode.

## 1. Gather

Read the source in full — every rejected option, every "later", every number — before writing anything. Collect, as a flat list: the decision and the reasons given for it; every option raised, with the objection that sank it or the condition it waits on; every detail the discussion settled (a name, a version, a threshold, a field list, a fallback); every open thing it left. Then find what the ADR closes — an earlier ADR's *Deferred, deliberately* entry, a numbered [open item](#open-items) in the architecture document, a brief's open question — and the highest number in the ADR directory. Done when the list holds every option and every detail from the source, the thing closed is named, and the next number is known: four digits, one past the highest existing.

## 2. Route every detail

Apply [the split rule](#the-split-rule) to each item on the list and mark it *ADR* or *architecture document*. Apply it to each detail on its own: the choice of engine is ADR material while the bindings it uses and the worker model it runs under are usually not, and they split even though they arrived in one breath. Done when every item carries a destination.

## 3. Draft the ADR

Copy [`0000-template.md`](0000-template.md) to `NNNN-<slug>.md` at the next number and fill every placeholder from the routed list:

- **Title** — `NNNN: <the decision, as a sentence>`.
- **Lead paragraph** — names what this ADR closes, by number or by the open item's number, and states the decision in prose. The requirements the closed item inherited move here, or into the decision they constrain. Its last sentence names the architecture document section that holds the detail routed there: *The detail this ADR leaves to the architecture document: § <section>.*
- **Decisions** — numbered, a bold lead phrase, the reasoning inline: why this and not the nearest alternative, and what it protects. A named fallback is a decision too, with what would be switched to and what taking it costs.
- **Considered options** — one bullet per option raised, each with its verdict and reason: *Rejected: <the actual objection>*, *Deferred until <the condition>*, or *Named fallback: <when it would be taken, and what taking it means>*. The objection is the one the source gave, so reopening the ADR starts from it.
- **Consequences** — `+` lines for what got easier, `−` lines for what got harder or was ruled out, then *Deferred, deliberately:* one entry per open thing, each naming where it will be settled — a document section, an issue, a later ADR. Written this way, "not decided" is distinguishable from "forgotten".
- **Status** — left as the template's placeholder until step 6.

Done when no placeholder remains, every option on the list has a bullet with a verdict, every open thing has a *Deferred, deliberately* entry with a destination, and every detail marked *architecture document* is absent from the file.

## 4. Write the architecture document section

Under the section the lead paragraph named, write the detail routed there. The section opens with the pointer back — *the shape ADR NNNN decided, in enough detail to write against* — and then carries the versions, thresholds, flag values, and field lists as the living values they are, so tuning one is an edit here rather than an ADR amendment. When the ADR closes an [open item](#open-items), remove the item; its inherited requirements are already in the ADR's lead or decisions from step 3. Done when the section exists with its opening sentence, holds every item marked *architecture document*, and the closed item is gone from the open list.

## 5. Rank the decisions

Before the status is set, run `reversibility-rank` over the ADR's numbered decisions: it is the round, and the note it produces is the last look a sticky decision gets while the ADR is still a draft. With that skill absent, state the ranking inline in the same shape — a heading, the sticky decisions first with a kind and one line each, one line for the trivial ones, then a *to reverse* / *cheaper now* pair per sticky decision — using the [split rule](#the-split-rule)'s test as the reversibility test. A decision the ranking marks sticky for a reason the ADR's reasoning leaves out goes back to step 3 to carry it. Done when the note stands and every sticky decision's reasoning names what makes it sticky.

## 6. Set the status and lint

Set the `**Status:**` line from [the vocabulary](#status), then run `bash lint-adr.sh <the file>` and fix every line it prints. Done when the lint exits 0 and the reply ends with the ranking note from step 5, the ADR's path, and the architecture document section's heading.

## The split rule

The rule prices *reversing* a detail once it has shipped, and it is applied to each detail on its own, so one topic usually splits across the two documents.

A detail is **ADR material** when reversing it would:

- migrate or reinterpret **stored data**;
- break a **published contract or licence** posture — an API, a file format, a licence another party relies on;
- rename or move something **users see in their own files**;
- **force a fork** that would then be maintained.

A detail is **architecture-document material** when reversing it is a code change behind one module, a number in code, a dependency swap with the same interface, or a UI decision. Versions, thresholds, flag values, and field lists are the usual cases: they go under the section the ADR's lead paragraph names in its last sentence, and that section opens with *the shape ADR NNNN decided, in enough detail to write against*. Those two sentences are the pointer each way; a reader lands in the right document from either side.

The same rule applied to data reads *store raw, normalise in code*: the stored form is sticky, so store what was observed and keep every interpretation of it in code, where reversing it is a code change. An ADR that lists field names and thresholds is the failure this rule exists for — it needs an amendment every time one is tuned.

## Status

The vocabulary is closed:

- `Proposed — becomes Accepted when <gate>` — the decision depends on something not yet shown: a prototype, a measurement, a migration rehearsal. The gate is concrete and checkable — a prototype issue's checklist, a number a benchmark must reach, a fixture that must round-trip — so a reader can tell whether it has passed. *When we are confident* is not a gate. Anything the prototype cannot make pass is added under Consequences before the status changes, so the ADR is honest on the day it is accepted.
- `Accepted` — nothing is pending.
- `Superseded by NNNN` — a later ADR replaces this one; the text above the status is left as it was.

## Open items

The architecture document's open list is numbered, in the order the items block work, and each item states which ADR's requirements it inherits — *inherits ADR 0003's requirement that entries stay readable without the app*. An ADR that closes an item removes it and carries the inherited requirements into its lead paragraph or the decision they constrain, so the next ADR starts from its constraints and the list holds only what is still open.

## What ships

- [`0000-template.md`](0000-template.md) — the shape as a template. Copy it to the next number in the ADR directory and fill every `<placeholder>`; it replaces the minimal template `guidance-tiers` seeds.
- [`lint-adr.sh`](lint-adr.sh) — checks the mechanical parts: title `NNNN:` agreeing with the file name, the status vocabulary, the sections in order, a verdict word on every option, and Update sections dated `YYYY-MM-DD` and appended after Consequences. One line per finding naming the thing at fault; exit 1 on any. Run it over the directory in CI:

  ```bash
  bash lint-adr.sh docs/adr
  ```

  Bash and coreutils only, so a repository's own check can call it — `guidance-tiers`' `check-guidance.sh` is the intended caller; without that skill, run it from CI directly. Numbering gaps across the directory are that check's job, not this lint's.
- [`evals/`](evals/README.md) — the fixtures and rubrics the write is evaluated against by hand.

Origin: Vitrine's `docs/adr/` (0005–0008 for the shape in full, 0007 for the conditional status, the named fallback, and decision 8's "store raw, normalise in code", 0002 for the Update section) and `docs/architecture.md`'s "Open, in the order they block work" list.
