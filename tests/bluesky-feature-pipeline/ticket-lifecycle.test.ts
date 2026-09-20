import { afterEach, describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import { prEvent, readRaw, Tracker } from "./harness";

let tracker: Tracker;

// Whatever the event, the mover's writes are labels and comments. Issue state — closing,
// reopening — and the `spec:` labels belong to sessions, so no run may reach them.
afterEach(() => {
  for (const call of tracker.calls) {
    expect(["POST", "DELETE"], `${call.method} ${call.path}`).toContain(call.method);
    expect(call.path, `${call.method} ${call.path}`).toMatch(/\/(labels|comments)(\/|$)/);
    expect(JSON.stringify(call.body ?? "") + call.path, `${call.method} ${call.path}`).not.toMatch(/spec:/);
  }
  tracker.stop();
});

describe("PR opened", () => {
  test("moves the ticket named by the closing keyword to ticket:in-review, and nothing more", async () => {
    tracker = await new Tracker({ 12: { body: "## Parent\n\n#3\n", labels: ["skill/foo", "ready-for-agent"] } }).start();
    const run = await tracker.run(prEvent("opened", { body: "Closes #12\n\n## Code review\n\nNone." }));
    expect(run).toMatchObject({ status: 0 });
    expect(tracker.labelsAdded(12)).toEqual(["ticket:in-review"]);
    expect(tracker.calls.map((c) => [c.method, c.path])).toEqual([["POST", "/repos/acme/widgets/issues/12/labels"]]);
  });
});

describe("PR merged", () => {
  const ticketBody = "## Parent\n\n#3\n\n## What to build\n\nA thing.\n\n## Acceptance criteria\n\n- [ ] Done\n\n## Blocked by\n\n- #11\n";

  test("moves the ticket to ticket:landed and comments on the beat its ## Parent names", async () => {
    tracker = await new Tracker({
      3: { body: "spec body", labels: ["spec", "skill/foo", "spec:tickets-generated"] },
      12: { body: ticketBody, labels: ["skill/foo", "ticket:in-review"] },
    }).start();
    const run = await tracker.run(prEvent("closed", { merged: true, number: 41, body: "Closes #12" }));
    expect(run).toMatchObject({ status: 0 });
    expect(tracker.labelsRemoved(12)).toEqual(["ticket:in-review"]);
    expect(tracker.labelsAdded(12)).toEqual(["ticket:landed"]);
    expect(tracker.comments(3)).toEqual([expect.stringMatching(/#12.*#41/)]);
  });
});

describe("PR merged — the ticket's labels", () => {
  const ticketBody = "## Parent\n\n#3\n";

  test("a ticket that never carried ticket:in-review still lands, with nothing removed", async () => {
    tracker = await new Tracker({ 3: {}, 12: { body: ticketBody, labels: ["skill/foo"] } }).start();
    expect(await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.labelsRemoved(12)).toEqual([]);
    expect(tracker.labelsAdded(12)).toEqual(["ticket:landed"]);
  });

  test("ticket:in-review beyond the first page of labels is still removed", async () => {
    const labels = ["skill/foo", "ready-for-agent", "area/docs", "area/tests", "ticket:in-review"];
    expect(labels.length).toBeGreaterThan(Tracker.PAGE_SIZE * 2);
    tracker = await new Tracker({ 3: {}, 12: { body: ticketBody, labels } }).start();
    expect(await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.labelsRemoved(12)).toEqual(["ticket:in-review"]);
  });

  test("ticket:blocked is a side state the mover leaves alone", async () => {
    tracker = await new Tracker({ 3: {}, 12: { body: ticketBody, labels: ["ticket:blocked", "ticket:in-review"] } }).start();
    expect(await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.labelsRemoved(12)).toEqual(["ticket:in-review"]);
  });
});

describe("PR merged — the parent", () => {
  test("a ticket with no ## Parent moves its label and does nothing more", async () => {
    tracker = await new Tracker({ 12: { body: "## What to build\n\nA thing.\n\nSpec: #9\n", labels: ["ticket:in-review"] } }).start();
    const run = await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }));
    expect(run).toMatchObject({ status: 0 });
    expect(tracker.labelsAdded(12)).toEqual(["ticket:landed"]);
    expect(tracker.calls.filter((c) => c.path.endsWith("/comments"))).toEqual([]);
  });

  test("the parent is the number in ## Parent, not a Spec: line or a Blocked by reference", async () => {
    const body = "Spec: #9\n\n## Parent\n\nBeat #3, see #30 for context.\n\n## Blocked by\n\n- #11\n";
    tracker = await new Tracker({ 3: {}, 9: {}, 11: {}, 30: {}, 12: { body, labels: [] } }).start();
    expect(await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.calls.filter((c) => c.path.endsWith("/comments")).map((c) => c.path)).toEqual(["/repos/acme/widgets/issues/3/comments"]);
  });

  test("a parent named by URL is matched by its number", async () => {
    const body = "## Parent\n\nhttps://github.com/acme/widgets/issues/3\n";
    tracker = await new Tracker({ 3: {}, 12: { body, labels: [] } }).start();
    expect(await tracker.run(prEvent("closed", { merged: true, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.comments(3)).toHaveLength(1);
  });
});

describe("nothing to move", () => {
  test("a PR closed without merging touches nothing", async () => {
    tracker = await new Tracker({ 12: { body: "## Parent\n\n#3\n", labels: ["ticket:in-review"] } }).start();
    expect(await tracker.run(prEvent("closed", { merged: false, body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.calls).toEqual([]);
  });

  // The ticket-link check is the one that fails such a PR; the mover has no ticket to move.
  test("a PR body with no closing keyword touches nothing and says so", async () => {
    tracker = await new Tracker({ 12: {} }).start();
    const run = await tracker.run(prEvent("opened", { body: "See #12 for context." }));
    expect(run).toMatchObject({ status: 0 });
    expect(run.output).toMatch(/closing keyword/);
    expect(tracker.calls).toEqual([]);
  });
});

describe("failure", () => {
  test("a tracker error is a failure, naming the call", async () => {
    tracker = await new Tracker({}).start();
    const run = await tracker.run(prEvent("opened", { body: "Closes #12" }));
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/issues\/12\/labels.*404/);
  });

  test("a missing token is a failure, not an unauthenticated call", async () => {
    tracker = await new Tracker({ 12: {} }).start();
    const run = await tracker.run(prEvent("opened", { body: "Closes #12" }), { GITHUB_TOKEN: undefined });
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/GITHUB_TOKEN/);
    expect(tracker.calls).toEqual([]);
  });
});

describe("the workflow file", () => {
  // The YAML is a shell: it picks the events, grants the label permission, and runs the script.
  test("only invokes the script, on PR open and close", () => {
    const workflow = parseYaml(readRaw("workflows/ticket-lifecycle-labels.yml")) as Record<string, any>;
    expect(workflow.on.pull_request.types).toEqual(["opened", "closed"]);
    expect(workflow.permissions).toEqual({ issues: "write", "pull-requests": "read", contents: "read" });
    const jobs = Object.values(workflow.jobs) as Array<{ steps: Array<Record<string, unknown>> }>;
    expect(jobs).toHaveLength(1);
    const steps = jobs[0].steps;
    expect(steps.map((step) => step.uses ?? step.run)).toEqual([expect.stringMatching(/^actions\/checkout@/), "node .github/workflows/scripts/ticket-lifecycle.mjs"]);
    expect(steps[1].env).toEqual({ GITHUB_TOKEN: "${{ github.token }}" });
  });
});

describe("PR opened — a ticket that already landed", () => {
  // A follow-up PR against a landed ticket puts it back in review; one lifecycle label at a time.
  test("ticket:landed gives way to ticket:in-review", async () => {
    tracker = await new Tracker({ 12: { body: "## Parent\n\n#3\n", labels: ["skill/foo", "ticket:landed"] } }).start();
    expect(await tracker.run(prEvent("opened", { body: "Closes #12" }))).toMatchObject({ status: 0 });
    expect(tracker.labelsRemoved(12)).toEqual(["ticket:landed"]);
    expect(tracker.labelsAdded(12)).toEqual(["ticket:in-review"]);
  });
});
