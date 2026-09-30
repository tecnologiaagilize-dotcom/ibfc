"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function loginAdmin(email: string, password: string): Promise<{ error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: "O Supabase não está configurado. Confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel e refaça o deployment." };
  }
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 320 || password.length > 1024) {
    return { error: "Preencha e-mail e senha válidos." };
  }

  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), 20000);
  let stage = "autenticação";
  try {
    const store = await cookies();
    const db = createServerClient(url, key, {
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          cache: "no-store",
          signal: init?.signal
            ? AbortSignal.any([init.signal, deadline.signal])
            : deadline.signal,
        }),
      },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        },
      },
    });
    const { data, error } = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (deadline.signal.aborted) throw new Error("timeout");
      if (error.code === "invalid_credentials") return { error: "E-mail ou senha incorretos." };
      if (error.code === "email_not_confirmed") return { error: "Confirme seu e-mail antes de entrar." };
      return { error: "Não foi possível autenticar: " + error.message };
    }
    if (!data.user || !data.session) return { error: "Não foi possível criar a sessão. Tente novamente." };

    stage = "verificação da permissão administrativa";
    const { data: profile, error: profileError } = await db.from("admin_profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profileError || !profile || !["admin", "editor"].includes(profile.role)) {
      // Limpa a sessão local sem esperar uma chamada de logout remoto.
      await db.auth.signOut({ scope: "local" });
      if (deadline.signal.aborted) throw new Error("timeout");
      return { error: profileError
        ? "Não foi possível consultar admin_profiles. Confira a tabela e a política de leitura no Supabase. Código: " + profileError.code
        : "Sua conta não possui acesso administrativo neste projeto Supabase." };
    }
    return {};
  } catch {
    return { error: deadline.signal.aborted
      ? "O Supabase não respondeu durante a " + stage + ". Confira se o projeto está ativo e se as variáveis da Vercel apontam para ele."
      : "Falha durante a " + stage + ". Confira a conexão e a configuração do Supabase na Vercel." };
  } finally {
    clearTimeout(timer);
  }
}
