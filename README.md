# tacomancy/skills

Agent skills distilled from how tacomancy projects are run. Install into any repository with:

```bash
npx skills add tacomancy/skills
```

Each skill is a folder under `skills/` holding a `SKILL.md`; the skills are the source, there is no build.

## Skills

- `guidance-tiers` — frozen and living documentation tiers with a precedence rule and a CI-enforced check.
- `hidden-verify` — build hidden-render verification into a desktop application: render unseen, capture a PNG, quit, with all state in a scratch directory.
- `pin-prototypes` — draft the prompt set that takes a brief through a design tool, pin each accepted export with its PNG into a frozen folder, review it under the precedence rule, and rebrand it at build time through a total colour mapping.

## Developing

`pnpm test` runs the structural checks over every skill folder plus the black-box tests for every script. See `CONTRIBUTING.md` for branches, merge gates, and where things go.
