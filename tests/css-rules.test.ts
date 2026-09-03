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
  "app/styles/avatar.css",
  "app/styles/motion.css",
  "app/styles/completion.css",
  "app/styles/misc.css",
  "app/styles/typography.css",
  "app/admin/admin.css",
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
});
