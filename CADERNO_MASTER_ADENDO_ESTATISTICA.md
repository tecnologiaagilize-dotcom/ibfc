# Caderno técnico master — etapa estatística geográfica

Versão do método: `ibfc-aggregate-statistics-1.0`.

## Métodos
Participação ponderada = soma dos votos selecionados / soma dos denominadores × 100. Média territorial = média simples das participações válidas. HHI = soma dos quadrados da fração dos votos selecionados por território; número efetivo = 1/HHI. Sem votos selecionados, concentração permanece indisponível.

Regressão linear simples: participação de 2026 em função da participação de 2022. Respostas limitadas a 0–100%. Treino sem ponderação; erros apresentados sem ponderação e com ponderação pelo denominador observado de 2026. Modelo de referência: média da resposta de treino. Melhoria = 1 − erro quadrático do modelo / erro quadrático da referência; negativa significa pior desempenho. Referência com erro zero deixa a melhoria indisponível.

Blocos: escolher UF, depois município, zona ou local, no primeiro nível com três grupos completos distintos. Chaves incluem níveis superiores para evitar colisões. Ordenar chaves e distribuir grupos completos em até cinco folds. Cada linha é testada uma vez. Não há sorteio por linha. Dependência entre blocos adjacentes e cobertura histórica continuam sendo limitações. Este teste não é validação temporal.

Cenário: volume hipotético = denominador × (1 + variação percentual); participação central = participação observada + hipótese em pontos percentuais, limitada a 0–100. Sensibilidade expande a participação central pela amplitude digitada. Limites de entrada e ausências retornam resultado indisponível, não zero. O cálculo usa votos, não pessoas ou promessas de apoio.

## Rastreabilidade
JSON exportado inclui versão do método, protocolo e hash do relatório de origem, fontes, cobertura, exclusões, métricas e hipóteses. O relatório de origem mantém seu registro no banco. As hipóteses do simulador não são gravadas automaticamente no banco nesta etapa.

## Diagnóstico legislativo
Rota administrativa POST `/api/admin/science/legislative`, com autorização e validação de origem. Consulta somente URLs fixas dos domínios oficiais. Prazo de 12 segundos por catálogo, consultas paralelas. Falhas de rede, HTTP ou formato aparecem separadas de falhas do banco.

Fontes de referência:
- https://dadosabertos.camara.leg.br/swagger/api.html
- https://www12.senado.leg.br/dados-abertos/dados-abertos
- https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json

## Continuação
Revisar a coleta legislativa por parlamentar e categoria, paginação, progresso, idempotência e falhas parciais; incorporar eleições anteriores com compatibilidade de chaves; realizar validação temporal e calibração antes de disponibilizar previsões probabilísticas. Não apresentar capacidades pendentes como já instaladas.
