/**
 * Scripture text lookup for the quick-verse popup. One adapter per
 * provider (lib/scripture/providers/), a shared reference parser, and a
 * Redis-backed cache keyed by translation + reference. Any parse failure,
 * missing provider key, or provider error degrades to `text: null` -- the
 * popup then shows the reference and the Bible.com link only.
 */
import "server-only";

import { redisGet, redisSetEx } from "@/lib/cache/redis";
import { fetchCsb, fetchNiv } from "@/lib/scripture/providers/api-bible";
import { fetchEsv } from "@/lib/scripture/providers/esv";
import { fetchNet } from "@/lib/scripture/providers/net";
import { fetchNlt } from "@/lib/scripture/providers/nlt";
import { bibleComUrl, parseReference } from "@/lib/scripture/reference";
import type { ParsedReference, ScriptureResult, Translation } from "@/lib/scripture/types";

export * from "@/lib/scripture/types";
export { parseReference, bibleComUrl } from "@/lib/scripture/reference";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

async function fetchPassageText(translation: Translation, parsed: ParsedReference): Promise<string | null> {
  switch (translation) {
    case "NET":
      return fetchNet(parsed);
    case "ESV":
      return fetchEsv(parsed);
    case "NLT":
      return fetchNlt(parsed);
    case "CSB":
      return fetchCsb(parsed);
    case "NIV":
      return fetchNiv(parsed);
  }
}

export async function getPassage(ref: string, translation: Translation): Promise<ScriptureResult> {
  const parsed = parseReference(ref);
  if (!parsed) {
    return { ref, translation, text: null, bibleComUrl: "" };
  }
  const url = bibleComUrl(parsed, translation);

  const cacheKey = `scripture:${translation}:${parsed.bookCode}.${parsed.chapter}.${parsed.verseStart}-${parsed.verseEnd}`;
  const cachedText = await redisGet(cacheKey);
  if (cachedText !== null) {
    return { ref, translation, text: cachedText, bibleComUrl: url };
  }

  const text = await fetchPassageText(translation, parsed).catch(() => null);
  if (text) void redisSetEx(cacheKey, THIRTY_DAYS_SECONDS, text);
  return { ref, translation, text, bibleComUrl: url };
}
