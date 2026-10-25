import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
export const dynamic="force-dynamic";
const areas=[["Cursos e disciplinas","/admin/academy/cursos","Catálogo, módulos, aulas e vídeos"],["Trilhas de aprendizagem","/admin/academy/trilhas","Jornadas e progresso"],["Biblioteca acadêmica","/admin/academy/biblioteca","Referências, apostilas e curadoria"]];
export default async function AcademyAdminPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff || !["admin","editor"].includes(staff.role))redirect("/membro");
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">NOVA IBFC ACADEMY</span><h1>Painel acadêmico</h1><p>Estrutura independente do antigo módulo de Trilhas e cursos. Usa as tabelas academy_*.</p></div></div><section className="admin-panel" style={{padding:24}}><h2>Ambiente de implantação</h2><p>A navegação está preparada. Cadastro de conteúdo, publicação e gestão de permissões ainda dependem da próxima etapa técnica.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16,marginTop:20}}>{areas.map(([title,url,detail])=><Link href={url} key={url} className="metric-card" style={{display:"block",padding:20}}><strong>{title}</strong><p>{detail}</p></Link>)}</div></section></AdminShell>
}