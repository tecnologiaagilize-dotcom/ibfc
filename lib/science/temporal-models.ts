/** Public aggregate shares; chronological expanding-window evaluation only. */
export const TEMPORAL_VERSION='ibfc-temporal-1.0';
export type TemporalPoint={key:string;name:string;year:number;votes:number|null;valid:number|null};
export type TemporalModel='persistence'|'linear';
export type TemporalPrediction={key:string;name:string;year:number;actual:number;persistence:number;linear:number;linear_clipped:boolean;train_years:number[]};
export type TemporalMetrics={n:number;mae:number;rmse:number;bias:number};
export type TemporalResult={method_version:string;years:number[];common_territories:number;union_territories:number;excluded_territories:number;excluded_keys:string[];folds:{year:number;train_years:number[];persistence:TemporalMetrics;linear:TemporalMetrics}[];pooled:{persistence:TemporalMetrics;linear:TemporalMetrics};predictions:TemporalPrediction[];projection_year:number;projections:{key:string;name:string;last_share:number;persistence:number;linear:number;linear_clipped:boolean}[];notice:string};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
function forecast(points:{year:number;share:number}[],year:number){
 const origin=points[0].year,x=points.map(p=>p.year-origin),xs=x.reduce((a,b)=>a+b,0)/x.length,ys=points.reduce((a,p)=>a+p.share,0)/points.length;
 const variance=x.reduce((a,v)=>a+(v-xs)**2,0);
 const slope=x.reduce((a,v,i)=>a+(v-xs)*(points[i].share-ys),0)/variance;
 const raw=ys+slope*(year-origin-xs);
 return {persistence:points.at(-1)!.share,linear:clamp(raw),linear_clipped:raw<0||raw>100};
}
function metrics(rows:TemporalPrediction[],model:TemporalModel):TemporalMetrics{
 const errors=rows.map(p=>p[model]-p.actual);
 return {n:errors.length,mae:errors.reduce((a,e)=>a+Math.abs(e),0)/errors.length,rmse:Math.sqrt(errors.reduce((a,e)=>a+e*e,0)/errors.length),bias:errors.reduce((a,e)=>a+e,0)/errors.length};
}
export function temporalModels(points:TemporalPoint[],selectedYears:number[]):TemporalResult{
 const years=[...selectedYears].sort((a,b)=>a-b);
 if(years.length<3||years.length>4||new Set(years).size!==years.length||years.some((y,i)=>![2014,2018,2022,2026].includes(y)||(i>0&&y!==years[i-1]+4)))throw Error('Selecione três ou quatro eleições consecutivas.');
 const territories=new Map<string,Map<number,{year:number;share:number;name:string}>>();const seen=new Set<string>();
 for(const p of points){
  if(!years.includes(p.year)||!p.key)throw Error('Ponto fora da série selecionada.');
  const id=JSON.stringify([p.key,p.year]);if(seen.has(id))throw Error('Território e ano duplicados.');seen.add(id);
  if(!territories.has(p.key))territories.set(p.key,new Map());
  if(p.votes===null||p.valid===null)continue;
  if(!Number.isSafeInteger(p.votes)||!Number.isSafeInteger(p.valid)||p.votes<0||p.valid<0||p.votes>p.valid)throw Error('Votos ou denominador inválidos.');
  if(p.valid===0)continue;
  territories.get(p.key)!.set(p.year,{year:p.year,share:100*p.votes/p.valid,name:p.name});
 }
 const complete=[...territories].filter(([,series])=>years.every(y=>series.has(y))).sort(([a],[b])=>a.localeCompare(b));
 if(!complete.length)throw Error('Nenhum território tem denominador válido em todos os anos. Ausência de dados não equivale a zero voto.');
 const predictions:TemporalPrediction[]=[],folds:TemporalResult['folds']=[];
 for(let index=2;index<years.length;index++){
  const year=years[index],train_years=years.slice(0,index),fold:TemporalPrediction[]=[];
  for(const [key,series] of complete){const predicted=forecast(train_years.map(y=>series.get(y)!),year);fold.push({key,name:series.get(year)!.name,year,actual:series.get(year)!.share,train_years,...predicted});}
  predictions.push(...fold);folds.push({year,train_years,persistence:metrics(fold,'persistence'),linear:metrics(fold,'linear')});
 }
 const projection_year=years.at(-1)!+4;
 const projections=complete.map(([key,series])=>({key,name:series.get(years.at(-1)!)!.name,last_share:series.get(years.at(-1)!)!.share,...forecast(years.map(y=>series.get(y)!),projection_year)}));
 const common=new Set(complete.map(([key])=>key)),excluded_keys=[...territories.keys()].filter(k=>!common.has(k)).sort();
 return {method_version:TEMPORAL_VERSION,years,common_territories:complete.length,union_territories:territories.size,excluded_territories:excluded_keys.length,excluded_keys,folds,pooled:{persistence:metrics(predictions,'persistence'),linear:metrics(predictions,'linear')},predictions,projection_year,projections,notice:'Série curta: apenas '+folds.length+' eleição(ões) de teste temporal. Projeções exploratórias de participação nos votos do cargo, sem intervalo de confiança calibrado. Chaves coincidentes não comprovam fronteiras territoriais estáveis. Não identificam eleitores nem votos individuais.'};
}
