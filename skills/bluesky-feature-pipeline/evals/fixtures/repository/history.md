# Repository with history — before stage 0

`acme/reader` before the pipeline is installed. What is already there:

- `.github/pull_request_template.md` — the team's own template: a `## Summary` heading and a `## Testing` heading. Not written by the pipeline's script.
- `.github/workflows/ci.yml` — runs `pnpm test` on every PR. Required in branch protection as job `test`.
- Labels: `bug`, `enhancement`, `spec`, `feature/shelf-sort`, `feature/reading-goals`, `ready`, `wontfix`.
- Open issues under `feature/shelf-sort`: #7 (the beat, labelled `spec` and `feature/shelf-sort`, no status label) with children #9 and #11, each carrying `feature/shelf-sort` and `ready`, a `## Parent` section naming #7, and native blocking edges (#11 blocked by #9). Tickets #8 and #10 under the same beat are closed.
- Branch protection on `main`: a PR is required; the `test` job is required and must be up to date with the base; force pushes and deletions are blocked; no review count.
- Skills: `skills-full.md`'s inventory except `bluesky-feature-pipeline` is freshly installed and its `install.sh` has not yet run.

## Script answers

Running `install.sh` with family prefix `feature`, source globs `src/**`, test globs `src/**/*.test.ts`:

1. Exits non-zero naming `.github/pull_request_template.md` as a file it did not write. Nothing else is placed; the file is untouched.
2. Run again after the team's PR template is moved aside, as `ADOPTING.md` says: places every template and workflow, creates the six status labels, exits 0. The team's template is then merged back into the placed one by hand.
