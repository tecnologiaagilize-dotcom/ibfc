# IBFC — Agenda de revisões

Pacote incremental sobre Compromissos públicos e Painel de compromissos. Não substitui o projeto completo.

## Instalação
1. Instale os pacotes anteriores e execute suas migrações, incluindo 20261031 e 20261101.
2. Execute `supabase/migrations/20261102_ibfc_commitment_agenda.sql` no SQL Editor do Supabase. O nome indica a sequência de instalação; pode executar agora.
3. Copie os arquivos deste pacote nas mesmas pastas do repositório IBFC e faça o deployment na Vercel.
4. Entre como administrador ou editor e abra **Ciência Eleitoral → Agenda de revisões**. Há também um link no Painel de compromissos.

Não há novas variáveis de ambiente nem configuração de serviços externos.

## Fluxo recomendado
1. Abra **Sem responsável válido** para encontrar compromissos abertos ainda não distribuídos.
2. Clique em **Definir revisão**, escolha o responsável e a data da próxima conferência e registre uma justificativa/orientação.
3. Use **Minhas revisões** ou **Revisões para hoje ou atrasadas** para consultar as tarefas.
4. Abra **Revisar evidências do político**, confira as fontes e registre a nova avaliação em Compromissos públicos.
5. Se necessário, reagende a próxima revisão. Para redistribuir depois, selecione Sem responsável: a data também será removida.

Salvar ou reagendar a agenda não comprova execução da revisão e não altera a situação do compromisso. As avaliações e as evidências continuam no cadastro próprio.

## Filas
- **Revisões para hoje ou atrasadas:** próxima revisão menor ou igual à data atual de Brasília.
- **Minhas revisões:** responsável é o usuário administrativo autenticado, incluindo revisões futuras.
- **Sem responsável válido:** não há responsável ou o responsável perdeu o perfil de administrador/editor.
- **Todos os compromissos abertos:** situações Registrado ou Em andamento, agendadas ou não.

A data da conferência interna é independente do prazo da proposta. Um compromisso com prazo vencido e sem agenda aparece em Sem responsável válido; não aparece automaticamente na fila de revisões para hoje até ser agendado.

Compromissos Cumpridos, Não cumpridos e Cancelados saem de todas as filas. O agendamento e seu histórico permanecem no banco. Nesta etapa, a tela da agenda consulta apenas compromissos abertos; não oferece uma fila de concluídos.

## Responsáveis e permissões
Administradores e editores podem definir e alterar responsáveis. Somente contas com esses perfis podem ser selecionadas. O catálogo restrito mostra e-mail, identificador e função de até 1.000 contas administrativas; não inclui contas comuns nem outros campos de autenticação.

Se um responsável perder esse perfil, a atribuição antiga permanece registrada, é sinalizada como inválida e pode ser redistribuída. A regra de perfil é a mesma do restante da Ciência Eleitoral: admin ou editor em admin_profiles.

A escolha do responsável e a data são obrigatórias em conjunto. É possível retirar ambos com uma justificativa. Datas passadas são permitidas e aparecem imediatamente como pendentes.

A aplicação valida uma versão de agenda ao salvar. Se outra pessoa já alterou a agenda, ou o compromisso foi concluído, a gravação é recusada: atualize e reabra a edição. Se houver falha de rede depois de salvar, atualize para conferir o resultado antes de repetir; uma repetição com versão antiga não sobrescreve o registro.

## Histórico e exportação
Cada alteração registra antes/depois, usuário que a efetuou, instante e versão do compromisso no momento da mudança. A tela mostra 20 alterações por página. Não há exclusão do histórico pela aplicação. Administradores do banco continuam sujeitos às permissões próprias do banco; não é um arquivo criptograficamente imutável.

A fila mostra 20 compromissos por página, ordenados por próxima revisão, prazo da proposta e identificador. Os filtros são por fila e político. Use Atualizar agenda para consultar novas alterações; não há atualização contínua.

O download JSON inclui somente a página de compromissos, filtros, data de referência, instante da consulta e informações do responsável dos registros exibidos. Não inclui o catálogo completo de contas administrativas. O arquivo é de uso interno e deve ser tratado como tal.

## Limites
Não são enviados e-mails, mensagens WhatsApp, notificações ao responsável ou lembretes automáticos. Nenhuma informação é publicada no portal. Este módulo não usa dados de eleitores, não infere votos e não faz avaliações automáticas sobre políticos.

## Validação realizada
- Banco local compatível com PostgreSQL (PGlite): migração repetível, filas de compromissos abertos, referência de data, catálogo restrito, atribuição/reassociação/retirada, perda de perfil, conflito de versão, histórico, retenção de concluídos, paginação e permissões.
- Dez testes de API e exportação, incluindo regressão do cadastro e painel anteriores.
- Navegador com APIs simuladas: atribuição, fila pessoal, histórico, conflito e atualização, retirada, paginação, exportação sem catálogo de contas, formulário móvel e largura da página.
- Compilação de produção Next.js.

A instalação e a validação no Supabase/Vercel de produção do cliente não foram realizadas.
