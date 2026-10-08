# IBFC — reconciliação interna de boletins, fase 9

Versão 2.12.0 · IBFC-CE-20261008-RECONCILIACAO-F9. Instalar sobre a fase 8. Sem SQL, secrets ou dependências adicionais.

## Onde encontrar

Ciência eleitoral → Mapa e análise territorial → Gerar análise → abrir “Reconciliação de boletins”. Também aparece nos resultados de Comparação múltipla, para cada seleção. Em histórico ou cruzamento entre cargos, apenas a seleção B/atual é reconciliada. O módulo não torna a comparação de 2022 obrigatória.

## Método

Agrega os boletins retornados por chave correspondente ao escopo da análise:

| Escopo | Chave |
|---|---|
| Brasil | UF |
| UF | UF, município |
| Município | UF, município, zona |
| Zona | UF, município, zona, local |
| Local / seção | UF, município, zona, local, seção |

Identifica duplicidade de seção por UF, município, zona e seção, inclusive quando aparece com locais contraditórios. Não deduplica por número físico da urna, pois esse campo não define a chave de comparação territorial. Seções agregadas permanecem juntas conforme o conjunto recebido.

Uma linha só recebe diferença quando a base está identificada como BU nominal + legenda, não é resultado apenas por zona, o filtro de chaves comuns não está ativo, os registros não são repetidos e as contagens são válidas. A quantidade de BU carregados deve coincidir com new_sections dessa linha. A comparação avalia votos e denominador separadamente; diferença = BU − análise. Zero confirmado continua zero; resultado ausente permanece sem comparação.

Em agregações, igualdade na quantidade de seções não certifica identidade dos conjuntos de seções: a análise agregada não fornece todos os identificadores. O módulo declara esse limite e não afirma equivalência geográfica ou individual.

O total do recorte só é comparado quando ambos os conjuntos estão completos, sem truncamento, todas as linhas são comparáveis, não existem chaves BU inválidas, os totais de seções são compatíveis e os totais de votos/denominadores são válidos. Se suspenso, soma BU e diferença do total aparecem sem dados, sem substituir por zero.

## Interface e arquivos

Contadores de coincidências, divergências e linhas não concluídas; filtros de status; busca por território/chave; paginação de 50 linhas. CSV e JSON incluem todo o diagnóstico carregado, não apenas a página ou filtro visual. Preservam parâmetros declarados, seleção, protocolo, hash original, cobertura e fontes fornecidas pelo relatório. CSV neutraliza fórmulas em campos de texto.

## Limites

Conferência interna da mesma base importada. Não busca, verifica ou confronta um segundo boletim oficial independente; não valida criptograficamente a fonte. Os RPCs existentes são sequenciais e não expõem identidade de revisão da partição para cada boletim, portanto não se certifica uma leitura atômica. Divergência pode exigir conferir filtros, cobertura, revisão e origem. Coincidência não prova integridade; divergência não comprova fraude.

Resultados por zona sem BU recebem aviso explícito, sem inventar urnas. Filtro common_only suspende diferenças porque o detalhamento BU atual não aplica essa restrição. O diagnóstico não modifica votos, metadados ou resultados e não cria novos registros no banco. O hash exibido identifica o relatório original; não é um hash do CSV/JSON de reconciliação.

## Validação

Doze testes específicos cobrem zeros, diferenças de votos e denominadores, cargas parciais, duplicidades, chaves inválidas, contagens incompatíveis, excesso de precisão numérica, todos os escopos, ausência de BU e CSV. Regressões de qualidade, comparação múltipla e cobertura histórica também executadas. TypeScript e build local verificados.

Interface Chromium com amostra sintética de 122 territórios: busca, paginação, filtro de divergências, JSON/CSV completos mesmo com filtro ativo, suspensão por chaves comuns, ausência de BU, versão mobile e erros de página. Não é homologação com Supabase, boletins oficiais ou Vercel de produção.

Após publicar, conferir uma seção conhecida e comparar seu BU com a origem oficial fora do portal. Aumentar o recorte para zona e verificar contagens/denominadores e avisos. Documentar qualquer diferença com protocolo e arquivos antes de interpretar.
