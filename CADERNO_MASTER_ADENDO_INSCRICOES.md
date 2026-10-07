# Caderno técnico master — adendo de inscrições

Fluxo: atividade comunitária → autorização → confirmação ou espera → cancelamento/exclusão → promoção da primeira inscrição elegível.

Tabela: `ibfc_community_enrollments`. Funções: `ibfc_community_enrollment_save(jsonb)` e `ibfc_community_enrollment_list(uuid)`. API: `/api/admin/community/enrollments`. Tela: `/admin/comunidade/inscricoes`.

A gravação usa bloqueio da atividade para serializar a ocupação das vagas. A fila ordena por data de cadastro e UUID como desempate. A tabela tem RLS; gravações diretas de usuários comuns são bloqueadas. As funções verificam o perfil administrativo. A API valida entradas e origem das requisições de alteração. Dados de contato ficam no ambiente privado; não são exibidos no mapa eleitoral nem vinculados ao voto.

Inscrição, presença realizada, participação voluntária e resultados eleitorais agregados permanecem conceitos separados. Esta etapa administra atendimento comunitário, sem inferência de voto individual ou envio de comunicação.
