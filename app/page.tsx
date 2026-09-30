import Link from "next/link";
import Image from "next/image";
import { BookOpen, HeartHandshake, MapPin, MessageCircleMore } from "lucide-react";
import { Header } from "@/components/Header";

export default function Home() {
  return <>
    <Header />
    <main className="mfb-home">
      <section className="hero">
        <div className="container mfb-hero-grid" style={{padding:"80px 0",display:"grid",gridTemplateColumns:"1.15fr .85fr",gap:40,alignItems:"center"}}>
          <div>
            <span style={{display:"inline-block",padding:"7px 12px",border:"1px solid rgba(255,255,255,.35)",borderRadius:999,fontSize:12,fontWeight:800}}>IBFC · PARTICIPAÇÃO VOLUNTÁRIA</span>
            <h1 style={{fontSize:"clamp(38px,6vw,70px)",lineHeight:1.04,margin:"20px 0"}}>Instituto Brasileiro da Família Cristã</h1>
            <p style={{fontSize:20,lineHeight:1.65,color:"#d9f4e7",maxWidth:680}}>Uma rede de cidadania e voluntariado em Brasília. Escolha sua região e como deseja participar de cursos, ações comunitárias e atividades do instituto.</p>
            <div style={{display:"flex",gap:12,marginTop:28,flexWrap:"wrap"}}>
              <Link href="/cadastro?origem=portal_ibfc" className="btn btn-primary">Quero participar</Link>
              <Link href="/#missao" className="btn btn-secondary">Conheça o instituto</Link>
            </div>
          </div>
          <div className="mfb-hero-visual" style={{display:"flex",justifyContent:"center"}}><Image src="/logo-ibfc.svg" alt="IBFC" width={320} height={320} priority /></div>
        </div>
      </section>
      <section className="section" id="missao"><div className="container" style={{maxWidth:900}}>
        <span className="badge">NOSSA MISSÃO</span>
        <h2 style={{fontSize:"clamp(30px,4vw,44px)",margin:"14px 0"}}>Sua participação começa na sua comunidade</h2>
        <p style={{fontSize:18,lineHeight:1.8,color:"#475467"}}>O IBFC reúne pessoas interessadas em fortalecer as famílias, aprender sobre cidadania e contribuir com iniciativas de educação, ação social, esporte e participação comunitária. Sua inscrição é voluntária; a equipe entrará em contato apenas conforme as opções que você escolher.</p>
      </div></section>
      <section className="section" id="atuacao" style={{background:"#f5faf7"}}><div className="container">
        <span className="badge">SUA JORNADA</span><h2 style={{fontSize:"clamp(30px,4vw,44px)",margin:"14px 0 30px"}}>Uma missão, diferentes formas de participar</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18}}>
          {[
            [HeartHandshake,"Participe","Conte como gostaria de colaborar e escolha sua região."],
            [BookOpen,"Aprenda","Acesse cursos e trilhas de formação na sua área de membro."],
            [MapPin,"Aja na sua região","Conheça atividades e eventos disponíveis perto de você."],
            [MessageCircleMore,"Acompanhe","Veja sua inscrição e converse com a equipe quando precisar."],
          ].map(([Icon,title,description]) => {const Symbol=Icon as typeof HeartHandshake;return <article className="card" key={title as string} style={{padding:24}}><Symbol size={30} color="#087f50"/><h3 style={{fontSize:21,margin:"14px 0 8px"}}>{title as string}</h3><p style={{lineHeight:1.65,color:"#475467"}}>{description as string}</p></article>})}
        </div>
        <div style={{marginTop:30}}><Link href="/cadastro?origem=portal_ibfc" className="btn btn-primary">Iniciar minha participação</Link></div>
      </div></section>
    </main>
  </>;
}
