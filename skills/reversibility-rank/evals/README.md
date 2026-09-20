# Evaluation fixtures

`evals.json` names each prompt, the round under `fixtures/` it runs against, and what to check. The rubrics assert on the ranking and on the presence of each part of the note, never on wording. Run by hand with `skill-creator` before a merge that changes `SKILL.md`, and record the outcome in the pull request.
