import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

// The Agent Skills format the `skills` CLI installs from caps `description` at 1024 characters.
const DESCRIPTION_LIMIT = 1024;

export type Finding = { folder: string; rule: string; message: string };

// Walks every folder under `skillsDir` and returns one finding per broken rule.
// Findings, not throws, so a run reports every problem at once.
export function checkSkills(skillsDir: string): Finding[] {
  const findings: Finding[] = [];
  const folders = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders) {
    const fail = (rule: string, message: string) => findings.push({ folder, rule, message });
    const skillMd = join(skillsDir, folder, "SKILL.md");
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
      fail("description-within-limit", `${folder}/SKILL.md: description is empty`);
    } else if (description.length > DESCRIPTION_LIMIT) {
      fail("description-within-limit", `${folder}/SKILL.md: description is ${description.length} characters, limit is ${DESCRIPTION_LIMIT}`);
    }
    for (const target of relativeLinkTargets(markdown)) {
      if (!existsSync(join(skillsDir, folder, target))) {
        fail("relative-links-resolve", `${folder}/SKILL.md links to ${target}, which does not exist in the folder`);
      }
    }
  }
  return findings;
}

// The frontmatter is the YAML between the opening `---` on line one and the next `---` line.
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

// Targets of inline Markdown links, minus anything that is not a path in the folder:
// URLs with a scheme, and pure anchors. A fragment on a path is dropped before resolving.
function relativeLinkTargets(markdown: string): string[] {
  const targets: string[] = [];
  for (const [, target] of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
    const path = target.split("#")[0];
    if (path !== "") targets.push(path);
  }
  return targets;
}
