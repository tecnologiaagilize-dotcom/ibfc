"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function submitAcademyAssessment(formData:FormData){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const assessmentId=String(formData.get("assessment_id")||""),slug=String(formData.get("slug")||"");
 if(!/^[0-9a-f-]{36}$/i.test(assessmentId)||!/^[a-z0-9-]{1,100}$/.test(slug))throw new Error("Avaliação inválida.");
 const {data:questions,error:qError}=await db.rpc("academy_get_questions",{p_assessment:assessmentId});
 if(qError||!questions?.length)throw new Error("Questões indisponíveis.");
 const answers:Record<string,number>={};
 for(const q of questions){const answer=formData.get(q.id);if(typeof answer!=="string"||!/^[0-9]+$/.test(answer)||Number(answer)>=q.options.length)throw new Error("Responda todas as questões.");answers[q.id]=Number(answer);}
 const {data,error}=await db.rpc("academy_submit_assessment",{p_assessment:assessmentId,p_answers:answers});
 if(error)redirect("/membro/cursos/"+encodeURIComponent(slug)+"/avaliacao/"+assessmentId+"?error="+encodeURIComponent(error.message));
 const result=data?.[0];
 if(!result)throw new Error("Não foi possível registrar resultado.");
 redirect("/membro/cursos/"+encodeURIComponent(slug)+"/avaliacao/"+assessmentId+"/resultado?score="+result.score+"&passed="+Boolean(result.passed));
}
