Recommendations from the plan review of the note-taking CLI:

1. Use `pino` for structured logging instead of hand-rolled `console.log` wrappers.
2. Keep each note's tags in its front matter as a comma-separated `tags:` string, so users can edit them in any text editor.
3. Default the list view to 50 notes a page.
4. Put the search box above the note list rather than in the sidebar.
5. Make `notes export --json` the documented interchange format; the sync plugin and the mobile importer will read it.
6. Implement fuzzy search as one module exporting `match(query, items)`, so the algorithm can change without touching callers.
