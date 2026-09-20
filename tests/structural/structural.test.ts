import { describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import { checkSkills } from "./check";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const fixture = (name: string) => here(`./fixtures/${name}/skills/`);

describe("structural check over a skills directory", () => {
  test("a conforming skill folder produces no findings", () => {
    expect(checkSkills(fixture("conforming"))).toEqual([]);
  });
});

describe("SKILL.md", () => {
  test("a folder without SKILL.md", () => {
    expect(checkSkills(fixture("missing-skill-md"))).toEqual([
      expect.objectContaining({ folder: "no-file", rule: "skill-md-exists" }),
    ]);
  });
});

describe("frontmatter", () => {
  test("SKILL.md without frontmatter, or with YAML that does not parse, fails", () => {
    expect(checkSkills(fixture("bad-frontmatter"))).toEqual([
      expect.objectContaining({ folder: "no-frontmatter", rule: "frontmatter-parses" }),
      expect.objectContaining({ folder: "unparseable", rule: "frontmatter-parses" }),
    ]);
  });
});

describe("name", () => {
  test("a name that differs from the folder, or is absent, fails", () => {
    expect(checkSkills(fixture("name-mismatch"))).toEqual([
      expect.objectContaining({ folder: "nameless", rule: "name-equals-folder" }),
      expect.objectContaining({ folder: "renamed-folder", rule: "name-equals-folder" }),
    ]);
  });
});

describe("description", () => {
  test("an empty description, or one over the 1024-character limit, fails; one exactly at the limit passes", () => {
    expect(checkSkills(fixture("description-limits"))).toEqual([
      expect.objectContaining({ folder: "empty-description", rule: "description-non-empty" }),
      expect.objectContaining({ folder: "long-description", rule: "description-within-limit" }),
    ]);
  });
});

describe("relative links", () => {
  test("a relative link fails unless it resolves to a file inside the skill folder; URLs and anchors are ignored", () => {
    const findings = checkSkills(fixture("broken-link"));
    const unresolved = (target: string) =>
      expect.objectContaining({ folder: "dangling", rule: "relative-links-resolve", message: expect.stringContaining(target) });
    expect(findings).toEqual([
      unresolved("missing.md"),
      unresolved("scripts/absent.sh"),
      unresolved("scripts/"),
      unresolved("../../elsewhere.md"),
      unresolved("nowhere.md"),
    ]);
  });
});

describe("this repository", () => {
  test("every skill under skills/ passes the structural check", () => {
    expect(checkSkills(here("../../skills/"))).toEqual([]);
  });
});
