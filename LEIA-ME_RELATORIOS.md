# IBFC — Relatórios de atendimento comunitário

Pacote incremental: mantenha as atualizações anteriores de Comunidade, Demandas e Mapa comunitário.

## Instalação
1. Copie os arquivos deste ZIP para seus caminhos no GitHub.
2. Execute supabase/migrations/20261022_ibfc_community_reports.sql após 20261019 e 20261020 no SQL Editor do Supabase. A migração é repetível e não exclui os dados existentes.
3. Faça novo deployment na Vercel. Não há nova variável de ambiente ou dependência de produção.
4. Entre como administrador/editor: Comunidade → Relatórios de atendimento. Acesso direto: /admin/comunidade/relatorios.

## Uso
Informe UF, município/bairro por nome exato, situação, tema e período opcional. Clique Gerar relatório. O período é pela criação da demanda, inclusivo nas duas datas, usando Brasília. O resultado mostra os filtros efetivamente aplicados; alterar o formulário requer gerar novamente.

Filtros regionais usam a localização cadastrada da organização. Demandas sem organização só entram em consultas sem filtro regional. Os nomes de município/bairro são os textos do cadastro e não correspondem a um catálogo oficial padronizado.

## Indicadores
Total, abertas, resolvidas, canceladas, prazos vencidos e sem organização. Agrupamentos por tema e município calculados sobre todas as demandas do filtro, independentemente da lista detalhada. Em aberto inclui aberta/em atendimento/aguardando. Prazo vencido exclui encerradas e ignora ausência de prazo.

A lista detalhada limita-se às 1.000 demandas mais recentes; aviso informa quando for parcial. A planilha e a impressão seguem essa lista. Restrinja datas e região para um recorte completo. O agrupamento de municípios limita-se aos 500 com mais registros e avisa se truncado. Estes são registros internos; não comprovam entrega externa, satisfação da comunidade ou avaliação eleitoral.

## Exportação
Baixar planilha CSV faz download direto para o computador, com UTF-8 e separador ponto e vírgula. Pode abrir no Excel/LibreOffice. O arquivo inclui filtros, geração, total consultado, linhas exportadas e aviso de parcialidade. Campos que começam como fórmulas são neutralizados.

Imprimir / salvar PDF abre a impressão do navegador. Selecione Salvar como PDF. Não é download automático de PDF gerado no servidor. O layout de impressão esconde navegação e controles, mantém filtros/data/avisos e ajusta as tabelas para A4.

## Segurança
Somente admin/editor. API e função no banco verificam acesso. Não exporta nomes de participantes, consentimentos, descrições completas ou notas de atendimento; inclui títulos e responsável interno. Guarde os arquivos exportados conforme o controle interno do Instituto. Este pacote não altera dados nem envia mensagens CRM/WhatsApp.

## Testes
node --test tests/community-reports.test.cjs
Usa TypeScript já disponível como dependência de desenvolvimento e Node 24. Em produção permanecem as dependências anteriores. Testes de banco e navegador também foram realizados localmente; nenhuma instalação foi feita no ambiente de produção.
