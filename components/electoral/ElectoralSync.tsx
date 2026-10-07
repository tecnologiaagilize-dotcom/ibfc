"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {STATES,UFS} from "@/lib/science/territory";
import {syncProgress} from "@/lib/science/progress";
type Job={id:string;year:number;scopes:string[];national?:boolean;phase?:string;current_file?:string;phase_done?:number;phase_total?:number;status:string;message:string;files_total:number;files_done:number;rows_processed:number;bytes_downloaded:number;created_at:string;updated_at:string;finished_at:string|null};
const labels:Record<string,string>={queued:"Na fila",running:"Em processamento",completed:"Concluída",partial:"Carga parcial",waiting:"Aguardando publicação do TSE",failed:"Falhou",cancelled:"Cancelada"};
export function ElectoralSync({onDone}:{onDone:()=>void}){
 const [year,setYear]=useState(2026),[scopes,setScopes]=useState(["DF","GO"]),[jobs,setJobs]=useState<Job[]>([]);
 const [national,setNational]=useState(false),[github,setGithub]=useState<{url?:string;warning?:string;runs?:{title:string;url:string;status:string;conclusion:string|null}[]}>({});
 const [missing,setMissing]=useState<string[]>([]);
 const [configured,setConfigured]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const previous=useRef<Map<string,string>>(new Map()),loaded=useRef(false),done=useRef(onDone);done.current=onDone;
 const refresh=useCallback(async()=>{
  try{const r=await fetch("/api/admin/electoral/sync",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setError("");setConfigured(d.configured);setMissing(d.missing??[]);setJobs(d.jobs);setGithub(d.github??{});
   const changed=(d.jobs as Job[]).some(j=>loaded.current&&["completed","partial"].includes(j.status)&&previous.current.get(j.id)!==j.status);
   previous.current=new Map((d.jobs as Job[]).map(j=>[j.id,j.status]));loaded.current=true;if(changed)done.current();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao consultar sincronização.");}
 },[]);
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),10000);return()=>clearInterval(id);},[refresh]);
 const active=jobs.find(j=>["queued","running"].includes(j.status));
 const progress=active?syncProgress(active):null;
 const run=active?github.runs?.find(r=>r.title?.includes(active.id)):undefined;
 async function send(body:unknown){setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/admin/electoral/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message||"Solicitação registrada.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar sincronização.");}finally{setBusy(false);}}
 return <section className="electoral-panel electoral-sync-panel no-print" id="sincronizacao-tse"><span className="electoral-eyebrow">IMPORTAÇÃO AUTOMÁTICA</span><h2>Sincronizar com o TSE</h2><p>Busca, baixa e importa as bases oficiais em segundo plano. Você pode fechar esta página; o progresso fica registrado no sistema.</p>
  <div className="electoral-controls"><label>Ano da sincronização<select value={year} disabled={busy||Boolean(active)} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2022</option><option>2018</option><option>2014</option></select></label>
   <label>Cobertura<select value={national?'national':'ride'} disabled={busy||Boolean(active)} onChange={e=>{const next=e.target.value==='national';setNational(next);setScopes(['DF','GO']);}}><option value="ride">DF e municípios do Entorno/RIDE</option><option value="national">UFs completas / Brasil</option></select></label>
   {(national?UFS.map(uf=>[uf,STATES[uf]]):[["DF","Distrito Federal"],["GO","Entorno de Goiás"],["MG","Municípios da RIDE em MG"]]).map(([uf,name])=><label className="electoral-checkbox" key={uf}><input type="checkbox" checked={scopes.includes(uf)} disabled={busy||Boolean(active)} onChange={e=>setScopes(s=>e.target.checked?[...s,uf]:s.filter(x=>x!==uf))}/>{name}</label>)}
   <button className="electoral-primary" disabled={busy||!configured||!scopes.length||Boolean(active)} onClick={()=>void send({action:"start",year,scopes,national})}>{busy?"Solicitando…":"Sincronizar bases oficiais"}</button>
   <button disabled={busy} onClick={()=>void refresh()}>Atualizar progresso</button>
  </div>
  {!configured&&!error&&<p className="electoral-notice">Sincronização automática ainda não configurada na Vercel: {missing.length?missing.join(", "):"confira as variáveis de servidor"}. Inclua o workflow do pacote no GitHub, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nos Secrets e faça novo deployment. Depois, este botão baixa e importa diretamente do TSE, sem upload manual.</p>}
  {error&&<p role="alert" className="electoral-notice electoral-error">{error}</p>}{message&&<p role="status" className="electoral-notice">{message}</p>}
  {github.url&&<p><a href={run?.url??github.url} target="_blank" rel="noopener noreferrer">Abrir execução no GitHub Actions ↗</a></p>}
  {github.warning&&<p className="electoral-caption">{github.warning}</p>}
  {national&&<p className="electoral-caption">Importa todos os municípios das UFs marcadas. Cargas nacionais são grandes: prefira lotes de UFs. A cobertura efetiva depende dos arquivos publicados pelo TSE.</p>}
  {active&&<div role="status">
   <div className={"science-progress "+(active.status==="queued"?"waiting":"")}><progress max={100} value={progress?.value??undefined} aria-label="Progresso da sincronização"/><strong>{progress?.label}</strong></div>
   <p className="electoral-caption">{progress?.description}{active.current_file&&<> Arquivo: <b>{active.current_file}</b>.</>}</p>
   {run&&<p>GitHub: {run.status} {run.conclusion&&`· ${run.conclusion}`}.</p>}
   {run?.status==='completed'&&active.status==='queued'&&<p className="electoral-notice electoral-error">A execução terminou sem assumir a tarefa. Abra os logs, confira os Secrets SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e o script da branch. Corrija a falha antes de cancelar e reiniciar.</p>}
   {active.status==='queued'&&Date.now()-Date.parse(active.updated_at)>300000&&<p className="electoral-notice">A tarefa aguarda há mais de 5 minutos. Verifique se a execução está esperando outra carga ou falhou antes de conectar ao banco. Não há download confirmado.</p>}<p><strong>{labels[active.status]} · {active.year}</strong> · {active.scopes.join(" / ")}<br/>{active.message}</p><p>{active.files_done} de {active.files_total||"—"} arquivos preparados · {active.rows_processed.toLocaleString("pt-BR")} registros enviados · {(active.bytes_downloaded/1024**2).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB baixados</p><small>Última atualização: {new Date(active.updated_at).toLocaleString("pt-BR")}. Se ficar sem atualização por mais de 30 minutos, cancele e inicie uma nova sincronização.</small><p><button disabled={busy} onClick={()=>void send({action:"cancel",id:active.id})}>Cancelar sincronização</button></p></div>}
  <p className="electoral-caption">A carga oficial inclui os turnos disponíveis; não é preciso baixar um arquivo por turno. Selecione 1º ou 2º turno nos filtros de consulta. O 2º turno só aparece após publicação/importação de seus resultados.</p>
  <details><summary>Ativar atualização diária automática de 2026</summary><p>No GitHub → Settings → Secrets and variables → Actions → Variables, configure <b>IBFC_TSE_AUTO_ENABLED=true</b>, <b>IBFC_TSE_AUTO_OWNER_ID</b> com o UUID de um administrador ativo e, opcionalmente, <b>IBFC_TSE_AUTO_SCOPES=DF,GO</b>. Instale a migração 20261010 e os Secrets do worker. O workflow agenda a busca para 03h17 de Brasília, com horário sujeito à fila do GitHub. Não precisa deixar o portal aberto. Para desativar, mude IBFC_TSE_AUTO_ENABLED para false.</p></details>
  {!active&&jobs[0]?.status==='completed'&&<div className="science-progress" role="status"><progress max={100} value={100} aria-label="Sincronização concluída"/><strong>100% · Carga publicada</strong></div>}
  <details><summary>Histórico de sincronizações</summary>{jobs.filter(j=>j!==active).map(j=><p key={j.id}><strong>{j.year} · {labels[j.status]}</strong> · {j.scopes.join(" / ")}<br/>{j.message}<br/><small>{new Date(j.updated_at).toLocaleString("pt-BR")} · tarefa {j.id}</small></p>)}</details>
  <p className="electoral-caption">A carga anterior continua disponível até a publicação da atualização. Se o TSE ainda não disponibilizar um recurso no catálogo, o sistema indica a pendência. Sincronizar não reconstrói bairros/RA nem vincula votos individuais.</p>
 </section>;
}
