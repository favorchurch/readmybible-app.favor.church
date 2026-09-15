import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppSkeleton } from "@/components/app-splash";
import { HomeData } from "@/components/home-data";
import { getSessionContext } from "@/lib/session";
import { WelcomeLanding } from "@/components/welcome";

export default async function Page() {
  const session = await getSessionContext();

  if (session.status === "logged-out") {
    return <WelcomeLanding />;
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  return (
    <Suspense fallback={<AppSkeleton />}>
      <HomeData session={session} />
    </Suspense>
  );
}
