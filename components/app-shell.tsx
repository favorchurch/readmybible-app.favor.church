"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { checkIn, type CheckInGroupState } from "@/app/actions/checkIn";
import { chooseGroup } from "@/app/actions/chooseGroup";
import { getOrCreateJoinCode } from "@/app/actions/getOrCreateJoinCode";
import { getTestGroupSnapshot } from "@/app/actions/getTestGroupSnapshot";
import { joinByCode } from "@/app/actions/joinByCode";
import { saveProfile } from "@/app/actions/saveProfile";
import {
  defaultAvatarConfig,
  type AvatarConfig,
  type Translation,
  type UserProfile,
} from "@/components/avatar";
import { CompletionFlow } from "@/components/completion-flow";
import { ProfileEditor } from "@/components/profile-editor";
import {
  TestModePanel,
  guardWrite,
  simulatedChapters,
  simulatedGroupRatio,
  simulatedMemberHistory,
  simulatedTodayState,
  useTestMode,
  dateForSimulatedDay,
  writesBlocked,
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
import { coinsFor, streak as computeStreak, TOTAL_CHAPTERS } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupMembership } from "@/lib/session";

export type RosterMemberView = {
  personId: number;
  avatar: AvatarConfig;
  isSelf: boolean;
  name: string;
  isLeader: boolean;
  readToday: boolean;
  chapters: number[];
  readingDates: string[];
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
  testWritableGroupId: number | null;
};

function toUserProfile(displayName: string, avatar: AvatarConfig, translation: Translation): UserProfile {
  return { ...defaultAvatarConfig, ...avatar, displayName, translation };
}

