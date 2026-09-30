import { createClient } from "@supabase/supabase-js";

export type SharedCandidate = {
  name: string;
  ballot_name?: string | null;
  slug: string;
  cargo: string;
  state_uf: string;
  number?: string | null;
  photo_url?: string | null;
  photo_position_x?: number | null;
  photo_position_y?: number | null;
  photo_zoom?: number | null;
};

export function sharedCandidateName(candidate: SharedCandidate): string {
  const ballotName = candidate.ballot_name?.trim();
  return ballotName && !/^\d+$/.test(ballotName)
    ? ballotName
    : candidate.name;
}

// Robôs de prévia de links acessam sem sessão. A consulta usa apenas
// candidatos publicados e a mesma chave pública usada no site.
export async function getPublicSharedCandidate(slug: string): Promise<SharedCandidate | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .from("candidates_public")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!error && data) return data;

  const fallback = await supabase
    .from("candidates")
    .select("name, ballot_name, slug, cargo, state_uf, number, photo_url, photo_position_x, photo_position_y, photo_zoom")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (fallback.error) {
    console.error("Falha ao consultar candidato para prévia pública:", error?.code, fallback.error.code);
  }

  return fallback.data;
}
