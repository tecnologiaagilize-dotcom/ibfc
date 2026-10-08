# IBFC — Revisão do arquivo completo e correção dos acessos

Base examinada: `ibfc-main (1).zip`, enviado em 08/10/2026. O original foi preservado. Este pacote contém somente arquivos novos ou alterados sobre essa base.

## Resultado da conferência
Os módulos recentes estão no ZIP: componentes, rotas administrativas, APIs e arquivos de migração. A rota dinâmica de Ciência Eleitoral já seleciona os componentes corretos, e a página de Ciência Eleitoral já contém os cartões de acesso.

O menu lateral de AdminShell, porém, ainda tinha apenas seis submenus antigos de Ciência Eleitoral. Sete módulos presentes no código não tinham entrada nesse menu. Além disso, o CSS ocultava todos os submenus em larguras abaixo de 1.100 pixels. A verificação de instalação tinha identificação antiga e não consultava as estruturas dos módulos recentes.

### Acessos ausentes no menu lateral original
| Módulo encontrado no arquivo | Rota existente |
|---|---|
| Séries históricas e validação temporal | /admin/ciencia-eleitoral/historico |
| Observatório legislativo | /admin/ciencia-eleitoral/legislativo |
| Relatório legislativo | /admin/ciencia-eleitoral/relatorio-legislativo |
| Central de acompanhamento | /admin/ciencia-eleitoral/acompanhamento |
| Compromissos públicos | /admin/ciencia-eleitoral/compromissos |
| Painel de compromissos | /admin/ciencia-eleitoral/painel-compromissos |
| Agenda de revisões | /admin/ciencia-eleitoral/agenda-compromissos |

## Correções aplicadas
1. O menu lateral passa a usar SCIENCE_VIEWS, a mesma lista de 13 módulos usada pela navegação e pelos cartões de Ciência Eleitoral. Há também o acesso à Visão geral. Novas entradas dessa lista passam a aparecer automaticamente no menu.
2. Celulares e tablets passam a mostrar os nomes dos links. Os submenus abertos ficam numa faixa horizontal que pode ser deslizada, e continuam podendo ser fechados ou reabertos.
3. O painel inicial administrativo recebe atalhos para Ciência Eleitoral, Observatório legislativo, cadastro de compromissos, painel e agenda.
4. A verificação de instalação passa a consultar também as estruturas e funções recentes, exibindo o nome da migração correspondente quando uma consulta falha.
5. Identificação de código atualizada para **2.3.0 / IBFC-CE-20261008-MENU-DIAGNOSTICO**. Essa identificação é do código entregue, não comprova instalação do banco ou cobertura de dados.

Não foram alterados os resultados eleitorais, os cadastros, a autenticação, os agendamentos ou as avaliações. Não há nova migração neste pacote.

## Instalação desta correção
1. Copie os arquivos deste ZIP para as mesmas pastas do repositório IBFC, substituindo somente os arquivos correspondentes.
2. Faça o deployment na Vercel.
3. Entre como administrador ou editor.
4. Abra **Ciência Eleitoral → Visão geral** e localize a identificação **IBFC-CE-20261008-MENU-DIAGNOSTICO**. Se ela não aparecer, o deployment aberto ainda não corresponde a esta correção: confira o commit, o projeto e o endereço do deployment na Vercel.
5. Clique em **Verificar instalação**. Confira as pendências no Supabase. Não basta manter arquivos SQL no GitHub: as migrações precisam ser executadas no SQL Editor do projeto correspondente.

Para os módulos recentes, os arquivos já encontrados no ZIP original são:
- 20261025_ibfc_legislative_observatory.sql
- 20261026_ibfc_historical_models.sql
- 20261027_ibfc_legislative_background.sql
- 20261028_ibfc_tramitation_archive.sql
- 20261029_ibfc_legislative_report.sql
- 20261030_ibfc_legislative_notices.sql
- 20261031_ibfc_public_commitments.sql
- 20261101_ibfc_commitment_report.sql
- 20261102_ibfc_commitment_agenda.sql

Execute somente etapas pendentes e respeite as dependências anteriores. Os nomes representam a sequência dos pacotes; não é necessário esperar as datas futuras indicadas nos nomes. Uma pendência de diagnóstico também pode decorrer de permissão ou indisponibilidade: confira o erro no Supabase antes de reaplicar algo já instalado.

O diagnóstico faz consultas somente de leitura. Para alguns módulos consulta tabelas, para outros consulta funções. Não testa operações de gravação, não verifica toda a migração histórica 20261026, não lê Secrets do GitHub e não comprova funcionamento de workers nem de APIs externas. A ausência de registros em uma estrutura instalada é aceita como disponível; não equivale a dados importados.

## Validação realizada nesta base enviada
- Compilação de produção Next.js do projeto completo revisado, usando dependências já instaladas no ambiente local.
- Doze testes automatizados de API e exportação: diagnóstico, cadastro de compromissos, painel e agenda.
- Navegador: presença dos 13 módulos e da Visão geral no menu lateral; nomes e acessos em computador, tablet e celular; acesso à agenda na faixa horizontal; fechamento/reabertura do submenu; aviso com nome da migração; ausência de transbordamento horizontal da página e de erros JavaScript.

Os testes de tela usaram respostas simuladas. Não acessamos o Supabase nem a Vercel de produção. Portanto, a revisão confirma os arquivos e a navegação; a aplicação das migrações, a versão do deployment e a carga de dados do cliente devem ser conferidas no ambiente correspondente.
