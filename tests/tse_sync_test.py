import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch
import zipfile

spec=importlib.util.spec_from_file_location('tse_sync',Path(__file__).resolve().parents[1]/'scripts/tse_sync.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def resource(target,kind='votes'):
 return {'name': 'Eleitorado por local de votação - 2022' if kind=='locations' else target+' - Votação por seção eleitoral - 2022', 'url': 'https://cdn.tse.jus.br/estatistica/'+('locations.zip' if kind=='locations' else 'votacao_secao_2022_'+target+'.zip')}

class Tests(unittest.TestCase):
 def test_discovery_and_missing_publication(self):
  fetch=lambda year,kind:[resource('DF'),resource('GO'),resource('BR')] if kind=='votes' else [resource('',kind)]
  tasks,missing=m.plan(2022,['DF','GO'],fetch)
  self.assertEqual(len(tasks),4);self.assertEqual(missing,[])
  tasks,missing=m.plan(2026,['DF'],lambda y,k:None)
  self.assertEqual(tasks,[]);self.assertEqual(len(missing),2)
 def test_discovery_fallback_uf_label_and_explicit_missing_reason(self):
  def fetch(year,kind):
   return [{'name':'DF - Votação por seção eleitoral - 2026','url':'https://cdn.tse.jus.br/estatistica/arquivo_atualizado.zip'}] if kind=='votes' else []
  tasks,missing=m.plan(2026,['DF'],fetch);self.assertEqual(len(tasks),1);self.assertEqual(tasks[0]['target'],'DF');self.assertTrue(any('não localizado' in x for x in missing))
 def test_ambiguous_resource_and_malicious_redirect(self):
  tasks,missing=m.plan(2022,['DF'],lambda y,k:[resource('DF'),resource('DF')] if k=='votes' else [])
  self.assertEqual(tasks,[]);self.assertTrue(missing)
  for url in ['http://cdn.tse.jus.br/x.zip','https://cdn.tse.jus.br.evil.test/x.zip','https://a:b@cdn.tse.jus.br/x.zip','https://cdn.tse.jus.br:8080/x.zip']:
   with self.assertRaises(ValueError):m.official_url(url)
 def test_year_geography_and_null_coordinates(self):
  row=dict(SG_UF='GO',NM_MUNICIPIO='PADRE BERNARDO',ANO_ELEICAO='2022',CD_MUNICIPIO='12345',NR_ZONA='1',NR_LOCAL_VOTACAO='1001',NM_LOCAL_VOTACAO='Escola',NR_LATITUDE='-15,16',NR_LONGITUDE='-48,28')
  self.assertEqual(m.normalize(row,'locations',2022,['GO'],m.coverage())['latitude'],-15.16)
  self.assertIsNone(m.normalize(dict(row,NM_MUNICIPIO='GOIANIA'),'locations',2022,['GO'],m.coverage()))
  with self.assertRaises(ValueError):m.normalize(row,'locations',2026,['GO'],m.coverage())
  self.assertIsNone(m.normalize(dict(row,NR_LONGITUDE='#NULO'),'locations',2022,['GO'],m.coverage())['latitude'])
 def test_worker_download_parse_and_stage_full_lifecycle(self):
  text='SG_UF;NM_MUNICIPIO;ANO_ELEICAO;CD_MUNICIPIO;NR_ZONA;NR_LOCAL_VOTACAO;CD_ELEICAO;NR_TURNO;CD_CARGO;DS_CARGO;NR_SECAO;NR_VOTAVEL;NM_VOTAVEL;QT_VOTOS\nDF;BRASILIA;2022;97012;1;1001;2022;1;6;DEPUTADO FEDERAL;1;1001;CANDIDATO;100\nGO;GOIANIA;2022;12345;1;1001;2022;1;6;DEPUTADO FEDERAL;1;1001;OUTRO;50\n'
  archive=io.BytesIO()
  with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:z.writestr('official.csv',text.encode('cp1252'))
  class Response(io.BytesIO):
   def __init__(self):super().__init__(archive.getvalue());self.headers={'Content-Length':str(len(archive.getvalue()))};self.url='https://cdn.tse.jus.br/test.zip'
  calls=[]
  class Fake(m.Worker):
   def rpc(self,action,data=None):
    calls.append((action,data))
    if action=='claim':return {'token':'lease','year':2022,'scopes':['DF']}
    if action=='start_import':return {'import_id':'import-test'}
    return {'ok':True}
  with patch.object(m,'plan',return_value=([{'name':'DF votes','kind':'votes','url':'https://cdn.tse.jus.br/test.zip'}],[])),patch.object(m.OFFICIAL,'open',return_value=Response()):
   Fake('job','https://test.supabase.co','fake-key').run()
  batches=[x[1] for x in calls if x[0]=='batch'];self.assertEqual(len(batches),1);self.assertEqual(batches[0]['rows'][0]['votes'],100)
  actions=[x[0] for x in calls];self.assertLess(actions.index('ready'),actions.index('finish'));self.assertNotIn('fail',actions)
 def test_failure_cannot_publish(self):
  calls=[]
  class Fake(m.Worker):
   def rpc(self,action,data=None):
    calls.append(action)
    return {'token':'lease','year':2022,'scopes':['DF']} if action=='claim' else {'ok':True}
   def import_file(self,t):raise ValueError('Download incompleto')
  with patch.object(m,'plan',return_value=([{}],[])),self.assertRaises(SystemExit):Fake('job','https://test.supabase.co','fake').run()
  self.assertIn('fail',calls);self.assertNotIn('finish',calls)

class NationalTests(unittest.TestCase):
 def test_full_uf_keeps_outside_ride_coordinates_and_rejects_unknown_uf(self):
  row=dict(SG_UF='SP',NM_MUNICIPIO='SAO PAULO',ANO_ELEICAO='2026',CD_MUNICIPIO='71072',NR_ZONA='1',NR_LOCAL_VOTACAO='1001',NM_LOCAL_VOTACAO='Escola',NR_LATITUDE='-23.55',NR_LONGITUDE='-46.63')
  self.assertIsNone(m.normalize(row,'locations',2026,['SP'],m.coverage()))
  self.assertEqual(m.normalize(row,'locations',2026,['SP'],m.coverage(),True)['latitude'],-23.55)
  self.assertIsNone(m.normalize(dict(row,SG_UF='XX'),'locations',2026,['XX'],m.coverage(),True))

class ScheduleTests(unittest.TestCase):
 def test_service_enqueue_scopes_and_response(self):
  owner='00000000-0000-0000-0000-000000000001'
  with patch.object(m.urllib.request,'urlopen',return_value=io.BytesIO(b'{"id":"job","existing":false}')) as request:
   self.assertEqual(m.scheduled_job('https://test.supabase.co','fake',owner,['DF','GO'])['id'],'job')
   req=request.call_args.args[0]
   self.assertTrue(req.full_url.endswith('/rpc/ibfc_electoral_sync_schedule'))
   self.assertEqual(json.loads(req.data),{'p_owner':owner,'p_scopes':['DF','GO']})
  with self.assertRaises(ValueError):m.scheduled_job('https://test.supabase.co','fake','invalid',['DF'])
  with self.assertRaises(ValueError):m.scheduled_job('https://test.supabase.co','fake',owner,['SP'])
 def test_both_turns_kept_separate(self):
  row=dict(SG_UF='DF',NM_MUNICIPIO='BRASILIA',ANO_ELEICAO='2026',CD_MUNICIPIO='97012',NR_ZONA='1',NR_LOCAL_VOTACAO='1001',CD_ELEICAO='2026',NR_TURNO='2',CD_CARGO='1',DS_CARGO='PRESIDENTE',NR_SECAO='1',NR_VOTAVEL='22',NM_VOTAVEL='Candidato',QT_VOTOS='40')
  self.assertEqual(m.normalize(row,'votes',2026,['DF'],m.coverage())['turn'],2)
  self.assertEqual(m.normalize(dict(row,NR_TURNO='1'),'votes',2026,['DF'],m.coverage())['turn'],1)

class ZipPartitionTests(unittest.TestCase):
 def archive(self, names):
  data=io.BytesIO()
  with zipfile.ZipFile(data,'w') as z:
   for name in names:z.writestr(name,'fixture')
  return zipfile.ZipFile(io.BytesIO(data.getvalue()))
 def test_location_uf_partitions_exclude_br_and_other_states(self):
  names=['eleitorado_local_votacao_2026_'+uf+'.csv' for uf in ['DF','GO','SP','BR']]+['leia-me.pdf']
  with self.archive(names) as z:
   selected=m.select_csvs(z,{'kind':'locations','name':'Locais'},2026,['DF','GO'])
   self.assertEqual([i.filename for i in selected],names[:2])
 def test_location_br_fallback_not_merged_with_uf(self):
  names=['eleitorado_local_votacao_2026_DF.csv','eleitorado_local_votacao_2026_BR.csv']
  with self.archive(names) as z:self.assertEqual([i.filename for i in m.select_csvs(z,{'kind':'locations','name':'Locais'},2026,['DF','GO'])],[names[1]])
 def test_votes_choose_only_requested_partition(self):
  names=['nested/votacao_secao_2026_'+uf+'.csv' for uf in ['DF','GO','BR']]
  with self.archive(names) as z:
   selected=m.select_csvs(z,{'kind':'votes','target':'DF','name':'Votos'},2026,['DF','GO'])
   self.assertEqual([i.filename for i in selected],[names[0]])
 def test_ambiguous_missing_and_size_rejected(self):
  for names in [['a.csv','b.csv'],['leia-me.pdf'],['votacao_secao_2026_DF.csv','nested/votacao_secao_2026_DF.csv']]:
   with self.archive(names) as z,self.assertRaises(ValueError):m.select_csvs(z,{'kind':'votes','target':'DF','name':'Votos'},2026,['DF'])
  with self.archive(['official.csv']) as z,patch.object(m,'MAX_UNCOMPRESSED',1),self.assertRaises(ValueError):m.select_csvs(z,{'kind':'locations','name':'Locais'},2026,['DF'])
 def test_multi_csv_import_lifecycle_excludes_national_duplicate(self):
  header='SG_UF;NM_MUNICIPIO;ANO_ELEICAO;CD_MUNICIPIO;NR_ZONA;NR_LOCAL_VOTACAO;NM_LOCAL_VOTACAO\n'
  data=io.BytesIO()
  with zipfile.ZipFile(data,'w') as z:
   z.writestr('eleitorado_local_votacao_2026_DF.csv',header+'DF;BRASILIA;2026;97012;1;1001;Escola DF\n')
   z.writestr('eleitorado_local_votacao_2026_GO.csv',header+'GO;PADRE BERNARDO;2026;12345;1;1001;Escola GO\n')
   z.writestr('eleitorado_local_votacao_2026_BR.csv',header+'DF;BRASILIA;2026;97012;1;1001;Escola DF\n')
  calls=[]
  class Fake(m.Worker):
   def download(self,task,dest):dest.write_bytes(data.getvalue())
   def rpc(self,action,payload=None):
    calls.append((action,payload));return {'import_id':'fixture'} if action=='start_import' else {'ok':True}
  worker=Fake('job','https://test.supabase.co','fake');worker.year=2026;worker.scopes=['DF','GO'];worker.names=m.coverage();worker.national=False
  worker.import_file({'kind':'locations','name':'Locais','url':'https://cdn.tse.jus.br/locais.zip'})
  rows=[r for action,payload in calls if action=='batch' for r in payload['rows']]
  self.assertEqual(len(rows),2);self.assertEqual([r['uf'] for r in rows],['DF','GO']);self.assertEqual(sum(a=='ready' for a,p in calls),1)

if __name__=='__main__':unittest.main()
