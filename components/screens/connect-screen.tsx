"use client";

import { useState } from "react";

import { Avatar, type UserProfile } from "@/components/avatar";
import { FullHome } from "@/components/full-home";
import { homeStages, RotatableHome, stageIndex } from "@/components/rotatable-home";
import { ProgressBar } from "@/components/progress-bar";
import type { RosterMemberView } from "@/components/app-shell";
import { Header } from "@/components/screens/header";
import { HomeGrowthSheet } from "@/components/home-growth-sheet";
import { ReadingVisibilityNote } from "@/components/reading-visibility-note";
import { MemberStreakDots } from "@/components/member-streak-dots";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import type { TodayState } from "@/components/use-today";
import { coinsFor, nextStageProgress, stageFor } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";
import { useMemo } from "react";

export function ConnectScreen({
  groupName,
  campusName,
  isLeader,
  roster,
  groupStats,
  appBaseUrl,
  profile,
  onEditProfile,
  onGetOrCreateJoinCode,
  today,
}: {
  groupName: string | null;
  campusName: string | null;
  isLeader: boolean;
  roster: RosterMemberView[];
  groupStats: GroupStats | null;
  appBaseUrl: string;
  profile: UserProfile;
  onEditProfile: () => void;
  onGetOrCreateJoinCode: () => Promise<{ ok: true; code: string } | { ok: false; error: string }>;
  today: TodayState;
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
    <main className="screen connect-screen">
      <Header heading={groupName ?? "Connect"} profile={profile} onEditProfile={onEditProfile} />
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="stage-name-mini" aria-hidden="true" />
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
            {phase === "grace" && (
              <div>
                <h2>Finishing Matthew together</h2>
                <p className="roster-sub">{Math.round(ratio * 100)}% of Matthew completed · {memberCount} members</p>
              </div>
            )}
            {phase === "closed" && (
              <div>
                <h2>Matthew, finished together</h2>
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

              if (phase === "pre-launch" || phase === "grace" || phase === "closed") {
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
                  <span>{m.readToday ? "Read" : "Waiting"}</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="gentle-note">We cheer for groups, not against people.</p>
      </section>

      <HomeGrowthSheet
        open={growthSheetOpen}
        onClose={() => setGrowthSheetOpen(false)}
        currentStage={stage}
      />
      {homeOpen && <FullHome onClose={() => setHomeOpen(false)} groupName={groupName ?? "Your Connect Group"} coins={groupCoins} stage={selectedStage} progress={nextStage} chapter={today.entry?.chapter ?? null} roster={roster} profile={profile} />}
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
