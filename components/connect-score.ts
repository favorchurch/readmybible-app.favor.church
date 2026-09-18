import { scoreConnect, type ConnectScore, type PersonContribution } from "@/lib/scoring";
import { completedAssignmentsCount } from "@/lib/plan";
import type { RosterMemberView } from "@/components/app-shell";

/**
 * Adapts this app's already-resolved roster into scoreConnect's input shape.
 * Regional Leader and Cluster Head pools have no data source in this app yet
 * (that aggregation belongs to #150), so both bonus pools are empty here.
 * Base points and the 3D Campfire unlock do not depend on either pool, so
 * they are unaffected -- only the regional/cluster bonus stays at zero until
 * #150 lands.
 */
export function rosterContribution(member: RosterMemberView): PersonContribution {
  return {
    rockPersonId: member.personId,
    completedAssignments: completedAssignmentsCount(member.chapters),
    isConnectMember: !member.isLeader,
    isConnectLeader: member.isLeader,
    isRegionalLeader: false,
    isClusterHead: false,
    isDepartmentHead: false,
  };
}

export function scoreRoster(groupId: number, roster: RosterMemberView[]): ConnectScore {
  return scoreConnect({
    groupId,
    members: roster.map(rosterContribution),
    regionalLeaders: [],
    clusterHeads: [],
  });
}

/**
 * The muted points shown next to each person in Home come from this Connect's
 * own score, not a per-person figure -- ConnectScore has no such thing, and
 * inventing one here would be exactly the "recomputed locally" the pinned
 * contract forbids. Every member shows the same already-rounded total.
 */
export function withDisplayPoints(roster: RosterMemberView[], score: ConnectScore): RosterMemberView[] {
  return roster.map((member) => ({ ...member, displayPoints: score.displayPoints }));
}
