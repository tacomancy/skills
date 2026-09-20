import { describe, expect, test } from "vitest";
import { allTemplateFiles, PLACEHOLDER, readRaw, readTemplate, type Template } from "./harness";

describe("ticket template", () => {
  // The four sections `to-tickets` publishes, in its order, so a hand-made ticket reads
  // to the workflows and `land-ticket` the same as a generated one.
  test("body is section-for-section the to-tickets issue template", () => {
    const ticket = readTemplate("ISSUE_TEMPLATE/ticket.md");
    expect(ticket.headings).toEqual(["## Parent", "## What to build", "## Acceptance criteria", "## Blocked by"]);
  });
});

describe("stub template", () => {
  const stub = () => readTemplate("ISSUE_TEMPLATE/spec-stub.md");

  test("opens the beat as a spec awaiting its grill", () => {
    expect(labelsOf(stub())).toEqual(expect.arrayContaining(["spec", "spec:needs-grilling"]));
  });

  test("names the family label with the placeholder, so the filer adds it at open", () => {
    expect(stub().body).toContain(`${PLACEHOLDER}/`);
  });

  test("body asks for the brief, the scope, and the ready criteria; the beat name is the title", () => {
    expect(stub().headings).toEqual(["## Brief", "## Scope", "## Ready for tickets when"]);
    expect(stub().frontmatter.title).toMatch(/^spec: /);
  });
});

// GitHub accepts `labels` as a list or a comma-separated string; the tests read both.
function labelsOf(template: Template): string[] {
  const labels = template.frontmatter.labels;
  return Array.isArray(labels) ? labels.map(String) : String(labels).split(",").map((l) => l.trim());
}

describe("PR template", () => {
  const pr = () => readRaw("pull_request_template.md");

  // The first line a reader sees, once the filer's comments are gone, is the closing keyword.
  test("opens with the closing keyword naming the ticket", () => {
    const rendered = pr().replace(/<!--[\s\S]*?-->/g, "");
    expect(rendered.split("\n").find((line) => line.trim() !== "")).toMatch(/^Closes #/);
  });

  test("asks for the review's result and declined findings in the body, under the heading the landing gate reads", () => {
    const body = pr();
    expect(body).toContain("## Code review");
    expect(body).toMatch(/declined/i);
  });

  test("carries the one-ticket rule", () => {
    expect(pr()).toMatch(/other ticket/i);
  });

  // A self-posted status is unenforceable and an update-branch orphans it; the review lives in the body.
  test("posts no commit status", () => {
    expect(pr()).not.toMatch(/gh api|\/statuses\/|state=success/);
  });
});

describe("placeholders", () => {
  const files = allTemplateFiles().filter((path) => path !== "README.md");

  test("the family prefix is the only substitution point, in every template", () => {
    for (const path of files) {
      const tokens = readRaw(path).match(/\{\{[^}]*\}\}/g) ?? [];
      expect(tokens.every((token) => token === PLACEHOLDER), `${path} has ${tokens.join(", ")}`).toBe(true);
    }
  });

  // The prefix carries no trailing slash; the template supplies the `/` before the beat.
  test("every occurrence is followed by a slash, so the substituted prefix reads as a family label", () => {
    for (const path of files) {
      const text = readRaw(path);
      let index = text.indexOf(PLACEHOLDER);
      while (index !== -1) {
        expect(text[index + PLACEHOLDER.length], `${path} at ${index}`).toBe("/");
        index = text.indexOf(PLACEHOLDER, index + 1);
      }
    }
  });

  test("substituting the prefix leaves nothing for a second run to change", () => {
    for (const path of files) {
      expect(readRaw(path).replaceAll(PLACEHOLDER, "skill")).not.toMatch(/\{\{|\}\}/);
    }
  });

  test("the contract is documented beside the templates", () => {
    expect(readRaw("README.md")).toContain(PLACEHOLDER);
  });
});

describe("issue templates", () => {
  // GitHub lists a markdown template in the chooser only with both fields.
  test.each(["ISSUE_TEMPLATE/ticket.md", "ISSUE_TEMPLATE/spec-stub.md"])("%s has the name and about GitHub requires", (path) => {
    const { frontmatter } = readTemplate(path);
    expect(frontmatter.name).toEqual(expect.any(String));
    expect(frontmatter.about).toEqual(expect.any(String));
  });
});
