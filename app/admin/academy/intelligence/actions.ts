"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const path = "/admin/academy/intelligence";
async function staff() {
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) redirect("/admin/login");
 const {data:profile}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!profile || !["admin","editor"].includes(profile.role)) throw new Error("Acesso restrito.");
 return {db,user};
}
export async function createIntelligenceTopic(form:FormData) {
 const {db,user}=await staff();
 const title=String(form.get("title")??"").trim();
 const document=String(form.get("source_document")??"").trim();
 const section=String(form.get("source_section")??"").trim();
 const rawPage=String(form.get("source_page")??"").trim();
 const page=rawPage?Number(rawPage):null;
 if(!title || title.length>240 || (!!document !== !!section) || (page!==null && (!Number.isInteger(page)||page<1))) throw new Error("Assunto ou referência inválida.");
 const {error}=await db.from("academy_intelligence_topics").insert({
  title,source_document:document||null,source_section:section||null,source_page:page,created_by:user.id
 });
 if(error) throw new Error("Falha ao salvar assunto: "+error.message);
 revalidatePath(path);
}
export async function changeIntelligenceStatus(form:FormData) {
 const {db}=await staff();
 const id=String(form.get("id")??"");
 const status=String(form.get("status")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["not_started","studying","reviewing","mastered"].includes(status)) throw new Error("Dados inválidos.");
 const {error}=await db.from("academy_intelligence_topics").update({status}).eq("id",id);
 if(error) throw new Error("Falha ao atualizar: "+error.message);
 revalidatePath(path);
}
