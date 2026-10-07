# Adendo ao Caderno Técnico Master — Etapa 2A

Status: implementação local validada; pendente instalação em produção.

A navegação administrativa passa a incluir Comunidade e participação, separada de Ciência Eleitoral. O banco contém ibfc_community_organizations e ibfc_community_participation, sem chave estrangeira para candidatos, votos, zonas ou seções. O território declarado descreve a organização, não o domicílio do eleitor.

A participação registra atividade realizada, data, referência de autorização, operador e data de criação. Retirada de autorização e exclusão estão disponíveis. Essa declaração da equipe não substitui o procedimento operacional de obtenção e guarda do termo autorizado.

Acesso: administrador/editor autenticado; RLS reforça as permissões da API. A lista é privada e limitada, não há endpoint público de dados pessoais. Não houve importação automática de membros ou integração de disparos CRM.

Aceite operacional: instalar migração 20261019; cadastrar organização; registrar atividade com autorização; verificar negativa de acesso para membro comum; retirar autorização; excluir o registro de teste. Revisar o layout em computador e celular.

Pendências da Etapa 2B: catálogo geográfico comunitário padronizado, métricas de participantes únicos, regras para grupos pequenos e camada agregada no mapa. Nenhuma dessas funcionalidades é declarada concluída nesta etapa.
