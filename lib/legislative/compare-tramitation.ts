import type {Step} from './tramitation';
const fields=['date','organ','description','situation','dispatch','regime','document'] as const;
export function compareTramitation(before:Step[],after:Step[]){
 const index=(rows:Step[])=>{const m=new Map<number,Step>();for(const row of rows){if(!Number.isSafeInteger(row.sequence)||m.has(row.sequence))return null;m.set(row.sequence,row);}return m;};
 const a=index(before),b=index(after);if(!a||!b)return {comparable:false,reason:'Sequências repetidas ou inválidas impedem comparação inequívoca.',added:[],removed:[],changed:[]};
 return {comparable:true,reason:null,added:after.filter(x=>!a.has(x.sequence)),removed:before.filter(x=>!b.has(x.sequence)),changed:after.flatMap(current=>{const previous=a.get(current.sequence);if(!previous)return [];const changedFields=fields.filter(f=>previous[f]!==current[f]);return changedFields.length?[{sequence:current.sequence,fields:changedFields,previous,current}]:[];})};
}
