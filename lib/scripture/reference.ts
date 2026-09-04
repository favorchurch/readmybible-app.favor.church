/**
 * Parses "Book chapter:verse-verse" references (e.g. "Matthew 5:3-12") into
 * a structured form, and builds the bible.com chapter link. The app only
 * ever passes in Matthew references (see lib/plan.ts), but the parser
 * doesn't assume that -- it resolves any of the 66 canonical books by name.
 */
import { TRANSLATION_META, type ParsedReference, type Translation } from "@/lib/scripture/types";

const BOOK_CODES: Record<string, string> = {
  genesis: "GEN",
  exodus: "EXO",
  leviticus: "LEV",
  numbers: "NUM",
  deuteronomy: "DEU",
  joshua: "JOS",
  judges: "JDG",
  ruth: "RUT",
  "1 samuel": "1SA",
  "2 samuel": "2SA",
  "1 kings": "1KI",
  "2 kings": "2KI",
  "1 chronicles": "1CH",
  "2 chronicles": "2CH",
  ezra: "EZR",
  nehemiah: "NEH",
  esther: "EST",
  job: "JOB",
  psalm: "PSA",
  psalms: "PSA",
  proverbs: "PRO",
  ecclesiastes: "ECC",
  "song of solomon": "SNG",
  isaiah: "ISA",
  jeremiah: "JER",
  lamentations: "LAM",
  ezekiel: "EZK",
  daniel: "DAN",
  hosea: "HOS",
  joel: "JOL",
  amos: "AMO",
  obadiah: "OBA",
  jonah: "JON",
  micah: "MIC",
  nahum: "NAM",
  habakkuk: "HAB",
  zephaniah: "ZEP",
  haggai: "HAG",
  zechariah: "ZEC",
  malachi: "MAL",
  matthew: "MAT",
  mark: "MRK",
  luke: "LUK",
  john: "JHN",
  acts: "ACT",
  romans: "ROM",
  "1 corinthians": "1CO",
  "2 corinthians": "2CO",
  galatians: "GAL",
  ephesians: "EPH",
  philippians: "PHP",
  colossians: "COL",
  "1 thessalonians": "1TH",
  "2 thessalonians": "2TH",
  "1 timothy": "1TI",
  "2 timothy": "2TI",
  titus: "TIT",
  philemon: "PHM",
  hebrews: "HEB",
  james: "JAS",
  "1 peter": "1PE",
  "2 peter": "2PE",
  "1 john": "1JN",
  "2 john": "2JN",
  "3 john": "3JN",
  jude: "JUD",
  revelation: "REV",
};

/** Matches "Book chapter", "Book chapter:verse", or "Book chapter:verse-verse", book may lead with a number (e.g. "1 John"). */
const REFERENCE_PATTERN = /^([1-3]?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+|\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/;

export function parseReference(ref: string): ParsedReference | null {
  const match = REFERENCE_PATTERN.exec(ref.trim());
  if (!match) return null;
  const [, rawBook, chapterStr, verseStartStr, verseEndStr] = match;
  const book = rawBook.trim().replace(/\s+/g, " ");
  const bookCode = BOOK_CODES[book.toLowerCase()];
  if (!bookCode) return null;

  const chapter = Number.parseInt(chapterStr, 10);
  const verseStart = verseStartStr ? Number.parseInt(verseStartStr, 10) : 1;
  const verseEnd = verseStartStr ? (verseEndStr ? Number.parseInt(verseEndStr, 10) : verseStart) : null;
  if (verseEnd !== null && verseEnd < verseStart) return null;

  return { book, bookCode, chapter, verseStart, verseEnd };
}

export function bibleComUrl(parsed: ParsedReference, translation: Translation): string {
  const versionId = TRANSLATION_META[translation].bibleComId;
  return `https://www.bible.com/bible/${versionId}/${parsed.bookCode}.${parsed.chapter}.${translation}`;
}

export type OutboundLink = { label: string; url: string };

/**
 * D5: real, deep-linked destinations only, never scraped text. Every URL
 * shape here was confirmed live against Matthew 1 and Matthew 5 (#45) --
 * readscripture.org has no web reader (app-only product, confirmed by
 * crawling its own link inventory), so it links to its homepage rather
 * than a fabricated chapter URL.
 */
export function bibleLinkGroup(parsed: ParsedReference, translation: Translation): OutboundLink[] {
  return [
    { label: "Bible.com", url: bibleComUrl(parsed, translation) },
    { label: "Olive Tree", url: `https://www.olivetree.com/bible?query=${encodeURIComponent(`${parsed.book} ${parsed.chapter}`)}` },
    { label: "ReadScripture", url: "https://readscripture.org/" },
  ];
}

export function commentaryLinkGroup(parsed: ParsedReference): OutboundLink[] {
  const bookSlug = parsed.book.toLowerCase().replace(/\s+/g, "-");
  const bookPath = parsed.book.replace(/\s+/g, "-");
  return [
    { label: "Enduring Word", url: `https://enduringword.com/bible-commentary/${bookSlug}-${parsed.chapter}/` },
    { label: "Bible Hub", url: `https://biblehub.com/commentaries/${bookSlug}/${parsed.chapter}-1.htm` },
    { label: "BibleRef", url: `https://www.bibleref.com/${bookPath}/${parsed.chapter}/${bookPath}-chapter-${parsed.chapter}.html` },
    { label: "Blue Letter Bible", url: `https://www.blueletterbible.org/kjv/${parsed.bookCode.toLowerCase()}/${parsed.chapter}/1/` },
    { label: "BibleProject", url: `https://bibleproject.com/bible/nasb/${bookSlug}/${parsed.chapter}/` },
  ];
}
