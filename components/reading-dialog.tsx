"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CheckInGroupState } from "@/app/actions/checkIn";
import type { Translation } from "@/components/avatar";
import { Celebration } from "@/components/celebration";
import { ReadingBodySwitch, useReadingBodyStyle } from "@/components/reading-body-switch";
import { Sheet } from "@/components/sheet";
import { appsLinkGroup, commentaryLinkGroup, parseReference, bibleComUrl } from "@/lib/scripture/reference";
import { NO_SCROLL_DWELL_MS, sentinelAction, type TickState } from "@/lib/reading-tick";
import { TRANSLATIONS } from "@/lib/scripture/types";

type PassageResponse = {
  ref: string;
  translation: Translation;
  text: string | null;
  verses: Record<string, string> | null;
  bibleComUrl: string;
  attribution: string;
};
type PassageState =
  | { text: string | null; verses: Record<string, string> | null; bibleComUrl: string; attribution: string }
  | "loading"
  | "error";

/**
 * `preview` is pre-launch (D12): the passage is readable, nothing ticks.
 * `unread` arms the sentinel. `read` renders the tick already filled (D8).
 */
export type ReadingDialogMode = "preview" | "unread" | "read";

async function fetchPassage(ref: string, translation: Translation): Promise<PassageState> {
  try {
    const res = await fetch(`/api/scripture?ref=${encodeURIComponent(ref)}&t=${translation}`);
    if (!res.ok) return "error";
    const data = (await res.json()) as PassageResponse;
    return { text: data.text, verses: data.verses, bibleComUrl: data.bibleComUrl, attribution: data.attribution };
  } catch {
    return "error";
  }
}

/**
 * The single entrypoint into reading, and the only thing that records a
 * check-in (D1/D2 of docs/reading-dialog-tick.md).
 *
 * Reaching the bottom is the tick. The sentinel is deliberately NOT armed
 * until the passage has actually resolved -- otherwise an empty dialog is
 * entirely "scrolled to the bottom" the instant it opens, and every reader
 * would be checked in before a word rendered.
 */
