import type {ScienceReport} from './types';
export function reportQuality(report:ScienceReport,historical=false){
 const keys=new Set<string>();let duplicates=0,missing=0,invalidVotes=0,coordinatesMissing=0,coordinatesInvalid=0;
 const validCount=(v:number|null)=>v===null||(Number.isSafeInteger(v)&&v>=0);
 for(const row of report.rows){if(keys.has(row.key))duplicates++;keys.add(row.key);
 const years=historical?[[row.old_votes,row.old_valid],[row.new_votes,row.new_valid]]:[[row.new_votes,row.new_valid]];
 if(years.some(([votes,base])=>votes==null||base==null))missing++;
 if(years.some(([votes,base])=>!validCount(votes)||!validCount(base)||(votes!==null&&base!==null&&votes>base)))invalidVotes++;
 if(row.latitude==null||row.longitude==null)coordinatesMissing++;
 else if(!Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||Math.abs(row.latitude)>90||Math.abs(row.longitude)>180)coordinatesInvalid++;
 }
 const notices:string[]=[];
 if(report.truncated)notices.push('Carga limitada: este diagnóstico descreve somente as linhas retornadas.');
 if(report.total_rows<report.rows.length)notices.push('Contagem total informada é menor que o conjunto retornado.');
 if(duplicates)notices.push(`${duplicates} chaves territoriais repetidas. Confira a origem antes de agregar.`);
 if(invalidVotes)notices.push(`${invalidVotes} linhas têm contagens inválidas ou votos superiores ao denominador informado.`);
 const values=historical?[[report.totals.old_votes,report.totals.old_valid],[report.totals.new_votes,report.totals.new_valid]]:[[report.totals.new_votes,report.totals.new_valid]];
 if(values.some(([v,b])=>!validCount(v)||!validCount(b)||(v!==null&&b!==null&&v>b)))notices.push('Totais contêm contagens inválidas ou votos superiores ao denominador informado.');
 if(!report.sources.length)notices.push('Relatório sem fontes registradas.');
 if(report.sources.some(s=>{try{const u=new URL(s.source_url);return !['https:','http:'].includes(u.protocol)||!s.filename||!Number.isFinite(Date.parse(s.finished_at));}catch{return true;}}))notices.push('Há fontes com URL, nome de arquivo ou data de importação inválidos.');
 if(!report.analysis_id)notices.push('Protocolo de arquivamento não informado.');
 if(!/^[a-f0-9]{64}$/i.test(report.result_sha256??''))notices.push('SHA-256 ausente ou fora do formato esperado; não foi verificado criptograficamente.');
 if(!Number.isFinite(Date.parse(report.generated_at)))notices.push('Horário de geração ausente ou inválido.');
 if(missing)notices.push('Resultados ou denominadores ausentes não equivalem a zero voto.');
 return {schema_version:1,method:'ibfc-quality-1.0',historical,rows:report.rows.length,total_rows:report.total_rows,truncated:report.truncated,duplicates,missing_results:missing,invalid_vote_rows:invalidVotes,coordinates_missing:coordinatesMissing,coordinates_invalid:coordinatesInvalid,sources:report.sources.length,notices};
}
