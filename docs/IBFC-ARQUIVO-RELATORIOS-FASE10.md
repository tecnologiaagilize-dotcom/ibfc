# Central de relatórios arquivados — fase 10

Versão 2.13.0. Acesso: Administração → Ciência Eleitoral → Relatórios científicos.

## Entrega

Lista em páginas de 50 registros, busca por protocolo UUID e filtro de texto na página atual. Reabertura do snapshot original sem novas consultas de votação. A API valida protocolo e paginação, mantém acesso administrativo e responde sem cache. Busca direta retorna 404 quando o protocolo não existe.

CSV contém todas as linhas carregadas, totais originais, parâmetros, método, protocolo, hash, fontes e limitação de carga. JSON preserva o snapshot integral recebido e os metadados de verificação. A tela pagina as linhas sem limitar os downloads.

Relatórios com snapshot compatível e hash confirmado permitem diagnóstico de qualidade, prévia HTML e impressão/salvar PDF pelo navegador. Séries temporais compatíveis preservam sua visualização. Conteúdo original do snapshot não é alterado para acrescentar metadados de diagnóstico.

## Limites

O hash cobre o snapshot, não os parâmetros nem o HTML/PDF exportado; não certifica a exatidão da fonte. Integridade não confirmada mantém JSON/CSV para revisão, mas impede novo diagnóstico e relatório de impressão. Registros antigos ou incompatíveis mantêm JSON, sem fabricar linhas.

Paginação por deslocamento pode mudar quando novas análises são arquivadas; a busca por protocolo é o caminho estável. O filtro de texto busca somente na página carregada. Limite de deslocamento: 10.000. Mapas PNG continuam separados. Não há XLSX, incorporação automática de mapas nem relatório único que agrupe vários protocolos. O PDF é gerado pelo navegador.

## Instalação

Aplicar após a fase 9, preservando os caminhos relativos na raiz do repositório. Não há SQL novo, dependências ou variáveis adicionais. Incluímos também lib/science/territorial-layers.ts para restaurar o módulo ausente apontado no último build.

As migrações anteriores e a tabela ibfc_science_analyses devem estar instaladas. Este pacote não implanta no GitHub/Vercel automaticamente.

## Validação local

Build de produção Next.js 16.3.7 concluído; verificação TypeScript concluída. Cinco testes do arquivo e 22 testes de regressão de impressão, qualidade e reconciliação passaram. Não houve homologação com banco de produção nem teste end-to-end no navegador nesta entrega.
