"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { notifications, nudges } from "@/db/schema";
import { appNow } from "@/lib/dev-clock";
import { getSessionContext } from "@/lib/session";

const sendNudgeSchema = z.object({
  targetPersonId: z.number().int().positive(),
  groupId: z.number().int().positive(),
  timezone: z.string().min(1).optional(),
});

export type NudgeResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      reason?: "already-nudged" | "self-nudge" | "not-authorized" | "unauthenticated";
    };

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  senderRockPersonId: number | null;
  senderName: string | null;
  groupId: number | null;
  createdAt: string;
  dismissedAt: string | null;
};

export type GetNotificationsResult =
  | { ok: true; notifications: NotificationItem[] }
  | { ok: false; error: string };

export type DismissNotificationResult =
  | { ok: true }
  | { ok: false; error: string };

function calendarDayString(date: Date, timezone?: string): string {
  try {
    if (timezone) {
      return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
    }
  } catch {
    // Fall back if timezone is unrecognized
  }
  return new Intl.DateTimeFormat("en-CA").format(date);
}

/**
 * Sends a nudge to a fellow Connect member.
 *
 * Rules:
 * - Rate limited to max 1 nudge per sender -> recipient per calendar day.
 * - No self-nudging.
 * - Sender must be a fellow Connect member or Connect Leader of the group.
 *   Regional/Cluster-only viewers without membership do not get nudge capability.
 * - Repeated attempts within the same day return clear non-destructive feedback.
 */
export async function sendNudge(input: z.infer<typeof sendNudgeSchema>): Promise<NudgeResult> {
  const parsed = sendNudgeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid nudge request." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return {
      ok: false,
      error: "You must be logged in to send a nudge.",
      reason: "unauthenticated",
    };
  }

  // No self-nudging
  if (session.rockPersonId === parsed.data.targetPersonId) {
    return {
      ok: false,
      error: "You cannot nudge yourself.",
      reason: "self-nudge",
    };
  }

  // Regional/Cluster-only viewers who are neither in the Connect nor its Connect Leader
  // do not get a member-nudge surface from upstream authority alone.
  const isMember = session.memberships.some((m) => m.groupId === parsed.data.groupId);
  const isLeaderOfGroup = session.isLeader && session.activeGroup?.groupId === parsed.data.groupId;
  if (!isMember && !isLeaderOfGroup) {
    return {
      ok: false,
      error: "You must be a member of this Connect group to send a nudge.",
      reason: "not-authorized",
    };
  }

  const now = appNow();
  const nudgeDate = calendarDayString(now, parsed.data.timezone);

  try {
    // Check if already nudged today
    const existing = await db
      .select({ id: nudges.id })
      .from(nudges)
      .where(
        and(
          eq(nudges.senderRockPersonId, session.rockPersonId),
          eq(nudges.recipientRockPersonId, parsed.data.targetPersonId),
          eq(nudges.nudgeDate, nudgeDate),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: "You've already nudged this member today.",
        reason: "already-nudged",
      };
    }

    // Record the nudge
    await db.insert(nudges).values({
      senderRockPersonId: session.rockPersonId,
      recipientRockPersonId: parsed.data.targetPersonId,
      groupId: parsed.data.groupId,
      nudgeDate,
    });

    // Create durable notification for the recipient
    const senderDisplayName = session.displayName?.trim() || "A fellow member";
    await db.insert(notifications).values({
      rockPersonId: parsed.data.targetPersonId,
      senderRockPersonId: session.rockPersonId,
      groupId: parsed.data.groupId,
      type: "nudge",
      title: "Nudge",
      message: `${senderDisplayName} nudged you to read today!`,
      metadata: {
        senderName: senderDisplayName,
        groupId: parsed.data.groupId,
      },
    });

    return { ok: true };
  } catch (error: unknown) {
    // Check for unique constraint violation (duplicate nudge on same day)
    const errorStr = String(error);
    if (
      errorStr.includes("nudges_sender_recipient_date_unique") ||
      errorStr.includes("duplicate key value")
    ) {
      return {
        ok: false,
        error: "You've already nudged this member today.",
        reason: "already-nudged",
      };
    }

    console.error("sendNudge error:", error);
    return { ok: false, error: "Unable to send nudge. Please try again." };
  }
}

/**
 * Retrieves all notifications for the current authenticated user.
 */
export async function getNotifications(): Promise<GetNotificationsResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: true, notifications: [] };
  }

  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.rockPersonId, session.rockPersonId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const items: NotificationItem[] = rows.map((r) => {
      const metadata = (r.metadata as Record<string, unknown> | null) ?? null;
      return {
        id: r.id,
        type: r.type,
        title: r.title,
        message: r.message,
        senderRockPersonId: r.senderRockPersonId,
        senderName: (metadata?.senderName as string) ?? null,
        groupId: r.groupId,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
        dismissedAt: r.dismissedAt ? r.dismissedAt.toISOString() : null,
      };
    });

    return { ok: true, notifications: items };
  } catch (error) {
    console.error("getNotifications error:", error);
    return { ok: false, error: "Failed to load notifications." };
  }
}

const dismissNotificationSchema = z.object({
  id: z.number().int().positive(),
});

/**
 * Dismisses a notification for the current user. Persists across reloads/devices.
 */
export async function dismissNotification(
  input: z.infer<typeof dismissNotificationSchema>,
): Promise<DismissNotificationResult> {
  const parsed = dismissNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification id." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You must be logged in to dismiss notifications." };
  }

  try {
    await db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(
        and(
          eq(notifications.id, parsed.data.id),
          eq(notifications.rockPersonId, session.rockPersonId),
        ),
      );

    return { ok: true };
  } catch (error) {
    console.error("dismissNotification error:", error);
    return { ok: false, error: "Failed to dismiss notification." };
  }
}

/**
 * Dismisses all active notifications for the current user.
 */
export async function dismissAllNotifications(): Promise<DismissNotificationResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You must be logged in to dismiss notifications." };
  }

  try {
    await db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(
        and(
          eq(notifications.rockPersonId, session.rockPersonId),
          isNull(notifications.dismissedAt),
        ),
      );

    return { ok: true };
  } catch (error) {
    console.error("dismissAllNotifications error:", error);
    return { ok: false, error: "Failed to dismiss notifications." };
  }
}
