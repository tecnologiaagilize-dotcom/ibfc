import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { createCmdpiiRecord, uploadCmdpiiDocument } from "./actions";

export const dynamic = "force-dynamic";
const categories = [
  ["historico", "Histórico e unidades"], ["legislacao", "Legislação e boletins"],
  ["convenio", "Convênios e acordos"], ["governanca", "Governança"],
  ["apam", "APAM"], ["cosea", "COSEA"], ["financeiro", "Prestação de contas"],
  ["auditoria", "Auditoria e evidências"], ["documento", "Acervo documental"],
];
const statuses: Record<string,string> = {
  relato_nao_verificado: "Relato não verificado", documento_recebido: "Documento recebido",
  evidencia_verificada: "Evidência verificada", conclusao_fundamentada: "Conclusão fundamentada",
};
type SearchParams = Promise<{ erro?: string; sucesso?: string; tipo?: string }>;
export default async function CmdpiiPage({ searchParams }: { searchParams: SearchParams }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: admin } = await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
  if (!admin || !["admin", "editor"].includes(admin.role)) redirect("/admin");
  const params = await searchParams;
  const filter = categories.some(([k]) => k === params.tipo) ? params.tipo : "";
  let query = db.from("ibfc_cmdpii_records").select("id,kind,title,status,source_reference,event_date,created_at").order("created_at",{ascending:false}).limit(100);
  if (filter) query = query.eq("kind",filter);
  const { data, error } = await query;
  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">OBSERVATÓRIO INSTITUCIONAL — ACESSO RESTRITO</span><h1>CBMDF / CMDP II</h1><p>Acervo documental, governança, transparência e auditoria com rastreabilidade.</p></div></div>
    {params.sucesso && <p role="status" style={{padding:12,background:"#dcfce7",color:"#14532d"}}>Registro salvo com sucesso.</p>}
    {params.erro && <p role="alert" style={{padding:12,background:"#fee2e2",color:"#7f1d1d"}}>Não foi possível concluir a operação ({params.erro}). Confira os dados e a configuração do Supabase.</p>}
    <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Novo registro institucional</h2><p>Novos registros são privados e classificados inicialmente como não verificados.</p>
      <form action={createCmdpiiRecord} style={{display:"grid",gap:12,marginTop:16}}>
        <label>Categoria <select name="kind" required style={{display:"block",width:"100%",padding:10}}>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Título <input name="title" minLength={5} maxLength={250} required style={{display:"block",width:"100%",padding:10}} /></label>
        <label>Descrição / contexto <textarea name="description" rows={4} maxLength={10000} style={{display:"block",width:"100%",padding:10}} /></label>
        <label>Referência da fonte / número do processo <input name="source_reference" maxLength={2000} style={{display:"block",width:"100%",padding:10}} /></label>
        <label>Data do fato (opcional) <input type="date" name="event_date" style={{display:"block",padding:10}} /></label>
        <button className="btn btn-primary" type="submit">Salvar registro restrito</button>
      </form>
    </section>
    <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Anexar documento</h2><p>PDF, JPG, PNG ou TXT, até 10 MB. Arquivos armazenados em bucket privado, sem link público.</p>
      <form action={uploadCmdpiiDocument} encType="multipart/form-data" style={{display:"grid",gap:12,marginTop:16}}>
        <label>Título do documento <input name="title" minLength={5} maxLength={250} required style={{display:"block",width:"100%",padding:10}} /></label>
        <label>Origem / referência <input name="source_reference" maxLength={2000} style={{display:"block",width:"100%",padding:10}} /></label>
        <label>Arquivo <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" required style={{display:"block",padding:10}} /></label>
        <button className="btn btn-primary" type="submit">Enviar documento restrito</button>
      </form>
    </section>
    <section className="admin-panel" style={{padding:24}}><h2>Acervo e registros</h2><p>Até 100 registros recentes. A consulta é protegida pelas políticas de acesso do Supabase.</p>
      <form method="get" style={{margin:"14px 0"}}><label>Filtrar categoria <select name="tipo" defaultValue={filter} style={{padding:8,marginLeft:8}}><option value="">Todas</option>{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label> <button type="submit" className="btn btn-secondary">Filtrar</button></form>
      {error ? <p role="alert">Tabela indisponível. Aplique a migração inicial <code>20261018_ibfc_cmdpii_observatory.sql</code> no Supabase.</p> : data?.length ? <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left",borderCollapse:"collapse"}}><thead><tr><th>Título</th><th>Categoria</th><th>Verificação</th><th>Fonte</th><th>Cadastro</th></tr></thead><tbody>{data.map(r=><tr key={r.id}><td style={{padding:8}}>{r.title}</td><td>{categories.find(([key])=>key===r.kind)?.[1] ?? r.kind}</td><td>{statuses[r.status] ?? r.status}</td><td>{r.source_reference || "—"}</td><td>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <p>Nenhum registro cadastrado nesta categoria.</p>}
    </section>
  </AdminShell>;
}
