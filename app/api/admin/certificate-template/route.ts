import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeCertificateTemplate } from "@/lib/candidates/certificate-template";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "É necessário entrar como administrador." }, { status: 401 });
  const { data: staff } = await supabase.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (staff?.role !== "admin") return NextResponse.json({ error: "Apenas administradores podem alterar o modelo global." }, { status: 403 });
  let value: unknown;
  try { const body = await request.text(); if (body.length > 20000) throw new Error("large"); value = JSON.parse(body); }
  catch { return NextResponse.json({ error: "Dados inválidos ou muito extensos." }, { status: 400 }); }
  const config = normalizeCertificateTemplate(value);
  const { error } = await supabase.from("candidate_profile_templates").upsert({ template_key: "global", config, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "template_key" });
  if (error) return NextResponse.json({ error: "Não foi possível salvar. Confira se a migração SQL do modelo foi aplicada." }, { status: 500 });
  return NextResponse.json({ config });
}
