import {canonicalJson} from '@/lib/science/integrity';
import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {SCOPES,UFS} from '@/lib/science/territory';
import type {Target,ScienceCatalogue} from '@/lib/science/types';
export const dynamic='force-dynamic';
export const maxDuration=60;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return fail('Acesso administrativo necessário.',403);
 const uf=r.nextUrl.searchParams.get('uf')||'DF';if(uf!=='BR'&&!UFS.includes(uf))return fail('UF inválida.');
 const {data,error}=await db.rpc('ibfc_science_catalogue',{p_uf:uf});
 return error?fail('Aplique a migração 20261011_ibfc_science.sql no Supabase do IBFC.',500):NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function POST(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return fail('Acesso administrativo necessário.',403);
 if(r.headers.get('origin')!==r.nextUrl.origin)return fail('Origem inválida.',403);
 let b;try{b=await r.json();}catch{return fail('Pedido inválido.');}
 const newer=b?.new as Target,current=b?.mode==='current',old=(current?newer:b?.old) as Target,cross=b?.mode==='cross';
 if(!old||!newer||!Object.hasOwn(SCOPES,b.scope)||old.uf!==newer.uf||(!cross&&old.office!==newer.office)||old.turn!==newer.turn||(!cross&&!current&&(old.year!==2022||newer.year!==2026))||(current&&![2022,2026].includes(newer.year))||(cross&&(old.year!==newer.year||![2022,2026].includes(newer.year))))return fail('Selecione recortes compatíveis para 2022 e 2026.');
 if(cross&&(newer.uf==='BR'||b.scope==='country'))return fail('Compare cargos dentro de uma UF e seus territórios.');
 if(newer.uf!=='BR'&&!UFS.includes(newer.uf))return fail('UF inválida.');
 if((b.scope==='country'||newer.uf==='BR')&&(newer.office!==1||b.scope!=='country'||newer.uf!=='BR'))return fail('Brasil permite presidente agregado por UF.');
 const filters:Record<string,number|boolean>={};for(const key of ['municipality','zone','local','section'])if(b.filters?.[key]!=null){if(!Number.isSafeInteger(b.filters[key])||b.filters[key]<1)return fail('Filtro territorial inválido.');filters[key]=b.filters[key];}
 if(typeof b.filters?.common_only==='boolean')filters.common_only=b.filters.common_only;
 if(['municipality','zone','location','section'].includes(b.scope)&&!filters.municipality)return fail('Selecione o município.');
 if(['zone','location','section'].includes(b.scope)&&!filters.zone)return fail('Selecione a zona.');
 if(['location','section'].includes(b.scope)&&!filters.local)return fail('Selecione o local.');
 if(b.scope==='section'&&!filters.section)return fail('Informe a seção.');
 const {data:catalogue,error:catalogueError}=await db.rpc('ibfc_science_catalogue',{p_uf:newer.uf});if(catalogueError)return fail('Catálogo indisponível: confira a migração 20261011.',500);
 const c=catalogue as ScienceCatalogue;
 let zoneResults=false;
 for(const t of [old,newer]){
  const list=t.kind==='party'||t.kind==='group'?c.parties:c.candidates;
  const numbers=t.kind==='group'?t.numbers:[t.number];
  if(!Array.isArray(numbers)||numbers.length<1||numbers.length>40||new Set(numbers).size!==numbers.length||numbers.some(n=>!list.some(x=>x.number===n&&x.year===t.year&&x.election===t.election&&x.turn===t.turn&&x.office===t.office)))return fail('Seleção ausente no catálogo importado. Atualize os filtros.');
  const chosen=list.find(x=>x.number===t.number&&x.year===t.year&&x.election===t.election&&x.turn===t.turn&&x.office===t.office&&(!t.candidate_id||x.candidate_id===t.candidate_id));
  if(t.kind!=='group'&&!chosen)return fail('Identificador da candidatura ausente no catálogo. Atualize a seleção.');
  if(chosen){t.name=chosen.name;t.result_granularity=chosen.result_granularity;t.candidate_id=chosen.candidate_id;}
  if(numbers.some(n=>list.some(x=>x.number===n&&x.year===t.year&&x.election===t.election&&x.turn===t.turn&&x.office===t.office&&x.result_granularity==='zone')))zoneResults=true;
  if(chosen?.destination&&!chosen.destination.startsWith('Válido'))return fail('Votos com destinação '+chosen.destination+': esta análise usa votos válidos.',409);
  if(numbers.some(n=>list.find(x=>x.number===n&&x.year===t.year&&x.election===t.election&&x.turn===t.turn&&x.office===t.office)?.results_available===false))return fail('Candidatura/partido cadastrado pelo TSE, mas sem resultados de votos importados para este recorte.',409);
 }
 if(zoneResults&&(cross||!['country','state','municipality','zone'].includes(b.scope)||filters.common_only))return fail('Resultados por zona permitem consulta de ano único e comparação 2022/2026 até zona. Local, seção, chaves comuns e cruzamento de cargos requerem votos por seção.',409);
 const {data,error}=await db.rpc(zoneResults?'ibfc_science_zone_analysis':current?'ibfc_science_current':cross?'ibfc_science_cross':'ibfc_science_compare',{p_old:old,p_new:newer,p_scope:b.scope,p_filters:filters});
 if(error)return fail('Não foi possível calcular: '+error.message,500);
 if(!zoneResults){
  const {data:bu,error:buError}=await db.rpc('ibfc_science_bu_details',{p_target:newer,p_filters:filters});
  if(buError)return fail('Detalhamento de urna indisponível. Aplique a migração 20261017_ibfc_boletins_secoes.sql.',500);
  data.bu=bu;
  const {data:geo,error:geoError}=await db.rpc('ibfc_science_geocode_rows',{p_rows:data.rows,p_year:newer.year,p_scope:b.scope});
  if(geoError)return fail('Referências cartográficas indisponíveis. Aplique a migração 20261017.',500);
  data.rows=geo.rows;data.sources=[...data.sources,...geo.sources];
  if(bu?.total_rows){data.denominator_basis='bu_nominal_legenda';data.notice='Votos escrutinados nos Boletins de Urna de urnas apuradas. Participação usa a soma nominal + legenda do cargo nos boletins, que pode diferir da totalização final por decisões sobre a destinação dos votos. Seções agregadas não são separadas artificialmente.';}

 }
 const digest=createHash('sha256').update(canonicalJson(data)).digest('hex');
 const {data:record,error:auditError}=await db.from('ibfc_science_analyses').insert({method_version:'ibfc-science-2.0',parameters:{mode:current?'current':cross?'cross':'historical',old:current?{...old,name:'Sem comparação'}:old,new:newer,scope:b.scope,filters},sources:data.sources,totals:data.totals,result_sha256:digest,result_snapshot:data}).select('id').single();
 if(auditError)return fail('Cálculo concluído, mas o registro científico não foi salvo. Confira as migrações 20261011 e 20261012.',500);
 return NextResponse.json({...data,analysis_id:record.id,result_sha256:digest},{headers:{'Cache-Control':'no-store'}});
}
