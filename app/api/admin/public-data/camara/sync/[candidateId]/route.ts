import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { syncCamaraCandidate } from "@/lib/integrations/camara/sync";

/* ============================================================
   TIPOS
============================================================ */

type RouteContext = {
  params: Promise<{
    candidateId: string;
  }>;
};

type RequestBody = {
  externalIdentityId?: string | null;
  deputadoId?: string | number | null;
};

/* ============================================================
   HELPERS
============================================================ */

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return "Erro desconhecido.";
}

async function readBody(
  request: NextRequest
): Promise<RequestBody> {
  try {
    const contentType =
      request.headers.get("content-type") || "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return {};
    }

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return {};
    }

    return body as RequestBody;
  } catch {
    return {};
  }
}

/* ============================================================
   POST
============================================================ */

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    /* --------------------------------------------------------
       1. IDENTIFICAR CANDIDATO
    -------------------------------------------------------- */

    const { candidateId } =
      await context.params;

    if (!candidateId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "candidateId não informado.",
        },
        {
          status: 400,
        }
      );
    }

    /* --------------------------------------------------------
       2. SUPABASE / AUTENTICAÇÃO
    -------------------------------------------------------- */

    const supabase =
      await createClient();

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    /* --------------------------------------------------------
       3. AUTORIZAÇÃO ADMINISTRATIVA
    -------------------------------------------------------- */

    const {
      data: adminProfile,
      error: profileError,
    } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq(
        "id",
        authData.user.id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Erro ao consultar perfil administrativo:",
        profileError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Não foi possível validar o perfil administrativo.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !adminProfile ||
      !["admin", "editor"].includes(
        adminProfile.role
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Usuário sem permissão para executar esta operação.",
        },
        {
          status: 403,
        }
      );
    }

    /* --------------------------------------------------------
       4. CANDIDATO
    -------------------------------------------------------- */

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
          state_uf
        `
      )
      .eq("id", candidateId)
      .maybeSingle();

    if (candidateError) {
      console.error(
        "Erro ao consultar candidato:",
        candidateError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Não foi possível consultar o candidato.",
        },
        {
          status: 500,
        }
      );
    }

    if (!candidate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Candidato não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /* --------------------------------------------------------
       5. PARÂMETROS OPCIONAIS
    -------------------------------------------------------- */

    const body =
      await readBody(request);

    const deputadoId =
      body.deputadoId !==
        undefined &&
      body.deputadoId !==
        null &&
      String(
        body.deputadoId
      ).trim()
        ? String(
            body.deputadoId
          ).trim()
        : null;

    const externalIdentityId =
      body.externalIdentityId &&
      String(
        body.externalIdentityId
      ).trim()
        ? String(
            body.externalIdentityId
          ).trim()
        : null;

    /* --------------------------------------------------------
       6. EXECUTAR SINCRONIZAÇÃO
    -------------------------------------------------------- */

    const result =
      await syncCamaraCandidate(
        supabase,
        {
          candidateId,

          externalIdentityId,

          deputadoId,

          candidateName:
            candidate.ballot_name ||
            candidate.name,

          candidateFullName: candidate.name,

          stateUf:
            candidate.state_uf ||
            null,
        }
      );

    /* --------------------------------------------------------
       7. RESPOSTA
    -------------------------------------------------------- */

    return NextResponse.json(
      {
        ok: true,

        message:
          "Sincronização administrativa concluída. Os registros coletados permanecem sujeitos à revisão antes de qualquer incorporação.",

        result: {
          syncRunId:
            result.syncRunId,

          candidateId:
            result.candidateId,

          deputadoId:
            result.deputadoId,

          providerId:
            result.providerId,

          collected:
            result.collected,

          inserted:
            result.inserted,

          updated:
            result.updated,

          skipped:
            result.skipped,

          errors:
            result.errors,

          errorMessages:
            result.errorMessages,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const message =
      errorMessage(error);

    console.error(
      "Erro na sincronização administrativa da Câmara:",
      error
    );

    /*
     * Alguns erros conhecidos podem ser apresentados
     * como problemas de configuração/dados, em vez de
     * erro interno genérico.
     */
    if (
      message.includes(
        "identificação externa"
      ) ||
      message.includes(
        "identidade externa"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: message,
        },
        {
          status: 422,
        }
      );
    }

    if (
      message.includes(
        "provedor"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: message,
        },
        {
          status: 503,
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Não foi possível concluir a sincronização administrativa da Câmara.",
        detail: message,
      },
      {
        status: 500,
      }
    );
  }
}
