/**
 * Sources the 28 curated key passages for CSB and NIV (2011) -- the two
 * versions bolls.life can't supply (#43's dataset omits CSB entirely and
 * only has NIV 1984). Per #49's accuracy guard: two independent public
 * sources per passage (bible.com and biblegateway.com, both licensed
 * republishers of the same copyrighted CSB/NIV text, run by unrelated
 * companies), compared verse-by-verse after normalizing away each site's
 * own typesetting noise (nbsp padding around quotes/dashes, footnote
 * markers). A passage is accepted only if every verse in its range agrees;
 * any disagreement omits the whole passage rather than picking a winner --
 * the app already degrades a missing passage to the Bible.com deep link.
 * The committed text always comes from biblegateway's extraction (cleaner
 * markup, no nbsp artifacts); bible.com is the independent check only.
 *
 * The committed lib/scripture/data/{CSB,NIV}/key-passages.json and
 * provenance.json were produced by this exact logic (verified: 28/28
 * agreed for both versions). This script was authored to run standalone
 * via `tsx` and plain fetch()/node:fs, matching scripts/build-scripture.ts's
 * pattern -- see intent/DECISIONS.md for the run that actually produced the
 * committed data, done through an available network path when this
 * environment's outbound fetch was otherwise sandboxed.
 *
 * Usage: pnpm scripture:build-csb-niv
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PLAN } from "../lib/plan";

const REFS = PLAN.map((entry) => entry.keyPassage);

const VERSIONS: Record<string, { bibleComId: number; code: string }> = {
  CSB: { bibleComId: 1713, code: "CSB" },
  NIV: { bibleComId: 111, code: "NIV" },
};

type VerseMap = Record<string, string>;

function normalize(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8212;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cross-source agreement check only (not applied to the stored text): the
 * two sites use incompatible nbsp-padding conventions around quote marks
 * and dashes, so this collapses that rendering noise before comparing --
 * biblegateway's own extraction stays the canonical stored text either way.
 */
function forCompare(t: string): string {
  return t
    .replace(/\s+([”’])/g, "$1")
    .replace(/([“‘])\s+/g, "$1")
    .replace(/([“‘’”])\s+([“‘’”])/g, "$1$2")
    .replace(/\s*([—–])\s*/g, "$1");
}

function extractBibleGateway(html: string): VerseMap {
  const startIdx = html.indexOf('class="passage-text"');
  let passageHtml = startIdx > -1 ? html.slice(startIdx) : html;
  passageHtml = passageHtml
    .replace(/<sup class='crossreference'[\s\S]*?<\/sup>/g, "")
    .replace(/<sup[^>]*class='footnote'[\s\S]*?<\/sup>/g, "");

  const boundaryRe = /(<span class="chapternum">\d+\s*<\/span>)|<sup class="versenum">\s*(\d+)\s*<\/sup>/g;
  const markers: Array<{ verse: string; index: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = boundaryRe.exec(passageHtml))) {
    const verse = m[1] ? "1" : (m[2] as string);
    markers.push({ verse, index: m.index, end: boundaryRe.lastIndex });
  }
  const stopRe = /<a class="full-chap-link"|<div class="crossrefs|<div class="passage-scroller|<div class="footnotes"|<h2|<h3/;
  const pieces: Record<string, string[]> = {};
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].index : passageHtml.length;
    const block = passageHtml.slice(start, end);
    const stopIdx = block.search(stopRe);
    const finalBlock = stopIdx > -1 ? block.slice(0, stopIdx) : block;
    const plain = normalize(finalBlock.replace(/<[^>]+>/g, " "));
    const v = markers[i].verse;
    if (!pieces[v]) pieces[v] = [];
    if (plain) pieces[v].push(plain);
  }
  const verses: VerseMap = {};
  for (const v of Object.keys(pieces)) verses[v] = normalize(pieces[v].join(" "));
  return verses;
}

function extractBibleCom(html: string, chapter: number): VerseMap {
  const markerRe = new RegExp(`class="ChapterContent-module__\\w+__verse" data-usfm="MAT\\.${chapter}\\.(\\d+)"`, "g");
  const markers: Array<{ verse: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(html))) markers.push({ verse: m[1], index: m.index });
  const pieces: Record<string, string[]> = {};
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : html.indexOf("</main", start);
    let block = html.slice(start, end === -1 ? undefined : end);
    // Footnote-marker trailing punctuation reuses the __content class inside
    // a <span class="sup"> wrapper -- strip it before matching real content.
    block = block.replace(/<span class="sup"><span class="ChapterContent-module__\w+__content">[^<]*<\/span><\/span>/g, "");
    let piece = "";
    const localRe = /class="ChapterContent-module__\w+__content">([^<]*)</g;
    let cm: RegExpExecArray | null;
    while ((cm = localRe.exec(block))) piece += cm[1];
    const plain = normalize(piece);
    const v = markers[i].verse;
    if (!pieces[v]) pieces[v] = [];
    if (plain) pieces[v].push(plain);
  }
  const verses: VerseMap = {};
  for (const v of Object.keys(pieces)) verses[v] = normalize(pieces[v].join(" "));
  return verses;
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

type Provenance = { ref: string; status: "agreed" | "omitted"; sources: [string, string]; notes?: string[] };

async function main() {
  const dataRoot = path.join(process.cwd(), "lib", "scripture", "data");

  for (const [version, { bibleComId, code }] of Object.entries(VERSIONS)) {
    const chapterCache = new Map<number, { bg: VerseMap; bv: VerseMap; bgUrl: string; bvUrl: string }>();
    const passages: Record<string, VerseMap> = {};
    const provenance: Provenance[] = [];

    for (const ref of REFS) {
      const { chapter, verseStart, verseEnd } = parseRef(ref);
      if (!chapterCache.has(chapter)) {
        const bgUrl = `https://www.biblegateway.com/passage/?search=Matthew+${chapter}&version=${code}`;
        const bvUrl = `https://www.bible.com/bible/${bibleComId}/MAT.${chapter}.${code}`;
        const [bgHtml, bvHtml] = await Promise.all([fetch(bgUrl).then((r) => r.text()), fetch(bvUrl).then((r) => r.text())]);
        chapterCache.set(chapter, { bg: extractBibleGateway(bgHtml), bv: extractBibleCom(bvHtml, chapter), bgUrl, bvUrl });
      }
      const { bg, bv, bgUrl, bvUrl } = chapterCache.get(chapter)!;

      let allMatch = true;
      const passage: VerseMap = {};
      const notes: string[] = [];
      for (let v = verseStart; v <= verseEnd; v++) {
        const a = bg[String(v)];
        const b = bv[String(v)];
        if (!a || !b) {
          allMatch = false;
          notes.push(`v${v}: missing from ${!a ? "biblegateway" : "bible.com"}`);
          continue;
        }
        if (forCompare(a) !== forCompare(b)) {
          allMatch = false;
          notes.push(`v${v}: MISMATCH bg="${a}" bv="${b}"`);
          continue;
        }
        passage[String(v)] = a;
      }
      if (allMatch) {
        passages[ref] = passage;
        provenance.push({ ref, status: "agreed", sources: [bgUrl, bvUrl] });
      } else {
        provenance.push({ ref, status: "omitted", sources: [bgUrl, bvUrl], notes });
      }
    }

    const dir = path.join(dataRoot, version);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "key-passages.json"), JSON.stringify(passages));
    writeFileSync(path.join(dir, "provenance.json"), JSON.stringify(provenance, null, 1));
    const agreed = provenance.filter((p) => p.status === "agreed").length;
    console.log(`${version}: ${agreed}/${REFS.length} passages agreed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
