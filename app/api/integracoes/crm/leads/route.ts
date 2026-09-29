import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const statuses = new Set(["bot_active", "human_requested", "human_active", "closed"]);

function authorized(request: NextRequest) {
  const expected = process.env.IBFC_CRM_API_TOKEN;
  const supplied = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b);
}
function response(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStore });
}

// O CRM consulta apenas inscrições com autorização explícita para WhatsApp.
// Repetições são esperadas: usar member_id como chave idempotente no CRM.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return response({ error: "Não autorizado" }, 401);
  try {
    const db = createAdminClient();
    const { data: leads, error } = await db.from("ibfc_leads")
      .select("member_id,source,interest,whatsapp_opt_in,updates_opt_in,consent_version,consent_at,status,created_at")
      .eq("whatsapp_opt_in", true).eq("status", "received")
      .order("created_at", { ascending: true }).limit(100);
    if (error) throw error;
    const ids = (leads ?? []).map(lead => lead.member_id);
    const profiles = ids.length ? await db.from("member_profiles")
      .select("id,full_name,whatsapp,state_uf,city").in("id", ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data ?? []).map(profile => [profile.id, profile]));
    return response({ leads: (leads ?? []).filter(lead => byId.get(lead.member_id)?.whatsapp)
      .map(lead => ({ ...lead, profile: byId.get(lead.member_id) })) }, 200);
  } catch {
    return response({ error: "Integração indisponível" }, 503);
  }
}

// Retorno de estado do CRM; encaminhamento humano é um estado explícito.
export async function POST(request: NextRequest) {
  if (!authorized(request)) return response({ error: "Não autorizado" }, 401);
  let input: unknown;
  try { input = await request.json(); } catch { return response({ error: "JSON inválido" }, 400); }
  if (!input || typeof input !== "object") return response({ error: "Dados inválidos" }, 400);
  const { member_id, status } = input as Record<string, unknown>;
  if (typeof member_id !== "string" || !/^[0-9a-f-]{36}$/i.test(member_id) || typeof status !== "string" || !statuses.has(status))
    return response({ error: "Identificador ou estado inválido" }, 400);
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("ibfc_leads")
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq("member_id", member_id).eq("whatsapp_opt_in", true).select("member_id").maybeSingle();
    if (error) throw error;
    if (!data) return response({ error: "Inscrição não encontrada ou sem autorização" }, 404);
    const event = await db.from("ibfc_lead_events").insert({ member_id, status, source: "crm" });
    if (event.error) throw event.error;
    return response({ ok: true }, 200);
  } catch { return response({ error: "Não foi possível atualizar o atendimento" }, 503); }
}
