const CAMARA_API_BASE =
  "https://dadosabertos.camara.leg.br/api/v2";

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_ITEMS_PER_PAGE = 100;

export type CamaraLink = {
  rel?: string;
  href?: string;
};

export type CamaraResponse<T> = {
  dados: T;
  links?: CamaraLink[];
};

export type CamaraListResponse<T> = {
  dados: T[];
  links?: CamaraLink[];
};

export type CamaraDeputadoResumo = {
  id: number;
  uri?: string;
  nome?: string;
  siglaPartido?: string;
  uriPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
  urlFoto?: string;
  email?: string;
};

export type CamaraDeputadoDetalhe = Record<
  string,
  unknown
>;

export type CamaraHistoricoDeputado = Record<
  string,
  unknown
>;

export type CamaraMandatoExterno = Record<
  string,
  unknown
>;

export type CamaraOrgaoDeputado = Record<
  string,
  unknown
>;

export type CamaraProposicao = {
  id: number;
  uri?: string;
  siglaTipo?: string;
  codTipo?: number;
  numero?: number;
  ano?: number;
  ementa?: string;
};

export type CamaraProposicaoDetalhe = Record<
  string,
  unknown
>;

export type CamaraAutorProposicao = Record<
  string,
  unknown
>;

export type CamaraTemaProposicao = Record<
  string,
  unknown
>;

export type CamaraVotacao = Record<
  string,
  unknown
>;

export type CamaraVoto = Record<
  string,
  unknown
>;

export class CamaraApiError extends Error {
  status: number | null;
  url: string;
  details: unknown;

  constructor({
    message,
    status = null,
    url,
    details = null,
  }: {
    message: string;
    status?: number | null;
    url: string;
    details?: unknown;
  }) {
    super(message);

    this.name = "CamaraApiError";
    this.status = status;
    this.url = url;
    this.details = details;
  }
}

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

type QueryParams = Record<
  string,
  QueryValue | QueryValue[]
>;

type RequestOptions = {
  query?: QueryParams;
  timeoutMs?: number;
};

