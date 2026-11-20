# BU-7 (b) — Inventário WEB (desktop): 15 papéis × 3 larguras, e o que essa medida realmente cobre

Data: 2026-11-20. Estágio 1 do PROMPT BU, **só-leitura**. Este documento é a análise **web**, separada da mobile (`04-inventario-mobile.md`). As grelhas não se somam: as larguras são conjuntos disjuntos e as classes de célula têm prédicas diferentes — o portão `mobile_e_web_nao_partilham_uma_só_largura` está VERDE com `mobile=[320,360,375,390,414,430] web=[1280,1440,1920] interseccao=vazia`, e tem fixture que falha se alguém acrescentar 1280 ao universo mobile.

| Item | Valor | Fonte |
|---|---|---|
| Instrumento | `scripts/bu7-inventarios-20-11.mjs` | corrida `em=2026-11-20T10:32:52.915Z`, `BU7_VERDE 12/0` |
| Artefacto | `evidence/bu7-inventarios-20-11.json -> web` / `.txt` | ídem |
| Produto das células | `evidence/sm25-cobertura-desktop-20-11.json` (`em=2026-11-20T04:28:33.086Z`, veredicto próprio `SM25_COBERTURA_DESKTOP_OK 5/0`) | campos `total`, `porLargura`, `celulas` |
| Pendência que originou a corrida | texto do campo `pen`: «PEN-35 — cobertura das bandas desktop 1280/1440/1920 × 15 papéis com a régua de estouro corrigida» | ídem |
| Byte | as 45 sessões citam `md5_shell = 9e236a23eed978cf7c2a2743d449b307` = o byte servido | portão `a_sessao_web_de_cada_celula_cita_o_byte_servido`, VERDE com `celulas=45 md5_shell_diferente_do_ar=nenhuma artefactos_em_falta=nenhum` |

## 1. A grelha e a sua régua

- **45 células** = 15 papéis × 3 larguras. O total tem três representações independentes que batem (portão `o_total_web_tem_tres_representacoes_independentes_que_batem`, VERDE com `total.celulas=45 soma_por_largura=45 comprimento_celulas=45 papeis_por_largura=1280:15,1440:15,1920:15`).
- Régua de estouro do produtor, lida do campo `regua_do_produtor`: **`document.body.scrollWidth > documentElement.clientWidth + 1 (ah2-mobile2.mjs:195)`** — é `clientWidth` do `documentElement`, não `innerWidth`; esta distinção é o que fecha a PEN-35 (com `innerWidth` o predicado nunca dava positivo quando o conteúdo transbordava).
- Classes de célula medida: `MEDIDA_WEB` (shell pronto, apresentação web, estouro sob a régua acima) e `BLOQUEADA` (com causa). Não há classe «painel aberto»: **nenhuma célula web abriu painel** (§4).

## 2. Web por largura

| Largura | células | MEDIDA_WEB | BLOQUEADA | estouro vermelho | shell diverge |
|---|---|---|---|---|---|
| 1280 | 15 | 11 | 4 | 0 | 0 |
| 1440 | 15 | 14 | 1 | 0 | 0 |
| 1920 | 15 | 13 | 2 | 0 | 0 |
| soma | **45** | **38** | **7** | **0** | **0** |

`estouro_vermelho=0` nas três bandas **é uma medida**, não uma ausência: `total.estouro_vermelho=0` e `total.shell_diverge=0` vêm do artefacto do leitor. O que **não** está medido aqui é qualquer outra coisa sobre o layout: as 0 células com estouro convivem com 142 de 142 alvos de secção impossíveis de tocar (§4).

## 3. Web por papel

| Papel | 1280 | 1440 | 1920 |
|---|---|---|---|
| pending | BLOQUEADA | BLOQUEADA | BLOQUEADA |
| parent | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| student | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| pedagogical | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| developer | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| monitor | BLOQUEADA | MEDIDA_WEB | BLOQUEADA |
| gatekeeper | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| coordinator | BLOQUEADA | MEDIDA_WEB | MEDIDA_WEB |
| secretary | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| aee | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| director | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| psychology | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| social_work | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| sports_operator | MEDIDA_WEB | MEDIDA_WEB | MEDIDA_WEB |
| education_supervisor | BLOQUEADA | MEDIDA_WEB | MEDIDA_WEB |

As 7 bloqueadas, com a causa declarada pelo leitor (portão `toda_celula_bloqueada_web_tem_causa_declarada`, VERDE com `bloqueadas=7 de 45 sem_causa=nenhuma`):

| Célula | Causa |
|---|---|
| pending@1280 / pending@1440 / pending@1920 | `conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)` |
| monitor@1280, monitor@1920, coordinator@1280, education_supervisor@1280 | `shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra` |

Distribuição da segunda causa: **4 de 7** bloqueios não-pendência estão em 1280 — a banda mais estreita do desktop é a que mais reproduz o defeito de barra; 1440 tem 1 e 1920 tem 2. Isto é a mesma causa das 8 travadas mobile de monitor/secretary, contada no universo web.

## 4. O achado: a evidência web é estrutural, não de uso

Medido sobre os 45 artefactos de célula (e reconfirmado sobre os 46 ficheiros `ah2-mobile2-sm25-*.json` do disco):

