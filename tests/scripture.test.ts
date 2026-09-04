import { afterEach, describe, expect, it } from "vitest";

import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import { isTranslation, TRANSLATIONS, TRANSLATION_META } from "@/lib/scripture/types";
import { fetchEsv } from "@/lib/scripture/providers/esv";
import { bookOrdinal, fetchNet, stripVerseMarkup } from "@/lib/scripture/providers/net";
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

describe("NET provider (bolls.life)", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("maps USFM codes to the canon ordinal", () => {
    expect(bookOrdinal("GEN")).toBe(1);
    expect(bookOrdinal("MAT")).toBe(40);
    expect(bookOrdinal("REV")).toBe(66);
    expect(bookOrdinal("XYZ")).toBeNull();
  });

  it("strips bolls markup and footnotes", () => {
    expect(stripVerseMarkup('“Blessed<sup>a</sup> are the poor,<br/>for theirs is <i>the</i> kingdom.')).toBe(
      "“Blessed are the poor, for theirs is the kingdom.",
    );
  });

  it("fetches the chapter and keeps only the requested verse range, in order", async () => {
    let calledUrl = "";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calledUrl = String(input);
      return new Response(
        JSON.stringify([
          { pk: 3, verse: 5, text: "five" },
          { pk: 1, verse: 3, text: "three<br/>" },
          { pk: 2, verse: 4, text: "four" },
          { pk: 0, verse: 2, text: "two" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    const parsed = parseReference("Matthew 5:3-4")!;
    await expect(fetchNet(parsed)).resolves.toBe("three four");
    expect(calledUrl).toBe("https://bolls.life/get-text/NET/40/5/");
  });

  it("throws when the range is empty so the caller degrades to null", async () => {
    globalThis.fetch = (async () => new Response("[]", { status: 200 })) as typeof fetch;
    await expect(fetchNet(parseReference("Matthew 5:3")!)).rejects.toThrow();
  });
});
