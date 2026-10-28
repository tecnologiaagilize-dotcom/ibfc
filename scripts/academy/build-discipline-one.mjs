// Regenerate the server-side content package from the versioned teaching sources.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,base),'utf8');
const folder='docs/academy/disciplina-01/';
const sources=[
 ['Society for Effectual Action — Princípios','https://effectuation.org/the-five-principles-of-effectuation-detail'],
 ['Strategyzer — Proposta de valor','https://www.strategyzer.com/library/the-value-proposition-canvas'],
 ['Sebrae RS — Modelo de negócio','https://digital.sebraers.com.br/blog/estrategia/business-model-canvas-como-construir-seu-modelo-de-negocio/'],
 ['Buffer — Relato histórico do fundador','https://buffer.com/resources/idea-to-paying-customers-in-7-weeks-how-we-did-it/'],
 ['ANPD — Guia e checklist de segurança','https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte'],
 ['HubSpot Academy — Inbound Sales','https://academy.hubspot.com/courses/inbound-sales'],
 ['Sturt et al. — Revisão de PNL em saúde (2012)','https://pmc.ncbi.nlm.nih.gov/articles/PMC3481516/']
];
const files=fs.readdirSync(new URL(folder+'aulas/',base)).filter(f=>f.endsWith('.md')).sort();
assert.equal(files.length,8);
const lessons=files.map((file,index)=>{
 const text=read(folder+'aulas/'+file);
 for(const heading of ['Objetivos e pré-requisitos','Conteúdo teórico','Demonstração prática','Exercício guiado','Atividade independente','Checklist de execução','Avaliação, feedback e revisão','Aplicação Agilize e Tr@de']) assert.ok(text.includes(heading),file+': '+heading);
 const ids=[...new Set([...text.matchAll(/\[S([1-7])(?:\]|\s)/g)].map(m=>Number(m[1])))];
 const resources=ids.map(id=>({title:sources[id-1][0],resource_url:sources[id-1][1],resource_type:'reading',attribution:'S'+id+' · ver registro de fontes da disciplina',license_notes:'Link externo para leitura; sem reprodução do material. Consulta: 27/10/2026.',checked_at:'2026-10-27T00:00:00Z'}));
 // Embed student worksheets so the complete lab is available without a GitHub account.
 const append=index===7?'\n\n'+read(folder+'CADERNO_DE_ATIVIDADES.md')+'\n\n'+read(folder+'FONTES.md'):'';
 return {position:index+1,title:text.split('\n')[0].slice(2),description:'Disciplina 1 · 150 minutos de estudo e prática. Exercícios formativos; sem certificação automática.',duration_minutes:150,content_md:text+append,resources};
});
const payload=JSON.stringify({version:'1.0.0',lessons},null,2)+'\n';
const target=new URL('lib/academy/discipline-one.json',base);
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),payload,'Pacote desatualizado: execute node scripts/academy/build-discipline-one.mjs');
else fs.writeFileSync(target,payload);
console.log('PASS: 8 aulas completas; 1200 minutos; caderno e fontes incorporados.');
