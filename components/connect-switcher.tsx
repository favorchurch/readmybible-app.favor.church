"use client";

import { useState } from "react";

import type { ChooseGroupResult } from "@/app/actions/chooseGroup";
import { Sheet } from "@/components/sheet";
import {
  ROLE_GT25_ASSISTANT_LEADER,
  ROLE_GT25_LEADER,
  ROLE_GT25_MEMBER,
} from "@/lib/rock/constants";
import type { GroupMembership } from "@/lib/session";

export type ChooseGroupHandler = (groupId: number) => Promise<ChooseGroupResult>;

export type ConnectSwitcherContext = {
  memberships: GroupMembership[];
  activeGroup: GroupMembership | null;
  pending: boolean;
  onChooseGroup: ChooseGroupHandler;
};

export function membershipRoleLabel(roleId: number): string {
  if (roleId === ROLE_GT25_LEADER) return "Leader";
  if (roleId === ROLE_GT25_ASSISTANT_LEADER) return "Assistant leader";
  if (roleId === ROLE_GT25_MEMBER) return "Member";
  return "Connect member";
}

export function ConnectSwitcher({
  memberships,
  activeGroup,
  pending,
  onChooseGroup,
}: ConnectSwitcherContext) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (memberships.length < 2) return null;

  async function choose(groupId: number) {
    setError(null);
    const result = await onChooseGroup(groupId);
    if (result.ok) {
      setOpen(false);
      return;
    }
    setError(result.error);
  }

  return (
    <>
      <button
        type="button"
        className="connect-switcher-trigger"
        aria-haspopup="dialog"
        aria-label={`Switch Connect Group${activeGroup ? ` (currently ${activeGroup.groupName})` : ""}`}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <span className="connect-switcher-trigger-copy">
          <small>CONNECT GROUP</small>
          <strong>{activeGroup?.groupName ?? "Choose a group"}</strong>
        </span>
        <span aria-hidden="true" className="connect-switcher-chevron">⌄</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="connect-switcher-title" className="connect-switcher-sheet">
        <div className="connect-switcher-heading">
          <p className="eyebrow">YOUR CONNECT GROUPS</p>
          <h2 id="connect-switcher-title">Switch group</h2>
          <p className="connect-switcher-note">Your reading and group progress follow the group you choose.</p>
        </div>
        {error && <p className="error-note connect-switcher-error" role="alert">{error}</p>}
        <div className="connect-switcher-list" role="list">
          {memberships.map((membership) => {
            const selected = membership.groupId === activeGroup?.groupId;
            return (
              <div role="listitem" key={membership.groupId}>
                <button
                  type="button"
                  className={`connect-switcher-option${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  disabled={pending || selected}
                  aria-busy={pending && !selected}
                  onClick={() => void choose(membership.groupId)}
                >
                  <span className="connect-switcher-option-copy">
                    <strong>{membership.groupName}</strong>
                    <small>{membershipRoleLabel(membership.roleId)}</small>
                  </span>
                  <span className="connect-switcher-option-state">{selected ? "Current" : "Choose"}</span>
                </button>
              </div>
            );
          })}
        </div>
        {pending && <p className="connect-switcher-pending" role="status">Saving…</p>}
      </Sheet>
    </>
  );
}
