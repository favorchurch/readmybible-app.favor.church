import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope } from "@/lib/admin/access";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { flattenStatsRows, rowsToCsv } from "@/lib/admin/rows";
import { initialTestModeState, scopeForRole } from "@/components/test-mode/logic";

export async function GET(request: Request) {
  const session = await getSessionContext();
  let scope = resolveAdminScope(session);

  const url = new URL(request.url);
  const isDev = process.env.NODE_ENV !== "production";
  const testScope = url.searchParams.get("scope");
  const allowsSimulation = isDev || (url.searchParams.get("test") === "1" && scope !== null);
  if (testScope && allowsSimulation) {
    if (testScope === "cluster") scope = { kind: "sections", rootIds: scopeForRole("cluster", 1).rootIds! };
    else if (testScope === "region") scope = { kind: "sections", rootIds: scopeForRole("regional", 1).rootIds! };
    else if (testScope === "department") {
      const campus = initialTestModeState(
        new URLSearchParams(`campus=${url.searchParams.get("campus") ?? ""}`),
      ).campus;
      scope = { kind: "sections", rootIds: scopeForRole("department", campus).rootIds! };
    } else if (testScope === "global") scope = { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] };
  }

  if (!scope) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sections = await loadSectionSubtree(scope.rootIds);
  const { sections: statsSections } = await loadAdminStats(sections);
  const csv = rowsToCsv(flattenStatsRows(statsSections));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="connect-group-progress.csv"',
    },
  });
}
