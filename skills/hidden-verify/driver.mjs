#!/usr/bin/env node
// driver.mjs — drive a hidden run over the Chrome DevTools Protocol and print what it finds,
// so proof is a value read from the page rather than a pixel read from a PNG.
//
//   cp driver.mjs <scratch>/driver.mjs   # edit the block below, then:
//   node <scratch>/driver.mjs
//
// The block between the two rules at the top is the run: which port, which page, what
// counts as ready, and the steps with the values they expect. Everything under it is
// plumbing and stays as it is. The driver finds the page target whose URL starts with
// URL_PREFIX on the debugging port, waits until READY matches an element, runs STEPS in
// order, and prints one line per step, so the edited copy plus its output is the record
// of the run.
//
// Steps, and the line each prints:
//   { key: "<key>", modifiers: ["Meta", "Shift"] }        press and release; `key` as KeyboardEvent.key
//                                                          names it, modifiers Alt, Control, Meta, Shift
//                                                          → key Meta+Shift+k
//   { type: "<text>" }                                     insert text into the focused editable element
//                                                          → type "<text>"
//   { style: "<selector>", property: "<css-property>" }  the computed value on the first match
//                                                          → style <selector> <property> = <value>
//   { style: ..., property: ..., expected: "<value>" }     the same, checked against the expected value
//                                                          → style <selector> <property> = <actual> | expected <value> | ok
//                                                          → ... | MISMATCH
//   { evaluate: "<expression>" }                           the expression's value as JSON; a promise is awaited
//                                                          → evaluate <expression> = <json>
//
// A mismatch is a row, not a stop: the remaining steps still run, and the run exits 1 at the
// end naming how many expectations failed. Never a warning.
//
// Runtime: Node ≥ 22 (built-in `fetch` and `WebSocket`); nothing to install. Exit codes:
// 0 every step ran and every expectation held; 1 otherwise, with the reason on stderr.
// Three failures are the run's environment rather than a step, and each is named with its
// likely cause:
//   the target never appears            the prefix is wrong, or the binary was launched without the debugging port
//   the readiness selector never matches  the page rendered something else, or the fixture pointer was wrong
//   the app quit before the driver finished  the capture delay is shorter than the steps take

// ─── The run ───
const PORT = 9222;
const URL_PREFIX = "app://";
const READY = "body";
const TIMEOUT_MS = 15000;
const STEPS = [
  { style: "body", property: "background-color", expected: "rgb(255, 255, 255)" },
  { evaluate: "document.title" },
];
// ─── End of the run ───

const POLL_MS = 250;

// Counted rather than fatal, so one run reports every expectation before it fails.
let mismatches = 0;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Polls `check` until it returns a value, or the timeout passes and `describe` names what
// never came, so the two waits in a run — for the target, for readiness — fail the same way.
async function pollUntil(check, describe) {
  const deadline = Date.now() + TIMEOUT_MS;
  do {
    const found = await check();
    if (found) return found;
    await sleep(POLL_MS);
  } while (Date.now() < deadline);
  fail(describe());
}

// The runtime lists its targets over HTTP before any socket exists; until the process has
// opened the port every connection is refused, which is "not yet", not a failure. An answer
// that is not a target list is a failure: something else is on that port.
function findTarget() {
  return pollUntil(
    async () => {
      let response;
      try {
        response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      } catch {
        return undefined;
      }
      const targets = await response.json().catch(() => fail(`port ${PORT} answered /json/list with something other than JSON — is it the debugging port?`));
      if (!Array.isArray(targets)) fail(`port ${PORT} answered /json/list with something other than a target list — is it the debugging port?`);
      return targets.find((t) => t.type === "page" && typeof t.url === "string" && t.url.startsWith(URL_PREFIX));
    },
    () =>
      `no page target with URL prefix ${JSON.stringify(URL_PREFIX)} on port ${PORT} after ${TIMEOUT_MS} ms` +
      " — likely cause: the prefix is wrong, or the binary was launched without the debugging port",
  );
}

// The app going away is the one error that is not about the step it interrupted, so it has
// its own type and the run names it as the quit-before-finished mode wherever it surfaces.
class ConnectionClosed extends Error {
  constructor() {
    super("the debugging connection closed");
  }
}

