import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { allTemplateFiles, INSTALL_ARGS, AdoptingRepo } from "./harness";

const SKILL = fileURLToPath(new URL("../../skills/bluesky-feature-pipeline/", import.meta.url));
const read = (name: string) => readFileSync(`${SKILL}${name}`, "utf8");

// Where each template lands; the adoption document is read per installed path.
const installedPaths = () => allTemplateFiles().filter((p) => p !== "README.md").map((p) => `.github/${p}`);

// The paths the document names, as its inline code spans (a fenced block is not one): a
// full path, a bare file name, or a glob over one directory. Any of the three covers a file.
function covers(doc: string, path: string): boolean {
  const spans = [...doc.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)].map((m) => m[1]);
  const base = path.slice(path.lastIndexOf("/") + 1);
  return spans.some((span) => {
    if (span === path || span === base) return true;
    if (!span.includes("*")) return false;
    const pattern = "^" + span.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$";
    return new RegExp(pattern).test(path);
  });
}

describe("ADOPTING.md", () => {
  const doc = () => read("ADOPTING.md");

  test("names every file the install script places, so no collision is left without a merge path", () => {
    for (const path of installedPaths()) expect(covers(doc(), path), path).toBe(true);
  });

  test("names every status label the script creates, so an existing label has a mapping", () => {
    const labels = read("install.sh").match(/^label (\S+)/gm)?.map((line) => line.slice("label ".length)) ?? [];
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(doc(), label).toContain(`\`${label}\``);
  });

  // The none form is what lets a path-set trigger be wider than its condition; the document
  // says so and shows this repository's one trigger as the example.
  test("documents the none form, and the example's one trigger on every SKILL.md", () => {
    const parameters = /^## Parameters[\s\S]*?(?=^## )/m.exec(doc())?.[0] ?? "";
    expect(parameters).toContain("`<trigger>: none`");
    expect(parameters).toContain("`site-description: skills/*/SKILL.md`");
    expect(parameters).toContain("land-ticket");
  });

  test("covers the open tickets, the label mapping, and branch protection as a diff", () => {
    const headings = doc().split("\n").filter((line) => /^## /.test(line));
    expect(headings).toEqual(expect.arrayContaining(["## Per template", "## Labels", "## Tickets already open", "## Branch protection"]));
    expect(doc()).toContain("BRANCH_PROTECTION.md");
    expect(doc()).toContain("## Parent");
  });
});

describe("the path into ADOPTING.md", () => {
  test("stage 0 of SKILL.md links to it for the collision case", () => {
    const stage0 = /^## 0\. Setup[\s\S]*?(?=^## 1\.)/m.exec(read("SKILL.md"))?.[0] ?? "";
    expect(stage0).toContain("](ADOPTING.md)");
  });

  test("the install script's refusal names it", () => {
    const repo = new AdoptingRepo();
    repo.write({ ".github/pull_request_template.md": "# PR\n" });
    const run = repo.install(...INSTALL_ARGS);
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("ADOPTING.md");
  });
});
