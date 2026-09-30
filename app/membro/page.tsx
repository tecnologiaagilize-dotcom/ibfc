import Link from "next/link";
import { BookOpen, Award, CalendarDays, Bell, UserRound, BarChart3, PlayCircle, ChevronRight, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function MembroPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 const {data:profile}=user ? await supabase.from("member_profiles").select("full_name,state_uf,city").eq("id",user.id).maybeSingle() : {data:null};
 const first=(profile?.full_name || user?.user_metadata?.full_name || "Membro").split(" ")[0];
 return <main className="member-area">
  <header className="member-top"><Link href="/" className="member-logo">IBFC <small>COMUNIDADE</small></Link><div><Link href="/membro/notificacoes" aria-label="Notificações"><Bell size={20}/></Link><span className="member-avatar">{first.slice(0,2).toUpperCase()}</span></div></header>
  <div className="member-layout"><aside className="member-side"><nav><a className="active"><BarChart3 size={19}/>Visão geral</a><Link href="/membro/cursos"><BookOpen size={19}/>Meus cursos</Link><Link href="/membro/certificados"><Award size={19}/>Certificados</Link><Link href="/membro/eventos"><CalendarDays size={19}/>Eventos</Link><Link href="/membro/pesquisas"><BarChart3 size={19}/>Pesquisas</Link><Link href="/membro/conteudos"><FileText size={19}/>Conteúdos</Link><Link href="/membro/notificacoes"><Bell size={19}/>Notificações</Link></nav></aside>
  <section className="member-content"><div className="member-welcome"><div><span>COMUNIDADE IBFC</span><h1>Olá, {first}! 👋</h1><p>Este é o seu espaço dentro do Instituto Brasileiro da Família Cristã.</p></div><Link href="/" className="btn btn-secondary">Ver portal público</Link></div>
  <div className="member-stat-grid"><div className="member-stat"><BookOpen/><div><strong>0</strong><span>Cursos em andamento</span></div></div><div className="member-stat"><Award/><div><strong>0</strong><span>Certificados</span></div></div><div className="member-stat"><CalendarDays/><div><strong>0</strong><span>Próximos eventos</span></div></div></div>
  <div className="member-dashboard-grid"><article className="member-panel"><div className="member-panel-head"><div><h2>Continue aprendendo</h2><p>Seus cursos aparecerão aqui.</p></div><BookOpen/></div><div className="member-empty"><PlayCircle size={42}/><h3>Em breve: trilhas IBFC</h3><p>O ambiente já está preparado para cursos, módulos, aulas, progresso e certificados.</p><Link href="/membro/cursos" className="btn btn-primary">Explorar cursos</Link></div></article>
  <aside className="member-panel"><div className="member-panel-head"><div><h2>Acesso rápido</h2><p>Recursos da comunidade</p></div></div>{[["Eventos","Veja a agenda IBFC","/membro/eventos"],["Pesquisas","Participe das consultas","/membro/pesquisas"],["Conteúdos","Materiais exclusivos","/membro/conteudos"]].map(x=><Link href={x[2]} className="member-quick" key={x[0]}><div><b>{x[0]}</b><small>{x[1]}</small></div><ChevronRight size={18}/></Link>)}</aside></div>
  </section></div>
 </main>
}
