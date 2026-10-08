# IBFC — relatório legislativo consolidado

## Instalação
1. Aplicar no Supabase a migração **20261029_ibfc_legislative_report.sql**, depois de 20261025, 20261027 e 20261028.
2. Substituir/adicionar os arquivos do pacote no GitHub, preservando as pastas; fazer novo deployment na Vercel.
Pacote incremental: requer os pacotes anteriores já instalados. Sem novas dependências, variáveis ou segredos de produção. PGlite é utilizado apenas no ambiente de testes SQL.

## Onde encontrar
Ciência Eleitoral → **Relatório legislativo**, novo submenu e cartão na visão geral.
Selecione candidato (opcional), instituição e categoria. Clique **Gerar relatório**. Trocar um filtro limpa o relatório anterior para evitar interpretar dados de outro escopo.

## Informações
- Registros persistidos por candidato, instituição, código oficial e categoria.
- Datas dos atos publicadas pela fonte, registros sem data e atualização mais antiga/mais recente dos registros naquele grupo.
- Distribuição de valores de votos nominais individuais publicados, com bucket separado para registros sem voto individual publicado.
- Estados atuais das consultas existentes: concluídas, parciais, com falha e na fila/processamento em segundo plano.
- Estado e janela solicitada da consulta iniciada mais recentemente.
- Proposições com versão de tramitação arquivada e total de versões preservadas.
- Exportação JSON e CSV de cada página, 100 grupos por página; totais de todos os grupos do filtro.

A consulta agregada ocorre numa única instrução SQL, usando uma visão consistente dos dados naquele instante. O relatório não consulta diretamente as APIs nem inicia sincronizações; descreve o que já está no banco. Os vínculos oficiais continuam dependendo da conferência no Observatório.

## Como interpretar
Contagem usa registros distintos da tabela, não a soma de itens processados por todas as coletas. Uma atualização do mesmo registro não multiplica sua contagem. Diferentes códigos oficiais mantêm grupos separados mesmo para um candidato, sem presumir que os vínculos são intercambiáveis.
Grupos sem registros podem existir quando uma consulta foi iniciada; zero registros coletados não significa ausência de atuação. Candidatos sem consultas e sem registros não aparecem como grupos do relatório.
A janela da consulta mais recente não define o período de todos os registros acumulados. Datas ausentes são contadas separadamente. Comissões podem incluir participações históricas, não necessariamente atuais. Eventos não são automaticamente convertidos em presença.
Os estados de consultas são os atualmente armazenados, não uma auditoria completa de transições: retomar uma coleta com falha pode mudar seu estado. Consultas antigas ainda em estado de falha continuam contadas mesmo quando outra consulta foi concluída. Processamento manual não é contado como fila/processamento em segundo plano.
Distribuição de voto nominal não mede comparecimento e não revela voto secreto. Não é relatório de produtividade, mérito ou ranking político. Atualização antiga não significa inatividade. CLDF continua em validação e não está incluída.

## Exportação e paginação
Os cartões mostram totais do filtro. A tabela, JSON e CSV mostram somente os grupos da página aberta. O JSON preserva filtros, geração e metadados da paginação. O CSV usa ponto e vírgula, UTF-8/BOM, aspas e neutralização de células que poderiam ser interpretadas como fórmulas.
Ordenação determinística por nome, candidato, instituição, código e categoria. Como o relatório é gerado novamente a cada página, mudanças no banco entre consultas podem mudar os grupos disponíveis; para uma fotografia permanente use a exportação e anote o horário.

## Acesso e validação
A função e a API exigem administrador/editor. Usuário comum e anônimo não consultam o relatório. Saída não inclui tokens, contatos ou informações de afiliados.
Validação SQL em PostgreSQL compatível PGlite: migração reaplicável, contagens, votos/datas ausentes, estados distintos, arquivo, filtros, 104 grupos com paginação, ausência de token na saída e autorização. Testes da API e proteção de fórmula no CSV. Interface com fonte simulada: falha/nova tentativa, filtros, exportações, limpeza ao alterar escopo, layout móvel e ausência de erros JavaScript. Build Next.js aprovado. Não implantado no Supabase/Vercel do cliente.
