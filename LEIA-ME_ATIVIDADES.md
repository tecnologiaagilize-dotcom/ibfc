# IBFC — Atividades comunitárias e presença vinculada

## Instalação
Pacote incremental. Mantenha os módulos anteriores, inclusive organizações, demandas, mapa e relatórios.
1. Copie os arquivos do ZIP para os caminhos no GitHub.
2. Execute supabase/migrations/20261023_ibfc_community_activities.sql após a migração 20261019 no SQL Editor do Supabase. A aplicação também usa utilitários da atualização de demandas (20261020).
3. Faça deployment na Vercel. Nenhuma variável de ambiente ou dependência nova.
4. Entre como admin/editor: Comunidade → Atividades. Acesso direto /admin/comunidade/atividades.

## Uso
Cadastre organização, título, objetivo comunitário, datas inicial/final, local público, responsável e capacidade planejada opcional. A atividade nasce como Planejada. Na tabela, selecione-a para atualizar situação com justificativa ou registrar presença já realizada.

Situações: planejada, em andamento, concluída ou cancelada. Não é possível marcar em andamento antes da data inicial nem concluída antes da final. Alterações usam versão do registro para evitar sobreposição por outra pessoa; se houver conflito, recarregue a página e selecione novamente.

Para presença, informe nome, data dentro da programação e referência de autorização. A organização e o título vêm da atividade selecionada. O banco valida o vínculo, período, data não futura no horário de Brasília e atividade não cancelada. Retirada de autorização/exclusão continuam em Organizações e participação. Retirar autorização não apaga o registro; sua contagem vigente diminui. Excluir remove o registro de presença.

## Preservação e significado
Registros antigos continuam sem vínculo estruturado; não há associação automática por nome. A capacidade é somente planejamento: não bloqueia a anotação de uma presença realmente ocorrida acima da estimativa. Registros de presença não são pessoas únicas; uma pessoa pode participar em mais de um dia, e não há deduplicação por nome.

A lista carrega até 500 atividades, da data inicial mais recente para a antiga, com aviso de parcialidade. Filtro de situação opera sobre essa lista. Organizações seguem o limite anterior de 500 no formulário. Contagens por atividade são feitas sobre todos os registros vinculados no banco, não sobre a lista antiga de participações exibida no outro submenu.

## Escopo desta entrega
Planejamento e situação de atividades; referência de local público; capacidade planejada; vínculo entre atividade e presença; validação de datas e organização; contagens de registros e de autorização vigente; última justificativa administrativa. Campos de planejamento ainda não têm edição após cadastro e não há histórico completo de mudanças de situação: exibe a última justificativa.

Inscrições antecipadas, pessoas únicas, controle de vagas, fila de espera, convites e mensagens CRM/WhatsApp, publicação ao membro e relatórios específicos de atividades não estão implementados neste pacote. O módulo não vincula participação a votos nem avalia entrega eleitoral de organizações.

## Segurança
Acesso admin/editor na API e banco. Inserção/alteração das atividades passa por função protegida. O vínculo de presença é validado em gatilho do banco, incluindo as gravações que não vierem da tela. A tela exige declaração de autorização registrada pela equipe; não substitui a obtenção do termo. Evite documentos ou prontuários no texto.

## Testes
node --test tests/community-activities.test.cjs
Validação feita com Node 24, TypeScript/build de produção, PostgreSQL local e navegador. Nenhuma migração ou deployment foi executado no ambiente de produção.
