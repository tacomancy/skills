import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../skills/pin-prototypes/capture.mjs", import.meta.url));

// Chromium launches once per run; generous so a cold CI runner does not fail on time alone.
const LAUNCH_TIMEOUT = 60_000;

type Run = { status: number; output: string };

// Drives the script the way a pinning agent would: from some directory, with the
// export's path and any flags, reading exit code and the one line it prints.
function capture(cwd: string, ...args: string[]): Run {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
  return { status: result.status ?? -1, output: result.stdout + result.stderr };
}

// An export the way the design tool writes it, with the declared width where the tool puts
// it. `TALL` stacks fixed-height blocks so the page is taller than any viewport.
const TALL = Array.from({ length: 12 }, (_, i) => `<div style="height:400px;background:${i % 2 ? "#123" : "#eee"}"></div>`).join("\n");

function exportHtml(body: string, props?: Record<string, unknown>): string {
  const declared = props ? ` data-props="${JSON.stringify(props).replace(/"/g, "&quot;")}"` : "";
  return `<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head><body>\n${body}\n<script type="text/x-dc" data-dc-script${declared}>\n</script>\n</body></html>\n`;
}

function fixture(name: string, html: string): { dir: string; htmlPath: string; pngPath: string } {
  const dir = mkdtempSync(join(tmpdir(), "pin-prototypes-"));
  const htmlPath = join(dir, `${name}.html`);
  writeFileSync(htmlPath, html);
  return { dir, htmlPath, pngPath: join(dir, `${name}.png`) };
}

// Width and height from the PNG header, so the test reads the file the way any image viewer
// would rather than trusting the script's report of it.
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("capture.mjs — a full-page PNG beside the export", () => {
  test(
    "a tall layout with a declared width is captured at that width, full page",
    () => {
      const f = fixture("03-reader", exportHtml(TALL, { $preview: { width: 1200, height: 800 } }));
      const run = capture(f.dir, "03-reader.html");
      expect(run).toMatchObject({ status: 0 });
      expect(run.output.trim()).toBe(`03-reader.png 1200×${pngSize(f.pngPath).height}`);
      expect(existsSync(f.pngPath)).toBe(true);
      const size = pngSize(f.pngPath);
      expect(size.width).toBe(1200);
      expect(size.height).toBeGreaterThan(800);
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "an export that declares no width is captured at 1528 px",
    () => {
      const f = fixture("01-inbox", exportHtml(TALL));
      expect(capture(f.dir, f.htmlPath)).toMatchObject({ status: 0 });
      expect(pngSize(f.pngPath).width).toBe(1528);
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "--width overrides the declared width",
    () => {
      const f = fixture("02-map", exportHtml(TALL, { $preview: { width: 1200 } }));
      expect(capture(f.dir, "02-map.html", "--width", "900")).toMatchObject({ status: 0 });
      expect(pngSize(f.pngPath).width).toBe(900);
    },
    LAUNCH_TIMEOUT,
  );
});

describe("capture.mjs — failures", () => {
  test("no export path is a usage error", () => {
    const run = capture(tmpdir());
    expect(run.status).toBe(2);
    expect(run.output).toMatch(/usage/i);
  });

  test("an export that does not exist fails naming the path", () => {
    const run = capture(tmpdir(), "missing.html");
    expect(run.status).toBe(1);
    expect(run.output).toContain("missing.html");
  });

  test("a declared width that is not a positive integer fails rather than defaulting", () => {
    const f = fixture("04-odd", exportHtml(TALL, { $preview: { width: "wide" } }));
    const run = capture(f.dir, "04-odd.html");
    expect(run.status).toBe(1);
    expect(run.output).toContain("wide");
    expect(existsSync(f.pngPath)).toBe(false);
  });

  test("a --width that is not a positive integer fails", () => {
    const f = fixture("05-flag", exportHtml(TALL));
    expect(capture(f.dir, "05-flag.html", "--width", "0")).toMatchObject({ status: 2 });
    expect(capture(f.dir, "05-flag.html", "--width", "abc")).toMatchObject({ status: 2 });
    expect(existsSync(f.pngPath)).toBe(false);
  });
});
