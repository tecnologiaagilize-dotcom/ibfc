# IBFC — Inscrições e fila de espera

Pacote incremental. Mantenha as atualizações anteriores, especialmente as migrações 20261019 e 20261023. Copie os arquivos nas mesmas pastas do repositório, execute `supabase/migrations/20261024_ibfc_community_enrollments.sql` no SQL Editor do Supabase e faça novo deployment na Vercel.

Acesse **Comunidade → Inscrições e fila**. Também existe um link ao selecionar uma atividade em **Atividades comunitárias**.

## Funcionamento
- Selecione uma atividade, cadastre nome e e-mail, registre a referência da autorização voluntária e confirme a autorização.
- Vagas disponíveis geram confirmação; quando a capacidade se esgota, a inscrição entra na fila por ordem de cadastro. Capacidade não definida significa ausência de limite.
- Cancelar retira a autorização. Cancelar ou excluir uma inscrição confirmada libera a vaga e confirma a primeira pessoa da fila, enquanto a atividade estiver aberta.
- A exclusão remove os dados pessoais daquela inscrição. Novo cadastro de um e-mail cancelado exige nova autorização e entra novamente na ordem atual.
- E-mail normalizado evita inscrições ativas duplicadas na mesma atividade. E-mail compartilhado exige revisão administrativa e não comprova identidade.

## Limites desta etapa
Somente administradores e editores podem usar o módulo. Não há inscrição pública, mensagens automáticas ou integração de envio ao CRM neste pacote. A confirmação não gera presença: a presença real continua sendo registrada separadamente. A capacidade controla inscrições antecipadas e não bloqueia registros reais de presença.

Encerrar ou cancelar uma atividade bloqueia novas inscrições e promoções; não cancela em massa os registros existentes. A equipe pode cancelá-los ou excluí-los individualmente. Capacidade e programação ainda não possuem edição nesta tela. A seleção mostra até 500 atividades e a tabela até 500 inscrições; contagens e promoção utilizam a base completa. Não há histórico completo de alterações das inscrições.

## Verificação local
Build de produção, execução repetida da migração e testes de vagas, ordem da fila, duplicidade, retirada de autorização, exclusão e permissões. Incluem-se scripts de validação; precisam de PGlite/Playwright e adaptação do caminho local. Nenhuma alteração foi aplicada automaticamente à produção.
