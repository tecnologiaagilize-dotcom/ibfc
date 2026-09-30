import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashCandidateInviteToken } from "@/lib/candidate-invites";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const ALLOWED_FIELDS = [
  "name",
  "ballot_name",
  "state_uf",
  "city_name",
  "cargo",
  "party",
  "number",
  "biography",
  "mini_cv",
  "political_project",
  "public_experience",
  "priority_areas",
  "proposals",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "website_url",
  "video_url",
  "external_page_url",
  "source_url",
  "source_notes",
] as const;

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const valueClean = value.trim();

  return valueClean.length
    ? valueClean
    : null;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        {
          error: "Link inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (body.confirmed !== true) {
      return NextResponse.json(
        {
          error:
            "É necessário confirmar as informações antes do envio.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = createAdminClient();

    const tokenHash =
      hashCandidateInviteToken(token);

    const {
      data: invite,
      error: inviteError,
    } = await supabase
      .from("candidate_edit_invites")
      .select(
        `
          id,
          candidate_id,
          expires_at,
          revoked_at,
          submitted_at
        `
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (inviteError) {
      console.error(
        "Submit invite lookup:",
        inviteError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível validar o link.",
        },
        {
          status: 500,
        }
      );
    }

    if (!invite) {
      return NextResponse.json(
        {
          error:
            "Link inválido ou inexistente.",
        },
        {
          status: 404,
        }
      );
    }

    if (invite.revoked_at) {
      return NextResponse.json(
        {
          error:
            "Este link foi revogado.",
        },
        {
          status: 410,
        }
      );
    }

    if (invite.submitted_at) {
      return NextResponse.json(
        {
          error:
            "Este cadastro já foi enviado para análise.",
        },
        {
          status: 409,
        }
      );
    }

    const expiration =
      new Date(invite.expires_at).getTime();

    if (
      Number.isNaN(expiration) ||
      expiration <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Este link expirou. Solicite um novo link.",
        },
        {
          status: 410,
        }
      );
    }

    const {
      data: candidate,
      error: candidateError,
    } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", invite.candidate_id)
      .maybeSingle();

    if (
      candidateError ||
      !candidate
    ) {
      return NextResponse.json(
        {
          error:
            "Cadastro não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const payload: Record<
      string,
      string | null
    > = {};

    for (const field of ALLOWED_FIELDS) {
      payload[field] =
        cleanText(body[field]);
    }

    if (!payload.name) {
      return NextResponse.json(
        {
          error:
            "Informe o nome completo.",
        },
        {
          status: 400,
        }
      );
    }

    if (!payload.cargo) {
      return NextResponse.json(
        {
          error:
            "Informe o cargo.",
        },
        {
          status: 400,
        }
      );
    }

    if (!payload.state_uf) {
      return NextResponse.json(
        {
          error:
            "Informe a UF.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Grava uma fotografia completa
     * do formulário enviado.
     *
     * NÃO altera candidates.
     */
    const {
      error: submissionError,
    } = await supabase
      .from(
        "candidate_edit_submissions"
      )
      .insert({
        invite_id: invite.id,
        candidate_id:
          invite.candidate_id,
        payload,
        status: "pending",
        submitted_at: now,
      });

    if (submissionError) {
      console.error(
        "Submission insert:",
        submissionError
      );

      if (
        submissionError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "Este cadastro já foi enviado para análise.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Não foi possível enviar o cadastro para análise.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Encerra o token.
     */
    const {
      error: inviteUpdateError,
    } = await supabase
      .from("candidate_edit_invites")
      .update({
        submitted_at: now,
      })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      console.error(
        "Invite submitted_at:",
        inviteUpdateError
      );
    }

    /*
     * O candidato passa para
     * EM REVISÃO.
     *
     * Status de publicação permanece
     * inalterado.
     */
    const {
      error: candidateUpdateError,
    } = await supabase
      .from("candidates")
      .update({
        review_status: "in_review",
        updated_at: now,
      })
      .eq(
        "id",
        invite.candidate_id
      );

    if (candidateUpdateError) {
      console.error(
        "Candidate review status:",
        candidateUpdateError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Cadastro enviado para análise.",
    });
  } catch (error) {
    console.error(
      "Candidate submission:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível enviar o cadastro.",
      },
      {
        status: 500,
      }
    );
  }
}
