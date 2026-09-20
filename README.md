# tacomancy/skills

Agent skills distilled from how tacomancy projects are run. Install into any repository with:

```bash
npx skills add tacomancy/skills
```

Each skill is a folder under `skills/` holding a `SKILL.md`; the skills are the source, there is no build.

## Skills

- `adr-shape` — write and review ADRs in one shape: what it closes, reasoning inline, a verdict on every option, consequences with what was left open, a conditional status, dated updates; drafts from a closed `grill-me` round, answers whether a detail belongs in the ADR or the architecture document, and ships the template, the checklist, and a lint.
- `bluesky-feature-pipeline` — carry a blue-sky feature from an idea to landed tickets through eight session-bounded stages, each owned by one session whose authority ends at a checkable point, with the state between stages in the issue tracker; chains `guidance-tiers`, `reversibility-rank`, `pin-prototypes`, and `land-ticket` from this set with a grill skill, `to-spec`, `to-tickets`, `implement`, `tdd`, and `code-review`, names the fallback for each when it is absent, and ships the issue and PR templates, three PR checks and the label mover that tracks PR events, and the install script that places them.
- `guidance-tiers` — frozen and living documentation tiers with a precedence rule and a CI-enforced check.
- `hidden-verify` — run, screenshot, or verify a change in a desktop application without a window ever appearing: render unseen, capture a PNG, quit, with all state in a scratch directory.
- `land-ticket` — land a reviewed PR the way the repository already does: gate on the check run for the PR's current head, merge in the style the history uses, close the ticket and its parent on the last child, act on the guidance file's post-merge triggers, and report the frontier this merge unblocked.
- `pin-prototypes` — draft the prompt set that takes a brief through a design tool, pin each accepted export with its PNG into a frozen folder, review it under the precedence rule, and rebrand it at build time through a total colour mapping.
- `reversibility-rank` — close a round of recommendations with a ranked note of which ones would be hard to reverse: the sticky items first with why, the trivial ones in one line.

### Closing grill rounds with `reversibility-rank`

`reversibility-rank` fires on its own when asked what would be hard to change, and `adr-shape` names it directly as the close of every write, over the ADR's numbered decisions. To make it the close of every `grill-me` or `grill-with-docs` round without editing those vendored skills, add one line to the adopting repository's guidance file (`CLAUDE.md` or `AGENTS.md`):

```markdown
Every grill round closes with `reversibility-rank` on its recommendations.
```

## Developing

`pnpm test` runs the structural checks over every skill folder plus the black-box tests for every script. See `CONTRIBUTING.md` for branches, merge gates, and where things go.
