"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "./NotificationContext";

export function NotificationInbox({ className = "" }: { className?: string }) {
  const {
    notifications,
    activeNotifications,
    unreadCount,
    dismissNotification,
    dismissAllNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<number | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleDismiss(id: number) {
    setInboxError(null);
    setDismissingId(id);
    try {
      const result = await dismissNotification(id);
      if (!result.ok) {
        setInboxError(result.error);
      }
    } catch {
      setInboxError("Failed to dismiss notification.");
    } finally {
      setDismissingId(null);
    }
  }

  async function handleDismissAll() {
    setInboxError(null);
    try {
      const result = await dismissAllNotifications();
      if (!result.ok) {
        setInboxError(result.error);
      }
    } catch {
      setInboxError("Failed to dismiss notifications.");
    }
  }

  function formatRelativeTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div className={`notification-inbox-wrap ${className}`} data-testid="notification-inbox-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="notification-inbox-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} new)` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        data-testid="notification-inbox-trigger"
      >
        <svg
          className="notification-inbox-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-inbox-badge" data-testid="notification-inbox-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="notification-inbox-panel"
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-inbox-panel"
        >
          <div className="notification-inbox-header">
            <h3 className="notification-inbox-title">Notifications</h3>
            {activeNotifications.length > 0 && (
              <button
                type="button"
                className="notification-inbox-clear-btn"
                onClick={handleDismissAll}
                data-testid="notification-inbox-clear-all"
              >
                Dismiss all
              </button>
            )}
          </div>

          <div className="notification-inbox-body">
            {inboxError && (
              <p className="nudge-btn-feedback" style={{ padding: "0 16px" }} role="status">
                {inboxError}
              </p>
            )}

            {notifications.length === 0 ? (
              <p className="notification-inbox-empty" data-testid="notification-inbox-empty">
                No notifications yet.
              </p>
            ) : (
              <ul className="notification-list">
                {notifications.map((item) => {
                  const isUnread = !item.dismissedAt;
                  return (
                    <li
                      key={item.id}
                      className={`notification-item ${
                        isUnread ? "notification-item--unread" : "notification-item--dismissed"
                      }`}
                      data-testid={`notification-item-${item.id}`}
                    >
                      <div className="notification-item-content">
                        <div className="notification-item-title">{item.title}</div>
                        <p className="notification-item-message">{item.message}</p>
                        <span className="notification-item-time">
                          {formatRelativeTime(item.createdAt)}
                          {item.dismissedAt && " · Dismissed"}
                        </span>
                      </div>
                      {isUnread && (
                        <button
                          type="button"
                          className="notification-item-dismiss-btn"
                          onClick={() => handleDismiss(item.id)}
                          disabled={dismissingId === item.id}
                          aria-label={`Dismiss notification: ${item.title}`}
                          data-testid={`notification-dismiss-btn-${item.id}`}
                        >
                          {dismissingId === item.id ? "…" : "Dismiss"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
