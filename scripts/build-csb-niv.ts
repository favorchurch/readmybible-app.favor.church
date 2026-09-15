/** Download full Matthew 1–28 from the licensed API.Bible editions used by the app.
 *
 * The output is committed as offline chapter JSON and the runtime route uses
 * API.Bible with a 30-day cache as a fallback when a chapter is absent locally.
 * Re-run this before the API.Bible cache window expires when refreshing the
 * campaign data. Usage: npm run scripture:build-csb-niv
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { API_BIBLE_TRANSLATIONS, fetchApiBibleChapter, hasApiBibleConfig } from "../lib/scripture/api-bible";

const CHAPTER_COUNT = 28;

async function main() {
  if (!hasApiBibleConfig()) throw new Error("BIBLE_API_URL and BIBLE_API_KEY are required to build API.Bible data");

  const dataRoot = path.join(process.cwd(), "lib", "scripture", "data");

  for (const version of API_BIBLE_TRANSLATIONS) {
    const dir = path.join(dataRoot, version);
    mkdirSync(dir, { recursive: true });
    for (const filename of readdirSync(dir)) {
      if (filename.endsWith(".json")) unlinkSync(path.join(dir, filename));
    }

    let verseCount = 0;
    for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
      const verses = await fetchApiBibleChapter(version, "MAT", chapter);
      if (!verses) throw new Error(`${version} Matthew ${chapter}: API.Bible returned no verse data`);
      writeFileSync(path.join(dir, `${chapter}.json`), JSON.stringify(verses));
      verseCount += Object.keys(verses).length;
    }
    console.log(`${version}: wrote ${CHAPTER_COUNT} chapter files, ${verseCount} verses`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
