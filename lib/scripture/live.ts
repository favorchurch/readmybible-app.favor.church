/**
 * Live, per-chapter scripture fetch from bolls.life (keyless), used as a
 * fallback when the bundled data in lib/scripture/data/ doesn't cover a
 * requested reference (i.e. anything outside a version's 28 curated key
 * passages). Nothing here is written to disk or committed -- each call
 * fetches one chapter, on demand, for display only. Results are cached
 * in memory per warm instance to avoid re-fetching the same chapter on
 * every request; the cache is never persisted.
 *
 * CSB and NIV (2011) are not served by bolls.life at all -- see
 * scripts/build-scripture.ts and intent/DECISIONS.md D-csb-niv-source --
 * so they are deliberately excluded from LIVE_FETCH_VERSIONS and keep
 * degrading to the Bible.com link like today.
 */
import type { Translation } from "@/lib/scripture/types";

export const LIVE_FETCH_VERSIONS = ["NET", "KRV", "ESV", "NLT", "MSG", "NKJV", "NASB", "AMP"] as const;

type LiveFetchVersion = (typeof LIVE_FETCH_VERSIONS)[number];

function supportsLiveFetch(version: Translation): version is LiveFetchVersion {
  return (LIVE_FETCH_VERSIONS as readonly string[]).includes(version);
}

/** Protestant canon book order, 1-based -- the ordinal bolls.life expects. Matches MATTHEW_BOOK_NUMBER=40 in scripts/build-scripture.ts. */
const BOOK_NUMBERS: Record<string, number> = {
  GEN: 1, EXO: 2, LEV: 3, NUM: 4, DEU: 5, JOS: 6, JDG: 7, RUT: 8, "1SA": 9, "2SA": 10,
  "1KI": 11, "2KI": 12, "1CH": 13, "2CH": 14, EZR: 15, NEH: 16, EST: 17, JOB: 18, PSA: 19, PRO: 20,
  ECC: 21, SNG: 22, ISA: 23, JER: 24, LAM: 25, EZK: 26, DAN: 27, HOS: 28, JOL: 29, AMO: 30,
  OBA: 31, JON: 32, MIC: 33, NAM: 34, HAB: 35, ZEP: 36, HAG: 37, ZEC: 38, MAL: 39, MAT: 40,
  MRK: 41, LUK: 42, JHN: 43, ACT: 44, ROM: 45, "1CO": 46, "2CO": 47, GAL: 48, EPH: 49, PHP: 50,
  COL: 51, "1TH": 52, "2TH": 53, "1TI": 54, "2TI": 55, TIT: 56, PHM: 57, HEB: 58, JAS: 59, "1PE": 60,
  "2PE": 61, "1JN": 62, "2JN": 63, "3JN": 64, JUD: 65, REV: 66,
};

const FETCH_TIMEOUT_MS = 8_000;

type BollsVerse = { verse: number; text: string };

function stripMarkup(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const chapterCache = new Map<string, Record<string, string> | null>();

async function fetchFromBolls(version: LiveFetchVersion, bookNumber: number, chapter: number): Promise<Record<string, string> | null> {
  const url = `https://bolls.life/get-text/${version}/${bookNumber}/${chapter}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Chapter text for a given translation is static and the read is idempotent, so let
    // Next's fetch Data Cache hold it indefinitely (durable across cold starts/instances,
    // beyond the in-memory chapterCache above which only survives one warm instance).
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "force-cache" });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) return null;
    const record: Record<string, string> = {};
    for (const v of body as BollsVerse[]) record[String(v.verse)] = stripMarkup(v.text);
    return record;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** `{"<verse>": "text"}` for one chapter, fetched live from bolls.life, or null if the version/book isn't served live or the fetch failed. */
export async function fetchLiveChapter(version: Translation, bookCode: string, chapter: number): Promise<Record<string, string> | null> {
  if (!supportsLiveFetch(version)) return null;
  const bookNumber = BOOK_NUMBERS[bookCode];
  if (!bookNumber) return null;

  const cacheKey = `${version}:${bookNumber}:${chapter}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey) ?? null;

  const result = await fetchFromBolls(version, bookNumber, chapter);
  chapterCache.set(cacheKey, result);
  return result;
}

/** Test-only: clears the in-memory chapter cache so mocked fetches in one test don't leak into another. */
export function clearLiveCacheForTests(): void {
  chapterCache.clear();
}
