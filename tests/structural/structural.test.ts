import { describe, expect, test } from "vitest";
import { checkSkills } from "./check";

const fixture = (name: string) => new URL(`./fixtures/${name}/skills/`, import.meta.url).pathname;

describe("structural check over a skills directory", () => {
  test("a conforming skill folder produces no findings", () => {
    expect(checkSkills(fixture("conforming"))).toEqual([]);
  });
});

describe("each rule fails naming the folder and the rule", () => {
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
    expect(checkSkills(fixture("bad-description"))).toEqual([
      expect.objectContaining({ folder: "empty-description", rule: "description-within-limit" }),
      expect.objectContaining({ folder: "long-description", rule: "description-within-limit" }),
    ]);
  });
});

describe("relative links", () => {
  test("a relative link to a file that does not exist fails, naming the target; URLs and anchors are ignored", () => {
    const findings = checkSkills(fixture("broken-link"));
    expect(findings).toEqual([
      expect.objectContaining({ folder: "dangling", rule: "relative-links-resolve", message: expect.stringContaining("missing.md") }),
      expect.objectContaining({ folder: "dangling", rule: "relative-links-resolve", message: expect.stringContaining("scripts/absent.sh") }),
    ]);
  });
});

describe("this repository", () => {
  test("every skill under skills/ passes the structural check", () => {
    expect(checkSkills(new URL("../../skills/", import.meta.url).pathname)).toEqual([]);
  });
});
