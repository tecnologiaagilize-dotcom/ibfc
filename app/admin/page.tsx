import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, GraduationCap, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const {data:admin} = await db.from("admin_profiles").select("id").eq("id",user.id).maybeSingle();
  if (!admin) redirect("/membro");
  const [leads,courses,events] = await Promise.all([
    db.from("ibfc_leads").select("*",{count:"exact",head:true}),
    db.from("courses").select("*",{count:"exact",head:true}).eq("status","published"),
    db.from("events").select("*",{count:"exact",head:true}).eq("status","published")
  ]);
  const metrics = [
    ["Inscrições IBFC",leads.count ?? 0,Users],
    ["Cursos publicados",courses.count ?? 0,GraduationCap],
    ["Eventos publicados",events.count ?? 0,CalendarDays]
  ] as const;
  return <AdminShell email={user.email}>
    <div className="admin-heading"><div><span className="badge">GESTÃO IBFC</span><h1>Visão geral</h1><p>Acompanhe cadastros voluntários e formação da comunidade.</p></div><Link href="/admin/apoiamento" className="btn btn-secondary">Projeto partidário</Link></div>
    <div className="metric-grid">{metrics.map(([label,value,Icon])=><div className="metric-card" key={label}><div className="metric-icon"><Icon size={22}/></div><div><strong>{value}</strong><span>{label}</span></div></div>)}</div>
    <section className="admin-panel" style={{padding:24,marginTop:20}}>
      <h2>Próximas ações</h2>
      <p>Confira os novos membros e organize cursos e atividades. O projeto partidário está restrito à área administrativa e sem coleta ativa.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:18}}>
        <Link className="btn btn-secondary" href="/admin/membros">Ver membros</Link>
        <Link className="btn btn-secondary" href="/admin/cursos">Gerenciar cursos</Link>
        <Link className="btn btn-secondary" href="/admin/eventos">Organizar eventos</Link>
      </div>
    </section>
  </AdminShell>;
}
