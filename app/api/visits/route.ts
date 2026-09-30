import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function brazilDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }

  const today = brazilDay();
  const alreadyCounted = request.cookies.get("mfb_visit_day")?.value === today;
  const supabase = await createClient();

  if (!alreadyCounted) {
    const { error } = await supabase.rpc("record_site_visit");
    if (error) return NextResponse.json({ error: "Contador indisponível." }, { status: 503 });
  }

  const { data, error } = await supabase.from("site_visit_days").select("visit_count");
  if (error) return NextResponse.json({ error: "Contador indisponível." }, { status: 503 });

  const total = (data ?? []).reduce((sum, row) => sum + Number(row.visit_count || 0), 0);
  const response = NextResponse.json({ total }, { headers: { "Cache-Control": "no-store" } });
  if (!alreadyCounted) {
    response.cookies.set("mfb_visit_day", today, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 60 * 60 * 25,
    });
  }
  return response;
}
