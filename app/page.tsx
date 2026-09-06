import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AppShell, type AppShellProps } from "@/components/app-shell";
import { isAvatarConfig, resolveAvatar, type Translation } from "@/components/avatar";
import { devMockToday } from "@/lib/dev-clock";
import {
  getCampusBoard,
  getGroupMembersReadingHistory,
  getGroupStats,
  getPersonReadingState,
} from "@/lib/data/stats";
import { getCampusGroups, getCampusName, getRoster } from "@/lib/rock/client";
import { GROUP_TYPE_CONNECT_GROUP } from "@/lib/rock/constants";
import { getSessionContext } from "@/lib/session";

export default async function Page() {
  const session = await getSessionContext();

  if (session.status === "logged-out") {
    redirect("/auth/login");
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  const isDev = process.env.NODE_ENV !== "production";

  const activeGroupId = session.activeGroup?.groupId;
  const rosterP = activeGroupId ? getRoster(activeGroupId) : Promise.resolve([]);
  const memberReadingMapP = activeGroupId
    ? rosterP.then((members) => getGroupMembersReadingHistory(activeGroupId, members.map((m) => m.PersonId)))
    : Promise.resolve(new Map());

  const campusGroupsP =
    isDev && session.campusId
      ? getCampusGroups(session.campusId).then((groups) =>
          groups
            .filter((g) => g.GroupTypeId === GROUP_TYPE_CONNECT_GROUP)
            .map((g) => ({ groupId: g.Id, groupName: g.Name })),
        )
      : Promise.resolve([]);

  const testWritableGroupId =
    isDev && process.env.TEST_MODE_WRITABLE_GROUP_ID
      ? Number.parseInt(process.env.TEST_MODE_WRITABLE_GROUP_ID, 10) || null
      : null;

  const [profileRows, readingState, roster, groupStats, campusBoard, campusName, memberReadingMap, campusGroups] =
    await Promise.all([
      db.select().from(profiles).where(eq(profiles.rockPersonId, session.rockPersonId)).limit(1),
      getPersonReadingState(session.rockPersonId),
      rosterP,
      session.activeGroup
        ? getGroupStats(session.activeGroup.groupId, session.activeGroup.campusId)
        : Promise.resolve(null),
      session.campusId ? getCampusBoard(session.campusId) : Promise.resolve([]),
      session.campusId ? getCampusName(session.campusId) : Promise.resolve(null),
      memberReadingMapP,
      campusGroupsP,
    ]);

  const profileRow = profileRows[0];
  const avatar = resolveAvatar(session.rockPersonId, session.rockGender, profileRow?.avatar);
  const rosterProfiles = roster.length
    ? await db.select({ personId: profiles.rockPersonId, avatar: profiles.avatar })
      .from(profiles).where(inArray(profiles.rockPersonId, roster.map((member) => member.PersonId)))
    : [];
  const savedAvatars = new Map(rosterProfiles.map((row) => [row.personId, row.avatar]));
  const translation = (profileRow?.translation as Translation | undefined) ?? session.defaultTranslation;

  const props: AppShellProps = {
    displayName: profileRow?.displayName || session.displayName,
    avatar,
    avatarCustomized: isAvatarConfig(profileRow?.avatar),
    translation,
    memberships: session.memberships,
    activeGroup: session.activeGroup,
    needsGroupChoice: session.needsGroupChoice,
    isLeader: session.isLeader,
    campusName,
    roster: roster.map((m) => {
      const history = memberReadingMap.get(m.PersonId);
      return {
        personId: m.PersonId,
        avatar: resolveAvatar(m.PersonId, m.Person?.Gender, savedAvatars.get(m.PersonId)),
        isSelf: m.PersonId === session.rockPersonId,
        name: m.Person?.NickName || m.Person?.FirstName || `Reader ${m.PersonId}`,
        isLeader: m.GroupRoleId !== undefined && m.GroupRoleId !== null && [24, 81].includes(m.GroupRoleId),
        readToday: groupStats?.readersTodayIds.includes(m.PersonId) ?? false,
        chapters: history?.chapters ?? [],
        readingDates: history?.dates ?? [],
      };
    }),
    chapters: readingState.chapters,
    readingDates: readingState.dates,
    groupStats,
    campusBoard,
    appBaseUrl: process.env.APP_BASE_URL ?? "",
    devMockToday: devMockToday(),
    campusGroups,
    testWritableGroupId,
  };

  return <AppShell {...props} />;
}
