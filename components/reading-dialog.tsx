"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CheckInGroupState } from "@/app/actions/checkIn";
import { SplashCompanion } from "@/components/app-splash";
import type { Translation } from "@/components/avatar";
import { Celebration } from "@/components/celebration";
import { ReadingBodySwitch, useReadingBodyStyle } from "@/components/reading-body-switch";
import { Sheet } from "@/components/sheet";
import { appsLinkGroup, commentaryLinkGroup, parseReference, bibleComUrl } from "@/lib/scripture/reference";
import { chapterReference } from "@/lib/plan";
import {
  BOTTOM_ELIGIBLE_DELAY_MS,
  MIN_READING_TIME_MS,
  ReadingQualificationTracker,
  type TickState,
} from "@/lib/reading-tick";
import { TRANSLATIONS, type ScriptureSource } from "@/lib/scripture/types";

type PassageResponse = {
  ref: string;
  translation: Translation;
  text: string | null;
  verses: Record<string, string> | null;
  bibleComUrl: string;
  attribution: string;
  source: ScriptureSource;
};
type PassageState =
  | {
      text: string | null;
      verses: Record<string, string> | null;
      bibleComUrl: string;
      attribution: string;
      source: ScriptureSource;
    }
  | "loading"
  | "error";

const PASSAGE_SHAPE_VERSION = "2";

export type ReadingDialogMode = "preview" | "unread" | "read";

async function fetchPassage(ref: string, translation: Translation): Promise<PassageState> {
  try {
    const res = await fetch(
      `/api/scripture?ref=${encodeURIComponent(ref)}&t=${translation}&v=${PASSAGE_SHAPE_VERSION}`,
    );
    if (!res.ok) return "error";
    const data = (await res.json()) as PassageResponse;
    return {
      text: data.text,
      verses: data.verses,
      bibleComUrl: data.bibleComUrl,
      attribution: data.attribution,
      source: data.source,
    };
  } catch {
    return "error";
  }
}

/**
 * The single entrypoint into reading and check-in recording (issue #147).
 *
 * Renders single or two-chapter assignments in one long reading pane.
 * Check-in qualifies only when:
 * 1. at least 15 seconds have elapsed since content load, and
 * 2. the reader has reached the bottom (bottom tracking only eligible after 3 seconds).
 *
 * Completion details remain collapsed under the clickable "You have read" summary.
 */
