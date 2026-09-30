import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Users, UserPlus, MapPinned, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function MembersPage({searchParams}:{searchParams:Promise<{q?:string;uf?:string}>}){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/admin/login');
 const {q='',uf=''}=await searchParams;
 let query=supabase.from('member_profiles').select('*').order('created_at',{ascending:false});
 if(uf) query=query.eq('state_uf',uf); if(q) query=query.or(`full_name.ilike.%${q}%,city.ilike.%${q}%`);
 const {data:members}=await query; const rows=members??[];
 const {count:total}=await supabase.from('member_profiles').select('*',{count:'exact',head:true});
 const since=new Date(Date.now()-30*86400000).toISOString(); const {count:new30}=await supabase.from('member_profiles').select('*',{count:'exact',head:true}).gte('created_at',since);
 const {data:enroll}=await supabase.from('course_enrollments').select('member_id,progress');
 const studying=new Set((enroll??[]).map((e:any)=>e.member_id)).size; const states=new Set(rows.map((m:any)=>m.state_uf).filter(Boolean)).size;
 const ufs=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">COMUNIDADE NACIONAL</span><h1>Membros IBFC</h1><p>Gestão cadastral, territorial e educacional da comunidade.</p></div></div>
 <div className="metric-grid"><div className="metric-card"><div className="metric-icon"><Users/></div><div><strong>{total??0}</strong><span>Membros cadastrados</span></div></div><div className="metric-card"><div className="metric-icon"><UserPlus/></div><div><strong>{new30??0}</strong><span>Novos em 30 dias</span></div></div><div className="metric-card"><div className="metric-icon"><GraduationCap/></div><div><strong>{studying}</strong><span>Com matrícula em curso</span></div></div><div className="metric-card"><div className="metric-icon"><MapPinned/></div><div><strong>{states}</strong><span>UFs nesta visualização</span></div></div></div>
 <section className="admin-panel"><form className="member-filters"><input name="q" defaultValue={q} className="field" placeholder="Buscar por nome ou município..."/><select name="uf" defaultValue={uf} className="field"><option value="">Todas as UFs</option>{ufs.map(x=><option key={x}>{x}</option>)}</select><button className="btn btn-primary">Filtrar</button><Link href="/admin/membros" className="btn btn-secondary">Limpar</Link></form>
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Membro</th><th>Localidade</th><th>Núcleo</th><th>Status</th><th>Desde</th><th></th></tr></thead><tbody>{rows.map((m:any)=><tr key={m.id}><td><b>{m.full_name||'Cadastro sem nome'}</b><small className="table-sub">{m.whatsapp||'WhatsApp não informado'}</small></td><td>{[m.city,m.state_uf].filter(Boolean).join(' / ')||'—'}</td><td>{m.local_nucleus||'—'}</td><td><span className={`status-pill ${m.membership_status==='active'?'published':'draft'}`}>{m.membership_status==='active'?'Ativo':m.membership_status==='blocked'?'Bloqueado':'Inativo'}</span></td><td>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td><td><Link className="admin-edit" href={`/admin/membros/${m.id}`}>Ver ficha</Link></td></tr>)}{!rows.length&&<tr><td colSpan={6} className="empty-cell">Nenhum membro encontrado.</td></tr>}</tbody></table></div></section></AdminShell>
}
