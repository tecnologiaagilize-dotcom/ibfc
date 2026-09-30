import Image from "next/image";
import Link from "next/link";

export function Header() {
  return <header className="nav ibfc-nav"><div className="container ibfc-nav-inner">
    <Link href="/" className="ibfc-brand" aria-label="IBFC — página inicial"><Image src="/logo-ibfc.png" alt="Instituto Brasileiro da Família Cristã" width={315} height={105} priority /></Link>
    <nav className="ibfc-desktop-nav" aria-label="Navegação principal"><Link href="/#missao">Quem somos</Link><Link href="/#atuacao">Como participar</Link><Link href="/entrar">Área do membro</Link><Link href="/cadastro?origem=portal_ibfc" className="ibfc-nav-cta">Quero participar <span aria-hidden="true">↗</span></Link></nav>
    <details className="ibfc-mobile-nav"><summary aria-label="Abrir menu">Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Navegação móvel"><Link href="/#missao">Quem somos</Link><Link href="/#atuacao">Como participar</Link><Link href="/entrar">Área do membro</Link><Link href="/cadastro?origem=portal_ibfc">Quero participar</Link></nav></details>
  </div></header>;
}
