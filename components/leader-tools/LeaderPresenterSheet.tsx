"use client";

import { useState } from "react";
import type { RosterMemberView } from "@/components/app-shell";

export function LeaderPresenterSheet({
  open,
  onClose,
  joinCode,
  qrDataUrl,
  groupName,
  phase,
  stillReading,
  appBaseUrl,
}: {
  open: boolean;
  onClose: () => void;
  joinCode: string | null;
  qrDataUrl: string | null;
  groupName: string | null;
  phase: string;
  stillReading: RosterMemberView[];
  appBaseUrl: string;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [shared, setShared] = useState(false);

  const handleClose = () => {
    setCopiedCode(false);
    setCopiedMessage(false);
    setShared(false);
    onClose();
  };

  if (!open) return null;

  const baseUrl = typeof window !== "undefined" ? appBaseUrl || window.location.origin : appBaseUrl;
  const joinUrl = joinCode ? `${baseUrl}/join/${joinCode}` : "";

  const handleCopyCode = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleShareLink = async () => {
    if (!joinUrl) return;
    const shareData = {
      title: "Read My Bible",
      text: `Join our Connect Group (${groupName ?? "Connect Group"}) on Read My Bible:`,
      url: joinUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleCopyEncouragement = async () => {
    const text = "Hey friend! Just reading Matthew with our Connect Group today. Cheering you on! 🕊️";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="sheet-backdrop">
      <button
        type="button"
        className="sheet-backdrop-dismiss"
        onClick={handleClose}
        aria-label="Close presenter mode"
      />
      <div
        className="leader-presenter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="presenter-title"
      >
        <div className="sheet-handle" />
        <div className="presenter-header">
          <div>
            <p className="eyebrow">LEADER TOOLS · PRESENTER MODE</p>
            <h2 id="presenter-title">Bring someone in</h2>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={handleClose}
            aria-label="Close presenter mode"
          >
            ✕
          </button>
        </div>

        <p className="presenter-sub">
          {phase === "pre-launch"
            ? "Share this before October 1 so your group is ready to read together."
            : "Show this code or QR to anyone in the room who isn't in a Connect Group yet. They enter it in the app and they're in."}
        </p>

        <div className="presenter-qr-card">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR code to join ${groupName}`}
              className="presenter-qr-image"
              width={220}
              height={220}
            />
          ) : (
            <div className="presenter-qr-placeholder">Generating QR…</div>
          )}

          <div className="presenter-code-box">
            <span className="eyebrow">GROUP CODE</span>
            <strong className="presenter-code">{joinCode ?? "----"}</strong>
          </div>

          <div className="presenter-actions">
            <button
              type="button"
              className="primary-button presenter-btn"
              onClick={handleCopyCode}
            >
              {copiedCode ? "✓ Code Copied" : "Copy Code"}
            </button>
            <button
              type="button"
              className="secondary-button presenter-btn"
              onClick={handleShareLink}
            >
              {shared ? "✓ Link Copied" : "Share Invite Link"}
            </button>
          </div>
        </div>

        {phase === "active" && stillReading.length > 0 && (
          <div className="presenter-nudge-section">
            <div className="presenter-nudge-header">
              <p className="eyebrow">STILL READING TODAY ({stillReading.length})</p>
              <button
                type="button"
                className="copy-message-pill"
                onClick={handleCopyEncouragement}
              >
                {copiedMessage ? "✓ Encouragement Copied" : "Copy Gentle Encouragement"}
              </button>
            </div>
            <p className="presenter-nudge-names">
              {stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.
            </p>
          </div>
        )}

        <div className="presenter-footer">
          <p className="gentle-note">We cheer for groups, not against people.</p>
          <a
            className="secondary-link connect-portal-link"
            href="https://connect.favor.church"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage your group on connect.favor.church ↗
          </a>
        </div>
      </div>
    </div>
  );
}
