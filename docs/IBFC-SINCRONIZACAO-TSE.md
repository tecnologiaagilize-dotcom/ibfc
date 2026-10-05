# IBFC — sincronização automática TSE

## O que muda

No administrador → Mapa eleitoral DF e Entorno, o botão **Sincronizar bases oficiais** consulta o catálogo oficial, baixa os ZIPs, lê os CSVs, filtra Brasília e os municípios da RIDE e atualiza o banco. Não há upload manual nessa operação. A importação manual continua como alternativa.

A Vercel inicia a tarefa; o GitHub Actions executa a carga Python. A página pode ser fechada. Ao voltar, o histórico e o progresso são consultados no Supabase. Há dois modos: carga direta iniciada pelo administrador e agendamento diário opcional de 2026, explicitamente habilitado nas Variables do GitHub. Não há disparo de mensagem a afiliados.

## Instalação única

1. Copie as pastas do ZIP consolidado na raiz do repositório IBFC. Inclua `.github/workflows/ibfc-tse-sync.yml`, `.npmrc`, `scripts/`, `lib/`, `components/` e `app/`. O arquivo de workflow deve estar na branch padrão/main. No GitHub, confirme que a aba Actions está habilitada.
2. No SQL Editor do **mesmo Supabase usado pelo IBFC**, execute o único SQL `supabase/migrations/20261009_ibfc_map_and_tse_sync.sql`. Ele instala/atualiza tanto o mapa quanto a automação e solicita recarga do schema cache. Requer as tabelas `admin_profiles` e `auth.users` da base do portal. Não execute os SQLs dos pacotes anteriores por cima do novo.
3. No GitHub do IBFC: **Settings → Secrets and variables → Actions → New repository secret**. Crie:
   - `SUPABASE_URL`: URL HTTPS do projeto Supabase do IBFC, igual à usada no portal.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave JWT `service_role` do mesmo projeto. É uma chave privilegiada, exclusiva do worker; não é a chave anon/publishable. Não a coloque no código, no ZIP ou em variáveis `NEXT_PUBLIC_*`.
4. Crie um token GitHub fine-grained restrito ao repositório IBFC com permissão **Actions: Read and write**, prazo de validade e acesso ao repositório correto. Use as telas de tokens do GitHub. Se a organização exigir aprovação, aguarde a autorização dessa organização. Não envie o token por chat.
5. Na Vercel → projeto IBFC → Settings → Environment Variables, acrescente, **somente no servidor**:
   - `GITHUB_TSE_TOKEN`: o token GitHub do passo anterior.
   - `GITHUB_TSE_REPOSITORY`: `tecnologiaagilize-dotcom/ibfc` (ajuste se o repositório tiver outro proprietário/nome).
   - `GITHUB_TSE_REF`: `main` (ou a branch padrão onde o workflow foi instalado).
   Use `.env.tse-sync.example` apenas como referência; não substitua as variáveis atuais do Supabase.
6. Faça novo deployment. Na página do mapa, escolha **2022** e **DF + GO** para a primeira carga. Clique em **Sincronizar bases oficiais**. Depois solicite 2026. MG é opcional para cobrir também os quatro municípios mineiros da RIDE.

Não é necessário passar a chave service_role para a Vercel por causa deste worker: ela fica nos Secrets do GitHub. O token de disparo GitHub fica na Vercel. As chaves públicas já usadas no portal permanecem como antes. O mapa Leaflet + OpenStreetMap não exige chave Google.

## Progresso e publicação

O painel mostra fila, processamento, arquivos preparados, registros enviados, MB baixados e última atualização. O valor de MB é acumulado entre arquivos, não um percentual de conclusão inventado. O histórico distingue concluída, carga parcial, aguardando publicação, falha e cancelamento.

Um arquivo preparado fica invisível para o mapa até o encerramento da tarefa. Se um download/processamento falhar, os arquivos novos dessa tarefa não são publicados; a última versão concluída permanece consultável. Quando o catálogo não possui alguns recursos, os disponíveis podem ser publicados, com status **Carga parcial** e lista de pendências. Não se anuncia cobertura total nessa situação.

