"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, MapPinned, Printer, RefreshCw } from "lucide-react";
import { csvCell, groupLocations, number, percentage, summarize } from "@/lib/electoral/analysis";
import { candidateKey, type Catalogue, type Comparison, type ElectionCandidate, type LocalComparison } from "@/lib/electoral/types";
import { REGION_NAMES } from "@/lib/electoral/region";
import { GoogleElectionMap } from "./GoogleElectionMap";
import { ElectoralImport } from "./ElectoralImport";
import "./electoral.css";

type Report = {data:Comparison;old:ElectionCandidate | null;current:ElectionCandidate};
const EMPTY:Catalogue={candidates:[],imports:[],locations:[]};
const signed=(v:number | null)=>v===null?"Não calculável":`${v>0?"+":""}${number(v)}`;
function download(name:string,text:string){const url=URL.createObjectURL(new Blob(["\uFEFF",text],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function ElectoralDashboard() {
  const [catalogue,setCatalogue]=useState<Catalogue>(EMPTY),[error,setError]=useState("");
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const [uf,setUf]=useState("DF"),[municipality,setMunicipality]=useState("");
  const [office,setOffice]=useState("6"),[turn,setTurn]=useState("1");
  const [newId,setNewId]=useState(""),[oldId,setOldId]=useState("");
  const [report,setReport]=useState<Report | null>(null),[zone,setZone]=useState(""),[search,setSearch]=useState("");
  const [commonOnly,setCommonOnly]=useState(false),[selectedKey,setSelectedKey]=useState("");
  const [page,setPage]=useState(0);
  const refresh=useCallback(async()=>{
    setLoading(true);setError("");
    try {const res=await fetch("/api/admin/electoral",{cache:"no-store"});const d=await res.json();if(!res.ok)throw new Error(d.error);setCatalogue(d);setReport(null);}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar as bases.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const choices=(year:number)=>catalogue.candidates.filter(c=>c.uf===uf && c.year===year && c.office===Number(office) && c.turn===Number(turn));
  const selectedNew=catalogue.candidates.find(c=>candidateKey(c)===newId);
  const selectedOld=catalogue.candidates.find(c=>candidateKey(c)===oldId);
  async function compare(){
    if(!selectedNew)return;setBusy(true);setError("");setSelectedKey("");
    try {const res=await fetch("/api/admin/electoral",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({old:selectedOld??null,new:selectedNew})});
      const d=await res.json();if(!res.ok)throw new Error(d.error);setReport({data:d,old:selectedOld??null,current:selectedNew});setPage(0);}
    catch(e){setError(e instanceof Error?e.message:"Falha ao consultar os resultados.");}finally{setBusy(false);}
  }
  const allRows=report?.data.rows ?? [];
  const places=useMemo(()=>{
    const regionalRows=allRows.filter(s=>s.uf===uf);
    const r=commonOnly?regionalRows.filter(s=>s.old_valid!==null&&s.new_valid!==null):regionalRows;
    const grouped=groupLocations(r),keys=new Set(grouped.map(g=>g.key));
    // Every imported 2026 location remains visible, even without vote data.
    if(!commonOnly)for(const l of catalogue.locations.filter(l=>l.uf===uf)){const key=`${l.uf}:${l.municipality}:${l.zone}:${l.local}`;
      if(!keys.has(key))grouped.push({key,uf:l.uf,municipality:l.municipality,municipality_name:l.municipality_name,zone:l.zone,local:l.local,name:l.name,address:l.address,latitude:l.latitude,longitude:l.longitude,coordinate_year:l.latitude===null?null:2026,sections:[]});}
    const query=search.trim().toLocaleLowerCase("pt-BR");
    return grouped.filter(g=>(!municipality||g.municipality_name===municipality)&&(!zone||String(g.zone)===zone)&&(!query||`${g.name} ${g.address} ${g.local??""}`.toLocaleLowerCase("pt-BR").includes(query))).sort((a,b)=>a.zone-b.zone||(a.local??0)-(b.local??0));
  },[allRows,catalogue.locations,commonOnly,zone,search,uf,municipality]);
  const filteredRows=useMemo(()=>places.flatMap(p=>p.sections),[places]);
  const stats=summarize(filteredRows);
  const commonStats=summarize(filteredRows,true);
  const zones=useMemo(()=>[...new Set([...catalogue.locations.filter(l=>l.uf===uf&&(!municipality||l.municipality_name===municipality)).map(l=>l.zone),...allRows.filter(r=>r.uf===uf&&(!municipality||r.municipality_name===municipality)).map(r=>r.zone)])].sort((a,b)=>a-b),[catalogue.locations,allRows,uf,municipality]);
  const selectedPlace=places.find(p=>p.key===selectedKey);
  const onSelect=useCallback((key:string)=>{setSelectedKey(key);},[]);
  const reset=()=>{setReport(null);setSelectedKey("");setPage(0);setCommonOnly(false);};
  const renderRows=(rows:LocalComparison[])=>rows.map(p=>{const s=summarize(p.sections);return <tr key={p.key}>
    <td><button className="electoral-table-link" onClick={()=>onSelect(p.key)}>{p.name}</button><small>{p.municipality_name}/{p.uf} · Zona {p.zone} · Local {p.local??"não vinculado"} · {p.sections.length} seções</small></td>
    <td>{s.oldAvailable?number(s.oldVotes):"Sem dados"}</td><td>{s.newAvailable?number(s.newVotes):"Sem dados"}</td>
    <td>{signed(s.delta)}</td><td>{percentage(s.percent)}</td><td>{s.points===null?"—":`${signed(s.points)} p.p.`}</td>
  </tr>;});
  function exportCsv(){
    if(!report)return;
    const metadata=[
      ["IBFC — Relatório eleitoral agregado do DF e Entorno"],
      ["2022",report.old?.name??"Não selecionado",report.old?.number??"",report.old?.office_name??""],
      ["2026",report.current.name,report.current.number,report.current.office_name],
      ["UF",uf,"Município",municipality||"Todos"],
      ["Turno",report.current.turn,"Filtro zona",zone||"Todas","Local",search||"Todos"],
      ["Gerado em",report.data.generated_at,"Somente chaves coincidentes",commonOnly?"Sim":"Não"],
      ["Nota","Evolução de votos agregados; não identifica eleitores, fidelidade ou transferência de votos. Continuidade das seções não verificada."],
      ["Fonte","Arquivos oficiais informados pelo administrador; cobertura limitada aos arquivos importados."],
      ["UF","Município","Municipio TSE","Zona","Secao","Local 2022","Local 2026","Votos 2022","Votos 2026","Diferenca votos","Variacao %","Participacao 2022 %","Participacao 2026 %","Diferenca p.p.","Local mudou","Coordenada ano"]
    ];
    for(const r of filteredRows){const s=summarize([r]);metadata.push([r.uf,r.municipality_name,r.municipality,r.zone,r.section,r.old_local??"",r.new_local??"",r.old_votes??"Sem dados",r.new_votes??"Sem dados",s.delta??"",s.percent??"",s.oldShare??"",s.newShare??"",s.points??"",s.movedSections?"Sim":"Não verificado",r.coordinate_year??""] as (string|number)[]);}
    for(const source of report.data.sources??[])metadata.push(["Fonte",source.year,source.filename,source.source_url,source.finished_at]);
    download("IBFC_DF_ENTORNO_votacao_2022_2026.csv",metadata.map(row=>row.map(csvCell).join(";")).join("\r\n"));
  }
  return <div className="electoral-dashboard">
    <div className="electoral-heading"><div><span className="electoral-eyebrow">OBSERVATÓRIO IBFC · DF E ENTORNO</span><h1>Mapa eleitoral</h1><p>Locais de votação, seções e evolução dos resultados públicos.</p></div>
      <button className="no-print" onClick={()=>void refresh()} disabled={loading||busy}><RefreshCw size={17}/> Atualizar bases carregadas</button></div>
    <div className="electoral-controls electoral-panel no-print"><label>UF<select value={uf} disabled={busy} onChange={e=>{setUf(e.target.value);setMunicipality("");setZone("");setSearch("");setNewId("");setOldId("");if(office==="8"||office==="7")setOffice(e.target.value==="DF"?"8":"7");reset();}}><option value="DF">Distrito Federal</option><option value="GO">Goiás — Entorno</option><option value="MG">Minas Gerais — RIDE</option></select></label><label>Cargo<select value={office} disabled={busy} onChange={e=>{setOffice(e.target.value);setNewId("");setOldId("");reset();}}>
      <option value="1">Presidente</option><option value="3">Governador</option><option value="5">Senador</option><option value="6">Deputado federal</option>{uf==="DF"?<option value="8">Deputado distrital</option>:<option value="7">Deputado estadual</option>}</select></label>
      <label>Turno<select value={turn} disabled={busy} onChange={e=>{setTurn(e.target.value);setNewId("");setOldId("");reset();}}><option value="1">1º turno</option><option value="2">2º turno</option></select></label>
      <label className="electoral-candidate">Candidatura 2026<select value={newId} disabled={busy} onChange={e=>{setNewId(e.target.value);reset();}}><option value="">Selecione nos resultados importados</option>{choices(2026).map(c=><option key={candidateKey(c)} value={candidateKey(c)}>{c.name} · {c.number} · eleição {c.election}</option>)}</select></label>
      <label className="electoral-candidate">Candidatura 2022 para comparação<select value={oldId} disabled={busy} onChange={e=>{setOldId(e.target.value);reset();}}><option value="">Consultar apenas 2026</option>{choices(2022).map(c=><option key={candidateKey(c)} value={candidateKey(c)}>{c.name} · {c.number} · eleição {c.election}</option>)}</select></label>
      <button className="electoral-primary" onClick={compare} disabled={!selectedNew||busy}>{busy?"Consultando…":"Consultar votação"}</button>
    </div>
    {error&&<p className="electoral-notice electoral-error" role="alert">{error}</p>}
    {!loading&&!catalogue.candidates.length&&<div className="electoral-notice">Ainda não há resultados importados. Use “Importar bases oficiais do TSE” abaixo. O mapa pode exibir os locais antes da importação dos votos.</div>}
    {report&&<div className="electoral-report-title"><h2>{report.current.name} · {report.current.number}</h2><p>{report.current.office_name} · {report.current.turn}º turno · {uf}<br/>{report.old?`Comparação com ${report.old.name} · ${report.old.number} em 2022.`:"Consulta de 2026; candidatura de 2022 não selecionada."}</p>
      {report.old&&report.old.name!==report.current.name&&<p className="electoral-notice">As candidaturas têm nomes diferentes. Confira que pertencem à mesma pessoa antes de interpretar como evolução individual.</p>}
      <p className="electoral-caption">Recorte: {municipality||"Todos os municípios da cobertura"} · {zone?`Zona ${zone}`:"todas as zonas importadas"} · {search?`local: ${search}`:"todos os locais"} · {commonOnly?"somente chaves coincidentes":"todas as chaves disponíveis"}.</p>
      <small>Relatório gerado em {new Date(report.data.generated_at).toLocaleString("pt-BR")} · resultados restritos às bases importadas.</small>
      {(report.data.sources??[]).map(s=><p className="electoral-caption" key={`${s.year}:${s.filename}`}>Fonte {s.year}: {s.filename} · importado em {new Date(s.finished_at).toLocaleString("pt-BR")}.</p>)}</div>}
    <div className="electoral-controls electoral-panel no-print"><label>Município<select value={municipality} onChange={e=>{setMunicipality(e.target.value);setZone("");setPage(0);setSelectedKey("");}}><option value="">Todos os municípios da cobertura</option>{REGION_NAMES[uf].map(name=><option key={name} value={name}>{name}</option>)}</select></label><label>Zona<select value={zone} onChange={e=>{setZone(e.target.value);setPage(0);setSelectedKey("");}}><option value="">Todas as zonas importadas</option>{zones.map(z=><option key={z} value={z}>Zona {z}</option>)}</select></label>
      <label className="electoral-candidate">Pesquisar local<input placeholder="Nome, endereço ou código do local" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);setSelectedKey("");}}/></label>
      <label className="electoral-checkbox"><input type="checkbox" checked={commonOnly} disabled={!report?.old} onChange={e=>{setCommonOnly(e.target.checked);setPage(0);}}/> Somente chaves de seção coincidentes</label>
      <button disabled={!report} onClick={exportCsv}><Download size={17}/> CSV por seção</button><button disabled={!report} onClick={()=>window.print()}><Printer size={17}/> Imprimir / salvar PDF</button>
    </div>
    <div className="electoral-metrics">{[
      ["Votos em 2022",stats.oldAvailable?number(stats.oldVotes):"Sem dados"],
      ["Votos em 2026",stats.newAvailable?number(stats.newVotes):"Sem dados"],
      ["Diferença de votos",signed(stats.delta)],
      ["Variação relativa",percentage(stats.percent)],
      ["Participação em 2022",percentage(stats.oldShare)],
      ["Participação em 2026",percentage(stats.newShare)]
    ].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <p className="electoral-caption">{stats.oldSections} seções em 2022 · {stats.newSections} em 2026 · {stats.commonSections} chaves coincidentes · {stats.movedSections} com código de local diferente. Percentuais usam votos de candidaturas e legenda importados, excluindo códigos 95 a 99; não substituem a totalização oficial.</p>
    {report?.old&&<p className="electoral-notice">Nas chaves coincidentes: {number(commonStats.oldVotes)} votos em 2022 e {number(commonStats.newVotes)} em 2026 ({percentage(commonStats.percent)}). Uma chave coincidente não confirma que a composição da seção permaneceu igual.</p>}
    <section className="electoral-panel no-print"><div className="electoral-map-heading"><h2><MapPinned size={20}/> Locais de votação do DF e Entorno</h2><span>{places.length} locais · {places.filter(p=>p.latitude!==null&&p.longitude!==null).length} no mapa · {places.filter(p=>p.latitude===null||p.longitude===null).length} sem coordenadas</span></div>
      <p className="electoral-caption">Planaltina do DF é uma região administrativa de Brasília. Jardim ABC pertence a Cidade Ocidental/GO. Use município e pesquisa por nome/endereço para localizar escolas; uma busca textual não delimita toda a região administrativa ou bairro.</p>
      <GoogleElectionMap places={places} onSelect={onSelect}/>
      <p className="electoral-caption">Verde: aumento de votos · terracota: redução · azul: mesma quantidade · cinza: sem comparação. Coordenadas preservadas por ano. Seções de 2022 sem correspondente em 2026 aparecem em seus locais históricos.</p>
    </section>
    {selectedPlace&&<section className="electoral-panel no-print"><h2>{selectedPlace.name}</h2><p>{selectedPlace.municipality_name}/{selectedPlace.uf} · {selectedPlace.address} · Zona {selectedPlace.zone} · coordenadas de {selectedPlace.coordinate_year??"ano não disponível"}</p>
      <div className="electoral-table-scroll"><table><thead><tr><th>Seção</th><th>Votos 2022</th><th>Votos 2026</th><th>Diferença</th><th>Continuidade</th></tr></thead><tbody>{selectedPlace.sections.map(r=><tr key={`${r.municipality}:${r.zone}:${r.section}`}><td>{r.section}</td><td>{number(r.old_votes)}</td><td>{number(r.new_votes)}</td><td>{signed(summarize([r]).delta)}</td><td>{r.old_local!==null&&r.new_local!==null&&r.old_local!==r.new_local?"Mudou de local":"Não verificada"}</td></tr>)}</tbody></table></div>
      {!selectedPlace.sections.length&&<p>Nenhum resultado importado para este local no recorte escolhido.</p>}
    </section>}
    <section className="electoral-panel"><h2>Relatório por local de votação</h2><p className="electoral-caption">Nos locais atuais, os votos históricos seguem as chaves de seção correspondentes. Seções que mudaram de local exigem revisão antes de uma conclusão territorial.</p>
      <div className="electoral-table-scroll no-print"><table><thead><tr><th>Local</th><th>2022</th><th>2026</th><th>Diferença</th><th>Variação</th><th>Participação</th></tr></thead><tbody>{renderRows(places.slice(page*30,(page+1)*30))}</tbody></table></div>
      <div className="electoral-pagination no-print"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(places.length/30))}</span><button disabled={(page+1)*30>=places.length} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
      <table className="print-only"><thead><tr><th>Local</th><th>2022</th><th>2026</th><th>Diferença</th><th>Variação</th><th>Participação</th></tr></thead><tbody>{renderRows(places)}</tbody></table>
    </section>
    <p className="electoral-notice">Este painel descreve resultados públicos agregados. Crescimento da votação não comprova aumento de eleitores fiéis nem identifica quem votou em quem. Locais sem coordenadas continuam na tabela; falta de dados não significa zero voto.</p>
    <ElectoralImport onDone={()=>void refresh()}/>
    <details className="electoral-import no-print"><summary>Histórico de importações e cobertura</summary>{catalogue.imports.map(i=><p key={i.id}><b>{i.year} · {i.kind==="votes"?"Votação":"Locais"}</b> · {i.filename} · {i.status==="completed"?"Concluído":i.status==="running"?"Em andamento / interrompido":"Falhou"} · {number(i.rows_saved)} registros{ i.error?` · ${i.error}`:""}</p>)}<p>“Concluído” significa que o arquivo foi processado, não que todas as seções do DF e Entorno estão cobertas. Arquivos parciais devem ser identificados e substituídos por arquivos oficiais completos.</p></details>
  </div>;
}
