---
name: bluesky-feature-pipeline
description: Carry a blue-sky feature from an idea to landed tickets through eight session-bounded stages — operating picture, brief, prototype, reconcile, beats, spec, ticket, land — each owned by one kind of session whose authority ends at a checkable point, with the state between stages held in the issue tracker. Use when a blue-sky feature effort is starting, when a session asks what stage it is in or what it may decide, when a session opens for any one stage — a brief, a prompt set, a reconciliation, beat planning, a spec, a ticket, a landing — or when a ticket session finds its spec wrong. Traditional-SDLC work against an established codebase is a separate pipeline, out of scope here; say so when asked to apply this there.
---

# Blue-sky feature pipeline

A feature moves through eight **stages** after a one-time setup, each owned by one kind of **session** whose **authority ends** at a checkable point. The boundary is the point: no session holds the whole feature, so a session can be compacted, closed, or replaced between stages and the next one starts from what was written down. What is written down lives in the issue tracker and the repository — the brief's changelog, a **beat**'s issues and labels, a ticket's PR — never only in a session.

Every stage names the skill that does its work and the fallback without it; the pipeline points at skills and requires none. The skill names in this file are roles first; where a specific skill is named, it is an example of the role. A person working the stages by hand reads [`WORKFLOW.md`](WORKFLOW.md), which carries the same stages as a checklist with the reason for each.

## Session map

| # | Stage | Session | Starts from | Produces | Hands off via |
|---|---|---|---|---|---|
| 0 | Setup | once per repository | a repository | skills, templates, workflows, labels, branch protection | — |
| 1 | Operating picture | once, refreshed on drift | the set-up repository | vocabulary and the guidance scaffold | the repository |
| 2 | Brief | one session | a feature idea | a design brief with a changelog | the brief |
| 3 | Prototype | one session drafts; the human runs the tool | the brief | a prompt set; pinned outputs | the pinned folder |
| 4 | Reconcile | one short session — a gate | pinned outputs and the brief | a dated changelog entry; go or no-go | the brief |
| 5 | Beats | one session, expecting compaction | the amended brief and the pinned prototype | the port; one **stub** issue per beat; a handoff document | the stubs |
| 6 | Spec | one session per beat, resumable from its issues | one stub and at most a handoff | a spec; its tickets | the tickets |
| 7 | Ticket | one session per ticket, own branch and worktree | one ticket | a reviewed, green, open PR | the PR |
| 8 | Land | any session acting for the beat | a reviewed, green PR | the merge; the ticket closed; the beat closed on its last ticket | — |

Each stage below states the same six things: who owns it, what it starts from, what it produces, where its authority ends, which skill does the work, and what to do without that skill.

## 0. Setup

- **Owner**: the project owner, once per repository.
- **Starts from**: a repository, with or without history.
- **Produces**: the atomic skills the adopter wants installed; the issue templates, PR template, and workflows placed; the label set created; branch protection configured.
- **Authority ends** when the checklist is done. No feature work starts here.
- **Skill**: this skill's `install.sh` places the templates and workflows and creates the labels, asking for the **family** prefix — `skill/<name>`, as an example — at install; the checklist in [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md) is the remainder the script cannot do, each item with its reason. When the script exits naming a file it did not write, the repository has history: [`ADOPTING.md`](ADOPTING.md) states the merge path per file, the mapping of the labels the repository already has, and the path for tickets already open.
- **Without it**: none — the script ships with this skill.

## 1. Operating picture

- **Owner**: one session, once; run again when the vocabulary drifts.
- **Starts from**: the set-up repository.
- **Produces**: the shared vocabulary and the guidance scaffold — a frozen tier for the documents the project started from, a living tier for its current understanding, and the precedence rule between them in the guidance file.
- **Authority ends** with the scaffold written and the vocabulary agreed. No feature is decided here.
- **Skill**: `guidance-tiers` for the scaffold; a grill skill that writes documents as it asks, for the vocabulary — `grill-with-docs`, as an example.
- **Without it**: scaffold the two tiers by hand; run a plain grill round and write the vocabulary from its answers.

## 2. Brief

