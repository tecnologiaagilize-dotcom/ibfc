# Módulo CBMDF / CMDP II — etapa 1

## Entregue
- Entrada no menu administrativo do IBFC.
- Painel em `/admin/cbmdf-cmdpii` com oito áreas de trabalho.
- Autenticação Supabase e autorização para `admin`/`editor`.
- Migração `supabase/migrations/20261018_ibfc_cmdpii_observatory.sql` com RLS e classificação de evidências.
- Consulta de registros recentes, com estado vazio e aviso de migração pendente.

## Para implantar
1. Revisar o diff com a versão em produção.
2. Aplicar a migração no projeto Supabase correto, preferencialmente primeiro em homologação.
3. Fazer deploy do código atualizado na Vercel.
4. Testar com usuário admin, editor e usuário comum.

## Próximas etapas (ainda NÃO implementadas)
- Formulários de cadastro, edição e revisão de registros.
- Upload seguro em bucket privado com hashes e trilha de custódia.
- Modelagem detalhada de contratos, pagamentos, assembleias e conciliação bancária.
- Fluxo de aprovação para publicação pública e anonimização de dados pessoais.
- Auditoria de alterações e relatórios comparativos.

Nenhuma denúncia ou irregularidade foi cadastrada como fato comprovado.
