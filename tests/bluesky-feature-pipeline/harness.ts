import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export const TEMPLATES = fileURLToPath(new URL("../../skills/bluesky-feature-pipeline/templates/", import.meta.url));

// The token the install script replaces with the adopter's family-label prefix.
export const PLACEHOLDER = "{{FAMILY_PREFIX}}";

// Every token the install script substitutes, and the files each may appear in. A token
// is `{{NAME}}`; an Actions expression `${{ … }}` is not one and stays as written.
export const PLACEHOLDERS: Record<string, RegExp> = {
  "{{FAMILY_PREFIX}}": /./,
  "{{SOURCE_GLOBS}}": /^workflows\//,
  "{{TEST_GLOBS}}": /^workflows\//,
  "{{POST_MERGE_TRIGGERS}}": /^workflows\//,
};

export function tokensIn(text: string): string[] {
  return text.match(/(?<!\$)\{\{[^}]*\}\}/g) ?? [];
}

export type Template = { frontmatter: Record<string, unknown>; body: string; headings: string[] };

// Reads a template the way GitHub does: a YAML front-matter block, then the body that
// becomes the issue or PR text. `headings` are the body's `##` lines, which is the shape
// the workflows and the landing gate read.
export function readTemplate(path: string): Template {
  const text = readFileSync(join(TEMPLATES, path), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${path} has no front-matter block`);
  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  const body = match[2];
  const headings = body.split("\n").filter((line) => /^## /.test(line));
  return { frontmatter, body, headings };
}

export function readRaw(path: string): string {
  return readFileSync(join(TEMPLATES, path), "utf8");
}

// Every file under templates/, as relative paths, so a test can sweep them all.
export function allTemplateFiles(dir = TEMPLATES): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? allTemplateFiles(path) : [relative(TEMPLATES, path)];
  });
}

// ---------------------------------------------------------------------------------------
// Workflow scripts. Each check is a single-file Node script under templates/workflows/
// scripts/, run the way its workflow runs it: the event payload at GITHUB_EVENT_PATH, the
// API at GITHUB_API_URL, its parameters in env. The tests serve the API themselves so a
// script is driven only through what it reads and what it prints.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";

export const SCRIPTS = join(TEMPLATES, "workflows", "scripts");

export type Label = string | { name: string };
export type PullRequest = { number: number; body?: string | null; labels?: Label[] };
export type Issue = { number: number; labels?: Label[]; pull_request?: object };

// The event payload a `pull_request` workflow receives, reduced to what the checks read.
export function payload(pr: PullRequest, repo = "acme/widgets"): object {
  return { pull_request: { number: pr.number, body: pr.body ?? null, labels: pr.labels ?? [] }, repository: { full_name: repo } };
}

export type CheckRun = { status: number | null; stdout: string; stderr: string; output: string };

// A stand-in for api.github.com holding the issues and PR files a test declares. Files
// are served a page at a time from `per_page`, so a script that reads one page sees only
// the first `per_page` of them.
export class FakeGitHub {
  private server: Server;
  readonly url: Promise<string>;
  readonly requests: string[] = [];
  private issues = new Map<number, Issue>();
  private files = new Map<number, string[]>();
  // When set, every answer is this text with status 200 — a proxy page, not the API.
  garbage: string | undefined;

  constructor() {
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://fake");
      this.requests.push(url.pathname + url.search);
      if (this.garbage !== undefined) return void res.writeHead(200, { "content-type": "text/html" }).end(this.garbage);
      const issue = /^\/repos\/[^/]+\/[^/]+\/issues\/(\d+)$/.exec(url.pathname);
      const files = /^\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)\/files$/.exec(url.pathname);
      if (issue) return respond(res, this.issues.get(Number(issue[1])));
      if (files) {
        const all = this.files.get(Number(files[1]));
        if (!all) return respond(res, undefined);
        const perPage = Number(url.searchParams.get("per_page") ?? 30);
        const page = Number(url.searchParams.get("page") ?? 1);
        return respond(res, all.slice((page - 1) * perPage, page * perPage).map((filename) => ({ filename, status: "modified" })));
      }
      respond(res, undefined);
    });
    this.url = new Promise((resolve) => {
      this.server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(this.server.address() as AddressInfo).port}`));
    });
  }

  issue(issue: Issue): this {
    this.issues.set(issue.number, issue);
    return this;
  }

  pullFiles(number: number, filenames: string[]): this {
    this.files.set(number, filenames);
    return this;
  }

  close(): void {
    this.server.close();
  }

  // Runs a script against this API with the payload written to a temp file. `env` is the
  // parameter block the workflow YAML sets; nothing else of the process env leaks in but PATH.
  async run(script: string, event: object, env: Record<string, string> = {}): Promise<CheckRun> {
    const dir = mkdtempSync(join(tmpdir(), "bluesky-check-"));
    const eventPath = join(dir, "event.json");
    writeFileSync(eventPath, JSON.stringify(event));
    return runScript(script, { PATH: process.env.PATH ?? "", GITHUB_EVENT_PATH: eventPath, GITHUB_API_URL: await this.url, GITHUB_TOKEN: "fixture-token", ...env });
  }
}

