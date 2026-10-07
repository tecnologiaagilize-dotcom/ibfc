import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {electoralStaff} from '@/lib/electoral/auth';
import {UFS,OFFICES} from '@/lib/science/territory';
import {canonicalJson} from '@/lib/science/integrity';
import {TEMPORAL_VERSION,temporalModels,type TemporalPoint} from '@/lib/science/temporal-models';
import type {ScienceCatalogue,ScienceReport,Target} from '@/lib/science/types';
export const dynamic='force-dynamic';export const maxDuration=60;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function POST(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return fail('Acesso administrativo necessário.',403);
 if(r.headers.get('origin')!==r.nextUrl.origin)return fail('Origem inválida.',403);
 let b;try{b=await r.json();}catch{return fail('Pedido inválido.');}
 if(b?.correspondence_confirmed!==true||!Array.isArray(b.targets)||b.targets.length<3||b.targets.length>4||!['state','municipality'].includes(b.scope))return fail('Confirme a correspondência e selecione três ou quatro eleições consecutivas.');
 if(b.targets.some((t:unknown)=>!t||typeof t!=='object'||Array.isArray(t)))return fail('Seleções inválidas.');
 const requested=b.targets as Target[],first=requested[0];
 if(!first||!UFS.includes(first.uf)||!Object.hasOwn(OFFICES,first.office)||![1,2].includes(first.turn)||!['candidate','party'].includes(first.kind??''))return fail('UF, cargo, turno ou tipo inválidos.');
 const sorted=[...requested].sort((a,b)=>a.year-b.year);
 if(sorted.some((t,i)=>!t||![2014,2018,2022,2026].includes(t.year)||(i>0&&t.year!==sorted[i-1].year+4)||t.uf!==first.uf||t.office!==first.office||t.turn!==first.turn||t.kind!==first.kind||!Number.isSafeInteger(t.election)||typeof t.number!=='string'))return fail('Use eleições consecutivas com mesma UF, cargo, turno e tipo.');
 const filters:Record<string,number>={};if(b.filters?.municipality!=null){if(!Number.isSafeInteger(b.filters.municipality)||b.filters.municipality<1)return fail('Município inválido.');filters.municipality=b.filters.municipality;}
 if(b.scope==='municipality'&&!filters.municipality)return fail('Escolha um município para analisar zonas.');
 const {data:raw,error:catalogueError}=await db.rpc('ibfc_science_catalogue',{p_uf:first.uf});if(catalogueError)return fail('Catálogo indisponível. Confira as migrações.',500);
 const catalogue=raw as ScienceCatalogue,list=first.kind==='party'?catalogue.parties:catalogue.candidates,targets:Target[]=[];
 for(const t of sorted){const matches=list.filter(x=>x.year===t.year&&x.election===t.election&&x.office===t.office&&x.turn===t.turn&&x.number===t.number&&(!t.candidate_id||x.candidate_id===t.candidate_id));
  if(matches.length!==1)return fail('Seleção ausente ou ambígua no catálogo. Atualize os filtros.');const chosen=matches[0];
  if(chosen.results_available===false||chosen.result_granularity==='zone')return fail('A série temporal exige votos por seção importados para cada ano. Resultados apenas por zona ou cadastros sem votos ainda não permitem este cálculo.',409);
  if(chosen.destination&&!chosen.destination.startsWith('Válido'))return fail('Esta série usa votos válidos.',409);
  targets.push({...chosen,kind:first.kind});
 }
 const {data,error}=await db.rpc('ibfc_science_temporal',{p_targets:targets,p_scope:b.scope,p_filters:filters});
 if(error)return fail('Não foi possível gerar a série: '+error.message+'. Confira a migração 20261026.',500);
 const series=data.series as {target:Target;data:ScienceReport}[];
 if(!Array.isArray(series)||series.length!==targets.length||series.some(s=>s.data.truncated||!s.data.rows.length))return fail('Série incompleta ou truncada. Reduza o recorte.',409);
 const points:TemporalPoint[]=series.flatMap(s=>s.data.rows.map(row=>({key:row.key,name:row.name,year:s.target.year,votes:row.new_votes,valid:row.new_valid})));
 let temporal;try{temporal=temporalModels(points,targets.map(t=>t.year));}catch(e){return fail(e instanceof Error?e.message:'Dados inválidos.',409);}
 const old=series[0],newer=series.at(-1)!,oldRows=new Map(old.data.rows.map(x=>[x.key,x]));
 // Compatible overview for the existing reports screen; full temporal protocol is archived too.
 const snapshot={...newer.data,generated_at:data.generated_at,temporal,series,rows:newer.data.rows.map(x=>({...x,old_votes:oldRows.get(x.key)?.new_votes??null,old_valid:oldRows.get(x.key)?.new_valid??null})),totals:{...newer.data.totals,old_votes:old.data.totals.new_votes,old_valid:old.data.totals.new_valid},sources:series.flatMap(s=>s.data.sources)};
 const digest=createHash('sha256').update(canonicalJson(snapshot)).digest('hex');
 const {data:record,error:auditError}=await db.from('ibfc_science_analyses').insert({method_version:TEMPORAL_VERSION,parameters:{mode:'temporal',old:targets[0],new:targets.at(-1),targets,scope:b.scope,filters,correspondence_confirmed:true},sources:snapshot.sources,totals:snapshot.totals,result_sha256:digest,result_snapshot:snapshot}).select('id').single();
 if(auditError)return fail('Cálculo concluído, mas o protocolo não foi salvo. Confira as migrações 20261011 e 20261012.',500);
 return NextResponse.json({...snapshot,analysis_id:record.id,result_sha256:digest},{headers:{'Cache-Control':'no-store'}});
}
