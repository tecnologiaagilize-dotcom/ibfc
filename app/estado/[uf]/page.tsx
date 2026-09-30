import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CandidateCard } from "@/components/CandidateCard";
import { stateName } from "@/lib/states";
import { notFound } from "next/navigation";
import { cargoRank } from "@/lib/candidates/cargo-order";

export const dynamic = "force-dynamic";

export default async function StatePage({ params }: { params: Promise<{uf:string}> }) {
  const { uf } = await params;
  const upper = uf.toUpperCase();
  const name = stateName(upper);
  if (name === upper) return notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates_public")
    .select("*")
    .eq("state_uf", upper)
    .eq("status", "published");

  const candidates = [...(data ?? [])].sort((a, b) =>
    cargoRank(a.cargo) - cargoRank(b.cargo) ||
    Number(a.display_order ?? 1000) - Number(b.display_order ?? 1000) ||
    (a.ballot_name || a.name).localeCompare(b.ballot_name || b.name, "pt-BR", { sensitivity: "base" })
  );

  return (
    <>
      <Header />
      <main className="section">
        <div className="container">
          <span className="badge">{upper}</span>
          <h1 style={{fontSize:"clamp(40px,6vw,62px)",margin:"12px 0"}}>{name}</h1>
          <p style={{fontSize:18,color:"#667085"}}>Candidatos indicados pelo Movimento Família Brasileira — Eleições 2026.</p>
          <div className="colinha-state-callout">
            <div><strong>Crie sua colinha</strong><p>Escolha candidatos publicados para {name} e adicione sua foto ao cartaz.</p></div>
            <Link className="btn btn-primary" href={`/colinha?uf=${upper}`}>Personalizar minha colinha</Link>
          </div>

          {candidates.length === 0 ? (
            <div className="card" style={{padding:26,marginTop:30}}>
              <strong>Nenhum candidato publicado neste Estado.</strong>
              <p style={{color:"#667085"}}>A lista poderá ser atualizada pelo painel administrativo.</p>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:20,marginTop:30}}>
              {candidates.map((c:any) => <CandidateCard candidate={c} key={c.id} />)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
