"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { checkIn } from "@/app/actions/checkIn";
import { chooseGroup } from "@/app/actions/chooseGroup";
import { getJoinCodeForGroup } from "@/app/actions/getJoinCodeForGroup";
import { getOrCreateJoinCode, type JoinCodeResult } from "@/app/actions/getOrCreateJoinCode";
import { getTestGroupSnapshot } from "@/app/actions/getTestGroupSnapshot";
import { joinByCode } from "@/app/actions/joinByCode";
import {
  dismissAllNotifications,
  dismissNotification,
  sendNudge,
} from "@/app/actions/notifications";
import { saveProfile } from "@/app/actions/saveProfile";
import {
  NotificationInbox,
  NotificationProvider,
  NotificationToast,
} from "@/components/notifications";
import {
  defaultAvatarConfig,
  type AvatarConfig,
  type Translation,
  type UserProfile,
} from "@/components/avatar";
import { TestModeEntry } from "@/components/test-mode";
import { ToastProvider, useToastAction } from "@/components/toast";
import type { ChooseGroupHandler, ConnectSwitcherContext } from "@/components/connect-switcher";
import { ReadingDialog, type ReadingDialogMode } from "@/components/reading-dialog";
import { ProfileEditor } from "@/components/profile-editor";
import {
  TestModePanel,
  guardWrite,
  scopeForRole,
  simulatedChapters,
  simulatedGroupRatio,
  simulatedMemberHistory,
  simulatedTodayState,
  syntheticTestModeView,
  testModeCampusFromSession,
  useTestMode,
  dateForSimulatedDay,
  writesBlocked,
  TEST_MODE_CAMPUSES,
} from "@/components/test-mode";
import { useToday } from "@/components/use-today";
import { BottomNav, type Tab } from "@/components/screens/bottom-nav";
import { ConnectScreen } from "@/components/screens/connect-screen";
import { GroupPickerScreen } from "@/components/screens/group-picker-screen";
import { ProgressScreen } from "@/components/screens/progress-screen";
import { RewardsScreen } from "@/components/screens/rewards-screen";
import { SoloScreen } from "@/components/screens/solo-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { LeaderScreen } from "@/components/screens/leader-screen";
import { coinsFor, streak as computeStreak } from "@/lib/game";
import {
  assignmentReference,
  completedAssignmentsCount,
  isAssignmentCompleted,
  planEntryForChapter,
  unfinishedAssignmentsUpTo,
  type PlanEntry,
} from "@/lib/plan";
import { checkInWithRetry, shouldWrite, simulatedCheckInGroup, type TickState } from "@/lib/reading-tick";
import type { GroupStanding } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupMembership } from "@/lib/session";
import type { ChooseGroupResult } from "@/app/actions/chooseGroup";
import { rosterUnlocks3dCampfire } from "@/components/connect-score";

export type RosterMemberView = {
  personId: number;
  avatar: AvatarConfig;
  isSelf: boolean;
  name: string;
  isLeader: boolean;
  readToday: boolean;
  chapters: number[];
  readingDates: string[];
  /**
   * Derived Connect points this person has contributed (issue #150), rounded
   * for display. Undefined for synthetic/test-mode rosters that don't resolve
   * real Rock roles -- callers fall back to the legacy chapter count.
   */
  contributedPoints?: number;
  /** True for a Regional Leader, Cluster Head, or Department Head -- collapsed to a member-facing "Leader" marker, distinct from `isLeader` (this Connect's own GT25 Leader/Assistant Leader role). */
  isUpstreamLeader?: boolean;
};

/** An upstream-only leader with points contributed to a bonus pool for this Connect, but no seat in its roster -- the member-facing Leaders section (issue #150). */
export type ConnectLeaderView = {
  personId: number;
  name: string;
  contributedPoints: number;
};

