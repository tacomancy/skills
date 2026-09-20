import { describe, expect, test } from "vitest";
import { AdoptingRepo, allTemplateFiles, INSTALL_ARGS, tokensIn } from "./harness";

// Where each template lands: the same relative path under .github/, README.md excepted.
const installedPaths = () => allTemplateFiles().filter((p) => p !== "README.md").map((p) => `.github/${p}`);

describe("install.sh in a fresh repository", () => {
  test("places every template under .github/ with the prefix, globs, and triggers substituted", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS);
    expect(run.status, run.output).toBe(0);
    for (const path of installedPaths()) {
      expect(repo.exists(path), path).toBe(true);
      expect(tokensIn(repo.read(path)), path).toEqual([]);
    }
    expect(repo.read(".github/ISSUE_TEMPLATE/ticket.md")).toContain("`skill/<beat>`");
    expect(repo.read(".github/workflows/ticket-link-check.yml")).toContain('FAMILY_LABEL_PREFIX: "skill/"');
    expect(repo.read(".github/workflows/test-touch-check.yml")).toContain('SOURCE_GLOBS: "src/**, lib/**/*.ts"');
    expect(repo.read(".github/workflows/test-touch-check.yml")).toContain('TEST_GLOBS: "tests/**, **/*.test.ts"');
    expect(repo.read(".github/workflows/post-merge-trigger-check.yml")).toContain(
      'POST_MERGE_TRIGGERS: "the public site: skills/*/SKILL.md; the invariants: CLAUDE.md"',
    );
    expect(repo.exists(".github/README.md")).toBe(false);
  });
});

// The status labels the pipeline layers on the adopter's set: three for beats, three for tickets.
const STATUS_LABELS = ["spec:needs-grilling", "spec:ready-for-tickets", "spec:tickets-generated", "ticket:in-review", "ticket:landed", "ticket:blocked"];

describe("install.sh and the tracker", () => {
  test("creates each status label once through the CLI on PATH, with a description", () => {
    const repo = new AdoptingRepo();
    expect(repo.install(...INSTALL_ARGS).status).toBe(0);
    const creates = repo.ghCalls().filter((call) => call[0] === "label" && call[1] === "create");
    expect(creates.map((call) => call[2]).sort()).toEqual([...STATUS_LABELS].sort());
    for (const call of creates) expect(call, call.join(" ")).toContain("--description");
  });

  test("refuses before the first write when the CLI is not on PATH", () => {
    const repo = new AdoptingRepo();
    const run = repo.installWithoutGh(...INSTALL_ARGS);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("gh");
    expect(repo.snapshot()).toEqual({});
  });

  test("leaves a label the tracker already holds alone", () => {
    const repo = new AdoptingRepo();
    repo.seedLabels(["spec:needs-grilling", "ticket:blocked"]);
    expect(repo.install(...INSTALL_ARGS).status).toBe(0);
    const created = repo.ghCalls().filter((call) => call[1] === "create").map((call) => call[2]);
    expect(created).not.toContain("spec:needs-grilling");
    expect(created).not.toContain("ticket:blocked");
    expect(created).toHaveLength(4);
  });
});

describe("install.sh over its own output", () => {
  test("a second run changes no file, creates no label, and exits zero", () => {
    const repo = new AdoptingRepo();
    expect(repo.install(...INSTALL_ARGS).status).toBe(0);
    const before = repo.snapshot();
    const calls = repo.ghCalls().length;
    const again = repo.install(...INSTALL_ARGS);
    expect(again.status, again.output).toBe(0);
    expect(repo.snapshot()).toEqual(before);
    expect(repo.ghCalls().slice(calls).filter((call) => call[1] === "create")).toEqual([]);
  });
});

describe("install.sh over its own output", () => {
  test("an executable bit the adopter set on an installed script is not a foreign file", () => {
    const repo = new AdoptingRepo();
    expect(repo.install(...INSTALL_ARGS).status).toBe(0);
    repo.chmod(".github/workflows/scripts/ticket-link-check.mjs", 0o755);
    const again = repo.install(...INSTALL_ARGS);
    expect(again.status, again.output).toBe(0);
  });
});

