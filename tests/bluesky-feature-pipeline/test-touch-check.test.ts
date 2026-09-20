import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FakeGitHub, payload } from "./harness";

const SCRIPT = "test-touch-check.mjs";
const ENV = { SOURCE_GLOBS: "src/**, lib/**/*.ts", TEST_GLOBS: "tests/**, **/*.test.ts" };

let github: FakeGitHub;
beforeEach(() => {
  github = new FakeGitHub();
});
afterEach(() => github.close());

describe("test-touch check", () => {
  test("a source change with a test change passes", async () => {
    github.pullFiles(40, ["src/cart.ts", "tests/cart.test.ts"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV);
    expect(run).toMatchObject({ status: 0, stderr: "" });
  });

  test("a source change without a test change fails, naming the source files and the waivers", async () => {
    github.pullFiles(40, ["src/cart.ts", "README.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "Closes #12" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^FAIL: /);
    expect(run.stderr).toContain("src/cart.ts");
    expect(run.stderr).not.toContain("README.md");
    expect(run.stderr).toContain("no-tests-needed");
    expect(run.stderr).toContain("No tests needed:");
  });

  test("a change touching no source file passes", async () => {
    github.pullFiles(40, ["README.md", "docs/plan.md"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: "" }), ENV)).status).toBe(0);
  });

  test("a waiver line in the body with a reason passes", async () => {
    github.pullFiles(40, ["src/cart.ts"]);
    const body = "Closes #12\n\nNo tests needed: pure rename, behaviour covered by tests/cart.test.ts already.\n";
    expect((await github.run(SCRIPT, payload({ number: 40, body }), ENV)).status).toBe(0);
  });

  test("a waiver line without a reason does not waive", async () => {
    github.pullFiles(40, ["src/cart.ts"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "No tests needed:\n" }), ENV);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/reason/);
  });

  test("the waiver label passes", async () => {
    github.pullFiles(40, ["src/cart.ts"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: null, labels: [{ name: "no-tests-needed" }] }), ENV)).status).toBe(0);
  });

  test("a test change on the second page of files is seen", async () => {
    const sources = Array.from({ length: 100 }, (_, i) => `src/module-${i}.ts`);
    github.pullFiles(40, [...sources, "tests/module.test.ts"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: "" }), ENV)).status).toBe(0);
  });

  test("a source change on the second page of files is seen", async () => {
    const docs = Array.from({ length: 100 }, (_, i) => `docs/page-${i}.md`);
    github.pullFiles(40, [...docs, "src/cart.ts"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: "" }), ENV)).status).toBe(1);
  });

  test("globs: `**` spans directories, `*` stays within one, and a glob with no slash matches a file name anywhere", async () => {
    const env = { SOURCE_GLOBS: "app/*.js, *.go", TEST_GLOBS: "**/__tests__/**" };
    github.pullFiles(1, ["app/deep/main.js"]);
    expect((await github.run(SCRIPT, payload({ number: 1, body: "" }), env)).status, "app/*.js does not reach a subdirectory").toBe(0);
    github.pullFiles(2, ["cmd/server/main.go"]);
    expect((await github.run(SCRIPT, payload({ number: 2, body: "" }), env)).status, "*.go matches a file anywhere").toBe(1);
    github.pullFiles(3, ["cmd/server/main.go", "cmd/server/__tests__/main_test.go"]);
    expect((await github.run(SCRIPT, payload({ number: 3, body: "" }), env)).status, "**/__tests__/** matches at any depth").toBe(0);
  });
});

describe("unknown input stays a failure", () => {
  test("unsubstituted globs fail with an error naming the parameter", async () => {
    github.pullFiles(40, ["README.md"]);
    const run = await github.run(SCRIPT, payload({ number: 40, body: "" }), { SOURCE_GLOBS: "{{SOURCE_GLOBS}}", TEST_GLOBS: "tests/**" });
    expect(run.status).toBe(2);
    expect(run.stderr).toMatch(/SOURCE_GLOBS/);
  });

  test("missing globs fail with an error", async () => {
    github.pullFiles(40, ["README.md"]);
    expect((await github.run(SCRIPT, payload({ number: 40, body: "" }), { SOURCE_GLOBS: "src/**" })).status).toBe(2);
  });

  test("a PR the API does not know fails with an error", async () => {
    expect((await github.run(SCRIPT, payload({ number: 41, body: "" }), ENV)).status).toBe(2);
  });
});
