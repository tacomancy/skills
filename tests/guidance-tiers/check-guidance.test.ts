import { describe, expect, test } from "vitest";
import { conformingRepo } from "./harness";

describe("check-guidance.sh — the frozen tier", () => {
  test("a clean repository passes with a single pass line", () => {
    const repo = conformingRepo();
    repo.branch("feature");
    repo.commit("touch nothing frozen", { "src/thing.txt": "hello\n" });
    const run = repo.run("main");
    expect(run.status).toBe(0);
    expect(run.lines).toEqual(["guidance check passed"]);
  });
});

describe("frozen files", () => {
  test("a modified frozen file fails, naming the file", () => {
    const repo = conformingRepo();
    repo.branch("feature");
    repo.commit("edit the brief", { "docs/reference/brief.md": "# Brief\n\nHelpfully corrected.\n" });
    const run = repo.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toHaveLength(1);
    expect(run.stdout).toContain("docs/reference/brief.md");
  });

  test("a newly added frozen file passes", () => {
    const repo = conformingRepo();
    repo.branch("feature");
    repo.commit("add a contract", {
      "docs/reference/contract.md": "# Contract\n",
      "docs/reference/README.md": "# Reference\n\n- `brief.md`\n- `contract.md`\n",
    });
    expect(repo.run("main")).toMatchObject({ status: 0, fails: [] });
  });
});

describe("the index README", () => {
  test("changed alone fails; changed together with the directory's contents passes", () => {
    const alone = conformingRepo();
    alone.branch("feature");
    alone.commit("reword the index", { "docs/reference/README.md": "# Reference (reworded)\n" });
    const run = alone.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([expect.stringContaining("docs/reference/README.md")]);

    const together = conformingRepo();
    together.branch("feature");
    together.commit("index a new file", {
      "docs/reference/README.md": "# Reference\n\n- `brief.md`\n- `spec.md`\n",
      "docs/reference/spec.md": "# Spec\n",
    });
    expect(together.run("main")).toMatchObject({ status: 0, fails: [] });
  });
});

describe("the base ref", () => {
  test("an unknown base ref prints a skip line and passes, even with a frozen file modified", () => {
    const repo = conformingRepo();
    repo.branch("feature");
    repo.commit("edit the brief", { "docs/reference/brief.md": "changed\n" });
    const run = repo.run("nonexistent/ref");
    expect(run.status).toBe(0);
    expect(run.lines).toEqual([expect.stringMatching(/^skip:.*nonexistent\/ref/), "guidance check passed"]);
  });

  test("defaults to origin/main: skipped where there is no origin, used where there is one", () => {
    const repo = conformingRepo();
    repo.branch("feature");
    repo.commit("edit the brief", { "docs/reference/brief.md": "changed\n" });
    expect(repo.run().lines).toEqual([expect.stringMatching(/^skip:.*origin\/main/), "guidance check passed"]);

    // A fresh clone of the fixture has origin/main; the same mutation now fails there.
    const clone = repo.cloneOf();
    clone.git("checkout", "-q", "feature");
    expect(clone.run()).toMatchObject({ status: 1, fails: [expect.stringContaining("origin/main")] });
  });
});
