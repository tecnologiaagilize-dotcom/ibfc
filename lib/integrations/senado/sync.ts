import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import {
  SENADO_PROVIDER_CODE,
  listarSenadoresEmExercicio,
  obterSenador,
  obterMandatosSenador,
  obterComissoesSenador,
  obterCargosSenador,
  obterLiderancasSenador,
  obterVotacoesSenador,
} from "./client";

import {
  normalizeSenadorProfile,
  normalizeMandatos,
  normalizeComissoes,
  normalizeCargos,
  normalizeVotacoes,
  validateNormalizedRecord,
  type SenadoNormalizationContext,
  type MfbNormalizedPublicRecord,
} from "./normalizers";
import { uniqueOfficialIdentity } from "../official-identity";

/* ============================================================
   TIPOS
============================================================ */

type SyncOptions = {
  candidateId: string;

  externalIdentityId?: string | null;

  senadorId?: string | number | null;

  candidateName?: string | null;
  candidateFullName?: string | null;

  stateUf?: string | null;
};

type IncrementalWindow = {
  mode: "initial" | "incremental";
  previousFinishedAt: string | null;
  dataInicio: string | null;
  dataFim: string;
  overlapDays: number;
};

const INCREMENTAL_OVERLAP_DAYS = 3;

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function subtractDays(value: Date, days: number) {
  const copy = new Date(value);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

type ProviderRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type ExternalIdentityRow = {
  id: string;
  candidate_id: string;
  provider_id: string;
  external_id: string;
  external_name: string | null;
  external_url: string | null;
  verification_status: string | null;
};

type QueueExistingRow = {
  id: string;
  review_status: string;
  imported_table: string | null;
  imported_record_id: string | null;
  source_change_pending: boolean | null;
  latest_source_version_id: string | null;
};

type QueueInsertResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
};

export type SenadoSyncResult = {
  success: boolean;

  syncRunId: string;

  candidateId: string;

  senadorId: string;

  providerId: string;

  collected: number;

  inserted: number;

  updated: number;

  skipped: number;

  errors: number;

  errorMessages: string[];
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

  return String(error);
}

function mergeResult(
  target: QueueInsertResult,
  source: QueueInsertResult
) {
  target.inserted += source.inserted;
  target.updated += source.updated;
  target.skipped += source.skipped;
  target.errors += source.errors;
}

function deduplicateRecords(
  records: MfbNormalizedPublicRecord[]
) {
  const map =
    new Map<
      string,
      MfbNormalizedPublicRecord
    >();

  for (const record of records) {
    const key = [
      record.record_type,
      record.external_id ||
        record.title,
      record.occurred_at ||
        "sem-data",
    ].join("::");

    /*
     * Em caso de duplicidade dentro da própria coleta,
     * mantemos a última representação normalizada.
     */
    map.set(key, record);
  }

  return Array.from(map.values());
}

/* ============================================================
   PROVIDER
============================================================ */

async function getSenadoProvider(
  supabase: SupabaseClient
): Promise<ProviderRow> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "mfb_public_data_providers"
    )
    .select(
      "id, code, name, active"
    )
    .eq(
      "code",
      SENADO_PROVIDER_CODE
    )
    .single();

  if (error || !data) {
    throw new Error(
      "O provedor oficial da Senado não foi encontrado na Central de Dados Públicos."
    );
  }

  const provider =
    data as ProviderRow;

  if (!provider.active) {
    throw new Error(
      "O provedor da Senado está desativado."
    );
  }

  return provider;
}

/* ============================================================
   IDENTIDADE EXTERNA
============================================================ */

