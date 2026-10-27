"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function submitAcademyAssessment(formData:FormData){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)redirect("/entrar");
 const assessmentId=String(formData.get("assessment_id")||""),slug=String(formData.get("slug")||"");
 if(!/^[0-9a-f-]{36}$/i.test(assessmentId)||!/^[a-z0-9-]{1,100}$/.test(slug))throw new Error("Avaliação inválida.");
 const requestId=String(formData.get("request_id")||""),mode=String(formData.get("mode")||"");
 if(!/^[0-9a-f-]{36}$/i.test(requestId)||!["practice","assessment"].includes(mode))throw new Error("Envio inválido.");
 const {data:course}=await db.from("academy_courses").select("id").eq("slug",slug).eq("status","published").maybeSingle();
 const {data:parent}=course?await db.from("academy_assessments").select("id").eq("id",assessmentId).eq("course_id",course.id).maybeSingle():{data:null};
 if(!parent)throw new Error("A avaliação não pertence ao curso.");
 const {data:questions,error:qError}=await db.rpc("academy_get_questions",{p_assessment:assessmentId});
 if(qError||!questions?.length)throw new Error("Questões indisponíveis.");
 const answers:Record<string,number>={};
 for(const q of questions){const answer=formData.get(q.id);if(typeof answer!=="string"||!/^[0-9]+$/.test(answer)||Number(answer)>=q.options.length)throw new Error("Responda todas as questões.");answers[q.id]=Number(answer);}
 const {data,error}=await db.rpc("academy_submit_assessment",{p_assessment:assessmentId,p_answers:answers,p_request:requestId,p_mode:mode});
 if(error)redirect("/membro/cursos/"+encodeURIComponent(slug)+"/avaliacao/"+assessmentId+"?error="+encodeURIComponent(error.message));
 const result=data?.[0];
 if(!result)throw new Error("Não foi possível registrar resultado.");
 redirect("/membro/cursos/"+encodeURIComponent(slug)+"/avaliacao/"+assessmentId+"/resultado?attempt="+encodeURIComponent(result.attempt_id));
}
