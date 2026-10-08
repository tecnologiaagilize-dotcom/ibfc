# Ciência Eleitoral — versão 2.0

## Instalação desta atualização

O ZIP é cumulativo sobre o pacote anterior de mapa/TSE, com os caminhos a partir da raiz do repositório IBFC. Não é o portal completo. Extraia e substitua os arquivos no mesmo repositório; não crie uma pasta adicional envolvendo app, components, lib ou .github.

1. No Supabase do IBFC, execute as migrações 20261011 e 20261012 DEPOIS das migrações 20261009 e 20261010. Se já aplicou a 11, execute somente `supabase/migrations/20261012_ibfc_science_observatory.sql`. A nova migração pode ser reaplicada e preserva os dados importados.
2. Suba os arquivos do pacote, incluindo `.github/workflows/ibfc-tse-sync.yml` e `scripts/tse_sync.py`, para a branch usada em GITHUB_TSE_REF (normalmente main).
3. Vercel: mantenha GITHUB_TSE_TOKEN, GITHUB_TSE_REPOSITORY e GITHUB_TSE_REF. O token precisa acessar o repositório e Actions com leitura e escrita. GITHUB_TSE_REPOSITORY deve ser `proprietario/repositorio`, sem https. Nunca coloque token em variável NEXT_PUBLIC.
4. GitHub → Settings → Secrets and variables → Actions → Secrets: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do MESMO projeto Supabase do portal. Não use a chave anon para o worker.
5. Faça novo deployment. Abra `/admin/ciencia-eleitoral` e confira o título Ciência Eleitoral 2.0 e o identificador IBFC-CE-20261006-02 na verificação de instalação. Se aparecem o título ou menu antigos, o deployment ainda usa o código anterior. A URL antiga do mapa redireciona para o novo explorador.
6. Se uma tarefa antiga ainda está na fila, abra Actions e verifique os logs. Corrija a causa antes de cancelá-la e iniciar outra. Upload de código não reinicia uma execução antiga.

## O que está implementado

- Menu mestre Ciência Eleitoral: visão geral, mapa, comparação entre cargos, investigações, relatórios, estatística/cenários e integrações. Menu lateral expansível e navegação adaptada a celular.
- Cobertura de importação: RIDE/Entorno como antes, ou UFs completas selecionadas entre as 27. Para o país, importe os estados em lotes, nos dois anos. A interface não afirma cobertura nacional completa quando só há algumas UFs.
- Escopo Brasil → UF → município → zona → local → seção. Brasil agrega por UF e é reservado a presidente; os outros cargos são consultados por UF.
- Navegação com aprofundamento por linha e caminho territorial para voltar aos níveis anteriores.
- Candidatura e partido (votos nominais mais legenda quando aplicável); grupo manual de partidos por ano, com campo de referência para a composição. O grupo não é uma coligação/federação oficialmente certificada.
- Votos, participação nos válidos, diferença em pontos percentuais, cobertura e mudanças de local. Opção de somente chaves de seção comuns. Seções sem coordenadas permanecem na tabela.
- Agrupamento calculado no PostgreSQL: até 5.000 linhas por resposta. Totais usam o recorte completo; mapa/CSV usam as linhas exibidas. Um aviso exige aprofundar o filtro quando houver truncamento.
- CSV para PC e impressão/salvar PDF pelo navegador. Fontes, protocolo, filtros e SHA-256 incluídos no CSV. Para obter PDF, escolha “Salvar como PDF” na janela de impressão.
- Registro de cada análise: usuário, data, método, filtros, IDs dos imports/fontes, totais e hash do JSON calculado. O hash é de integridade do resultado, não uma assinatura digital do TSE. Na versão 2.0, o resultado retornado, até 5.000 linhas, fica arquivado. O submenu Relatórios permite reabrir, verificar o hash, exportar CSV e imprimir PDF. Relatórios antigos sem snapshot mantêm apenas seus metadados.
- Investigações com hipótese, método, explicações alternativas, fontes, conclusão, responsável de revisão, status e histórico das revisões anteriores. Controle de concorrência evita sobrescrever uma revisão alterada por outra pessoa. Sem exclusão pela interface.
- Comparação entre cargos no mesmo ano, UF e turno, com seleções independentes de candidato, partido ou grupo para A e B e denominadores próprios. Diferenças entre cargos não representam transferência individual de voto.
- Anexos privados em investigações: upload de até 4 MB pelo portal, hash SHA-256, referência da fonte, descrição e download temporário após autorização. Sem exclusão ou substituição pela interface. Hash não é validação de assinatura.
- Verificação de instalação: versão, commit do deployment quando disponível, migrações, catálogo e configuração do disparo GitHub. A tela não consegue ler os Secrets do GitHub e não os considera certificados.
- Estatística: Pearson das participações territoriais e regressão linear exploratória com cinco grupos alternados de linhas para treino/teste. MAE, RMSE e comparação com a média do treino. Requer pelo menos 15 pares e relatório não truncado. Os grupos não são blocos geográficos independentes: autocorrelação pode tornar o erro otimista. Não é previsão temporal de eleições futuras.
- Cenário hipotético de alteração uniforme da participação, mantendo o total válido de 2026 constante. Resultado expresso em votos, sem inferência de pessoas ou lealdade individual.

## Sincronização e progresso

A aceitação HTTP do GitHub confirma a solicitação, não o início do importador. “Na fila” com zero bytes não demonstra download em curso. O portal consulta as execuções recentes do workflow (20) e correlaciona o ID da tarefa com o novo run-name. Para execuções antigas sem o ID no título, oferece o link geral de Actions.

