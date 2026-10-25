"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Entity = "course"|"module"|"lesson"|"resource";
const slugify=(v:string)=>v.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,96);
const field=(data:FormData,key:string)=>String(data.get(key)??"").trim();
const positive=(data:FormData,key:string)=>Math.max(0,Number.parseInt(field(data,key),10)||0);
const uuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function staffClient(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff || !["admin","editor"].includes(staff.role))throw new Error("Sem permissão administrativa.");
 return db;
}
function resultPath(msg:string,courseId?:string){return "/admin/academy/cursos"+(courseId&&uuid(courseId)?"/"+courseId:"")+"?message="+encodeURIComponent(msg.slice(0,160));}

export async function createAcademyCourse(data:FormData){
 const db=await staffClient(),title=field(data,"title"),slug=slugify(field(data,"slug")||title);
 if(!title||!slug)throw new Error("Título e identificador obrigatórios.");
 const {error}=await db.from("academy_courses").insert({title,slug,summary:field(data,"summary"),cover_url:field(data,"cover_url")||null,estimated_hours:positive(data,"estimated_hours"),status:"draft"});
 if(error)redirect(resultPath("Erro ao criar curso: "+error.message));
 revalidatePath("/admin/academy/cursos");redirect(resultPath("Curso criado como rascunho."));
}
export async function changeAcademyCourseStatus(data:FormData){
 const db=await staffClient(),id=field(data,"id"),status=field(data,"status");
 if(!uuid(id)||!["draft","published","archived"].includes(status))throw new Error("Dados inválidos.");
 const {error}=await db.from("academy_courses").update({status,updated_at:new Date().toISOString()}).eq("id",id);
 if(error)redirect(resultPath(error.message,id));
 revalidatePath("/admin/academy/cursos");redirect(resultPath("Status atualizado.",id));
}
export async function addAcademyModule(data:FormData){
 const db=await staffClient(),courseId=field(data,"course_id"),title=field(data,"title");
 if(!uuid(courseId)||!title)throw new Error("Curso ou título inválido.");
 const {error}=await db.from("academy_modules").insert({course_id:courseId,title,position:positive(data,"position")});
 if(error)redirect(resultPath(error.message,courseId));
 revalidatePath("/admin/academy/cursos/"+courseId);redirect(resultPath("Módulo criado.",courseId));
}
export async function addAcademyLesson(data:FormData){
 const db=await staffClient(),moduleId=field(data,"module_id"),courseId=field(data,"course_id"),title=field(data,"title");
 if(!uuid(moduleId)||!uuid(courseId)||!title)throw new Error("Módulo, curso ou título inválido.");
 const videoProvider=field(data,"video_provider");
 if(videoProvider&&!["youtube","vimeo","external"].includes(videoProvider))throw new Error("Provedor não permitido.");
 const {data:module}=await db.from("academy_modules").select("id").eq("id",moduleId).eq("course_id",courseId).maybeSingle();
 if(!module)throw new Error("O módulo não pertence ao curso.");
 const {error}=await db.from("academy_lessons").insert({module_id:moduleId,title,description:field(data,"description"),position:positive(data,"position"),duration_minutes:positive(data,"duration_minutes"),content_md:field(data,"content_md"),video_provider:videoProvider||null,video_id:field(data,"video_id")||null,video_url:field(data,"video_url")||null,status:"draft"});
 if(error)redirect(resultPath(error.message,courseId));
 revalidatePath("/admin/academy/cursos/"+courseId);redirect(resultPath("Aula criada como rascunho.",courseId));
}
export async function changeAcademyLessonStatus(data:FormData){
 const db=await staffClient(),lessonId=field(data,"lesson_id"),courseId=field(data,"course_id"),status=field(data,"status");
 if(!uuid(lessonId)||!uuid(courseId)||!["draft","published"].includes(status))throw new Error("Dados inválidos.");
 const {data:moduleRows}=await db.from("academy_modules").select("id").eq("course_id",courseId);
 const ids=(moduleRows??[]).map(m=>m.id);
 if(!ids.length)throw new Error("Curso sem módulos.");
 const {error}=await db.from("academy_lessons").update({status}).eq("id",lessonId).in("module_id",ids);
 if(error)redirect(resultPath(error.message,courseId));
 revalidatePath("/admin/academy/cursos/"+courseId);redirect(resultPath("Aula atualizada.",courseId));
}
export async function addAcademyResource(data:FormData){
 const db=await staffClient(),lessonId=field(data,"lesson_id"),courseId=field(data,"course_id"),title=field(data,"title"),type=field(data,"resource_type"),value=field(data,"resource_url");
 if(!uuid(lessonId)||!uuid(courseId)||!title||!["reading","video","exercise","repository","document"].includes(type))throw new Error("Recurso inválido.");
 let url:URL;try{url=new URL(value)}catch{throw new Error("URL inválida");}
 if(!["https:","http:"].includes(url.protocol))throw new Error("URL não permitida.");
 const {error}=await db.from("academy_resources").insert({lesson_id:lessonId,title,resource_url:url.toString(),resource_type:type,attribution:field(data,"attribution"),license_notes:field(data,"license_notes"),checked_at:new Date().toISOString()});
 if(error)redirect(resultPath(error.message,courseId));
 revalidatePath("/admin/academy/cursos/"+courseId);redirect(resultPath("Material adicionado.",courseId));
}
