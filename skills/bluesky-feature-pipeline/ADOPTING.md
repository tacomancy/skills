# Adopting the pipeline in a repository with history

Stage 0 in a repository that already has workflows, templates, labels, and tickets in flight. `install.sh` refuses to overwrite a file it did not write, so its refusal is where this path starts: each `refused:` line names one file of yours at a path the script wants, and the script wrote nothing — not the other templates, not the labels — because every collision is resolved before the first write. Adoption is therefore **move aside, install, merge back**, per file, then the labels, the open tickets, and branch protection as a diff.

Every section states the generic rule first, then the labelled example: `tacomancy/skills`, the repository this skill lives in, which adopted its own pipeline through this path.

## Steps

1. Run the script with the values for the repository — § Parameters says how to choose them on a repository with history. Read every `refused:` line.
2. Move each named file out of `.github/` — a scratch directory, or a `git mv` to a path the tracker does not read, since a renamed file left under `ISSUE_TEMPLATE/` or `workflows/` is still a template or a workflow. Rerun the script: it places every template and creates the labels the tracker lacks.
3. Merge each moved file back into the installed file at its path, as § Per template says for that file. The installed file's headings, job names, and `env` are what the checks and `land-ticket` read; your content goes around them.
4. Map the labels the repository already has onto the family and status labels — § Labels — rather than keeping two of anything.
5. Bring each open ticket into the one shape, or leave it with the statement of what will not read it — § Tickets already open.
6. Take [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md) against the rules the branch already has — § Branch protection.
7. Add one line to the guidance file naming this pipeline as the way the repository's specs run, so a session that starts from the guidance file reaches the stages.

Done when every installed file is at its path, the six status labels exist, every open ticket is either in the one shape or named as unread, the protection diff is applied, and the guidance line is in. A later rerun of the script names each file you merged — that is expected, and § Upgrading says what a rerun means from then on.

**Example — `tacomancy/skills`.** The run was

```bash
skills/bluesky-feature-pipeline/install.sh --prefix skill --source-globs 'skills/**/*.sh, skills/**/*.mjs' --test-globs 'tests/**' --unclaimed-label ready-for-agent
```

and it refused nothing: `.github/` held one workflow, `ci.yml`, whose name none of the pipeline's files share, and no templates. It created the eleven files and the six labels; a second run reported every one as `found`. The merge sections below were exercised by the collisions the skill's tests raise, not by this run.

## Per template

Nothing merges into a file the script does not install: an existing CI workflow keeps its file and its jobs, and the checks land beside it as their own files. A collision is a file of yours at exactly one of these paths.

### `.github/pull_request_template.md`

Your template gains, and keeps everything else:

- the closing-keyword line, `Closes #<ticket>`, as the first line a reader sees — the ticket-link check reads the keyword anywhere in the body, and the lifecycle mover and `land-ticket` read the same line, so first is for the reader;
- a `## Code review` section with **Findings** and **Declined** — the heading `land-ticket`'s gate reads for the review's presence;
- the one-ticket rule, and the checklist line for the post-merge trigger link — `<trigger>: owner/repo#N` — that the post-merge-trigger check reads.

Your own sections stay where they were; a section of yours that asks for the same thing as one of the pipeline's is replaced by the pipeline's wording, so the heading the gate reads is the one in the file.

### `.github/ISSUE_TEMPLATE/ticket.md` and `spec-stub.md`

A collision is a file by that name; every other issue template coexists in the chooser and needs no change. When yours is a markdown template of the same name, keep the pipeline's `##` headings verbatim and in order — `## Parent`, `## What to build`, `## Acceptance criteria`, `## Blocked by` for a ticket; `## Brief`, `## Scope`, `## Ready for tickets when` for a stub — since the lifecycle mover parses `## Parent` and `land-ticket` reads the same sections. Your fields go under those headings or after them, and the `labels:` line carries the pipeline's labels beside yours. An issue form (`ticket.yml`) beside the installed `ticket.md` is a second chooser entry, not a collision, and it is retired: a form renders its fields as `###` headings, and the lifecycle mover and `land-ticket` read the `##` sections only, so a ticket opened from the form has no `## Parent` to them.

### `.github/workflows/*.yml`

A collision is a workflow file of yours by the same name — `ticket-link-check.yml`, `test-touch-check.yml`, `post-merge-trigger-check.yml`, `ticket-lifecycle-labels.yml`. The filename carries nothing: Actions shows the `name:` inside, and branch protection reads the job name. So rename yours rather than merge — the pipeline's file stays as installed, and a rerun still recognises it. Merge only when the two are meant to be one workflow, and then keep the pipeline's job name (`ticket-link`, `test-touch`, `post-merge-triggers`, `move-label`), its `permissions`, its `on:` event types, and its `run:` step with the `env` block the script filled — the checks read their parameters from that `env` and refuse to run without them.

### `.github/workflows/scripts/*.mjs`

A collision is a script of yours by the same name. Move yours, or rename the pipeline's and point the `run:` line in its workflow at the new name. The script itself is not edited: it is the tested unit, and the tests in the skill's repository drive it by name.

## Labels

The script creates only a label the tracker lacks, so an existing label stands; the mapping is yours to make once, by name.

