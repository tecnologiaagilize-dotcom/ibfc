import unittest,sys,csv,io,zipfile,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from tse_bu import discover_bu,normalize_bu
from tse_sync import Worker
ROW=dict(SG_UF='DF',NM_MUNICIPIO='BRASÍLIA',ANO_ELEICAO='2026',CD_MUNICIPIO='97012',NR_ZONA='10',NR_SECAO='81',NR_LOCAL_VOTACAO='1414',CD_CARGO_PERGUNTA='6',DS_CARGO_PERGUNTA='Deputado Federal',CD_ELEICAO='6259',NR_TURNO='1',CD_TIPO_URNA='1',DS_TIPO_URNA='Apurada',CD_TIPO_VOTAVEL='1',NR_VOTAVEL='4000',NM_VOTAVEL='Candidata',QT_VOTOS='4',QT_APTOS='327',QT_COMPARECIMENTO='260',QT_ABSTENCOES='67',NR_URNA_EFETIVADA='1824890',DS_SECOES_AGREGADAS='#NULO#')
class BuTests(unittest.TestCase):
 def test_section_and_hardware(self):
  r=normalize_bu(ROW,2026,['DF'],{'DF':['Brasília']});self.assertEqual((r['local'],r['section'],r['bu_metadata']['urna']),(1414,81,1824890));self.assertIsNone(r['bu_metadata']['agregadas'])
 def test_special_votes(self):
  for code,num in [('2','95'),('3','96'),('4','40')]:self.assertEqual(normalize_bu(dict(ROW,CD_TIPO_VOTAVEL=code,NR_VOTAVEL=num),2026,['DF'],{'DF':['Brasília']})['number'],num)
 def test_inconsistent_electorate(self):
  with self.assertRaises(ValueError):normalize_bu(dict(ROW,QT_APTOS='999'),2026,['DF'],{'DF':['Brasília']})
 def test_unknown_vote_type(self):
  with self.assertRaises(ValueError):normalize_bu(dict(ROW,CD_TIPO_VOTAVEL='8'),2026,['DF'],{'DF':['Brasília']})
 def test_annulled_urna(self):self.assertIsNone(normalize_bu(dict(ROW,CD_TIPO_URNA='4'),2026,['DF'],{'DF':['Brasília']}))
 def test_latest_turn_resources(self):
  rs=[{'url':f'https://cdn.tse.jus.br/buweb/bweb_{t}t_DF_{d}.zip'} for t,d in [(1,'300920261403'),(1,'051020261403'),(2,'011120261403')]]
  tasks=discover_bu(2026,['DF'],lambda y,k:rs);self.assertEqual(len(tasks),2);self.assertIn('05102026',tasks[0]['url']);self.assertEqual(tasks[1]['turn'],2)
class BuWorkerTests(unittest.TestCase):
 def test_csv_pipeline_deduplicates_repeated_vote_records(self):
  class Fake(Worker):
   def __init__(self):
    self.year=2026;self.scopes=['DF'];self.names={'DF':['Brasília']};self.national=False;self.rows=0;self.saved=[];self.ready=False
   def progress(self,*a,**k):pass
   def rpc(self,action,data=None):
    if action=='start_import':return {'import_id':'fixture'}
    if action=='batch':self.saved.extend(data['rows'])
    if action=='ready':self.ready=True
   def download(self,task,dest):
    text=io.StringIO();writer=csv.DictWriter(text,fieldnames=list(ROW),delimiter=';');writer.writeheader();writer.writerows([ROW,ROW,dict(ROW,CD_TIPO_VOTAVEL='2',NR_VOTAVEL='95')])
    with zipfile.ZipFile(dest,'w') as z:z.writestr('official.csv',text.getvalue().encode('cp1252'))
  f=Fake();f.import_file({'kind':'votes','format':'bu','target':'DF','name':'BU fixture','url':'https://cdn.tse.jus.br/bu.zip'})
  self.assertEqual(len(f.saved),2);self.assertTrue(f.ready);self.assertEqual(f.saved[0]['bu_metadata']['urna'],1824890)
if __name__=='__main__':unittest.main()
