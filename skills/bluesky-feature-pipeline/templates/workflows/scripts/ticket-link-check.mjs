#!/usr/bin/env node
// Ticket-link check: a PR names the one ticket it lands with a GitHub closing keyword,
// and that ticket carries a family label. Mark this check required in branch protection
// so nothing merges that is not traceable to its ticket.
//
// Reads (all set by the workflow or by Actions itself):
//   GITHUB_EVENT_PATH     the pull_request event payload
//   GITHUB_API_URL        the API root (Actions sets it; tests point it elsewhere)
//   GITHUB_TOKEN          a token that can read issues
//   FAMILY_LABEL_PREFIX   the family-label prefix with its slash, e.g. "skill/"
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

const prefix = process.env.FAMILY_LABEL_PREFIX ?? "";
if (prefix === "" || /\{\{|\}\}/.test(prefix)) {
  error(`FAMILY_LABEL_PREFIX is ${JSON.stringify(prefix)}; the install script writes the family prefix here`);
}

let event;
try {
  event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
} catch (cause) {
  error(`cannot read the event payload at GITHUB_EVENT_PATH: ${cause.message}`);
}
const pr = event.pull_request;
const repo = event.repository?.full_name;
if (!pr || typeof pr.number !== "number" || !repo) error("the payload has no pull_request and repository; run this on pull_request events");

// GitHub's closing keywords, with the optional colon it accepts. Only `#N` in this
// repository: a ticket lives beside the PR that lands it.
const body = pr.body ?? "";
const targets = [...new Set([...body.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)\b/gi)].map((m) => Number(m[1])))];
if (targets.length === 0) {
  fail("the PR body names no ticket. Add 'Closes #<ticket>' — every PR lands exactly one ticket.");
}

const api = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
async function getIssue(number) {
  let response;
  try {
    response = await fetch(`${api}/repos/${repo}/issues/${number}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}` },
    });
  } catch (cause) {
    error(`cannot reach ${api}: ${cause.message}`);
  }
  if (response.status === 404) return null;
  if (!response.ok) error(`GET issues/${number} answered ${response.status}`);
  const issue = await response.json().catch((cause) => error(`GET issues/${number} did not answer JSON: ${cause.message}`));
  if (typeof issue !== "object" || issue === null) error(`GET issues/${number} did not answer an issue`);
  return issue;
}

const problems = [];
for (const number of targets) {
  const issue = await getIssue(number);
  if (!issue) {
    problems.push(`#${number} does not exist in ${repo}`);
  } else if (issue.pull_request) {
    problems.push(`#${number} is a pull request, not a ticket`);
  } else if (!(issue.labels ?? []).some((label) => (typeof label === "string" ? label : label.name ?? "").startsWith(prefix))) {
    problems.push(`#${number} carries no ${prefix}<beat> label, so it is not a ticket of any beat; check the number`);
  }
}
if (problems.length > 0) fail(problems.join("\n      "));
process.stdout.write(`ticket link ok: ${targets.map((n) => `#${n}`).join(", ")} carries a ${prefix}<beat> label\n`);