- **The family.** The prefix is the family the repository already carries per feature or area, and the shape is `<prefix>/<beat>`: the ticket-link check reads `FAMILY_LABEL_PREFIX: "<prefix>/"` as a plain prefix, and the templates' hints supply the `/`. A family under another separator — `area:payments` — is renamed to the slash form, which carries its issues along, or the installed `ticket-link-check.yml` gets `FAMILY_LABEL_PREFIX: "area:"` as one merge of that file.
- **The spec label.** The stub template applies `spec`; nothing else reads it. A repository whose beats carry another name — `epic`, `feature` — puts that name on the stub's `labels:` line instead, or renames its label to `spec`.
- **The ready label.** The ticket template applies `ready-for-agent`, the unclaimed state `to-tickets` leaves; a triage set that names it differently names it on that template's `labels:` line, as the template says, and passes the same name as `--unclaimed-label` — § Parameters.
- **The status labels.** `spec:needs-grilling`, `spec:ready-for-tickets`, `spec:tickets-generated`, `ticket:in-review`, `ticket:landed`, `ticket:blocked` are fixed: the lifecycle script writes two of them by name and the sessions the others. An existing label with the same meaning and the same single writer — an `in-review` the workflow alone moved — is renamed to the pipeline's name; one with a wider meaning — a `blocked` any person sets for any reason — stays for that purpose, and the pipeline's label exists beside it with its narrower one. Two labels for one meaning is what the mapping avoids.

**Example — `tacomancy/skills`.** The family was already `skill/<name>`, so the prefix is `skill`; `spec` already marked every spec, and the triage set already carried `ready-for-agent`; no status-like label existed. The mapping was a matter of naming the prefix, and the script created the six status labels beside the family, `spec`, and the triage set.

## Tickets already open

What reads a ticket, and what each needs, so the choice per ticket is by consequence:

- The **ticket-link check** fails a PR whose closing keyword names an issue with no `<prefix>/<beat>` label. A ticket without the family label cannot land through a PR on the protected branch.
- The **lifecycle mover** finds the ticket by the PR's closing keyword and moves `ticket:in-review` and `ticket:landed` on it whatever its body says; the comment on the beat needs a `## Parent` section, and without one the mover logs that and moves on.
- **`land-ticket`** closes the ticket whatever its shape; the parent step needs `## Parent`, and the frontier report needs the family label and the tracker's native blocking edges.

Bring a ticket into the one shape by hand: add the family label, put a `## Parent` section naming the beat's issue as the first section of the body, and state the blockers as native dependencies. Bring the beat into shape the same way: `spec`, the family label, and the `spec:` status it is at. Or leave a ticket as it is, with this written on it or in the adoption PR: the ticket-link check will block its PR until it carries the family label, the lifecycle mover will not comment on its beat, and `land-ticket` will close it alone with no parent step and no frontier. The tickets left alone are the ones landing outside the pipeline — a fix already in review, a ticket closing without a PR.

**Example — `tacomancy/skills`.** Every open ticket had been opened by `to-tickets` under a `skill/<name>` family with a `## Parent` section and native blocking edges — the one shape, since the templates take it from `to-tickets`. Nothing was brought over; the two tickets open at adoption, #80 and #81 under spec #72, read as they were.

## Branch protection

Read the branch's current rules — `gh api repos/<owner>/<repo>/branches/<branch>/protection`, or the rulesets endpoint — and take each item of [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md) against them: an item already in force stays as it is; an absent one is added for the reason the checklist gives. The required-checks list is appended, never replaced — the existing CI job stays required and `ticket-link`, `test-touch`, and `post-merge-triggers` join it. The adoption PR itself runs the new workflows, so the three checks exist to be required from that PR on.

**Example — `tacomancy/skills`.** `main` already required a PR, required the `test` job up to date with the base, and blocked force pushes and deletions. The diff is three job names appended to the required checks, for the maintainer to apply when the adoption PR lands.

## Parameters

The script's values on a repository with history are read from what the repository already does rather than from the README's examples:

- **Source and test globs** name the files the repository's test loop covers. A repository whose prose is reviewed by hand and whose scripts are tested names the scripts, so a prose-only PR passes the test-touch check without a waiver and a script change without a test change does not.
- **Post-merge triggers** are path globs, and the check has no waiver: a fired trigger passes only with a linked issue. A trigger goes in when the glob *is* its condition — every change under those paths obliges the issue. A condition finer than a path set — a landing, a line inside a file, one section of the guidance file — stays with stage 8, where `land-ticket` reads the post-merge section against the diff, and the parameter is left empty for it; a glob wider than the condition would block the changes that oblige nothing, with no way through.
- **The unclaimed label** is the triage set's ready label, the one the ticket template applies and a ticket carries until a session claims it. The lifecycle mover lifts it when a PR opens for the ticket, so a ticket in review never reads as grabbable. A triage set with no such label leaves the parameter out, and the mover lifts nothing at open.

**Example — `tacomancy/skills`.** Source globs `skills/**/*.sh, skills/**/*.mjs` and test globs `tests/**`: scripts are the test seam, `SKILL.md` prose is evaluated by hand before merge. No trigger: the guidance file's three site triggers are a landing, a description line inside `SKILL.md`, and the invariants section inside the guidance file, none of them a path set, so they stay with `land-ticket` as they were before adoption. Unclaimed label `ready-for-agent`, the triage set's ready label the guidance file names.

## Upgrading

Once a file is merged it is yours, and a rerun of the script names it as refused, whoever wrote the rest of it; the templates in the skill folder are then the reference to diff against by hand when the pipeline changes. A file left as installed upgrades by removing it and rerunning. The labels need nothing: a rerun creates only what the tracker lacks.
