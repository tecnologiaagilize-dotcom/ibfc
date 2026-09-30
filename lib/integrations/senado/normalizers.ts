import {
  SENADO_PROVIDER_CODE,
  senadorOfficialUrl,
  type SenadoPayload,
} from "./client";

export type MfbPublicDataRecordType =
  | "position"
  | "proposition"
  | "vote"
  | "committee"
  | "delivery"
  | "profile"
  | "other";

export type MfbNormalizedPublicRecord = {
  record_type: MfbPublicDataRecordType;
  external_id: string | null;
  external_url: string | null;
  title: string;
  summary: string | null;
  occurred_at: string | null;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  metadata: {
    provider_code: string;
    source: "official";
    normalized_at: string;
    normalizer_version: string;
  };
};

export type SenadoNormalizationContext = {
  candidateId?: string;
  senadorId?: string | number;
  candidateName?: string;
  stateUf?: string | null;
};

const NORMALIZER_VERSION = "1.0.0";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clean(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || null;
}

function dateOnly(value: unknown): string | null {
  const text = clean(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

function normKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findValue(root: unknown, keys: string[]): unknown {
  const wanted = new Set(keys.map(normKey));
  const seen = new Set<object>();

  function walk(value: unknown): unknown {
    if (!value || typeof value !== "object") return undefined;
    if (seen.has(value as object)) return undefined;
    seen.add(value as object);

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item);
        if (found !== undefined && found !== null && found !== "") return found;
      }
      return undefined;
    }

    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      if (wanted.has(normKey(key)) && item !== undefined && item !== null && item !== "") {
        return item;
      }
    }
    for (const item of Object.values(record)) {
      const found = walk(item);
      if (found !== undefined && found !== null && found !== "") return found;
    }
    return undefined;
  }

  return walk(root);
}

