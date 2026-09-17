import type {
  DismissNotificationResult,
  GetNotificationsResult,
  NotificationItem,
  NudgeResult,
} from "@/app/actions/notifications";

export type {
  DismissNotificationResult,
  GetNotificationsResult,
  NotificationItem,
  NudgeResult,
};

export type NudgeButtonProps = {
  targetPersonId: number;
  groupId: number;
  targetName?: string;
  className?: string;
  disabled?: boolean;
  onNudgeSent?: () => void;
  sendNudge?: (input: { targetPersonId: number; groupId: number }) => Promise<NudgeResult>;
};

export type NotificationContextValue = {
  notifications: NotificationItem[];
  activeNotifications: NotificationItem[];
  loading: boolean;
  unreadCount: number;
  sendNudge: (input: { targetPersonId: number; groupId: number }) => Promise<NudgeResult>;
  dismissNotification: (id: number) => Promise<DismissNotificationResult>;
  dismissAllNotifications: () => Promise<DismissNotificationResult>;
  refresh: () => Promise<void>;
  viewerIsConnectMember: boolean;
  activeGroupId: number | null;
};
