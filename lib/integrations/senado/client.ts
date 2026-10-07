const SENADO_API_BASE = "https://legis.senado.leg.br/dadosabertos";
const DEFAULT_TIMEOUT_MS = 20_000;

export const SENADO_PROVIDER_CODE = "senado";
export const SENADO_API_URL = SENADO_API_BASE;

export type SenadoPayload = Record<string, unknown>;

export class SenadoApiError extends Error {
  status: number | null;
  url: string;
  details: unknown;

  constructor(args: {
    message: string;
    status?: number | null;
    url: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "SenadoApiError";
    this.status = args.status ?? null;
    this.url = args.url;
    this.details = args.details ?? null;
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // O sufixo explicita JSON; sem ele alguns recursos do Senado retornam XML.
  return `${SENADO_API_BASE}${normalizedPath}.json`;
}

async function request(path: string): Promise<SenadoPayload> {
  const url = buildUrl(path);
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";

    let body: unknown;

    if (contentType.toLowerCase().includes("json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      throw new SenadoApiError({
        message: `A API do Senado respondeu com HTTP ${response.status}.`,
        status: response.status,
        url,
        details: body,
      });
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw new SenadoApiError({
        message: "A API do Senado retornou um formato inesperado.",
        status: response.status,
        url,
        details: body,
      });
    }

    // Deprecated services can return HTTP 200 with only metadata and no records.
    for (const root of Object.values(body as Record<string, unknown>)) {
      if (!root || typeof root !== "object") continue;
      const metadata = (root as Record<string, any>).Metadados;
      const retired = metadata?.Descontinuacao?.DataDesativacaoCompleta;
      if (typeof retired === "string" && retired <= new Date().toISOString().slice(0, 10)) {
        throw new SenadoApiError({message: "Serviço do Senado desativado. Use Ciência Eleitoral → Observatório legislativo para os conectores atuais.", url, status: response.status});
      }
    }
    return body as SenadoPayload;
  } catch (error) {
    if (error instanceof SenadoApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new SenadoApiError({
        message: "Tempo limite excedido ao consultar o Senado Federal.",
        url,
      });
    }

    throw new SenadoApiError({
      message:
        error instanceof Error
          ? error.message
          : "Falha ao consultar o Senado Federal.",
      url,
      details: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function senadorOfficialUrl(
  codigo: string | number
): string {
  return `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${encodeURIComponent(
    String(codigo)
  )}`;
}

export function obterSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}`
  );
}

export function listarSenadoresEmExercicio(): Promise<SenadoPayload> {
  return request("/senador/lista/atual");
}

export function obterMandatosSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}/mandatos`
  );
}

export function obterComissoesSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}/comissoes`
  );
}

export function obterCargosSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}/cargos`
  );
}

export function obterLiderancasSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}/liderancas`
  );
}

export function obterVotacoesSenador(
  codigo: string | number
): Promise<SenadoPayload> {
  return request(
    `/senador/${encodeURIComponent(String(codigo))}/votacoes`
  );
}

export const senadoClient = {
  senador: obterSenador,
  mandatos: obterMandatosSenador,
  comissoes: obterComissoesSenador,
  cargos: obterCargosSenador,
  liderancas: obterLiderancasSenador,
  votacoes: obterVotacoesSenador,
};
