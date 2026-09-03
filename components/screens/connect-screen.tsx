"use client";

import { useEffect, useMemo, useState } from "react";

import { getOrCreateJoinCode } from "@/app/actions/getOrCreateJoinCode";
import { Avatar, avatarSeedFor, type UserProfile } from "@/components/avatar";
import { homeStages, RotatableHome, stageIndex } from "@/components/rotatable-home";
import { ProgressBar } from "@/components/progress-bar";
import type { RosterMemberView } from "@/components/app-shell";
import { Header } from "@/components/screens/header";
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
}: {
  groupName: string | null;
  campusName: string | null;
  isLeader: boolean;
  roster: RosterMemberView[];
  groupStats: GroupStats | null;
  appBaseUrl: string;
  profile: UserProfile;
  onEditProfile: () => void;
}) {
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
    <main className="screen connect-screen">
      <Header heading={groupName ?? "Connect"} profile={profile} onEditProfile={onEditProfile} />
      <section className="connect-title">
        <h1>{groupName}</h1>
        <p>
          {campusName ?? "Favor Church"} · {memberCount} members
        </p>
      </section>
      <section className="big-home-card">
        <RotatableHome stage={selectedStage} completed={false} />
        <div className="big-home-info">
          <div>
            <p>CURRENT HOME</p>
            <h2>{stage}</h2>
            <span className="home-note">{homeStages[selectedStage].note}</span>
          </div>
          <div className="coin-chip">◉ {groupCoins}</div>
        </div>
        <ProgressBar value={nextStage?.pct ?? 100} max={100} />
        <div className="upgrade-copy">
          <strong>{nextStage ? `${nextStage.pct}% to ${nextStage.stage}` : "All stages reached"}</strong>
          <span>Next group upgrade</span>
        </div>
      </section>

      {isLeader && (
        <section className="leader-box">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEADER TOOLS</p>
              <h2>Bring someone in</h2>
            </div>
          </div>
          <p>Show this code or QR to anyone in the room who isn&apos;t in a Connect Group yet. They enter it in the app and they&apos;re in.</p>
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
          {stillReading.length > 0 && (
            <div className="leader-nudge">
              <p className="eyebrow">STILL READING</p>
              <span>{stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.</span>
            </div>
          )}
          <a className="secondary-link connect-portal-link" href="https://connect.favor.church">
            Manage your group on connect.favor.church
          </a>
        </section>
      )}

      <section className="member-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHO&apos;S READ TODAY</p>
            <h2>{readersToday} of {memberCount} have read</h2>
          </div>
          <div className="status-key">
            <i /> Read
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="gentle-note">Nobody yet. Be the first one today.</p>
        ) : (
          <div className="member-grid">
            {sorted.map((m) => {
              const seed = avatarSeedFor(m.personId);
              return (
                <article className={`member-card ${m.readToday ? "read" : "waiting"}`} key={m.personId}>
                  <div className="member-avatar">
                    <Avatar color={seed.color} skin={seed.skin} hair={seed.hair} />
                    {m.readToday && <b>✓</b>}
                  </div>
                  <strong>{m.name}</strong>
                  <span>{m.readToday ? "Read today" : "Not yet"}</span>
                </article>
              );
            })}
          </div>
        )}
        <p className="gentle-note">We cheer for groups, not against people.</p>
      </section>
    </main>
  );
}
