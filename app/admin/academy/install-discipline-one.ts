"use server";

import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import disciplineOne from "@/lib/academy/discipline-one.json";

export async function installAcademyDisciplineOne(form:FormData){
 const courseId=String(form.get("course_id")??"");
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId))throw new Error("Curso inválido.");
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/admin/login");
 const {data:staff,error:staffError}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(staffError||!staff||!["admin","editor"].includes(staff.role))throw new Error("Sem permissão administrativa.");
 const path="/admin/academy/cursos/"+courseId;
 // The RPC rechecks authorization and course identity, and rolls back all writes on conflict.
 const {data,error}=await db.rpc("academy_install_discipline_one",{p_course:courseId,p_package:disciplineOne});
 if(error){
  const message=error.code==="PGRST202"
   ?"Instalador indisponível. Aplique e valide a migração 20261109 na homologação antes de instalar."
   :"Disciplina não instalada: "+error.message;
  redirect(path+"?message="+encodeURIComponent(message.slice(0,500)));
 }
 revalidatePath(path);
 revalidatePath("/admin/academy/cursos");
 const message=`Disciplina 1 em rascunho: ${data.inserted} aulas criadas, ${data.upgraded} aula inicial atualizada, ${data.unchanged} preservadas. Total: 8 aulas / 20 h. Conteúdo não publicado.`;
 redirect(path+"?message="+encodeURIComponent(message));
}
