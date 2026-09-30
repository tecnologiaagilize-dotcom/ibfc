import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { syncSenadoCandidate } from "@/lib/integrations/senado/sync";

type RouteContext = {
  params: Promise<{ candidateId: string }>;
};

type RequestBody = {
  externalIdentityId?: string | null;
  senadorId?: string | number | null;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Erro desconhecido.";
}

async function readBody(request: NextRequest): Promise<RequestBody> {
  try {
    if (!(request.headers.get("content-type") || "").includes("application/json")) {
      return {};
    }
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as RequestBody)
      : {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { candidateId } = await context.params;

    if (!candidateId) {
      return NextResponse.json({ ok: false, error: "candidateId não informado." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Usuário não autenticado." }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível validar o perfil administrativo." },
        { status: 500 }
      );
    }

    if (!adminProfile || !["admin", "editor"].includes(adminProfile.role)) {
      return NextResponse.json(
        { ok: false, error: "Usuário sem permissão para executar esta operação." },
        { status: 403 }
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id, name, ballot_name, state_uf")
      .eq("id", candidateId)
      .maybeSingle();

    if (candidateError) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível consultar o candidato." },
        { status: 500 }
      );
    }

    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Candidato não encontrado." }, { status: 404 });
    }

    const body = await readBody(request);

    const senadorId =
      body.senadorId !== undefined &&
      body.senadorId !== null &&
      String(body.senadorId).trim()
        ? String(body.senadorId).trim()
        : null;

    const externalIdentityId =
      body.externalIdentityId && String(body.externalIdentityId).trim()
        ? String(body.externalIdentityId).trim()
        : null;

    const result = await syncSenadoCandidate(supabase, {
      candidateId,
      externalIdentityId,
      senadorId,
      candidateName: candidate.ballot_name || candidate.name,
      candidateFullName: candidate.name,
      stateUf: candidate.state_uf || null,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Sincronização administrativa do Senado concluída. Os registros permanecem sujeitos à revisão antes de qualquer incorporação.",
      result,
    });
  } catch (error) {
    const message = errorMessage(error);
    console.error("Erro na sincronização administrativa do Senado:", error);

    if (message.includes("identificação externa") || message.includes("identidade externa")) {
      return NextResponse.json({ ok: false, error: message }, { status: 422 });
    }

    if (message.includes("provedor")) {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Não foi possível concluir a sincronização administrativa do Senado.",
        detail: message,
      },
      { status: 500 }
    );
  }
}
