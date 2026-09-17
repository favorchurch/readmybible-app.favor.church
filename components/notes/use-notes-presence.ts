"use client";

import { useCallback, useEffect, useState } from "react";

import { getNotesPresence, type NotePresenceItem } from "@/app/actions/notes";

export type NotesPresenceMap = Record<string, NotePresenceItem>;

export function useNotesPresence(authorPersonId?: number) {
  const [presence, setPresence] = useState<NotesPresenceMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getNotesPresence({ authorPersonId });
      if (res.ok) {
        setPresence(res.presence);
      }
    } catch {
      // Keep existing presence on error
    } finally {
      setLoading(false);
    }
  }, [authorPersonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasNote = useCallback(
    (page: string): boolean => {
      return Boolean(presence[page]?.exists);
    },
    [presence],
  );

  const isShared = useCallback(
    (page: string): boolean => {
      return Boolean(presence[page]?.isShared);
    },
    [presence],
  );

  const setPagePresence = useCallback(
    (page: string, item: { exists: boolean; isShared: boolean }) => {
      setPresence((prev) => ({
        ...prev,
        [page]: item,
      }));
    },
    [],
  );

  return {
    presence,
    hasNote,
    isShared,
    loading,
    refresh,
    setPagePresence,
  };
}
