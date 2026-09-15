import { NextResponse } from "next/server";

import { getPassage, isTranslation, TRANSLATIONS } from "@/lib/scripture";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const translation = searchParams.get("t");

  if (!ref) {
    return NextResponse.json({ error: "ref is required" }, { status: 400 });
  }
  if (!isTranslation(translation)) {
    return NextResponse.json({ error: `t must be one of ${TRANSLATIONS.join(", ")}` }, { status: 400 });
  }

  const result = await getPassage(ref, translation);

  // A hit is immutable and worth caching for a day. A miss is not: it usually
  // means a live chapter fetch failed, and caching that for 24 hours pins the
  // reader to an empty chapter long after the upstream recovered. Cache the
  // scripture, never the outage.
  const cacheControl = result.verses ? "public, max-age=86400" : "no-store";

  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}
