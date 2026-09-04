import { describe, expect, it } from "vitest";

import { getPassage } from "@/lib/scripture";
import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import { loadChapterVerses, loadKeyPassage } from "@/lib/scripture/store";
import { isTranslation, TRANSLATIONS, TRANSLATION_META } from "@/lib/scripture/types";

describe("parseReference", () => {
  it("parses a verse range", () => {
    expect(parseReference("Matthew 5:3-12")).toEqual({
      book: "Matthew",
      bookCode: "MAT",
      chapter: 5,
      verseStart: 3,
      verseEnd: 12,
    });
  });

  it("parses a single verse, defaulting verseEnd to verseStart", () => {
    expect(parseReference("Matthew 19:14")).toEqual({
      book: "Matthew",
      bookCode: "MAT",
      chapter: 19,
      verseStart: 14,
      verseEnd: 14,
    });
  });

  it("parses a numbered book name", () => {
    expect(parseReference("1 John 4:8")).toEqual({
      book: "1 John",
      bookCode: "1JN",
      chapter: 4,
      verseStart: 8,
      verseEnd: 8,
    });
  });

  it("returns null for an unrecognized book", () => {
    expect(parseReference("Gospel of Nobody 1:1")).toBeNull();
  });

  it("returns null for a malformed reference", () => {
    expect(parseReference("not a reference")).toBeNull();
  });

  it("returns null when verseEnd precedes verseStart", () => {
    expect(parseReference("Matthew 5:12-3")).toBeNull();
  });
});

describe("bibleComUrl", () => {
  it("builds the chapter link with version id and translation code", () => {
    const parsed = parseReference("Matthew 5:3-12")!;
    expect(bibleComUrl(parsed, "NET")).toBe("https://www.bible.com/bible/107/MAT.5.NET");
    expect(bibleComUrl(parsed, "ESV")).toBe("https://www.bible.com/bible/59/MAT.5.ESV");
  });
});

describe("isTranslation", () => {
  it("accepts all ten supported translations (D1)", () => {
    expect(TRANSLATIONS).toHaveLength(10);
    for (const t of TRANSLATIONS) {
      expect(isTranslation(t)).toBe(true);
    }
  });

  it("rejects unsupported strings and non-strings", () => {
    expect(isTranslation("KJV")).toBe(false);
    expect(isTranslation(null)).toBe(false);
    expect(isTranslation(undefined)).toBe(false);
  });
});

describe("TRANSLATION_META", () => {
  it("has a metadata record for every translation with a non-empty display name, attribution, and bible.com id", () => {
    for (const t of TRANSLATIONS) {
      const meta = TRANSLATION_META[t];
      expect(meta.displayName.length).toBeGreaterThan(0);
      expect(meta.attribution.length).toBeGreaterThan(0);
      expect(meta.bibleComId).toBeGreaterThan(0);
    }
  });

  it("flags only NET and KRV as full-text, per D3", () => {
    const fullText = TRANSLATIONS.filter((t) => TRANSLATION_META[t].fullText);
    expect(fullText.sort()).toEqual(["KRV", "NET"]);
  });
});

describe("lib/scripture/store (bundled data on disk)", () => {
  it("loads a full-book chapter for NET and KRV", () => {
    const net = loadChapterVerses("NET", 1);
    const krv = loadChapterVerses("KRV", 1);
    expect(net?.["1"]).toBeTruthy();
    expect(krv?.["1"]).toBeTruthy();
  });

  it("returns null for a chapter that doesn't exist", () => {
    expect(loadChapterVerses("NET", 29)).toBeNull();
  });

  it("full-book verse counts differ between NET and KRV by design (textual variants), not by fixed count", () => {
    // NET omits Matthew 17:21, 18:11 and 23:14 as textual variants absent from
    // the critical text; KRV (Textus-Receptus-based) retains them. Never
    // assert a single fixed verse count for "every full-book version."
    const netCh18 = loadChapterVerses("NET", 18)!;
    const krvCh18 = loadChapterVerses("KRV", 18)!;
    expect(netCh18["11"]).toBeUndefined();
    expect(krvCh18["11"]).toBeTruthy();
  });

  it("loads a key passage by its exact reference string", () => {
    const passage = loadKeyPassage("ESV", "Matthew 1:20-21");
    expect(passage?.["20"]).toBeTruthy();
    expect(passage?.["21"]).toBeTruthy();
  });

  it("returns null for a reference not among the curated key passages", () => {
    expect(loadKeyPassage("ESV", "Matthew 1:1")).toBeNull();
  });

  it("returns null for a version with no bundled data at all (CSB/NIV, sourced in #49)", () => {
    expect(loadKeyPassage("CSB", "Matthew 1:20-21")).toBeNull();
  });
});

describe("getPassage", () => {
  it("extracts a verse range from a full-text version, routed by the fullText flag", async () => {
    const result = await getPassage("Matthew 5:3-4", "NET");
    expect(result.text).toBeTruthy();
    expect(result.text).not.toContain("undefined");
  });

  it("looks up an exact key-passage reference for a non-full-text version", async () => {
    const result = await getPassage("Matthew 1:20-21", "ESV");
    expect(result.text).toBeTruthy();
  });

  it("degrades to null text for a reference outside the curated key passages on a non-full-text version", async () => {
    const result = await getPassage("Matthew 1:1", "ESV");
    expect(result.text).toBeNull();
    expect(result.bibleComUrl).toContain("bible.com");
  });

  it("degrades to null text and an empty bibleComUrl for an unparseable reference", async () => {
    const result = await getPassage("not a reference", "NET");
    expect(result.text).toBeNull();
    expect(result.bibleComUrl).toBe("");
  });

  it("carries the translation's attribution line on every result, including a miss", async () => {
    const hit = await getPassage("Matthew 1:20-21", "NASB");
    const miss = await getPassage("Matthew 1:1", "NASB");
    expect(hit.attribution).toBe(TRANSLATION_META.NASB.attribution);
    expect(miss.attribution).toBe(TRANSLATION_META.NASB.attribution);
  });
});
