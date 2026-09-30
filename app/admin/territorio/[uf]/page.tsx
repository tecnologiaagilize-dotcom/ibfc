import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { Users, Building2, Network, GraduationCap } from "lucide-react";
const UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
export const dynamic='force-dynamic';
export default async function StateTerritoryPage({params}:{params:Promise<{uf:string}>}){
 const {uf:raw}=await params; const uf=raw.toUpperCase(); if(!UFS.includes(uf)) notFound();
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/admin/login');
 const {data:members}=await supabase.from('member_profiles').select('id,full_name,city,neighborhood,local_nucleus,membership_status,created_at').eq('state_uf',uf).order('created_at',{ascending:false});
 const rows=members??[], active=rows.filter((m:any)=>m.membership_status==='active');
 const cityMap=new Map<string,{total:number,nuclei:Set<string>}>(); active.forEach((m:any)=>{const city=m.city||'Não informado';const x=cityMap.get(city)||{total:0,nuclei:new Set<string>()};x.total++;if(m.local_nucleus)x.nuclei.add(m.local_nucleus);cityMap.set(city,x)});
 const municipalities=[...cityMap.entries()].sort((a,b)=>b[1].total-a[1].total); const nuclei=new Set(active.filter((m:any)=>m.local_nucleus).map((m:any)=>`${m.city}|${m.local_nucleus}`)).size;
 const ids=active.map((m:any)=>m.id); let studying=0; if(ids.length){const {data:e}=await supabase.from('course_enrollments').select('member_id').in('member_id',ids); studying=new Set((e??[]).map((x:any)=>x.member_id)).size}
 return <AdminShell email={user.email}><div className="admin-heading"><div><Link href="/admin/territorio" className="admin-back">← Brasil</Link><span className="badge">UF {uf}</span><h1>Comunidade IBFC — {uf}</h1><p>Detalhamento territorial agregado do estado.</p></div></div>
 <div className="metric-grid"><div className="metric-card"><div className="metric-icon"><Users/></div><div><strong>{active.length}</strong><span>Membros ativos</span></div></div><div className="metric-card"><div className="metric-icon"><Building2/></div><div><strong>{municipalities.length}</strong><span>Municípios</span></div></div><div className="metric-card"><div className="metric-icon"><Network/></div><div><strong>{nuclei}</strong><span>Núcleos declarados</span></div></div><div className="metric-card"><div className="metric-icon"><GraduationCap/></div><div><strong>{studying}</strong><span>Membros em cursos</span></div></div></div>
 <div className="territory-state-grid"><section className="admin-panel"><div className="panel-title"><div><h2>Municípios</h2><p>Distribuição dos membros ativos em {uf}</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Município</th><th>Membros</th><th>Núcleos</th><th>Participação na UF</th></tr></thead><tbody>{municipalities.map(([city,x])=><tr key={city}><td><b>{city}</b></td><td>{x.total}</td><td>{x.nuclei.size}</td><td><div className="mini-progress"><i style={{width:`${active.length?Math.round(x.total/active.length*100):0}%`}}/></div><small>{active.length?Math.round(x.total/active.length*100):0}%</small></td></tr>)}{!municipalities.length&&<tr><td colSpan={4} className="empty-cell">Nenhum membro ativo nesta UF.</td></tr>}</tbody></table></div></section>
 <aside className="admin-panel"><div className="panel-title"><div><h2>Núcleos</h2><p>Estrutura local declarada</p></div></div><div className="nucleus-list">{[...new Set(active.map((m:any)=>m.local_nucleus).filter(Boolean))].sort().map((n:any)=><div key={n}><b>{n}</b><span>{active.filter((m:any)=>m.local_nucleus===n).length} membros</span></div>)}{!nuclei&&<p className="territory-empty">Nenhum núcleo informado.</p>}</div></aside></div>
 <p className="privacy-note">Dados exibidos para gestão operacional da comunidade. Informações pessoais detalhadas permanecem na ficha administrativa do membro.</p></AdminShell>
}
