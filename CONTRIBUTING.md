# Contributing

Agent guidance lives in `CLAUDE.md`; this file holds the mechanics that apply to anyone, agent or human.

## Branches and pull requests

- Never commit to `main`. Every change lands through a pull request from a short-lived branch, one issue per branch.
- Branch names carry a conventional type prefix: `feat/`, `fix/`, `docs/`, `chore/`, `test/`. PR titles use the same types in conventional-commit form, scoped by skill name when the change is about one skill: `feat(guidance-tiers): the check script`, `docs: seed CLAUDE.md`.
- A `feat` or `fix` PR links the spec or ticket it implements. Work without a spec issue is not started.
- `code-review` runs before the PR is opened, not after. The PR body lists any review findings declined, with why.

## Merge gates

`main` is protected. A PR merges only when:

- the `test` job in `.github/workflows/ci.yml` passes — locally, `pnpm test` (once spec #1's skeleton has landed; until then, the guidance files are the only content);
- the branch is up to date with `main`.

No force pushes to `main`, no deleting it.

## Where things go

- A skill is `skills/<name>/SKILL.md` plus its supporting files and scripts in the same folder. `<name>` is lowercase kebab-case and equals the frontmatter `name`.
- Tests for a skill live under `tests/<name>/`, never inside `skills/`, so `npx skills add` copies no test code.
- Evaluation fixtures for a skill's prose live beside the skill, in its folder, because they document what the skill is for.
- The root `README.md` lists every skill in one line; adding a skill adds a line.
- Vendored third-party skills sit in `.agents/skills/` and are never edited here.
