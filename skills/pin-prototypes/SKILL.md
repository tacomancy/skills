---
name: pin-prototypes
description: Design a project's surfaces from its brief with an HTML-exporting design tool the human drives — draft a prompt set (one visual-language prompt run once, one prompt per surface, a push-back table written before any output exists), and run it across sessions with a standing header so later sessions keep the first session's language. Use when a project has a brief and is about to prompt a design tool for its surfaces, or when a design session has degraded and needs splitting.
---

# Pin prototypes

A design tool's first answer for any well-known surface is the **pattern-matched** one — the inbox that looks like email — and asking for several surfaces in one prompt averages them. The skill's answer is a **prompt set** drafted from the brief: **Prompt 0** for the visual language, run once; one prompt per surface that names what to show, what the pattern-matched answer would be, and what the brief settles; and a **push-back table** written before any output exists, so the review of an output is not anchored by it. The human runs the prompts; the agent drafts, and distils the **standing header** that keeps later sessions on the first session's language.

## 1. Draft

Read the brief in full — every section, not the summary — before writing a prompt; a surface the brief mentions once still gets a prompt. Then write one Markdown file of prompts, following [`prompt-template.md`](prompt-template.md):

1. A preamble on how to run them: Prompt 0 once; try one session first; split on the tell (§ 2); write the standing header when you split.
2. Prompt 0, marked **run once**, followed immediately by the first surface prompt. Prompt 0 asks for the visual language and lists the brief's objects and surfaces.
3. One prompt per surface, in the brief's order, numbered from 01. Each has three fixed parts: **show** — what to show at what realistic scale; **push back** — what the tool's pattern-matched answer would be and why it is wrong here; **the brief settles** — behaviour the brief specifies that the prototype must not override.
4. The push-back table: one row per surface, each row's entry copied from that prompt's **push back** part.

Done when every surface in the brief has a numbered prompt with all three parts and a row in the table, and the file opens with the preamble.

## 2. Run

The human runs the prompts in the design tool. Hand them a checklist:

- Run Prompt 0 once, then surface prompt 01 in the same session, then the rest in order.
- Watch for the **tell** of a degraded session: a later surface comes back thinner than an earlier one — fewer states, less of the object list, layout that ignores what Prompt 0 established. On the tell, stop and split.
- To split: paste session 1's output for Prompt 0 and the surfaces done so far back to the agent, then open every later session with the standing header the agent returns.

Where the `wizard` skill is installed, hand it the checklist; otherwise give the checklist to the human as a numbered list.

From the paste, distil the standing header with [`standing-header.md`](standing-header.md): five or six lines of palette, type, navigation, and density taken from the output — not from the prompt — plus the object list and the surface list from Prompt 0. Done when the header holds every line the template names and the human has it before the next session opens.

Origin: Vitrine's `docs/reference/design-prompts.md` and its § Running these.
