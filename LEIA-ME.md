# IBFC — Observatório legislativo

Pacote incremental: mantenha as atualizações anteriores. Suba os arquivos nas mesmas pastas do GitHub, execute `supabase/migrations/20261025_ibfc_legislative_observatory.sql` no SQL Editor do Supabase e faça novo deployment na Vercel.

Acesse **Ciência Eleitoral → Observatório legislativo**.

## Primeiro uso
1. Selecione o candidato cadastrado, Câmara ou Senado e uma categoria.
2. Informe o identificador oficial do parlamentar. Não use o número eleitoral.
3. Escolha as datas, com até 366 dias por coleta. Votações da Câmara exigem datas dentro do mesmo ano.
4. Clique em **Verificar perfil oficial**, confira o nome retornado e confirme o vínculo.
5. Inicie a coleta. A tela busca e salva lotes sucessivos, com opção de pausa. Se fechar a página ou ocorrer falha, use **Retomar esta coleta** no histórico.
6. Consulte os registros na categoria/instituição selecionada, avance as páginas ou baixe a página exibida em JSON.

## O que coleta
- Câmara: órgãos/comissões; proposições de autoria com detalhe; votações e registro nominal publicado do deputado; eventos com relação publicada de participantes.
- Senado: comissões; processos de autoria no serviço atual `/processo`; votações no serviço atual `/votacao`, com voto publicado do senador.
- Comissões utilizam composição/histórico disponíveis, sem filtro pelas datas. Proposições usam a apresentação e eventos o início do evento. Votações usam os filtros da fonte e a data publicada.

O serviço antigo de votações do Senado e o antigo de autorias indicam desativação em 01/02/2026. O novo módulo utiliza os substitutos oficiais. O cliente antigo também passa a identificar serviços desativados; sua rota deixa de anunciar uma coleta com erros como concluída sem ressalvas.

## Garantias e limites
Cada lote é salvo atomicamente. Uma falha de consulta não avança o cursor. Repetição da mesma chave atualiza o registro em vez de duplicar. Conflitos entre sessões são detectados pela versão da coleta. Não há porcentagem fictícia quando a fonte não fornece total; a tela mostra os lotes e registros processados.

Os dados ficam restritos a administradores e editores. Não são publicados automaticamente no perfil, não há envio a afiliados, nem atribuição de votos secretos. Ausência de voto nominal não comprova falta ao plenário. A lista de eventos futuros pode representar participação prevista. Não calculamos taxa de presença com base em votos.

A execução automática depende de a tela permanecer aberta. Não existe agendamento de coleta legislativa neste pacote. O histórico exibe as últimas 30 coletas; o catálogo até 1.000 candidatos; a tabela e o JSON até 50 registros por página. Os registros persistem e são atualizados por chave: registros retirados da fonte não são apagados automaticamente. Não é um retrato integral e imutável da atuação nem um histórico completo das versões do conteúdo.

A paginação da Câmara tem limite de 1.000 lotes: se houver continuidade, a coleta encerra como parcial. Fonte em mudança durante a paginação pode exigir nova coleta. Senado divide votações e processos em janelas de sete dias. Respostas acima de 8 MB e formatos incompatíveis produzem erro explícito. A categoria de eventos/presença do Senado ainda não está disponível.

Esta etapa não inclui CLDF, planos de governo do TSE, comunicação com parlamentares, revisão/publicação automática, nem modelos de previsão futura.

## Validação
Build de produção; testes de entradas, formatos oficiais, paginação, sigilo, falhas e serviços desativados; SQL com permissões, reexecução da migração, lotes atômicos, versões e retomada; teste da tela em desktop/celular e download.

Os novos formatos de processos e votos foram conferidos com respostas reais do Senado. Consultas de exemplo à Câmara excederam o prazo neste ambiente; seus conectores foram conferidos com a especificação oficial e respostas simuladas. A coleta real da Câmara deve ser validada após implantação. Nenhum banco de produção foi alterado pelo assistente.

Testes incluídos exigem Node com suporte a TypeScript, PGlite e Playwright/Chromium para os scripts correspondentes; ajuste os caminhos locais. A rota temporária de preview não integra o pacote de produção.
