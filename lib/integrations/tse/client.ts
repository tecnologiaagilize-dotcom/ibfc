import { inflateRawSync } from "node:zlib";

export const TSE_PROVIDER_CODE = "tse";
export const TSE_DATASET_URL =
  "https://dadosabertos.tse.jus.br/dataset/candidatos-2026";
export const TSE_CKAN_API =
  "https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-2026";

export type TseCsvRow = Record<string, string>;

type CkanResource = {
  name?: string;
  format?: string;
  url?: string;
};

type CkanPackageResponse = {
  success?: boolean;
  result?: {
    resources?: CkanResource[];
  };
};

function decodeCsv(bytes: Uint8Array) {
  try {
    return new TextDecoder("windows-1252").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function unzipCandidatesCsv(buffer: ArrayBuffer): Uint8Array {
  const data = Buffer.from(buffer);
  let offset = 0;
  const csvFiles: Array<{ name: string; bytes: Uint8Array }> = [];

  while (offset + 30 <= data.length) {
    if (data.readUInt32LE(offset) !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const method = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const fileNameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const fileName = data
      .subarray(nameStart, nameEnd)
      .toString("utf8");

    const contentStart = nameEnd + extraLength;
    const contentEnd = contentStart + compressedSize;

    if (
      compressedSize > 0 &&
      contentEnd <= data.length &&
      fileName.toLowerCase().endsWith(".csv")
    ) {
      const compressed = data.subarray(
        contentStart,
        contentEnd
      );

      if (method === 0) {
        csvFiles.push({ name: fileName, bytes: new Uint8Array(compressed) });
      } else if (method === 8) {
        csvFiles.push({ name: fileName, bytes: new Uint8Array(inflateRawSync(compressed)) });
      } else {
        throw new Error(
          `Método ZIP não suportado no arquivo do TSE: ${method}.`
        );
      }
    }

    if (compressedSize > 0) {
      offset = contentEnd;
    } else {
      offset = nameEnd + extraLength;
    }
  }

  const national = csvFiles.find((file) => /_BRASIL\.csv$/i.test(file.name));
  if (national) return national.bytes;
  if (csvFiles.length === 1) return csvFiles[0].bytes;

  throw new Error(
    "O CSV nacional de candidatos não foi localizado no recurso ZIP do TSE."
  );
}

function parseDelimitedCsv(text: string): TseCsvRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter =
    (clean.split("\n", 1)[0].match(/;/g) || []).length >=
    (clean.split("\n", 1)[0].match(/,/g) || []).length
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];

    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const header = rows.shift()?.map((value) =>
    value.trim()
  );

  if (!header?.length) return [];

  return rows
    .filter((values) =>
      values.some((value) => value.trim())
    )
    .map((values) =>
      Object.fromEntries(
        header.map((key, index) => [
          key,
          values[index] ?? "",
        ])
      )
    );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MFB-PublicData/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `TSE respondeu HTTP ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

async function discoverCandidatesResource() {
  const pkg =
    await fetchJson<CkanPackageResponse>(
      TSE_CKAN_API
    );

  if (!pkg.success) {
    throw new Error(
      "O catálogo do TSE não retornou o conjunto Candidatos 2026."
    );
  }

  const resources = pkg.result?.resources || [];

  const resource =
    resources.find((item) => {
      const name = (item.name || "").toLowerCase();
      const format = (item.format || "").toLowerCase();
      return (
        name === "candidatos" &&
        (format.includes("csv") ||
          (item.url || "").toLowerCase().includes("csv"))
      );
    }) ||
    resources.find((item) => {
      const name = (item.name || "").toLowerCase();
      return (
        name.includes("candidatos") &&
        !name.includes("complement") &&
        !name.includes("bens") &&
        !name.includes("redes") &&
        !name.includes("histórico") &&
        !name.includes("historico") &&
        Boolean(item.url)
      );
    });

  if (!resource?.url) {
    throw new Error(
      "O recurso principal de candidatos não foi localizado no catálogo oficial do TSE."
    );
  }

  return resource;
}

export async function obterCandidatos2026(): Promise<{
  resourceUrl: string;
  rows: TseCsvRow[];
}> {
  const resource =
    await discoverCandidatesResource();

  const response = await fetch(resource.url!, {
    headers: {
      Accept:
        "application/zip,text/csv,text/plain,*/*",
      "User-Agent": "MFB-PublicData/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar a base oficial do TSE: HTTP ${response.status}.`
    );
  }

  const buffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") || "";

  let bytes: Uint8Array;

  if (
    contentType.includes("zip") ||
    resource.url!.toLowerCase().endsWith(".zip") ||
    Buffer.from(buffer).subarray(0, 2).toString() === "PK"
  ) {
    bytes = unzipCandidatesCsv(buffer);
  } else {
    bytes = new Uint8Array(buffer);
  }

  return {
    resourceUrl: resource.url!,
    rows: parseDelimitedCsv(decodeCsv(bytes)),
  };
}

export function localizarCandidatoPorSq(
  rows: TseCsvRow[],
  sqCandidato: string
) {
  const target = sqCandidato.trim();

  return (
    rows.find(
      (row) =>
        String(row.SQ_CANDIDATO || "").trim() ===
        target
    ) || null
  );
}

function comparable(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
}

export function localizarCandidato(
  rows: TseCsvRow[],
  filters: {
    candidateName?: string | null;
    stateUf?: string | null;
    office?: string | null;
    candidateNumber?: string | number | null;
  }
) {
  const uf = comparable(filters.stateUf);
  const number = comparable(filters.candidateNumber);
  const name = comparable(filters.candidateName);
  const office = comparable(filters.office);

  let matches = rows.filter((row) => {
    if (uf && comparable(row.SG_UF) !== uf) return false;
    if (number && comparable(row.NR_CANDIDATO) !== number) return false;
    return true;
  });

  if (office) {
    const officeMatches = matches.filter((row) => {
      const rowOffice = comparable(row.DS_CARGO);
      return rowOffice === office || rowOffice.startsWith(office) || office.startsWith(rowOffice);
    });
    if (officeMatches.length) matches = officeMatches;
  }

  if (matches.length > 1 && name) {
    const nameMatches = matches.filter((row) =>
      [row.NM_URNA_CANDIDATO, row.NM_CANDIDATO].some(
        (candidateName) => comparable(candidateName) === name
      )
    );
    if (nameMatches.length) matches = nameMatches;
  }

  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(
      "Candidato não localizado no TSE com os dados cadastrados. Confira UF, cargo, número e nome de urna."
    );
  }

  throw new Error(
    "Mais de um candidato foi localizado no TSE. Informe o número eleitoral ou vincule o SQ_CANDIDATO para eliminar a ambiguidade."
  );
}

export function tseCandidateOfficialUrl(
  sqCandidato: string
) {
  return `${TSE_DATASET_URL}#sq-candidato-${encodeURIComponent(
    sqCandidato
  )}`;
}

export const tseClient = {
  obterCandidatos2026,
  localizarCandidato,
  localizarCandidatoPorSq,
  tseCandidateOfficialUrl,
};
