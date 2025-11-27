import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente de servidor: usa la service role key si está definida (para saltar RLS en el backend)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!
);

// =====================
//      GET SALES
// =====================
export async function GET() {
  try {
    const { data, error } = await supabase.from("sales").select("*");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // El cliente espera un objeto { sales: [...] }
    return NextResponse.json({ sales: data }, { status: 200 });
  } catch (err: any) {
    console.error("Server GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// =====================
//      POST SALES
// =====================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase.from("sales").insert(body).select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("Server POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
