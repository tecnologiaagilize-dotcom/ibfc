# IBFC: cadastro, CRM e fila de atendimento SAPF

Esta atualização aplica-se à base `mfb-main` enviada para adaptação ao IBFC. Copie os caminhos do ZIP sobre a raiz do projeto; mantenha os demais arquivos originais. Use um projeto Supabase separado para o IBFC, sem migrar automaticamente cadastros do MFB.

## Instalação

1. No banco IBFC, prepare primeiro o esquema base e as migrações necessárias para `member_profiles` e `admin_profiles`. Execute, nesta ordem, `supabase/migrations/20260929_ibfc_leads_crm.sql` e `supabase/migrations/20260929_ibfc_sapf_queue.sql`.
2. Crie a atendente no Supabase Auth e atribua sua conta a `public.admin_profiles` pelo procedimento administrativo do projeto.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. Para integração opcional ao CRM, configure `IBFC_CRM_API_TOKEN` com pelo menos 32 caracteres aleatórios, compartilhado somente entre os servidores.
4. Identifique a agremiação em formação e confirme que seu representante tem acesso autorizado ao Módulo Externo do SAPF. Somente depois, habilite a fila com nome e CNPJ reais:

```sql
insert into public.ibfc_sapf_campaign (id,party_name,party_cnpj,enabled)
values (true,'NOME EXATO DA AGREMIAÇÃO','CNPJ REAL DA AGREMIAÇÃO',true)
on conflict (id) do update set party_name=excluded.party_name,party_cnpj=excluded.party_cnpj,enabled=excluded.enabled;
```

O texto acima contém marcadores. O CNPJ deve conter 14 dígitos (pontuação opcional). A fila fica fechada até essa configuração. Para interromper novas solicitações: `update public.ibfc_sapf_campaign set enabled=false where id=true;`.

## Fluxo

- `/cadastro`: cria a conta IBFC e registra autorizações distintas para WhatsApp, conteúdos futuros e interesse em conhecer o projeto partidário. O cadastro não é apoio formal.
- `/membro/apoiamento`: com a agremiação identificada e a coleta habilitada, recebe título eleitoral e declaração específica, colocando a pessoa em espera.
- `/admin/apoiamento`: a atendente assume o atendimento; a pessoa vê que foi chamada e só então gera o Código de Autenticação no e-Título. O código deve ser lançado no SAPF em até 60 segundos. Código vencido é limpo e pode ser gerado novamente.
- “Lançado no SAPF” registra somente o relato operacional da atendente. Não emite certidão nem afirma validação oficial. A consulta de apoiamentos cabe ao módulo ConsultaWeb do TSE.
- Título eleitoral e código são apagados da fila quando o atendimento termina ou é cancelado. O código vencido é removido nas atualizações da fila. Eles não são exportados ao CRM ou WhatsApp.
- `/api/integracoes/crm/leads` entrega apenas inscrições que autorizaram WhatsApp. O CRM usa `member_id` como chave idempotente. A fila e os códigos não fazem parte dessa API.

## Operação

Mantenha as telas da pessoa e da atendente abertas durante o atendimento (atualizam automaticamente a cada 4 e 3 segundos). A atendente precisa de credencial própria e autorização para operar o SAPF, e deve informar os dados do eleitor e do responsável pela coleta no sistema oficial. Não peça senha do e-Título, selfie ou foto de documento. Como o código vale apenas 60 segundos, não o solicite durante o cadastro nem envie para uma fila de mensagens.

Não foi integrada uma API oficial do SAPF nesta etapa; a inserção é manual. Teste primeiro com contas e dados autorizados em ambiente controlado. Reavalie textos, fundamento jurídico e retenção de dados com assessoria especializada antes da coleta pública.

Referências: [SAPF](https://www.tse.jus.br/partidos/criacao-de-partido/sistema-de-apoiamento-a-partidos-em-formacao-sapf) e [orientação do TSE sobre e-Título e prazo de 60 segundos](https://www.tse.jus.br/comunicacao/noticias/2024/Fevereiro/aplicativo-e-titulo-fornece-assinatura-eletronica-para-apoiar-criacao-de-partido-politico).
