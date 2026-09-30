import { Header } from "@/components/Header";
import { ColinhaBuilder } from "@/components/ColinhaBuilder";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha colinha | Movimento Família Brasileira", description: "Monte e salve sua própria lista de candidatos publicados." };
export default async function ColinhaPage({ searchParams }: { searchParams: Promise<{ uf?: string }> }) {
  const requested = (await searchParams).uf?.toUpperCase() ?? "";
  const supabase = await createClient();
  // Use the same published source as /candidatos. Asking the public view for a
  // column that is absent from one deployment made the entire list disappear.
  const { data, error } = await supabase.from("candidates").select("*").eq("status", "published").order("name");
  if (error) console.error("Falha ao consultar candidatos publicados para colinha:", error.code, error.message);
  const candidates = (data ?? []).map(item => ({
    id: String(item.id), name: String(item.name ?? ""), ballot_name: item.ballot_name ?? null,
    cargo: String(item.cargo ?? ""), number: item.number ?? null,
    state_uf: String(item.state_uf ?? "").trim().toUpperCase(),
    city_name: item.city_name ?? null, photo_url: item.photo_url ?? null,
    slug: String(item.slug ?? ""),
  }));
  return <><Header /><main className="container colinha-page"><ColinhaBuilder candidates={candidates} initialState={requested} loadError={Boolean(error)} /></main></>;
}
