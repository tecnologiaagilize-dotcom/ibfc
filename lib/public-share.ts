import { createClient } from "@supabase/supabase-js";

export type SharedCandidate = {
  name: string;
  ballot_name?: string | null;
  slug: string;
  cargo: string;
  state_uf: string;
  number?: string | null;
  photo_url?: string | null;
};

// Robôs de prévia de links acessam sem sessão. A consulta usa apenas
// candidatos publicados e a mesma chave pública usada no site.
export async function getPublicSharedCandidate(slug: string): Promise<SharedCandidate | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .from("candidates")
    .select("name, ballot_name, slug, cargo, state_uf, number, photo_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Falha ao consultar candidato para prévia pública:", error.code, error.message);
    return null;
  }

  return data;
}
