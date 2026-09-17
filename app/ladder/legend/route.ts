import { type NextRequest, NextResponse } from "next/server";

import { resolveAdminScope } from "@/lib/admin/access";
import { timezoneForCampus } from "@/lib/campus-timezones";
import { getGroupMembersReadingHistory, todayInTimezone } from "@/lib/data/stats";
import { getGroupBasic, getRoster, isGroupInScope } from "@/lib/rock/client";
import { GROUP_TYPE_CONNECT_GROUP } from "@/lib/rock/constants";
import { getSessionContext } from "@/lib/session";
import type { LadderGroupLegend } from "@/lib/ladder/legend-contract";

export const dynamic = "force-dynamic";

/**
 * Read-only member legend for a Connect home, promoted to production by
 * issue #151 (proxy.ts ungates this path specifically -- see
 * tests/ladder-gate.test.ts -- while `/ladder` itself stays dev-only).
 *
 * Authorization is enforced here, not trusted from the caller: members can
 * see their active Connect, leaders can see a Connect they lead, and an
 * upstream leader can see Connects inside their resolved jurisdiction. The
 * response contains only the name and compact reading dates needed by the
 * existing MemberStreakDots component; no member record is committed.
 */
export async function GET(request: NextRequest) {
  const groupId = Number(request.nextUrl.searchParams.get("groupId"));
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return NextResponse.json<LadderGroupLegend>({ ok: false, error: "Invalid Connect home." }, { status: 400 });
  }

  const session = await getSessionContext();
  if (session.status !== "ok") {
    return NextResponse.json<LadderGroupLegend>({ ok: false, error: "You need to be logged in." }, { status: 401 });
  }
  const group = await getGroupBasic(groupId);
  if (!group || group.GroupTypeId !== GROUP_TYPE_CONNECT_GROUP || !group.IsActive || group.IsArchived) {
    return NextResponse.json<LadderGroupLegend>({ ok: false, error: "This is not a Connect home." }, { status: 404 });
  }

  const scope = resolveAdminScope(session);
  const isActiveMember = session.memberships.some((membership) => membership.groupId === groupId);
  let authorized = isActiveMember;

  // Issue #118/#151: jurisdiction is resolved by walking ParentGroupId
  // upward from the target group (each ancestor cached under
  // `rock:group:{id}`) rather than loading and flattening the caller's
  // whole subtree just to answer one group's membership question.
  if (!authorized && scope) {
    authorized = scope.kind === "global" || (await isGroupInScope(groupId, scope.rootIds));
  }

  if (!authorized) {
    return NextResponse.json<LadderGroupLegend>({ ok: false, error: "Only authorized Connect viewers can see this legend." }, { status: 403 });
  }

  const roster = await getRoster(groupId);
  const readingHistory = await getGroupMembersReadingHistory(groupId, roster.map((member) => member.PersonId));
  const todayLocal = todayInTimezone(timezoneForCampus(group.CampusId));

  return NextResponse.json<LadderGroupLegend>({
    ok: true,
    todayLocal,
    members: roster.map((member) => ({
      personId: member.PersonId,
      name: member.Person?.NickName || member.Person?.FirstName || `Reader ${member.PersonId}`,
      readingDates: readingHistory.get(member.PersonId)?.dates ?? [],
    })),
  });
}
