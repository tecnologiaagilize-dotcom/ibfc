# IBFC | Caderno Técnico Master de Ciência Eleitoral

Versão documental 1.0 | 7 de outubro de 2026 | Instituto Brasileiro da Família Cristã

Documento de referência para desenvolvimento, implantação e aceite. Responsável pelo projeto: Paulo Rocha. Implementação tecnológica: tr@de Tecnologia. Versão de código desta etapa: 2.2.0, identificação IBFC-CE-20261007-MASTER-CAMADAS.

## 1. Objetivo e decisões consolidadas

Construir um ambiente administrativo de consulta de resultados eleitorais públicos, exploração geográfica, comparação histórica, investigação documentada e acompanhamento de participação comunitária. O mapa concentra as informações territoriais; atendimento, comunicação e avaliação ocupam submenus próprios.

O recorte inicial é Distrito Federal e Entorno, incluindo Águas Lindas de Goiás, Cocalzinho, Padre Bernardo, Novo Gama, Cidade Ocidental, Planaltina de Goiás e municípios da cobertura cadastrada. Planaltina do DF é uma região administrativa de Brasília, não um município independente. Jardim ABC deve ser vinculado ao município correspondente por base territorial verificada, sem inventar um código municipal.

A navegação prevista vai de Brasil a UF, município, zona, local de votação e seção. A cobertura efetiva depende dos arquivos importados. Uma consulta nacional parcial não pode ser apresentada como resultado completo do Brasil.

As escolhas de voto permanecem secretas. Resultados por zona ou seção não identificam eleitores e não comprovam votos entregues por uma comunidade ou liderança. Cadastros voluntários não serão classificados por suposta fidelidade eleitoral.

## 2. Estado real da entrega

O código e os pacotes entregues precisam ser distinguidos da instalação em produção. Esta execução não tem credenciais para aplicar migrações no Supabase nem publicar diretamente na Vercel. O aceite de produção exige instalação e verificação no portal.

### Já desenvolvido em pacotes anteriores

- Menu Ciência Eleitoral, filtros territoriais, candidatura, partido e grupo manual de partidos.
- Leaflet e OpenStreetMap, tabela e navegação do macro ao micro.
- Consulta de ano único; comparação 2022/2026 opcional; comparação entre cargos.
- Sincronização TSE em worker GitHub Actions com agendamento, fila e progresso por trabalho real.
- Catálogo de candidaturas; resultados JSON por zona; consulta de arquivos oficiais BU, RDV e log.
- Importação de CSVs dos Boletins de Urna, votos por local e seção, identificação de urna e eleitorado.
- Referências cartográficas identificadas por ano; coordenadas desconhecidas não são fabricadas.
- Investigações, evidências, versões, fontes e arquivo de relatórios com hash.
- Estatística exploratória, correlação, validação básica e cenários explicitamente hipotéticos.

### Implementado nesta primeira etapa de implantação

- Entrada padrão do mapa por zonas, separada do recorte detalhado de locais e seções.
- Seletor Todas as zonas: círculos azuis da cobertura importada.
- Seletor Zonas com votação: somente votos positivos da seleção, círculos vermelhos e total dentro do círculo.
- Inventário territorial separado dos resultados: uma zona sem resultado continua visível na camada geral.
- Contagem de seções, locais e urnas físicas identificadas nos BUs, sem confundir os conceitos.
- Painel de detalhes e tabela para zonas sem coordenadas.
- Endpoint administrativo e migração 20261018; sem novas credenciais ou biblioteca de mapas.

### Especificado, ainda não implantado nesta etapa

- Camadas agregadas de colaboradores, atividades voluntárias e demandas comunitárias.
- Cadastro de organizações e bases de participação; metas de atividades e registros de realização.
- Fluxo de solicitações, respostas verificadas de representantes e avaliação do atendimento.
- Integração operacional desses módulos ao CRM e atendimento humano.
- Fiscalização parlamentar integrada com Câmara, Senado e CLDF.
- Modelos preditivos independentes, além do laboratório exploratório existente.

