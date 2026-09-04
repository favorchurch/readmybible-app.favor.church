"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { checkIn, type CheckInGroupState } from "@/app/actions/checkIn";
import { chooseGroup } from "@/app/actions/chooseGroup";
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
} from "@/components/test-mode";
import { useToday } from "@/components/use-today";
import { BottomNav, type Tab } from "@/components/screens/bottom-nav";
import { ConnectScreen } from "@/components/screens/connect-screen";
import { GroupPickerScreen } from "@/components/screens/group-picker-screen";
import { ProgressScreen } from "@/components/screens/progress-screen";
import { RewardsScreen } from "@/components/screens/rewards-screen";
import { SoloScreen } from "@/components/screens/solo-screen";
import { TodayScreen } from "@/components/screens/today-screen";
import { coinsFor, streak as computeStreak, TOTAL_CHAPTERS } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";
import type { GroupMembership } from "@/lib/session";

export type RosterMemberView = {
  personId: number;
  name: string;
  isLeader: boolean;
  readToday: boolean;
  chapters: number[];
  readingDates: string[];
};

export type AppShellProps = {
  displayName: string;
  avatar: AvatarConfig;
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
  const guardedCheckIn = useMemo(() => guardWrite(testMode.active, checkIn), [testMode.active]);
  const guardedSaveProfile = useMemo(() => guardWrite(testMode.active, saveProfile), [testMode.active]);
  const guardedChooseGroup = useMemo(() => guardWrite(testMode.active, chooseGroup), [testMode.active]);
  const guardedJoinByCode = useMemo(() => guardWrite(testMode.active, joinByCode), [testMode.active]);

  // The server-sent profile is the source of truth. `optimisticProfile`
  // briefly overrides it between a saveProfile call and the router.refresh()
  // that re-fetches this page with the saved value -- avoiding a state/effect
  // sync loop by deriving rather than mirroring props into state.
  const baseProfile = useMemo(
    () => toUserProfile(props.displayName, props.avatar, props.translation),
    [props.displayName, props.translation, props.avatar],
  );
  const [optimisticProfile, setOptimisticProfile] = useState<UserProfile | null>(null);
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
  const groupName = props.activeGroup?.groupName ?? null;

  const groupStats = useMemo((): GroupStats | null => {
    if (!testMode.active) return props.groupStats;
    const ratio = simulatedGroupRatio(testMode.state.groupPct);
    const memberCount = props.groupStats?.memberCount ?? 1;
    return {
      checkinCount: Math.round(ratio * memberCount),
      memberCount,
      ratio,
      readersTodayIds: props.groupStats?.readersTodayIds ?? [],
    };
  }, [testMode.active, testMode.state.groupPct, props.groupStats]);
  const isLeader = testMode.active ? testMode.state.role === "leader" : props.isLeader;

  const roster = useMemo(() => {
    if (!testMode.active) return props.roster;
    return props.roster.map((m) => {
      const simulated = simulatedMemberHistory(m.personId, testMode.state.completionPct, today.todayLocal);
      return {
        ...m,
        readToday: testMode.state.completionPct > 0 && simulated.readingDates.includes(today.todayLocal),
        chapters: simulated.chapters,
        readingDates: simulated.readingDates,
      };
    });
  }, [testMode.active, props.roster, testMode.state.completionPct, today.todayLocal]);

  const catchUpChapter = useMemo(() => {
    const ceiling = today.entry ? today.entry.chapter - 1 : Math.min(today.dayLabel, TOTAL_CHAPTERS);
    for (let chapter = ceiling; chapter >= 1; chapter -= 1) {
      if (!chapters.includes(chapter)) return chapter;
    }
    return null;
  }, [chapters, today]);

  function startReading(chapter: number) {
    if (testMode.active) return;
    setCheckInError(null);
    setFlowChapter(chapter);
    setFlowStep(1);
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
      setCheckInError("Something went wrong on our side. Try again in a bit.");
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
    if (result.ok) router.refresh();
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

  if (props.needsGroupChoice) {
    return (
      <GroupPickerScreen memberships={props.memberships} pending={pending} onChoose={handleChooseGroup} />
    );
  }

  if (!props.activeGroup) {
    return (
      <div className="app-shell">
        <div className="paper-noise" />
        <SoloScreen error={joinError} pending={pending} onJoin={handleJoinCode} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="paper-noise" />
      {testMode.active && <TestModePanel state={testMode.state} onChange={testMode.setState} />}
      {tab === "today" && (
        <TodayScreen
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
          onEditProfile={() => setProfileOpen(true)}
          onViewConnect={() => selectTab("connect")}
          onViewProgress={() => selectTab("progress")}
          onTranslationChange={handleTranslationChange}
        />
      )}
      {tab === "connect" && (
        <ConnectScreen
          groupName={groupName}
          campusName={props.campusName}
          isLeader={isLeader}
          roster={roster}
          groupStats={groupStats}
          appBaseUrl={props.appBaseUrl}
          profile={profile}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
        />
      )}
      {tab === "rewards" && (
        <RewardsScreen
          profile={profile}
          chapters={chaptersRead}
          onEditProfile={() => setProfileOpen(true)}
          today={today}
        />
      )}
      {tab === "progress" && (
        <ProgressScreen
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          coins={coins}
          streakDays={currentStreak}
          groupName={groupName}
          campusName={props.campusName}
          campusBoard={props.campusBoard}
          profile={profile}
          onCatchUp={startReading}
          onEditProfile={() => setProfileOpen(true)}
          onTranslationChange={handleTranslationChange}
        />
      )}
      <BottomNav tab={tab} onSelect={selectTab} />
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
