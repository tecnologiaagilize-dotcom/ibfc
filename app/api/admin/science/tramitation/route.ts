import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {electoralStaff} from '@/lib/electoral/auth';
import {collectTramitation} from '@/lib/legislative/tramitation';
import {canonicalJson} from '@/lib/science/integrity';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const id=request.nextUrl.searchParams.get('record_id');if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Registro inválido.'},{status:400});
 const {data,error}=await db.from('ibfc_legislative_records').select('id,title,source_url').eq('id',id).eq('provider','camara').eq('category','propositions').maybeSingle();
 if(error||!data)return NextResponse.json({error:'Proposição coletada não encontrada.'},{status:404});
 try{const result=await collectTramitation(data.source_url);return NextResponse.json({...result,title:data.title,record_id:id,checked_at:new Date().toISOString(),source_hash:createHash('sha256').update(canonicalJson(result.raw)).digest('hex')},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Fonte oficial indisponível.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
