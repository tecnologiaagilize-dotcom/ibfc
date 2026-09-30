import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, HeartHandshake, MapPin, MessageCircleMore, ShieldCheck, UsersRound } from "lucide-react";
import { Header } from "@/components/Header";

const paths = [
  { Icon: HeartHandshake, number: "01", title: "Faça parte", text: "Conte quem você é, onde mora e de que forma deseja colaborar com as ações do instituto." },
  { Icon: BookOpen, number: "02", title: "Aprenda", text: "Acesse uma trilha de aprendizagem com conteúdos sobre família, cidadania e vida em comunidade." },
  { Icon: MapPin, number: "03", title: "Atue perto de você", text: "Conheça encontros, atividades e oportunidades de participação na sua região." },
  { Icon: MessageCircleMore, number: "04", title: "Acompanhe", text: "Entre na sua área de membro para acompanhar suas atividades e falar com a equipe." },
];

export default function Home() {
  return <>
    <Header />
    <main className="ibfc-home">
      <section className="ibfc-hero">
        <div className="ibfc-hero-glow" aria-hidden="true" />
        <div className="container ibfc-hero-grid">
          <div className="ibfc-hero-copy">
            <div className="ibfc-eyebrow"><span /> FAMÍLIA · FÉ · CIDADANIA</div>
            <h1>Uma família que <em>transforma</em> a comunidade.</h1>
            <p>O Instituto Brasileiro da Família Cristã reúne pessoas dispostas a aprender, servir e fazer a diferença onde vivem. Seu primeiro passo começa aqui.</p>
            <div className="ibfc-hero-actions">
              <Link href="/cadastro?origem=portal_ibfc" className="ibfc-action ibfc-action-yellow">Quero participar <ArrowRight size={20} /></Link>
              <Link href="#missao" className="ibfc-action ibfc-action-outline">Conheça o instituto</Link>
            </div>
            <div className="ibfc-hero-note"><span className="ibfc-note-icon"><ShieldCheck size={18} /></span> Cadastro voluntário. Você escolhe como deseja participar.</div>
          </div>
          <div className="ibfc-hero-art">
            <div className="ibfc-art-orbit ibfc-art-orbit-one" aria-hidden="true" />
            <div className="ibfc-art-orbit ibfc-art-orbit-two" aria-hidden="true" />
            <div className="ibfc-art-panel">
              <Image src="/logo-ibfc.png" alt="Instituto Brasileiro da Família Cristã: família sob um teto dourado, sobre uma Bíblia" width={1086} height={362} priority className="ibfc-hero-logo" />
              <div className="ibfc-art-line" />
              <p>Juntos pela família.<br /><strong>Presentes na comunidade.</strong></p>
            </div>
            <div className="ibfc-art-caption">IBFC <span>·</span> BRASÍLIA</div>
          </div>
        </div>
        <div className="ibfc-hero-stripe" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="ibfc-intro" id="missao">
        <div className="container ibfc-intro-grid">
          <div><span className="ibfc-section-label">QUEM SOMOS</span><h2>Um lugar para servir, aprender e <em>caminhar juntos.</em></h2></div>
          <div className="ibfc-intro-body"><p>O IBFC nasce do compromisso com a família cristã e com a participação cidadã. Conectamos pessoas a iniciativas de educação, esporte, ação social e formação, valorizando o cuidado com o próximo.</p><Link href="/cadastro?origem=portal_ibfc" className="ibfc-text-link">Faça parte dessa história <ArrowRight size={18} /></Link></div>
        </div>
      </section>

      <section className="ibfc-path" id="atuacao">
        <div className="container">
          <div className="ibfc-section-head"><div><span className="ibfc-section-label">SUA JORNADA NO IBFC</span><h2>Existe um caminho para a sua participação.</h2></div><p>Comece pelo cadastro e descubra como suas habilidades e seu tempo podem contribuir.</p></div>
          <div className="ibfc-path-grid">{paths.map(({ Icon, number, title, text }) => <article className="ibfc-path-card" key={number}><span className="ibfc-path-number">{number}</span><div className="ibfc-path-icon"><Icon size={27} strokeWidth={1.8} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="ibfc-invite"><div className="container ibfc-invite-inner"><div className="ibfc-invite-icon"><UsersRound size={34} /></div><div><span className="ibfc-section-label">O PRÓXIMO PASSO É SEU</span><h2>Vamos construir essa jornada juntos?</h2><p>Cadastre-se e escolha os assuntos e atividades que fazem sentido para você.</p></div><Link href="/cadastro?origem=portal_ibfc" className="ibfc-action ibfc-action-yellow">Quero participar <ArrowRight size={20} /></Link></div></section>
    </main>
  </>;
}
