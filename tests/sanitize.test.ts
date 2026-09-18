// @vitest-environment jsdom

/**
 * plainTextLength backs the "N/1000 characters" counter and the notes editor's
 * typing gate (Issue 183 review, F3). It must count what the user actually
 * typed, not the serialized HTML -- a font-styled span or a list item adds
 * tag/attribute overhead that inflates raw HTML length far past the visible
 * character count.
 */

import { describe, expect, it } from "vitest";

import { plainTextLength } from "@/components/notes/sanitize";

describe("plainTextLength", () => {
  it("counts visible text, not paragraph tag overhead", () => {
    expect(plainTextLength("<p>hello</p>")).toBe(5);
  });

  it("ignores font-styling span markup", () => {
    const styled = '<span style="font-family: Arial;">hello</span>';
    expect(styled.length).toBeGreaterThan(40);
    expect(plainTextLength(styled)).toBe(5);
  });

  it("ignores list markup overhead", () => {
    expect(plainTextLength("<ul><li>abc</li></ul>")).toBe(3);
  });

  it("sums visible text across multiple paragraphs with no separator inflation", () => {
    expect(plainTextLength("<p>abc</p><p>def</p>")).toBe(6);
  });

  it("returns 0 for empty input", () => {
    expect(plainTextLength("")).toBe(0);
  });
});
