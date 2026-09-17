"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { notes, profiles } from "@/db/schema";
import { isValidNotebookPage } from "@/components/notes/pages";
import { flattenGroupNodes } from "@/lib/admin/stats";
import { getMemberships } from "@/lib/rock/client";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { getSessionContext, type SessionContext } from "@/lib/session";

const saveNoteSchema = z
  .object({
    page: z.string().refine(isValidNotebookPage, {
      message: "Notes can only be written for General or defined campaign calendar dates (Oct 5–30).",
    }),
    content: z.string().max(1000, "Notes cannot exceed 1000 characters."),
    isShared: z.boolean(),
  })
  .strict();

export type SaveNoteInput = z.infer<typeof saveNoteSchema>;

export type SaveNoteResult =
  | {
      ok: true;
      note: {
        id: number;
        page: string;
        content: string;
        isShared: boolean;
        updatedAt: string;
      };
    }
  | { ok: false; error: string };

/**
 * Saves or updates a personal revelation note for a given page.
 * Validates 1000-char maximum and campaign calendar page bounds.
 */
export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note input." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to save notes." };
  }

  const authorPersonId = session.rockPersonId;
  const groupId = session.activeGroup?.groupId ?? null;

  try {
    const now = new Date();
    const [saved] = await db
      .insert(notes)
      .values({
        rockPersonId: authorPersonId,
        groupId,
        page: parsed.data.page,
        content: parsed.data.content,
        isShared: parsed.data.isShared,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [notes.rockPersonId, notes.page],
        set: {
          content: parsed.data.content,
          isShared: parsed.data.isShared,
          groupId: groupId ?? notes.groupId,
          updatedAt: now,
        },
      })
      .returning();

    return {
      ok: true,
      note: {
        id: saved.id,
        page: saved.page,
        content: saved.content,
        isShared: saved.isShared,
        updatedAt: saved.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("saveNote failed", { error, authorPersonId });
    return { ok: false, error: "Failed to save note. Please try again." };
  }
}

/**
 * Authorization for reading shared notes:
 * Shared-note readers are current fellow Connect members plus current Leaders
 * authorized over that Connect. Admin capability alone does not grant note access.
 */
export async function canReadSharedNote(
  session: SessionContext,
  authorPersonId: number,
  noteGroupId: number | null,
): Promise<boolean> {
  if (session.status !== "ok") return false;
  if (session.rockPersonId === authorPersonId) return true;

  let targetGroupId = noteGroupId;
  if (!targetGroupId) {
    const [profile] = await db
      .select({ activeGroupId: profiles.activeGroupId })
      .from(profiles)
      .where(eq(profiles.rockPersonId, authorPersonId))
      .limit(1);
    if (profile?.activeGroupId) {
      targetGroupId = profile.activeGroupId;
    } else {
      const authorMemberships = await getMemberships(authorPersonId);
      if (authorMemberships.length > 0) {
        targetGroupId = authorMemberships[0].GroupId;
      }
    }
  }

  if (!targetGroupId) {
    return false;
  }

  // 1. Current fellow Connect member
  const isFellowMember = session.memberships.some((m) => m.groupId === targetGroupId);
  if (isFellowMember) return true;

  // 2. Direct Leader over that Connect
  const isDirectLeader = session.memberships.some(
    (m) => m.groupId === targetGroupId && m.isLeader,
  );
  if (isDirectLeader) return true;

  // 3. Upstream Leader over that Connect (via section hierarchy)
  // Admin capability ALONE does not grant access -- only actual section memberships are inspected.
  if (session.sectionMemberships && session.sectionMemberships.length > 0) {
    const sectionRootIds = Array.from(
      new Set(session.sectionMemberships.map((m) => m.GroupId)),
    );
    const subtree = await loadSectionSubtree(sectionRootIds);
    const groupsInScope = flattenGroupNodes(subtree);
    if (groupsInScope.some((g) => g.id === targetGroupId)) {
      return true;
    }
  }

  return false;
}

export type NoteView = {
  id: number;
  page: string;
  content: string | null;
  isShared: boolean;
  authorPersonId: number;
  authorName?: string;
  updatedAt: string;
  isOwner: boolean;
  exists: boolean;
};

export type GetNoteResult =
  | { ok: true; note: NoteView }
  | { ok: false; error: string; exists?: boolean };

/**
 * Retrieves a note for a given page.
 * For another user's private note, existence indicator is exposed, never content.
 * For another user's shared note, enforces Connect member/leader authorization.
 */
export async function getNote(input: {
  page: string;
  authorPersonId?: number;
}): Promise<GetNoteResult> {
  if (!isValidNotebookPage(input.page)) {
    return { ok: false, error: "Invalid notebook page." };
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in to view notes." };
  }

  const authorId = input.authorPersonId ?? session.rockPersonId;
  const isOwner = session.rockPersonId === authorId;

  try {
    const [row] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.rockPersonId, authorId), eq(notes.page, input.page)))
      .limit(1);

    if (!row) {
      return {
        ok: true,
        note: {
          id: 0,
          page: input.page,
          content: "",
          isShared: false,
          authorPersonId: authorId,
          updatedAt: "",
          isOwner,
          exists: false,
        },
      };
    }

    if (isOwner) {
      return {
        ok: true,
        note: {
          id: row.id,
          page: row.page,
          content: row.content,
          isShared: row.isShared,
          authorPersonId: row.rockPersonId,
          updatedAt: row.updatedAt.toISOString(),
          isOwner: true,
          exists: true,
        },
      };
    }

    // Someone else's private note: expose existence only, NEVER content.
    if (!row.isShared) {
      return {
        ok: true,
        note: {
          id: row.id,
          page: row.page,
          content: null,
          isShared: false,
          authorPersonId: row.rockPersonId,
          updatedAt: row.updatedAt.toISOString(),
          isOwner: false,
          exists: true,
        },
      };
    }

    // Shared note: verify authorization
    const authorized = await canReadSharedNote(session, authorId, row.groupId);
    if (!authorized) {
      return {
        ok: false,
        error: "You don't have access to this shared note.",
        exists: true,
      };
    }

    const [authorProfile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.rockPersonId, authorId))
      .limit(1);
    const authorName = authorProfile?.displayName;

    return {
      ok: true,
      note: {
        id: row.id,
        page: row.page,
        content: row.content,
        isShared: true,
        authorPersonId: row.rockPersonId,
        authorName,
        updatedAt: row.updatedAt.toISOString(),
        isOwner: false,
        exists: true,
      },
    };
  } catch (error) {
    console.error("getNote failed", { error, page: input.page, authorId });
    return { ok: false, error: "Failed to retrieve note." };
  }
}

