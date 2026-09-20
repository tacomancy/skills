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

  test("a url(#id) reference and a commented-out colour are not colours", () => {
    const fx = new Fixture();
    fx.write({ "10.html": page(".a { fill: url(#paint0); color: #123456; /* was #999999 */ }", "fill:url(#a1b2c3);color:#123456") });
    fx.mapping({ "#123456": "var(--accent)" });
    expect(fx.rebrand("10.html").status).toBe(0);
    const out = fx.read("out/10.html");
    expect(out).toContain(".a { fill: url(#paint0); color: var(--accent); /* was #999999 */ }");
    expect(out).toContain('style="fill:url(#a1b2c3);color:var(--accent)"');
  });

  test("an unquoted style attribute is mapped like a quoted one", () => {
    const fx = new Fixture();
    fx.write({ "11.html": "<div style=color:#123456></div>\n<div style=color:#abcdef></div>\n" });
    fx.mapping({ "#123456": "var(--accent)" });
    const run = fx.rebrand("11.html");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("#abcdef");
    expect(run.output).toMatch(/11\.html:2\b/);
    fx.mapping({ "#123456": "var(--accent)", "#abcdef": "var(--sky)" });
    expect(fx.rebrand("11.html").status).toBe(0);
    expect(fx.read("out/11.html")).toBe("<div style=color:var(--accent)></div>\n<div style=color:var(--sky)></div>\n");
  });
});

