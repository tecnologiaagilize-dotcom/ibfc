"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const route = "/admin/cbmdf-cmdpii/financeiro/alertas";
export async function saveAuditReview(formData: FormData) {
 const db = await createClient();
 const {data:{user}} = await db.auth.getUser();
 if(!user) redirect("/admin/login");
 const {data:profile}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!profile || !["admin","editor"].includes(profile.role)) redirect("/admin");
 const alert_key=String(formData.get("alert_key")??"");
 const alert_type=String(formData.get("alert_type")??"");
 const disposition=String(formData.get("disposition")??"");
 const notes=String(formData.get("notes")??"").trim();
 if(!/^[a-z_]+:[0-9a-f-]{36}(?::[0-9a-f-]{36})?$/.test(alert_key) ||
 !["sem_conciliacao","valor_duplicado","sem_documento","divergencia_revisada"].includes(alert_type) ||
 !["em_analise","justificado","necessita_documentos","encaminhado"].includes(disposition) || notes.length>4000 ||
 !alert_key.startsWith(alert_type+":")) redirect(`${route}?erro=validacao`);
 // Confirma que o alerta aponta para um registro visível existente, sem confiar apenas no formulário.
 const ids=alert_key.slice(alert_type.length+1).split(":");
 const source=alert_type==="sem_conciliacao"||alert_type==="divergencia_revisada"?"ibfc_cmdpii_bank_transactions":"ibfc_cmdpii_financial_entries";
 const {data:sourceRow,error:sourceError}=await db.from(source).select("id").eq("id",ids[0]).maybeSingle();
 if(sourceError||!sourceRow) redirect(`${route}?erro=referencia`);
 const {data:existing}=await db.from("ibfc_cmdpii_audit_reviews").select("id").eq("alert_key",alert_key).maybeSingle();
 const payload={disposition,notes,reviewed_by:user.id};
 const result=existing?await db.from("ibfc_cmdpii_audit_reviews").update(payload).eq("id",existing.id):
 await db.from("ibfc_cmdpii_audit_reviews").insert({...payload,alert_key,alert_type});
 if(result.error) redirect(`${route}?erro=banco`);
 revalidatePath(route);redirect(`${route}?sucesso=1`);
}
