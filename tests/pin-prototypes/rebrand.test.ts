import { describe, expect, test } from "vitest";
import { Fixture, fixture } from "./harness";

// The smallest export: one declaration in a style block, one in an inline style.
function page(styleBlock: string, inlineStyle: string, body = ""): string {
  return `<!doctype html>\n<html><head><style>\n${styleBlock}\n</style></head>\n<body><div style="${inlineStyle}"></div>${body}</body></html>\n`;
}

describe("rebrand.mjs — a total mapping", () => {
  test("known colours in inline styles and <style> blocks are substituted and the output equals the expected file", () => {
    const fx = new Fixture();
    fx.copy("01-inbox.html");
    fx.copy("mapping.json");
    const run = fx.rebrand("01-inbox.html");
    expect(run).toMatchObject({ status: 0 });
    expect(fx.read("out/01-inbox.html")).toBe(fixture("01-inbox.expected.html"));
  });

  test("an unknown colour exits non-zero and the message names colour, file, and line", () => {
    const fx = new Fixture();
    fx.write({ "02-thread.html": page("body { color: #111111; }", "background: #abcdef") });
    fx.mapping({ "#111111": "var(--ink)" });
    const run = fx.rebrand("02-thread.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("#abcdef");
    expect(run.output).toMatch(/02-thread\.html:5\b/);
  });

  test("the run is total or it is nothing: one unknown colour in the last file and no file is written", () => {
    const fx = new Fixture();
    fx.write({
      "01-inbox.html": page("body { color: #111111; }", "color: #111111"),
      "02-thread.html": page("body { color: #222222; }", ""),
    });
    fx.mapping({ "#111111": "var(--ink)" });
    const run = fx.rebrand("01-inbox.html", "02-thread.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("#222222");
    expect(run.output).toMatch(/02-thread\.html:3\b/);
    expect(fx.outputs()).toEqual([]);
  });

  test("#FFF, #ffffff, and rgb(255, 255, 255) map through one mapping entry", () => {
    const fx = new Fixture();
    fx.write({ "03.html": page("a { color: #FFF; } b { color: #ffffff; }", "background: rgb(255, 255, 255)") });
    fx.mapping({ "#ffffff": "var(--paper)" });
    expect(fx.rebrand("03.html").status).toBe(0);
    const out = fx.read("out/03.html");
    expect(out).toContain("a { color: var(--paper); } b { color: var(--paper); }");
    expect(out).toContain('style="background: var(--paper)"');
    expect(out).not.toMatch(/#fff|rgb\(/i);
  });

  test("a target that is a CSS variable reference is written verbatim", () => {
    const fx = new Fixture();
    fx.write({ "04.html": page("a { color: #123456; }", "color: #123456") });
    fx.mapping({ "#123456": "var(--accent, #0B3D91)" });
    expect(fx.rebrand("04.html").status).toBe(0);
    expect(fx.read("out/04.html").match(/var\(--accent, #0B3D91\)/g)).toHaveLength(2);
  });

  test("a hex in prose text content is untouched", () => {
    const fx = new Fixture();
    fx.write({ "05.html": page("a { color: #123456; }", "", "<p>Accent is #ABCDEF, not #123456.</p>") });
    fx.mapping({ "#123456": "var(--accent)" });
    expect(fx.rebrand("05.html").status).toBe(0);
    expect(fx.read("out/05.html")).toContain("<p>Accent is #ABCDEF, not #123456.</p>");
    expect(fx.read("out/05.html")).toContain("a { color: var(--accent); }");
  });

  test("an ID selector that happens to read as hex is not a colour", () => {
    const fx = new Fixture();
    fx.write({ "06.html": page("#bed { color: #123456; }\n#face:hover { color: #123456; }", "") });
    fx.mapping({ "#123456": "var(--accent)" });
    expect(fx.rebrand("06.html").status).toBe(0);
    expect(fx.read("out/06.html")).toContain("#bed { color: var(--accent); }\n#face:hover { color: var(--accent); }");
  });

  test("an rgb() form the script cannot read is an unknown colour, not a pass-through", () => {
    const fx = new Fixture();
    fx.write({ "07.html": page("a { color: rgb(100%, 0%, 0%); }", "") });
    fx.mapping({ "#ff0000": "var(--red)" });
    const run = fx.rebrand("07.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("rgb(100%, 0%, 0%)");
    expect(run.output).toMatch(/07\.html:3\b/);
    expect(fx.outputs()).toEqual([]);
  });
});

describe("rebrand.mjs — the mapping file", () => {
  test("a key that is not a normalised colour fails before any file is read", () => {
    const fx = new Fixture();
    fx.write({ "08.html": page("a { color: #fff; }", "") });
    fx.mapping({ "#FFF": "var(--paper)" });
    const run = fx.rebrand("08.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain('"#FFF"');
    expect(fx.outputs()).toEqual([]);
  });

  test("a mapping file without a `colours` object fails naming the file", () => {
    const fx = new Fixture();
    fx.write({ "09.html": page("", ""), "mapping.json": '{ "#ffffff": "var(--paper)" }\n' });
    const run = fx.rebrand("09.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("mapping.json");
    expect(run.output).toContain("colours");
  });

  test("missing flags print usage and exit 2", () => {
    const fx = new Fixture();
    const run = fx.rebrandWith(["a.html"]);
    expect(run.status).toBe(2);
    expect(run.output).toMatch(/usage/i);
  });
});
