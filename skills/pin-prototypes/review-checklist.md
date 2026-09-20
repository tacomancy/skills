# Review note template

The shape § 4 Review writes for one prototype. Angle brackets mark what the reviewer fills in; the four bold labels are kept as written, so a code review cites a part by name ("the note's brief-wins part says notes are ordered by date").

```markdown
# Review — <NN-surface>

**Implements:** <the brief section(s) this surface implements, by heading>

**Brief wins:** <each behaviour the brief specifies for this surface, one line; where the prototype differs, name the difference — the prototype is ignored there>

**Push-back:** <the surface's row from the push-back table, quoted> — <cleared | not cleared>: <what in the pinned output shows it>

**Prototype settles:** <each piece of layout and visual treatment the implementation takes from the prototype, one line — regions and their order, what is visible at once, the states shown>
```

Every line is one thing a review can cite, so a part stays a list of lines; a brief-wins part that runs long is restating the brief, and a pointer to the section does that work. Palette and typography never appear under **Prototype settles**: they come from the brand kit.

## No prototype

```markdown
# Review — <surface> (no prototype)

**Implements:** <as above>

**Brief wins:** <as above; every behaviour the brief specifies>

**Push-back:** no row; the surface was never prompted

**Language settles:** <the established visual language — palette by role, type, navigation, density, components — from Prompt 0's output or the standing header>
```

Layout the two filled parts leave open comes from the brief's prose.
