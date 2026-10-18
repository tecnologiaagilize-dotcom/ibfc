import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AdminShell} from "@/components/admin/AdminShell";
import {saveAuditReview} from "./actions";
export const dynamic="force-dynamic";
type Entry={id:string;transaction_date:string;description:string;amount:number;entry_type:string;counterparty:string;document_reference:string};
type Bank={id:string;transaction_date:string;description:string;amount:number;review_status:string;financial_entry_id:string|null};
type Alert={key:string;type:"sem_conciliacao"|"valor_duplicado"|"sem_documento"|"divergencia_revisada";title:string;detail:string};
const fmt=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default async function AlertasPage({searchParams}:{searchParams:Promise<{erro?:string;sucesso?:string}>}) {
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:profile}=await db.from("admin_profiles").select("role").eq("id",user.id).maybeSingle();
 if(!profile||!["admin","editor"].includes(profile.role))redirect("/admin");
 const [{data:entries,error:eError},{data:banks,error:bError},{data:reviews,error:rError}]=await Promise.all([
 db.from("ibfc_cmdpii_financial_entries").select("id,transaction_date,description,amount,entry_type,counterparty,document_reference").order("transaction_date",{ascending:false}).limit(500),
 db.from("ibfc_cmdpii_bank_transactions").select("id,transaction_date,description,amount,review_status,financial_entry_id").order("transaction_date",{ascending:false}).limit(500),
 db.from("ibfc_cmdpii_audit_reviews").select("alert_key,disposition,notes,reviewed_at").limit(1000)
 ]);
 const alerts:Alert[]=[];const financial=(entries??[]) as Entry[];const bankRows=(banks??[]) as Bank[];
 const reviewed=new Map((reviews??[]).map(r=>[r.alert_key,r]));
 for(const b of bankRows){
  if(b.review_status==="pendente" && !b.financial_entry_id)alerts.push({key:`sem_conciliacao:${b.id}`,type:"sem_conciliacao",title:"Movimentação sem conciliação",detail:`${b.transaction_date} · ${fmt(Number(b.amount))} · ${b.description}`});
  if(b.review_status==="divergente")alerts.push({key:`divergencia_revisada:${b.id}`,type:"divergencia_revisada",title:"Movimentação marcada como divergente",detail:`${b.transaction_date} · ${fmt(Number(b.amount))} · ${b.description}`});
 }
 for(const e of financial){
  if(!e.document_reference?.trim())alerts.push({key:`sem_documento:${e.id}`,type:"sem_documento",title:"Lançamento sem referência documental",detail:`${e.transaction_date} · ${fmt(Number(e.amount))} · ${e.description}`});
 }
 // Possível duplicidade: mesmo dia, direção, valor e contraparte normalizada. Não presume pagamento duplicado.
 const groups=new Map<string,Entry[]>();
 for(const e of financial){const key=[e.transaction_date,e.entry_type,Math.round(Number(e.amount)*100),e.counterparty.trim().toLocaleLowerCase("pt-BR")].join("|");groups.set(key,[...(groups.get(key)??[]),e]);}
 for(const group of groups.values())if(group.length>1){for(let i=1;i<group.length;i++){
  const e=group[i];alerts.push({key:`valor_duplicado:${e.id}`,type:"valor_duplicado",title:"Possível lançamento repetido",detail:`${e.transaction_date} · ${fmt(Number(e.amount))} · ${e.counterparty||"Contraparte não informada"} · ${group.length} registros semelhantes`});
 }}
 const p=await searchParams;
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">ACESSO RESTRITO</span><h1>Alertas de auditoria — APAM</h1><p>Triagem documental assistida. Alertas não comprovam irregularidade, dolo ou responsabilidade pessoal.</p><a href="/admin/cbmdf-cmdpii/financeiro/conciliacao">← Conciliação bancária</a></div></div>
 {p.sucesso&&<p role="status">Revisão registrada.</p>}{p.erro&&<p role="alert">Não foi possível registrar a revisão ({p.erro}).</p>}
 {(eError||bError||rError)&&<p role="alert">Uma ou mais tabelas não estão disponíveis. Verifique as migrações das etapas 3, 4 e 5. Os resultados abaixo podem estar incompletos.</p>}
 <section className="admin-panel" style={{padding:24,marginBottom:18}}><h2>Resumo da triagem</h2><p><strong>{alerts.length}</strong> alertas calculados sobre até 500 lançamentos e 500 movimentações mais recentes.</p><p>Critérios: ausência de conciliação, divergência já sinalizada, referência documental vazia e possível repetição por data, tipo, valor e contraparte. A amostra não é uma auditoria completa; revisões anteriores podem não aparecer se o registro sair dos limites consultados.</p></section>
 <section className="admin-panel" style={{padding:24}}><h2>Alertas e análise humana</h2>{alerts.length===0?<p>Nenhum alerta identificado na amostra consultada.</p>:<div style={{display:"grid",gap:16}}>{alerts.slice(0,150).map(a=>{const review=reviewed.get(a.key);return <article key={a.key} style={{padding:16,border:"1px solid #64748b55",borderRadius:8}}><h3>{a.title}</h3><p>{a.detail}</p><p>Classificação: <strong>pendência de verificação</strong> · Revisão: {review?.disposition??"não analisado"}</p><form action={saveAuditReview} style={{display:"grid",gap:10}}><input type="hidden" name="alert_key" value={a.key}/><input type="hidden" name="alert_type" value={a.type}/><label>Resultado da análise <select name="disposition" defaultValue={review?.disposition??"em_analise"}><option value="em_analise">Em análise</option><option value="necessita_documentos">Necessita documentos</option><option value="justificado">Justificado</option><option value="encaminhado">Encaminhado para apuração</option></select></label><label>Fundamentação e referência das evidências <textarea name="notes" defaultValue={review?.notes??""} maxLength={4000} rows={3}/></label><button type="submit" className="btn btn-secondary">Salvar análise</button></form></article>})}</div>}{alerts.length>150&&<p>Exibidos os primeiros 150 alertas. Refine a base ou implemente paginação antes de uma auditoria integral.</p>}</section></AdminShell>;
}
