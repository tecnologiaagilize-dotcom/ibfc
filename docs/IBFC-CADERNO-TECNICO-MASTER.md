# IBFC — Caderno técnico master de Ciência Eleitoral

Versão 2.7.0 · build IBFC-CE-20261008-HISTORICO-F4. Consolidado em 08/10/2026 a partir do projeto completo enviado, dos documentos existentes e do contexto de continuidade anexado. Este documento descreve código e requisitos; não certifica a instalação em produção.

## Objetivo e limites

Oferecer investigação reproduzível de resultados públicos, do país à seção eleitoral, fiscalização legislativa e gestão de participação voluntária. Resultados eleitorais são agregados e não identificam votos individuais. Estimativas de lideranças não comprovam entrega de votos; correlação territorial não comprova causalidade, fidelidade ou fraude. Cadastros pessoais, interesses comunitários e registros de participação devem permanecer separados dos resultados oficiais, com acesso autorizado. Não produzir pontuação individual de preferência política ou deduzir quem deixou de votar em alguém.

## Arquitetura preservada

Next.js App Router, React, Supabase e autenticação existente; Leaflet local e mapas OpenStreetMap. Importadores TSE em Python executados pelo GitHub Actions. Coleta legislativa em Node 24, com fila, checkpoints e retomada. Nenhuma tabela duplicada ou migração nova foi criada nesta etapa.

Entradas administrativas são organizadas por `SCIENCE_VIEWS`. `ScienceExplorer` mantém filtros de ano, turno, cargo, candidato, partido/grupo e território. `ZoneLayers` reúne camadas; `LeafletElectionMap` renderiza os pontos. `lib/science/territorial-layers.ts` centraliza seleção, busca e exportação. O endpoint `/api/admin/science/zones` preserva verificação de equipe, origem e candidatura no catálogo. `/api/admin/science/locations` fornece referências de locais cadastrados.

## Contrato dos dados geográficos

Zona, local de votação, seção e urna física são entidades distintas. Quantidade de seções não deve ser rotulada automaticamente como quantidade de urnas. Coordenadas de referência de uma zona não constituem seu perímetro oficial. Uma escola pode reunir várias seções. Alterações entre anos exigem correspondência documentada, não apenas igualdade de código.

Camada azul: zonas disponíveis no recorte carregado. Camada vermelha: zonas com resultado positivo da seleção atual, com número de votos. Quando ambas estão ligadas, o vermelho substitui o azul no mesmo ponto, sem duplicar a zona. Camada roxa: locais cadastrados, cuja presença não comprova disponibilidade de votação por seção naquele local. Ano cartográfico é exibido quando disponível. Coordenadas ausentes permanecem na tabela e nas exportações. Voto zero, resultado ausente e candidatura sem resultados são situações distintas.

A carga atual é limitada a 5.000 registros por camada. Alertas e exportações informam truncamento. Busca filtra o conjunto carregado, não todo o banco. A tabela usa páginas de 100 linhas. A pesquisa e as preferências locais são salvas no navegador, sem salvar cadastros pessoais. Alternar camadas preserva o enquadramento; o botão Enquadrar pontos refaz o ajuste. Modo ampliado admite Escape e navegação de teclado.

## Relatórios e reprodutibilidade

A análise existente arquiva recorte, fontes e hash. Esta etapa acrescenta CSV e JSON do recorte visual: filtros, camadas, busca, horários, cobertura, limites e linhas. Esses arquivos não substituem um arquivo integral da base oficial nem sua assinatura. A votação por local ou seção depende de importação com essa granularidade; totais por zona não são distribuídos artificialmente entre escolas ou urnas.

Comparação atual 2022/2026 continua opcional. O módulo temporal já contempla 2014/2018/2022/2026 e validação exploratória contra persistência; isso não equivale a um modelo preditivo homologado. Estatística avançada existente é exploratória, com correlação territorial, regressão e cenários; publicar incerteza, tamanho da amostra, cobertura e limites antes de usar projeções.

## Integrações e observatório

