# IBFC — Compromissos públicos

Pacote incremental sobre a versão com a Central de Acompanhamento (migração 20261030). Este pacote não é um projeto completo.

## Instalação
1. Execute `supabase/migrations/20261031_ibfc_public_commitments.sql` no SQL Editor do Supabase, depois das migrações anteriores, inclusive 20261030. O nome do arquivo indica a sequência; não é preciso esperar essa data.
2. Copie os arquivos do pacote nas mesmas pastas do repositório IBFC. Não substitua o projeto inteiro e não altere variáveis de ambiente.
3. Faça o deployment na Vercel.
4. Entre como administrador ou editor e abra **Ciência Eleitoral → Compromissos públicos**.

## Utilização
Selecione um político já cadastrado, informe título, descrição, endereço HTTPS da fonte pública, prazo opcional e uma justificativa. A seleção reutiliza o catálogo administrativo de candidatos (até 1.000 nomes, como o Observatório existente). Cadastros novos devem ser feitos no módulo de candidatos.

Situações: Registrado, Em andamento, Cumprido, Não cumprido e Cancelado. As três conclusões exigem um endereço HTTPS de evidência e justificativa com pelo menos dez caracteres. A avaliação é da equipe; não constitui classificação oficial da Câmara, Senado ou TSE. O sistema não consulta nem verifica o conteúdo das fontes ou evidências informadas.

Um prazo vencido aparece como pendência a revisar, considerando a data de Brasília. Não muda automaticamente a situação. Não há notificações externas, publicação no portal ou mensagens ao político nesta etapa.

Edite para registrar uma nova avaliação. O histórico preserva os registros antes e depois, usuário responsável e data. A aplicação não oferece exclusão. Administradores do banco e credenciais de serviço continuam sujeitos às permissões próprias do banco; isto não é um arquivo criptograficamente imutável.

Listagem: filtros por político e situação, 20 registros por página. Histórico: 20 revisões por página. A exportação JSON contém somente a página exibida, seus filtros e a data de exportação. Não é um relatório integral da base.

## Integridade e acesso
- Administradores e editores podem consultar e salvar. Usuários comuns e visitantes não têm acesso.
- Escrita somente pela função SQL autorizada; alterações geram histórico na mesma transação.
- Criação usa identificador de pedido para evitar duplicação ao repetir o envio. A repetição devolve o registro já associado ao pedido; não aplica novos campos.
- Edição verifica a versão carregada. Em conflito, atualize a consulta e reabra a edição; a alteração não sobrescreve silenciosamente outra avaliação.
- Endereços aceitos são HTTPS sem credenciais; não são baixados pelo servidor. Validação também ocorre no banco.
- Cadastros de eleitores, votos individuais e dados sensíveis não fazem parte deste módulo.

## Validação realizada
Testes locais de banco PostgreSQL compatível (PGlite): migração repetível, criação idempotente, exigência de evidência, URLs, justificativa, conflito de versão, auditoria e permissões.
Quatro testes de API: autenticação, origem, filtros, entrada inválida e chamada de gravação.
Tela em navegador com API simulada: seleção do político, cadastro, edição, evidência obrigatória, histórico, exportação JSON, largura móvel e ausência de erros JavaScript. Compilação de produção Next.js.

A instalação no Supabase/Vercel do cliente não foi executada nem validada. Se a seleção de políticos estiver vazia, confira o cadastro e a resposta de `/api/admin/science/observatory` no ambiente administrativo.
