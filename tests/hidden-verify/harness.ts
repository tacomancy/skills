import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const TEMPLATE = fileURLToPath(new URL("../../skills/hidden-verify/driver.mjs", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures", import.meta.url));

// `output` is stdout and stderr together, as the agent reads them in a terminal.
export type Run = { status: number; output: string; lines: string[] };

// The block at the top of the template that a run edits, as the driver documents it.
export type Edit = {
  port: number;
  urlPrefix: string;
  ready: string;
  timeoutMs: number;
  steps: Array<Record<string, string | string[]>>;
};

const BLOCK_START = "// ─── The run ───";
const BLOCK_END = "// ─── End of the run ───";

// A copy of the template in scratch with its top block rewritten — what an agent does
// before a run — and a `run` that executes the copy and reports what it printed.
export class Driver {
  readonly path: string;

  constructor(edit: Edit) {
    const dir = mkdtempSync(join(tmpdir(), "hidden-verify-"));
    this.path = join(dir, "driver.mjs");
    const template = readFileSync(TEMPLATE, "utf8");
    const start = template.indexOf(BLOCK_START);
    const end = template.indexOf(BLOCK_END);
    if (start < 0 || end < 0) throw new Error("driver.mjs has lost its editable block markers");
    const block = [
      BLOCK_START,
      `const PORT = ${edit.port};`,
      `const URL_PREFIX = ${JSON.stringify(edit.urlPrefix)};`,
      `const READY = ${JSON.stringify(edit.ready)};`,
      `const TIMEOUT_MS = ${edit.timeoutMs};`,
      `const STEPS = ${JSON.stringify(edit.steps, null, 2)};`,
      "",
    ].join("\n");
    writeFileSync(this.path, template.slice(0, start) + block + template.slice(end));
  }

  // Asynchronous so a test can act on the browser — close it — while the driver is running.
  run(): Promise<Run> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [this.path], { stdio: ["ignore", "pipe", "pipe"] });
      let output = "";
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
      child.on("error", reject);
      child.on("close", (status) => resolve({ status: status ?? -1, output, lines: output.split("\n").filter((line) => line !== "") }));
    });
  }
}

// Playwright's bundled Chromium launched the way an application under verification is:
// the binary itself, headless, with the debugging port open, on a fixture page.
export class Browser {
  private constructor(
    readonly port: number,
    private readonly process: ChildProcess,
  ) {}

  static async open(fixture: string): Promise<Browser> {
    const port = await freePort();
    const url = pathToFileURL(join(FIXTURES, fixture)).href;
    const userDataDir = mkdtempSync(join(tmpdir(), "hidden-verify-chromium-"));
    const child = spawn(
      chromium.executablePath(),
      ["--headless=new", "--no-sandbox", "--no-first-run", `--user-data-dir=${userDataDir}`, `--remote-debugging-port=${port}`, url],
      { stdio: "ignore" },
    );
    // A Chromium that is missing or not executable fails the test by name rather than as an
    // unhandled event; `playwright install chromium` is the fix.
    child.on("error", (error) => {
      throw new Error(`could not launch Chromium at ${chromium.executablePath()}: ${error.message}`);
    });
    return new Browser(port, child);
  }

  close(): void {
    this.process.kill();
  }
}

// A port nothing is listening on right now, taken from the OS rather than guessed.
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) return reject(new Error("no address"));
      server.close(() => resolve(address.port));
    });
  });
}
