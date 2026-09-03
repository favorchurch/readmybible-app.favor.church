import { fetchWithTimeout } from "@/lib/scripture/fetch-timeout";
import type { ParsedReference } from "@/lib/scripture/types";

type NetVerse = { bookname: string; chapter: string; verse: string; text: string };

/** labs.bible.org NET Bible API. No key required. */
export async function fetchNet(parsed: ParsedReference): Promise<string> {
  const passage = `${parsed.book}+${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}`;
  const url = `https://labs.bible.org/api/?passage=${passage}&type=json&formatting=plain`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`NET API ${res.status}`);
  const verses = (await res.json()) as NetVerse[];
  const text = verses.map((v) => v.text.trim()).join(" ").trim();
  if (!text) throw new Error("NET API returned no verses");
  return text;
}
