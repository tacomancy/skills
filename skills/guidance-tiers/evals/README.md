# Evaluation fixtures

`evals.json` names two prompts, the fixture under `fixtures/` each runs against, and what to check. They document what the skill is for: it asks only what the repository cannot answer, and it reports rather than overwrites. Run by hand with `skill-creator` before a merge that changes `SKILL.md`, and record the outcome in the pull request.
