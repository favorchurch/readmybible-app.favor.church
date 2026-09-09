// @vitest-environment jsdom

import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sheet } from "@/components/sheet";

afterEach(cleanup);

// jsdom doesn't implement the Pointer Capture APIs; components/sheet.tsx calls them
// during a real drag, so stub them out to exercise the gesture logic under test.
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.hasPointerCapture = () => false;
}

function firePointer(el: Element, type: string, clientY: number, clientX = 100) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX,
    clientY,
  });
  el.dispatchEvent(event);
}

describe("Sheet touch gesture", () => {
  it("scrolls content on an upward drag (flick up) that starts on a button/row, not just empty space", () => {
    render(
      React.createElement(Sheet, {
        open: true,
        onClose: () => {},
        labelledBy: "t",
        children: React.createElement("button", { type: "button", "data-testid": "row" }, "Row"),
      })
    );
    const scroll = document.querySelector(".sheet-scroll") as HTMLElement;
    const row = document.querySelector('[data-testid="row"]') as HTMLElement;
    scroll.scrollTop = 40;

    firePointer(row, "pointerdown", 300);
    firePointer(row, "pointermove", 260); // dragged finger up 40px = flick up
    firePointer(row, "pointerup", 260);

    expect(scroll.scrollTop).toBe(80);
  });

  it("does not close the sheet when dragging down starting on a button/row", () => {
    const onClose = vi.fn();
    render(
      React.createElement(Sheet, {
        open: true,
        onClose,
        labelledBy: "t",
        children: React.createElement("button", { type: "button", "data-testid": "row" }, "Row"),
      })
    );
    const row = document.querySelector('[data-testid="row"]') as HTMLElement;

    firePointer(row, "pointerdown", 100);
    firePointer(row, "pointermove", 260); // dragged down 160px, past the close threshold
    firePointer(row, "pointerup", 260);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes the sheet when dragging down from the drag handle", () => {
    const onClose = vi.fn();
    render(
      React.createElement(Sheet, {
        open: true,
        onClose,
        labelledBy: "t",
        children: React.createElement("div", null, "content"),
      })
    );
    const handle = document.querySelector(".sheet-drag-handle") as HTMLElement;

    firePointer(handle, "pointerdown", 100);
    firePointer(handle, "pointermove", 260); // dragged down 160px, past the close threshold
    firePointer(handle, "pointerup", 260);

    expect(onClose).toHaveBeenCalled();
  });
});
