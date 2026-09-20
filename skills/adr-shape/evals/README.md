# Evaluation fixtures

`evals.json` names each prompt, the fixture under `fixtures/` it runs against, and what to check. The rubrics assert on presence and routing — every rejected option with a reason, the deferral under *Deferred, deliberately* with a destination, versions and thresholds in the architecture document rather than the ADR, the drafted file passing `lint-adr.sh` — never on wording. Run by hand with `skill-creator` before a merge that changes `SKILL.md`, and record the outcome in the pull request.
