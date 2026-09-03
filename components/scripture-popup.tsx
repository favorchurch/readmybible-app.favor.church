"use client";

import { useEffect, useRef, useState } from "react";

import type { Translation } from "@/components/avatar";

type PassageResponse = { ref: string; translation: Translation; text: string | null; bibleComUrl: string };

export function ScripturePopup({
  passageRef,
  translation,
  onClose,
}: {
  passageRef: string;
  translation: Translation;
  onClose: () => void;
}) {
  const [state, setState] = useState<{ text: string | null; bibleComUrl: string } | "loading" | "error">("loading");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/scripture?ref=${encodeURIComponent(passageRef)}&t=${translation}`)
      .then((res) => (res.ok ? (res.json() as Promise<PassageResponse>) : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setState({ text: data.text, bibleComUrl: data.bibleComUrl });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [passageRef, translation]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    sheetRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const bibleComUrl =
    state !== "loading" && state !== "error" ? state.bibleComUrl : `https://www.bible.com/search/bible?q=${encodeURIComponent(passageRef)}`;

  return (
    <div className="modal-wrap scripture-modal" role="dialog" aria-modal="true" aria-labelledby="scripture-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close quick verse" />
      <section className="modal-sheet scripture-sheet" tabIndex={-1} ref={sheetRef}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">QUICK VERSE</p>
        <h2 id="scripture-title">{passageRef}</h2>
        <span className="translation-badge">{translation}</span>
        {state === "loading" && <p className="passage-note">Loading…</p>}
        {state === "error" && <p className="passage-note">Read this one at Bible.com.</p>}
        {state !== "loading" && state !== "error" && (
          <p className="passage-note">{state.text ?? "Read this one at Bible.com."}</p>
        )}
        <a className="secondary-link" href={bibleComUrl} target="_blank" rel="noreferrer">
          Open in Bible.com
        </a>
      </section>
    </div>
  );
}
