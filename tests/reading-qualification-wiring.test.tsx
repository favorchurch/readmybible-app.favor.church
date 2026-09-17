// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ReadingDialog } from "@/components/reading-dialog";

const observers: { callback: IntersectionObserverCallback; target: Element | null }[] = [];
let mockNow = 1_000;

class QualificationObserver {
  private readonly record: { callback: IntersectionObserverCallback; target: Element | null };

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, target: null };
    observers.push(this.record);
  }

  observe(target: Element) {
    this.record.target = target;
    this.record.callback(
      [{ isIntersecting: false, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  disconnect() {
    const index = observers.indexOf(this.record);
    if (index >= 0) observers.splice(index, 1);
  }

  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

function props(onReachBottom: () => void, translation: "NIV" | "NET") {
  return {
    chapter: 1,
    chapters: [1],
    passageRef: "Matthew 1",
    keyPassageRef: "Matthew 1:20-21",
    assignmentTitle: "Jesus is born",
    translation,
    mode: "unread" as const,
    isCatchUp: false,
    chaptersRead: 0,
    groupName: null,
    group: null,
    tick: { kind: "idle" as const },
    onReachBottom,
    onRetry: () => {},
    onTranslationChange: () => {},
    onClose: () => {},
  };
}

beforeEach(() => {
  mockNow = 1_000;
  observers.length = 0;
  vi.spyOn(performance, "now").mockImplementation(() => mockNow);
  vi.stubGlobal("IntersectionObserver", QualificationObserver);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          ref: "Matthew 1",
          translation: "NIV",
          text: "A passage",
          verses: { "1": "A verse" },
          bibleComUrl: "https://example.test/bible",
          attribution: "NET attribution",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ReadingDialog qualification lifecycle", () => {
  it("restarts qualification when the translation changes", async () => {
    const onReachBottom = vi.fn();
    const view = render(<ReadingDialog {...props(onReachBottom, "NIV")} />);

    await waitFor(() => expect(observers).toHaveLength(1));
    mockNow = 16_000;
    observers[0].callback(
      [{ isIntersecting: true, target: observers[0].target } as unknown as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
    const callsBeforeTranslationChange = onReachBottom.mock.calls.length;
    expect(callsBeforeTranslationChange).toBeGreaterThan(0);

    mockNow = 20_000;
    view.rerender(<ReadingDialog {...props(onReachBottom, "NET")} />);
    await waitFor(() => expect(observers).toHaveLength(1));

    observers[0].callback(
      [{ isIntersecting: true, target: observers[0].target } as unknown as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
    expect(onReachBottom).toHaveBeenCalledTimes(callsBeforeTranslationChange);
  });
});
