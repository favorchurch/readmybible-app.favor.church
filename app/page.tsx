import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { AppShell, type AppShellProps } from "@/components/app-shell";
import { defaultAvatarConfig, isAvatarConfig, type Translation } from "@/components/avatar";
import { getCampusBoard, getGroupStats, getPersonReadingState } from "@/lib/data/stats";
import { getCampusName, getRoster } from "@/lib/rock/client";
import { getSessionContext } from "@/lib/session";

export default async function Page() {
  const session = await getSessionContext();

  if (session.status === "logged-out") {
    redirect("/auth/login");
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  const [profileRows, readingState, roster, groupStats, campusBoard, campusName] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.rockPersonId, session.rockPersonId)).limit(1),
    getPersonReadingState(session.rockPersonId),
    session.activeGroup ? getRoster(session.activeGroup.groupId) : Promise.resolve([]),
    session.activeGroup ? getGroupStats(session.activeGroup.groupId) : Promise.resolve(null),
    session.campusId ? getCampusBoard(session.campusId) : Promise.resolve([]),
    session.campusId ? getCampusName(session.campusId) : Promise.resolve(null),
  ]);

  const profileRow = profileRows[0];
  const avatar = isAvatarConfig(profileRow?.avatar) ? profileRow.avatar : defaultAvatarConfig;
  const translation = (profileRow?.translation as Translation | undefined) ?? "NET";

  const props: AppShellProps = {
    displayName: profileRow?.displayName || session.displayName,
    avatar,
    translation,
    memberships: session.memberships,
    activeGroup: session.activeGroup,
    needsGroupChoice: session.needsGroupChoice,
    isLeader: session.isLeader,
    campusName,
    roster: roster.map((m) => ({
      personId: m.PersonId,
      name: m.Person?.NickName || m.Person?.FirstName || `Reader ${m.PersonId}`,
      isLeader: m.GroupRoleId !== undefined && m.GroupRoleId !== null && [24, 81].includes(m.GroupRoleId),
      readToday: groupStats?.readersTodayIds.includes(m.PersonId) ?? false,
    })),
    chapters: readingState.chapters,
    readingDates: readingState.dates,
    groupStats,
    campusBoard,
    appBaseUrl: process.env.APP_BASE_URL ?? "",
  };

  return <AppShell {...props} />;
}
