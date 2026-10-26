import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {completeAcademyLesson} from "../../../actions";
export const dynamic="force-dynamic";
export default async function Lesson({params}:{params:Promise<{slug:string,id:string}>}){
 const {slug,id}=await params,db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/entrar");
 const {data:course}=await db.from("academy_courses").select("id,title,slug").eq("slug",slug).eq("status","published").maybeSingle();
 if(!course)notFound();
 const {data:enroll}=await db.from("academy_enrollments").select("course_id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
 if(!enroll)redirect("/membro/cursos/"+encodeURIComponent(slug));
 const {data:lesson}=await db.from("academy_lessons").select("id,module_id,title,description,content_md,video_provider,video_id,video_url,duration_minutes").eq("id",id).eq("status","published").maybeSingle();
 if(!lesson)notFound();
 const {data:module}=await db.from("academy_modules").select("course_id").eq("id",lesson.module_id).eq("course_id",course.id).maybeSingle();
 if(!module)notFound();
 const {data:resources}=await db.from("academy_resources").select("id,title,resource_url,resource_type,attribution").eq("lesson_id",id);
 const {data:progress}=await db.from("academy_progress").select("lesson_id").eq("lesson_id",id).eq("user_id",user.id).maybeSingle();
 const provider=lesson.video_provider,videoId=lesson.video_id||"";
 const videoSrc=provider==="youtube"&&/^[\w-]{11}$/.test(videoId)?"https://www.youtube-nocookie.com/embed/"+videoId:provider==="vimeo"&&/^\d+$/.test(videoId)?"https://player.vimeo.com/video/"+videoId:null;
 const external=lesson.video_url&&/^https:\/\//i.test(lesson.video_url)?lesson.video_url:null;
 return <main className="member-area"><header className="member-top"><Link className="member-logo" href="/membro/cursos">IBFC <small>ACADEMY</small></Link><Link className="btn btn-secondary" href={`/membro/cursos/${slug}`}>Voltar ao curso</Link></header><section className="member-content">
 <div className="academy-hero"><span className="badge">AULA · {lesson.duration_minutes} MIN</span><h1>{lesson.title}</h1><p>{lesson.description}</p></div>
 <section className="member-panel" style={{padding:24}}>
 {videoSrc?<div style={{aspectRatio:"16 / 9",width:"100%",marginBottom:24}}><iframe title={lesson.title} src={videoSrc} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:"100%",height:"100%",border:0,borderRadius:12}}/></div>:external?<p><a className="btn btn-primary" href={external} target="_blank" rel="noopener noreferrer">Assistir vídeo na plataforma de origem</a></p>:null}
 {lesson.content_md&&<div style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{lesson.content_md}</div>}
 {resources&&resources.length>0&&<div style={{marginTop:24}}><h2>Materiais complementares</h2>{resources.map(r=><p key={r.id}><a href={r.resource_url} target="_blank" rel="noopener noreferrer">{r.title}</a>{r.attribution?" · "+r.attribution:""}</p>)}</div>}
 <div style={{marginTop:24}}>{progress?<p role="status">✓ Aula concluída. Seu progresso foi salvo.</p>:<form action={completeAcademyLesson}><input type="hidden" name="lesson_id" value={id}/><input type="hidden" name="slug" value={slug}/><button className="btn btn-primary">Marcar aula como concluída</button></form>}</div>
 </section></section></main>;
}