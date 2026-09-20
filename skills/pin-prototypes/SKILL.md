---
name: pin-prototypes
description: Draft and run the prompt set that takes a project's brief through an HTML-exporting design tool the human drives. Use when a project has a brief and is about to prompt a design tool for its surfaces, or when a design session has degraded and needs splitting.
---

# Pin prototypes

A design tool's first answer for any well-known surface is the **pattern-matched** one — the inbox that looks like email — and asking for several surfaces in one prompt averages them. The skill's answer is a **prompt set** drafted from the brief: **Prompt 0** for the visual language, run once; one prompt per surface that names what to show, what the pattern-matched answer would be, and what the brief settles; and a **push-back table** written before any output exists, so the review of an output is anchored by the brief rather than by the output. The human runs the prompts; the agent drafts, distils the **standing header** that keeps later sessions on the first session's language, and **pins** each accepted output — HTML and a full-length PNG, numbered to its prompt — into a folder nothing edits, so an accepted output stays the decision it was.

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

## 3. Pin

An accepted output is a design decision; pinning is what stops the tool's live link from re-rendering it. Pin into the **prototypes folder**: with the `guidance-tiers` skill present — a frozen reference directory with an index README — the folder is `<frozen dir>/prototypes/` and its README is the tier's; without it, create `prototypes/` beside the brief with its own README that opens with the tier's rule, "nothing here is edited; this README is the index and changes only with the folder's contents". Either way the folder holds exports, one runtime, and PNGs, and nothing else.

For each accepted output, in this order:

1. **Name** it `NN-<surface>` — `NN` the number of the prompt that produced it, `<surface>` the surface's name from the prompt, so prompt, HTML, and PNG line up without a lookup. The Prompt 0 output is `00-<name>` (for example `00-shape.html`).
2. **Store the export's HTML as-is** at `NN-<surface>.html`. The export's own palette, type, and layout are the record; a correction goes in the living docs, never here.
3. **Keep the runtime once.** The export references a shared script — the tool's runtime, the file that makes the HTML interactive (for example `support.js`). Store one copy in the folder under one fixed name, the first time; later exports reuse it. Rewriting the HTML's reference to point at that one copy is the **only edit ever made to an export**, and it is made at pin time or not at all.
4. **Capture the PNG** with [`capture.mjs`](capture.mjs): `node capture.mjs NN-<surface>.html`, run from inside the project. It renders the export in headless Chromium at the width the export declares (1528 px when it declares none) and writes `NN-<surface>.png` beside it, full length. The script needs the `playwright` package in the project; its header names the install command.
5. **Index it.** Add one line to the README's entry for the folder, stating three things: the surface, the prompt number, and what the PNG cannot show — states behind tabs, content below the app frame's fold, anything the export shows only on interaction. The reader of the README decides from that line whether to open the HTML.

Done when the folder holds the HTML, its PNG, and one runtime, the README has the line, and `git diff` on the export shows nothing but the runtime reference.

Origin: Vitrine's `docs/reference/design-prompts.md` and its § Running these; `docs/reference/prototypes/` and the `prototypes/` line of `docs/reference/README.md`.
