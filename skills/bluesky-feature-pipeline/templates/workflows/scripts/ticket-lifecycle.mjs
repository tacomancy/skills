#!/usr/bin/env node
// Moves a ticket's lifecycle label as its PR moves: `ticket:in-review` when the PR
// opens, lifting the tracker's unclaimed label with it, `ticket:landed` when it merges,
// plus a comment on the ticket's parent beat at merge. Labels only — this script never
// closes or reopens an issue and never touches a `spec:` label; issue state belongs to
// the landing session.
//
// Runs where Actions puts it: the event in GITHUB_EVENT_PATH, the repository in
// GITHUB_REPOSITORY, a token in GITHUB_TOKEN, the API at GITHUB_API_URL, and one
// parameter the install script writes into the workflow's env:
//   UNCLAIMED_LABEL   the ready label a ticket carries until a session claims it, lifted
//                     at PR open so a ticket in review never reads as grabbable; empty
//                     when the adopter's triage set has none. Node only.

import { readFileSync } from "node:fs";

const IN_REVIEW = "ticket:in-review";
const LANDED = "ticket:landed";
// The one PR-body line the pipeline's PR template asks for; every occurrence counts,
// as it does for GitHub and the ticket-link check.
const CLOSING_KEYWORD = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)\b/gi;
// The first issue reference inside the ticket's `## Parent` section, as `#12` or a URL.
const ISSUE_REF = /(?:#|\/issues\/)(\d+)\b/;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Empty is a value — an adopter with no ready label — where absent or unsubstituted is an
// install fault; the two must not collapse into "nothing to lift".
function unclaimedLabel() {
  const value = process.env.UNCLAIMED_LABEL;
  if (value === undefined || /\{\{|\}\}/.test(value)) {
    throw new Error(`UNCLAIMED_LABEL is ${JSON.stringify(value)}; the install script writes the tracker's ready label here, or empty for none`);
  }
  return value;
}

function ticketNumbers(prBody) {
  return [...new Set([...(prBody || "").matchAll(CLOSING_KEYWORD)].map((match) => Number(match[1])))];
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
  const unclaimed = unclaimedLabel();
  const pr = event.pull_request;
  const target = event.action === "opened" ? IN_REVIEW : event.action === "closed" && pr.merged ? LANDED : null;
  if (!target) {
    console.log(`nothing to move for action "${event.action}"`);
    return;
  }
  const tickets = ticketNumbers(pr.body);
  if (tickets.length === 0) {
    console.log("no closing keyword names a ticket; nothing to move");
    return;
  }
  const api = tracker(env("GITHUB_API_URL"), env("GITHUB_REPOSITORY"), env("GITHUB_TOKEN"));
  for (const ticket of tickets) await move(api, pr, ticket, target, unclaimed);
}

async function move(api, pr, ticket, target, unclaimed) {
  // The current labels decide each write, so a rerun or a ticket claimed some other way
  // neither duplicates a label nor fails removing one that is not there. A ticket holds
  // one lifecycle label at a time; `ticket:blocked` is a side state and stays. The PR
  // opening is the claim, so the unclaimed label goes with the move into review.
  const previous = target === LANDED ? IN_REVIEW : LANDED;
  const labels = (await api.list(`issues/${ticket}/labels`)).map((label) => label.name);
  const toLift = [previous, ...(target === IN_REVIEW && unclaimed ? [unclaimed] : [])];
  for (const label of toLift) {
    if (labels.includes(label)) await api.delete(`issues/${ticket}/labels/${encodeURIComponent(label)}`);
  }
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
