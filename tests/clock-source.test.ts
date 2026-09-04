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

// Screens and other top-level client components must take "today" as a prop
// (see components/use-today.ts and Amendment 6); they must never reach for
// the clock themselves. `lib/dev-clock.ts` and `components/use-today.ts` are
// the only allowed date sources -- this list intentionally has nothing in it
// today. If a screen ever needs a genuine `new Date(` (e.g. a one-off
// timestamp with no bearing on "today"), add it here by exact path WITH a
// comment explaining why it isn't a today-source, instead of loosening the
// pattern below.
const ALLOWED_DATE_CONSTRUCTION_SITES: string[] = [];

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

const screenFiles = walk(join("components", "screens"));
const topLevelComponentFiles = readdirSync("components", { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.tsx$/.test(entry.name))
  .map((entry) => join("components", entry.name));
const dateSourceScopeFiles = [...new Set([...screenFiles, ...topLevelComponentFiles])].filter(
  (path) => path !== USE_TODAY_DEFINITION_FILE,
);

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

  it("screens and top-level components never construct a date or read a date-ish attribute themselves", () => {
    // Review round 1 (m3-verdict.md finding 1): the check above only catches
    // the exact symptom that shipped -- a <script>-tag scrape, a
    // devMockToday-mentioning regex, a raw env read. It missed the actual
    // rule (Amendment 6): "today" comes from the `today` prop, full stop.
    // This asserts the property directly: outside lib/dev-clock.ts and
    // components/use-today.ts, no screen or top-level component may call
    // `new Date(`, `Date.now(`, `Intl.DateTimeFormat(`, or read a date-ish
    // DOM attribute (`data-today`, `data-date`, `datetime`) via
    // `getAttribute` or `.dataset`, however that read is spelled.
    const DATE_ISH_ATTRS = ["data-today", "data-date", "datetime"];
    const DATE_ISH_DATASET_KEYS = ["today", "date"]; // camelCase of data-today / data-date

    const violations: string[] = [];
    for (const path of dateSourceScopeFiles) {
      const text = readFileSync(path, "utf8");

      if (/\bnew Date\(/.test(text) && !ALLOWED_DATE_CONSTRUCTION_SITES.includes(path)) {
        violations.push(`${path}: constructs new Date(...) instead of taking today as a prop`);
      }
      if (/\bDate\.now\(/.test(text)) {
        violations.push(`${path}: reads Date.now() instead of taking today as a prop`);
      }
      if (/\bIntl\.DateTimeFormat\(/.test(text)) {
        violations.push(`${path}: uses Intl.DateTimeFormat(...) instead of taking today as a prop`);
      }
      for (const attr of DATE_ISH_ATTRS) {
        const re = new RegExp(`getAttribute\\(\\s*["'\`]${attr}["'\`]`);
        if (re.test(text)) {
          violations.push(`${path}: reads the "${attr}" attribute via getAttribute instead of a prop`);
        }
      }
      for (const key of DATE_ISH_DATASET_KEYS) {
        const re = new RegExp(`\\.dataset(?:\\.${key}\\b|\\[\\s*["'\`]${key}["'\`]\\s*\\])`, "i");
        if (re.test(text)) {
          violations.push(`${path}: reads dataset.${key} instead of a prop`);
        }
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
