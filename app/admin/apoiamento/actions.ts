"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
async function staff() {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user) redirect("/admin/login");
 const {data}=await db.from("admin_profiles").select("id").eq("id",user.id).maybeSingle();
 if(!data) redirect("/membro");
 return db;
}
export async function claim(form:FormData){
 const db=await staff(); const {error}=await db.rpc("ibfc_sapf_claim",{p_id:String(form.get("id")||"")});
 if(error) redirect("/admin/apoiamento?erro=ocupado");
 revalidatePath("/admin/apoiamento");redirect("/admin/apoiamento");
}
export async function finish(form:FormData){
 const db=await staff(); const result=String(form.get("result")||"");
 if(!["submitted","rejected","waiting"].includes(result)) redirect("/admin/apoiamento?erro=resultado");
 const {error}=await db.rpc("ibfc_sapf_finish",{p_id:String(form.get("id")||""),p_result:result});
 if(error) redirect("/admin/apoiamento?erro=finalizar");
 revalidatePath("/admin/apoiamento");revalidatePath("/membro/apoiamento");redirect("/admin/apoiamento");
}
