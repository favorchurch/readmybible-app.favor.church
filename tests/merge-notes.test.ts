import { describe, expect, it } from "vitest";

import { mergeNoteContents } from "@/components/notes/merge-notes";

describe("mergeNoteContents", () => {
  it("prepends typed HTML before fetched HTML, never overwriting the typed content", () => {
    const merged = mergeNoteContents({
      typedContent: "<p>typed before fetch landed</p>",
      fetchedContent: "<p>previously saved revelation</p>",
    });

    expect(merged).toBe("<p>typed before fetch landed</p><p>previously saved revelation</p>");
  });

  it("prepends typed plain text before fetched plain text with paragraph separation", () => {
    const merged = mergeNoteContents({
      typedContent: "typed before fetch landed",
      fetchedContent: "previously saved revelation",
    });

    expect(merged).toBe("typed before fetch landed\n\npreviously saved revelation");
    expect(merged.indexOf("typed before fetch landed")).toBeLessThan(
      merged.indexOf("previously saved revelation"),
    );
  });

  it("normalizes a plain-text fetch onto rich-text typed content, keeping typed first", () => {
    const merged = mergeNoteContents({
      typedContent: "<p><strong>typed</strong> content</p>",
      fetchedContent: "plain fetched note",
    });

    expect(merged).toBe("<p><strong>typed</strong> content</p><p>plain fetched note</p>");
  });

  it("normalizes plain-text typed content onto a rich-text fetch, keeping typed first", () => {
    const merged = mergeNoteContents({
      typedContent: "plain typed note",
      fetchedContent: "<p><em>fetched</em> content</p>",
    });

    expect(merged).toBe("<p>plain typed note</p><p><em>fetched</em> content</p>");
  });

  it("returns the fetched content untouched when nothing was typed yet", () => {
    const merged = mergeNoteContents({
      typedContent: "",
      fetchedContent: "<p>previously saved revelation</p>",
    });

    expect(merged).toBe("<p>previously saved revelation</p>");
  });

  it("treats an empty editor paragraph as no typed content", () => {
    const merged = mergeNoteContents({
      typedContent: "<p></p>",
      fetchedContent: "<p>previously saved revelation</p>",
    });

    expect(merged).toBe("<p>previously saved revelation</p>");
  });

  it("keeps typed content untouched when the fetch has nothing to merge", () => {
    const merged = mergeNoteContents({
      typedContent: "<p>typed before fetch landed</p>",
      fetchedContent: "",
    });

    expect(merged).toBe("<p>typed before fetch landed</p>");
  });

  it("keeps typed content untouched when the fetch resolves to an empty editor paragraph", () => {
    const merged = mergeNoteContents({
      typedContent: "<p>typed before fetch landed</p>",
      fetchedContent: "<p></p>",
    });

    expect(merged).toBe("<p>typed before fetch landed</p>");
  });
});
