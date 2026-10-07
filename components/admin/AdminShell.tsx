import "./admin-science-menu.css";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Users, GraduationCap, FileText, Settings, ExternalLink, CalendarDays, Vote, Bell, ShieldCheck, ScrollText } from "lucide-react";

const items = [
  ["Painel", "/admin", BarChart3],
  ["Ciência Eleitoral", "/admin/ciencia-eleitoral", Vote],
  ["Projeto partidário", "/admin/apoiamento", ShieldCheck],
  ["Comunidade e participação", "/admin/comunidade", Users],
  ["Membros", "/admin/membros", Users],
  ["Captação", "/admin/captacao", Users],
  ["Trilhas e cursos", "/admin/cursos", GraduationCap],
  ["Eventos", "/admin/eventos", CalendarDays],
  ["Pesquisas", "/admin/pesquisas", Vote],
  ["Conteúdo", "/admin/conteudo", FileText],
  ["Notificações", "/admin/notificacoes", Bell],
  ["Auditoria", "/admin/auditoria", ScrollText],
  ["Configurações", "/admin/configuracoes", Settings],
] as const;

export function AdminShell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link href="/" className="admin-brand"><Image src="/logo-ibfc.png" alt="IBFC" width={125} height={42}/><span><small>Central de Gestão</small></span></Link>
      <nav>{items.map(([label, href, Icon]) => href==='/admin/ciencia-eleitoral'?<details key={href} className="admin-science-menu" open><summary><Icon size={19}/><span>Ciência Eleitoral</span></summary><div><Link href="/admin/ciencia-eleitoral"><span>Visão geral</span></Link><Link href="/admin/ciencia-eleitoral/mapa"><span>Mapa e territórios</span></Link><Link href="/admin/ciencia-eleitoral/cargos"><span>Comparação de cargos</span></Link><Link href="/admin/ciencia-eleitoral/investigacoes"><span>Investigações e evidências</span></Link><Link href="/admin/ciencia-eleitoral/relatorios"><span>Relatórios</span></Link><Link href="/admin/ciencia-eleitoral/modelos"><span>Estatística e tendências</span></Link><Link href="/admin/ciencia-eleitoral/integracoes"><span>Sincronização e instalação</span></Link></div></details>:href==='/admin/comunidade'?<details key={href} className="admin-science-menu" open><summary><Icon size={19}/><span>Comunidade</span></summary><div><Link href="/admin/comunidade"><span>Organizações e participação</span></Link><Link href="/admin/comunidade/demandas"><span>Demandas e atendimento</span></Link></div></details>:<Link key={href} href={href}><Icon size={19}/><span>{label}</span></Link>)}</nav>
      <Link href="/" className="admin-site-link"><ExternalLink size={18}/> Ver portal</Link>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><b>Central de Gestão IBFC</b><small>Instituto Brasileiro da Família Cristã</small></div><div className="admin-user"><span>{email ?? "Administrador"}</span><div className="admin-avatar">IBFC</div></div></header>
      <div className="admin-content">{children}</div>
    </section>
  </div>;
}
