"use client";

import { useState } from "react";

import { Brand } from "@/components/brand";
import type { GroupMembership } from "@/lib/session";

export function GroupPickerScreen({
  memberships,
  pending,
  onChoose,
}: {
  memberships: GroupMembership[];
  pending: boolean;
  onChoose: (groupId: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(memberships.find((m) => m.isLeader)?.groupId ?? memberships[0]?.groupId ?? null);
  return (
    <div className="app-shell">
      <div className="paper-noise" />
      <main className="screen picker-screen">
        <Brand />
        <section className="hero-copy">
          <h1>Which group are you reading with?</h1>
          <p>You&apos;re in more than one Connect Group. Pick one for October. You can switch later.</p>
        </section>
        <div className="picker-list">
          {memberships.map((m) => (
            <button
              key={m.groupId}
              type="button"
              className={`picker-option ${selected === m.groupId ? "selected" : ""}`}
              onClick={() => setSelected(m.groupId)}
              aria-pressed={selected === m.groupId}
            >
              {m.groupName}
            </button>
          ))}
        </div>
        <button className="primary-button" disabled={pending || selected === null} onClick={() => selected !== null && onChoose(selected)}>
          <strong>Read with this group</strong>
        </button>
      </main>
    </div>
  );
}
