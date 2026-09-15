import { z } from "zod";

import type { Translation } from "@/lib/scripture/types";

export const API_BIBLE_VERSIONS = {
  CSB: { bibleId: "a556c5305ee15c3f-01" },
  NIV: { bibleId: "78a9f6124f344018-01" },
  NASB2020: { bibleId: "a761ca71e0b3ddcf-01" },
} as const;

export const API_BIBLE_TRANSLATIONS = ["CSB", "NIV", "NASB2020"] as const;
export type ApiBibleTranslation = (typeof API_BIBLE_TRANSLATIONS)[number];

const API_BIBLE_CACHE_SECONDS = 30 * 24 * 60 * 60;
const FETCH_TIMEOUT_MS = 30_000;
const RETRY_COUNT = 3;

type ApiBibleNode = {
  type: string;
  name?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  items?: ApiBibleNode[];
};

const apiBibleNodeSchema: z.ZodType<ApiBibleNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    name: z.string().optional(),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    items: z.array(apiBibleNodeSchema).optional(),
  }),
);

const apiBibleResponseSchema = z.object({
  data: z.object({
    content: z.array(apiBibleNodeSchema),
  }),
});

function getApiBibleConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.BIBLE_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.BIBLE_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

export function hasApiBibleConfig(): boolean {
  return getApiBibleConfig() !== null;
}

export function isApiBibleTranslation(value: Translation): value is ApiBibleTranslation {
  return (API_BIBLE_TRANSLATIONS as readonly string[]).includes(value);
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collectText(nodes: readonly ApiBibleNode[]): string {
  return nodes
    .filter((node) => node.name !== "verse")
    .map((node) => node.text ?? collectText(node.items ?? []))
    .join("");
}

function extractVerseMap(content: readonly ApiBibleNode[]): Record<string, string> {
  const verses: Record<string, string> = {};

  function visit(nodes: readonly ApiBibleNode[], activeVerse: string | null): string | null {
    let currentVerse = activeVerse;
    for (const node of nodes) {
      if (node.name === "verse-span") {
        const verseId = node.attrs?.verseId;
        const match = typeof verseId === "string" ? /^[A-Z0-9]+\.\d+\.(\d+)$/.exec(verseId) : null;
        if (match) {
          currentVerse = match[1];
          const text = normalize(collectText(node.items ?? []));
          if (text) verses[currentVerse] = normalize(`${verses[currentVerse] ?? ""} ${text}`);
        }
        continue;
      }
      if (node.type === "text" && currentVerse && node.text) {
        verses[currentVerse] = normalize(`${verses[currentVerse] ?? ""} ${node.text}`);
        continue;
      }
      currentVerse = visit(node.items ?? [], currentVerse);
    }
    return currentVerse;
  }

  visit(content, null);
  return verses;
}

const chapterCache = new Map<string, Record<string, string> | null>();

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchChapterFromApi(
  version: ApiBibleTranslation,
  bookCode: string,
  chapter: number,
): Promise<Record<string, string> | null> {
  const config = getApiBibleConfig();
  if (!config) return null;

  const bibleId = API_BIBLE_VERSIONS[version].bibleId;
  const query = new URLSearchParams({
    "content-type": "json",
    "include-chapter-numbers": "false",
    "include-notes": "false",
    "include-titles": "false",
    "include-verse-numbers": "true",
    "include-verse-spans": "true",
  });
  const url = `${config.baseUrl}/v1/bibles/${bibleId}/passages/${bookCode}.${chapter}?${query}`;
  for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "api-key": config.apiKey },
        next: { revalidate: API_BIBLE_CACHE_SECONDS, tags: [`scripture:${version}:${bookCode}:${chapter}`] },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status >= 500 && attempt < RETRY_COUNT - 1) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        return null;
      }

      const parsed = apiBibleResponseSchema.safeParse(await response.json());
      if (!parsed.success) return null;
      const verses = extractVerseMap(parsed.data.data.content);
      return Object.keys(verses).length ? verses : null;
    } catch {
      if (attempt < RETRY_COUNT - 1) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/** Fetches and caches one API.Bible chapter. Missing configuration or API failures degrade to null. */
export async function fetchApiBibleChapter(
  version: Translation,
  bookCode: string,
  chapter: number,
): Promise<Record<string, string> | null> {
  if (!isApiBibleTranslation(version)) return null;

  const config = getApiBibleConfig();
  if (!config) return null;

  const cacheKey = `${version}:${bookCode}:${chapter}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey) ?? null;

  const result = await fetchChapterFromApi(version, bookCode, chapter);
  chapterCache.set(cacheKey, result);
  return result;
}

/** Test-only cache reset. */
export function clearApiBibleCacheForTests(): void {
  chapterCache.clear();
}
