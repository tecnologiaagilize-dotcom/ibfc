"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const kinds = ["historico", "legislacao", "convenio", "governanca", "apam", "cosea", "financeiro", "auditoria", "documento"];
const statuses = ["relato_nao_verificado", "documento_recebido", "evidencia_verificada", "conclusao_fundamentada"];

export async function createCmdpiiRecord(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) throw new Error("Acesso não autorizado.");

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const sourceReference = String(formData.get("source_reference") ?? "").trim();
  const date = String(formData.get("event_date") ?? "");
  if (title.length < 5 || title.length > 250 || !kinds.includes(kind) || description.length > 10000 || sourceReference.length > 2000 || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    redirect("/admin/cbmdf-cmdpii?erro=validacao");
  }
  // Novos registros começam obrigatoriamente como não verificados e restritos.
  const { error } = await db.from("ibfc_cmdpii_records").insert({
    title, kind, description, source_reference: sourceReference, event_date: date || null,
    status: "relato_nao_verificado", visibility: "restrito", created_by: user.id,
  });
  if (error) redirect("/admin/cbmdf-cmdpii?erro=banco");
  revalidatePath("/admin/cbmdf-cmdpii");
  redirect("/admin/cbmdf-cmdpii?sucesso=1");
}

export async function uploadCmdpiiDocument(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) throw new Error("Acesso não autorizado.");
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const source = String(formData.get("source_reference") ?? "").trim();
  if (!(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024 || title.length < 5 || title.length > 250 || source.length > 2000) redirect("/admin/cbmdf-cmdpii?erro=arquivo");
  const allowed = ["application/pdf", "image/jpeg", "image/png", "text/plain"];
  const extension = file.name.toLowerCase().split(".").pop();
  const allowedExt = ["pdf", "jpg", "jpeg", "png", "txt"];
  if (!allowed.includes(file.type) || !allowedExt.includes(extension ?? "")) redirect("/admin/cbmdf-cmdpii?erro=arquivo");
  const recordId = crypto.randomUUID();
  const path = `${user.id}/${recordId}.${extension}`;
  const { error: uploadError } = await db.storage.from("ibfc-cmdpii-evidencias").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect("/admin/cbmdf-cmdpii?erro=storage");
  const { error } = await db.from("ibfc_cmdpii_records").insert({
    id: recordId, kind: "documento", title, description: `Arquivo anexado: ${file.name.slice(0, 180)}`,
    source_reference: source, status: "documento_recebido", visibility: "restrito", created_by: user.id,
  });
  if (error) {
    await db.storage.from("ibfc-cmdpii-evidencias").remove([path]);
    redirect("/admin/cbmdf-cmdpii?erro=banco");
  }
  revalidatePath("/admin/cbmdf-cmdpii");
  redirect("/admin/cbmdf-cmdpii?sucesso=1");
}