## 3. Arquitetura de navegação

### Ciência Eleitoral

Visão geral; mapa e camadas; resultados territoriais; comparação histórica; comparação entre cargos; investigações e evidências; relatórios arquivados; estatística e cenários; integrações e sincronização; diagnóstico de cobertura.

### Comunidade e diálogo - implantação posterior

Cadastros e organizações; participação voluntária; demandas e protocolos; comunicação e acompanhamento; respostas dos representantes; avaliação e indicadores. Temas, prazos de resposta e andamento das atividades não devem ocupar o painel de filtros eleitorais.

A navegação entre módulos preservará contexto territorial, mas não associará automaticamente indivíduos a escolhas de voto. Cada camada terá finalidade, fonte, período e permissões próprios.

## 4. Especificação do mapa por camadas

MAP-01: carregar o inventário de zonas sem exigir candidatura anterior ou comparação com 2022. Todas as zonas significa todas as zonas da cobertura importada, com total e indicação de eventual truncamento.

MAP-02: todas as zonas usam azul. No modo de votação positiva, zonas com votos maiores que zero usam vermelho. O total de votos selecionados aparece no círculo. Zona eleitoral, município e UF formam a identidade; o número da zona isolado não é uma chave nacional.

MAP-03: distinguir resultado positivo, zero confirmado e resultado ausente. Resultado ausente é nulo; não pode ser transformado em zero. Candidatura cadastrada sem votos importados mantém o inventário visível e apresenta aviso de pendência.

MAP-04: ao clicar, apresentar município, UF, zona, votos, seções disponíveis, urnas físicas identificadas, locais cadastrados e ano das referências cartográficas. Pontos de zona são médias das coordenadas dos locais, não polígonos oficiais.

MAP-05: manter o seletor Locais e seções - recorte detalhado. O detalhamento disponível depende da fonte. Totais JSON por zona não podem ser distribuídos entre escolas ou urnas.

MAP-06: em uma escola com múltiplas seções, reunir as seções no ponto do local e oferecer acesso a cada uma no painel/tabela. Seções agregadas oficialmente continuam juntas quando não existir boletim separado.

MAP-07: zoom e enquadramento devem respeitar o recorte selecionado. Card compacto; detalhes ao lado no computador e abaixo no celular. Tabelas largas rolam dentro do próprio componente, sem aumentar a largura da página.

MAP-08: sem coordenadas, preservar a zona/local na tabela. Usar somente referências oficiais conhecidas; base histórica deve exibir o ano e não comprova continuidade territorial.

MAP-09: futura seleção independente de camadas comunitárias por caixas de seleção: colaboradores agregados, participação voluntária e demandas. A eleição, o turno e a candidatura filtram resultados eleitorais, não alteram retroativamente os registros comunitários.

## 5. Fontes, importação e granularidade

Fontes verificadas no desenvolvimento: catálogo dadosabertos.tse.jus.br; arquivos cdn.tse.jus.br; resultados.tse.jus.br/oficial. O catálogo determina os recursos disponíveis. Versões e números de eleição não devem ser inventados.

O worker usa Python, baixa ZIPs oficiais, valida CSVs e envia lotes ao Supabase. Boletins CSV são usados quando a base padrão por seção não está disponível. JSON por zona é alternativa de menor granularidade. O segundo turno é descoberto quando publicado, não preenchido antes da disponibilidade oficial.

Etapas: enfileirar, assumir tarefa, descobrir recursos, baixar, validar, processar, preparar, publicar e concluir. A fila começa em 0%; progresso decorre de bytes e arquivos processados. Recursos preparados ficam invisíveis até a publicação da tarefa. Erros preservam resultados completos anteriores.

A carga mantém fonte, ano, UF, cargo, turno, eleição, data e identificação da importação. Registros idênticos são deduplicados. Boletins divergentes para a mesma chave interrompem a importação. Credenciais do worker ficam no servidor e nos Secrets, nunca no navegador.

Nome, endereço e coordenadas da escola vêm da base de locais. O CSV BU informa seu código, mas não fornece todos os campos cartográficos. Referências anteriores podem ser usadas com identificação explícita do ano.