function respond(res: import("node:http").ServerResponse, body: unknown): void {
  if (body === undefined) {
    res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ message: "Not Found" }));
  } else {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
  }
}

export function runScript(script: string, env: Record<string, string>): Promise<CheckRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(SCRIPTS, script)], { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr, output: stdout + stderr }));
  });
}

// ---------------------------------------------------------------------------------------
// The lifecycle-label mover: the same drive as the checks above, with a tracker that
// pages its lists and records every write, since the mover's assertions are its calls.

const LIFECYCLE = join(TEMPLATES, "workflows/scripts/ticket-lifecycle.mjs");
const REPO = "acme/widgets";

export type TrackerIssue = { body?: string; labels?: string[]; state?: "open" | "closed" };
export type TrackerCall = { method: string; path: string; body: unknown };
export type MoverRun = { status: number; output: string };

// A fake tracker: serves the issues it is given, pages every list at PAGE_SIZE so a
// script that stops at page one is caught, and records every request it receives.
// Writes are recorded, acknowledged, and never applied — the tests assert on the calls.
export class Tracker {
  static readonly PAGE_SIZE = 2;
  readonly calls: TrackerCall[] = [];
  private server!: Server;
  private url = "";

  constructor(readonly issues: Record<number, TrackerIssue>) {}

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const url = new URL(req.url ?? "/", "http://stub");
        const body = raw ? JSON.parse(raw) : undefined;
        const method = req.method ?? "GET";
        if (method !== "GET") this.calls.push({ method, path: url.pathname, body });
        const reply = (status: number, payload: unknown, headers: Record<string, string> = {}) => {
          res.writeHead(status, { "content-type": "application/json", ...headers });
          res.end(JSON.stringify(payload));
        };
        const prefix = `/repos/${REPO}/issues/`;
        if (!url.pathname.startsWith(prefix)) return reply(404, { message: "Not Found" });
        const [num, sub] = url.pathname.slice(prefix.length).split("/");
        const issue = this.issues[Number(num)];
        if (!issue) return reply(404, { message: "Not Found" });
        if (method === "GET" && sub === undefined) {
          return reply(200, { number: Number(num), body: issue.body ?? "", state: issue.state ?? "open", labels: (issue.labels ?? []).map((name) => ({ name })) });
        }
        if (method === "GET" && sub === "labels") {
          const page = Number(url.searchParams.get("page") ?? "1");
          const all = (issue.labels ?? []).map((name) => ({ name }));
          const slice = all.slice((page - 1) * Tracker.PAGE_SIZE, page * Tracker.PAGE_SIZE);
          const next: Record<string, string> = page * Tracker.PAGE_SIZE < all.length ? { link: `<${this.url}${url.pathname}?page=${page + 1}>; rel="next"` } : {};
          return reply(200, slice, next);
        }
        if (method === "POST" && sub === "labels") return reply(200, []);
        if (method === "DELETE" && sub === "labels") return reply(200, []);
        if (method === "POST" && sub === "comments") return reply(201, { id: 1 });
        if (method === "PATCH" && sub === undefined) return reply(200, {});
        return reply(404, { message: "Not Found" });
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  stop(): void {
    this.server.close();
  }

