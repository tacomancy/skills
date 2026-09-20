import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCRIPT = fileURLToPath(new URL("../../skills/adr-shape/lint-adr.sh", import.meta.url));
export const TEMPLATE = fileURLToPath(new URL("../../skills/adr-shape/0000-template.md", import.meta.url));

// `output` is stdout and stderr together, as a CI log shows them.
export type Run = { status: number; output: string; lines: string[] };

// A throwaway directory of ADR files, driven the way an owner's CI would drive the lint:
// write files, run the script over them, look at the exit code and the lines.
export class FixtureDir {
  readonly dir: string;

  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), "adr-shape-"));
  }

  write(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(this.dir, path)), { recursive: true });
      writeFileSync(join(this.dir, path), content);
    }
  }

  // Runs the lint from inside the directory over the named files (all `*.md` by default).
  lint(...files: string[]): Run {
    const args = files.length > 0 ? files : ["."];
    const result = spawnSync("bash", [SCRIPT, ...args], { cwd: this.dir, encoding: "utf8" });
    const output = result.stdout + result.stderr;
    return { status: result.status ?? -1, output, lines: output.split("\n").filter((line) => line !== "") };
  }
}

// One ADR in the spec's shape. Each part can be replaced or removed to make a broken one.
export type AdrParts = {
  title?: string;
  status?: string | null;
  lead?: string | null;
  decisions?: string | null;
  options?: string | null;
  consequences?: string | null;
  updates?: string;
};

export function adr(parts: AdrParts = {}): string {
  const {
    title = "# 0001: Store raw values and normalise in code",
    status = "**Status:** Accepted",
    lead = "ADR 0000 left open where normalisation lives. This ADR settles it: the sidecar stores the raw extracted values and every normalisation rule lives in code, so tuning matching is never a migration. The rules in full are `docs/architecture.md` § Annotation identity.",
    decisions = "## Decisions\n\n1. **Store raw, normalise in code.** The sidecar holds the raw quote and the quads as written, never a normalised form, so a tuning of the rules is a code change.\n2. **One derived value persisted.** The document fingerprint, because recomputing it means opening every PDF.",
    options = "## Considered options\n\n- **Store the normalised quote.** Rejected: every tuning becomes a migration across every source.\n- **Store both.** Deferred until a measurement shows normalisation dominates ingest time.\n- **A second index outside the sidecar.** Named fallback: if the sidecar grows past what a JSON read tolerates, an index file beside it, rebuilt from the raw values.",
    consequences = "## Consequences\n\n- **+** Tuning matching is a code change; the sidecar never migrates for it.\n- **−** Every ingest re-normalises every quote.\n- *Deferred, deliberately:* the geometry threshold — `docs/architecture.md` § Annotation identity, after the prototype measures it.",
    updates = "",
  } = parts;
  return [title, status, lead, decisions, options, consequences, updates].filter((p) => p).join("\n\n") + "\n";
}