async function getExternalIdentity(
  supabase: SupabaseClient,
  providerId: string,
  options: SyncOptions
): Promise<ExternalIdentityRow | null> {
  if (
    options.externalIdentityId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "candidate_external_identities"
      )
      .select(
        `
          id,
          candidate_id,
          provider_id,
          external_id,
          external_name,
          external_url,
          verification_status
        `
      )
      .eq(
        "id",
        options.externalIdentityId
      )
      .eq(
        "candidate_id",
        options.candidateId
      )
      .eq(
        "provider_id",
        providerId
      )
      .single();

    if (error || !data) {
      throw new Error(
        "A identidade externa informada não foi encontrada para este candidato."
      );
    }

    return data as ExternalIdentityRow;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "candidate_external_identities"
    )
    .select(
      `
        id,
        candidate_id,
        provider_id,
        external_id,
        external_name,
        external_url,
        verification_status
      `
    )
    .eq(
      "candidate_id",
      options.candidateId
    )
    .eq(
      "provider_id",
      providerId
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar identidade externa: ${error.message}`
    );
  }

  return data as ExternalIdentityRow | null;
}

/* ============================================================
   SYNC RUN
============================================================ */

async function getIncrementalWindow(
  supabase: SupabaseClient,
  providerId: string,
  candidateId: string
): Promise<IncrementalWindow> {
  const { data, error } = await supabase
    .from("mfb_public_data_sync_runs")
    .select("finished_at, created_at, status")
    .eq("provider_id", providerId)
    .eq("candidate_id", candidateId)
    .in("status", [
      "completed",
      "completed_with_errors",
    ])
    .order("finished_at", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    /*
     * A sincronização continua em modo inicial caso não seja
     * possível recuperar o histórico. A deduplicação da fila
     * continua protegendo contra duplicidades.
     */
    console.error(
      "Erro ao localizar sincronização anterior da Senado:",
      error
    );

    return {
      mode: "initial",
      previousFinishedAt: null,
      dataInicio: null,
      dataFim: isoDate(new Date()),
      overlapDays: INCREMENTAL_OVERLAP_DAYS,
    };
  }

  const previousFinishedAt =
    data?.finished_at ||
    data?.created_at ||
    null;

  if (!previousFinishedAt) {
    return {
      mode: "initial",
      previousFinishedAt: null,
      dataInicio: null,
      dataFim: isoDate(new Date()),
      overlapDays: INCREMENTAL_OVERLAP_DAYS,
    };
  }

  const previousDate =
    new Date(previousFinishedAt);

  if (
    Number.isNaN(
      previousDate.getTime()
    )
  ) {
    return {
      mode: "initial",
      previousFinishedAt: null,
      dataInicio: null,
      dataFim: isoDate(new Date()),
      overlapDays: INCREMENTAL_OVERLAP_DAYS,
    };
  }

  return {
    mode: "incremental",
    previousFinishedAt,
    dataInicio: isoDate(
      subtractDays(
        previousDate,
        INCREMENTAL_OVERLAP_DAYS
      )
    ),
    dataFim: isoDate(new Date()),
    overlapDays: INCREMENTAL_OVERLAP_DAYS,
  };
}

async function createSyncRun(
  supabase: SupabaseClient,
  providerId: string,
  candidateId: string,
  window: IncrementalWindow
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "mfb_public_data_sync_runs"
    )
    .insert({
      provider_id:
        providerId,

      candidate_id:
        candidateId,

      sync_type:
        "candidate",

      status:
        "running",

      started_at:
        new Date().toISOString(),

      metadata: {
        provider_code:
          SENADO_PROVIDER_CODE,

        source:
          "manual_admin_sync",

        sync_mode:
          window.mode,

        previous_finished_at:
          window.previousFinishedAt,

        data_inicio:
          window.dataInicio,

        data_fim:
          window.dataFim,

        overlap_days:
          window.overlapDays,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Não foi possível iniciar o registro da sincronização: ${
        error?.message ||
        "erro desconhecido"
      }`
    );
  }

  return String(data.id);
}

async function finishSyncRun(
  supabase: SupabaseClient,
  syncRunId: string,
  status:
    | "completed"
    | "completed_with_errors"
    | "failed",
  counters: {
    collected: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  },
  errorMessages: string[],
  window?: IncrementalWindow
) {
  const payload = {
    status,

    finished_at:
      new Date().toISOString(),

    records_found:
      counters.collected,

    records_imported:
      counters.inserted,

    records_skipped:
      counters.skipped,

    records_errors:
      counters.errors,

    error_message:
      errorMessages.length
        ? errorMessages.join(
            "\n"
          )
        : null,

    metadata: {
      provider_code:
        SENADO_PROVIDER_CODE,

      collected:
        counters.collected,

      inserted:
        counters.inserted,

      updated:
        counters.updated,

      skipped:
        counters.skipped,

      errors:
        counters.errors,

      sync_mode:
        window?.mode || null,

      previous_finished_at:
        window?.previousFinishedAt || null,

      data_inicio:
        window?.dataInicio || null,

      data_fim:
        window?.dataFim || null,

      overlap_days:
        window?.overlapDays ||
        INCREMENTAL_OVERLAP_DAYS,
    },
  };

  const { error } =
    await supabase
      .from(
        "mfb_public_data_sync_runs"
      )
      .update(payload)
      .eq(
        "id",
        syncRunId
      );

  if (error) {
    /*
     * Não transformamos uma sincronização já realizada
     * em falha apenas porque o fechamento do log falhou.
     */
    console.error(
      "Erro ao finalizar sync run:",
      error
    );
  }
}

