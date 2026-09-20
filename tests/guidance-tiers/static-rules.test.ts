import { describe, expect, test } from "vitest";
import { conformingRepo } from "./harness";

describe("ADR numbering", () => {
  test("a gap fails at the first gap; later ADRs are not reported", () => {
    const repo = conformingRepo();
    repo.commit("adrs with a gap", { "docs/adr/0001-first.md": "# 1\n", "docs/adr/0003-third.md": "# 3\n", "docs/adr/0004-fourth.md": "# 4\n" });
    const run = repo.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([expect.stringMatching(/0003.*0002|0002.*0003/)]);
  });

  test("a duplicate number fails, naming the number", () => {
    const repo = conformingRepo();
    repo.commit("two 0001s", { "docs/adr/0001-first.md": "# 1\n", "docs/adr/0001-again.md": "# 1 again\n" });
    expect(repo.run("main")).toMatchObject({ status: 1, fails: [expect.stringContaining("0001")] });
  });
});

describe("living documents", () => {
  test("a missing living document fails, naming it", () => {
    const repo = conformingRepo();
    repo.git("rm", "-q", "docs/architecture.md");
    repo.commit("architecture document renamed away", { "docs/design.md": "# Design\n" });
    expect(repo.run("main")).toMatchObject({ status: 1, fails: [expect.stringContaining("docs/architecture.md")] });
  });
});

describe("name resolution", () => {
  const guidance = [
    "# Guidance",
    "",
    "## Loop",
    "",
    "Run `to-tickets`, then `implement`; fixtures live in `docs`. Also `phantom`.",
    "",
    "## Elsewhere",
    "",
    "This section is not checked, so `unchecked` is fine.",
    "",
  ].join("\n");

  function repoWithGuidance() {
    const repo = conformingRepo();
    repo.commit("guidance and vendored skills", {
      "CLAUDE.md": guidance,
      ".agents/skills/to-tickets/SKILL.md": "---\nname: to-tickets\n---\n",
      ".agents/skills/implement/SKILL.md": "---\nname: implement\n---\n",
    });
    return repo;
  }

  test("configured: an unresolvable backticked name fails; a name that is also a path passes; names outside the section are ignored", () => {
    const repo = repoWithGuidance();
    repo.installScript({ GUIDANCE_FILE: '"CLAUDE.md"', GUIDANCE_SECTION: '"Loop"', RESOLVE_DIR: '".agents/skills"' });
    const run = repo.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([expect.stringContaining("phantom")]);
  });

  test("unconfigured: the rule is skipped silently", () => {
    const repo = repoWithGuidance();
    expect(repo.run("main")).toMatchObject({ status: 0, lines: ["guidance check passed"] });
  });
});

describe("several findings", () => {
  test("every broken rule is reported in one run, with one non-zero exit", () => {
    const repo = conformingRepo();
    repo.git("rm", "-q", "CONTEXT.md");
    repo.branch("feature");
    repo.commit("break three rules", {
      "docs/reference/brief.md": "edited\n",
      "docs/adr/0002-second.md": "# 2\n",
    });
    const run = repo.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([
      expect.stringContaining("docs/reference/brief.md"),
      expect.stringContaining("0002"),
      expect.stringContaining("CONTEXT.md"),
    ]);
    expect(run.lines.at(-1)).toBe("guidance check failed");
  });
});
