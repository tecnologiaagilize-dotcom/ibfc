# IBFC — coleta legislativa em segundo plano

Pacote incremental: somente arquivos novos ou alterados nesta etapa. Requer o pacote anterior do Observatório Legislativo e sua migração 20261025. Preserva os módulos de comunidade, mapas e séries históricas.

## Instalação

1. Executar `supabase/migrations/20261027_ibfc_legislative_background.sql` no SQL Editor do Supabase do IBFC, após a migração 20261025. A migração preserva registros e coletas manuais existentes. Não reaplicar a 20261025 depois dela.
2. Copiar os arquivos para os mesmos caminhos do repositório IBFC correto. Incluir a pasta `.github/workflows`: o arquivo `ibfc-legislative-sync.yml` precisa estar no GitHub. O cron usa o arquivo da branch padrão do repositório.
3. Fazer novo deployment na Vercel.
4. No GitHub → Settings → Secrets and variables → Actions → Secrets, manter `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do IBFC. São os mesmos Secrets do importador TSE.
5. Na Vercel, reutilizar `GITHUB_TSE_TOKEN`, `GITHUB_TSE_REPOSITORY` e `GITHUB_TSE_REF`. Alternativamente usar `GITHUB_LEGISLATIVE_TOKEN`, `GITHUB_LEGISLATIVE_REPOSITORY` e `GITHUB_LEGISLATIVE_REF`. O token deve acessar o repositório configurado com Actions em leitura/escrita. O fallback da branch é `main`.
6. Para atualização agendada, GitHub → Settings → Secrets and variables → Actions → Variables → New repository variable:
   Name: `IBFC_LEGISLATIVE_AUTO_ENABLED`
   Value: `true`
   Não incluir espaços no nome. O workflow verifica as agendas às 03h43 de Brasília no fuso atual, sujeito à fila do GitHub.

## Utilização

Ciência Eleitoral → Observatório legislativo → selecionar parlamentar/fonte/categoria → Verificar perfil oficial → confirmar vínculo → Segundo plano → escolher somente esta coleta, diária ou semanal → Iniciar coleta desta categoria.

A primeira coleta usa as datas do formulário. As futuras usam uma janela móvel de 1 a 90 dias. Comissões mantêm o histórico/composição disponível na fonte sem filtro temporal. Para votos da Câmara, a janela é limitada ao ano corrente.

O bloco Fila e atualização em segundo plano mostra lotes salvos, registros processados, heartbeat, pausas e agendas. Pode fechar o portal. Ao atingir o orçamento de 25 minutos do worker, o checkpoint aguarda a próxima execução agendada ou uma retomada pelo portal. Desativar agenda não pausa o processamento atual.

## Entrega

Worker GitHub Actions com checkpoint, bloqueio temporário de processamento, pausa/retomada, retry de falhas transitórias e prevenção de duplicação após perda de resposta HTTP. A execução manual anterior permanece disponível. As agendas habilitadas no banco dependem do workflow ativo e da Variable global.

Não adiciona CLDF, tramitação detalhada, planos de governo, publicação automática ou envio de mensagens aos afiliados.

## Validação

28 testes JS de worker/conectores/estatística/cronologia; migração aplicada e reaplicada em PGlite; isolamento de acesso, token privado, claim exclusivo, commit idempotente, pausa/expiração, agendas e transferência de responsável verificados. YAML, TypeScript e build Next.js de produção aprovados. Interface testada em desktop/celular com respostas simuladas, incluindo reabertura após conclusão e fallback manual.

Nenhuma migração, workflow ou coleta autenticada foi executada no ambiente de produção do usuário. Os testes de worker usam fontes simuladas e não comprovam disponibilidade contínua das instituições.

Método e limites: `docs/IBFC-AUTOMACAO-LEGISLATIVA.md`.
Testes Node: `node --test tests/legislative-worker.test.cjs tests/legislative.test.cjs` com Node 24.
Teste SQL: `tests/legislative-background-sql.test.mjs`, requer `@electric-sql/pglite` no ambiente de desenvolvimento. Nenhuma dependência de produção foi adicionada.
