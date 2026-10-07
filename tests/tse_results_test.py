import copy
import importlib.util
import json
import pathlib
import unittest
from unittest.mock import patch

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('tse_results',ROOT/'scripts/tse_results.py')
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

class ResultsTests(unittest.TestCase):
 def setUp(self):
  self.doc={'f':'o','ele':'6257','t':'1','tpabr':'zona','cdabr':'1','dv':'s','and':'f','tf':'s','dg':'05/10/2026','hg':'12:52:10','idg':'1','s':{'st':'1','ts':'1'},'v':{'vv':'10'},'carg':[{'cd':'1','nmn':'Presidente','agr':[{'par':[{'n':'22','sg':'PL','tvtn':'10','cand':[{'n':'22','sqcand':'123','nmu':'Candidato teste','vap':'10','dvt':'Válido','dt':'01/01/1900'}]}]}]}]}
  self.task={'year':2026,'uf':'DF','municipality':97012,'municipality_name':'BRASÍLIA','zone':1,'election':6257,'turn':1,'office':1,'pleito':3220,'url':r.BASE+'example.json'}
 def test_valid_nominal_and_privacy(self):
  row=r.normalize(self.doc,self.task);self.assertEqual(row['valid'],10);self.assertEqual(row['parties'][0]['votes'],10);self.assertNotIn('dt',row['candidates'][0])
 def test_simulated_rejected(self):
  self.doc['f']='s'
  with self.assertRaises(ValueError):r.normalize(self.doc,self.task)
 def test_wrong_zone_rejected(self):
  self.doc['cdabr']='2'
  with self.assertRaises(ValueError):r.normalize(self.doc,self.task)
 def test_missing_votes_not_zero(self):
  del self.doc['carg'][0]['agr'][0]['par'][0]['cand'][0]['vap']
  with self.assertRaises((ValueError,KeyError)):r.normalize(self.doc,self.task)
 def test_party_total_mismatch(self):
  self.doc['v']['vv']='11'
  with self.assertRaises(ValueError):r.normalize(self.doc,self.task)
 def test_legenda_included_once(self):
  self.task['office']=6;self.doc['carg'][0]['cd']='6';self.doc['carg'][0]['agr'][0]['par'][0]['tvtl']='3';self.doc['v']['vv']='13'
  row=r.normalize(self.doc,self.task);self.assertEqual(row['parties'][0]['votes'],13)
 def test_duplicate_candidate_id(self):
  c=self.doc['carg'][0]['agr'][0]['par'][0]['cand'];c.append(copy.deepcopy(c[0]))
  with self.assertRaises(ValueError):r.normalize(self.doc,self.task)
 def test_not_started_rejected(self):
  self.doc['and']='n'
  with self.assertRaises(ValueError):r.normalize(self.doc,self.task)
 def test_discovery_uses_election_config_and_padded_zone(self):
  config={'f':'o','pl':[{'cd':'3220','c':'ele2026','dt':'04/10/2026','e':[{'cd':'6257','t':'1','tp':'8','abr':[{'cd':'br','cp':[{'cd':'1'}]}]}]}]}
  secs={'f':'o','cdp':'3220','abr':[{'cd':'df','mu':[{'cd':'97012','nm':'BRASÍLIA','zon':[{'cd':'0001','sec':[]}]}]}]}
  def fetch(url):return(config if 'ele-c' in url else secs),10,'a'*64
  tasks=r.discover(2026,['DF'],{'DF':['Brasília']},fetch=fetch);self.assertEqual(len(tasks),1);self.assertIn('df97012-z0001-c0001-e006257-u.json',tasks[0]['files'][0]['url'])
 def test_worker_stages_then_readies(self):
  class W:
   def __init__(self):self.calls=[];self.downloaded=0;self.rows=0
   def rpc(self,a,d):self.calls.append(a);return {'import_id':'fixture'}
   def progress(self,*a,**k):pass
  w=W()
  with patch.object(r,'read_json',return_value=(self.doc,123,'a'*64)):r.import_task(w,{'name':'fixture','url':self.task['url'],'files':[self.task]})
  self.assertEqual(w.calls,['start_zone','zone_batch','ready_zone']);self.assertEqual(w.downloaded,123)

if __name__=='__main__':unittest.main()
