import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { importBankCsv, reviewBankTransaction } from "./actions";
export const dynamic="force-dynamic";
type Params=Promise<{erro?:string;sucesso?:string;status?:string}>;
const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default async function ConciliacaoPage({searchParams}:{searchParams:Params}) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user)redirect("/admin/login");
 const {data:profile}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!profile||!["admin","editor"].includes(profile.role))redirect("/admin");
 const p=await searchParams;const filter=["pendente","conciliado","divergente"].includes(p.status??"")?p.status:"";
 let q=db.from("ibfc_cmdpii_bank_transactions").select("id,transaction_date,description,amount,account_label,source_filename,source_row,financial_entry_id,review_status,review_notes").order("transaction_date",{ascending:false}).limit(100);
 if(filter)q=q.eq("review_status",filter);
 const [{data:rows,error},{data:entries}]=await Promise.all([q,db.from("ibfc_cmdpii_financial_entries").select("id,transaction_date,description,amount,entry_type").order("transaction_date",{ascending:false}).limit(200)]);
 const bankRows=rows??[]; const candidates=entries??[];
 return <AdminShell email={user.email}>
 <div className="admin-heading"><div><span className="badge">ACESSO RESTRITO</span><h1>Conciliação bancária — APAM</h1><p>Importação de extratos e comparação assistida com lançamentos financeiros. Divergências são hipóteses de trabalho, não comprovação de irregularidade.</p><a href="/admin/cbmdf-cmdpii/financeiro">← Auditoria financeira</a></div></div>
 {p.sucesso&&<p role="status">Operação concluída: {p.sucesso}.</p>}
 {p.erro&&<p role="alert">Operação não concluída ({p.erro}). Confira o CSV, os dados ou a migração SQL.</p>}
 <section className="admin-panel" style={{padding:24,marginBottom:20}}><h2>Importar extrato CSV</h2>
 <p>Arquivo privado de até 1 MB e 500 movimentações. Cabeçalho obrigatório: <code>data;descricao;valor</code> (também aceita vírgula como delimitador). Data AAAA-MM-DD; valor com duas casas decimais. Entradas positivas, saídas negativas. Exemplo: <code>2026-10-01;Pagamento fornecedor;-1250.50</code>. Não envie senhas, números completos de conta ou dados pessoais desnecessários.</p>
 <form action={importBankCsv} encType="multipart/form-data" style={{display:"grid",gap:12,maxWidth:700}}>
 <label>Identificador da conta (apelido, sem número completo) <input name="account_label" required minLength={2} maxLength={120} placeholder="Conta APAM — banco X"/></label>
 <label>Arquivo CSV <input type="file" name="file" accept=".csv,text/csv" required/></label>
 <button className="btn btn-primary" type="submit">Importar movimentações</button></form></section>
 <section className="admin-panel" style={{padding:24}}><h2>Movimentações bancárias</h2><p>Mostrando até 100 movimentações, ordenadas por data. Conciliação exige correspondência de data, valor e direção (entrada/saída). A identidade do beneficiário e o comprovante devem ser verificados separadamente.</p>
 <form method="get"><label>Situação <select name="status" defaultValue={filter}><option value="">Todas</option><option value="pendente">Pendente</option><option value="conciliado">Conciliado</option><option value="divergente">Divergente</option></select></label> <button type="submit" className="btn btn-secondary">Filtrar</button></form>
 {error?<p role="alert">Tabela indisponível. Execute a migração <code>20261018_ibfc_cmdpii_conciliacao.sql</code>.</p>:bankRows.length===0?<p>Nenhuma movimentação encontrada.</p>:<div style={{display:"grid",gap:16,marginTop:16}}>{bankRows.map(row=>{
 const matches=candidates.filter(e=>e.transaction_date===row.transaction_date && Math.round(Number(e.amount)*100)*(e.entry_type==="despesa"?-1:1)===Math.round(Number(row.amount)*100));
 return <div key={row.id} style={{border:"1px solid #64748b55",borderRadius:8,padding:16}}>
 <strong>{row.transaction_date} — {money(Number(row.amount))}</strong> · {row.description}
 <p>Conta: {row.account_label} · Fonte: {row.source_filename}, linha {row.source_row} · Situação: <strong>{row.review_status}</strong></p>
 <form action={reviewBankTransaction} style={{display:"grid",gap:10}}>
 <input type="hidden" name="id" value={row.id}/>
 <label>Lançamento financeiro correspondente <select name="financial_entry_id" defaultValue={row.financial_entry_id??""}><option value="">Sem vínculo</option>{matches.map(e=><option key={e.id} value={e.id}>{e.transaction_date} — {e.description.slice(0,90)} — {money(Number(e.amount))}</option>)}</select></label>
 <label>Revisão <select name="status" defaultValue={row.review_status}><option value="pendente">Pendente</option><option value="conciliado">Conciliado (exige vínculo)</option><option value="divergente">Divergente (requer análise)</option></select></label>
 <label>Observações da revisão <textarea name="review_notes" defaultValue={row.review_notes??""} maxLength={2000} rows={2}/></label>
 <button type="submit" className="btn btn-secondary">Salvar revisão</button></form></div>;
 })}</div>}
 </section></AdminShell>;
}
