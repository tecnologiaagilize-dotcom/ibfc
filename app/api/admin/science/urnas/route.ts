import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {UFS} from '@/lib/science/territory';
export const dynamic='force-dynamic';
export const maxDuration=60;
const base='https://resultados.tse.jus.br/oficial/';
type Config={f:string;pl:{cd:string;c:string;e:{cd:string}[]}[]};
type Sections={f:string;cdp:string;abr:{cd:string;mu:{cd:string;zon:{cd:string;sec:{ns:string;nsp?:string;nsa?:string[]}[]}[]}[]}[]};
type Aux={f:string;st:string;hashes:{hash:string;st:string;dr:string;hr:string;arq:{nm:string;tp:string}[]}[]};
async function official<T>(path:string):Promise<T>{
 const r=await fetch(base+path,{next:{revalidate:900},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!r.ok)throw Error(r.status===404?'Arquivo ainda não publicado pelo TSE.':`TSE respondeu HTTP ${r.status}.`);
 const reader=r.body?.getReader();if(!reader)throw Error('Resposta vazia do TSE.');const chunks:Uint8Array[]=[];let total=0;
 while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>24*1024*1024){await reader.cancel();throw Error('Arquivo oficial excede o limite de leitura.');}chunks.push(value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}
export async function GET(r:NextRequest){
 const {allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const q=r.nextUrl.searchParams,uf=q.get('uf')??'',election=q.get('election')??'',municipality=q.get('municipality')??'',zone=q.get('zone')??'',section=q.get('section');
 if(!UFS.includes(uf)||![election,municipality,zone].every(x=>/^\d{1,6}$/.test(x)&&Number(x)>0)||section!==null&&!/^\d{1,4}$/.test(section))return NextResponse.json({error:'Selecione UF, eleição, município e zona válidos.'},{status:400});
 try{
  const cfg=await official<Config>('comum/config/ele-c.json');if(cfg.f!=='o')throw Error('Configuração fora do ambiente oficial.');
  const p=cfg.pl.find(p=>p.c==='ele2026'&&p.e.some(e=>e.cd===election));if(!p)throw Error('Eleição de 2026 não encontrada na configuração oficial.');
  const lower=uf.toLowerCase(),mu=municipality.padStart(5,'0'),zn=zone.padStart(4,'0'),pleito=p.cd.padStart(6,'0');
  const inventory=await official<Sections>(`${p.c}/arquivo-urna/${p.cd}/config/${lower}/${lower}-p${pleito}-cs.json`);
  if(inventory.f!=='o'||Number(inventory.cdp)!==Number(p.cd))throw Error('Inventário de seções diverge do pleito.');
  const list=inventory.abr.find(a=>a.cd===lower)?.mu.find(m=>Number(m.cd)===Number(mu))?.zon.find(z=>Number(z.cd)===Number(zn))?.sec??[];
  if(section===null)return NextResponse.json({sections:list,status:'Inventário oficial de seções',pleito:p.cd});
  if(!list.some(s=>Number(s.ns)===Number(section)))return NextResponse.json({error:'Seção não consta no inventário oficial desta zona.'},{status:404});
  const sn=section.padStart(4,'0'),dir=`${p.c}/arquivo-urna/${p.cd}/dados/${lower}/${mu}/${zn}/${sn}/`;
  const aux=await official<Aux>(dir+`p${pleito}-${lower}-m${mu}-z${zn}-s${sn}-aux.json`);if(aux.f!=='o')throw Error('Arquivo de urna de simulado recusado.');
  const files=aux.hashes.flatMap(h=>{if(!/^[a-f0-9]{32,128}$/i.test(h.hash))throw Error('Hash de arquivo inválido.');return h.arq.map(a=>{if(!/^[a-zA-Z0-9_.-]+$/.test(a.nm))throw Error('Nome de arquivo inválido.');return {name:a.nm,type:a.tp,status:h.st,hash:h.hash,received_at:h.dr+' '+h.hr,url:base+dir+h.hash+'/'+a.nm};});});
  return NextResponse.json({sections:list,status:aux.st,files,pleito:p.cd});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível consultar os arquivos do TSE.'},{status:502});}
}
