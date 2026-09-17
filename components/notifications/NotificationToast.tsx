"use client";

import { useState } from "react";
import { useNotifications } from "./NotificationContext";

/**
 * Persistent toast for durable notifications (nudges, comments, etc.).
 *
 * Stays on screen until the reader explicitly dismisses it (no auto-dismiss timer).
 * Kept completely separate from transient save-status toasts.
 */
export function NotificationToast() {
  const { activeNotifications, dismissNotification } = useNotifications();
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (activeNotifications.length === 0) return null;

  // Show the most recent undismissed notification as the persistent toast
  const latestNotification = activeNotifications[0];

  async function handleDismiss() {
    if (!latestNotification) return;
    setErrorMsg(null);
    setDismissingId(latestNotification.id);
    try {
      const result = await dismissNotification(latestNotification.id);
      if (!result.ok) {
        setErrorMsg(result.error);
      }
    } catch {
      setErrorMsg("Failed to dismiss notification.");
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <div className="notification-toast-viewport" data-testid="notification-toast-viewport">
      <div
        className="notification-toast"
        role="alert"
        aria-live="assertive"
        data-testid="notification-toast"
      >
        <div className="notification-toast-content">
          <div className="notification-toast-title">{latestNotification.title}</div>
          <p className="notification-toast-message">{latestNotification.message}</p>
          {errorMsg && <p className="nudge-btn-feedback" role="status">{errorMsg}</p>}
        </div>
        <button
          type="button"
          className="notification-toast-dismiss"
          onClick={handleDismiss}
          disabled={dismissingId === latestNotification.id}
          aria-label="Dismiss notification"
          data-testid="notification-toast-dismiss"
        >
          {dismissingId === latestNotification.id ? "…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
