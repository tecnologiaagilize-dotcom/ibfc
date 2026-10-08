import type {ScienceReport,BuSection} from './types';

export const BU_RECONCILIATION_METHOD='ibfc-bu-reconciliation-1.0';
export const RECONCILIATION_LABELS={
 equal:'Coincidente no conjunto comparável',different:'Divergência numérica',partial:'Cobertura incompleta',
 missing_bu:'Sem boletins carregados',missing_result:'Sem resultado da seleção B',
 incompatible:'Base ou recorte incompatível',invalid:'Contagens ou chaves inválidas',
 duplicate:'Chave repetida',outside:'Sem linha correspondente na tabela carregada'
};
export type ReconciliationStatus=keyof typeof RECONCILIATION_LABELS;
export type ReconciliationContext={scope:string;filters:Record<string,number|boolean>;selection:string};
type Group={key:string;sections:number;votes:number;valid:number;invalid:boolean;duplicate:boolean};
export type ReconciliationLine={key:string;name:string;status:ReconciliationStatus;analysis_votes:number|null;analysis_valid:number|null;expected_sections:number|null;loaded_sections:number;bu_votes:number|null;bu_valid:number|null;delta_votes:number|null;delta_valid:number|null};
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const positive=(value:unknown)=>count(value)&&value>0;
function groupKey(row:BuSection,scope:string){
 if(!/^[A-Z]{2}$/.test(row.uf)||!positive(row.municipality)||!positive(row.zone)||!positive(row.section)||!count(row.local))return null;
 switch(scope){
  case 'country':return row.uf;
  case 'state':return `${row.uf}:${row.municipality}`;
  case 'municipality':return `${row.uf}:${row.municipality}:${row.zone}`;
  case 'zone':return `${row.uf}:${row.municipality}:${row.zone}:${row.local}`;
  case 'location':case 'section':return `${row.uf}:${row.municipality}:${row.zone}:${row.local}:${row.section}`;
  default:return null;
 }
}
export function reconcileBu(report:ScienceReport,context:ReconciliationContext){
 const bu=report.bu,groups=new Map<string,Group>(),natural=new Map<string,Set<string>>();
 let invalidKeys=0;const notices:string[]=[];
 for(const row of bu?.rows??[]){
  const key=groupKey(row,context.scope);if(key===null){invalidKeys++;continue;}
  const group=groups.get(key)??{key,sections:0,votes:0,valid:0,invalid:false,duplicate:false};
  group.sections++;const valid=count(row.votes)&&count(row.nominal_legenda)&&row.votes<=row.nominal_legenda;
  if(!valid)group.invalid=true;else{group.votes+=row.votes;group.valid+=row.nominal_legenda;if(!count(group.votes)||!count(group.valid))group.invalid=true;}
  groups.set(key,group);
  const identity=`${row.uf}:${row.municipality}:${row.zone}:${row.section}`;
  const keys=natural.get(identity)??new Set<string>();keys.add(key);natural.set(identity,keys);
 }
 const frequencies=new Map<string,number>();for(const row of bu?.rows??[]){const id=`${row.uf}:${row.municipality}:${row.zone}:${row.section}`;frequencies.set(id,(frequencies.get(id)??0)+1);}
 for(const [id,keys] of natural)if((frequencies.get(id)??0)>1)for(const key of keys)groups.get(key)!.duplicate=true;
 const rowKeys=new Map<string,number>();for(const row of report.rows)rowKeys.set(row.key,(rowKeys.get(row.key)??0)+1);
 const compatible=report.denominator_basis==='bu_nominal_legenda'&&report.granularity!=='zone'&&!context.filters.common_only;
 if(!bu?.rows.length)notices.push('Sem boletins retornados: importar resultados por zona não disponibiliza automaticamente boletins por seção.');
 if(context.filters.common_only)notices.push('A análise foi restrita a chaves comuns; os boletins recebidos não aplicam esse filtro. Diferenças não calculadas.');
 if(report.denominator_basis!=='bu_nominal_legenda'||report.granularity==='zone')notices.push('Base por zona ou denominador não identificado como BU nominal + legenda. Diferenças não calculadas.');
 if(report.truncated||bu?.truncated)notices.push('Há carga limitada. Algumas linhas podem ser comparadas por contagem, mas a reconciliação do total do recorte será suspensa.');
 if(invalidKeys)notices.push(`${invalidKeys} boletins sem chave territorial válida foram excluídos da agregação e impedem a comparação do total.`);
 const lines:ReconciliationLine[]=[];
 for(const row of report.rows){
  const group=groups.get(row.key);let status:ReconciliationStatus;
  if((rowKeys.get(row.key)??0)>1||group?.duplicate)status='duplicate';
  else if(!bu?.rows.length)status='missing_bu';
  else if(!compatible)status='incompatible';
  else if(row.new_votes==null||row.new_valid==null)status='missing_result';
  else if(!count(row.new_votes)||!count(row.new_valid)||row.new_votes>row.new_valid||!count(row.new_sections)||group?.invalid)status='invalid';
  else if(!group)status='missing_bu';
  else if(group.sections!==row.new_sections)status='partial';
  else status=group.votes===row.new_votes&&group.valid===row.new_valid?'equal':'different';
  const comparable=status==='equal'||status==='different';
  lines.push({key:row.key,name:row.name,status,analysis_votes:row.new_votes,analysis_valid:row.new_valid,expected_sections:row.new_sections??null,loaded_sections:group?.sections??0,bu_votes:group&&!group.invalid?group.votes:null,bu_valid:group&&!group.invalid?group.valid:null,delta_votes:comparable?group!.votes-row.new_votes!:null,delta_valid:comparable?group!.valid-row.new_valid!:null});
 }
 for(const [key,group] of groups)if(!rowKeys.has(key))lines.push({key,name:key,status:group.duplicate?'duplicate':group.invalid?'invalid':'outside',analysis_votes:null,analysis_valid:null,expected_sections:null,loaded_sections:group.sections,bu_votes:group.invalid?null:group.votes,bu_valid:group.invalid?null:group.valid,delta_votes:null,delta_valid:null});
 const allComparable=lines.length>0&&lines.every(row=>row.status==='equal'||row.status==='different');
 const buComplete=!!bu&&!bu.truncated&&count(bu.total_rows)&&bu.rows.length===bu.total_rows;
 const reportComplete=!report.truncated&&count(report.total_rows)&&report.rows.length===report.total_rows;
 const sectionTotal=report.rows.reduce((sum,row)=>sum+(count(row.new_sections)?row.new_sections:0),0);
 const buVotes=[...groups.values()].reduce((sum,g)=>sum+g.votes,0),buValid=[...groups.values()].reduce((sum,g)=>sum+g.valid,0);
 const canCompareTotal=compatible&&allComparable&&buComplete&&reportComplete&&!invalidKeys&&count(report.totals.new_sections)&&sectionTotal===report.totals.new_sections&&sectionTotal===bu!.rows.length&&count(report.totals.new_votes)&&count(report.totals.new_valid)&&report.totals.new_votes<=report.totals.new_valid&&count(buVotes)&&count(buValid);
 if(!canCompareTotal)notices.push('Total do recorte não reconciliado: faltam cobertura completa, equivalência de contagens, chaves válidas ou denominadores compatíveis.');
 const counts=Object.fromEntries(Object.keys(RECONCILIATION_LABELS).map(status=>[status,lines.filter(row=>row.status===status).length])) as Record<ReconciliationStatus,number>;
 return {schema_version:1,method:BU_RECONCILIATION_METHOD,context,analysis_id:report.analysis_id??null,result_sha256:report.result_sha256??null,data_generated_at:report.generated_at,sources:report.sources,coverage:{analysis_rows_loaded:report.rows.length,analysis_rows_total:report.total_rows,analysis_truncated:report.truncated,bu_sections_loaded:bu?.rows.length??0,bu_sections_total:bu?.total_rows??null,bu_truncated:bu?.truncated??false,invalid_bu_keys:invalidKeys},counts,lines,totals:{comparable:canCompareTotal,analysis_votes:report.totals.new_votes,analysis_valid:report.totals.new_valid,bu_votes:canCompareTotal?buVotes:null,bu_valid:canCompareTotal?buValid:null,delta_votes:canCompareTotal?buVotes-report.totals.new_votes!:null,delta_valid:canCompareTotal?buValid-report.totals.new_valid!:null},notices,limitations:'Conferência interna da mesma base importada, somente seleção B. Cobertura compatível por contagem não certifica equivalência das seções em agregações. Coincidência não certifica integridade da fonte; divergência não comprova fraude. Seções agregadas não são separadas.'};
}
export function reconciliationCsv(result:ReturnType<typeof reconcileBu>){
 const q=(v:unknown)=>{let s=v==null?'':String(v);if(typeof v==='string'&&/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows:unknown[][]=[['Método',result.method],['Seleção',result.context.selection],['Parâmetros',JSON.stringify(result.context)],['Protocolo',result.analysis_id],['SHA256 do relatório original',result.result_sha256],['Dados gerados',result.data_generated_at],['Cobertura',JSON.stringify(result.coverage)],['Totais',JSON.stringify(result.totals)],['Limites',result.limitations],...result.notices.map(n=>['Aviso',n]),[],['Chave','Território','Status','Seções esperadas B','BU carregados','Votos análise B','Votos BU carregados','Denominador análise B','Nominal + legenda BU carregados','Diferença votos BU menos análise','Diferença denominador BU menos análise'],...result.lines.map(r=>[r.key,r.name,RECONCILIATION_LABELS[r.status],r.expected_sections,r.loaded_sections,r.analysis_votes,r.bu_votes,r.analysis_valid,r.bu_valid,r.delta_votes,r.delta_valid]),[],...result.sources.map(s=>['Fonte',s.year,s.filename,s.source_url,s.finished_at])];
 return '\ufeff'+rows.map(row=>row.map(q).join(';')).join('\r\n');
}
