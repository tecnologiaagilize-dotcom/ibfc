import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

type Entry = { id: string; entry_type: string; amount: number; transaction_date: string };
type Bank = { id: string; review_status: string; financial_entry_id: string | null };
type Review = { id: string; disposition: string };
type Dossier = { id: string; title: string; status: string; scope: string; created_at: string };
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const label = (s: string) => ({ rascunho: "Rascunho", em_analise: "Em análise", revisado: "Revisado", encerrado: "Encerrado", pendente: "Pendente", conciliado: "Conciliado", divergente: "Divergente" }[s] ?? s.replaceAll("_", " "));
const box: React.CSSProperties = { border: "1px solid #94a3b855", borderRadius: 12, padding: 18, minWidth: 0 };

export default async function PainelAuditoriaPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) redirect("/admin");

  // Contagens são consultadas no banco; somatórios monetários são explicitamente limitados à amostra.
  const [entriesResult, banksResult, reviewsResult, dossiersResult, entriesCount, banksCount, reviewsCount, dossiersCount] = await Promise.all([
    db.from("ibfc_cmdpii_financial_entries").select("id,entry_type,amount,transaction_date").order("transaction_date", { ascending: false }).limit(1000),
    db.from("ibfc_cmdpii_bank_transactions").select("id,review_status,financial_entry_id").limit(1000),
    db.from("ibfc_cmdpii_audit_reviews").select("id,disposition").limit(1000),
    db.from("ibfc_cmdpii_dossiers").select("id,title,status,scope,created_at").order("created_at", { ascending: false }).limit(1000),
    db.from("ibfc_cmdpii_financial_entries").select("id", { count: "exact", head: true }),
    db.from("ibfc_cmdpii_bank_transactions").select("id", { count: "exact", head: true }),
    db.from("ibfc_cmdpii_audit_reviews").select("id", { count: "exact", head: true }),
    db.from("ibfc_cmdpii_dossiers").select("id", { count: "exact", head: true }),
  ]);
  const hasErrors = [entriesResult, banksResult, reviewsResult, dossiersResult, entriesCount, banksCount, reviewsCount, dossiersCount].some(x => x.error);
  const entries = (entriesResult.data ?? []) as Entry[];
  const banks = (banksResult.data ?? []) as Bank[];
  const reviews = (reviewsResult.data ?? []) as Review[];
  const dossiers = (dossiersResult.data ?? []) as Dossier[];
  const receita = entries.filter(x => x.entry_type === "receita").reduce((s, x) => s + Number(x.amount), 0);
  const despesa = entries.filter(x => x.entry_type === "despesa").reduce((s, x) => s + Number(x.amount), 0);
  const byStatus = (items: { status: string }[], status: string) => items.filter(x => x.status === status).length;
  const bankStatus = (status: string) => banks.filter(x => x.review_status === status).length;
  const reviewStatus = (status: string) => reviews.filter(x => x.disposition === status).length;
  const monthly = new Map<string, { receita: number; despesa: number }>();
  for (const e of entries) {
    const key = e.transaction_date?.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key ?? "")) continue;
    const row = monthly.get(key) ?? { receita: 0, despesa: 0 };
    if (e.entry_type === "receita" || e.entry_type === "despesa") row[e.entry_type] += Number(e.amount);
    monthly.set(key, row);
  }
  const months = [...monthly.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 12).reverse();
  const max = Math.max(1, ...months.flatMap(([, v]) => [v.receita, v.despesa]));

  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">ACESSO RESTRITO</span><h1>Painel gerencial — CBMDF / CMDP II</h1><p>Visão operacional da auditoria financeira da APAM. Indicadores não constituem conclusão de irregularidade.</p><Link href="/admin/cbmdf-cmdpii/financeiro">← Auditoria financeira</Link></div></div>
    {hasErrors && <p role="alert" style={{ ...box, borderColor: "#dc2626" }}>Uma ou mais consultas falharam. Verifique as migrações das etapas 3 a 6 e as permissões do Supabase. Não utilize números parciais como relatório completo.</p>}
    <section className="admin-panel" style={{ padding: 20, marginBottom: 18 }}><h2>Indicadores</h2><p>Totais de registros são contagens do banco; valores financeiros abaixo representam somente os até 1.000 lançamentos mais recentes carregados.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <div style={box}><strong>Receitas (amostra)</strong><p style={{ fontSize: 24 }}>{money(receita)}</p></div>
        <div style={box}><strong>Despesas (amostra)</strong><p style={{ fontSize: 24 }}>{money(despesa)}</p></div>
        <div style={box}><strong>Saldo (amostra)</strong><p style={{ fontSize: 24 }}>{money(receita - despesa)}</p></div>
        <div style={box}><strong>Lançamentos</strong><p style={{ fontSize: 24 }}>{entriesCount.count ?? "Indisponível"}</p></div>
        <div style={box}><strong>Movimentações bancárias</strong><p style={{ fontSize: 24 }}>{banksCount.count ?? "Indisponível"}</p></div>
        <div style={box}><strong>Revisões de alertas</strong><p style={{ fontSize: 24 }}>{reviewsCount.count ?? "Indisponível"}</p></div>
        <div style={box}><strong>Dossiês</strong><p style={{ fontSize: 24 }}>{dossiersCount.count ?? "Indisponível"}</p></div>
      </div>
    </section>
    <section className="admin-panel" style={{ padding: 20, marginBottom: 18 }}><h2>Receitas e despesas por mês — amostra</h2>
      {months.length === 0 ? <p>Sem lançamentos para exibir.</p> : <div style={{ display: "grid", gap: 14 }}>{months.map(([month, v]) => <div key={month} style={{ display: "grid", gridTemplateColumns: "90px minmax(0,1fr)", gap: 12, alignItems: "center" }}><strong>{month.slice(5)}/{month.slice(0, 4)}</strong><div><div aria-label={`Receitas ${money(v.receita)}`} title={`Receitas ${money(v.receita)}`} style={{ width: `${Math.max(0, v.receita / max * 100)}%`, minHeight: 14, background: "#0f766e", marginBottom: 4 }} /><div aria-label={`Despesas ${money(v.despesa)}`} title={`Despesas ${money(v.despesa)}`} style={{ width: `${Math.max(0, v.despesa / max * 100)}%`, minHeight: 14, background: "#b45309" }} /><small>Receitas {money(v.receita)} · Despesas {money(v.despesa)}</small></div></div>)}</div>}
      <p style={{ marginTop: 12 }}>Verde: receitas · Ocre: despesas. Gráfico limitado à amostra, não ao histórico completo.</p>
    </section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 18 }}>
      <div className="admin-panel" style={{ padding: 20 }}><h2>Conciliação bancária</h2><p>Na amostra de {banks.length} movimentações:</p><ul><li>Pendentes: {bankStatus("pendente")}</li><li>Conciliadas: {bankStatus("conciliado")}</li><li>Marcadas como divergentes: {bankStatus("divergente")}</li><li>Pendentes sem vínculo: {banks.filter(x => x.review_status === "pendente" && !x.financial_entry_id).length}</li></ul><Link href="/admin/cbmdf-cmdpii/financeiro/conciliacao">Abrir conciliação</Link></div>
      <div className="admin-panel" style={{ padding: 20 }}><h2>Revisão de alertas</h2><p>Na amostra de {reviews.length} revisões:</p><ul><li>Em análise: {reviewStatus("em_analise")}</li><li>Aguardando documentos: {reviewStatus("necessita_documentos")}</li><li>Justificados: {reviewStatus("justificado")}</li><li>Encaminhados: {reviewStatus("encaminhado")}</li></ul><Link href="/admin/cbmdf-cmdpii/financeiro/alertas">Abrir alertas</Link></div>
      <div className="admin-panel" style={{ padding: 20 }}><h2>Situação dos dossiês</h2><p>Na amostra de {dossiers.length} dossiês:</p><ul>{["rascunho", "em_analise", "revisado", "encerrado"].map(s => <li key={s}>{label(s)}: {byStatus(dossiers, s)}</li>)}</ul><Link href="/admin/cbmdf-cmdpii/financeiro/dossies">Abrir dossiês</Link></div>
    </section>
    <section className="admin-panel" style={{ padding: 20 }}><h2>Dossiês recentes</h2>{dossiers.length === 0 ? <p>Nenhum dossiê cadastrado.</p> : <ul>{dossiers.slice(0, 10).map(d => <li key={d.id}><strong>{d.title}</strong> — {d.scope} · {label(d.status)} · <Link href={`/admin/cbmdf-cmdpii/financeiro/dossies/${encodeURIComponent(d.id)}/relatorio`}>Relatório</Link></li>)}</ul>}</section>
  </AdminShell>;
}
