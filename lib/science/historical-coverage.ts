import type {ScienceReport,ScienceRow,Target} from './types';
export const HISTORICAL_METHOD='ibfc-historical-coverage-1.0';
export type HistoricalStatus='both_zone_totals'|'same_keys_unverified'|'local_changed'|'partial_keys'|'no_common_keys'|'old_only'|'new_only'|'unavailable';
export const HISTORICAL_STATUS_LABELS:Record<HistoricalStatus,string>={both_zone_totals:'Totais por zona nos dois anos',same_keys_unverified:'Chaves comuns · continuidade não verificada',local_changed:'Mudança de local registrada',partial_keys:'Conjunto de chaves parcialmente comum',no_common_keys:'Sem chaves de seção comuns',old_only:'Dados somente em 2022',new_only:'Dados somente em 2026',unavailable:'Resultado ausente nos dois anos'};
export type HistoricalLine={row:ScienceRow;status:HistoricalStatus;old_available:boolean;new_available:boolean;delta_votes:number|null;relative_change:number|null;old_share:number|null;new_share:number|null;delta_points:number|null};
const present=(votes:number|null,valid:number|null)=>votes!=null&&valid!=null;
const share=(votes:number|null,valid:number|null)=>present(votes,valid)&&valid!>0?100*votes!/valid!:null;
export function historicalLines(report:ScienceReport):HistoricalLine[]{
 return report.rows.map(row=>{const old=present(row.old_votes,row.old_valid),newer=present(row.new_votes,row.new_valid),both=old&&newer;let status:HistoricalStatus;
 if(!old&&!newer)status='unavailable';else if(!old)status='new_only';else if(!newer)status='old_only';else if(report.granularity==='zone')status='both_zone_totals';else if(row.moved_sections>0)status='local_changed';else if(!(row.common_sections>0))status='no_common_keys';else if(row.common_sections<row.old_sections||row.common_sections<row.new_sections)status='partial_keys';else status='same_keys_unverified';
 const oldShare=share(row.old_votes,row.old_valid),newShare=share(row.new_votes,row.new_valid);
 return {row,status,old_available:old,new_available:newer,delta_votes:both?row.new_votes!-row.old_votes!:null,relative_change:both&&row.old_votes!>0?100*(row.new_votes!-row.old_votes!)/row.old_votes!:null,old_share:oldShare,new_share:newShare,delta_points:oldShare!==null&&newShare!==null?newShare-oldShare:null};
 });
}
export function historicalCoverage(report:ScienceReport){
 const lines=historicalLines(report),counts=Object.fromEntries(Object.keys(HISTORICAL_STATUS_LABELS).map(s=>[s,lines.filter(l=>l.status===s).length])) as Record<HistoricalStatus,number>;
 const available=lines.filter(l=>l.old_available||l.new_available).length,both=lines.filter(l=>l.old_available&&l.new_available).length;
 const zone=report.granularity==='zone';const t=report.totals,min=Math.min(t.old_sections,t.new_sections);
 return {lines,counts,visible_rows:lines.length,total_rows:report.total_rows,truncated:report.truncated,both_years:both,available_rows:available,both_years_percent:available?100*both/available:null,old_sections:zone?null:t.old_sections,new_sections:zone?null:t.new_sections,common_sections:zone?null:t.common_sections,moved_sections:zone?null:t.moved_sections,common_over_smaller_percent:!zone&&min>0&&t.common_sections<=min?100*t.common_sections/min:null};
}
export function historicalSnapshot(report:ScienceReport,old:Target,newer:Target,scope:string,filters:Record<string,number|boolean>){
 return {schema_version:1,method_version:HISTORICAL_METHOD,generated_at:report.generated_at,parameters:{old,new:newer,scope,filters},analysis_id:report.analysis_id,result_sha256:report.result_sha256,sources:report.sources,coverage:historicalCoverage(report),notice:'Diagnóstico de cobertura, não certificação de continuidade territorial. Dados ausentes não são zero. Totais por zona não comprovam correspondência de seções. Não identifica votos individuais.'};
}
export function historicalCsv(snapshot:ReturnType<typeof historicalSnapshot>){
 const q=(v:unknown)=>{let s=v==null?'':String(v);if(typeof v==='string'&&/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const lines:unknown[][]=[['Método',snapshot.method_version],['Parâmetros',JSON.stringify(snapshot.parameters)],['Protocolo',snapshot.analysis_id],['SHA256 do relatório original',snapshot.result_sha256],['Gerado',snapshot.generated_at],['Linhas retornadas',snapshot.coverage.visible_rows,'Total disponível',snapshot.coverage.total_rows,'Limitado',snapshot.coverage.truncated],['Aviso',snapshot.notice],[],['Território','UF','Município','Zona','Local referência','Seção referência','Classificação','Votos 2022','Votos 2026','Denominador 2022','Denominador 2026','Diferença de votos','Variação relativa %','Participação 2022 %','Participação 2026 %','Variação pp','Seções 2022','Seções 2026','Chaves comuns','Mudanças de local'],...snapshot.coverage.lines.map(l=>[l.row.name,l.row.uf,l.row.municipality,l.row.zone,l.row.local,l.row.section,HISTORICAL_STATUS_LABELS[l.status],l.row.old_votes,l.row.new_votes,l.row.old_valid,l.row.new_valid,l.delta_votes,l.relative_change,l.old_share,l.new_share,l.delta_points,snapshot.coverage.common_sections===null?null:l.row.old_sections,snapshot.coverage.common_sections===null?null:l.row.new_sections,snapshot.coverage.common_sections===null?null:l.row.common_sections,snapshot.coverage.common_sections===null?null:l.row.moved_sections]),[],...snapshot.sources.map(s=>['Fonte',s.year,s.filename,s.source_url,s.finished_at])];
 return '\ufeff'+lines.map(line=>line.map(q).join(';')).join('\r\n');
}
export function assertHistoricalRecorte(old:Target,newer:Target){
 if(old.year!==2022||newer.year!==2026||old.uf!==newer.uf||old.office!==newer.office||old.turn!==newer.turn||(old.kind??'candidate')!==(newer.kind??'candidate'))throw Error('O diagnóstico histórico exige 2022/2026, mesma UF, cargo, turno e tipo.');
}
