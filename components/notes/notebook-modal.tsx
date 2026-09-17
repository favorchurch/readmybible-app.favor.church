"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getNote, saveNote, type NoteView } from "@/app/actions/notes";
import { guardWrite, useTestMode } from "@/components/test-mode";
import { useEscapeToClose } from "@/components/use-escape-to-close";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, ScrollIcon, SpinnerIcon } from "./icons";
import { getPageMeta, NOTEBOOK_PAGES, type NotebookPageId } from "./pages";

import "./notes.css";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "blocked";

export function NotebookModal({
  open,
  initialPage = "general",
  authorPersonId,
  isBlocked,
  onClose,
  onNoteSaved,
}: {
  open: boolean;
  initialPage?: string;
  authorPersonId?: number;
  isBlocked?: boolean;
  onClose: () => void;
  onNoteSaved?: (page: string, isShared: boolean) => void;
}) {
  const [currentPageId, setCurrentPageId] = useState<NotebookPageId>(initialPage);
  const [content, setContent] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [loadedForPage, setLoadedForPage] = useState<string | null>(null);
  const [noteView, setNoteView] = useState<NoteView | null>(null);

  const testMode = useTestMode(true);
  const blocked = isBlocked ?? testMode.active;

  const guardedSaveNote = useMemo(
    () => guardWrite(blocked, saveNote),
    [blocked],
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isOwner = !authorPersonId || noteView?.isOwner !== false;
  const loading = loadedForPage !== currentPageId;

  useEscapeToClose(onClose, open);

  // Reset to the initial page and status each time the modal opens. Adjusted
  // during render (not an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrentPageId(initialPage);
      setSaveStatus("idle");
      setStatusMessage("");
    }
  }

  // Load note for current page. setState calls live inside the `.then`, never
  // synchronously in the effect body, matching the pattern in
  // components/reading-dialog.tsx's passage-fetch effect.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getNote({ page: currentPageId, authorPersonId })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setNoteView(res.note);
          setContent(res.note.content ?? "");
          setIsShared(res.note.isShared);
        } else {
          setNoteView(null);
          setContent("");
          setIsShared(false);
          setStatusMessage(res.error);
        }
        setLoadedForPage(currentPageId);
      })
      .catch(() => {
        if (cancelled) return;
        setStatusMessage("Failed to load note.");
        setLoadedForPage(currentPageId);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentPageId, authorPersonId]);

  // Debounced autosave
  const triggerAutosave = useCallback(
    (nextContent: string, nextShared: boolean) => {
      if (!isOwner) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus("saving");
      setStatusMessage("Auto-saving…");

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await guardedSaveNote({
            page: currentPageId,
            content: nextContent,
            isShared: nextShared,
          });

          if (res.ok) {
            setSaveStatus("saved");
            setStatusMessage("Saved");
            onNoteSaved?.(currentPageId, nextShared);
          } else {
            // NEVER paint a saved checkmark for a write that was blocked or failed
            setSaveStatus(blocked ? "blocked" : "error");
            setStatusMessage(res.error);
          }
        } catch {
          setSaveStatus("error");
          setStatusMessage("Auto-save failed");
        }
      }, 700);
    },
    [currentPageId, isOwner, guardedSaveNote, blocked, onNoteSaved],
  );

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function handleContentChange(nextText: string) {
    if (nextText.length > 1000) return;
    setContent(nextText);
    triggerAutosave(nextText, isShared);
  }

  function handleShareToggle(checked: boolean) {
    setIsShared(checked);
    triggerAutosave(content, checked);
  }

  // Page navigation
  const currentIndex = NOTEBOOK_PAGES.findIndex((p) => p.id === currentPageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < NOTEBOOK_PAGES.length - 1;

  function navigateToPage(targetId: NotebookPageId) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setCurrentPageId(targetId);
    setSaveStatus("idle");
    setStatusMessage("");
  }

  if (!open) return null;

  const pageMeta = getPageMeta(currentPageId);
  const isSomeoneElsesPrivateNote = !isOwner && noteView && !noteView.isShared;

  return (
    <div className="notebook-overlay" role="dialog" aria-modal="true" aria-labelledby="notebook-dialog-title">
      <button type="button" className="notebook-backdrop" onClick={onClose} aria-label="Close notes" tabIndex={-1} />
      <div className="notebook-dialog">
        {/* Header */}
        <div className="notebook-header">
          <div className="notebook-header-title">
            <ScrollIcon size={20} />
            <h2 id="notebook-dialog-title">Personal Revelations</h2>
          </div>
          <button
            type="button"
            className="notebook-close-btn"
            onClick={onClose}
            aria-label="Close notes"
          >
            ×
          </button>
        </div>

        {/* Page Navigation Strip */}
        <div className="notebook-nav-strip">
          <button
            type="button"
            className="notebook-nav-btn"
            disabled={!hasPrev}
            onClick={() => hasPrev && navigateToPage(NOTEBOOK_PAGES[currentIndex - 1].id)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon size={16} />
          </button>

          <div className="notebook-page-info">
            <div className="notebook-page-heading">{pageMeta.title}</div>
            {pageMeta.subtitle && (
              <div className="notebook-page-sub">{pageMeta.subtitle}</div>
            )}
          </div>

          <button
            type="button"
            className="notebook-nav-btn"
            disabled={!hasNext}
            onClick={() => hasNext && navigateToPage(NOTEBOOK_PAGES[currentIndex + 1].id)}
            aria-label="Next page"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="notebook-body">
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 0",
                color: "var(--ink-muted)",
                gap: "8px",
              }}
            >
              <SpinnerIcon size={18} />
              <span>Loading notes…</span>
            </div>
          ) : isSomeoneElsesPrivateNote ? (
            /* Someone else's private note: existence only, NEVER content */
            <div className="notebook-private-notice">
              <LockIcon size={24} />
              <strong>Private Note</strong>
              <p>This note is kept private by its author.</p>
            </div>
          ) : !isOwner ? (
            /* Someone else's shared note: read-only view */
            <div className="notebook-viewer-wrap">
              <div className="notebook-sharing-row">
                <span className="notebook-share-badge is-shared">
                  <CheckIcon size={12} /> Shared with my connect &amp; leaders
                </span>
                {noteView?.authorName && (
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                    By {noteView.authorName}
                  </span>
                )}
              </div>
              <div className="notebook-viewer-content">
                {noteView?.content || "No revelation written for this page yet."}
              </div>
            </div>
          ) : (
            /* Owner's editing view */
            <>
              <div className="notebook-sharing-row">
                <label className="notebook-share-toggle">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => handleShareToggle(e.target.checked)}
                  />
                  <span>Share with my connect &amp; leaders</span>
                </label>

                <span
                  className={`notebook-share-badge ${isShared ? "is-shared" : "is-private"}`}
                >
                  {isShared ? (
                    <>
                      <CheckIcon size={12} /> Shared
                    </>
                  ) : (
                    <>
                      <LockIcon size={12} /> Private
                    </>
                  )}
                </span>
              </div>

              <div className="notebook-editor-wrap">
                <textarea
                  className="notebook-textarea"
                  value={content}
                  maxLength={1000}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write in your personal revelations…"
                  aria-label="Write in your personal revelations"
                />
                <div className="notebook-limit-text">
                  {content.length}/1000 characters
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="notebook-footer">
          <div className="notebook-footer-left">
            {isOwner && (
              <div
                className={`notebook-save-status is-${saveStatus}`}
                role="status"
                aria-live="polite"
              >
                {saveStatus === "saving" && (
                  <>
                    <SpinnerIcon size={14} />
                    <span>Auto-saving…</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckIcon size={14} />
                    <span>Saved</span>
                  </>
                )}
                {(saveStatus === "blocked" || saveStatus === "error") && (
                  <span>{statusMessage || "Auto-save failed"}</span>
                )}
              </div>
            )}
            {!isOwner && noteView?.updatedAt && (
              <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                Updated {new Date(noteView.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <button
            type="button"
            className="notebook-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
