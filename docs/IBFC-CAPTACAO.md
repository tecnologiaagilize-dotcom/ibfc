# Cadastro e acolhimento IBFC

O portal registra participação voluntária no instituto. Não solicita posição política nem concede credenciamento de fiscal eleitoral.

Use o domínio real do portal nos links abaixo:

- Instagram: `/cadastro?origem=instagram_ibfc&campanha=brasilia_01`
- WhatsApp: `/cadastro?origem=whatsapp_ibfc&campanha=convite_01`
- Indicações: `/cadastro?origem=indicacao_ibfc&campanha=rede_01`

O parâmetro campanha é um rótulo de até 64 caracteres. Não inclua telefone, CPF ou outros dados pessoais no endereço. A origem é declarada pelo link, pode ser modificada e serve para acompanhamento operacional, não para comprovar origem ou autorização.

A região administrativa ou bairro é preenchida voluntariamente em texto livre. O interesse é escolhido pela própria pessoa. A autorização para WhatsApp e a autorização para conteúdos futuros continuam separadas.

O painel `/admin/captacao` exibe as últimas 200 inscrições correspondentes aos filtros, com origem, campanha, interesse, região, autorização de WhatsApp e etapa do atendimento. A API do CRM entrega somente inscrições com autorização de WhatsApp, incluindo região e campanha. Nenhuma mensagem é disparada por esta atualização.

Instalação: aplique `20260930_ibfc_capture_channels.sql` após a migração de leads. A nova informação é capturada nas próximas inscrições; registros antigos permanecem sem região/campanha. Esta etapa não importa a base de telefones existente nem presume autorização dos contatos.
