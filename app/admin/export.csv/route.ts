import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope } from "@/lib/admin/access";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { flattenStatsRows, rowsToCsv } from "@/lib/admin/rows";

export async function GET() {
  const session = await getSessionContext();
  const scope = resolveAdminScope(session);

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
