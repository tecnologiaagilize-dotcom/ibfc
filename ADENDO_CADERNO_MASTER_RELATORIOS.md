# Adendo ao Caderno Técnico Master — Relatórios comunitários

Status: implementação e validação local concluídas; instalação de produção pendente.

Nova rota /admin/comunidade/relatorios, API /api/admin/community/reports e função ibfc_community_report(jsonb). Migração 20261022, dependente de 20261019 e 20261020.

Filtros: UF, município, RA/bairro, tema, situação e período de registro. Datas inclusivas no fuso America/Sao_Paulo. Regiões referem-se à organização cadastrada, não ao endereço do solicitante ou local de votação. Registros sem organização entram apenas nos recortes sem filtro regional.

Indicadores e agrupamentos usam o conjunto completo do filtro. A lista detalhada é limitada a 1.000 registros recentes; municípios agrupados a 500. A interface e exportações avisam quando parciais. Exportação CSV por download local inclui metadados de cobertura e neutraliza fórmulas. Impressão A4 pelo navegador permite salvar PDF, mantendo recorte e avisos e retirando navegação/controles.

Acesso admin/editor na API e banco. Não há nomes de participantes, consentimentos, descrições completas ou notas de atendimento no relatório; há título e responsável interno. Resultados descrevem registros administrativos e não comprovam satisfação ou entrega externa.

Validação: build de produção e TypeScript; testes de datas, filtros e CSV; PostgreSQL local com migração repetida, limites e agregações completas, faixa inclusiva de Brasília, demandas sem organização e permissões anon/membro/staff; navegador com filtros, intervalo inválido, aviso de parcialidade, download CSV real, acentos e fórmula neutralizada, mobile sem overflow, controles ocultos na impressão e ausência de erros JavaScript. Revisão visual de mobile e impressão concluída. Banco/deployment de produção não foram alterados.

Plano restante: atividades e inscrições estruturadas, catálogo territorial padronizado, respostas verificadas de representantes e publicação de protocolos ao solicitante. Não foi implementado cruzamento de registros pessoais de participação com votação.
