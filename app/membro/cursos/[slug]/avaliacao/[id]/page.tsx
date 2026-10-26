import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {submitAcademyAssessment} from "./submit";
export const dynamic="force-dynamic";
export default async function Assessment({params}:{params:Promise<{slug:string,id:string}>}){
 const {slug,id}=await params,db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/entrar");
 const {data:course}=await db.from("academy_courses").select("id,title").eq("slug",slug).eq("status","published").maybeSingle();
 if(!course)notFound();
 const {data:enroll}=await db.from("academy_enrollments").select("user_id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
 if(!enroll)redirect("/membro/cursos/"+encodeURIComponent(slug));
 const {data:assessment}=await db.from("academy_assessments").select("id,title,passing_score").eq("id",id).eq("course_id",course.id).eq("status","published").maybeSingle();
 if(!assessment)notFound();
 const {data:questions,error}=await db.rpc("academy_get_questions",{p_assessment:id});
 if(error)return <main className="member-area"><p role="alert">Não foi possível carregar a avaliação: {error.message}</p></main>;
 return <main className="member-area"><header className="member-top"><Link href={`/membro/cursos/${slug}`} className="member-logo">IBFC <small>ACADEMY</small></Link></header><section className="member-content"><div className="academy-hero"><span className="badge">AVALIAÇÃO</span><h1>{assessment.title}</h1><p>Nota mínima: {assessment.passing_score}%</p></div>
 <form action={submitAcademyAssessment} className="member-panel" style={{padding:24}}>
 <input type="hidden" name="assessment_id" value={id}/><input type="hidden" name="slug" value={slug}/>
 {(questions??[]).map((q:{id:string;position:number;prompt:string;options:string[]})=><fieldset key={q.id} style={{border:0,marginBottom:24}}><legend><strong>{q.position}. {q.prompt}</strong></legend>{q.options.map((option,index)=><label key={index} style={{display:"block",marginTop:10}}><input type="radio" name={q.id} value={index} required/> {option}</label>)}</fieldset>)}
 {questions?.length?<button className="btn btn-primary">Enviar avaliação</button>:<p>Ainda não há questões publicadas.</p>}
 </form></section></main>;
}