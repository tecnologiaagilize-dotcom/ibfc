/* Node 24: executes the same TypeScript collector as the portal, without npm install. */
const {createHash}=require('node:crypto');
const {collectPage}=require('../lib/legislative/collector.ts');
const {canonicalJson}=require('../lib/science/integrity.ts');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const transient=e=>/HTTP (429|5\d\d)|timeout|fetch failed|network|aborted/i.test(e.message||'');
async function retry(task,{wait=sleep,tries=3}={}){for(let attempt=1;;attempt++){try{return await task();}catch(e){if(attempt>=tries||!transient(e))throw e;await wait(attempt*2000);}}}
function rpcClient(url,key,request=fetch){const base=new URL(url);if(base.protocol!=='https:'||base.username||base.password)throw Error('SUPABASE_URL inválida.');return async(name,args)=>{const r=await request(new URL('/rest/v1/rpc/'+name,base),{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok){let message='';try{message=(await r.json()).message||'';}catch{}throw Error('Banco HTTP '+r.status+(message?': '+String(message).slice(0,250):''));}return r.json();};}
async function processRun(claim,{rpc,collect=collectPage,wait=sleep,now=Date.now,deadline=Date.now()+25*60000,log=console.log,heartbeatMs=30000}){
 let run=claim,token=claim.worker_token,heartbeatError=null,inFlight=false,pages=0;
 const call=(action,data={})=>rpc('ibfc_legislative_worker',{p_action:action,p_id:run.id,p_token:token,p_data:data});
 const timer=setInterval(async()=>{if(inFlight)return;inFlight=true;try{await call('heartbeat');}catch(e){heartbeatError=e;}finally{inFlight=false;}},heartbeatMs);
 try{
  while(!['completed','partial'].includes(run.status)){
   if(now()+90000>=deadline){await call('release');log('Tempo do worker atingido; checkpoint mantido na fila.');return {status:'queued',pages};}
   if(heartbeatError)throw heartbeatError;
   const batch=await retry(()=>collect(run),{wait});if(heartbeatError)throw heartbeatError;
   const records=batch.records.map(x=>({...x,source_hash:createHash('sha256').update(canonicalJson(x.payload)).digest('hex')}));
   run=await retry(()=>call('commit',{version:run.version,page:run.page,records,has_more:batch.hasMore,source:batch.source}),{wait});
   pages++;log(`Coleta ${run.id}: ${run.page-1} lote(s) salvo(s), ${run.saved} registro(s), ${run.status}.`);
   await wait(250);
  }
  return {status:run.status,pages};
 }catch(e){
  try{await call('fail',{version:run.version,error:String(e.message||'Falha na coleta').slice(0,1000)});}catch{}
  log('Coleta interrompida. Os lotes salvos permanecem no banco; confira o histórico no portal.');return {status:'failed',pages};
 }finally{clearInterval(timer);}
}
async function main(env=process.env){
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nos Secrets do GitHub.');
 const id=env.IBFC_LEGISLATIVE_RUN_ID||null;if(id&&!/^[0-9a-f-]{36}$/i.test(id))throw Error('Identificador da coleta inválido.');
 const rpc=rpcClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),deadline=Date.now()+25*60000;
 if(env.IBFC_LEGISLATIVE_SCHEDULED==='true'){const scheduled=await rpc('ibfc_legislative_schedule_due',{});console.log('Agendas vencidas preparadas:',scheduled.queued);}
 let jobs=0,failed=0,preferred=id;while(Date.now()+90000<deadline&&jobs<100){const claim=await rpc('ibfc_legislative_worker',{p_action:'claim',p_id:preferred});if(!claim){if(preferred){preferred=null;continue;}break;}preferred=null;jobs++;if(claim.blocked){failed++;continue;}const result=await processRun(claim,{rpc,deadline});if(result.status==='failed')failed++;if(result.status==='queued')break;}
 console.log(`Worker encerrado: ${jobs} coleta(s) examinada(s), ${failed} interrompida(s).`);if(failed)process.exitCode=1;
}
module.exports={rpcClient,retry,processRun,main};
if(require.main===module)main().catch(()=>{console.error('Não foi possível executar o worker. Confira Secrets, migração e acesso às fontes.');process.exitCode=1;});
