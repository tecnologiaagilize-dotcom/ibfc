import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {UFS,OFFICES} from '@/lib/science/territory';
import type {ScienceCatalogue,Target} from '@/lib/science/types';
export const dynamic='force-dynamic';
export const maxDuration=60;
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function POST(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return fail('Acesso administrativo necessário.',403);
 if(r.headers.get('origin')!==r.nextUrl.origin)return fail('Origem inválida.',403);
 let b;try{b=await r.json();}catch{return fail('Pedido inválido.');}
 if((b.uf!=='BR'&&!UFS.includes(b.uf))||![2022,2026].includes(b.year)||![1,2].includes(b.turn)||!Object.hasOwn(OFFICES,b.office)||(b.uf==='BR'&&b.office!==1))return fail('Recorte inválido.');
 const filters:Record<string,number>={};for(const k of ['municipality','zone'])if(b.filters?.[k]!=null){if(!Number.isSafeInteger(b.filters[k])||b.filters[k]<1)return fail('Filtro inválido.');filters[k]=b.filters[k];}
 let target:Target|null=null,pending=false;
 if(b.target){const t=b.target as Target;if(t.uf!==b.uf||t.year!==b.year||t.office!==b.office||t.turn!==b.turn)return fail('Seleção incompatível com os filtros.');
  const {data,error}=await db.rpc('ibfc_science_catalogue',{p_uf:b.uf});if(error)return fail('Catálogo indisponível.',500);
  const c=data as ScienceCatalogue,list=t.kind==='party'||t.kind==='group'?c.parties:c.candidates;
  const nums=t.kind==='group'?t.numbers:[t.number];if(!Array.isArray(nums)||!nums.length||nums.length>40||new Set(nums).size!==nums.length)return fail('Seleção inválida.');
  const chosen=nums.map(n=>list.find(x=>x.number===n&&x.year===t.year&&x.election===t.election&&x.office===t.office&&x.turn===t.turn&&(!t.candidate_id||x.candidate_id===t.candidate_id)));
  if(chosen.some(x=>!x))return fail('Seleção ausente no catálogo.');
  if(chosen.some(x=>x?.results_available===false)){pending=true;}else{
   if(chosen.some(x=>x?.destination&&!x.destination.startsWith('Válido')))return fail('Destinação de votos não compatível com esta consulta.',409);
   const granularities=new Set(chosen.map(x=>x?.result_granularity??'section'));if(granularities.size!==1)return fail('O grupo mistura granularidades de fontes. Consulte os partidos separadamente.');
   target={...chosen[0]!,kind:t.kind??'candidate',numbers:t.kind==='group'?nums:undefined,result_granularity:chosen[0]!.result_granularity};
  }
 }
 const {data,error}=await db.rpc('ibfc_science_zone_layers',{p_uf:b.uf,p_year:b.year,p_turn:b.turn,p_office:b.office,p_target:target,p_filters:filters});
 if(error)return fail('Aplique a migração 20261018_ibfc_zone_layers.sql: '+error.message,500);
 return NextResponse.json({...data,selection_pending:pending,selection_name:target?.name??null},{headers:{'Cache-Control':'no-store'}});
}
