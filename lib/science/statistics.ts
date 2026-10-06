export function association(rows:{old_votes:number|null;new_votes:number|null;old_valid:number|null;new_valid:number|null}[]){
 const pairs=rows.filter(r=>r.old_votes!==null&&r.new_votes!==null&&(r.old_valid??0)>0&&(r.new_valid??0)>0).map(r=>[r.old_votes!/r.old_valid!*100,r.new_votes!/r.new_valid!*100]);
 const n=pairs.length;if(n<3)return {n,r:null};const mx=pairs.reduce((s,p)=>s+p[0],0)/n,my=pairs.reduce((s,p)=>s+p[1],0)/n;
 const xx=pairs.reduce((s,p)=>s+(p[0]-mx)**2,0),yy=pairs.reduce((s,p)=>s+(p[1]-my)**2,0),xy=pairs.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
 return {n,r:xx&&yy?xy/Math.sqrt(xx*yy):null};
}
// Held-out alternating territorial rows: exploratory association, not geographically independent folds or a future forecast.
export function validateBaseline(rows:{old_votes:number|null;new_votes:number|null;old_valid:number|null;new_valid:number|null}[]){
 const points=rows.filter(r=>r.old_votes!==null&&r.new_votes!==null&&(r.old_valid??0)>0&&(r.new_valid??0)>0).map(r=>[r.old_votes!/r.old_valid!*100,r.new_votes!/r.new_valid!*100]);
 if(points.length<15)return null;let error=0,baseline=0,absolute=0,n=0;
 for(let fold=0;fold<5;fold++){const train=points.filter((_,i)=>i%5!==fold),test=points.filter((_,i)=>i%5===fold),mx=train.reduce((s,p)=>s+p[0],0)/train.length,my=train.reduce((s,p)=>s+p[1],0)/train.length;
  const variance=train.reduce((s,p)=>s+(p[0]-mx)**2,0);const slope=variance?train.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0)/variance:0;
  for(const [x,y] of test){const prediction=Math.max(0,Math.min(100,my+slope*(x-mx)));error+=(prediction-y)**2;absolute+=Math.abs(prediction-y);baseline+=(my-y)**2;n++;}}
 return {n,folds:5,mae:absolute/n,rmse:Math.sqrt(error/n),baselineRmse:Math.sqrt(baseline/n),skill:baseline?1-error/baseline:null};
}
export const STATUS:Record<string,string>={insufficient:'Dados insuficientes',review:'Aguardando verificação',explained:'Explicado pela composição dos dados',confirmed:'Inconsistência técnica confirmada',followup:'Investigação complementar',closed:'Encerrado com relatório'};
