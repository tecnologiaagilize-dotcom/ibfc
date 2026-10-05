# IBFC — Mapa eleitoral do Distrito Federal e Entorno

## Instalação

1. Copie os arquivos deste pacote para a raiz do repositório **ibfc** respeitando as pastas. O MFB não é alterado.
2. No SQL Editor do Supabase do IBFC, execute somente `supabase/migrations/20261009_ibfc_map_and_tse_sync.sql`. O projeto deve ter a tabela `admin_profiles` da base atual. O SQL consolidado cria ou atualiza as tabelas e funções, preservando os dados anteriores do DF e Entorno. A estrutura contém cinco tabelas de resultados públicos, funções e regras de acesso; não altera os cadastros de afiliados.
3. O mapa usa **Leaflet 1.9.4 + OpenStreetMap**, sem chave Google, cartão ou alteração das dependências npm. Copie também `public/vendor/leaflet-1.9.4/`, incluindo CSS, JavaScript, imagens e licença. As variáveis de `.env.electoral.example` são opcionais; deixe vazias para o mapa padrão. Faça novo deployment após copiar os arquivos.
4. Acesse **Administrador → Mapa eleitoral DF e Entorno**, em `/admin/mapa-eleitoral`.
5. Configure a sincronização automática conforme `docs/IBFC-SINCRONIZACAO-TSE.md` e use o botão **Sincronizar bases oficiais**. A importação manual dos arquivos descritos abaixo continua disponível. Sem dados reais importados, não haverá votação para consultar. O mapa funciona independentemente das credenciais da sincronização TSE. Sem resultados importados, poderá mostrar apenas os locais disponíveis.

Não há credenciais ou dados eleitorais fictícios pré-carregados neste pacote. A automação requer configuração dos Secrets GitHub e variáveis de servidor Vercel.

## Bases oficiais necessárias

No Portal de Dados Abertos do TSE, procure, para **2022 e 2026**:

- **Resultados → DF, GO e MG — Votação por seção eleitoral**: arquivo completo com todos os candidatos, brancos, nulos e legenda. Não use uma planilha já filtrada para um candidato, porque isso compromete o denominador e a cobertura.
- **Resultados → Presidente — Votação por seção eleitoral / BR**: caso a base DF não contenha esse cargo. O importador descarta automaticamente linhas fora de Brasília e dos municípios da RIDE-DF.
- **Eleitorado → Eleitorado por local de votação**: inclui nome, endereço e coordenadas dos locais. Importe uma base para cada ano; coordenadas de 2022 não são usadas para inventar a posição de um local de 2026.

Fontes:

- https://dadosabertos.tse.jus.br/dataset/resultados-2022
- https://dadosabertos.tse.jus.br/dataset/eleitorado-2022
- https://dadosabertos.tse.jus.br/dataset/eleitorado-2026
- https://dadosabertos.tse.jus.br/ (localizar os recursos publicados de resultados 2026)
- https://www.tre-df.jus.br/servicos-eleitorais/locais-de-votacao/locais-de-votacao

Nesta execução, o catálogo de resultados 2022 e seus cabeçalhos foram consultados. A consulta direta `package_show?id=resultados-2026` respondeu HTTP 404; não foi possível importar/validar os resultados reais de 2026 aqui. Não se deve concluir que todas as formas de divulgação de 2026 estão indisponíveis: consulte os recursos oficiais publicados antes da carga.

### Como importar

Extraia o ZIP baixado do TSE. Em **Importar bases oficiais**, selecione ano, tipo, codificação, endereço da fonte oficial e o CSV extraído. A codificação padrão é Windows-1252; escolha UTF-8 se necessário.

A leitura é feita progressivamente, com lotes de até 500 registros. Mantenha a aba aberta. O arquivo não é enviado de uma vez à Vercel. Arquivos interrompidos/falhos ficam no histórico e seus dados não entram nos resultados. Pode reimportar o arquivo completo em uma nova execução.

