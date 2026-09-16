import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FontReadyGate } from "@/components/font-ready-gate";
import { LoginEntry } from "@/components/login-entry";
import { safeReturnTo } from "@/lib/auth-return";
import { getSessionContext } from "@/lib/session";

export const metadata: Metadata = {
  title: "Read My Bible: Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const returnTo = safeReturnTo(params.returnTo);
  const session = await getSessionContext();

  if (session.status === "ok") redirect(returnTo);
  if (session.status === "not-found-in-rock") redirect("/not-found-in-rock");

  return (
    <FontReadyGate>
      <LoginEntry returnTo={returnTo} />
    </FontReadyGate>
  );
}
