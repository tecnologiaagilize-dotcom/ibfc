# IBFC — Painel de compromissos

Atualização incremental sobre `IBFC_COMPROMISSOS_PUBLICOS.zip`. Não é um projeto completo.

## Instalação
1. Instale primeiro o pacote de Compromissos públicos e execute a migração 20261031.
2. Execute `supabase/migrations/20261101_ibfc_commitment_report.sql` no SQL Editor do Supabase. A data do nome indica sequência; pode executar agora.
3. Copie os arquivos deste ZIP para as mesmas pastas do repositório IBFC e faça o deployment na Vercel.
4. Entre como administrador ou editor e abra **Ciência Eleitoral → Painel de compromissos**.

Não são necessárias novas variáveis de ambiente. Esta versão consulta os compromissos existentes; não importa propostas de fontes externas nem altera as avaliações.

## O que muda
- Painel com total de compromissos, políticos com registros no filtro, prazos vencidos, prazos próximos, compromissos classificados como cumpridos e registros sem prazo.
- Distribuição por Registrado, Em andamento, Cumprido, Não cumprido e Cancelado.
- Filtros por político, UF cadastrada, situação e prazo.
- Tabela por político, com até 50 políticos por página.
- Acesso direto ao cadastro filtrado do político, onde ficam fontes, justificativas, evidências e histórico.
- Exportações CSV e JSON da página consultada.

O catálogo de seleção reutiliza o endpoint do Observatório, com limite de 1.000 políticos. A consulta sem seleção específica abrange todos os políticos com compromissos que atendam aos filtros, inclusive além desse limite.

## Regras dos indicadores
A referência dos prazos é calculada no banco, usando **America/Sao_Paulo**. A data exata aparece no painel e nos arquivos exportados.

- **Prazo vencido:** somente Registrado ou Em andamento, com prazo anterior à data de referência. Um prazo que vence hoje não está vencido.
- **Hoje até 30 dias:** somente Registrado ou Em andamento, com prazo entre hoje e hoje + 30 dias, inclusive.
- **Sem prazo:** qualquer situação, quando não foi informado prazo.
- **Cumprido:** situação atual cadastrada pela equipe; não é uma certificação externa.

Os indicadores abrangem todos os registros do filtro, e não somente a página de políticos exibida. Cada compromisso é contado uma vez; as versões do histórico não aumentam a contagem. Grupos de prazo podem se sobrepor às situações; não devem ser somados às categorias de situação como se fossem grupos separados.

A seleção de UF usa o estado informado no cadastro do político. Não representa automaticamente a abrangência geográfica de cada proposta.

Mudanças de filtro, atualização ou paginação geram nova consulta. Falhas removem os resultados da consulta anterior para evitar exportá-los sob outro filtro. O painel não atualiza continuamente: use Atualizar painel para consultar novas revisões.

## Exportações
O CSV tem uma linha por político da página e inclui filtros, instante da consulta, data de referência, contagens e última atualização. Usa UTF-8 com BOM e separador ponto e vírgula. Textos que possam executar fórmulas em planilhas recebem proteção.

O JSON preserva indicadores do conjunto filtrado, filtros, data de referência e somente os políticos da página consultada. Não é uma exportação integral de todos os compromissos nem um arquivo de todo o histórico. Para consultar evidências individuais, abra os registros do político.

## Limites de interpretação
As contagens descrevem apenas o que foi registrado pela equipe. Não medem produtividade parlamentar, não criam nota de desempenho e não verificam automaticamente o conteúdo dos documentos de evidência. Ausência de registros não significa ausência de propostas públicas.

Este módulo continua restrito a administradores e editores. Não envia notificações, não publica avaliações no portal público e não cruza dados de eleitores.

## Validação
- Banco local compatível com PostgreSQL (PGlite): repetição da migração, contagens completas, prazos de Brasília e limites de 30 dias, ausência de duplicação pelo histórico, filtros, consulta vazia, paginação de 53 políticos e permissões de administrador/editor/membro/visitante.
- Sete testes automatizados de API e exportação, incluindo regressão do cadastro anterior.
- Navegador com APIs simuladas: paginação, indicadores, filtros, CSV/JSON, acesso ao cadastro filtrado, falha e nova tentativa, estado vazio e largura de celular.
- Compilação de produção Next.js.

Não instalamos nem testamos este pacote no Supabase ou na Vercel de produção do cliente.
