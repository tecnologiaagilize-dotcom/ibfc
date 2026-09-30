import { createClient } from "@/lib/supabase/server";
import { VisitCounter } from "@/components/VisitCounter";

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
    <footer style={{background:"#071b2b",color:"#d0d5dd",padding:"40px 0"}}>
      <div className="container" style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
        <div>
          <strong style={{color:"white"}}>IBFC — Instituto Brasileiro da Família Cristã</strong>
          <div style={{marginTop:8,fontSize:14}}>Portal institucional</div>
          <VisitCounter initialTotal={visitTotal} />
        </div>
        <div style={{fontSize:13,maxWidth:520}}>
          <div>Informações sobre atividades e projetos são atualizadas pela equipe do instituto.</div>
          <div style={{marginTop:12}}>
            Todos os direitos reservados para {development.company_name} — CNPJ: {development.cnpj}.{" "}
            <a
              href={development.website_url}
              target="_blank"
              rel="noreferrer"
              style={{color:"#ffffff",textDecoration:"underline"}}
            >
              {development.website_url}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
