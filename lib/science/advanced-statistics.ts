// Public aggregate results only. These are descriptive methods, not individual-vote inference.
export const ADVANCED_METHOD='ibfc-aggregate-statistics-1.0';
export type AggregateRow={uf:string;municipality:number;zone:number;local:number|null;old_votes:number|null;new_votes:number|null;old_valid:number|null;new_valid:number|null};
const valid=(v:number|null):v is number=>v!==null&&Number.isFinite(v)&&v>=0;
const share=(v:number|null,d:number|null)=>valid(v)&&valid(d)&&d>0&&v<=d?100*v/d:null;
const mean=(a:number[])=>a.reduce((s,x)=>s+x,0)/a.length;
const clamp=(x:number)=>Math.max(0,Math.min(100,x));
export function aggregateDescription(rows:AggregateRow[]){
 const usable=rows.filter(r=>share(r.new_votes,r.new_valid)!==null),votes=usable.reduce((s,r)=>s+r.new_votes!,0),denominator=usable.reduce((s,r)=>s+r.new_valid!,0);
 const hhi=votes>0?usable.reduce((s,r)=>s+(r.new_votes!/votes)**2,0):null;
 const shares=usable.map(r=>share(r.new_votes,r.new_valid)!);
 return {inputRows:rows.length,usableRows:usable.length,excludedRows:rows.length-usable.length,votes,denominator,weightedShare:denominator?100*votes/denominator:null,meanTerritorialShare:shares.length?mean(shares):null,hhi,effectiveTerritories:hhi?1/hhi:null};
}
// All rows in a geographic group stay in the same held-out fold. No row-index splitting.
export function geographicValidation(rows:AggregateRow[]){
 const points=rows.flatMap(r=>{const x=share(r.old_votes,r.old_valid),y=share(r.new_votes,r.new_valid);return x===null||y===null?[]:[{r,x,y,weight:r.new_valid!}];});
 if(points.length<15)return {available:false as const,reason:'São necessários ao menos 15 pares com votos válidos e denominadores positivos.',n:points.length};
 const levels=[['UF',(r:AggregateRow)=>r.uf],['Município',(r:AggregateRow)=>`${r.uf}:${r.municipality}`],['Zona',(r:AggregateRow)=>`${r.uf}:${r.municipality}:${r.zone}`],['Local',(r:AggregateRow)=>r.local===null?'':`${r.uf}:${r.municipality}:${r.zone}:${r.local}`]] as const;
 const level=levels.find(([,key])=>points.every(p=>key(p.r)!=='')&&new Set(points.map(p=>key(p.r))).size>=3);
 if(!level)return {available:false as const,reason:'São necessários ao menos três blocos geográficos distintos. Amplie o recorte.',n:points.length};
 const keys=[...new Set(points.map(p=>level[1](p.r)))].sort(),folds=Math.min(5,keys.length),assignment=new Map(keys.map((key,i)=>[key,i%folds]));
 let abs=0,squared=0,baseline=0,weightedSquared=0,totalWeight=0,tested=0;const foldResults=[];
 for(let f=0;f<folds;f++){
  const train=points.filter(p=>assignment.get(level[1](p.r))!==f),test=points.filter(p=>assignment.get(level[1](p.r))===f);
  if(train.length<10)return {available:false as const,reason:'Um bloco deixa menos de dez territórios para treino; amplie o recorte.',n:points.length};
  const mx=mean(train.map(p=>p.x)),my=mean(train.map(p=>p.y)),variance=train.reduce((s,p)=>s+(p.x-mx)**2,0),slope=variance?train.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/variance:0;
  let foldError=0;for(const p of test){const e=clamp(my+slope*(p.x-mx))-p.y;abs+=Math.abs(e);squared+=e*e;baseline+=(my-p.y)**2;weightedSquared+=p.weight*e*e;totalWeight+=p.weight;foldError+=e*e;tested++;}
  foldResults.push({fold:f+1,train:train.length,test:test.length,rmse:Math.sqrt(foldError/test.length)});
 }
 return {available:true as const,n:tested,excludedRows:rows.length-tested,groupLevel:level[0],groups:keys.length,folds,mae:abs/tested,rmse:Math.sqrt(squared/tested),weightedRmse:Math.sqrt(weightedSquared/totalWeight),baselineRmse:Math.sqrt(baseline/tested),skill:baseline?1-squared/baseline:null,foldResults};
}
export function aggregateScenario(votes:number|null,denominator:number|null,swing:number,volumeChange:number,sensitivity:number){
 const base=share(votes,denominator);if(base===null||![swing,volumeChange,sensitivity].every(Number.isFinite)||Math.abs(swing)>20||Math.abs(volumeChange)>50||sensitivity<0||sensitivity>20)return null;
 const volume=Math.round(denominator!*(1+volumeChange/100)),central=clamp(base+swing),low=clamp(central-sensitivity),high=clamp(central+sensitivity);
 return {volume,share:central,votes:Math.round(volume*central/100),lowVotes:Math.round(volume*low/100),highVotes:Math.round(volume*high/100)};
}
