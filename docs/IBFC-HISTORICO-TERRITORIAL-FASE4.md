# Histórico territorial — fase 4

Versão 2.7.0 · build `IBFC-CE-20261008-HISTORICO-F4`. Incremento sobre as fases 1, 2 e 3.

## Instalar e encontrar

Copiar os arquivos sobre o projeto completo já atualizado, preservando caminhos e todos os outros arquivos. Fazer commit e novo deployment. Não há migração, tabela ou variável nova. Reutiliza catálogo, relatórios e funções eleitorais existentes.

Administrador → Ciência Eleitoral → Mapa e análise territorial. Em Tipo de consulta, escolher Comparar 2022 e 2026; selecionar as candidaturas/partidos ou grupos de cada ano, cargo, turno, UF e território; clicar Gerar análise. O novo Diagnóstico territorial aparece após as visualizações de mapa existentes. O cartão da visão geral também descreve esta funcionalidade.

Em Mapas de cada ano, clicar Carregar mapas históricos. São duas consultas administrativas independentes, em sequência, para o recorte de 2022 e o de 2026. Cada consulta é arquivada pela API existente. A tela mostra progresso real por consultas concluídas, erro e opção de cancelamento. Consultas já arquivadas não são apagadas ao cancelar.

## Diagnóstico

Classificações: dados somente em 2022, somente em 2026, ausentes nos dois anos, totais de zona nos dois anos, mudança de local registrada, conjunto de chaves parcialmente comum, sem chaves de seção comuns ou chaves comuns com continuidade não verificada. Não rotular automaticamente um território como novo/extinto nem uma chave igual como correspondência oficial.

Zero confirmado continua zero. Diferenças de votos dependem de dados disponíveis nos dois anos. Variação relativa não é calculada quando a votação anterior é zero. Participação e variação em pontos percentuais usam os denominadores de cada ano. Mudança nas regras, na cobertura ou no número de votos por cargo deve ser considerada; particularmente, votos para senador não equivalem a eleitores.

O percentual de linhas com dados nos dois anos usa apenas as linhas retornadas com dados em pelo menos um ano. Se houver truncamento, não apresentá-lo como cobertura do banco inteiro. Totais de seções e chaves comuns vêm do relatório do recorte completo. Fonte por zona não produz avaliação de correspondência entre seções ou mudanças de escola. Em agregações, uma linha pode representar várias seções e a classificação diz respeito ao conjunto.

Busca e filtro de classificação afetam a tabela, paginada em 50 linhas. CSV e JSON preservam todas as linhas retornadas, método, parâmetros, fontes, protocolo e hash do relatório original. O hash original não é apresentado como hash novo do diagnóstico exportado. O diagnóstico é derivado no navegador e tem método `ibfc-historical-coverage-1.0`.

## Mapas históricos

Cada mapa usa votos e coordenadas de sua própria consulta. Não reutiliza a coordenada de 2026 para preencher artificialmente 2022. A função de referência por seção pode usar um ano anterior ao consultado. A função existente por zona também pode devolver referências mais recentes. Na visualização histórica, coordenadas posteriores ao ano consultado ou sem ano identificado são ocultadas, com contagem e aviso de cobertura. Referências anteriores permanecem identificadas; elas não certificam localização naquele ano. O relatório original e seu hash não são alterados para aplicar essa projeção cartográfica. Ausência de coordenadas continua na tabela de resultados da análise e nas exportações. Não afirmar que um ponto agregado represente um limite territorial oficial.

A escala de símbolos é comum à dupla e admite votos absolutos ou participação percentual. Enquadramento inicial e botão conjunto usam a união dos pontos; navegação manual é independente. Chaves de locais alterados podem não encontrar contraparte no outro mapa: ausência não equivale a zero. No celular, os mapas ficam empilhados.

Os mapas consultam todas as chaves de cada ano no mesmo recorte territorial; não reproduzem automaticamente o filtro histórico Somente chaves comuns. Esse comportamento é indicado na tela. Horários, protocolos e fontes são próprios de cada ano; não há snapshot transacional único.

## Proteção contra respostas antigas

Alterar os filtros do explorador cancela a consulta de análise em andamento e descarta o relatório anterior, evitando reapresentar resultados com novos rótulos. Os parâmetros históricos são preservados no contexto da análise concluída. Alterações de contexto/unmount cancelam consultas dos mapas e respostas abortadas não repopulam a tela.

## Limites

Esta fase entrega diagnóstico de cobertura e visualização histórica. Ainda não entrega uma tabela oficial de correspondência territorial com curadoria, equivalência entre municípios desmembrados, localização histórica certificada ou identificação automática da mesma pessoa/composição partidária. Nenhuma previsão de fidelidade eleitoral, voto individual ou cadastro pessoal é produzida. Correspondência oficial continua no backlog como etapa parcial.

## Homologar depois de publicar

Validar duas seleções reais e uma zona/seção contra as fontes oficiais; conferir datas, coordenadas, filtros, zero/ausência, truncamento, downloads, cancelamento e celular. Confirmar que visitantes não acessam a análise administrativa. Banco, GitHub Actions, fontes remotas e deployment de produção não foram acessados nesta etapa.

## Evidências locais

- 40 testes passaram nos conjuntos de diagnóstico histórico, mapas comparativos, comparação múltipla, camadas, API de zonas e ciência.
- Interface do explorador completo testada com APIs controladas e Leaflet real: modo histórico e retorno ao modo de ano único, filtros do diagnóstico, zeros/ausências, CSV/JSON, consultas independentes por ano, referências cartográficas próprias, enquadramento comum, ocultação de referência futura, cancelamento, erros, descarte de resposta antiga e largura mobile.
- APIs e tiles foram simulados no teste de interface. Isso não valida disponibilidade dos servidores externos, instalação do banco ou deployment.
- Página temporária de teste removida antes do build de produção.
- Build de produção concluído com compilação TypeScript e geração de rotas.
