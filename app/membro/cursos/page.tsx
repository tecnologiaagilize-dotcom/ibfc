import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {BookOpen,PlayCircle} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Courses(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const {data:courses,error}=await db.from("academy_courses").select("id,title,slug,summary,cover_url,estimated_hours").eq("status","published").order("created_at",{ascending:false});
 const {data:enrollments}=await db.from("academy_enrollments").select("course_id").eq("user_id",user.id);
 const active=new Set((enrollments??[]).map(e=>e.course_id));
 return <main className="member-area"><header className="member-top"><Link href="/" className="member-logo">IBFC <small>ACADEMY</small></Link><Link href="/membro" className="btn btn-secondary">Meu painel</Link></header><section className="member-content"><div className="member-welcome"><div><span>NOVA IBFC ACADEMY</span><h1>Ambiente de aprendizagem</h1><p>Escolha uma formação, matricule-se e acompanhe suas aulas.</p></div></div>
 {error&&<p role="alert">Não foi possível carregar os cursos: {error.message}</p>}
 <div className="course-grid">{(courses??[]).map(c=><article className="course-card" key={c.id}><div className="course-cover"><BookOpen size={42}/></div><div className="course-body"><span className="badge">{c.estimated_hours} horas</span><h2>{c.title}</h2><p>{c.summary||"Curso da IBFC Academy"}</p><Link className="btn btn-primary" href={`/membro/cursos/${c.slug}`}><PlayCircle size={17}/>{active.has(c.id)?"Continuar formação":"Conhecer formação"}</Link></div></article>)}
 {!courses?.length&&<div className="member-panel member-empty"><BookOpen size={42}/><h3>Cursos em preparação</h3><p>Quando um curso for publicado na nova Academy, ele aparecerá aqui.</p></div>}</div></section></main>;
}