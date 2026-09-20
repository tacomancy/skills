# Lantern

A desktop Markdown notebook: an Electron shell (`packages/shell`) around a web core (`packages/core`). Opens one notebook folder at a time; the sidebar lists its pages, the selected page renders on the right.

Workspace: pnpm, two packages. `pnpm -r build` builds both; `pnpm dev` starts the core's dev server and an Electron window against it.
