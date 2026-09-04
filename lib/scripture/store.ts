/**
 * Reads bundled Matthew text from lib/scripture/data/, server-side only.
 * Full-book versions (NET, KRV) are split one file per chapter; every other
 * version keeps a single key-passages.json keyed by the exact reference
 * string from lib/plan.ts. No "server-only" import here, on purpose --
 * node:fs already makes this unbundlable to a client, and the same gap lets
 * tests/scripture.test.ts exercise it directly (see lib/admin/stats.ts for
 * the same pattern). getPassage() (lib/scripture/index.ts) is the only
 * runtime caller, invoked from the API route.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import type { Translation } from "@/lib/scripture/types";

const DATA_ROOT = path.join(process.cwd(), "lib", "scripture", "data");

function readJson<T>(relPath: string): T | null {
  try {
    const raw = readFileSync(path.join(DATA_ROOT, relPath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** `{"<verse>": "text"}` for one chapter of a full-text version. */
export function loadChapterVerses(version: Translation, chapter: number): Record<string, string> | null {
  return readJson<Record<string, string>>(`${version}/${chapter}.json`);
}

/** `{"Matthew 1:20-21": {"20": "text", "21": "text"}}` for a key-passages-only version. */
export function loadKeyPassage(version: Translation, ref: string): Record<string, string> | null {
  const passages = readJson<Record<string, Record<string, string>>>(`${version}/key-passages.json`);
  return passages?.[ref] ?? null;
}
