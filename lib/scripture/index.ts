/**
 * Scripture text lookup for the quick-verse popup. Bundled key passages at
 * lib/scripture/data/ (built by scripts/build-scripture.ts) are read
 * server-side by lib/scripture/store.ts and checked first, since a local
 * file read is fastest. A reference the bundled data doesn't cover falls
 * through to API.Bible for CSB, NIV 2011, and NASB 2020, then to a live,
 * per-chapter fetch from bolls.life (lib/scripture/live.ts) for the versions
 * bolls.life serves; anything left over degrades to `text: null` and the popup
 * shows the reference and the Bible.com link only. No "server-only" import here so tests/scripture.test.ts can call
 * getPassage() directly; the only runtime caller is
 * app/api/scripture/route.ts, a Route Handler, which Next.js already
 * refuses to bundle into client code.
 */
import { fetchApiBibleChapter, isApiBibleTranslation } from "@/lib/scripture/api-bible";
import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import { fetchLiveChapter } from "@/lib/scripture/live";
import { loadChapterVerses, loadKeyPassage } from "@/lib/scripture/store";
import { TRANSLATION_META } from "@/lib/scripture/types";
import type { ParsedReference, ScriptureResult, ScriptureSource, Translation } from "@/lib/scripture/types";

export * from "@/lib/scripture/types";
export { parseReference, bibleComUrl } from "@/lib/scripture/reference";

function joinVerses(verses: Record<string, string>): string {
  return Object.keys(verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => verses[String(n)])
    .join(" ")
    .trim();
}

/**
 * The requested slice of a chapter, still keyed by verse number so the caller
 * can render each verse separately. A reference with no verse part ("Matthew
 * 4") is the whole chapter. Returns null rather than an empty object when the
 * range lands on nothing, so "no such passage" stays distinguishable from
 * "a passage that happens to be empty".
 */
function extractVerseRange(chapter: Record<string, string>, parsed: ParsedReference): Record<string, string> | null {
  if (parsed.verseEnd === null) return Object.keys(chapter).length ? chapter : null;
  const verses: Record<string, string> = {};
  for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
    const text = chapter[String(v)];
    if (text) verses[String(v)] = text;
  }
  return Object.keys(verses).length ? verses : null;
}

type PassageLookup = { verses: Record<string, string> | null; source: ScriptureSource };

async function extractPassage(translation: Translation, parsed: ParsedReference, ref: string): Promise<PassageLookup> {
  if (TRANSLATION_META[translation].fullText) {
    const chapter = loadChapterVerses(translation, parsed.chapter);
    if (chapter) {
      const verses = extractVerseRange(chapter, parsed);
      if (verses) return { verses, source: isApiBibleTranslation(translation) ? "api-bible" : "bundled" };
    }
  } else {
    const passage = loadKeyPassage(translation, ref);
    if (passage) return { verses: passage, source: "bundled" };
  }

  const apiChapter = await fetchApiBibleChapter(translation, parsed.bookCode, parsed.chapter);
  if (apiChapter) {
    const verses = extractVerseRange(apiChapter, parsed);
    if (verses) return { verses, source: "api-bible" };
  }

  const liveChapter = await fetchLiveChapter(translation, parsed.bookCode, parsed.chapter);
  if (liveChapter) {
    const verses = extractVerseRange(liveChapter, parsed);
    if (verses) return { verses, source: "bolls" };
  }
  return { verses: null, source: "unavailable" };
}

export async function getPassage(ref: string, translation: Translation): Promise<ScriptureResult> {
  const parsed = parseReference(ref);
  const attribution = TRANSLATION_META[translation].attribution;
  if (!parsed) {
    return { ref, translation, text: null, verses: null, bibleComUrl: "", attribution, source: "unavailable" };
  }

  const url = bibleComUrl(parsed, translation);
  const passage = await extractPassage(translation, parsed, ref);
  return {
    ref,
    translation,
    text: passage.verses ? joinVerses(passage.verses) : null,
    verses: passage.verses,
    bibleComUrl: url,
    attribution,
    source: passage.source,
  };
}
