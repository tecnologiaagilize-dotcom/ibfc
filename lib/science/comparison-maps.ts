import type {ComparisonColumn} from './multi-comparison';
import type {LocalComparison} from '../electoral/types';
export type ComparisonMetric='votes'|'share';
export function geographicPositions(columns:ComparisonColumn[]):[number,number][]{
 const positions=new Map<string,[number,number]>();for(const c of columns)for(const row of c.report.rows){if(row.latitude==null||row.longitude==null||!Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||Math.abs(row.latitude)>90||Math.abs(row.longitude)>180)continue;positions.set(row.latitude+':'+row.longitude,[row.latitude,row.longitude]);}return [...positions.values()];
}
export function pairMapData(columns:ComparisonColumn[],left:number,right:number,metric:ComparisonMetric){
 if(!Number.isInteger(left)||!Number.isInteger(right)||left<0||right<0||left>=columns.length||right>=columns.length||left===right)throw Error('Escolha duas seleções diferentes.');
 const selected=[columns[left],columns[right]];const value=(votes:number|null,valid:number|null)=>metric==='votes'?votes:votes!==null&&valid!==null&&valid>0?100*votes/valid:null;
 const max=Math.max(0,...selected.flatMap(c=>c.report.rows.map(row=>value(row.new_votes,row.new_valid)??0)));
 const maps=selected.map((c,index)=>c.report.rows.map(row=>{const v=value(row.new_votes,row.new_valid);return {...row,granularity:c.report.granularity,address:row.address??'',sections:[row],marker_color:v===null?'#64748b':index===0?'#2165b5':'#c63438',marker_radius:v===null||v===0?6:6+24*Math.sqrt(v/(max||1)),marker_caption:`${c.target.name} · ${row.new_votes===null?'Sem dados':row.new_votes.toLocaleString('pt-BR')+' votos'} · ${row.new_valid===null?'Denominador ausente':'Denominador '+row.new_valid.toLocaleString('pt-BR')} · ${metric==='share'?(v===null?'Participação não calculável':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'):'Área proporcional aos votos'}`};}));
 return {maps:maps as (LocalComparison&{marker_color:string;marker_radius:number;marker_caption:string})[][],positions:geographicPositions(selected),max,selected};
}
