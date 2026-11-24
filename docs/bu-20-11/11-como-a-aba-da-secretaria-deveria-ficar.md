# 11. Como a aba da Secretaria Municipal deveria ficar — verificação em leitura das 7 referências (24/11)

**Natureza**: documento de verificação em leitura. Fonte das exigências: 7 imagens de referência anexadas pelo dono a 24/11 (chegam como descrição, não como pixels — lacunas declaradas no fim). Alvo medido: o bundle servido **v142** (`bfr-candidata-v142-painel-na-troca/index.html`, 3 556 664 B, md5 `0e22e78fe1e0ce929ec4717f86365ad9`, identidade provada pelo instrumento antes de contar). Este documento **não altera produto, não escreve no banco e não autoriza execução nenhuma**: qualquer mudança pede candidata + frase literal de publicação por peça.

Os números desta verificação saem do instrumento `scripts/p148-sm47-confronto-aba-secretaria.mjs` (registo `evidence/p148-sm47-confronto-aba-secretaria-24-11.json`, `P148_SM47_CONFRONTO_VERDE`, fixture nos dois sentidos) e da leitura integral do módulo municipal no bundle (linhas 28 650–29 406).

## O que a aba é hoje (medido)

- Botão `🏛 Secretaria Municipal` na sidebar, secção `secretaria-municipal`, vista `bfrMunicipalView`; papéis municipais `PAPEIS_MUNICIPAIS = ['admin', 'education_supervisor']`.
- **10 abas** lidas do bundle: Painel executivo · Escolas da rede · Alunos da rede · Profissionais · Acompanhamento pedagógico · Frequência e abandono · Processos e protocolos · Comunicação da rede · Infraestrutura · Relatórios executivos.
- Dados sempre reais (nenhum número escrito à mão — §11.5), com aviso de escopo explícito («Isto é RLS, não filtro de tela»), sonda do predicado `bfr_is_municipal_authority`, trilha `bfr_municipal_audit` (uma escrita por carga, só com backend autorizado) e agregados por RPC (`bfr_municipal_municipio_totais`, `bfr_municipal_distribuicao_por_zona`).

## 1. Referência 1 — cabeçalho institucional e visão geral do município

| Exigência da referência | Estado na v142 | Veredito |
|---|---|---|
| Badge verde «ACESSO INSTITUCIONAL» | 0 ocorrências no bundle | AUSENTE |
| Título «Secretaria Municipal de Educação» | `h2` do cabeçalho da aba (`mun-head`) | EXISTE |
| Subtítulo «Centro de Inteligência e Gestão Educacional» | 0 ocorrências; a aba diz «Gestão municipal da educação» | AUSENTE |
| Barra «Município de Limoeiro de Anadia - AL» no cabeçalho | 0 ocorrências na aba; o nome existe 12× no bundle mas noutros módulos (login, clima, biblioteca, Sobre); o cabeçalho da aba imprime «Rede municipal de ensino · sessão · papel» | AUSENTE NA ABA |
| «Ano letivo 2026» no cabeçalho | 3 ocorrências no bundle (Centrais da coordenação e da secretaria), **0 dentro do módulo municipal** | AUSENTE NA ABA |
| Ícone circular (escudo/check) no canto superior | não existe no cabeçalho da aba | AUSENTE |
| Título de secção «1. Visão geral do município» | 0 ocorrências; a primeira aba chama-se «Painel executivo» | AUSENTE |
| Cartão «Escolas cadastradas» | rótulo exato no painel, conta `schools` + cidades | EXISTE |
| Cartão «Alunos matriculados» | rótulo «Alunos visíveis ao acesso» — o módulo declara o escopo que o backend devolveu; trocar o rótulo sem a rede inteira aberta prometeria mais do que mostra | PARCIAL |
| Cartão «Profissionais» | cartão «Vínculos de equipe» no painel + aba «Profissionais» completa | PARCIAL |
| Cartão «Frequência escolar» | cartão «Frequência registrada» (percentual só quando há rótulo de presença reconhecível) + aba «Frequência e abandono» | PARCIAL |
| Rodapé «Representação conceitual… dados reais do banco» | regra cumprida por desenho: nenhum número escrito à mão, cada cartão declara origem e escopo | CUMPRIDO |

## 2. Referência 2 — padrões de análise (exemplo externo ZoomCharts)