  // Runs the script against this tracker with the payload written where Actions puts it.
  // Asynchronous because the stub answers from this same event loop.
  run(event: unknown, env: Record<string, string | undefined> = {}): Promise<MoverRun> {
    const dir = mkdtempSync(join(tmpdir(), "ticket-lifecycle-"));
    const eventPath = join(dir, "event.json");
    writeFileSync(eventPath, JSON.stringify(event));
    const child = spawn(process.execPath, [LIFECYCLE], {
      env: { PATH: process.env.PATH, GITHUB_EVENT_PATH: eventPath, GITHUB_REPOSITORY: REPO, GITHUB_API_URL: this.url, GITHUB_TOKEN: "stub-token", ...env },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    return new Promise((resolve) => child.on("close", (status) => resolve({ status: status ?? -1, output })));
  }

  labelsAdded(issue: number): string[] {
    return this.calls
      .filter((c) => c.method === "POST" && c.path === `/repos/${REPO}/issues/${issue}/labels`)
      .flatMap((c) => (c.body as { labels: string[] }).labels);
  }

  labelsRemoved(issue: number): string[] {
    const prefix = `/repos/${REPO}/issues/${issue}/labels/`;
    return this.calls.filter((c) => c.method === "DELETE" && c.path.startsWith(prefix)).map((c) => decodeURIComponent(c.path.slice(prefix.length)));
  }

  comments(issue: number): string[] {
    return this.calls.filter((c) => c.method === "POST" && c.path === `/repos/${REPO}/issues/${issue}/comments`).map((c) => (c.body as { body: string }).body);
  }
}

// A pull_request event as Actions delivers it, with only the fields the mover reads.
export function prEvent(action: "opened" | "closed", opts: { body?: string; merged?: boolean; number?: number } = {}): unknown {
  return {
    action,
    pull_request: { number: opts.number ?? 41, body: opts.body ?? "", merged: opts.merged ?? false },
    repository: { full_name: REPO },
  };
}

// ---------------------------------------------------------------------------------------
// The install script: driven as an adopter drives it, from the root of a git repository
// with a tracker CLI on PATH. The CLI is a stub that records every call and keeps the
// labels it was told to create, so a test reads what the script asked of the tracker
// and a second run sees the labels the first one made.

import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync as readDir, statSync as stat, symlinkSync } from "node:fs";
import { dirname, relative as relPath } from "node:path";

const INSTALL = fileURLToPath(new URL("../../skills/bluesky-feature-pipeline/install.sh", import.meta.url));

export type InstallRun = { status: number; output: string };

// Every argument install.sh needs, in the form an adopter passes; a test overrides what it varies.
export const INSTALL_ARGS = [
  "--prefix", "skill",
  "--source-globs", "src/**, lib/**/*.ts",
  "--test-globs", "tests/**, **/*.test.ts",
  "--trigger", "the public site: skills/*/SKILL.md",
  "--trigger", "the invariants: CLAUDE.md",
];

const GH_STUB = `#!/usr/bin/env bash
# Records each call as one tab-separated line; answers \`label list\` with the labels
# \`label create\` has been given, one name per line as --jq '.[].name' prints them.
printf '%s\\n' "$(IFS=$'\\t'; printf '%s' "$*")" >>"$GH_STUB_LOG"
case "$1 $2" in
  "label list") [ -f "$GH_STUB_LABELS" ] && cat "$GH_STUB_LABELS" ;;
  "label create") printf '%s\\n' "$3" >>"$GH_STUB_LABELS" ;;
esac
exit 0
`;

export class AdoptingRepo {
  readonly dir: string;
  private readonly bin: string;
  private readonly log: string;
  private readonly labels: string;

  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), "bluesky-install-"));
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: this.dir });
    this.bin = join(mkdtempSync(join(tmpdir(), "bluesky-gh-")), "bin");
    mkdirSync(this.bin);
    writeFileSync(join(this.bin, "gh"), GH_STUB);
    chmodSync(join(this.bin, "gh"), 0o755);
    this.log = join(dirname(this.bin), "calls.log");
    this.labels = join(dirname(this.bin), "labels.txt");
  }

  // Runs install.sh from the repository root with the stub CLI first on PATH.
  install(...args: string[]): InstallRun {
    return this.run(`${this.bin}:${process.env.PATH ?? ""}`, args);
  }

  // The same with no `gh` anywhere on PATH, as a machine without the tracker CLI.
  installWithoutGh(...args: string[]): InstallRun {
    const noGh = join(dirname(this.bin), "no-gh");
    mkdirSync(noGh, { recursive: true });
    for (const tool of ["bash", "git", "sed", "find", "sort", "mkdir", "cp", "grep", "tr", "dirname", "mktemp", "rm"]) {
      const real = execFileSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).trim();
      if (!existsSync(join(noGh, tool))) symlinkSync(real, join(noGh, tool));
    }
    return this.run(noGh, args);
  }

  private run(path: string, args: string[]): InstallRun {
    const result = spawnSync("bash", [INSTALL, ...args], {
      cwd: this.dir,
      encoding: "utf8",
      env: { PATH: path, GH_STUB_LOG: this.log, GH_STUB_LABELS: this.labels },
    });
    return { status: result.status ?? -1, output: result.stdout + result.stderr };
  }

  // The stub's record, one argv per call, oldest first.
  ghCalls(): string[][] {
    if (!existsSync(this.log)) return [];
    return readFileSync(this.log, "utf8").split("\n").filter(Boolean).map((line) => line.split("\t"));
  }

  // Labels the tracker holds, as the stub sees them; seed it to play an adopter with labels already.
  seedLabels(names: string[]): void {
    writeFileSync(this.labels, names.map((n) => `${n}\n`).join(""));
  }

  write(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(this.dir, path)), { recursive: true });
      writeFileSync(join(this.dir, path), content);
    }
  }

  read(path: string): string {
    return readFileSync(join(this.dir, path), "utf8");
  }

  exists(path: string): boolean {
    return existsSync(join(this.dir, path));
  }

  // Every file in the repository outside .git with its content, so two runs can be compared whole.
  snapshot(): Record<string, string> {
    const files: Record<string, string> = {};
    const walk = (dir: string) => {
      for (const name of readDir(dir)) {
        if (name === ".git") continue;
        const path = join(dir, name);
        if (stat(path).isDirectory()) walk(path);
        else files[relPath(this.dir, path)] = readFileSync(path, "utf8");
      }
    };
    walk(this.dir);
    return files;
  }
}
