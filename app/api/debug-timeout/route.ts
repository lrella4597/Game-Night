import { NextResponse } from "next/server";
// TEMPORARY: measures the hosting platform's function time limit. Remove before merging.
export async function GET(req: Request) {
  const s = Math.min(Number(new URL(req.url).searchParams.get("s") || "1"), 40);
  await new Promise((r) => setTimeout(r, s * 1000));
  return NextResponse.json({ slept: s });
}
