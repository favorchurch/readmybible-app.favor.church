// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { submitFeedback } = vi.hoisted(() => ({
  submitFeedback: vi.fn(async (): Promise<{ ok: true } | { ok: false; error: string }> => ({ ok: true })),
}));
vi.mock("@/app/actions/submitFeedback", () => ({ submitFeedback }));

import { FeedbackSheet } from "@/components/feedback-sheet";
import { ProfileEditor } from "@/components/profile-editor";
import { ToastProvider } from "@/components/toast";
import { defaultAvatarConfig, type UserProfile } from "@/components/avatar";

const profile: UserProfile = { displayName: "Alex", translation: "NIV", ...defaultAvatarConfig };

afterEach(() => {
  cleanup();
  submitFeedback.mockClear();
});

function renderFeedback() {
  return render(
    <ToastProvider>
      <FeedbackSheet open onClose={vi.fn()} />
    </ToastProvider>,
  );
}

describe("feedback UI", () => {
  it("offers exactly the two requested categories and a textual feedback field", () => {
    renderFeedback();

    expect(screen.getByRole("heading", { name: "Add your Feedback" })).toBeTruthy();
    expect(screen.getByLabelText("Category")).toBeTruthy();
    expect(screen.getByLabelText("Textual Feedback")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Read My Bible App" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Experience with Favor Connects" })).toBeTruthy();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("submits identified feedback through the server action and uses the save flow", async () => {
    renderFeedback();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Read My Bible App" } });
    fireEvent.change(screen.getByLabelText("Textual Feedback"), { target: { value: "The reading view is great." } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await vi.waitFor(() => expect(submitFeedback).toHaveBeenCalledWith({
      category: "Read My Bible App",
      textualFeedback: "The reading view is great.",
    }));
  });

  it("uses the toast as the only inline surface for a returned failure", async () => {
    submitFeedback.mockResolvedValue({ ok: false, error: "Feedback is temporarily unavailable." });
    renderFeedback();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Read My Bible App" } });
    fireEvent.change(screen.getByLabelText("Textual Feedback"), { target: { value: "The reading view is great." } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await vi.waitFor(() => expect(screen.getByRole("status").textContent).toContain("Feedback is temporarily unavailable."));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses the same message in the toast and inline error when the action throws", async () => {
    submitFeedback.mockRejectedValue(new Error("database unavailable"));
    renderFeedback();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Read My Bible App" } });
    fireEvent.change(screen.getByLabelText("Textual Feedback"), { target: { value: "The reading view is great." } });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toContain("We couldn't send your feedback. Please try again."));
    expect(screen.getByRole("status").textContent).toContain("We couldn't send your feedback. Please try again.");
  });

  it("exposes the entry point from the existing profile editor", () => {
    render(
      <ToastProvider>
        <ProfileEditor profile={profile} saving={false} onClose={vi.fn()} onSave={vi.fn()} />
      </ToastProvider>,
    );
    expect(screen.getByRole("button", { name: "Add your Feedback" })).toBeTruthy();
  });
});
