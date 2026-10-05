import {regionalMunicipality} from "./region";
// Incremental CSV reader: avoids loading national TSE files into memory in the browser.
export async function* readCsv(file: File, encoding = "windows-1252"): AsyncGenerator<Record<string, string>> {
  const stream = file.stream().getReader();
  const decoder = new TextDecoder(encoding);
  let header: string[] | null = null;
  let field = "", row: string[] = [], quoted = false, quotePending = false;
  let delimiter = ";", first = true;
  const finish = () => {
    row.push(field.replace(/\r$/, "")); field = "";
    const values = row; row = [];
    if (!header) { header = values.map(x => x.replace(/^\uFEFF/, "").trim().toUpperCase()); return null; }
    if (!values.some(x => x.trim())) return null;
    if (values.length !== header.length) throw new Error("CSV com quantidade de colunas inconsistente. Confira o separador e a codificação.");
    return Object.fromEntries(header.map((h, i) => [h, values[i] ?? ""]));
  };
  try {
    while (true) {
      const chunk = await stream.read();
      const text = decoder.decode(chunk.value, { stream: !chunk.done });
      if (first && text) {
        const line = text.split(/\r?\n/)[0];
        delimiter = (line.match(/;/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0) ? ";" : ",";
        first = false;
      }
      for (const ch of text) {
        if (quotePending) {
          quotePending = false;
          if (ch === '"') { field += '"'; continue; }
          quoted = false;
        }
        if (quoted) { if (ch === '"') quotePending = true; else field += ch; continue; }
        if (ch === '"' && !field) quoted = true;
        else if (ch === delimiter) { row.push(field); field = ""; }
        else if (ch === "\n") { const result = finish(); if (result) yield result; }
        else field += ch;
      }
      if (chunk.done) break;
    }
    if (quoted && !quotePending) throw new Error("CSV com aspas não fechadas.");
    if (field || row.length) { const result = finish(); if (result) yield result; }
  } finally { await stream.cancel(); stream.releaseLock(); }
}

const requiredNumber = (row: Record<string, string>, name: string) => {
  const value = row[name]?.trim();
  if (!value || !/^\d+$/.test(value)) throw new Error(`Campo obrigatório inválido: ${name}.`);
  return Number(value);
};
const requiredText = (row: Record<string, string>, name: string) => {
  const value = row[name]?.trim();
  if (!value || value.length > 500) throw new Error(`Campo obrigatório inválido: ${name}.`);
  return value;
};
const coordinate = (text: string | undefined, min: number, max: number) => {
  if (!text || ["#NULO", "#NE", "-1"].includes(text.trim())) return null;
  const n = Number(text.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
};
export function normalizeCsvRow(row: Record<string, string>, kind: "votes" | "locations", year: number) {
  const uf = row.SG_UF?.trim().toUpperCase() ?? "";
  const municipality_name = regionalMunicipality(uf, row.NM_MUNICIPIO || (uf === "DF" ? "Brasília" : ""));
  if (!municipality_name) return null;
  const rowYear = row.ANO_ELEICAO || row.AA_ELEICAO;
  if (rowYear && Number(rowYear) !== year) throw new Error(`O arquivo é de ${rowYear}, mas foi selecionado ${year}.`);
  const base = { uf, municipality_name, year, municipality: requiredNumber(row, "CD_MUNICIPIO"), zone: requiredNumber(row, "NR_ZONA"),
    local: requiredNumber(row, "NR_LOCAL_VOTACAO") };
  if (kind === "locations") {
    const latitude = coordinate(row.NR_LATITUDE ?? row.LATITUDE, -18.5, -13.0);
    const longitude = coordinate(row.NR_LONGITUDE ?? row.LONGITUDE, -50.5, -45.0);
    return {...base, name: requiredText({...row, NM_LOCAL_VOTACAO: row.NM_LOCAL_VOTACAO || row.DS_LOCAL_VOTACAO || row.NM_LOCAL || ""}, "NM_LOCAL_VOTACAO"),
      address: (row.DS_ENDERECO || row.DS_ENDERECO_LOCAL || "").slice(0,500),
      latitude: latitude !== null && longitude !== null ? latitude : null,
      longitude: latitude !== null && longitude !== null ? longitude : null };
  }
  const office = requiredNumber(row, "CD_CARGO");
  if (![1, 3, 5, 6, 7, 8].includes(office)) throw new Error("Cargo não suportado neste módulo regional.");
  const turn = requiredNumber(row, "NR_TURNO");
  if (![1, 2].includes(turn)) throw new Error("Turno inválido.");
  return {...base, election: requiredNumber(row, "CD_ELEICAO"), turn, office,
    office_name: requiredText(row, "DS_CARGO"), section: requiredNumber(row, "NR_SECAO"),
    number: String(requiredNumber(row, "NR_VOTAVEL")), name: requiredText(row, "NM_VOTAVEL"), votes: requiredNumber(row, "QT_VOTOS"),
    local_name: (row.NM_LOCAL_VOTACAO || "").slice(0,500), local_address: (row.DS_LOCAL_VOTACAO_ENDERECO || "").slice(0,500) };
}
