import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppBrandSplash, SplashCompanion } from "@/components/app-splash";

/**
 * Issue #124: the splash rendered by app/loading.tsx runs on the server, so
 * whatever renderToStaticMarkup produces here is exactly what a user sees on
 * first paint, before any client JS has run. A glyph must be present in that
 * markup -- an empty `.splash-companion` (the old `scene === null` fallback)
 * means the user's first paint has no avatar/house glyph next to the
 * wordmark, which is the bug.
 */
describe("SplashCompanion server-render", () => {
  it("renders a glyph (avatar or stage-mini) inside .splash-companion on the very first render", () => {
    const html = renderToStaticMarkup(<SplashCompanion />);

    expect(html).toContain("splash-companion");
    // The first-paint scene must not be an empty box: it must contain either
    // the avatar glyph or the home-stage glyph.
    const hasAvatarGlyph = html.includes("avatar-");
    const hasStageGlyph = html.includes("stage-mini");
    expect(hasAvatarGlyph || hasStageGlyph).toBe(true);
  });

  it("renders the full splash shell with a glyph present, via AppBrandSplash", () => {
    const html = renderToStaticMarkup(<AppBrandSplash />);

    expect(html).toContain('role="status"');
    expect(html).toContain("splash-companion-figure");
    const hasAvatarGlyph = html.includes("avatar-");
    const hasStageGlyph = html.includes("stage-mini");
    expect(hasAvatarGlyph || hasStageGlyph).toBe(true);
  });
});
