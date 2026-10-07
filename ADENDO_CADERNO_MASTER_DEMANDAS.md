# Adendo ao Caderno Técnico Master — Demandas comunitárias

## Entrega
Submenu administrativo /admin/comunidade/demandas. Esta entrega implementa atendimento e monitoramento, separado do mapa eleitoral e de resultados individuais de votação.

## Entidades
ibfc_community_demands: demanda, organização opcional, título, descrição, categoria, prioridade, responsável interno, prazo, situação, justificativa de conclusão, versão, operador de criação e horários.

ibfc_community_demand_events: registro imutável de andamento, situação anterior/nova, nota, operador e horário. As funções ibfc_community_demand_save e ibfc_community_demand_summary controlam gravação atômica e indicadores. Os registros usam RLS e autorização explícita admin/editor.

## Fluxo
Registro → acompanhamento ou espera → resolução/cancelamento. Reabertura fica no histórico. Cada alteração administrativa exige nota. A versão bloqueia sobreposição de alterações concorrentes. Textos de atendimento são registros internos, não respostas automaticamente atribuídas a políticos.

## Métricas
Total geral, abertas, resolvidas, prazos vencidos, tempo médio até primeiro atendimento e até conclusão. Filtros da fila não modificam os indicadores gerais, como indicado na tela. Métricas de satisfação, resposta verificada de representantes, anexos, publicação ao solicitante e mensagens CRM ainda não estão implementadas.

## Instalação e validação
Dependência: migração 20261019 instalada. Nova migração: 20261020_ibfc_community_demands.sql. Aplicação: copiar arquivos e fazer deployment. Nenhuma alteração foi executada no ambiente de produção.

Passaram: build de produção/TypeScript; quatro testes de validação de formulário e prazos; testes PostgreSQL com migração repetida, permissão staff/member/anon, integridade do histórico, justificativa de conclusão, bloqueio de versão antiga e indicadores; teste navegador de criação, resolução, histórico e ausência de overflow horizontal em 390 px. Dados do navegador eram fictícios. Revisão visual feita no celular simulado.

## Pendências do plano maior
Camada comunitária agregada no mapa e unidades territoriais padronizadas permanecem pendentes. Esta entrega não cria relacionamento de pessoas ou demandas com o voto de qualquer candidato, nem pontua lideranças por entrega de votos.
