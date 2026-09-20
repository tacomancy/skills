---
name: guidance-tiers
description: Establish frozen and living documentation tiers in a repository — a never-edited reference directory, living docs (CONTEXT.md, an architecture document, ADRs), a precedence rule in the guidance file, and a check script run in CI that fails when the rules are broken. Use when a project starts from a design document (a brief, a spec, a contract) that agents must treat as authoritative while the project's current understanding diverges from it on purpose.
---

# Guidance tiers

The skill is being landed in slices. This slice ships the check script; the interview and scaffold steps follow.

## The check

[`check-guidance.sh`](check-guidance.sh) enforces the frozen tier. Copy it into the repository, edit the configuration block at its top, and run it from anywhere inside the repository:

```bash
bash scripts/check-guidance.sh [base-ref]
```

It compares `HEAD` against the merge base with `base-ref` (default `origin/main`) and prints one `FAIL:` line per finding, exiting non-zero if any; a frozen file *modified* since the base fails, an *added* one passes, and the tier's index README may change only alongside a change to the directory's contents. An unknown base ref prints a `skip:` line and the diff is not run, so a fresh clone or a fork passes for reasons unrelated to the rules.

Origin: Vitrine's `Scripts/check-guidance.sh` and `CLAUDE.md` § Reference material.
