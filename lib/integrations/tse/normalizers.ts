import {
  TSE_PROVIDER_CODE,
  TSE_DATASET_URL,
  type TseCsvRow,
} from "./client";

export type MfbNormalizedPublicRecord = {
  record_type: string;
  external_id: string;
  external_url: string | null;
  title: string;
  summary: string | null;
  occurred_at: string | null;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

function value(row: TseCsvRow, key: string) {
  const result = String(row[key] || "").trim();
  return result || null;
}

function isoDate(valueText: string | null) {
  if (!valueText) return null;

  const br = valueText.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/
  );
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  const iso = valueText.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );
  return iso ? iso[0] : null;
}

export function normalizeTseCandidate(
  row: TseCsvRow,
  resourceUrl: string
): MfbNormalizedPublicRecord {
  const sq = value(row, "SQ_CANDIDATO");

  if (!sq) {
    throw new Error(
      "Registro do TSE sem SQ_CANDIDATO."
    );
  }

  const ballotName =
    value(row, "NM_URNA_CANDIDATO") ||
    value(row, "NM_CANDIDATO") ||
    `Candidato ${sq}`;

  const cargo = value(row, "DS_CARGO");
  const partido = value(row, "SG_PARTIDO");
  const numero = value(row, "NR_CANDIDATO");
  const uf = value(row, "SG_UF");
  const municipio =
    value(row, "NM_UE") ||
    value(row, "NM_MUNICIPIO");
  const situacao =
    value(row, "DS_SITUACAO_CANDIDATURA") ||
    value(row, "DS_SITUACAO_CANDIDATO_URNA");

  const parts = [
    cargo,
    partido ? `Partido: ${partido}` : null,
    numero ? `Número: ${numero}` : null,
    uf ? `UF: ${uf}` : null,
    municipio ? `Unidade eleitoral: ${municipio}` : null,
    situacao ? `Situação: ${situacao}` : null,
  ].filter(Boolean);

  return {
    record_type: "profile",
    external_id: sq,
    external_url: TSE_DATASET_URL,
    title: `${ballotName} — dados eleitorais TSE`,
    summary: parts.join(" · ") || null,
    occurred_at:
      isoDate(value(row, "DT_GERACAO")) ||
      null,
    raw_payload: row,
    normalized_payload: {
      sq_candidato: sq,
      election_year:
        value(row, "ANO_ELEICAO") || "2026",
      election_type:
        value(row, "NM_TIPO_ELEICAO"),
      election_round:
        value(row, "NR_TURNO"),
      election_unit_code:
        value(row, "SG_UE"),
      election_unit_name:
        value(row, "NM_UE"),
      state_uf: uf,
      candidate_name:
        value(row, "NM_CANDIDATO"),
      ballot_name: ballotName,
      candidate_number: numero,
      office: cargo,
      party_code:
        value(row, "NR_PARTIDO"),
      party_abbreviation: partido,
      party_name:
        value(row, "NM_PARTIDO"),
      coalition_name:
        value(row, "NM_COLIGACAO"),
      coalition_composition:
        value(row, "DS_COMPOSICAO_COLIGACAO"),
      candidacy_status: situacao,
      candidacy_detail_status:
        value(row, "DS_DETALHE_SITUACAO_CAND"),
      ballot_status:
        value(row, "DS_SITUACAO_CANDIDATO_URNA"),
      gender:
        value(row, "DS_GENERO"),
      birth_date:
        isoDate(value(row, "DT_NASCIMENTO")),
      occupation:
        value(row, "DS_OCUPACAO"),
      education:
        value(row, "DS_GRAU_INSTRUCAO"),
      source_resource_url: resourceUrl,
    },
    metadata: {
      provider_code: TSE_PROVIDER_CODE,
      source_kind: "official",
      source_dataset: "Candidatos - 2026",
      source_url: TSE_DATASET_URL,
      imported_automatically: false,
      requires_human_review: true,
    },
  };
}

export function validateNormalizedRecord(
  record: MfbNormalizedPublicRecord
) {
  if (!record.external_id) {
    throw new Error(
      "Registro normalizado sem external_id."
    );
  }

  if (!record.title) {
    throw new Error(
      "Registro normalizado sem título."
    );
  }

  return record;
}
