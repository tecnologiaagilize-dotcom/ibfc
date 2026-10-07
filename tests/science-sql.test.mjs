import {PGlite} from '@electric-sql/pglite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.admin_profiles(id uuid primary key,role text);insert into auth.users values('00000000-0000-0000-0000-000000000001');insert into admin_profiles values('00000000-0000-0000-0000-000000000001','admin');set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';grant usage on schema auth to authenticated;grant select on admin_profiles to authenticated;`);
await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;grant select on admin_profiles to anon;create policy generic_read on storage.objects for select using(true);create policy generic_update on storage.objects for update using(true) with check(true);create policy generic_delete on storage.objects for delete using(true);`);
for(const file of ['20261009_ibfc_map_and_tse_sync.sql','20261010_ibfc_party_auto_sync.sql','20261011_ibfc_science.sql','20261012_ibfc_science_observatory.sql','20261013_ibfc_map_without_votes.sql','20261014_ibfc_single_year.sql','20261015_ibfc_official_roster.sql','20261016_ibfc_tse_results_json.sql']){await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));console.log('Applied',file);}
await db.exec(fs.readFileSync(root+'/supabase/IBFC_IMPORTAR_CANDIDATOS_2026_DF_GO.sql','utf8'));
await db.exec(fs.readFileSync(root+'/supabase/IBFC_IMPORTAR_CANDIDATOS_2026_DF_GO.sql','utf8'));
assert.equal((await db.query('select count(*)::int n from ibfc_science_candidate_roster')).rows[0].n,1520);
const roster=(await db.query("select ibfc_science_catalogue('DF') data")).rows[0].data;
assert.equal(roster.candidates.length,643);assert.ok(roster.candidates.every(x=>x.results_available===false));
assert.equal(roster.candidates.filter(x=>x.number==='3535'&&x.office===6).length,2);
await db.exec('set role authenticated');await assert.rejects(()=>db.query("delete from ibfc_science_candidate_roster"));await db.exec('reset role');
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
await db.exec(`insert into ibfc_electoral_imports(id,kind,year,filename,source_url,status,created_by) values('00000000-0000-0000-0000-000000000010','locations',2026,'locations fixture','https://cdn.tse.jus.br/test.zip','completed','00000000-0000-0000-0000-000000000001');insert into ibfc_electoral_locations(import_id,year,uf,municipality,municipality_name,zone,local,name,address) values('00000000-0000-0000-0000-000000000010',2026,'DF',97012,'Brasília',1,1001,'Escola sem votos','Endereço');`);
const locations=(await db.query("select ibfc_science_locations('DF','{}') data")).rows[0].data;assert.equal(locations.total_rows,1);assert.equal(locations.rows[0].name,'Escola sem votos');assert.equal(locations.rows[0].latitude,null);assert.equal((await db.query("select ibfc_science_locations('DF','{\"zone\":2}') data")).rows[0].data.total_rows,0);
const single=(await db.query('select ibfc_science_current($1,$1,$2,$3) data',[{uf:'DF',year:2026,election:2026,turn:1,office:6,number:'2200',kind:'candidate'},'state',{}])).rows[0].data;assert.equal(single.totals.new_votes,20);assert.equal(single.totals.old_votes,null);assert.equal(single.rows[0].old_valid,null);
const nationalSingle=(await db.query('select ibfc_science_current($1,$1,$2,$3) data',[{uf:'BR',year:2026,election:2026,turn:1,office:1,number:'22',kind:'candidate'},'country',{}])).rows[0].data;assert.equal(nationalSingle.totals.new_votes,80);
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

await db.exec(fs.readFileSync(root+'/supabase/migrations/20261016_ibfc_tse_results_json.sql','utf8'));
const real=JSON.parse(fs.readFileSync(root+'/tests/fixtures/tse-zone-public.json','utf8'));
const sj=(await db.query("insert into ibfc_electoral_sync_jobs(year,scopes,created_by,status,worker_token,files_total) values(2026,array['DF'],'00000000-0000-0000-0000-000000000001','running','test-zone-token',1) returning id")).rows[0].id;
async function zoneWorker(action,data={}){return(await db.query('select ibfc_electoral_sync_worker($1,$2,$3,$4) data',[action,sj,'test-zone-token',data])).rows[0].data;}
const imp=(await zoneWorker('start_zone',{filename:'EA20 real sample',source_url:real.source_url})).import_id;
await zoneWorker('zone_batch',{import_id:imp,rows:[real]});await zoneWorker('zone_batch',{import_id:imp,rows:[real]});
assert.equal((await db.query('select count(*)::int n from ibfc_science_latest_zones')).rows[0].n,0,'Unpublished results invisible');
await assert.rejects(()=>zoneWorker('ready_zone',{import_id:imp,expected_files:2}));
await zoneWorker('ready_zone',{import_id:imp,expected_files:1});await zoneWorker('finish');
const zcat=(await db.query("select ibfc_science_catalogue('DF') data")).rows[0].data;
const zt={...zcat.candidates.find(x=>x.election===6257&&x.number==='22'),kind:'candidate'};
assert.equal(zt.results_available,true);assert.equal(zt.result_granularity,'zone');assert.equal(zcat.candidates.filter(x=>x.election===6257&&x.number==='22').length,1);
const zr=(await db.query('select ibfc_science_zone_analysis($1,$1,$2,$3) data',[zt,'municipality',{municipality:97012}])).rows[0].data;
assert.equal(zr.totals.new_votes,26996);assert.equal(zr.totals.new_valid,61750);assert.equal(zr.totals.old_votes,null);assert.equal(zr.rows[0].new_sections,281);assert.equal(zr.rows[0].local,null);assert.equal(zr.rows[0].section,0);
const zh=(await db.query('select ibfc_science_zone_analysis($1,$2,$3,$4) data',[{...target(2022),uf:'DF'},zt,'municipality',{}])).rows[0].data;assert.equal(zh.totals.old_votes,20);assert.equal(zh.totals.new_votes,26996);
await assert.rejects(()=>db.query('select ibfc_science_zone_analysis($1,$1,$2,$3)',[zt,'location',{}]));
await assert.rejects(()=>db.query('select ibfc_science_zone_analysis($1,$1,$2,$3)',[zt,'state',{common_only:true}]));
await db.exec('set role authenticated');await assert.rejects(()=>zoneWorker('zone_batch',{import_id:imp,rows:[real]}));await db.exec('reset role');
console.log('PASS real EA20 zone totals, idempotent staging, atomic publication, roster replacement, 2022 comparison, no fictional sections');
await db.exec("set request.jwt.claim.sub='';set role anon");assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(()=>db.query("select ibfc_science_locations('DF','{}')"));await assert.rejects(()=>db.query("select ibfc_science_catalogue('BR')"));await db.exec('reset role');
console.log('PASS national aggregation, valid denominators, groups with legenda, moved local, compatibility, immutable revisions, anonymous denial');await db.close();
