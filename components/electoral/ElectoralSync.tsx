"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type Job={id:string;year:number;scopes:string[];status:string;message:string;files_total:number;files_done:number;rows_processed:number;bytes_downloaded:number;created_at:string;updated_at:string;finished_at:string|null};
const labels:Record<string,string>={queued:"Na fila",running:"Em processamento",completed:"Concluída",partial:"Carga parcial",waiting:"Aguardando publicação do TSE",failed:"Falhou",cancelled:"Cancelada"};
export function ElectoralSync({onDone}:{onDone:()=>void}){
 const [year,setYear]=useState(2026),[scopes,setScopes]=useState(["DF","GO"]),[jobs,setJobs]=useState<Job[]>([]);
 const [configured,setConfigured]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const previous=useRef<Map<string,string>>(new Map()),loaded=useRef(false),done=useRef(onDone);done.current=onDone;
 const refresh=useCallback(async()=>{
  try{const r=await fetch("/api/admin/electoral/sync",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setError("");setConfigured(d.configured);setJobs(d.jobs);
   const changed=(d.jobs as Job[]).some(j=>loaded.current&&["completed","partial"].includes(j.status)&&previous.current.get(j.id)!==j.status);
   previous.current=new Map((d.jobs as Job[]).map(j=>[j.id,j.status]));loaded.current=true;if(changed)done.current();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao consultar sincronização.");}
 },[]);
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),10000);return()=>clearInterval(id);},[refresh]);
 const active=jobs.find(j=>["queued","running"].includes(j.status));
 async function send(body:unknown){setBusy(true);setError("");setMessage("");try{const r=await fetch("/api/admin/electoral/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message||"Solicitação registrada.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar sincronização.");}finally{setBusy(false);}}
 return <section className="electoral-panel no-print"><h2>Sincronizar com o TSE</h2><p>Busca, baixa e importa as bases oficiais em segundo plano. Você pode fechar esta página; o progresso fica registrado no sistema.</p>
  <div className="electoral-controls"><label>Ano da sincronização<select value={year} disabled={busy||Boolean(active)} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2022</option></select></label>
   {[["DF","Distrito Federal"],["GO","Entorno de Goiás"],["MG","Municípios da RIDE em MG"]].map(([uf,name])=><label className="electoral-checkbox" key={uf}><input type="checkbox" checked={scopes.includes(uf)} disabled={busy||Boolean(active)} onChange={e=>setScopes(s=>e.target.checked?[...s,uf]:s.filter(x=>x!==uf))}/>{name}</label>)}
   <button className="electoral-primary" disabled={busy||!configured||!scopes.length||Boolean(active)} onClick={()=>void send({action:"start",year,scopes})}>{busy?"Solicitando…":"Sincronizar bases oficiais"}</button>
   <button disabled={busy} onClick={()=>void refresh()}>Atualizar progresso</button>
  </div>
  {!configured&&!error&&<p className="electoral-notice">A sincronização exige uma configuração inicial no GitHub e na Vercel. Consulte as instruções do pacote; não é necessário enviar arquivos manualmente depois de ativar.</p>}
  {error&&<p role="alert" className="electoral-notice electoral-error">{error}</p>}{message&&<p role="status" className="electoral-notice">{message}</p>}
  {active&&<div role="status"><p><strong>{labels[active.status]} · {active.year}</strong> · {active.scopes.join(" / ")}<br/>{active.message}</p><p>{active.files_done} de {active.files_total||"—"} arquivos preparados · {active.rows_processed.toLocaleString("pt-BR")} registros enviados · {(active.bytes_downloaded/1024**2).toLocaleString("pt-BR",{maximumFractionDigits:1})} MB baixados</p><small>Última atualização: {new Date(active.updated_at).toLocaleString("pt-BR")}. Se ficar sem atualização por mais de 30 minutos, cancele e inicie uma nova sincronização.</small><p><button disabled={busy} onClick={()=>void send({action:"cancel",id:active.id})}>Cancelar sincronização</button></p></div>}
  <details><summary>Histórico de sincronizações</summary>{jobs.filter(j=>j!==active).map(j=><p key={j.id}><strong>{j.year} · {labels[j.status]}</strong> · {j.scopes.join(" / ")}<br/>{j.message}<br/><small>{new Date(j.updated_at).toLocaleString("pt-BR")} · tarefa {j.id}</small></p>)}</details>
  <p className="electoral-caption">A carga anterior continua disponível até a publicação da atualização. Se o TSE ainda não disponibilizar um recurso no catálogo, o sistema indica a pendência. Sincronizar não reconstrói bairros/RA nem vincula votos individuais.</p>
 </section>;
}