function collectRecords(root: unknown, hints: string[]): Record<string, unknown>[] {
  const normalizedHints = hints.map(normKey);
  const output: Record<string, unknown>[] = [];
  const seen = new Set<object>();

  function walk(value: unknown, parentKey = "") {
    if (!value || typeof value !== "object") return;
    if (seen.has(value as object)) return;
    seen.add(value as object);

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const rec = item as Record<string, unknown>;
          const keys = Object.keys(rec).map(normKey);
          if (
            normalizedHints.some((hint) => normKey(parentKey).includes(hint)) ||
            normalizedHints.some((hint) => keys.some((key) => key.includes(hint)))
          ) {
            output.push(rec);
          }
        }
        walk(item, parentKey);
      }
      return;
    }

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      walk(item, key);
    }
  }

  walk(root);

  const unique = new Map<string, Record<string, unknown>>();
  for (const item of output) {
    const key = JSON.stringify(item);
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

function metadata() {
  return {
    provider_code: SENADO_PROVIDER_CODE,
    source: "official" as const,
    normalized_at: new Date().toISOString(),
    normalizer_version: NORMALIZER_VERSION,
  };
}

function record(args: {
  type: MfbPublicDataRecordType;
  externalId: string | null;
  externalUrl?: string | null;
  title: string;
  summary?: string | null;
  occurredAt?: string | null;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
}): MfbNormalizedPublicRecord {
  return {
    record_type: args.type,
    external_id: args.externalId,
    external_url: args.externalUrl ?? null,
    title: args.title,
    summary: args.summary ?? null,
    occurred_at: args.occurredAt ?? null,
    raw_payload: args.raw,
    normalized_payload: args.normalized,
    metadata: metadata(),
  };
}

function str(root: unknown, keys: string[]) {
  return clean(findValue(root, keys));
}

export function normalizeSenadorProfile(
  payload: SenadoPayload,
  context: SenadoNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const codigo =
    str(payload, ["CodigoParlamentar", "CodigoSenador", "Codigo"]) ||
    (context.senadorId ? String(context.senadorId) : null);

  const nome =
    str(payload, ["NomeParlamentar", "NomeSenador", "NomeCompletoParlamentar", "NomeCompleto"]) ||
    context.candidateName ||
    "Senador";

  const partido = str(payload, ["SiglaPartidoParlamentar", "SiglaPartido"]);
  const uf =
    str(payload, ["UfParlamentar", "UFParlamentar", "SiglaUf"]) ||
    context.stateUf ||
    null;
  const foto = str(payload, ["UrlFotoParlamentar", "UrlFoto"]);
  const pagina = str(payload, ["UrlPaginaParlamentar", "UrlPagina"]);
  const email = str(payload, ["EmailParlamentar", "Email"]);

  return record({
    type: "profile",
    externalId: codigo ? `senado-senador:${codigo}` : null,
    externalUrl: codigo ? senadorOfficialUrl(codigo) : pagina,
    title: `Perfil parlamentar — ${nome}`,
    summary: [partido, uf].filter(Boolean).join(" • ") || null,
    raw: asRecord(payload),
    normalized: {
      external_id: codigo,
      name: nome,
      party: partido,
      state_uf: uf,
      photo_url: foto,
      email,
      institution: "Senado Federal",
      country_code: "BR",
      source_url: codigo ? senadorOfficialUrl(codigo) : pagina,
    },
  });
}

export function normalizeMandatos(
  payload: SenadoPayload,
  context: SenadoNormalizationContext = {}
): MfbNormalizedPublicRecord[] {
  const items = collectRecords(payload, ["mandato", "exercicio", "legislatura"]);
  const senadorId = context.senadorId ? String(context.senadorId) : "sem-id";

  return items
    .map((raw, index) => {
      const codigo = str(raw, ["CodigoMandato"]) || `${senadorId}:${index}`;
      const uf = str(raw, ["UfParlamentar", "UFParlamentar"]) || context.stateUf || null;
      const participacao = str(raw, ["DescricaoParticipacao"]);
      const inicio = dateOnly(findValue(raw, ["DataInicio", "DataInicioExercicio", "ExercicioDataInicio"]));
      const fim = dateOnly(findValue(raw, ["DataFim", "DataFimExercicio"]));

      return record({
        type: "position",
        externalId: `senado-mandato:${codigo}`,
        externalUrl: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
        title: "Senador da República",
        summary: [participacao, uf].filter(Boolean).join(" • ") || null,
        occurredAt: inicio,
        raw,
        normalized: {
          position_type: "mandate",
          title: "Senador da República",
          institution: "Senado Federal",
          country_code: "BR",
          state_uf: uf,
          start_date: inicio,
          end_date: fim,
          is_current: !fim,
          description: participacao,
          source_url: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
        },
      });
    })
    .filter((item, index, arr) => arr.findIndex((x) => x.external_id === item.external_id) === index);
}

export function normalizeComissoes(
  payload: SenadoPayload,
  context: SenadoNormalizationContext = {}
): MfbNormalizedPublicRecord[] {
  const items = collectRecords(payload, ["comissao"]);
  const senadorId = context.senadorId ? String(context.senadorId) : "sem-id";

  return items
    .map((raw, index) => {
      const codigo = str(raw, ["CodigoComissao"]) || `${senadorId}:${index}`;
      const sigla = str(raw, ["SiglaComissao"]);
      const nome = str(raw, ["NomeComissao"]) || sigla || "Comissão";
      const papel = str(raw, ["DescricaoParticipacao", "DescricaoCargo", "Cargo"]);
      const inicio = dateOnly(findValue(raw, ["DataInicio"]));
      const fim = dateOnly(findValue(raw, ["DataFim"]));

      return record({
        type: "committee",
        externalId: `senado-comissao:${senadorId}:${codigo}:${inicio || "sem-data"}`,
        externalUrl: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
        title: sigla ? `${sigla} — ${nome}` : nome,
        summary: papel,
        occurredAt: inicio,
        raw,
        normalized: {
          institution: "Senado Federal",
          committee_name: nome,
          committee_acronym: sigla,
          role: papel,
          start_date: inicio,
          end_date: fim,
          is_current: !fim,
          official_url: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
        },
      });
    })
    .filter((item, index, arr) => arr.findIndex((x) => x.external_id === item.external_id) === index);
}

export function normalizeCargos(
  payload: SenadoPayload,
  context: SenadoNormalizationContext = {}
): MfbNormalizedPublicRecord[] {
  const items = collectRecords(payload, ["cargo", "lideranca"]);
  const senadorId = context.senadorId ? String(context.senadorId) : "sem-id";

  return items.map((raw, index) => {
    const descricao = str(raw, ["DescricaoCargo", "DescricaoTipoLideranca", "Cargo"]) || "Função parlamentar";
    const codigo = str(raw, ["CodigoCargo", "CodigoComissao", "CodigoBloco"]) || `${index}`;
    const inicio = dateOnly(findValue(raw, ["DataInicio", "DataDesignacao"]));
    const fim = dateOnly(findValue(raw, ["DataFim"]));
    const comissao = str(raw, ["NomeComissao", "SiglaComissao", "NomeBloco", "SiglaBloco"]);

    return record({
      type: "committee",
      externalId: `senado-funcao:${senadorId}:${codigo}:${inicio || "sem-data"}`,
      externalUrl: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
      title: descricao,
      summary: comissao,
      occurredAt: inicio,
      raw,
      normalized: {
        institution: "Senado Federal",
        committee_name: comissao,
        role: descricao,
        start_date: inicio,
        end_date: fim,
        is_current: !fim,
        official_url: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
      },
    });
  });
}

export function normalizeVotacoes(
  payload: SenadoPayload,
  context: SenadoNormalizationContext = {}
): MfbNormalizedPublicRecord[] {
  const items = collectRecords(payload, ["votacao", "voto"]);
  const senadorId = context.senadorId ? String(context.senadorId) : "sem-id";

  return items
    .map((raw, index) => {
      const voto = str(raw, ["DescricaoVoto", "Voto"]);
      const secreta = str(raw, ["IndicadorVotacaoSecreta"]);
      /*
       * Não registramos voto individual quando a fonte indicar votação secreta.
       */
      if (secreta && ["S", "SIM", "TRUE", "1"].includes(secreta.toUpperCase())) {
        return null;
      }

      const codigoMateria = str(raw, ["CodigoMateria"]);
      const codigoSessao = str(raw, ["CodigoSessao"]);
      const data = dateOnly(findValue(raw, ["DataSessao", "DataVotacao"]));
      const descricao = str(raw, ["DescricaoVotacao", "EmentaMateria", "DescricaoMateria"]);
      const tipo = str(raw, ["SiglaSubtipoMateria"]);
      const numero = str(raw, ["NumeroMateria"]);
      const ano = str(raw, ["AnoMateria"]);
      const materia = [tipo, numero && ano ? `${numero}/${ano}` : numero].filter(Boolean).join(" ");
      const key = codigoMateria || codigoSessao || `${data || "sem-data"}:${index}`;

      return record({
        type: "vote",
        externalId: `senado-voto:${senadorId}:${key}`,
        externalUrl: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
        title: descricao ? `Votação — ${descricao}` : materia ? `Votação — ${materia}` : "Votação nominal",
        summary: voto ? `Voto registrado: ${voto}` : null,
        occurredAt: data,
        raw,
        normalized: {
          institution: "Senado Federal",
          proposition_reference: materia || codigoMateria,
          title: descricao || materia || "Votação nominal",
          description: descricao,
          vote_date: data,
          vote_value: voto,
          session_reference: codigoSessao,
          official_url: context.senadorId ? senadorOfficialUrl(context.senadorId) : null,
          external_id: `senado-voto:${senadorId}:${key}`,
          senator_id: senadorId,
          senator_name: context.candidateName || null,
        },
      });
    })
    .filter((item): item is MfbNormalizedPublicRecord => Boolean(item));
}

export function validateNormalizedRecord(record: MfbNormalizedPublicRecord) {
  const errors: string[] = [];
  if (!record.record_type) errors.push("record_type ausente.");
  if (!record.title?.trim()) errors.push("title ausente.");
  if (record.metadata?.provider_code !== SENADO_PROVIDER_CODE) {
    errors.push("provider_code incompatível com o normalizador do Senado.");
  }
  if (!record.raw_payload || typeof record.raw_payload !== "object") {
    errors.push("raw_payload ausente ou inválido.");
  }
  if (!record.normalized_payload || typeof record.normalized_payload !== "object") {
    errors.push("normalized_payload ausente ou inválido.");
  }
  return { valid: errors.length === 0, errors };
}

export const senadoNormalizers = {
  profile: normalizeSenadorProfile,
  mandatos: normalizeMandatos,
  comissoes: normalizeComissoes,
  cargos: normalizeCargos,
  votacoes: normalizeVotacoes,
  validate: validateNormalizedRecord,
};
