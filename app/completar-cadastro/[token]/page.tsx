import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashCandidateInviteToken } from "@/lib/candidate-invites";

import CandidateExternalForm from "@/components/CandidateExternalForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

type Candidate = {
  id: string;
  name: string;
  ballot_name: string | null;
  photo_url: string | null;

  state_uf: string;
  city_name: string | null;
  cargo: string;
  party: string | null;
  number: string | null;

  biography: string | null;
  mini_cv: string | null;
  political_project: string | null;
  public_experience: string | null;
  priority_areas: string | null;
  proposals: string | null;

  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  video_url: string | null;
  external_page_url: string | null;

  source_url: string | null;
  source_notes: string | null;
};

async function validateInvite(
  token: string
) {
  try {
    if (!token) {
      return {
        ok: false as const,
        message:
          "O link informado é inválido.",
      };
    }

    const supabase =
      createAdminClient();

    const tokenHash =
      hashCandidateInviteToken(
        token
      );

    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from(
        "candidate_edit_invites"
      )
      .select(
        `
          id,
          candidate_id,
          expires_at,
          revoked_at,
          submitted_at,
          access_count
        `
      )
      .eq(
        "token_hash",
        tokenHash
      )
      .maybeSingle();

    if (inviteError) {
      console.error(
        "Invite lookup:",
        inviteError
      );

      return {
        ok: false as const,
        message:
          "Não foi possível consultar este link.",
      };
    }

    if (!invite) {
      return {
        ok: false as const,
        message:
          "Este link não existe ou não é mais válido.",
      };
    }

    if (invite.revoked_at) {
      return {
        ok: false as const,
        message:
          "Este link foi revogado. Solicite um novo link.",
      };
    }

    if (invite.submitted_at) {
      return {
        ok: false as const,
        message:
          "Este cadastro já foi enviado para análise.",
      };
    }

    const expiration =
      new Date(
        invite.expires_at
      ).getTime();

    if (
      Number.isNaN(expiration) ||
      expiration <= Date.now()
    ) {
      return {
        ok: false as const,
        message:
          "Este link expirou. Solicite um novo link.",
      };
    }

    const {
      data: candidate,
      error: candidateError,
    } = await supabase
      .from("candidates")
      .select(
        `
          id,
          name,
          ballot_name,
          photo_url,
          state_uf,
          city_name,
          cargo,
          party,
          number,
          biography,
          mini_cv,
          political_project,
          public_experience,
          priority_areas,
          proposals,
          instagram_url,
          facebook_url,
          youtube_url,
          website_url,
          video_url,
          external_page_url,
          source_url,
          source_notes
        `
      )
      .eq(
        "id",
        invite.candidate_id
      )
      .maybeSingle();

    if (
      candidateError ||
      !candidate
    ) {
      console.error(
        "Candidate lookup:",
        candidateError
      );

      return {
        ok: false as const,
        message:
          "O cadastro relacionado a este link não foi encontrado.",
      };
    }

    await supabase
      .from(
        "candidate_edit_invites"
      )
      .update({
        last_accessed_at:
          new Date().toISOString(),

        access_count:
          Number(
            invite.access_count ??
              0
          ) + 1,
      })
      .eq("id", invite.id);

    return {
      ok: true as const,

      expiresAt:
        invite.expires_at,

      candidate:
        candidate as Candidate,
    };
  } catch (error) {
    console.error(
      "Candidate completion:",
      error
    );

    return {
      ok: false as const,
      message:
        "O sistema não conseguiu validar este link.",
    };
  }
}

export default async function CandidateCompletionPage({
  params,
}: PageProps) {
  const { token } =
    await params;

  const result =
    await validateInvite(token);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8faf9",
        padding: "40px 18px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-block",
              textDecoration: "none",
              color: "#157347",
              fontSize: 21,
              fontWeight: 900,
              marginBottom: 12,
            }}
          >
            MFB
          </Link>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize:
                "clamp(30px, 5vw, 44px)",
              lineHeight: 1.1,
              color: "#101828",
            }}
          >
            Complete seu cadastro
          </h1>

          <p
            style={{
              margin: "0 auto",
              maxWidth: 650,
              color: "#667085",
              lineHeight: 1.6,
            }}
          >
            Revise e complemente as
            informações antes de
            enviá-las para análise.
          </p>
        </header>

        {!result.ok ? (
          <section
            style={{
              padding: 32,
              border:
                "1px solid #fecdca",
              borderRadius: 16,
              background: "#fff",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 38,
                marginBottom: 12,
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                margin:
                  "0 0 10px",
              }}
            >
              Link indisponível
            </h2>

            <p
              style={{
                margin: 0,
                color: "#667085",
              }}
            >
              {result.message}
            </p>
          </section>
        ) : (
          <section
            style={{
              padding:
                "28px clamp(18px, 4vw, 36px)",
              border:
                "1px solid #d0d5dd",
              borderRadius: 16,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 22,
                alignItems:
                  "center",
                flexWrap: "wrap",
              }}
            >
              {result.candidate
                .photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    result.candidate
                      .photo_url
                  }
                  alt=""
                  style={{
                    width: 100,
                    height: 125,
                    objectFit:
                      "cover",
                    borderRadius: 14,
                    border:
                      "1px solid #e4e7ec",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 125,
                    borderRadius: 14,
                    background:
                      "#f2f4f7",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: 38,
                    fontWeight: 900,
                    color:
                      "#157347",
                  }}
                >
                  {(
                    result.candidate
                      .ballot_name ||
                    result.candidate
                      .name
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div
                style={{
                  flex:
                    "1 1 300px",
                }}
              >
                <div
                  style={{
                    color:
                      "#157347",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 1,
                    marginBottom: 6,
                  }}
                >
                  CADASTRO IDENTIFICADO
                </div>

                <h2
                  style={{
                    margin:
                      "0 0 8px",
                    fontSize: 28,
                  }}
                >
                  {result.candidate
                    .ballot_name ||
                    result.candidate
                      .name}
                </h2>

                <div
                  style={{
                    color:
                      "#667085",
                    lineHeight: 1.7,
                  }}
                >
                  {
                    result.candidate
                      .cargo
                  }

                  {result.candidate
                    .state_uf
                    ? ` • ${result.candidate.state_uf}`
                    : ""}

                  {result.candidate
                    .party
                    ? ` • ${result.candidate.party}`
                    : ""}

                  {result.candidate
                    .number
                    ? ` • Nº ${result.candidate.number}`
                    : ""}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                padding: 15,
                borderRadius: 10,
                background:
                  "#ecfdf3",
                border:
                  "1px solid #abefc6",
                color: "#027a48",
              }}
            >
              <strong>
                ✓ Link validado
              </strong>
              {" — "}
              válido até{" "}
              {new Intl.DateTimeFormat(
                "pt-BR",
                {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone:
                    "America/Sao_Paulo",
                }
              ).format(
                new Date(
                  result.expiresAt
                )
              )}
              .
            </div>

            <CandidateExternalForm
              token={token}
              candidate={
                result.candidate
              }
            />
          </section>
        )}

        <footer
          style={{
            textAlign: "center",
            marginTop: 28,
            color: "#98a2b3",
            fontSize: 13,
          }}
        >
          Movimento Família Brasileira
        </footer>
      </div>
    </main>
  );
}
