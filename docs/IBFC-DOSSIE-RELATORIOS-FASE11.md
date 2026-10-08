# Fase 11 — Dossiês com mapas e Excel

Versão 2.14.0. Menu: Administração → Ciência Eleitoral → Relatórios científicos. Aplicar após a fase 10, mantendo os caminhos na raiz do GitHub.

## Operação

Abra uma análise e clique em Adicionar análise aberta ao dossiê. Repita para até 10 protocolos diferentes; somente snapshots compatíveis com hash confirmado podem entrar. A lista fica no final da central, inclusive ao abrir outra análise ou trocar a página da lista de arquivos.

Para cada mapa, selecione o protocolo, escreva a legenda e anexe um PNG exportado no mapa eleitoral. Máximo: 10 mapas, 5 MB por arquivo, dimensões de até 10.000 pixels por lado e até 20 milhões de pixels. O navegador decodifica e verifica o PNG antes de aceitar. Imagens ficam na memória da sessão e não são enviadas ao banco. Ao remover uma análise, seus mapas também são removidos.

A seleção e os mapas não são persistidos: recarregar ou sair da página limpa o dossiê. Baixe o HTML ou XLSX antes de sair. Não há salvamento automático do dossiê no servidor.

Visualizar relatório oferece resumo ou todas as linhas recebidas, sem a paginação da tela. Baixar HTML gera documento portátil com os PNG incorporados. Imprimir/salvar PDF abre a impressão do navegador; mapas e suas legendas estão no documento. Permita a janela de impressão quando necessário.

## Excel

Baixar Excel XLSX do dossiê gera arquivo OOXML nativo sem novas dependências. Aba Protocolos: identificadores, método, datas originais, hash, conferência, parâmetros e limitações. Uma aba por análise: totais originais, linhas territoriais e fontes. Votos são números, ausência é célula vazia e textos são células de texto, inclusive quando iniciam com sinal de fórmula. Não há fórmulas automáticas. Os mapas são incorporados somente no HTML/PDF, não no XLSX.

## Interpretação

Análises são seções independentes: não somar recortes sobrepostos nem assumir consulta única. Datas e métodos continuam os originais. A associação de um PNG ao protocolo é declaração do operador, sem conferência automática com os dados. O hash original cobre apenas o snapshot, não o mapa, os parâmetros nem o dossiê exportado.

Séries temporais completas permanecem disponíveis no JSON original e na visualização da central; o dossiê e a planilha reproduzem os totais e territórios do snapshot inicial/final, sem recalcular previsões.

## Implantação

Somente arquivos novos/alterados. Sem SQL novo, variáveis de ambiente ou dependências. Após commit e deployment, conferir build IBFC-CE-20261008-DOSSIE-F11. Este pacote não realiza deployment automaticamente. A fase 12 permanece a validação integrada com serviços e banco reais; a fase 13, homologação e pacote final.

## Validação local

Build Next.js 16.3.7 concluído e TypeScript sem erros. Dezesseis testes passaram: arquivo, impressão e dossiê/XLSX. ZIP e XML do XLSX conferidos por parser independente; o arquivo baixado pela interface foi reaberto por leitor de planilhas e preservou abas, zero e ausência. Teste Chromium com API simulada verificou dois protocolos, bloqueio de duplicação, PNG na prévia, remoção em cascata, download XLSX e celular de 390 px sem overflow nem exceções. A validação não usou banco de produção ou Microsoft Excel. Mapas foram anexados a partir de imagem de teste.
