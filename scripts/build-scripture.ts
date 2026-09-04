/**
 * Regenerates lib/scripture/data/ from bolls.life (keyless). Faithful
 * TypeScript port of the one-off Python script used to build the data
 * committed to this repo -- run this only to refresh or extend that data,
 * not as part of any build or test. NET and KRV get one file per Matthew
 * chapter (full book, license-clear per intent/DECISIONS.md); the rest get
 * one key-passages.json each, keyed by the exact reference strings in
 * lib/plan.ts so lib/scripture/store.ts can look them up directly.
 *
 * NET has 1068 verses across Matthew vs KRV's 1071 -- NET omits Matthew
 * 17:21, 18:11 and 23:14 as textual variants absent from the critical text.
 * That is correct and must not be "fixed" by back-filling.
 *
 * Usage: pnpm scripture:build
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PLAN } from "../lib/plan";

const MATTHEW_BOOK_NUMBER = 40;
const CHAPTER_COUNT = 28;
const FULL_TEXT_VERSIONS = ["NET", "KRV"] as const;
const KEY_PASSAGE_VERSIONS = ["ESV", "NLT", "MSG", "NKJV", "NASB", "AMP"] as const;
const FETCH_TIMEOUT_MS = 30_000;
const RETRY_COUNT = 3;
const RETRY_BACKOFF_MS = 1500;

const REFS = PLAN.map((entry) => entry.keyPassage);

type BollsVerse = { verse: number; text: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip the light HTML bolls.life embeds (footnote markers, line breaks, italics) down to plain text. */
function stripMarkup(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRef(ref: string): { chapter: number; verseStart: number; verseEnd: number } {
  const match = /^Matthew (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!match) throw new Error(`Unrecognized reference: ${ref}`);
  const [, chapterStr, startStr, endStr] = match;
  const chapter = Number(chapterStr);
  const verseStart = Number(startStr);
  const verseEnd = endStr ? Number(endStr) : verseStart;
  return { chapter, verseStart, verseEnd };
}

async function fetchChapter(version: string, chapter: number): Promise<BollsVerse[]> {
  const url = `https://bolls.life/get-text/${version}/${MATTHEW_BOOK_NUMBER}/${chapter}/`;
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!res.ok) throw new Error(`${version} ${chapter}: HTTP ${res.status}`);
      const body = (await res.json()) as BollsVerse[];
      if (!Array.isArray(body)) throw new Error(`${version} ${chapter}: response was not an array`);
      return body;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT - 1) await sleep(RETRY_BACKOFF_MS * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchAllChapters(version: string): Promise<Map<number, Record<string, string>>> {
  const chapters = new Map<number, Record<string, string>>();
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    const verses = await fetchChapter(version, chapter);
    const record: Record<string, string> = {};
    for (const v of verses) record[String(v.verse)] = stripMarkup(v.text);
    chapters.set(chapter, record);
  }
  return chapters;
}

async function main() {
  const dataRoot = path.join(process.cwd(), "lib", "scripture", "data");

  for (const version of FULL_TEXT_VERSIONS) {
    const chapters = await fetchAllChapters(version);
    const dir = path.join(dataRoot, version);
    mkdirSync(dir, { recursive: true });
    let verseCount = 0;
    for (const [chapter, verses] of chapters) {
      writeFileSync(path.join(dir, `${chapter}.json`), JSON.stringify(verses));
      verseCount += Object.keys(verses).length;
    }
    console.log(`${version}: wrote ${chapters.size} chapter files, ${verseCount} verses`);
  }

  for (const version of KEY_PASSAGE_VERSIONS) {
    const chapters = await fetchAllChapters(version);
    const passages: Record<string, Record<string, string>> = {};
    const gaps: string[] = [];
    for (const ref of REFS) {
      const { chapter, verseStart, verseEnd } = parseRef(ref);
      const verses = chapters.get(chapter) ?? {};
      const passage: Record<string, string> = {};
      for (let v = verseStart; v <= verseEnd; v++) {
        if (verses[String(v)]) passage[String(v)] = verses[String(v)];
      }
      if (Object.keys(passage).length !== verseEnd - verseStart + 1) gaps.push(ref);
      passages[ref] = passage;
    }
    const dir = path.join(dataRoot, version);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "key-passages.json"), JSON.stringify(passages));
    console.log(`${version}: wrote key-passages.json (${REFS.length} passages)${gaps.length ? ` -- gaps: ${gaps.join(", ")}` : ""}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
