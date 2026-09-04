"use client";

import { useEffect, useState } from "react";

import type { Translation } from "@/components/avatar";
import { Sheet } from "@/components/sheet";
import { bibleLinkGroup, commentaryLinkGroup, parseReference } from "@/lib/scripture/reference";
import { TRANSLATIONS } from "@/lib/scripture/types";

type PassageResponse = { ref: string; translation: Translation; text: string | null; bibleComUrl: string; attribution: string };

export function ScripturePopup({
  passageRef,
  translation,
  onTranslationChange,
  onClose,
}: {
  passageRef: string;
  translation: Translation;
  onTranslationChange: (translation: Translation) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<{ text: string | null; bibleComUrl: string; attribution: string } | "loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/scripture?ref=${encodeURIComponent(passageRef)}&t=${translation}`)
      .then((res) => (res.ok ? (res.json() as Promise<PassageResponse>) : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setState({ text: data.text, bibleComUrl: data.bibleComUrl, attribution: data.attribution });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [passageRef, translation]);

  const parsed = parseReference(passageRef);
  const isChapter = parsed?.verseEnd === null;
  const bibleLinks = parsed ? bibleLinkGroup(parsed, translation) : [];
  const commentaryLinks = parsed ? commentaryLinkGroup(parsed) : [];

  return (
    <Sheet open onClose={onClose} labelledBy="scripture-title" className="scripture-sheet">
      <button className="close-button" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="eyebrow">{isChapter ? "CHAPTER READING" : "QUICK VERSE"}</p>
      <h2 id="scripture-title">{passageRef}</h2>
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
      {state === "loading" && <p className="passage-note">Loading…</p>}
      {state === "error" && <p className="passage-note">{isChapter ? "This chapter is available at Bible.com." : "Read this one at Bible.com."}</p>}
      {state !== "loading" && state !== "error" && (
        <>
          <p className="passage-note">{state.text ?? (isChapter ? "This chapter is available at Bible.com." : "Read this one at Bible.com.")}</p>
          {state.text && <p className="passage-attribution">{state.attribution}</p>}
        </>
      )}
      {parsed && (
        <div className="link-groups">
          <div className="link-group">
            <p className="eyebrow">BIBLE</p>
            <div className="link-group-row">
              {bibleLinks.map((link) => (
                <a key={link.label} className="secondary-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="link-group">
            <p className="eyebrow">COMMENTARIES</p>
            <div className="link-group-row">
              {commentaryLinks.map((link) => (
                <a key={link.label} className="secondary-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
