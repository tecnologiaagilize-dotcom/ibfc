import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {STATUS} from '@/lib/science/statistics';
export const dynamic='force-dynamic';
export async function GET(r:NextRequest){const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});const id=r.nextUrl.searchParams.get('id');const result=id?await db.from('ibfc_science_versions').select('*').eq('investigation_id',id).order('created_at',{ascending:false}).limit(30):await db.from('ibfc_science_investigations').select('*').order('updated_at',{ascending:false}).limit(100);return result.error?NextResponse.json({error:'Aplique a migração 20261011.'},{status:500}):NextResponse.json({rows:result.data});}
export async function POST(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed||r.headers.get('origin')!==r.nextUrl.origin)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
 let b;try{b=await r.json();}catch{return NextResponse.json({error:'Pedido inválido.'},{status:400});}
 if(typeof b.title!=='string'||b.title.length<5||b.title.length>250||typeof b.protocol!=='string'||!/^[\w-]{3,50}$/.test(b.protocol)||!Object.hasOwn(STATUS,b.status))return NextResponse.json({error:'Confira protocolo, título e status.'},{status:400});
 const payload:Record<string,string>={};for(const key of ['hypothesis','method','alternatives','conclusion','sources','reviewer','period']){if(typeof b.payload?.[key]!=='string'||b.payload[key].length>10000)return NextResponse.json({error:'Campo de investigação inválido.'},{status:400});payload[key]=b.payload[key];}
 const row={protocol:b.protocol,title:b.title,status:b.status,payload};
 const result=b.id?await db.from('ibfc_science_investigations').update(row).eq('id',b.id).eq('revision',b.revision).select('id').maybeSingle():await db.from('ibfc_science_investigations').insert(row).select('id').single();
 if(result.error||!result.data)return NextResponse.json({error:'Não foi possível salvar: protocolo duplicado, migração pendente ou revisão alterada por outro usuário. Atualize a lista.'},{status:409});
 return NextResponse.json({ok:true});
}