export function ReadingDialog({
  chapter,
  passageRef,
  keyPassageRef,
  translation,
  mode,
  isCatchUp,
  chaptersRead,
  groupName,
  group,
  tick,
  onReachBottom,
  onReplay,
  onRetry,
  onTranslationChange,
  onClose,
}: {
  chapter: number;
  passageRef: string;
  keyPassageRef: string | null;
  translation: Translation;
  mode: ReadingDialogMode;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  group: CheckInGroupState | null;
  tick: TickState;
  onReachBottom: () => void;
  onReplay: () => void;
  onRetry: () => void;
  onTranslationChange: (translation: Translation) => void;
  onClose: () => void;
}) {
  // Each fetch result is stored with the ref/translation it was fetched for,
  // so a stale result for the previous translation reads as "loading" during
  // the next render instead of needing a synchronous reset in the effect.
  const [fetched, setFetched] = useState<{ ref: string; translation: Translation; value: PassageState } | null>(null);
  const bodyStyle = useReadingBodyStyle();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const celebrationRef = useRef<HTMLDivElement>(null);
  const [replayKey, setReplayKey] = useState(0);

  const passage: PassageState =
    fetched && fetched.ref === passageRef && fetched.translation === translation ? fetched.value : "loading";

  // The key passage used to be pulled out into a blockquote above the body.
  // Now that every version renders its whole chapter, quoting it there printed
  // the same verses twice in one scroll, so it is tinted in place instead --
  // this is just which verse numbers get the tint.
  const keyVerseNumbers = useMemo(() => {
    const parsedKey = keyPassageRef ? parseReference(keyPassageRef) : null;
    if (!parsedKey || parsedKey.chapter !== chapter) return new Set<number>();
    const end = parsedKey.verseEnd ?? parsedKey.verseStart;
    const numbers = new Set<number>();
    for (let v = parsedKey.verseStart; v <= end; v++) numbers.add(v);
    return numbers;
  }, [keyPassageRef, chapter]);

  useEffect(() => {
    let cancelled = false;
    void fetchPassage(passageRef, translation).then((value) => {
      if (!cancelled) setFetched({ ref: passageRef, translation, value });
    });
    return () => {
      cancelled = true;
    };
  }, [passageRef, translation]);

  const resolved = passage !== "loading";
  // F3: arm only once scripture is actually on screen. `resolved` alone counts
  // an API error as resolved, and the error body is a single "available at
  // Bible.com" line -- entirely within view on open, so the reader would be
  // checked in for a chapter the app never showed them. No text, no tick.
  //
  // Keyed off `verses` because that is what the body below actually renders.
  // Keying it off `text` instead let the two disagree: the API sets
  // Cache-Control: public, max-age=86400, so for a day after this shipped a
  // returning reader on a bundled version would be served a pre-deploy body
  // that has `text` and no `verses` -- the dialog would render the "available
  // at Bible.com" line, arm anyway, and tick them in for a chapter it never
  // showed. Derive arming from the rendered content, not from a sibling field
  // the client has to trust the server to keep in sync.
  const armed = mode !== "preview" && resolved && passage !== "error" && Boolean(passage.verses);

  // Held in a ref so the observer effect does not depend on the callback's
  // identity. It is a new closure on every render, and re-running the effect
  // tears down and re-creates the observer -- whose observe() fires
  // immediately, setting state, rendering again, forever. Caught by
  // tests/reading-dialog-wiring.test.ts at 1334 calls where 2 were expected.
  const reachedBottom = useRef(onReachBottom);
  useEffect(() => {
    reachedBottom.current = onReachBottom;
  });

  const ticked = tick.kind === "ticked" || tick.kind === "retrying";

  // F4: D6 says re-reaching the bottom replays the celebration. The parent
  // returns the identical tick state for an already-fired chapter, so React
  // bails out and nothing re-renders -- the replay has to be driven from here.
  // A ref for the same reason as above: the observer effect must not re-run.
  const tickedRef = useRef(ticked);
  useEffect(() => {
    tickedRef.current = ticked;
  });

  // D13: true while a no-scroll dwell is counting down, so the hint can say so
  // instead of telling a reader who is already at the end to reach the end.
  const [dwelling, setDwelling] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!armed || !node) return;

    let firstCallback = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function fire() {
      if (tickedRef.current) setReplayKey((n) => n + 1);
      reachedBottom.current();
    }

    function clearDwell() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      setDwelling(false);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const action = sentinelAction({ isIntersecting: entry.isIntersecting, isFirstCallback: firstCallback });
          firstCallback = false;
          if (action.kind === "cancel") {
            clearDwell();
            continue;
          }
          if (action.kind === "tick") {
            clearDwell();
            fire();
            continue;
          }
          // Already at the end without scrolling: wait it out, but only once --
          // a re-armed timer on every later callback would never resolve.
          if (timer !== null) continue;
          setDwelling(true);
          timer = setTimeout(() => {
            timer = null;
            setDwelling(false);
            fire();
          }, action.delayMs);
        }
      },
      { root: node.closest(".sheet-scroll"), threshold: 0.9 },
    );
    observer.observe(node);
    return () => {
      if (timer !== null) clearTimeout(timer);
      observer.disconnect();
    };
  }, [armed]);

  // D6/D7: a replay re-mounts the celebration to re-run its entry animation,
  // and pulls it into view so the tap has a visible result.
  function replay() {
    setReplayKey((n) => n + 1);
    onReplay();
    celebrationRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const parsed = parseReference(passageRef);
  const attribution = resolved && passage !== "error" ? passage.attribution : null;
  const eyebrow = mode === "preview" ? "DAY 1 PREVIEW" : isCatchUp ? "CATCH-UP READING" : "TODAY'S READING";

  return (
    <Sheet open onClose={onClose} labelledBy="reading-dialog-title" className="reading-dialog-sheet scripture-sheet">
      <button className="close-button" onClick={onClose} aria-label="Close">
        ×
      </button>
      <ReadingBodySwitch />
      <p className="eyebrow">{eyebrow}</p>
      <div className="scripture-heading">
        <h2 id="reading-dialog-title">Matthew {chapter}</h2>
        <select
          className="translation-select"
          aria-label="Bible translation"
          value={translation}
          onChange={(event) => onTranslationChange(event.target.value as Translation)}
        >
          {TRANSLATIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {passage === "loading" && <p className="passage-note">Loading…</p>}
      {passage === "error" && <p className="passage-note">This chapter is available at Bible.com.</p>}
      {resolved && passage !== "error" && passage.verses && (
        <div className="passage-chapter" data-body-style={bodyStyle} data-section="passage-chapter">
          {Object.keys(passage.verses)
            .map(Number)
            .sort((a, b) => a - b)
            .map((n) => (
              <p
                key={n}
                className="passage-verse"
                data-key-verse={keyVerseNumbers.has(n) ? "true" : undefined}
              >
                {/* Not aria-hidden: the number tells a reader which verse this
                    is, which is content, not ornament. It is sized as content
                    for the same reason. */}
                <sup className="passage-verse-number">{n}</sup>{" "}
                {passage.verses?.[String(n)]}
              </p>
            ))}
        </div>
      )}
      {resolved && passage !== "error" && !passage.verses && (
        <p className="passage-note">This passage is available at Bible.com.</p>
      )}

      {parsed && (
        <a className="primary-button scripture-chapter-action" href={bibleComUrl(parsed, translation)} target="_blank" rel="noreferrer">
          Read the entire chapter on Bible.com ↗
        </a>
      )}
      {parsed && (
        <div className="link-groups">
          <details className="link-group link-disclosure">
            <summary>Commentaries</summary>
            <div className="link-group-row inline-row">
              {commentaryLinkGroup(parsed).map((link) => (
                <a key={link.label} className="inline-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </details>
          <details className="link-group link-disclosure">
            <summary>Apps</summary>
            <div className="link-group-row inline-row">
              {appsLinkGroup().map((link) => (
                <a key={link.label} className="inline-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label} ↗
                </a>
              ))}
            </div>
          </details>
        </div>
      )}

      {attribution && <p className="passage-attribution">{attribution}</p>}

      {mode === "preview" && (
        <p className="honor-note" data-section="preview-note">
          Reading counts from October 1. Reach the end of a chapter and your day is marked for you.
        </p>
      )}

      {armed && <div ref={sentinelRef} className="reading-sentinel" aria-hidden="true" />}

      {mode !== "preview" && (
        <div
          className="reading-tick"
          data-section="reading-tick"
          data-state={tick.kind}
          data-dwelling={dwelling ? "true" : undefined}
          aria-live="polite"
        >
          {tick.kind === "idle" && !dwelling && (
            <p className="reading-tick-hint">Reach the end and today is marked for you.</p>
          )}
          {tick.kind === "idle" && dwelling && (
            <p className="reading-tick-hint" data-section="reading-tick-dwell">
              Stay a moment and today is marked for you.
              <span
                className="reading-dwell-bar"
                style={{ animationDuration: `${NO_SCROLL_DWELL_MS}ms` }}
                aria-hidden="true"
              />
            </p>
          )}
          {ticked && (
            <div className="reading-tick-mark" key={replayKey}>
              <span className="reading-tick-check" aria-hidden="true">
                ✓
              </span>
              <strong>Read today</strong>
              <span className="reading-tick-coins">+10</span>
            </div>
          )}
          {tick.kind === "failed" && (
            <button type="button" className="reading-tick-retry" onClick={onRetry}>
              Couldn&apos;t save — tap to retry
            </button>
          )}
        </div>
      )}

      {ticked && (
        <div ref={celebrationRef}>
          <Celebration
            chapter={chapter}
            isCatchUp={isCatchUp}
            chaptersRead={chaptersRead}
            groupName={groupName}
            group={group}
            simulated={tick.kind === "ticked" && tick.simulated}
            replayKey={replayKey}
          />
          <button type="button" className="primary-button today-reading-button" onClick={replay}>
            <strong>I read today</strong> <span aria-hidden="true">✓</span>
          </button>
        </div>
      )}
    </Sheet>
  );
}
