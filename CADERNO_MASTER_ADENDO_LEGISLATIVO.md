# Caderno técnico master — observatório legislativo

## Arquitetura
Tela `/admin/ciencia-eleitoral/legislativo`; API administrativa `/api/admin/science/observatory`; normalização `lib/legislative/collector.ts`; contratos/validação `lib/legislative/types.ts`.

Migração `20261025_ibfc_legislative_observatory.sql` cria:
- `ibfc_legislative_runs`: vínculo confirmado por coleta, instituição, categoria, intervalo, cursor, versão, situação e erros.
- `ibfc_legislative_records`: registros únicos por candidato, instituição, categoria, identificador do parlamentar e chave externa.
- `ibfc_legislative_batches`: páginas publicadas com fonte, quantidade e data de coleta.

Função `ibfc_legislative_run_save(jsonb)` verifica perfil administrativo e executa início, falha ou gravação atômica. Bloqueia a coleta, confere versão, publica os registros e avança o cursor em uma transação. Uma falha mantém a mesma página; outra sessão não pode publicar sobre uma versão anterior. RLS permite leitura administrativa; escrita direta por usuários é revogada.

A API verifica autorização e origem, consulta URLs fixas oficiais, revalida o identificador na fonte ao iniciar e aplica SHA-256 canônico ao conteúdo armazenado. A confirmação humana associa o nome oficial ao cadastro, sem busca aproximada automática. O hash registra integridade do conteúdo coletado; não é assinatura digital da instituição nem prova de veracidade jurídica.

## Coleta
Câmara: paginação oficial com `links.next`, URLs reconstruídas localmente; órgão usa ID oficial, proposição ID próprio e voto usa ID da votação. Detalhes de votos/eventos são lidos antes de confirmar todo o lote. Links de continuidade arbitrários não são seguidos.

Senado: `/votacao?codigoParlamentar=...&dataInicio=...&dataFim=...` e `/processo?codigoParlamentarAutor=...&dataInicioApresentacao=...&dataFimApresentacao=...`, em janelas de sete dias. A chave de voto inclui `codigoSessaoVotacao` e sequencial, evitando colapsar votações diferentes da mesma matéria. Registros secretos não são atribuídos a parlamentares. Payload armazena somente o voto do parlamentar selecionado, além dos dados gerais da votação.

Limites de rede: 10 segundos por consulta, 8 MB por resposta e erro em formato incompatível. Função Vercel solicita até 60 segundos; disponibilidade depende do plano/configuração. Pausa ocorre após o lote em curso, preservando a transação.

## Fontes verificadas
- Câmara: https://dadosabertos.camara.leg.br/api/v2/api-docs
- Senado: https://legis.senado.leg.br/dadosabertos/v3/api-docs
- Votações: https://legis.senado.leg.br/dadosabertos/votacao
- Processos: https://legis.senado.leg.br/dadosabertos/processo

## Continuação
Agendamento/worker persistente, detalhe de tramitação, revisão editorial e publicação verificada; integração CLDF e documentos eleitorais; alertas de alteração, histórico de versões e consolidação de presença somente com denominadores oficiais completos. O módulo mantém esses itens como pendentes.
