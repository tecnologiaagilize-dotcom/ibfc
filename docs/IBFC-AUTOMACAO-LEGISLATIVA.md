# Caderno técnico — automação legislativa

Esta etapa amplia o Observatório Legislativo da migração 20261025. Usa os mesmos conectores oficiais de Câmara e Senado, agora com execução independente do navegador. Não adiciona CLDF, tramitação detalhada ou planos de governo.

## Fluxo operacional

1. Em Ciência Eleitoral → Observatório legislativo, selecionar candidato, instituição, categoria, identificador oficial e intervalo.
2. Verificar o perfil oficial e confirmar sua correspondência. O código da instituição é diferente do número eleitoral.
3. Escolher segundo plano e, opcionalmente, atualização diária ou semanal. A janela das futuras atualizações varia de 1 a 90 dias; a primeira coleta usa o intervalo escolhido no formulário.
4. O portal cria a coleta, salva a agenda quando solicitada e envia o início ao GitHub Actions. O worker recebe prioridade para essa coleta e depois examina a fila existente.
5. O worker consulta as fontes, salva cada lote e atualiza sinais de atividade. O navegador pode ser fechado.
6. A fila mostra lotes salvos, registros processados e último sinal do worker. Não exibe percentual calculado pelo tempo, pois o total de páginas pode ser desconhecido.
7. Pausar invalida imediatamente a autorização do worker: um lote ainda em consulta não será gravado. Os lotes anteriores permanecem no banco. Retomar usa a próxima página ou janela semanal ainda não salva.
8. Ao reabrir o portal, a consulta usa o banco. A conclusão detectada pela atualização periódica também renova a listagem de registros.

A opção manual permanece disponível e depende da página aberta. Coletas anteriores são preservadas como manuais.

## Instalação

- Aplicar `20261027_ibfc_legislative_background.sql` após `20261025_ibfc_legislative_observatory.sql`. Não reaplicar a migração 20261025 depois da 20261027: a nova migração envolve sua função de gravação com controles de fila.
- Substituir os arquivos do pacote nos mesmos caminhos do repositório IBFC. Incluir `.github/workflows/ibfc-legislative-sync.yml`, `scripts/legislative_worker.cjs` e os módulos do portal.
- Publicar a atualização na Vercel. O coletor TypeScript e `lib/science/integrity.ts` dos pacotes anteriores precisam estar no repositório.
- No GitHub → Settings → Secrets and variables → Actions → Secrets, manter `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` corretos para o Supabase do IBFC. São os mesmos Secrets do worker TSE.
- A Vercel reutiliza `GITHUB_TSE_TOKEN`, `GITHUB_TSE_REPOSITORY` e `GITHUB_TSE_REF`. Alternativamente, aceita `GITHUB_LEGISLATIVE_TOKEN`, `GITHUB_LEGISLATIVE_REPOSITORY` e `GITHUB_LEGISLATIVE_REF`. O token precisa acessar o repositório configurado e ter Actions com permissão de escrita. A branch padrão de fallback é `main`.
- Para ativar a verificação diária das agendas, criar **Variable**, não Secret: Name `IBFC_LEGISLATIVE_AUTO_ENABLED`, Value `true`.
- O cron é `43 6 * * *`: 03h43 em Brasília no fuso atual. O GitHub pode atrasar a execução; o workflow agendado precisa existir na branch padrão do repositório. Não depende da Vercel aberta ou do portal aberto.
- Para desativar a verificação diária global, mudar a Variable para `false`. Para desativar uma agenda específica, usar o botão no portal. Desativar agenda não pausa a coleta já iniciada.

O workflow usa Node 24 e o coletor TypeScript com suporte nativo do Node. Não faz `npm install` nem introduz dependências de produção.

## Agendas

Cada agenda vincula candidato, instituição, código oficial e categoria. A janela automática termina na data corrente de Brasília. Para votos da Câmara, o início é limitado a 1º de janeiro do mesmo ano, preservando a restrição do conector. Comissões continuam usando composição e histórico disponíveis, sem filtro por intervalo.

A execução agendada verifica até 100 agendas vencidas. Uma agenda com coleta ainda incompleta retoma esse checkpoint, em vez de abrir outra coleta da mesma agenda. Uma coleta explicitamente pausada não é retomada automaticamente. Agendas diárias e semanais ficam elegíveis a partir da meia-noite de Brasília do próximo dia ou da próxima semana; são processadas na verificação posterior do workflow.

