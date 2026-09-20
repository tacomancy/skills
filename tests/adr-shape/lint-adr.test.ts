import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { adr, FixtureDir, SCRIPT, TEMPLATE } from "./harness";

describe("lint-adr.sh — a conforming ADR", () => {
  test("passes with no output", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr() });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 0, lines: [] });
  });
});

describe("the title line", () => {
  test("a number that disagrees with the file name fails, naming both", () => {
    const dir = new FixtureDir();
    dir.write({ "0002-store-raw.md": adr() });
    const run = dir.lint("0002-store-raw.md");
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/0002-store-raw\.md.*0001/)]);
  });

  test("a first line that is not `# NNNN: <sentence>` fails", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ title: "# Store raw values" }) });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 1, lines: [expect.stringContaining("title")] });
  });
});

describe("the status line", () => {
  test("a missing status fails, naming the status", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: null }) });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 1, lines: [expect.stringContaining("Status")] });
  });

  test("an unknown status word fails, quoting it", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: "**Status:** Approved" }) });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 1, lines: [expect.stringContaining("Approved")] });
  });

  test("Proposed without a gate fails", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: "**Status:** Proposed" }) });
    expect(dir.lint("0001-store-raw.md").status).toBe(1);
  });

  test("Proposed with a gate passes", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: "**Status:** Proposed — becomes Accepted when `prototype/roundtrip` passes the checklist in #108" }) });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 0, lines: [] });
  });

  test("a superseded ADR with no further edits passes", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: "**Status:** Superseded by 0004" }) });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 0, lines: [] });
  });

  test("a status line under a section fails, naming the section", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: null, updates: "## Update (2026-09-19)\n\n**Status:** Accepted" }) });
    const run = dir.lint("0001-store-raw.md");
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/Status.*## Update \(2026-09-19\)/)]);
  });

  test("Superseded by something other than a number fails", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ status: "**Status:** Superseded by the new plan" }) });
    expect(dir.lint("0001-store-raw.md").status).toBe(1);
  });
});

describe("sections", () => {
  const lintOne = (parts: Parameters<typeof adr>[0]) => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr(parts) });
    return dir.lint("0001-store-raw.md");
  };

  test("a missing lead paragraph fails", () => {
    expect(lintOne({ lead: null })).toMatchObject({ status: 1, lines: [expect.stringContaining("lead paragraph")] });
  });

  test("a missing required section fails, naming the section", () => {
    expect(lintOne({ decisions: null })).toMatchObject({ status: 1, lines: [expect.stringContaining("## Decisions")] });
  });

  test("sections out of order fail, naming the section", () => {
    const run = lintOne({
      decisions: "## Considered options\n\n- **Store both.** Rejected: twice the writes.",
      options: "## Decisions\n\n1. **Store raw.** Because tuning is then a code change.",
    });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/## Decisions.*order|order.*## Decisions/)]);
  });

  test("a section outside the shape fails, naming it", () => {
    expect(lintOne({ consequences: "## Rationale\n\nBecause.\n\n## Consequences\n\n- **+** fine." })).toMatchObject({
      status: 1,
      lines: [expect.stringContaining("## Rationale")],
    });
  });

  test("a dated Update after Consequences passes", () => {
    expect(lintOne({ updates: "## Update (2026-09-19)\n\nADR 0004 narrowed decision 2 to PDFs only." })).toMatchObject({ status: 0, lines: [] });
  });

  test("an Update above Consequences fails, naming it", () => {
    const run = lintOne({
      options: "## Update (2026-09-19)\n\nToo early.\n\n## Considered options\n\n- **Store both.** Rejected: twice the writes.",
    });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/## Update \(2026-09-19\).*## Consequences/)]);
  });

  test("a required section that appears twice fails, naming it", () => {
    const run = lintOne({ updates: "## Consequences\n\n- **+** again." });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/## Consequences.*twice|twice.*## Consequences/)]);
  });

  test("an Update that is not dated YYYY-MM-DD fails", () => {
    expect(lintOne({ updates: "## Update (dated)\n\nLater." })).toMatchObject({ status: 1, lines: [expect.stringContaining("## Update (dated)")] });
  });
});

describe("considered options", () => {
  const lintOne = (options: string) => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr({ options: "## Considered options\n\n" + options }) });
    return dir.lint("0001-store-raw.md");
  };

  test("an option bullet without a verdict fails, naming the option", () => {
    const run = lintOne("- **Store the normalised quote.** Every tuning becomes a migration.\n- **Store both.** Rejected: twice the writes.");
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringContaining("Store the normalised quote")]);
  });

  test("a verdict word that is not in the vocabulary fails", () => {
    expect(lintOne("- **The same engine on both sides.** Unnecessary: quads are user-space either way.").status).toBe(1);
  });

  test("a verdict on a wrapped continuation line passes", () => {
    expect(lintOne("- **Store both.**\n  Rejected: twice the writes for nothing gained.")).toMatchObject({ status: 0, lines: [] });
  });

  test("an option without a bold lead is named by its first words", () => {
    const run = lintOne("- Store the normalised quote, because it is faster to compare.");
    expect(run.lines).toEqual([expect.stringContaining("Store the normalised quote")]);
  });
});

