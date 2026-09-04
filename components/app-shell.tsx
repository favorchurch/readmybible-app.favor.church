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
  const today = useToday(props.devMockToday);

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

  const chapters = useMemo(() => Array.from(new Set(props.chapters)), [props.chapters]);
  const chaptersRead = chapters.length;
  const coins = coinsFor(chaptersRead);
  const currentStreak = computeStreak(props.readingDates, today.todayLocal);
  const groupName = props.activeGroup?.groupName ?? null;

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

  async function finishReading() {
    if (flowChapter === null) return;
    setPending(true);
    setCheckInError(null);
    const result = await checkIn({ chapter: flowChapter, timezone: today.timezone });
    setPending(false);
    if (result.ok) {
      setFlowGroupResult(result.group);
      setFlowStep(2);
      router.refresh();
    } else {
      setCheckInError("Something went wrong on our side. Try again in a bit.");
    }
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
    const result = await saveProfile({ displayName, translation, avatar });
    setSavingProfile(false);
    setProfileOpen(false);
    if (result.ok) router.refresh();
  }

  async function handleChooseGroup(groupId: number) {
    setPending(true);
    await chooseGroup({ groupId });
    setPending(false);
    router.refresh();
  }

  async function handleJoinCode(code: string) {
    setJoinError(null);
    setPending(true);
    const result = await joinByCode({ code });
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
      {tab === "today" && (
        <TodayScreen
          today={today}
          chapters={chapters}
          chaptersRead={chaptersRead}
          catchUpChapter={catchUpChapter}
          streakDays={currentStreak}
          groupName={groupName}
          groupStats={props.groupStats}
          roster={props.roster}
          profile={profile}
          onStart={startReading}
          onEditProfile={() => setProfileOpen(true)}
          onViewConnect={() => selectTab("connect")}
          onViewProgress={() => selectTab("progress")}
        />
      )}
      {tab === "connect" && (
        <ConnectScreen
          groupName={groupName}
          campusName={props.campusName}
          isLeader={props.isLeader}
          roster={props.roster}
          groupStats={props.groupStats}
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
