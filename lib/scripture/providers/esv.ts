import { fetchWithTimeout } from "@/lib/scripture/fetch-timeout";
import type { ParsedReference } from "@/lib/scripture/types";

type EsvResponse = { passages: string[] };

/** api.esv.org. Requires ESV_API_KEY; returns null (fallback) when unset. */
export async function fetchEsv(parsed: ParsedReference): Promise<string | null> {
  const key = process.env.ESV_API_KEY;
  if (!key) return null;

  const passage = `${parsed.book}+${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`;
  const url = `https://api.esv.org/v3/passage/text/?q=${passage}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Token ${key}` } });
  if (!res.ok) throw new Error(`ESV API ${res.status}`);
  const body = (await res.json()) as EsvResponse;
  const text = body.passages?.[0]?.trim();
  if (!text) throw new Error("ESV API returned no passage");
  return text;
}
