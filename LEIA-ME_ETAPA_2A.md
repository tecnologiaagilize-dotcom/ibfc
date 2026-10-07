# IBFC — Etapa 2A: organizações e participação voluntária

## Instalação
1. Este pacote é incremental. Mantenha o portal e os pacotes anteriores, inclusive a Etapa 1 (migração 20261018).
2. Copie os cinco arquivos de aplicação e componentes para os caminhos presentes no ZIP. O AdminShell atualizado acrescenta o menu e preserva Ciência Eleitoral.
3. No SQL Editor do Supabase, execute supabase/migrations/20261019_ibfc_community.sql. Não exclua tabelas existentes. A migração pode ser repetida.
4. Faça deployment na Vercel. Nenhuma variável de ambiente nova é necessária.
5. Entre como administrador ou editor e abra /admin/comunidade, menu Comunidade e participação.

## Uso
Cadastre uma organização com município, UF, bairro/RA opcional e finalidade comunitária. Registre somente participação voluntária já realizada, com a referência da autorização. Não inclua CPF, título eleitoral, endereço residencial ou dados sensíveis na referência. O formulário não envia mensagens nem inscreve automaticamente os membros existentes.

Retirar autorização marca o registro; Excluir remove definitivamente o registro de participação. A retirada não equivale à exclusão. Nomes aparecem somente para administradores e editores. Até 500 organizações e 500 participações recentes são exibidas; se o limite for atingido há aviso. Não são contagens totais da base.

## Escopo entregue
Cadastro de organizações; participação realizada; autorização registrada; retirada e exclusão; submenu administrativo; controle de acesso tanto na API como por RLS no banco; formulários responsivos; mensagens de erro e salvamento.

## Próxima entrega — ainda não implementada neste ZIP
Camada comunitária agregada no mapa, unidades territoriais padronizadas, supressão de grupos pequenos, atividades e inscrições estruturadas, indicadores comunitários e protocolo de demandas. Não há vínculo entre pessoas e votação, nem contagem de votos prometidos/entregues. A camada eleitoral da Etapa 1 continua independente.

## Validação realizada
Build de produção Next.js e TypeScript; banco PostgreSQL local com PGlite: migração repetível, administrador autorizado, usuário comum sem leitura/escrita, anônimo bloqueado, referência de autorização obrigatória, retirada e exclusão. A navegação visual automatizada não concluiu no ambiente de teste; conferir os formulários no deployment antes do uso operacional. Banco e deployment de produção não foram alterados por este pacote.
