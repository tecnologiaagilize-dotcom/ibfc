import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return reply({error:'Acesso administrativo necessário.'},403);
 const q=request.nextUrl.searchParams,candidate=q.get('candidate_id')||null,status=q.get('status')||null,deadline=q.get('deadline')??'all',uf=q.get('uf')||null,offset=Number(q.get('offset')??0);
 if(candidate&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)||status&&!['registered','in_progress','fulfilled','unfulfilled','cancelled'].includes(status)||!['all','overdue','due30','none'].includes(deadline)||uf&&!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(uf)||!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply({error:'Filtro inválido.'},400);
 const {data,error}=await db.rpc('ibfc_commitment_report',{p_candidate:candidate,p_status:status,p_deadline:deadline,p_uf:uf,p_offset:offset});return error?reply({error:'Relatório indisponível. Execute a migração 20261101 após a 20261031.'},503):reply(data);
}