Somente importações finalizadas são utilizadas. A nova importação completa substitui a anterior para cada combinação de UF, ano, eleição, turno e cargo que ela contenha. Por isso **não importe arquivos parciais de um mesmo cargo para tentar somá-los**; use o arquivo oficial completo. Dados antigos permanecem como histórico, aumentando o uso de armazenamento; a administração do banco deverá gerenciar essa retenção.

“Importação concluída” confirma que o arquivo foi processado, não que a cobertura de todo o DF e Entorno foi verificada. O painel exibe seções e locais presentes; não declara cobertura de 100% sem confronto com a base oficial completa.

### Colunas reconhecidas

Resultados: `SG_UF`, `NM_MUNICIPIO`, `ANO_ELEICAO`, `CD_ELEICAO`, `NR_TURNO`, `CD_CARGO`, `DS_CARGO`, `CD_MUNICIPIO`, `NR_ZONA`, `NR_SECAO`, `NR_LOCAL_VOTACAO`, `NR_VOTAVEL`, `NM_VOTAVEL`, `QT_VOTOS`; nomes e endereços dos locais são aproveitados quando presentes.

Locais: `SG_UF`, `NM_MUNICIPIO`, `AA_ELEICAO` ou `ANO_ELEICAO` quando presente, `CD_MUNICIPIO`, `NR_ZONA`, `NR_LOCAL_VOTACAO`, `NM_LOCAL_VOTACAO`, `DS_ENDERECO`, `NR_LATITUDE`, `NR_LONGITUDE`. Valores nulos/inválidos de coordenadas mantêm o local na tabela como pendência. Não há geocodificação automática por endereço, nem ligação com endereços individuais de afiliados.

## Uso do mapa e da comparação

- Os marcadores representam **locais de votação**, agrupando suas seções. Não representam o número de série de cada urna física. Todos os locais de 2026 importados entram na visualização; somente aqueles com coordenadas válidas podem ser desenhados no OpenStreetMap.
- Escolha cargo, turno e a candidatura de 2026 dentre os dados importados — independentemente de apoio institucional. Pode consultar apenas 2026 ou escolher uma candidatura de 2022 para comparação.
- A correspondência entre candidatos é uma escolha explícita. Número de urna sozinho não identifica a mesma pessoa entre eleições. Nomes diferentes geram aviso; nomes iguais também não substituem verificação de identidade.
- O mapa/tabela pode ser filtrado por UF, município, zona e nome/endereço/código do local. Clique no marcador ou no nome do local para ver as seções e os votos.
- O mapa usa verde para aumento de votos, terracota para queda, azul para mesma quantidade e cinza para ausência de comparação.
- Os votos históricos de uma seção coincidente são apresentados junto ao local de 2026, com aviso se o código do local mudou. Seções apenas de 2022 aparecem no local histórico. Isso não cria uma equivalência territorial automaticamente.
- **CSV por seção** baixa diretamente um arquivo para o computador, com filtros, candidaturas e fontes do relatório. **Imprimir / salvar PDF** abre a impressão do navegador, com relatório completo por local e sem menus, mapa ou controles.

## Cálculos e interpretação

- Diferença de votos = votos 2026 − votos 2022.
- Variação relativa = diferença ÷ votos 2022 × 100. Se a base de 2022 for zero, não há percentual calculável; não é apresentado “crescimento infinito”.
- Participação = votos do candidato ÷ votos de candidaturas e legenda importados para o cargo/recorte × 100, excluindo códigos 95 a 99. Esse denominador não substitui os totais oficiais de validade/totalização nem trata sozinho situações judiciais de candidaturas.
- Diferença de participação = percentual 2026 − percentual 2022, em pontos percentuais.
- Totais são somados antes de calcular percentuais; não se faz média simples dos percentuais das seções.
- Uma seção com resultados do cargo, sem registro para o candidato selecionado, é tratada como zero voto. Se o resultado da seção está ausente, aparece **Sem dados**.
- A opção de chaves coincidentes considera UF + código TSE do município + zona + seção. Coincidência de chave não comprova continuidade do eleitorado: seções podem ser agregadas, redistribuídas ou renumeradas. A base de locais inclui situações de seções; esta versão **não reconstrói** essas mudanças históricas.
- Comparação exige a mesma UF, cargo e turno. Senado pode permitir quantidades diferentes de votos por eleitor entre eleições. Percentual de votos não é percentual de pessoas.

