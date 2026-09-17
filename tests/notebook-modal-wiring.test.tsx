// @vitest-environment jsdom

/**
 * Binds note autosave's Test Mode guard to the real component wiring, the
 * same lesson as tests/reading-dialog-wiring.test.ts: the guard function is
 * tested in isolation elsewhere (tests/test-mode.test.ts), but only a
 * rendered component proves the save-status indicator never paints a false
 * "saved" tick for a write Test Mode actually blocked.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getNote = vi.fn(async () => ({
  ok: true as const,
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
}));
const saveNote = vi.fn(async (input: { page: string; content: string; isShared: boolean }) => ({
  ok: true as const,
  note: { id: 1, page: input.page, content: input.content, isShared: input.isShared, updatedAt: new Date().toISOString() },
}));

vi.mock("@/app/actions/notes", () => ({
  getNote: (...args: unknown[]) => getNote(...(args as [])),
  saveNote: (...args: [{ page: string; content: string; isShared: boolean }]) => saveNote(...args),
}));

/** Mutable so a single test can turn test mode on; reset in beforeEach. */
const search = { value: "" };

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { NotebookModal, type NotebookModalProps } from "@/components/notes/notebook-modal";

/**
 * The real app always has a QueryProvider from the root layout, so a fresh
 * client per render mirrors production. Without this, every render in this
 * file shares components/providers/query-provider.tsx's module-level
 * fallback client, and one test's cached note payload leaks into the next.
 */
function renderModal(props: NotebookModalProps) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotebookModal {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search.value = "";
  getNote.mockClear();
  saveNote.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("known-bad #1: Test Mode blocks note autosave", () => {
  it("performs no write and never shows a saved checkmark while Test Mode is active", async () => {
    search.value = "test=1";
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalled());
    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);

    fireEvent.change(textarea, { target: { value: "a private reflection" } });

    // Debounce is 700ms; give it time to fire and settle.
    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(saveNote).not.toHaveBeenCalled();
    expect(screen.queryByText("Saved")).toBeNull();
    expect(document.querySelector(".notebook-save-status.is-blocked")).toBeTruthy();
  });

  it("saves normally and shows the saved checkmark when Test Mode is inactive", async () => {
    renderModal({ open: true, onClose: vi.fn() });

    await waitFor(() => expect(getNote).toHaveBeenCalled());
    const textarea = await screen.findByPlaceholderText(/write in your personal revelations/i);

    fireEvent.change(textarea, { target: { value: "a private reflection" } });

    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(await screen.findByText("Saved")).toBeTruthy();
  });
});
