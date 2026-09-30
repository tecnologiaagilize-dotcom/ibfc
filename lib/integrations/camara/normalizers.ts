import type {
  CamaraAutorProposicao,
  CamaraDeputadoDetalhe,
  CamaraHistoricoDeputado,
  CamaraMandatoExterno,
  CamaraOrgaoDeputado,
  CamaraProposicao,
  CamaraProposicaoDetalhe,
  CamaraTemaProposicao,
  CamaraVotacao,
  CamaraVoto,
} from "./client";

import {
  CAMARA_API_URL,
  CAMARA_PROVIDER_CODE,
} from "./client";

/* ============================================================
   TIPOS INTERNOS DO MFB
============================================================ */

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

  normalized_payload: Record<
    string,
    unknown
  >;

  metadata: {
    provider_code: string;
    source: "official";
    normalized_at: string;
    normalizer_version: string;
  };
};

export type CamaraNormalizationContext = {
  candidateId?: string;

  deputadoId?: string | number;

  candidateName?: string;

  stateUf?: string | null;
};

const NORMALIZER_VERSION = "1.0.0";

/* ============================================================
   HELPERS
============================================================ */

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function firstValue(
  record: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const key of keys) {
    const value = record[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function stringValue(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string | null = null
): string | null {
  const value = firstValue(
    record,
    keys
  );

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}

function numberValue(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  const value = firstValue(
    record,
    keys
  );

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function booleanValue(
  record: Record<string, unknown>,
  keys: string[],
  fallback = false
): boolean {
  const value = firstValue(
    record,
    keys
  );

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      [
        "true",
        "1",
        "sim",
        "yes",
        "s",
      ].includes(normalized)
    ) {
      return true;
    }

    if (
      [
        "false",
        "0",
        "nao",
        "não",
        "no",
        "n",
      ].includes(normalized)
    ) {
      return false;
    }
  }

  return fallback;
}

function dateValue(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  const value = stringValue(
    record,
    keys
  );

  if (!value) {
    return null;
  }

  /*
   * O MFB usa YYYY-MM-DD nas tabelas
   * documentais.
   *
   * Se a Câmara fornecer timestamp ISO,
   * preservamos apenas a data.
   */
  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    return value.substring(0, 10);
  }

  /*
   * Alguns conjuntos históricos podem
   * eventualmente fornecer DD/MM/YYYY.
   */
  const brazilianDate =
    value.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (brazilianDate) {
    return `${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}`;
  }

  return null;
}

function cleanText(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text = String(value)
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function uniqueStrings(
  values: Array<
    string | null | undefined
  >
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          value?.trim()
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        )
    )
  );
}

function normalizeUf(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  const uf = value
    .trim()
    .toUpperCase();

  return uf.length === 2
    ? uf
    : null;
}

function nowIso() {
  return new Date().toISOString();
}

function buildMetadata() {
  return {
    provider_code:
      CAMARA_PROVIDER_CODE,

    source:
      "official" as const,

    normalized_at:
      nowIso(),

    normalizer_version:
      NORMALIZER_VERSION,
  };
}

