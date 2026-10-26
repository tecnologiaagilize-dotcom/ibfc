import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export default async function Result({params}:{params:Promise<{slug:string,id:string}>}){
 const {slug,id}=await params,db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const {data:course}=await db.from("academy_courses").select("id").eq("slug",slug).eq("status","published").maybeSingle();if(!course)redirect("/membro/cursos");
 const {data:assessment}=await db.from("academy_assessments").select("id").eq("id",id).eq("course_id",course.id).maybeSingle();
 if(!assessment)redirect("/membro/cursos/"+slug);
 const {data:attempt}=await db.from("academy_attempts").select("score,passed,created_at").eq("assessment_id",id).eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(!attempt)redirect("/membro/cursos/"+slug);
 return <main className="member-area"><section className="member-content"><div className="academy-hero"><h1>Resultado da avaliação</h1><h2>{attempt.score}%</h2><p>{attempt.passed?"Aprovado. Certificado disponível, se emitido.":"Ainda não aprovado. Revise suas aulas antes de tentar novamente."}</p><Link className="btn btn-primary" href={`/membro/cursos/${slug}`}>Voltar ao curso</Link></div></section></main>;
}