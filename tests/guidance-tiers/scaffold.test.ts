import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { FixtureRepo } from "./harness";

// A design document that lives outside the repository, as a brief handed over usually does.
function artefactOutside(): string {
  const path = join(mkdtempSync(join(tmpdir(), "artefact-")), "brief.md");
  writeFileSync(path, "# The brief\n\nWhat was decided at the start.\n");
  return path;
}

describe("scaffold.sh in an empty repository", () => {
  test("copies the artefact into the frozen tier and writes the index README with the never-edit rule", () => {
    const repo = new FixtureRepo();
    const run = repo.scaffold("--artefact", artefactOutside(), "--guidance", "CLAUDE.md");
    expect(run.status).toBe(0);
    expect(repo.read("docs/reference/brief.md")).toBe("# The brief\n\nWhat was decided at the start.\n");
    const readme = repo.read("docs/reference/README.md");
    expect(readme).toContain("`brief.md`");
    expect(readme).toMatch(/nothing here is edited/i);
    expect(readme).toMatch(/changes only when/i);
  });

  test("writes the living docs: vocabulary file, architecture document with its two lists, ADR template", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--guidance", "CLAUDE.md", "--architecture", "docs/design.md");
    expect(repo.read("CONTEXT.md")).toMatch(/vocabulary/i);
    const architecture = repo.read("docs/design.md");
    expect(architecture).toContain("## Decided");
    expect(architecture).toContain("## Open, in the order they block work");
    expect(repo.exists("docs/adr/0000-template.md")).toBe(true);
  });

  test("appends the precedence section to the guidance file, naming the project's own paths in all four parts", () => {
    const repo = new FixtureRepo();
    repo.write({ "AGENTS.md": "# Agents\n\nExisting guidance stays.\n" });
    repo.scaffold("--guidance", "AGENTS.md", "--frozen-dir", "docs/frozen", "--architecture", "docs/design.md", "--context", "GLOSSARY.md", "--adr-dir", "docs/decisions");
    const guidance = repo.read("AGENTS.md");
    expect(guidance.startsWith("# Agents\n\nExisting guidance stays.\n")).toBe(true);
    // Part 1: the tiers and their rules, in the project's names.
    expect(guidance).toMatch(/frozen tier[^\n]*`docs\/frozen\/`/i);
    expect(guidance).toMatch(/living docs/i);
    expect(guidance).toContain("`GLOSSARY.md`");
    expect(guidance).toContain("`docs/design.md`");
    expect(guidance).toContain("`docs/decisions/`");
    // Part 2: precedence.
    expect(guidance).toMatch(/precedence/i);
    expect(guidance).toMatch(/traces to an ADR/);
    // Part 3: the reading rule.
    expect(guidance).toMatch(/in full/);
    // Part 4: the writing rule.
    expect(guidance).toMatch(/writing rule/i);
    expect(repo.exists("CLAUDE.md")).toBe(false);
  });

  test("installs the check script with its configuration matching the answers, and a CI job that runs it", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--guidance", "CLAUDE.md", "--frozen-dir", "docs/frozen", "--architecture", "docs/design.md", "--context", "GLOSSARY.md", "--adr-dir", "docs/decisions", "--script", "bin/check.sh");
    const script = repo.read("bin/check.sh");
    expect(script).toMatch(/^FROZEN_DIR="docs\/frozen"/m);
    expect(script).toMatch(/^LIVING_DOCS=\("GLOSSARY.md" "docs\/design.md"\)/m);
    expect(script).toMatch(/^ADR_DIR="docs\/decisions"/m);
    const job = repo.read(".github/workflows/guidance.yml");
    expect(job).toContain("pull_request");
    expect(job).toContain("bin/check.sh");
  });

  test("with --ci other, prints the one command to wire in instead of writing a job", () => {
    const repo = new FixtureRepo();
    const run = repo.scaffold("--guidance", "CLAUDE.md", "--ci", "other");
    expect(repo.exists(".github")).toBe(false);
    expect(run.output).toContain("bash scripts/check-guidance.sh");
  });

  test("the installed check passes on the freshly scaffolded repository", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--artefact", artefactOutside(), "--guidance", "CLAUDE.md");
    repo.commit("guidance tiers", {});
    expect(repo.run("main")).toMatchObject({ status: 0, lines: ["guidance check passed"] });
  });
});
