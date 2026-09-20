import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FakeGitHub, payload } from "./harness";

const SCRIPT = "ticket-link-check.mjs";
const ENV = { FAMILY_LABEL_PREFIX: "skill/" };

let github: FakeGitHub;
beforeEach(() => {
  github = new FakeGitHub();
});
afterEach(() => github.close());

describe("ticket-link check", () => {
  test("a body closing an issue that carries a family label passes", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket", "ready-for-agent"] });
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12\n\n## Scope\n" }), ENV);
    expect(run).toMatchObject({ status: 0, stderr: "" });
    expect(run.stdout).toContain("#12");
  });

  test("a body without a closing keyword fails, saying what to add", async () => {
    const run = await github.run(SCRIPT, payload({ number: 40, body: "See #12 for context." }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^FAIL: /);
    expect(run.stderr).toMatch(/Closes #/);
  });

  test("an empty body fails the same way", async () => {
    const run = await github.run(SCRIPT, payload({ number: 40, body: null }), ENV);
    expect(run).toMatchObject({ status: 1 });
    expect(run.stderr).toMatch(/Closes #/);
  });

  test("a body naming an issue without a family label fails, naming the issue and the family", async () => {
    github.issue({ number: 12, labels: [{ name: "ready-for-agent" }] });
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Fixes #12" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("#12");
    expect(run.stderr).toContain("skill/");
  });

  test("a body naming an issue that does not exist fails", async () => {
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Resolves #999" }), ENV);
    expect(run).toMatchObject({ status: 1 });
    expect(run.stderr).toContain("#999");
  });

  test("a body naming a pull request instead of an issue fails", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket"], pull_request: { url: "…" } });
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV);
    expect(run).toMatchObject({ status: 1 });
    expect(run.stderr).toMatch(/pull request/i);
  });

  test("every closing keyword GitHub accepts is read, with or without a colon", async () => {
    github.issue({ number: 7, labels: ["skill/x"] });
    for (const body of ["close #7", "Closed: #7", "fix #7", "Fixed #7", "resolve #7", "RESOLVED #7"]) {
      expect((await github.run(SCRIPT, payload({ number: 1, body }), ENV)).status, body).toBe(0);
    }
  });

  test("labels are read from the issue as GitHub returns them, objects or strings", async () => {
    github.issue({ number: 12, labels: [{ name: "skill/land-ticket" }] });
    expect((await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV)).status).toBe(0);
  });

  test("a keyword inside a word, or a reference without a keyword, is not a closing keyword", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket"] });
    for (const body of ["prefixes #12", "Unfixes #12", "#12", "Closes 12"]) {
      expect((await github.run(SCRIPT, payload({ number: 40, body }), ENV)).status, body).toBe(1);
    }
  });

  test("two closing keywords are both checked", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket"] }).issue({ number: 13, labels: ["bug"] });
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12\nCloses #13" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("#13");
    expect(run.stderr).not.toContain("#12 ");
  });
});

describe("unknown input stays a failure", () => {
  test("an unsubstituted family prefix fails with an error, not a pass", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket"] });
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), { FAMILY_LABEL_PREFIX: "{{FAMILY_PREFIX}}/" });
    expect(run.status).toBe(2);
    expect(run.stderr).toMatch(/FAMILY_LABEL_PREFIX/);
  });

  test("a missing family prefix fails with an error", async () => {
    github.issue({ number: 12, labels: ["skill/land-ticket"] });
    expect((await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), {})).status).toBe(2);
  });

  test("a payload without a pull request fails with an error", async () => {
    const run = await github.run(SCRIPT, { repository: { full_name: "acme/widgets" } }, ENV);
    expect(run.status).toBe(2);
    expect(run.stderr).toMatch(/pull_request/);
  });

  test("an API that cannot be reached fails with an error", async () => {
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), { ...ENV, GITHUB_API_URL: "http://127.0.0.1:1" });
    expect(run.status).toBe(2);
  });
});
