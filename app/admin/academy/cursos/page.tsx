import Link from "next/link";
import {redirect} from "next/navigation";
import {AdminShell} from "@/components/admin/AdminShell";
import {createClient} from "@/lib/supabase/server";
import {createAcademyCourse} from "@/app/admin/academy/actions";
export const dynamic="force-dynamic";
export default async function Courses({searchParams}:{searchParams:Promise<{message?:string}>}){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff||!["admin","editor"].includes(staff.role))redirect("/membro");
 const {data:courses,error}=await db.from("academy_courses").select("id,title,slug,status,estimated_hours").order("created_at",{ascending:false});
 const {message}=await searchParams;
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">IBFC ACADEMY</span><h1>Cursos e disciplinas</h1><p>Nova estrutura acadêmica academy_*, sem tabelas antigas.</p></div></div>
 {message&&<p role="status">{message}</p>}
 {error&&<p role="alert">Falha no catálogo: {error.message}. Verifique as políticas de acesso e a migração.</p>}
 <section className="admin-panel" style={{padding:24,marginBottom:24}}><h2>Criar curso</h2><form action={createAcademyCourse} className="course-form">
 <label>Título<input className="field" name="title" required/></label><label>Identificador (opcional)<input className="field" name="slug" placeholder="introducao-tecnologia-ia"/></label>
 <label>Descrição<textarea className="field" name="summary"/></label>
 <label>URL da capa<input className="field" name="cover_url" type="url"/></label>
 <label>Carga horária<input className="field" name="estimated_hours" type="number" defaultValue={40} min={0}/></label>
 <button className="btn btn-primary">Criar rascunho</button></form></section>
 <section className="admin-panel" style={{padding:24}}><h2>Cursos cadastrados</h2>
 {(courses??[]).map(c=><div key={c.id} style={{display:"flex",gap:16,justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #ddd"}}><div><b>{c.title}</b><p>{c.status} · {c.estimated_hours} horas</p></div><Link href={`/admin/academy/cursos/${c.id}`} className="btn btn-secondary">Estruturar</Link></div>)}
 {!courses?.length&&<p>Nenhum curso cadastrado na nova Academy.</p>}</section></AdminShell>;
}