#!/usr/bin/env node
// The rebrand step of the pin-prototypes skill: maps every colour literal in a set of
// exported HTML files onto a project's palette and writes the results to an output
// directory. The mapping is total — a colour the mapping does not know fails the run,
// and a failed run writes nothing — because the alternative is a build that silently
// ships the design tool's palette. Node only, no dependencies, so the adopting project's
// build can call it wherever it already has Node.
//
// Usage: node rebrand.mjs --mapping FILE --out DIR EXPORT.html...
//   --mapping FILE   JSON: { "colours": { "<normalised colour>": "<target>" } }. A key is
//                    lowercase hex, six digits or eight with alpha. A target is written
//                    verbatim: a hex, or a CSS variable reference such as var(--ink).
//   --out DIR        where the rebranded copies go, each under its export's basename
//
// A colour literal is a hex (#rgb, #rgba, #rrggbb, #rrggbbaa) or an rgb()/rgba() form in
// a declaration value inside a <style> block or an inline style attribute. Text content,
// other attributes, and selectors are not colours and are left alone.
//
// Exit codes: 0 every file written; 1 an unknown colour; 2 usage or a bad mapping file.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const KEY = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/;

function fail(code, message) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exit(code);
}

function usage(message) {
  process.stderr.write(`${message}\nusage: node rebrand.mjs --mapping FILE --out DIR EXPORT.html...\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { mapping: undefined, out: undefined, files: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mapping") args.mapping = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i].startsWith("--")) usage(`unknown flag: ${argv[i]}`);
    else args.files.push(argv[i]);
  }
  if (!args.mapping) usage("--mapping is required");
  if (!args.out) usage("--out is required");
  if (args.files.length === 0) usage("at least one export is required");
  return args;
}

// Keys are validated up front so a mis-cased key surfaces as a mapping error, not as an
// unknown colour in some export that the run then blames.
function loadMapping(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(2, `${path}: ${error.message}`);
  }
  const colours = parsed?.colours;
  if (typeof colours !== "object" || colours === null || Array.isArray(colours)) {
    fail(2, `${path}: expected a "colours" object holding the colour-to-target entries`);
  }
  for (const [key, target] of Object.entries(colours)) {
    if (!KEY.test(key)) fail(2, `${path}: mapping key ${JSON.stringify(key)} is not a normalised colour (lowercase six- or eight-digit hex)`);
    if (typeof target !== "string" || target === "") fail(2, `${path}: target for ${key} is not a non-empty string`);
  }
  return colours;
}

const hex2 = (n) => n.toString(16).padStart(2, "0");

// The one key every spelling of a colour reduces to, or null when the text is not a
// colour the script can read — which the caller reports rather than passes through.
function normalise(literal) {
  if (literal.startsWith("#")) {
    const digits = literal.slice(1).toLowerCase();
    if (!/^[0-9a-f]+$/.test(digits)) return null;
    if (digits.length === 6 || digits.length === 8) return `#${digits}`;
    if (digits.length === 3 || digits.length === 4) return `#${[...digits].map((d) => d + d).join("")}`;
    return null;
  }
  const m = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*(\d*\.?\d+)(%?)\s*)?\)$/i.exec(literal);
  if (!m) return null;
  const channels = [m[1], m[2], m[3]].map(Number);
  if (channels.some((c) => c > 255)) return null;
  let out = `#${channels.map(hex2).join("")}`;
  if (m[4] !== undefined) {
    const alpha = m[5] === "%" ? Number(m[4]) / 100 : Number(m[4]);
    if (alpha > 1) return null;
    out += hex2(Math.round(alpha * 255));
  }
  return out;
}

// Candidate literals inside a run of CSS value text. A hex grabs every word character
// after it so that `#abcdefg` is reported as unreadable rather than split into a colour
// and a stray letter.
const LITERAL = /#[0-9a-z_-]+|rgba?\([^)]*\)/gi;

// Declaration values only: from a colon to the `;` or `}` that ends it, with no brace in
// between. That skips selectors (`#bed {`, `a:hover {`) and at-rule preludes.
const VALUE = /:([^;{}]*)(?=[;}])/g;

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
const STYLE_ATTR = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

// CSS comments blanked in place so offsets still line up with the source.
function blankComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
}

function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// Returns the rebranded document, or throws { literal, key, line } at the first colour
// the mapping does not know.
function rebrand(html, colours) {
  const edits = [];
  const scan = (text, base) => {
    for (const m of text.matchAll(LITERAL)) {
      const key = normalise(m[0]);
      const at = base + m.index;
      if (key === null || !(key in colours)) throw { literal: m[0], key, line: lineAt(html, at) };
      edits.push({ start: at, end: at + m[0].length, target: colours[key] });
    }
  };
  for (const block of html.matchAll(STYLE_BLOCK)) {
    const open = /^<style\b[^>]*>/i.exec(block[0])[0].length;
    const css = blankComments(block[1]);
    for (const value of css.matchAll(VALUE)) scan(value[1], block.index + open + value.index + 1);
  }
  for (const attr of html.matchAll(STYLE_ATTR)) {
    const value = attr[1] ?? attr[2];
    scan(value, attr.index + attr[0].length - value.length - 1);
  }
  edits.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const edit of edits) {
    out += html.slice(cursor, edit.start) + edit.target;
    cursor = edit.end;
  }
  return out + html.slice(cursor);
}

const args = parseArgs(process.argv.slice(2));
const colours = loadMapping(args.mapping);

const seen = new Set();
const written = [];
for (const file of args.files) {
  const name = basename(file);
  if (seen.has(name)) fail(2, `two exports share the basename ${name}; they would overwrite each other in ${args.out}`);
  seen.add(name);
  const html = readFileSync(file, "utf8");
  try {
    written.push({ path: join(args.out, name), html: rebrand(html, colours) });
  } catch (error) {
    if (!("literal" in error)) throw error;
    const because = error.key === null ? "is not a colour the script can read" : `normalises to ${error.key}, which the mapping does not know`;
    fail(1, `${file}:${error.line}: unknown colour ${error.literal} — ${because}`);
  }
}

mkdirSync(args.out, { recursive: true });
for (const { path, html } of written) {
  writeFileSync(path, html);
  process.stdout.write(`wrote ${path}\n`);
}
