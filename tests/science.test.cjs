require('./electoral.test.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {syncProgress}=require('../lib/science/progress.ts');
const {association,validateBaseline}=require('../lib/science/statistics.ts');
test('queue remains zero and never claims time-based progress',()=>{assert.equal(syncProgress({status:'queued',files_done:0,files_total:0}).value,0);assert.equal(syncProgress({status:'running',files_done:4,files_total:4}).value,99);assert.equal(syncProgress({status:'completed',files_done:4,files_total:4}).value,100);});
test('statistics exclude missing and zero denominators',()=>{const valid=Array.from({length:20},(_,i)=>({old_votes:i+10,new_votes:2*(i+10),old_valid:100,new_valid:100}));assert.ok(Math.abs(association(valid).r-1)<1e-10);assert.equal(validateBaseline(valid).n,20);assert.ok(validateBaseline(valid).rmse<1e-10);assert.equal(validateBaseline(valid.slice(0,14)),null);assert.equal(association([{old_votes:1,new_votes:2,old_valid:0,new_valid:100}]).n,0);});
test('constant territorial participation does not create correlation',()=>{assert.equal(association(Array(20).fill({old_votes:10,new_votes:20,old_valid:100,new_valid:100})).r,null);assert.equal(validateBaseline(Array(20).fill({old_votes:10,new_votes:20,old_valid:100,new_valid:100})).skill,null);});

const {canonicalJson}=require('../lib/science/integrity.ts');
test('canonical result hash does not depend on JSONB property ordering',()=>assert.equal(canonicalJson({z:2,a:{y:1,x:0}}),canonicalJson({a:{x:0,y:1},z:2})));
test('operational progress changes with actual download/read bytes and cannot publish early',()=>{
 const base={status:'running',files_done:0,files_total:2,phase_total:100};
 const start=syncProgress({...base,phase:'download',phase_done:0}).value;
 const downloaded=syncProgress({...base,phase:'download',phase_done:100}).value;
 const parsed=syncProgress({...base,phase:'parse',phase_done:100}).value;
 assert.equal(start,0);assert.ok(downloaded>start);assert.ok(parsed>downloaded);assert.ok(parsed<100);
});
