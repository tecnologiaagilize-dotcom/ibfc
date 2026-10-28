import Link from "next/link";
import {redirect} from "next/navigation";
import {AdminShell} from "@/components/admin/AdminShell";
import {createClient} from "@/lib/supabase/server";
import {createIntelligenceTopic,changeIntelligenceStatus} from "./actions";
export const dynamic="force-dynamic";
const statuses=[["not_started","Não iniciado"],["studying","Estudando"],["reviewing","Revisando"],["mastered","Dominado"]];
export default async function IntelligencePage(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff||!["admin","editor"].includes(staff.role))redirect("/membro");
 const {data:topics,error}=await db.from("academy_intelligence_topics").select("id,title,status,source_document,source_section,source_page").order("created_at",{ascending:false}).limit(200);
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">IBFC INTELLIGENCE</span><h1>Engenharia de editais</h1><p>Matriz auditável de conteúdos e checklist de preparação.</p></div><Link href="/admin/academy" className="btn btn-secondary">Voltar</Link></div>
 <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Adicionar assunto</h2><p>Transcreva somente assuntos conferidos no documento oficial. Sem referência, o assunto permanece pendente de verificação.</p>
 <form action={createIntelligenceTopic} className="course-form"><label>Assunto<input name="title" className="field" required maxLength={240}/></label><label>Documento oficial<input name="source_document" className="field" placeholder="Edital nº ..."/></label><label>Seção do edital<input name="source_section" className="field" placeholder="16.1"/></label><label>Página<input name="source_page" className="field" type="number" min="1"/></label><button className="btn btn-primary">Salvar assunto</button></form></section>
 <section className="admin-panel" style={{padding:24}}><h2>Matriz de estudos</h2>{error&&<p role="alert">Não foi possível carregar os assuntos. A migração do banco pode estar pendente: {error.message}</p>}
 {(topics??[]).map(topic=><article key={topic.id} style={{borderBottom:"1px solid #ddd",padding:"12px 0"}}><strong>{topic.title}</strong><p>{topic.source_document&&topic.source_section?`Fonte: ${topic.source_document} · seção ${topic.source_section}${topic.source_page?` · pág. ${topic.source_page}`:""}`:"Referência pendente de verificação"}</p><form action={changeIntelligenceStatus} style={{display:"flex",gap:12,alignItems:"center"}}><input type="hidden" name="id" value={topic.id}/><label>Situação <select name="status" defaultValue={topic.status}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="btn btn-secondary">Atualizar</button></form></article>)}
 {!topics?.length&&!error&&<p>Nenhum assunto cadastrado.</p>}</section></AdminShell>;
}
