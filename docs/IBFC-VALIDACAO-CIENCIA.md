# Validação da atualização

Verificações realizadas localmente, sem credenciais de produção:

- Build Next.js e TypeScript: sucesso; nenhuma rota de demonstração incluída na entrega.
- Node: 14 testes de cálculo, CSV, ausência de dados, integração regional, estatística e progresso.
- Python: 8 testes do importador, incluindo cobertura de UF completa, anos, turnos, redirects e falha sem publicação.
- PostgreSQL/PGlite: instalação das migrações 20261009/10/11/12 e reaplicação segura da 12; agregação de duas UFs, votos válidos sem brancos/nulos, grupos com legenda, mudança de local, rejeição de comparação incompatível, versões de investigação e bloqueio de acesso anônimo. Também: comparação entre cargos com denominadores independentes, armazenamento do relatório, imutabilidade de anexos e proteção do bucket privado mesmo com políticas genéricas de Storage.
- Navegador Chromium: seleção de candidaturas/grupos, recorte Brasil, CSV, painel estatístico, fila em 0%, aviso de execução encerrada no GitHub, comparação independente candidato/partido entre cargos, aprofundamento automático, reabertura de relatório com hash, upload de evidências, protocolos de investigação e largura móvel 390 px sem transbordamento. APIs e tiles foram substituídos por fixtures; não houve consultas a resultados reais nem tiles OSM reais.

Executar testes presentes no pacote na raiz do projeto completo:

```
node --test tests/science.test.cjs
python -m unittest discover -s tests -p 'tse_sync_test.py'
npm run check
npm run build
```

`tests/science-sql.test.mjs` é um teste independente que requer @electric-sql/pglite no ambiente de desenvolvimento. Essa dependência NÃO é necessária para o portal em produção e NÃO foi acrescentada a package.json. O teste monta um banco temporário em memória, não conecta ao Supabase real.

Limites: os testes não comprovam importação nacional em volume real, disponibilidade atual de cada arquivo no TSE, configuração dos Secrets do cliente, execução no GitHub do cliente, precisão de previsão futura nem verificação de BU/RDV/assinaturas digitais. O cenário estatístico é exploratório e as telas foram exercitadas com dados demonstrativos.
