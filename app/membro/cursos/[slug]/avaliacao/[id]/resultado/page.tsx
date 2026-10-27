import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export default async function Result({params,searchParams}:{params:Promise<{slug:string,id:string}>,searchParams:Promise<{attempt?:string}>}){
 const {slug,id}=await params,db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const {data:course}=await db.from("academy_courses").select("id").eq("slug",slug).eq("status","published").maybeSingle();if(!course)redirect("/membro/cursos");
 const {data:assessment}=await db.from("academy_assessments").select("id").eq("id",id).eq("course_id",course.id).maybeSingle();
 if(!assessment)redirect("/membro/cursos/"+slug);
 const requested=(await searchParams).attempt;
 if(requested&&!/^[0-9a-f-]{36}$/i.test(requested))notFound();
 let query=db.from("academy_attempts").select("id,score,passed,created_at,mode").eq("assessment_id",id).eq("user_id",user.id);
 if(requested)query=query.eq("id",requested);
 const {data:attempt}=await query.order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(!attempt)redirect("/membro/cursos/"+slug);
 const {data:responses,error}=await db.from("academy_responses").select("id,prompt,options,selected_option,correct_option,is_correct").eq("attempt_id",attempt.id).eq("user_id",user.id).order("created_at");
 return <main className="member-area"><section className="member-content"><div className="academy-hero"><h1>Resultado da avaliação</h1><h2>{attempt.score}%</h2><p>{attempt.passed?"Meta de acerto alcançada.":"Ainda não aprovado. Revise suas aulas antes de tentar novamente."}</p><p>{attempt.mode==='practice'?'Prática: não emite certificado.':'Avaliação certificadora: emissão sujeita aos requisitos do curso.'}</p>
 {error?<p role="alert">Não foi possível carregar as respostas.</p>:responses?.map(row=><article key={row.id} className="member-panel" style={{padding:16,marginBottom:12}}><h3>{row.is_correct?'Acerto':'Revisar'}: {row.prompt}</h3><p>Sua resposta: {row.options[row.selected_option]}</p><p>Gabarito: {row.options[row.correct_option]}</p></article>)}
 <Link className="btn btn-secondary" href="/membro/revisoes">Meu caderno de erros</Link> <Link className="btn btn-primary" href={`/membro/cursos/${slug}`}>Voltar ao curso</Link></div></section></main>;
}