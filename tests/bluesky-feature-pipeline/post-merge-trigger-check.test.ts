import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FakeGitHub, payload } from "./harness";

const SCRIPT = "post-merge-trigger-check.mjs";
// Two triggers, as an install script writes them from a guidance file's post-merge section.
const ENV = { POST_MERGE_TRIGGERS: "the public site: skills/*/SKILL.md, skills/*/README.md; the invariants: CLAUDE.md" };

let github: FakeGitHub;
beforeEach(() => {
  github = new FakeGitHub();
});
afterEach(() => github.close());

describe("post-merge-trigger check", () => {
  test("a change matching no trigger passes", async () => {
    github.pullFiles(40, ["tests/foo.test.ts", "skills/foo/scripts/run.sh"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV);
    expect(run).toMatchObject({ status: 0, stderr: "" });
  });

  test("a change matching a trigger with no linked issue fails, naming the trigger and the files", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md", "tests/foo.test.ts"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^FAIL: /);
    expect(run.stderr).toContain("the public site");
    expect(run.stderr).toContain("skills/foo/SKILL.md");
    expect(run.stderr).not.toContain("the invariants");
  });

  test("a body line naming the trigger with an issue reference passes", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md"]);
    for (const line of [
      "The public site: tacomancy/tacomancy#31",
      "the public site — https://github.com/tacomancy/tacomancy/issues/31",
      "- the public site: #31",
    ]) {
      const run = await github.run(SCRIPT, payload({ number: 40, body: `Closes #12\n\n${line}\n` }), ENV);
      expect(run.status, line).toBe(0);
      expect(run.stdout, line).toContain("the public site");
    }
  });

  test("an issue reference on a line that does not name the trigger does not count", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12\n\nSee also tacomancy/tacomancy#31\n" }), ENV);
    expect(run.status).toBe(1);
  });

  test("the trigger's name inside another line's prose does not count; the name leads the line", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12 for the public site\n" }), ENV);
    expect(run.status).toBe(1);
  });

  test("the trigger's name without an issue reference does not count", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "the public site: nothing to do\n" }), ENV);
    expect(run.status).toBe(1);
  });

  test("each fired trigger is judged on its own", async () => {
    github.pullFiles(40, ["skills/foo/SKILL.md", "CLAUDE.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "the public site: tacomancy/tacomancy#31\n" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("the invariants");
    expect(run.stderr).toContain("CLAUDE.md");
    expect(run.stderr).not.toContain("the public site");
  });

  test("a firing file on the second page is seen", async () => {
    const docs = Array.from({ length: 100 }, (_, i) => `docs/page-${i}.md`);
    github.pullFiles(40, [...docs, "CLAUDE.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("the invariants");
  });

  test("no triggers configured passes, saying so", async () => {
    github.pullFiles(40, ["CLAUDE.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), { POST_MERGE_TRIGGERS: "" });
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/no post-merge trigger/i);
  });
});

describe("unknown input stays a failure", () => {
  test("an API answer that is not the API's fails with an error, not a stack trace", async () => {
    github.garbage = "<html>Service unavailable</html>";
    const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), ENV);
    expect(run.status).toBe(2);
    expect(run.stderr).toMatch(/^ERROR: /);
  });

  test("an unsubstituted trigger list fails with an error naming the parameter", async () => {
    github.pullFiles(40, ["README.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), { POST_MERGE_TRIGGERS: "{{POST_MERGE_TRIGGERS}}" });
    expect(run.status).toBe(2);
    expect(run.stderr).toMatch(/POST_MERGE_TRIGGERS/);
  });

  test("a missing trigger list fails with an error", async () => {
    github.pullFiles(40, ["README.md"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: "" }), {})).status).toBe(2);
  });

  test("a trigger without a name or without globs fails with an error", async () => {
    github.pullFiles(40, ["README.md"]);
    for (const value of ["skills/*/SKILL.md", "the site:", ": CLAUDE.md"]) {
      const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), { POST_MERGE_TRIGGERS: value });
      expect(run.status, value).toBe(2);
    }
  });

  test("a PR the API does not know fails with an error", async () => {
    expect((await github.run(SCRIPT, payload({ number: 41, body: "" }), ENV)).status).toBe(2);
  });
});
