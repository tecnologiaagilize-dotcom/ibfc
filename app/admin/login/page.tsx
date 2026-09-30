"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(form.get("password") || "");

    try {
      const supabase = createClient();

      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user || !data.session) {
        setError(
          "Não foi possível estabelecer uma sessão válida. Tente novamente."
        );
        return;
      }

      /*
       * Confirma que o usuário autenticado possui
       * acesso à Central Administrativa.
       */
      const {
        data: adminProfile,
        error: profileError,
      } = await supabase
        .from("admin_profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        setError(
          "Não foi possível verificar sua permissão administrativa."
        );
        return;
      }

      if (
        adminProfile?.role !== "admin" &&
        adminProfile?.role !== "editor"
      ) {
        await supabase.auth.signOut();

        setError(
          "Este usuário não possui acesso à Central Administrativa."
        );
        return;
      }

      /*
       * Recarregamento completo para que o servidor
       * receba a sessão/cookies recém-criados.
       */
      window.location.assign("/admin");
    } catch (err) {
      console.error("Erro no login administrativo:", err);

      setError(
        err instanceof Error
          ? `Não foi possível realizar o acesso: ${err.message}`
          : "Não foi possível realizar o acesso."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background:
          "linear-gradient(135deg, #f7faf8 0%, #eef5f1 100%)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(440px, 100%)",
          padding: 32,
          background: "#ffffff",
          border: "1px solid #e4e7ec",
          borderRadius: 18,
          boxShadow: "0 16px 40px rgba(16, 24, 40, 0.08)",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#157347",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Voltar ao site MFB
        </Link>

        <div
          style={{
            marginTop: 28,
            color: "#157347",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 1.2,
          }}
        >
          CENTRAL ADMINISTRATIVA
        </div>

        <h1
          style={{
            margin: "8px 0 6px",
            fontSize: 32,
            color: "#101828",
          }}
        >
          Administração MFB
        </h1>

        <p
          style={{
            margin: "0 0 28px",
            color: "#667085",
            lineHeight: 1.5,
          }}
        >
          Entre com sua conta autorizada para acessar a gestão da plataforma.
        </p>

        <label
          htmlFor="email"
          style={{
            display: "block",
            marginBottom: 7,
            fontWeight: 700,
            color: "#344054",
          }}
        >
          E-mail
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={loading}
          placeholder="seuemail@exemplo.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 14px",
            marginBottom: 18,
            border: "1px solid #d0d5dd",
            borderRadius: 9,
            fontSize: 15,
            outline: "none",
          }}
        />

        <label
          htmlFor="password"
          style={{
            display: "block",
            marginBottom: 7,
            fontWeight: 700,
            color: "#344054",
          }}
        >
          Senha
        </label>

        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={loading}
          placeholder="Sua senha"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 14px",
            border: "1px solid #d0d5dd",
            borderRadius: 9,
            fontSize: 15,
            outline: "none",
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 18,
              padding: 13,
              borderRadius: 9,
              background: "#fef3f2",
              border: "1px solid #fecdca",
              color: "#b42318",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 22,
            padding: "14px 18px",
            border: 0,
            borderRadius: 9,
            background: "#157347",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 800,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #eaecf0",
            textAlign: "center",
            color: "#98a2b3",
            fontSize: 12,
          }}
        >
          Movimento Família Brasileira
          <br />
          Acesso restrito à equipe autorizada
        </div>
      </form>
    </main>
  );
}
