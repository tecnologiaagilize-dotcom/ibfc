# Correção do build Vercel — 18/10/2026

O componente legado `src/components/panel/academy/AcademyDailyHub.tsx` referencia bibliotecas internas e componentes não presentes nesta versão do IBFC. Nenhum arquivo da aplicação ativa importa esse componente (verificado no pacote recebido). Para manter os arquivos originais sem interferir na implantação, ele foi excluído **somente da verificação de tipos** em `tsconfig.json`.

A verificação TypeScript permanece ativa para o restante do projeto. Não foram alteradas rotas, autenticação, políticas Supabase ou migrações.

Essa é uma correção de compatibilidade de build, não uma implementação da funcionalidade AcademyDailyHub. Se a Academia for reativada futuramente, deverão ser restauradas as dependências ausentes e removida a exclusão.

Validação local completa não realizada: instalação de dependências excedeu o tempo disponível neste ambiente. Após publicar, conferir o log da Vercel e executar `npm run build` em ambiente com dependências instaladas.
