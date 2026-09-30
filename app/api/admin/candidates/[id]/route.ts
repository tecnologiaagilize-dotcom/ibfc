import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID do candidato não informado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Cliente Supabase vinculado à sessão atual.
     */
    const supabase = await createClient();

    /*
     * 1. Confirma que existe usuário autenticado.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Sessão administrativa não encontrada. Entre novamente no painel.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 2. Confirma que o usuário é administrador.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Erro ao consultar admin_profiles:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível verificar a permissão administrativa.",
        },
        {
          status: 500,
        }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil administrativo não encontrado.",
        },
        {
          status: 403,
        }
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Somente administradores podem excluir candidatos.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * 3. Confirma que o candidato existe.
     */
    const {
      data: candidate,
      error: candidateError,
    } = await supabase
      .from("candidates")
      .select("id, name, ballot_name")
      .eq("id", id)
      .maybeSingle();

    if (candidateError) {
      console.error(
        "Erro ao consultar candidato:",
        candidateError
      );

      return NextResponse.json(
        {
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
          error: "Candidato não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * 4. Exclui o candidato.
     *
     * As tabelas relacionadas devem utilizar
     * ON DELETE CASCADE quando fizer sentido.
     *
     * Se existir alguma FK bloqueando a exclusão,
     * o Supabase retornará a mensagem e nós a
     * apresentaremos no painel.
     */
    const { error: deleteError } =
      await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "Erro Supabase ao excluir candidato:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível excluir o candidato: " +
            deleteError.message,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * 5. Resposta de sucesso.
     */
    return NextResponse.json(
      {
        success: true,

        message:
          "Candidato excluído com sucesso.",

        candidate: {
          id: candidate.id,
          name:
            candidate.ballot_name ||
            candidate.name,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Erro inesperado na exclusão do candidato:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao excluir candidato.",
      },
      {
        status: 500,
      }
    );
  }
}
