import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REBRAND = fileURLToPath(new URL("../../skills/pin-prototypes/rebrand.mjs", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures", import.meta.url));

// `output` is stdout and stderr together, as a build log shows them.
export type Run = { status: number; output: string; lines: string[] };

// A throwaway directory holding exports and a mapping file, driven the way a build step
// drives the script: write files, run it from the directory root, look at what came out.
export class Fixture {
  readonly dir: string;

  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), "rebrand-"));
  }

  write(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(this.dir, path)), { recursive: true });
      writeFileSync(join(this.dir, path), content);
    }
  }

  // Copies a file kept beside the tests into the fixture directory.
  copy(fixtureFile: string, as = fixtureFile): void {
    this.write({ [as]: fixture(fixtureFile) });
  }

  // The mapping in the shape the script reads: colour keys under `colours`, plus any
  // other top-level field such as `hook`.
  mapping(colours: Record<string, string>, as = "mapping.json", rest: Record<string, unknown> = {}): void {
    this.write({ [as]: JSON.stringify({ colours, ...rest }, null, 2) + "\n" });
  }

  read(path: string): string {
    return readFileSync(join(this.dir, path), "utf8");
  }

  exists(path: string): boolean {
    return existsSync(join(this.dir, path));
  }

  // The files the run wrote, so a test can assert on "nothing" as well as on contents.
  outputs(dir = "out"): string[] {
    return existsSync(join(this.dir, dir)) ? readdirSync(join(this.dir, dir)).sort() : [];
  }

  // Runs the script with the default mapping and output directory over the given exports.
  rebrand(...files: string[]): Run {
    return this.rebrandWith(["--mapping", "mapping.json", "--out", "out", ...files]);
  }

  // Runs the script with exactly these arguments, for the cases where the flags are the point.
  rebrandWith(args: string[]): Run {
    const result = spawnSync(process.execPath, [REBRAND, ...args], { cwd: this.dir, encoding: "utf8" });
    const output = result.stdout + result.stderr;
    return { status: result.status ?? -1, output, lines: output.split("\n").filter((line) => line !== "") };
  }
}

export function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf8");
}
