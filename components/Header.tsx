import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="nav">
      <div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:76,gap:20}}>
        <Link href="/" style={{display:"flex",alignItems:"center",gap:12}}>
          <Image src="/logo-ibfc.svg" alt="Instituto Brasileiro da Família Cristã" width={74} height={74} style={{objectFit:"contain"}} priority />
          <div style={{fontWeight:900,lineHeight:1.05}}>
            <div style={{color:"#009b5b",fontSize:18}}>IBFC</div>
            <div style={{fontSize:11,color:"#475467"}}>INSTITUTO BRASILEIRO DA FAMÍLIA CRISTÃ</div>
          </div>
        </Link>
        <nav style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <Link href="/#missao">Quem Somos</Link>
          <Link href="/#missao">Nossa missão</Link>
          <Link href="/#atuacao">Como participar</Link>
        <Link href="/entrar" style={{fontWeight:800,color:"#172033"}}>Entrar</Link>
          <Link href="/cadastro" className="btn btn-primary" style={{minHeight:40,padding:"0 14px",color:"white"}}>Quero participar</Link>
        </nav>
      </div>
    </header>
  );
}
