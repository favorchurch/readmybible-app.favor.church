/**
 * Scripture text lookup for the quick-verse popup. Bundled key passages at
 * lib/scripture/data/ (built by scripts/build-scripture.ts) are read
 * server-side by lib/scripture/store.ts and checked first, since a local
 * file read is fastest. A reference the bundled data doesn't cover falls
 * through to a live, per-chapter fetch from bolls.life (lib/scripture/live.ts)
 * for the versions bolls.life serves; anything left over degrades to
 * `text: null` and the popup shows the reference and the Bible.com link
 * only. No "server-only" import here so tests/scripture.test.ts can call
 * getPassage() directly; the only runtime caller is
 * app/api/scripture/route.ts, a Route Handler, which Next.js already
 * refuses to bundle into client code.
 */
import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import { fetchLiveChapter } from "@/lib/scripture/live";
import { loadChapterVerses, loadKeyPassage } from "@/lib/scripture/store";
import { TRANSLATION_META } from "@/lib/scripture/types";
import type { ParsedReference, ScriptureResult, Translation } from "@/lib/scripture/types";

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

function extractVerseRange(chapter: Record<string, string>, parsed: ParsedReference): string | null {
  if (parsed.verseEnd === null) return joinVerses(chapter);
  const verses: Record<string, string> = {};
  for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
    const text = chapter[String(v)];
    if (text) verses[String(v)] = text;
  }
  return Object.keys(verses).length ? joinVerses(verses) : null;
}

async function extractPassage(translation: Translation, parsed: ParsedReference, ref: string): Promise<string | null> {
  if (TRANSLATION_META[translation].fullText) {
    const chapter = loadChapterVerses(translation, parsed.chapter);
    if (chapter) return extractVerseRange(chapter, parsed);
  } else {
    const passage = loadKeyPassage(translation, ref);
    if (passage) return joinVerses(passage);
  }

  const liveChapter = await fetchLiveChapter(translation, parsed.bookCode, parsed.chapter);
  return liveChapter ? extractVerseRange(liveChapter, parsed) : null;
}

export async function getPassage(ref: string, translation: Translation): Promise<ScriptureResult> {
  const parsed = parseReference(ref);
  const attribution = TRANSLATION_META[translation].attribution;
  if (!parsed) {
    return { ref, translation, text: null, bibleComUrl: "", attribution };
  }

  const url = bibleComUrl(parsed, translation);
  const text = await extractPassage(translation, parsed, ref);
  return { ref, translation, text, bibleComUrl: url, attribution };
}
