import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
export const dynamic="force-dynamic";
const sections:Record<string,{title:string,description:string}>={
 cursos:{title:"Cursos e disciplinas",description:"Cursos, módulos, aulas, vídeos e recursos da nova academia."},
 trilhas:{title:"Trilhas de aprendizagem",description:"Estrutura das jornadas de quatro semanas e evolução dos estudantes."},
 biblioteca:{title:"Biblioteca acadêmica",description:"Fontes acadêmicas, vídeos, documentos, atribuição e revisão de materiais."}
};
export default async function AcademySection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;const details=sections[section];if(!details)notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:staff}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!staff || !["admin","editor"].includes(staff.role))redirect("/membro");
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">NOVA IBFC ACADEMY</span><h1>{details.title}</h1><p>{details.description}</p></div></div><section className="admin-panel" style={{padding:24}}><h2>Área em implantação</h2><p>Este espaço foi reservado para o novo módulo academy_* e não utiliza as tabelas legadas de cursos. O editor, a publicação de conteúdo e as políticas administrativas estão em desenvolvimento.</p><Link href="/admin/academy" className="btn btn-secondary">Voltar à Academy</Link></section></AdminShell>;
}