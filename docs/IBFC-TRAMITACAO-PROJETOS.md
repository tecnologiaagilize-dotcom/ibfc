# IBFC — histórico oficial de tramitação

## Uso
Ciência Eleitoral → Observatório Legislativo → Câmara dos Deputados → Proposições de autoria.
Depois da coleta, em cada registro, abra **Histórico de tramitação** e **Consultar histórico oficial**.
A consulta mostra data, órgão, andamento, situação, regime, despacho e documento oficial quando publicado. Os movimentos são ordenados por data e sequência, com mais 50 movimentos a cada clique. O JSON contém todos os movimentos retornados, a resposta bruta, URL, horário e SHA-256.

## Instalação
Requer os pacotes do Observatório e da coleta em segundo plano já instalados, com migrações 20261025 e 20261027. Substitua/adicione os arquivos deste ZIP preservando as pastas e faça novo deployment. Nenhuma nova variável, dependência ou migração é necessária.

## Cobertura
O intervalo da coleta seleciona a data de apresentação das proposições. O histórico consultado abrange toda a tramitação retornada para aquela proposição; não se limita ao intervalo inicial e não procura automaticamente projetos antigos ausentes da coleta.
Consulta sob demanda, protegida para administrador/editor. Não modifica a fila nem a agenda existente. O histórico é consultado na fonte e pode ser exportado; não cria um arquivo histórico permanente no banco. Os registros já coletados continuam persistidos.
Falhas HTTP/formato/continuação não suportada não são convertidas em histórico vazio bem-sucedido. Em falha de atualização, a interface identifica que o histórico exibido pertence à consulta anterior. Limites: 8 MB, 10 segundos por consulta oficial, 5.000 movimentos. Documentos externos ou não HTTPS não são apresentados como links.
Tramitação não comprova presença parlamentar e cada movimento não representa um ato pessoal do autor.

## CLDF
A documentação oficial identifica API pública de proposições, autores e tramitações:
https://dados.cl.df.gov.br/dataset/proposicoes
https://ple.cl.df.gov.br/pleservico/api/public
Testes aos endpoints de autores e de filtro de proposições retornaram HTTP 502 nesta execução. A integração automática da CLDF não está habilitada neste pacote; falta validar respostas reais, identidade/autoria e paginação. Não confundir documentação disponível com coleta validada.

## Fontes
https://dadosabertos.camara.leg.br/swagger/api.html
GET /api/v2/proposicoes/{id}/tramitacoes — sem pagina/itens/ordem: esses parâmetros foram rejeitados HTTP 400 na consulta real. A interface pagina localmente o histórico recebido.

## Validação
Build Next.js aprovado. Testes de formato, ordem temporal, fonte fixa, falhas HTTP, continuação, documentos e acesso administrativo. Teste real de histórico da proposição 2121442 retornou dados oficiais. Sem implantação em produção ou teste autenticado no Supabase do cliente.
