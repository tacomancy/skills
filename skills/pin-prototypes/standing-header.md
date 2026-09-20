# Standing header template

Distilled from session 1's *output*, never from the prompt: what the tool rendered is the language, and a later session must reproduce that, not the request. Every later session opens with this header, verbatim, before its first surface prompt.

```markdown
Continue the design for <project>. Keep this language exactly:

- Palette: <the colours the output used, by role — background, surface, text, accent — as the output rendered them>
- Type: <family, the sizes and weights used for headings, body, labels>
- Navigation: <where it sits and how the output moved between surfaces>
- Density: <spacing scale, row height, how much fits on one screen>
- Components: <any recurring element the output invented — a card shape, a status mark>

Objects: <the object list from Prompt 0>.
Surfaces: <the surface list from Prompt 0, marking which are already done>.
```

The fifth line is optional; the others are always present. Done when each line describes what the paste shows, and the object and surface lists match Prompt 0.
