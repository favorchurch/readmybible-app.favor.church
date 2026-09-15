import { redirect } from "next/navigation";

/**
 * The admin dashboard now lives inside the app's Leader tab (see
 * components/sections/section-dashboard.tsx). This route is kept as a
 * redirect so old /admin links keep working.
 */
export default function AdminPage() {
  redirect("/?tab=leader");
}
