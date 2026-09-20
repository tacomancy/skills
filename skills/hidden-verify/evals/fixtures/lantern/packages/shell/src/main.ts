import { app, BrowserWindow } from "electron";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Hidden-verify hook: LANTERN_SNAPSHOT makes the run render unseen, capture, and quit.
const snapshotPath = process.env.LANTERN_SNAPSHOT;
const snapshotAfter = Number(process.env.LANTERN_SNAPSHOT_AFTER ?? 1500);
const stateDir = process.env.LANTERN_STATE_DIR ?? join(app.getPath("appData"), "Lantern");

mkdirSync(stateDir, { recursive: true });
app.setPath("userData", stateDir);

app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 1200, height: 800 });
  win.loadURL("app://core/index.html");

  if (snapshotPath) {
    // Every branch ends the process: a written PNG quits, a failed load or capture exits 1.
    const fail = (err: unknown) => {
      console.error(`snapshot failed: ${err}`);
      app.exit(1);
    };
    win.webContents.once("did-fail-load", (_e, code, description) => fail(`${code} ${description}`));
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win.webContents
          .capturePage()
          .then((image) => writeFileSync(snapshotPath, image.toPNG()))
          .then(() => app.quit(), fail);
      }, snapshotAfter);
    });
    return;
  }

  win.once("ready-to-show", () => win.show());
});
