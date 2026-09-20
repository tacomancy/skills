Recommendations from the plan review of the note-taking CLI's search work:

1. Swap the hand-rolled Levenshtein for the `fastest-levenshtein` package; it exposes the same `distance(a, b)` signature.
2. Cap fuzzy-match candidates at 200 before ranking.
3. Show the match score as a faint number at the right edge of each result row.
4. Keep tokenisation in its own module, `tokenise(text)`, so stemming can be added later without touching the matcher.
5. Debounce the search box at 150 ms.