describe("rebrand.mjs — the flags", () => {
  test("an --out that would overwrite an export refuses and writes nothing", () => {
    const fx = new Fixture();
    fx.write({ "exports/12.html": page("a { color: #123456; }", "") });
    fx.mapping({ "#123456": "var(--accent)" });
    const run = fx.rebrandWith(["--mapping", "mapping.json", "--out", "exports", "exports/12.html"]);
    expect(run.status).toBe(2);
    expect(run.output).toContain("exports/12.html");
    expect(fx.read("exports/12.html")).toContain("#123456");
    // The same directory reached by another spelling of its path is still the same directory.
    expect(fx.rebrandWith(["--mapping", "mapping.json", "--out", "./exports/../exports/", "exports/12.html"]).status).toBe(2);
  });

  test("an export that cannot be read is a FAIL line naming it, not a stack trace", () => {
    const fx = new Fixture();
    fx.mapping({});
    const run = fx.rebrand("missing.html");
    expect(run.status).toBe(2);
    expect(run.lines).toEqual([expect.stringMatching(/^FAIL: missing\.html/)]);
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

describe("rebrand.mjs — SVG attributes", () => {
  test("fill and stroke attributes are substituted like any other colour literal", () => {
    const fx = new Fixture();
    fx.write({
      "13.html": page("", "", '<svg><path fill="#123456" stroke=\'rgb(255, 255, 255)\' d="M0 0"/><circle fill=none stroke="url(#g)"/><stop stop-color="#FFF"/></svg>'),
    });
    fx.mapping({ "#123456": "var(--accent)", "#ffffff": "var(--paper)" });
    expect(fx.rebrand("13.html").status).toBe(0);
    expect(fx.read("out/13.html")).toContain(
      '<svg><path fill="var(--accent)" stroke=\'var(--paper)\' d="M0 0"/><circle fill=none stroke="url(#g)"/><stop stop-color="var(--paper)"/></svg>',
    );
  });

  test("an unknown colour in a fill attribute fails naming colour, file, and line", () => {
    const fx = new Fixture();
    fx.write({ "14.html": page("", "", '\n<svg>\n<rect fill="#ABCDEF"/>\n</svg>') });
    fx.mapping({});
    const run = fx.rebrand("14.html");
    expect(run.status).toBe(1);
    expect(run.output).toContain("#ABCDEF");
    expect(run.output).toMatch(/14\.html:7\b/);
    expect(fx.outputs()).toEqual([]);
  });
});

describe("rebrand.mjs — alpha", () => {
  test("an eight-digit colour is its own key, separate from its six-digit form", () => {
    const fx = new Fixture();
    fx.write({ "15.html": page("a { color: #1A1A1A; box-shadow: 0 1px rgba(26, 26, 26, 0.12); }", "border-color: #1a1a1a1F") });
    fx.mapping({ "#1a1a1a": "var(--ink)" });
    const run = fx.rebrand("15.html");
    expect(run.status).toBe(1);
    expect(run.output).toContain("rgba(26, 26, 26, 0.12)");
    expect(run.output).toContain("#1a1a1a1f");
    fx.mapping({ "#1a1a1a": "var(--ink)", "#1a1a1a1f": "var(--shadow)" });
    expect(fx.rebrand("15.html").status).toBe(0);
    const out = fx.read("out/15.html");
    expect(out).toContain("a { color: var(--ink); box-shadow: 0 1px var(--shadow); }");
    expect(out).toContain('style="border-color: var(--shadow)"');
  });
});

describe("rebrand.mjs — idempotency", () => {
  const mapping = { "#123456": "#0b3d91", "#ffffff": "var(--paper, #FAFAF8)", "#1a1a1a": "var(--ink)" };

  test("running the script over its own output produces byte-identical files", () => {
    const fx = new Fixture();
    fx.write({ "16.html": page("a { color: #123456; background: #FFF; }", "color: #1a1a1a", '<svg><path fill="#123456" stroke="rgb(255,255,255)"/></svg>') });
    fx.mapping(mapping);
    expect(fx.rebrand("16.html").status).toBe(0);
    const first = fx.read("out/16.html");
    expect(first).toContain("a { color: #0b3d91; background: var(--paper, #FAFAF8); }");
    const again = fx.rebrandWith(["--mapping", "mapping.json", "--out", "out2", "out/16.html"]);
    expect(again).toMatchObject({ status: 0 });
    expect(fx.read("out2/16.html")).toBe(first);
  });

  test("a colour that is a mapping value passes through unchanged, in any spelling", () => {
    const fx = new Fixture();
    fx.write({ "17.html": page("a { color: #0B3D91; } b { color: rgb(11, 61, 145); }", "") });
    fx.mapping(mapping);
    expect(fx.rebrand("17.html").status).toBe(0);
    expect(fx.read("out/17.html")).toContain("a { color: #0B3D91; } b { color: rgb(11, 61, 145); }");
  });

  test("a colour that is neither a key nor a value still fails the run", () => {
    const fx = new Fixture();
    fx.write({ "18.html": page("a { color: #0b3d91; } b { color: #0b3d92; }", "") });
    fx.mapping(mapping);
    const run = fx.rebrand("18.html");
    expect(run.status).toBe(1);
    expect(run.output).toContain("#0b3d92");
    expect(fx.outputs()).toEqual([]);
  });

  test("a target that is also a key is rejected, since a second run would map it again", () => {
    const fx = new Fixture();
    fx.write({ "19.html": page("a { color: #123456; }", "") });
    fx.mapping({ "#123456": "#ABCDEF", "#abcdef": "var(--sky)" });
    const run = fx.rebrand("19.html");
    expect(run.status).toBe(2);
    expect(run.output).toContain("mapping.json");
    expect(run.output).toContain("#123456");
    expect(fx.outputs()).toEqual([]);
  });
});

describe("rebrand.mjs — the pre-pass hook", () => {
  // A hook in the shape the contract states: HTML on stdin, the export's path as its one
  // argument, the HTML to map on stdout. This one is Vitrine's role rule: filled buttons
  // take the accent, whatever grey the tool gave them.
  const hook = `
    let html = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (html += chunk));
    process.stdin.on("end", () => {
      html = html.replace(/(class="btn"[^>]*background:)#eeeeee/g, "$1#2d5be3");
      process.stdout.write(html + "<!-- hooked " + process.argv[2] + " -->\\n");
    });
  `;

  test("a hook named in the mapping runs before substitution and its output is what gets mapped", () => {
    const fx = new Fixture();
    fx.write({
      "20.html": page("", "", '<button class="btn" style="background:#eeeeee;color:#111111">Send</button>'),
      "design/hook.mjs": hook,
    });
    // The hook's path is relative to the mapping file, and the grey it removes is not in the mapping.
    fx.mapping({ "#2d5be3": "var(--sapphire)", "#111111": "var(--ink)" }, "design/mapping.json", { hook: "hook.mjs" });
    const run = fx.rebrandWith(["--mapping", "design/mapping.json", "--out", "out", "20.html"]);
    expect(run).toMatchObject({ status: 0 });
    const out = fx.read("out/20.html");
    expect(out).toContain('<button class="btn" style="background:var(--sapphire);color:var(--ink)">Send</button>');
    expect(out).toContain("<!-- hooked 20.html -->");
  });

  test("a hook that exits non-zero fails the run naming the hook, and nothing is written", () => {
    const fx = new Fixture();
    fx.write({
      "21.html": page("a { color: #111111; }", ""),
      "hook.mjs": 'process.stderr.write("no role for this surface\\n"); process.exit(3);',
    });
    fx.mapping({ "#111111": "var(--ink)" }, "mapping.json", { hook: "hook.mjs" });
    const run = fx.rebrand("21.html");
    expect(run.status).toBe(2);
    expect(run.output).toContain("hook.mjs");
    expect(run.output).toContain("no role for this surface");
    expect(fx.outputs()).toEqual([]);
  });

  test("a hook that cannot be found is a mapping error", () => {
    const fx = new Fixture();
    fx.write({ "22.html": page("", "") });
    fx.mapping({}, "mapping.json", { hook: "missing.mjs" });
    const run = fx.rebrand("22.html");
    expect(run.status).toBe(2);
    expect(run.output).toContain("missing.mjs");
    expect(fx.outputs()).toEqual([]);
  });
});
