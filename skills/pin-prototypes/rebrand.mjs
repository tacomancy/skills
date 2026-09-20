#!/usr/bin/env node
// The rebrand step of the pin-prototypes skill: maps every colour literal in a set of
// exported HTML files onto a project's palette and writes the results to an output
// directory. The mapping is total — a colour the mapping does not know fails the run,
// and a failed run writes nothing — because the alternative is a build that silently
// ships the design tool's palette. Node only, no dependencies, so the adopting project's
// build can call it wherever it already has Node.
//
// Usage: node rebrand.mjs --mapping FILE --out DIR EXPORT.html...
//   --mapping FILE   JSON: { "colours": { "<normalised colour>": "<target>" }, "hook"?: PATH }.
//                    A key is lowercase hex, six digits or eight with alpha; a colour with
//                    alpha is its own key. A target is written verbatim: a hex, or a CSS
//                    variable reference such as var(--ink). A target may not itself be a
//                    key. "hook" is a Node script, relative to this file, run over each
//                    export before substitution: the export's HTML on stdin, its path as
//                    the one argument, the HTML to map on stdout; a non-zero exit fails
//                    the run. It is where a project's role rules live (filled buttons take
//                    the accent); the mapping then only needs to know what the hook emits.
//   --out DIR        where the rebranded copies go, each under its export's basename
//
// A colour literal is a hex (#rgb, #rgba, #rrggbb, #rrggbbaa) or an rgb()/rgba() form in
// a declaration value inside a <style> block or an inline style attribute, or the value
// of an SVG fill, stroke, or stop-color attribute. Text content, other attributes,
// selectors, url(...) and var(...) arguments are not colours and are left alone.
//
// The run is idempotent: a colour that is a mapping value is already in the target
// palette and passes through unchanged, so a run over its own output writes the same
// bytes, provided the hook is a no-op over its own output too. Anything that is neither
// a key nor a value still fails.
//
// Exit codes: 0 every file written; 1 an unknown colour; 2 usage, a bad mapping file, a
// hook that fails, an export that cannot be read, or an --out that would overwrite an
// export.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

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
  // A run over its own output must change nothing, so a target that is itself a key —
  // one a second run would map again — is a mapping error, not a chain to follow.
  const values = new Set();
  for (const [key, target] of Object.entries(colours)) {
    const value = normalise(target);
    if (value === null) continue;
    if (value !== key && value in colours) fail(2, `${path}: target ${target} of ${key} is also a key; a rerun over the output would map it again`);
    values.add(value);
  }
  // The hook lives with the mapping, so its path is read from the mapping's directory
  // rather than from wherever the build happens to run.
  let hook = parsed.hook;
  if (hook !== undefined) {
    if (typeof hook !== "string" || hook === "") fail(2, `${path}: "hook" must be a script path`);
    hook = resolve(dirname(path), hook);
    if (!existsSync(hook)) fail(2, `${path}: hook ${parsed.hook} not found at ${hook}`);
  }
  return { colours, values, hook };
}

