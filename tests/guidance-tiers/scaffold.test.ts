import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { FixtureRepo } from "./harness";

// A design document that lives outside the repository, as a brief handed over usually does.
function artefactOutside(content = "# The brief\n\nWhat was decided at the start.\n"): string {
  const path = join(mkdtempSync(join(tmpdir(), "artefact-")), "brief.md");
  writeFileSync(path, content);
  return path;
}

// A brief with a glossary table, the shape a design document most often carries its terms in.
const briefWithGlossary = `# The brief

## Goals

Sell widgets.

## Glossary

| Term | Meaning | Notes |
| --- | --- | --- |
| Widget | The thing we sell. | |
| Lot | A batch of widgets \`sold\` together. | see Widget |

## Later

Not a table.
`;

// The interview answered with the owner's own names for every piece.
const customLayout = ["--frozen-dir", "docs/frozen", "--architecture", "docs/design.md", "--context", "GLOSSARY.md", "--adr-dir", "docs/decisions"];

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
    expect(repo.scaffold("--guidance", "CLAUDE.md", "--architecture", "docs/design.md").status).toBe(0);
    expect(repo.read("CONTEXT.md")).toMatch(/vocabulary/i);
    const architecture = repo.read("docs/design.md");
    expect(architecture).toContain("## Decided");
    expect(architecture).toContain("## Open, in the order they block work");
    expect(repo.exists("docs/adr/0000-template.md")).toBe(true);
  });

  test("appends the precedence section to the guidance file, naming the project's own paths in all four parts", () => {
    const repo = new FixtureRepo();
    repo.write({ "AGENTS.md": "# Agents\n\nExisting guidance stays.\n" });
    expect(repo.scaffold("--guidance", "AGENTS.md", ...customLayout).status).toBe(0);
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
    expect(guidance).toMatch(/never a new file/);
    expect(repo.exists("CLAUDE.md")).toBe(false);
  });

  test("installs the check script with its configuration matching the answers, and a CI job that runs it", () => {
    const repo = new FixtureRepo();
    expect(repo.scaffold("--guidance", "CLAUDE.md", ...customLayout, "--script", "bin/check.sh").status).toBe(0);
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

  test("moves an artefact named relative to a subdirectory the scaffold is run from", () => {
    const repo = new FixtureRepo();
    repo.commit("base", { "specs/the brief.md": "# The brief\n" });
    const run = repo.scaffoldFrom("src", "--artefact", "../specs/the brief.md", "--guidance", "CLAUDE.md");
    expect(run.status).toBe(0);
    expect(repo.read("docs/reference/the brief.md")).toBe("# The brief\n");
    expect(repo.exists("specs/the brief.md")).toBe(false);
    expect(repo.git("status", "--porcelain")).toMatch(/^R  "?specs\/the brief.md"? -> "?docs\/reference\/the brief.md"?$/m);
  });

  test("refuses an artefact that does not exist before writing anything", () => {
    const repo = new FixtureRepo();
    const run = repo.scaffold("--artefact", "nope.md", "--guidance", "CLAUDE.md");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("nope.md");
    expect(repo.exists("docs")).toBe(false);
  });

  test("refuses to guess the guidance file when both CLAUDE.md and AGENTS.md exist", () => {
    const repo = new FixtureRepo();
    repo.write({ "CLAUDE.md": "# Claude\n", "AGENTS.md": "# Agents\n" });
    const run = repo.scaffold();
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/--guidance/);
    expect(repo.read("CLAUDE.md")).toBe("# Claude\n");
    expect(repo.read("AGENTS.md")).toBe("# Agents\n");
  });

  test("takes the one guidance file that exists without being told", () => {
    const repo = new FixtureRepo();
    repo.write({ "AGENTS.md": "# Agents\n" });
    expect(repo.scaffold().status).toBe(0);
    expect(repo.read("AGENTS.md")).toContain("## Guidance tiers");
    expect(repo.exists("CLAUDE.md")).toBe(false);
  });
});

