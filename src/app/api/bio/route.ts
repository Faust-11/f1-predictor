import { NextResponse, type NextRequest } from "next/server";

import { getConstructorBio, getDriverBio } from "@/lib/data/bio";

// Underlying Jolpica/Wikipedia fetches are cached by revalidate; this header
// additionally caches the assembled response on the Vercel CDN per query.
const CACHE_HEADER = "public, s-maxage=21600, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");

  if (type !== "driver" && type !== "constructor") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const bio =
    type === "driver"
      ? await getDriverBio(params.get("code") ?? "")
      : await getConstructorBio(params.get("name") ?? "");

  if (!bio) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(bio, {
    headers: { "Cache-Control": CACHE_HEADER },
  });
}
