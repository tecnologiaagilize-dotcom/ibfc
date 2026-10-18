import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Dossier = { id: string; title: string; scope: string; summary: string; status: string; conclusion: string; created_at: string; updated_at: string; created_by: string };
type Evidence = { id: string; evidence_kind: string; reference: string; explanation: string; verification: string; added_at: string; added_by: string };
type Event = { id: number; event_type: string; detail: unknown; occurred_at: string; actor_id: string };
const date = (v: string) => new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const stateLabel: Record<string,string> = { rascunho: "Rascunho", em_analise: "Em análise", revisado: "Revisado", encerrado: "Encerrado", nao_verificado: "Não verificado", em_conferencia: "Em conferência", corroborado: "Corroborado", refutado: "Refutado" };

export default async function DossierReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile, error: profileError } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || !profile || !["admin", "editor"].includes(profile.role)) redirect("/admin");

  const [{ data: dossier, error: dErr }, { data: evidence, error: eErr }, { data: events, error: hErr }] = await Promise.all([
    db.from("ibfc_cmdpii_dossiers").select("id,title,scope,summary,status,conclusion,created_at,updated_at,created_by").eq("id", id).maybeSingle(),
    db.from("ibfc_cmdpii_dossier_evidence").select("id,evidence_kind,reference,explanation,verification,added_at,added_by").eq("dossier_id", id).order("added_at", { ascending: true }).limit(1001),
    db.from("ibfc_cmdpii_dossier_events").select("id,event_type,detail,occurred_at,actor_id").eq("dossier_id", id).order("occurred_at", { ascending: true }).limit(1001),
  ]);
  if (dErr || eErr || hErr) throw new Error("Falha ao consultar dados do dossiê. Verifique a migração da Etapa 6 e as permissões.");
  if (!dossier) notFound();
  const d = dossier as Dossier;
  const es = (evidence ?? []) as Evidence[];
  const hs = (events ?? []) as Event[];
  const incomplete = es.length > 1000 || hs.length > 1000;
  const stamp = date(new Date().toISOString());

  return <main style={{maxWidth:900,margin:"0 auto",padding:"32px 24px",fontFamily:"Arial, sans-serif",color:"#172033",lineHeight:1.5}}>
    <style>{`@media print { @page { size: A4; margin: 16mm; } .no-print { display:none !important; } body { background: white !important; } article, tr { break-inside: avoid; } } @media screen { body { background: #f1f5f9; } } table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: 8px; border: 1px solid #cbd5e1; vertical-align: top; overflow-wrap:anywhere; } th { background:#f1f5f9; } h2 { border-bottom:1px solid #cbd5e1; padding-bottom:6px; margin-top:28px; } p, td, li { overflow-wrap:anywhere; white-space:pre-wrap; }`}</style>
    <nav className="no-print" style={{display:"flex",gap:16,marginBottom:20}}><a href="/admin/cbmdf-cmdpii/financeiro/dossies">← Voltar aos dossiês</a><span>Para exportar: Ctrl+P → Salvar como PDF</span></nav>
    <header><div style={{fontSize:13,letterSpacing:1,fontWeight:700}}>IBFC · CBMDF / CMDP II</div><h1 style={{fontSize:27,marginBottom:8}}>Relatório de dossiê de auditoria</h1><p style={{fontSize:13}}>DOCUMENTO RESTRITO · Uso interno da equipe autorizada</p><p style={{fontSize:13}}>Emitido em {stamp} (horário de Brasília)</p></header>
    {incomplete && <p style={{padding:12,border:"2px solid #b45309"}}><strong>RELATÓRIO PARCIAL:</strong> o dossiê excede 1.000 evidências ou eventos. Não utilize este documento como relatório completo sem exportação paginada.</p>}
    <h2>1. Identificação e escopo</h2>
    <table><tbody><tr><th>Identificador</th><td>{d.id}</td></tr><tr><th>Título</th><td>{d.title}</td></tr><tr><th>Área</th><td>{d.scope}</td></tr><tr><th>Situação</th><td>{stateLabel[d.status] ?? d.status}</td></tr><tr><th>Criado em</th><td>{date(d.created_at)}</td></tr><tr><th>Atualizado em</th><td>{date(d.updated_at)}</td></tr><tr><th>Responsável pelo cadastro (ID)</th><td>{d.created_by}</td></tr></tbody></table>
    <h2>2. Objeto da análise</h2><p>{d.summary}</p>
    <h2>3. Evidências e referências ({es.length > 1000 ? "mais de 1.000" : es.length})</h2>
    {es.length === 0 ? <p>Nenhuma evidência cadastrada.</p> : es.slice(0,1000).map((e,i)=><article key={e.id} style={{borderBottom:"1px solid #cbd5e1",paddingBottom:10}}><h3 style={{fontSize:16}}>{i+1}. {e.evidence_kind} — {stateLabel[e.verification] ?? e.verification}</h3><p><strong>Referência:</strong> {e.reference}</p><p><strong>Contexto:</strong> {e.explanation || "Não informado"}</p><p style={{fontSize:12}}>ID: {e.id} · Registrado: {date(e.added_at)} · Autor (ID): {e.added_by}</p></article>)}
    <h2>4. Conclusão registrada</h2><p>{d.conclusion || "Ainda não há conclusão registrada. O dossiê não deve ser interpretado como apuração concluída."}</p>
    <h2>5. Histórico de auditoria ({hs.length > 1000 ? "mais de 1.000" : hs.length})</h2>
    {hs.length === 0 ? <p>Sem eventos registrados.</p> : <table><thead><tr><th>Data</th><th>Evento</th><th>Responsável (ID)</th></tr></thead><tbody>{hs.slice(0,1000).map(h=><tr key={h.id}><td>{date(h.occurred_at)}</td><td>{h.event_type}</td><td>{h.actor_id}</td></tr>)}</tbody></table>}
    <h2>6. Ressalvas metodológicas</h2><p>Este relatório reproduz registros do sistema na data de emissão. Referências documentais não equivalem a documentos anexados ou autenticados. Classificações como “corroborado” refletem o registro de revisão, não uma perícia independente. Divergências e alegações não comprovam irregularidade ou responsabilidade individual. Conferir os documentos originais e a cadeia de custódia antes de qualquer divulgação.</p>
    <footer style={{borderTop:"1px solid #cbd5e1",marginTop:32,paddingTop:12,fontSize:12}}>Dossiê {d.id} · Emissão {stamp} · Acesso restrito</footer>
  </main>;
}
