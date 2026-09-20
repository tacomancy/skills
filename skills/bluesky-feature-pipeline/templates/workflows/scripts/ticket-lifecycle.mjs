#!/usr/bin/env node
// Moves a ticket's lifecycle label as its PR moves: `ticket:in-review` when the PR
// opens, `ticket:landed` when it merges, plus a comment on the ticket's parent beat at
// merge. Labels only — this script never closes or reopens an issue and never touches
// a `spec:` label; issue state belongs to the landing session.
//
// Runs where Actions puts it: the event in GITHUB_EVENT_PATH, the repository in
// GITHUB_REPOSITORY, a token in GITHUB_TOKEN, the API at GITHUB_API_URL. Node only.

import { readFileSync } from "node:fs";

const IN_REVIEW = "ticket:in-review";
const LANDED = "ticket:landed";
// The one PR-body line the pipeline's PR template asks for.
const CLOSING_KEYWORD = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)\b/i;
// The first issue reference inside the ticket's `## Parent` section, as `#12` or a URL.
const ISSUE_REF = /(?:#|\/issues\/)(\d+)\b/;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function ticketNumber(prBody) {
  const match = CLOSING_KEYWORD.exec(prBody || "");
  return match ? Number(match[1]) : null;
}

// The `## Parent` section is the one place a ticket names its beat; nothing else in the
// body is read, so a `Spec:` line or a `## Blocked by` reference cannot stand in for it.
function parentNumber(ticketBody) {
  const section = /^## Parent[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(ticketBody || "");
  const match = section && ISSUE_REF.exec(section[1]);
  return match ? Number(match[1]) : null;
}

async function main() {
  const event = JSON.parse(readFileSync(env("GITHUB_EVENT_PATH"), "utf8"));
  const pr = event.pull_request;
  const target = event.action === "opened" ? IN_REVIEW : event.action === "closed" && pr.merged ? LANDED : null;
  if (!target) {
    console.log(`nothing to move for action "${event.action}"`);
    return;
  }
  const ticket = ticketNumber(pr.body);
  if (ticket === null) {
    console.log("no closing keyword names a ticket; nothing to move");
    return;
  }
  const api = tracker(env("GITHUB_API_URL"), env("GITHUB_REPOSITORY"), env("GITHUB_TOKEN"));
  // The current labels decide each write, so a rerun or a ticket claimed some other way
  // neither duplicates a label nor fails removing one that is not there. A ticket holds
  // one lifecycle label at a time; `ticket:blocked` is a side state and stays.
  const previous = target === LANDED ? IN_REVIEW : LANDED;
  const labels = (await api.list(`issues/${ticket}/labels`)).map((label) => label.name);
  if (labels.includes(previous)) await api.delete(`issues/${ticket}/labels/${encodeURIComponent(previous)}`);
  if (!labels.includes(target)) await api.post(`issues/${ticket}/labels`, { labels: [target] });
  console.log(`ticket #${ticket}: ${target}`);
  if (target !== LANDED) return;

  const parent = parentNumber((await api.get(`issues/${ticket}`)).body);
  if (parent === null) {
    console.log(`ticket #${ticket} names no parent; nothing to comment on`);
    return;
  }
  await api.post(`issues/${parent}/comments`, { body: `Ticket #${ticket} landed in #${pr.number}.` });
  console.log(`beat #${parent}: commented`);
}

function tracker(base, repo, token) {
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" };
  async function call(method, path, body) {
    const response = await fetch(`${base}/repos/${repo}/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
    return response;
  }
  // Follows `Link: <…>; rel="next"` to the end, so a ticket with more labels than one
  // page holds is read whole.
  async function list(path) {
    const items = [];
    let url = `${base}/repos/${repo}/${path}`;
    while (url) {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`GET ${url} → ${response.status} ${await response.text()}`);
      items.push(...(await response.json()));
      const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") || "");
      url = next ? next[1] : null;
    }
    return items;
  }
  return {
    get: async (path) => (await call("GET", path)).json(),
    list,
    post: (path, body) => call("POST", path, body),
    delete: (path) => call("DELETE", path),
  };
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