describe("line endings", () => {
  test("a conforming ADR saved with CRLF endings passes", () => {
    const dir = new FixtureDir();
    dir.write({ "0001-store-raw.md": adr().replace(/\n/g, "\r\n") });
    expect(dir.lint("0001-store-raw.md")).toMatchObject({ status: 0, lines: [] });
  });
});

describe("the template", () => {
  test("with its placeholders filled, passes the lint", () => {
    const filled = readFileSync(TEMPLATE, "utf8")
      .replace(/<[^>]*>/g, "filled in")
      .replace("# NNNN:", "# 0001:")
      .replace("YYYY-MM-DD", "2026-09-20");
    const dir = new FixtureDir();
    dir.write({ "0001-filled-template.md": filled });
    expect(dir.lint("0001-filled-template.md")).toMatchObject({ status: 0, lines: [] });
  });
});

describe("the command line", () => {
  test("a directory lints every NNNN-*.md in it, one line per finding, each naming its file", () => {
    const dir = new FixtureDir();
    dir.write({
      "docs/adr/0000-template.md": readFileSync(TEMPLATE, "utf8"),
      "docs/adr/0001-store-raw.md": adr(),
      "docs/adr/0002-second.md": adr({ title: "# 0002: A second decision", status: null }),
    });
    const run = dir.lint("docs/adr");
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/^docs\/adr\/0002-second\.md: .*Status/)]);
  });

  test("a file the numbering cannot see fails by name", () => {
    const dir = new FixtureDir();
    dir.write({ "store-raw.md": adr() });
    expect(dir.lint("store-raw.md")).toMatchObject({ status: 1, lines: [expect.stringContaining("NNNN")] });
  });

  test("no arguments is a usage error, not a pass", () => {
    const dir = new FixtureDir();
    const result = spawnSync("bash", [SCRIPT], { cwd: dir.dir, encoding: "utf8" });
    expect(result.status).toBe(2);
  });
});

// Numbering is the rule guidance-tiers' check-guidance.sh applies to the same directory,
// so a repository running both gets one answer: four digits from 0000 (the template),
// no gap, no duplicate, every entry NNNN-*.md.
describe("numbering across a directory", () => {
  const withTemplate = (files: Record<string, string>) => {
    const dir = new FixtureDir();
    dir.write({ "docs/adr/0000-template.md": readFileSync(TEMPLATE, "utf8"), ...files });
    return dir.lint("docs/adr");
  };

  test("the template at 0000 and consecutive ADRs pass with no output", () => {
    expect(withTemplate({ "docs/adr/0001-store-raw.md": adr(), "docs/adr/0002-second.md": adr({ title: "# 0002: A second decision" }) })).toMatchObject({ status: 0, lines: [] });
  });

  test("a gap fails at the first missing number, naming the directory", () => {
    const run = withTemplate({ "docs/adr/0001-store-raw.md": adr(), "docs/adr/0003-third.md": adr({ title: "# 0003: A third decision" }) });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/^docs\/adr: .*gap.*0003.*0002/)]);
  });

  test("a missing template is a gap at 0000", () => {
    const dir = new FixtureDir();
    dir.write({ "docs/adr/0001-store-raw.md": adr() });
    const run = dir.lint("docs/adr");
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/^docs\/adr: .*gap.*0001.*0000/)]);
  });

  test("a duplicate number fails, naming it", () => {
    const run = withTemplate({ "docs/adr/0001-store-raw.md": adr(), "docs/adr/0001-store-cooked.md": adr() });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/^docs\/adr: .*duplicate.*0001/)]);
  });

  test("an entry not named NNNN-*.md fails by name", () => {
    const run = withTemplate({ "docs/adr/0001-store-raw.md": adr(), "docs/adr/README.md": "# ADRs\n" });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual([expect.stringMatching(/^docs\/adr\/README\.md: .*NNNN/)]);
  });

  test("directory findings and per-file findings come out in one run", () => {
    const run = withTemplate({ "docs/adr/0002-second.md": adr({ title: "# 0002: A second decision", status: null }) });
    expect(run.status).toBe(1);
    expect(run.lines).toEqual(expect.arrayContaining([expect.stringMatching(/^docs\/adr: .*gap/), expect.stringMatching(/^docs\/adr\/0002-second\.md: .*Status/)]));
    expect(run.lines).toHaveLength(2);
  });

  test("the template passed as a file on its own is linted like any file", () => {
    const dir = new FixtureDir();
    dir.write({ "0000-template.md": readFileSync(TEMPLATE, "utf8") });
    expect(dir.lint("0000-template.md").status).toBe(1);
  });
});
