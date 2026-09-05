"use client";

import { recentFiveDayStreak } from "@/lib/member-progress";

export function MemberStreakDots({ dates, todayLocal }: { dates: string[]; todayLocal: string }) {
  const marks = recentFiveDayStreak(dates, todayLocal);
  const availableMarks = marks.filter((mark) => !mark.future);
  const readCount = availableMarks.filter((mark) => mark.read).length;
  const futureCount = marks.length - availableMarks.length;

  return (
    <span
      className="member-avatar-streak"
      role="img"
      aria-label={`Last five reading days: ${readCount} of ${availableMarks.length} read${futureCount ? `, ${futureCount} upcoming` : ""}`}
    >
      {marks.map((mark) => (
        <i
          key={mark.date}
          className={mark.read ? "read" : mark.future ? "upcoming" : "unread"}
          title={`${mark.longLabel}: ${mark.future ? "Upcoming" : mark.read ? "Read" : "Missed"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
