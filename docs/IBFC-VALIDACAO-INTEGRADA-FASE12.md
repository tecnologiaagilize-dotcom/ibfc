# Fase 12 — Diagnóstico e validação integrada

Versão 2.15.0. Entrega: diagnóstico de instalação resiliente, resultado por consulta e download JSON. Aplicar após a fase 11. Sem SQL, variáveis ou dependências novas.

## O que foi implementado

Consultas existentes são executadas em paralelo, com espera máxima de 12 segundos por consulta. Uma falha ou rejeição não elimina os resultados das demais. Tempo excedido é identificado separadamente. A espera limitada não cancela automaticamente o processamento já iniciado no banco. Erros enviados ao painel contêm somente código, não mensagens internas nem credenciais.

Falha de consulta não produz contagem zero. A amostra de arquivo distingue ausência de registros, metadados e presença de snapshot. O JSON inclui versão, build, commit, horário, resultados e cobertura; não inclui Secrets, nomes de apoiadores ou conteúdo de análises. O acesso continua restrito a admin/editor segundo a regra existente.

Disponível significa resposta sem erro. Não confirma exatidão, cobertura, execução de GitHub Actions ou acesso às instituições. Consultas de BU usam o recorte preexistente DF/2026/eleição 6257/cargo 1/turno 1; não validam automaticamente todos os estados ou eleições. O arquivo é apenas uma amostra de um registro. O campo production_validated é false, explicitamente.

## Validação no portal publicado

1. Abrir Ciência Eleitoral e Verificar instalação. Confirmar build IBFC-CE-20261008-VALIDACAO-F12, anotar o commit e baixar diagnóstico JSON.
2. Sincronização TSE: confirmar workflow concluído, período/UF/cargo/turno correto, registros enviados, fonte e data. Não basta a fila estar aceita.
3. Escolher candidatura com resultado conhecido e conferir uma zona/local/seção com uma fonte oficial correspondente. Registrar códigos territoriais, números, fonte e horário. Base de zonas pode não conter locais ou seções.
4. Conferir mapa: pontos, coordenadas, camadas escolhidas, total de votos e locais sem coordenadas preservados na tabela. Não pressupor que ponto médio de zona é limite geográfico oficial.
5. Arquivar e reabrir análise: protocolo, hash, totais, fontes, ausência versus zero, truncamento. Baixar CSV/JSON e comparar com a tela.
6. Criar dossiê, anexar PNG por protocolo, exportar HTML/PDF e XLSX. Abrir os arquivos e conferir duas análises sem somar recortes sobrepostos.
7. Coletas Câmara/Senado: conferir candidato vinculado, execução concluída, conteúdo, fonte e data. Estrutura disponível não comprova integração. CLDF segue o fluxo de consulta oficial existente.
8. Permissões: conferir acesso autorizado e negação para pessoa sem perfil, sem alterar dados para realizar o teste.

Registrar cada prova como pendente, aprovada ou falha, acompanhada de evidência. Uma etapa sem acesso permanece pendente; não marcar concluída por resultado de testes locais. Evitar enviar cadastros pessoais ou Secrets junto com o diagnóstico.

## Situação desta entrega

Os testes locais e build estão registrados no LEIA-ME. Não houve acesso ao banco real, GitHub Actions ou ambiente autenticado publicado. Portanto, a fase 12 está preparada tecnicamente, mas a validação integrada de produção permanece pendente. A fase 13 pode consolidar os arquivos e a documentação; homologação final depende das provas acima.
