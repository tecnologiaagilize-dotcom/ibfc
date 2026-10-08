// Isolated official-source console. Responses are retained raw until the live schema is validated.
export const CLDF_BASE='https://ple.cl.df.gov.br/pleservico/api/public';
export type CldfQuery={action:'catalogue'|'search'|'project'|'authors'|'tramitation'|'documents';project_id?:string;author?:string;year?:string;start_on?:string;end_on?:string;page?:number};
export class CldfError extends Error{upstreamStatus:number|null;constructor(message:string,upstreamStatus:number|null=null){super(message);this.upstreamStatus=upstreamStatus;}}
const validDay=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function cldfRequest(input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new CldfError('Pedido inválido.');const q=input as CldfQuery;
 if(q.action==='catalogue')return {url:CLDF_BASE+'/autor/listar',method:'GET',body:null};
 if(q.action==='search'){
  if(!Number.isSafeInteger(q.page??0)||(q.page??0)<0||(q.page??0)>999)throw new CldfError('Página inválida.');
  if(q.author!=null&&(typeof q.author!=='string'||q.author.length>150))throw new CldfError('Nome de autoria inválido.');
  if(q.year!=null&&q.year!==''&&(typeof q.year!=='string'||!/^20\d{2}$/.test(q.year)))throw new CldfError('Use um ano entre 2000 e 2099.');
  for(const d of [q.start_on,q.end_on])if(d!=null&&d!==''&&(typeof d!=='string'||!validDay(d)))throw new CldfError('Data inválida.');
  if(Boolean(q.start_on)!==Boolean(q.end_on))throw new CldfError('Informe as duas datas ou deixe ambas em branco.');
  if(q.start_on&&q.end_on&&(q.start_on>q.end_on||(Date.parse(q.end_on)-Date.parse(q.start_on))/86400000>365))throw new CldfError('Use intervalo de até 366 dias.');
  if(!q.author?.trim()&&!q.year&&!q.start_on)throw new CldfError('Informe autoria, ano ou período para limitar a consulta.');
  const body:Record<string,unknown>={ementa:true};if(q.author?.trim())body.autoria=q.author.trim();if(q.year)body.ano=q.year;if(q.start_on){body.dataInicio=q.start_on;body.dataFim=q.end_on;}
  return {url:CLDF_BASE+'/proposicao/filter?'+new URLSearchParams({page:String(q.page??0),size:'20',sort:'dataLeitura,DESC'}),method:'POST',body};
 }
 if(!['project','authors','tramitation','documents'].includes(q.action)||typeof q.project_id!=='string'||!/^[1-9][0-9]{0,9}$/.test(q.project_id))throw new CldfError('Informe o identificador da proposição no PLE.');
 const suffix={project:'',authors:'/autores',tramitation:'/tramitacoes',documents:'/documentos'}[q.action as 'project'|'authors'|'tramitation'|'documents'];
 return {url:CLDF_BASE+'/proposicao/'+q.project_id+suffix,method:'GET',body:null};
}
export async function queryCldf(input:unknown,request:typeof fetch=fetch){
 const query=cldfRequest(input),started=Date.now();let response:Response;
 try{response=await request(query.url,{method:query.method,headers:{Accept:'application/json',...(query.body?{'Content-Type':'application/json'}:{})},body:query.body?JSON.stringify(query.body):undefined,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw new CldfError('Não foi possível alcançar o PLE/CLDF nesta consulta. Tente novamente ou consulte o portal oficial.');}
 if(!response.ok)throw new CldfError(`PLE/CLDF respondeu HTTP ${response.status}. Nenhum dado foi importado.`,response.status);
 if(!response.headers.get('content-type')?.toLowerCase().includes('json'))throw new CldfError('A fonte não retornou JSON. Nenhum dado foi importado.',response.status);
 if(Number(response.headers.get('content-length'))>4000000||!response.body)throw new CldfError('Resposta ausente ou acima de 4 MB.');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000){await reader.cancel();throw new CldfError('Resposta acima de 4 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new CldfError('JSON oficial inválido.');}
 if(!raw||typeof raw!=='object')throw new CldfError('Resposta JSON sem estrutura consultável.');
 return {source:query.url,method:query.method,filters:query.body,raw,bytes:size,elapsed_ms:Date.now()-started,upstream_status:response.status,checked_at:new Date().toISOString(),schema_validated:false,candidate_binding_validated:false};
}
