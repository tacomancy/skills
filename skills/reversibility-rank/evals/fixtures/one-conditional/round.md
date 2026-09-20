Recommendations from the plan review of the note-taking CLI's storage layer:

1. Give every note a sequential integer id in the SQLite table. Today nothing outside the process reads it; the sync feature scheduled for next quarter will use it as the cross-device key.
2. Use `better-sqlite3` rather than `sql.js`; both sit behind the existing `Store` interface.
3. Run `VACUUM` on exit when the database has grown past 50 MB.
4. Put the storage-size indicator in the footer of the list view.