/* ============================================================
   VERSIONAMENTO DA FONTE
============================================================ */

function stableJson(value: unknown): string {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableJson(item))
      .join(",")}]`;
  }

  const record =
    value as Record<string, unknown>;

  const keys =
    Object.keys(record).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableJson(
          record[key]
        )}`
    )
    .join(",")}}`;
}

function recordContentHash(
  record: MfbNormalizedPublicRecord
) {
  /*
   * O hash considera somente o conteúdo documental recebido
   * da fonte. Metadados transitórios como normalized_at não
   * entram no cálculo, evitando falsos positivos.
   */
  const comparable = {
    record_type:
      record.record_type,
    external_id:
      record.external_id,
    external_url:
      record.external_url,
    title:
      record.title,
    summary:
      record.summary,
    occurred_at:
      record.occurred_at,
    raw_payload:
      record.raw_payload,
    normalized_payload:
      record.normalized_payload,
  };

  return createHash("sha256")
    .update(
      stableJson(comparable),
      "utf8"
    )
    .digest("hex");
}

type LatestVersionRow = {
  id: string;
  content_hash: string;
  review_status: string;
};

async function getLatestSourceVersion(
  supabase: SupabaseClient,
  queueItemId: string
): Promise<LatestVersionRow | null> {
  const { data, error } =
    await supabase
      .from(
        "mfb_public_data_record_versions"
      )
      .select(
        "id, content_hash, review_status"
      )
      .eq(
        "queue_item_id",
        queueItemId
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao consultar histórico de versões: ${error.message}`
    );
  }

  return data as
    | LatestVersionRow
    | null;
}

async function registerSourceVersion(
  supabase: SupabaseClient,
  params: {
    queueItemId: string;
    providerId: string;
    syncRunId: string;
    candidateId: string;
    record: MfbNormalizedPublicRecord;
    forcePendingReview?: boolean;
  }
): Promise<{
  versionId: string | null;
  changed: boolean;
  created: boolean;
}> {
  const contentHash =
    recordContentHash(
      params.record
    );

  const previous =
    await getLatestSourceVersion(
      supabase,
      params.queueItemId
    );

  if (
    previous?.content_hash ===
    contentHash
  ) {
    return {
      versionId:
        previous.id,
      changed: false,
      created: false,
    };
  }

  const changed =
    Boolean(previous);

  const reviewStatus =
    params.forcePendingReview &&
    changed
      ? "pending_review"
      : "recorded";

  const { data, error } =
    await supabase
      .from(
        "mfb_public_data_record_versions"
      )
      .insert({
        queue_item_id:
          params.queueItemId,

        provider_id:
          params.providerId,

        sync_run_id:
          params.syncRunId,

        candidate_id:
          params.candidateId,

        record_type:
          params.record.record_type,

        external_id:
          params.record.external_id,

        external_url:
          params.record.external_url,

        title:
          params.record.title,

        summary:
          params.record.summary,

        occurred_at:
          params.record.occurred_at,

        raw_payload:
          params.record.raw_payload,

        normalized_payload: {
          ...params.record
            .normalized_payload,

          _mfb_metadata:
            params.record.metadata,
        },

        content_hash:
          contentHash,

        change_type:
          changed
            ? "changed"
            : "snapshot",

        review_status:
          reviewStatus,

        compared_to_version_id:
          previous?.id ||
          null,
      })
      .select("id")
      .single();

  if (error || !data) {
    /*
     * Uma corrida entre duas sincronizações pode atingir o
     * índice único queue_item_id + content_hash. Nesse caso
     * recuperamos a versão já criada e seguimos normalmente.
     */
    const {
      data: duplicate,
      error: duplicateError,
    } = await supabase
      .from(
        "mfb_public_data_record_versions"
      )
      .select("id")
      .eq(
        "queue_item_id",
        params.queueItemId
      )
      .eq(
        "content_hash",
        contentHash
      )
      .limit(1)
      .maybeSingle();

    if (
      duplicateError ||
      !duplicate
    ) {
      throw new Error(
        `Erro ao registrar versão da fonte: ${
          error?.message ||
          duplicateError?.message ||
          "erro desconhecido"
        }`
      );
    }

    return {
      versionId:
        String(duplicate.id),
      changed,
      created: false,
    };
  }

  return {
    versionId:
      String(data.id),
    changed,
    created: true,
  };
}

