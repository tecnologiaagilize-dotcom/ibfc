import {NextRequest,NextResponse} from "next/server";
import {electoralStaff} from "@/lib/electoral/auth";
import {UFS} from "@/lib/science/territory";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const configured=()=>Boolean(process.env.GITHUB_TSE_TOKEN&&/^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_TSE_REPOSITORY||""));
export async function GET(){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
 const {data,error}=await db.from("ibfc_electoral_sync_jobs").select("id,year,scopes,national,status,message,phase,current_file,phase_done,phase_total,files_total,files_done,rows_processed,bytes_downloaded,created_at,updated_at,finished_at").order("created_at",{ascending:false}).limit(10);
 if(error)return NextResponse.json({error:"Execute o SQL de instalação da sincronização automática no Supabase do IBFC."},{status:500});
 const missing=[];if(!process.env.GITHUB_TSE_TOKEN)missing.push("GITHUB_TSE_TOKEN");if(!/^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_TSE_REPOSITORY||""))missing.push("GITHUB_TSE_REPOSITORY");
 let github:Record<string,unknown>={};
 const repository=process.env.GITHUB_TSE_REPOSITORY;
 if(configured()){
  github={url:`https://github.com/${repository}/actions/workflows/ibfc-tse-sync.yml`};
  if(data?.some(j=>j.status==='queued'||j.status==='running'))try{
   const r=await fetch(`https://api.github.com/repos/${repository}/actions/workflows/ibfc-tse-sync.yml/runs?per_page=20&branch=${encodeURIComponent(process.env.GITHUB_TSE_REF||'main')}`,{headers:{Authorization:`Bearer ${process.env.GITHUB_TSE_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(6000),cache:'no-store'});
   if(r.ok){const payload=await r.json();github.runs=(payload.workflow_runs??[]).map((x:{display_title:string;html_url:string;status:string;conclusion:string|null})=>({title:x.display_title,url:x.html_url,status:x.status,conclusion:x.conclusion}));}
   else github.warning=`Consulta das execuções indisponível (HTTP ${r.status}). Confira a permissão Actions: leitura.`;
  }catch{github.warning='Não foi possível consultar o GitHub agora; a fila do banco continua disponível.';}
 }
 return NextResponse.json({configured:configured(),missing,jobs:data,github},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
 if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"Origem inválida."},{status:403});
 let b;try{b=await request.json();}catch{return NextResponse.json({error:"Pedido inválido."},{status:400});}
 if(b?.action==="cancel"){
  if(typeof b.id!=="string"||!/^[0-9a-f-]{36}$/i.test(b.id))return NextResponse.json({error:"Identificador inválido."},{status:400});
  const {error}=await db.rpc("ibfc_electoral_sync_request",{p_action:"cancel",p_job:b.id});return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({ok:true});
 }
 if(!configured())return NextResponse.json({error:"Configure GITHUB_TSE_TOKEN e GITHUB_TSE_REPOSITORY na Vercel e os Secrets do worker no GitHub."},{status:503});
 if(![2014,2018,2022,2026].includes(b?.year)||!Array.isArray(b?.scopes)||!b.scopes.length||b.scopes.some((s:unknown)=>!UFS.includes(String(s))))return NextResponse.json({error:"Selecione ano e cobertura."},{status:400});
 if(b.national!==true&&b.scopes.some((uf:string)=>!['DF','GO','MG'].includes(uf)))return NextResponse.json({error:'Para outras UFs selecione cobertura de UF completa.'},{status:400});
 const {data,error}=await db.rpc("ibfc_electoral_sync_request",{p_action:"start",p_year:b.year,p_scopes:[...new Set(b.scopes)]});
 if(error)return NextResponse.json({error:"Não foi possível criar a tarefa. Confira o SQL de sincronização e o perfil administrativo."},{status:500});
 if(data.existing)return NextResponse.json({id:data.id,message:"Já existe uma sincronização em andamento."},{status:202});
 if(b.national===true){
  const {error:coverageError}=await db.rpc('ibfc_science_set_coverage',{p_job:data.id,p_national:true});
  if(coverageError){await db.rpc('ibfc_electoral_sync_request',{p_action:'dispatch_failed',p_job:data.id});return NextResponse.json({error:'Aplique a migração 20261011 antes de iniciar a cobertura por UF completa.'},{status:500});}
 }
 try{
  const response=await fetch(`https://api.github.com/repos/${process.env.GITHUB_TSE_REPOSITORY}/actions/workflows/ibfc-tse-sync.yml/dispatches`,{method:"POST",headers:{"Authorization":`Bearer ${process.env.GITHUB_TSE_TOKEN}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify({ref:process.env.GITHUB_TSE_REF||"main",inputs:{job_id:data.id}}),signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!response.ok){await db.rpc("ibfc_electoral_sync_request",{p_action:"dispatch_failed",p_job:data.id});return NextResponse.json({error:`GitHub recusou o início (HTTP ${response.status}). Confira o token Actions, o workflow na branch principal e os Secrets.`},{status:502});}
 }catch{
  // A timed-out dispatch may already have been accepted. Keep the job until checked/cancelled.
  return NextResponse.json({id:data.id,message:"Tarefa criada; não foi possível confirmar a resposta do GitHub. Acompanhe o painel ou execute o workflow com este ID."},{status:202});
 }
 return NextResponse.json({id:data.id,message:"Sincronização iniciada. Você pode fechar esta página."},{status:202});
}
