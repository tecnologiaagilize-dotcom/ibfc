import {PGlite} from '@electric-sql/pglite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table public.admin_profiles(id uuid primary key,role text);insert into auth.users values('00000000-0000-0000-0000-000000000001');insert into admin_profiles values('00000000-0000-0000-0000-000000000001','admin');set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';grant usage on schema auth to authenticated;grant select on admin_profiles to authenticated;`);
await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;grant select on admin_profiles to anon;create policy generic_read on storage.objects for select using(true);create policy generic_update on storage.objects for update using(true) with check(true);create policy generic_delete on storage.objects for delete using(true);`);
for(const file of ['20261009_ibfc_map_and_tse_sync.sql','20261010_ibfc_party_auto_sync.sql','20261011_ibfc_science.sql','20261012_ibfc_science_observatory.sql','20261013_ibfc_map_without_votes.sql','20261014_ibfc_single_year.sql','20261015_ibfc_official_roster.sql','20261016_ibfc_tse_results_json.sql','20261017_ibfc_boletins_secoes.sql']){await db.exec(fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'));console.log('Applied',file);}

const sql=fs.readFileSync(root+'/supabase/migrations/20261026_ibfc_historical_models.sql','utf8');await db.exec(sql);await db.exec(sql);
for(const year of [2014,2018,2022,2026]){
 const id=(await db.query("insert into ibfc_electoral_imports(year,kind,filename,source_url,created_by) values($1,'votes','historical fixture','https://cdn.tse.jus.br/test.zip','00000000-0000-0000-0000-000000000001') returning id",[year])).rows[0].id;
 const job=(await db.query("insert into ibfc_electoral_sync_jobs(year,scopes,national,created_by,status) values($1,array['DF'],true,'00000000-0000-0000-0000-000000000001','completed') returning id",[year])).rows[0].id;
 await db.query('update ibfc_electoral_imports set sync_job=$1 where id=$2',[job,id]);
 const data=[];for(const zone of [1,2])for(const [number,votes] of [['22',10+(year-2014)*2],['13',90-(year-2014)*2]])data.push({year,uf:'DF',municipality_name:'Brasília',municipality:97012,zone,local:1001,section:zone,election:year,turn:1,office:1,number,name:'Candidate '+number,office_name:'Presidente',votes});
 await db.query('select ibfc_electoral_batch($1,$2)',[id,JSON.stringify(data)]);await db.query('select ibfc_electoral_finish($1)',[id]);
}
const targets=[2014,2018,2022,2026].map(year=>({year,uf:'DF',election:year,turn:1,office:1,number:'22',kind:'candidate'}));
const r=(await db.query('select ibfc_science_temporal($1,$2,$3) data',[targets,'municipality',{municipality:97012}])).rows[0].data;
assert.equal(r.series.length,4);assert.equal(r.series[0].data.rows.length,2);assert.equal(r.series[3].data.rows[0].new_valid,100);assert.equal(r.series[0].data.rows[0].new_votes,10);
const cat=(await db.query("select ibfc_science_catalogue('DF') data")).rows[0].data;assert.deepEqual([...new Set(cat.candidates.map(x=>x.year))].sort(),[2014,2018,2022,2026]);
const party=(await db.query('select ibfc_science_temporal($1,$2,$3) data',[targets.map(x=>({...x,kind:'party'})),'state',{}])).rows[0].data;assert.equal(party.series[0].data.rows[0].new_votes,20);
await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[targets.slice(1),'municipality',{}]));
await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[[targets[0],targets[2],targets[3]],'state',{}]));
await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[targets.map(x=>({...x,number:'99'})),'state',{}]));
await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[targets,'state',{section:1}]));
for(const year of [2014,2018]){const requested=(await db.query("select ibfc_electoral_sync_request('start',$1,array['DF']) data",[year])).rows[0].data;assert.equal(requested.existing,false);await db.query("select ibfc_electoral_sync_request('cancel',null,null,$1)",[requested.id]);}
const scheduled=(await db.query("select ibfc_electoral_sync_schedule('00000000-0000-0000-0000-000000000001',array['DF']) data")).rows[0].data;assert.equal((await db.query('select year from ibfc_electoral_sync_jobs where id=$1',[scheduled.id])).rows[0].year,2026);await db.query("select ibfc_electoral_sync_request('cancel',null,null,$1)",[scheduled.id]);
await db.exec('set role authenticated');const staff=(await db.query('select ibfc_science_temporal($1,$2,$3) data',[targets,'state',{}])).rows[0].data;assert.equal(staff.series.length,4);
await db.exec("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000099'");await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[targets,'state',{}]));
await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select ibfc_science_temporal($1,$2,$3)',[targets,'state',{}]));
await db.close();console.log('PASS repeated migration, historical imports/catalogue, candidate/party aggregates, invalid selections, scheduled-year preservation, admin/member/anonymous isolation');
