// Run with: node --test tests/electoral.test.cjs (uses the project's TypeScript dependency).
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript'),test=require('node:test'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,filename);
const {summarize,csvCell,groupLocations}=require('../lib/electoral/analysis.ts');
const {readCsv,normalizeCsvRow}=require('../lib/electoral/csv.ts');
const row=(v={})=>({uf:"DF",municipality_name:"Brasília",municipality:97012,zone:1,section:1,old_votes:100,new_votes:80,old_valid:200,new_valid:200,old_local:1001,new_local:1002,old_name:'Escola antiga',new_name:'Escola nova',latitude:-15.8,longitude:-47.9,address:'DF',coordinate_year:2026,...v});
test('correct change and weighted shares, not mean of section percentages',()=>{
const s=summarize([row(),row({section:2,old_votes:20,new_votes:50,old_valid:100,new_valid:500})]);
assert.equal(s.oldVotes,120);assert.equal(s.newVotes,130);assert.equal(s.delta,10);assert.equal(s.oldShare,40);assert.equal(s.newShare,130/700*100);assert.equal(s.movedSections,2);
});
test('missing data differs from zero votes and zero baseline has no relative change',()=>{
assert.equal(summarize([row({old_votes:null,old_valid:null})]).delta,null);
assert.equal(summarize([row({old_votes:0})]).percent,null);
assert.equal(summarize([row({new_votes:0})]).percent,-100);
});
test('common-key analysis excludes one-year-only records',()=>{
const s=summarize([row(),row({section:2,new_votes:500,old_votes:null,old_valid:null})],true);assert.equal(s.newVotes,80);assert.equal(s.commonSections,1);
});
test('CSV text formulas neutralized, numeric negative values preserved',()=>{assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell(123),'"123"');assert.equal(csvCell(-20),'"-20"');});
test('location grouping never invents coordinates',()=>{const groups=groupLocations([row({latitude:null,longitude:null}),row({section:2,latitude:null,longitude:null})]);assert.equal(groups.length,1);assert.equal(groups[0].latitude,null);assert.equal(groups[0].sections.length,2);});
test('quoted CSV multiline/escaped fields and final line',async()=>{
const f=new File(['SG_UF;NM_LOCAL_VOTACAO\r\nDF;"Escola; \"\"A\"\"\nCentro"\r\nDF;Final'],'test.csv');const rows=[];for await(const r of readCsv(f,'utf-8'))rows.push(r);
assert.equal(rows.length,2);assert.equal(rows[0].NM_LOCAL_VOTACAO,'Escola; "A"\nCentro');assert.equal(rows[1].NM_LOCAL_VOTACAO,'Final');
});
test('TSE DF rows validate year and preserve missing coordinates',()=>{
const base={SG_UF:'DF',ANO_ELEICAO:'2026',CD_MUNICIPIO:'97012',NR_ZONA:'1',NR_LOCAL_VOTACAO:'1001',NM_LOCAL_VOTACAO:'Escola',NR_LATITUDE:'#NULO',NR_LONGITUDE:'#NULO'};
assert.equal(normalizeCsvRow(base,'locations',2026).latitude,null);
assert.equal(normalizeCsvRow({...base,SG_UF:'GO'},'locations',2026),null);
assert.throws(()=>normalizeCsvRow(base,'locations',2022),/arquivo é de/);
});

test('regional municipalities normalized and candidate/location identities isolate UF',()=>{
 const {candidateKey}=require('../lib/electoral/types.ts');
 const {regionalMunicipality}=require('../lib/electoral/region.ts');
 assert.equal(regionalMunicipality('GO','AGUAS LINDAS DE GOIAS'),'Águas Lindas de Goiás');
 assert.equal(regionalMunicipality('GO','PLANALTINA'),'Planaltina');
 assert.equal(regionalMunicipality('GO','GOIANIA'),null);
 assert.equal(regionalMunicipality('MG','UNAI'),'Unaí');
 assert.notEqual(candidateKey({uf:'DF',year:2026,election:1,turn:1,office:6,number:'1001'}),candidateKey({uf:'GO',year:2026,election:1,turn:1,office:6,number:'1001'}));
 assert.equal(groupLocations([row(),row({uf:'GO',municipality_name:'Águas Lindas de Goiás'})]).length,2);
});
test('Entorno coordinates outside former DF bounds preserved; unrelated municipalities excluded',()=>{
 const base={SG_UF:'GO',NM_MUNICIPIO:'PADRE BERNARDO',ANO_ELEICAO:'2026',CD_MUNICIPIO:'12345',NR_ZONA:'1',NR_LOCAL_VOTACAO:'1001',NM_LOCAL_VOTACAO:'Escola',NR_LATITUDE:'-15.16',NR_LONGITUDE:'-48.28'};
 assert.equal(normalizeCsvRow(base,'locations',2026).latitude,-15.16);
 assert.equal(normalizeCsvRow({...base,NM_MUNICIPIO:'GOIANIA'},'locations',2026),null);
});
