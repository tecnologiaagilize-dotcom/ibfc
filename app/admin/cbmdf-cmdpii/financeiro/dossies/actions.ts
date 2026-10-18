"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const route = "/admin/cbmdf-cmdpii/financeiro/dossies";
async function authorized() {
 const db = await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) redirect("/admin/login");
 const {data:p}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!p||!["admin","editor"].includes(p.role)) redirect("/admin");
 return {db,user};
}
export async function createDossier(form:FormData) {
 const {db,user}=await authorized();
 const title=String(form.get("title")??"").trim(), summary=String(form.get("summary")??"").trim(), scope=String(form.get("scope")??"");
 if(title.length<8||title.length>200||summary.length<20||summary.length>6000||!["APAM","COSEA","CMDP II","CBMDF","Outro"].includes(scope)) redirect(`${route}?erro=validacao`);
 const {error}=await db.from("ibfc_cmdpii_dossiers").insert({title,summary,scope,created_by:user.id});
 if(error) redirect(`${route}?erro=banco`);
 revalidatePath(route);redirect(`${route}?sucesso=1`);
}
export async function addEvidence(form:FormData) {
 const {db,user}=await authorized();
 const dossier_id=String(form.get("dossier_id")??""),evidence_kind=String(form.get("evidence_kind")??""),reference=String(form.get("reference")??"").trim(),explanation=String(form.get("explanation")??"").trim(),verification=String(form.get("verification")??"");
 if(!/^[0-9a-f-]{36}$/i.test(dossier_id)||!["documento","lancamento","extrato","alerta","outra_referencia"].includes(evidence_kind)||reference.length<3||reference.length>500||explanation.length>3000||!["nao_verificado","em_conferencia","corroborado","refutado"].includes(verification)) redirect(`${route}?erro=validacao`);
 const {data:d}=await db.from("ibfc_cmdpii_dossiers").select("id,status").eq("id",dossier_id).maybeSingle();
 if(!d||d.status==="encerrado") redirect(`${route}?erro=estado`);
 const {error}=await db.from("ibfc_cmdpii_dossier_evidence").insert({dossier_id,evidence_kind,reference,explanation,verification,added_by:user.id});
 if(error) redirect(`${route}?erro=banco`);
 revalidatePath(route);redirect(`${route}?sucesso=1`);
}
export async function updateDossier(form:FormData) {
 const {db}=await authorized();
 const id=String(form.get("dossier_id")??""),status=String(form.get("status")??""),conclusion=String(form.get("conclusion")??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["rascunho","em_analise","revisado","encerrado"].includes(status)||conclusion.length>8000||(status==="encerrado"&&conclusion.length<30))redirect(`${route}?erro=validacao`);
 const {data:current}=await db.from("ibfc_cmdpii_dossiers").select("status").eq("id",id).maybeSingle();
 if(!current||current.status==="encerrado")redirect(`${route}?erro=estado`);
 const {error}=await db.from("ibfc_cmdpii_dossiers").update({status,conclusion}).eq("id",id);
 if(error)redirect(`${route}?erro=banco`);
 revalidatePath(route);redirect(`${route}?sucesso=1`);
}
