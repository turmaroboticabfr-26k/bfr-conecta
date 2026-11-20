# BU-10 — Plano de prioridades (20/11), derivado das medidas, não da vontade

| campo | valor medido |
|---|---|
| instrumento | `scripts/bu10-prioridades-20-11.mjs` (só leitura) |
| veredicto | `BU10_VERDE 12/0`, `node_exit=0` na captura `bu10-canonical2.txt` |
| execução canónica | `em=2026-11-20T11:23:11.093Z` |
| artefactos | `evidence/bu10-prioridades-20-11.json` 27 229 B md5 `0a955d5b54480b1d4c37cdb672bce1e2` · `evidence/bu10-prioridades-20-11.txt` 14 099 B / 67 linhas md5 `1553aebac590e442e6b2f4592ef36248` |
| byte a que o plano se refere | `index.html` 3 547 458 B md5 `9e236a23eed978cf7c2a2743d449b307` — o mesmo byte declarado por BU-5, BU-7, BU-8 e BU-9 |
| idempotência | re-corrida sem a linha `"em"` dá ficheiro **idéntico** (24 234 caracteres, comparação programática) |
| vermelhos preservados | `evidence/bu10-prioridades-20-11-VERMELHO-cinco_defeitos_de_instrumento_fase_9_celulas_regex_rm_com_ponto_final_regua_crua_sinal_de_fixture_e_grelha_contando_cabecalho.txt` md5 `83dfe570e8bac889ee53f2fd7caa9ee4` · `evidence/bu10-prioridades-20-11-VERMELHO-artefacto_em_docs_recusado_por_predicado_de_evidence_e_grelha_contando_cabecalho.txt` md5 `5252858be9db64ec8306844c07f95dde` |
| corridas do BU-4 preservadas (§7.1) | `…-ANTES-instrumento_declara_ficheiro_inexistente.json` 196 362 B md5 `a66b79cab2f18df83ccd74459ba1ad60` · `…-ANTES-caminhos_com_prefixo_undefined.json` 196 358 B md5 `e216cd56fca2ebc924574a14741d708b` · `…-INTERROMPIDA-a_fonte_pegada_padrao_aponta_para_a_variante_11d_superada.json` 197 207 B md5 `ad235be1d59bf13a5ff886b6c0023f64` — as três com o prefixo `evidence/bu4-digestao-para-documentacao-20-11`. Canónico re-emitido: 196 313 B md5 `efd4d58308390d08f6076fef52fd393a`, diário 6 879 B md5 `eb1a978b0ab4d6c7180842828982907e`, veredicto `BU4_DIGESTAO_VERDE 16/0` |

## 1. De onde vem cada linha

O plano não é uma lista nova: é a intersecção de três coisas que já estavam medidas.

| fonte | o que empresta | como é lida |
|---|---|---|
| `docs/roadmap-master.md` §13 (45 linhas de fase) | ID, tarefa, módulo, prioridade **P**, dependências **D**, complexidade **Cx**, status, critério | a régua do produtor: `\\|` não abre célula; linha válida tem **8** células |
| `evidence/bu8-listas-20-11.json` (12 saídas + 20 ausências) e `evidence/bu9-roadmap-visual-20-11.json` (7 divergências) | o que a medição sustenta, por grupo de módulo ou por superfície | os textos são copiados do artefacto, nunca dactilografados |
| `evidence/bu5-unidades-do-roadmap-20-11.json` | o rótulo medido de cada unidade, usado para casar o «Módulo» da fase com o que foi medido | tokenização sem acentos, comprimento > 3 |

**Regra de entrada — e é a parte que importa.** Uma fase só fica fora do plano se o seu próprio texto de status trouxer **prova positiva de fecho** (`FECHADA`, `Feito`, `CANCELADA`, `APLICADA`, `EXECUTADA`, `PUBLICADA`). Quem não tem marca nenhuma, ou tem marca contraditória, **entra**. Assim: 45 lidas → 35 no plano (31 `aberta` + 3 `sem_marca` + 1 `ambigua`) e 10 fora.

| fase | porque entrou sem estar marcada como pendente |
|---|---|
| RM-1.3 | `Medido 12/11 com achado — RM13_CADEIA_PARTIDA` — medição não é fecho; a exibição em aparelho físico continua em falta |
| RM-5.2 | `Desenho de conteúdo proposto 20/11 ... conteúdo 0 linhas` |
| RM-5.6 | `Bloqueado — ...` — bloqueio é estado de trabalho, não conclusão |
| RM-1.6 | `EXECUTADA ... PUBLICADA` **e** uma cláusula `Pendente` no mesmo texto: ambígua. Entra, com a ambiguidade impressa, em vez de ser lida como fechada por uma das metades |

Uma primeira versão deste instrumento tinha a regra ao contrário — só entrava quem dissesse `Pendente` — e por isso deixava o plano em 31 linhas, escondendo trabalho. A correcção **aumenta** o plano; está no portão 11.

## 2. A ordem, e onde ela contradiz a prioridade