TSE: importadores de arquivos e resultados oficiais, fila e progresso efetivo. Integração legislativa: identidades verificadas, Câmara/Senado, fila e worker existentes. O workflow legislativo ausente no ZIP foi acrescentado nesta etapa. CLDF mantém consulta manual; não declarar sincronização automática validada. Tramitação e arquivo de versões, relatórios, acompanhamento, compromissos e agenda de revisão permanecem existentes e privados conforme suas permissões. A instalação das respectivas migrações deve ser conferida pelo diagnóstico do portal.

Comunidade mantém demandas, atividades, inscrições e gestão de responsáveis em módulos próprios. Sua integração ao mapa eleitoral ainda é uma fase posterior. Comunicação por CRM não significa que um bot completo tenha sido implementado neste pacote.

## Sequência de implantação e aceitação

1. Instalar o pacote incremental sem apagar arquivos existentes; incluir o workflow oculto `.github`.
2. Conferir variáveis, autenticação e migrações existentes no diagnóstico. Validar que equipe autorizada entra e visitantes não acessam dados administrativos.
3. Importar um recorte oficial conhecido. Comparar manualmente candidato, ano, turno e zona com a fonte; registrar URL, horário e totais. Testar resultado ausente separadamente de zero.
4. Testar azul/vermelho/roxo, filtros, busca, zoom, modo ampliado, exportações e mobile. Conferir pontos sem coordenadas e limite de carga.
5. Disparar uma coleta legislativa no GitHub, observar logs, fila, heartbeat e registros importados. Validar ao menos um parlamentar por instituição; não homologar instituição indisponível.
6. Registrar responsável, versão, evidências, falhas e decisão de homologação. Só então avançar para comparação múltipla e novas fontes.

Consulte `IBFC-BACKLOG-CONSOLIDADO.md` para estados e próximas etapas e `IBFC-MULTICAMADAS-FASE1.md` para instalação. Preserve também os documentos especializados existentes.

## Incremento fase 2 — comparação múltipla

Novo submenu `comparacao`, componente `MultiComparison` e cálculo `multi-comparison.ts`. Duas a dez candidaturas ou partidos no mesmo recorte; relatórios individuais e fontes preservados; progressão por consultas concluídas; cancelamento; tabela paginada e CSV/JSON. Comparação entre denominadores ou granularidades distintos é sinalizada. Totais não são recalculados a partir de tabelas truncadas. Não há migração nova, grupos sobrepostos ou união com cadastros pessoais. Consultas sequenciais não garantem snapshot transacional único. Instalação e limites: `IBFC-COMPARACAO-MULTIPLA-FASE2.md`.

## Incremento fase 3 — mapas lado a lado

`ComparisonMaps` usa os relatórios já consultados, com escala comum e enquadramento conjunto. `comparison-maps.ts` preserva coordenadas próprias, zeros e ausência. `LeafletElectionMap` recebe opcionalmente posições de enquadramento compartilhadas; chamadas anteriores continuam funcionando. Movimento manual independente. Não inclui equivalência histórica nem PNG. Consulte `IBFC-MAPAS-COMPARATIVOS-FASE3.md`.

## Incremento fase 4 — cobertura e mapas históricos

`HistoricalTerritory` integra o modo Comparar 2022 e 2026 do explorador. `historical-coverage.ts` classifica cobertura por linha, preserva ausências/zeros e limita proporções ao conjunto retornado. Mapas consultam cada ano separadamente pela API existente, preservando arquivos individuais e projetando apenas coordenadas com ano identificado e não posterior ao ano consultado. Referências futuras/sem ano são ocultadas com aviso; relatórios originais não são alterados. Não é uma tabela oficial de correspondência histórica. Contexto da análise é preservado e consultas antigas são descartadas quando os filtros mudam. Sem migração nova. Instalação e limites: `IBFC-HISTORICO-TERRITORIAL-FASE4.md`.

## Fase 5 — Exportação de mapas PNG

Os mapas multicamadas, comparativos e históricos oferecem download direto da vista atual, com seleção, legenda, cobertura e créditos. A implementação usa canvas e tiles já carregados, sem requisições de exportação adicionais. Protocolo, hash do relatório original e até três fontes ficam nos mapas comparativos; o relatório mantém as fontes completas. A opção sem ruas permite exportar quando tiles estiverem indisponíveis ou sem autorização CORS. Consulte IBFC-EXPORTACAO-PNG-FASE5.md.
