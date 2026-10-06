import {PGlite} from '@electric-sql/pglite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.admin_profiles(id uuid primary key,role text);insert into auth.users values('00000000-0000-0000-0000-000000000001');insert into admin_profiles values('00000000-0000-0000-0000-000000000001','admin');set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';grant usage on schema auth to authenticated;grant select on admin_profiles to authenticated;`);
await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;grant select on admin_profiles to anon;create policy generic_read on storage.objects for select using(true);create policy generic_update on storage.objects for update using(true) with check(true);create policy generic_delete on storage.objects for delete using(true);`);
for(const file of ['20261009_ibfc_map_and_tse_sync.sql','20261010_ibfc_party_auto_sync.sql','20261011_ibfc_science.sql','20261012_ibfc_science_observatory.sql']){await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));console.log('Applied',file);}
await db.exec(fs.readFileSync(root+'/supabase/migrations/20261012_ibfc_science_observatory.sql','utf8'));console.log('Repeat migration safe');
for(const year of [2022,2026]){
 const {rows:[{id}]}=await db.query(`insert into ibfc_electoral_imports(year,kind,filename,source_url,created_by) values($1,'votes','fixture','https://cdn.tse.jus.br/test.zip','00000000-0000-0000-0000-000000000001') returning id`,[year]);
 for(const [uf,mun,name] of [['DF',97012,'Brasília'],['SP',71072,'São Paulo']]){
 const sj=(await db.query(`insert into ibfc_electoral_sync_jobs(year,scopes,national,created_by,status) values($1,array[$2],true,'00000000-0000-0000-0000-000000000001','completed') returning id`,[year,uf])).rows[0];
 await db.query(`update ibfc_electoral_imports set sync_job=$1 where id=$2`,[sj.id,id]);
 const data=[];for(let section=1;section<=2;section++)for(const [office,num,v] of [[1,'22',year===2022?10:20],[1,'13',30],[1,'95',5],[6,'2200',10],[6,'22',3],[6,'1300',5]])data.push({year,uf,municipality_name:name,municipality:mun,zone:1,local:year===2026&&section===2?1002:1001,section,election:year,turn:1,office,number:num,name:'Candidate '+num,office_name:office===1?'Presidente':'Deputado Federal',votes:v});
 await db.query('select ibfc_electoral_batch($1,$2)',[id,JSON.stringify(data)]);
 }
 await db.query('select ibfc_electoral_finish($1)',[id]);
}
const catalogue=(await db.query(`select ibfc_science_catalogue('BR') as data`)).rows[0].data;assert.ok(catalogue.candidates.every(x=>x.uf==='BR'&&x.office===1));
const target=(year,office=1,kind='candidate')=>({uf:'BR',year,election:year,turn:1,office,number:'22',kind});
async function compare(old,newer,scope='country',filters={}){return (await db.query('select ibfc_science_compare($1,$2,$3,$4) as data',[old,newer,scope,filters])).rows[0].data;}
const r=await compare(target(2022),target(2026));assert.equal(r.rows.length,2);assert.equal(r.totals.old_votes,40);assert.equal(r.totals.new_votes,80);assert.equal(r.totals.new_valid,200);assert.equal(r.totals.moved_sections,2);assert.equal(r.totals.common_sections,4);
const o={...target(2022,6,'group'),uf:'SP',numbers:['22','13']},n={...target(2026,6,'group'),uf:'SP',numbers:['22','13']};const g=await compare(o,n,'state');assert.equal(g.totals.new_votes,36);assert.equal(g.totals.new_valid,36);
const loc=await compare({...target(2022),uf:'SP'},{...target(2026),uf:'SP'},'location',{municipality:71072,zone:1,local:1002});assert.equal(loc.rows.length,1);assert.equal(loc.totals.old_votes,10);assert.equal(loc.totals.new_votes,20);
await assert.rejects(()=>compare(target(2022),target(2026,6)));
await db.exec(`update ibfc_science_investigations set title='Revised investigation' where protocol='INV-2026-001'`);assert.equal((await db.query('select count(*)::int n from ibfc_science_versions')).rows[0].n,1);
const cross=(await db.query('select ibfc_science_cross($1,$2,$3,$4) as data',[{...target(2026),uf:'DF'},{...target(2026,6,'party'),uf:'DF'},'state',{}])).rows[0].data;
assert.equal(cross.totals.old_votes,40);assert.equal(cross.totals.new_votes,26);assert.equal(cross.totals.old_valid,100);assert.equal(cross.totals.new_valid,36);
await assert.rejects(()=>db.query('select ibfc_science_cross($1,$2,$3,$4) as data',[{...target(2022),uf:'DF'},{...target(2026,6,'party'),uf:'DF'},'state',{}]));
const snapshot={rows:[{name:'fixture'}],totals:cross.totals};
await db.query("insert into ibfc_science_analyses(method_version,parameters,sources,totals,result_sha256,result_snapshot) values('2.0','{}','[]',$1,$2,$3)",[cross.totals,'a'.repeat(64),snapshot]);
assert.deepEqual((await db.query('select result_snapshot from ibfc_science_analyses')).rows[0].result_snapshot,snapshot);
const inv=(await db.query('select id from ibfc_science_investigations limit 1')).rows[0].id;
await db.query("insert into ibfc_science_evidence(investigation_id,filename,mime_type,bytes,sha256,storage_path) values($1,'fixture.txt','text/plain',10,$2,'private/fixture')",[inv,'b'.repeat(64)]);
await db.exec('set role authenticated');await assert.rejects(()=>db.query("delete from ibfc_science_evidence"));await assert.rejects(()=>db.query("update ibfc_science_analyses set method_version='x'"));await db.exec('reset role');
await db.exec(`insert into storage.objects(bucket_id,name) values('ibfc-science-evidence','private/fixture');set role authenticated;update storage.objects set name='changed';delete from storage.objects;reset role;`);assert.equal((await db.query('select name from storage.objects')).rows[0].name,'private/fixture');
await db.exec("set request.jwt.claim.sub='';set role anon");assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(()=>db.query("select ibfc_science_catalogue('BR')"));await db.exec('reset role');
console.log('PASS national aggregation, valid denominators, groups with legenda, moved local, compatibility, immutable revisions, anonymous denial');await db.close();
