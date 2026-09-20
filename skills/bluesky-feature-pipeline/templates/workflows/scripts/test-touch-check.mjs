#!/usr/bin/env node
// Test-touch check: a PR that changes a source file also changes a test file, or says why
// not. A heuristic, not proof — it catches the `tdd` loop being skipped, not a weak test.
//
// Reads (all set by the workflow or by Actions itself):
//   GITHUB_EVENT_PATH   the pull_request event payload
//   GITHUB_API_URL      the API root (Actions sets it; tests point it elsewhere)
//   GITHUB_TOKEN        a token that can read pull requests
//   SOURCE_GLOBS        comma-separated globs naming source files, written by the install script
//   TEST_GLOBS          comma-separated globs naming test files, written by the install script
//
// Globs: `**` spans directories, `*` and `?` stay within one path segment, and a glob
// with no `/` matches a file name at any depth. A waiver is the label `no-tests-needed`
// or a body line `No tests needed: <why>`.
//
// Exit 0 on pass, 1 with a FAIL line on a broken rule, 2 with an ERROR line when the
// input is not something the check can judge — an unknown never passes.

import { readFileSync } from "node:fs";

const fail = (message) => {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exit(1);
};
const error = (message) => {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(2);
};

function globs(name) {
  const value = process.env[name] ?? "";
  if (value.trim() === "" || /\{\{|\}\}/.test(value)) {
    error(`${name} is ${JSON.stringify(value)}; the install script writes this repository's globs here`);
  }
  return value.split(",").map((g) => g.trim()).filter(Boolean).map(toRegExp);
}

function toRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*" && glob[i + 1] === "*") {
      // `**/` is zero or more whole segments; a trailing or bare `**` is anything.
      const slash = glob[i + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (ch === "*") source += "[^/]*";
    else if (ch === "?") source += "[^/]";
    else source += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(glob.includes("/") ? `^${source}$` : `(?:^|/)${source}$`);
}

const sourceGlobs = globs("SOURCE_GLOBS");
const testGlobs = globs("TEST_GLOBS");

let event;
try {
  event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
} catch (cause) {
  error(`cannot read the event payload at GITHUB_EVENT_PATH: ${cause.message}`);
}
const pr = event.pull_request;
const repo = event.repository?.full_name;
if (!pr || typeof pr.number !== "number" || !repo) error("the payload has no pull_request and repository; run this on pull_request events");

const api = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
// The files endpoint is paged; a PR past one page is exactly the one most likely to hide
// a source change behind its docs, so every page is read.
async function changedFiles() {
  const files = [];
  for (let page = 1; ; page++) {
    let response;
    try {
      response = await fetch(`${api}/repos/${repo}/pulls/${pr.number}/files?per_page=100&page=${page}`, {
        headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}` },
      });
    } catch (cause) {
      error(`cannot reach ${api}: ${cause.message}`);
    }
    if (!response.ok) error(`GET pulls/${pr.number}/files answered ${response.status}`);
    const batch = await response.json();
    files.push(...batch.map((f) => f.filename));
    if (batch.length < 100) return files;
  }
}

const files = await changedFiles();
const sources = files.filter((f) => sourceGlobs.some((g) => g.test(f)));
const tests = files.filter((f) => testGlobs.some((g) => g.test(f)));

if (sources.length === 0) {
  process.stdout.write("test touch ok: no source file changed\n");
} else if (tests.length > 0) {
  process.stdout.write(`test touch ok: ${sources.length} source file(s) and ${tests.length} test file(s) changed\n`);
} else {
  const body = pr.body ?? "";
  const labels = (pr.labels ?? []).map((l) => (typeof l === "string" ? l : l.name ?? ""));
  const waiverLine = /^\s*no tests needed:(.*)$/im.exec(body);
  if (labels.includes("no-tests-needed")) {
    process.stdout.write("test touch waived: label no-tests-needed\n");
  } else if (waiverLine && waiverLine[1].trim() !== "") {
    process.stdout.write(`test touch waived: ${waiverLine[0].trim()}\n`);
  } else {
    fail(
      `source changed with no test change:\n      ${sources.join("\n      ")}\n` +
        `      Add the test, or say why none is needed: a body line 'No tests needed: <reason>'` +
        (waiverLine ? " (the line is there but its reason is empty)" : "") +
        ` or the label no-tests-needed.`,
    );
  }
}
