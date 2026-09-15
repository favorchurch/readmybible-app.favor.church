/** D1: the versions Favor licenses for this campaign. */
export const TRANSLATIONS = ["NET", "ESV", "CSB", "NIV", "NLT", "MSG", "NKJV", "NASB", "NASB2020", "AMP", "KRV"] as const;

export type Translation = (typeof TRANSLATIONS)[number];

export function isTranslation(value: unknown): value is Translation {
  return typeof value === "string" && (TRANSLATIONS as readonly string[]).includes(value);
}

export type TranslationMeta = {
  /** Shown in version pickers. */
  displayName: string;
  /** bible.com's numeric version id, used to build chapter links. Verified live against bible.com, not assumed. */
  bibleComId: number;
  /** Publisher attribution line, required by every quotation permission (D3). */
  attribution: string;
  /** Whether the full Gospel of Matthew is bundled for the October reading run. */
  fullText: boolean;
};

export const TRANSLATION_META: Record<Translation, TranslationMeta> = {
  NET: {
    displayName: "New English Translation",
    bibleComId: 107,
    attribution:
      "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996-2017 by Biblical Studies Press, L.L.C. All rights reserved.",
    fullText: true,
  },
  ESV: {
    displayName: "English Standard Version",
    bibleComId: 59,
    attribution:
      "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.",
    fullText: false,
  },
  CSB: {
    displayName: "Christian Standard Bible",
    bibleComId: 1713,
    attribution:
      "Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission. Christian Standard Bible® and CSB® are federally registered trademarks of Holman Bible Publishers.",
    fullText: true,
  },
  NIV: {
    displayName: "New International Version (2011)",
    bibleComId: 111,
    attribution:
      "Scripture quotations taken from The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc. Used by permission of Biblica, Inc. All rights reserved worldwide.",
    fullText: true,
  },
  NLT: {
    displayName: "New Living Translation",
    bibleComId: 116,
    attribution:
      "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright ©1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.",
    fullText: false,
  },
  MSG: {
    displayName: "The Message",
    bibleComId: 97,
    attribution:
      "Scripture quotations taken from THE MESSAGE. Copyright © 1993, 1994, 1995, 1996, 2000, 2001, 2002. Used by permission of NavPress. All rights reserved.",
    fullText: false,
  },
  NKJV: {
    displayName: "New King James Version",
    bibleComId: 114,
    attribution: "Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.",
    fullText: false,
  },
  NASB: {
    displayName: "New American Standard Bible (1995)",
    bibleComId: 100,
    attribution:
      "Scripture quotations taken from the (NASB®) New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation. Used by permission. www.lockman.org",
    fullText: false,
  },
  NASB2020: {
    displayName: "New American Standard Bible 2020",
    bibleComId: 2692,
    attribution:
      "NEW AMERICAN STANDARD BIBLE® NASB® Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. Used by permission. All rights reserved. www.lockman.org",
    fullText: true,
  },
  AMP: {
    displayName: "Amplified Bible",
    bibleComId: 1588,
    attribution: "Scripture taken from the Amplified® Bible, Copyright © 2015 by The Lockman Foundation. Used by permission. www.lockman.org",
    fullText: false,
  },
  KRV: {
    displayName: "개역한글 (Korean Revised Version)",
    bibleComId: 88,
    attribution: "개역한글판, 1961. Public domain.",
    fullText: true,
  },
};

export type ParsedReference = {
  /** Book name as written in the reference, e.g. "Matthew". */
  book: string;
  /** Three-letter USFM-style book code, e.g. "MAT". */
  bookCode: string;
  chapter: number;
  verseStart: number;
  /** null means the reference covers the rest of the chapter. */
  verseEnd: number | null;
};

export type ScriptureResult = {
  ref: string;
  translation: Translation;
  /** null when the bundled data has no entry for this reference (e.g. a range outside the 28 curated key passages on a non-full-text version). */
  text: string | null;
  /**
   * The same passage keyed by verse number, in the order the reference asked
   * for: `{"1": "Then Jesus was led up...", "2": "After he had fasted..."}`.
   * `text` is this map joined by spaces and stays on the response because the
   * tick sentinel and the tests read it; `verses` is what the reading dialog
   * renders, so it can put a numbered superscript before each verse. null
   * exactly when `text` is null.
   */
  verses: Record<string, string> | null;
  bibleComUrl: string;
  /** Publisher attribution line (TRANSLATION_META[translation].attribution); required on every rendered passage. */
  attribution: string;
  source: ScriptureSource;
};

/**
 * `key-passage-fallback` is a degraded answer, not a normal one: the reader
 * asked for a whole chapter, every path that could serve it failed, and what
 * came back is the handful of curated verses bundled on disk. It is kept
 * distinct from `bundled` so the route can refuse to cache it and the dialog
 * can say so -- both of which are impossible if a partial answer is
 * indistinguishable from a complete one.
 */
export type ScriptureSource = "bundled" | "api-bible" | "bolls" | "key-passage-fallback" | "unavailable";