O worker envia atualizações durante o download e a leitura. Se ele morrer sem registrar uma falha, os dados incompletos seguem invisíveis. Cancele a tarefa pelo painel e inicie outra. Tarefas sem atualização por mais de 30 minutos podem ser expiradas quando uma nova solicitação é feita. Após cancelar, a próxima operação do worker é recusada e a carga não é publicada. Não há retomada do byte exato de uma carga interrompida: a nova tarefa reinicia os arquivos para preservar consistência.

Somente uma tarefa fica ativa por vez. A fila também é protegida no banco, além da concorrência do GitHub. O servidor exige usuário admin/editor e origem da mesma aplicação. O endpoint nunca aceita URLs arbitrárias do usuário; os recursos são descobertos no catálogo e os redirecionamentos só podem permanecer nos servidores oficiais TSE. O worker tem limite de 4 GiB por ZIP e 40 GiB de CSV descompactado, processado em fluxo e sem extrair todo o CSV em disco.

## Cobertura, fontes e limites

A busca usa a API CKAN `package_show` para `resultados-ANO` e `eleitorado-ANO`. Os recursos são identificados por metadados e caminho do recurso, sem inventar URLs de resultados ainda não publicados. Para resultados: DF/GO/MG conforme seleção, mais BR para Presidente. Para locais: arquivo nacional com filtro de UF e municípios da cobertura.

Nesta implementação, a consulta real do catálogo confirmou os recursos de 2022 e o recurso de locais de 2026. Veja os resultados da verificação na entrega; não confunda disponibilidade de locais com disponibilidade de votação de 2026. A automação depende da publicação do recurso de votação por seção no catálogo; não coleta telas da apuração em tempo real.

Cada carga completa substitui as partições por UF/ano/eleição/turno/cargo presentes, sem misturar candidatos de UFs diferentes. Os registros históricos permanecem no banco: acompanhe armazenamento e retenção. O GitHub Actions consome minutos e recursos da conta; disponibilidade, filas e eventuais cobranças dependem do plano. O workflow tem limite de 350 minutos. Nenhum resultado real foi importado na produção por esta entrega.

O mapa continua agrupando seções por local de votação; não identifica urnas físicas por número de série, eleitores individuais nem promessas de voto. Planaltina/DF e Jardim ABC dependem da identificação das escolas por nome/endereço; classificação territorial por bairros/RA exige uma base específica.

## Diagnóstico

- **Função não encontrada no schema cache**: execute o SQL consolidado inteiro no Supabase correto. Confira se terminou sem erro. O SQL inclui `NOTIFY pgrst, 'reload schema'`. Se a função existir mas o erro persistir, execute essa instrução isoladamente e aguarde a atualização. Confirme que Vercel e Secrets GitHub apontam para esse mesmo Supabase.
- **Botão desativado por configuração**: faltam `GITHUB_TSE_TOKEN` ou `GITHUB_TSE_REPOSITORY` na Vercel; faça redeployment após configurar.
- **GitHub HTTP 401/403**: token expirado, permissão Actions insuficiente ou aprovação da organização pendente.
- **GitHub HTTP 404/422**: repositório/branch/workflow incorretos. Confirme `.github/workflows/ibfc-tse-sync.yml` na branch padrão e Actions habilitado.
- **Tarefa na fila sem progresso**: abra GitHub → Actions → IBFC sincronização TSE e veja se o workflow executou. O histórico do portal mostra o ID. Para recuperação manual, use Run workflow com esse ID enquanto a tarefa ainda estiver na fila.
- **Supabase recusou operação do worker**: confira os Secrets, a chave JWT service_role, o SQL instalado e o espaço disponível no banco. Os logs não imprimem credenciais ou corpos de erros com dados sensíveis.
- **Aguardando publicação/carga parcial**: consulte a pendência informada. Inicie nova sincronização quando o TSE publicar o recurso, sem apagar a base anterior.

