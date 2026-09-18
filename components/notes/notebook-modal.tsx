"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryClientProvider, useIsFetching, useQueryClient } from "@tanstack/react-query";

import { getNote, saveNote, type GetNoteResult, type NoteView } from "@/app/actions/notes";
import { getFallbackQueryClient, useSafeQueryClient } from "@/components/providers/query-provider";
import { guardWrite, useTestMode } from "@/components/test-mode";
import { useEscapeToClose } from "@/components/use-escape-to-close";

import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, ScrollIcon, SpinnerIcon } from "./icons";
import { mergeNoteContents } from "./merge-notes";
import { NotesEditor } from "./notes-editor";
import { getPageMeta, NOTEBOOK_PAGES, type NotebookPageId } from "./pages";
import { normalizeContentToHtml, plainTextLength } from "./sanitize";

import "./notes.css";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "blocked";

export interface NotebookModalProps {
  open: boolean;
  initialPage?: string;
  authorPersonId?: number;
  isBlocked?: boolean;
  onClose: () => void;
  onNoteSaved?: (page: string, isShared: boolean) => void;
}

export function NotebookModal(props: NotebookModalProps) {
  const queryClient = useSafeQueryClient();

  if (!queryClient) {
    return (
      <QueryClientProvider client={getFallbackQueryClient()}>
        <NotebookModalInner {...props} />
      </QueryClientProvider>
    );
  }

  return <NotebookModalInner {...props} />;
}

