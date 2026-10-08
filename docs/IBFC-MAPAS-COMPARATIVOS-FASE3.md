# Mapas comparativos — fase 3

Build `IBFC-CE-20261008-MAPAS-F3` · versão 2.6.0.

## Instalação e localização

Aplicar sobre as fases 1 e 2 já instaladas. Copiar os arquivos preservando caminhos e publicar novo deployment. Sem migração SQL e sem credenciais novas. Administrador → Ciência Eleitoral → Comparação múltipla: selecionar duas a dez candidaturas ou partidos compatíveis e concluir a consulta. A seção Mapas lado a lado aparece antes da tabela de resultados.

Escolher a seleção do mapa azul e do mapa vermelho. Escolher a mesma seleção do outro lado troca as posições, evitando duplicação. Mudar a dupla recalcula o enquadramento. Votos absolutos e participação percentual compartilham escala entre os dois mapas. O botão Enquadrar os dois mapas ajusta ambos à união de suas coordenadas. A navegação manual é independente; não há sincronização contínua de arrasto.

## Contrato de dados

Cada ponto usa as coordenadas e os votos do seu próprio relatório. Não copiar coordenadas de uma candidatura para suprir ausência em outra. Coordenadas inválidas ficam fora do mapa e continuam na tabela/exportação. Coordenadas iguais podem sobrepor registros; o número de coordenadas distintas não é número de urnas ou seções. As zonas aparecem como referências cartográficas, não perímetros oficiais. Popups preservam ano cartográfico, endereço quando disponível e descrição dos votos.

Os tamanhos crescem com a raiz quadrada da métrica usando o mesmo máximo entre a dupla, com raio mínimo de leitura. Zero confirmado recebe símbolo mínimo; resultado não calculável fica cinza. Não há interpolação de votos nem estimativa de eleitores individuais. Percentuais com denominadores, bases de cálculo ou granularidades diferentes não devem ser comparados diretamente; a tabela indica compatibilidade. Truncamento é exibido.

Ao clicar em um ponto, o painel mostra o território nas duas seleções ou informa sua ausência na outra. Isso usa a chave territorial do mesmo recorte consultado e não constitui correspondência histórica entre eleições. Relatórios continuam com fontes, horários, protocolos e hashes individuais da fase 2.

## Escopo

Esta fase entrega mapas atuais lado a lado em Leaflet/OpenStreetMap e seleção de duas colunas. Não entrega mapa histórico, sincronização contínua de movimento, exportação PNG ou novas integrações. No celular os mapas são empilhados. Não usa cadastros pessoais de apoiadores.

## Homologação de produção

Depois de publicar, testar duas candidaturas reais, conferir coordenadas de amostra e votos com fonte oficial, testar alternância de métrica, troca de dupla, detalhes, ausência de coordenadas, enquadramento e celular. Banco, fontes remotas e deployment de produção não foram acessados nesta etapa.

## Evidências locais

Build concluído com TypeScript e geração de rotas. 31 testes passaram nos conjuntos de mapas comparativos, comparação múltipla, camadas, API de zonas e ciência. Teste de interface com dois mapas Leaflet reais e respostas/tiles controlados passou: enquadramento inicial comum, troca de dupla, mudança de métrica sem recriar os mapas, detalhes ao clicar, enquadramento conjunto e mobile. A regressão da comparação múltipla também passou (limites, busca, CSV/JSON, cancelamento e erros). Página temporária de teste removida antes do build final. Não houve homologação de produção.
