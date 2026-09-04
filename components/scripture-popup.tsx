"use client";

import { useEffect, useState } from "react";

import type { Translation } from "@/components/avatar";
import { Sheet } from "@/components/sheet";

type PassageResponse = { ref: string; translation: Translation; text: string | null; bibleComUrl: string; attribution: string };

export function ScripturePopup({
  passageRef,
  translation,
  onClose,
}: {
  passageRef: string;
  translation: Translation;
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

  const bibleComUrl =
    state !== "loading" && state !== "error" ? state.bibleComUrl : `https://www.bible.com/search/bible?q=${encodeURIComponent(passageRef)}`;

  return (
    <Sheet open onClose={onClose} labelledBy="scripture-title" className="scripture-sheet">
      <button className="close-button" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="eyebrow">QUICK VERSE</p>
      <h2 id="scripture-title">{passageRef}</h2>
      <span className="translation-badge">{translation}</span>
      {state === "loading" && <p className="passage-note">Loading…</p>}
      {state === "error" && <p className="passage-note">Read this one at Bible.com.</p>}
      {state !== "loading" && state !== "error" && (
        <>
          <p className="passage-note">{state.text ?? "Read this one at Bible.com."}</p>
          {state.text && <p className="passage-attribution">{state.attribution}</p>}
        </>
      )}
      <a className="secondary-link" href={bibleComUrl} target="_blank" rel="noreferrer">
        Open in Bible.com
      </a>
    </Sheet>
  );
}
