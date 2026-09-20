# Grill transcript — on-disk format for journal entries

Context: a local-first journaling app. The ADR directory holds 0001–0004; 0003 requires that a user's entries stay readable without the app installed. `architecture.md` lists the on-disk format as open item 2.

**Q: What does an entry look like on disk?**
A: One Markdown file per entry, in a folder the user picks at first launch. Front matter at the top for the metadata, body below. Users can open them in any editor, put the folder in whatever sync they already use, and grep them. That is the 0003 requirement, kept.

**Q: Why not SQLite? One file, transactions, fast queries.**
A: Rejected. A single database file is opaque to every other tool the user has, and it is exactly the file sync clients corrupt when two devices write it — a locked binary blob is the opposite of "readable without the app".

**Q: One JSON file holding every entry, then. Still readable.**
A: Rejected. It grows without bound, every save rewrites the whole thing, and any two-device edit is a merge conflict over the entire journal rather than over one entry. Per-entry files make a conflict local to the entry that changed.

**Q: A bundle format — a zip of entries with a manifest — so the folder can't be half-edited by hand?**
A: Rejected. Hand-editing is a feature, not a risk; and the bundle library we would reach for is GPL, which would change the licence posture of the app. Not taking that on.

**Q: Which front-matter fields?**
A: `title`, `created`, `tags` to start. We will add fields as features land; that list is going to move.

**Q: Which parser?**
A: `gray-matter` 4.0.3. Anything that reads YAML front matter would do; it sits behind one module.

**Q: File names?**
A: `YYYY-MM-DD-<slug>.md`. Users will see these in their folder, so once we ship it we are stuck with it. Slug rules are a detail: lowercase, hyphens, cut at 60 characters.

**Q: Large folders — thousands of entries — do we index?**
A: Not yet. Deferred until dogfooding passes two thousand entries and a search takes over a second; then a search index becomes its own decision. It goes on the open list, inheriting 0003's requirement that the index be a cache — deletable without losing anything.

**Q: The folder-size warning?**
A: Warn at 50 MB. Just a number in code; tune it whenever.

**Q: Anything that would make you take this back?**
A: If the sync prototype can't round-trip a thousand entries between two devices without a conflict on an unchanged entry, the per-entry format has failed its purpose. That prototype is the gate: this stays Proposed until it does.

**Q: Autosave?**
A: Debounced, 300 ms after the last keystroke. Not a decision anyone will care about.
