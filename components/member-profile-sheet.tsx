"use client";

import { Avatar, avatarSeedFor } from "@/components/avatar";
import { Sheet } from "@/components/sheet";
import { recentFiveDayStreak } from "@/lib/member-progress";
import { PLAN } from "@/lib/plan";
import type { RosterMemberView } from "@/components/app-shell";

export function MemberProfileSheet({
  open,
  onClose,
  member,
  todayLocal,
}: {
  open: boolean;
  onClose: () => void;
  member: RosterMemberView | null;
  todayLocal: string;
}) {
  if (!member) return null;

  const seed = avatarSeedFor(member.personId);
  const streakMarks = recentFiveDayStreak(member.readingDates ?? [], todayLocal);
  const readChapters = new Set(member.chapters ?? []);
  const readCount = readChapters.size;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy="member-profile-title"
      className="member-profile-sheet"
    >
      <section className="member-profile-modal" data-section="member-profile-sheet">
        <div className="sheet-header">
          <div className="member-profile-identity">
            <div className="member-profile-avatar-wrap">
              <Avatar color={seed.color} skin={seed.skin} hair={seed.hair} />
              {member.readToday && <b className="member-profile-check" aria-hidden="true">✓</b>}
            </div>
            <div>
              <p className="eyebrow">CONNECT MEMBER</p>
              <h2 id="member-profile-title">{member.name}</h2>
              <span className="member-profile-status">
                {member.isLeader ? "Group Leader · " : ""}
                {readCount} of 28 chapters read
              </span>
            </div>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* 5-day streak strip */}
        <div className="member-streak-section">
          <span className="section-subhead">Recent 5-day streak</span>
          <div className="streak-strip" role="group" aria-label="Recent 5-day streak status">
            {streakMarks.map((mark) => (
              <div
                key={mark.date}
                className={`streak-dot ${mark.read ? "read" : "unread"}`}
                title={`October ${mark.day}: ${mark.read ? "Read" : "Missed"}`}
                aria-label={`October ${mark.day}: ${mark.read ? "Read" : "Missed"}`}
              >
                <span className="streak-day-label">Oct {mark.day}</span>
                <span className="streak-dot-circle" aria-hidden="true">
                  {mark.read ? "✓" : ""}
                </span>
                <span className="streak-dot-status">{mark.read ? "Read" : "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compact October 28-day progress calendar */}
        <div className="member-calendar-section">
          <div className="member-calendar-header">
            <span className="section-subhead">Matthew · October 2026</span>
            <span className="member-calendar-count">{readCount}/28 complete</span>
          </div>

          <div className="member-mini-grid" role="grid" aria-label={`${member.name}'s October reading calendar`}>
            {PLAN.map((entry) => {
              const isRead = readChapters.has(entry.chapter);
              return (
                <div
                  key={entry.day}
                  className={`mini-grid-cell ${isRead ? "read" : "unread"}`}
                  title={`Day ${entry.day} (Matthew ${entry.chapter}): ${isRead ? "Read" : "Not yet read"}`}
                  aria-label={`Day ${entry.day}, Matthew ${entry.chapter}: ${isRead ? "Read" : "Not yet read"}`}
                >
                  <span className="mini-day-num">{entry.day}</span>
                  {isRead && <span className="mini-day-check" aria-hidden="true">✓</span>}
                </div>
              );
            })}
          </div>

          <div className="member-calendar-legend">
            <div className="legend-item">
              <span className="legend-swatch read-swatch" aria-hidden="true">✓</span>
              <span>Read</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch unread-swatch" aria-hidden="true" />
              <span>Not read</span>
            </div>
          </div>
        </div>

        <p className="member-profile-privacy-note">
          Reading check-ins only. Private notes, verse bookmarks, and personal metadata are never shared.
        </p>
      </section>
    </Sheet>
  );
}
