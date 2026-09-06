"use client";

import { useState } from "react";

export function LeaderTopBanner({
  joinCode,
  phase,
  readersToday,
  memberCount,
  appBaseUrl,
  onOpenPresenter,
}: {
  joinCode: string | null;
  phase: string;
  readersToday: number;
  memberCount: number;
  appBaseUrl: string;
  onOpenPresenter: () => void;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [cheeredGroup, setCheeredGroup] = useState(false);

  const isFullHouse = phase === "active" && memberCount > 0 && readersToday === memberCount;
  const baseUrl = typeof window !== "undefined" ? appBaseUrl || window.location.origin : appBaseUrl;
  const joinUrl = joinCode ? `${baseUrl}/join/${joinCode}` : "";

  const handleCopyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareCheer = async () => {
    const text = `🎉 Amazing job everyone! All ${memberCount} of us read Matthew today in our Connect Group! 🙌✨`;
    try {
      await navigator.clipboard.writeText(text);
      setCheeredGroup(true);
      setTimeout(() => setCheeredGroup(false), 2000);
    } catch {
      // ignore
    }
  };

  if (isFullHouse) {
    return (
      <div className="leader-top-banner full-house">
        <div className="banner-text">
          <span className="eyebrow">GROUP MILESTONE</span>
          <strong>🎉 Full house! 100% check-in today</strong>
        </div>
        <button
          type="button"
          className="banner-action-btn cheer"
          onClick={handleShareCheer}
        >
          {cheeredGroup ? "✓ Cheer Copied" : "Cheer the Group 💬"}
        </button>
      </div>
    );
  }

  return (
    <aside className="leader-top-banner" data-section="leader-top-banner">
      <div className="banner-left">
        <span className="eyebrow">LEADER TOOLS · BRING SOMEONE IN</span>
        <div className="banner-code-row">
          <span className="banner-code-label">Group code:</span>
          <strong className="banner-code">{joinCode ?? "----"}</strong>
        </div>
      </div>
      <div className="banner-actions">
        <button
          type="button"
          className="banner-action-btn link"
          onClick={handleCopyLink}
        >
          {copiedLink ? "✓ Copied" : "Copy Link"}
        </button>
        <button
          type="button"
          className="banner-action-btn qr"
          onClick={onOpenPresenter}
          aria-label="Open QR code"
          title="Open QR code"
        >
          QR ↗
        </button>
      </div>
    </aside>
  );
}