// The pre-pass: the hook gets the export's HTML on stdin and its path as the one
// argument, and prints the HTML to map. It runs under the same Node as this script so a
// project ships one file with no interpreter to find.
function prepass(hook, file, html) {
  const result = spawnSync(process.execPath, [hook, file], { input: html, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error) fail(2, `hook ${hook}: ${result.error.message}`);
  if (result.status !== 0) fail(2, `hook ${hook} exited ${result.status} on ${file}\n${result.stderr}`);
  return result.stdout;
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
// A style attribute is scanned as declarations; an SVG paint attribute is one value with
// no property name, so the whole of it is the value. `none`, `currentColor`, and a named
// colour are not literals and pass through, as they do in a declaration.
const STYLE_ATTR = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const PAINT_ATTR = /\s(?:fill|stroke|stop-color)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

// CSS comments, url(...) and var(...) blanked in place, so a commented-out colour, a
// fragment reference such as url(#paint0), or the fallback in var(--ink, #1a1a1a) is not
// read as a colour, and offsets still line up with the source. var() is walked to its
// matching paren because a fallback may itself hold parentheses: var(--x, rgb(1, 2, 3)).
function blankNonColours(css) {
  let out = css.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
  const FUNCTION = /\b(?:url|var)\(/gi;
  let m;
  while ((m = FUNCTION.exec(out)) !== null) {
    let depth = 1;
    let end = m.index + m[0].length;
    while (end < out.length && depth > 0) {
      if (out[end] === "(") depth++;
      else if (out[end] === ")") depth--;
      end++;
    }
    out = out.slice(0, m.index) + " ".repeat(end - m.index) + out.slice(end);
    FUNCTION.lastIndex = end;
  }
  return out;
}

function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// Returns the rebranded document, or throws { literal, key, line } at the first colour
// the mapping does not know. A colour that is a mapping value is already in the target
// palette — it is what the previous run wrote — and passes through as it stands.
function rebrand(html, { colours, values }) {
  const edits = [];
  const scan = (text, base) => {
    for (const m of text.matchAll(LITERAL)) {
      const key = normalise(m[0]);
      const at = base + m.index;
      if (key !== null && !(key in colours) && values.has(key)) continue;
      if (key === null || !(key in colours)) throw { literal: m[0], key, line: lineAt(html, at) };
      edits.push({ start: at, end: at + m[0].length, target: colours[key] });
    }
  };
  for (const block of html.matchAll(STYLE_BLOCK)) {
    const open = /^<style\b[^>]*>/i.exec(block[0])[0].length;
    const css = blankNonColours(block[1]);
    for (const value of css.matchAll(VALUE)) scan(value[1], block.index + open + value.index + 1);
  }
  for (const pattern of [STYLE_ATTR, PAINT_ATTR]) {
    for (const attr of html.matchAll(pattern)) {
      const value = attr[1] ?? attr[2] ?? attr[3];
      const closingQuote = attr[3] === undefined ? 1 : 0;
      scan(blankNonColours(value), attr.index + attr[0].length - value.length - closingQuote);
    }
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

// The native realpath is the one that reports the on-disk casing, which the portable
// implementation does not.
function sameDirectory(a, b) {
  return existsSync(a) && existsSync(b) && realpathSync.native(a) === realpathSync.native(b);
}

const args = parseArgs(process.argv.slice(2));
const mapping = loadMapping(args.mapping);

const seen = new Set();
const written = [];
for (const file of args.files) {
  const name = basename(file);
  if (seen.has(name)) fail(2, `two exports share the basename ${name}; they would overwrite each other in ${args.out}`);
  seen.add(name);
  const path = join(args.out, name);
  // The exports are frozen; a run that would write one back over itself is a mistake in
  // the flags, not a rebrand. Real paths, so a case-insensitive filesystem cannot let
  // `--out Exports` through for `exports/`.
  if (sameDirectory(args.out, dirname(file))) fail(2, `${file} would be overwritten by its own rebrand; --out must be another directory`);
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch (error) {
    fail(2, `${file}: ${error.message}`);
  }
  if (mapping.hook) html = prepass(mapping.hook, file, html);
  try {
    written.push({ path, html: rebrand(html, mapping) });
  } catch (error) {
    if (!("literal" in error)) throw error;
    const because = error.key === null ? "is not a colour the script can read" : `normalises to ${error.key}, which the mapping does not know`;
    const where = mapping.hook ? " (line counted in the hook's output)" : "";
    fail(1, `${file}:${error.line}${where}: unknown colour ${error.literal} — ${because}`);
  }
}

mkdirSync(args.out, { recursive: true });
for (const { path, html } of written) {
  writeFileSync(path, html);
  process.stdout.write(`wrote ${path}\n`);
}
