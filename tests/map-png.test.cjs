const test=require('node:test'),assert=require('node:assert/strict');
const {pngFilename,wrapLines}=require('../lib/electoral/map-png.ts');
test('safe portable filenames retain accents as ASCII and strip path separators',()=>{assert.equal(pngFilename('IBFC Brasília / 2026'),'IBFC-Brasilia-2026.png');assert.equal(pngFilename(''),'IBFC-mapa.png');assert.ok(pngFilename('x'.repeat(300)).length<=124);});
test('wrapping handles unbroken identifiers and preserves text within bounds',()=>{const text='Protocolo: '+'a'.repeat(128);const lines=wrapLines(text,20,s=>s.length);assert.ok(lines.every(s=>s.length<=20));assert.equal(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));});
