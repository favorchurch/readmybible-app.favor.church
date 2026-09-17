"use client";

import { useEffect, useState } from "react";

import type { JoinCodeResult } from "@/app/actions/getOrCreateJoinCode";
import { Header } from "@/components/screens/header";
import type { ConnectSwitcherContext } from "@/components/connect-switcher";
import type { RosterMemberView } from "@/components/app-shell";
import type { TodayState } from "@/components/use-today";
import type { UserProfile } from "@/components/avatar";
import type { GroupStanding } from "@/lib/game";
import { longDate, PLAN_START } from "@/lib/plan";

const campaignStartLabel = longDate(PLAN_START).replace(/^[^,]+,\s*/, "");

type LeaderScreenProps = {
  groupName: string | null;
  /**
   * No longer read here -- the "Other Connects" card list this fed (issue
   * #171) is retired in favor of the promoted town view (`sectionSlot`).
   * Kept in the prop type, unused, so `components/app-shell.tsx` (out of
   * this ticket's allowed-mutations scope) does not need to stop passing it.
   */
  campusBoard: GroupStanding[];
  roster: RosterMemberView[];
  today: TodayState;
  profile: UserProfile;
  appBaseUrl: string;
  readerGroupId: number | null;
  onGetOrCreateJoinCode: () => Promise<JoinCodeResult>;
  onEditProfile: () => void;
  connectSwitcher?: ConnectSwitcherContext;
  sectionSlot?: React.ReactNode;
  hasGroupView: boolean;
};

export function LeaderScreen(props: LeaderScreenProps) {
  return <LeaderScreenContent key={props.readerGroupId ?? "no-active-group"} {...props} />;
}

function LeaderScreenContent({
  groupName,
  roster,
  today,
  profile,
  appBaseUrl,
  readerGroupId,
  onGetOrCreateJoinCode,
  onEditProfile,
  connectSwitcher,
  sectionSlot,
  hasGroupView,
}: LeaderScreenProps) {
  const phase = today.displayPhase;
  const stillReading = roster.filter((m) => !m.readToday);

  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  // Tracked separately from codeError so an expected "not created yet" is not
  // painted with the same red treatment as a real failure.
  const [isMissingCode, setIsMissingCode] = useState(false);
  const [cheeredMember, setCheeredMember] = useState<string | null>(null);

  const readMembers = roster.filter((m) => m.readToday);
  const memberCount = roster.length;
  const pctRead = memberCount > 0 ? Math.round((readMembers.length / memberCount) * 100) : 0;

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
    if (!hasGroupView) return;
    let cancelled = false;
    onGetOrCreateJoinCode().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setJoinCode(result.code);
        setCodeError(null);
        setIsMissingCode(false);
      } else {
        setCodeError(result.error);
        setIsMissingCode(result.reason === "no-code-yet");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [readerGroupId, onGetOrCreateJoinCode, hasGroupView]);

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

  if (!hasGroupView) {
    return (
      <main className="screen leader-screen">
        <Header heading="Leader" profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />
        {sectionSlot}
      </main>
    );
  }

  return (
    <main className="screen leader-screen">
      <Header heading="Leader" profile={profile} onEditProfile={onEditProfile} connectSwitcher={connectSwitcher} />

      <section className="pulse-metric-card" data-section="group-pulse">
        <div className="pulse-metric-header">
          <div>
            <p className="eyebrow">
              {phase === "pre-launch" ? "PRE-LAUNCH ONBOARDING" : "DAILY GROUP PULSE"}
            </p>
            <h2>{phase === "pre-launch" ? `Get ready for ${campaignStartLabel}` : `${readMembers.length} of ${memberCount} read today`}</h2>
          </div>
          <div className="pulse-badge">{pctRead}%</div>
        </div>
        <div className="pulse-progress-track" aria-hidden="true">
          <div className="pulse-progress-fill" style={{ width: `${pctRead}%` }} />
        </div>
        <p className="pulse-stats-note">
          {phase === "active" ? `${readMembers.length} members checked in for today's reading` : `Ensure all members join before ${campaignStartLabel}`}
        </p>
        {phase === "active" && (
          <div className="leader-roster-breakdown">
            <div className="breakdown-col">
              <h3>Read Today <span>({readMembers.length})</span></h3>
              <div className="breakdown-list">
                {readMembers.length === 0 ? (
                  <p className="breakdown-empty-note">Nobody yet. Check-ins will appear here as members read.</p>
                ) : (
                  readMembers.map((m) => (
                    <div key={m.personId} className="breakdown-item read">
                      <span>✓ {m.name}</span>
                    </div>
                  ))
                )}
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
            ? `Share this before ${campaignStartLabel}.`
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
        {/* A group that simply has no code yet is an expected state, not a
            failure -- rendering it through .error-note gave it the same red
            treatment as an authorization denial. */}
        {codeError &&
          (isMissingCode ? (
            <p className="code-empty-note">{codeError}</p>
          ) : (
            <p className="error-note">{codeError}</p>
          ))}
      </section>

      {/* Still reading — active phase, non-empty only */}
      {phase === "active" && stillReading.length > 0 && (
        <section className="leader-section leader-nudge" data-section="still-reading">
          <p className="eyebrow">STILL READING</p>
          <span>{stillReading.map((m) => m.name).join(", ")} haven&apos;t checked in today. A quick message goes a long way.</span>
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

      {/*
       * "Other Connects" / "Groups on the journey" (issue #171) is retired:
       * the promoted town view (sectionSlot -- see
       * components/sections/section-dashboard.tsx) is the one surface for a
       * leader's Connects now, carrying across its locality grouping,
       * legend-visibility default, and per-Connect stage + percentage.
       */}
      {sectionSlot}
    </main>
  );
}
