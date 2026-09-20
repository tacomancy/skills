# Proof template

The verification section of a PR body. One row per expectation the driver checked, one line per PNG; a reviewer reads the table without running anything and opens a PNG only to see the state.

```markdown
## Verification

Hidden runs against the built binary; every row is a value the driver read from the page.

| State | Selector | Property | Expected | Actual |
| --- | --- | --- | --- | --- |
| <state> | `<selector>` | `<css-property>` | `<token>` = `<value>` | `<value>` |

PNGs: `<state>.png`, …
```

## Filling it

- **State** names what the launch produced: the fixture opened, the steps driven — `empty vault`, `editor with note open, dark theme`. One launch per state, so every state in the table has a PNG of the same name.
- **Selector** and **Property** are copied from the driver's step, verbatim.
- **Expected** carries the design token beside its value when a token exists — `--surface-raised` = `rgb(38, 38, 42)` — so the reviewer sees which token the change reached for, not only which colour came out. A value with no token behind it is written alone.
- **Actual** is the value the driver printed, verbatim. A mismatch is a mismatch row: expected and actual both present, both true, with `MISMATCH` after the actual — the table reports it, the PR text says why it is there. A row with a judgement in the actual column — "looks right", "as expected", "matches" — is forbidden: the column holds what the driver printed and nothing else. When there is no value to print, there is no row; find the selector and property that carry the state and add a step for it.
- **PNGs** are the files the launches wrote, listed by name; attach them to the PR or send them in the conversation, and name where they went.
