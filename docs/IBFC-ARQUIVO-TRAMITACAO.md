# IBFC — arquivo e comparação de tramitações

## Instalação
Pacote incremental: requer os pacotes anteriores do Observatório Legislativo, tramitação da Câmara e consulta CLDF já aplicados.
1. No SQL Editor do Supabase, executar **supabase/migrations/20261028_ibfc_tramitation_archive.sql**. Requer a migração 20261025; não substitui as anteriores.
2. Substituir/adicionar os arquivos do ZIP no GitHub, preservando as pastas.
3. Fazer novo deployment na Vercel.
Não exige nova variável, segredo ou dependência de produção. O teste SQL utiliza PGlite no ambiente de validação; não instalar no aplicativo por causa desse teste.

## Uso
Ciência Eleitoral → Observatório Legislativo → Câmara dos Deputados → Proposições de autoria → Histórico de tramitação.
- **Consultar/Atualizar histórico**: leitura atual sem gravar versão.
- **Consultar e salvar nova versão**: nova leitura da fonte e arquivamento no banco. Não salva uma resposta antiga carregada na tela.
- **Consultar versões salvas**: lista de versões, 20 por página.
- **Versão para abrir**: histórico daquela consulta e comparação com a versão arquivada imediatamente anterior.
- **Baixar histórico completo (JSON)**: consulta aberta, incluindo referência da versão e comparação quando arquivada.

Uma atualização da fonte volta a exibir o histórico atual sem apresentá-lo como versão salva. Uma falha de atualização mantém a resposta anterior e informa a falha. Consultas falhas/incompletas não criam versões.

## Comparação
A sequência oficial identifica cada movimento. A comparação distingue:
- Novos: sequência não retornada na versão anterior.
- Alterados: mesma sequência com diferença em data, órgão, andamento, situação, despacho, regime ou documento.
- Não retornados: sequência anterior ausente na nova resposta. Não comprova exclusão oficial.
Sequências duplicadas/ inválidas impedem comparação inequívoca e geram aviso. A comparação não deduz irregularidade, aprovação, desempenho ou presença parlamentar.
O hash da resposta bruta também permite sinalizar mudanças em metadados ou campos fora do resumo. Textos resumidos respeitam os limites do conector; o JSON bruto permanece preservado.

## Persistência e concorrência
Cada salvamento bem-sucedido preserva uma versão, mesmo quando a resposta é igual ou retorna ao conteúdo de uma versão anterior (A→B→A). Tentativas repetidas com o mesmo identificador reutilizam a versão existente, inclusive se a fonte estiver indisponível no momento da repetição. O bloqueio do registro serializa salvamentos concorrentes e define a versão anterior.
A numeração exibida é um identificador crescente do arquivo global, não a contagem local de versões daquele projeto. Horário de arquivamento e horário da consulta são distintos das datas dos atos legislativos.

## Segurança e limites
Administrador/editor consulta e salva; usuário comum e anônimo não acessam o arquivo. Inserção via função protegida; usuários autenticados não podem editar ou apagar diretamente as versões. Administradores do banco/service role continuam com seus privilégios normais: não é armazenamento externo inviolável.
A rota consulta a fonte diretamente, sem aceitar uma resposta oficial fornecida pelo navegador. A função SQL é restrita a equipe autorizada; o hash não é assinatura digital da Câmara nem prova independente de autenticidade. Ele registra a integridade do conteúdo capturado. Nenhuma mensagem é enviada aos afiliados.
Somente proposições da Câmara previamente coletadas; ainda não cobre Senado ou CLDF. Salvamento sob demanda, sem coleta automática de tramitações. Arquivo permanece disponível mesmo quando a fonte oficial falha. Coleta limitada a 8 MB/5.000 movimentos; proteção adicional de tamanho na persistência; listagem paginada sem carregar todas as respostas brutas.

## Validação
33 testes unitários/API aprovados, incluindo módulos anteriores. Migração aplicada duas vezes em PostgreSQL compatível PGlite; cadeia de versões, repetição idempotente, A→B→A, proteção de alteração/apagamento, fonte fixa, rejeição de resposta parcial e RLS verificados. Interface simulada: falha/repetição com mesmo identificador, comparação, download, reabertura da primeira versão, atualização da fonte e largura móvel; sem erros JavaScript. Build Next.js aprovado. Não instalado ou testado no Supabase/Vercel de produção do cliente.
