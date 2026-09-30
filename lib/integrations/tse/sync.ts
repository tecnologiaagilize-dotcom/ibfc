import type { SupabaseClient } from "@supabase/supabase-js";

import {
  TSE_PROVIDER_CODE,
  localizarCandidato,
  localizarCandidatoPorSq,
  obterCandidatos2026,
} from "./client";

import {
  normalizeTseCandidate,
  validateNormalizedRecord,
} from "./normalizers";

type SyncOptions = {
  candidateId: string;
  externalIdentityId?: string | null;
  sqCandidato?: string | number | null;
  candidateName?: string | null;
  stateUf?: string | null;
  office?: string | null;
  candidateNumber?: string | number | null;
};

export type TseSyncResult = {
  success: boolean;
  syncRunId: string;
  candidateId: string;
  sqCandidato: string;
  providerId: string;
  collected: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
};

async function provider(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from("mfb_public_data_providers")
    .select("id, code, name, active")
    .eq("code", TSE_PROVIDER_CODE)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Provedor oficial TSE não encontrado ou inativo."
    );
  }

  return data as {
    id: string;
    code: string;
    name: string;
    active: boolean;
  };
}

async function identity(
  supabase: SupabaseClient,
  providerId: string,
  options: SyncOptions
) {
  if (options.externalIdentityId) {
    const { data, error } = await supabase
      .from("candidate_external_identities")
      .select("*")
      .eq("id", options.externalIdentityId)
      .eq("candidate_id", options.candidateId)
      .eq("provider_id", providerId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Erro ao localizar identidade externa: ${error.message}`
      );
    }

    return data;
  }

  const { data, error } = await supabase
    .from("candidate_external_identities")
    .select("*")
    .eq("candidate_id", options.candidateId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Erro ao localizar identidade externa: ${error.message}`
    );
  }

  return data;
}

async function createRun(
  supabase: SupabaseClient,
  providerId: string,
  candidateId: string
) {
  const { data, error } = await supabase
    .from("mfb_public_data_sync_runs")
    .insert({
      provider_id: providerId,
      candidate_id: candidateId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Não foi possível iniciar a sincronização TSE: ${
        error?.message || "erro desconhecido"
      }`
    );
  }

  return String(data.id);
}

async function finishRun(
  supabase: SupabaseClient,
  runId: string,
  result: TseSyncResult,
  status:
    | "completed"
    | "completed_with_errors"
    | "failed"
) {
  await supabase
    .from("mfb_public_data_sync_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      records_found: result.collected,
      records_inserted: result.inserted,
      records_updated: result.updated,
      records_skipped: result.skipped,
      records_errors: result.errors,
      error_message:
        result.errorMessages.length > 0
          ? result.errorMessages.join(" | ").slice(0, 4000)
          : null,
    })
    .eq("id", runId);
}

export async function syncTseCandidate(
  supabase: SupabaseClient,
  options: SyncOptions
): Promise<TseSyncResult> {
  const p = await provider(supabase);
  const externalIdentity = await identity(
    supabase,
    p.id,
    options
  );

  let sqCandidato = String(
    options.sqCandidato ||
      externalIdentity?.external_id ||
      ""
  ).trim();

  const runId = await createRun(
    supabase,
    p.id,
    options.candidateId
  );

  const result: TseSyncResult = {
    success: false,
    syncRunId: runId,
    candidateId: options.candidateId,
    sqCandidato,
    providerId: p.id,
    collected: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [],
  };

  try {
    const source = await obterCandidatos2026();
    const row = sqCandidato
      ? localizarCandidatoPorSq(source.rows, sqCandidato)
      : localizarCandidato(source.rows, {
          candidateName: options.candidateName,
          stateUf: options.stateUf,
          office: options.office,
          candidateNumber: options.candidateNumber,
        });

    if (!row) {
      throw new Error(
        `SQ_CANDIDATO ${sqCandidato} não localizado na base oficial Candidatos 2026 do TSE.`
      );
    }

    sqCandidato = String(row.SQ_CANDIDATO || "").trim();
    result.sqCandidato = sqCandidato;

    let resolvedIdentity = externalIdentity;

    if (!resolvedIdentity) {
      const { data, error } = await supabase
        .from("candidate_external_identities")
        .insert({
          candidate_id: options.candidateId,
          provider_id: p.id,
          external_id: sqCandidato,
          external_name:
            row.NM_URNA_CANDIDATO || row.NM_CANDIDATO || null,
          external_url: null,
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          metadata: {
            matched_automatically: true,
            election_year: "2026",
          },
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(
          `Candidato localizado no TSE, mas não foi possível salvar o vínculo: ${error?.message || "erro desconhecido"}`
        );
      }

      resolvedIdentity = data;
    }

    const record = validateNormalizedRecord(
      normalizeTseCandidate(
        row,
        source.resourceUrl
      )
    );

    result.collected = 1;

    const { data: existing, error: existingError } =
      await supabase
        .from("mfb_public_data_import_queue")
        .select("id, review_status, imported_record_id")
        .eq("provider_id", p.id)
        .eq("candidate_id", options.candidateId)
        .eq("record_type", record.record_type)
        .eq("external_id", record.external_id)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Erro ao consultar a fila TSE: ${existingError.message}`
      );
    }

    const queuePayload = {
      provider_id: p.id,
      sync_run_id: runId,
      candidate_id: options.candidateId,
      external_identity_id:
        resolvedIdentity?.id || null,
      record_type: record.record_type,
      external_id: record.external_id,
      external_url: record.external_url,
      title: record.title,
      summary: record.summary,
      occurred_at: record.occurred_at,
      raw_payload: record.raw_payload,
      normalized_payload: {
        ...record.normalized_payload,
        _mfb_metadata: record.metadata,
      },
    };

    if (existing) {
      if (existing.imported_record_id) {
        result.skipped = 1;
      } else {
        const { error } = await supabase
          .from("mfb_public_data_import_queue")
          .update(queuePayload)
          .eq("id", existing.id);

        if (error) {
          throw new Error(
            `Erro ao atualizar a fila TSE: ${error.message}`
          );
        }

        result.updated = 1;
      }
    } else {
      const { error } = await supabase
        .from("mfb_public_data_import_queue")
        .insert({
          ...queuePayload,
          review_status: "pending",
        });

      if (error) {
        throw new Error(
          `Erro ao inserir registro na fila TSE: ${error.message}`
        );
      }

      result.inserted = 1;
    }

    result.success = true;
    await finishRun(
      supabase,
      runId,
      result,
      "completed"
    );

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    result.errors += 1;
    result.errorMessages.push(message);

    await finishRun(
      supabase,
      runId,
      result,
      "failed"
    );

    throw error;
  }
}
