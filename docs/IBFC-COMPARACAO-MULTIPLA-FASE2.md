# Comparação múltipla — fase 2

Build: IBFC-CE-20261008-COMPARACAO-F2 · versão 2.5.0.

## Instalação e acesso

Aplicar este pacote sobre a base completa com a fase 1 instalada. Copiar preservando caminhos, sem apagar outros arquivos, fazer commit e novo deployment. Não há migração ou variável nova. Reutiliza catálogo, análise e arquivo científico existentes; as migrações correspondentes precisam estar instaladas.

Administrador → Ciência Eleitoral → Comparação múltipla. O submenu é incluído no menu administrativo compartilhado. Escolher ano (2022 ou 2026), UF ou Brasil para presidente, cargo, turno, tipo e território. Selecionar de duas a dez candidaturas ou partidos. A busca mantém as seleções. Candidaturas sem resultados importados ficam indisponíveis, sem serem tratadas como zero.

## Funcionamento

Consultas sequenciais à API administrativa existente, com autenticação, verificação de origem, validação no catálogo e registro científico por seleção. Progresso representa análises concluídas, não importação de dados. Cancelar ou mudar filtros descarta a tela em andamento; consultas já concluídas podem permanecer no arquivo de análises. Nenhuma tabela nova.

Compatibilidade exige mesma UF, ano, eleição, cargo, turno e tipo. Grupos/coligações não entram nessa tela para evitar sobreposição. A comparação histórica continua no módulo original. As candidaturas não são somadas, e sua seleção não implica classificação geral. O limite de dez é validado no painel e no cálculo compartilhado; a API individual continua recebendo uma seleção por requisição.

Cada território mostra votos, denominador e participação por seleção. Zero confirmado permanece zero, ausência permanece sem dados. Denominadores, base de cálculo e granularidade devem ser compatíveis para comparação direta. Granularidades distintas são sinalizadas; não há distribuição artificial de votos de zona entre escolas ou seções.

As consultas são sequenciais e não formam uma transação única: fontes que atualizam entre consultas podem mudar. Horários, protocolos, hashes e fontes são preservados. Totais são os totais do relatório, não a soma de páginas limitadas. Tabela paginada em 50 linhas, rolagem horizontal e coluna territorial fixa; exportações incluem todas as linhas retornadas e alertas de truncamento. CSV protege textos contra fórmulas de planilha. JSON preserva relatórios e parâmetros.

## Limites e homologação

Não entrega modelos preditivos novos, correspondência histórica, regras de cadeiras, mapas lado a lado nem importação nacional nova. Dados pessoais de apoiadores não são consultados. Esta tela compara resultados públicos agregados.

Após publicar, validar com duas candidaturas reais da mesma eleição, confrontar totais e uma zona com o TSE, testar partidos, dados ausentes, cancelamento, CSV/JSON e celular. Banco e deployment de produção não foram acessados nesta etapa.

## Evidências locais

Build de produção concluído com TypeScript e geração de rotas. 27 testes passaram (comparação múltipla, camadas, API de zonas e ciência). Teste de interface com APIs controladas passou para limite de seleção, consultas sequenciais, voto zero, downloads CSV/JSON, busca mantendo seleção, erro, cancelamento, reinicialização e largura mobile. Fonte remota, banco e publicação de produção não foram homologados por esses testes.
