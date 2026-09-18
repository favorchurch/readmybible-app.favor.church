"use client";

import { useMemo, useState } from "react";

import { Avatar, type UserProfile } from "@/components/avatar";
import { FullHome } from "@/components/full-home";
import { homeStages, RotatableHome, stageIndex } from "@/components/rotatable-home";
import { ProgressBar } from "@/components/progress-bar";
import type { ConnectLeaderView, RosterMemberView } from "@/components/app-shell";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import { Header } from "@/components/screens/header";
import { HomeGrowthSheet } from "@/components/home-growth-sheet";
import { ReadingVisibilityNote } from "@/components/reading-visibility-note";
import { StageMini } from "@/components/stage-mini";
import { MemberStreakDots } from "@/components/member-streak-dots";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import type { TodayState } from "@/components/use-today";
import { coinsFor, nextStageMilestone, nextStageProgress, stageFor } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";

export function ConnectScreen({
  groupName,
  campusName,
  roster,
  groupStats,
  unlocked3dCampfire,
  profile,
  onEditProfile,
  today,
  connectSwitcher,
  onViewReading,
  onViewPlan,
  connectLeaders = [],
}: {
  groupName: string | null;
  campusName: string | null;
  roster: RosterMemberView[];
  groupStats: GroupStats | null;
  // Required, not optional: an omitted prop here must fail the type check
  // (caught by the build gate) instead of silently reverting to FullHome's
  // groupCheckinCount fallback -- the exact squash-merge revert shape this
  // repo has already been bitten by.
  unlocked3dCampfire: boolean;
  profile: UserProfile;
  onEditProfile: () => void;
  today: TodayState;
  connectSwitcher?: ConnectSwitcherContext;
  onViewReading?: () => void;
  onViewPlan?: () => void;
  connectLeaders?: ConnectLeaderView[];
}) {
  const phase = today.displayPhase;

  const ratio = groupStats?.ratio ?? 0;
  const stage = stageFor(ratio);
  const selectedStage = stageIndex(stage);
  const nextStage = nextStageProgress(ratio);
  const groupCoins = coinsFor(groupStats?.checkinCount ?? 0);
  const readersToday = groupStats?.readersTodayIds.length ?? 0;
  const memberCount = groupStats?.memberCount ?? roster.length;
  const sorted = useMemo(() => [...roster].sort((a, b) => Number(b.readToday) - Number(a.readToday)), [roster]);

  const [growthSheetOpen, setGrowthSheetOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RosterMemberView | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);

  return (
    <main className="screen connect-screen frame">
      <Header heading={groupName ?? "Connect"} profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
      <section className="connect-title">
        <h1>{groupName ?? "Your Connect Group"}</h1>
        <p>
          {campusName ?? "Favor Church"} · {memberCount} members
        </p>
      </section>

      <section className="big-home-card">
        <RotatableHome stage={selectedStage} completed={false} />
        <div className="big-home-side">
          <div className="big-home-info">
            <div>
              <p className="eyebrow">CURRENT HOME</p>
              <h2 className="stage-name-row">
                {stage}
                <StageMini name={stage} size={53} className="stage-name-mini" />
              </h2>
              <span className="home-note">{homeStages[selectedStage].note}</span>
            </div>
            <div className="coin-chip">◉ {groupCoins}</div>
          </div>
          <ProgressBar value={nextStage?.pct ?? 100} max={100} />
          <div className="upgrade-copy">
            <div className="upgrade-copy-text">
              <strong>{nextStage ? `${nextStage.pct}% to ${nextStage.stage}` : "All stages reached"}</strong>
              <span>Next group upgrade</span>
            </div>
            {nextStage && <StageMini name={nextStage.stage} size={38} className="upgrade-copy-mini" />}
          </div>
          <div className="home-growth-action">
            <button className="primary-button open-home-button" onClick={() => setHomeOpen(true)} aria-haspopup="dialog">Open Home <span aria-hidden="true">↗</span></button>
            <button
              type="button"
              className="home-growth-trigger secondary-link"
              data-section="home-growth-trigger"
              data-trigger="home-growth-sheet"
              aria-haspopup="dialog"
              onClick={() => setGrowthSheetOpen(true)}
            >
              How your home grows
            </button>
          </div>
        </div>
      </section>

      <section className="member-section" data-section="roster">
        <div className="roster-header">
          <div className="section-heading">
            {phase === "pre-launch" && (
              <div>
                <h2>Reading together</h2>
                <p className="roster-sub">{memberCount} members</p>
              </div>
            )}
            {phase === "active" && (
              <>
                <div>
                  <p className="eyebrow">WHO&apos;S READ TODAY</p>
                  <h2>{readersToday} of {memberCount} have read</h2>
                </div>
                <div className="status-key">
                  <i /> Read
                </div>
              </>
            )}
            {phase === "review" && (
              <div>
                <h2>Finishing Matthew together</h2>
                <p className="roster-sub">{Math.round(ratio * 100)}% of Matthew completed · {memberCount} members</p>
              </div>
            )}
          </div>

          <button
            type="button"
            className="privacy-note-trigger"
            data-section="reading-visibility-trigger"
            data-trigger="reading-visibility"
            aria-haspopup="dialog"
            onClick={() => setVisibilityOpen(true)}
          >
            Who can see this?
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="gentle-note">Nobody yet. Be the first one today.</p>
        ) : (
          <div className="member-grid">
            {sorted.map((m) => {
              const avatar = m.isSelf ? profile : m.avatar;

              if (phase === "pre-launch" || phase === "review") {
                return (
                  <button
                    type="button"
                    className="member-card"
                    key={m.personId}
                    onClick={() => {
                      setSelectedMember(m);
                      setProfileSheetOpen(true);
                    }}
                    aria-haspopup="dialog"
                    aria-label={`View ${m.name}'s profile`}
                    title={m.name}
                  >
                    <div className="member-avatar">
                      <MemberStreakDots dates={m.readingDates ?? []} todayLocal={today.todayLocal} />
                      <Avatar color="coral" {...avatar} />
                    </div>
                    <strong>{m.name}</strong>
                    {m.isUpstreamLeader && <span className="member-leader-marker">Leader</span>}
                    {m.contributedPoints !== undefined && (
                      <span className="member-points-note">Contributed {m.contributedPoints} points</span>
                    )}
                  </button>
                );
              }

              // Active phase: check glyph + word Read for read state; waiting state at readable contrast without grayscale
              return (
                <button
                  type="button"
                  className={`member-card ${m.readToday ? "read" : "waiting"}`}
                  key={m.personId}
                  onClick={() => {
                    setSelectedMember(m);
                    setProfileSheetOpen(true);
                  }}
                  aria-haspopup="dialog"
                  aria-label={`View ${m.name}'s profile: ${m.readToday ? "Read" : "Waiting"}`}
                  title={m.name}
                >
                  <div className="member-avatar">
                    <MemberStreakDots dates={m.readingDates ?? []} todayLocal={today.todayLocal} />
                    <Avatar color="coral" {...avatar} />
                    {m.readToday && <b>✓</b>}
                  </div>
                  <strong>{m.name}</strong>
                  {m.isUpstreamLeader && <span className="member-leader-marker">Leader</span>}
                  <span>{m.readToday ? "Read" : "Waiting"}</span>
                  {m.contributedPoints !== undefined && (
                    <span className="member-points-note">Contributed {m.contributedPoints} points</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p className="gentle-note">We cheer for groups, not against people.</p>
      </section>

      {connectLeaders.length > 0 && (
        <section className="member-section" data-section="connect-leaders">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEADERS</p>
              <h2>Leaders over this Connect</h2>
            </div>
          </div>
          <div className="member-grid">
            {connectLeaders.map((leader) => (
              <div className="member-card leader-card" key={leader.personId} title={leader.name}>
                <strong>{leader.name}</strong>
                <span className="member-leader-marker">Leader</span>
                <span className="member-points-note">Contributed {Math.round(leader.contributedPoints)} points</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <HomeGrowthSheet
        open={growthSheetOpen}
        onClose={() => setGrowthSheetOpen(false)}
        currentStage={stage}
      />
      {homeOpen && <FullHome
        onClose={() => setHomeOpen(false)}
        groupName={groupName ?? "Your Connect Group"}
        coins={groupCoins}
        groupCheckinCount={groupStats?.checkinCount ?? null}
        stage={selectedStage}
        progress={nextStage}
        milestone={nextStageMilestone(ratio)}
        overallPct={Math.round(ratio * 100)}
        today={today}
        roster={roster}
        unlocked3dCampfire={unlocked3dCampfire}
        profile={profile}
        selectedMemberId={selectedMember?.personId ?? null}
        onSelectMember={member => { setSelectedMember(member); setProfileSheetOpen(true); }}
        onViewReading={onViewReading}
        onViewPlan={onViewPlan}
      />}
      <ReadingVisibilityNote
        open={visibilityOpen}
        onClose={() => setVisibilityOpen(false)}
      />
      <MemberProfileSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        member={selectedMember}
        todayLocal={today.todayLocal}
      />
    </main>
  );
}
