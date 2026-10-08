# Backlog consolidado — IBFC

Auditoria do código enviado em 08/10/2026. Classificação: implementado e validado localmente; implementado sem validação operacional; parcial; especificado; novo; dependência externa. Nenhum item é declarado homologado em produção sem acesso e evidências desse ambiente.

| Prioridade | Item | Estado e evidência | Pendência de aceitação |
|---|---|---|---|
| P0 | Menu Ciência Eleitoral e acesso aos módulos | Implementado e validado localmente na etapa anterior | Conferir versão publicada e perfis reais |
| P0 | Banco, permissões e migrações | Dependência externa; diagnóstico existente | Executar diagnóstico e registrar migrações instaladas |
| P0 | Importação TSE e fila | Implementado; testes locais do importador; operação externa não validada | Conferir dados de uma zona contra fonte oficial |
| P0 | Coleta legislativa | Parcial: worker existente; workflow faltante incluído nesta entrega | Secrets, branch, despacho, logs e retorno ao banco |
| P1 | Zonas/zonas com votos/locais combináveis | Implementado nesta etapa, com testes locais | Validar recorte real e cobertura cartográfica |
| P1 | Busca, preferências, ampliação, CSV/JSON | Implementado nesta etapa | Confirmar usabilidade e downloads no portal publicado |
| P1 | Votação por local/seção/urna | Parcial; depende da granularidade importada | Não substituir resultados ausentes por distribuição estimada |
| P1 | Participação voluntária no mapa | Parcial em módulo comunitário separado | Contrato agregado, autorização e proteção contra reidentificação |
| P1 | Progresso de sincronização | Existente com métricas reais; sem validação externa nesta entrega | Não mostrar percentual fictício quando o total é desconhecido |
| P2 | Comparar até dez candidaturas | Implementado na fase 2: painel lado a lado, consultas individuais arquivadas, CSV/JSON | Homologar resultados reais; consultas sequenciais não são uma transação única |
| P2 | Correspondência histórica territorial | Parcial: fase 4 acrescenta diagnóstico de chaves, cobertura, ausências e mudanças registradas | Ainda falta tabela de correspondência oficial/curada, versionada, com fonte e qualidade |
| P2 | Histórico desde 1994 | Novo | Inventário oficial por eleição/cargo, importadores e disponibilidade |
| P2 | Mapas lado a lado | Implementado na fase 3, com escala comum e enquadramento conjunto | Homologar coordenadas e votos reais; navegação manual independente |
| P2 | Mapas históricos | Implementado na fase 4 com consultas separadas por ano | Homologar coordenadas por ano; referências antigas podem ser usadas; sem equivalência oficial automática |
| P2 | Exportação PNG de mapa | Implementado na fase 5: multicamadas e mapas comparativos/históricos | Homologar navegador e provedor real; captura apenas tiles visíveis; sem ruas como alternativa |
| P3 | Distribuição de cadeiras | Especificado | Regras legais versionadas por eleição e testes oficiais antes da implementação |
| P4 | Emendas, transparência e financiamento | Dependência externa / novo | Fontes oficiais, identificadores, limites de API, revisão de dados pessoais |
| P4 | Câmara/Senado — comissões, proposições e votos | Implementado sem homologação operacional | Identidades verificadas e comparação de amostra com fonte |
| P4 | CLDF automática | Parcial; console manual existente | Validar esquema, identidade e disponibilidade da fonte |
| P5 | Demandas, atividades, inscrições e responsáveis | Implementado sem homologação operacional nesta etapa | Validar fluxos, permissões e atualização de status |
| P5 | Tramitação, arquivo, acompanhamento e compromissos | Implementado sem homologação operacional | Aplicar migrações pertinentes e testar ponta a ponta |
| P5 | CRM e comunicação | Parcial; endpoint existente | Validar contrato, idempotência, autorização e respostas; sem dedução de voto individual |
| P6 | Estatística e previsão | Parcial; modelos exploratórios existentes | Validação temporal, incerteza, comparação com baseline e registro de versões |
| P6 | Modelos espaciais/hierárquicos | Novo | Dados suficientes, diagnóstico de resíduos, validação fora da amostra |
| P6 | Auditoria de BU e fontes | Parcial; documentos e metadados existentes | Reconciliação reproduzível, duplicidades, origem e inconsistências sem conclusão automática de fraude |
| P7 | Central de relatórios PDF/Excel e tutoriais | Novo | Reusar cálculos/arquivo existentes; não criar segunda lógica de totais |

## Especificação das próximas entregas

### Comparação múltipla

Reutilizar catálogo, validação de candidaturas e filtros territoriais. Aceitar até dez seleções identificadas na mesma eleição, cargo e turno por coluna de comparação. Calcular votos, participação no denominador conhecido, cobertura e posição, sem confundir voto nominal com legenda. Não somar grupos sobrepostos. Arquivar parâmetros, versão de cálculo e fontes. A API deve rejeitar IDs fora do catálogo e controlar volume; não criar tabelas redundantes. Comparação entre cargos deve declarar incompatibilidade de denominadores.

### Correspondência histórica

Mapear identidade de candidatura separadamente de equivalência geográfica. Registrar códigos de origem/destino, ano, método, fonte, responsável e qualidade. Marcar locais/seções transferidos, novos ou sem correspondência. Publicar comparação de territórios comuns e cobertura; não tratar ausência histórica como zero. Reutilizar o módulo temporal e seus testes.

### Cadeiras e dados financeiros

Regras de quociente, sobras, federações e elegibilidade precisam de fontes legais primárias e versão por eleição. Antes de publicar simulação, confrontar exemplos conhecidos e casos-limite. Integrações financeiras requerem um inventário de fontes oficiais e chaves verificadas; valores planejados, empenhados e pagos são conceitos distintos. Nenhuma regra legal nova foi codificada nesta fase.

### Modelos e monitoramento

Separar descrição, associação e previsão. Comparar modelos com persistência; usar cortes temporais e espaciais sem vazamento. Guardar versão de dados/modelo, parâmetros, erro, intervalos e cobertura. Demandas e tempos de resposta pertencem ao submenu comunitário, sem transformar características individuais de apoiadores em perfil de persuasão política. Mostrar métricas territoriais agregadas com limiares de proteção e acesso adequado.

## Critério de passagem de fase

Cada item exige: evidência de código, teste local relevante, migração/configuração necessária, teste com fonte real, responsável por homologação e limitações registradas. Implementado não significa implantado. As fases 1–4 entregam núcleo multicamadas, correção do workflow legislativo, comparação múltipla, mapas lado a lado e diagnóstico/mapas históricos. Correspondência territorial oficial, regras de cadeiras, novas fontes financeiras e previsões homologadas continuam pendentes conforme as linhas deste backlog.

Fase 5: exportação PNG validada localmente, sem migração. Não representa implantação ou homologação com banco e provedor de produção.