function NotebookModalInner({
  open,
  initialPage = "general",
  authorPersonId,
  isBlocked,
  onClose,
  onNoteSaved,
}: NotebookModalProps) {
  const [currentPageId, setCurrentPageId] = useState<NotebookPageId>(initialPage);
  const [content, setContent] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [noteView, setNoteView] = useState<NoteView | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const queryClient = useQueryClient();
  const testMode = useTestMode(true);
  const blocked = isBlocked ?? testMode.active;

  const guardedSaveNote = useMemo(
    () => guardWrite(blocked, saveNote),
    [blocked],
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cancels a pending debounced autosave without scheduling a new one --
  // used when new content is known to be unsavable so a stale, already-
  // scheduled save (from content typed before this point) can't silently
  // slip through with outdated data.
  const cancelPendingAutosave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Track user edits per page to guard late-fetch merge vs background revalidation
  const userTypedPagesRef = useRef<Set<string>>(new Set());
  const loadedPayloadForPageRef = useRef<Map<string, string>>(new Map());
  // Mirrors `content` synchronously so the late-fetch merge (an async callback)
  // can read the latest typed text without a side effect inside a setState updater.
  const contentRef = useRef("");

  const isOwner = !authorPersonId || noteView?.isOwner !== false;

  useEscapeToClose(onClose, open);

  // Reset to initial page and status each time modal opens
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrentPageId(initialPage);
      setSaveStatus("idle");
      setStatusMessage("");
      setLimitExceeded(false);
    }
  }

  // Clear session tracking when modal open state changes
  useEffect(() => {
    if (open) {
      userTypedPagesRef.current.clear();
      loadedPayloadForPageRef.current.clear();
    }
  }, [open]);

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
            // Update React Query cache so subsequent operations have the latest note
            queryClient.setQueryData(["note", currentPageId, authorPersonId], res);
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
    [currentPageId, isOwner, guardedSaveNote, blocked, onNoteSaved, queryClient, authorPersonId],
  );

  // Background fetch using TanStack React Query cache (Issue 183: Part 1)
  const queryKey = useMemo(
    () => ["note", currentPageId, authorPersonId],
    [currentPageId, authorPersonId],
  );

  const isFetching = useIsFetching({ queryKey }) > 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    // Check if query cache already has note to paint immediately (in microtask to avoid cascading render)
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const cached = queryClient.getQueryData<GetNoteResult>(queryKey);
      if (cached?.ok && cached.note && !loadedPayloadForPageRef.current.has(currentPageId)) {
        const cachedContent = cached.note.content ?? "";
        if (!userTypedPagesRef.current.has(currentPageId)) {
          setContent(cachedContent);
          contentRef.current = cachedContent;
          setIsShared(cached.note.isShared);
          setNoteView(cached.note);
          loadedPayloadForPageRef.current.set(currentPageId, cachedContent);
        }
      }
    });

    void queryClient
      .fetchQuery({
        queryKey,
        queryFn: () => getNote({ page: currentPageId, authorPersonId }),
        staleTime: 30_000,
      })
      .then((res) => {
        if (cancelled) return;


        if (res.ok) {
          const fetchedNote = res.note;
          const fetchedContent = fetchedNote.content ?? "";
          const fetchedShared = fetchedNote.isShared;

          setNoteView(fetchedNote);

          const hasLoadedThisPage = loadedPayloadForPageRef.current.has(currentPageId);
          const prevLoadedPayload = loadedPayloadForPageRef.current.get(currentPageId);
          const userHasTypedOnPage = userTypedPagesRef.current.has(currentPageId);

          if (!hasLoadedThisPage) {
            // First time fetched notes arrive for this page
            if (!userHasTypedOnPage) {
              setContent(fetchedContent);
              contentRef.current = fetchedContent;
              setIsShared(fetchedShared);
              loadedPayloadForPageRef.current.set(currentPageId, fetchedContent);
            } else {
              // Late-fetch merge rule (Issue 183):
              // User typed before fetched notes arrived! Result must be:
              // TYPED CONTENT + FETCHED CONTENT (typed prepended, never overwritten)
              // fetchedShared reflects the server's current record and always applies,
              // independent of whether there was any fetched content to merge in.
              setIsShared(fetchedShared);
              if (fetchedContent.trim().length > 0) {
                const merged = mergeNoteContents({
                  typedContent: contentRef.current,
                  fetchedContent,
                });
                setContent(merged);
                contentRef.current = merged;
                if (merged.length <= 1000) {
                  triggerAutosave(merged, fetchedShared);
                } else {
                  // Autosave's own request would fail server-side validation (max 1000
                  // chars) -- surface it immediately instead of losing the merge silently.
                  // Also cancel any autosave already scheduled from typing before the
                  // merge landed, or it would fire in the background with stale,
                  // pre-merge content.
                  cancelPendingAutosave();
                  setSaveStatus("error");
                  setStatusMessage(
                    "Merged note exceeds the 1000 character limit. Remove some text to save.",
                  );
                }
              }
              loadedPayloadForPageRef.current.set(currentPageId, fetchedContent);
            }
          } else {
            // Subsequent background revalidation:
            // A background revalidation cannot duplicate/append the fetched payload again.
            if (!userHasTypedOnPage && prevLoadedPayload !== fetchedContent) {
              setContent(fetchedContent);
              contentRef.current = fetchedContent;
              setIsShared(fetchedShared);
              loadedPayloadForPageRef.current.set(currentPageId, fetchedContent);
            }
          }
        } else {
          setNoteView(null);
          setStatusMessage(res.error);
          loadedPayloadForPageRef.current.set(currentPageId, "");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatusMessage("Failed to load note.");
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentPageId, authorPersonId, queryClient, queryKey, triggerAutosave, cancelPendingAutosave]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function handleContentChange(nextText: string) {
    setLimitExceeded(false);
    userTypedPagesRef.current.add(currentPageId);
    contentRef.current = nextText;
    setContent(nextText);

    if (nextText.length > 1000) {
      // Markup overhead (e.g. many font-styled spans or list items) can push
      // serialized HTML past the server's limit even though the editor's own
      // visible-text gate passed it through -- surface that instead of
      // silently dropping the edit and getting stuck out of sync. Also cancel
      // any autosave already scheduled from a prior, still-valid keystroke,
      // or it would fire in the background with stale content.
      cancelPendingAutosave();
      setSaveStatus("error");
      setStatusMessage("Note exceeds the 1000 character limit. Remove some text or formatting to save.");
      return;
    }

    triggerAutosave(nextText, isShared);
  }

  function handleLimitExceeded() {
    setLimitExceeded(true);
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
    setLimitExceeded(false);

    // Check if target page already has cached data in React Query
    const cached = queryClient.getQueryData<GetNoteResult>(["note", targetId, authorPersonId]);
    if (cached?.ok && cached.note) {
      const cachedContent = cached.note.content ?? "";
      setContent(cachedContent);
      contentRef.current = cachedContent;
      setIsShared(cached.note.isShared);
      setNoteView(cached.note);
      loadedPayloadForPageRef.current.set(targetId, cachedContent);
    } else {
      setContent("");
      contentRef.current = "";
      setIsShared(false);
      setNoteView(null);
    }
  }

  if (!open) return null;

  const pageMeta = getPageMeta(currentPageId);
  const isSomeoneElsesPrivateNote = !isOwner && noteView && !noteView.isShared;
  const isPendingOtherUserNote = !isOwner && !noteView && isFetching;

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

        {/* Modal Body: rendered immediately for owner, never blocked */}
        <div className="notebook-body">
          {isPendingOtherUserNote ? (
            /* Subtly loading someone else's note to check authorization */
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
              {noteView?.authorName && (
                <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginBottom: "8px" }}>
                  By {noteView.authorName}
                </div>
              )}
              <div
                className="notebook-viewer-content"
                dangerouslySetInnerHTML={{
                  __html: normalizeContentToHtml(noteView?.content || "No revelation written for this page yet."),
                }}
              />
              <div className="notebook-share-subtle">
                <span className="notebook-share-badge is-shared">
                  <CheckIcon size={12} /> Shared with my connect &amp; leaders
                </span>
              </div>
            </div>
          ) : (
            /* Owner's editing view: rendered immediately, never blocked */
            <>
              <div className="notebook-editor-wrap">
                <NotesEditor
                  content={content}
                  onChange={handleContentChange}
                  onLimitExceeded={handleLimitExceeded}
                  maxLength={1000}
                  placeholder="Write in your personal revelations…"
                />
                <div className="notebook-limit-text">
                  {plainTextLength(content)}/1000 characters
                  {limitExceeded && (
                    <span className="notebook-limit-warning">
                      {" "}
                      — limit reached, remove some text or formatting to keep typing
                    </span>
                  )}
                </div>
              </div>

              {/* Subtler sharing control moved to the bottom of the notes experience (Issue 183: Part 3) */}
              <div className="notebook-share-subtle">
                <label className="notebook-share-subtle-toggle">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => handleShareToggle(e.target.checked)}
                  />
                  <span>Share with my connect &amp; leaders</span>
                </label>

                {isShared && (
                  <span className="notebook-share-badge is-shared">
                    <CheckIcon size={12} /> Shared
                  </span>
                )}
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
                {isFetching && saveStatus === "idle" && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
                    <SpinnerIcon size={12} />
                    <span>Syncing…</span>
                  </span>
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
