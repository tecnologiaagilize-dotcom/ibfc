import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { createFinancialEntry } from "./actions";

export const dynamic = "force-dynamic";
type Params = Promise<{ erro?: string; sucesso?: string; tipo?: string }>;
export default async function FinanceiroPage({ searchParams }: { searchParams: Params }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await db.from("admin_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) redirect("/admin");
  const params = await searchParams;
  const filter = ["receita", "despesa"].includes(params.tipo ?? "") ? params.tipo : "";
  let query = db.from("ibfc_cmdpii_financial_entries").select("id,entry_type,transaction_date,description,amount,counterparty,document_reference,verification_status").order("transaction_date", { ascending: false }).limit(200);
  if (filter) query = query.eq("entry_type", filter);
  const { data, error } = await query;
  const rows = data ?? [];
  const total = (kind: string) => rows.filter(r => r.entry_type === kind).reduce((sum, r) => sum + Number(r.amount), 0);
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">ACESSO RESTRITO</span><h1>Auditoria financeira — APAM</h1><p>Registro de movimentações para conferência documental. Nenhum lançamento implica, por si só, irregularidade.</p><a href="/admin/cbmdf-cmdpii">← Voltar ao observatório</a> · <a href="/admin/cbmdf-cmdpii/financeiro/conciliacao">Abrir conciliação bancária →</a></div></div>
    {params.sucesso && <p role="status">Lançamento registrado.</p>}
    {params.erro && <p role="alert">Não foi possível salvar ({params.erro}). Verifique os campos e a migração financeira no Supabase.</p>}
    <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Novo lançamento</h2>
      <form action={createFinancialEntry} style={{display:"grid",gap:12,marginTop:16}}>
        <label>Tipo <select name="entry_type" required><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
        <label>Data <input type="date" name="transaction_date" required /></label>
        <label>Descrição <input name="description" required minLength={5} maxLength={500} /></label>
        <label>Valor (R$, com ponto decimal: 1250.50) <input name="amount" type="number" step="0.01" min="0.01" required /></label>
        <label>Pagador / beneficiário <input name="counterparty" maxLength={250} /></label>
        <label>Documento / comprovante de referência <input name="document_reference" maxLength={1000} /></label>
        <label>Forma de pagamento <input name="payment_method" maxLength={100} /></label>
        <label>Referência bancária (sem senhas ou dados sigilosos) <input name="bank_reference" maxLength={250} /></label>
        <label>Observações <textarea name="notes" rows={3} maxLength={4000} /></label>
        <button type="submit" className="btn btn-primary">Registrar como pendente de conferência</button>
      </form>
    </section>
    <section className="admin-panel" style={{padding:24}}><h2>Lançamentos recentes</h2><p>Os totais abaixo consideram apenas os até 200 lançamentos carregados, não representam balanço contábil completo.</p>
      <p><strong>Receitas:</strong> {money(total("receita"))} · <strong>Despesas:</strong> {money(total("despesa"))} · <strong>Diferença:</strong> {money(total("receita")-total("despesa"))}</p>
      <form method="get"><label>Tipo <select name="tipo" defaultValue={filter}><option value="">Todos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select></label> <button type="submit" className="btn btn-secondary">Filtrar</button></form>
      {error ? <p role="alert">Tabela indisponível. Execute a migração <code>20261018_ibfc_cmdpii_financeiro.sql</code>.</p> : rows.length ? <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Contraparte</th><th>Comprovante</th><th>Conferência</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.transaction_date}</td><td>{r.entry_type}</td><td>{r.description}</td><td>{money(Number(r.amount))}</td><td>{r.counterparty || "—"}</td><td>{r.document_reference || "—"}</td><td>{r.verification_status}</td></tr>)}</tbody></table></div> : <p>Nenhum lançamento registrado.</p>}
    </section>
  </AdminShell>;
}
