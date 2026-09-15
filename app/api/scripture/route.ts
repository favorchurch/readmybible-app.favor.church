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

  // A complete answer is immutable and worth caching for a day. A miss is not,
  // and neither is the key-passage fallback: both mean a live chapter fetch
  // just failed, and caching either for 24 hours pins the reader to a blank or
  // three-verse day long after the upstream recovered. Cache the scripture,
  // never the outage -- which is why the fallback carries its own source value
  // rather than reporting itself as ordinary bundled text.
  const degraded = result.verses === null || result.source === "key-passage-fallback";
  const cacheControl = degraded ? "no-store" : "public, max-age=86400";

  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}
