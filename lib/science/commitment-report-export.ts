export type CommitmentCounts={total:number;registered:number;in_progress:number;fulfilled:number;unfulfilled:number;cancelled:number;overdue:number;due30:number;without_deadline:number};
export type CommitmentGroup=CommitmentCounts&{candidate_id:string;candidate_name:string;state_uf:string|null;updated_at:string};
export type CommitmentReport={checked_at:string;as_of_date:string;timezone:string;offset:number;page_size:number;total_groups:number;summary:CommitmentCounts;rows:CommitmentGroup[];filters:{candidate_id:string|null;status:string|null;deadline:string;uf:string|null}};
export const commitmentLabels:Record<string,string>={registered:'Registrados',in_progress:'Em andamento',fulfilled:'Cumpridos',unfulfilled:'Não cumpridos',cancelled:'Cancelados'};
function cell(value:unknown){let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function commitmentReportCsv(report:CommitmentReport){
 const header=['Consulta em','Data de referência (Brasília)','Filtro político','Filtro UF','Filtro situação','Filtro prazo','Total de políticos no filtro','Deslocamento da página','ID político','Político','UF','Compromissos','Registrados','Em andamento','Cumpridos','Não cumpridos','Cancelados','Abertos com prazo vencido','Abertos com prazo até 30 dias','Sem prazo','Última atualização'];
 const rows=report.rows.map(r=>[report.checked_at,report.as_of_date,report.filters.candidate_id,report.filters.uf,report.filters.status,report.filters.deadline,report.total_groups,report.offset,r.candidate_id,r.candidate_name,r.state_uf,r.total,r.registered,r.in_progress,r.fulfilled,r.unfulfilled,r.cancelled,r.overdue,r.due30,r.without_deadline,r.updated_at]);
 return '\ufeff'+[header,...rows].map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
