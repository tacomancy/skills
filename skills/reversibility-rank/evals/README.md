# Evaluation fixtures

`evals.json` names each prompt, the round under `fixtures/` it runs against, and what to check. The rubrics assert on the ranking and on the presence of each part of the note, never on wording. Run by hand with `skill-creator` before a merge that changes `SKILL.md`, and record the outcome in the pull request.

`trigger-evals.json` is the trigger set for the frontmatter description: queries that should reach the skill without naming it — the three phrasings, a round being closed, an ADR's decisions, a pasted list — and near misses that should not — a round turned into tickets, a list sorted by effort or impact, a rollback plan. Run it with `skill-creator`'s description evaluation before a merge that changes the description.
