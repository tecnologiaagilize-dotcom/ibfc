# IBFC — Mapa comunitário de organizações e atendimento

## Instalação
Este ZIP é incremental. Mantenha o portal e os pacotes de Comunidade/Participação e Demandas já entregues. Requer migrações 20261019 e 20261020; o Leaflet local em public/vendor/leaflet-1.9.4 deve estar no projeto.

1. Copie os arquivos do ZIP para os mesmos caminhos no GitHub.
2. Execute supabase/migrations/20261021_ibfc_community_map.sql no SQL Editor do Supabase, após 20261019 e 20261020. Pode ser repetida e não exclui organizações/demandas.
3. Faça deployment na Vercel. Não há variável de ambiente nova nem chave Google Maps.
4. Como administrador/editor, abra Comunidade → Mapa comunitário. Acesso direto: /admin/comunidade/mapa.

## Primeiro uso
Cadastre a organização em Organizações e participação. No Mapa comunitário ela estará na tabela, mesmo sem coordenadas. Clique no nome, escolha “Escolher ponto no mapa” e clique no local público de atendimento. Também pode informar latitude/longitude manualmente. Preencha a referência, confirme que é local público e salve. As coordenadas nunca são atribuídas automaticamente ao município ou à residência de um participante.

## Camadas
Organizações: pontos verdes de atendimento cadastrados. Demandas abertas: pontos âmbar com a quantidade de solicitações abertas da organização. As camadas podem ser ativadas separadamente ou em conjunto; quando ambas estão ativas, a demanda aberta tem prioridade visual. Com ambas desativadas, o mapa fica sem pontos; a tabela permanece.

Abertas incluem aberta, em atendimento e aguardando retorno. Resolvidas/canceladas não integram a contagem aberta. Prazos vencidos seguem o dia de Brasília e excluem encerradas. Os números não representam pessoas, intenção de voto, apoiadores ou votos.

## Cobertura e limitações
UF, município e RA/bairro filtram os registros cadastrados. Município e RA/bairro são os textos já informados pela equipe, não um catálogo geográfico oficial. Os círculos não são limites de bairros ou zonas eleitorais. Demandas sem organização vinculada não recebem ponto; o aviso dessa quantidade refere-se a toda a base, independentemente da UF.

A consulta carrega até 1.000 organizações por UF (ou conjunto de UFs); ultrapassado o limite, mostra aviso de cobertura parcial. Filtros locais de município e bairro operam sobre os registros carregados. A tabela mostra todas as organizações deste recorte, independentemente das caixas das camadas; os registros sem coordenadas ficam nela para localização posterior.

O mapa de ruas depende da disponibilidade do provedor de tiles. O código usa Leaflet e OpenStreetMap, preservando atribuição; se um provedor customizado já estiver configurado, usa NEXT_PUBLIC_ELECTORAL_TILE_URL e NEXT_PUBLIC_ELECTORAL_TILE_ATTRIBUTION existentes. Não faz geocodificação automática, download massivo ou cópia offline de mapas.

## Segurança e escopo
Somente administrador/editor acessa o módulo; API e banco reforçam o acesso. Não expõe nomes de participantes, referências de consentimento, contatos ou descrições individuais de demandas no mapa. A consulta retorna organizações e contagens de solicitações. Localização é um ponto de serviço informado pela equipe, sem validação externa. Remover coordenadas não exclui a organização, suas demandas ou participações.

Esta entrega cria o mapa de serviços comunitários separado do mapa eleitoral. Não implementa mapa de eleitores/apoiadores, comparação entre participação e votos nem avaliação eleitoral de organizações ou lideranças.

## Testes de unidade
node --test tests/community-map.test.cjs
Requer Node com suporte nativo a TypeScript, usado Node 24 na validação.
