# Biblioteca Digital IBFC — implantação

Pasta de origem informada: `1CsseakWfbZQpZtDQD5CbjRY1k8tzgw6G` (Books).

## Preparação
1. Aplicar `supabase/migrations/20261103_ibfc_library.sql` no Supabase do IBFC.
2. Configurar credenciais Google Drive **no servidor** com acesso à pasta, sem tornar o acervo público. Não inserir segredos no GitHub.
3. Criar sincronizador paginado com cursor e tratamento de mudanças; gravar arquivos autorizados em `ibfc-library`, bucket privado.
4. Cadastrar metadados como `draft`; revisar autoria, temas, capa, permissão de leitura e direitos antes de publicar.
5. Somente depois de validado o acesso seguro, liberar o leitor e os fluxos de progresso.

## Contratos
- `drive_file_id` é a identidade estável da importação. Nunca criar duplicata numa nova sincronização.
- Não sobrescrever metadados revisados manualmente com extrações automáticas.
- Se um arquivo sumir, marcar `unavailable` sem excluir o livro; conservar `library_reading` e `library_notes`.
- `current_page` é a localização; `pages_read` é contagem distinta editável, NÃO equivale à última página visitada.
- Anotações, metas e progresso são privados por usuário via RLS.
- O bucket não possui política pública de leitura; o backend deve validar autorização e emitir URL assinada curta.
- Não inserir URLs permanentes do Drive ou tokens OAuth na interface cliente.
- O catálogo exibe somente registros `published` para membros.
- Verificar licenças e direitos autorais por obra; possuir PDF não implica poder redistribuí-lo.

## Próximos incrementos
- Serviço Drive OAuth/conta de serviço e importação em lotes com retomada.
- Revisão editorial administrativa e cobertura da pasta/subpastas.
- Leitor PDF com URL temporária, progresso real, marcadores, metas e notas.
- Integração com Academy, cadernos de estudo, IA fundamentada e referências.
