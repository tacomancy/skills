import { describe, expect, test } from "vitest";
import { Browser, Driver, type Edit, freePort } from "./harness";

// Chromium launches per test; generous so a cold CI runner does not fail on time alone.
const LAUNCH_TIMEOUT = 60_000;

// A driver copy pointed at a fresh headless page, run once, with the browser gone after.
async function drive(edit: Omit<Edit, "port">) {
  const browser = await Browser.open("page.html");
  try {
    return new Driver({ port: browser.port, ...edit }).run();
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
});

describe("driver.mjs — failures", () => {
  test(
    "no target with the URL prefix within the timeout fails naming the prefix",
    async () => {
      const run = await drive({ urlPrefix: "app://vitrine/", ready: "body", timeoutMs: 1_500, steps: [{ evaluate: "1" }] });
      expect(run.status).toBe(1);
      expect(run.output).toContain('"app://vitrine/"');
      expect(run.output).not.toContain("evaluate 1");
    },
    LAUNCH_TIMEOUT,
  );

  test("nothing listening on the port fails the same way, naming the prefix and port", async () => {
    const port = await freePort();
    const run = new Driver({ port, urlPrefix: "file://", ready: "body", timeoutMs: 1_000, steps: [] }).run();
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
      expect(run.output).not.toContain("evaluate 1");
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
