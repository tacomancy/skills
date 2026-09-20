# Blue-sky feature pipeline — working it by hand

The companion to [`SKILL.md`](SKILL.md) for a person. The skill file is what a session reads to know its stage and its boundary; this file is what you read to run the same eight stages yourself, with a checklist per stage, **your move** at each, and the reason the stage exists. The vocabulary is the skill's: a **stage** is owned by one kind of **session** whose **authority ends** at a checkable point; a **beat** is one slice of the feature, opened as a **stub** issue; state is **handed off** through the tracker; a spec that does not hold is **flagged**.

Skill names below are roles first — a grill skill, a beat-planning skill — with a specific skill named as an example of the role. Where the example is absent, the stage's fallback in `SKILL.md` is the checklist.

## Why the boundaries

Each stage ends where the next one can check it started right: a brief with its branches resolved, a changelog entry dated, stubs labelled, a PR reviewed and green. A session that knows where its job ends stops there, so it can be compacted, closed, or replaced and the next session starts from what was written down — in the tracker and the repository, never only in a session. The boundaries are what make the handoffs safe; every checklist below ends on one.

## 0. Setup — once per repository

- [ ] Install the atomic skills you want the stages to use.
- [ ] Run this skill's `install.sh`, giving it the **family** label prefix — `skill/<name>`, as an example — and the source and test globs; it places the issue templates, PR template, and workflows and creates the labels. When it exits naming a file it did not write, the repository has history: follow `ADOPTING.md` for that file.
- [ ] Configure branch protection on the integration branch from [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md), each item for its stated reason.

**Your move**: do this yourself, before any feature work. It is the one stage with no session.

*Why*: stage 7 runs several worktrees with push access at once. Rails put in before that are cheap; rails retrofitted while it is happening are not.

## 1. Operating picture — once, refreshed on drift

- [ ] Scaffold the guidance tiers — `guidance-tiers`, as an example: a frozen tier for what the project started from, a living tier for its current understanding, the precedence rule between them in the guidance file.
- [ ] Run a grill round that writes documents as it asks — `grill-with-docs`, as an example — and answer it yourself; the vocabulary comes out of your answers.
- [ ] Ends with: the scaffold written and the vocabulary agreed. Run again when the words drift.

**Your move**: you are the one being interviewed. The round works only while you are answering it.

*Why*: every later session reads the guidance file before it reads anything else. A shared vocabulary written once is what lets stage 6 and stage 7 sessions understand a brief they never grilled.

## 2. Brief

- [ ] Grill the idea — `grill-me`, as an example — until every decision branch is resolved or listed as open.
- [ ] Close the round by ranking what would be hard to reverse — `reversibility-rank`, as an example — so the brief says which decisions to hold and which to let the prototype move.
- [ ] Save the brief with a **Changelog** section, empty for now.
- [ ] Ends with: the brief saved, branches resolved or listed.

**Your move**: you bring the idea, and you call the brief resolved. A grill that stops raising questions has run out of questions; whether the brief is done is your judgement.

*Why the changelog from the first draft*: stage 4 writes what the prototype changed into it. A section that exists from the start is one a session fills; one that has to be added is one it forgets.

## 3. Prototype

- [ ] Draft the prompt set from the brief — `pin-prototypes`, as an example, one prompt per surface.
- [ ] Run the prompts in your design tool yourself; expect more than one round.
- [ ] Pin every accepted output beside its prompt, in a frozen folder.
- [ ] Ends with: the outputs pinned. The brief is untouched; what changed is stage 4's entry.

**Your move**: read or write the prompts before they go to the tool, and choose which outputs are worth reconciling. Both are product calls, and they are yours.

*Why pinned outputs*: stage 4 grills the gap between the brief and a fixed artifact. Outputs that keep moving give it nothing to measure against.

## 4. Reconcile — a gate

- [ ] Grill only the decision branches the prototype touched — `grill-me`, scoped, as an example — a fraction of the stage 2 round.
- [ ] Add a dated entry to the brief's Changelog: what the prototype changed and why.
- [ ] Decide **go or no-go**: go opens stage 5; no-go returns to stage 3 for another round.
- [ ] Ends with: the entry written and the decision recorded.

**Your move**: the go or no-go is yours. The session sizes the gap; you decide whether it is close enough to port.

*Why the gate is cheap*: a prototype routinely surfaces what the brief did not anticipate, and that knowledge either lands on the brief now or lives in someone's memory of the third round. A scoped grill is cheap enough that nobody skips it under time pressure, and skipping it is how a brief goes stale.

## 5. Beats

- [ ] Port the reconciled prototype into the repository.
- [ ] Identify the implementation beats — a beat-planning skill, `wayfinder` as an example.
- [ ] Open one stub issue per beat — `to-spec`, as an example, or the stub template — carrying the family label, the `spec` label, and `spec:needs-grilling`.
- [ ] When compaction nears, write the handoff document — `handoff`, as an example — rather than rely on auto-compaction.
- [ ] Read the guidance file's post-merge section and do what it obliges for the stubs just opened — a stub is a status change with no diff, so no landing will read it.
- [ ] Ends with: stubs opened and labelled. Fleshing one out is stage 6's, one beat at a time.

