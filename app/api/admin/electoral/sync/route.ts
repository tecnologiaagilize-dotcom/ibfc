import {NextRequest,NextResponse} from "next/server";
import {electoralStaff} from "@/lib/electoral/auth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
const configured=()=>Boolean(process.env.GITHUB_TSE_TOKEN&&/^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_TSE_REPOSITORY||""));
export async function GET(){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:"Acesso administrativo necessário."},{status:403});
 const {data,error}=await db.from("ibfc_electoral_sync_jobs").select("id,year,scopes,status,message,files_total,files_done,rows_processed,bytes_downloaded,created_at,updated_at,finished_at").order("created_at",{ascending:false}).limit(10);
 if(error)return NextResponse.json({error:"Execute o SQL de instalação da sincronização automática no Supabase do IBFC."},{status:500});
 return NextResponse.json({configured:configured(),jobs:data},{headers:{"Cache-Control":"no-store"}});
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
 if(![2022,2026].includes(b?.year)||!Array.isArray(b?.scopes)||!b.scopes.length||b.scopes.some((s:unknown)=>!["DF","GO","MG"].includes(String(s))))return NextResponse.json({error:"Selecione ano e cobertura."},{status:400});
 const {data,error}=await db.rpc("ibfc_electoral_sync_request",{p_action:"start",p_year:b.year,p_scopes:[...new Set(b.scopes)]});
 if(error)return NextResponse.json({error:"Não foi possível criar a tarefa. Confira o SQL de sincronização e o perfil administrativo."},{status:500});
 if(data.existing)return NextResponse.json({id:data.id,message:"Já existe uma sincronização em andamento."},{status:202});
 try{
  const response=await fetch(`https://api.github.com/repos/${process.env.GITHUB_TSE_REPOSITORY}/actions/workflows/ibfc-tse-sync.yml/dispatches`,{method:"POST",headers:{"Authorization":`Bearer ${process.env.GITHUB_TSE_TOKEN}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:JSON.stringify({ref:process.env.GITHUB_TSE_REF||"main",inputs:{job_id:data.id}}),signal:AbortSignal.timeout(15000),cache:"no-store"});
  if(!response.ok){await db.rpc("ibfc_electoral_sync_request",{p_action:"dispatch_failed",p_job:data.id});return NextResponse.json({error:`GitHub recusou o início (HTTP ${response.status}). Confira o token Actions, o workflow na branch principal e os Secrets.`},{status:502});}
 }catch{
  // A timed-out dispatch may already have been accepted. Keep the job until checked/cancelled.
  return NextResponse.json({id:data.id,message:"Tarefa criada; não foi possível confirmar a resposta do GitHub. Acompanhe o painel ou execute o workflow com este ID."},{status:202});
 }
 return NextResponse.json({id:data.id,message:"Sincronização iniciada. Você pode fechar esta página."},{status:202});
}
