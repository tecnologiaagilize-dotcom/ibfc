import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {validDate,brazilDate} from '@/lib/community/demands';
import {UFS} from '@/lib/science/territory';
export const dynamic='force-dynamic';
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max;
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(){const {db,allowed}=await electoralStaff();if(!allowed)return response({error:'Acesso administrativo necessário.'},403);
 const [o,p]=await Promise.all([db.from('ibfc_community_organizations').select('id,name,uf,municipality,territory,purpose').order('name').limit(500),db.from('ibfc_community_participation').select('id,organization_id,name,activity,participated_on,withdrawn_at').order('created_at',{ascending:false}).limit(500)]);
 if(o.error||p.error)return response({error:'Instale a migração 20261019_ibfc_community.sql para habilitar o módulo.'},503);
 return response({organizations:o.data,participation:p.data,limit:500});}
export async function POST(r:NextRequest){const {db,allowed}=await electoralStaff();if(!allowed)return response({error:'Acesso administrativo necessário.'},403);if(r.headers.get('origin')!==r.nextUrl.origin)return response({error:'Origem inválida.'},403);
 let b;try{b=await r.json();}catch{return response({error:'Pedido inválido.'},400);}if(!b||typeof b!=='object')return response({error:'Pedido inválido.'},400);
 let error;
 if(b.action==='organization'){if(!text(b.name,2,160)||!UFS.includes(b.uf)||!text(b.municipality,2,160)||!text(b.territory??'',0,160)||!text(b.purpose??'',0,500))return response({error:'Confira nome, UF e município.'},400);
 ({error}=await db.from('ibfc_community_organizations').insert({name:b.name.trim(),uf:b.uf,municipality:b.municipality.trim(),territory:(b.territory??'').trim(),purpose:(b.purpose??'').trim()}));
 }else if(b.action==='participation'){if(!uuid(b.organization_id)||!text(b.name,2,160)||!text(b.activity,2,160)||!text(b.consent_evidence,5,500)||b.authorized!==true||!b.participated_on||!validDate(b.participated_on)||b.participated_on>brazilDate()||(b.activity_id&&!uuid(b.activity_id)))return response({error:'Informe participação realizada e a referência da autorização.'},400);
 ({error}=await db.from('ibfc_community_participation').insert({organization_id:b.organization_id,name:b.name.trim(),activity:b.activity.trim(),...(b.activity_id?{activity_id:b.activity_id}:{}),participated_on:b.participated_on,consent_evidence:b.consent_evidence.trim()}));
 }else if(b.action==='withdraw'||b.action==='delete'){if(!uuid(b.id))return response({error:'Registro inválido.'},400);const q=b.action==='withdraw'?db.from('ibfc_community_participation').update({withdrawn_at:new Date().toISOString()}):db.from('ibfc_community_participation').delete();const result=await q.eq('id',b.id).select('id');error=result.error;if(!error&&!result.data?.length)return response({error:'Registro não encontrado.'},404);
 }else return response({error:'Ação inválida.'},400);
 if(error)return response({error:'Não foi possível salvar. Confira a migração e sua permissão.'},400);return response({ok:true});}
