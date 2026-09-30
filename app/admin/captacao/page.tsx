import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
export const dynamic = "force-dynamic";
const origins:Record<string,string>={portal_ibfc:"Portal",instagram_ibfc:"Instagram",whatsapp_ibfc:"WhatsApp",indicacao_ibfc:"Indicação"};
const interests:Record<string,string>={formacao:"Cursos e formação",acao_comunitaria:"Ações comunitárias",eventos:"Eventos",voluntariado:"Voluntariado",conhecer:"Conhecer o instituto"};
const stages:Record<string,string>={received:"Cadastro recebido",bot_active:"Atendimento digital",human_requested:"Aguardando equipe",human_active:"Atendimento humano",closed:"Concluído"};
export default async function CaptacaoPage({searchParams}:{searchParams:Promise<{origem?:string;localidade?:string}>}) {
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/admin/login");
 const {data:admin}=await db.from("admin_profiles").select("id").eq("id",user.id).maybeSingle();if(!admin)redirect("/membro");
 const params=await searchParams;const source=origins[params.origem||""]?params.origem:"";
 const locality=String(params.localidade||"").trim().slice(0,100);
 let query=db.from("ibfc_leads").select("member_id,source,interest,locality,campaign,whatsapp_opt_in,status,created_at").order("created_at",{ascending:false}).limit(200);
 if(source)query=query.eq("source",source);if(locality)query=query.eq("locality",locality);
 const {data,error}=await query;const rows=data||[];
 const ids=rows.map(r=>r.member_id);
 const profiles=ids.length?await db.from("member_profiles").select("id,full_name,state_uf,city").in("id",ids):{data:[],error:null};
 const names=new Map((profiles.data||[]).map(p=>[p.id,p]));
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">PARTICIPAÇÃO VOLUNTÁRIA</span><h1>Captação e acolhimento</h1><p>Últimas 200 inscrições correspondentes aos filtros. A origem identifica o link utilizado; não comprova autorização de contato.</p></div></div>
 <section className="admin-panel" style={{padding:22}}><form style={{display:"flex",gap:12,flexWrap:"wrap"}}><select className="field" name="origem" defaultValue={source}><option value="">Todas as origens</option>{Object.entries(origins).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><input className="field" name="localidade" defaultValue={locality} maxLength={100} placeholder="Região ou bairro (texto exato)"/><button className="btn btn-primary">Filtrar</button><Link className="btn btn-secondary" href="/admin/captacao">Limpar</Link></form></section>
 {error||profiles.error?<p role="alert">Não foi possível carregar a captação. Confira as migrações IBFC no banco.</p>:<section className="admin-panel" style={{marginTop:20}}><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Participante</th><th>Localidade</th><th>Interesse</th><th>Origem / campanha</th><th>WhatsApp autorizado</th><th>Etapa</th></tr></thead><tbody>{rows.map(r=>{const p=names.get(r.member_id);return <tr key={r.member_id}><td><Link href={"/admin/membros/"+r.member_id}>{p?.full_name||"Inscrição"}</Link><small className="table-sub">{new Date(r.created_at).toLocaleDateString("pt-BR")}</small></td><td>{r.locality||"—"}<small className="table-sub">{[p?.city,p?.state_uf].filter(Boolean).join(" / ")}</small></td><td>{interests[r.interest]||"Não informado"}</td><td>{origins[r.source]||"Outra origem"}<small className="table-sub">{r.campaign||"Sem campanha informada"}</small></td><td>{r.whatsapp_opt_in?"Sim":"Não"}</td><td>{stages[r.status]||r.status}</td></tr>})}{!rows.length&&<tr><td colSpan={6} className="empty-cell">Nenhuma inscrição encontrada.</td></tr>}</tbody></table></div></section>}
 </AdminShell>;
}
