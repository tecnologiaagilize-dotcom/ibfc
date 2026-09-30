import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrazilMap } from "@/components/BrazilMap";
import { MapPinned, Users, Building2, Network } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function TerritoryPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/admin/login');
 const {data:members}=await supabase.from('member_profiles').select('id,state_uf,city,local_nucleus,membership_status');
 const rows=members??[]; const active=rows.filter((m:any)=>m.membership_status==='active');
 const counts:Record<string,number>={}; active.forEach((m:any)=>{if(m.state_uf) counts[m.state_uf]=(counts[m.state_uf]||0)+1});
 const cities=new Set(active.filter((m:any)=>m.city).map((m:any)=>`${m.state_uf}|${m.city}`)).size;
 const nuclei=new Set(active.filter((m:any)=>m.local_nucleus).map((m:any)=>`${m.state_uf}|${m.city}|${m.local_nucleus}`)).size;
 const ranking=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
 return <AdminShell email={user.email}><div className="admin-heading"><div><span className="badge">PRESENÇA NACIONAL</span><h1>Painel Territorial</h1><p>Visão agregada da comunidade por UF, município e núcleo.</p></div></div>
 <div className="metric-grid"><div className="metric-card"><div className="metric-icon"><Users/></div><div><strong>{active.length}</strong><span>Membros ativos</span></div></div><div className="metric-card"><div className="metric-icon"><MapPinned/></div><div><strong>{ranking.length}</strong><span>UFs com membros</span></div></div><div className="metric-card"><div className="metric-icon"><Building2/></div><div><strong>{cities}</strong><span>Municípios alcançados</span></div></div><div className="metric-card"><div className="metric-icon"><Network/></div><div><strong>{nuclei}</strong><span>Núcleos declarados</span></div></div></div>
 <div className="territory-grid"><section className="admin-panel territory-map"><div className="panel-title"><div><h2>Brasil</h2><p>Clique em uma UF para detalhar sua comunidade.</p></div></div><BrazilMap counts={counts} hrefPrefix="/admin/territorio"/></section>
 <aside className="admin-panel"><div className="panel-title"><div><h2>Distribuição por UF</h2><p>Membros ativos cadastrados</p></div></div><div className="territory-ranking">{ranking.map(([uf,total],i)=><Link key={uf} href={`/admin/territorio/${uf}`}><span className="rank-number">{i+1}</span><b>{uf}</b><div className="rank-bar"><i style={{width:`${Math.max(6,(total/(ranking[0]?.[1]||1))*100)}%`}}/></div><strong>{total}</strong></Link>)}{!ranking.length&&<p className="territory-empty">Ainda não há dados territoriais.</p>}</div></aside></div>
 <p className="privacy-note">Os indicadores territoriais são agregados e baseados na localização declarada pelos membros. Esta área não representa preferência política individual.</p></AdminShell>
}