export type NotePresenceItem = {
  exists: boolean;
  isShared: boolean;
};

export type GetNotesPresenceResult =
  | { ok: true; presence: Record<string, NotePresenceItem> }
  | { ok: false; error: string };

/**
 * Returns presence map keyed by page ("general" or "YYYY-MM-DD") indicating
 * whether a note exists and whether it is shared.
 */
export async function getNotesPresence(input?: {
  authorPersonId?: number;
}): Promise<GetNotesPresenceResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }

  const authorId = input?.authorPersonId ?? session.rockPersonId;

  try {
    const rows = await db
      .select({
        page: notes.page,
        isShared: notes.isShared,
        content: notes.content,
      })
      .from(notes)
      .where(eq(notes.rockPersonId, authorId));

    const presence: Record<string, NotePresenceItem> = {};
    for (const r of rows) {
      if (r.content.trim().length > 0) {
        presence[r.page] = {
          exists: true,
          isShared: r.isShared,
        };
      }
    }

    return { ok: true, presence };
  } catch (error) {
    console.error("getNotesPresence failed", { error, authorId });
    return { ok: false, error: "Failed to get notes presence." };
  }
}

export type MyNotesResult =
  | {
      ok: true;
      notes: Array<{
        id: number;
        page: string;
        content: string;
        isShared: boolean;
        updatedAt: string;
      }>;
    }
  | { ok: false; error: string };

/**
 * Retrieves all notes authored by the current session user.
 */
export async function getMyNotes(): Promise<MyNotesResult> {
  const session = await getSessionContext();
  if (session.status !== "ok") {
    return { ok: false, error: "You need to be logged in." };
  }

  try {
    const rows = await db
      .select({
        id: notes.id,
        page: notes.page,
        content: notes.content,
        isShared: notes.isShared,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(eq(notes.rockPersonId, session.rockPersonId));

    return {
      ok: true,
      notes: rows.map((r) => ({
        id: r.id,
        page: r.page,
        content: r.content,
        isShared: r.isShared,
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("getMyNotes failed", { error });
    return { ok: false, error: "Failed to load notes." };
  }
}