function buildUrl(
  path: string,
  query?: QueryParams
) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const url = new URL(
    `${CAMARA_API_BASE}${normalizedPath}`
  );

  if (!query) {
    return url.toString();
  }

  for (const [key, rawValue] of Object.entries(
    query
  )) {
    const values = Array.isArray(rawValue)
      ? rawValue
      : [rawValue];

    for (const value of values) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        continue;
      }

      url.searchParams.append(
        key,
        String(value)
      );
    }
  }

  return url.toString();
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = buildUrl(
    path,
    options.query
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ??
      DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      signal: controller.signal,

      /*
       * Não usamos cache permanente porque os dados
       * legislativos podem mudar.
       *
       * A sincronização futura será controlada pelo MFB.
       */
      cache: "no-store",
    });

    const contentType =
      response.headers.get(
        "content-type"
      );

    let body: unknown = null;

    if (
      contentType?.includes(
        "application/json"
      )
    ) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      throw new CamaraApiError({
        message:
          `A API da Câmara respondeu com HTTP ${response.status}.`,

        status: response.status,
        url,
        details: body,
      });
    }

    return body as T;
  } catch (error) {
    if (
      error instanceof CamaraApiError
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new CamaraApiError({
        message:
          "A consulta à API da Câmara excedeu o tempo limite.",

        url,
      });
    }

    throw new CamaraApiError({
      message:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao consultar a API da Câmara.",

      url,
      details: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function findNextLink(
  links?: CamaraLink[]
) {
  if (!links?.length) {
    return null;
  }

  return (
    links.find(
      (link) =>
        link.rel === "next" &&
        Boolean(link.href)
    )?.href ?? null
  );
}

function queryFromNextLink(
  nextUrl: string
): QueryParams {
  const url = new URL(nextUrl);

  const query: QueryParams = {};

  url.searchParams.forEach(
    (value, key) => {
      const current = query[key];

      if (current === undefined) {
        query[key] = value;
        return;
      }

      if (Array.isArray(current)) {
        current.push(value);
        return;
      }

      query[key] = [
        current,
        value,
      ];
    }
  );

  return query;
}

async function requestAllPages<T>(
  path: string,
  query: QueryParams = {},
  options: {
    maxPages?: number;
    maxRecords?: number;
  } = {}
): Promise<T[]> {
  const maxPages =
    options.maxPages ?? 50;

  const maxRecords =
    options.maxRecords ?? 5000;

  let page = 0;

  let currentQuery: QueryParams = {
    ...query,
    itens:
      query.itens ??
      MAX_ITEMS_PER_PAGE,
  };

  const records: T[] = [];

  while (page < maxPages) {
    page += 1;

    const response =
      await request<
        CamaraListResponse<T>
      >(path, {
        query: currentQuery,
      });

    if (
      Array.isArray(response.dados)
    ) {
      records.push(
        ...response.dados
      );
    }

    if (
      records.length >=
      maxRecords
    ) {
      return records.slice(
        0,
        maxRecords
      );
    }

    const next =
      findNextLink(
        response.links
      );

    if (!next) {
      break;
    }

    currentQuery =
      queryFromNextLink(next);
  }

  return records;
}

/* ============================================================
   DEPUTADOS
============================================================ */

export async function buscarDeputados(
  params: {
    nome?: string;
    siglaUf?: string;
    siglaPartido?: string;
    idLegislatura?: number;
    pagina?: number;
    itens?: number;
  } = {}
) {
  return request<
    CamaraListResponse<CamaraDeputadoResumo>
  >("/deputados", {
    query: {
      ...params,

      itens: Math.min(
        params.itens ?? 15,
        MAX_ITEMS_PER_PAGE
      ),
    },
  });
}

export async function obterDeputado(
  deputadoId: number | string
) {
  return request<
    CamaraResponse<CamaraDeputadoDetalhe>
  >(
    `/deputados/${encodeURIComponent(
      String(deputadoId)
    )}`
  );
}

export async function obterHistoricoDeputado(
  deputadoId: number | string
) {
  return request<
    CamaraListResponse<CamaraHistoricoDeputado>
  >(
    `/deputados/${encodeURIComponent(
      String(deputadoId)
    )}/historico`
  );
}

export async function obterMandatosExternos(
  deputadoId: number | string
) {
  return request<
    CamaraListResponse<CamaraMandatoExterno>
  >(
    `/deputados/${encodeURIComponent(
      String(deputadoId)
    )}/mandatosExternos`
  );
}

export async function obterOrgaosDeputado(
  deputadoId: number | string
) {
  return request<
    CamaraListResponse<CamaraOrgaoDeputado>
  >(
    `/deputados/${encodeURIComponent(
      String(deputadoId)
    )}/orgaos`
  );
}

/* ============================================================
   PROPOSIÇÕES
============================================================ */

export async function buscarProposicoes(
  params: QueryParams = {}
) {
  return request<
    CamaraListResponse<CamaraProposicao>
  >("/proposicoes", {
    query: {
      ...params,

      itens: Math.min(
        Number(params.itens ?? 15),
        MAX_ITEMS_PER_PAGE
      ),
    },
  });
}

export async function buscarTodasProposicoes(
  params: QueryParams = {},
  options: {
    maxPages?: number;
    maxRecords?: number;
  } = {}
) {
  return requestAllPages<
    CamaraProposicao
  >(
    "/proposicoes",
    params,
    options
  );
}

export async function obterProposicao(
  proposicaoId: number | string
) {
  return request<
    CamaraResponse<CamaraProposicaoDetalhe>
  >(
    `/proposicoes/${encodeURIComponent(
      String(proposicaoId)
    )}`
  );
}

export async function obterAutoresProposicao(
  proposicaoId: number | string
) {
  return request<
    CamaraListResponse<CamaraAutorProposicao>
  >(
    `/proposicoes/${encodeURIComponent(
      String(proposicaoId)
    )}/autores`
  );
}

export async function obterTemasProposicao(
  proposicaoId: number | string
) {
  return request<
    CamaraListResponse<CamaraTemaProposicao>
  >(
    `/proposicoes/${encodeURIComponent(
      String(proposicaoId)
    )}/temas`
  );
}

/* ============================================================
   VOTAÇÕES
============================================================ */

export async function buscarVotacoes(
  params: QueryParams = {}
) {
  return request<
    CamaraListResponse<CamaraVotacao>
  >("/votacoes", {
    query: {
      ...params,

      itens: Math.min(
        Number(params.itens ?? 15),
        MAX_ITEMS_PER_PAGE
      ),
    },
  });
}

export async function buscarTodasVotacoes(
  params: QueryParams = {},
  options: {
    maxPages?: number;
    maxRecords?: number;
  } = {}
) {
  return requestAllPages<
    CamaraVotacao
  >(
    "/votacoes",
    params,
    options
  );
}

export async function obterVotosVotacao(
  votacaoId: string
) {
  return request<
    CamaraListResponse<CamaraVoto>
  >(
    `/votacoes/${encodeURIComponent(
      votacaoId
    )}/votos`
  );
}

/* ============================================================
   INFRAESTRUTURA
============================================================ */

export const camaraClient = {
  buscarDeputados,
  obterDeputado,
  obterHistoricoDeputado,
  obterMandatosExternos,
  obterOrgaosDeputado,

  buscarProposicoes,
  buscarTodasProposicoes,
  obterProposicao,
  obterAutoresProposicao,
  obterTemasProposicao,

  buscarVotacoes,
  buscarTodasVotacoes,
  obterVotosVotacao,
};

export const CAMARA_PROVIDER_CODE =
  "camara_dados_abertos";

export const CAMARA_API_URL =
  CAMARA_API_BASE;
