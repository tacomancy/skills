#!/usr/bin/env node
// capture.mjs — render an exported HTML in headless Chromium and write a full-length PNG
// beside it, so a reader gets the whole surface without opening the HTML.
//
//   node capture.mjs <export.html> [--width <px>]
//
// The PNG takes the export's basename: `03-reader.html` → `03-reader.png`. Its width is,
// in order: `--width`; the width the export declares; 1528. A declared width that is not
// a positive integer is an error, never a default. Prints one line, `<png> <w>×<h>`.
//
// Runtime: Node ≥ 20 and the `playwright` package with its bundled Chromium, resolved from
// the directory the script is run in, then from the script's own location. An adopting
// project supplies both; `npx playwright install chromium` fetches the browser.
//
// Exit codes: 0 written; 1 the export is missing, declares a bad width, or cannot be
// rendered; 2 the command line is wrong.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_WIDTH = 1528;
// Any viewport height works: the screenshot is full page and grows with the document.
const VIEWPORT_HEIGHT = 1000;

const USAGE = "usage: node capture.mjs <export.html> [--width <px>]";

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  let file;
  let width;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--width") {
      const value = argv[++i];
      if (!/^[1-9]\d*$/.test(value ?? "")) fail(2, `--width takes a positive integer, got ${JSON.stringify(value ?? "")}\n${USAGE}`);
      width = Number(value);
    } else if (arg.startsWith("-")) {
      fail(2, `unknown option ${arg}\n${USAGE}`);
    } else if (file === undefined) {
      file = arg;
    } else {
      fail(2, `one export at a time\n${USAGE}`);
    }
  }
  if (file === undefined) fail(2, USAGE);
  return { file, width };
}

// The export declares its canvas as `{"$preview":{"width":N,…}}` in the `data-props` of its
// runtime script tag, HTML-entity-encoded. Read it by regular expression rather than by
// parsing the document: the export is not edited and the shape is the tool's, not ours.
function declaredWidth(html) {
  const props = /<script[^>]*\sdata-props="([^"]*)"/.exec(html);
  if (!props) return undefined;
  const json = props[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const preview = /"\$preview"\s*:\s*\{[^}]*"width"\s*:\s*("[^"]*"|[^,}\s]+)/.exec(json);
  if (!preview) return undefined;
  const raw = preview[1];
  const value = raw.startsWith('"') ? raw.slice(1, -1) : raw;
  if (!/^[1-9]\d*$/.test(value)) return new Error(`declared width is not a positive integer: ${value}`);
  return Number(value);
}

// The pinning agent's project owns Playwright, not the skill: look beside the caller first,
// then beside this file, so the same script works installed under `.agents/skills/`.
async function loadPlaywright() {
  for (const from of [join(process.cwd(), "noop.js"), import.meta.url]) {
    try {
      const path = createRequire(from).resolve("playwright");
      const module = await import(pathToFileURL(path).href);
      return module.default ?? module; // playwright is CommonJS; its exports arrive under `default`
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  fail(1, "playwright is not installed: add it to the project and run `npx playwright install chromium`");
}

const { file, width: flagWidth } = parseArgs(process.argv.slice(2));
const htmlPath = resolve(file);
if (!existsSync(htmlPath)) fail(1, `no such export: ${file}`);

const html = await readFile(htmlPath, "utf8");
const declared = declaredWidth(html);
if (declared instanceof Error) fail(1, `${file}: ${declared.message}`);
const width = flagWidth ?? declared ?? DEFAULT_WIDTH;

const pngPath = join(dirname(htmlPath), `${basename(htmlPath, extname(htmlPath))}.png`);
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width, height: VIEWPORT_HEIGHT }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  // Web fonts arrive after `load`; a capture before they settle reflows the text.
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log(`${basename(pngPath)} ${width}×${height}`);
} finally {
  await browser.close();
}