export function AppShell(props: AppShellProps) {
  const router = useRouter();
  const realToday = useToday(props.devMockToday);
  const testMode = useTestMode();
  const simulatedToday = useMemo(
    () => simulatedTodayState(dateForSimulatedDay(testMode.state.day, testMode.state.phase), realToday.timezone),
    [testMode.state.day, testMode.state.phase, realToday.timezone],
  );
  const today = testMode.active ? simulatedToday : realToday;
  const blocked = useMemo(
    () =>
      writesBlocked(
        testMode.active,
        testMode.state.groupId,
        props.activeGroup?.groupId ?? null,
        props.testWritableGroupId,
      ),
    [testMode.active, testMode.state.groupId, props.activeGroup?.groupId, props.testWritableGroupId],
  );
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

  const [snapshot, setSnapshot] = useState<{
    groupId: number;
    groupName: string;
    campusName: string | null;
    roster: RosterMemberView[];
    groupStats: GroupStats;
  } | null>(null);
  const [snapshotError, setSnapshotError] = useState<{ groupId: number; error: string } | null>(null);

  useEffect(() => {
    if (!testMode.active || testMode.state.groupId === null) {
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
  }, [testMode.active, testMode.state.groupId]);

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [flowChapter, setFlowChapter] = useState<number | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [flowGroupResult, setFlowGroupResult] = useState<CheckInGroupState | null>(null);

  const chapters = useMemo(() => {
    if (testMode.active) return simulatedChapters(testMode.state.completionPct);
    return Array.from(new Set(props.chapters));
  }, [testMode.active, testMode.state.completionPct, props.chapters]);
  const chaptersRead = chapters.length;
  const coins = coinsFor(chaptersRead);
  const currentStreak = computeStreak(props.readingDates, today.todayLocal);

  const currentSnapshot =
    testMode.active && snapshot && snapshot.groupId === testMode.state.groupId ? snapshot : null;

  // A group is being simulated but its snapshot hasn't arrived (still loading,
  // or the action errored). Falling back to props.* here would render the
  // reader's OWN group's members and stats under the selected group's name --
  // the wrong group, silently, in a tool whose whole value is trusting what you
  // see. Render an explicit empty state instead.
  const awaitingSnapshot = testMode.active && testMode.state.groupId !== null && !currentSnapshot;

  const groupName = currentSnapshot
    ? currentSnapshot.groupName
    : awaitingSnapshot
      ? null
      : (props.activeGroup?.groupName ?? null);
  const campusName = currentSnapshot
    ? currentSnapshot.campusName
    : awaitingSnapshot
      ? null
      : props.campusName;

  const groupStats = useMemo((): GroupStats | null => {
    if (awaitingSnapshot) return null;
    const baseStats = currentSnapshot ? currentSnapshot.groupStats : props.groupStats;
    if (!testMode.active) return baseStats;
    const ratio = simulatedGroupRatio(testMode.state.groupPct);
    const memberCount = baseStats?.memberCount ?? 1;
    return {
      checkinCount: Math.round(ratio * memberCount),
      memberCount,
      ratio,
      readersTodayIds: baseStats?.readersTodayIds ?? [],
    };
  }, [testMode.active, testMode.state.groupPct, currentSnapshot, props.groupStats, awaitingSnapshot]);
  const isLeader = testMode.active ? testMode.state.viewer === "leader" : props.isLeader;
  const activeTab = isLeader || tab !== "leader" ? tab : "today";

  const roster = useMemo(() => {
    if (awaitingSnapshot) return [];
    const baseRoster = currentSnapshot ? currentSnapshot.roster : props.roster;
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
  }, [testMode.active, currentSnapshot, props.roster, testMode.state.completionPct, today.todayLocal, awaitingSnapshot]);

  const catchUpChapter = useMemo(() => {
    const ceiling = today.entry ? today.entry.chapter - 1 : Math.min(today.dayLabel, TOTAL_CHAPTERS);
    for (let chapter = ceiling; chapter >= 1; chapter -= 1) {
      if (!chapters.includes(chapter)) return chapter;
    }
    return null;
  }, [chapters, today]);

  function startReading(chapter: number) {
    setCheckInError(null);
    setFlowChapter(chapter);
    setFlowStep(1);
  }

  function replayCelebration(chapter: number) {
    setFlowChapter(chapter);
    setFlowGroupResult(null);
    setFlowStep(2);
  }

  async function finishReading() {
    if (flowChapter === null) return;
    setPending(true);
    setCheckInError(null);
    const result = await guardedCheckIn({ chapter: flowChapter, timezone: today.timezone });
    setPending(false);
    if (result.ok) {
      setFlowGroupResult(result.group);
      setFlowStep(2);
      router.refresh();
    } else {
      setCheckInError(result.error || "Something went wrong on our side. Try again in a bit.");
    }
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
    const result = await guardedSaveProfile({ displayName, translation, avatar });
    setSavingProfile(false);
    setProfileOpen(false);
    if (result.ok) {
      setAvatarSaved(true);
      router.refresh();
    }
  }

  async function handleChooseGroup(groupId: number) {
    setPending(true);
    await guardedChooseGroup({ groupId });
    setPending(false);
    router.refresh();
  }

  async function handleJoinCode(code: string) {
    setJoinError(null);
    setPending(true);
    const result = await guardedJoinByCode({ code });
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

  const testModePanel = testMode.active ? (
    <TestModePanel
      state={testMode.state}
      onChange={testMode.setState}
      realActiveGroup={
        props.activeGroup
          ? { groupId: props.activeGroup.groupId, groupName: props.activeGroup.groupName }
          : null
      }
      campusGroups={props.campusGroups}
      writableGroupId={props.testWritableGroupId}
      error={currentSnapshotError}
    />
  ) : null;

  if (testMode.active && testMode.state.viewer === "non-member") {
    return (
      <div className="app-shell">
        <div className="paper-noise" />
        {testModePanel}
        <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
      </div>
    );
  }

  if (props.needsGroupChoice) {
    return (
      <div className="app-shell">
        <div className="paper-noise" />
        {testModePanel}
        <GroupPickerScreen memberships={props.memberships} pending={pending} onChoose={handleChooseGroup} />
      </div>
    );
  }

  const effectiveHasGroup =
    testMode.active && testMode.state.groupId !== null ? true : !!props.activeGroup;

  if (!effectiveHasGroup) {
    return (
      <div className="app-shell">
        <div className="paper-noise" />
        {testModePanel}
        <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {activeTab !== "leader" && <div className="paper-noise" />}
      {testModePanel}
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
          profile={profile}
          onStart={startReading}
          onReplayCelebration={replayCelebration}
          onEditProfile={() => setProfileOpen(true)}
          onViewConnect={() => selectTab("connect")}
          onViewProgress={() => selectTab("progress")}
          onTranslationChange={handleTranslationChange}
        />
      )}
      {activeTab === "connect" && (
        <ConnectScreen
          groupName={groupName}
          campusName={campusName}
          roster={roster}
          groupStats={groupStats}
          profile={profile}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
        />
      )}
      {activeTab === "rewards" && (
        <RewardsScreen
          profile={profile}
          chapters={chaptersRead}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
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
          onCatchUp={startReading}
          onEditProfile={() => setProfileOpen(true)}
          onTranslationChange={handleTranslationChange}
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
          readerGroupId={props.activeGroup?.groupId ?? null}
          onGetOrCreateJoinCode={guardedGetOrCreateJoinCode}
          onEditProfile={() => setProfileOpen(true)}
        />
      )}
      <BottomNav tab={activeTab} onSelect={selectTab} isLeader={isLeader} />
      {flowChapter !== null && (
        <CompletionFlow
          step={flowStep}
          chapter={flowChapter}
          isCatchUp={flowChapter !== today.entry?.chapter}
          chaptersRead={chaptersRead}
          groupName={groupName}
          group={flowGroupResult}
          error={checkInError}
          pending={pending}
          onClose={() => {
            setFlowStep(0);
            setFlowChapter(null);
            setCheckInError(null);
            setFlowGroupResult(null);
          }}
          onComplete={finishReading}
        />
      )}
      {profileOpen && (
        <ProfileEditor profile={profile} saving={savingProfile} onClose={() => setProfileOpen(false)} onSave={handleSaveProfile} />
      )}
      {pending && <span className="sr-only" role="status">Saving…</span>}
    </div>
  );
}
