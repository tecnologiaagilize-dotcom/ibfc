import {createHash,randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);
export async function GET(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const id=r.nextUrl.searchParams.get('id');if(id){if(!uuid(id))return NextResponse.json({error:'ID inválido.'},{status:400});const {data,error}=await db.from('ibfc_science_evidence').select('storage_path,filename').eq('id',id).single();if(error)return NextResponse.json({error:'Evidência não encontrada.'},{status:404});const signed=await db.storage.from('ibfc-science-evidence').createSignedUrl(data.storage_path,60,{download:data.filename});return signed.error?NextResponse.json({error:'Arquivo indisponível.'},{status:500}):NextResponse.redirect(signed.data.signedUrl);}
 const investigation=r.nextUrl.searchParams.get('investigation');if(!uuid(investigation))return NextResponse.json({error:'Investigação inválida.'},{status:400});
 const {data,error}=await db.from('ibfc_science_evidence').select('id,filename,bytes,sha256,mime_type,source_url,description,signature_status,created_at').eq('investigation_id',investigation).order('created_at',{ascending:false}).limit(100);
 return error?NextResponse.json({error:'Execute a migração 20261012.'},{status:500}):NextResponse.json({rows:data});
}
export async function POST(r:NextRequest){
 const {db,user,allowed}=await electoralStaff();if(!allowed||!user||r.headers.get('origin')!==r.nextUrl.origin)return NextResponse.json({error:'Acesso não autorizado.'},{status:403});
 let form;try{form=await r.formData();}catch{return NextResponse.json({error:'Upload inválido.'},{status:400});}
 const file=form.get('file'),investigation=form.get('investigation'),description=String(form.get('description')??'').slice(0,2000),source=String(form.get('source_url')??'').trim();
 if(!(file instanceof File)||file.size<1||file.size>4*1024*1024||!uuid(investigation))return NextResponse.json({error:'Selecione a investigação e um arquivo de até 4 MB (limite do envio pela Vercel). '},{status:400});
 const ext=file.name.split('.').pop()?.toLowerCase()??'';const allowedTypes:Record<string,string>={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',csv:'text/csv',txt:'text/plain',json:'application/json',zip:'application/zip',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
 if(!allowedTypes[ext])return NextResponse.json({error:'Formato não aceito: PDF, imagem, CSV/TXT/JSON, ZIP, XLSX ou DOCX.'},{status:400});
 if(source){try{const url=new URL(source);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{return NextResponse.json({error:'A fonte deve ser uma URL HTTPS sem credenciais.'},{status:400});}}
 const parent=await db.from('ibfc_science_investigations').select('id').eq('id',investigation).single();if(parent.error)return NextResponse.json({error:'Investigação não encontrada.'},{status:404});
 const bytes=Buffer.from(await file.arrayBuffer()),sha256=createHash('sha256').update(bytes).digest('hex'),path=`${user.id}/${investigation}/${randomUUID()}.${ext}`;
 const upload=await db.storage.from('ibfc-science-evidence').upload(path,bytes,{contentType:allowedTypes[ext],upsert:false});if(upload.error)return NextResponse.json({error:'Não foi possível guardar o original. Execute a migração 20261012 e confira o bucket privado.'},{status:500});
 const {error}=await db.from('ibfc_science_evidence').insert({investigation_id:investigation,filename:file.name.slice(0,250),mime_type:allowedTypes[ext],bytes:file.size,sha256,storage_path:path,source_url:source||null,description});
 return error?NextResponse.json({error:'O arquivo foi guardado, mas seu registro não foi concluído. Verifique a migração. Nenhuma evidência anterior foi sobrescrita.'},{status:500}):NextResponse.json({ok:true,sha256});
}