## 6. Dicionário e regras de cálculo

Chave de votação por seção: importação, UF, eleição, turno, município TSE, zona, seção, cargo e número votável. Chave cartográfica de local: UF, município, zona e código do local, com ano e fonte.

Seção é a unidade eleitoral do resultado. Local é a escola ou instalação que pode abrigar várias seções. Urna física é a identificação da urna efetivada; não equivale automaticamente ao número de seções. O mapa não usa domicílios particulares para representar urnas.

Votos selecionados: soma dos registros correspondentes à candidatura; para partido, nominal mais legenda conforme as regras do cargo. Grupos manuais têm composição documentada e não certificam uma coligação oficial. Comparar cargo e turno compatíveis; preservar identificação da candidatura e da eleição.

Participação territorial: votos selecionados divididos pelo denominador disponível do cargo. Na base BU, o denominador é nominal mais legenda do boletim, podendo divergir da destinação final na totalização. O relatório identifica essa diferença de fonte.

Variação absoluta: votos de 2026 menos votos de 2022. Variação relativa: diferença dividida pelos votos de 2022, somente com base positiva. Variação de participação: diferença entre percentuais, em pontos percentuais. Denominador ausente ou zero torna o percentual indisponível.

Em 2026, dois votos para senador tornam a contagem de votos distinta da quantidade de eleitores. Comparecimento e abstenções são armazenados uma vez por seção e cargo, sem multiplicar pelos candidatos. Chaves iguais entre eleições não comprovam continuidade do eleitorado.

Crescimento territorial não mede fidelidade individual, causalidade da atuação de uma liderança nem transferência entre cargos. Uma divergência estatística gera hipótese de investigação, não conclusão de fraude.

## 7. Modelo de dados existente

ibfc_electoral_imports registra recursos e publicação. ibfc_electoral_sync_jobs registra tarefas e progresso. ibfc_electoral_locations guarda locais e referências geográficas. ibfc_electoral_votes guarda votos por seção. ibfc_electoral_section_totals mantém denominadores. ibfc_electoral_candidates e o catálogo de candidaturas fornecem seletores.

ibfc_science_zone_files guarda resultados oficiais por zona. ibfc_science_bu_sections guarda metadados de urna, aptos, comparecimento, abstenções e horários. ibfc_science_analyses arquiva resultados e hash; investigações, versões e evidências mantêm a trilha documental.

A função ibfc_science_zone_layers acrescentada nesta etapa combina inventário, votos, contagens e referências cartográficas. A seleção é validada pelo catálogo no endpoint /api/admin/science/zones. A granularidade recebida do navegador é substituída pela informação do servidor.

O serviço não mistura nominalmente cadastros privados com registros de votação. Não existe relação de banco que indique qual pessoa votou em qual candidato.

## 8. Cadastros e participação - contrato da próxima etapa

Entidades propostas: território comunitário, organização, colaborador voluntário, consentimento, atividade, inscrição e registro de participação. Elas são novas entidades planejadas; não representam tabelas já criadas nesta entrega.

Organização: identificador, nome, município, região administrativa/bairro, finalidade, responsável autorizado e contatos restritos. Colaborador: conta, território informado voluntariamente, disponibilidades, interesses sociais opcionais e consentimentos específicos. Atividade: objetivo, período, responsável, capacidade e registros de realização.

Metas devem medir atividades verificáveis: encontros, inscrições, atendimentos, formação e conclusão de ações. Estimativa de votos prometidos não será usada como medida de sucesso da comunidade nem como atribuição individual de voto.

A camada pública ou compartilhada exibirá contagens agregadas. Regra inicial proposta: ocultar grupos com menos de 10 participantes; esse limiar é um controle de produto a validar, não uma afirmação de exigência legal. Endereços e contatos individuais permanecem restritos.

Religião, condição econômica, escolaridade e profissão não serão usados para direcionar persuasão política, priorizar publicidade eleitoral ou inferir preferências. Interesses sociais servem ao atendimento e à organização de projetos comunitários.

