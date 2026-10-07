# IBFC — Estatística geográfica e diagnóstico legislativo

Pacote incremental: somente arquivos novos ou modificados desta etapa. Mantenha as atualizações anteriores e copie os arquivos nas mesmas pastas do GitHub. Faça novo deployment na Vercel. **Este pacote não exige uma nova migração SQL.** Utiliza as bases de Ciência Eleitoral já instaladas e, para diagnóstico legislativo, as tabelas da migração de restauração `20260925_restore_candidate_collaboration_and_public_data.sql`. Não reaplique migrações antigas indiscriminadamente.

## Onde encontrar
**Ciência Eleitoral → Estatística e cenários:** escolha candidato/partido/grupo, cargo, turno e recorte. Selecione os resultados de 2022 e 2026 e gere a análise. O novo painel substitui a avaliação em grupos alternados.

**Ciência Eleitoral → Integrações e sincronização → Verificar integrações legislativas:** consulta os catálogos oficiais, verifica os provedores no banco, conta os vínculos externos e exibe a última coleta registrada por instituição. Requer perfil administrador ou editor.

## Recursos
- Participação ponderada pelos denominadores e média territorial sem ponderação.
- Concentração HHI e número efetivo de territórios, sem classificação de pessoas.
- Validação da regressão em blocos geográficos: uma mesma UF, município, zona ou local permanece no mesmo grupo de teste; nível mais amplo com pelo menos três blocos é escolhido automaticamente.
- Erro absoluto, RMSE, RMSE ponderado e comparação com a média do treino; tabela por grupo.
- Simulação de alteração da participação e do volume de votos válidos, com faixa de sensibilidade escolhida pelo usuário.
- Download JSON do método, fontes, referência ao relatório, indicadores e hipóteses.
- Diagnóstico legislativo com erros por fonte/configuração, sem gravação ou importação.

## Limites e próximos passos
A regressão analisa dois resultados históricos conhecidos. Não é uma previsão futura validada. A faixa do simulador não é um intervalo de confiança. Modelos temporais/probabilísticos precisam de eleições adicionais, calibração e teste fora do período de treino. As unidades territoriais não são eleitores individuais.

Validação exige 15 pares válidos, três blocos geográficos e pelo menos dez linhas de treino por grupo. A validação é bloqueada em tabelas truncadas; os descritivos identificam a cobertura parcial. O simulador usa os totais completos do filtro. Não compare HHI entre recortes de tamanhos/níveis diferentes. Ausência de dados não vira zero voto.

O diagnóstico não sincroniza comissões, votações, presença nem proposições. A coleta e a revisão desses registros usam os conectores existentes, que ainda precisam de testes com parlamentares vinculados no ambiente publicado. Não identifica parlamentares por semelhança de nome nem comprova funcionamento de todos os endpoints ao testar o catálogo.

Nenhuma alteração foi aplicada automaticamente ao Supabase, GitHub ou Vercel. Nenhum contato com apoiadores foi enviado.

## Testes
Execute `node --test tests/advanced-statistics.test.cjs` com Node compatível com TypeScript sem transformação. Os testes cobrem pesos, ausências, contagens incompatíveis, blocos separados, insuficiência amostral, cenário e respostas oficiais simuladas. O teste de navegador em `tests/ui-advanced-statistics-test.mjs` é uma referência do ambiente de validação: requer Playwright/Chromium, ajuste dos caminhos e uma rota temporária de preview. Essa rota não faz parte do pacote de produção.