Uma agenda habilitada no banco não comprova que o cron global esteja ativo no GitHub. O portal informa essa distinção. Erros de responsável inativo aparecem na agenda ou na coleta.

## Controle de processamento e permissões

- Apenas administradores/editores usam os controles do portal.
- O worker usa RPCs restritas a `service_role`.
- A escolha de uma coleta ocorre sob bloqueio de linha com `SKIP LOCKED`. Só um worker obtém a concessão válida daquela coleta.
- A concessão dura 10 minutos e é renovada por heartbeat a cada 30 segundos e após gravações.
- Pausa, retomada e recuperação de concessão expirada invalidam tokens antigos. A função manual rejeita gravação em coletas de segundo plano.
- O token de processamento não pode ser lido pelo usuário autenticado. O portal usa projeção explícita de colunas; respostas de controle removem o token.
- A autoria original da coleta é preservada em `created_by`. Ao retomar, `background_owner_id` registra o administrador/editor responsável pela execução. Isso permite transferência para um responsável ativo sem reescrever a autoria original.
- Cada commit valida versão, página e concessão. Uma repetição imediatamente após perda da resposta HTTP retorna o lote já salvo sem duplicá-lo.
- Os hashes de conteúdo usam a mesma representação canônica do portal.
- O workflow serializa execuções em segundo plano e não cancela a execução atual. Como execuções pendentes do GitHub podem ser substituídas, cada worker também examina a fila existente após a prioridade solicitada.

## Falhas e limites

- Falhas temporárias de fonte, como HTTP 429/5xx ou timeout, têm até três tentativas. Erros permanentes de formato ou HTTP 404 não entram em repetição indefinida.
- O worker opera por até 25 minutos, com margem antes de iniciar outro lote. Ao atingir esse orçamento, devolve o checkpoint à fila. O próximo cron ativo ou uma retomada pelo portal continua o processamento.
- Até 100 coletas são examinadas por execução. O limite anterior de 1.000 lotes por coleta permanece: ao alcançá-lo, a cobertura fica parcial e deve-se reduzir o intervalo.
- Falha de disparo conhecida no GitHub é registrada como interrupção. Se a resposta HTTP não puder ser confirmada, a coleta permanece na fila; atualize o histórico antes de repetir o início.
- Sem atualização e com concessão expirada, o portal oferece retomada. Nenhum tempo decorrido é tratado como prova de conclusão.
- A lista mostra até 30 coletas de segundo plano e até 100 agendas do candidato; registros mantêm paginação de 50.
- Registros da mesma chave são atualizados pela coleta posterior, conforme o observatório anterior. O histórico de lotes não constitui arquivo imutável de todas as revisões do payload.
- Os conectores mantêm seus limites semânticos: composição publicada não prova presença; ausência de voto nominal não prova falta; voto secreto não é atribuído ao parlamentar; relação de evento futuro pode representar participação prevista.
- Não publica automaticamente informações em perfis nem envia mensagens a afiliados.

## Verificação desta entrega

- 28 testes JS de conectores, worker, estatística e validação temporal: checkpoint, hash, retry de commit, expiração/pausa, heartbeat e orçamento de tempo.
- Migração aplicada/reaplicada em PGlite com compatibilidade manual, exclusividade de claim, repetição de commit, retomada, pausa, expiração, agendas, transferência de responsável e acesso restrito.
- YAML do workflow verificado para cron, permissões, concorrência e comando.
- Interface em navegador com respostas simuladas: erro de disparo/retry, agenda, pausa/retomada, ausência de passos de coleta no navegador em modo background, reabertura após conclusão, exportação, celular e fallback manual.
- TypeScript e build Next.js de produção.

Não foram executados workflow, migração ou chamadas autenticadas no seu ambiente de produção. Esta etapa reutiliza os conectores oficiais já entregues; os testes do worker usam fontes simuladas e não comprovam disponibilidade contínua das instituições.

Referência oficial de disparo de workflows: https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

## Próxima etapa

Integração CLDF e detalhamento da tramitação, mantendo separadas fonte oficial, coleta, revisão e publicação institucional.
