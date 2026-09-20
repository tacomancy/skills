import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { FixtureRepo } from "../guidance-tiers/harness";
import { adr, SCRIPT, TEMPLATE } from "./harness";

const CHECK = "scripts/check-guidance.sh";

// The composition SKILL.md describes: guidance-tiers scaffolds the repository, the one
// line it names is added to the installed check script, and the skill's template
// replaces the seeded one. Everything is driven as the adopting repository's CI would.
function adopted(files: Record<string, string>): FixtureRepo {
  const repo = new FixtureRepo();
  expect(repo.scaffold("--guidance", "CLAUDE.md", "--ci", "other").status).toBe(0);
  const check = join(repo.dir, CHECK);
  const line = `bash ${JSON.stringify(SCRIPT)} "$ADR_DIR" || fail=1\n`;
  writeFileSync(check, readFileSync(check, "utf8").replace(/^if \[ "\$fail" -ne 0 \]/m, `${line}$&`));
  repo.write({ "docs/adr/0000-template.md": readFileSync(TEMPLATE, "utf8"), ...files });
  repo.commit("adopt adr-shape", {});
  return repo;
}

function lint(repo: FixtureRepo) {
  const result = spawnSync("bash", [SCRIPT, "docs/adr"], { cwd: repo.dir, encoding: "utf8" });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("with guidance-tiers", () => {
  test("a scaffolded repository with the template swapped in passes the guidance check and the lint", () => {
    const repo = adopted({ "docs/adr/0001-store-raw.md": adr() });
    expect(repo.run()).toMatchObject({ status: 0, fails: [] });
    expect(lint(repo)).toEqual({ status: 0, output: "" });
  });

  test("a numbering gap gets the same answer from both checks", () => {
    const repo = adopted({ "docs/adr/0002-second.md": adr({ title: "# 0002: A second decision" }) });
    expect(repo.run()).toMatchObject({ status: 1, fails: [expect.stringMatching(/gap at 0002 \(expected 0001\)/)] });
    expect(lint(repo)).toMatchObject({ status: 1, output: expect.stringMatching(/gap at 0002 \(expected 0001\)/) });
  });

  test("a shape finding fails the guidance check through the added line", () => {
    const repo = adopted({ "docs/adr/0001-store-raw.md": adr({ status: null }) });
    const run = repo.run();
    expect(run.status).toBe(1);
    expect(run.fails).toEqual([]);
    expect(run.output).toMatch(/docs\/adr\/0001-store-raw\.md: no \*\*Status:\*\* line/);
  });
});
