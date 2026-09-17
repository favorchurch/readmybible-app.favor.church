import { describe, expect, it } from "vitest";

import { isValidNotebookPage, NOTEBOOK_PAGES } from "@/components/notes/pages";

describe("isValidNotebookPage", () => {
  it("accepts the General page", () => {
    expect(isValidNotebookPage("general")).toBe(true);
  });

  it("accepts the first and last campaign calendar dates", () => {
    expect(isValidNotebookPage("2026-10-05")).toBe(true);
    expect(isValidNotebookPage("2026-10-30")).toBe(true);
  });

  /**
   * Known-bad behavior (issue #148): no notebook page may exist for a date
   * outside the defined campaign calendar. Oct 31 and Nov 3 must never be
   * writable pages, even though Oct 31 is a grace/catch-up day elsewhere.
   */
  it("rejects dates outside the campaign calendar", () => {
    expect(isValidNotebookPage("2026-11-03")).toBe(false);
    expect(isValidNotebookPage("2026-10-31")).toBe(false);
    expect(isValidNotebookPage("2026-10-04")).toBe(false);
  });

  it("rejects a non-date string", () => {
    expect(isValidNotebookPage("not-a-date")).toBe(false);
  });

  it("stays in sync with NOTEBOOK_PAGES: every page id is valid and nothing else is", () => {
    for (const page of NOTEBOOK_PAGES) {
      expect(isValidNotebookPage(page.id)).toBe(true);
    }
    expect(NOTEBOOK_PAGES.some((p) => p.id === "2026-11-03")).toBe(false);
  });
});
