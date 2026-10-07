# Caderno técnico — séries históricas e validação temporal

Versão do método: `ibfc-temporal-1.0`.

## Entrega

A sincronização automática passa a aceitar 2014 e 2018, além de 2022 e 2026. A coleta reutiliza o workflow e o worker oficiais existentes. O agendamento diário permanece exclusivo de 2026. As novas cargas mantêm publicação atômica, fila, cancelamento e controle de acesso existentes.

Novo menu: **Ciência Eleitoral → Séries históricas e validação temporal** (`/admin/ciencia-eleitoral/historico`).

Recortes: uma UF, mesmo cargo, mesmo turno, candidatura ou partido, por municípios da UF ou zonas de um município. Janelas consecutivas: 2014–2018–2022, 2018–2022–2026 ou 2014–2018–2022–2026. Brasil inteiro, grupos de partidos, locais/seções e modelos de comparecimento não fazem parte desta primeira validação temporal.

## Método

1. O administrador escolhe uma candidatura/partido para cada ano. Não há vinculação automática por nome ou número. A confirmação documenta a correspondência escolhida; ela não verifica identidade, sucessão partidária ou continuidade política.
2. O servidor valida a seleção no catálogo publicado e consulta todos os anos em uma única chamada SQL estável. Não mistura snapshots obtidos em momentos diferentes.
3. Cada território é identificado por UF+município e, quando aplicável, zona. Uma chave igual não garante os mesmos limites ou a mesma composição demográfica. Alterações territoriais exigem revisão externa.
4. Participação = votos selecionados / total válido do cargo × 100. Para partidos legislativos, considera nominal + legenda conforme o importador existente. Para senador, mudanças no número de vagas/votos permitidos exigem atenção: o denominador é votos do cargo, não eleitores.
5. Usa apenas o painel de territórios com denominador positivo em todos os anos. Ausência de território ou denominador não vira zero voto. Zero selecionado em uma seção com denominador publicado é um zero observado na base importada.
6. Validação com janela crescente: treina 2014/2018 e testa 2022; quando selecionado, treina 2014/2018/2022 e testa 2026. Nenhum valor observado no ano de teste entra no ajuste daquele teste. A escolha do painel completo é retrospectiva, não uma garantia de cobertura operacional futura.
7. Compara persistência (última participação observada) com regressão linear participação~ano. Cada território tem ajuste próprio. Participações extrapoladas são limitadas a 0–100%, com marcação explícita de limite.
8. Calcula MAE, RMSE e viés por teste e no conjunto. Os erros usam peso igual por território, não peso pelo número de votos. Isso não produz observações temporalmente independentes adicionais: há apenas uma ou duas eleições de teste.
9. Extrapola um ciclo de quatro anos após o último ano selecionado. É uma projeção exploratória da participação, sem intervalo probabilístico calibrado, estimativa de pessoas ou promessa de acerto. Não escolhe automaticamente o modelo com menor erro.

## Integridade, cobertura e limitações

- Exige votos por seção publicados para todos os anos. Cadastros sem votos ou bases apenas por zona são bloqueados nesta versão.
- Rejeita séries com menos de três eleições consecutivas, duplicações, valores impossíveis, recortes truncados e ausência de territórios completos.
- Limite: 5.000 unidades por ano. Reduza a cobertura quando excedido.
- A publicação de uma partição não certifica totalização definitiva de uma eleição. Dados provisórios e mudanças na destinação de votos precisam ser revisados nas fontes oficiais. Uma carga válida pode abranger apenas parte do território solicitado; os resultados descrevem o recorte efetivamente importado.
- A coincidência do código de zona não prova estabilidade territorial. Não há harmonização histórica de fronteiras nesta entrega.
- Protocolos preservam seleções, recortes, confirmação, séries por ano, denominadores, fontes, datas, exclusões, previsões retrospectivas, métricas e projeções. O SHA-256 verifica integridade do snapshot arquivado; não comprova veracidade ou completude da fonte.
- O painel **Relatórios** reabre o snapshot e oferece protocolo JSON completo. O CSV existente representa apenas a comparação do primeiro com o último ano.
- Acesso administrativo/editor; não cruza cadastros pessoais ou características sensíveis com preferências políticas individuais.

## Instalação

1. Aplicar `supabase/migrations/20261026_ibfc_historical_models.sql` no projeto Supabase do IBFC, após as migrações eleitorais 20261009–20261017. As etapas posteriores existentes podem permanecer instaladas.
2. Substituir os arquivos do pacote nos mesmos caminhos do repositório IBFC e fazer novo deployment.
3. Não é necessário criar novos tokens, Secrets, bibliotecas de produção ou variáveis. O workflow `ibfc-tse-sync.yml` e o worker `scripts/tse_sync.py` dos pacotes anteriores precisam estar instalados e configurados.
4. Em Integrações e sincronização, importar os anos escolhidos. Para toda a UF, marcar cobertura completa por UF; a cobertura DF/Entorno continua sendo um subconjunto explícito.
5. Abrir o novo submenu, selecionar os recortes e gerar a validação. A importação depende da disponibilidade do TSE e da execução do GitHub Actions; o ZIP não contém os resultados eleitorais.

## Verificação executada

- Cabeçalhos reais dos ZIPs DF 2014 e DF 2018 consultados no CDN oficial. Ambos incluem `NR_LOCAL_VOTACAO`, `NR_SECAO`, `QT_VOTOS` e identificadores de eleição/cargo. O worker existente já aceita esse esquema.
- Testes Python de planejamento, partições ZIP, normalização histórica e regressão dos importadores BU/JSON/CSV.
- Testes dos modelos: cronologia, prevenção de uso de ano futuro, benchmark, exclusão de ausências, limites, erros e determinismo.
- Migração executada duas vezes em PostgreSQL local compatível (PGlite); cargas sintéticas 2014–2026, catálogo, agregação de candidato/partido e isolamento de acesso.
- Interface em navegador com respostas simuladas, desktop e celular; exportação JSON e invalidação de filtros testadas.
- Build Next.js de produção. Nenhuma carga foi executada no Supabase de produção nesta entrega.

Fontes oficiais de referência:
- https://dadosabertos.tse.jus.br/dataset/resultados-2014
- https://dadosabertos.tse.jus.br/dataset/resultados-2018
- https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2014_DF.zip
- https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_2018_DF.zip

## Próximas etapas

Coleta legislativa agendada e retomada em background; CLDF; tramitação detalhada de projetos e planos de governo; harmonização territorial histórica; séries mais longas e validação prospectiva antes de modelos probabilísticos. Esses itens não estão incluídos neste pacote.
