import { fetchWithTimeout } from "@/lib/scripture/fetch-timeout";
import type { ParsedReference } from "@/lib/scripture/types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * api.nlt.to. Requires NLT_API_KEY; returns null (fallback) when unset.
 * `ref` uses the API's book code, e.g. "Matt.5.3-12" -- not verified against
 * a live key since none is provisioned yet; confirm the book-code format
 * (bookCode here is the USFM-style 3-letter code) once NLT_API_KEY exists.
 */
export async function fetchNlt(parsed: ParsedReference): Promise<string | null> {
  const key = process.env.NLT_API_KEY;
  if (!key) return null;

  const ref = `${parsed.bookCode}.${parsed.chapter}.${parsed.verseStart}-${parsed.verseEnd}`;
  const url = `https://api.nlt.to/api/passages?ref=${ref}&version=NLT&key=${key}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`NLT API ${res.status}`);
  const html = await res.text();
  const text = stripHtml(html);
  if (!text) throw new Error("NLT API returned no passage");
  return text;
}
