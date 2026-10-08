# IBFC — CLDF: consulta oficial e validação

## Instalação
Pacote incremental, apenas arquivos novos/alterados. Requer o pacote anterior de tramitação dos projetos da Câmara e o Observatório Legislativo já instalados. Preserve as pastas ao enviar os arquivos ao GitHub e faça novo deployment na Vercel. Não exige nova migração, variável, segredo ou dependência.

## Onde encontrar
Ciência Eleitoral → Observatório Legislativo → **CLDF · consulta oficial e validação**, abaixo dos registros coletados.

## Recursos
- Consultar catálogo de autores diretamente no PLE.
- Buscar proposições por nome de autoria, ano e período, com 20 registros por página da API; página começa em zero.
- Consultar detalhes, autoria, tramitação e documentos por ID oficial da proposição.
- Exibir resposta original recebida, URL, método, filtros, HTTP, tamanho, duração e data.
- Exportar JSON com resposta original e SHA-256 para conferência.
- Avisar falhas da fonte e identificar uma resposta anterior quando a atualização falhar.

O nome usado na busca é o publicado pela CLDF. Filtro textual não confirma identidade nem vínculo com candidato. O ID da consulta direta é o da proposição no PLE; não é o código parlamentar nem o número eleitoral. Os filtros de data seguem a semântica da API da CLDF, ainda não homologada neste conector.

## Limites e estado da integração
Esta é uma área administrativa de consulta e validação da fonte. O catálogo e o contrato documentado foram confirmados na documentação oficial, mas as chamadas reais aos endpoints de autores e proposição retornaram HTTP 502 nesta execução. Isso não comprova indisponibilidade universal: a resposta pode variar a partir da Vercel do cliente.

A interface não anuncia coleta validada ao receber simplesmente HTTP 200/JSON. O formato ainda precisa ser homologado com respostas reais. Não vincula registros a candidatos, não alimenta relatórios automaticamente, não agenda consultas da CLDF e não persiste respostas no Supabase. A exportação guarda a evidência da consulta para posterior validação.

Não deduz conclusão da paginação a partir de resposta vazia; não mostra metadados de contagem normalizados antes da homologação. Não interpreta movimentos como prova de presença parlamentar. Dados apresentados são a resposta bruta, sem atribuição de autoria pelo IBFC.

## Controles
Somente administrador/editor; valida origem; destinos e caminhos oficiais fixos; nenhum URL fornecido pelo usuário é acessado. Redirecionamentos bloqueados; timeout 12 segundos; resposta até 4 MB; entrada até 4 KB; busca limitada por autor, ano ou datas; período até 366 dias; página 0–999. Respostas não são cacheadas. Não acessa credenciais do GitHub nem envia a chave Supabase à CLDF.

## Validação
Testes de destinos, métodos/filtros, datas/páginas/IDs, resposta bruta, ausência de homologação, HTTP 502, HTML, JSON inválido, limites e autorização/origem. Build Next.js. Teste da interface com fonte simulada, incluindo erro e nova tentativa, filtros, exportação JSON e largura móvel. Sem implantação em produção e sem confirmação de sucesso da API real da CLDF.

## Fontes e próximo passo
https://dados.cl.df.gov.br/dataset/proposicoes
https://ple.cl.df.gov.br/pleservico/api/public
https://ple.cl.df.gov.br/#/proposicao/buscar

Após a fonte responder: validar catálogo/identificadores, autoria exata, esquema de proposições, metadados de paginação e movimentos. Somente então ampliar o worker e migrações para coleta persistente e agendamento da CLDF.
