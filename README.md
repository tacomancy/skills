# tacomancy/skills

Agent skills distilled from how tacomancy projects are run. Install into any repository with:

```bash
npx skills add tacomancy/skills
```

Each skill is a folder under `skills/` holding a `SKILL.md`; the skills are the source, there is no build.

## Skills

- `guidance-tiers` — frozen and living documentation tiers with a precedence rule and a CI-enforced check.
- `hidden-verify` — build hidden-render verification into a desktop application: render unseen, capture a PNG, quit, with all state in a scratch directory.
- `reversibility-rank` — close a round of recommendations with a ranked note of which ones would be hard to reverse: the sticky items first with why, the trivial ones in one line.

### Closing grill rounds with `reversibility-rank`

`reversibility-rank` fires on its own when asked what would be hard to change, and `adr-shape` (spec #3, in progress) will name it directly. To make it the close of every `grill-me` or `grill-with-docs` round without editing those vendored skills, add one line to the adopting repository's guidance file (`CLAUDE.md` or `AGENTS.md`):

```markdown
Every grill round closes with `reversibility-rank` on its recommendations.
```

## Developing

`pnpm test` runs the structural checks over every skill folder plus the black-box tests for every script. See `CONTRIBUTING.md` for branches, merge gates, and where things go.
