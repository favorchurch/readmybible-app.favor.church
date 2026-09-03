import { afterEach, describe, expect, it } from "vitest";

import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import { isTranslation } from "@/lib/scripture/types";
import { fetchEsv } from "@/lib/scripture/providers/esv";
import { fetchNlt } from "@/lib/scripture/providers/nlt";
import { fetchCsb, fetchNiv } from "@/lib/scripture/providers/api-bible";

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
  it("accepts the five supported translations", () => {
    for (const t of ["NET", "ESV", "CSB", "NIV", "NLT"]) {
      expect(isTranslation(t)).toBe(true);
    }
  });

  it("rejects unsupported strings and non-strings", () => {
    expect(isTranslation("KJV")).toBe(false);
    expect(isTranslation(null)).toBe(false);
    expect(isTranslation(undefined)).toBe(false);
  });
});

describe("provider fallback when a key is missing", () => {
  const parsed = parseReference("Matthew 5:3-12")!;

  afterEach(() => {
    delete process.env.ESV_API_KEY;
    delete process.env.NLT_API_KEY;
    delete process.env.API_BIBLE_KEY;
  });

  it("ESV adapter returns null without ESV_API_KEY", async () => {
    delete process.env.ESV_API_KEY;
    await expect(fetchEsv(parsed)).resolves.toBeNull();
  });

  it("NLT adapter returns null without NLT_API_KEY", async () => {
    delete process.env.NLT_API_KEY;
    await expect(fetchNlt(parsed)).resolves.toBeNull();
  });

  it("CSB and NIV adapters return null without API_BIBLE_KEY", async () => {
    delete process.env.API_BIBLE_KEY;
    await expect(fetchCsb(parsed)).resolves.toBeNull();
    await expect(fetchNiv(parsed)).resolves.toBeNull();
  });

  it("CSB and NIV adapters return null even with a key, since no bibleId is hardcoded yet", async () => {
    process.env.API_BIBLE_KEY = "test-key";
    await expect(fetchCsb(parsed)).resolves.toBeNull();
    await expect(fetchNiv(parsed)).resolves.toBeNull();
  });
});
