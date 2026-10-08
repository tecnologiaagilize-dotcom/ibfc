"use client";
import {useMemo,useState} from 'react';
import type {ComparisonColumn} from '@/lib/science/multi-comparison';
import {pairMapData,geographicPositions,type ComparisonMetric} from '@/lib/science/comparison-maps';
import {LeafletElectionMap} from '@/components/electoral/LeafletElectionMap';
export function ComparisonMaps({columns}:{columns:ComparisonColumn[]}){
 const [left,setLeft]=useState(0),[right,setRight]=useState(1),[metric,setMetric]=useState<ComparisonMetric>('votes'),[fit,setFit]=useState(0),[selected,setSelected]=useState('');
 const data=useMemo(()=>pairMapData(columns,left,right,metric),[columns,left,right,metric]);
 const chosen=data.selected.map(c=>c.report.rows.find(r=>r.key===selected));
 return <section className="electoral-panel"><h2>Mapas lado a lado</h2><p>Mesmo recorte e escala de símbolos compartilhada. Cada mapa mantém as coordenadas de sua fonte. O enquadramento inicial e o botão de ajuste usam a união dos pontos; navegação manual é independente.</p>
 <div className="science-filters"><label>Mapa azul<select aria-label="Mapa azul" value={left} onChange={e=>{const n=Number(e.target.value);if(n===right)setRight(left);setLeft(n);setSelected('');}}>{columns.map((c,i)=><option value={i} key={i}>{c.target.name}</option>)}</select></label><label>Mapa vermelho<select aria-label="Mapa vermelho" value={right} onChange={e=>{const n=Number(e.target.value);if(n===left)setLeft(right);setRight(n);setSelected('');}}>{columns.map((c,i)=><option value={i} key={i}>{c.target.name}</option>)}</select></label><label>Tamanho dos símbolos<select aria-label="Tamanho dos símbolos" value={metric} onChange={e=>setMetric(e.target.value as ComparisonMetric)}><option value="votes">Votos absolutos</option><option value="share">Participação no denominador</option></select></label></div>
 <button onClick={()=>setFit(v=>v+1)}>Enquadrar os dois mapas</button>
 <p>Escala comum máxima: {data.max.toLocaleString('pt-BR',{maximumFractionDigits:2})}{metric==='share'?'%':' votos'}. Cinza: sem resultado calculável. Zero confirmado usa símbolo mínimo. Círculos não representam limites oficiais.</p>
 {metric==='share'&&<p>Compare percentuais somente com fontes, granularidades e denominadores compatíveis; confira a indicação na tabela da comparação.</p>}
 <div className="comparison-map-grid">{data.selected.map((c,i)=><article key={i}><h3>{c.target.name}</h3><p>{geographicPositions([c]).length} coordenadas distintas · {c.report.rows.length} registros retornados{c.report.truncated?' · carga limitada':''}. Pontos sobrepostos podem reunir várias linhas.</p><LeafletElectionMap places={data.maps[i]} onSelect={setSelected} fitPositions={data.positions} viewportKey={`${left}:${right}:${fit}`}/><small>Protocolo: {c.report.analysis_id} · gerado em {c.report.generated_at}</small></article>)}</div>
 {selected&&<div role="status"><h3>Território selecionado</h3>{chosen.map((row,i)=><p key={i}>{data.selected[i].target.name}: {row?`${row.name} · ${row.new_votes===null?'Sem dados':row.new_votes.toLocaleString('pt-BR')+' votos'}`:'Território ausente nesta seleção'}</p>)}</div>}
 <p>Registros sem coordenadas válidas continuam na tabela e nas exportações da comparação. A imagem do mapa não substitui a fonte oficial. Os dados pessoais de apoiadores não são usados aqui.</p></section>;
}
