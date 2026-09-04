"use client";

import { useEffect, useMemo, useState } from "react";

import { getOrCreateJoinCode } from "@/app/actions/getOrCreateJoinCode";
import { Avatar, avatarSeedFor, type UserProfile } from "@/components/avatar";
import { homeStages, RotatableHome, stageIndex } from "@/components/rotatable-home";
import { ProgressBar } from "@/components/progress-bar";
import type { RosterMemberView } from "@/components/app-shell";
import { Header } from "@/components/screens/header";
import { HomeGrowthSheet } from "@/components/home-growth-sheet";
import { ReadingVisibilityNote } from "@/components/reading-visibility-note";
import { StageMini } from "@/components/stage-mini";
import { MemberProfileSheet } from "@/components/member-profile-sheet";
import type { TodayState } from "@/components/use-today";
import { coinsFor, nextStageProgress, stageFor } from "@/lib/game";
import type { GroupStats } from "@/lib/data/stats";

export function ConnectScreen({
  groupName,
  campusName,
  isLeader,
  roster,
  groupStats,
  appBaseUrl,
  profile,
  onEditProfile,
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

  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [growthSheetOpen, setGrowthSheetOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RosterMemberView | null>(null);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    if (!isLeader) return;
    let cancelled = false;
    getOrCreateJoinCode().then((result) => {
      if (cancelled) return;
      if (result.ok) setJoinCode(result.code);
      else setCodeError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [isLeader]);

  useEffect(() => {
    if (!joinCode) return;
    // APP_BASE_URL is empty on some preview deploys -- fall back to the
    // browser's own origin so the QR/join link still resolves.
    const baseUrl = appBaseUrl || window.location.origin;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(`${baseUrl}/join/${joinCode}`).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [joinCode, appBaseUrl]);

  const stillReading = roster.filter((m) => !m.readToday);

  return (
    <main className={`screen connect-screen frame ${isLeader ? "frame--rail" : ""}`}>
      <Header heading={groupName ?? "Connect"} profile={profile} onEditProfile={onEditProfile} />
      <section className={`connect-title ${isLeader ? "frame__span" : ""}`}>
        <h1>{groupName}</h1>
        <p>
          {campusName ?? "Favor Church"} · {memberCount} members
        </p>
      </section>

      <div className="frame__main">
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
                  <h2>Reading together this October</h2>
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
                const seed = avatarSeedFor(m.personId);

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
                        <Avatar color={seed.color} skin={seed.skin} hair={seed.hair} />
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
                      <Avatar color={seed.color} skin={seed.skin} hair={seed.hair} />
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
      </div>

      {isLeader && (
        <aside className="leader-tools frame__rail" data-section="leader-tools">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEADER TOOLS</p>
              <h2>Bring someone in</h2>
            </div>
          </div>
          <p>
            {phase === "pre-launch"
              ? "Share this before October 1."
              : "Show this code or QR to anyone in the room who isn't in a Connect Group yet. They enter it in the app and they're in."}
          </p>
          <div className="leader-code-row">
            <div className="leader-code">
              <span className="eyebrow">GROUP CODE</span>
              <strong>{joinCode ?? (codeError ? "----" : "Loading…")}</strong>
            </div>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR code to join ${groupName}`} width={96} height={96} />
            )}
          </div>
          {codeError && <p className="error-note">{codeError}</p>}
          {phase === "active" && stillReading.length > 0 && (
            <div className="leader-nudge">
              <p className="eyebrow">STILL READING</p>
              <span>{stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.</span>
            </div>
          )}
          <a
            className="secondary-link connect-portal-link"
            href="https://connect.favor.church"
            target="_blank"
            rel="noopener noreferrer"
          >
            Manage your group on connect.favor.church
          </a>
        </aside>
      )}

      <HomeGrowthSheet
        open={growthSheetOpen}
        onClose={() => setGrowthSheetOpen(false)}
        currentStage={stage}
      />
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
