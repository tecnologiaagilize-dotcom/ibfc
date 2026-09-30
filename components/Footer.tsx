import { createClient } from "@/lib/supabase/server";
import { VisitCounter } from "@/components/VisitCounter";
import Image from "next/image";
import Link from "next/link";

const defaults = {
  company_name: "Agilize Tecnologia",
  cnpj: "01.596.311/0001-28",
  website_url: "https://site-agilize-tecnologia.vercel.app/"
};

export async function Footer() {
  let development = defaults;
  let visitTotal: number | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("company_name,cnpj,website_url")
      .eq("setting_key", "development")
      .maybeSingle();

    if (data) development = { ...defaults, ...data };

    const { data: visits, error } = await supabase
      .from("site_visit_days")
      .select("visit_count");
    if (!error) {
      visitTotal = (visits ?? []).reduce((sum, row) => sum + Number(row.visit_count || 0), 0);
    }
  } catch {
    // Mantém os dados institucionais padrão enquanto a migração não for aplicada.
  }

  return (
    <footer className="ibfc-footer">
      <div className="container ibfc-footer-grid">
        <div className="ibfc-footer-brand">
          <Image src="/logo-ibfc.png" alt="Instituto Brasileiro da Família Cristã" width={315} height={105} />
          <p>Família, fé e cidadania. Um espaço para aprender, servir e caminhar juntos.</p>
          <VisitCounter initialTotal={visitTotal} />
        </div>
        <div className="ibfc-footer-links"><strong>EXPLORE</strong><Link href="/#missao">Quem somos</Link><Link href="/#atuacao">Como participar</Link><Link href="/entrar">Área do membro</Link><Link href="/cadastro?origem=portal_ibfc">Quero participar</Link></div>
        <div className="ibfc-footer-info">
          <strong>INSTITUCIONAL</strong>
          <p>Informações sobre atividades e projetos são atualizadas pela equipe do instituto.</p>
          <div style={{marginTop:12}}>
            Todos os direitos reservados para {development.company_name} — CNPJ: {development.cnpj}.{" "}
            <a
              href={development.website_url}
              target="_blank"
              rel="noreferrer"
            >
              {development.website_url}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
