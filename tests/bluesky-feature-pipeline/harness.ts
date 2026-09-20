import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

export const TEMPLATES = fileURLToPath(new URL("../../skills/bluesky-feature-pipeline/templates/", import.meta.url));

// The token the install script replaces with the adopter's family-label prefix.
export const PLACEHOLDER = "{{FAMILY_PREFIX}}";

export type Template = { frontmatter: Record<string, unknown>; body: string; headings: string[] };

// Reads a template the way GitHub does: a YAML front-matter block, then the body that
// becomes the issue or PR text. `headings` are the body's `##` lines, which is the shape
// the workflows and the landing gate read.
export function readTemplate(path: string): Template {
  const text = readFileSync(join(TEMPLATES, path), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${path} has no front-matter block`);
  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  const body = match[2];
  const headings = body.split("\n").filter((line) => /^## /.test(line));
  return { frontmatter, body, headings };
}

export function readRaw(path: string): string {
  return readFileSync(join(TEMPLATES, path), "utf8");
}

// Every file under templates/, as relative paths, so a test can sweep them all.
export function allTemplateFiles(dir = TEMPLATES): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? allTemplateFiles(path) : [relative(TEMPLATES, path)];
  });
}