## Verificação local

`npm run check`, `npm run build`, `node --test tests/electoral.test.cjs` e `python3 -m unittest discover -s tests -p 'tse_sync_test.py'`.

O worker usa somente a biblioteca padrão Python 3.12. Ele também pode rodar numa VPS com as mesmas variáveis de ambiente e `IBFC_TSE_JOB_ID` de uma tarefa válida criada no portal. O disparo padrão do portal continua sendo GitHub Actions; para um disparador VPS direto seria necessário configurar esse serviço separadamente.

Referências oficiais:
- https://dadosabertos.tse.jus.br/dataset/resultados-2022
- https://dadosabertos.tse.jus.br/dataset/eleitorado-2026
- https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event
- https://docs.github.com/en/actions/reference/limits

## Atualização: partidos e agendamento diário

Se já instalou o SQL 20261009, execute **somente** `20261010_ibfc_party_auto_sync.sql` para esta atualização. Ele substitui as funções de catálogo/comparação e acrescenta a função do agendador, sem apagar importações. Para primeira instalação, o SQL consolidado 20261009 deste ZIP já contém ambas as funcionalidades.

O botão “Sincronizar bases oficiais” inicia download e importação diretamente do TSE. Não pede arquivo. Se estiver desativado, o painel agora lista as variáveis ausentes da Vercel; não basta copiar o código para conectar contas externas. Configure Secrets GitHub e variáveis Vercel conforme os passos anteriores. A alternativa manual permanece recolhida abaixo do relatório.

O worker lê `NR_TURNO` de cada registro. Uma carga importa os turnos presentes no recurso oficial e os mantém separados. Na consulta, escolha primeiro ou segundo turno. Não se criam votos de um turno ainda não publicado; não é apuração em tempo real.

### Ativação do agendamento

Na branch padrão do GitHub, instale o workflow atualizado. Em Settings → Secrets and variables → Actions → **Variables**, configure:

- `IBFC_TSE_AUTO_ENABLED`: `true` para ativar; `false` para suspender.
- `IBFC_TSE_AUTO_OWNER_ID`: UUID de um administrador ativo do IBFC. No SQL Editor, consulte `select p.id,u.email from public.admin_profiles p join auth.users u on u.id=p.id where p.role='admin';` e escolha o responsável. Não informe email ou senha nesse campo.
- `IBFC_TSE_AUTO_SCOPES`: `DF,GO`, ou `DF,GO,MG`; opcional, padrão DF/GO.

Os Secrets `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` continuam obrigatórios. O agendamento não precisa do token de disparo da Vercel; o botão no portal continua precisando dele. O horário previsto é **03h17 de Brasília**, diariamente (06h17 UTC), sujeito a atrasos da fila do GitHub. Em repositórios públicos inativos, o GitHub pode suspender agendas; acompanhe Actions. Fontes: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule .

O agendamento busca apenas 2026; a carga de 2022 é iniciada no portal. Inclui os turnos publicados no catálogo quando o recurso os contiver. A função de agendamento aceita apenas service_role, atribui a execução ao administrador informado e não inicia outra enquanto uma tarefa estiver ativa. Se esse administrador for removido ou perder o perfil, o agendamento é recusado. Credenciais não vão para o navegador.

Cada execução baixa novamente os recursos e reprocessa a cobertura selecionada. Não é carga incremental por bytes ou por seção. Avalie minutos GitHub, banda e armazenamento do banco antes de ativar a agenda contínua. As importações históricas são preservadas; acompanhe retenção. Enquanto o TSE não publicar os resultados por seção, o sistema informa a pendência e mantém os dados anteriores.

Verificado localmente: soma partidária, separação dos turnos, restrições de acesso do agendador e importador. Nenhuma credencial externa, workflow de produção ou banco de produção foi configurado nesta entrega.
