import { NextResponse } from "next/server";

import { getPassage, isTranslation } from "@/lib/scripture";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const translation = searchParams.get("t");

  if (!ref) {
    return NextResponse.json({ error: "ref is required" }, { status: 400 });
  }
  if (!isTranslation(translation)) {
    return NextResponse.json({ error: "t must be one of NET, ESV, CSB, NIV, NLT" }, { status: 400 });
  }

  const result = await getPassage(ref, translation);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
