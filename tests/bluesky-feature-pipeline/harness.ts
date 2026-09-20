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

// ---------------------------------------------------------------------------
// The lifecycle-label mover: driven as Actions drives it — an event payload on
// disk, the repository and token in the environment, the tracker at GITHUB_API_URL.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { AddressInfo } from "node:net";

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
