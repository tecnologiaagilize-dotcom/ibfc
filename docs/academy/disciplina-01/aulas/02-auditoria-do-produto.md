# Aula 2 — Inventário e auditoria do produto

## Objetivos e pré-requisitos

Você deverá testar uma capacidade sem confundir interface, integração e resultado; registrar evidência reproduzível; bloquear alegações sem prova. Pré-requisito: diário da aula 1 e acesso autorizado ao CRM em ambiente de teste, se disponível. Sem acesso, execute o roteiro numa simulação claramente identificada e mantenha a operação real pendente.

## Conteúdo teórico

Uma funcionalidade não está comprovada porque aparece num menu, num plano comercial ou numa conversa. A prova operacional combina ambiente, versão, permissões, entradas, passos e resultado. “Cadastrar contato” e “receber automaticamente contato de um canal” são capacidades distintas. Um campo chamado WhatsApp pode armazenar telefone sem enviar ou receber mensagens. Um botão de IA pode depender de credenciais, cobrança ou aprovação externa.

Use quatro estados: **não verificado** (não houve teste suficiente), **demonstrado com limites** (funcionou em cenário especificado), **falhou** (resultado divergiu do esperado) e **planejado** (declarado como futuro). Ausência de evidência não prova inexistência. Um teste que passou também não garante disponibilidade, volume, segurança ou atendimento em todas as situações.

Para cada capacidade, registre o resultado necessário ao usuário. Exemplo hipotético: “um atendente encontra a oportunidade atribuída a ele e registra um retorno”. Decomponha em criar registro, atribuir responsável, salvar retorno, recuperar informação e impedir acesso de perfil indevido. A última condição é importante porque uma venda baseada em compartilhamento indevido de dados não é uma entrega aceitável.

Um teste positivo usa dados válidos e espera conclusão. Um teste negativo tenta entrada inválida ou ação sem permissão e espera recusa adequada. Um teste de persistência sai da tela e volta, verificando o armazenamento. Não execute testes de carga, exploração ou operações destrutivas em produção. Use apenas contas e cenários autorizados. Capturas devem ocultar nomes, contatos, credenciais e identificadores que não sejam necessários.

O guia da ANPD para pequenos agentes oferece orientações administrativas e técnicas de segurança e checklist [S5]. No laboratório adotamos contas individuais, privilégios necessários, dados sintéticos e registro privado de evidências. Isso é um conjunto de controles iniciais, não declaração de conformidade integral com a LGPD. Se o produto atende clínicas, prontuários e dados sensíveis ficam fora deste exercício comercial.

Há três camadas para uma alegação de venda: capacidade do software, capacidade da equipe de implantar e benefício observado no cliente. Pode existir software sem equipe disponível; pode haver serviço manual competente sem automação. A oferta deve indicar qual camada entrega o valor. Evite apresentar operação manual como bot autônomo.

## Estudo de caso didático

Uma demonstração hipotética mostra um contato salvo com nome e telefone. O vendedor anuncia integração automática com WhatsApp. Na auditoria, o contato tinha sido digitado pelo demonstrador. A evidência sustenta cadastro manual, mas não a integração. A correção comercial é retirar a alegação e abrir um teste específico: canal autorizado, mensagem de teste, registro de entrada, associação ao contato e resposta conforme regras do provedor. Não configure o canal só para completar a atividade sem responsável e autorização.

## Demonstração prática

Monte uma linha de teste: ID CAP-01; capacidade “registrar contato sintético”; ambiente e versão; perfil autorizado; entrada “Empresa Teste A”; passos “criar, salvar, sair, reabrir”; esperado “dados preservados”; observado “preencher após execução”; prova “arquivo privado com data”; limite “não testa importação, volume ou integração”.

Repita com perfil que não deveria editar o registro. O resultado esperado depende do desenho real de permissões: peça ao responsável essa regra antes de testar. Se não houver regra definida, registre lacuna de autorização; não invente o comportamento esperado. Se encontrar exposição indevida, pare a coleta e reporte ao responsável sem distribuir os dados.

## Exercício guiado

1. Liste dez capacidades candidatas, deixando todas como não verificadas.
2. Separe recursos do CRM, serviços da equipe e integrações de terceiros.
3. Escolha uma capacidade central para a oferta inicial.
4. Escreva pré-condição, passos, resultado esperado e critério de falha.
5. Execute com dados sintéticos e registre resultado observado, inclusive falhas.
6. Reabra o registro para verificar persistência, quando aplicável.
7. Escreva a frase comercial mais restrita que a evidência permite.

## Atividade independente

Audite três capacidades centrais e uma restrição de permissão em ambiente autorizado. Se o acesso não existir, entregue quatro roteiros executáveis, o nome do responsável necessário e o bloqueio explícito “operação não verificada”. Não atribua status de demonstrado a roteiros. Registre também dependências de assinatura, limites de canal, operação humana e itens fora do escopo.

## Checklist de execução

- [ ] Cada capacidade tem identificador, estado e responsável.
- [ ] Resultado observado está separado do esperado.
- [ ] Evidência permite repetir o teste sem revelar credenciais.
- [ ] Testei persistência e restrição relevante ou registrei bloqueio.
- [ ] Integrações e IA não foram presumidas.
- [ ] A frase comercial respeita ambiente e limites demonstrados.

## Avaliação, feedback e revisão

Entrega: matriz de capacidades e quatro registros de teste ou roteiros pendentes. Aplique os cinco critérios de 0–2. Execução autônoma exige teste reproduzido; simulação permite avaliar desenho, mas mantém competência operacional pendente. Se só houver captura de tela, o feedback deve pedir passos, ambiente e resultado persistido. Revisão: outra pessoa executa um roteiro, ou o próprio aluno o repete depois de fechar a sessão, sem depender da memória.

Q3: um botão “integrar” prova A) integração ativa, B) consentimento do contato, C) apenas existência daquele elemento de interface, D) entrega de mensagens? Resposta: C; o fluxo integrado precisa ser testado.

Q4: o teste não pôde ser executado por falta de acesso. Classifique A) demonstrado, B) não verificado, C) falhou tecnicamente, D) inexistente? Resposta: B; o bloqueio de acesso não autoriza conclusão sobre funcionamento.

## Aplicação Agilize e Tr@de

Nenhuma capacidade do CRM Agilize foi certificada nesta apostila. A presença de leads e integração no código do IBFC não demonstra o produto comercial. No Tr@de, separe rastreamento, leitura de sensores, câmeras e análise de IA em testes próprios. A oferta pode limitar-se a diagnóstico e demonstração, se a equipe puder entregá-los; isso não autoriza vender funcionalidades futuras como disponíveis.

Leitura: [S5 — guia e checklist da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte).
