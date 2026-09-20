import { describe, expect, test } from "vitest";
import { Browser, Driver, type Edit, freePort } from "./harness";

// Chromium launches per test; generous so a cold CI runner does not fail on time alone.
const LAUNCH_TIMEOUT = 60_000;

// A driver copy pointed at a fresh headless page, run once, with the browser gone after.
async function drive(edit: Omit<Edit, "port">) {
  const browser = await Browser.open("page.html");
  try {
    return await new Driver({ port: browser.port, ...edit }).run();
  } finally {
    browser.close();
  }
}

// The fixture page sets `data-ready` 300 ms after load, so a driver that read before
// waiting would see the page without the marker.
const READY = ".editor[data-ready]";

describe("driver.mjs — against a headless page", () => {
  test(
    "reports the computed style a CSS variable set, and an evaluate result",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [
          { style: ".editor", property: "background-color" },
          { evaluate: "document.title" },
        ],
      });
      expect(run).toMatchObject({ status: 0 });
      expect(run.lines).toContain("style .editor background-color = rgb(17, 34, 51)");
      expect(run.lines).toContain('evaluate document.title = "hidden-verify fixture"');
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "a key step with a modifier is what the page's keydown handler sees",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [
          { key: "k", modifiers: ["Meta", "Shift"] },
          { evaluate: "document.querySelector('#last-key').textContent" },
        ],
      });
      expect(run).toMatchObject({ status: 0 });
      expect(run.lines).toContain("key Meta+Shift+k");
      expect(run.lines).toContain(`evaluate document.querySelector('#last-key').textContent = "Shift+Meta+k"`);
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "a type step lands its text in the focused field",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [
          { evaluate: "document.querySelector('#field').focus()" },
          { type: "héllo world" },
          { evaluate: "document.querySelector('#field').value" },
        ],
      });
      expect(run).toMatchObject({ status: 0 });
      expect(run.lines).toContain('type "héllo world"');
      expect(run.lines).toContain(`evaluate document.querySelector('#field').value = "héllo world"`);
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "a style step with a matching expected value reports expected beside actual",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [{ style: ".editor", property: "background-color", expected: "rgb(17, 34, 51)" }],
      });
      expect(run).toMatchObject({ status: 0 });
      expect(run.lines).toContain("style .editor background-color = rgb(17, 34, 51) | expected rgb(17, 34, 51) | ok");
    },
    LAUNCH_TIMEOUT,
  );
});

describe("driver.mjs — failures", () => {
  test(
    "a wrong expected value reports expected and actual, runs the rest, and fails the run",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [
          { style: ".editor", property: "background-color", expected: "rgb(0, 0, 0)" },
          { evaluate: "1" },
        ],
      });
      expect(run.status).toBe(1);
      expect(run.lines).toContain("style .editor background-color = rgb(17, 34, 51) | expected rgb(0, 0, 0) | MISMATCH");
      expect(run.lines).toContain("evaluate 1 = 1");
      expect(run.output).toContain("1 expectation failed");
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "an expected value on a step that cannot check it fails the run rather than passing unchecked",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [{ evaluate: "document.title", expected: "hidden-verify fixture" }],
      });
      expect(run.status).toBe(1);
      expect(run.output).toContain("expected");
      expect(run.output).not.toContain("evaluate document.title =");
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "a type step with nothing focused fails naming the missing focus",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [{ type: "hello" }, { evaluate: "1" }],
      });
      expect(run.status).toBe(1);
      expect(run.output).toContain("focus");
      expect(run.output).not.toContain("evaluate 1");
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "modifiers given as a string, not a list, fails naming the shape",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [{ key: "k", modifiers: "Meta" }],
      });
      expect(run.status).toBe(1);
      expect(run.output).toContain("modifiers");
      expect(run.output).toContain("list");
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "no target with the URL prefix within the timeout fails naming the prefix",
    async () => {
      const run = await drive({ urlPrefix: "app://vitrine/", ready: "body", timeoutMs: 1_500, steps: [{ evaluate: "1" }] });
      expect(run.status).toBe(1);
      expect(run.output).toContain('"app://vitrine/"');
      expect(run.output).toContain("launched without the debugging port");
      expect(run.output).not.toContain("evaluate 1");
    },
    LAUNCH_TIMEOUT,
  );

  test("nothing listening on the port fails the same way, naming the prefix and port", async () => {
    const port = await freePort();
    const run = await new Driver({ port, urlPrefix: "file://", ready: "body", timeoutMs: 1_000, steps: [] }).run();
    expect(run.status).toBe(1);
    expect(run.output).toContain('"file://"');
    expect(run.output).toContain(String(port));
  });

  test(
    "a readiness selector that never matches fails naming the selector",
    async () => {
      const run = await drive({ urlPrefix: "file://", ready: ".never-rendered", timeoutMs: 1_500, steps: [{ evaluate: "1" }] });
      expect(run.status).toBe(1);
      expect(run.output).toContain('".never-rendered"');
      expect(run.output).toContain("fixture pointer");
      expect(run.output).not.toContain("evaluate 1");
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "the app quitting mid-run fails naming the step it was on and the capture delay as the cause",
    async () => {
      const browser = await Browser.open("page.html");
      try {
        const running = new Driver({
          port: browser.port,
          urlPrefix: "file://",
          ready: READY,
          timeoutMs: 15_000,
          steps: [
            { evaluate: "1" },
            // A promise the driver awaits, so the app is gone before this step returns.
            { evaluate: "new Promise((resolve) => setTimeout(resolve, 10000))" },
            { evaluate: "2" },
          ],
          // Step 1's line is the signal that the driver is past readiness and into step 2.
        }).run((chunk) => chunk.includes("evaluate 1 = 1") && browser.close());
        const run = await running;
        expect(run.status).toBe(1);
        expect(run.lines).toContain("evaluate 1 = 1");
        expect(run.output).toContain("quit before the driver finished");
        expect(run.output).toContain("step 2");
        expect(run.output).toContain("capture delay");
        expect(run.output).not.toContain("evaluate 2");
      } finally {
        browser.close();
      }
    },
    LAUNCH_TIMEOUT,
  );

  test(
    "a style step whose selector matches nothing fails the run naming the selector",
    async () => {
      const run = await drive({
        urlPrefix: "file://",
        ready: READY,
        timeoutMs: 15_000,
        steps: [
          { evaluate: "1" },
          { style: ".missing", property: "color" },
          { evaluate: "2" },
        ],
      });
      expect(run.status).toBe(1);
      expect(run.lines).toContain("evaluate 1 = 1");
      expect(run.output).toContain(".missing");
      expect(run.output).not.toContain("evaluate 2");
    },
    LAUNCH_TIMEOUT,
  );
});
