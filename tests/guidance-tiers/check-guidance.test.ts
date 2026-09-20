import { describe, expect, test } from "vitest";
import { conformingRepo, FixtureRepo } from "./harness";

// The conforming repository with one feature commit on a branch off `main`.
function onBranch(mutate: (repo: FixtureRepo) => void): FixtureRepo {
  const repo = conformingRepo();
  repo.branch("feature");
  mutate(repo);
  return repo;
}

describe("check-guidance.sh — the frozen tier", () => {
  test("a clean repository passes with a single pass line", () => {
    const repo = onBranch((r) => r.commit("touch nothing frozen", { "src/thing.txt": "hello\n" }));
    expect(repo.run("main")).toMatchObject({ status: 0, lines: ["guidance check passed"] });
  });
});

describe("frozen files", () => {
  test("a modified frozen file fails, naming the file", () => {
    const repo = onBranch((r) => r.commit("edit the brief", { "docs/reference/brief.md": "# Brief\n\nHelpfully corrected.\n" }));
    const run = repo.run("main");
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([expect.stringContaining("docs/reference/brief.md")]);
  });

  test("each modified frozen file gets its own FAIL line", () => {
    const repo = conformingRepo();
    repo.commit("a second frozen file", { "docs/reference/contract.md": "# Contract\n", "docs/reference/README.md": "# Reference\n- brief\n- contract\n" });
    repo.branch("feature");
    repo.commit("edit both", { "docs/reference/brief.md": "changed\n", "docs/reference/contract.md": "changed\n" });
    expect(repo.run("main").fails).toEqual([
      expect.stringContaining("docs/reference/brief.md"),
      expect.stringContaining("docs/reference/contract.md"),
    ]);
  });

  test("a newly added frozen file passes", () => {
    const repo = onBranch((r) =>
      r.commit("add a contract", {
        "docs/reference/contract.md": "# Contract\n",
        "docs/reference/README.md": "# Reference\n\n- `brief.md`\n- `contract.md`\n",
      }),
    );
    expect(repo.run("main")).toMatchObject({ status: 0, fails: [] });
  });

  test("a deleted frozen file fails, naming the file", () => {
    const repo = onBranch((r) => {
      r.git("rm", "-q", "docs/reference/brief.md");
      r.commit("remove the brief", { "docs/reference/README.md": "# Reference\n\nEmpty now.\n" });
    });
    expect(repo.run("main")).toMatchObject({ status: 1, fails: [expect.stringContaining("docs/reference/brief.md")] });
  });

  test("a frozen file renamed and edited fails under its old name", () => {
    const repo = onBranch((r) => {
      r.git("mv", "docs/reference/brief.md", "docs/reference/brief-v2.md");
      r.commit("rename and edit", {
        "docs/reference/brief-v2.md": "# Brief\n\nThe original, lightly edited.\n",
        "docs/reference/README.md": "# Reference\n\n- `brief-v2.md`\n",
      });
    });
    expect(repo.run("main")).toMatchObject({ status: 1, fails: [expect.stringContaining("docs/reference/brief.md")] });
  });
});

describe("the index README", () => {
  test("changed alone fails", () => {
    const repo = onBranch((r) => r.commit("reword the index", { "docs/reference/README.md": "# Reference (reworded)\n" }));
    expect(repo.run("main")).toMatchObject({ status: 1, fails: [expect.stringContaining("docs/reference/README.md")] });
  });

  test("changed together with the directory's contents passes", () => {
    const repo = onBranch((r) =>
      r.commit("index a new file", {
        "docs/reference/README.md": "# Reference\n\n- `brief.md`\n- `spec.md`\n",
        "docs/reference/spec.md": "# Spec\n",
      }),
    );
    expect(repo.run("main")).toMatchObject({ status: 0, fails: [] });
  });
});

describe("the base ref", () => {
  test("an unknown base ref prints a skip line and passes, even with a frozen file modified", () => {
    const repo = onBranch((r) => r.commit("edit the brief", { "docs/reference/brief.md": "changed\n" }));
    const run = repo.run("nonexistent/ref");
    expect(run.status).toBe(0);
    expect(run.lines).toEqual([expect.stringMatching(/^skip:.*nonexistent\/ref/), "guidance check passed"]);
  });

  test("defaults to origin/main: skipped where there is no origin, used where there is one", () => {
    const repo = onBranch((r) => r.commit("edit the brief", { "docs/reference/brief.md": "changed\n" }));
    expect(repo.run().lines).toEqual([expect.stringMatching(/^skip:.*origin\/main/), "guidance check passed"]);

    const clone = repo.cloneOf();
    clone.git("checkout", "-q", "feature");
    expect(clone.run()).toMatchObject({ status: 1, fails: [expect.stringContaining("origin/main")] });
  });
});
