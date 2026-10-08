"use client";
import {DataQuality} from '@/components/science/DataQuality';
import {ReportExport} from '@/components/science/ReportExport';
import {comparisonPrintHtml} from '@/lib/science/print-report';
import {SCIENCE_VERSION,SCIENCE_BUILD} from '@/lib/science/version';
import {ComparisonMaps} from '@/components/science/ComparisonMaps';
import {useEffect,useRef,useState} from 'react';
import type {ScienceCatalogue,ScienceReport,Target} from '@/lib/science/types';
import {candidateKey} from '@/lib/electoral/types';
import {OFFICES,SCOPES,STATES} from '@/lib/science/territory';
import {number,percentage} from '@/lib/electoral/analysis';
import {assertComparableTargets,comparisonLines,comparisonTotals,comparisonCsv,type ComparisonColumn} from '@/lib/science/multi-comparison';
const targetKey=(t:Target)=>candidateKey({...t,kind:t.kind==='party'?'party':'candidate'});
const empty:ScienceCatalogue={candidates:[],parties:[],municipalities:[],zones:[],locations:[],coverage:[]};
export function MultiComparison(){
 const [uf,setUf]=useState('DF'),[year,setYear]=useState(2026),[office,setOffice]=useState(1),[turn,setTurn]=useState(1),[kind,setKind]=useState<'candidate'|'party'>('candidate');
 const [scope,setScope]=useState<keyof typeof SCOPES>('state'),[municipality,setMunicipality]=useState(''),[zone,setZone]=useState(''),[local,setLocal]=useState(''),[section,setSection]=useState('');
 const [catalogue,setCatalogue]=useState(empty),[catalogueLoading,setCatalogueLoading]=useState(false),[ids,setIds]=useState<string[]>([]),[search,setSearch]=useState('');
 const [columns,setColumns]=useState<ComparisonColumn[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[page,setPage]=useState(0);
 const active=useRef<AbortController|null>(null);const queryKey=JSON.stringify([uf,year,office,turn,kind,scope,municipality,zone,local,section,ids]);
 useEffect(()=>{const c=new AbortController();setCatalogue(empty);setIds([]);setCatalogueLoading(true);setError('');fetch('/api/admin/science?uf='+uf,{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setCatalogue(d);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setCatalogueLoading(false);});return()=>c.abort();},[uf]);
 useEffect(()=>{setIds([]);},[year,office,turn,kind]);
 useEffect(()=>{active.current?.abort();setBusy(false);setProgress(0);setColumns([]);setPage(0);},[queryKey]);
 useEffect(()=>()=>active.current?.abort(),[]);
 const options=(kind==='candidate'?catalogue.candidates:catalogue.parties).filter(t=>t.year===year&&t.office===office&&t.turn===turn);
 const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const visible=options.filter(t=>normalized(t.number+' '+t.name+' '+(t.party??'')).includes(normalized(search)));
 const targets=options.filter(t=>ids.includes(candidateKey(t))).map(t=>({...t,kind}));
 const filters=Object.fromEntries(Object.entries({municipality,zone,local,section}).filter(([,v])=>v).map(([k,v])=>[k,Number(v)]));
 const parameters={uf,year,office,turn,kind,scope,filters};
 const lines=columns.length?comparisonLines(columns):[],totals=comparisonTotals(columns),pageRows=lines.slice(page*50,(page+1)*50);
 async function compare(){
  const c=new AbortController();active.current?.abort();active.current=c;setError('');setColumns([]);setProgress(0);setBusy(true);
  try{assertComparableTargets(targets);const result:ComparisonColumn[]=[];
   for(const target of targets){const r=await fetch('/api/admin/science',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'current',new:target,scope,filters}),signal:c.signal});const report=await r.json() as ScienceReport&{error?:string};if(!r.ok)throw Error(target.name+': '+report.error);if(c.signal.aborted)return;result.push({target,report});setProgress(result.length);}
   if(!c.signal.aborted){comparisonLines(result);setColumns(result);setPage(0);}
  }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Falha na comparação.');}finally{if(active.current===c&&!c.signal.aborted)setBusy(false);}
 }
 function download(type:'csv'|'json'){if(!columns.length)return;const content=type==='csv'?comparisonCsv(columns,lines,parameters):JSON.stringify({schema_version:1,generated_at:new Date().toISOString(),parameters,columns,lines},null,2);const url=URL.createObjectURL(new Blob([content],{type:type==='csv'?'text/csv;charset=utf-8':'application/json'}));const a=document.createElement('a');a.href=url;a.download=`IBFC-comparacao-${uf}-${year}.${type}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function changeScope(value:keyof typeof SCOPES){setScope(value);setMunicipality('');setZone('');setLocal('');setSection('');if(value==='country'){setUf('BR');setOffice(1);}else if(uf==='BR')setUf('DF');}
 return <><header className="science-hero"><span className="electoral-eyebrow">COMPARAÇÃO MÚLTIPLA</span><h1>Candidaturas lado a lado</h1><p>Compare de duas a dez candidaturas ou partidos no mesmo ano, eleição, cargo e território. A participação usa o denominador de cada fonte; resultado ausente não significa zero.</p></header>
 <section className="electoral-panel"><div className="science-filters">
 <label>Escopo<select aria-label="Escopo" value={scope} onChange={e=>changeScope(e.target.value as keyof typeof SCOPES)}>{Object.entries(SCOPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>UF<select aria-label="UF" value={uf} disabled={scope==='country'} onChange={e=>{setUf(e.target.value);setMunicipality('');setZone('');setLocal('');setSection('');}}>{uf==='BR'&&<option value="BR">Brasil</option>}{Object.entries(STATES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>Ano<select aria-label="Ano" value={year} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2022</option></select></label>
 <label>Cargo<select aria-label="Cargo" value={office} disabled={uf==='BR'} onChange={e=>setOffice(Number(e.target.value))}>{Object.entries(OFFICES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>Turno<select aria-label="Turno" value={turn} onChange={e=>setTurn(Number(e.target.value))}><option value={1}>1º turno</option><option value={2}>2º turno</option></select></label>
 <label>Tipo<select aria-label="Tipo" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="candidate">Candidaturas</option><option value="party">Partidos · nominal + legenda</option></select></label>
 {!['country','state'].includes(scope)&&<label>Município<select aria-label="Município" value={municipality} onChange={e=>{setMunicipality(e.target.value);setZone('');setLocal('');setSection('');}}><option value="">Selecione</option>{catalogue.municipalities.map(m=><option key={m.municipality} value={m.municipality}>{m.name}</option>)}</select></label>}
 {['zone','location','section'].includes(scope)&&<label>Zona<select aria-label="Zona" value={zone} onChange={e=>{setZone(e.target.value);setLocal('');setSection('');}}><option value="">Selecione</option>{catalogue.zones.filter(z=>String(z.municipality)===municipality).map(z=><option key={z.zone} value={z.zone}>{z.zone}</option>)}</select></label>}
 {['location','section'].includes(scope)&&<label>Local<select aria-label="Local" value={local} onChange={e=>{setLocal(e.target.value);setSection('');}}><option value="">Selecione</option>{catalogue.locations.filter(l=>String(l.municipality)===municipality&&String(l.zone)===zone).map(l=><option key={l.local} value={l.local}>{l.name}</option>)}</select></label>}
 {scope==='section'&&<label>Seção<input type="number" min={1} value={section} onChange={e=>setSection(e.target.value)}/></label>}
 <label>Buscar nome, número ou partido<input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/></label></div>
 <p>{ids.length}/10 selecionados. A busca não remove as seleções existentes.</p>
 <fieldset className="multi-candidates"><legend>Seleções disponíveis</legend>{catalogueLoading?<p>Carregando catálogo…</p>:!visible.length?<p>Nenhuma seleção encontrada neste recorte. Confira a importação ou a busca.</p>:visible.map(t=>{const id=candidateKey(t);return <label className="electoral-checkbox" key={id}><input type="checkbox" checked={ids.includes(id)} disabled={busy||t.results_available===false||(!ids.includes(id)&&ids.length>=10)} onChange={e=>setIds(old=>e.target.checked?[...old,id]:old.filter(x=>x!==id))}/><span>{t.number} · {t.name}{t.party?' · '+t.party:''} · eleição {t.election}{t.results_available===false?' · votos pendentes':''}</span></label>;})}</fieldset>
 <button disabled={busy||catalogueLoading||ids.length<2} onClick={()=>void compare()}>Comparar seleções</button>{busy&&<div role="status"><progress value={progress} max={ids.length}/><span> {progress} de {ids.length} análises concluídas. Cada resultado é arquivado individualmente.</span><button onClick={()=>{active.current?.abort();setBusy(false);setColumns([]);}}>Cancelar</button></div>}{error&&<p role="alert">{error}</p>}</section>
 {columns.length>0&&<ComparisonMaps key={columns.map(c=>c.report.analysis_id).join(':')} columns={columns}/>}
 {columns.length>0&&<section className="electoral-panel"><h2>Resultados do recorte</h2><p>Posição entre as seleções escolhidas não equivale à classificação geral da eleição. As consultas são sequenciais; seus horários e protocolos são preservados, sem garantia de uma transação única.</p>
 <div className="multi-summary">{columns.map((c,i)=><article key={targetKey(c.target)}><h3>{c.target.name}</h3><strong>{number(totals[i].votes)} votos</strong><p>{percentage(totals[i].share)} · denominador: {number(totals[i].valid)}</p><small>{c.report.generated_at} · {c.report.denominator_basis==='bu_nominal_legenda'?'BU nominal + legenda':'Votos válidos'}</small></article>)}</div>
 {columns.some(c=>c.report.truncated)&&<p role="alert">Há resultados limitados: a tabela e os arquivos incluem apenas as linhas retornadas. Os totais vêm do relatório, não da soma desta tabela.</p>}
 {columns.some(c=>c.report.granularity!==columns[0].report.granularity)&&<p role="alert">As fontes têm granularidades diferentes. Territórios ausentes em uma coluna continuam sem dados; não faça comparação direta dessas linhas.</p>}
 {columns.map((c,i)=><DataQuality key={i} report={c.report} label={c.target.name}/>)}
 <ReportExport reportKey={JSON.stringify([parameters,columns.map(c=>[c.report.analysis_id,c.report.generated_at])])} filename={`IBFC-comparacao-${uf}-${year}`} buildDocument={details=>comparisonPrintHtml(columns,lines,totals,parameters,{details,exportedAt:new Date().toLocaleString('pt-BR'),version:SCIENCE_VERSION+' · '+SCIENCE_BUILD})}/>
 <button onClick={()=>download('csv')}>Baixar comparação CSV</button> <button onClick={()=>download('json')}>Baixar comparação JSON</button>
 <div className="multi-table"><table><thead><tr><th>Território</th>{columns.map(c=><th key={targetKey(c.target)}>{c.target.name}</th>)}<th>Denominadores</th></tr></thead><tbody>{pageRows.map(l=><tr key={l.key}><th>{l.territory.name} · {l.territory.uf}</th>{l.cells.map((c,i)=><td key={i}>{number(c.votes)}<br/><small>{percentage(c.share)} · base {number(c.valid)}</small></td>)}<td>{l.comparable?'Compatíveis':'Não comparáveis / sem dados'}</td></tr>)}</tbody></table></div>
 <button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Página anterior</button> <span>{lines.length?`${page*50+1}–${Math.min((page+1)*50,lines.length)} de ${lines.length}`:'Nenhuma linha territorial retornada'}</span> <button disabled={(page+1)*50>=lines.length} onClick={()=>setPage(p=>p+1)}>Próxima página</button>
 <details><summary>Fontes e protocolos</summary>{columns.map(c=><div key={targetKey(c.target)}><h3>{c.target.name}</h3><p>Protocolo: {c.report.analysis_id} · SHA-256: {c.report.result_sha256}</p>{c.report.sources.map((s,i)=><p key={i}>{s.year} · {s.filename} · {s.source_url} · {s.finished_at}</p>)}</div>)}</details></section>}</>;
}
