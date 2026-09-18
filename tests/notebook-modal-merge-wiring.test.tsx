// @vitest-environment jsdom

/**
 * Binds the late-fetch merge rule (Issue 183, Part 1) to real component
 * wiring. tests/merge-notes.test.ts covers mergeNoteContents as a pure
 * function, but only a rendered component proves the guard around it: a
 * merge triggered by typing before the fetch lands must happen exactly
 * once, and revisiting the page afterward must not re-append the same
 * fetched payload a second time.
 */

import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/components/notes/merge-notes", async () => {
  const actual = await vi.importActual<typeof import("@/components/notes/merge-notes")>(
    "@/components/notes/merge-notes",
  );
  return { ...actual, mergeNoteContents: vi.fn(actual.mergeNoteContents) };
});

type GetNoteResolver = (value: unknown) => void;
let resolveGetNote: GetNoteResolver | null = null;
// Every resolver in call order -- lets a test resolve a specific call (e.g.
// the Nth fetch for a page after navigating away and back) instead of only
// ever the most recent one.
let getNoteResolvers: GetNoteResolver[] = [];

const getNote = vi.fn(
  () =>
    new Promise((resolve: GetNoteResolver) => {
      resolveGetNote = resolve;
      getNoteResolvers.push(resolve);
    }),
);
const saveNote = vi.fn(async (input: { page: string; content: string; isShared: boolean }) => ({
  ok: true as const,
  note: {
    id: 1,
    page: input.page,
    content: input.content,
    isShared: input.isShared,
    updatedAt: new Date().toISOString(),
  },
}));

