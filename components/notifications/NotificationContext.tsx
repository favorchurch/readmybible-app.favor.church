"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  dismissAllNotifications as defaultDismissAll,
  dismissNotification as defaultDismiss,
  getNotifications as defaultGetNotifications,
  sendNudge as defaultSendNudge,
  type DismissNotificationResult,
  type NotificationItem,
  type NudgeResult,
} from "@/app/actions/notifications";
import type { NotificationContextValue } from "./types";

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  children,
  initialNotifications = [],
  guardedSendNudge = defaultSendNudge,
  guardedDismissNotification = defaultDismiss,
  guardedDismissAllNotifications = defaultDismissAll,
  viewerIsConnectMember = true,
  activeGroupId = null,
}: {
  children: React.ReactNode;
  initialNotifications?: NotificationItem[];
  guardedSendNudge?: (input: { targetPersonId: number; groupId: number; timezone?: string }) => Promise<NudgeResult>;
  guardedDismissNotification?: (input: { id: number }) => Promise<DismissNotificationResult>;
  guardedDismissAllNotifications?: () => Promise<DismissNotificationResult>;
  viewerIsConnectMember?: boolean;
  activeGroupId?: number | null;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await defaultGetNotifications();
      if (res.ok) {
        setNotifications(res.notifications);
      }
    } catch {
      // Keep existing notifications on fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (initialNotifications.length === 0) {
      defaultGetNotifications()
        .then((res) => {
          if (!cancelled && res.ok) {
            setNotifications(res.notifications);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [initialNotifications.length]);

  const activeNotifications = useMemo(
    () => notifications.filter((n) => !n.dismissedAt),
    [notifications],
  );

  const dismissNotification = useCallback(
    async (id: number): Promise<DismissNotificationResult> => {
      const result = await guardedDismissNotification({ id });
      if (result.ok) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, dismissedAt: new Date().toISOString() }
              : item,
          ),
        );
      }
      return result;
    },
    [guardedDismissNotification],
  );

  const dismissAllNotifications = useCallback(async (): Promise<DismissNotificationResult> => {
    const result = await guardedDismissAllNotifications();
    if (result.ok) {
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, dismissedAt: item.dismissedAt ?? nowIso })),
      );
    }
    return result;
  }, [guardedDismissAllNotifications]);

  const sendNudge = useCallback(
    async (input: { targetPersonId: number; groupId: number }): Promise<NudgeResult> => {
      return guardedSendNudge(input);
    },
    [guardedSendNudge],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      activeNotifications,
      loading,
      unreadCount: activeNotifications.length,
      sendNudge,
      dismissNotification,
      dismissAllNotifications,
      refresh,
      viewerIsConnectMember,
      activeGroupId,
    }),
    [
      notifications,
      activeNotifications,
      loading,
      sendNudge,
      dismissNotification,
      dismissAllNotifications,
      refresh,
      viewerIsConnectMember,
      activeGroupId,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Return safe fallback for isolated component renders (e.g. tests without provider)
    return {
      notifications: [],
      activeNotifications: [],
      loading: false,
      unreadCount: 0,
      sendNudge: defaultSendNudge,
      dismissNotification: (id: number) => defaultDismiss({ id }),
      dismissAllNotifications: defaultDismissAll,
      refresh: async () => {},
      viewerIsConnectMember: false,
      activeGroupId: null,
    };
  }
  return ctx;
}