export function ReadingDialog({
  chapter,
  chapters: chaptersProp,
  passageRef,
  keyPassageRef,
  assignmentTitle,
  translation,
  mode,
  isCatchUp,
  chaptersRead,
  groupName,
  group,
  tick,
  onReachBottom,
  onRetry,
  onTranslationChange,
  onClose,
}: {
  chapter?: number;
  chapters?: number[];
  passageRef?: string;
  keyPassageRef?: string | null;
  assignmentTitle?: string;
  translation: Translation;
  mode: ReadingDialogMode;
  isCatchUp: boolean;
  chaptersRead: number;
  groupName: string | null;
  group: CheckInGroupState | null;
  tick: TickState;
  onReachBottom: () => void;
  onRetry: () => void;
  onTranslationChange: (translation: Translation) => void;
  onClose: () => void;
}) {
  const resolvedChapters = useMemo(() => {
    if (chaptersProp && chaptersProp.length > 0) return chaptersProp;
    if (chapter !== undefined) return [chapter];
    return [1];
  }, [chaptersProp, chapter]);

  const [fetchedPassages, setFetchedPassages] = useState<Record<number, PassageState>>({});
  const bodyStyle = useReadingBodyStyle();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const celebrationRef = useRef<HTMLDivElement>(null);
  const [replayKey, setReplayKey] = useState(0);
  // Collapsed under the "You have read" summary by default to minimise reading distraction
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  // Key passage verse numbers per chapter for tinted highlight
  const keyVerseNumbersMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    if (!keyPassageRef) return map;
    const parsedKey = parseReference(keyPassageRef);
    if (!parsedKey) return map;
    const end = parsedKey.verseEnd ?? parsedKey.verseStart;
    const numbers = new Set<number>();
    for (let v = parsedKey.verseStart; v <= end; v++) numbers.add(v);
    map.set(parsedKey.chapter, numbers);
    return map;
  }, [keyPassageRef]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      resolvedChapters.map(async (ch) => {
        const ref = `Matthew ${ch}`;
        const res = await fetchPassage(ref, translation);
        return { ch, res };
      }),
    ).then((results) => {
      if (!cancelled) {
        const nextMap: Record<number, PassageState> = {};
        for (const { ch, res } of results) {
          nextMap[ch] = res;
        }
        setFetchedPassages(nextMap);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resolvedChapters, translation]);

  const allResolved = resolvedChapters.every((ch) => {
    const p = fetchedPassages[ch];
    return p !== undefined && p !== "loading";
  });
  const anyError = resolvedChapters.some((ch) => fetchedPassages[ch] === "error");
  const allHaveVerses = resolvedChapters.every((ch) => {
    const p = fetchedPassages[ch];
    return p && typeof p === "object" && Object.keys(p.verses ?? {}).length > 0;
  });

  const isPassageLoading = !allResolved;
  const isPassageError = allResolved && (anyError || !allHaveVerses);

  // Arm only once all scripture in the assignment has loaded onto the screen
  const armed = mode !== "preview" && allResolved && !isPassageError && allHaveVerses;

  const reachedBottom = useRef(onReachBottom);
  useEffect(() => {
    reachedBottom.current = onReachBottom;
  });

  const ticked = tick.kind === "ticked" || tick.kind === "retrying";
  const tickedRef = useRef(ticked);
  useEffect(() => {
    tickedRef.current = ticked;
  });

  const [dwelling, setDwelling] = useState(false);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualificationTracker = useRef(new ReadingQualificationTracker(MIN_READING_TIME_MS, BOTTOM_ELIGIBLE_DELAY_MS));

  useEffect(() => {
    const node = sentinelRef.current;
    if (!armed || !node) return;

    const tracker = qualificationTracker.current;
    tracker.onContentLoaded(performance.now());

    function fire() {
      if (tickedRef.current) setReplayKey((n) => n + 1);
      reachedBottom.current();
    }

    function clearTimer() {
      if (dwellTimer.current !== null) {
        clearTimeout(dwellTimer.current);
        dwellTimer.current = null;
      }
      setDwelling(false);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const timestamp = performance.now();
          const result = tracker.onIntersectionChange(entry.isIntersecting, timestamp);
          if (!entry.isIntersecting) {
            clearTimer();
            continue;
          }
          if (result.qualifies) {
            clearTimer();
            fire();
            continue;
          }
          if (result.dwellMs !== undefined) {
            clearTimer();
            setDwelling(true);
            dwellTimer.current = setTimeout(() => {
              clearTimer();
              const qualifies = tracker.onTimerElapsed(performance.now());
              if (qualifies) {
                fire();
              }
            }, result.dwellMs);
          }
        }
      },
      { root: node.closest(".sheet-scroll"), threshold: 0.9 },
    );
    observer.observe(node);
    return () => {
      clearTimer();
      observer.disconnect();
    };
  }, [armed]);

  const primaryRef = passageRef ?? `Matthew ${resolvedChapters[0]}`;
  const parsed = parseReference(primaryRef);
  const firstPassage = fetchedPassages[resolvedChapters[0]];
  const attribution =
    allResolved && !isPassageError && firstPassage && typeof firstPassage === "object"
      ? firstPassage.attribution
      : null;

  const eyebrow = mode === "preview" ? "DAY 1 PREVIEW" : isCatchUp ? "CATCH-UP READING" : "TODAY'S READING";
  const headingText =
    resolvedChapters.length === 1
      ? chapterReference(resolvedChapters[0])
      : `Matthew ${resolvedChapters[0]}–${resolvedChapters[resolvedChapters.length - 1]}`;

  return (
    <Sheet open onClose={onClose} labelledBy="reading-dialog-title" className="reading-dialog-sheet scripture-sheet">
      <button className="close-button" onClick={onClose} aria-label="Close">
        ×
      </button>
      <ReadingBodySwitch />
      <p className="eyebrow">{eyebrow}</p>
      <div className="scripture-heading">
        <div>
          <h2 id="reading-dialog-title">{headingText}</h2>
          {assignmentTitle && (
            <p className="assignment-title-sub" style={{ fontSize: "13px", color: "var(--ink-muted)", margin: "2px 0 0" }}>
              {assignmentTitle}
            </p>
          )}
        </div>
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

      {isPassageLoading && (
        <div className="passage-loading" role="status">
          <span className="sr-only">Loading {headingText}</span>
          <SplashCompanion size={48} />
        </div>
      )}

      {isPassageError && <p className="passage-note">This chapter is available at Bible.com.</p>}

      {!isPassageLoading && !isPassageError && (
        <div className="passage-chapters-container">
          {resolvedChapters.map((ch) => {
            const p = fetchedPassages[ch];
            if (!p || typeof p !== "object" || !p.verses) return null;
            const keyVerses = keyVerseNumbersMap.get(ch) ?? new Set<number>();
            return (
              <div key={ch} className="passage-chapter-section" data-chapter={ch}>
                {resolvedChapters.length > 1 && (
                  <div className="chapter-separator">
                    <h3 className="chapter-subtitle">{chapterReference(ch)}</h3>
                  </div>
                )}
                <div className="passage-chapter" data-body-style={bodyStyle} data-section="passage-chapter">
                  {p.source === "key-passage-fallback" && (
                    <p className="passage-degraded-note" data-section="passage-degraded">
                      Only the key passage is available right now. Read the full chapter on Bible.com below.
                    </p>
                  )}
                  {Object.keys(p.verses)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((n) => (
                      <p
                        key={n}
                        className="passage-verse"
                        data-key-verse={keyVerses.has(n) ? "true" : undefined}
                      >
                        <sup className="passage-verse-number">{n}</sup>{" "}
                        {p.verses?.[String(n)]}
                      </p>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {parsed && (
        <a
          className="primary-button scripture-chapter-action"
          href={bibleComUrl(parsed, translation)}
          target="_blank"
          rel="noreferrer"
        >
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
          Reading counts from October 5. Reach the end of a chapter and your day is marked for you.
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
                style={{ animationDuration: `${MIN_READING_TIME_MS}ms` }}
                aria-hidden="true"
              />
            </p>
          )}
          {ticked && (
            <button
              type="button"
              className="reading-tick-mark"
              key={replayKey}
              aria-controls="today-completion"
              aria-expanded={celebrationVisible}
              aria-label={celebrationVisible ? "You have read. Hide completion details" : "You have read"}
              onClick={() => setCelebrationVisible((v) => !v)}
            >
              <span className="reading-tick-check" aria-hidden="true">
                ✓
              </span>
              <strong>You have read</strong>
              <span className="reading-tick-coins">+10</span>
            </button>
          )}
          {tick.kind === "failed" && (
            <button type="button" className="reading-tick-retry" onClick={onRetry}>
              Couldn&apos;t save — tap to retry
            </button>
          )}
        </div>
      )}

      {ticked && celebrationVisible && (
        <div ref={celebrationRef}>
          <Celebration
            chapter={resolvedChapters[0]}
            isCatchUp={isCatchUp}
            chaptersRead={chaptersRead}
            groupName={groupName}
            group={group}
            simulated={tick.kind === "ticked" && tick.simulated}
            replayKey={replayKey}
          />
        </div>
      )}
    </Sheet>
  );
}