## 9. Demandas, respostas e avaliação - contrato posterior

Entidades propostas: demanda, categoria, protocolo, encaminhamento, resposta, compromisso, evidência e avaliação. Fluxo: registrada, em triagem, encaminhada, aguardando resposta, respondida, em acompanhamento, concluída, reaberta ou cancelada.

Solicitação: descrição, categoria, território aproximado, data, anexos, urgência justificada e preferência de identificação. Demandas pessoais não são publicadas automaticamente. Identificação anônima não deve ser prometida se a plataforma mantiver vínculo autenticado visível à equipe; apresentar corretamente o nível de identificação.

Respostas de candidatos ou representantes exigem conta verificada e vínculo administrativo. Registrar autor, data, conteúdo, anexos, encaminhamento e prazo declarado. A resposta pode solicitar esclarecimento; conclusão depende de evidência ou avaliação, não apenas de uma mensagem enviada.

Indicadores: tempo mediano de primeira resposta; demandas vencidas; percentual respondido; percentual concluído; reaberturas; avaliação voluntária; atividades realizadas. Publicar denominadores, período e quantidade de registros sem avaliação. Resposta não equivale a solução.

## 10. Relatórios e investigação científica

Relatórios eleitorais: votação por UF, município, zona, local e seção; participação no cargo; comparação histórica; comparação entre cargos; cobertura; fontes; metadados BU; CSV e impressão/PDF. Se uma fonte só tem zona, não oferecer relatório artificial por urna.

Relatórios comunitários futuros: contagens territoriais protegidas, participação em atividades, demandas por categoria, prazos, encaminhamentos e evidências de conclusão. Seu objetivo é atendimento e prestação de contas, sem atribuir escolhas de voto.

Cada relatório arquivado deve conter parâmetros, filtros, granularidade, fontes, versão do método, horário, denominadores, limitações e resultado completo utilizado. O hash detecta alteração do conteúdo arquivado; não garante a veracidade da fonte por si só.

Investigações devem separar observação, hipótese, teste, evidência e conclusão. Comparações precisam considerar cobertura, seções agregadas, mudanças de local, candidaturas distintas, número de votos por cargo e destinação dos votos. Ausência de dados não é evidência de irregularidade.

O laboratório atual é exploratório. Modelos futuros precisam de validação fora da amostra, temporal e geográfica, documentação, incerteza e avaliação de desempenho contra uma referência simples. Cenários hipotéticos não serão rotulados como previsão validada.

## 11. Segurança e operação

O módulo administrativo existente permite admin e editor, validando a sessão no servidor e aplicando políticas RLS no Supabase. Outros perfis - membro, atendimento e representante verificado - exigem políticas específicas nas próximas etapas. Não ampliar suas permissões automaticamente.

Implementar minimização de dados, finalidade, consentimentos quando aplicáveis, acesso restrito, correção e exclusão conforme processo definido. Documentação jurídica própria será necessária antes de colocar novos cadastros sensíveis em produção; este caderno não substitui análise jurídica.

A integração CRM usa autenticidade, deduplicação, identificador de evento, finalidade e rastreabilidade. Envio externo de mensagens não ocorre por esta entrega. Contatos autorizados, atendimento e opt-out serão tratados no módulo próprio.

Operação: backup antes de migrar; migrações ordenadas; acompanhamento da fila do worker; alertas de tarefa sem atualização; diagnóstico de versão; verificação de cobertura. Rollback do frontend não implica apagar votos. Não remover migrações/tabelas em produção para desfazer somente uma tela.

## 12. Plano de implantação e dependências

Etapa 0 - saneamento: identificar repositório IBFC e Supabase correto; conferir versão implantada, migrações 20261009 a 20261017, integridade dos resultados e backups. Guardar segredos fora do caderno e do ZIP.

Etapa 1 - entregue agora: mapa geral de zonas, seletor azul/vermelho, votos no círculo e contagens. Aplicar 20261018, publicar os arquivos atualizados e executar aceite com dados reais. Esta etapa não cria cadastros comunitários.

