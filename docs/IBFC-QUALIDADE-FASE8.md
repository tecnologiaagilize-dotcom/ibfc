# Fase 8 — Qualidade estrutural dos dados

Instale após a fase 7. Sem SQL ou configuração adicional. Em Comparação múltipla, após gerar resultados, abra Qualidade dos dados de cada seleção. No Diagnóstico histórico há painel equivalente para os dois anos.

Contagens: linhas retornadas/total informado, resultados ou denominadores ausentes, chaves repetidas, coordenadas ausentes/inválidas, fontes e contagens inconsistentes. Alertas cobrem truncamento, proveniência incompleta, horários inválidos e formato do hash. Baixar diagnóstico de qualidade JSON preserva seleção, protocolo e versão do método.

Não verifica criptograficamente hashes, não compara fontes externas, não comprova fraude ou precisão dos votos. Não corrige ou altera registros. Em histórico, resultado ausente em qualquer ano gera aviso. Coordenadas ausentes não anulam votação. Totais e linhas são examinados separadamente.

Quatro testes unitários passaram. Build e TypeScript validados localmente. Conferência em produção e interface com perfis reais permanecem pendentes. Método ibfc-quality-1.0.
