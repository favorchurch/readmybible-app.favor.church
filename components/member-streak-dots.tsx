"use client";

import { recentFiveDayStreak } from "@/lib/member-progress";

export function MemberStreakDots({ dates, todayLocal }: { dates: string[]; todayLocal: string }) {
  const marks = recentFiveDayStreak(dates, todayLocal);
  const readCount = marks.filter((mark) => mark.read).length;

  return (
    <span
      className="member-avatar-streak"
      role="img"
      aria-label={`Last five reading days: ${readCount} of 5 read`}
    >
      {marks.map((mark) => (
        <i
          key={mark.date}
          className={mark.read ? "read" : "unread"}
          title={`${mark.longLabel}: ${mark.read ? "Read" : "Missed"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