O relatório mede **evolução da votação agregada**, não crescimento ou queda comprovados de uma base de eleitores fiéis. Não identifica voto individual, religião, promessa cumprida ou transferência de votos. Nenhuma tabela deste módulo referencia membros/leads/igrejas.

## Validação e limites desta entrega

Build de produção e testes de cálculo/importação passaram. Também foram verificadas em navegador a seleção das candidaturas, a comparação, a exportação CSV, a impressão e a largura de tela mobile, com dados de teste isolados que não integram este pacote. A migração foi executada em PostgreSQL local de teste (PGlite), verificando permissões, snapshots incompletos, denominadores, nulos, mudança de local e consulta sem comparação. Não houve acesso nem aplicação no Supabase/Vercel de produção. O fundo OpenStreetMap depende da conexão e da disponibilidade do serviço de tiles.

O pacote adiciona o mapa e a comparação; não conclui as integrações de fiscalização parlamentar da Câmara/Senado. A sincronização automática do TSE está descrita em `docs/IBFC-SINCRONIZACAO-TSE.md`; as integrações de fiscalização Câmara/Senado seguem como etapas próprias.

Este pacote reúne as duas atualizações anteriores em uma única instalação. Não exige aplicar os ZIPs anteriores, nem executar as migrações antigas. Se já foram aplicadas, execute apenas o SQL consolidado, que preserva os registros existentes. Os arquivos da aplicação contêm sempre a versão mais recente; nenhum pacote anterior deve ser copiado por cima depois desta instalação.

Para reproduzir os testes de cálculo: `npm ci`, `node --test tests/electoral.test.cjs`, `npm run check` e `npm run build`. A configuração `.npmrc` mantém a instalação da dependência legada de mapas da base React 19, sem trocar suas versões neste módulo.

## Ampliação regional

Cobertura: Brasília/DF e os 33 municípios da RIDE-DF (29 em Goiás e 4 em Minas Gerais), conforme https://www.gov.br/sudeco/pt-br/acesso-a-informacao/perguntas-frequentes-1/RIDE . A lista está em `lib/electoral/region.ts` e na migração regional. Inclui Águas Lindas de Goiás, Cocalzinho de Goiás, Padre Bernardo, Novo Gama, Cidade Ocidental, Planaltina/GO, Luziânia, Valparaíso, Formosa e Santo Antônio do Descoberto, entre outros. Todas as opções ficam disponíveis no filtro mesmo antes da carga, sem inventar resultados.

Planaltina do DF faz parte de Brasília, não é o município Planaltina/GO. Jardim ABC é uma localidade de Cidade Ocidental/GO, conforme https://cidadeocidental.go.gov.br/estrutura/secretaria-municipal-da-subprefeitura-do-abc/ . Use a pesquisa de nome/endereço do local para encontrar escolas identificadas com essas localidades. Isso NÃO é classificação automática de todas as escolas por bairro/RA, nem delimitação por polígono. Uma base territorial correspondente será necessária para essa precisão.

Cada marcador agrupa seções de um local de votação, não urnas físicas individuais. O filtro por UF mantém separadas candidaturas estaduais; Presidente também é consultado por UF neste pacote, sem somar candidaturas estaduais incompatíveis. Deputado estadual fica disponível para GO/MG; deputado distrital para DF.

