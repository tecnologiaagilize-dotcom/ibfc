# Nova IBFC Academy — arquitetura independente
- Entrada administrativa: `/admin/academy`.
- Seções reservadas: cursos, trilhas e biblioteca.
- Persistência alvo: `academy_courses`, `academy_modules`, `academy_lessons`, `academy_resources`, `academy_enrollments`, `academy_progress`.
- O módulo anterior `/admin/cursos` e suas tabelas legadas não são utilizados pela nova navegação; seus dados não foram apagados.
- O acesso administrativo existente é checado via Supabase Auth e `admin_profiles`. Antes de adicionar edição de conteúdo, criar controles administrativos seguros server-side e políticas RLS revisadas.
- A migração anterior não prova permissões corretas em produção. Validar tabelas/policies, teste de acesso aluno versus administrador e build Next.js antes de publicar.
- A página de catálogo do membro ainda requer substituição do uso de `courses` pelo novo esquema para completar a separação.
