---
name: guidance-tiers
description: Establish frozen and living documentation tiers in a repository — a never-edited reference directory, living docs (CONTEXT.md, an architecture document, ADRs), a precedence rule in the guidance file, and a check script run in CI that fails when the rules are broken. Use when a project starts from a design document (a brief, a spec, a contract) that agents must treat as authoritative while the project's current understanding diverges from it on purpose.
---

# Guidance tiers

## The check

[`check-guidance.sh`](check-guidance.sh) enforces the tiers; each rule is stated in the comment above it in the script. Copy it into the repository, edit the configuration block at its top, and run it from anywhere inside the repository — its header states the usage. Have CI run it on every pull request: a rule is only a rule if something fails when it is broken.

Origin: Vitrine's `Scripts/check-guidance.sh` and `CLAUDE.md` § Reference material.
