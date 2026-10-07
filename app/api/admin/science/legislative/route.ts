import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {probeOfficial} from '@/lib/science/legislative-diagnostic';
export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(r:NextRequest){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});if(r.headers.get('origin')!==r.nextUrl.origin)return NextResponse.json({error:'Origem inválida.'},{status:403});
 const {data:providers,error}=await db.from('mfb_public_data_providers').select('id,code,active').in('code',['camara','senado']);
 const rows=await Promise.all((['camara','senado'] as const).map(async code=>{
  const provider=providers?.find(p=>p.code===code);const probe=await probeOfficial(code);
  if(error||!provider)return {code,probe,configured:false,active:false,identities:null,latest:null,database_message:error?'Estrutura de dados legislativos indisponível. Confira a migração de restauração 20260925.':'Provedor ausente no banco.'};
  const [identities,runs]=await Promise.all([db.from('candidate_external_identities').select('id',{count:'exact',head:true}).eq('provider_id',provider.id),db.from('mfb_public_data_sync_runs').select('id,status,started_at,finished_at,records_found,records_errors').eq('provider_id',provider.id).order('created_at',{ascending:false}).limit(1)]);
  return {code,probe,configured:true,active:provider.active,identities:identities.error?null:identities.count,latest:runs.error?null:runs.data?.[0]??null,database_message:identities.error||runs.error?'Vínculos ou histórico indisponíveis: confira migração e permissões.':null};
 }));return NextResponse.json({checked_at:new Date().toISOString(),rows},{headers:{'Cache-Control':'no-store'}});
}