export type AppShellProps = {
  displayName: string;
  avatar: AvatarConfig;
  avatarCustomized: boolean;
  translation: Translation;
  memberships: GroupMembership[];
  activeGroup: GroupMembership | null;
  needsGroupChoice: boolean;
  isLeader: boolean;
  campusName: string | null;
  roster: RosterMemberView[];
  chapters: number[];
  readingDates: string[];
  groupStats: GroupStats | null;
  campusBoard: GroupStanding[];
  appBaseUrl: string;
  devMockToday: string | null;
  campusGroups: { groupId: number; groupName: string }[];
  /**
   * The same list, unresolved. When present the panel renders its picker behind
   * a Suspense boundary and `use()`s this instead, so the org-wide Rock call no
   * longer blocks the shell from painting in test mode -- the rest of the app
   * is interactive while the several-hundred-group list is still in flight.
   * `campusGroups` stays the resolved fallback for every non-streaming caller
   * (all the tests construct props directly).
   */
  campusGroupsPromise?: Promise<{ groupId: number; groupName: string }[]>;
  testWritableGroupId: number | null;
  campusId?: number | null;
  testModeAuthorized: boolean;
  isAdminScope?: boolean;
  sectionSlot: React.ReactNode | null;
  /** Upstream-only Regional Leaders / Cluster Heads for the active Connect's Leaders section (issue #150). Omitted for synthetic/test-mode rosters. */
  connectLeaders?: ConnectLeaderView[];
};

function toUserProfile(displayName: string, avatar: AvatarConfig, translation: Translation): UserProfile {
  return { ...defaultAvatarConfig, ...avatar, displayName, translation };
}

export function AppShell(props: AppShellProps) {
  return (
    <ToastProvider>
      <AppShellInner {...props} />
    </ToastProvider>
  );
}

