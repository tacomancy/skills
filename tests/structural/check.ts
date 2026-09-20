import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

// Limits from the Agent Skills specification the `skills` CLI installs from.
const DESCRIPTION_LIMIT = 1024;

export type Rule =
  | "skill-md-exists"
  | "frontmatter-parses"
  | "name-equals-folder"
  | "description-non-empty"
  | "description-within-limit"
  | "relative-links-resolve";

export type Finding = { folder: string; rule: Rule; message: string };

// Findings, not throws, so one run reports every broken rule in every folder.
export function checkSkills(skillsDir: string): Finding[] {
  const findings: Finding[] = [];
  const folders = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders) {
    const fail = (rule: Rule, message: string) => findings.push({ folder, rule, message });
    const skillDir = join(skillsDir, folder);
    const skillMd = join(skillDir, "SKILL.md");
    if (!existsSync(skillMd)) {
      fail("skill-md-exists", `${folder}/SKILL.md is missing`);
      continue;
    }
    const markdown = readFileSync(skillMd, "utf8");
    const frontmatter = readFrontmatter(markdown);
    if (frontmatter instanceof Error) {
      fail("frontmatter-parses", `${folder}/SKILL.md: ${frontmatter.message}`);
      continue;
    }
    if (frontmatter.name !== folder) {
      fail("name-equals-folder", `${folder}/SKILL.md: name is ${JSON.stringify(frontmatter.name)}, folder is "${folder}"`);
    }
    const description = frontmatter.description;
    if (typeof description !== "string" || description.trim() === "") {
      fail("description-non-empty", `${folder}/SKILL.md: description is empty`);
    } else if (description.length > DESCRIPTION_LIMIT) {
      fail("description-within-limit", `${folder}/SKILL.md: description is ${description.length} characters, limit is ${DESCRIPTION_LIMIT}`);
    }
    for (const target of relativeLinkTargets(markdown)) {
      if (!isFileInside(skillDir, target)) {
        fail("relative-links-resolve", `${folder}/SKILL.md links to ${target}, which is not a file in the folder`);
      }
    }
  }
  return findings;
}

function readFrontmatter(markdown: string): Record<string, unknown> | Error {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(markdown);
  if (!match) return new Error("no frontmatter block at the top of the file");
  try {
    const parsed: unknown = parseYaml(match[1]);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return new Error("frontmatter is not a YAML mapping");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    return new Error(`frontmatter YAML does not parse: ${(error as Error).message}`);
  }
}

// Inline `[text](target "title")` links and reference definitions `[ref]: target`.
// URLs with a scheme and pure anchors are not paths; a fragment on a path is dropped.
function relativeLinkTargets(markdown: string): string[] {
  const targets: string[] = [];
  const inline = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const definition = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/gm;
  for (const pattern of [inline, definition]) {
    for (const [, target] of markdown.matchAll(pattern)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
      const path = target.split("#")[0];
      if (path !== "") targets.push(path);
    }
  }
  return targets;
}

// An install copies only the skill folder, so a link is good only when it lands on a
// file that the copy carries: inside the folder, and a file rather than a directory.
function isFileInside(dir: string, target: string): boolean {
  const path = resolve(dir, target);
  const inside = relative(resolve(dir), path);
  if (inside === "" || inside.startsWith("..")) return false;
  return existsSync(path) && statSync(path).isFile();
}
