# CLAUDE.md

Lantern is a pnpm workspace: `packages/core` (the web UI, Vite) and `packages/shell` (Electron). The shell loads the core's built output from `packages/core/dist`.

## Commands

- `pnpm -r build` — builds core then shell. The packaged binary is written to `packages/shell/out/Lantern-darwin-arm64/Lantern.app`.
- `pnpm dev` — core dev server plus an Electron window for hand testing.
- `pnpm test` — core's Vitest project.

## Verifying a change

Verification runs take the hidden path: the `hidden-verify` skill. `.claude/launch.json` is the human's preview and opens a window; do not use it for verification.

The hook, read by `packages/shell/src/main.ts` at start:

- `LANTERN_SNAPSHOT` — path of the PNG to write; when set the window is never shown and the process quits after the capture.
- `LANTERN_SNAPSHOT_AFTER` — milliseconds after the page's load event before the capture; default 1500.
- `LANTERN_STATE_DIR` — directory for all of Lantern's own state (settings, last-opened notebook, window bounds, Electron's userData); default `~/Library/Application Support/Lantern`.
- `--remote-debugging-port=<port>` — passed through to Electron.

Every launch depends on both packages: build with `pnpm -r build`. The binary to launch is `packages/shell/out/Lantern-darwin-arm64/Lantern.app/Contents/MacOS/Lantern`. The last-opened notebook is `lastNotebook` in `<LANTERN_STATE_DIR>/settings.json`; the core's page is served at `app://core/index.html`, and `.sidebar[data-ready="true"]` is set once the page list has rendered.