Para ampliar a base já importada, carregue os CSVs completos de GO e, se desejar, MG, além do arquivo presidencial BR e da base nacional de locais de cada ano. O importador usa SG_UF e NM_MUNICIPIO, normaliza acentos e conserva o código municipal TSE do arquivo. Não usa códigos IBGE como substitutos. Arquivo presidencial com linhas BR exige SG_UF territorial por linha; não basta o nome do arquivo.

Não importe um arquivo filtrado apenas para uma cidade: a versão mais recente de uma combinação UF/ano/eleição/turno/cargo substitui a anterior nessa UF. Use o recurso oficial completo, que será filtrado para a cobertura regional. A ampliação do envelope de coordenadas cobre a RIDE, mas não confirma a precisão geográfica da coordenada original.

Verificação desta ampliação: 9 testes de leitura e cálculo; PostgreSQL de teste confirmou preservação do DF, separação de candidaturas com o mesmo número entre UFs, coordenadas do Entorno, permissões e repetição da migração. Interface verificada em navegador: troca de UF, filtros por município, cálculo, exportação CSV do recorte e largura de celular. Build de produção aprovado. Não foi aplicada em GitHub, Supabase ou Vercel de produção e não inclui arquivos eleitorais reais pré-importados.

## Atualização para Leaflet + OpenStreetMap

Se o SQL consolidado já foi instalado, esta troca de mapa **não exige nova migração**. Copie os arquivos e faça novo deployment. As antigas variáveis Google podem ser removidas; não são mais utilizadas pelo módulo. As credenciais Supabase e GitHub da sincronização permanecem.

Leaflet é servido pelo próprio portal. O fundo usa `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, com créditos visíveis e cache normal do navegador. Os tiles públicos não têm disponibilidade garantida nem capacidade ilimitada. Para maior volume, configure um provedor compatível em `NEXT_PUBLIC_ELECTORAL_TILE_URL` e seus créditos em `NEXT_PUBLIC_ELECTORAL_TILE_ATTRIBUTION`; o endereço deve ser HTTPS. Não há download offline nem coleta antecipada de tiles. Política: https://operations.osmfoundation.org/policies/tiles/ .

A biblioteca real foi verificada em navegador com tiles simulados, sem requisições automatizadas ao servidor público: filtros, marcadores, cores, seleção, segurança dos textos do popup, CSV e largura de celular. A disponibilização em produção depende de copiar os arquivos e redeployar.

## Consulta por candidato ou partido

Nos filtros, “Consultar” permite escolher **Candidato específico** ou **Total do partido**. No modo candidato, “Partido do candidato 2026” restringe a lista de 2026; a lista de 2022 permanece independente para permitir conferir mudança de partido entre eleições. No modo partido, escolha separadamente partido de 2026 e partido de 2022 para comparação.

Os partidos são identificados pelos dois primeiros dígitos do número eleitoral, na UF, ano, eleição, turno e cargo selecionados. Quando o arquivo contém nome da legenda, esse nome aparece; caso contrário, a lista mostra “Partido XX”. Não se atribuem siglas atuais aos dados históricos sem fonte. Sigla ou número idênticos não resolvem automaticamente fusões, incorporações ou alterações de identidade entre anos.

O total partidário soma os votos nominais dos candidatos desse número partidário e os votos de legenda presentes no arquivo, excluindo códigos 95 a 99. Os votos são agregados por seção antes da comparação, sem duplicar locais ou denominadores. Nos cargos majoritários, representa as candidaturas do partido; não inclui a votação de outros partidos de uma coligação. Não é total de federação nem cálculo de cadeiras, quociente ou votação juridicamente validada: vale a base por seção importada, conforme as limitações anteriores.

A identificação da consulta acompanha o relatório e o CSV. Os campos são preenchidos a partir de resultados importados, não do cadastro de políticos apoiados. Se uma lista estiver vazia, confira turno, cargo e publicação/carga dos recursos oficiais.