function AppShellInner(props: AppShellProps) {
  const router = useRouter();
  const runToastAction = useToastAction();
  const realToday = useToday(props.devMockToday);
  const testMode = useTestMode(
    props.testModeAuthorized,
    testModeCampusFromSession(props.campusId ?? null),
  );
  const syntheticView = useMemo(
    () =>
      testMode.active && testMode.state.scenario !== "real"
        ? syntheticTestModeView(testMode.state.scenario, testMode.state.campus)
        : null,
    [testMode.active, testMode.state.scenario, testMode.state.campus],
  );
  const simulatedToday = useMemo(
    () => simulatedTodayState(dateForSimulatedDay(testMode.state.day, testMode.state.phase), realToday.timezone),
    [testMode.state.day, testMode.state.phase, realToday.timezone],
  );
  const today = testMode.active ? simulatedToday : realToday;
  const blocked = useMemo(() => {
    if (testMode.active && testMode.state.scenario !== "real") return true;
    return writesBlocked(
      testMode.active,
      testMode.state.groupId,
      props.activeGroup?.groupId ?? null,
      props.testWritableGroupId,
      testMode.state.sandboxWritesEnabled,
    );
  }, [
    testMode.active,
    testMode.state.scenario,
    testMode.state.groupId,
    props.activeGroup?.groupId,
    props.testWritableGroupId,
    testMode.state.sandboxWritesEnabled,
  ]);
  // Only checkIn is ever unblocked by the sandbox group. It writes a check-in
  // row against the server's real active group, which `writesBlocked` has
  // already pinned to the sandbox -- so the write cannot land anywhere else.
  //
  // The other four are blocked whenever test mode is on, sandbox or not.
  // joinByCode is the reason this is per-action rather than one flag: it joins
  // whatever group the *entered code* belongs to, not the simulated group, so
  // a sandbox unblock would let any code perform a real Rock write and move the
  // tester's active group. chooseGroup and getOrCreateJoinCode are Rock writes
  // for the same reason; saveProfile persists outside the group entirely.
  // In test mode, tell the server which group the client believes it is
  // writing to. `blocked` is computed from props captured at page render, so it
  // goes stale if the active group changes in another tab; checkIn re-resolves
  // the session and refuses the write when the two disagree (round-3 finding 1).
  const sandboxCheckIn = useMemo(() => {
    if (!testMode.active) return checkIn;
    const sandboxGroupId = props.testWritableGroupId ?? undefined;
    return (input: { chapter: number; timezone: string }) => checkIn({ ...input, sandboxGroupId });
  }, [testMode.active, props.testWritableGroupId]);
  const guardedCheckIn = useMemo(() => guardWrite(blocked, sandboxCheckIn), [blocked, sandboxCheckIn]);
  const guardedSaveProfile = useMemo(() => guardWrite(testMode.active, saveProfile), [testMode.active]);
  const guardedChooseGroup = useMemo(() => guardWrite(testMode.active, chooseGroup), [testMode.active]);
  const guardedJoinByCode = useMemo(() => guardWrite(testMode.active, joinByCode), [testMode.active]);
  const guardedGetOrCreateJoinCode = useMemo(
    () => guardWrite(testMode.active, getOrCreateJoinCode),
    [testMode.active],
  );
  const guardedSendNudge = useMemo(
    () => guardWrite(testMode.active, sendNudge),
    [testMode.active],
  );
  const guardedDismissNotification = useMemo(
    () => guardWrite(testMode.active, dismissNotification),
    [testMode.active],
  );
  const guardedDismissAllNotifications = useMemo(
    () => guardWrite(testMode.active, dismissAllNotifications),
    [testMode.active],
  );
  // The simulated group the panel has selected, falling back to the reader's
  // real active group when nothing is picked -- same resolution TestModePanel
  // already uses for its own "Join code: ..." preview (`simulatedGroupId`
  // there), so the two stay showing the same group's code.
  const simulatedGroupId = testMode.active && testMode.state.scenario === "real"
    ? (testMode.state.groupId ?? props.activeGroup?.groupId ?? null)
    : null;
  // Read-only substitute for `getOrCreateJoinCode` while test mode is active:
  // it can never INSERT a `joinCodes` row (#122), so the Leader tab's group
  // code tile no longer depends on the write that test mode blocks. A group
  // with no code yet is a real, expected state -- not an error -- so it maps
  // to an honest `{ ok: false }` rather than a spinner that never resolves or
  // a fabricated code.
  const testModeGetJoinCode = useMemo(() => {
    return async (): Promise<JoinCodeResult> => {
      if (testMode.state.scenario !== "real") {
        return { ok: false, error: "Synthetic scenarios do not have real join codes.", reason: "no-code-yet" };
      }
      if (simulatedGroupId === null) {
        return { ok: false, error: "No group code yet.", reason: "no-code-yet" };
      }
      const result = await getJoinCodeForGroup(simulatedGroupId);
      if (!result.ok) return { ok: false, error: result.error };
      if (result.code === null) {
        return { ok: false, error: "No group code yet.", reason: "no-code-yet" };
      }
      return { ok: true, code: result.code };
    };
  }, [simulatedGroupId, testMode.state.scenario]);

  const [snapshot, setSnapshot] = useState<{
    groupId: number;
    groupName: string;
    campusName: string | null;
    roster: RosterMemberView[];
    groupStats: GroupStats;
  } | null>(null);
  const [snapshotError, setSnapshotError] = useState<{ groupId: number; error: string } | null>(null);

  useEffect(() => {
    if (!testMode.active || testMode.state.scenario !== "real" || testMode.state.groupId === null) {
      return;
    }

    const currentGroupId = testMode.state.groupId;
    let cancelled = false;

    getTestGroupSnapshot({ groupId: currentGroupId }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSnapshot({
          groupId: currentGroupId,
          groupName: result.groupName,
          campusName: result.campusName,
          roster: result.roster,
          groupStats: result.groupStats,
        });
        // A retry that succeeds must clear the earlier failure for this same
        // group, or the panel keeps showing a stale error beside a good roster.
        setSnapshotError(null);
      } else {
        setSnapshotError({ groupId: currentGroupId, error: result.error });
      }
    }).catch(() => {
      // A rejected request would otherwise leave the panel awaiting forever
      // with nothing rendered and nothing explaining why.
      if (cancelled) return;
      setSnapshotError({ groupId: currentGroupId, error: "Could not load that group." });
    });

    return () => {
      cancelled = true;
    };
  }, [testMode.active, testMode.state.scenario, testMode.state.groupId]);

  // The server-sent profile is the source of truth. `optimisticProfile`
  // briefly overrides it between a saveProfile call and the router.refresh()
  // that re-fetches this page with the saved value -- avoiding a state/effect
  // sync loop by deriving rather than mirroring props into state.
  const baseProfile = useMemo(
    () => toUserProfile(props.displayName, props.avatar, props.translation),
    [props.displayName, props.translation, props.avatar],
  );
  const [optimisticProfile, setOptimisticProfile] = useState<UserProfile | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const profile = optimisticProfile ?? baseProfile;

  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const initialTab = sp.get("tab");
    if (initialTab === "leader" || sp.get("leader") === "1") {
      // URL bootstrap runs after hydration so the server-rendered default tab stays stable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("leader");
    } else if (initialTab && ["today", "connect", "rewards", "progress", "leader"].includes(initialTab)) {
      setTab(initialTab as Tab);
    }
  }, []);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [readingAssignment, setReadingAssignment] = useState<PlanEntry | null>(null);
  const [tick, setTick] = useState<TickState>({ kind: "idle" });
  const [pending, setPending] = useState(false);
  const [chooseGroupError, setChooseGroupError] = useState<string | null>(null);
  const choosingGroup = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  /**
   * Assignments whose sentinel already fired in this session (D5/D6). A ref, not
   * state: the sentinel re-enters the viewport on every scroll back down, and
   * this must be up to date within the same tick rather than after a render.
   */
  const firedAssignments = useRef<Set<number>>(new Set());
  /**
   * Which assignment the dialog is showing right now. A ref because an in-flight
   * check-in's `.then` closure would otherwise read a stale `readingAssignment`.
   */
  const openAssignment = useRef<PlanEntry | null>(null);

  const chapters = useMemo(() => {
    if (testMode.active) return simulatedChapters(testMode.state.completionPct);
    return Array.from(new Set(props.chapters));
  }, [testMode.active, testMode.state.completionPct, props.chapters]);
  const chaptersRead = completedAssignmentsCount(chapters);
  const coins = coinsFor(chaptersRead);
  const currentStreak = computeStreak(props.readingDates, today.todayLocal);

  const currentSnapshot =
    testMode.active &&
    testMode.state.scenario === "real" &&
    snapshot &&
    snapshot.groupId === testMode.state.groupId
      ? snapshot
      : null;

  // A group is being simulated but its snapshot hasn't arrived (still loading,
  // or the action errored). Falling back to props.* here would render the
  // reader's OWN group's members and stats under the selected group's name --
  // the wrong group, silently, in a tool whose whole value is trusting what you
  // see. Render an explicit empty state instead.
  const awaitingSnapshot =
    testMode.active &&
    testMode.state.scenario === "real" &&
    testMode.state.groupId !== null &&
    !currentSnapshot;

  const groupName = syntheticView
    ? syntheticView.groupName
    : currentSnapshot
      ? currentSnapshot.groupName
      : awaitingSnapshot
        ? null
        : (props.activeGroup?.groupName ?? null);
  const campusName = syntheticView
    ? syntheticView.campusName
    : currentSnapshot
      ? currentSnapshot.campusName
      : awaitingSnapshot
        ? null
        : props.campusName;

  const groupStats = useMemo((): GroupStats | null => {
    if (awaitingSnapshot) return null;
    const baseStats = syntheticView
      ? syntheticView.groupStats
      : currentSnapshot
        ? currentSnapshot.groupStats
        : props.groupStats;
    if (!testMode.active) return baseStats;
    const ratio = simulatedGroupRatio(testMode.state.groupPct);
    const memberCount = baseStats?.memberCount ?? 1;
    return {
      checkinCount: Math.round(ratio * memberCount),
      memberCount,
      ratio,
      readersTodayIds: baseStats?.readersTodayIds ?? [],
    };
  }, [testMode.active, testMode.state.groupPct, currentSnapshot, syntheticView, props.groupStats, awaitingSnapshot]);
  // One derivation of what the simulated role means, shared with the panel and
  // the tests (`scopeForRole`, components/test-mode/logic.ts), so the shell
  // never re-implements the role table inline.
  const simulatedScope = useMemo(
    () => scopeForRole(testMode.state.role, testMode.state.campus),
    [testMode.state.role, testMode.state.campus],
  );
  const setTestModeState = useCallback(
    (next: typeof testMode.state) => {
      const roleOrCampusChanged = next.role !== testMode.state.role || next.campus !== testMode.state.campus;
      testMode.setState(next);
      if (testMode.active && roleOrCampusChanged) {
        const params = new URLSearchParams(window.location.search);
        params.set("role", next.role);
        params.set("campus", TEST_MODE_CAMPUSES.find((campus) => campus.id === next.campus)?.code ?? "MNL");
        window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
        router.refresh();
      }
    },
    [router, testMode],
  );
  const isLeader = testMode.active ? simulatedScope.isLeader : props.isLeader;
  // While test mode is active, the simulated role is the SOLE authority for
  // admin scope -- the real signed-in user's own `props.isAdminScope` must not
  // leak through, or a real admin simulating "member"/"new"/"connect-leader"
  // would still see admin-only surfaces (the Leader tab, the test-mode entry
  // point, the profile editor's admin section) no matter which role they
  // picked. Issue #121.
  const isAdminScope = testMode.active
    ? simulatedScope.isAdminScope
    : (props.isAdminScope ?? false);
  const canSeeLeaderTab = isLeader || isAdminScope;
  // The nudge capability's group context. Test mode must resolve this the
  // same way it resolves `isLeader` just above -- against the SIMULATED role,
  // never `props.isLeader`/`props.activeGroup` (the real signed-in user) --
  // or a real leader simulating an unrelated role/group would still see a
  // member-nudge surface the server would reject anyway (#152 known-bad 5,
  // test-mode variant). `simulatedGroupId` is already null for a synthetic
  // scenario, since a fabricated roster has no real Rock person ids to nudge.
  const effectiveConnectGroupId = testMode.active ? simulatedGroupId : (props.activeGroup?.groupId ?? null);
  const viewerIsConnectMember = useMemo(() => {
    if (!effectiveConnectGroupId) return false;
    return props.memberships.some((m) => m.groupId === effectiveConnectGroupId) || isLeader;
  }, [effectiveConnectGroupId, props.memberships, isLeader]);
  const showReaderTabs = today.displayPhase !== "pre-launch" || canSeeLeaderTab;
  const activeTab =
    !showReaderTabs && tab !== "today" ? "today" : canSeeLeaderTab || tab !== "leader" ? tab : "today";

  const roster = useMemo(() => {
    if (awaitingSnapshot) return [];
    const baseRoster = syntheticView
      ? syntheticView.roster
      : currentSnapshot
        ? currentSnapshot.roster
        : props.roster;
    if (!testMode.active) return baseRoster;
    return baseRoster.map((member) => {
      const simulated = simulatedMemberHistory(member.personId, testMode.state.completionPct, today.todayLocal);
      return {
        ...member,
        readToday: testMode.state.completionPct > 0 && simulated.readingDates.includes(today.todayLocal),
        chapters: simulated.chapters,
        readingDates: simulated.readingDates,
      };
    });
  }, [testMode.active, currentSnapshot, syntheticView, props.roster, testMode.state.completionPct, today.todayLocal, awaitingSnapshot]);

  // Derived fresh from the current roster's own membership and reading facts,
  // never from groupStats.checkinCount -- a raw historical check-in count
  // includes rows from anyone ever attributed to this group, including a
  // person who has since become an upstream-only Regional/Cluster leader and
  // left it. Unlock only, never points or stage: those need PR #185's
  // Regional/Cluster/Department role resolution, which does not exist in
  // this app yet, and computing them here would misstate them (components/
  // connect-score.ts). Points and stage stay on their existing paths.
  const campfireUnlocked = useMemo(
    () => rosterUnlocks3dCampfire(effectiveConnectGroupId ?? 0, roster),
    [effectiveConnectGroupId, roster],
  );

  // `props.connectLeaders` is the signed-in reader's OWN Connect's real
  // upstream leaders, resolved server-side. It has no synthetic or
  // other-group equivalent, so it must be cleared whenever `roster` above
  // is sourced from something other than `props.roster` -- otherwise Test
  // Mode would show a simulated/other Connect's roster next to the real
  // leaders (by name, with real contributed points) of the group the
  // reader actually belongs to.
  const connectLeaders = useMemo(() => {
    if (syntheticView || currentSnapshot || awaitingSnapshot) return [];
    return props.connectLeaders ?? [];
  }, [syntheticView, currentSnapshot, awaitingSnapshot, props.connectLeaders]);

  const catchUpAssignment = useMemo(() => {
    const pastUnfinished = unfinishedAssignmentsUpTo(today.todayLocal, chapters);
    return pastUnfinished[0] ?? null;
  }, [chapters, today.todayLocal]);
  const catchUpChapter = catchUpAssignment ? (catchUpAssignment.chapters?.[0] ?? catchUpAssignment.chapter) : null;

  /**
   * What the dialog asks the scripture API for:
   * passageRef and keyPassageRef derived from the current assignment.
   */
  const readingPassage = useMemo(() => {
    const keyPassageRef = readingAssignment?.keyPassage ?? null;
    const passageRef = readingAssignment ? assignmentReference(readingAssignment) : "Matthew 1";
    return {
      keyPassageRef,
      passageRef,
    };
  }, [readingAssignment]);

  const readingMode: ReadingDialogMode =
    today.displayPhase === "pre-launch" ? "preview" : tick.kind === "ticked" || tick.kind === "retrying" ? "read" : "unread";

  /**
   * The one way into reading, and so the one way to a check-in (D1/D11).
   * Supports opening an assignment directly or looking it up by chapter number.
   */
  function openReading(target: PlanEntry | number) {
    const entry = typeof target === "number" ? planEntryForChapter(target) : target;
    if (!entry) return;
    openAssignment.current = entry;
    setReadingAssignment(entry);
    const alreadyRead = isAssignmentCompleted(entry, chapters);
    setTick(alreadyRead ? { kind: "ticked", group: null, simulated: blocked } : { kind: "idle" });
  }

  /**
   * Records a reading check-in for an assignment.
   * Checks in all chapters of the assignment (both chapters on two-chapter days).
   */
  function recordReading(entry: PlanEntry) {
    const alreadyRead = isAssignmentCompleted(entry, chapters);
    const alreadyFired = firedAssignments.current.has(entry.day);
    const simulate = !shouldWrite({
      alreadyRead,
      alreadyFired,
      writesBlocked: blocked,
      preview: today.displayPhase === "pre-launch",
    });

    if (simulate) {
      setTick((current) =>
        current.kind !== "idle"
          ? current
          : {
              kind: "ticked",
              group: blocked
                ? simulatedCheckInGroup({
                    ratio: simulatedGroupRatio(testMode.state.groupPct),
                    memberCount: groupStats?.memberCount ?? roster.length,
                  })
                : null,
              simulated: blocked,
            },
      );
      return;
    }

    firedAssignments.current.add(entry.day);
    setTick({ kind: "ticked", group: null, simulated: false });
    void runToastAction(
      "Saving your reading…",
      "Reading saved.",
      () =>
        checkInWithRetry(
          async () => {
            const chaptersToRecord = entry.chapters && entry.chapters.length > 0 ? entry.chapters : [entry.chapter];
            const results = await Promise.all(
              chaptersToRecord.map((chapter) => guardedCheckIn({ chapter, timezone: today.timezone })),
            );
            const firstFailure = results.find((r) => !r.ok);
            if (firstFailure) return firstFailure;
            const lastResult = results[results.length - 1];
            const lastGroup = lastResult && lastResult.ok ? lastResult.group : null;
            return { ok: true, group: lastGroup };
          },
          () => {
            if (openAssignment.current?.day === entry.day) setTick({ kind: "retrying" });
          },
        ),
    ).then((result) => {
      const stillOpen = openAssignment.current?.day === entry.day;
      if (result.ok) {
        router.refresh();
        if (stillOpen) setTick({ kind: "ticked", group: result.group, simulated: false });
      } else if (stillOpen) {
        setTick({ kind: "failed", error: result.error || "We couldn't save that just now." });
      }
    });
  }

  /**
   * Retry reading check-in for an assignment.
   */
  function retryReading(entry: PlanEntry) {
    firedAssignments.current.delete(entry.day);
    recordReading(entry);
  }

  function handleTranslationChange(translation: Translation) {
    void handleSaveProfile({ ...profile, translation });
  }

  async function handleSaveProfile(next: UserProfile) {
    setSavingProfile(true);
    setOptimisticProfile(next);
    try {
      window.localStorage.setItem("read-my-bible-profile-cache", JSON.stringify(next));
    } catch {
      /* Profile still works for this session without device storage. */
    }
    const { displayName, translation, ...avatar } = next;
    const result = await runToastAction("Saving your profile…", "Profile saved.", () =>
      guardedSaveProfile({ displayName, translation, avatar }),
    );
    setSavingProfile(false);
    setProfileOpen(false);
    if (result.ok) {
      setAvatarSaved(true);
      router.refresh();
    }
  }

  const handleChooseGroup: ChooseGroupHandler = async (groupId): Promise<ChooseGroupResult> => {
    if (choosingGroup.current) {
      return { ok: false, error: "A group change is already in progress. Please wait." };
    }

    choosingGroup.current = true;
    setChooseGroupError(null);
    setPending(true);
    try {
      const result = await runToastAction(
        "Saving your group…",
        "Group saved.",
        () => guardedChooseGroup({ groupId }),
        // Matches the catch branch below, so a thrown failure reads the same
        // in the toast and in the inline error.
        "We couldn't save that group. Please try again.",
      );
      if (result.ok) {
        router.refresh();
      } else {
        setChooseGroupError(result.error);
      }
      return result;
    } catch {
      const result = { ok: false as const, error: "We couldn't save that group. Please try again." };
      setChooseGroupError(result.error);
      return result;
    } finally {
      choosingGroup.current = false;
      setPending(false);
    }
  }

  async function handleJoinCode(code: string) {
    setJoinError(null);
    setPending(true);
    const result = await runToastAction("Joining group…", "You're in.", () => guardedJoinByCode({ code }));
    setPending(false);
    if (result.ok) {
      router.refresh();
    } else {
      setJoinError(result.error);
    }
    return result;
  }

  function selectTab(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentSnapshotError =
    testMode.active && snapshotError && snapshotError.groupId === testMode.state.groupId
      ? snapshotError.error
      : null;

  const connectSwitcher: ConnectSwitcherContext = {
    memberships: syntheticView?.memberships ?? props.memberships,
    activeGroup: syntheticView ? syntheticView.activeGroup : props.activeGroup,
    pending,
    onChooseGroup: handleChooseGroup,
  };

  const testModePanel = testMode.active ? (
    <TestModePanel
      state={testMode.state}
      onChange={setTestModeState}
      realActiveGroup={
        props.activeGroup
          ? { groupId: props.activeGroup.groupId, groupName: props.activeGroup.groupName }
          : null
      }
      campusGroups={props.campusGroups}
      campusGroupsPromise={props.campusGroupsPromise}
      writableGroupId={props.testWritableGroupId}
      loading={
        testMode.active &&
        testMode.state.scenario === "real" &&
        testMode.state.groupId !== null &&
        currentSnapshot === null &&
        currentSnapshotError === null
      }
      error={currentSnapshotError}
    />
  ) : null;

  if (testMode.active && !simulatedScope.hasGroup) {
    return (
      <NotificationProvider
        guardedSendNudge={guardedSendNudge}
        guardedDismissNotification={guardedDismissNotification}
        guardedDismissAllNotifications={guardedDismissAllNotifications}
        viewerIsConnectMember={viewerIsConnectMember}
        activeGroupId={effectiveConnectGroupId}
      >
        <div className="app-shell">
          <div className="paper-noise" />
          {testModePanel}
          <div className="top-right-chrome" data-testid="top-right-chrome">
            <NotificationInbox />
          </div>
          <NotificationToast />
          <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
        </div>
      </NotificationProvider>
    );
  }

  if (props.needsGroupChoice && !syntheticView) {
    return (
      <NotificationProvider
        guardedSendNudge={guardedSendNudge}
        guardedDismissNotification={guardedDismissNotification}
        guardedDismissAllNotifications={guardedDismissAllNotifications}
        viewerIsConnectMember={viewerIsConnectMember}
        activeGroupId={effectiveConnectGroupId}
      >
        <div className="app-shell">
          <div className="paper-noise" />
          {testModePanel}
          <div className="top-right-chrome" data-testid="top-right-chrome">
            <NotificationInbox />
          </div>
          <NotificationToast />
          <GroupPickerScreen memberships={props.memberships} pending={pending} error={chooseGroupError} onChoose={handleChooseGroup} />
        </div>
      </NotificationProvider>
    );
  }

  const effectiveHasGroup = syntheticView
    ? syntheticView.activeGroup !== null
    : testMode.active && testMode.state.groupId !== null
      ? true
      : !!props.activeGroup;

  // A viewer with admin scope (regional/cluster/department head, or an
  // ADMIN_PERSON_IDS admin) still reaches the full shell even with no
  // Connect Group of their own. Everyone else with no group is solo.
  if (!effectiveHasGroup && !isAdminScope) {
    return (
      <NotificationProvider
        guardedSendNudge={guardedSendNudge}
        guardedDismissNotification={guardedDismissNotification}
        guardedDismissAllNotifications={guardedDismissAllNotifications}
        viewerIsConnectMember={viewerIsConnectMember}
        activeGroupId={effectiveConnectGroupId}
      >
        <div className="app-shell">
          <div className="paper-noise" />
          {testModePanel}
          <div className="top-right-chrome" data-testid="top-right-chrome">
            <NotificationInbox />
          </div>
          <NotificationToast />
          <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
        </div>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider
      guardedSendNudge={guardedSendNudge}
      guardedDismissNotification={guardedDismissNotification}
      guardedDismissAllNotifications={guardedDismissAllNotifications}
      viewerIsConnectMember={viewerIsConnectMember}
      activeGroupId={effectiveConnectGroupId}
    >
      <div className="app-shell">
        {activeTab !== "leader" && <div className="paper-noise" />}
        {testModePanel}
        <div className="top-right-chrome" data-testid="top-right-chrome">
          <NotificationInbox />
        </div>
        <NotificationToast />
        <TestModeEntry visible={isAdminScope} />
      {activeTab === "today" && (
        <TodayScreen
          avatarCustomized={avatarSaved || props.avatarCustomized}
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          catchUpChapter={catchUpChapter}
          streakDays={currentStreak}
          groupName={groupName}
          groupStats={groupStats}
          roster={roster}
          unlocked3dCampfire={campfireUnlocked}
          profile={profile}
          onStart={openReading}
          onEditProfile={() => setProfileOpen(true)}
          connectSwitcher={connectSwitcher}
          onViewConnect={() => selectTab("connect")}
          onViewProgress={() => selectTab("progress")}
          allowPreLaunchNavigation={showReaderTabs}
        />
      )}
      {activeTab === "connect" && (
        <ConnectScreen
          groupName={groupName}
          campusName={campusName}
          roster={roster}
          unlocked3dCampfire={campfireUnlocked}
          groupStats={groupStats}
          profile={profile}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
          connectSwitcher={connectSwitcher}
          onViewReading={() => selectTab("today")}
          onViewPlan={() => selectTab("progress")}
          connectLeaders={connectLeaders}
        />
      )}
      {activeTab === "rewards" && (
        <RewardsScreen
          profile={profile}
          chapters={chaptersRead}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
          connectSwitcher={connectSwitcher}
        />
      )}
      {activeTab === "progress" && (
        <ProgressScreen
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          coins={coins}
          streakDays={currentStreak}
          groupName={groupName}
          campusBoard={props.campusBoard}
          profile={profile}
          onCatchUp={openReading}
          onEditProfile={() => setProfileOpen(true)}
          onTranslationChange={handleTranslationChange}
          connectSwitcher={connectSwitcher}
        />
      )}
      {activeTab === "leader" && (
        <LeaderScreen
          groupName={groupName}
          campusBoard={props.campusBoard}
          roster={roster}
          today={today}
          profile={profile}
          appBaseUrl={props.appBaseUrl}
          readerGroupId={testMode.active ? (syntheticView?.activeGroup?.groupId ?? simulatedGroupId) : (props.activeGroup?.groupId ?? null)}
          onGetOrCreateJoinCode={testMode.active ? testModeGetJoinCode : guardedGetOrCreateJoinCode}
          onEditProfile={() => setProfileOpen(true)}
          connectSwitcher={connectSwitcher}
          sectionSlot={testMode.active && !simulatedScope.isAdminScope ? null : props.sectionSlot}
          // Must follow the SAME group readerGroupId does. Leaving this on the
          // real group meant an admin with no Connect Group of their own could
          // pick a group in the panel and still hit LeaderScreen's no-group early
          // return -- no code tile at all, and the fetch never fired. That is
          // exactly the population the test-mode entry point is gated to.
          hasGroupView={testMode.active ? (syntheticView ? syntheticView.activeGroup !== null : simulatedGroupId !== null) : !!props.activeGroup}
        />
      )}
      <BottomNav
        tab={activeTab}
        onSelect={selectTab}
        showLeaderTab={canSeeLeaderTab}
        showReaderTabs={showReaderTabs}
      />
      {readingAssignment !== null && (
        <ReadingDialog
          key={readingAssignment.day}
          chapter={readingAssignment.chapters?.[0] ?? readingAssignment.chapter}
          chapters={readingAssignment.chapters ?? [readingAssignment.chapter]}
          assignmentTitle={readingAssignment.title}
          passageRef={readingPassage.passageRef}
          keyPassageRef={readingPassage.keyPassageRef}
          translation={profile.translation}
          mode={readingMode}
          isCatchUp={readingAssignment.date < today.todayLocal}
          chaptersRead={chaptersRead}
          groupName={groupName}
          group={tick.kind === "ticked" ? tick.group : null}
          tick={tick}
          onReachBottom={() => recordReading(readingAssignment)}
          onRetry={() => retryReading(readingAssignment)}
          onTranslationChange={handleTranslationChange}
          onClose={() => {
            openAssignment.current = null;
            setReadingAssignment(null);
            setTick({ kind: "idle" });
          }}
        />
      )}
      {profileOpen && (
        <ProfileEditor
          profile={profile}
          saving={savingProfile}
          onClose={() => setProfileOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
    </NotificationProvider>
  );
}
