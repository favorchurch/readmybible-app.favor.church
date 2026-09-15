/** Approved option B. Access belongs to the current group, not the viewer. */
export function sceneEligibility(checkinCount: number | null) {
  if (checkinCount === null || !Number.isFinite(checkinCount) || checkinCount < 0) {
    return { kind: "unavailable", message: "Gathering progress is unavailable. You can still explore Classic." } as const;
  }
  if (checkinCount === 0) {
    return { kind: "locked", message: "Your group's first chapter check-in opens this gathering for everyone." } as const;
  }
  return { kind: "unlocked", message: "Your group opened this gathering. Everyone belongs here." } as const;
}