/* ============================================================
   FILA
============================================================ */

async function findExistingQueueItem(
  supabase: SupabaseClient,
  providerId: string,
  candidateId: string,
  record: MfbNormalizedPublicRecord
): Promise<QueueExistingRow | null> {
  if (!record.external_id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "mfb_public_data_import_queue"
    )
    .select(
      `
        id,
        review_status,
        imported_table,
        imported_record_id,
        source_change_pending,
        latest_source_version_id
      `
    )
    .eq(
      "provider_id",
      providerId
    )
    .eq(
      "candidate_id",
      candidateId
    )
    .eq(
      "record_type",
      record.record_type
    )
    .eq(
      "external_id",
      record.external_id
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao verificar duplicidade na fila: ${error.message}`
    );
  }

  return data as QueueExistingRow | null;
}

async function queueRecord(
  supabase: SupabaseClient,
  params: {
    providerId: string;
    syncRunId: string;
    candidateId: string;
    externalIdentityId: string | null;
    record: MfbNormalizedPublicRecord;
  }
): Promise<QueueInsertResult> {
  const result: QueueInsertResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const validation =
    validateNormalizedRecord(
      params.record
    );

  if (!validation.valid) {
    result.errors = 1;
    return result;
  }

  const existing =
    await findExistingQueueItem(
      supabase,
      params.providerId,
      params.candidateId,
      params.record
    );

  /*
   * Um registro já incorporado não deve ser reaberto
   * automaticamente por uma nova sincronização.
   *
   * Futuramente poderemos criar uma rotina específica
   * de detecção de alterações.
   */
  if (
    existing?.review_status ===
      "imported" ||
    existing?.imported_record_id
  ) {
    const version =
      await registerSourceVersion(
        supabase,
        {
          queueItemId:
            existing.id,

          providerId:
            params.providerId,

          syncRunId:
            params.syncRunId,

          candidateId:
            params.candidateId,

          record:
            params.record,

          forcePendingReview:
            true,
        }
      );

    if (
      version.versionId &&
      version.changed
    ) {
      const {
        error: pendingError,
      } = await supabase
        .from(
          "mfb_public_data_import_queue"
        )
        .update({
          source_change_pending:
            true,

          latest_source_version_id:
            version.versionId,
        })
        .eq(
          "id",
          existing.id
        );

      if (pendingError) {
        throw new Error(
          `A alteração da fonte foi registrada, mas não foi possível marcar a pendência administrativa: ${pendingError.message}`
        );
      }

      if (version.created) {
        await supabase
          .from(
            "mfb_public_data_import_events"
          )
          .insert({
            queue_item_id:
              existing.id,

            event_type:
              "source_changed",

            previous_status:
              "imported",

            new_status:
              "imported",

            notes:
              "A fonte oficial apresentou conteúdo diferente da última versão registrada. O conteúdo incorporado foi preservado e a alteração aguarda revisão administrativa.",

            metadata: {
              provider_code:
                SENADO_PROVIDER_CODE,

              sync_run_id:
                params.syncRunId,

              source_version_id:
                version.versionId,
            },
          });
      }
    } else if (
      version.versionId &&
      !existing.latest_source_version_id
    ) {
      await supabase
        .from(
          "mfb_public_data_import_queue"
        )
        .update({
          latest_source_version_id:
            version.versionId,
        })
        .eq(
          "id",
          existing.id
        );
    }

    result.skipped = 1;
    return result;
  }

  const queuePayload = {
    provider_id:
      params.providerId,

    sync_run_id:
      params.syncRunId,

    candidate_id:
      params.candidateId,

    external_identity_id:
      params.externalIdentityId,

    record_type:
      params.record.record_type,

    external_id:
      params.record.external_id,

    external_url:
      params.record.external_url,

    title:
      params.record.title,

    summary:
      params.record.summary,

    occurred_at:
      params.record.occurred_at,

    raw_payload:
      params.record.raw_payload,

    normalized_payload: {
      ...params.record
        .normalized_payload,

      _mfb_metadata:
        params.record.metadata,
    },
  };

  if (existing) {
    /*
     * Se o item já existe e ainda está em revisão,
     * atualizamos os dados oficiais, mas preservamos
     * o estado editorial.
     *
     * Portanto NÃO alteramos:
     * - review_status
     * - review_notes
     * - reviewed_by
     * - reviewed_at
     */
    const {
      error,
    } = await supabase
      .from(
        "mfb_public_data_import_queue"
      )
      .update(
        queuePayload
      )
      .eq(
        "id",
        existing.id
      );

    if (error) {
      result.errors = 1;
      return result;
    }

    const version =
      await registerSourceVersion(
        supabase,
        {
          queueItemId:
            existing.id,

          providerId:
            params.providerId,

          syncRunId:
            params.syncRunId,

          candidateId:
            params.candidateId,

          record:
            params.record,
        }
      );

    if (version.versionId) {
      await supabase
        .from(
          "mfb_public_data_import_queue"
        )
        .update({
          latest_source_version_id:
            version.versionId,
        })
        .eq(
          "id",
          existing.id
        );
    }

    result.updated = 1;
    return result;
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "mfb_public_data_import_queue"
    )
    .insert({
      ...queuePayload,

      review_status:
        "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    result.errors = 1;
    return result;
  }

  const initialVersion =
    await registerSourceVersion(
      supabase,
      {
        queueItemId:
          String(data.id),

        providerId:
          params.providerId,

        syncRunId:
          params.syncRunId,

        candidateId:
          params.candidateId,

        record:
          params.record,
      }
    );

  if (initialVersion.versionId) {
    await supabase
      .from(
        "mfb_public_data_import_queue"
      )
      .update({
        latest_source_version_id:
          initialVersion.versionId,
      })
      .eq(
        "id",
        data.id
      );
  }

  /*
   * Auditoria da entrada na fila.
   */
  await supabase
    .from(
      "mfb_public_data_import_events"
    )
    .insert({
      queue_item_id:
        data.id,

      event_type:
        "synced",

      previous_status:
        null,

      new_status:
        "pending",

      notes:
        "Registro incluído automaticamente na fila a partir da fonte oficial da Senado dos Senadors.",

      metadata: {
        provider_code:
          SENADO_PROVIDER_CODE,

        sync_run_id:
          params.syncRunId,
      },
    });

  result.inserted = 1;

  return result;
}

/* ============================================================
   COLETA
============================================================ */

async function collectSenadoRecords(
  senadorId: string,
  context: SenadoNormalizationContext,
  _window: IncrementalWindow
): Promise<{
  records: MfbNormalizedPublicRecord[];
  errors: string[];
}> {
  const records: MfbNormalizedPublicRecord[] = [];
  const errors: string[] = [];

  const collect = async (
    label: string,
    loader: () => Promise<Record<string, unknown>>,
    normalize: (payload: Record<string, unknown>) => MfbNormalizedPublicRecord[]
  ) => {
    try {
      const payload = await loader();
      records.push(...normalize(payload));
    } catch (error) {
      errors.push(`${label}: ${errorMessage(error)}`);
    }
  };

  try {
    const payload = await obterSenador(senadorId);
    records.push(normalizeSenadorProfile(payload, context));
  } catch (error) {
    errors.push(`Perfil: ${errorMessage(error)}`);
  }

  await collect(
    "Mandatos",
    () => obterMandatosSenador(senadorId),
    (payload) => normalizeMandatos(payload, context)
  );

  await collect(
    "Comissões",
    () => obterComissoesSenador(senadorId),
    (payload) => normalizeComissoes(payload, context)
  );

  await collect(
    "Cargos",
    () => obterCargosSenador(senadorId),
    (payload) => normalizeCargos(payload, context)
  );

  await collect(
    "Lideranças",
    () => obterLiderancasSenador(senadorId),
    (payload) => normalizeCargos(payload, context)
  );

  await collect(
    "Votações",
    () => obterVotacoesSenador(senadorId),
    (payload) => normalizeVotacoes(payload, context)
  );

  return {
    records: deduplicateRecords(records),
    errors,
  };
}

/* ============================================================
   SINCRONIZAÇÃO PRINCIPAL
============================================================ */

export async function syncSenadoCandidate(
  supabase: SupabaseClient,
  options: SyncOptions
): Promise<SenadoSyncResult> {
  if (!options.candidateId) {
    throw new Error(
      "candidateId é obrigatório."
    );
  }

  const provider =
    await getSenadoProvider(
      supabase
    );

  let identity =
    await getExternalIdentity(
      supabase,
      provider.id,
      options
    );

  let senadorId =
    options.senadorId
      ? String(
          options.senadorId
        )
      : identity?.external_id
        ? String(
            identity.external_id
          )
        : null;

  if (!senadorId) {
    const roster = await listarSenadoresEmExercicio();
    const root = roster.ListaParlamentarEmExercicio as Record<string, unknown> | undefined;
    const group = root?.Parlamentares as Record<string, unknown> | undefined;
    const raw = group?.Parlamentar;
    const people = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[];
    const parsed = people.map((person) => {
      const info = (person.IdentificacaoParlamentar || {}) as Record<string, unknown>;
      return {
        id: String(info.CodigoParlamentar || ""),
        names: [String(info.NomeParlamentar || ""), String(info.NomeCompletoParlamentar || person.NomeCompletoParlamentar || "")],
        stateUf: String(info.UfParlamentar || person.UfParlamentar || ""),
      };
    }).filter((person) => person.id);
    const match = uniqueOfficialIdentity(parsed,
      [options.candidateFullName, options.candidateName], options.stateUf);
    if (!match) {
      throw new Error("Não foi encontrado um único senador em exercício com nome exato e UF correspondente. Confira o identificador oficial antes de vincular.");
    }
    senadorId = match.id;
    const { data, error } = await supabase.from("candidate_external_identities")
      .insert({ candidate_id: options.candidateId, provider_id: provider.id,
        external_id: match.id, external_name: match.names[0] || null,
        external_url: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${match.id}`,
        verification_status: "verified", verified_at: new Date().toISOString(),
        metadata: { matched_automatically: true, match_rule: "exact_name_and_uf" } })
      .select("id,candidate_id,provider_id,external_id,external_name,external_url,verification_status")
      .single();
    if (error || !data) throw new Error(`Não foi possível salvar o vínculo do Senado: ${error?.message || "erro desconhecido"}`);
    identity = data as ExternalIdentityRow;
  }

  const incrementalWindow =
    await getIncrementalWindow(
      supabase,
      provider.id,
      options.candidateId
    );

  const syncRunId =
    await createSyncRun(
      supabase,
      provider.id,
      options.candidateId,
      incrementalWindow
    );

  const counters = {
    collected: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  const errorMessages:
    string[] = [];

  try {
    const context:
      SenadoNormalizationContext =
      {
        candidateId:
          options.candidateId,

        senadorId,

        candidateName:
          options.candidateName ||
          identity?.external_name ||
          undefined,

        stateUf:
          options.stateUf ||
          undefined,
      };

    const collection =
      await collectSenadoRecords(
        senadorId,
        context,
        incrementalWindow
      );

    counters.collected =
      collection.records.length;

    errorMessages.push(
      ...collection.errors
    );

    counters.errors +=
      collection.errors.length;

    for (
      const record of
      collection.records
    ) {
      try {
        const queueResult =
          await queueRecord(
            supabase,
            {
              providerId:
                provider.id,

              syncRunId,

              candidateId:
                options.candidateId,

              externalIdentityId:
                identity?.id ||
                null,

              record,
            }
          );

        mergeResult(
          counters,
          queueResult
        );

        if (
          queueResult.errors >
          0
        ) {
          errorMessages.push(
            `Não foi possível incluir/atualizar: ${record.title}`
          );
        }
      } catch (error) {
        counters.errors += 1;

        errorMessages.push(
          `${record.title}: ${errorMessage(
            error
          )}`
        );
      }
    }

    const finalStatus =
      counters.errors > 0
        ? "completed_with_errors"
        : "completed";

    await finishSyncRun(
      supabase,
      syncRunId,
      finalStatus,
      counters,
      errorMessages,
      incrementalWindow
    );

    return {
      success:
        counters.errors === 0,

      syncRunId,

      candidateId:
        options.candidateId,

      senadorId,

      providerId:
        provider.id,

      ...counters,

      errorMessages,
    };
  } catch (error) {
    counters.errors += 1;

    errorMessages.push(
      errorMessage(error)
    );

    await finishSyncRun(
      supabase,
      syncRunId,
      "failed",
      counters,
      errorMessages,
      incrementalWindow
    );

    throw error;
  }
}

/* ============================================================
   EXPORTAÇÃO
============================================================ */

export const senadoSync = {
  candidate:
    syncSenadoCandidate,
};
