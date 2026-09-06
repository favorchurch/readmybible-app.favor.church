"use client";

import { useEffect, useState } from "react";

import type { JoinCodeResult } from "@/app/actions/getOrCreateJoinCode";
import { Header } from "@/components/screens/header";
import { StageMini } from "@/components/stage-mini";
import { ProgressBar } from "@/components/progress-bar";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";
import type { UserProfile } from "@/components/avatar";
import { groupByLocality, stageFor, UNKNOWN_LOCALITY } from "@/lib/game";
import type { GroupStanding } from "@/lib/game";
import { LeaderPrototypeSwitcher, type LeaderPrototypeMode } from "@/components/leader-tools/LeaderPrototypeSwitcher";
import { LeaderPresenterSheet } from "@/components/leader-tools/LeaderPresenterSheet";
import { LeaderTopBanner } from "@/components/leader-tools/LeaderTopBanner";

export const MIN_RATIO_TO_SHOW = 0;

export function LeaderScreen({
  groupName,
  campusBoard,
  roster,
  today,
  profile,
  appBaseUrl,
  readerGroupId,
  onGetOrCreateJoinCode,
  onEditProfile,
}: {
  groupName: string | null;
  campusBoard: GroupStanding[];
  roster: RosterMemberView[];
  today: TodayState;
  profile: UserProfile;
  appBaseUrl: string;
  readerGroupId: number | null;
  onGetOrCreateJoinCode: () => Promise<JoinCodeResult>;
  onEditProfile: () => void;
}) {
  const phase = today.displayPhase;
  const stillReading = roster.filter((m) => !m.readToday);

  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);
  const [prototypeMode, setPrototypeMode] = useState<LeaderPrototypeMode>("standard");
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [copiedEncouragement, setCopiedEncouragement] = useState(false);
  const [cheeredMember, setCheeredMember] = useState<string | null>(null);

  const readMembers = roster.filter((m) => m.readToday);
  const memberCount = roster.length;
  const pctRead = memberCount > 0 ? Math.round((readMembers.length / memberCount) * 100) : 0;

  const handleCopyEncouragement = async () => {
    const text = "Hey friend! Just diving into Matthew with our Connect Group today. Cheering you on! 🕊️";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEncouragement(true);
      setTimeout(() => setCopiedEncouragement(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCheerMember = async (memberName: string) => {
    const text = `Hey ${memberName}! Hope you're having a great day. Cheering you on for today's chapter in Matthew with our Connect Group! 🕊️`;
    try {
      await navigator.clipboard.writeText(text);
      setCheeredMember(memberName);
      setTimeout(() => setCheeredMember(null), 2000);
    } catch {
      // ignore
    }
  };

  // Moved verbatim from connect-screen.tsx:63-75
  useEffect(() => {
    let cancelled = false;
    onGetOrCreateJoinCode().then((result) => {
      if (cancelled) return;
      if (result.ok) setJoinCode(result.code);
      else setCodeError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [onGetOrCreateJoinCode]);

  // Moved verbatim from connect-screen.tsx:77-88
  useEffect(() => {
    if (!joinCode) return;
    const baseUrl = appBaseUrl || (typeof window !== "undefined" ? window.location.origin : "");
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

  const sections = groupByLocality(
    campusBoard.filter((g) => g.ratio >= MIN_RATIO_TO_SHOW),
  );

  return (
    <main className="screen leader-screen">
      <Header heading="Leader" profile={profile} onEditProfile={onEditProfile} />

      <LeaderPrototypeSwitcher mode={prototypeMode} onChange={setPrototypeMode} />

      {prototypeMode === "option3" && (
        <LeaderTopBanner
          joinCode={joinCode}
          phase={phase}
          readersToday={readMembers.length}
          memberCount={memberCount}
          appBaseUrl={appBaseUrl}
          onOpenPresenter={() => setPresenterOpen(true)}
        />
      )}

      {prototypeMode === "option2" && (
        <section className="pulse-metric-card" data-section="group-pulse">
          <div className="pulse-metric-header">
            <div>
              <p className="eyebrow">
                {phase === "pre-launch" ? "PRE-LAUNCH ONBOARDING" : "DAILY GROUP PULSE"}
              </p>
              <h2>{phase === "pre-launch" ? "Get ready for Oct 1" : `${readMembers.length} of ${memberCount} read today`}</h2>
            </div>
            <div className="pulse-badge">{pctRead}%</div>
          </div>
          <div className="pulse-progress-track" aria-hidden="true">
            <div className="pulse-progress-fill" style={{ width: `${pctRead}%` }} />
          </div>
          <p className="pulse-stats-note">
            {phase === "active" ? `${readMembers.length} members checked in for today's chapter` : "Ensure all members join before October 1"}
          </p>
          {phase === "active" && (
            <div className="leader-roster-breakdown">
              <div className="breakdown-col">
                <h3>Read Today <span>({readMembers.length})</span></h3>
                <div className="breakdown-list">
                  {readMembers.map((m) => (
                    <div key={m.personId} className="breakdown-item read">
                      <span>✓ {m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="breakdown-col">
                <h3>Still Reading <span>({stillReading.length})</span></h3>
                <div className="breakdown-list">
                  {stillReading.map((m) => (
                    <div key={m.personId} className="breakdown-item pending">
                      <span>○ {m.name}</span>
                      <button
                        type="button"
                        className="breakdown-cheer-btn"
                        onClick={() => handleCheerMember(m.name)}
                      >
                        {cheeredMember === m.name ? "✓ Copied" : "Cheer on"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Bring someone in */}
      <section className="leader-section" data-section="bring-someone-in">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BRING SOMEONE IN</p>
            <h2>Group code &amp; QR</h2>
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
        {prototypeMode === "option1" && (
          <div className="presenter-trigger-row">
            <button
              type="button"
              className="primary-button presenter-trigger-btn"
              onClick={() => setPresenterOpen(true)}
            >
              📲 Present to Room (Large QR) ↗
            </button>
          </div>
        )}
      </section>

      {/* Still reading — active phase, non-empty only */}
      {phase === "active" && stillReading.length > 0 && (
        <section className="leader-section leader-nudge" data-section="still-reading">
          <p className="eyebrow">STILL READING</p>
          <span>{stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.</span>
          {prototypeMode === "option1" && (
            <div>
              <button
                type="button"
                className="copy-encouragement-btn"
                onClick={handleCopyEncouragement}
              >
                {copiedEncouragement ? "✓ Encouragement Copied" : "Copy Gentle Encouragement 💌"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Your group's material */}
      <section className="leader-section" data-section="group-material">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR GROUP&apos;S MATERIAL</p>
            <h2>Connect portal</h2>
          </div>
        </div>
        <a
          className="secondary-link connect-portal-link"
          href="https://connect.favor.church"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage your group on connect.favor.church
        </a>
      </section>

      {/* Add a member */}
      <section className="leader-section" data-section="add-member">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADD A MEMBER</p>
            <h2>Invite someone</h2>
          </div>
        </div>
        <p>Opens the Connect portal where you can add someone directly to your group.</p>
        <a
          className="primary-button leader-add-member-button"
          href="https://connect.favor.church"
          target="_blank"
          rel="noopener noreferrer"
        >
          Add a member ↗
        </a>
      </section>

      {/* Other Connects */}
      <section className="leader-section leader-connects" data-section="other-connects">
        <div className="leader-connects-header">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OTHER CONNECTS</p>
              <h2>Groups on the journey</h2>
            </div>
          </div>
          {sections.length > 0 && (
            <button
              type="button"
              className="leader-toggle-names"
              aria-pressed={showNames}
              onClick={() => setShowNames((v) => !v)}
            >
              {showNames ? "Show icons" : "Show names"}
            </button>
          )}
        </div>

        {sections.length === 0 ? (
          <p className="gentle-note">No groups on the board yet. October&apos;s coming.</p>
        ) : (
          sections.map(({ locality, groups }) => (
            <div key={locality} className="locality-section">
              <h3 className="locality-heading">
                {locality === UNKNOWN_LOCALITY ? "Unknown" : locality}
                <span className="locality-count">{groups.length} group{groups.length !== 1 ? "s" : ""}</span>
              </h3>
              {showNames ? (
                <div className="campus-groups-grid">
                  {groups.map((g) => {
                    const currentStage = stageFor(g.ratio);
                    const pct = Math.round(g.ratio * 100);
                    return (
                      <article className="campus-group-card" key={g.groupId}>
                        <div className="campus-group-header">
                          <StageMini name={currentStage} size={42} className="campus-group-mini" />
                          <div className="campus-group-info">
                            <strong>{g.name}</strong>
                            <span className="campus-group-status">{pct}% complete · {currentStage}</span>
                          </div>
                        </div>
                        <ProgressBar value={pct} max={100} />
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="locality-icons"
                  aria-label={`${locality === UNKNOWN_LOCALITY ? "Unknown" : locality} — ${groups.length} group${groups.length !== 1 ? "s" : ""}`}
                >
                  {groups.map((g) => {
                    const currentStage = stageFor(g.ratio);
                    const isOwn = readerGroupId !== null && g.groupId === readerGroupId;
                    return (
                      <span
                        key={g.groupId}
                        className={`locality-icon-wrap${isOwn ? " locality-icon-own" : ""}`}
                        aria-label={`${g.name} — ${currentStage}${isOwn ? " (your group)" : ""}`}
                      >
                        <StageMini
                          name={currentStage}
                          size={40}
                          className="locality-stage-mini"
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <LeaderPresenterSheet
        open={presenterOpen}
        onClose={() => setPresenterOpen(false)}
        joinCode={joinCode}
        qrDataUrl={qrDataUrl}
        groupName={groupName}
        phase={phase}
        stillReading={stillReading}
        appBaseUrl={appBaseUrl}
      />
    </main>
  );
}
