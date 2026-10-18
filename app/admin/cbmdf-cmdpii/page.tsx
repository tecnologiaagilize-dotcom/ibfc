import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { BookOpen, Building2, FileSearch, Landmark, Scale, ShieldAlert, Users, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";
const sections = [
  { title: "Histórico e unidades", detail: "Cronologia, unidades, atos de criação e expansão.", icon: Building2 },
  { title: "Legislação e boletins", detail: "Normas, portarias, atos e versões documentais.", icon: Scale },
  { title: "Convênios e acordos", detail: "Instrumentos, vigências, aditivos e obrigações.", icon: BookOpen },
  { title: "APAM e COSEA", detail: "Estatutos, assembleias, eleições e competências.", icon: Users },
  { title: "Prestação de contas", detail: "Receitas, despesas, documentos e conciliações.", icon: Wallet },
  { title: "Auditoria e evidências", detail: "Achados, hipóteses, fontes e trilha de revisão.", icon: ShieldAlert },
  { title: "Acervo documental", detail: "Classificação, origem e integridade dos documentos.", icon: FileSearch },
  { title: "Relatórios", detail: "Resultados auditáveis, pendências e encaminhamentos.", icon: Landmark },
];
export default async function CmdpiiPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await db.from("admin_profiles").select("id,role").eq("id",user.id).maybeSingle();
  if (!admin || !["admin","editor"].includes(admin.role)) redirect("/admin");
  const { data, error } = await db.from("ibfc_cmdpii_records").select("id,kind,title,status,created_at").order("created_at",{ascending:false}).limit(12);
  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">OBSERVATÓRIO INSTITUCIONAL</span><h1>CBMDF / CMDP II</h1><p>Governança, transparência, acervo documental e auditoria com rastreabilidade de evidências.</p></div></div>
    <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Áreas de trabalho</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16,marginTop:16}}>{sections.map(({title,detail,icon:Icon})=><div key={title} style={{border:"1px solid var(--border,#d9dfe6)",borderRadius:12,padding:18}}><Icon size={23}/><h3 style={{margin:"12px 0 6px"}}>{title}</h3><p>{detail}</p></div>)}</div></section>
    <section className="admin-panel" style={{padding:24}}><h2>Registros recentes</h2>{error?<p>Banco de dados ainda não configurado. Aplique a migração <code>20261018_ibfc_cmdpii_observatory.sql</code> no Supabase para ativar os registros.</p>:data?.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left",borderCollapse:"collapse"}}><thead><tr><th>Título</th><th>Tipo</th><th>Situação</th><th>Data</th></tr></thead><tbody>{data.map(r=><tr key={r.id}><td style={{padding:8}}>{r.title}</td><td>{r.kind}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div>:<p>Nenhum registro cadastrado. O acervo inicia vazio para evitar dados presumidos ou acusações não verificadas.</p>}<p style={{marginTop:16}}>Classificação obrigatória: relato não verificado, documento recebido, evidência verificada ou conclusão fundamentada. Informações pessoais e materiais sensíveis não devem ser publicados.</p><Link href="/admin" className="btn btn-secondary">Voltar ao painel</Link></section>
  </AdminShell>;
}