Ordenação declarada: **P lido do §13 (A < M < B)**, depois **profundidade da cadeia de dependências**, depois **ID**. Depois, por cima, um empurrão topológico: se uma fase do plano depende de outra fase do plano, a dependida tem de vir antes. O grafo foi medido: 15 fases com dependência, profundidade máxima 2, **zero ciclos**, zero arestas para fase inexistente.

A régua **não** exige prioridade monotonicamente crescente — isso seria uma exigência impossível quando uma dependência obriga. O que se exige é que nenhuma queda seja anónima. Quedas medidas nesta corrida:

| queda (lida da ordem emitida) |
|---|
| RM-6.7(PA) antes de RM-1.3(PM) |
| RM-3.3(PA) antes de RM-2.7(PM) |
| RM-6.6(PA) antes de RM-4.5(PM) |
| RM-5.6(PM) antes de RM-2.4(PB) |

Dois fixtures acompanham a regra: inverter a entrada do ordenador **não** muda a saída (a ordem é função dos campos, não da leitura), e trocar um `P` de `A` para `B` **muda** a saída. Sem a segunda cláusula, a ordem podia ser decorativa.

## 3. O plano

Tabela copiada byte a byte da secção `### PLANO DE PRIORIDADES` do diário do instrumento — não foi reescrita à mão.

