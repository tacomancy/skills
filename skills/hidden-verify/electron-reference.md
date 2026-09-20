# Electron reference

A main-process fragment to adapt into the file that creates the window. It is not a module to import: the names, the default delay, and the state owner are the application's. `APP` stands for the application's prefix.

```ts
import { app, BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";

// Read once, at start. Everything below takes these values; nothing else
// consults the environment, so the mode has exactly one seam.
const SNAPSHOT = process.env.APP_SNAPSHOT;
const SNAPSHOT_AFTER = Number(process.env.APP_SNAPSHOT_AFTER) || 1500;
const STATE_DIR = process.env.APP_STATE_DIR;

// The runtime's own state (localStorage, IndexedDB, cookies, caches) lives in
// userData; moving it is the one call that has to happen before `ready`.
if (STATE_DIR) app.setPath("userData", STATE_DIR);

function createWindow(url: string) {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    show: false, // always; the ordinary path shows on ready-to-show below
    webPreferences: { sandbox: true, contextIsolation: true },
  });

  if (SNAPSHOT) {
    // A verification run beside someone's work: the window is never shown.
    // The page renders hidden, is captured after the delay, and the app quits.
    const fail = (why: unknown) => {
      console.error("snapshot failed:", why);
      app.exit(1);
    };
    win.webContents.once("did-fail-load", (_e, code, description) =>
      fail(`${description} (${code})`)
    );
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        void win.webContents
          .capturePage(undefined, { stayHidden: true })
          .then((image) => writeFile(SNAPSHOT, image.toPNG()))
          .then(() => app.quit(), fail);
      }, SNAPSHOT_AFTER);
    });
  } else {
    win.once("ready-to-show", () => win.show());
  }

  void win.loadURL(url);
}

void app.whenReady().then(() => {
  // Whatever owns state receives the directory here, once. In process it is an
  // argument; out of process (a utility process, a sidecar) it travels in that
  // process's environment or arguments, and that process routes its own sites.
  const state = startState({ stateDir: STATE_DIR });
  createWindow(state.url);
});
```

What each part does, and why it is there:

- **`show: false` on every launch**, with the ordinary path showing on `ready-to-show`. The mode then removes one call rather than adding a branch through window creation, and the two paths create the same window.
- **`did-finish-load`, then the delay.** The load event says the document is there, not that the application has painted it — a renderer that asks a core for data and then renders needs the delay to cover the round trip. The default is measured against the application's first paint ([`environment-contract.md`](environment-contract.md) § The default delay); a driver on the debugging port passes a longer one.
- **`stayHidden: true`.** A hidden page does not paint, so `capturePage` counts it as visible for the capture's duration; `stayHidden` keeps the page's own visibility state hidden while it does, so the page captured is the page the run rendered, with no visibility-change handlers firing between the drive and the capture.
- **Every branch ends the process.** A written PNG ends in `app.quit()`; a failed load or a failed capture reports on stderr and ends in `app.exit(1)`, the call that carries an exit code, so a run script keyed on the status reads the run as failed. `did-fail-load` is what covers a core that never started or a URL that never answered — without it the timer is never armed and a hidden process runs on unseen. On macOS, `window-all-closed` does not quit the application, which is why the quit is explicit.
- **The state directory, read once and handed on.** `startState` stands for whatever owns state: a store in this process, or a core the shell forks. A forked process receives the directory through its own environment (`env: { ...process.env, APP_STATE_DIR: STATE_DIR }`) or arguments and reads it once at its own start, as this file does. `app.setPath("userData", …)` covers what Electron itself writes; the application's own sites are the [`state-directory-checklist.md`](state-directory-checklist.md).
- **The debugging port is not in the fragment.** Electron reads `--remote-debugging-port` from `argv` itself; the fragment has nothing to do unless the application filters its arguments.

What is deliberately absent: a second window, a `show()` behind a condition, a menu that opens dialogs on start, an `activate` handler that recreates a window after the capture. Each is a way for a window to appear in this mode; keep them on the ordinary path only.
