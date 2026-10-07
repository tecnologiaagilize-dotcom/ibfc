# IBFC — séries históricas e validação temporal

Pacote incremental: somente arquivos novos ou alterados nesta etapa. Aplicar sobre o IBFC com os pacotes anteriores de Ciência Eleitoral já instalados. Não substitui o portal completo.

## Instalar

1. No Supabase do IBFC, executar `supabase/migrations/20261026_ibfc_historical_models.sql` no SQL Editor. Requer as migrações eleitorais 20261009 a 20261017 anteriores. Preserva os registros existentes e o agendamento diário de 2026.
2. No repositório IBFC correto, copiar os arquivos nos mesmos caminhos e fazer novo deployment na Vercel. README e manifest são documentação do pacote.
3. Abrir Ciência Eleitoral → Integrações e sincronização. Agora o seletor inclui 2014, 2018, 2022 e 2026. Importar os anos da janela desejada pelo workflow já configurado. Nenhum token ou Secret novo é necessário.
4. Abrir Ciência Eleitoral → Séries históricas e validação temporal (`/admin/ciencia-eleitoral/historico`). Escolher UF, cargo, turno, tipo, janela, unidade territorial e a candidatura/partido de cada ano. Confirmar a correspondência e gerar a validação.
5. O protocolo pode ser baixado em JSON, impresso e reaberto em Relatórios. A exportação CSV dos relatórios compara primeiro/último ano; o JSON contém o protocolo temporal completo.

## O que esta etapa entrega

- Histórico de 2014/2018 no fluxo de sincronização automático existente.
- Teste cronológico de persistência e tendência linear, treinando somente nos anos anteriores ao teste.
- MAE/RMSE por eleição, cobertura comum, exclusões e extrapolação exploratória de um ciclo.
- Snapshot arquivado, seleções, fontes, denominadores, confirmação e SHA-256.

Projeções são exploratórias. Com três ou quatro eleições, há apenas uma ou duas eleições de teste. Não existe intervalo de confiança calibrado nem identificação de voto individual. Séries sem dados suficientes, somente por zona ou truncadas são bloqueadas. Mudanças nas fronteiras territoriais, partidos e número de vagas precisam de revisão; códigos iguais não comprovam continuidade.

## Verificação desta entrega

TypeScript e build de produção aprovados; 26 testes JS de ciência/estatística/cronologia e 32 testes Python do importador aprovados. Migração aplicada/reaplicada em PGlite com cargas sintéticas, catálogo e permissões. Interface validada em desktop/celular com respostas simuladas, exportação e filtros. Cabeçalhos reais das bases DF 2014/2018 conferidos no CDN do TSE.

Nenhuma migração, implantação ou importação foi executada no seu ambiente de produção. O pacote não inclui resultados eleitorais nem credenciais.

Método e limitações: `docs/IBFC-SERIES-HISTORICAS.md`.

Testes JS: `node --test tests/temporal-models.test.cjs tests/advanced-statistics.test.cjs tests/science.test.cjs` (Node com suporte a TypeScript).
Testes Python: `python3 -m unittest discover -s tests -p 'tse*_test.py'`.
Teste SQL: `tests/historical-sql.test.mjs`, requer dependência de desenvolvimento `@electric-sql/pglite`; não é adicionada às dependências de produção.

Próxima etapa: coleta legislativa agendada/background, CLDF e tramitação de projetos. Esses recursos não fazem parte deste ZIP.
