import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {electoralStaff} from '@/lib/electoral/auth';
import {queryCldf,cldfRequest,CldfError} from '@/lib/legislative/cldf';
import {canonicalJson} from '@/lib/science/integrity';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(request:NextRequest){
 const {allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origem inválida.'},{status:403});
 const text=await request.text();if(text.length>4096)return NextResponse.json({error:'Pedido acima do limite.'},{status:413});let input;try{input=JSON.parse(text);}catch{return NextResponse.json({error:'Pedido inválido.'},{status:400});}
 try{cldfRequest(input);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Pedido inválido.'},{status:400});}
 try{const result=await queryCldf(input);return NextResponse.json({...result,source_hash:createHash('sha256').update(canonicalJson(result.raw)).digest('hex')},{headers:{'Cache-Control':'private, no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Fonte oficial indisponível.',upstream_status:e instanceof CldfError?e.upstreamStatus:null,checked_at:new Date().toISOString()},{status:502,headers:{'Cache-Control':'no-store'}});}
}
