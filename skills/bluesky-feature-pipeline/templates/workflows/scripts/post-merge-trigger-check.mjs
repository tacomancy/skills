#!/usr/bin/env node
// Post-merge-trigger check: the guidance file's post-merge section names changes that
// oblige an issue elsewhere — a public page to update, a document to amend. Each is a
// trigger: a name for what it obliges and the path globs that fire it. A PR whose changed
// files fire a trigger links the issue it opened for it, on a body line naming the trigger
// — or states `none` on that line — or this check fails naming the trigger. The landing
// session then has nothing to remember.
//
// Reads (all set by the workflow or by Actions itself):
//   GITHUB_EVENT_PATH     the pull_request event payload
//   GITHUB_API_URL        the API root (Actions sets it; tests point it elsewhere)
//   GITHUB_TOKEN          a token that can read pull requests
//   POST_MERGE_TRIGGERS   `<name>: <glob>, <glob>; <name>: <glob>` — one trigger per `;`,
//                         written by the install script; empty when the section names none
//
// Globs: `**` spans directories, `*` and `?` stay within one path segment, and a glob
// with no `/` matches a file name at any depth. A link is a body line that leads with the
// trigger's name (case-insensitive, after any list marker) and carries an issue reference:
// `#N`, `owner/repo#N`, or an issue URL. The same line with `none` in place of the
// reference passes too: the change fired the path but not the condition — a glob may be
// wider than what it stands for, and `none` is the filer stating that this change is
// outside it. Anything beyond the bare word is not the none form.
//
// Exit 0 on pass, 1 with a FAIL line on a broken rule, 2 with an ERROR line when the
// input is not something the check can judge — an unknown never passes.

import { readFileSync } from "node:fs";

// The exit code is set and the process left to drain stdio rather than exited mid-write,
// so the line reaches the log wherever stdout is an asynchronous pipe.
const quit = (code, line) => {
  process.stderr.write(`${line}\n`);
  process.exitCode = code;
  throw new Quit();
};
class Quit extends Error {}
const fail = (message) => quit(1, `FAIL: ${message}`);
const error = (message) => quit(2, `ERROR: ${message}`);
const crash = (cause) => {
  if (cause instanceof Quit) return;
  process.stderr.write(`ERROR: unexpected: ${cause?.stack ?? cause}\n`);
  process.exitCode = 2;
};
process.on("uncaughtException", crash);
process.on("unhandledRejection", crash);

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

// The parameter is a string because the workflow sets it as env; a malformed trigger is
// an install fault and must not read as "no trigger".
function triggers() {
  const value = process.env.POST_MERGE_TRIGGERS;
  if (value === undefined || /\{\{|\}\}/.test(value)) {
    error(`POST_MERGE_TRIGGERS is ${JSON.stringify(value)}; the install script writes the guidance file's post-merge triggers here`);
  }
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colon = entry.indexOf(":");
      const name = colon === -1 ? "" : entry.slice(0, colon).trim();
      const globs = colon === -1 ? [] : entry.slice(colon + 1).split(",").map((g) => g.trim()).filter(Boolean);
      if (name === "" || globs.length === 0) error(`POST_MERGE_TRIGGERS entry ${JSON.stringify(entry)} is not '<name>: <glob>, <glob>'`);
      return { name, globs: globs.map(toRegExp) };
    });
}

const configured = triggers();

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
// The files endpoint is paged; the one file that fires a trigger can sit on any page.
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
    const batch = await response.json().catch((cause) => error(`GET pulls/${pr.number}/files did not answer JSON: ${cause.message}`));
    if (!Array.isArray(batch)) error(`GET pulls/${pr.number}/files did not answer a list of files`);
    files.push(...batch.map((f) => f.filename));
    if (batch.length < 100) return files;
  }
}

async function check() {
  const files = await changedFiles();
  // A link line leads with the trigger's name, after any list marker, and carries an issue
  // reference; a name met mid-sentence beside some other reference is not a link.
  const lines = (pr.body ?? "").split("\n").map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)?\s*/, "").trim());
  const issueReference = /(?:^|[^\w/])(?:[\w.-]+\/[\w.-]+)?#\d+\b|\/issues\/\d+\b/;
  // The none form is the bare word after the name and its separator; a trailing full stop
  // is prose, `none yet` or `nonesuch` is not.
  const noneForm = /^[\s:—–-]*none\.?$/i;
  const lineWhere = (name, accepts) =>
    lines.find((line) => line.toLowerCase().startsWith(name.toLowerCase()) && accepts(line.slice(name.length)));

  const problems = [];
  const answered = [];
  for (const trigger of configured) {
    const fired = files.filter((f) => trigger.globs.some((g) => g.test(f)));
    if (fired.length === 0) continue;
    const link = lineWhere(trigger.name, (rest) => issueReference.test(rest));
    const none = link ? undefined : lineWhere(trigger.name, (rest) => noneForm.test(rest));
    if (link) answered.push(`${trigger.name} — ${link}`);
    else if (none) answered.push(`${trigger.name} — none: the change is outside the condition, per '${none}'`);
    else {
      problems.push(
        `'${trigger.name}' fires on:\n        ${fired.join("\n        ")}\n` +
          `      Open the issue it obliges and add a body line '${trigger.name}: <owner/repo>#<issue>',\n` +
          `      or state that this change is outside the condition with '${trigger.name}: none'.`,
      );
    }
  }
  if (problems.length > 0) fail(`post-merge trigger without a linked issue or a none line\n      ${problems.join("\n      ")}`);
  process.stdout.write(answered.length === 0 ? "post-merge triggers ok: none fired\n" : `post-merge triggers ok, answered:\n  ${answered.join("\n  ")}\n`);
}

if (configured.length === 0) {
  process.stdout.write("no post-merge trigger is configured; nothing to check\n");
} else {
  await check();
}
