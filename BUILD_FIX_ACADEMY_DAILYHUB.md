# Build Fix — AcademyDailyHub

Erro corrigido:

`Module not found: Can't resolve './academy/AcademyDailyHub'`

## Causa

`AcademyTab.tsx` já importava `AcademyDailyHub`, mas o componente e os serviços
da Sprint 7 não estavam presentes no repositório que foi enviado para a Vercel.

## Arquivos incluídos

- `src/components/panel/academy/AcademyDailyHub.tsx`
- `src/services/dailyRoutine.ts`
- `src/services/readingPlans.ts`
- `src/types/domain.ts`

Não é necessário executar SQL novo para corrigir este erro de build.
A funcionalidade completa da rotina diária depende das tabelas da Sprint 7
quando ela for usada em produção.