// One CDP session: sends commands by id and resolves each with its result. A socket that
// closes mid-run rejects everything still waiting, so a step cannot hang on a page that went away.
function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 1;
    socket.addEventListener("open", () => resolve({ send, close: () => socket.close() }));
    socket.addEventListener("error", () => reject(new Error(`could not open ${url}`)));
    socket.addEventListener("close", () => {
      for (const { reject: rejectPending } of pending.values()) rejectPending(new ConnectionClosed());
      pending.clear();
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
    function send(method, params) {
      const id = nextId++;
      return new Promise((resolveCommand, rejectCommand) => {
        // A send on a closed socket is dropped silently by the WebSocket API; reject here so
        // a page that went away between steps is a named failure, not a hang.
        if (socket.readyState !== WebSocket.OPEN) return rejectCommand(new ConnectionClosed());
        pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  });
}

// Evaluates in the page and returns the value — a promise's settled value, so a step can wait
// on the app's own async state. A throw in the page is a throw here, with the page's message,
// so a step failure names what the page said.
async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

function waitForReady(session) {
  return pollUntil(
    () => evaluate(session, `document.querySelector(${JSON.stringify(READY)}) !== null`),
    () =>
      `readiness selector ${JSON.stringify(READY)} never matched within ${TIMEOUT_MS} ms` +
      " — likely cause: the page rendered something else, or the fixture pointer was wrong",
  );
}

// CDP's modifier bitmask; the names accepted are the ones `KeyboardEvent.key` reports,
// plus the short forms an agent is likely to write.
const MODIFIERS = { alt: 1, control: 2, ctrl: 2, meta: 4, cmd: 4, command: 4, shift: 8 };

// One press and release, the way a shortcut handler expects to see it. A letter or digit
// also carries its virtual key code, for handlers that read `keyCode` rather than `key`.
async function pressKey(session, key, modifierNames) {
  let modifiers = 0;
  for (const name of modifierNames) {
    const bit = MODIFIERS[name.toLowerCase()];
    if (bit === undefined) throw new Error(`unknown modifier ${JSON.stringify(name)}; use Alt, Control, Meta, or Shift`);
    modifiers |= bit;
  }
  const params = { key, modifiers };
  if (/^[a-z0-9]$/i.test(key)) {
    params.code = /\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`;
    params.windowsVirtualKeyCode = key.toUpperCase().charCodeAt(0);
  }
  await session.send("Input.dispatchKeyEvent", { type: "keyDown", ...params });
  await session.send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
}

async function runStep(session, step) {
  // An expectation the step cannot check would pass unchecked — a false proof — so it is refused.
  if ("expected" in step && !(typeof step.style === "string" && typeof step.expected === "string")) {
    throw new Error(`expected belongs on a style step, as a string: ${JSON.stringify(step)}`);
  }
  if (typeof step.key === "string") {
    const modifiers = step.modifiers ?? [];
    if (!Array.isArray(modifiers)) throw new Error(`modifiers must be a list, e.g. ["Meta", "Shift"]: ${JSON.stringify(step)}`);
    await pressKey(session, step.key, modifiers);
    console.log(`key ${[...modifiers, step.key].join("+")}`);
    return;
  }
  if (typeof step.type === "string") {
    // Text inserted with nothing editable focused is dropped without a word from the runtime;
    // checking first makes a forgotten focus step a failure rather than a passing record.
    const focused = await evaluate(
      session,
      `(() => {
        const el = document.activeElement;
        return el !== null && el !== document.body && (el.isContentEditable || "value" in el);
      })()`,
    );
    if (!focused) throw new Error("nothing editable has focus; focus a field first, e.g. { evaluate: \"document.querySelector('#field').focus()\" }");
    // Inserted as composed text, so a field receives it whole rather than as key events.
    await session.send("Input.insertText", { text: step.type });
    console.log(`type ${JSON.stringify(step.type)}`);
    return;
  }
  if (typeof step.style === "string" && typeof step.property === "string") {
    const value = await evaluate(
      session,
      `(() => {
        const el = document.querySelector(${JSON.stringify(step.style)});
        if (!el) throw new Error("no element matches " + ${JSON.stringify(step.style)});
        return getComputedStyle(el).getPropertyValue(${JSON.stringify(step.property)});
      })()`,
    );
    if (typeof step.expected !== "string") {
      console.log(`style ${step.style} ${step.property} = ${value}`);
      return;
    }
    const matched = value === step.expected;
    if (!matched) mismatches += 1;
    console.log(`style ${step.style} ${step.property} = ${value} | expected ${step.expected} | ${matched ? "ok" : "MISMATCH"}`);
    return;
  }
  if (typeof step.evaluate === "string") {
    const value = await evaluate(session, step.evaluate);
    console.log(`evaluate ${step.evaluate} = ${JSON.stringify(value)}`);
    return;
  }
  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

function quitBeforeFinished(during) {
  fail(`the app quit before the driver finished (${during}) — likely cause: the capture delay is shorter than the steps take`);
}

const target = await findTarget();
const session = await connect(target.webSocketDebuggerUrl).catch((error) => fail(error.message));
try {
  await waitForReady(session);
} catch (error) {
  if (error instanceof ConnectionClosed) quitBeforeFinished("while waiting for readiness");
  fail(`waiting for readiness selector ${JSON.stringify(READY)} failed: ${error.message}`);
}
for (const [index, step] of STEPS.entries()) {
  try {
    await runStep(session, step);
  } catch (error) {
    if (error instanceof ConnectionClosed) quitBeforeFinished(`during step ${index + 1}`);
    fail(`step ${index + 1} failed: ${error.message}`);
  }
}
session.close();
if (mismatches > 0) fail(`${mismatches} expectation${mismatches === 1 ? "" : "s"} failed`);
