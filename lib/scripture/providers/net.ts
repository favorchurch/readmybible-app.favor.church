import { fetchWithTimeout } from "@/lib/scripture/fetch-timeout";
import type { ParsedReference } from "@/lib/scripture/types";

type BollsVerse = { pk: number; verse: number; text: string };

/** Protestant canon in order; bolls.life addresses books by this 1-based ordinal. */
const BOOK_ORDER = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH",
  "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS",
  "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH",
  "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

export function bookOrdinal(bookCode: string): number | null {
  const index = BOOK_ORDER.indexOf(bookCode);
  return index === -1 ? null : index + 1;
}

/** Strip the light markup bolls embeds (<br/>, <sup>notes</sup>, <i>) down to plain text. */
export function stripVerseMarkup(html: string): string {
  return html
    .replace(/<sup>[\s\S]*?<\/sup>/g, "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * NET Bible text via bolls.life (no key). labs.bible.org, the official NET API,
 * now sits behind a Cloudflare browser challenge and returns an empty body to
 * server-side clients, so it cannot back a server route.
 */
export async function fetchNet(parsed: ParsedReference): Promise<string> {
  const ordinal = bookOrdinal(parsed.bookCode);
  if (!ordinal) throw new Error(`Unknown book code ${parsed.bookCode}`);

  const url = `https://bolls.life/get-text/NET/${ordinal}/${parsed.chapter}/`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`NET (bolls) ${res.status}`);
  const verses = (await res.json()) as BollsVerse[];
  if (!Array.isArray(verses)) throw new Error("NET (bolls) returned a non-array");

  const text = verses
    .filter((v) => v.verse >= parsed.verseStart && v.verse <= parsed.verseEnd)
    .sort((a, b) => a.verse - b.verse)
    .map((v) => stripVerseMarkup(v.text))
    .join(" ")
    .trim();
  if (!text) throw new Error("NET (bolls) returned no verses in range");
  return text;
}
