import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

export default async function AccessPage() {
  const supabase =
    await createClient();

  /*
   * Confirma a sessão no servidor.
   */
  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect("/entrar");
  }

  /*
   * Verifica se o UUID autenticado
   * possui perfil administrativo.
   */
  const {
    data: adminProfile,
    error: adminError,
  } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  /*
   * Admin ou editor.
   */
  if (
    !adminError &&
    (
      adminProfile?.role ===
        "admin" ||
      adminProfile?.role ===
        "editor"
    )
  ) {
    redirect("/admin");
  }

  /*
   * Usuário comum.
   */
  redirect("/membro");
}
