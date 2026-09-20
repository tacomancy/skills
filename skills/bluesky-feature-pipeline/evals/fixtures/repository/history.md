# Repository with history — before stage 0

`acme/reader` before the pipeline is installed. What is already there:

- `.github/pull_request_template.md` — the team's own template: a `## Summary` heading and a `## Testing` heading. Not written by the pipeline's script.
- `.github/workflows/ci.yml` — runs `pnpm test` on every PR. Required in branch protection as job `test`.
- Labels: `bug`, `enhancement`, `spec`, `feature/shelf-sort`, `feature/reading-goals`, `ready`, `wontfix`.
- Open issues under `feature/shelf-sort`: #7 (the beat, labelled `spec`) with children #9 and #11, each carrying `feature/shelf-sort` and a `## Parent` section naming #7.
- Skills: `skills-full.md`'s inventory except `bluesky-feature-pipeline` is freshly installed and its `install.sh` has not yet run.

## Script answers

Running `install.sh` with family prefix `feature`, source globs `src/**`, test globs `src/**/*.test.ts`:

1. Exits non-zero naming `.github/pull_request_template.md` as a file it did not write. Nothing else is placed; the file is untouched.
