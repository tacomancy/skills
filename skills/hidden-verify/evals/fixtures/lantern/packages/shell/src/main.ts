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
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        try {
          const image = await win.webContents.capturePage();
          writeFileSync(snapshotPath, image.toPNG());
        } finally {
          app.quit();
        }
      }, snapshotAfter);
    });
    return;
  }

  win.once("ready-to-show", () => win.show());
});
