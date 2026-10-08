# IBFC — Central de Acompanhamento legislativo

## Instalação
Pacote incremental com arquivos novos/alterados. Instalar após os pacotes anteriores até o Relatório Legislativo.
1. Aplicar no Supabase **20261030_ibfc_legislative_notices.sql**, depois das migrações anteriores, incluindo 20261027/20261028/20261029.
2. Substituir/adicionar os arquivos do ZIP no GitHub preservando as pastas e fazer deployment na Vercel.
Não exige novas dependências, variáveis, Secrets ou workflow. O teste SQL usa PGlite apenas no ambiente de validação.

## Uso
Ciência Eleitoral → **Central de acompanhamento**.
Selecione candidato (opcional) e exibição de pendentes ou todos os avisos disponíveis, incluindo os conferidos por você; clique **Atualizar avisos**. Lista paginada de 50 avisos. **Baixar página (JSON)** exporta a página consultada, com filtros e data de verificação.
**Marcar como conferido** é individual; outro administrador/editor continua com sua própria lista de pendências. **Reabrir minha conferência** remove a sua marcação e exige nova conferência, sem alterar a coleta ou os dados oficiais.

## Critérios
- Falha: estado da coleta ou da fila atualmente registrado como failed.
- Parcial: estado partial da coleta.
- Prazo expirado: coleta em segundo plano processing com prazo do worker ausente ou menor que o horário do banco.
- Fila sem atualização: queued em segundo plano e updated_at há mais de 30 minutos.
- Resposta de tramitação alterada: uma versão arquivada com hash diferente da versão imediatamente anterior, preservando referência para abrir essa consulta.

Falhas antigas não são reconstruídas a partir de ausência de registros. Uma coleta pausada voluntariamente não gera aviso de atraso. Fila recente e processamento com prazo válido não geram aviso de prazo expirado. Os limites indicam condições operacionais observadas; não comprovam falha da instituição.
Avisos de tramitação incluem todas as diferenças arquivadas, não apenas a última versão, inclusive A→B→B→A (dois avisos de mudança). Uma resposta igual à anterior não gera novo aviso. Diferença no hash pode ser apenas de metadados; abra a comparação antes de concluir.

## Origem
O link **Abrir coletas do parlamentar** abre o Observatório com candidato, instituição e categoria pré-selecionados. O histórico do Observatório mantém seu limite existente de 30 coletas recentes; o link não promete carregar especificamente uma coleta antiga fora desse limite.
Para avisos de tramitação, abra **Histórico de tramitação → Abrir versão deste aviso** no próprio cartão. Esta ação consulta exatamente o registro e a versão arquivada referidos no aviso, com a comparação anterior. Nenhuma consulta oficial é feita até solicitar leitura atual; abrir versão arquivada não depende de a fonte oficial estar acessível naquele momento.

## Conferência e ciclo de vida
A marcação é identificada por usuário e chave do aviso. Repetir a marcação não duplica o registro nem muda a data original. Um novo estado/versão da coleta gera chave diferente e nova conferência. Se a condição operacional deixar de existir, aquele aviso deixa a lista recalculada. A revisão antiga continua na tabela, mas não é apresentada como auditoria completa de transições da coleta. “Todos” significa todos os avisos disponíveis agora e todas as diferenças arquivadas; não significa todos os estados passados de todas as consultas.
Se o aviso mudar/resolver durante a marcação, a função recusa alterar um aviso já indisponível e orienta atualizar. Arquivos e dados oficiais não são alterados pela marcação.

## Segurança e funcionamento
Somente administrador/editor consulta e marca avisos. A função determina o usuário pela sessão; não aceita um identificador de outro revisor. RLS permite consultar apenas as próprias marcações e equipe autorizada. O view interno não é disponibilizado ao REST autenticado; funções verificam o perfil antes de ler fontes. Tokens do worker e dados de afiliados não são incluídos na saída.
Atualização sob demanda: critérios são calculados ao consultar o banco. Não envia WhatsApp/e-mail, não reinicia processos e não agenda novos serviços. A CLDF continua em validação; este pacote não altera seu estado de integração.

## Validação
37 testes unitários/API dos módulos atuais aprovados. Migração reaplicada em PostgreSQL compatível PGlite: condições temporais, exclusão de estados saudáveis/pausados, diferenças A→B→B→A, conferência privada/idempotente, mudança de versão, resolução, filtros, paginação, ausência de tokens e autorização. Interface com fonte simulada: falha/nova tentativa, abertura exata do arquivo, link de origem, conferência/reabertura, filtro de conferidos, JSON e layout móvel sem erros JavaScript. Build Next.js aprovado. Não instalado no Supabase/Vercel de produção do cliente.
