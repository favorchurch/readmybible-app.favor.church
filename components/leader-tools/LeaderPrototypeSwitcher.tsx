"use client";

export type LeaderPrototypeMode = "standard" | "option1" | "option2" | "option3";

export function LeaderPrototypeSwitcher({
  mode,
  onChange,
}: {
  mode: LeaderPrototypeMode;
  onChange: (next: LeaderPrototypeMode) => void;
}) {
  return (
    <div className="leader-prototype-switcher" role="region" aria-label="Leader Tools Prototype Switcher">
      <div className="switcher-label">
        <span>PROTOTYPE PREVIEW</span>
      </div>
      <div className="switcher-buttons" role="group" aria-label="Select prototype option">
        <button
          type="button"
          className={mode === "standard" ? "active" : ""}
          onClick={() => onChange("standard")}
        >
          Default
        </button>
        <button
          type="button"
          className={mode === "option1" ? "active" : ""}
          onClick={() => onChange("option1")}
        >
          Opt 1: Presenter
        </button>
        <button
          type="button"
          className={mode === "option2" ? "active" : ""}
          onClick={() => onChange("option2")}
        >
          Opt 2: Hub
        </button>
        <button
          type="button"
          className={mode === "option3" ? "active" : ""}
          onClick={() => onChange("option3")}
        >
          Opt 3: Ambient
        </button>
      </div>
    </div>
  );
}
