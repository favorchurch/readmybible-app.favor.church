import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Standing rule (plan Amendment 6, after the same bug shipped independently
// in lane B and lane C): a client screen reads "today" from the `today` prop
// AppShell passes, never from the DOM or the RSC payload. Both lanes invented
// the same wrong mechanism -- regex-scraping a devMockToday value out of
// <script> tag text -- because AppShell didn't pass `today` down and the plan
// never said how a screen should get it. Lane C's copy ran in production on
// every render. This guards against a third copy ever landing the same way.

const SCAN_DIRS = ["app", "components", "lib"];
const CLOCK_SOURCE_FILE = join("lib", "dev-clock.ts");
const USE_TODAY_DEFINITION_FILE = join("components", "use-today.ts");
const ALLOWED_USE_TODAY_CALL_SITES = [join("components", "app-shell.tsx")];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = SCAN_DIRS.flatMap(walk);

describe("clock source of truth", () => {
  it("never reads the clock from a <script> tag, the DOM, or a regex scrape of serialized markup", () => {
    const violations: string[] = [];
    for (const path of files) {
      if (path === CLOCK_SOURCE_FILE) continue;
      const text = readFileSync(path, "utf8");
      // Any way of reaching <script> elements, not just the one spelling the
      // historical scrape happened to use.
      if (
        /(getElementsByTagName|querySelectorAll|querySelector)\(\s*["'`]script\b/.test(text) ||
        /document\.scripts\b/.test(text)
      ) {
        violations.push(`${path}: reads <script> tags directly`);
      }
      // Any regex literal or RegExp source that searches for the serialized
      // clock value, whatever the surrounding pattern looks like.
      if (
        /\/(?!\*)[^/\n]*\b(devMockToday|DEV_MOCK_TODAY)\b[^/\n]*\/[gimsuy]*/.test(text) ||
        /RegExp\([^)]*(devMockToday|DEV_MOCK_TODAY)/.test(text)
      ) {
        violations.push(`${path}: regex-scrapes the clock value out of serialized markup`);
      }
      // The env var is read in exactly one place. A client-side
      // NEXT_PUBLIC_ mirror of it is the other half of the lane B scrape.
      if (/process\.env\.(NEXT_PUBLIC_)?DEV_MOCK_TODAY\b/.test(text)) {
        violations.push(`${path}: reads DEV_MOCK_TODAY outside lib/dev-clock.ts`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("calls useToday() from exactly one call site: components/app-shell.tsx", () => {
    const callSites: string[] = [];
    for (const path of files) {
      if (path === USE_TODAY_DEFINITION_FILE) continue; // the definition itself
      const text = readFileSync(path, "utf8");
      if (/\buseToday\(/.test(text)) callSites.push(path);
    }
    expect(callSites).toEqual(ALLOWED_USE_TODAY_CALL_SITES);
  });
});
