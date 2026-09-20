---
name: hidden-verify
description: Build hidden-render verification into a desktop application — an environment contract its shell reads at start so a run renders the window unseen, captures a PNG after a delay, quits, and keeps every piece of non-project state in a scratch directory. Use when an application is about to be verified by an agent working beside a person and lacks the hook, or when a project's `run` path would open a window.
---

# Hidden verify

Verifying a change to a desktop application means running it, and beside a person who is working every window that appears is an interruption. The answer is a **hook** built into the application: four environment variables its shell reads at start, under which a **hidden run** renders the window without ever showing it, captures it to a PNG after a delay, and quits — with all of the application's own state pointed at **scratch state**, a directory the run owns, so the person's real state is never read or written. The hook lives in the application's start-up code, where the tests can cover it and the next agent can find it, rather than in a script or an agent's memory.

The rule the skill exists to enforce: **a verification run never shows a window.** Interactions that need a real window — native menus, dialogs, the folder chooser — are covered by the application's own tests, with a fake host where one is needed.

## Install the hook

1. **Read the start-up.** Find the file that creates and shows the window; every process the application starts (a sidecar, a utility process, a worker); and every place non-project state is read or written, using the categories in [`state-directory-checklist.md`](state-directory-checklist.md) as the search list. Done when you can name the window's file and hold a list of state sites, each with its category.

2. **Name the four variables.** Take the contract in [`environment-contract.md`](environment-contract.md) — snapshot path, capture delay, state directory, debugging port — and give the three variables the application's own prefix. Done when the four names are written down and the delay's default is chosen from the application's first paint.

3. **Adapt the reference.** For Electron, adapt the fragment in [`electron-reference.md`](electron-reference.md) into the file that creates the window; for another shell, translate it — the contract is the same. The application keeps three rules in this mode: the window is never shown, the process quits once the PNG is written (or the capture fails), and setting the snapshot path changes nothing else, so the hidden run exercises the real code path. Done when the fragment is in place and the ordinary launch, with no variable set, behaves exactly as before.

4. **Route every state site.** Walk the list from step 1 against the checklist: each site reads and writes under the state directory when the variable is set, including the state a sidecar process owns and the state the runtime keeps for itself. Done when every category in the checklist is marked either *routed* or *none in this application*, and no site is left on its default path.

5. **Prove it.** Build, then launch the built binary — not the dev script — with all four variables set, the state directory and PNG path in the session's scratch space. Before launching, list the real state directory and note its modification times. Done when the PNG exists and shows the rendered page, the process has exited, no window appeared on any screen, the scratch directory holds what the run wrote, and the real state directory's listing and times are unchanged.

6. **Record it.** Write into the adopting repository's agent guidance: the four names, the build command every launch depends on, the path of the built binary, and the pointer that sends the `run` skill here — `run` looks for a project skill before its built-in patterns, and this line is what makes it take the hidden path. Say there that `.claude/launch.json` entries and the dev script are the human's preview, not verification. Done when a reader of the guidance alone can perform step 5.

The hook is application code: cover it in the application's tests as you would any feature, and let the ordinary path stay untouched by the mode.

## Run a verification

Drive the hidden run with [`driver.mjs`](driver.mjs), the template whose header states its contract: copy it into the session's scratch space, write the run — port, URL prefix, readiness selector, steps with the values they expect — in the block at the top of the copy, and run it with Node; the copy plus what it printed is the record of the run. Keep the copy in scratch. Commit one only when the project decides to keep a driver, and then beside its other verification tooling.

Origin: Vitrine's shell snapshot mode (`VITRINE_SNAPSHOT`, `VITRINE_SNAPSHOT_AFTER`, `VITRINE_APP_SUPPORT_DIR`) and `docs/agents/run.md`.
