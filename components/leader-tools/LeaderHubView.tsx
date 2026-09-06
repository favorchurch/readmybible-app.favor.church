"use client";

import { useState } from "react";
import type { RosterMemberView } from "@/components/app-shell";
import type { GroupStats } from "@/lib/data/stats";
import { nextStageProgress } from "@/lib/game";

export function LeaderHubView({
  memberCount,
  readersToday,
  groupStats,
  roster,
  phase,
  onOpenPresenter,
}: {
  memberCount: number;
  readersToday: number;
  groupStats: GroupStats | null;
  roster: RosterMemberView[];
  phase: string;
  onOpenPresenter: () => void;
}) {
  const [cheeredMember, setCheeredMember] = useState<string | null>(null);

  const readMembers = roster.filter((m) => m.readToday);
  const stillReading = roster.filter((m) => !m.readToday);
  const ratio = groupStats?.ratio ?? 0;
  const nextStage = nextStageProgress(ratio);
  const pctRead = memberCount > 0 ? Math.round((readersToday / memberCount) * 100) : 0;

  const handleCheerMember = async (memberName: string) => {
    const text = `Hey ${memberName}! Hope you're having a blessed day. Cheering you on for today's chapter in Matthew with our Connect Group! 🕊️`;
    try {
      await navigator.clipboard.writeText(text);
      setCheeredMember(memberName);
      setTimeout(() => setCheeredMember(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="leader-hub-view" data-section="leader-hub">
      <section className="hub-summary-card">
        <div className="hub-summary-header">
          <div>
            <p className="eyebrow">
              {phase === "pre-launch" ? "PRE-LAUNCH ONBOARDING" : "DAILY GROUP PULSE"}
            </p>
            <h2>{phase === "pre-launch" ? "Get ready for Oct 1" : `${readersToday} of ${memberCount} read today`}</h2>
          </div>
          <div className="hub-badge">{pctRead}%</div>
        </div>

        <div className="hub-pulse-body">
          <div className="hub-progress-track" aria-hidden="true">
            <div className="hub-progress-fill" style={{ width: `${pctRead}%` }} />
          </div>

          <div className="hub-stats-row">
            <span>
              {nextStage
                ? `Next upgrade: ${nextStage.stage} (${nextStage.pct}%)`
                : "All home stages reached"}
            </span>
            <button
              type="button"
              className="hub-present-btn"
              onClick={onOpenPresenter}
            >
              📲 Present Code / QR ↗
            </button>
          </div>
        </div>
      </section>

      {phase === "active" && (
        <section className="hub-roster-breakdown">
          <div className="hub-roster-block">
            <h3 className="hub-roster-title">
              Read Today <span>({readMembers.length})</span>
            </h3>
            {readMembers.length === 0 ? (
              <p className="hub-empty-note">Waiting for the first check-in today.</p>
            ) : (
              <div className="hub-member-list">
                {readMembers.map((m) => (
                  <div key={m.personId} className="hub-member-row read">
                    <span className="hub-check-icon">✓</span>
                    <strong className="hub-member-name">{m.name}</strong>
                    <span className="hub-member-tag">Completed</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hub-roster-block">
            <h3 className="hub-roster-title">
              Still Reading <span>({stillReading.length})</span>
            </h3>
            {stillReading.length === 0 ? (
              <p className="hub-empty-note">Full house! Everyone in your group has read today. 🎉</p>
            ) : (
              <div className="hub-member-list">
                {stillReading.map((m) => (
                  <div key={m.personId} className="hub-member-row pending">
                    <span className="hub-pending-dot">○</span>
                    <strong className="hub-member-name">{m.name}</strong>
                    <button
                      type="button"
                      className="hub-cheer-btn"
                      onClick={() => handleCheerMember(m.name)}
                    >
                      {cheeredMember === m.name ? "✓ Copied" : "Cheer on"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="hub-footer">
        <p className="gentle-note">We cheer for groups, not against people.</p>
        <a
          className="secondary-link connect-portal-link"
          href="https://connect.favor.church"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manage your group on connect.favor.church ↗
        </a>
      </div>
    </div>
  );
}
