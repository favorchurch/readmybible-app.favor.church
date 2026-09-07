import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS_FILES = [
  "app/globals.css",
  "app/styles/base.css",
  "app/styles/frame.css",
  "app/styles/today.css",
  "app/styles/connect.css",
  "app/styles/rewards.css",
  "app/styles/progress.css",
  "app/styles/sheet.css",
  "app/styles/nav.css",
  "app/styles/onboarding.css",
  "app/styles/home3d.css",
  "app/styles/full-home.css",
  "app/styles/avatar.css",
  "app/styles/motion.css",
  "app/styles/completion.css",
  "app/styles/misc.css",
  "app/styles/typography.css",
  "app/admin/admin.css",
  "app/styles/leader.css",
];

type Rule = {
  prelude: string[];
  selector: string;
  decls: string;
};

/** A small at-rule-aware tokenizer: tracks @media nesting depth via matched
 * braces (not a fixed lookback window), so a selector's true ancestor
 * prelude chain is always known, however deep it is nested. */
function tokenize(cssText: string): Rule[] {
  const rules: Rule[] = [];
  const n = cssText.length;
  let i = 0;

  function skipWs() {
    while (i < n && /\s/.test(cssText[i])) i++;
  }

  function readUntilBraceOrSemi(): string {
    let buf = "";
    while (i < n) {
      const c = cssText[i];
      if (c === '"' || c === "'") {
        const quote = c;
        buf += c;
        i++;
        while (i < n && cssText[i] !== quote) {
          if (cssText[i] === "\\") {
            buf += cssText[i];
            i++;
          }
          buf += cssText[i];
          i++;
        }
        if (i < n) {
          buf += cssText[i];
          i++;
        }
        continue;
      }
      if (c === "{" || c === ";") break;
      buf += c;
      i++;
    }
    return buf;
  }

  function readBlock(): string {
    i++; // consume {
    let depth = 1;
    const bufStart = i;
    while (i < n && depth > 0) {
      const c = cssText[i];
      if (c === '"' || c === "'") {
        const quote = c;
        i++;
        while (i < n && cssText[i] !== quote) {
          if (cssText[i] === "\\") i++;
          i++;
        }
        i++;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const inner = cssText.slice(bufStart, i);
    i++; // consume closing }
    return inner;
  }

  function parseStatements(preludeChain: string[]) {
    while (true) {
      skipWs();
      if (i >= n) return;
      if (cssText[i] === "}") return;
      const head = readUntilBraceOrSemi().trim();
      skipWs();
      if (i < n && cssText[i] === ";") {
        i++;
        continue; // @import etc: not a rule
      }
      if (i < n && cssText[i] === "{") {
        const isContainer = /^@(media|supports|layer|container)\b/i.test(head);
        if (isContainer) {
          i++;
          parseStatements([...preludeChain, head]);
          skipWs();
          if (cssText[i] === "}") i++;
        } else {
          const inner = readBlock();
          rules.push({ prelude: preludeChain.slice(), selector: head, decls: inner.replace(/\s+/g, " ").trim() });
        }
        continue;
      }
      return;
    }
  }

  parseStatements([]);
  return rules;
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function loadAll(): { path: string; raw: string; rules: Rule[] }[] {
  return CSS_FILES.map((path) => {
    const raw = readFileSync(path, "utf8");
    return { path, raw, rules: tokenize(stripComments(raw)) };
  });
}

describe("css-rules", () => {
  it("keeps every :hover selector inside an @media (hover: hover) prelude", () => {
    const violations: string[] = [];
    for (const { path, rules } of loadAll()) {
      for (const rule of rules) {
        if (!/:hover\b/.test(rule.selector)) continue;
        const covered = rule.prelude.some((p) => /hover\s*:\s*hover/.test(p));
        if (!covered) violations.push(`${path}: "${rule.selector}"`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("never uses an infinite animation", () => {
    const violations: string[] = [];
    for (const { path, rules } of loadAll()) {
      for (const rule of rules) {
        if (/\b(animation|animation-iteration-count)\s*:[^;]*\binfinite\b/.test(rule.decls)) {
          violations.push(`${path}: "${rule.selector}" -> ${rule.decls}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("neutralizes every @keyframes via the global reduced-motion rule", () => {
    const keyframeNames: string[] = [];
    let hasUniversalReducedMotionRule = false;
    for (const { rules } of loadAll()) {
      for (const rule of rules) {
        const kfMatch = /^@keyframes\s+([\w-]+)/.exec(rule.selector);
        if (kfMatch) keyframeNames.push(kfMatch[1]);

        const inReducedMotion = rule.prelude.some((p) => /prefers-reduced-motion\s*:\s*reduce/.test(p));
        const isUniversalSelector = /^\*\s*,\s*\*\s*:\s*before\s*,\s*\*\s*:\s*after$/.test(
          rule.selector.replace(/\s+/g, " ").trim(),
        );
        const neutralizesAnimation = /\b(animation-duration|transition-duration)\s*:/.test(rule.decls);
        if (inReducedMotion && isUniversalSelector && neutralizesAnimation) {
          hasUniversalReducedMotionRule = true;
        }
      }
    }
    expect(keyframeNames.length).toBeGreaterThan(0);
    if (!hasUniversalReducedMotionRule) {
      expect.fail(`no universal *, *:before, *:after reduced-motion rule found; keyframes: ${keyframeNames.join(", ")}`);
    }
  });

  it("keeps the tent people layout mobile-safe and the toggle selector-specific", () => {
    const today = loadAll().find(({ path }) => path === "app/styles/today.css");
    const toggleRule = today?.rules.find(({ selector }) => selector === ".section-heading .tent-toggle-button");
    const mobileOverlayRule = today?.rules.find(
      ({ selector, prelude }) => selector === ".tent-people-overlay" && prelude.some((p) => /max-width:\s*480px/.test(p)),
    );
    const desktopOverlayRule = today?.rules.find(({ selector, prelude }) => selector === ".tent-people-overlay" && prelude.length === 0);
    expect(toggleRule?.decls).toContain("text-decoration: none");
    expect(desktopOverlayRule?.decls).toContain("flex-wrap: wrap");
    expect(desktopOverlayRule?.decls).toContain("max-height: none");
    expect(desktopOverlayRule?.decls).toContain("overflow: visible");
    const desktopOverlayGridRule = today?.rules.find(
      ({ selector, prelude }) => selector === ".home-card .tent-people-overlay" && prelude.some((p) => /min-width:\s*760px/.test(p)),
    );
    expect(desktopOverlayGridRule?.decls).toContain("grid-column: 1 / -1");
    expect(mobileOverlayRule?.decls).toContain("position: static");
    expect(mobileOverlayRule?.decls).toContain("flex-wrap: wrap");
    expect(mobileOverlayRule?.decls).toContain("overflow: visible");
  });

  it("keeps the compact Today home selectors valid through the people wrapper", () => {
    const home = loadAll().find(({ path }) => path === "app/styles/home3d.css");
    const today = loadAll().find(({ path }) => path === "app/styles/today.css");
    const compact = home?.rules.filter(({ selector }) => selector === ".home-card .home3d-wrap.compact") ?? [];
    expect(compact.length).toBeGreaterThan(0);
    // The Today card sizes its lawn through --ground-size on the wrap rather
    // than a rule on .home3d-ground, so the model stays base-anchored to the
    // same ground line the ellipse is drawn on.
    expect(compact.some(({ decls }) => /--ground-size:/.test(decls))).toBe(true);
    expect(today?.rules.some(({ selector }) => selector === ".home-card .home-scene-wrap")).toBe(true);
  });

  it("seats every home stage on the shared ground plane instead of a per-stage top", () => {
    const home = loadAll().find(({ path }) => path === "app/styles/home3d.css");
    const full = loadAll().find(({ path }) => path === "app/styles/full-home.css");
    // A per-stage `top` is what left the tent, house and apartment floating:
    // every stage has a different --h, so a centre anchor lands its base
    // somewhere different. The base anchor in .home3d-model replaces them all.
    const perStageTop = [...(home?.rules ?? []), ...(full?.rules ?? [])].filter(
      ({ selector, decls }) =>
        /\.home3d-model\.(tent|trailer|cabin3d|apartment|house3d|mansion)\b/.test(selector) &&
        !selector.includes(".stage-mini") &&
        /(^|;)\s*top\s*:/.test(decls),
    );
    expect(perStageTop.map(({ selector }) => selector)).toEqual([]);

    // `scale` is applied before `transform`, so it would run the anchoring
    // translate in unscaled units and push the model off the lawn.
    const standaloneScale = [...(home?.rules ?? []), ...(full?.rules ?? [])].filter(
      ({ selector, decls }) =>
        selector.includes(".home3d-model") && /(^|;)\s*scale\s*:/.test(decls),
    );
    expect(standaloneScale.map(({ selector }) => selector)).toEqual([]);
  });

  it("has no meaningful font-size at 11px or below (or the rem equivalent) unless marked decorative", () => {
    const violations: string[] = [];
    for (const { path, raw } of loadAll()) {
      const lines = raw.split("\n");
      for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo];
        const isDecorative = /\/\*\s*decorative\s*\*\//.test(line);
        const re = /font-size\s*:\s*([\d.]+)(px|rem)/g;
        const matches = [...line.matchAll(re)];
        if (isDecorative) {
          // A decorative tag exempts the whole line, so a line with more than one
          // font-size declaration would silently exempt an unrelated one too.
          if (matches.length > 1) {
            violations.push(
              `${path}:${lineNo + 1}: decorative tag covers ${matches.length} font-size declarations (ambiguous exemption)`,
            );
          }
          continue;
        }
        for (const m of matches) {
          const value = parseFloat(m[1]);
          const unit = m[2];
          const px = unit === "rem" ? value * 16 : value;
          if (px <= 11) {
            violations.push(`${path}:${lineNo + 1}: font-size: ${m[1]}${unit} (${px}px)`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("has no Georgia declaration whose selector is unlisted in typography.css and unmarked as an intentional exception", () => {
    // Systemic defect (M3): a per-screen file declares `font-family: Georgia,
    // serif`, and typography.css (imported last) overrides it -- but only for
    // selectors it names. Any new selector silently renders serif. This bit
    // lane A, lane C, and lane D independently. The guard: every live Georgia
    // declaration's selector must either appear in typography.css (joins the
    // sans system) or carry a `/* serif-exception */` marker inside its own
    // declaration block (a deliberate, documented departure -- see
    // .quick-verse-button strong in intent/DESIGN.md).
    //
    // The marker has to survive into the parsed declaration text, but every
    // OTHER comment (e.g. the pre-existing `/* decorative */` tags that sit
    // between two rules) must still be stripped before tokenizing, or a
    // trailing comment leaks into the next rule's selector text. So: swap the
    // one marker we care about for a plain-text sentinel first, then strip
    // every remaining real comment as usual.
    const SENTINEL = "SERIF_EXCEPTION_MARKER";
    function markException(text: string): string {
      return text.replace(/\/\*\s*serif-exception\b[^*]*\*\//gi, SENTINEL);
    }

    // A rule only "joins the sans system" if it actually declares
    // font-family (or the `font` shorthand, which sets the same property) --
    // being merely named in typography.css for an unrelated declaration
    // (e.g. `.stage-row > span { white-space: nowrap; }`) overrides nothing.
    const DECLARES_FONT_FAMILY = /\b(?:font-family|font)\s*:/i;
    const GEORGIA_DECL = /\b(?:font-family|font)\s*:[^;]*\bGeorgia\b/i;

    const typographySelectors = new Set<string>();
    for (const path of CSS_FILES) {
      if (path !== "app/styles/typography.css") continue;
      const raw = readFileSync(path, "utf8");
      for (const rule of tokenize(stripComments(raw))) {
        if (!DECLARES_FONT_FAMILY.test(rule.decls)) continue;
        for (const sel of rule.selector.split(",")) {
          typographySelectors.add(sel.replace(/\s+/g, " ").trim());
        }
      }
    }

    const violations: string[] = [];
    for (const path of CSS_FILES) {
      if (path === "app/styles/typography.css") continue;
      const raw = readFileSync(path, "utf8");
      for (const rule of tokenize(stripComments(markException(raw)))) {
        if (!GEORGIA_DECL.test(rule.decls)) continue;
        if (rule.decls.includes(SENTINEL)) continue;
        for (const sel of rule.selector.split(",")) {
          const normalized = sel.replace(/\s+/g, " ").trim();
          if (!typographySelectors.has(normalized)) {
            violations.push(`${path}: "${normalized}"`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps .header-person free of percentage max-width to prevent cyclic flex-item collapse", () => {
    const typography = loadAll().find(({ path }) => path === "app/styles/typography.css");
    const base = loadAll().find(({ path }) => path === "app/styles/base.css");
    const personRules = [...(typography?.rules ?? []), ...(base?.rules ?? [])].filter(
      ({ selector }) => selector === ".header-person",
    );
    for (const rule of personRules) {
      expect(rule.decls).not.toMatch(/max-width\s*:\s*[^;]*%/);
    }
  });

  it("keeps .header-name and edit profile on non-wrapping whitespace", () => {
    const base = loadAll().find(({ path }) => path === "app/styles/base.css");
    const smallRule = base?.rules.find(({ selector }) => selector.includes(".header-person small"));
    expect(smallRule?.decls).toContain("white-space: nowrap");
  });
});

