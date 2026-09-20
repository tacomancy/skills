# The environment contract

Four variables the application reads once, at start. Three are environment variables under the application's own prefix, written `<PREFIX>` below; the fourth is a flag of the shell's runtime that the application lets through. A run sets all four; the ordinary launch sets none.

| Variable | Value | When set |
| --- | --- | --- |
| `<PREFIX>_SNAPSHOT` | Path of the PNG to write | The window is created never-shown, rendered, captured to this path after the delay, and the application quits. |
| `<PREFIX>_SNAPSHOT_AFTER` | Milliseconds | How long after the page's load event the capture happens. Defaults to a value long enough for the application's first paint, so a run with no driver still captures a painted page; a run with a driver stretches it to cover the driving. |
| `<PREFIX>_STATE_DIR` | A directory | Every read and write of non-project state goes under this directory, and the default location is never touched. Honoured by every process the application runs, not only the one that reads the variable ([`state-directory-checklist.md`](state-directory-checklist.md)). |
| Debugging port | The runtime's flag, for Electron `--remote-debugging-port=<n>` | The runtime opens the Chrome DevTools Protocol on that port; a driver finds the page there. The application does not read it, it passes it through — a launcher that filters or rewrites `argv` must let it reach the runtime. |

Names are the application's to choose; the meaning of each variable is fixed by this table. Vitrine's, as an example: `VITRINE_SNAPSHOT`, `VITRINE_SNAPSHOT_AFTER` (default 1500), `VITRINE_APP_SUPPORT_DIR`, and Electron's `--remote-debugging-port`.

## Rules the application keeps

- **Never shown.** With the snapshot path set, nothing in the process calls the window's `show`, `showInactive`, `focus`, or anything else that puts a window on a screen — including a second window the application might open later in the run.
- **Quits after capture.** Once the PNG is written the application quits on its own, and it quits the same way when the capture fails, reporting the failure on stderr. A run leaves nothing running.
- **No other effect.** Setting the snapshot path changes only whether the window is shown and when the process quits. The same URL loads, the same state is read, the same start-up runs, so what the PNG shows is what the person would see. A code path that checks the snapshot variable anywhere other than the show-or-capture decision is a second application being verified instead of the real one.
- **State directory honoured everywhere.** Not only at the obvious call site: the checklist names the places state hides.

## The default delay

Measure it: launch the built application once with the snapshot path set and the delay unset, and look at the PNG. A blank or half-painted page means the default is short. Set it so the first paint is complete with margin on a slow machine; a driver, when one runs, will pass a longer value of its own.