vi.mock("@/app/actions/notes", () => ({
  getNote: (...args: unknown[]) => getNote(...(args as [])),
  saveNote: (...args: [{ page: string; content: string; isShared: boolean }]) => saveNote(...args),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

import { mergeNoteContents } from "@/components/notes/merge-notes";
import { NotebookModal, type NotebookModalProps } from "@/components/notes/notebook-modal";

function renderModal(props: NotebookModalProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <NotebookModal {...props} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function renderModalStrict(props: NotebookModalProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <NotebookModal {...props} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

function syncTextareaValue(): string {
  const textarea = document.querySelector(".notebook-sync-textarea") as HTMLTextAreaElement | null;
  return textarea?.value ?? "";
}

beforeEach(() => {
  getNote.mockClear();
  saveNote.mockClear();
  vi.mocked(mergeNoteContents).mockClear();
  resolveGetNote = null;
  getNoteResolvers = [];
});

afterEach(() => {
  cleanup();
});

describe("late-fetch merge (Issue 183: Part 1)", () => {
  it("prepends typed content to a later-arriving fetch exactly once, and does not re-append it on revisit", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    // Type before the fetch resolves -- this is the race the merge rule exists for.
    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed before fetch landed" } });

    expect(resolveGetNote).toBeTruthy();
    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "<p>previously saved revelation</p>",
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const merged = "<p>typed before fetch landed</p><p>previously saved revelation</p>";

    // Typed content must be PREPENDED to fetched content, never overwritten.
    await waitFor(() => expect(syncTextareaValue()).toBe(merged));

    // The merge must autosave so the merged result is durable.
    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ content: merged }));

    // Navigate away and back. The page reloads from the now-fresh cache;
    // a second resolution of the SAME fetched payload must not duplicate it.
    fireEvent.click(screen.getByLabelText("Next page"));
    fireEvent.click(screen.getByLabelText("Previous page"));

    await waitFor(() => expect(syncTextareaValue()).toBe(merged));

    expect(saveNote).toHaveBeenCalledTimes(1);
  });

  it("adopts the fetched sharing flag when merging typed content with an already-shared note", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed before fetch landed" } });

    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "<p>previously saved revelation</p>",
        isShared: true,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const checkbox = await screen.findByRole("checkbox", { name: /share with my connect/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));

    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ isShared: true }));
  });

  it("adopts the fetched sharing flag even when the fetched note has no content to merge", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed before fetch landed" } });

    // The stored note is empty but was already marked shared -- the empty
    // content must not gate the sharing flag out of the merge entirely.
    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "",
        isShared: true,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const checkbox = await screen.findByRole("checkbox", { name: /share with my connect/i });
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));
  });

  it("blocks autosave and surfaces an error when a merge exceeds the 1000 character limit, without losing the merged text or getting stuck", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    const typed = "A".repeat(600);
    fireEvent.change(textarea, { target: { value: typed } });

    const fetchedContent = `<p>${"B".repeat(600)}</p>`;
    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: fetchedContent,
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const merged = `<p>${typed}</p>${fetchedContent}`;

    // The over-limit merge is kept in local state -- it must not be discarded.
    await waitFor(() => expect(syncTextareaValue()).toBe(merged));

    // Give the debounce window time to elapse; the oversized merge must never
    // be sent to the server (it would fail the 1000-char zod validation anyway).
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(saveNote).not.toHaveBeenCalled();
    expect(screen.getByText(/too large to save because of its formatting/i)).toBeTruthy();

    // The user must be able to edit their way back under the limit -- this
    // must not be permanently stuck requiring a blind, unfed-back deletion.
    fireEvent.change(textarea, { target: { value: "trimmed content" } });
    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ content: "trimmed content" }));
  });

  it("computes the late-fetch merge exactly once even under StrictMode's double-invoked state updaters", async () => {
    renderModalStrict({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalled());

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed before fetch landed" } });

    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "<p>previously saved revelation</p>",
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    await waitFor(() => expect(saveNote).toHaveBeenCalled());

    // A side effect (triggerAutosave) inside a setState updater runs twice
    // under StrictMode; computing the merge outside it must not.
    expect(mergeNoteContents).toHaveBeenCalledTimes(1);
  });

  it("F1 case A: a share toggle made before the fetch lands wins over the fetched value, with no content typed", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const checkbox = await screen.findByRole("checkbox", { name: /share with my connect/i });
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    // The server's last-known record is unshared -- it must not silently
    // revert the toggle the user just made.
    resolveGetNote!({
      ok: true,
      note: {
        id: 0,
        page: "general",
        content: "",
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: false,
      },
    });

    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));

    // The toggle's own autosave must persist isShared=true, never false.
    await waitFor(() => expect(saveNote).toHaveBeenCalled());
    expect(saveNote.mock.calls.every(([arg]) => arg.isShared === true)).toBe(true);

    // A later keystroke must not silently re-send isShared=false, which is
    // what a reverted local `isShared` state would do.
    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "a note" } });

    await waitFor(() =>
      expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ content: "a note", isShared: true })),
    );
    expect(saveNote.mock.calls.some(([arg]) => arg.isShared === false)).toBe(false);
  });

  it("F1 case B: a share toggle made alongside typing before the fetch lands wins over the fetched value, through the merge", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed before fetch landed" } });

    const checkbox = await screen.findByRole("checkbox", { name: /share with my connect/i });
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    // The server's last-known record is unshared -- it must not win over
    // the toggle the user just made.
    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "<p>previously saved revelation</p>",
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const merged = "<p>typed before fetch landed</p><p>previously saved revelation</p>";
    await waitFor(() => expect(syncTextareaValue()).toBe(merged));
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));
    expect(saveNote).toHaveBeenCalledWith(expect.objectContaining({ content: merged, isShared: true }));
  });

  it("N1: a failed first fetch does not block a later successful fetch's data from ever being adopted", async () => {
    // userTypedPagesRef marks "general" as user-touched and is never cleared
    // by navigation (only by the modal fully closing), so it stays true
    // across the away-and-back trip below regardless of this fix -- that
    // part isn't what this test is proving.
    const { queryClient } = renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));
    getNoteResolvers[0]({ ok: false, error: "boom" });
    // The failure has no dedicated visible indicator -- just let its .then()
    // handler settle before continuing.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "typed while the first fetch had failed" } });

    // Force a fresh fetch for the SAME page by navigating away and back,
    // dropping the (failed) cache entry first so this isn't served from a
    // 30s-fresh cache untouched by the retry. Note: navigating away from a
    // page whose content was never successfully cached also drops whatever
    // was typed on it (a separate, pre-existing gap -- content has no
    // per-page store outside the query cache) -- that's why the assertion
    // below checks that the retry's fetched data is adopted at all, not
    // that the (now-lost) typed prefix survives too.
    fireEvent.click(screen.getByLabelText("Next page"));
    queryClient.removeQueries();
    fireEvent.click(screen.getByLabelText("Previous page"));

    await waitFor(() => expect(getNote.mock.calls.length).toBeGreaterThanOrEqual(3));

    const latestResolver = getNoteResolvers[getNoteResolvers.length - 1];
    latestResolver({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: "<p>previously saved revelation</p>",
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    // Without the fix, the failed first fetch marks the page "loaded", so
    // this retry is misread as a background revalidation; since the page is
    // also marked "user typed", the revalidation branch's own guard skips
    // adopting the fetched content entirely and the textarea stays empty.
    // With the fix, the retry is correctly treated as a first load and its
    // data is adopted.
    await waitFor(() => expect(syncTextareaValue()).toBe("<p>previously saved revelation</p>"));
  });

  it("N2: the over-limit error does not cite '1000 characters', which would contradict a low visible-text counter", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalledTimes(1));

    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);
    fireEvent.change(textarea, { target: { value: "hi" } });

    // Heavily styled but visually short: 30 spans of "yo" is 60 visible
    // characters but well over 1000 raw HTML characters once merged.
    const heavyFetched = '<span style="font-family: Arial;">yo</span>'.repeat(30);
    resolveGetNote!({
      ok: true,
      note: {
        id: 5,
        page: "general",
        content: heavyFetched,
        isShared: false,
        authorPersonId: 1,
        updatedAt: "",
        isOwner: true,
        exists: true,
      },
    });

    const merged = `<p>hi</p>${heavyFetched}`;
    await waitFor(() => expect(syncTextareaValue()).toBe(merged));
    expect(merged.length).toBeGreaterThan(1000);

    // The counter reports visible text (well under the limit)...
    expect(await screen.findByText("62/1000 characters")).toBeTruthy();
    // ...at the same time as an error that must not cite "1000" and thereby
    // contradict the counter sitting right next to it.
    const errorEl = await screen.findByText(/too large to save because of its formatting/i);
    expect(errorEl.textContent).not.toMatch(/1000/);
  });
});