**Your move**: skim the stubs before this session ends. Each becomes its own session with no view of the others, so this is the last point where one reader can catch a bad beat boundary.

*Why authority ends at stubs*: this session holds the whole feature in context, and a session with the whole feature in context writes specs that quietly depend on it. The stub is the handoff; the spec session starts from the stub alone.

## 6. Spec — one session per beat

- [ ] Open the session with one stub and, at most, the handoff document.
- [ ] Grill the stub to ready — `grill-me`, as an example; move the beat's label to `spec:ready-for-tickets` when it is.
- [ ] Generate the tickets — `to-tickets`, as an example, or the ticket template — each with `## Parent` naming the beat, `## What to build`, `## Acceptance criteria`, `## Blocked by`, and the family label; move the label to `spec:tickets-generated`.
- [ ] Read the guidance file's post-merge section and do what it obliges for the tickets just opened — a ticket set is a status change with no diff, as at stage 5.
- [ ] From here the session decides and monitors: answer each **flag** on the beat's issue, order the landings under the beat. It implements nothing.
- [ ] Ends with: the tickets opened, and the beat closed when its last ticket lands at stage 8.

**Your move**: one new session per stub, handed the stub's number. You decide when the spec is ready for tickets, whatever the session proposes. When the session is compacted or closed, open another: the beat's state is its issues and labels, and any session becomes the spec session by reading them.

*Why the state lives on the issues*: a spec session that carries the beat's state takes it with it when it closes. Labels on the beat and tickets under it are what a fresh session, or you, read the state from.

## 7. Ticket — one session per ticket

- [ ] Create the branch and worktree; open the session there with the ticket's number and nothing else.
- [ ] Implement — `implement`, as an example — driving `tdd` for every seam.
- [ ] Run `code-review` before the PR opens, and again if the branch moves after.
- [ ] Open the PR with a closing keyword naming the ticket and the review in the body: its findings, and each item declined with why.
- [ ] When CI stays red after the obvious fix, diagnose — `diagnosing-bugs`, as an example: reproduce, minimise, hypothesise — rather than retry until green.
- [ ] Ends with: a reviewed, green PR, open. The session stops there.

**Your move**: give the session one ticket and its worktree, then return to the beat's spec session for stage 8. A spec the session reports as wrong — a comment on the beat's issue, `ticket:blocked` on the ticket, the session stopped — is the spec session's decision, made where the beat's context is.

*Why review before the PR*: the review is on the PR when a human first sees it, and stage 8 reads the body for it before merging. A session that stops at the PR is one that never merges its own work or reaches into another ticket's branch.

## 8. Land — from any session acting for the beat

Landing is `land-ticket`'s when it is installed; the manual sequence below is the rule otherwise. Either way it runs once per PR, from the beat's spec session or a fresh session that has read the beat's issues.

- [ ] With `land-ticket`: run it on the green PR; it gates on the current head, merges in the history's style, closes the ticket and the beat on its last ticket, takes the guidance file's post-merge triggers against the diff, and reports the frontier.
- [ ] Without it: update the branch if it is behind and wait for the checks on the new head; merge in the history's style; close the ticket with a comment naming the PR; close the beat when its last ticket closes; read the guidance file's post-merge section and take each trigger against the diff; list the tickets the merge unblocked.
- [ ] When several tickets of one beat are green, order them and reconcile between their branches here; this session alone has sight of all of them.
- [ ] Ends with: one PR merged, the ticket closed, the frontier named.

**Your move**: decide once whether landing merges on its own or stages the merge for you to approve, and keep to it. Choose before you are relying on it under time pressure.

*Why the beat's session and not the ticket's*: it is the only session with sight of every ticket in the beat. Ticket sessions negotiating order among themselves is the cross-session coordination the pipeline exists to remove.

## What you carry between stages

| Transition | What the next session gets |
|---|---|
| 1 → 2 | the guidance file |
| 2 → 3 | the brief |
| 3 → 4 | the pinned outputs and the brief |
| 4 → 5 | the amended brief and the pinned prototype |
| 5 → 6 | one stub's number, and the handoff document if stage 5 wrote one |
| 6 → 7 | one ticket's number, in its own worktree |
| 7 → 8 | the PR's number — back to the beat's spec session, or a fresh one that has read the beat's issues |

## Labels, and who moves each

One writer per label, so no state has two:

- `spec:needs-grilling` → `spec:ready-for-tickets` → `spec:tickets-generated`, on the beat: the first at the stub's open, every move after by the spec session.
- `ticket:in-review` on PR open and `ticket:landed` on merge, on the ticket: the lifecycle workflow, never a session.
- `ticket:blocked`, a side state on the ticket: set by the ticket session when it flags, lifted by the spec session when it decides.
- Closing a ticket or a beat: stage 8 alone.

A ticket carries no status label until a session claims it; the tracker's ready label — `ready-for-agent`, as an example — is the unclaimed state.

## Out of scope: an established codebase

Traditional-SDLC work — stakeholder sign-off, release trains, backward compatibility — is a separate pipeline, to be designed against a real case rather than extended from this one. Adopting this pipeline's tooling in a repository with history is in scope and is `ADOPTING.md`'s.