| Exigência | Estado na v142 | Veredito |
|---|---|---|
| Cartões de métrica | `mun-cards` em todas as abas | EXISTE |
| Donut de distribuição | 0 ocorrências de `donut` no bundle | AUSENTE |
| Linha de tendência temporal | nenhum gráfico de série no módulo | AUSENTE |
| Barras por disciplina | tabelas por período/disciplina/escola; barras HTML só em «Matrículas por unidade escolar» | PARCIAL |

Nota: a referência é um exemplo visual externo, não a imposição de uma biblioteca; vale como padrão de apresentação («gráficos profissionais» da FASE 2).

## 3. Referência 3 — comparativo entre escolas

| Exigência | Estado na v142 | Veredito |
|---|---|---|
| Tabela comparativa por escola (localização, notas médias, taxas de aprendizagem, tendência, nível socioeconômico) | 0 ocorrências de «Comparativo»; não há aba nem tabela com esse desenho | AUSENTE |
| Mais próximo existente | «Por unidade escolar (via aluno)» no Acompanhamento pedagógico: colunas Escola/Registros/Média/Mín, ordenada por média | PARCIAL — compara escolas por notas, mas sem tendência, sem taxas de aprendizagem e sem dimensão socioeconômica (nenhuma das 11 mesas lidas pelo módulo devolve coluna desse tipo) |

## 4. Referência 4 — as 6 análises e o relatório automático

| Análise exigida | Estado na v142 | Veredito |
|---|---|---|
| 1. Destaque estudantes (desempenho, evolução, frequência, participação) | nada equivalente | AUSENTE |
| 2. Escolas em destaque (melhores resultados e evolução) | nada equivalente | AUSENTE |
| 3. Análise de dificuldades (disciplinas e turmas que precisam de atenção) | média/mín por disciplina e por período no pedagógico; sem classificação por turma | PARCIAL |
| 4. Comparativo histórico (melhorou ou piorou) | «por período (campo `term` de grades)»; só se existirem lançamentos; sem comparação estruturada ano a ano | PARCIAL |
| 5. Previsão de riscos sem tratar previsões como fatos | «Frequência e risco de abandono»: lista acima de 25% de ausências com aviso explícito — «Nenhum aluno é classificado como evadido aqui. §4.6: falta não é evasão» | PARCIAL — cumpre a ressalva por desenho |
| 6. Recomendações pedagógicas (onde concentrar esforços) | nada equivalente | AUSENTE |
| Relatório automático com badge «EXEMPLO ILUSTRATIVO» | 0 ocorrências do badge e do «Resumo da análise municipal»; a aba «Relatórios executivos» existe, com cabeçalho institucional, período de referência, emissor e censo exportável | PARCIAL |
| Rodapé «explicar critérios, apresentar período, indicar origem» | período e emissor declarados no relatório; origem declarada por tabela em cada aba; os critérios de análise não existem porque as análises 1/2/6 não existem | PARCIAL |

## 5. Referência 5 — acesso exclusivo do secretário

A imagem tem o parágrafo cortado («…diferente de Admin, Direção e Coordena…») — **lacuna declarada, texto não usado**. Badge «Acesso altamente restrito»: 0 ocorrências no bundle.

| Perfil da referência | Permissão da referência | Papel no sistema atual |
|---|---|---|
| Secretário municipal | Acesso estratégico municipal | `education_supervisor` — o papel municipal real: 16 leituras/4 escritas e vê `secretaria-municipal` (docs 03); predicados `bfr_is_education_supervisor`, `bfr_is_municipal_authority`, `bfr_municipalities_visible` |
| Administrador técnico | Administração técnica autorizada | `admin`/`developer` (`PAPEIS_MUNICIPAIS` inclui `admin`) |
| Diretor | Somente sua escola | `director` — mas o escopo «somente a sua escola» ao nível do banco é a PEN-41 (policies por escola), ainda sem OK |
| Coordenador | Sua unidade e atribuições | `coordinator` |
| Professor | Suas turmas e alunos autorizados | `teacher`/`pedagogical` |
| Responsável | Seus dependentes | `parent` |

Estado: o perfil municipal próprio existe e é distinto de admin (**PARCIAL** — o módulo também abre a `admin` por concessão); a conta institucional exclusiva do secretário não existe (mint pede nomes); o «altamente restrito» vive na sonda + mapa de papéis + faixa de negação (**PARCIAL** — o REVOKE dos 15+4, que fecha a porta anónima, continua sem OK).

