# Prompt set template

The shape of the file § 1 Draft writes. Angle brackets mark what the brief fills in; everything else is kept as written.

```markdown
# Design prompts — <project>

## Running these

Run Prompt 0 once; its output is the visual language every surface prompt assumes, and a second run produces a competing one. Run 01 in the same session, straight after. Try one session for the whole set first. The tell of a degraded session is a later surface coming back thinner than an earlier one; on the tell, stop, paste session 1's output back to the agent for a standing header, and open every later session with that header. Review each output against its push-back row before accepting it.

## Prompt 0 — visual language (run once)

<The product in two sentences, and who uses it.>

Establish the visual language for every surface that follows: palette, type, navigation, density. <What the brief says the product must feel like, and what it rules out resembling.>

Objects: <the brief's primary objects, one line each>.
Surfaces: <the surfaces, numbered as below, one line each>.

## 01 — <surface>

**Show:** <what is on the surface, populated at realistic scale — the number of objects, the length of names, the states present at once>.

**Push back:** <the tool's pattern-matched answer for this surface, and why it is wrong here>.

**The brief settles:** <the behaviour the brief specifies for this surface — interactions, ordering, what happens on an action>.

## 02 — <surface>

…

## Push-back table

| Prompt | Surface | Expected first-pass failure |
|--------|---------|-----------------------------|
| 01 | <surface> | <the **Push back** part of prompt 01> |
| 02 | <surface> | <the **Push back** part of prompt 02> |
```

A row is what the reviewer expects to be wrong; the Review phase checks each pinned output against its row.
