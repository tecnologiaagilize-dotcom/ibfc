# IBFC — relatórios consolidados, fase 6

Versão 2.9.0 · IBFC-CE-20261008-RELATORIOS-F6. Atualização incremental sobre a fase 5. Sem migração SQL, secrets ou novas dependências.

## Onde utilizar

Ciência eleitoral → Comparação múltipla → gerar comparação → Resultados do recorte → Relatório consolidado.

Na análise histórica 2022/2026, o mesmo conjunto de ações aparece dentro do Diagnóstico territorial. A análise de 2026 sem comparação continua independente; este pacote não torna 2022 obrigatório.

Ações: Visualizar relatório, Imprimir / salvar PDF e Baixar relatório HTML. A versão inicial é resumida. “Incluir detalhamento territorial completo” inclui todas as linhas retornadas, sem a paginação da tela. No histórico, a busca e a classificação visual não restringem o arquivo; isso é informado no próprio relatório.

## PDF e portabilidade

O botão abre a impressão do navegador. Escolha o destino “Salvar como PDF”. Não há geração de PDF no servidor nem promessa de download PDF automático. A configuração CSS recomenda A4 paisagem; o usuário pode alterar papel, margens e cabeçalhos no diálogo.

Se a janela for bloqueada, a interface explica como permitir pop-ups ou baixar o HTML e usar Ctrl+P no arquivo. O HTML é autossuficiente, sem bibliotecas ou requisições externas, e pode ser aberto offline. A prévia está isolada em iframe sem scripts; sua altura não limita o documento de impressão. Alterar o recorte limpa o relatório exibido na tela.

Os mapas PNG da fase 5 continuam separados. Não há incorporação automática de mapas, arquivo XLSX novo, nova central de documentos ou novo arquivamento do HTML/PDF no banco nesta entrega. CSV/JSON permanecem disponíveis e são recomendados para processamento de dados. Esta etapa implementa a saída de relatório nas duas análises existentes.

## Dados e método

Reutiliza comparisonLines, comparisonTotals e historicalSnapshot. Não recalcula os totais somando a tabela parcial. Preserva zeros, ausências, classificações históricas, denominadores e avisos de truncamento. Comparações de até dez seleções usam tabelas de até três por bloco para manter legibilidade.

Registra parâmetros, versão, data da exportação, horários das consultas, fontes, cobertura, protocolo e SHA-256 quando disponíveis. Os hashes são dos relatórios originais, não do HTML ou PDF. Consultas sequenciais não são uma transação única. Não deduz identidade de eleitores, fidelidade ou voto individual.

Texto de fontes e nomes é escapado; URLs são exibidas como texto, sem executar ou carregar conteúdo externo. A página exportada restringe scripts, conexões, formulários e recursos externos por CSP.

## Validação local

Dezoito testes unitários aprovados (seis novos, mais comparação múltipla e histórico). TypeScript e build verificados. Chromium com dados sintéticos: versão resumida e completa, prévia, download HTML, janela de impressão, geração PDF, bloqueio de pop-ups tratado, invalidação ao mudar ano, uso mobile sem overflow e sem exceções de página.

PDF de teste com 121 linhas: conferidos totais, última linha e protocolos; páginas renderizadas inspecionadas. Isso valida o mecanismo e a paginação de uma amostra, não bases de produção ou todos os navegadores. Nenhum deployment realizado.

## Aceitação após publicação

Conferir botão em Comparação múltipla e no Diagnóstico territorial. Testar PDF resumido e completo, HTML offline, fontes, recorte e bloqueio de pop-ups no navegador do administrador. Comparar totais e protocolo com os arquivos CSV/JSON existentes. Homologação operacional permanece pendente.