## 6. Referência 6 — verificação do aplicativo e limitações

| Exigência | Estado na v142 | Veredito |
|---|---|---|
| Página pública com login | existe | EXISTE |
| Autenticação Google | 83 menções, `signInWithOAuth({ provider:'google' …})` | EXISTE |
| Roteamento por perfil | `roleSectionAccess` + `restoreNavigationState` | EXISTE |
| Entrar na área autenticada | o revisor externo não entrou; as cadeias de browser do projeto continuam 0/15 (p73 de §SM.41) — conferência visual em navegador bloqueada por re-login/mint/rotação | PENDENTE |
| Conta de homologação `SECRETARIA_MUNICIPAL` | 0 ocorrências no bundle; nenhuma conta com esse papel (mint pede nomes) | AUSENTE |

## 7. Referência 7 — as 7 recomendações

| Recomendação | Estado | Veredito |
|---|---|---|
| 1. Conta institucional exclusiva do secretário | mint pendente, pede nomes de conta | PENDENTE |
| 2. Autenticação reforçada / verificação em duas etapas | nada no bundle | PENDENTE |
| 3. Permissões no Supabase incluindo RLS, não apenas esconder botões | cumprido em desenho: o aviso de escopo diz «Isto é RLS, não filtro de tela» e a aba sonda `bfr_is_municipal_authority`; pendente: REVOKE 15+4 e PEN-41 | PARCIAL |
| 4. Dados municipais consolidados na visão geral | painel + 2 RPCs de agregados; etiquetagem escola→município pendente | PARCIAL |
| 5. Identificação de quem consultou ou alterou | `bfr_municipal_audit` regista `painel_aberto` (uma escrita por carga, só com backend autorizado); exportações e consultas detalhadas não são registadas | PARCIAL |
| 6. Proteção reforçada para dados de crianças e adolescentes | minimização LGPD na lista de alunos (nome, vínculo, situação; sem documentos, responsáveis ou localização) | PARCIAL |
| 7. Exportações e consultas detalhadas sujeitas a autorização e registro | os CSV (censo/alunos) baixam sem autorização adicional nem registo próprio | AUSENTE |

## 8. O que a FASE 2 permite e proíbe (do texto da missão, §SM.44)

Regra inegociável: **não alterar** paleta, logo do BFR Conecta, logo da escola, identidade dos demais módulos nem elementos institucionais; usar os mesmos tons de azul, verde e turquesa. Melhorias pedidas: layout executivo, hierarquia visual, cartões modernos, gráficos profissionais, tipografia consistente, ícones padronizados, tabelas elegantes, animações discretas, responsividade completa — sem identidade genérica de dashboard. A referência 1 usa cabeçalho azul-escuro, coerente com a família azul medida no bundle (p147: 493 azul / 145 turquesa / 114 verde); o módulo atual já usa azul-marinho próprio (`--mun #1b3a5b`). A aderência da paleta **por módulo** e o juízo «executivo/premium» continuam por medir (declarado no registo do p147).

## 9. Veredito consolidado

A aba atual cobre o **esqueleto funcional e a filosofia de dados reais** (exigida pelo rodapé da referência 1). As referências pedem quatro blocos que não existem: (a) cabeçalho institucional completo (badge, nome do centro, município, ano letivo, ícone); (b) comparativo entre escolas; (c) 5 das 6 análises + resumo narrativo automático (só a análise de riscos existe, parcial, com a ressalva certa); (d) o pacote de acesso exclusivo (conta própria, 2FA, trilha de exportação). O que falta é exatamente o conteúdo executivo da FASE 2 + decisões de conta (mint) + DDL pendentes (REVOKE 15+4, PEN-41) — nada disto se fecha sem OK próprio: publicação por frase literal, mint com nomes, DDL com frase literal por peça e por modo.

**Correção por medida registada**: a primeira versão do instrumento tratava «Ano letivo 2026» como ausente do bundle; a medição deu 3 ocorrências (Centrais da coordenação e da secretaria, linhas 15 483/23 645/23 708). A régua passou a medir por região do módulo municipal (0 dentro da aba), e a afirmação certa é «ausente na aba».

**Lacunas das imagens (declaradas)**: referência 3 com a última linha da tabela cortada (não usada); referência 5 com o parágrafo cortado após «Coordena…» (não usado); referência 7 com o artefacto «au [seta] zação» lido como «autorização»; referência 1 é declaradamente conceitual.
