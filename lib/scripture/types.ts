export type Translation = "NET" | "ESV" | "CSB" | "NIV" | "NLT";

export const TRANSLATIONS: Translation[] = ["NET", "ESV", "CSB", "NIV", "NLT"];

export function isTranslation(value: unknown): value is Translation {
  return typeof value === "string" && (TRANSLATIONS as string[]).includes(value);
}

/** bible.com's numeric version id, used to build chapter links. */
export const BIBLE_COM_VERSION_ID: Record<Translation, number> = {
  NET: 107,
  ESV: 59,
  CSB: 1713,
  NIV: 111,
  NLT: 116,
};

export type ParsedReference = {
  /** Book name as written in the reference, e.g. "Matthew". */
  book: string;
  /** Three-letter USFM-style book code, e.g. "MAT". */
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

export type ScriptureResult = {
  ref: string;
  translation: Translation;
  /** null when the provider has no key configured or the fetch failed. */
  text: string | null;
  bibleComUrl: string;
};
