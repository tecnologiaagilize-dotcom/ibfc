# Implementação e homologação — Disciplina 1

## Entrega de código

- Fontes pedagógicas: oito aulas, plano, caderno e registro de fontes nesta pasta.
- `scripts/academy/build-discipline-one.mjs`: gera o pacote e verifica presença das etapas didáticas. `--check` detecta divergência entre fontes e pacote.
- `lib/academy/discipline-one.json`: pacote para o servidor; oito aulas de 150 min. Aula 8 incorpora caderno e fontes, para não depender de acesso ao GitHub.
- `supabase/migrations/20261109_ibfc_academy_discipline_one.sql`: cria RPC transacional, sem executar instalação nem publicar conteúdo.
- `app/admin/academy/install-discipline-one.ts`: ação de servidor autenticada; não usa chave de serviço.
- `/admin/academy/cursos/[id]`: botão de instalação no curso-piloto em rascunho; mostra resultado e conflitos.

Não há migração de conteúdo religioso, alteração do CRM, envio de mensagens, anúncio, matrícula ou publicação automática. A função antiga de instalar o piloto e os 12 módulos foi preservada. Apenas seu rascunho inicial original pode ser atualizado pelo novo instalador, sob condições estritas.

## Contrato e preservação

A RPC aceita o curso e o pacote do servidor. Revalida `auth.uid()` e papel admin/editor, limita ao slug do piloto e exige curso em rascunho, módulo 1 reconhecido, posições consecutivas 1–8 e 150 minutos por aula. Usa `security definer` com `search_path` vazio e nomes qualificados para consultar também histórico de alunos e impedir atualização do rascunho inicial quando houver progresso. Execução é revogada para público e anônimo; autenticado sem papel administrativo também é recusado.

A operação adquire trava transacional por curso e bloqueia as linhas examinadas. Falha em qualquer aula ou recurso reverte todas as inserções da chamada. Conteúdo idêntico permanece inalterado; recursos são adicionados apenas quando a URL ainda não está associada à aula. Não remove recursos extras. Conteúdo editado, mídia ou publicação existente geram conflito. A exceção de atualização vale apenas para título, descrição, duração e texto exatos da aula inicial do instalador antigo, sem mídia, recurso ou progresso, preservando o ID. Qualquer outra versão exige revisão manual, sem substituição silenciosa.

O pacote é material de autoria usado por administradores, não entrada de aluno. Não há promessa de imutabilidade contra edição por administradores que já possuem permissão de autoria.

As 16 questões com gabarito comentado integram o conteúdo formativo. Nenhuma prova é inserida em `academy_assessments`, evitando misturar uma avaliação da disciplina com a certificação de todo o curso. Rubricas e feedback do projeto são registros humanos no caderno nesta versão. A tela do aluno existente apresenta `content_md` como texto preservando quebras; esta entrega não introduz um novo renderizador Markdown nem player de vídeo.

## Aplicação no ambiente real — pendente de acesso

1. Em homologação, verificar projeto, backup e migrações reais, sem inferir aplicação pela existência dos arquivos. A RPC requer fundação e políticas `20261103` a `20261105`; as telas acadêmicas gerais utilizam também avaliações/autoria/registros `20261106` a `20261108`.
2. Aplicar `20261109_ibfc_academy_discipline_one.sql` no projeto correto. A migração apenas define a função.
3. Disponibilizar a versão de aplicação desta alteração. Se o piloto não existir, executar o instalador de curso-piloto já existente no catálogo administrativo, que cria os 12 módulos em rascunho.
4. Abrir o curso-piloto e clicar **Instalar Disciplina 1 em rascunho**. Conferir mensagem; conflitos exigem revisão, não exclusão de aulas para contornar o instalador.
5. Verificar consulta abaixo, revisar aula 1 e caderno na aula 8, testar repetição e acesso com perfis diferentes.
6. Somente após revisão pedagógica e teste da jornada do aluno, decidir publicação. Não emitir certificado de 240 h por concluir a Disciplina 1.

```sql
select c.slug,c.status as course_status,m.position as module_position,
 count(l.id) as lessons,sum(l.duration_minutes) as minutes,
 count(l.id) filter(where l.status='draft') as drafts
from public.academy_courses c
join public.academy_modules m on m.course_id=c.id
left join public.academy_lessons l on l.module_id=m.id
where c.slug='empreendedorismo-digital-vendas-automacao-ia' and m.position=1
group by c.slug,c.status,m.position;
-- Após instalação: 8 aulas, 1200 minutos, 8 rascunhos, curso draft.
```

O banco Supabase real não foi acessado nesta entrega. Não se afirma que o piloto antigo ou a nova função tenham sido executados. Conector Supabase encontrado disponível, ainda sem instalação/conexão confirmada. O CRM Agilize e suas capacidades também não foram acessados; usar os roteiros da aula 2 antes de anunciar funções.

## Verificações reproduzíveis

```bash
npm ci --ignore-scripts --legacy-peer-deps
npm run test:academy-discipline-one
node tests/academy-learning-records/verify.mjs
npm run check
npm run build
node --test tests/*.test.cjs
```

Usa PGlite como PostgreSQL local isolado, declarado como dependência de desenvolvimento. Teste focal: autorização admin/editor, recusa de aluno e anônimo, validação de pacote, rollback por conflito na oitava aula, proteção do histórico, atualização exata do legado, preservação de ID, 8 rascunhos/1200 min, repetição sem duplicação, proteção de edição, bloqueio de curso errado/publicado e RLS de leitura. Não equivale a homologação em projeto Supabase hospedado.

Resultado em 27/10/2026: teste focal passou; testes existentes de registros acadêmicos passaram; tipos e build Next.js passaram. Suíte CJS geral: 151/152 passaram; um teste preexistente em `science-installation-status.test.cjs` falhou com `boundedProbe is not a function`. Verificação da base original documentada no PR. O módulo de ciência eleitoral não foi alterado nesta entrega.

## Reversão

Antes de instalar, exportar o módulo e seus recursos conforme procedimento do ambiente. Reverter o código não remove dados. Para desabilitar somente o novo instalador, remover a ação/botão e revogar a execução da RPC; não excluir aulas nem histórico. Uma reversão de conteúdo requer restauração revisada do backup, especialmente se já houver edições ou progresso. A migração não altera o esquema das tabelas existentes.