- **Owner**: one session.
- **Starts from**: a feature idea.
- **Produces**: a design brief with a **Changelog** section from the first draft — empty until stage 4 writes to it — so what prototypes change is on the brief and not in anyone's memory.
- **Authority ends** when every decision branch is resolved or listed in the brief as open. Nothing is prototyped here.
- **Skill**: a grill skill on the idea until no branch is open — `grill-me`, as an example — and `reversibility-rank` to close the round, so the sticky decisions are marked before anything is built on them.
- **Without it**: interview by hand, one branch at a time, until none is open; list which decisions would be hard to reverse.

## 3. Prototype

- **Owner**: one session drafts; the human runs the design tool. Several rounds are normal, and each is still stage 3 until the brief is reconciled.
- **Starts from**: the brief.
- **Produces**: a prompt set drafted from the brief, and each accepted output pinned into a folder nothing edits.
- **Authority ends** with the outputs pinned. The brief is not edited here; what the prototype changed is stage 4's entry.
- **Skill**: `pin-prototypes` — the prompt set, the pinning, and the precedence rule between brief and prototype.
- **Without it**: draft one prompt per surface from the brief; keep every accepted export in a frozen folder, numbered to its prompt.

## 4. Reconcile

A gate, never skipped: it keeps the brief authoritative instead of stale.

- **Owner**: one short session.
- **Starts from**: the pinned outputs and the brief.
- **Produces**: a dated entry in the brief's Changelog — what the prototype changed and why — and the human's **go or no-go** to port. The agent sizes the gap; the human decides whether it is close enough.
- **Authority ends** at the entry and the decision. A no-go returns to stage 3 for another round; only a go opens stage 5.
- **Skill**: a grill skill, scoped to the decision branches the prototype touched — not a full re-grill, so that reconciliation stays cheap enough that nobody skips it.
- **Without it**: the same interview by hand over the touched branches; the changelog entry is the contract either way.

## 5. Beats

- **Owner**: one session, expecting to be compacted. When compaction nears, write the handoff document rather than rely on auto-compaction, so the spec sessions start from a written state.
- **Starts from**: the amended brief and the pinned prototype.
- **Produces**: the prototype ported into the repository; the implementation beats; one **stub** issue per beat, each carrying the family label, the `spec` label, and `spec:needs-grilling`; the handoff document.
- **Authority ends** at stubs opened and labelled. No stub is fleshed out here — that is the spec session's work, held to one beat at a time.
- **Skill**: the port is this session's own work, from the pinned folder under the precedence rule between brief and prototype; a beat-planning skill to identify the beats — `wayfinder`, as an example; `to-spec` to open each stub; a handoff skill for the document — `handoff`, as an example.
- **Without it**: list the beats by hand; open each stub from the stub template; write the handoff as a file in the repository.

Then, before the session ends, read the guidance file's post-merge section — the obligations a landing takes against a diff — and do what it obliges for the stubs just opened: some of what it names moves on an event with no diff, and this is one.

## 6. Spec

- **Owner**: one session per beat, for the life of the beat. The beat's state is its issues and labels, so any session becomes the spec session by reading them — see [Resumability](#resumability).
- **Starts from**: one stub issue and, at most, a handoff document. One beat, nothing else.
- **Produces**: the spec, grilled from the stub to ready; its tickets, in the one ticket shape; the beat's status label moved at each step — `spec:needs-grilling` → `spec:ready-for-tickets` when the spec is ready, → `spec:tickets-generated` when the tickets are open.
- **Authority ends** at the tickets opened and, from then on, at deciding: the session monitors the tickets, answers a **flag** from a ticket session on the beat's issue, and orders the landings under its beat. It implements nothing.
- **Skill**: a grill skill on the stub until the spec is ready; `to-tickets` for the tickets — a `## Parent` section naming the beat, `## What to build`, `## Acceptance criteria`, `## Blocked by`, and the family label on every ticket.
- **Without it**: interview by hand; open each ticket from the ticket template, which produces that same shape by hand.

Then, as at stage 5, read the guidance file's post-merge section and do what it obliges for the tickets just opened.

