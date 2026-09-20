# tacomancy/skills

Agent skills distilled from how tacomancy projects are run. Install into any repository with:

```bash
npx skills add tacomancy/skills
```

Each skill is a folder under `skills/` holding a `SKILL.md`; the skills are the source, there is no build.

## Skills

- `guidance-tiers` — frozen and living documentation tiers with a precedence rule and a CI-enforced check. _In progress: the check script has landed; the scaffold follows._

## Developing

`pnpm test` runs the structural checks over every skill folder plus the black-box tests for every script. See `CONTRIBUTING.md` for branches, merge gates, and where things go.
