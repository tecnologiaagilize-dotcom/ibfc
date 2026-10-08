import {readOfficial} from './collector';
export type Step={sequence:number;date:string|null;organ:string;description:string;situation:string;dispatch:string;regime:string;document:string|null};
export function projectId(source:string){const m=/^https:\/\/dadosabertos\.camara\.leg\.br\/api\/v2\/proposicoes\/([1-9][0-9]{0,9})$/.exec(source);if(!m)throw Error('Registro não corresponde a uma proposição oficial da Câmara.');return m[1];}
const text=(x:unknown,max=12000)=>x==null?'':String(x).slice(0,max);
export function officialDocument(value:unknown){if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&['www.camara.leg.br','camara.leg.br','dadosabertos.camara.leg.br'].includes(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export async function collectTramitation(source:string,request:typeof fetch=fetch){
 const id=projectId(source),url=`https://dadosabertos.camara.leg.br/api/v2/proposicoes/${id}/tramitacoes`,raw=await readOfficial(url,request);
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.dados)||!Array.isArray(raw.links))throw Error('Histórico oficial incompatível.');
 if(raw.links.some((x:any)=>x?.rel==='next'))throw Error('Fonte indicou continuação não suportada. Histórico não confirmado como completo.');
 if(raw.dados.length>5000)throw Error('Histórico excede 5.000 movimentos. Consulta não concluída.');
 const steps:Step[]=raw.dados.map((x:any)=>{if(!x||typeof x!=='object'||!Number.isSafeInteger(x.sequencia)||x.sequencia<0)throw Error('Movimento sem sequência oficial válida.');return {sequence:x.sequencia,date:typeof x.dataHora==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(x.dataHora)?x.dataHora:null,organ:text(x.siglaOrgao,100),description:text(x.descricaoTramitacao,2000),situation:text(x.descricaoSituacao,2000),dispatch:text(x.despacho),regime:text(x.regime,500),document:officialDocument(x.url)};});
 steps.sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')||a.sequence-b.sequence);
 return {project_id:id,source:url,steps,raw};
}
