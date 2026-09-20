# tacomancy/skills

Agent skills distilled from how tacomancy projects are run. Install into any repository with:

```bash
npx skills add tacomancy/skills
```

Each skill is a folder under `skills/` holding a `SKILL.md`; the skills are the source, there is no build.

## Skills

- `adr-shape` — write and review ADRs in one shape: what it closes, reasoning inline, a verdict on every option, consequences with what was left open, a conditional status, dated updates; ships the template and a lint.
- `guidance-tiers` — frozen and living documentation tiers with a precedence rule and a CI-enforced check.
- `hidden-verify` — run, screenshot, or verify a change in a desktop application without a window ever appearing: render unseen, capture a PNG, quit, with all state in a scratch directory.
- `pin-prototypes` — draft the prompt set that takes a brief through a design tool, pin each accepted export with its PNG into a frozen folder, review it under the precedence rule, and rebrand it at build time through a total colour mapping.
- `reversibility-rank` — close a round of recommendations with a ranked note of which ones would be hard to reverse: the sticky items first with why, the trivial ones in one line.

### Closing grill rounds with `reversibility-rank`

`reversibility-rank` fires on its own when asked what would be hard to change, and `adr-shape` (spec #3, in progress) will name it directly. To make it the close of every `grill-me` or `grill-with-docs` round without editing those vendored skills, add one line to the adopting repository's guidance file (`CLAUDE.md` or `AGENTS.md`):

```markdown
Every grill round closes with `reversibility-rank` on its recommendations.
```

## Developing

`pnpm test` runs the structural checks over every skill folder plus the black-box tests for every script. See `CONTRIBUTING.md` for branches, merge gates, and where things go.
