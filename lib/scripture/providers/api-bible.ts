import { fetchWithTimeout } from "@/lib/scripture/fetch-timeout";
import type { ParsedReference } from "@/lib/scripture/types";

type ApiBibleResponse = { data?: { content?: string } };

/**
 * api.scripture.api.bible bibleIds for CSB and NIV. TODO: resolve these by
 * calling GET /v1/bibles with API_BIBLE_KEY once it's provisioned (per
 * intent/SPEC.md) and hardcode the confirmed ids here -- left blank rather
 * than guessed, since a wrong id would silently 404 forever. NIV access is
 * additionally subject to API.Bible's approval per intent/SPEC.md.
 */
export const API_BIBLE_IDS: Record<"CSB" | "NIV", string> = {
  CSB: "",
  NIV: "",
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchApiBible(parsed: ParsedReference, bibleId: string): Promise<string | null> {
  const key = process.env.API_BIBLE_KEY;
  if (!key || !bibleId) return null;

  const passageId = `${parsed.bookCode}.${parsed.chapter}.${parsed.verseStart}-${parsed.bookCode}.${parsed.chapter}.${parsed.verseEnd}`;
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${passageId}?content-type=text`;
  const res = await fetchWithTimeout(url, { headers: { "api-key": key } });
  if (!res.ok) throw new Error(`API.Bible ${res.status}`);
  const body = (await res.json()) as ApiBibleResponse;
  const text = body.data?.content ? stripHtml(body.data.content) : "";
  if (!text) throw new Error("API.Bible returned no content");
  return text;
}

export function fetchCsb(parsed: ParsedReference): Promise<string | null> {
  return fetchApiBible(parsed, API_BIBLE_IDS.CSB);
}

export function fetchNiv(parsed: ParsedReference): Promise<string | null> {
  return fetchApiBible(parsed, API_BIBLE_IDS.NIV);
}
