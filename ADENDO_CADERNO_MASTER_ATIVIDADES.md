# Adendo ao Caderno Técnico Master — Atividades comunitárias

Status: implementado e validado localmente, pendente instalação em produção.

Rota /admin/comunidade/atividades; API /api/admin/community/activities; migração 20261023. Entidade ibfc_community_activities com organização, objetivo, programação por datas, local público, responsável interno, capacidade planejada, situação e última justificativa. Presença recebe activity_id opcional, sem migrar automaticamente os registros antigos de texto livre.

As gravações de atividade passam por função com verificação admin/editor e versão para mudanças de situação. O gatilho de presença valida organização, período, atividade não cancelada e data não futura em Brasília, e copia o título da atividade. O bloqueio da linha da atividade serializa a validação com alterações de situação. Retirar autorização/excluir uma presença continua possível mesmo após o cancelamento da atividade.

Contagens: registros de presença vinculados e registros com autorização não retirada. Não são pessoas únicas, inscrições ou vagas ocupadas. Capacidade não limita a anotação de presença realmente ocorrida. A lista limita-se a 500 atividades e avisa sobre parcialidade. Histórico completo de situação, edição de programação após cadastro, inscrições e lista de espera permanecem pendentes.

Validação: build de produção/TypeScript; testes de datas, capacidade, estados e versões; PostgreSQL local com migração repetida, vínculo e organização, datas, título validado pelo banco, retirada/exclusão e contagens, atividade futura/cancelada, versão antiga e negativa anon/membro; navegador com criação, presença autorizada, atualização de contagens, cancelamento e bloqueio de formulário de presença, mobile sem overflow e sem erros JavaScript. Revisão visual mobile concluída. Produção não foi alterada.

O módulo trata programação de serviços e participação voluntária. Não registra preferência eleitoral, votos individuais ou entrega eleitoral de organizações.
