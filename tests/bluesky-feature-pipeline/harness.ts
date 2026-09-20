import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export const TEMPLATES = fileURLToPath(new URL("../../skills/bluesky-feature-pipeline/templates/", import.meta.url));

// The token the install script replaces with the adopter's family-label prefix.
export const PLACEHOLDER = "{{FAMILY_PREFIX}}";

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

  constructor() {
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://fake");
      this.requests.push(url.pathname + url.search);
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
