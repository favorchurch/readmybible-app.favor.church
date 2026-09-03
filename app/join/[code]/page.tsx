import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { joinCodes } from "@/db/schema";
import { JoinConfirm } from "@/components/join-confirm";
import { getCampusName, getGroupBasic, getRoster } from "@/lib/rock/client";
import { ROLE_GT25_ASSISTANT_LEADER, ROLE_GT25_LEADER } from "@/lib/rock/constants";
import { getSessionContext } from "@/lib/session";

export default async function JoinByCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();

  const session = await getSessionContext();
  if (session.status === "logged-out") {
    redirect(`/auth/login?returnTo=${encodeURIComponent(`/join/${code}`)}`);
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  const [row] = await db.select().from(joinCodes).where(eq(joinCodes.code, code)).limit(1);

  if (!row) {
    return (
      <main className="screen join-screen">
        <section className="hero-copy">
          <h1>Join a Connect Group</h1>
          <p>That code didn&apos;t match a group. Check it with your leader and try again.</p>
        </section>
      </main>
    );
  }

  const alreadyMember = session.memberships.some((m) => m.groupId === row.groupId);
  const [group, roster] = await Promise.all([getGroupBasic(row.groupId), getRoster(row.groupId)]);
  const campusName = group?.CampusId ? await getCampusName(group.CampusId) : null;

  const groupName = group?.Name ?? `Group ${row.groupId}`;
  const leaderNames = roster
    .filter((m) => m.GroupRoleId === ROLE_GT25_LEADER || m.GroupRoleId === ROLE_GT25_ASSISTANT_LEADER)
    .map((m) => m.Person?.NickName || m.Person?.FirstName)
    .filter((name): name is string => Boolean(name));

  return (
    <main className="screen join-screen">
      <section className="hero-copy">
        <h1>Join a Connect Group</h1>
      </section>
      <section className="join-confirm-card">
        <h2>Join {groupName}?</h2>
        {alreadyMember ? (
          <p>You&apos;re already part of {groupName}.</p>
        ) : (
          <>
            <p>
              {leaderNames.length > 0 ? leaderNames.join(" and ") : "Their leader"} lead{leaderNames.length === 1 ? "s" : ""} this group at{" "}
              {campusName ?? "Favor Church"}. Once you&apos;re in, your reading counts toward their home.
            </p>
            <JoinConfirm code={code} groupName={groupName} />
          </>
        )}
      </section>
    </main>
  );
}
