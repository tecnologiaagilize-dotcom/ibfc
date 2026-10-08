import {NextRequest,NextResponse} from 'next/server';import {electoralStaff} from '@/lib/electoral/auth';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const q=request.nextUrl.searchParams,candidate=q.get('candidate_id')||null,provider=q.get('provider')||null,category=q.get('category')||null,offset=Number(q.get('offset')??0);
 if(candidate&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)||provider&&!['camara','senado'].includes(provider)||category&&!['committees','propositions','votes','events'].includes(category)||!Number.isSafeInteger(offset)||offset<0||offset>100000)return NextResponse.json({error:'Filtro inválido.'},{status:400});
 const {data,error}=await db.rpc('ibfc_legislative_report',{p_candidate:candidate,p_provider:provider,p_category:category,p_offset:offset});
 return error?NextResponse.json({error:'Relatório indisponível. Execute a migração 20261029 após a 20261028.'},{status:503}):NextResponse.json({...data,filters:{candidate_id:candidate,provider,category}},{headers:{'Cache-Control':'private, no-store'}});
}
