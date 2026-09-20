# State-directory checklist

Non-project state is everything the application remembers between launches that is not the document, project, or vault it opens. Every kind of it must live under the state directory when the variable is set, or a hidden run reads the person's real state and writes into it — a remembered last project pointing the run at their files, or the run's scratch fixture becoming their next launch's default.

Walk every row. Mark each *routed* (the reads and writes go under the state directory when set) or *none in this application* (nothing of this kind is kept). A row is marked from the code, not from memory: search for the API or path each row names.

| Category | Where it hides | What to search for | Route |
| --- | --- | --- | --- |
| Last-opened project, document, or vault | A small file or key written on open and read at start | The open path's write; the start-up's read | Read and write the file under the state directory; a run seeds it there to open its fixture directly. |
| Window bounds and layout | Position, size, sidebar widths, last tab | Window-state libraries, `bounds` on `close`, layout keys | Same store as above, under the state directory. |
| Session tokens and credentials | Token files, cookie jars, the OS keychain | Auth modules, `keytar`, `safeStorage`, cookie stores | Token files go under the state directory. The OS keychain has no directory: the hidden run reads nothing from it — take a token from the state directory or run signed out. |
| Caches | Thumbnails, indexes, parsed-file caches, HTTP caches | `cache` in paths, `os.tmpdir()`, `app.getPath("cache")` / `("temp")` | Under the state directory; a run's caches are the run's. |
| Preferences and settings | Settings files, feature flags, recently-used lists | `electron-store`, `conf`, `settings.json`, `app.addRecentDocument` | Under the state directory; recent-documents registration is skipped in this mode. |
| The runtime's own state | Electron's `userData`: `localStorage`, IndexedDB, cookies, service workers, GPU and code caches | `app.getPath("userData")`, `session.defaultSession` | `app.setPath("userData", dir)` before the app is ready ([`electron-reference.md`](electron-reference.md)); nothing else reaches it. |
| Sidecar and utility processes | A core, a language server, a worker with a store of its own | `utilityProcess.fork`, `child_process.spawn`, `Worker` | Pass the directory into the process — through its environment or its arguments — and route its state sites too; the variable read once in the shell has no effect on a process that never receives it. |
| Logs and crash reports | Log files, crash dumps | `app.getPath("logs")` / `("crashDumps")`, logging libraries | Under the state directory. |
| Another application's configuration | A registration of this application's files in a second application (a vault list, a file-association registry) | Any write outside this application's own paths | Never touched by a hidden run. A check that needs it is asked of the user first and undone after. |

The defaults these rows replace are the platform's application-support location — `~/Library/Application Support/<App>` on macOS, `%APPDATA%\<App>` on Windows, `$XDG_CONFIG_HOME/<App>` on Linux — plus the temp and cache directories. A search for `homedir()`, `app.getPath(`, `process.env.HOME`, `APPDATA`, and `XDG_` across the application finds the sites that build those paths by hand.
