import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL || "NOT_FOUND",
    ANON_KEY_PRESENT: !!process.env.SUPABASE_ANON_KEY,
  });
}
