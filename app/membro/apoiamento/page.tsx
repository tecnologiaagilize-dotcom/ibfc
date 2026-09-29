import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QueueRefresh } from "@/components/ibfc/QueueRefresh";
import { joinQueue,sendCode,cancelQueue } from "./actions";
export const dynamic="force-dynamic";
const labels:Record<string,string>={waiting:"Na fila de espera",called:"Atendente disponível: gere o código agora",code_received:"Código recebido pela atendente",submitted:"Lançamento informado pela equipe",rejected:"Não foi possível concluir",cancelled:"Atendimento cancelado"};
export default async function SapfMemberPage({searchParams}:{searchParams:Promise<{erro?:string}>}) {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) redirect("/cadastro");
 await db.rpc("ibfc_sapf_expire_codes");
 const {data:campaign}=await db.from("ibfc_sapf_campaign").select("party_name,party_cnpj,enabled").eq("id",true).maybeSingle();
 const {data:lead}=await db.from("ibfc_leads").select("member_id").eq("member_id",user.id).maybeSingle();
 const {data:ticket,error}=await db.from("ibfc_sapf_queue").select("id,status,requested_at,called_at,code_expires_at").eq("member_id",user.id).maybeSingle();
 const {erro}=await searchParams;
 return <main className="container" style={{maxWidth:780,padding:"56px 20px 100px"}}>
 <QueueRefresh/><Link href="/membro">← Minha área</Link><span className="badge" style={{display:"block",marginTop:24}}>PROJETO DE CRIAÇÃO DE PARTIDO</span>
 <h1>Atendimento para apoio via e‑Título</h1>
 <p>Seu cadastro no IBFC e a entrada nesta fila não representam apoio registrado nem filiação partidária. A conferência oficial ocorre no SAPF do TSE, pelo representante autorizado da agremiação em formação.</p>
 {campaign?.enabled&&<p><strong>Agremiação em formação: {campaign.party_name}</strong> · CNPJ {campaign.party_cnpj}</p>}
 <ol style={{lineHeight:1.9}}><li>Entre na fila e aguarde a atendente chamar você.</li><li>Com a atendente pronta, abra o e‑Título, faça o reconhecimento facial e gere o Código de Autenticação em “Mais opções”.</li><li>Informe o código nesta página imediatamente: ele vale <strong>60 segundos</strong>.</li><li>A atendente lança os dados e o código no SAPF; acompanhe o retorno do atendimento aqui.</li></ol>
 <p><a href="https://www.tse.jus.br/partidos/criacao-de-partido/sistema-de-apoiamento-a-partidos-em-formacao-sapf" target="_blank" rel="noopener noreferrer">Orientações oficiais do TSE ↗</a></p>
 {erro&&<p role="alert" style={{color:"#a52121"}}>Não foi possível concluir esta etapa. Confira seus dados e tente novamente; se o código venceu, gere outro.</p>}
 {(error||!lead)&&<p role="alert">Fila indisponível. Seu cadastro IBFC precisa estar ativo e a migração do banco aplicada.</p>}
 {!campaign?.enabled&&<p role="status">A coleta de pedidos de apoio ainda não foi aberta. Volte a esta página quando a agremiação estiver identificada e a equipe habilitar o atendimento.</p>}
 {lead&&campaign?.enabled&&!ticket&&<form action={joinQueue} className="card" style={{padding:26,display:"grid",gap:14}}>
 <h2>Solicitar atendimento</h2><label>Título eleitoral (12 dígitos)<input className="field" name="electoral_title" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} autoComplete="off" required/></label>
 <label><input type="checkbox" name="unaffiliated" required/> Declaro que não sou filiado(a) a outro partido político.</label>
 <label><input type="checkbox" name="consent" required/> Solicito atendimento para manifestar apoio à criação de {campaign.party_name} ({campaign.party_cnpj}) e autorizo o uso dos dados informados exclusivamente para esta finalidade. Sei que a decisão é voluntária e não constitui filiação.</label>
 <button className="btn btn-primary">Entrar na fila</button></form>}
 {ticket&&<section className="card" style={{padding:26}}><h2>{labels[ticket.status]||ticket.status}</h2>
 {ticket.status==="waiting"&&<p>Aguarde nesta página; ela atualiza automaticamente. <strong>Não gere o código ainda.</strong></p>}
 {ticket.status==="called"&&<form action={sendCode} style={{display:"grid",gap:12}}><p>A atendente chamou você. Gere o código agora no e‑Título e envie dentro de 60 segundos.</p><label>Código de Autenticação<input className="field" name="code" inputMode="numeric" pattern="[0-9]{4,12}" maxLength={12} autoComplete="one-time-code" required/></label><button className="btn btn-primary">Enviar código à atendente</button></form>}
 {ticket.status==="code_received"&&<p>O código está disponível à atendente por até 60 segundos. Se expirar, o sistema pedirá outro.</p>}
 {ticket.status==="submitted"&&<p>A equipe informou o lançamento no SAPF. Consulte a situação do apoio no sistema oficial do TSE; esta tela não é certidão de validação da Justiça Eleitoral.</p>}
 {ticket.status==="rejected"&&campaign?.enabled&&<form action={joinQueue} style={{display:"grid",gap:12}}><p>Para tentar novamente, informe o título e renove sua solicitação.</p><input className="field" name="electoral_title" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} required/><label><input type="checkbox" name="unaffiliated" required/> Declaro que não sou filiado(a).</label><label><input type="checkbox" name="consent" required/> Solicito novo atendimento e autorizo o uso dos dados para esta finalidade.</label><button className="btn btn-primary">Voltar à fila</button></form>}
 {ticket.status==="cancelled"&&<p>O atendimento foi cancelado. Você pode iniciar uma nova solicitação quando quiser.</p>}
 {ticket.status==="cancelled"&&campaign?.enabled&&<form action={joinQueue} style={{display:"grid",gap:12}}><input className="field" name="electoral_title" placeholder="Título eleitoral (12 dígitos)" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} required/><label><input type="checkbox" name="unaffiliated" required/> Declaro que não sou filiado(a).</label><label><input type="checkbox" name="consent" required/> Solicito novo atendimento e autorizo o uso dos dados para esta finalidade.</label><button className="btn btn-primary">Entrar novamente</button></form>}
 {["waiting","called","code_received"].includes(ticket.status)&&<form action={cancelQueue} style={{marginTop:20}}><button className="btn btn-secondary">Cancelar solicitação</button></form>}
 </section>}
 </main>;
}
