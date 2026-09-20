---
name: pin-prototypes
description: Draft and run the prompt set that takes a project's brief through an HTML-exporting design tool the human drives. Use when a project has a brief and is about to prompt a design tool for its surfaces, or when a design session has degraded and needs splitting.
---

# Pin prototypes

A design tool's first answer for any well-known surface is the **pattern-matched** one — the inbox that looks like email — and asking for several surfaces in one prompt averages them. The skill's answer is a **prompt set** drafted from the brief: **Prompt 0** for the visual language, run once; one prompt per surface that names what to show, what the pattern-matched answer would be, and what the brief settles; and a **push-back table** written before any output exists, so the review of an output is anchored by the brief rather than by the output. The human runs the prompts; the agent drafts, and distils the **standing header** that keeps later sessions on the first session's language.

## 1. Draft

Read the brief in full — every section, not the summary — before writing a prompt; a surface the brief mentions once still gets a prompt. Then write one Markdown file of prompts in the shape of [`prompt-template.md`](prompt-template.md):

1. The template's preamble on how to run them, as written.
2. Prompt 0, marked **run once**, followed immediately by the first surface prompt. Prompt 0 asks for the visual language and lists the brief's objects and surfaces.
3. One prompt per surface, in the brief's order, numbered from 01. Each has three fixed parts: **show** — what to show at what realistic scale; **push back** — what the tool's pattern-matched answer would be and why it is wrong here; **the brief settles** — behaviour the brief specifies, which the prototype may not change.
4. The push-back table: one row per surface, each row's entry copied from that prompt's **push back** part.

Done when every surface in the brief has a numbered prompt with all three parts and a row in the table, and the file opens with the preamble.

## 2. Run

Give the human the checklist: the drafted file's preamble as a numbered list, ending with "on the tell, stop and paste session 1's output back". The **tell** of a degraded session is a later surface coming back thinner than an earlier one — fewer states, less of the object list, layout that ignores what Prompt 0 established. Where the `wizard` skill is installed — a skill that walks a human through a checklist one step at a time — the checklist may go to it instead. Done when the human has the checklist and the tell in hand.

When the human splits, distil the standing header from their paste, in the shape of [`standing-header.md`](standing-header.md): each line describes what the output rendered, and the object and surface lists match Prompt 0. Done when every line the template names is filled from the paste and the human has the header to open the next session with.

Origin: Vitrine's `docs/reference/design-prompts.md` and its § Running these.