describe("scaffold.sh in a partially populated repository", () => {
  test("leaves every pre-existing piece byte-identical and reports it as found", () => {
    const repo = new FixtureRepo();
    const existing = {
      "docs/reference/README.md": "# Reference\n\nThe owner's own index.\n",
      "docs/reference/brief.md": "# The brief\n",
      "CONTEXT.md": "# Vocabulary\n\n- **widget** — the thing.\n",
      "docs/adr/0000-template.md": "# Template\n",
      "CLAUDE.md": "# Claude\n\n## Guidance tiers\n\nThe owner's own section.\n",
      "scripts/check-guidance.sh": "#!/usr/bin/env bash\necho custom\n",
    };
    repo.commit("base", existing);
    const run = repo.scaffold("--artefact", "docs/reference/brief.md");
    expect(run.status).toBe(0);
    for (const [path, content] of Object.entries(existing)) {
      expect(repo.read(path)).toBe(content);
      expect(run.output).toContain(`found: ${path}`);
    }
    expect(run.output).not.toContain("appended:");
    expect(repo.read("docs/architecture.md")).toContain("## Decided");
    expect(run.output).toContain("created: docs/architecture.md");
  });

  test("run twice, the second run changes nothing and creates nothing", () => {
    const repo = new FixtureRepo();
    expect(repo.scaffold("--artefact", artefactOutside(), "--guidance", "CLAUDE.md").status).toBe(0);
    repo.commit("guidance tiers", {});
    const again = repo.scaffold("--artefact", artefactOutside(), "--guidance", "CLAUDE.md");
    expect(again.status).toBe(0);
    expect(repo.git("status", "--porcelain")).toBe("");
    expect(again.lines.filter((l) => !l.startsWith("found: "))).toEqual([]);
  });

  test("a pre-existing check script that matches the template is reported as such", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--guidance", "CLAUDE.md", ...customLayout);
    const again = repo.scaffold("--guidance", "CLAUDE.md", ...customLayout);
    expect(again.output).toMatch(/^found: scripts\/check-guidance.sh.*matches the template/m);
  });

  test("a pre-existing check script that differs is left in place and summarised against the template", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--guidance", "CLAUDE.md");
    const installed = repo.read("scripts/check-guidance.sh");
    const edited = installed.replace(/^ADR_DIR=.*$/m, 'ADR_DIR="docs/decisions"') + "\n# the owner's own rule\necho extra\n";
    repo.write({ "scripts/check-guidance.sh": edited });
    const again = repo.scaffold("--guidance", "CLAUDE.md");
    expect(again.status).toBe(0);
    expect(repo.read("scripts/check-guidance.sh")).toBe(edited);
    expect(again.output).toMatch(/^found: scripts\/check-guidance.sh.*differs from the template/m);
    expect(again.output).toMatch(/ADR_DIR/);
    expect(again.output).toMatch(/\+4 -1 lines/);
  });

  test("a pre-existing check script with its configuration block removed names every missing value", () => {
    const repo = new FixtureRepo();
    repo.scaffold("--guidance", "CLAUDE.md");
    const stripped = repo.read("scripts/check-guidance.sh").split("\n").filter((l) => !/^[A-Z_]+=/.test(l)).join("\n");
    repo.write({ "scripts/check-guidance.sh": stripped });
    const again = repo.scaffold("--guidance", "CLAUDE.md");
    expect(again.status).toBe(0);
    expect(again.output).toMatch(/configuration differs in .*ADR_DIR/);
    expect(again.output).toMatch(/FROZEN_DIR/);
    expect(again.output).toMatch(/LIVING_DOCS/);
  });

  test("a precedence heading with trailing whitespace still counts as present", () => {
    const repo = new FixtureRepo();
    repo.write({ "CLAUDE.md": "# Claude\n\n## Guidance tiers  \n\nThe owner's own.\n" });
    const run = repo.scaffold();
    expect(run.status).toBe(0);
    expect(repo.read("CLAUDE.md").match(/## Guidance tiers/g)).toHaveLength(1);
    expect(run.output).toContain("found: CLAUDE.md");
  });
});

describe("scaffold.sh seeding the vocabulary file", () => {
  test("from an artefact with a glossary table, carries its terms and where they came from", () => {
    const repo = new FixtureRepo();
    expect(repo.scaffold("--artefact", artefactOutside(briefWithGlossary), "--guidance", "CLAUDE.md").status).toBe(0);
    const context = repo.read("CONTEXT.md");
    expect(context).toMatch(/^# Vocabulary/);
    expect(context).toContain("- **Widget** — The thing we sell.");
    expect(context).toContain("- **Lot** — A batch of widgets `sold` together.");
    expect(context).not.toMatch(/Term.*Meaning/);
    expect(context).not.toContain("---");
    expect(context).toContain("`brief.md`");
  });

  test("from an artefact without one, carries the rule line only", () => {
    const repo = new FixtureRepo();
    expect(repo.scaffold("--artefact", artefactOutside(), "--guidance", "CLAUDE.md").status).toBe(0);
    const context = repo.read("CONTEXT.md");
    expect(context).toMatch(/^# Vocabulary\n\n[^\n]+\n$/);
    expect(context).toMatch(/lives here/);
  });

  test("leaves an existing vocabulary file alone even when the artefact has a glossary", () => {
    const repo = new FixtureRepo();
    repo.write({ "CONTEXT.md": "# Vocabulary\n\n- **Own** — the owner's term.\n" });
    repo.scaffold("--artefact", artefactOutside(briefWithGlossary), "--guidance", "CLAUDE.md");
    expect(repo.read("CONTEXT.md")).toBe("# Vocabulary\n\n- **Own** — the owner's term.\n");
  });

  test("reads the term and meaning columns by their headers, keeps escaped pipes, and skips rows without a meaning", () => {
    const repo = new FixtureRepo();
    const brief = `# Brief

## Primary objects

| # | Object | Description | Owner |
|---|---|---|---|
| 1 | Widget | The thing; \`a \\| b\` picks one. | ops |
| 2 | Orphan | | ops |
`;
    repo.scaffold("--artefact", artefactOutside(brief), "--guidance", "CLAUDE.md");
    const context = repo.read("CONTEXT.md");
    expect(context).toContain("- **Widget** — The thing; `a | b` picks one.");
    expect(context).not.toContain("**1**");
    expect(context).not.toContain("Orphan");
  });

  test("withholds the seed from headings that merely mention a glossary, fenced code, and a second table's header", () => {
    const repo = new FixtureRepo();
    const brief = `# Brief

## Non-glossary notes

| Foo | Bar |
|---|---|
| foo | bar |

## Glossary

\`\`\`
## Glossary
| Fake | term |
|---|---|
| Fake | term |
\`\`\`

| Term | Meaning |
|---|---|
| Widget | The thing. |

| Term | Meaning |
|---|---|
| Lot | A batch. |
`;
    repo.scaffold("--artefact", artefactOutside(brief), "--guidance", "CLAUDE.md");
    const context = repo.read("CONTEXT.md");
    expect(context).toContain("- **Widget** — The thing.");
    expect(context).toContain("- **Lot** — A batch.");
    expect(context).not.toContain("foo");
    expect(context).not.toContain("Fake");
    expect(context).not.toContain("**Term**");
  });
});
