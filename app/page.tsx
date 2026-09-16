import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppBrandSplash } from "@/components/app-splash";
import { HomeData } from "@/components/home-data";
import { loginPathFor } from "@/lib/auth-return";
import { getSessionContext } from "@/lib/session";

export default async function Page(props?: {
  // Widened from `{test, scope}` so the other test-mode triggers the panel
  // activates on (`day`, `leader`, `admin`, `tab=admin`) reach HomeData's
  // server-side gate rather than being typed away.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSessionContext();
  const searchParams = props?.searchParams ? await props.searchParams : {};

  if (session.status === "logged-out") {
    redirect(loginPathFor(searchParams.returnTo));
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }

  return (
    <Suspense fallback={<AppBrandSplash />}>
      <HomeData session={session} searchParams={searchParams} />
    </Suspense>
  );
}