| Grandeza | Valor web | Valor mobile para comparação |
|---|---|---|
| Soma de painéis abertos (`bandas[].abertas`) | **0** em 45 células | a prédica de OK mobile exige `abertas > 0` |
| Rótulos de barra com geometria positiva | **0** de 177 rótulos | `w>0 && h>0` é condição de coerência |
| Entradas de secção | **142**, todas `nao_tocavel: invisivel` (uma única razão distinta no corpus) | — |
| Rotas de gaveta | **0** em todas as 45 | mobile tem gaveta contada |
| Apresentação declarada pela sessão | 38 `web`, 7 sem campo (as bloqueadas) | — |

As causas, também medidas: o instrumento de browser que corre estas células é o do mobile — o campo `markup` de cada sessão diz `toque em #bfrMobileBottomNav button[data-bfr-mobile-route] e #bfrMobileDrawer [data-bfr-drawer-route]` e acrescenta, no texto da própria sessão, que «a barra do desktop está display:none abaixo de 800px por decisão do app (bfr-responsive-presentation.js:233)». Os alvos que a sessão conhece são, portanto, os alvos mobile. O container de navegação do desktop que existe no bundle servido (`#bfr-single-home-navigation`, lido do bundle por `grep`) **não aparece em `scripts/ah2-mobile2.mjs`** (medição: `aparece_em_ah2-mobile2.mjs=false`) nem em nenhum dos 45 artefactos de célula (0 ficheiros contêm a string).

Consequência documental: nenhuma funcionalidade pode ser classificada «IMPLEMENTADO E TESTADO» **no web** com esta massa de provas. O que 38 `MEDIDA_WEB` autorizam afirmar é: o shell serve o byte certo, assenta sem erro de arranque, a apresentação escolhida é `web` e não há estouro horizontal sob a régua do produtor. O que **não** autorizam: que qualquer painel abriu, que qualquer rota de desktop foi clicada, ou que os dados de um painel desktop apareceram.

## 5. Faltas numeradas (falta de prova, não régua)

Emitidas em `evidence/bu7-inventarios-20-11.json -> faltas`, com o portão `as_faltas_do_web_sao_numeradas_e_tem_a_medida_que_las_origina` VERDE (`faltas=FALTA-W1,FALTA-W2,FALTA-W3 abertas_soma=0 barra_com_geometria=0 seletor_desktop_no_leitor=false`). Uma falta não se converte em verde: o verde só verifica que cada falta traz a medição que a nomeia.

| ID | O que falta | Medido que o nomeia | O que exige para fechar |
|---|---|---|---|
| FALTA-W1 | nenhum painel foi aberto em nenhuma célula web | `abertas_soma=0 em 45 celulas` | passada autenticada com clique no container de navegação real do desktop |
| FALTA-W2 | as entradas contadas na barra web não têm geometria | `entradas_com_geometria=nenhuma de 177 rotulos_lidos_das_45_celulas` | régua de hit-teste (`elementFromPoint`) sobre o alvo desktop, não sobre `#bfrMobileBottomNav` |
| FALTA-W3 | o instrumento de browser não conhece o container de navegação do desktop | `aparece_em_ah2-mobile2.mjs=false` (string presente no bundle servido) | novo selector **lido do bundle**, nunca dactilografado |

## 6. Rasto dos ficheiros, incluindo o que abortou

- 46 ficheiros `evidence/ah2-mobile2-sm25-*.json` para 45 células. A reconciliação por nome: **45 referenciados** pelas células, **0 referenciados em falta**, **1 não referenciado** — `ah2-mobile2-sm25-secretary-1920-INTERROMPIDA-inspected-target-navigated-20-11.json`. É o parcial de uma corrida abortada pela raça transitória do CDP (`Inspected target navigated or closed`), guardado com o nome limpo em vez de apagado; a célula `secretary@1920` foi re-corrida e está MEDIDA_WEB com o byte do ar.

## 7. Mobile × web, sem soma

| | Mobile | Web |
|---|---|---|
| Larguras | 320/360/375/390/414/430 | 1280/1440/1920 |
| Células | 90 | 45 |
| Prédica de «medido» | barra existe + geometria + `abertas > 0` | shell + apresentação + estouro sob `clientWidth` |
| Células com painel aberto comprovado | 70 (as OK) | **0** |
| Bloqueios com causa | 13 | 7 |
| Por medir | 7 | 0 (mas FALTA-W1..W3) |

A assimetria não é de cobertura: é de **instrumento**. Um dos dois lados tem uma régua que exige uso real; o outro não. Enquanto FALTA-W1 estiver aberta, a pergunta do briefing «disponível no web?» só pode ser respondida com `NÃO FOI POSSÍVEL VERIFICAR` para o conteúdo, e com «shell servido e sem estouro» para a estrutura.

## 8. Passagem às próximas peças

- BU-8: as 7 bloqueadas web entram como 3 estados de produto (pending) + 4 ocorrências do defeito de barra; as FALTA-W1..W3 entram na lista de **ausências de prova**, não na de erros de produto.
- BU-9/BU-10: fechar o lado web exige **lançar browser com instrumento novo** (selector do desktop lido do bundle + hit-teste). Nada disto se fecha por releitura de artefacto, e nada aqui pede publicação, DDL ou mint.
