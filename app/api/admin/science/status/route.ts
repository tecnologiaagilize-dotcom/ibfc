import {boundedProbe,probeDetails,reportSampleState} from '@/lib/science/installation-check';
import {NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {SCIENCE_VERSION,SCIENCE_BUILD} from '@/lib/science/version';
export const dynamic='force-dynamic';
export async function GET(){
 const {db,allowed}=await electoralStaff();if(!allowed)return NextResponse.json({error:'Acesso administrativo necessário.'},{status:403});
 const results=await Promise.all([
 db.rpc('ibfc_science_catalogue',{p_uf:'DF'}),db.from('ibfc_science_investigations').select('id',{head:true,count:'exact'}),
 db.from('ibfc_science_evidence').select('id',{head:true,count:'exact'}),db.from('ibfc_science_analyses').select('id,result_snapshot').limit(1),db.rpc('ibfc_science_bu_details',{p_target:{uf:'DF',year:2026,election:6257,turn:1,office:1},p_filters:{}}),db.rpc('ibfc_science_zone_layers',{p_uf:'DF',p_year:2026,p_turn:1,p_office:1,p_target:null,p_filters:{}}),
 db.from('ibfc_legislative_runs').select('id',{head:true,count:'exact'}),db.from('ibfc_legislative_schedules').select('id',{head:true,count:'exact'}),db.from('ibfc_tramitation_snapshots').select('id',{head:true,count:'exact'}),db.rpc('ibfc_legislative_report',{p_offset:0}),db.rpc('ibfc_legislative_notices',{p_offset:0}),db.from('ibfc_public_commitments').select('id',{head:true,count:'exact'}),db.rpc('ibfc_commitment_report',{p_offset:0}),db.rpc('ibfc_commitment_agenda_list',{p_offset:0})].map(query=>boundedProbe(query)));
 const [catalogue,investigations,evidence,reports,bu,zones,legislative,schedules,snapshots,legislativeReport,notices,commitments,commitmentReport,agenda]=results;
 return NextResponse.json({version:SCIENCE_VERSION,build:SCIENCE_BUILD,commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null,checked_at:new Date().toISOString(),checks:[
 {key:'code',label:'Código Ciência Eleitoral · camadas de zonas',ok:true},
 {key:'zones',label:'Migração 20261018 / camadas de zonas',ok:!zones.error},
 {key:'bu',label:'Migração 20261017 / Boletins por seção e urna',ok:!bu.error},
 {key:'schema',label:'Catálogo e migração 20261011',ok:!catalogue.error},
 {key:'evidence',label:'Migração 20261012 / evidências',ok:!evidence.error},
 {key:'reports',label:'Arquivo de resultados completos',ok:!reports.error},
 {key:'legislative',label:'Observatório legislativo',ok:!legislative.error,migration:'20261025_ibfc_legislative_observatory.sql'},
 {key:'schedules',label:'Coletas legislativas em segundo plano — estrutura',ok:!schedules.error,migration:'20261027_ibfc_legislative_background.sql'},
 {key:'snapshots',label:'Arquivo de tramitações',ok:!snapshots.error,migration:'20261028_ibfc_tramitation_archive.sql'},
 {key:'legislative_report',label:'Relatório legislativo',ok:!legislativeReport.error,migration:'20261029_ibfc_legislative_report.sql'},
 {key:'notices',label:'Central de acompanhamento',ok:!notices.error,migration:'20261030_ibfc_legislative_notices.sql'},
 {key:'commitments',label:'Cadastro de compromissos públicos — estrutura',ok:!commitments.error,migration:'20261031_ibfc_public_commitments.sql'},
 {key:'commitment_report',label:'Painel de compromissos',ok:!commitmentReport.error,migration:'20261101_ibfc_commitment_report.sql'},
 {key:'agenda',label:'Agenda de revisões',ok:!agenda.error,migration:'20261102_ibfc_commitment_agenda.sql'},
 {key:'github',label:'Variáveis da Vercel para disparar GitHub',ok:!!process.env.GITHUB_TSE_TOKEN&&!!process.env.GITHUB_TSE_REPOSITORY}],
 diagnostics:probeDetails(results),archive_sample:reportSampleState(reports.data),production_validated:false,coverage:(catalogue.data as {coverage?:unknown[]}|null)?.coverage??[],counts:{investigations:investigations.error?null:investigations.count??0,evidence:evidence.error?null:evidence.count??0},notice:'Esta verificação consulta estruturas e funções com sua conta, com limite de espera de 12 segundos por consulta. Disponível significa que a consulta respondeu sem erro; não confirma conteúdo ou homologação. Ausência de amostra de relatório não significa erro de instalação. Uma pendência pode indicar migração ausente, permissão ou indisponibilidade. Não lê os Secrets do GitHub nem comprova execução do worker, conexão com instituições ou cobertura dos dados.'},{headers:{'Cache-Control':'no-store'}});
}
