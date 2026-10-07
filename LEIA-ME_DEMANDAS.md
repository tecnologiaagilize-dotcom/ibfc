# IBFC — Demandas e atendimento comunitário

## Instalação
Este ZIP é incremental e depende da atualização anterior de Comunidade e participação (Etapa 2A / migração 20261019). Não substitui o portal completo.

1. Copie os arquivos do ZIP para seus caminhos no repositório GitHub. O arquivo components/admin/AdminShell.tsx atualizado abre o menu Comunidade com dois submenus.
2. Execute supabase/migrations/20261020_ibfc_community_demands.sql no SQL Editor do Supabase, após a migração 20261019. A nova migração é repetível e não exclui dados anteriores.
3. Faça novo deployment na Vercel. Não há novas variáveis de ambiente.
4. Entre como administrador ou editor: Comunidade → Demandas e atendimento. Acesso direto: /admin/comunidade/demandas.

## Funcionalidades
- Cadastro de demanda com título, descrição, organização opcional, tema, prioridade, responsável e prazo.
- Situações: aberta, em atendimento, aguardando retorno, resolvida ou cancelada.
- Cada atendimento exige uma nota; conclusão e cancelamento têm justificativa no histórico.
- Responsável e prazo podem ser alterados junto ao atendimento. Para reabrir, selecione uma situação aberta e registre o motivo.
- Histórico de atendimento persistido com operador e horário no banco. A tela exibe horário de Brasília.
- Bloqueio de edição sobre uma versão antiga: atualizar a lista e selecionar novamente se outra pessoa tiver alterado o registro.
- Indicadores de toda a base: total, demandas abertas, resolvidas, prazos vencidos e médias de primeiro atendimento e conclusão.
- Filtros por situação e tema, paginação de 50 registros e contagem exata do filtro.

## Significado dos indicadores
Em aberto inclui aberta, em atendimento e aguardando retorno. Prazo vencido é anterior ao dia atual em Brasília e exclui demandas resolvidas ou canceladas; ausência de prazo não significa atraso. Primeiro atendimento conta o primeiro registro posterior à criação. Conclusão considera o tempo entre criação e última conclusão das demandas atualmente resolvidas, incluindo eventual reabertura. Médias usam apenas demandas com eventos correspondentes; “—” significa sem amostra. Os indicadores descrevem registros internos e não comprovam tempo de resposta de autoridades, entrega de serviço ou satisfação da comunidade.

## Acesso e escopo
Somente administrador/editor consulta ou altera dados. Banco aplica RLS; gravações ocorrem em função protegida, que salva demanda e histórico na mesma transação. Eventos não podem ser editados ou excluídos diretamente pelo usuário autenticado. Não há publicação de dados pessoais, mensagem WhatsApp, disparo CRM ou resposta atribuída automaticamente a candidato. Não inserir prontuários, documentos pessoais ou endereço residencial no texto.

Organização e responsável são referências internas; não geram notificação nem atribuição automática de tarefas a uma conta. A tela de organizações mantém o limite anterior de 500 itens. Este pacote não implementa a camada comunitária no mapa, geocodificação, nem validação externa de respostas de representantes.

## Verificação após deployment
Cadastrar uma demanda de teste; abrir na fila; registrar andamento; concluir com justificativa; verificar histórico; filtrar resolvidas; verificar negativa de acesso com conta sem papel de equipe.

## Testes
node --test tests/community-demands.test.cjs
O teste usa suporte nativo a TypeScript do Node 24. O pacote de produção mantém as dependências existentes.
