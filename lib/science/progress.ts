export function syncProgress(job:{status:string;files_total:number;files_done:number;phase?:string;phase_done?:number;phase_total?:number}){
 if(job.status==='completed')return {value:100,label:'100% · Publicado',description:'Arquivos preparados e carga publicada no banco.'};
 if(job.status==='queued')return {value:0,label:'0% · Aguardando início',description:'A barra em movimento indica espera. O importador ainda não assumiu a tarefa; não há download confirmado.'};
 if(job.status==='running'&&job.files_total>0){
  const ratio=job.phase_total&&job.phase_total>0?Math.max(0,Math.min(1,(job.phase_done??0)/job.phase_total)):0;
  const part=job.phase==='download'?.35*ratio:job.phase==='parse'?.35+.6*ratio:0;
  const value=Math.min(99,Math.max(0,Math.floor((job.files_done+part)/job.files_total*99)));
  return {value,label:`${value}% · ${job.phase==='download'?'Baixando':job.phase==='parse'?'Lendo e importando':'Preparando'} · ${job.files_done}/${job.files_total} arquivos`,description:'Progresso operacional: arquivos com peso igual; download 35% e leitura do CSV 60% de cada arquivo. Bytes lidos podem incluir buffer. 100% somente após publicação; não estima tempo restante.'};
 }
 return {value:null,label:job.status==='running'?'Consultando catálogo oficial…':'Processamento encerrado',description:'Ainda sem total de arquivos conhecido para calcular o percentual.'};
}