- Fila: 0%, com movimento visual de espera; não indica download iniciado. Descoberta sem total conhecido: movimento sem percentual.
- Processamento: avanço operacional por arquivo e fase. Download ocupa 35% da etapa do arquivo, leitura até mais 60%; arquivos preparados entram na contagem. São usados bytes recebidos e tamanho informado pela fonte, quando disponíveis, e bytes lidos do CSV. Limite de 99% antes da publicação; 100% somente após conclusão. Os pesos não representam porcentagem global de bytes nem tempo restante. Quando falta o tamanho, a fase mostra atividade e contagens sem inventar seu progresso.
- Concluído: 100% e carga publicada.
- Carga parcial ou esperando publicação: o texto indica a pendência; não significa cobertura eleitoral completa.
- Execução concluída com tarefa ainda na fila: verificar logs, Secrets, branch e script. A página avisa; não modifica o status do banco a partir de uma suposição.
- Sem atualização há cinco minutos: aviso para verificar Actions. A política existente de 30 minutos para tarefa interrompida continua.

O agendamento diário existente continua com a cobertura regional anterior (DF/GO/MG da RIDE). A opção de UF completa nesta versão é configurada por tarefa manual no portal; não configure outras UFs no agendamento regional. O importador preserva a carga publicada enquanto prepara a nova. Os turnos são mantidos separados e dependem de disponibilidade na fonte oficial.

## Interpretação científica

Diferenças de votação não provam transferência de eleitores, fidelidade ou cumprimento de promessa por líderes. Resultados públicos agregados ficam separados de cadastros e participação voluntária. A chave de seção pode ter mudanças entre anos; continuidade demográfica exige validação própria. Votos válidos para senador em pleito com dois votos não correspondem a quantidade de pessoas. A comparação mostra o denominador e não converte esse total em eleitores.

Pontos macro são médias das coordenadas disponíveis por seção, não limites oficiais nem centroides geográficos de polígonos. O mapa usa Leaflet/OSM e respeita os créditos; alta escala requer provedor de tiles com capacidade adequada ou infraestrutura própria. Não há geocodificação automática de endereços nesta versão.

INV-2026-001 é um relato de interrupção apresentado pelo solicitante, cadastrado como aguardando verificação. Não certifica interrupção oficial, irregularidade ou fraude. Evidências devem ser obtidas e revisadas antes de mudar o status.

## Evolução para inteligência preditiva verificável

A ambição é uma plataforma científica de referência, medida por cobertura, rastreabilidade, qualidade e desempenho em testes independentes. Esta entrega estabelece a base; não afirma superioridade mundial nem precisão preditiva comprovada.

Próximas etapas técnicas, ainda NÃO implementadas:

1. Proveniência integral: arquivos originais em armazenamento com SHA-256, manifestos, versão de schema, dicionário de dados, cobertura e testes de consistência; séries históricas anteriores a 2022.
2. Validação temporal: treinar em eleições passadas, testar em eleições posteriores sem vazamento; separar blocos geográficos, comparar com baselines simples, reportar calibração, MAE/RMSE e intervalos de previsão. Senado requer modelagem própria conforme votos permitidos por eleição.
3. Estatística espacial: autocorrelação, Moran, LISA, concentração, mudanças de fronteira/seção e análises com denominadores padronizados; correção para múltiplos testes.
4. Auditoria eleitoral: parsers documentados de BU/RDV/logs e verificação de assinatura com chaves oficiais; reconciliação com totais publicados e documentação das diferenças. Não há parser ou validação nativa destes arquivos nesta entrega.
5. Câmara/Senado: identificação dos parlamentares e conectores separados para comissões, projetos, votações e presença, com fonte/data e monitoramento. Os endpoints legados do portal não são certificados por este pacote.
6. Assistente de IA: respostas apoiadas exclusivamente em fontes recuperadas e métodos registrados, citando evidências, distinguindo fato/hipótese e recusando conclusões sem suporte. Sem chave, chamada a LLM ou respostas de IA simuladas nesta versão.
7. Gestão operacional separada: consentimentos, participação voluntária e tarefas de atendimento, sem inferência de voto individual a partir da urna. Mensurar atividades e alcance documentado, não “quem prometeu e não votou”.
8. Desempenho: materializações por partição, filas de tarefas, índices e testes de volume nacional, monitoramento de falhas, custos e SLA. A carga em tamanho real nacional ainda exige teste operacional no ambiente do cliente.

## Validação local

TypeScript, build Next e testes de importação/cálculo. Testes SQL em PostgreSQL/PGlite aplicam as quatro migrações, reaplicam a nova, exercitam agregação nacional, grupo com legenda, votos válidos, mudança de local, incompatibilidade de cargos, histórico e bloqueio anônimo. Testes de UI usam dados demonstrativos e tiles substituídos, sem consultas reais de votos nem conexões ao Supabase de produção.


## Extensão — séries históricas e validação temporal

A migração 20261026 amplia a sincronização para 2014/2018 e adiciona o submenu de séries históricas. O método, instalação, validação cronológica e limitações estão documentados em [IBFC-SERIES-HISTORICAS.md](IBFC-SERIES-HISTORICAS.md). Projeções permanecem exploratórias; esta entrega não constitui modelo probabilístico validado de eleições futuras.


## Extensão — automação legislativa

A migração 20261027 adiciona fila e agendas ao Observatório Legislativo. O worker do GitHub Actions executa o mesmo coletor com checkpoints, concessão temporária e controle de acesso. Instalação, comportamento de retomada e limites estão em [IBFC-AUTOMACAO-LEGISLATIVA.md](IBFC-AUTOMACAO-LEGISLATIVA.md). Não inclui CLDF ou publicação automática.
