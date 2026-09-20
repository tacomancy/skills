---
name: hidden-verify
description: Build hidden-render verification into a desktop application — an environment contract its shell reads at start so a run renders the window unseen, captures a PNG after a delay, quits, and keeps every piece of non-project state in a scratch directory. Use when an application is about to be verified by an agent working beside a person and lacks the hook, when a change in an application that has it needs proof for a PR, or when a project's `run` path would open a window.
---

# Hidden verify

Verifying a change to a desktop application means running it, and beside a person who is working every window that appears is an interruption. The answer is a **hook** built into the application: four environment variables its shell reads at start, under which a **hidden run** renders the window without ever showing it, captures it to a PNG after a delay, and quits — with all of the application's own state pointed at **scratch state**, a directory the run owns, so the person's real state is never read or written. The hook lives in the application's start-up code, where the tests can cover it and the next agent can find it, rather than in a script or an agent's memory.

The rule the skill exists to enforce: **a verification run never shows a window.** Two halves: [install the hook](#install-the-hook) in an application that lacks it, then [run a verification](#run-a-verification) in one that has it. The [rules](#rules) at the end hold for both.

## Install the hook

1. **Read the start-up.** Find the file that creates and shows the window; every process the application starts (a sidecar, a utility process, a worker); and every place non-project state is read or written, using the categories in [`state-directory-checklist.md`](state-directory-checklist.md) as the search list. Done when you can name the window's file and hold a list of state sites, each with its category.

2. **Name the four variables.** Take the contract in [`environment-contract.md`](environment-contract.md) — snapshot path, capture delay, state directory, debugging port — and give the three variables the application's own prefix. Done when the four names are written down and the delay's default is chosen from the application's first paint.

3. **Adapt the reference.** For Electron, adapt the fragment in [`electron-reference.md`](electron-reference.md) into the file that creates the window; for another shell, translate it — the contract is the same. The application keeps three rules in this mode: the window is never shown, the process quits once the PNG is written (or the capture fails), and setting the snapshot path changes nothing else, so the hidden run exercises the real code path. Done when the fragment is in place and the ordinary launch, with no variable set, behaves exactly as before.

4. **Route every state site.** Walk the list from step 1 against the checklist: each site reads and writes under the state directory when the variable is set, including the state a sidecar process owns and the state the runtime keeps for itself. Done when every category in the checklist is marked either *routed* or *none in this application*, and no site is left on its default path.

5. **Prove it.** Build, then launch the built binary — not the dev script — with all four variables set, the state directory and PNG path in the session's scratch space. Before launching, list the real state directory and note its modification times. Done when the PNG exists and shows the rendered page, the process has exited, no window appeared on any screen, the scratch directory holds what the run wrote, and the real state directory's listing and times are unchanged.

6. **Record it.** Write into the adopting repository's agent guidance: the four names, the build command every launch depends on, the path of the built binary, the pointer that sends the `run` skill here, and the line that launch configurations are the human's preview — the last two [rules](#rules) say why each matters. Done when a reader of the guidance alone can perform step 5.

The hook is application code: cover it in the application's tests as you would any feature, and let the ordinary path stay untouched by the mode.

## Run a verification

The application has the hook, and its guidance names the four variables, the build command, and the built binary — a reader who cannot find those installs the hook first. One launch per captured state, from the first step to the last, so every PNG is reproducible from a command line.

1. **Rebuild.** Build every package the launch depends on, so the binary carries the change and stale output can make neither a fix look unfixed nor a regression look fixed. Which packages is the project's to say: read it from the adopting repository's guidance file, and the first time the guidance is silent, ask the project — the person, or the workspace's dependency graph from the binary inward — and record the answer in that guidance file so the next run reads it instead of asking. Done when every named package built green after the change. (Vitrine's, as an example: the core and the shell.)

2. **Scratch state.** Create a fresh directory for the run's state in the session's scratch space. Done when the directory exists, empty, and its path is the value the state-directory variable will take.

3. **Scratch fixture.** Create a fresh fixture — a vault, a project, a document, whatever the application opens — in the session's scratch space, with only the content the state under test needs. Each launch gets its own, so runs never contaminate each other; the person's own files are never the fixture. Done when the fixture is on disk and its path is written down.

4. **Pointer.** Write whatever the application needs to open the fixture directly at start — the last-opened store under the scratch state directory, an argument, a deep link — as the *Last-opened* row of [`state-directory-checklist.md`](state-directory-checklist.md) describes. Done when a launch with no driver would open the fixture and nothing else. (Vitrine's, as an example: the last-opened vault in the settings file under `VITRINE_APP_SUPPORT_DIR`.)

5. **Write the run.** Copy [`driver.mjs`](driver.mjs) into the session's scratch space and write the run in the block at the top of the copy — port, URL prefix, readiness selector, steps with the values they expect. The copy is written before the launch, because the capture delay starts counting at the page's load event and every second spent editing after that is a second the driver does not have. Done when the copy holds every step for this state and you can say how long the steps take.

6. **Launch the binary.** Start the built binary from the guidance with all four variables: the PNG path in scratch, a capture delay longer than the steps take, the scratch state directory, the debugging port. The binary and only the binary — the dev script and any launch configuration open a window ([rules](#rules)). It quits on its own after the capture, so start it in the background. Done when the process is running and the debugging port answers.

7. **Drive.** Run the copy with Node. The copy plus what it printed is the record of the run; keep it in scratch, and commit one only when the project decides to keep a driver, beside its other verification tooling. Done when the driver has exited and every step has printed its line — a mismatch is a row to carry into the proof, and a run that died on its environment is diagnosed from the failure it names before anything is launched again.

8. **Capture.** Wait for the PNG; the application writes it after the delay and exits. Read the PNG. Done when the file shows the state the steps produced and the process is gone.

9. **Send.** Send the PNG to the user, and write the run's rows into the proof ([`proof-template.md`](proof-template.md)): state, selector, property, expected token or value, actual value, then the PNG's name. Done when every expectation the driver checked is a row.

10. **Repeat per state.** Go back to step 2 for the next state the change touches — a new state directory, a new fixture, a new launch, one PNG — and back to step 1 whenever the code changed since the last build, a mismatch fixed included, so no launch runs a stale binary. Done when every state the change produces has its launch, its driver copy, and its PNG, and the proof carries them all.

## Rules

Each holds in both halves; each names what to do instead.

- **A real window stays closed.** An interaction that needs one — a native menu, a dialog, the folder chooser — is covered in the application's core tests, with a fake host where one is needed. Opening a window once to check it is the interruption the skill exists to remove; write the test instead.
- **Another application is asked for first.** A check that needs an external application — opening the fixture in another tool to confirm interop — changes the person's environment, because registering a scratch fixture in another application's settings is a change to their configuration. Ask the user before doing it, do it only on a yes, and undo every configuration change afterwards, before the run is reported done. (Vitrine's Obsidian check, as an example.)
- **Launch configurations are the human's preview.** `.claude/launch.json` entries and the dev script open a visible window for the person; verification refuses them and launches the built binary with the four variables. When a launch configuration is the only recorded way to start the application, the hook's guidance is missing — install step 6 records the binary path.
- **`run` takes the hidden path through the guidance.** The built-in `run` skill looks for a project skill before its built-in patterns, and the line install step 6 writes into the adopting repository's guidance — naming this skill — is what sends `run` here. When `run` is absent, nothing is lost: the steps above are the whole procedure, and an agent follows them directly.

Origin: Vitrine's shell snapshot mode (`VITRINE_SNAPSHOT`, `VITRINE_SNAPSHOT_AFTER`, `VITRINE_APP_SUPPORT_DIR`) and `docs/agents/run.md`.
