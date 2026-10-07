import {NextRequest,NextResponse} from 'next/server';
import {electoralStaff} from '@/lib/electoral/auth';
import {UFS} from '@/lib/science/territory';
import {EMPTY_REPORT_FILTERS,validateReportFilters,type ReportFilters} from '@/lib/community/reports';
export const dynamic='force-dynamic';
export const maxDuration=60;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(r:NextRequest){const {db,allowed}=await electoralStaff();if(!allowed)return reply({error:'Acesso administrativo necessário.'},403);const filters={...EMPTY_REPORT_FILTERS};for(const k of Object.keys(filters) as (keyof ReportFilters)[])filters[k]=r.nextUrl.searchParams.get(k)?.trim()??'';const problem=validateReportFilters(filters);if(problem||(filters.uf&&!UFS.includes(filters.uf)))return reply({error:problem??'UF inválida.'},400);const {data,error}=await db.rpc('ibfc_community_report',{p_filters:filters});if(error)return reply({error:'Não foi possível gerar. Confira a migração 20261022_ibfc_community_reports.sql e as permissões.'},503);return reply(data);}
