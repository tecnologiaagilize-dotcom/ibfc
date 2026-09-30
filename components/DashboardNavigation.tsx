"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type DashboardNavigationProps = {
  area: "admin" | "member";
};

export default function DashboardNavigation({
  area,
}: DashboardNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin = area === "admin";

  const dashboardHref = isAdmin ? "/admin" : "/membro";
  const dashboardLabel = isAdmin ? "Dashboard" : "Minha área";
  const logoutHref = isAdmin ? "/admin/login" : "/entrar";

  const isDashboard = pathname === dashboardHref;
  const isAdminLogin = pathname === "/admin/login";

  // Não mostrar navegação administrativa na tela de login.
  if (isAdminLogin) {
    return null;
  }

  async function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(dashboardHref);
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const supabase = createClient();

      await supabase.auth.signOut();

      router.replace(logoutHref);
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);

      // Mesmo em caso de falha visual, tentamos levar
      // o usuário para a página de entrada.
      router.replace(logoutHref);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        width: "100%",
        background: "rgba(255,255,255,0.97)",
        borderBottom: "1px solid #e4e7ec",
        boxShadow: "0 2px 8px rgba(16,24,40,0.05)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "min(1200px, calc(100% - 32px))",
          margin: "0 auto",
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "10px 0",
        }}
      >
        {/* LADO ESQUERDO */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {!isDashboard && (
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-secondary"
              style={{
                cursor: "pointer",
              }}
            >
              ← Voltar
            </button>
          )}

          <Link
            href={dashboardHref}
            className="btn btn-secondary"
          >
            ⌂ {dashboardLabel}
          </Link>

          <Link
            href="/"
            className="btn btn-secondary"
          >
            🌐 Site IBFC
          </Link>
        </div>

        {/* LADO DIREITO */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              color: "#667085",
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {isAdmin
              ? "Administração IBFC"
              : "Área do membro"}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              border: "1px solid #fecdca",
              background: "#fff",
              color: "#b42318",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 800,
              cursor: signingOut ? "wait" : "pointer",
              opacity: signingOut ? 0.7 : 1,
            }}
          >
            {signingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      </div>
    </div>
  );
}
