#!/usr/bin/env node
// driver.mjs — drive a hidden run over the Chrome DevTools Protocol and print what it finds,
// so proof is a value read from the page rather than a pixel read from a PNG.
//
//   cp driver.mjs <scratch>/driver.mjs   # edit the block below, then:
//   node <scratch>/driver.mjs
//
// The block between the two rules at the top is the run: which port, which page, what
// counts as ready, and the steps. Everything under it is plumbing and stays as it is.
// The driver finds the page target whose URL starts with URL_PREFIX on the debugging port,
// waits until READY matches an element, runs STEPS in order, and prints one line per step
// — `style <selector> <property> = <value>`, `evaluate <expression> = <json>` — so the
// edited copy plus its output is the record of the run.
//
// Steps:
//   { style: "<selector>", property: "<css-property>" }   the computed value on the first match
//   { evaluate: "<expression>" }                            the expression's value, as JSON
//
// Runtime: Node ≥ 22 (built-in `fetch` and `WebSocket`); nothing to install. Exit codes:
// 0 every step ran; 1 the target never appeared, readiness never matched, a step failed,
// or the connection dropped mid-run — each named on stderr with the value it was looking for.

// ─── The run ───
const PORT = 9222;
const URL_PREFIX = "app://";
const READY = "body";
const TIMEOUT_MS = 15000;
const STEPS = [
  { style: "body", property: "background-color" },
  { evaluate: "document.title" },
];
// ─── End of the run ───

const POLL_MS = 250;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The runtime lists its targets over HTTP before any socket exists; until the process has
// opened the port every request is refused, which is "not yet", not a failure.
async function findTarget() {
  const deadline = Date.now() + TIMEOUT_MS;
  do {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((t) => t.type === "page" && typeof t.url === "string" && t.url.startsWith(URL_PREFIX));
      if (page) return page;
    } catch {
      // Port not open yet.
    }
    await sleep(POLL_MS);
  } while (Date.now() < deadline);
  fail(`no page target with URL prefix ${JSON.stringify(URL_PREFIX)} on port ${PORT} after ${TIMEOUT_MS} ms`);
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
      for (const { reject: rejectPending } of pending.values()) rejectPending(new Error("the debugging connection closed"));
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
        pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  });
}

// Evaluates in the page and returns the value; a throw in the page is a throw here, with
// the page's message, so a step failure names what the page said.
async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send("Runtime.evaluate", { expression, returnByValue: true });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  }
  return result.value;
}

async function waitForReady(session) {
  const deadline = Date.now() + TIMEOUT_MS;
  do {
    if (await evaluate(session, `document.querySelector(${JSON.stringify(READY)}) !== null`)) return;
    await sleep(POLL_MS);
  } while (Date.now() < deadline);
  fail(`readiness selector ${JSON.stringify(READY)} never matched within ${TIMEOUT_MS} ms`);
}

async function runStep(session, step) {
  if (typeof step.style === "string" && typeof step.property === "string") {
    const value = await evaluate(
      session,
      `(() => {
        const el = document.querySelector(${JSON.stringify(step.style)});
        if (!el) throw new Error("no element matches " + ${JSON.stringify(step.style)});
        return getComputedStyle(el).getPropertyValue(${JSON.stringify(step.property)});
      })()`,
    );
    console.log(`style ${step.style} ${step.property} = ${value}`);
    return;
  }
  if (typeof step.evaluate === "string") {
    const value = await evaluate(session, step.evaluate);
    console.log(`evaluate ${step.evaluate} = ${JSON.stringify(value)}`);
    return;
  }
  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

const target = await findTarget();
const session = await connect(target.webSocketDebuggerUrl).catch((error) => fail(error.message));
await waitForReady(session);
for (const [index, step] of STEPS.entries()) {
  try {
    await runStep(session, step);
  } catch (error) {
    session.close();
    fail(`step ${index + 1} failed: ${error.message}`);
  }
}
session.close();
