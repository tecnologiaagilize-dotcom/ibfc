# Aula 7 — Viabilidade inicial e desenho do experimento

## Objetivos e pré-requisitos

Calcular contribuição por cliente, distinguir receita de caixa e definir experimento com métrica e regra de decisão. Pré-requisitos: oferta, mapa do modelo e calculadora. Os valores desta aula são hipotéticos; não são preços ou custos reais da Agilize.

## Conteúdo teórico

Um negócio pode faturar e consumir caixa. Para avaliar a oferta inicial, identifique unidade de venda, período, preço, custos variáveis, obrigações de trabalho e custos fixos. Mensalidade por empresa é uma unidade diferente de preço por usuário ou por mensagem. Compare alternativas com o mesmo escopo e período.

**Contribuição mensal por cliente = mensalidade − custos variáveis mensais daquele cliente.** Custos variáveis podem incluir licença de terceiro, consumo, tributos associados à receita e trabalho de suporte atribuível ao cliente, conforme a análise gerencial adotada. Classifique os itens de modo consistente e evite contá-los novamente como fixos. O custo do seu tempo não desaparece porque você é o fundador: registre remuneração ou custo de oportunidade como premissa explícita.

Exemplo hipotético: mensalidade de R$ 300; infraestrutura e serviços variáveis de R$ 60; suporte de 1 hora a R$ 50/h; tributos ilustrativos de 10% da receita, R$ 30. Contribuição = 300 − 60 − 50 − 30 = R$ 160 por cliente/mês. Margem de contribuição = 160 / 300 × 100 = 53,33%. Os 10% são uma premissa de exercício, não enquadramento tributário da Agilize. A apuração real deve usar dados da empresa e análise contábil.

Se custos fixos mensais desse cenário forem R$ 1.600, o ponto de equilíbrio simplificado é 1.600 / 160 = 10 clientes ativos, sob as mesmas premissas. Isso não prevê dez vendas. Se o suporte passar a 2 horas, a contribuição cai para R$ 110 e a necessidade sobe para 15 clientes, arredondando 1.600 / 110 para cima. Se a contribuição for zero ou negativa, aumentar volume não resolve o desequilíbrio nessa estrutura.

Calcule a implantação separadamente. Preço hipotético de R$ 600 menos 6 horas a R$ 50/h, R$ 60 de tributos ilustrativos e R$ 40 de outros custos gera R$ 200 de contribuição inicial. Esse valor não deve entrar no MRR. Prazo de recebimento importa: pagar custos antes de receber pode criar necessidade de capital, mesmo com contribuição positiva.

**CAC observado = custo de aquisição do período/coorte definido ÷ novos clientes pagantes atribuíveis à mesma base.** Inclua os itens escolhidos, como mídia e trabalho comercial, e declare o que ficou de fora. Com zero novos clientes, não reporte CAC zero: o indicador não é calculável por essa divisão. Custo por entrevista, demonstração ou lead é outro indicador. Não estime LTV sem histórico ou hipóteses claras de retenção; nesta fase, acompanhe continuidade e razões de saída.

Experimento comercial é uma tentativa delimitada de reduzir incerteza. Precisa de hipótese, público, oferta, ação, métrica, janela, orçamento, critério de interrupção e regra de decisão. Um piloto com três empresas não estima uma taxa populacional confiável. Serve para verificar compreensão, execução e objeções, preservando observações individuais.

## Caso real e limites

O relato histórico Buffer [S4] ilustra testar interesse antes de ampliar produto. Ele não fornece o CAC, preço ou prazo apropriado ao CRM Agilize. Nossa aplicação é criar um teste pequeno e reversível, com critério definido antes do resultado e capacidade de entrega já demonstrada.

## Demonstração prática

Hipótese didática: “gestores que relataram o problema conseguirão avaliar a pertinência de um piloto após demonstração do fluxo”. Métrica: quantos participantes elegíveis concluem a demonstração e qual próximo passo aceitam, com motivo. Critério pedagógico: se ninguém compreender o escopo, revisar mensagem; se houver dependência técnica não atendida, bloquear venda; se houver compromisso de piloto, verificar capacidade e custos antes de propor contrato. Esses critérios são regras do experimento escolhido, não benchmarks de conversão.

Sem verba aprovada, orçamento de mídia é zero. Use apenas participantes que aceitaram a continuidade. Interrompa se houver envio indevido, exposição de dados, falha da função central ou gasto acima do limite. Não ajuste a meta depois para chamar qualquer resultado de sucesso.

## Exercício guiado

1. Reproduza os cálculos de contribuição e ponto de equilíbrio acima.
2. Troque o suporte de 1 para 2 horas e explique a mudança.
3. Separe contribuição da implantação e contribuição mensal.
4. Faça lista de custos reais conhecidos e desconhecidos do CRM.
5. Defina teste de uma hipótese central sem anunciar função não demonstrada.
6. Escreva a regra de continuar, revisar ou interromper antes de executar.

## Atividade independente

Crie cenários de suporte de 0,5 h, 1 h e 2 h por cliente, mantendo as outras premissas do exercício. Resultados esperados: contribuição de R$ 185, R$ 160 e R$ 110; equilíbrio de 9, 10 e 15 clientes. Depois substitua somente as entradas reais que conseguir comprovar e mantenha as demais como estimativas. Produza um protocolo de experimento com teto de dinheiro e tempo. Não é obrigatório gastar nem vender.

## Checklist de execução

- [ ] Unidade, período e escopo estão definidos.
- [ ] Trabalho do fundador foi considerado.
- [ ] Tributos ilustrativos não foram tratados como regra da empresa.
- [ ] Custos não foram duplicados entre fixos e variáveis.
- [ ] Implantação está separada de MRR e caixa.
- [ ] Zero clientes não gerou CAC igual a zero.
- [ ] Regra do experimento foi registrada antes da execução.

## Avaliação, feedback e revisão

Entrega: memória de cálculo reproduzível, sensibilidade e protocolo. Rubrica de 10 pontos; aplicação correta exige chegar aos resultados do exemplo e explicar por que não são projeção real. Feedback-modelo: “Sua planilha calculou margem, mas não incluiu suporte. Adicione horas, fonte da estimativa e cenário de maior demanda”. Revise premissas e registre o efeito na oferta.

Q13: R$ 300 de mensalidade e R$ 140 de custos variáveis geram contribuição de A) R$ 440, B) R$ 300, C) R$ 160, D) R$ 140? Resposta: C; contribuição não equivale ao lucro líquido total da empresa.

Q14: houve R$ 200 de aquisição e nenhum cliente pagante. CAC é A) zero, B) não calculável nessa base; registrar gasto e ausência de aquisição, C) R$ 200 por cliente, D) infinito como previsão? Resposta: B; não inventar denominador nem converter indefinição em previsão.

## Aplicação Agilize e Tr@de

No CRM, peça custos de hospedagem, licenças, suporte e implantação antes de definir preço real. No Tr@de, acrescente equipamento, instalação, conectividade, manutenção e condições de reposição quando aplicáveis. Custos desconhecidos permanecem lacunas decisivas; não os substitua por cotações inventadas.

Referência do caso: [S4 — Buffer](https://buffer.com/resources/idea-to-paying-customers-in-7-weeks-how-we-did-it/). Cálculos e protocolo: elaboração didática IBFC.