Etapa 2 - próximo desenvolvimento: organizações, territórios comunitários e participação voluntária, permissões, importação deduplicada e camada agregada protegida. Aceite exige testar contagens, consentimentos, exclusão e supressão de grupos pequenos.

Etapa 3 - demandas: protocolos, triagem, categorias, anexos, encaminhamentos, fila e acompanhamento. Criar submenu próprio. Validar autoria, restrição de acesso e histórico de estados.

Etapa 4 - representantes: respostas verificadas, compromissos, prazos, evidências e avaliação. Integrar CRM somente após contratos de API e controles de autoria definidos.

Etapa 5 - fiscalização e métodos: integrações parlamentares verificadas, observatório de compromissos, qualidade e modelos estatísticos validados. Não anunciar funcionalidades preditivas sem avaliação independente.

Não há prazo de conclusão presumido nem implantação automática de todas as etapas. O término de cada etapa requer evidência de aceite e atualização deste documento.

## 13. Roteiro de instalação desta entrega

1. Fazer backup e confirmar que os arquivos pertencem ao repositório IBFC correto.
2. Conferir instalação dos pacotes anteriores, especialmente votação por zona e Boletins por seção. Este ZIP é incremental; não substitui todo o portal.
3. No SQL Editor do Supabase, executar supabase/migrations/20261018_ibfc_zone_layers.sql. Se a função ou tabela anterior faltar, instalar primeiro as migrações antecedentes correspondentes.
4. Copiar os arquivos deste pacote respeitando as pastas, fazer commit e aguardar deployment da Vercel.
5. Entrar como administrador em Ciência Eleitoral. A versão esperada é 2.2.0.
6. Abrir Mapa e análise territorial. Visualização padrão: Zonas eleitorais - camadas. Todas as zonas carrega sem candidato.
7. Escolher ano, UF, cargo, turno e candidatura/partido; selecionar Zonas com votação. Conferir círculos vermelhos e valores com o relatório oficial importado.
8. Selecionar Locais e seções - recorte detalhado para utilizar o explorador existente, gerar análise e aprofundar o recorte.
9. Se faltar votação por seção, iniciar nova sincronização oficial. Aplicar uma migração não importa votos automaticamente.
10. Não é necessário criar nova chave de mapas nem alterar tokens e Secrets existentes nesta etapa.

## 14. Critérios de aceite e continuidade

Aceite do mapa: inventário sem candidato; círculos azuis; seleção positiva vermelha; total visível; zona sem resultado distinguida de zero; contagens de seção e hardware não multiplicadas por candidato; zonas sem coordenadas na tabela; filtros de município; recorte isolado por ano/cargo/turno; operação no celular sem estouro horizontal.

Aceite técnico: build e TypeScript; regressões de importação; SQL de publicação e filtros; RLS negando anônimo; migração repetível; requisições autenticadas; seleção validada no catálogo. Testes visuais usam dados demonstrativos e não geram tráfego automatizado de tiles OpenStreetMap.

Aceite em produção: confirmar versão, comparar ao menos uma zona e uma seção com a fonte oficial, verificar um caso de zero e um de ausência, testar perfis permitidos e registrar o responsável. Esta confirmação não foi executada pela entrega local.

Documento vivo: registrar versão, mudança, data, evidência e situação real. Próximo marco de desenvolvimento: concluir o aceite da etapa 1 e iniciar o cadastro de organizações e participação, sem misturar esse cadastro com a identidade dos votantes.

## Referências técnicas oficiais

TSE - catálogo de Boletins de Urna 2026: https://dadosabertos.tse.jus.br/dataset/resultados-2026-boletim-de-urna

TSE - dados e resultados: https://dadosabertos.tse.jus.br/ e https://resultados.tse.jus.br/oficial/app/index.html

OpenStreetMap - créditos: https://www.openstreetmap.org/copyright

Esses endereços documentam a origem das integrações. Disponibilidade de um recurso em uma data não garante que todos os anos, turnos e regiões já estejam publicados ou importados.
