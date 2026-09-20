import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { allTemplateFiles, readRaw, tokensIn } from "./harness";

// This repository adopted its own pipeline: every template is installed under .github/,
// identical to the template except where a token was substituted. A template that moves
// without its installed copy, or a copy edited by hand, shows here.

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const installed = (path: string) => readFileSync(`${REPO}.github/${path}`, "utf8");

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("the installed copies under .github/", () => {
  const files = allTemplateFiles().filter((path) => path !== "README.md");

  test.each(files)("%s differs from its template only at substituted tokens", (path) => {
    const template = readRaw(path);
    // Each token becomes a capture of anything but a line break, so a value the install
    // script wrote reads as the token's substitution and nothing else does.
    const source = [...new Set(tokensIn(template))].reduce((s, token) => s.replaceAll(escape(token), "[^\\n]*"), escape(template));
    expect(installed(path)).toMatch(new RegExp(`^${source}$`));
    expect(tokensIn(installed(path))).toEqual([]);
  });

  // The one trigger a path can express here: every SKILL.md may change its description line.
  test("post-merge-trigger-check.yml carries the site-description trigger on every SKILL.md", () => {
    const yaml = parseYaml(installed("workflows/post-merge-trigger-check.yml")) as { jobs: Record<string, { steps: { env?: Record<string, string> }[] }> };
    const env = Object.values(yaml.jobs)[0].steps[1].env ?? {};
    expect(env.POST_MERGE_TRIGGERS).toBe("site-description: skills/*/SKILL.md");
  });
});
