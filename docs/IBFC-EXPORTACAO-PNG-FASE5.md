# IBFC — exportação PNG, fase 5

Versão 2.8.0. Instalar depois da fase 4. Sem SQL, secrets ou novas dependências.

## Onde encontrar
Ciência eleitoral → mapa multicamadas: botão “Baixar mapa PNG”, abaixo do mapa. Comparação múltipla e diagnóstico histórico: um botão em cada mapa lado a lado. Ajuste as camadas, seleção e zoom antes de baixar. O arquivo baixa diretamente, sem abrir compartilhamento. Configurações do navegador podem perguntar onde salvar.

A imagem inclui candidatura/partido quando selecionado, ano, cargo, turno, camadas/escala, avisos de cobertura, centro e zoom, data e créditos. No multicamadas, inclui município, zona e busca. Mapas comparativos incluem protocolo e hash do relatório original quando disponíveis, até três fontes, e a indicação para consultar o relatório completo. O hash não identifica o arquivo PNG.

## Funcionamento e limites
Canvas nativo, somente imagens de tiles já exibidas; não há download extra de tiles, prefetch ou pedido a outro serviço. Créditos são preservados conforme a atribuição visível. Política oficial: https://operations.osmfoundation.org/policies/tiles/ . O provedor padrão usa CORS anônimo. Provedores personalizados continuam com sua configuração de visualização; se não permitirem exportação, desmarque “Incluir mapa de ruas”. Não há proxy para contornar essa restrição.

Ruas não carregadas impedem exportação com fundo; a alternativa sem ruas mantém pontos e contexto com aviso explícito. Pontos sem coordenadas permanecem nos relatórios e tabelas. A exportação não inventa locais de urna e não representa limites de zonas. A projeção captura a vista corrente; pontos fora do enquadramento não são mostrados. Os relatórios CSV/JSON continuam sendo o registro completo do recorte carregado.

Títulos, legendas, créditos e textos longos são quebrados automaticamente. Exportação limitada a 16 milhões de pixels; mapas excessivamente altos pedem reduzir a altura. Popups e controles não são incluídos. Não exporta cadastros pessoais. Alterar a seleção durante a geração descarta o download anterior.

## Validação local
TypeScript e build Next aprovados. Dezesseis testes unitários de comparação, camadas e exportação passaram. Chromium: geração real de PNG com tile sintético carregado e sem fundo; assinatura/dimensões verificadas; ruas ausentes retornam erro. PNG de exemplo inspecionado visualmente. O tile sintético não é uma validação do provedor OSM real. Nenhum teste em produção, banco real ou configuração de download do usuário foi realizado.

Depois do deployment, conferir dois mapas, camada de votos, zoom, download com ruas e alternativa sem ruas, principalmente no navegador utilizado pelo administrador.