describe("install.sh against a repository with history", () => {
  const foreign = "name: CI\non: [push]\njobs: {}\n";

  test("exits non-zero naming a foreign file at a target path, leaves it as it was, and creates nothing", () => {
    const repo = new AdoptingRepo();
    repo.write({ ".github/workflows/ticket-link-check.yml": foreign, "README.md": "# Widgets\n" });
    const before = repo.snapshot();
    const run = repo.install(...INSTALL_ARGS);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain(".github/workflows/ticket-link-check.yml");
    expect(repo.snapshot()).toEqual(before);
    expect(repo.ghCalls()).toEqual([]);
  });

  test("names every colliding file, not just the first", () => {
    const repo = new AdoptingRepo();
    repo.write({ ".github/pull_request_template.md": "# PR\n", ".github/ISSUE_TEMPLATE/ticket.md": "# Ticket\n" });
    const run = repo.install(...INSTALL_ARGS);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain(".github/pull_request_template.md");
    expect(run.output).toContain(".github/ISSUE_TEMPLATE/ticket.md");
  });

  // Its own output under other arguments is not its output: the rendered text differs.
  test("refuses its own earlier output when the arguments have changed", () => {
    const repo = new AdoptingRepo();
    expect(repo.install(...INSTALL_ARGS).status).toBe(0);
    const before = repo.snapshot();
    const run = repo.install(...INSTALL_ARGS.map((a) => (a === "skill" ? "area" : a)));
    expect(run.status).not.toBe(0);
    expect(run.output).toContain(".github/ISSUE_TEMPLATE/ticket.md");
    expect(repo.snapshot()).toEqual(before);
  });
});

describe("install.sh arguments", () => {
  const without = (flag: string) => {
    const at = INSTALL_ARGS.indexOf(flag);
    return [...INSTALL_ARGS.slice(0, at), ...INSTALL_ARGS.slice(at + 2)];
  };

  test.each(["--prefix", "--source-globs", "--test-globs"])("a missing %s fails with usage and installs nothing", (flag) => {
    const repo = new AdoptingRepo();
    const run = repo.install(...without(flag));
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("Usage:");
    expect(repo.snapshot()).toEqual({});
    expect(repo.ghCalls()).toEqual([]);
  });

  test("a blank prefix fails with usage", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS.map((a) => (a === "skill" ? "" : a)));
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("Usage:");
    expect(repo.snapshot()).toEqual({});
  });

  test("a prefix with a trailing slash is refused, since the templates supply the slash", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS.map((a) => (a === "skill" ? "skill/" : a)));
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("skill/");
    expect(repo.snapshot()).toEqual({});
  });

  test("a trigger without its name or globs is refused before anything is written", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS, "--trigger", "just a name");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("just a name");
    expect(repo.snapshot()).toEqual({});
  });

  test("no trigger is a valid set: the workflow's value is empty, not a token", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS.filter((a) => a !== "--trigger" && !a.includes(":")));
    expect(run.status, run.output).toBe(0);
    expect(repo.read(".github/workflows/post-merge-trigger-check.yml")).toContain('POST_MERGE_TRIGGERS: ""');
  });

  // `&` and `|` mean something to the substitution's own tooling; the value lands as typed.
  test("a glob is written as typed whatever characters it carries", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS.map((a) => (a.startsWith("src/") ? "src/**, a&b/**, c|d/**" : a)));
    expect(run.status, run.output).toBe(0);
    expect(repo.read(".github/workflows/test-touch-check.yml")).toContain('SOURCE_GLOBS: "src/**, a&b/**, c|d/**"');
  });

  test("a value with a double quote is refused, since it sits in a quoted YAML string", () => {
    const repo = new AdoptingRepo();
    const run = repo.install(...INSTALL_ARGS.map((a) => (a.startsWith("src/") ? 'src/**, "lib"' : a)));
    expect(run.status).not.toBe(0);
    expect(repo.snapshot()).toEqual({});
  });
});
