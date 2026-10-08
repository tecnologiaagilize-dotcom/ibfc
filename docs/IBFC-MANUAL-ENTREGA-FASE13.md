# IBFC — Ciência Eleitoral: entrega consolidada

Versão 2.16.0. Build IBFC-CE-20261008-CONSOLIDADO-F13.

## Escopo do pacote

Esta é uma atualização consolidada das fases 5 a 13, com as versões mais recentes de cada arquivo. Aplicar sobre o projeto IBFC que já contém a base e as fases 1 a 4. Não é um projeto novo nem substitui todos os arquivos do repositório. Não reaplicar ZIPs antigos das fases 5 a 12 depois deste pacote, pois isso reverteria arquivos.

Inclui exportação PNG, relatórios de comparação/histórico, guia operacional, qualidade estrutural, reconciliação interna de BU, arquivo de análises, dossiês com mapas e Excel e diagnóstico por consulta. A fase 13 consolida os arquivos e documentação, sem novos modelos preditivos ou integração adicional.

## Instalação

1. Guardar o commit atual e o deployment funcionando para permitir retorno.
2. Extrair o ZIP e copiar as pastas app, components, lib, tests e docs para os mesmos caminhos na raiz do repositório. Não criar pasta intermediária nem mover para src.
3. Fazer commit na branch usada pela Vercel e aguardar novo deployment. Conferir que o log utiliza o novo commit.
4. Abrir Administração → Ciência Eleitoral. Conferir versão 2.16.0 e build CONSOLIDADO-F13.
5. Executar Verificar instalação e baixar diagnóstico JSON.

Não há migração SQL nova neste pacote. Migrações anteriores continuam necessárias; diagnóstico disponível não instala o banco. Não reaplicar migrações antigas sem conferir o estado. Não há variáveis ou dependências novas nas fases consolidadas. Configurações de Supabase, GitHub Actions e provedores preexistentes devem estar mantidas.

## Recursos e operação

| Recurso | Como utilizar | Limite relevante |
| --- | --- | --- |
| Mapa multicamadas | Selecionar recorte/candidato e camadas; exportar PNG | Sem coordenadas, registros continuam na tabela; zona pode ser representada por ponto médio |
| Comparação | Escolher seleções e emitir relatório resumido ou completo | Totais preservam recortes; não somar seleções sobrepostas |
| Histórico | Selecionar eleições e conferir cobertura territorial | Mesma chave não certifica continuidade territorial |
| Qualidade | Abrir painel Qualidade dos dados | Diagnóstico estrutural, sem certificar exatidão da fonte |
| Reconciliação BU | Abrir conferência interna na análise | Usa boletins importados; não é segunda fonte independente |
| Relatórios científicos | Buscar UUID ou navegar em páginas de 50 | Filtro de texto atua na página atual; arquivos antigos podem ter somente metadados |
| Dossiê | Abrir relatório e Adicionar análise aberta ao dossiê | Até 10 snapshots compatíveis com hash confirmado; seleção apenas na sessão |
| Mapas no dossiê | Selecionar protocolo, legenda e anexar PNG | Associação manual; 10 imagens de até 5 MB, limites de dimensão; não integram hash |
| Excel | Baixar Excel XLSX do dossiê | Protocolos e uma aba por análise; mapas ficam no HTML/PDF |
| HTML/PDF | Prévia, download HTML ou imprimir/salvar PDF | PDF pelo navegador; permitir janela de impressão |
| Instalação | Verificar instalação e baixar diagnóstico JSON | Consultas por conta autorizada; sucesso não confirma dados nem worker |

No dossiê, baixe os documentos antes de sair/recarregar. Não há persistência automática do dossiê no servidor. JSON de análise preserva séries temporais e metadados originais; Excel e dossiê apresentam o snapshot territorial inicial/final, sem novos cálculos preditivos. O hash verifica o resultado arquivado, não parâmetros, imagens ou arquivos exportados.

## Homologação: situação real

A entrega consolidada é validada localmente. O banco de produção, execuções reais dos workflows e respostas legislativas autenticadas não foram homologados nesta sessão. A fase 12 permanece com a validação real pendente; a fase 13 entrega a consolidação, mas não declara o sistema homologado.

Usar docs/IBFC-VALIDACAO-INTEGRADA-FASE12.md como roteiro. Para cada prova, registrar responsável, data, commit, recorte, fonte e evidência. Não identificar votos individuais a partir dos resultados agregados.

| Prova | Situação inicial | Evidência necessária |
| --- | --- | --- |
| Sincronização TSE concluída | Pendente | Execução GitHub, fonte, recorte e registros |
| Candidato e votos de zona/local/seção | Pendente | Comparação de recorte com fonte oficial correspondente |
| Mapa e cobertura de coordenadas | Pendente | Camadas e códigos conferidos, registros sem coordenadas |
| Arquivo, hash e exportações | Pendente | Protocolo real e arquivos abertos |
| Integrações Câmara/Senado/CLDF | Pendente | Fonte, conteúdo, data e execução conforme fluxo existente |
| Permissões admin/editor e usuário comum | Pendente | Acesso permitido/negado com contas de teste |

Somente aprovar quando as evidências correspondentes existirem. Ausência de dados não significa zero voto. Aguardando processamento não significa sincronização concluída. Estrutura disponível não significa integração funcional.

## Recuperação

Se o deployment falhar, guardar o novo log e identificar o commit utilizado. Para retornar, restaurar o commit/deployment previamente guardado, sem excluir o banco nem os dados. Este pacote não executa alterações de schema.

## Próximo passo

Enviar o diagnóstico JSON do portal publicado para analisar pendências. Guardar as provas de sincronização e uma votação conhecida para iniciar a homologação. Modelos preditivos novos e fontes adicionais são outro ciclo; esta entrega não declara conclusão desses desenvolvimentos.

## Verificação desta consolidação

Build de produção Next.js 16.3.7 concluído, incluindo TypeScript. 36 testes passaram: arquivo, dossiê/XLSX, impressão, qualidade, reconciliação e diagnóstico de instalação. Não houve execução de testes contra o banco real nesta entrega.
