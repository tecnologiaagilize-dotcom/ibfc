import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, LockKeyhole, FileText } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjetoPartidarioPage() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const {data:admin} = await db.from("admin_profiles").select("id").eq("id",user.id).maybeSingle();
  if (!admin) redirect("/membro");

  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">ACESSO ADMINISTRATIVO</span><h1>Projeto de criação de partido</h1><p>Área interna de planejamento. A coleta de apoio permanece desativada.</p></div></div>
    <div className="metric-grid">
      <article className="metric-card"><div className="metric-icon"><LockKeyhole/></div><div><strong>Fechado</strong><span>Cadastro de apoiamento</span></div></article>
      <article className="metric-card"><div className="metric-icon"><ShieldCheck/></div><div><strong>Inativo</strong><span>Fila e código do e‑Título</span></div></article>
    </div>
    <section className="admin-panel" style={{padding:24,marginTop:22}}>
      <div className="panel-title"><div><h2>Preparação interna</h2><p>O portal do instituto e o cadastro dos membros funcionam separadamente deste projeto.</p></div><FileText/></div>
      <ol style={{lineHeight:1.9,paddingLeft:22}}>
        <li>Definir a agremiação em formação e a equipe responsável.</li>
        <li>Conferir requisitos, acesso e procedimentos atuais do SAPF com a Justiça Eleitoral.</li>
        <li>Revisar o texto de consentimento, a privacidade dos dados e o atendimento humano.</li>
        <li>Testar a jornada antes de decidir quando habilitar a coleta.</li>
      </ol>
      <p><a href="https://www.tse.jus.br/partidos/criacao-de-partido/sistema-de-apoiamento-a-partidos-em-formacao-sapf" target="_blank" rel="noopener noreferrer">Consultar a página oficial do SAPF ↗</a></p>
      <Link href="/admin" className="btn btn-secondary">Voltar ao painel</Link>
    </section>
  </AdminShell>;
}