On a flag — a comment on the beat's issue and `ticket:blocked` on the ticket — decide where the beat's context is: amend the spec or the ticket and lift the label, or flag further back to the brief's changelog when the brief itself does not hold. A ticket session never decides this.

## 7. Ticket

- **Owner**: one session per ticket, on its own branch and worktree, so it can neither see nor touch another ticket's work.
- **Starts from**: one ticket only.
- **Produces**: an open PR whose body names the ticket by a closing keyword and carries the review — its findings, and each item declined with why — and, where the guidance file's post-merge section obliges an issue for this diff, the line linking it, so the obligation is met by the session that made the change rather than discovered at landing.
- **Authority ends** at the PR open: reviewed, green, and stopped. No merge, no landing, no other ticket's branch.
- **Skill**: `implement`, driving `tdd` for every seam; `code-review` before the PR opens and again if the branch moves after; a diagnosing skill when CI stays red after the obvious fix — `diagnosing-bugs`, as an example — so the fix is reasoned rather than retried until green.
- **Without it**: red-green-refactor by hand; read the diff as a reviewer would and write what you find into the PR body's review section; on a red CI, reproduce, minimise, and hypothesise before fixing.

A spec that turns out wrong is **flagged**, never built around: one comment on the beat's issue saying what does not hold, `ticket:blocked` on the ticket, then stop. The spec session decides.

## 8. Land

- **Owner**: any session acting for the beat — the spec session, or a fresh one that has read the beat's issues.
- **Starts from**: a reviewed, green PR.
- **Produces**: the merge; the ticket closed with a comment naming the PR; the beat closed when its last ticket closes; the guidance file's post-merge triggers taken against the diff; the tickets this merge unblocked, named.
- **Authority ends** at one PR per run. When several tickets of one beat land, their order and any reconciliation between branches is this session's; a ticket session never does it for another.
- **Skill**: `land-ticket`.
- **Without it**: merge in the history's style; close the ticket with a comment naming the PR; close the beat on its last ticket; read the guidance file's post-merge section and take each trigger against the diff by hand; list what the merge unblocked.

## Labels and their owners

Status labels layer on the adopter's own set, and each has one writer, so no state has two:

- `spec:needs-grilling`, `spec:ready-for-tickets`, `spec:tickets-generated` — on the beat; the first set by the beats session at the stub's open, every move after by the spec session.
- `ticket:in-review` on PR open and `ticket:landed` on merge — on the ticket; moved by the lifecycle workflow, never by a session.
- `ticket:blocked` — a side state on the ticket; set by the ticket session when it flags, lifted by the spec session when it decides.
- Issue **state** — closing a ticket, closing a beat on its last child — belongs to stage 8 alone; the workflows never close an issue.

A ticket carries no status label until a session claims it; the unclaimed state is the tracker's ready label — `ready-for-agent`, as an example — as `to-tickets` leaves it, and the lifecycle workflow lifts it when the ticket's PR opens.

## Feedback loops

Two, each with a mechanism, so neither is silent:

1. **Prototype → brief**, at stage 4: the dated changelog entry on the brief. Drift the prototype revealed is written there before anything is ported, never carried forward as tribal knowledge.
2. **Implementation → spec**, from stage 7 to stage 6: a comment on the beat's issue plus `ticket:blocked` on the ticket, after which the ticket session stops. The spec session decides, and may flag further back to the brief's changelog.

## Resumability

A beat's state is its issues and labels: the stub's body and comments, its tickets, their labels, their PRs. A new session becomes the beat's spec session by reading those and nothing else, and a closed or compacted session takes nothing with it that the beat needs. The rule for every stage: state that would live only in a session is written to the tracker or the repository before the session ends.

Origin: the sequence of sessions Vitrine's features ran through — one grilling the idea into a brief, one drafting the design-tool prompts, one reconciling the brief against what came back, one planning the beats, one per beat writing the spec and its tickets, one per ticket implementing — and `tacomancy/skills`' own loop in its `CLAUDE.md` § Specs and loop, with the boundaries learned when a session overstepped: a ticket session that reinterpreted its spec, a spec session compacted with the beat's state in it, a merge that rode on a self-posted status its rebase had orphaned.
