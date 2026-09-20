import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INSTALLED = "scripts/check-guidance.sh";
const SCRIPT = fileURLToPath(new URL("../../skills/guidance-tiers/check-guidance.sh", import.meta.url));
const SCAFFOLD = fileURLToPath(new URL("../../skills/guidance-tiers/scaffold.sh", import.meta.url));

// `output` is stdout and stderr together, as a CI log shows them.
export type Run = { status: number; output: string; lines: string[]; fails: string[] };

// A throwaway git repository with a `main` branch, driven the way an owner's CI would
// drive the check: write files, commit, branch, run the script from the repo root.
export class FixtureRepo {
  readonly dir: string;

  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), "guidance-tiers-"));
    this.git("init", "-q", "-b", "main");
    this.git("config", "user.email", "fixture@example.com");
    this.git("config", "user.name", "Fixture");
    this.git("config", "commit.gpgsign", "false");
  }

  git(...args: string[]): string {
    return execFileSync("git", args, { cwd: this.dir, encoding: "utf8" }).trim();
  }

  write(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(this.dir, path)), { recursive: true });
      writeFileSync(join(this.dir, path), content);
    }
  }

  commit(message: string, files: Record<string, string>): void {
    this.write(files);
    this.git("add", "-A");
    this.git("commit", "-q", "-m", message);
  }

  // A clone whose `origin` is this repository, so `origin/main` resolves.
  cloneOf(): FixtureRepo {
    const clone = new FixtureRepo();
    clone.git("remote", "add", "origin", this.dir);
    clone.git("fetch", "-q", "origin");
    return clone;
  }

  branch(name: string): void {
    this.git("checkout", "-q", "-b", name);
  }

  // Copies the script into the repository with configuration lines rewritten, the way an
  // owner edits the block at the top. A string becomes a quoted value, an array a bash
  // array. `run` then drives the installed copy instead of the one in the skill folder.
  installScript(config: Record<string, string | string[]>): void {
    let script = readFileSync(SCRIPT, "utf8");
    for (const [name, value] of Object.entries(config)) {
      const line = new RegExp(`^${name}=.*$`, "m");
      if (!line.test(script)) throw new Error(`${name} is not a configuration variable of the script`);
      const quoted = Array.isArray(value) ? `(${value.map((v) => JSON.stringify(v)).join(" ")})` : JSON.stringify(value);
      script = script.replace(line, `${name}=${quoted}`);
    }
    this.write({ [INSTALLED]: script });
  }

  read(path: string): string {
    return readFileSync(join(this.dir, path), "utf8");
  }

  exists(path: string): boolean {
    return existsSync(join(this.dir, path));
  }

  // The scaffold step of the skill, run from the repository root with the interview's answers.
  scaffold(...args: string[]): Run {
    return collect(spawnSync("bash", [SCAFFOLD, ...args], { cwd: this.dir, encoding: "utf8" }));
  }

  // Runs the installed copy when `installScript` made one, else the skill's own script.
  run(...args: string[]): Run {
    const installed = join(this.dir, INSTALLED);
    const script = existsSync(installed) ? installed : SCRIPT;
    return collect(spawnSync("bash", [script, ...args], { cwd: this.dir, encoding: "utf8" }));
  }
}

function collect(result: SpawnSyncReturns<string>): Run {
  const output = result.stdout + result.stderr;
  const lines = output.split("\n").filter((line) => line !== "");
  return { status: result.status ?? -1, output, lines, fails: lines.filter((l) => l.startsWith("FAIL:")) };
}

// The default layout the script's configuration block names, with one frozen file.
export function conformingRepo(): FixtureRepo {
  const repo = new FixtureRepo();
  repo.commit("base", {
    "docs/reference/README.md": "# Reference\n\nNothing here is edited.\n\n- `brief.md` — the original brief.\n",
    "docs/reference/brief.md": "# Brief\n\nThe original.\n",
    "CONTEXT.md": "# Vocabulary\n",
    "docs/architecture.md": "# Architecture\n",
    "docs/adr/0000-template.md": "# ADR template\n",
  });
  return repo;
}

// The conforming repository with the mutation under test committed on a branch off `main`.
export function onBranch(mutate: (repo: FixtureRepo) => void): FixtureRepo {
  const repo = conformingRepo();
  repo.branch("feature");
  mutate(repo);
  return repo;
}
