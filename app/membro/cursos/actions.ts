"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
const valid=(s:string)=>/^[0-9a-f-]{36}$/i.test(s);
export async function enrollAcademy(data:FormData){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const courseId=String(data.get("course_id")||""),slug=String(data.get("slug")||"");
 if(!valid(courseId))throw new Error("Curso inválido.");
 const {data:course}=await db.from("academy_courses").select("id,slug").eq("id",courseId).eq("slug",slug).eq("status","published").maybeSingle();
 if(!course)throw new Error("Curso não disponível.");
 const {error}=await db.from("academy_enrollments").upsert({user_id:user.id,course_id:courseId},{onConflict:"course_id,user_id",ignoreDuplicates:true});
 if(error)throw new Error("Matrícula não concluída: "+error.message);
 revalidatePath("/membro/cursos");redirect("/membro/cursos/"+encodeURIComponent(slug));
}
export async function completeAcademyLesson(data:FormData){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const lessonId=String(data.get("lesson_id")||""),slug=String(data.get("slug")||"");
 if(!valid(lessonId))throw new Error("Aula inválida.");
 const {data:lesson}=await db.from("academy_lessons").select("id,module_id,status").eq("id",lessonId).eq("status","published").maybeSingle();
 if(!lesson)throw new Error("Aula indisponível.");
 const {data:module}=await db.from("academy_modules").select("course_id").eq("id",lesson.module_id).maybeSingle();
 const {data:course}=module?await db.from("academy_courses").select("id,slug").eq("id",module.course_id).eq("slug",slug).eq("status","published").maybeSingle():{data:null};
 if(!course)throw new Error("Curso indisponível.");
 const {data:enrollment}=await db.from("academy_enrollments").select("course_id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
 if(!enrollment)throw new Error("É necessário estar matriculado.");
 const {error}=await db.from("academy_progress").upsert({user_id:user.id,lesson_id:lessonId},{onConflict:"user_id,lesson_id",ignoreDuplicates:true});
 if(error)throw new Error("Progresso não registrado: "+error.message);
 revalidatePath("/membro/cursos/"+slug);redirect("/membro/cursos/"+encodeURIComponent(slug)+"/aula/"+lessonId);
}
