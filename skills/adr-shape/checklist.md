# The shape as a checklist

The review walks this top to bottom over one ADR and records every departure. Each item names the part of the shape, what conforming looks like, and what the departure looks like; the note's line each finding lands on is in brackets.

## Title and status

- The title line is `# NNNN: <the decision, as a sentence>`, and `NNNN` agrees with the file name. *[Status]*
- The status is one `**Status:**` line under the title — a section headed `## Status`, or a status placed elsewhere, is a departure. *[Status]*
- The status word is in the closed vocabulary: `Accepted`, `Proposed — becomes Accepted when <gate>`, `Superseded by NNNN`. A bare `Proposed`, or any other word, is a departure. *[Status]*
- A `Proposed` status names a gate a reader can check — a prototype issue's checklist, a number a benchmark must reach, a fixture that must round-trip. *When we are confident* is a departure. *[Status]*
- A `Superseded by NNNN` status has an ADR at that number, and the text above the status is unchanged from when it was accepted. *[Status]*

## Lead paragraph

- The first paragraph names what the ADR closes — an earlier ADR's *Deferred, deliberately* entry, a numbered open item in the architecture document, a brief's open question — and states the decision in prose. A `## Context` section in its place, or a lead that describes the situation without naming what it closes, is a departure: the note says *does not say*. *[Closes]*
- Its last sentence names the architecture document section holding the reversible detail — *The detail this ADR leaves to the architecture document: § <section>* — whenever any detail was routed there. *[Missing pointers]*

## Decisions

- The section is `## Decisions`, numbered, one bold lead phrase per decision. A bare `## Decision` holding the choice with nothing beside it is one departure for the section, reported as decision 1 without reasoning. *[Decisions without reasoning]*
- Each decision carries its reasoning inline: why this and not the nearest alternative, and what it protects. A decision that states the choice alone, or defers its reasoning to a separate rationale section, is listed by number. *[Decisions without reasoning]*
- A fallback the ADR relies on is a decision, with what would be switched to and what taking it costs. *[Decisions without reasoning]*

## Considered options

- Every bullet carries a verdict word and its reason: *Rejected: <the objection>*, *Deferred until <the condition>*, or *Named fallback: <when, and what it means>*. An option with no verdict, or a verdict with no reason, is listed by its lead. *[Options without a verdict]*

## Consequences

- `+` lines for what got easier, `−` lines for what got harder or was ruled out; a section with only one sign, or prose with no sign, is a departure. *[Status]*
- A *Deferred, deliberately:* list follows, one entry per thing left open, each naming where it will be settled — a document section, an issue, a later ADR. An entry with no destination is a departure. *[Status]*

## Reversible detail

Apply [the split rule](SKILL.md#the-split-rule) to each detail the ADR states — each version, threshold, flag value, field list, dependency, UI choice — on its own:

- A detail whose reversal is a code change behind one module, a number in code, a dependency swap with the same interface, or a UI decision belongs in the architecture document. List it with its destination: the section the lead paragraph names, or, when it names none, the section the architecture document already holds for the topic, or the section that would be created. *[Reversible detail to move]*
- A detail whose reversal would migrate stored data, break a published contract or licence posture, rename something users see in their files, or force a fork is ADR material and stays.

## Pointers

Checked in both directions when the architecture document exists; when it does not, the note says so and checks only the ADR's side.

- The ADR points at the architecture document: the lead's last sentence names a section, and that section exists. *[Missing pointers]*
- The architecture document points back: the named section opens with *the shape ADR NNNN decided, in enough detail to write against*, and `NNNN` is this ADR's number. A section that names a different ADR, or opens without the sentence, is a departure named with what it says instead. *[Missing pointers]*
- When the ADR closes an open item, that item is gone from the architecture document's open list. *[Closes]*

## Updates

- Every `## Update (YYYY-MM-DD)` section is dated and sits below Consequences; an update above it, or an undated one, is a departure. *[Status]*
- The sections above the first Update read as one text written at one time — a correction folded into Decisions or Consequences rather than appended is a departure, named by the sentence that shows it. *[Status]*
