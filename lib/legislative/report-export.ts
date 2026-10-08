export function csvCell(value:unknown){let s=value==null?'':String(value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function legislativeCsv(report:{generated_at:string;rows:Record<string,any>[]}){
 const headers=['Gerado em','Candidato','UF','Instituição','Código oficial','Categoria','Registros coletados','Primeira data publicada','Última data publicada','Sem data','Atualização mais antiga dos registros','Atualização mais recente dos registros','Coletas em estado de falha','Coletas em estado parcial','Situação da última coleta','Início da janela da última coleta','Fim da janela da última coleta','Projetos com arquivo','Versões arquivadas','Votos publicados (contagens de registros)'];
 const rows=report.rows.map(r=>[report.generated_at,r.candidate_name,r.state_uf,r.provider,r.external_id,r.category,r.records,r.first_event,r.last_event,r.undated,r.oldest_record_refresh,r.last_record_refresh,r.failed_runs,r.partial_runs,r.latest_status,r.latest_run_start,r.latest_run_end,r.archived_projects,r.archived_versions,JSON.stringify(r.votes)]);
 return '\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
}
