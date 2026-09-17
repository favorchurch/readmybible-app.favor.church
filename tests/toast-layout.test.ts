import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const toastCss = readFileSync(new URL("../app/styles/toast.css", import.meta.url), "utf8");

describe("transient toast layout", () => {
  it("clears the top-right chrome and stays out of the reading sheet footer", () => {
    expect(toastCss).toContain("top: calc(env(safe-area-inset-top, 0px) + var(--topbar-h) + 128px)");
    expect(toastCss).not.toContain("bottom: calc(var(--nav-clearance) + 12px)");
  });
});
