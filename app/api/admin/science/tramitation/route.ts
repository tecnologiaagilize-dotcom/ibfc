import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {electoralStaff} from '@/lib/electoral/auth';
import {collectTramitation} from '@/lib/legislative/tramitation';
import {compareTramitation} from '@/lib/legislative/compare-tramitation';
import {canonicalJson} from '@/lib/science/integrity';
export const dynamic='force-dynamic';export const maxDuration=30;
const validId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function officialRecord(db:any,id:string){return db.from('ibfc_legislative_records').select('id,title,source_url').eq('id',id).eq('provider','camara').eq('category','propositions').maybeSingle();}
async function live(data:{id:string;title:string;source_url:string}){const result=await collectTramitation(data.source_url);return {...result,title:data.title,record_id:data.id,checked_at:new Date().toISOString(),source_hash:createHash('sha256').update(canonicalJson(result.raw)).digest('hex')};}
export async function GET(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return reply({error:'Acesso administrativo necessário.'},403);
 const id=request.nextUrl.searchParams.get('record_id');if(!validId(id))return reply({error:'Registro inválido.'},400);
 const mode=request.nextUrl.searchParams.get('mode');
 if(mode==='archive'){
  const snapshotId=request.nextUrl.searchParams.get('snapshot_id');
  if(snapshotId){if(!validId(snapshotId))return reply({error:'Versão inválida.'},400);const {data,error}=await db.from('ibfc_tramitation_snapshots').select('*').eq('id',snapshotId).eq('record_id',id).maybeSingle();if(error||!data)return reply({error:'Versão não encontrada ou migração 20261028 indisponível.'},404);
   let comparison=null;if(data.previous_id){const previous=await db.from('ibfc_tramitation_snapshots').select('id,created_at,snapshot').eq('id',data.previous_id).eq('record_id',id).maybeSingle();if(previous.error||!previous.data)return reply({error:'Versão anterior indisponível; comparação não realizada.'},503);comparison={...compareTramitation(previous.data.snapshot.steps,data.snapshot.steps),previous_id:previous.data.id,previous_created_at:previous.data.created_at,raw_changed:previous.data.snapshot.source_hash!==data.snapshot.source_hash};}
   return reply({archive:data,comparison});
  }
  const offset=Number(request.nextUrl.searchParams.get('offset')??0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply({error:'Página inválida.'},400);
  const {data,error,count}=await db.from('ibfc_tramitation_snapshots').select('id,revision,previous_id,created_at,created_by',{count:'exact'}).eq('record_id',id).order('revision',{ascending:false}).range(offset,offset+19);return error?reply({error:'Arquivo indisponível. Execute a migração 20261028.'},503):reply({versions:data,total:count,offset});
 }
 if(mode)return reply({error:'Consulta inválida.'},400);
 const {data,error}=await officialRecord(db,id);if(error||!data)return reply({error:'Proposição coletada não encontrada.'},404);
 try{return reply(await live(data));}catch(e){return reply({error:e instanceof Error?e.message:'Fonte oficial indisponível.'},502);}
}
export async function POST(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return reply({error:'Acesso administrativo necessário.'},403);if(request.headers.get('origin')!==request.nextUrl.origin)return reply({error:'Origem inválida.'},403);
 let input;try{input=await request.json();}catch{return reply({error:'Pedido inválido.'},400);}if(!validId(input?.record_id)||!validId(input?.request_id))return reply({error:'Registro ou tentativa inválidos.'},400);
 const {data,error}=await officialRecord(db,input.record_id);if(error||!data)return reply({error:'Proposição coletada não encontrada.'},404);
 // Retry must reuse the same saved snapshot, even when the official source is unavailable now.
 const existing=await db.from('ibfc_tramitation_snapshots').select('*').eq('record_id',data.id).eq('request_id',input.request_id).maybeSingle();
 if(existing.error)return reply({error:'Arquivo indisponível. Execute a migração 20261028.'},503);if(existing.data)return reply({archive:existing.data});
 try{const snapshot=await live(data);const saved=await db.rpc('ibfc_tramitation_archive',{p_record:data.id,p_request:input.request_id,p_snapshot:snapshot});if(saved.error)return reply({error:'Consulta realizada, mas não foi arquivada. Confira a migração 20261028 e tente novamente.'},503);return reply({archive:saved.data});}catch(e){return reply({error:e instanceof Error?e.message:'Fonte oficial indisponível. Nenhuma versão salva.'},502);}
}
