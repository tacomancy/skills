---
name: reversibility-rank
description: Close a round of recommendations with a ranked note of which ones would be hard to reverse — the sticky items first, each with one line on why and a two-line deep-dive, the trivial ones in a single line. Use on any enumerated list of recommendations or decisions the user pastes.
---

# Reversibility rank

A round of recommendations arrives flat: every item reads as equally weighty. This skill answers the one question that decides which deserve a second look — *which of these would be a pain to change later?* — and answers nothing else. An item is **sticky** or **trivial** by [the reversibility test](#the-reversibility-test) alone; the note comes out in [one fixed shape](#the-note).

## 1. Number the list

Take the list as pasted. When its items are already numbered or named, those numbers or names are the ones the note uses. When they are not, number them 1..N in the order given. Done when every item has the label the note will cite it by.

## 2. Test every item

Apply the reversibility test to each item in turn and mark it sticky or trivial, with the kind of stickiness for the sticky ones. The [honesty rules](#honesty-rules) govern every marking. Done when every item carries a mark.

## 3. Write the note

Emit the note in the shape below and stop. Done when the note is the whole reply: no restated recommendations, no preamble, nothing after the last deep-dive.

## The reversibility test

Reversing an item is what is being priced, never doing it, and it is priced as of the item having shipped: the round is read as if every item were already in users' hands. Cost-to-reverse is the whole test.

An item is **sticky** when reversing it would:

- **stored data** — migrate or reinterpret data already written;
- **published contract or licence** — break a contract another party depends on: an API, a file format, a licence posture, a published URL;
- **users will touch it** — rename or move something users already touch in their own files;
- **forces a fork** — leave a fork to maintain.

An item is **trivial** when reversing it is a code change behind one module, a number in code, a dependency swap with the same interface, a UI arrangement, or anything the round keeps out of any release.

## Honesty rules

The note's value rests on these; the test is applied by them.

- Rank by the test. How important an item feels, how big it is to build, how strongly it was argued for — none of these move it.
- A short sticky list is the honest result. Most rounds have one or two sticky items; the list holds exactly the items the test marks, however few.
- Cost is the skill's call; likelihood is the reader's. An item whose reversal is costly stays sticky even when reversal looks unlikely.
- Two items sticky for the same reason share the reason once and rank together, consecutively, the second citing the first.

## The note

The whole reply, in this order and nothing else:

1. A heading line.
2. The sticky items in rank order, stickiest first, each on one line: `N. <name> — sticky because <kind>: <one line>`, where `<kind>` is one of *stored data*, *published contract or licence*, *users will touch it*, *forces a fork*.
3. One line for the rest: `Trivial: N, N, N — <why in one clause>`.
4. Then, for each sticky item in the same order, an indented two-liner:
   - `to reverse:` what reversing it would cost;
   - `cheaper now:` what would make that cheaper if done before shipping — a schema version field, an adapter seam, a name chosen once.

`N` is the label from step 1, so the reader cross-references without re-reading the round.

Origin: the Vitrine owner's standing question after every grill round — *which of these would be hard to reverse?* — and the reversibility split in Vitrine's ADRs.
