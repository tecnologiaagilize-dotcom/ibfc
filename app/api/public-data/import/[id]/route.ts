import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RecordType =
  | "position"
  | "proposition"
  | "vote"
  | "committee"
  | "delivery"
  | "profile"
  | "other";

type JsonObject = Record<string, any>;

function stringValue(
  payload: JsonObject,
  key: string,
  fallback: string | null = null
) {
  const value = payload?.[key];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

function booleanValue(
  payload: JsonObject,
  key: string,
  fallback = false
) {
  const value = payload?.[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "sim"].includes(
      value.toLowerCase()
    );
  }

  return fallback;
}

function dateValue(
  payload: JsonObject,
  key: string,
  fallback: string | null = null
) {
  const value = stringValue(
    payload,
    key,
    fallback
  );

  if (!value) {
    return null;
  }

  /*
   * As tabelas de Atuação Pública trabalham com
   * datas simples YYYY-MM-DD.
   *
   * Quando uma integração fornecer timestamp,
   * preservamos somente a parte da data.
   */
  return value.length >= 10
    ? value.substring(0, 10)
    : value;
}

function arrayValue(
  payload: JsonObject,
  key: string
): string[] {
  const value = payload?.[key];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function mergePayload(
  rawPayload: JsonObject | null,
  normalizedPayload: JsonObject | null
) {
  return {
    ...(rawPayload || {}),
    ...(normalizedPayload || {}),
  };
}

function buildPositionPayload(
  candidateId: string,
  item: any,
  payload: JsonObject,
  sourceName: string
) {
  const title =
    stringValue(payload, "title") ||
    item.title;

  if (!title) {
    throw new Error(
      "O registro não possui título para criação do cargo ou mandato."
    );
  }

  const isCurrent = booleanValue(
    payload,
    "is_current",
    false
  );

  return {
    candidate_id: candidateId,

    position_type:
      stringValue(
        payload,
        "position_type",
        "public_office"
      ) || "public_office",

    title,

    institution:
      stringValue(payload, "institution"),

    country_code:
      stringValue(
        payload,
        "country_code",
        "BR"
      ) || "BR",

    state_uf:
      stringValue(payload, "state_uf")
        ?.toUpperCase() || null,

    city_name:
      stringValue(payload, "city_name"),

    start_date:
      dateValue(payload, "start_date"),

    end_date: isCurrent
      ? null
      : dateValue(payload, "end_date"),

    is_current: isCurrent,

    description:
      stringValue(
        payload,
        "description",
        item.summary || null
      ),

    source_url:
      stringValue(
        payload,
        "source_url",
        item.external_url || null
      ),

    source_name: sourceName,

    source_type: "official",

    verification_status: "pending",

    verified_at: null,
  };
}

function buildPropositionPayload(
  candidateId: string,
  item: any,
  payload: JsonObject,
  sourceName: string
) {
  const title =
    stringValue(payload, "title") ||
    item.title;

  if (!title) {
    throw new Error(
      "O registro não possui título para criação da proposição."
    );
  }

  return {
    candidate_id: candidateId,

    proposition_type:
      stringValue(
        payload,
        "proposition_type"
      ),

    proposition_number:
      stringValue(
        payload,
        "proposition_number"
      ),

    title,

    description:
      stringValue(
        payload,
        "description",
        item.summary || null
      ),

    institution:
      stringValue(payload, "institution"),

    role:
      stringValue(payload, "role"),

    subject_areas:
      arrayValue(payload, "subject_areas"),

    presented_at:
      dateValue(
        payload,
        "presented_at",
        item.occurred_at || null
      ),

    status:
      stringValue(payload, "status"),

    official_url:
      stringValue(
        payload,
        "official_url",
        item.external_url || null
      ),

    external_id:
      stringValue(
        payload,
        "external_id",
        item.external_id || null
      ),

    source_name: sourceName,

    source_type: "official",

    verification_status: "pending",

    verified_at: null,
  };
}

function buildVotePayload(
  candidateId: string,
  item: any,
  payload: JsonObject,
  sourceName: string
) {
  const title =
    stringValue(payload, "title") ||
    item.title;

  if (!title) {
    throw new Error(
      "O registro não possui título para criação da votação."
    );
  }

  return {
    candidate_id: candidateId,

    institution:
      stringValue(payload, "institution"),

    proposition_reference:
      stringValue(
        payload,
        "proposition_reference"
      ),

    title,

    description:
      stringValue(
        payload,
        "description",
        item.summary || null
      ),

    vote_date:
      dateValue(
        payload,
        "vote_date",
        item.occurred_at || null
      ),

    vote_value:
      stringValue(payload, "vote_value"),

    session_reference:
      stringValue(
        payload,
        "session_reference"
      ),

    official_url:
      stringValue(
        payload,
        "official_url",
        item.external_url || null
      ),

    external_id:
      stringValue(
        payload,
        "external_id",
        item.external_id || null
      ),

    source_name: sourceName,

    source_type: "official",

    verification_status: "pending",

    verified_at: null,
  };
}

function buildCommitteePayload(
  candidateId: string,
  item: any,
  payload: JsonObject,
  sourceName: string
) {
  const committeeName =
    stringValue(
      payload,
      "committee_name"
    ) ||
    stringValue(payload, "title") ||
    item.title;

  if (!committeeName) {
    throw new Error(
      "O registro não possui nome para criação da comissão ou função."
    );
  }

  const isCurrent = booleanValue(
    payload,
    "is_current",
    false
  );

  return {
    candidate_id: candidateId,

    institution:
      stringValue(payload, "institution"),

    committee_name: committeeName,

    role:
      stringValue(payload, "role"),

    start_date:
      dateValue(payload, "start_date"),

    end_date: isCurrent
      ? null
      : dateValue(payload, "end_date"),

    is_current: isCurrent,

    description:
      stringValue(
        payload,
        "description",
        item.summary || null
      ),

    official_url:
      stringValue(
        payload,
        "official_url",
        item.external_url || null
      ),

    source_name: sourceName,

    source_type: "official",

    verification_status: "pending",

    verified_at: null,
  };
}

function buildDeliveryPayload(
  candidateId: string,
  item: any,
  payload: JsonObject,
  sourceName: string
) {
  const title =
    stringValue(payload, "title") ||
    item.title;

  if (!title) {
    throw new Error(
      "O registro não possui título para criação da entrega documentada."
    );
  }

  return {
    candidate_id: candidateId,

    title,

    description:
      stringValue(
        payload,
        "description",
        item.summary || null
      ),

    institution:
      stringValue(payload, "institution"),

    category:
      stringValue(payload, "category"),

    country_code:
      stringValue(
        payload,
        "country_code",
        "BR"
      ) || "BR",

    state_uf:
      stringValue(payload, "state_uf")
        ?.toUpperCase() || null,

    city_name:
      stringValue(payload, "city_name"),

    occurred_at:
      dateValue(
        payload,
        "occurred_at",
        item.occurred_at || null
      ),

    official_url:
      stringValue(
        payload,
        "official_url",
        item.external_url || null
      ),

    source_name: sourceName,

    source_type: "official",

    verification_status: "pending",

    verified_at: null,
  };
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params;

  const supabase =
    await createClient();

  /*
   * 1. Autenticação
   */

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          "Usuário não autenticado.",
      },
      {
        status: 401,
      }
    );
  }

  /*
   * 2. Autorização administrativa
   */

  const {
    data: adminProfile,
    error: profileError,
  } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !adminProfile ||
    !["admin", "editor"].includes(
      adminProfile.role
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Usuário sem permissão para incorporar dados públicos.",
      },
      {
        status: 403,
      }
    );
  }

  /*
   * 3. Item da fila
   */

  const {
    data: item,
    error: itemError,
  } = await supabase
    .from("mfb_public_data_import_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (itemError || !item) {
    return NextResponse.json(
      {
        error:
          "Registro da fila não encontrado.",
      },
      {
        status: 404,
      }
    );
  }

  if (item.review_status === "imported") {
    return NextResponse.json(
      {
        error:
          "Este registro já foi incorporado.",
        imported_table:
          item.imported_table,
        imported_record_id:
          item.imported_record_id,
      },
      {
        status: 409,
      }
    );
  }

  if (item.review_status !== "approved") {
    return NextResponse.json(
      {
        error:
          "Somente registros aprovados podem ser incorporados à Atuação Pública.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Nesta primeira versão, profile/other não são
   * incorporados automaticamente porque não existe
   * tabela correspondente no módulo Atuação Pública.
   */

  const recordType =
    item.record_type as RecordType;

  if (
    recordType === "profile" ||
    recordType === "other"
  ) {
    return NextResponse.json(
      {
        error:
          "Este tipo de registro exige tratamento administrativo específico e não pode ser incorporado automaticamente.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 4. Fonte oficial
   */

  const {
    data: provider,
    error: providerError,
  } = await supabase
    .from("mfb_public_data_providers")
    .select(
      `
        id,
        code,
        name,
        institution
      `
    )
    .eq("id", item.provider_id)
    .single();

  if (providerError || !provider) {
    return NextResponse.json(
      {
        error:
          "Fonte de dados vinculada ao registro não foi encontrada.",
      },
      {
        status: 400,
      }
    );
  }

  const sourceName =
    provider.institution
      ? `${provider.name} — ${provider.institution}`
      : provider.name;

  /*
   * normalized_payload prevalece sobre raw_payload.
   *
   * Isso permite que futuramente cada conector converta
   * o formato próprio da API oficial para o formato MFB.
   */

  const payload = mergePayload(
    item.raw_payload,
    item.normalized_payload
  );

  let destinationTable = "";
  let destinationPayload: JsonObject;

  try {
    switch (recordType) {
      case "position":
        destinationTable =
          "candidate_public_positions";

        destinationPayload =
          buildPositionPayload(
            item.candidate_id,
            item,
            payload,
            sourceName
          );

        break;

      case "proposition":
        destinationTable =
          "candidate_public_propositions";

        destinationPayload =
          buildPropositionPayload(
            item.candidate_id,
            item,
            payload,
            sourceName
          );

        break;

      case "vote":
        destinationTable =
          "candidate_public_votes";

        destinationPayload =
          buildVotePayload(
            item.candidate_id,
            item,
            payload,
            sourceName
          );

        break;

      case "committee":
        destinationTable =
          "candidate_public_committees";

        destinationPayload =
          buildCommitteePayload(
            item.candidate_id,
            item,
            payload,
            sourceName
          );

        break;

      case "delivery":
        destinationTable =
          "candidate_public_deliveries";

        destinationPayload =
          buildDeliveryPayload(
            item.candidate_id,
            item,
            payload,
            sourceName
          );

        break;

      default:
        return NextResponse.json(
          {
            error:
              "Tipo de registro não suportado para incorporação.",
          },
          {
            status: 400,
          }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Não foi possível preparar o registro para incorporação.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 5. Criar registro na Atuação Pública
   */

  const {
    data: importedRecord,
    error: insertError,
  } = await supabase
    .from(destinationTable)
    .insert(destinationPayload)
    .select("id")
    .single();

  if (
    insertError ||
    !importedRecord
  ) {
    return NextResponse.json(
      {
        error:
          insertError?.message ||
          "Não foi possível criar o registro na Atuação Pública.",
      },
      {
        status: 500,
      }
    );
  }

  /*
   * 6. Marcar item como incorporado
   */

  const now =
    new Date().toISOString();

  const {
    error: queueUpdateError,
  } = await supabase
    .from(
      "mfb_public_data_import_queue"
    )
    .update({
      review_status: "imported",
      reviewed_by: user.id,
      reviewed_at: now,
      imported_table:
        destinationTable,
      imported_record_id:
        importedRecord.id,
    })
    .eq("id", item.id)
    .eq(
      "review_status",
      "approved"
    );

  if (queueUpdateError) {
    /*
     * Evita deixar um registro órfão caso a atualização
     * da fila falhe.
     */

    await supabase
      .from(destinationTable)
      .delete()
      .eq(
        "id",
        importedRecord.id
      );

    return NextResponse.json(
      {
        error:
          "O registro foi criado, mas não foi possível concluir a atualização da fila. A incorporação foi revertida.",
        detail:
          queueUpdateError.message,
      },
      {
        status: 500,
      }
    );
  }

  /*
   * 7. Auditoria da incorporação
   */

  const {
    error: eventError,
  } = await supabase
    .from(
      "mfb_public_data_import_events"
    )
    .insert({
      queue_item_id:
        item.id,

      event_type:
        "incorporated",

      previous_status:
        "approved",

      new_status:
        "imported",

      performed_by:
        user.id,

      notes:
        "Registro incorporado à Atuação Pública.",

      metadata: {
        provider_id:
          item.provider_id,

        provider_code:
          provider.code,

        record_type:
          recordType,

        imported_table:
          destinationTable,

        imported_record_id:
          importedRecord.id,

        verification_status:
          "pending",
      },
    });

  if (eventError) {
    /*
     * O registro e a fila já foram corretamente
     * atualizados. Falha isolada no histórico não deve
     * duplicar uma incorporação caso o usuário tente
     * novamente.
     */

    return NextResponse.json(
      {
        success: true,

        warning:
          "Registro incorporado, mas ocorreu uma falha ao gravar o evento de auditoria.",

        imported_table:
          destinationTable,

        imported_record_id:
          importedRecord.id,
      },
      {
        status: 200,
      }
    );
  }

  return NextResponse.json(
    {
      success: true,

      message:
        "Registro incorporado à Atuação Pública e encaminhado para verificação.",

      imported_table:
        destinationTable,

      imported_record_id:
        importedRecord.id,

      verification_status:
        "pending",
    },
    {
      status: 200,
    }
  );
}
