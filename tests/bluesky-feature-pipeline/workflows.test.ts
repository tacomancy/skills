import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import { readRaw } from "./harness";

// The three checks and the parameters the install script writes into each YAML.
const CHECKS = [
  { yaml: "workflows/ticket-link-check.yml", script: "ticket-link-check.mjs", env: { FAMILY_LABEL_PREFIX: "{{FAMILY_PREFIX}}/" } },
  { yaml: "workflows/test-touch-check.yml", script: "test-touch-check.mjs", env: { SOURCE_GLOBS: "{{SOURCE_GLOBS}}", TEST_GLOBS: "{{TEST_GLOBS}}" } },
  { yaml: "workflows/post-merge-trigger-check.yml", script: "post-merge-trigger-check.mjs", env: { POST_MERGE_TRIGGERS: "{{POST_MERGE_TRIGGERS}}" } },
];

type Step = { run?: string; uses?: string; env?: Record<string, string> };
type Workflow = { on: Record<string, unknown>; permissions: Record<string, string>; jobs: Record<string, { steps: Step[] }> };

const workflow = (path: string) => parseYaml(readRaw(path)) as Workflow;

describe.each(CHECKS)("$yaml", ({ yaml, script, env }) => {
  test("runs on pull requests, reading the payload the script reads", () => {
    expect(workflow(yaml).on).toHaveProperty("pull_request");
  });

  // One checkout, one `node` invocation; the logic is in the script the tests drive.
  test("only checks out and invokes the script", () => {
    const jobs = Object.values(workflow(yaml).jobs);
    expect(jobs).toHaveLength(1);
    const steps = jobs[0].steps;
    expect(steps.map((s) => s.uses ?? "run")).toEqual([expect.stringMatching(/^actions\/checkout@/), "run"]);
    expect(steps[1].run?.trim()).toBe(`node .github/workflows/scripts/${script}`);
  });

  test("passes the script its parameters as placeholders, and a token", () => {
    const run = Object.values(workflow(yaml).jobs)[0].steps[1];
    expect(run.env).toMatchObject({ ...env, GITHUB_TOKEN: "${{ github.token }}" });
  });

  test("asks for read permissions only", () => {
    expect(Object.values(workflow(yaml).permissions).every((p) => p === "read")).toBe(true);
  });
});
