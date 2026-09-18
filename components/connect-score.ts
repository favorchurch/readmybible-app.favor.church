import { scoreConnect } from "@/lib/scoring";
import { completedAssignmentsCount } from "@/lib/plan";
import type { RosterMemberView } from "@/components/app-shell";

/**
 * The 3D Campfire unlock alone -- never points, never home stage. Both of
 * those need the Regional/Cluster/Department role resolution PR #185
 * (issue #150) owns; deriving them here, with a roster that has no upstream
 * role data, would silently misstate a Connect's earned points and stage
 * (an excluded upstream leader who is merely an ordinary member would
 * wrongly re-enter the base pool, and the two bonus pools would be missing
 * entirely). The unlock is different: scoreConnect's unlocked3dCampfire
 * reads only isConnectMember/isConnectLeader and completed assignments, and
 * never consults the role flags, so it is correct even before #185 lands.
 */
export function rosterUnlocks3dCampfire(groupId: number, roster: RosterMemberView[]): boolean {
  return scoreConnect({
    groupId,
    members: roster.map((member) => ({
      rockPersonId: member.personId,
      completedAssignments: completedAssignmentsCount(member.chapters),
      // A Connect Leader is a member of the Connect too -- this flag must not
      // lie even though every current reader of these two flags (countsInBase,
      // dedupe, and this unlock check) short-circuits on isConnectLeader.
      isConnectMember: true,
      isConnectLeader: member.isLeader,
      isRegionalLeader: false,
      isClusterHead: false,
      isDepartmentHead: false,
    })),
    regionalLeaders: [],
    clusterHeads: [],
  }).unlocked3dCampfire;
}
