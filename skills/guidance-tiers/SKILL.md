---
name: guidance-tiers
description: Establish frozen and living documentation tiers in a repository — a never-edited reference directory, living docs (CONTEXT.md, an architecture document, ADRs), a precedence rule in the guidance file, and a check script run in CI that fails when the rules are broken. Use when a project starts from a design document (a brief, a spec, a contract) that agents must treat as authoritative while the project's current understanding diverges from it on purpose.
---

# Guidance tiers

Two tiers. The **frozen tier** is the design document the project started from, kept byte-for-byte in a reference directory with an index README. The **living docs** are the project's current understanding: a vocabulary file, an architecture document, and ADRs. **Precedence**: living wins where it speaks, frozen is the fallback, and every divergence traces to an ADR. A check script, run in CI, is what makes these rules rules.

## 1. Inspect

Before asking anything, read what the repository already has. Look for: a reference directory with contents (default `docs/reference/`); `CLAUDE.md` or `AGENTS.md`; a vocabulary file (`CONTEXT.md`); an architecture document (`docs/architecture.md`); an ADR directory (`docs/adr/`); a check script; a CI workflow. Done when each piece is marked present or absent.

## 2. Ask only what the inspection left open

At most three questions, in one message, each skipped when the repository already answers it:

1. **The frozen artefact** — what it is and where it lives now: a path inside the repository, a path outside it, or "not yet in the repo". Skip when the reference directory already has contents.
2. **The guidance file** — `CLAUDE.md` or `AGENTS.md`. Skip when exactly one of them exists.
3. **The architecture document's name** — only if none exists; offer `docs/architecture.md`.

Everything else has a default the scaffold uses: `docs/reference/`, `CONTEXT.md`, `docs/adr/`, `scripts/check-guidance.sh`, a GitHub Actions job. Change a default only when the owner says so.

## 3. Scaffold

Run [`scaffold.sh`](scaffold.sh) from the repository with the answers as flags; its header lists them. It writes each piece only where absent and prints one `created:` or `found:` line per piece. An artefact inside the repository is moved into the frozen tier, one outside is copied. Done when the script exits 0.

## 4. Prove the check

Run the installed check against the base branch, for example `bash scripts/check-guidance.sh origin/main`. Done when it prints `guidance check passed`. A `FAIL:` line here means the repository already broke a rule before the tiers existed — say which and stop; the owner decides.

## 5. Report

Close with three short lists: what was created; what was found and left alone; what the owner still has to do. The last always includes making the CI job a required status check, a repository setting no agent can change. For a CI other than GitHub Actions, the scaffold printed the one command to wire in; repeat it here.

Origin: Vitrine's `CLAUDE.md` § Reference material and § Rules, `docs/reference/README.md`, and `Scripts/check-guidance.sh`.
