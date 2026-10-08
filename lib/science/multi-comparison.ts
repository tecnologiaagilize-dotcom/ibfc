import type {ScienceReport,ScienceRow,Target} from './types';
export type ComparisonColumn={target:Target;report:ScienceReport};
export type ComparisonCell={votes:number|null;valid:number|null;share:number|null};
export type ComparisonLine={key:string;territory:ScienceRow;cells:ComparisonCell[];comparable:boolean};
const cell=(votes:number|null,valid:number|null):ComparisonCell=>({votes,valid,share:votes!==null&&valid!==null&&valid>0?100*votes/valid:null});
export function assertComparableTargets(targets:Target[]){
 if(targets.length<2||targets.length>10)throw Error('Selecione de duas a dez candidaturas ou partidos.');
 const first=targets[0];const keys=new Set<string>();
 for(const t of targets){if(t.kind==='group')throw Error('Grupos sobrepostos não são aceitos nesta comparação.');if(['uf','year','election','turn','office','kind'].some(k=>t[k as keyof Target]!==first[k as keyof Target]))throw Error('Use a mesma UF, eleição, ano, cargo, turno e tipo em todas as seleções.');const key=t.candidate_id||t.number;if(keys.has(key))throw Error('Seleções repetidas.');keys.add(key);}
}
export function comparisonLines(columns:ComparisonColumn[]):ComparisonLine[]{
 assertComparableTargets(columns.map(c=>c.target));
 const rows=new Map<string,ScienceRow>();const indexes=columns.map(c=>{const m=new Map<string,ScienceRow>();for(const row of c.report.rows){if(m.has(row.key))throw Error('Território duplicado no resultado.');m.set(row.key,row);rows.set(row.key,row);}return m;});
 return [...rows].map(([key,territory])=>{const cells=indexes.map(m=>{const row=m.get(key);return cell(row?.new_votes??null,row?.new_valid??null);});const first=cells[0].valid;return {key,territory,cells,comparable:first!==null&&first>0&&cells.every(c=>c.votes!==null&&c.valid===first)&&columns.every(c=>c.report.denominator_basis===columns[0].report.denominator_basis&&c.report.granularity===columns[0].report.granularity)};}).sort((a,b)=>a.territory.name.localeCompare(b.territory.name,'pt-BR'));
}
export function comparisonTotals(columns:ComparisonColumn[]){return columns.map(c=>cell(c.report.totals.new_votes,c.report.totals.new_valid));}
export function comparisonCsv(columns:ComparisonColumn[],lines:ComparisonLine[],parameters:unknown){
 const quote=(value:unknown)=>{let s=value==null?'':String(value);if(typeof value==='string'&&/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const header=['Território','UF','Município','Zona','Local','Seção','Denominadores comparáveis',...columns.flatMap(c=>[c.target.name+' — votos',c.target.name+' — denominador',c.target.name+' — participação %'])];
 const rows:unknown[][]=[header,...lines.map(l=>[l.territory.name,l.territory.uf,l.territory.municipality,l.territory.zone,l.territory.local,l.territory.section,l.comparable,...l.cells.flatMap(c=>[c.votes,c.valid,c.share])]),[],['Parâmetros',JSON.stringify(parameters)],['Limite','Ausência de resultados não é zero. Participações com denominadores distintos não são comparáveis.'],...columns.flatMap(c=>[['Seleção',c.target.name,'Protocolo',c.report.analysis_id,'SHA256',c.report.result_sha256,'Truncado',c.report.truncated,'Linhas disponíveis',c.report.total_rows,'Gerado',c.report.generated_at],...c.report.sources.map(s=>['Fonte',s.year,s.filename,s.source_url,s.finished_at])])];
 return '\ufeff'+rows.map(row=>row.map(quote).join(';')).join('\r\n');
}
