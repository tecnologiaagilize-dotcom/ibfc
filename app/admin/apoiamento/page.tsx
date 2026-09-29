import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { QueueRefresh } from "@/components/ibfc/QueueRefresh";
import { claim,finish } from "./actions";
export const dynamic="force-dynamic";
export default async function SapfAdminPage({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:admin}=await db.from("admin_profiles").select("id").eq("id",user.id).maybeSingle();if(!admin)redirect("/membro");
 await db.rpc("ibfc_sapf_expire_codes");
 const {data:tickets,error}=await db.from("ibfc_sapf_queue").select("id,member_id,electoral_title,status,operator_id,requested_at,code,code_expires_at").in("status",["waiting","called","code_received"]).order("requested_at",{ascending:true});
 const ids=(tickets||[]).map(t=>t.member_id);
 const {data:profiles}=ids.length?await db.from("member_profiles").select("id,full_name,whatsapp,state_uf,city").in("id",ids):{data:[]};
 const members=new Map((profiles||[]).map(p=>[p.id,p]));const {erro}=await searchParams;
 return <AdminShell email={user.email}><QueueRefresh interval={3000}/><div className="admin-heading"><div><span className="badge">ATENDIMENTO HUMANO · SAPF</span><h1>Fila de apoiamento</h1><p>Chame primeiro a pessoa. Só então ela gera o código temporário do e‑Título.</p></div></div>
 {erro&&<p role="alert">A operação não foi concluída. Atualize a fila e tente novamente.</p>}
 {error&&<p role="alert">Fila indisponível. Aplique a migração SAPF no banco do IBFC.</p>}
 <section className="admin-panel" style={{padding:24}}><h2>Aguardando ({(tickets||[]).filter(t=>t.status==="waiting").length})</h2><div style={{display:"grid",gap:14}}>{(tickets||[]).filter(t=>t.status==="waiting").map(t=>{const p=members.get(t.member_id);return <article key={t.id} className="card" style={{padding:18}}><strong>{p?.full_name||"Inscrito"}</strong><p>{p?.city}, {p?.state_uf} · Título {t.electoral_title} · WhatsApp {p?.whatsapp||"não informado"}</p><p>Desde {new Date(t.requested_at).toLocaleString("pt-BR")}</p><form action={claim}><input type="hidden" name="id" value={t.id}/><button className="btn btn-primary">Chamar e iniciar atendimento</button></form></article>})}</div></section>
 <section className="admin-panel" style={{padding:24,marginTop:20}}><h2>Em atendimento</h2><p>Somente a atendente responsável pode concluir ou devolver o atendimento à fila. Nunca solicite senha do e‑Título.</p><div style={{display:"grid",gap:14}}>{(tickets||[]).filter(t=>t.status!=="waiting").map(t=>{const p=members.get(t.member_id);const mine=t.operator_id===user.id;const active=t.status==="code_received"&&!!t.code_expires_at&&new Date(t.code_expires_at).getTime()>Date.now();return <article key={t.id} className="card" style={{padding:18}}><strong>{p?.full_name||"Inscrito"}</strong><p>Título {t.electoral_title} · {p?.whatsapp||"WhatsApp não informado"}</p><p>{mine?"Seu atendimento":"Atendimento de outra pessoa"} · {active?"Código recebido":"Aguardando código novo"}</p>{mine&&active&&<p style={{fontSize:22,fontWeight:800,letterSpacing:3}}>Código: {t.code} <small style={{fontSize:13,letterSpacing:0}}>vence às {new Date(t.code_expires_at!).toLocaleTimeString("pt-BR")}</small></p>}
 {mine&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><form action={finish}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="result" value="submitted"/><button className="btn btn-primary" disabled={!active}>Lançado no SAPF</button></form><form action={finish}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="result" value="waiting"/><button className="btn btn-secondary">Devolver à fila</button></form><form action={finish}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="result" value="rejected"/><button className="btn btn-secondary">Não concluído</button></form></div>}</article>})}</div></section>
 <p style={{marginTop:20}}>“Lançado no SAPF” registra somente o relato operacional da atendente. A Justiça Eleitoral é responsável pela conferência oficial.</p></AdminShell>;
}
