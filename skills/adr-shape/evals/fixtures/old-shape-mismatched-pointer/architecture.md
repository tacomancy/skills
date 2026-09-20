# Architecture

## Entries

The shape ADR 0003 decided, in enough detail to write against. One Markdown file per entry, front matter above the body; the parser is `gray-matter` 4.0.3 behind `src/entries/parse.ts`.

## Attachments

The shape ADR 0003 decided, in enough detail to write against. Files live beside the entry; the import path is `src/attachments/import.ts`.

## Open, in the order they block work

1. **Sync between devices** — inherits ADR 0003's requirement that entries stay readable without the app.
2. **Export to PDF** — inherits nothing yet.
