# Instituto Brasileiro da Família Cristã — portal IBFC

Projeto Next.js 16 com cadastro voluntário, área de membros, cursos, eventos, conteúdo e painel administrativo.

Esta é uma base completa para um repositório novo. A estrutura principal está na raiz (`app/`, `components/`, `lib/`), com alias `@/*` para essa raiz. Não a misture com arquivos de outro projeto Next.js que use `src/`.

## Instalação

1. Crie um repositório vazio ou remova os arquivos de código do projeto anterior antes de copiar esta base. Preserve apenas a pasta `.git` quando reutilizar um repositório.
2. Crie um projeto Supabase exclusivo para o IBFC. Execute `supabase/schema.sql` no banco vazio, depois `supabase/migrations/20260929_ibfc_leads_crm.sql` e `supabase/migrations/20260929_ibfc_sapf_pause.sql`. A última migração também desativa funções SAPF caso uma versão anterior já tenha sido aplicada.
3. Configure as variáveis indicadas em `.env.example` no ambiente local e no Vercel. Não coloque chaves privadas no GitHub.
4. Execute também `supabase/migrations/20260930_ibfc_capture_channels.sql` para registrar região e origem de captação. Rode `npm ci`, `npm run check` e `npm run build`.
5. Crie a conta da equipe no Supabase Auth e inclua seu UUID em `admin_profiles`. Confira login, cadastro, RLS e telas antes do acesso público.

O projeto de criação de partido está presente somente como área de planejamento administrativo. Não há formulário, fila pública, recepção de código do e-Título ou migração SAPF nesta etapa.

Se uma versão anterior do ZIP já foi copiada para o repositório, retire dela os seguintes arquivos antes de publicar: `app/membro/apoiamento/page.tsx`, `app/membro/apoiamento/actions.ts`, `app/admin/apoiamento/actions.ts`, `components/ibfc/QueueRefresh.tsx`, `supabase/migrations/20260929_ibfc_sapf_queue.sql` e `docs/IBFC-SAPF-INSTALACAO.md`. A simples sobreposição de ZIP não exclui arquivos antigos. O `proxy.ts` desta versão também bloqueia a antiga URL de membro caso um arquivo residual permaneça no repositório.

## Escopo desta etapa

- Portal público IBFC e cadastro da comunidade com autorizações de contato separadas.
- Área do membro com trilhas, eventos e conteúdos.
- Painel administrativo com membros, cursos e planejamento partidário restrito.
- Endpoint de integração CRM para cadastros que autorizaram WhatsApp.

O código de candidatos que veio da base MFB permanece no projeto para eventual migração técnica futura, mas não está no menu IBFC. Não importe automaticamente candidatos, declarações de apoio ou material do MFB para a base IBFC. A carga de exemplo da base antiga não integra este pacote.
