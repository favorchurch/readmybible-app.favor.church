import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppBrandSplash } from "@/components/app-splash";
import { HomeData } from "@/components/home-data";
import { getSessionContext } from "@/lib/session";
import { WelcomeLanding } from "@/components/welcome";

export default async function Page(props?: {
  searchParams?: Promise<{ test?: string; scope?: string }>;
}) {
  const session = await getSessionContext();

  if (session.status === "logged-out") {
    return <WelcomeLanding />;
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  const searchParams = props?.searchParams ? await props.searchParams : {};

  return (
    <Suspense fallback={<AppBrandSplash />}>
      <HomeData session={session} searchParams={searchParams} />
    </Suspense>
  );
}
