import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enrollAcademy} from "../actions";
import {BookOpen,CheckCircle2,PlayCircle} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Course({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/entrar");
 const {data:course}=await db.from("academy_courses").select("id,title,slug,summary,estimated_hours").eq("slug",slug).eq("status","published").maybeSingle();
 if(!course)notFound();
 const {data:enroll}=await db.from("academy_enrollments").select("course_id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
 const {data:modules}=await db.from("academy_modules").select("id,title,position").eq("course_id",course.id).order("position");
 const ids=(modules??[]).map(m=>m.id);
 const {data:lessons}=ids.length?await db.from("academy_lessons").select("id,module_id,title,description,position,duration_minutes").in("module_id",ids).eq("status","published").order("position"):{data:[]};
 const lid=(lessons??[]).map(l=>l.id);
 const {data:progress}=lid.length?await db.from("academy_progress").select("lesson_id").eq("user_id",user.id).in("lesson_id",lid):{data:[]};
 const done=new Set((progress??[]).map(p=>p.lesson_id)),total=lid.length,pct=total?Math.round(100*done.size/total):0;
 return <main className="member-area"><header className="member-top"><Link href="/membro/cursos" className="member-logo">IBFC <small>ACADEMY</small></Link><Link href="/membro" className="btn btn-secondary">Meu painel</Link></header><section className="member-content">
 <div className="academy-hero"><span className="badge">{course.estimated_hours} horas</span><h1>{course.title}</h1><p>{course.summary}</p>
 {enroll?<><div className="progress"><i style={{width:pct+"%"}}/></div><small>{done.size} de {total} aulas concluídas ({pct}%)</small></>:<form action={enrollAcademy}><input type="hidden" name="course_id" value={course.id}/><input type="hidden" name="slug" value={course.slug}/><button className="btn btn-primary">Matricular-me gratuitamente</button></form>}</div>
 <section className="member-panel">{(modules??[]).map(m=><div className="academy-member-module" key={m.id}><h2>{m.position}. {m.title}</h2>{(lessons??[]).filter(l=>l.module_id===m.id).map(l=><div className="academy-member-lesson" key={l.id}>{done.has(l.id)?<CheckCircle2/>:<PlayCircle/>}<div><b>{l.title}</b><small>{l.duration_minutes} minutos {done.has(l.id)?"· Concluída":""}</small></div>{enroll?<Link href={`/membro/cursos/${slug}/aula/${l.id}`} className="btn btn-secondary">Estudar</Link>:<span className="badge">Matricule-se</span>}</div>)}</div>)}{!modules?.length&&<div className="member-empty"><BookOpen size={40}/><h3>Material em preparação</h3></div>}</section>
 </section></main>;
}