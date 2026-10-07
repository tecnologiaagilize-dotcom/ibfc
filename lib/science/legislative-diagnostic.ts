export type ProbeResult={reachable:boolean;records:number|null;message:string};
export async function probeOfficial(code:'camara'|'senado',request:typeof fetch=fetch):Promise<ProbeResult>{
 const url=code==='camara'?'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1':'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json';
 try{const response=await request(url,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)return {reachable:false,records:null,message:`Fonte respondeu HTTP ${response.status}.`};const payload=await response.json();
  const data=code==='camara'?payload?.dados:payload?.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar;
  if(!data||typeof data!=='object')return {reachable:false,records:null,message:'Formato da resposta diferente do esperado; revisar o conector.'};
  if(code==='camara'&&!Array.isArray(data))return {reachable:false,records:null,message:'Lista da Câmara em formato inesperado.'};
  return {reachable:true,records:Array.isArray(data)?data.length:1,message:'Consulta de catálogo concluída. Não comprova a coleta de todas as atividades parlamentares.'};
 }catch{return {reachable:false,records:null,message:'Não foi possível consultar a fonte dentro do prazo ou interpretar sua resposta.'};}
}
