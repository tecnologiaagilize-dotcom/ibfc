import {NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {SCIENCE_VERSION,SCIENCE_BUILD} from '@/lib/science/version';
export const dynamic='force-dynamic';
export async function GET(){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const [catalogue,investigations,evidence,reports,bu]=await Promise.all([
 db.rpc('ibfc_science_catalogue',{p_uf:'DF'}),db.from('ibfc_science_investigations').select('id',{head:true,count:'exact'}),
 db.from('ibfc_science_evidence').select('id',{head:true,count:'exact'}),db.from('ibfc_science_analyses').select('id,result_snapshot').limit(1),db.rpc('ibfc_science_bu_details',{p_target:{uf:'DF',year:2026,election:6257,turn:1,office:1},p_filters:{}})]);
 return NextResponse.json({version:SCIENCE_VERSION,build:SCIENCE_BUILD,commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null,checked_at:new Date().toISOString(),checks:[
 {key:'code',label:'Código Ciência Eleitoral · boletins por seção',ok:true},
 {key:'bu',label:'Migração 20261017 / Boletins por seção e urna',ok:!bu.error},
 {key:'schema',label:'Catálogo e migração 20261011',ok:!catalogue.error},
 {key:'evidence',label:'Migração 20261012 / evidências',ok:!evidence.error},
 {key:'reports',label:'Arquivo de resultados completos',ok:!reports.error},
 {key:'github',label:'Variáveis da Vercel para disparar GitHub',ok:!!process.env.GITHUB_TSE_TOKEN&&!!process.env.GITHUB_TSE_REPOSITORY}],
 coverage:catalogue.data?.coverage??[],counts:{investigations:investigations.count??0,evidence:evidence.count??0},notice:'Esta verificação não lê os Secrets do GitHub nem comprova publicação de todos os dados do TSE.'},{headers:{'Cache-Control':'no-store'}});
}
