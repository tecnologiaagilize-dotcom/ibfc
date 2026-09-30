import {
  createClient,
} from "@/lib/supabase/server";

import {
  redirect,
} from "next/navigation";

import Link from "next/link";

import {
  AdminShell,
} from "@/components/admin/AdminShell";

import CandidateOrderManager from "@/components/admin/CandidateOrderManager";

export const dynamic =
  "force-dynamic";

export default async function CandidatesAdminPage() {
  const supabase =
    await createClient();

  /*
   * 1. CONFIRMA SESSÃO
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
    redirect(
      "/admin/login"
    );
  }

  /*
   * 2. CONFIRMA AUTORIZAÇÃO
   */
  const {
    data: adminProfile,
    error: profileError,
  } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !adminProfile ||
    (
      adminProfile.role !==
        "admin" &&
      adminProfile.role !==
        "editor"
    )
  ) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * 3. CARREGA CANDIDATOS
   */
  const {
    data,
    error,
  } = await supabase
    .from("candidates")
    .select(
      `
        id,
        name,
        ballot_name,
        photo_url,
        photo_position_x,
        photo_position_y,
        photo_zoom,
        state_uf,
        city_name,
        cargo,
        party,
        number,
        status,
        review_status,
        display_order,
        created_at
      `
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  const candidates =
    data ?? [];

  return (
    <AdminShell
      email={
        user.email
      }
    >
      <div className="admin-heading">
        <div>
          <span className="badge">
            GESTÃO
          </span>

          <h1>
            Apoiados
          </h1>

          <p>
            Cadastre, revise,
            publique e organize os
            registros exibidos no
            ambiente público.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          href="/admin/candidatos/novo"
        >
          + Novo cadastro
        </Link>
      </div>

      {error ? (
        <section
          className="admin-panel"
          style={{
            padding: 22,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background:
                "#fef3f2",
              border:
                "1px solid #fecdca",
              color:
                "#b42318",
            }}
          >
            <strong>
              Não foi possível
              carregar os
              candidatos.
            </strong>

            <div
              style={{
                marginTop: 6,
              }}
            >
              {error.message}
            </div>
          </div>
        </section>
      ) : (
        <CandidateOrderManager
          candidates={candidates.map(
            (candidate) => ({
              id:
                candidate.id,

              name:
                candidate.name,

              ballot_name:
                candidate.ballot_name,

              photo_url:
                candidate.photo_url,

              photo_position_x:
                candidate.photo_position_x,

              photo_position_y:
                candidate.photo_position_y,

              photo_zoom:
                candidate.photo_zoom,

              state_uf:
                candidate.state_uf,

              city_name:
                candidate.city_name,

              cargo:
                candidate.cargo,

              party:
                candidate.party,

              number:
                candidate.number,

              status:
                candidate.status,

              review_status:
                candidate.review_status,

              display_order:
                candidate.display_order,
            })
          )}
        />
      )}
    </AdminShell>
  );
}
