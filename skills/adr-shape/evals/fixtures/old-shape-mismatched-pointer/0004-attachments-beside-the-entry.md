# 0004: Attachments beside the entry

## Status

Accepted

## Context

Entries can carry images and files. The app needs somewhere to put them that survives sync and stays readable without the app. The frozen brief assumed a single media database; this diverges from that.

## Decision

Attachments are stored as files in an `attachments/` folder beside the entry's Markdown file, named `<entry-slug>/<original-name>`. Attachments over 25 MB are rejected at import with a warning. Images are resized on import to a longest edge of 2048 px with `sharp` 0.33.

## Considered options

- **A single media database** (SQLite, one row per attachment).
- **Content-addressed store** — files named by hash under a shared `.media/` folder.
- **Inline base64 in the entry** — the attachment inside the Markdown file.

## Consequences

Users can see and open their attachments in any file manager. Deleting an entry has to delete its folder too. The 25 MB limit will annoy people who attach video; we can raise it later.
