// @vitest-environment jsdom

/**
 * Binds the late-fetch merge rule (Issue 183, Part 1) to real component
 * wiring. tests/merge-notes.test.ts covers mergeNoteContents as a pure
 * function, but only a rendered component proves the guard around it: a
 * merge triggered by typing before the fetch lands must happen exactly
 * once, and revisiting the page afterward must not re-append the same
 * fetched payload a second time.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type GetNoteResolver = (value: unknown) => void;
let resolveGetNote: GetNoteResolver | null = null;

const getNote = vi.fn(
  () =>
    new Promise((resolve: GetNoteResolver) => {
      resolveGetNote = resolve;
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

import { NotebookModal, type NotebookModalProps } from "@/components/notes/notebook-modal";

function renderModal(props: NotebookModalProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotebookModal {...props} />
    </QueryClientProvider>,
  );
}

function syncTextareaValue(): string {
  const textarea = document.querySelector(".notebook-sync-textarea") as HTMLTextAreaElement | null;
  return textarea?.value ?? "";
}

beforeEach(() => {
  getNote.mockClear();
  saveNote.mockClear();
  resolveGetNote = null;
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
});