| Ordem | ID | P | Cx | Tarefa (lida do §13) | Módulo | Status (lido) | OK necessário | Depende | Grupos BU | Marca de estado |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | RM-1.6 | A | B | Repor o embed `sports_schools(name)` da Supervisão, perdido entre a v115 e a v116 (PEN-31): o ar vivo consulta | Supervisão | **EXECUTADA 13/11 — v119 PUBLICADA** (versão `6aed50af-a8a1-4c2b-84ae-cb6eaec4770b`, deplo | publicacao | — | 5.9 | ambigua |
| 2 | RM-2.10 | A | M | Fechar PEN-28/29/30 — as 9 formas de consulta que falham no ar, as 3 tabelas inexistentes e a coluna `announce | Dados/consulta | **Aberto, criado 12/11 pela FIN-2** — nada foi alterado | nenhum | — | — | aberta |
| 3 | RM-6.3 | A | M | Validação dos 15 perfis nas duas bandas | QA | Pendente | nenhum | — | — | aberta |
| 4 | RM-6.5 | A | M | Documentação final (manuais por perfil + guia de operação) | Documentação | Pendente | nenhum | — | — | aberta |
| 5 | RM-6.7 | A | B | Fechar PEN-24: proteção anti-clique-jacketing (`frame-ancestors` no header CSP + `X-Frame-Options: SAMEORIGIN` | Segurança | **Aberto, lacuna medida 12/11 (RM14-A1) e insumo decidido por medição 12/11**: `frame-ance | publicacao | — | 5.16 | aberta |
| 6 | RM-1.3 | M | B | Provar entrega push em aparelho físico | Notificações | **Medido 12/11 com achado — `RM13_CADEIA_PARTIDA`** (8/6 portões; `evidence/rm13-rotas.jso | publicacao | — | — | sem_marca |
| 7 | RM-2.1 | M | A | Fechar fome de timers do menu mobile (item 77) | Navegação mobile | Pendente | nenhum | — | 5.2,MED-POR-pending@430,MED-POR-secretary@430,MED-POR-sports_operator@390,MED-POR-sports_operator@414,MED-POR-sports_operator@430,MED-POR-education_supervisor@414,MED-POR-education_supervisor@430,CENSO-pending@320,CENSO-pending@360,CENSO-pending@375,CENSO-pending@390,CENSO-pending@414,CENSO-pending@430,CENSO-monitor@320,CENSO-monitor@375,CENSO-monitor@390,CENSO-monitor@414 | aberta |
| 8 | RM-2.2 | M | M | Decidir e resolver overlay executivo × painéis legados (Direção) | Direção | Pendente — **insumo medido 12/11** (§12.1: 3 regras `!important`, escape `data-exec-reveal | nenhum | — | — | aberta |
| 9 | RM-2.3 | M | B | Ligar ou remover «Marcar em análise» | Coordenação | Pendente — **insumo medido 12/11** (§12.1: 4× dentro do módulo morto `bfr-coordination-ux` | nenhum | — | 5.6 | aberta |
| 10 | RM-2.6 | M | M | Provar gestão administrativa integrada como cenário único | Direção/Coord./Secr. | Pendente | nenhum | — | — | aberta |
| 11 | RM-3.2 | A | A | Indicadores agregados da rede (Supervisão) | Supervisão | Pendente | nenhum | RM-2.6 | 5.9 | aberta |
| 12 | RM-3.3 | A | M | Relatórios comparativos entre escolas | Supervisão | Pendente | nenhum | RM-3.2 | 5.9 | aberta |
| 13 | RM-2.7 | M | M | Prova de render completo do professor com conta real vinculada | Professor | Pendente | nenhum | — | 5.5 | aberta |
| 14 | RM-4.1 | M | A | Refactor dos 55 MutationObservers (dispatcher único) | Desempenho | Pendente | nenhum | — | — | aberta |
| 15 | RM-6.1 | M | A | Suite organizada (Playwright/Vitest) sobre o harness | Qualidade | Pendente | ddl | — | — | aberta |
| 16 | RM-6.6 | A | M | Implantação/rollout com monitoramento | Produção | Pendente | nenhum | RM-6.1 | — | aberta |
| 17 | RM-4.5 | M | M | Otimização do boot (alvo <2 s @390) | Desempenho | Pendente | nenhum | RM-4.1 | — | aberta |
| 18 | RM-5.6 | M | M | Validação push físico em produção piloto | Notificações | Bloqueado — RM-1.3 mediu 12/11 e achou a cadeia partida no cliente; 14/11 (§U.2) localizou | publicacao | RM-1.5 | — | sem_marca |
| 19 | RM-2.4 | B | B | Hero do aluno com nome oficial (item 86) | Aluno | Pendente — **insumo medido 12/11** (§12.1: `applyIdentity` lê `official_name`; nome prefer | nenhum | — | — | aberta |
| 20 | RM-2.5 | B | M | Home do aluno — fechar falha silenciosa `@9392` (item 85) | Aluno | Pendente — **insumo medido e re-escrito 12/11** — **re-contado 17/11 com denominadores sep | nenhum | — | — | aberta |
| 21 | RM-2.9 | B | A | XP/Trilhas/Conquistas dinâmicos (D6) | Aluno | Pendente | nenhum | — | — | aberta |
| 22 | RM-3.4 | B | M | Notificações automáticas de frequência/nota ao responsável | Notificações | Pendente | nenhum | — | — | aberta |
| 23 | RM-4.2 | B | M | Tap≥44 na banda web (avaliar se aplica) | UI web | Pendente | nenhum | — | — | aberta |
| 24 | RM-4.3 | B | B | Resíduos de fonte<11 e cortes em 320–430 | UI mobile | Pendente | nenhum | — | MED-POR-pending@430,MED-POR-secretary@430,MED-POR-sports_operator@390,MED-POR-sports_operator@414,MED-POR-sports_operator@430,MED-POR-education_supervisor@414,MED-POR-education_supervisor@430,CENSO-pending@320,CENSO-pending@360,CENSO-pending@375,CENSO-pending@390,CENSO-pending@414,CENSO-pending@430,CENSO-monitor@320,CENSO-monitor@375,CENSO-monitor@390,CENSO-monitor@414 | aberta |
| 25 | RM-4.4 | B | M | Acessibilidade (nomes acessíveis dos controles) | UI | Pendente | nenhum | — | — | aberta |
| 26 | RM-4.6 | B | M | Load testing em ambiente controlado | Qualidade | Pendente | nenhum | — | — | aberta |
| 27 | RM-5.1 | B | A | Modo offline da portaria | Portaria | Pendente | nenhum | — | — | aberta |
| 28 | RM-5.3 | B | B | Crachá físico + câmera real (teste de campo) | Portaria | Pendente | nenhum | — | — | aberta |
| 29 | RM-5.4 | B | M | Ferramentas administrativas novas (conforme demanda) | Direção/Secr. | Pendente | nenhum | — | — | aberta |
| 30 | RM-2.8 | B | B | Publicar candidata do `navButton` (1,2 s→1×) | Desempenho | Pendente | nenhum | RM-2.1 | — | aberta |
| 31 | RM-3.5 | B | M | Preferências de notificação por responsável | Notificações | Pendente | nenhum | RM-3.4 | — | aberta |
| 32 | RM-5.2 | B | M | Turnos/calendário real da portaria | Portaria | **Desenho de conteúdo proposto 20/11** (`docs/plano-rm52-conteudo-calendario-20-11.md`); e | nenhum | RM-5.1 | — | sem_marca |
| 33 | RM-6.4 | B | M | Testes de desempenho e carga | QA | Pendente | nenhum | RM-4.6 | — | aberta |
| 34 | RM-5.5 | B | A | Inteligência de dados (alertas de evasão/desempenho) | Indicadores | Pendente | nenhum | RM-3.2 | — | aberta |
| 35 | RM-5.7 | B | M | Expansão institucional (novas escolas na rede) | Supervisão | Pendente | nenhum | RM-3.2 | 5.9 | aberta |

## 4. O que cada linha exige de decisão sua

A coluna `OK necessário` é tirada da palavra que está no **texto do critério/status daquela linha**, com precedência `publicação > mint > DDL > decisão de produto` (o primeiro é o que trava os restantes). Contas da corrida canónica:

| OK | itens | quais |
|---|---|---|
| `publicacao` | 4 | RM-1.6 (ordem 1), RM-6.7 (ordem 5), RM-1.3 (ordem 6), RM-5.6 (ordem 18) |
| `ddl` | 1 | RM-6.1 (ordem 15) |
| `mint` | **0** | classe impressa com zero — a classe vazia diz-se, não se cala |
| `decisao_produto` | **0** | idem |
| `nenhum` | 30 | as restantes: medir, contar, reparar localmente — nada toca produção |

Portanto: deste plano, **5 linhas** precisam de um OK literal novo seu (4 de publicação, 1 de DDL) e 30 não precisam de autorização nenhuma para avançar. Nada neste documento foi publicado, aplicado ou escrito no banco — o briefing §6 proíbe alterar o projecto nesta etapa, e a proibição foi cumprida.

## 5. Onde a ligação entre fases e medidas falha (e porquê)

A ligação fase ↔ evidência é feita por **tokens do «Módulo» do §13** contra o **rótulo medido da unidade** (BU-5) ou a **superfície** da ausência (BU-8: `web`/`mobile`), porque o ID de uma ausência não nomeia módulo. Resultado medido, sem maquilhagem:

- **9 de 35** fases do plano ligam a pelo menos um grupo de evidência (`RM-2.1` puxa 18 grupos, `RM-4.3` puxa 17, outras 7 puxam 1 cada);
- **26** fases não ligam a nenhum grupo;
- **11** grupos de evidência não ligam a nenhuma fase do plano: `5.1, 5.4, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, FALTA-W1, FALTA-W2, FALTA-W3`.

Isto é uma **falha de vocabulário entre duas fontes**, não uma conclusão sobre o produto: o §13 fala «Notificações», «Desempenho», «Aluno»; a medição fala `5.9 Supervisão Educacional (Secretaria de Educação)` ou `FALTA-W1`. Uma fase sem grupo ligado não está sem trabalho — está sem correspondência nominal. É a mesma divergência que BU-9 já tinha medido como único nome divergente no registro (`Portaria` vs `Porteiro`), agora a aparecer no lado das fases. A tabela completa dos 11 grupos, com fonte e artefacto, vem do diário:

| Grupo de evidência | Itens | Fonte do item | O que exige (texto medido) | Artefacto |
|---|---|---|---|---|
| 5.1 | 1 | saida_defeito | aprovação medida com clique real, mas o estado `pending` é inalcançáve | evidence/rm12-veredito.json |
| 5.4 | 1 | saida_prova_ausente | existe 1 linha em `guardian_students`: a passada com conta real não é  | evidence/bu2-censo-catalogo-20-11.json |
| 5.10 | 2 | saida_defeito+divergencia_registro_pronto_medicao_nao | as 6 larguras do papel `monitor` estão TRAVADAS (barra mobile não mont // o registro declara IF e a medição não sustenta | evidence/p73-cobertura-m5-por-ar-20-11.json,evidence/bu9-roadmap-visual-20-11.json |
| 5.11 | 3 | saida_defeito+saida_prova_ausente+divergencia_de_nome | o destino servido chama `register_gate_checkin_v2`, que dá 0 em `pg_pr // nenhum artefacto com o identificador T79 existe em `evidence/` nem `sc // 5.11: registro="Portaria" medido="Porteiro" | evidence/p73-rm52-estado-calendario-20-11.txt,docs/roadmap-master.md,evidence/bu9-roadmap-visual-20-11.json |
| 5.12 | 2 | saida_prova_ausente+divergencia_registro_pronto_medicao_nao | nenhum artefacto com esse identificador em `evidence/`; as ocorrências // o registro declara IF e a medição não sustenta | docs/relatorio-final-auditoria.md,evidence/bu9-roadmap-visual-20-11.json |
| 5.13 | 2 | saida_defeito+divergencia_registro_pronto_medicao_nao | `sports_operator` escreve 0 tabelas e lê 3; as 5 mesas de gestão dos j // o registro declara IF e a medição não sustenta | evidence/bu2c-caminhos-de-autorizacao-20-11c.json,evidence/bu9-roadmap-visual-20-11.json |
| 5.14 | 2 | saida_defeito+divergencia_registro_pronto_medicao_nao | cadeia partida no recetor do service worker (`RM13_CADEIA_PARTIDA 8/14 // o registro declara IF e a medição não sustenta | evidence/rm13-rotas.json,evidence/bu9-roadmap-visual-20-11.json |
| FALTA-W1 | 1 | ausencia_de_prova | passada autenticada com clique no container de navegação real do deskt | evidence/bu8-listas-20-11.json |
| FALTA-W2 | 1 | ausencia_de_prova | régua de hit-teste (elementFromPoint) sobre o alvo desktop, não sobre  | evidence/bu8-listas-20-11.json |
| FALTA-W3 | 1 | ausencia_de_prova | novo selector lido do bundle, nunca dactilografado | evidence/bu8-listas-20-11.json |
| 5.15 | 1 | divergencia_registro_pronto_medicao_nao | o registro declara IF e a medição não sustenta | evidence/bu9-roadmap-visual-20-11.json |

## 6. O ledger PEN é um estaleiro, não o plano

O ledger foi re-contado com a régua do produtor e conferido contra o leitor versionado, re-corrido como filho nesta mesma execução:

| grandeza | valor |
|---|---|
| linhas começadas por `PEN-nn` | 42 |
| bem formadas (7 células) | 42 |
| prioridades | A 17 · M 14 · B 11 · soma 42 |
| saída do leitor `scripts/ah1-cuenta-pen.mjs` | `linhas PEN: 42 \| A 17 · M 14 · B 11 · soma 42` |
| linhas com pipe escapado | 1 (`PEN-33`) |
| régua crua (sem des-escapar) | A 17 · M 13 · B 11 + 1 fragmento de prosa de 432 caracteres |
| relação durável | `42 − (17+13+11) = 1` — cada linha escapada migra exactamente uma contagem para fora de A/M/B |
| linhas PEN que citam código `RM-x.y` | 31; sem código: 11 |
| códigos únicos citados | 28, **todos** resolvem para uma fase lida; 0 quebrados |

Os 28 códigos a resolverem todas as referências é o que permite tratar o §13 como escala do plano e o PEN como estaleiro por baixo: nenhuma pendência do ledger aponta para uma fase que não exista.

## 7. Os defeitos que eram meus, e o que custaram

Nenhuma falha abaixo estava no projecto: todas estiveram no instrumento. As corridas que as revelaram ficaram versionadas — as duas vermelhas do próprio BU-10, no cabeçalho deste documento, e as três intermédias do BU-4 em §7.1.

| corrida | defeito | consequência medida |
|---|---|---|
| run 1 | linha de **9 células** era descartada em vez de lida com nota | `RM-2.1` desaparecia do plano e a aresta `RM-2.8 → RM-2.1` parecia quebrada |
| run 1 | regex `RM-[0-9.]+` gulosa | apanhava o ponto final da frase: `RM-4.1.` ≠ `RM-4.1`, 7 códigos «quebrados» falsos |
| run 1 | relação errada da régua crua (`cruas = boas + escapadas`) | a soma certa é `cruas = linhas lidas`; a migração é `boas − crua_AMB = escapadas` |
| run 1 | sinal invertido num fixture de cobertura | o portão exigia que o fixture **não** disparasse, ou seja, era decorativo |
| run 1 | contagem da grelha incluía os cabeçalhos | `44 vs 46`: a régua batia contra a própria definição errada |
| run 2 | portão de evidência aceitava só caminhos `evidence/` | 2 saídas legítimas citam `docs/roadmap-master.md` e `docs/relatorio-final-auditoria.md` e foram chumbadas |
| entre as duas | regra de entrada por palavra «Pendente» | plano tinha 31 linhas em vez de 35: 3 fases `sem_marca` e 1 `ambigua` estavam escondidas |

A nona célula de `RM-2.1` não foi apagada: os oito campos vivem e a célula extra (937 caracteres) ficou guardada como nota no artefacto, com o ID impresso no portão 1.

### 7.1 Mais três, encontrados ao preparar o commit — todos no BU-4

| defeito | onde | o que estava errado | prova do alcance |
|---|---|---|---|
| `instrumento` auto-declarado apontava para um ficheiro inexistente | `scripts/bu4-digestao-de-evidencias-20-11.mjs:30` | o campo declarava `scripts/bu4-digestao-para-documentacao-20-11.mjs` — que é o nome do **output**, não o do script; o script com esse nome não existe | `grep -rln` do nome fantasma devolve apenas o próprio script e o seu artefacto; nenhum doc o cita. Corrigido e re-emitido: corpo **byte a byte idêntico** fora de `em`, `msd`, `instrumento` e `fontes.*.caminho` (119 431 caracteres dos dois lados), veredicto `BU4_DIGESTAO_VERDE 16/0` nos dois |
| a fonte padrão de pegada era uma variante superada | linha 19 (`BU4_PEGADA`) | o default era `bu3-…-2011d…json`; a corrida original lera a `11e`. Só a `11e` declara `secoes_globais`, `tabelas_globais`, `rpcs_globais`, `canais_globais` (censo das 5 variantes em disco: `nnnn`/`nnnn`/`nnnn`/`nnnn`/`yyyy`) | re-corrido sem env, o instrumento rebentava em `pegada_global.secoes_globais.length` (linha 180) **depois** de escrever o JSON e **antes** do diário — artefacto partido sem registo. Essa corrida ficou versionada como `…-INTERROMPIDA-a_fonte_pegada_padrao_aponta_para_a_variante_11d_superada.json`. Acrescentei aborta antecipada que nomeia a variante; falsificada a apontar para a `11d`: `exit=1`, zero ficheiros escritos |
| `p.replace(DIR + '/')` sem segundo argumento | linhas 26–27 | Node substitui a ocorrência pela string literal `undefined`, logo os 5 caminhos de `fontes` do artefacto começavam por `undefinedevidence/…` e nenhuma referência resolvia | `grep -c undefined` = 0 no re-emitido; a contaminação não saiu daqui: `bu5-unidades-do-roadmap-20-11.json` tem 0 ocorrências e nenhum doc cita `undefinedevidence` |
| default para a matriz `bu2c` apontava para um ficheiro que não existe | `scripts/bu2d-politicas-sem-mecanismo-20-11.mjs:13` e `scripts/bu3-pegada-de-modulos-20-11.mjs:14` | as duas linhas nomeavam `bu2c-caminhos-de-autorizacao-20-11.json`; o canónico em disco é `…-20-11c.json`. Diferente do caso do BU-4: aqui a falta **aborta com nome** (`falta o artefacto bu2c` / `falta a matriz de autorização`), donc nenhum artefacto saiu errado | repontado para a `11c` e `node --check` nos dois; os artefactos já emitidos não foram tocados, por isso nada re-corre |

Também abri um buraco de instrumento meu: `bu5-unidades-do-roadmap-20-11.mjs` **não** tinha a guarda de sobrescrita que o `bu4` tem, e passei-lhe `BU5_SUF` quando a variável se chama `BU5U_SUF` — a corrida re-escreveu o artefacto canónico do BU-5, que ainda não estava versionado e portanto não é recuperável byte a byte. O que se perdeu é mensurável: o diário re-emitido é **igual** ao capturado antes dessa corrida, linha a linha, fora a linha de carimbo (`em=2026-11-20T10:14:21.213Z` → `11:35:47.183Z`) e uma linha em branco; as 19 linhas de tabela batem todas e o veredicto é o mesmo `BU5U_VERDE 25/0`. Metri a guarda; o artefacto canónico versionado passa a ser o desta corrida.

### 7.2 Cinco, encontrados a fechar o BU-1 (`09-mapa-estrutural-componentes-e-regras.md`)

| defeito | onde | o que estava errado | prova do alcance |
|---|---|---|---|
| segmentação de corpos por ponteiro, sem faixa consumida | `scripts/bu1-mapa-estrutural-componentes-e-regras-20-11.mjs`, função `segmenta()` | a varredura contava **101** corpos e **203 212 092** caracteres, porque emparelhava cada fecho com a abertura seguinte sem excluir o intervalo já consumido: um fecho já emparelhado voltava a servir de fronteira | o fixture sintético (2 corpos + 1 textual + 1 externo) só passou depois do `consumidoAte`; em byte real caiu exactamente nos números do produtor — 99 corpos + 5 externos = 104 aberturas honradas, 5 textuais, 0 sem fecho |
| duas relações de soma auto-referentes | portões dos `ids` e das colisões de nome | eu comparava «número de nomes duplicados» com a diferença `ocorrencias − distintos`; a grandeza certa é `Σ(vezes − 1)`, porque um nome repetido 3 vezes acrescenta 2 e não 1 | `320 − 299 = 21 = Σ(vezes−1)` e `2 483 − 1 720 = 763 = Σ(declaracoes−1)`; a versão errada dava vermelho com a resposta certa |
| fixture que media outra coisa | portão das classes de CSS | o fixture contava **atributos** `class=` enquanto a varredura contava **tokens** de classe, por isso dava um verde que não descrevia a régua | passei a `tokensDeClasse()` partilhada pelo fixture e pela varredura; a relação impressa é `7 504 = 6 851 ocorrências + 653 descartadas` |
| «bytes» que eram caracteres | régua de bytes de corpo | comparei o meu UTF-8 (`3 066 790`) com o campo do produtor chamado `bytes_de_todo_script` (`3 049 476`), e os dois números não são a mesma grandeza | a identidade exacta: os meus `3 049 574` de join têm 98 newlines a mais, `3 049 574 − 98 = 3 049 476`; e `3 049 476 − 874 166 = 2 175 310` = `bytes_dos_corpos` do produtor. O portão passou a exigir as duas relações e o nome diz `chars_soma_dos_corpos` |
| unidade do cruzamento mesa-lado | campo `pares_mesa_lado_no_banco` | somar `leitura_larga_n + escrita_larga_n` conta a mesa duas vezes quando o papel a lê **e** escreve; eu ia publicá-la como «mesas» | acrescentei `mesas_distintas_no_banco` (a união) e o portão obriga a `distintas ≤ pares ≤ catálogo`: developer tem 309 pares e 166 mesas, `pending` 2 pares e 1 mesa |

As quatro corridas vermelhas que estes cinco defeitos produziram estão versionadas com bytes e md5 na tabela do cabeçalho de `09`, e o verificador do documento — `scripts/confere-bu1-doc-20-11.mjs`, 9 verificações — teve duas corridas vermelhas próprias antes do verde. A primeira, `CONF_BU1_VERMELHO 8/1` em `evidence/confere-bu1-doc-20-11-VERMELHO-D-grelha.txt`, era do documento: a régua de grelha contou 8 colunas na linha das políticas `sem_porta_de_papel`, porque as triplas de mesa, política e comando levavam o separador de coluna sem escape. A segunda, `CONF_BU1_VERMELHO 8/1` em `evidence/confere-bu1-doc-20-11-VERMELHO-F-caminho_com_acento_partido_pelo_regex.txt`, era da sonda: o regex que recorta os caminhos citados não aceitava letras acentuadas, por isso lia `…-20-11-AP` como caminho e queixava-se de um ficheiro inexistente — o vermelho era do instrumento, e corrigi a régua em vez de amaciar o documento. A captura verde final (`CONF_BU1_VERDE 9/0`) ficou **fora** do repositório, porque stageá-la faria o portão do índice varrer-se a si mesmo.

Há um sexto defeito, e é do portão de segurança: `scripts/seg-precommit-gate.mjs` pedia os nomes staged a `git diff --cached --name-only` sem `core.quotePath=false`, por isso os dois artefactos com `Ó` chegavam-lhe como `…-AP\303\223S-…`, eram contados como **INEXISTENTE** e o portão chumbava com **19/21** ficheiros lidos. Falhou seguro — recusou dar OK sobre o que não leu, que é o propósito da camada — mas o sinal é indistinguível de um ficheiro realmente em falta, e um portão que não lê um nome não o pode limpar. Passei `-c core.quotePath=false`; a corrida seguinte lê **22/22** e dá `PORTAO PRE-COMMIT OK — zero credenciais nas camadas A, B, C e D`, com a vermelha versionada em `evidence/seg-precommit-20-11-VERMELHO-nomes_com_acento_lidos_como_INEXISTENTE.txt` (3 804 B). A mesma família de defeito esteve no verificador (`F`) e na varredura de caminhos: uma classe de caracteres escrita contra um alfabeto lembrado, nunca contra os nomes que a casa usa.

## 8. Os doze portões

1. `o_registro_lido_do_disco_e_o_mesmo_do_indice_e_toda_fase_lida_tem_oito_celulas_ou_e_nomeada`
2. `a_classificacao_de_status_e_por_marca_lida_e_nao_engole_linha_ambigua`
3. `o_grafico_de_dependencias_e_um_grafico_sem_ciclo_e_sem_aresta_para_fase_inexistente`
4. `a_ordem_emitida_e_funcao_dos_campos_e_satisfaz_as_dependencias_abertas`
5. `todo_rebaixamento_de_prioridade_causado_por_dependencia_e_enumerado_por_escrita_independente`
6. `a_ligacao_pen_para_fase_referencial: cada_codigo_citado_resolve_ou_e_quebrado_e_nomeado`
7. `o_ledger_e_contado_pela_regua_do_produtor_e_o_numero_bate_com_o_leitor_versionado`
8. `a_classificacao_de_OK_e_rastrearvel_na_palavra_da_propria_linha_nada_e_inventado`
9. `toda_a_evidencia_de_bu8_e_bu9_chega_a_um_grupo_do_plano_ou_e_impessa_com_a_fonte`
10. `nenhuma_celula_de_estado_de_produto_se_torna_item_de_trabalho`
11. `nenhuma_fase_e_excluida_do_plano_sem_prova_positiva_de_fechamento_no_status_lido`
12. `nenhuma_linha_de_tabela_emitida_fica_fora_da_grelha_do_seu_cabecalho`

O portão 10 merece nota: as 5 células `pending@largura` e as 8 `papel@largura` de `barra_defeito` são **estado de produto**, medido por BU-8. Nenhuma delas pode virar item de trabalho por igualdade de texto; o fixture prova que a detecção dispara quando uma célula é usada como tarefa.

## 9. Como ler, e o que este plano não é

- Não é uma alteração ao projecto. Nada foi editado no `index.html`, no worker, no banco, nas policies ou nas permissões (briefing §6).
- Não é uma promessa de prazos: a coluna `P` é a prioridade **declarada no §13**, lida; a ordem é consequência dela mais as dependências.
- Não prova nada sozinho: cada linha aponta para o artefacto que a origina, e as 12 saídas / 20 ausências / 7 divergências que BU-8 e BU-9 mediram continuam válidas como estavam.
- É a base para a pergunta seguinte, que continua a ser sua: atacar as 30 linhas sem OK, ou nomear as 5 que precisam de OK seu (4 publicações, 1 DDL) — e nenhuma das cinco foi executada por mim.

## 10. Em uma frase

Das 45 fases do §13, 35 têm trabalho em aberto (10 têm prova positiva de fecho), a ordem é função de prioridade lida + dependências reais de um grafo sem ciclos, 5 linhas precisam de OK literal seu e 30 não precisam de autorização nenhuma — e 26 de 35 fases não conseguem ligar-se nominalmente às unidades medidas, o que é uma falha de vocabulário entre o registro e a medição, não uma conclusão sobre o produto.

## 11. Adenda 20/11 — o pacote municipal está pronto a aplicar, e nada nele foi aplicado

A pergunta da sessão foi «a aba da secretaria de educação municipal está pronta?». A resposta medida foi não: a
porta existe e abre, o escopo não. O que este plano acrescenta desde então é o fecho dessa diferença **em peças**,
não em execuções. O roteiro com as ordens, os comandos e o OK literal de cada passo está em
`docs/bu-20-11/10-runbook-municipal.md`; aqui fica o que mudou no inventário de trabalho.

Peças novas, todas certificadas por corrida própria em 20/11:

| Peça | Que faz | Estado medido |
|---|---|---|
| `scripts/p73-pen41-preflight.mjs` | mede as quatro policies de `students`/`classes` que hoje decidem só pelo cargo, e o delta exacto da candidata | `P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0` |
| `scripts/p73-municipal-aplica-ddl.mjs` | o único caminho de aplicação **e de reversão** das três peças (PEN-38/39/41): `--ok "APLICAR …"` escreve a candidata, `--reverter --ok "REVERTER …"` escreve a reversão; frase literal por peça **e por modo**, preflight fresco antes de tocar no banco e conferência de saída depois | `P73_MUNICIPAL_APLICA_SELFTESTE_OK 13/0` (`evidence/p73-municipal-stdout-selfteste-aplicador-com-reversao-20-11.txt`); recusas gravadas nas duas famílias, stdout `evidence/p73-municipal-reversao-stdout-recusas-20-11.txt`; o caso forte é `evidence/p73-municipal-reversao-recusa-precondicao-peca-nao-aplicada.json` — frase certa, pré-condição vermelha, `escrito_no_banco: false` |
| `scripts/p73-municipal-etiqueta.mjs` | a porta de etiquetagem escola↔município e a folha de decisão, por RPC autenticado | `P73_MUNICIPAL_ETIQUETA_SELFTESTE_OK 6/0`; `…_LISTA 6 escolas, 0 etiquetadas, 1 municipios, 1 avisos de fixture`; três recusas em `evidence/p73-municipal-etiqueta-stdout-recusas-20-11.txt` |
| `scripts/pacote-municipal-confere-pecas.mjs` | lê **este documento e o runbook**, mede cada caminho que a prosa cita, confere no catálogo que nada foi aplicado e exige que cada caminho citado esteja **no índice** e não apenas nesta máquina | `PACOTE_MUNICIPAL_OK 17/0` (`evidence/pacote-municipal-pecas-20-11-pos-pacote-completo-no-indice.json`); dentes provados por cinco falsificações na tabela de §2.0 do runbook, cada uma a nomear o portão que disparou, mais o vermelho honesto de §2.0.1 (seis peças da PEN-41 citadas e fora do git) |

O que o portão do pacote devolveu do banco, à hora do fecho, e é o estado de partida de qualquer OK futuro:
`funcoes_das_candidatas=0`, `escolas_com_municipio=0`, `policies_alvo=4` das quais `0` com escopo,
`municipios=1`, `concessoes_ativas=4`, e `publicado=false` na v137.

Três linhas deste plano mudam de natureza por causa disto:

- **PEN-38, PEN-39, PEN-41** deixam de ser «falta candidata» e passam a ser «falta decisão + falta OK». O que
  falta nelas não é código: é a escolha do §1 do runbook (que município governa cada uma das 6 escolas, com a
  única linha de município existente declarada fixture) e a frase literal de cada aplicação.
- **A etiquetagem** entra como item novo e distinto: é escrita de dados pela porta nomeada do PEN-38 bloco C,
  exige sessão autenticada de admin de plataforma (`auth.uid()`), e hoje não há sessão neste posto de trabalho —
  `ah2-sessions.json` ausente, `c2-sessions.json` com 3 bytes. O ciclo de mint é OK próprio.
- **FALTA-1 fechou ao nível da candidata em 20/11**: a peça de conferência pós-deploy da v137 é
  `scripts/v137-pos-deploy.mjs`, modelo `scripts/v136-pos-deploy.mjs` com a cláusula da shell invertida — a v137
  só muda o módulo, por isso a shell servida tem de continuar byte-a-byte a da v136. O `--selfteste` offline dá
  `V137_POS_DEPLOY_SELFTESTE_OK 9/0` (`evidence/v137-pos-deploy-stdout-selfteste-20-11.txt`) e a corrida sem flag
  recusa com exit 2
  enquanto as três saídas do passo de publicação não existirem (`evidence/v137-pos-deploy-stdout-recusa-20-11.txt`).
  Fica aberta no único sítio onde pode estar: conferir o ar real exige a publicação, e a publicação pede OK literal
  próprio que ainda não foi dado. **FALTA-2 fechou em 20/11**: o aplicador passou a ter modo de reversão (`--reverter`), com frase
  própria por peça e por modo e a pré-condição no preflight em modo reversão. O que isto não cobre é o ciclo
  completo aplicar → reverter conferido numa corrida: nenhuma peça foi aplicada, portanto a reversão está provada
  como caminho que recusa quando não deve correr, não como caminho que já desfez alguma coisa.

Réguas acrescentadas a este plano, na mesma família das dez de §8: uma frase literal por passo e a frase de um
passo não autoriza o passo seguinte — e desde o modo de reversão, uma frase por **modo**: o OK que autoriza
escrever a candidata não autoriza desfazê-la, nem ao contrário, porque são duas escritas com consequências
opostas; o verde de um preflight vale no instante em que é tirado, por isso o
aplicador re-corre o preflight antes de escrever e compara o md5 do SQL com o que esse preflight certificou;
uma classe com conjunto vazio imprime-se com o zero (`secretary` sem vínculo: 848/27 → 0/0, não omitido); e um
portão que cita o censo do seu próprio corpus envelhece no dia em que a prosa acrescenta um caminho — por isso
o §11 não pinha o número de peças medidas.
