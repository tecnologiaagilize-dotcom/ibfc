"use client";
import { useState } from "react";
import { normalizeCsvRow, readCsv } from "@/lib/electoral/csv";
async function send(body:unknown) {
  const response=await fetch("/api/admin/electoral/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error || "Falha na importação.");return data;
}
export function ElectoralImport({onDone}:{onDone:()=>void}) {
  const [year,setYear]=useState(2026),[kind,setKind]=useState<"votes"|"locations">("locations");
  const [encoding,setEncoding]=useState("windows-1252"),[source,setSource]=useState("https://dadosabertos.tse.jus.br/dataset/eleitorado-2026");
  const [file,setFile]=useState<File | null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function run() {
    if(!file || busy)return;
    setBusy(true);setMessage("Abrindo o arquivo…");let id:string | null=null;let seen=0,saved=0;
    try {
      const start=await send({action:"start",kind,year,filename:file.name,source_url:source});id=start.id;
      let rows:Record<string,unknown>[]=[];
      const flush=async()=>{if(!rows.length)return;await send({action:"batch",id,rows});saved+=rows.length;rows=[];setMessage(`${seen.toLocaleString("pt-BR")} linhas lidas · ${saved.toLocaleString("pt-BR")} registros do DF e Entorno enviados. Mantenha esta página aberta.`);};
      for await(const row of readCsv(file,encoding)) {
        seen++;if(!("SG_UF" in row))throw new Error("CSV sem a coluna SG_UF. Selecione a base oficial correta ou confira a codificação.");const normalized=normalizeCsvRow(row,kind,year);if(normalized)rows.push(normalized);
        if(rows.length===500)await flush();
        if(seen%10000===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      await flush();setMessage("Finalizando os totais e publicando este lote…");await send({action:"finish",id});
      setMessage(`Importação concluída: ${saved.toLocaleString("pt-BR")} registros do DF e Entorno. Confira a cobertura antes de interpretar o relatório.`);onDone();
    } catch(e) {
      const text=e instanceof Error?e.message:"Falha na importação.";
      if(id)try{await send({action:"finish",id,error:text});}catch{/* An interrupted snapshot stays hidden. */}
      setMessage(`${text} O lote incompleto não será usado no mapa. Extraia o ZIP do TSE e selecione o CSV correto.`);
    } finally {setBusy(false);}
  }
  return <details className="electoral-import no-print"><summary>Importar bases oficiais do TSE</summary>
    <p>Importe os CSVs completos de votação por seção e de locais de votação para cada ano. Arquivos nacionais são filtrados para Brasília e municípios da RIDE-DF em GO e MG. Para Presidente, use também o arquivo BR (filtrado pelas UFs e municípios cobertos). Extraia os ZIPs antes de selecionar.</p>
    <fieldset disabled={busy} className="electoral-controls">
      <label>Ano<select value={year} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2022</option></select></label>
      <label>Base<select value={kind} onChange={e=>setKind(e.target.value as "votes"|"locations")}><option value="locations">Locais de votação e coordenadas</option><option value="votes">Votação por seção — todos os candidatos</option></select></label>
      <label>Codificação<select value={encoding} onChange={e=>setEncoding(e.target.value)}><option value="windows-1252">TSE / Windows-1252</option><option value="utf-8">UTF-8</option></select></label>
      <label className="electoral-wide">Endereço da fonte oficial<input type="url" value={source} onChange={e=>setSource(e.target.value)}/></label>
      <label className="electoral-wide">CSV oficial<input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
      <button type="button" onClick={run} disabled={!file}>Importar arquivo</button>
    </fieldset>
    {message&&<p role="status" className="electoral-notice">{message}</p>}
    <p><a href="https://dadosabertos.tse.jus.br/dataset/resultados-2022" target="_blank" rel="noreferrer">Resultados 2022</a> · <a href="https://dadosabertos.tse.jus.br/dataset/eleitorado-2026" target="_blank" rel="noreferrer">Locais 2026</a> · <a href="https://dadosabertos.tse.jus.br/" target="_blank" rel="noreferrer">Catálogo TSE: consultar bases 2026</a></p>
  </details>;
}
