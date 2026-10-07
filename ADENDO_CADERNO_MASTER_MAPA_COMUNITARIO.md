# Adendo ao Caderno Técnico Master — Mapa comunitário

## Status
Implementação local validada, pendente instalação no Supabase/GitHub/Vercel do projeto. Nova rota /admin/comunidade/mapa e API administrativa /api/admin/community/map. O módulo é independente do mapa eleitoral.

## Dados e apresentação
Organizações recebem coordenadas opcionais do ponto público de atendimento, nota de referência, operador e horário da confirmação administrativa. A função ibfc_community_map retorna o inventário de organizações e contagens de demandas registradas, abertas e vencidas. Não retorna registros pessoais de participação ou texto de demandas.

Leaflet/OpenStreetMap com camadas selecionáveis: organizações verdes; demandas abertas âmbar com o número no círculo. Filtros UF, município e RA/bairro sobre o cadastro. Sem coordenadas permanece na tabela. A equipe pode escolher o ponto clicando no mapa, informar coordenadas, salvar ou remover localização. A troca de tamanho da tela enquadra os pontos; a troca de camadas não duplica os números.

## Dependências
Migrações 20261019 e 20261020 e os arquivos anteriores de comunidade/demandas. Nova migração 20261021_ibfc_community_map.sql. Provedor e atribuição de tiles preservam a configuração já existente. Sem dependência Google Maps ou chave nova.

## Limites de interpretação
O ponto é uma localização de serviço declarada pela equipe, não a residência dos participantes, um polígono oficial de território, uma zona eleitoral ou a distribuição dos votos. Contagens descrevem solicitações da organização; não pessoas distintas, eleitores, apoiadores ou entregas eleitorais. Demandas sem organização vinculada são indicadas separadamente e não ganham ponto artificial. A tela informa limite de 1.000 organizações por consulta e avisa cobertura parcial.

## Verificações
22 testes de validação/cálculo passaram (mapa comunitário, demandas e regressão Ciência Eleitoral). Banco PostgreSQL local: migração repetível, integridade de coordenadas e referência, filtros de UF, contagem aberta/encerrada, prazos vencidos, organizações sem coordenadas, demandas sem vínculo, limite e truncamento, proibição de acesso anon/membro comum. Navegador: camadas/cores e número, localização por clique e gravação, filtro de bairro, escape de texto no tooltip, todos os pontos enquadrados no celular, sem overflow da página e sem erros JavaScript. Tiles foram simulados nos testes; não foi feita requisição real em massa ao OpenStreetMap. Revisão visual mobile concluída e build de produção/TypeScript validado.

## Plano restante
Relatórios operacionais de serviços, catálogo territorial padronizado, atividades/inscrições e respostas verificadas de representantes. A camada de registros pessoais ou participação voluntária não foi adicionada ao mapa; sua eventual agregação exige desenho de privacidade próprio e continua pendente.