function camaraUrl(
  path: string
) {
  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${CAMARA_API_URL}${normalizedPath}`;
}

function safeExternalId(
  prefix: string,
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return `${prefix}:${String(
    value
  )}`;
}

function buildRecord({
  recordType,
  externalId,
  externalUrl,
  title,
  summary,
  occurredAt,
  rawPayload,
  normalizedPayload,
}: {
  recordType: MfbPublicDataRecordType;

  externalId: string | null;

  externalUrl: string | null;

  title: string;

  summary?: string | null;

  occurredAt?: string | null;

  rawPayload: Record<
    string,
    unknown
  >;

  normalizedPayload: Record<
    string,
    unknown
  >;
}): MfbNormalizedPublicRecord {
  return {
    record_type: recordType,

    external_id:
      externalId,

    external_url:
      externalUrl,

    title,

    summary:
      summary ?? null,

    occurred_at:
      occurredAt ?? null,

    raw_payload:
      rawPayload,

    normalized_payload:
      normalizedPayload,

    metadata:
      buildMetadata(),
  };
}

/* ============================================================
   PERFIL DO DEPUTADO
============================================================ */

export function normalizeDeputadoProfile(
  deputado:
    CamaraDeputadoDetalhe,
  context: CamaraNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const raw = asRecord(
    deputado
  );

  const ultimoStatus =
    asRecord(
      raw["ultimoStatus"]
    );

  const deputadoId =
    numberValue(raw, ["id"]) ??
    numberValue(
      ultimoStatus,
      ["id"]
    ) ??
    (context.deputadoId
      ? Number(context.deputadoId)
      : null);

  const nome =
    stringValue(
      ultimoStatus,
      ["nome", "nomeEleitoral"]
    ) ||
    stringValue(
      raw,
      ["nomeCivil", "nome"]
    ) ||
    context.candidateName ||
    "Deputado";

  const nomeCivil =
    stringValue(
      raw,
      ["nomeCivil"]
    );

  const partido =
    stringValue(
      ultimoStatus,
      ["siglaPartido"]
    );

  const uf =
    normalizeUf(
      stringValue(
        ultimoStatus,
        ["siglaUf"]
      ) ||
        context.stateUf ||
        null
    );

  const email =
    stringValue(
      ultimoStatus,
      ["email"]
    );

  const urlFoto =
    stringValue(
      ultimoStatus,
      ["urlFoto"]
    );

  const situacao =
    stringValue(
      ultimoStatus,
      ["situacao"]
    );

  const condicaoEleitoral =
    stringValue(
      ultimoStatus,
      ["condicaoEleitoral"]
    );

  const summaryParts =
    uniqueStrings([
      partido
        ? `Partido: ${partido}`
        : null,

      uf
        ? `UF: ${uf}`
        : null,

      situacao
        ? `Situação: ${situacao}`
        : null,
    ]);

  return buildRecord({
    recordType: "profile",

    externalId:
      safeExternalId(
        "camara-deputado",
        deputadoId
      ),

    externalUrl:
      deputadoId
        ? camaraUrl(
            `/deputados/${deputadoId}`
          )
        : null,

    title:
      `Perfil parlamentar — ${nome}`,

    summary:
      summaryParts.length
        ? summaryParts.join(" • ")
        : null,

    rawPayload: raw,

    normalizedPayload: {
      external_id:
        deputadoId
          ? String(deputadoId)
          : null,

      name: nome,

      civil_name:
        nomeCivil,

      party:
        partido,

      state_uf:
        uf,

      email,

      photo_url:
        urlFoto,

      status:
        situacao,

      electoral_condition:
        condicaoEleitoral,

      institution:
        "Câmara dos Deputados",

      country_code:
        "BR",

      source_url:
        deputadoId
          ? camaraUrl(
              `/deputados/${deputadoId}`
            )
          : null,
    },
  });
}

/* ============================================================
   HISTÓRICO PARLAMENTAR
============================================================ */

export function normalizeHistoricoDeputado(
  historico:
    CamaraHistoricoDeputado,
  context: CamaraNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const raw = asRecord(
    historico
  );

  const id =
    stringValue(
      raw,
      [
        "id",
        "idHistorico",
        "idLegislatura",
      ]
    );

  const nome =
    stringValue(
      raw,
      [
        "nome",
        "nomeEleitoral",
      ]
    ) ||
    context.candidateName ||
    "Parlamentar";

  const partido =
    stringValue(
      raw,
      ["siglaPartido"]
    );

  const uf =
    normalizeUf(
      stringValue(
        raw,
        ["siglaUf"]
      ) ||
        context.stateUf ||
        null
    );

  const situacao =
    stringValue(
      raw,
      ["situacao"]
    );

  const dataInicio =
    dateValue(
      raw,
      [
        "dataInicio",
        "dataInicioMandato",
      ]
    );

  const dataFim =
    dateValue(
      raw,
      [
        "dataFim",
        "dataFimMandato",
      ]
    );

  const isCurrent =
    !dataFim;

  const deputadoId =
    context.deputadoId
      ? String(
          context.deputadoId
        )
      : null;

  return buildRecord({
    recordType:
      "position",

    externalId:
      safeExternalId(
        "camara-historico",
        id ||
          `${deputadoId || "sem-id"}:${dataInicio || "sem-data"}`
      ),

    externalUrl:
      deputadoId
        ? camaraUrl(
            `/deputados/${deputadoId}/historico`
          )
        : null,

    title:
      "Deputado Federal",

    summary:
      cleanText(
        [
          nome,
          partido,
          uf,
          situacao,
        ]
          .filter(Boolean)
          .join(" • ")
      ),

    occurredAt:
      dataInicio,

    rawPayload:
      raw,

    normalizedPayload: {
      position_type:
        "mandate",

      title:
        "Deputado Federal",

      institution:
        "Câmara dos Deputados",

      country_code:
        "BR",

      state_uf:
        uf,

      city_name:
        null,

      start_date:
        dataInicio,

      end_date:
        dataFim,

      is_current:
        isCurrent,

      description:
        situacao
          ? `Situação informada pela Câmara: ${situacao}.`
          : null,

      party:
        partido,

      source_url:
        deputadoId
          ? camaraUrl(
              `/deputados/${deputadoId}/historico`
            )
          : null,
    },
  });
}

/* ============================================================
   MANDATOS EXTERNOS
============================================================ */

export function normalizeMandatoExterno(
  mandato:
    CamaraMandatoExterno,
  context: CamaraNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const raw =
    asRecord(mandato);

  const cargo =
    stringValue(
      raw,
      [
        "cargo",
        "descricaoCargo",
        "nomeCargo",
      ]
    ) ||
    "Mandato externo";

  const entidade =
    stringValue(
      raw,
      [
        "entidade",
        "instituicao",
        "nomeEntidade",
      ]
    );

  const uf =
    normalizeUf(
      stringValue(
        raw,
        ["siglaUf", "uf"]
      ) ||
        context.stateUf ||
        null
    );

  const municipio =
    stringValue(
      raw,
      [
        "municipio",
        "nomeMunicipio",
        "cidade",
      ]
    );

  const inicio =
    dateValue(
      raw,
      [
        "dataInicio",
        "inicio",
      ]
    );

  const fim =
    dateValue(
      raw,
      [
        "dataFim",
        "fim",
      ]
    );

  const id =
    stringValue(
      raw,
      [
        "id",
        "idMandato",
      ]
    );

  const deputadoId =
    context.deputadoId
      ? String(
          context.deputadoId
        )
      : null;

  return buildRecord({
    recordType:
      "position",

    externalId:
      safeExternalId(
        "camara-mandato-externo",
        id ||
          `${deputadoId || "sem-id"}:${cargo}:${inicio || "sem-data"}`
      ),

    externalUrl:
      deputadoId
        ? camaraUrl(
            `/deputados/${deputadoId}/mandatosExternos`
          )
        : null,

    title: cargo,

    summary:
      entidade ||
      municipio ||
      null,

    occurredAt:
      inicio,

    rawPayload:
      raw,

    normalizedPayload: {
      position_type:
        "external_mandate",

      title:
        cargo,

      institution:
        entidade,

      country_code:
        "BR",

      state_uf:
        uf,

      city_name:
        municipio,

      start_date:
        inicio,

      end_date:
        fim,

      is_current:
        !fim,

      description:
        stringValue(
          raw,
          [
            "descricao",
            "observacao",
          ]
        ),

      source_url:
        deputadoId
          ? camaraUrl(
              `/deputados/${deputadoId}/mandatosExternos`
            )
          : null,
    },
  });
}

/* ============================================================
   ÓRGÃOS / COMISSÕES
============================================================ */

export function normalizeOrgaoDeputado(
  orgao:
    CamaraOrgaoDeputado,
  context: CamaraNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const raw =
    asRecord(orgao);

  const orgaoId =
    stringValue(
      raw,
      [
        "idOrgao",
        "id",
      ]
    );

  const nome =
    stringValue(
      raw,
      [
        "nomeOrgao",
        "nome",
        "siglaOrgao",
      ]
    ) ||
    "Órgão parlamentar";

  const sigla =
    stringValue(
      raw,
      ["siglaOrgao", "sigla"]
    );

  const cargo =
    stringValue(
      raw,
      [
        "titulo",
        "cargo",
        "funcao",
      ]
    );

  const inicio =
    dateValue(
      raw,
      [
        "dataInicio",
        "dataInicioMembro",
      ]
    );

  const fim =
    dateValue(
      raw,
      [
        "dataFim",
        "dataFimMembro",
      ]
    );

  const deputadoId =
    context.deputadoId
      ? String(
          context.deputadoId
        )
      : null;

  return buildRecord({
    recordType:
      "committee",

    externalId:
      safeExternalId(
        "camara-orgao",
        orgaoId
          ? `${deputadoId || "sem-deputado"}:${orgaoId}:${inicio || "sem-data"}`
          : `${deputadoId || "sem-deputado"}:${nome}:${inicio || "sem-data"}`
      ),

    externalUrl:
      deputadoId
        ? camaraUrl(
            `/deputados/${deputadoId}/orgaos`
          )
        : null,

    title:
      sigla
        ? `${sigla} — ${nome}`
        : nome,

    summary:
      cargo,

    occurredAt:
      inicio,

    rawPayload:
      raw,

    normalizedPayload: {
      institution:
        "Câmara dos Deputados",

      committee_name:
        nome,

      committee_acronym:
        sigla,

      role:
        cargo,

      start_date:
        inicio,

      end_date:
        fim,

      is_current:
        !fim,

      description:
        stringValue(
          raw,
          [
            "descricao",
            "observacao",
          ]
        ),

      official_url:
        deputadoId
          ? camaraUrl(
              `/deputados/${deputadoId}/orgaos`
            )
          : null,
    },
  });
}

/* ============================================================
   PROPOSIÇÕES
============================================================ */

export function normalizeProposicao(
  proposicao:
    | CamaraProposicao
    | CamaraProposicaoDetalhe,
  options: {
    authors?: CamaraAutorProposicao[];
    themes?: CamaraTemaProposicao[];
  } = {}
): MfbNormalizedPublicRecord {
  const raw =
    asRecord(proposicao);

  const id =
    numberValue(
      raw,
      ["id"]
    );

  const siglaTipo =
    stringValue(
      raw,
      [
        "siglaTipo",
        "tipo",
      ]
    );

  const numero =
    stringValue(
      raw,
      ["numero"]
    );

  const ano =
    stringValue(
      raw,
      ["ano"]
    );

  const ementa =
    cleanText(
      firstValue(
        raw,
        [
          "ementa",
          "ementaDetalhada",
          "descricao",
        ]
      )
    );

  const dataApresentacao =
    dateValue(
      raw,
      [
        "dataApresentacao",
        "data",
      ]
    );

  const statusProposicao =
    asRecord(
      raw["statusProposicao"]
    );

  const descricaoSituacao =
    stringValue(
      statusProposicao,
      [
        "descricaoSituacao",
        "descricaoTramitacao",
      ]
    );

  const autores =
    (options.authors || [])
      .map((autor) => {
        const item =
          asRecord(autor);

        return stringValue(
          item,
          [
            "nome",
            "nomeAutor",
          ]
        );
      })
      .filter(
        (value): value is string =>
          Boolean(value)
      );

  const temas =
    (options.themes || [])
      .map((tema) => {
        const item =
          asRecord(tema);

        return stringValue(
          item,
          [
            "tema",
            "nome",
          ]
        );
      })
      .filter(
        (value): value is string =>
          Boolean(value)
      );

  const propositionLabel =
    [
      siglaTipo,
      numero,
      ano
        ? `/${ano}`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

  const title =
    propositionLabel ||
    (id
      ? `Proposição ${id}`
      : "Proposição");

  const officialUrl =
    id
      ? camaraUrl(
          `/proposicoes/${id}`
        )
      : null;

  return buildRecord({
    recordType:
      "proposition",

    externalId:
      safeExternalId(
        "camara-proposicao",
        id
      ),

    externalUrl:
      officialUrl,

    title,

    summary:
      ementa,

    occurredAt:
      dataApresentacao,

    rawPayload: {
      ...raw,

      _mfb_related: {
        authors:
          options.authors ||
          [],

        themes:
          options.themes ||
          [],
      },
    },

    normalizedPayload: {
      proposition_type:
        siglaTipo,

      proposition_number:
        numero && ano
          ? `${numero}/${ano}`
          : numero,

      title,

      description:
        ementa,

      institution:
        "Câmara dos Deputados",

      role:
        autores.length
          ? `Autoria informada: ${autores.join(", ")}`
          : null,

      authors:
        autores,

      subject_areas:
        uniqueStrings(
          temas
        ),

      presented_at:
        dataApresentacao,

      status:
        descricaoSituacao,

      official_url:
        officialUrl,

      external_id:
        id
          ? String(id)
          : null,
    },
  });
}

/* ============================================================
   VOTAÇÕES
============================================================ */

export function normalizeVotoNominal(
  voto: CamaraVoto,
  votacao: CamaraVotacao,
  context: CamaraNormalizationContext = {}
): MfbNormalizedPublicRecord {
  const rawVote =
    asRecord(voto);

  const rawVoting =
    asRecord(votacao);

  const votacaoId =
    stringValue(
      rawVoting,
      ["id"]
    );

  const deputado =
    asRecord(
      rawVote["deputado_"]
    );

  const deputadoAlternativo =
    asRecord(
      rawVote["deputado"]
    );

  const deputadoRecord =
    Object.keys(deputado).length
      ? deputado
      : deputadoAlternativo;

  const deputadoId =
    stringValue(
      deputadoRecord,
      ["id"]
    ) ||
    stringValue(
      rawVote,
      [
        "idDeputado",
        "deputadoId",
      ]
    ) ||
    (context.deputadoId
      ? String(
          context.deputadoId
        )
      : null);

  const nomeDeputado =
    stringValue(
      deputadoRecord,
      ["nome"]
    ) ||
    context.candidateName ||
    "Parlamentar";

  const votoValue =
    stringValue(
      rawVote,
      [
        "tipoVoto",
        "voto",
      ]
    );

  const data =
    dateValue(
      rawVoting,
      [
        "data",
        "dataHoraRegistro",
        "dataHora",
      ]
    );

  const descricao =
    cleanText(
      firstValue(
        rawVoting,
        [
          "descricao",
          "descricaoProposicao",
          "ementa",
        ]
      )
    );

  const proposicao =
    asRecord(
      rawVoting[
        "proposicaoObjeto"
      ]
    );

  const proposicaoReferencia =
    stringValue(
      proposicao,
      [
        "siglaTipo",
        "uri",
      ]
    ) ||
    stringValue(
      rawVoting,
      [
        "proposicaoObjeto",
      ]
    );

  const title =
    descricao
      ? `Votação — ${descricao}`
      : votacaoId
        ? `Votação ${votacaoId}`
        : "Votação nominal";

  const externalId =
    votacaoId
      ? `camara-voto:${votacaoId}:${deputadoId || nomeDeputado}`
      : null;

  const officialUrl =
    votacaoId
      ? camaraUrl(
          `/votacoes/${encodeURIComponent(
            votacaoId
          )}/votos`
        )
      : null;

  return buildRecord({
    recordType:
      "vote",

    externalId,

    externalUrl:
      officialUrl,

    title,

    summary:
      votoValue
        ? `Voto registrado: ${votoValue}`
        : null,

    occurredAt:
      data,

    rawPayload: {
      vote:
        rawVote,

      voting:
        rawVoting,
    },

    normalizedPayload: {
      institution:
        "Câmara dos Deputados",

      proposition_reference:
        proposicaoReferencia,

      title,

      description:
        descricao,

      vote_date:
        data,

      vote_value:
        votoValue,

      session_reference:
        stringValue(
          rawVoting,
          [
            "siglaOrgao",
            "uriOrgao",
          ]
        ),

      official_url:
        officialUrl,

      external_id:
        externalId,

      deputy_id:
        deputadoId,

      deputy_name:
        nomeDeputado,
    },
  });
}

/* ============================================================
   FILTRAGEM DE VOTOS POR DEPUTADO
============================================================ */

export function findVoteForDeputado(
  votos: CamaraVoto[],
  deputadoId: string | number
): CamaraVoto | null {
  const expected =
    String(deputadoId);

  for (const voto of votos) {
    const raw =
      asRecord(voto);

    const deputadoA =
      asRecord(
        raw["deputado_"]
      );

    const deputadoB =
      asRecord(
        raw["deputado"]
      );

    const id =
      stringValue(
        deputadoA,
        ["id"]
      ) ||
      stringValue(
        deputadoB,
        ["id"]
      ) ||
      stringValue(
        raw,
        [
          "idDeputado",
          "deputadoId",
        ]
      );

    if (id === expected) {
      return voto;
    }
  }

  return null;
}

/* ============================================================
   NORMALIZAÇÃO EM LOTE
============================================================ */

export function normalizeHistoricoList(
  items: CamaraHistoricoDeputado[],
  context: CamaraNormalizationContext
) {
  return items.map(
    (item) =>
      normalizeHistoricoDeputado(
        item,
        context
      )
  );
}

export function normalizeMandatosExternosList(
  items: CamaraMandatoExterno[],
  context: CamaraNormalizationContext
) {
  return items.map(
    (item) =>
      normalizeMandatoExterno(
        item,
        context
      )
  );
}

export function normalizeOrgaosList(
  items: CamaraOrgaoDeputado[],
  context: CamaraNormalizationContext
) {
  return items.map(
    (item) =>
      normalizeOrgaoDeputado(
        item,
        context
      )
  );
}

/* ============================================================
   VALIDAÇÃO ANTES DA FILA
============================================================ */

export function validateNormalizedRecord(
  record: MfbNormalizedPublicRecord
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!record.record_type) {
    errors.push(
      "record_type ausente."
    );
  }

  if (!record.title?.trim()) {
    errors.push(
      "title ausente."
    );
  }

  if (
    !record.metadata
      ?.provider_code
  ) {
    errors.push(
      "provider_code ausente."
    );
  }

  if (
    record.metadata
      ?.provider_code !==
    CAMARA_PROVIDER_CODE
  ) {
    errors.push(
      "provider_code incompatível com o normalizador da Câmara."
    );
  }

  if (
    !record.raw_payload ||
    typeof record.raw_payload !==
      "object"
  ) {
    errors.push(
      "raw_payload ausente ou inválido."
    );
  }

  if (
    !record.normalized_payload ||
    typeof record.normalized_payload !==
      "object"
  ) {
    errors.push(
      "normalized_payload ausente ou inválido."
    );
  }

  return {
    valid:
      errors.length === 0,

    errors,
  };
}

/* ============================================================
   CHAVE DE DEDUPLICAÇÃO
============================================================ */

export function getNormalizedRecordKey(
  record: MfbNormalizedPublicRecord
) {
  if (record.external_id) {
    return [
      CAMARA_PROVIDER_CODE,
      record.record_type,
      record.external_id,
    ].join(":");
  }

  return [
    CAMARA_PROVIDER_CODE,
    record.record_type,
    record.title,
    record.occurred_at ||
      "sem-data",
  ]
    .join(":")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/* ============================================================
   EXPORTAÇÃO CENTRAL
============================================================ */

export const camaraNormalizers = {
  deputadoProfile:
    normalizeDeputadoProfile,

  historico:
    normalizeHistoricoDeputado,

  historicoList:
    normalizeHistoricoList,

  mandatoExterno:
    normalizeMandatoExterno,

  mandatosExternosList:
    normalizeMandatosExternosList,

  orgao:
    normalizeOrgaoDeputado,

  orgaosList:
    normalizeOrgaosList,

  proposicao:
    normalizeProposicao,

  votoNominal:
    normalizeVotoNominal,

  findVoteForDeputado,

  validate:
    validateNormalizedRecord,

  recordKey:
    getNormalizedRecordKey,
};
