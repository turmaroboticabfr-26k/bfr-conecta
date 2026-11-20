# BU-7 (a) — Inventário MOBILE: 15 papéis × 6 larguras, medidos no byte servido

Data: 2026-11-20. Estágio 1 do PROMPT BU. **Nada neste documento alterou o projeto**: nenhuma DDL, nenhuma escrita no banco, nenhum mint, nenhuma publicação, nenhum `git push`. O instrumento é só-leitura.

Este documento trata **só do mobile**. A análise web está separada em `05-inventario-web.md` e as duas grelhas **não se somam**: as larguras são universos disjuntos (portão `mobile_e_web_nao_partilham_uma_só_largura`) e as classes de célula têm prédicas diferentes. Não existe «total de células do aplicativo».

| Item | Valor | Fonte |
|---|---|---|
| Instrumento | `scripts/bu7-inventarios-20-11.mjs` (ler e re-contar; não lança browser) | corrida `em=2026-11-20T10:32:52.915Z` |
| Artefacto | `evidence/bu7-inventarios-20-11.json` / `.txt` | ídem |
| Veredicto | `BU7_VERDE 12/0` | linha final do `.txt` |
| Captura fora do repo | `C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296/bu7-run4.txt`, com `node_exit=0` escrito **dentro** do ficheiro | ídem |
| Vermelho intermédio versionado | `evidence/bu7-inventarios-20-11-VERMELHO-censo_de_portas_com_lacuna_de_papel.txt` (md5 `12e2b137b76cd3d2a578d186faa06804`, igual ao da captura `bu7-run2.txt` de onde foi copiado) | `md5sum` dos dois caminhos |
| Byte sobre o qual as sessões correm | `index.html` 3 547 458 B, md5 `9e236a23eed978cf7c2a2743d449b307` = o byte servido | `evidence/bu7-inventarios-20-11.json -> ar` |

Os artefactos lidos por este instrumento, cada um com a sua corrida: `evidence/p73-cobertura-m5-por-ar-20-11.json` (`em=2026-11-20T00:28:58.471Z`, programa `scripts/p73-cobertura-v136.mjs`), `evidence/bu5-portas-do-ar-20-11.json` (`em=2026-11-20T09:29:08.023Z`, `BU5_PORTAS_VERDE 9/0`) e `evidence/sm25-cobertura-desktop-20-11.json` (`em=2026-11-20T04:28:33.086Z`, usado só na parte web).

## 1. A grelha e a sua unidade

- Grelha declarada pelo produtor, lida do campo `grelha`: **`15 papeis × 6 larguras = 90 celulas`**. O portão `a_grelha_mobile_confere_com_a_string_declarada_pelo_p73` confronta a string com a contagem real e com o vetor de larguras, e está VERDE com `papeis=15 larguras=6 celulas=90 lacunas=0`. **Unidade: célula = papel × largura**, não «ecrã» nem «teste».
- Larguras: 320, 360, 375, 390, 414, 430 — as seis da banda mobile do briefing.
- A grelha povoa-se **só com sessões do byte actual**: `scripts/p73-cobertura-v136.mjs:72` tem `if (q !== AR_MD5) continue;` antes do laço que preenche `grelha`, pelo que nenhuma célula OK aqui vem de um byte antigo. O mesmo ficheiro, na mesma linha de comentário (p73:63), declara que a contagem de coerência é feita para **todos** os bytes (o vermelho anterior era contar coerência *depois* do `continue`, o que dava um 0 estrutural).
- Uma célula é «a melhor tentativa ganha»: `scripts/p73-cobertura-v136.mjs:82` — se um processo de repetição montou o que o condutor não montou, a célula conta OK. Há **18** ficheiros `evidence/ah2-mobile2-m5-*rep*.json` no disco (contagem por `ls`, 20/11).

## 2. O que «OK» quer dizer (a prédica é do produtor, não minha)

Lida de `p73.ler_do_condutor.predicado_do_condutor`, linha 112 de `scripts/ah2-m5-driver.mjs`:

```js
const coerente = !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
```

Ou seja, uma célula OK exige **três** coisas: a barra existir, pelo menos uma entrada de barra com geometria positiva (`w>0 && h>0`), e **pelo menos um painel realmente aberto** (`abertas > 0`). É por isto que o inventário mobile pode afirmar navegação usada, e é também o que separa o mobile do web (ver `05-inventario-web.md`, FALTA-W1: no desktop `abertas` é 0 em todas as 45 células).

Estados medidos (portão `os_motivos_do_p73_sao_os_tres_declarados_e_a_contagem_nao_e_vacua`, VERDE com fixture que rejeita um rótulo inventado):

| Motivo | Células |
|---|---|
| `coerente` (OK) | 70 |
| `travada_com_causa` (TRAVADA) | 13 |
| `por_medir` | 7 |
| soma | **90 de 90** |

## 3. Mobile por papel

Do artefacto `bu7-inventarios-20-11.txt` (`### TABELA MOBILE POR PAPEL`). `Portas no ar` são **rótulos contados** no censo de portas (a coluna seguinte diz em quantas das 6 larguras esse papel tem contagem):

| Papel | Portas no ar | Larguras com contagem | OK | TRAVADA | por medir | de |
|---|---|---|---|---|---|---|
| pending | 0 | 0/6 | 0 | 5 | 1 | 6 |
| parent | 16 | 6/6 | 6 | 0 | 0 | 6 |
| student | 19 | 6/6 | 6 | 0 | 0 | 6 |
| pedagogical | 17 | 6/6 | 6 | 0 | 0 | 6 |
| developer | 28 | 6/6 | 6 | 0 | 0 | 6 |
| monitor | 8 | 2/6 | 0 | 6 | 0 | 6 |
| gatekeeper | 8 | 6/6 | 6 | 0 | 0 | 6 |
| coordinator | 18 | 6/6 | 6 | 0 | 0 | 6 |
| secretary | 12 | 6/6 | 3 | 2 | 1 | 6 |
| aee | 11 | 6/6 | 6 | 0 | 0 | 6 |
| director | 19 | 6/6 | 6 | 0 | 0 | 6 |
| psychology | 7 | 6/6 | 6 | 0 | 0 | 6 |
| social_work | 6 | 6/6 | 6 | 0 | 0 | 6 |
| sports_operator | 5 | 6/6 | 3 | 0 | 3 | 6 |
| education_supervisor | 9 | 6/6 | 4 | 0 | 2 | 6 |

Soma da coluna «Portas no ar» = **183**, e os destinos **distintos** = **54** (portão `as_portas_por_papel_sao_re_contadas_sem_confundir_rotulo_com_destino`, VERDE com `destinos_distintos=54 rotulos_somados=183 portas_por_papel=183 indice_invertido_n=183 chaves_do_indice=54`, e a cláusula não-vazia `54 < 183`). Os dois números não são o mesmo e é preciso não os trocar: um rótulo repetido em cinco papéis conta cinco vezes na primeira coluna e uma vez na segunda.

Lectura por papel, só com o que está medido:

- **Onze papéis limpos nas 6 larguras**: parent, student, pedagogical, developer, gatekeeper, coordinator, aee, director, psychology, social_work (10 com 6 OK) — e nenhum deles perde células por largura.
- **secretary**: 3 OK, 2 TRAVADA (360 e 375), 1 por medir (430).
- **sports_operator**: 3 OK, 3 por medir (390, 414, 430) — é o papel com mais banda mobile sem medida.
- **education_supervisor**: 4 OK, 2 por medir (414, 430).
- **monitor**: **0 OK nas 6 larguras**, todas TRAVADA com causa.
- **pending**: **0 OK**, 5 TRAVADA + 1 por medir, e **0 portas** — é o único papel sem porta do censo (`os_papeis_sem_porta_sao_so_o_pending`, VERDE com `sem_porta=["pending"]`).

## 4. Mobile por largura

| Largura | OK | TRAVADA | por medir | de |
|---|---|---|---|---|
| 320 | 13 | 2 | 0 | 15 |
| 360 | 12 | 3 | 0 | 15 |
| 375 | 12 | 3 | 0 | 15 |
| 390 | 12 | 2 | 1 | 15 |
| 414 | 11 | 2 | 2 | 15 |
| 430 | 10 | 1 | 4 | 15 |

O gradiente está medido e é monotónico na pendência: OK cai 13 → 10 e `por medir` sobe 0 → 4 à medida que a largura cresce. Não há leitura de estouro horizontal nesta grelha — as 90 células não dizem nada sobre overflow; a régua de estouro é outra (ver §6).

## 5. As 13 travadas têm todas causa, e são duas causas

Portão `cada_causa_de_trava_aponta_para_uma_celula_TRAVADA_e_cada_TRAVADA_tem_causa`, VERDE com `causas=13 travadas=13 sem_causa=nenhuma causa_sem_celula=nenhuma`.

| Causa (texto do artefacto) | Células |
|---|---|
| `shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra` | monitor@320/360/375/390/414/430, secretary@360, secretary@375 (8) |
| `conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)` | pending@320/360/375/390/414 (5) |

A primeira é um defeito de interface (o módulo de apresentação não monta a barra), a segunda **não é defeito**: é o estado do produto para uma conta em análise. Somá-las na mesma métrica de «travadas» seria dizer que 13 células falham pelo mesmo motivo; não falham.

## 6. Lacunas de contagem: onde o censo de portas não tem o que contar

10 das 90 células não entram no censo de portas por papel. O portão `os_lugares_sem_contagem_de_portas_sao_so_celulas_que_nao_chegaram_a_shell` (VERDE, `sem_contagem=10 de 90 estados=TRAVADA,por_medir ok_sem_porta=nenhum`) exige que **toda** lacuna seja uma célula que nunca chegou a shell montado, e imprime a lista em vez de a suprimir:

| Célula sem contagem | Estado medido |
|---|---|
| pending@320/360/375/390/414 | TRAVADA |
| pending@430 | por medir |
| monitor@320/375/390/414 | TRAVADA |

`monitor@360` e `monitor@430` **têm** contagem (8 portas) e mesmo assim são TRAVADA: o censo conta os nós do DOM (`bandas`), não a barra visível. Esta é a razão do vermelho intermédio que originou esta secção: a régua antiga exigia «todo o papel com largura no censo», o que é falso para pending (0 portas por construção) e escondia o paradoxo do monitor. O portão foi separado em dois — um para a banda (`o_censo_de_portas_por_papel_usa_so_larguras_da_banda_mobile_do_briefing`, VERDE com `larguras_vistas=[320,360,375,390,414,430] fora_da_banda=nenhuma`), outro para a lacuna — e o vermelho anterior ficou versionado (cabeçalho deste documento).

Outra lacuna do mesmo censo, medida e não resolvida: **50** entradas `papel@largura:ficheiro` em que a sessão declara uma largura no campo `larguras` que não está no seu objecto `bandas` (campo `declaradas_sem_banda` do artefacto de portas; papéis afectados: coordinator, developer, monitor, pending, secretary). O censo chaveia a cobertura por `Object.keys(bandas)`, pelo que essas larguras declaradas não contam. Não foi medido por que caminho a sessão as declarou sem as correr — **NÃO FOI POSSÍVEL VERIFICAR**.

## 7. Quantas sessões sustentam a grelha, e em que byte

- Censo de portas (09:29): **109** ficheiros m5 no disco = **60** no byte servido + **49** num byte anterior (`as_sessoes_m5_do_censo_de_portas_declarao_a_divisao_por_byte`, VERDE).
- Leitura do p73 (00:28, ~9 h antes): **84** ficheiros = **35** no byte servido + **49** no byte anterior (`ficheiros_m5_na_disco`, `por_ar`). A parte dos 49 confere em ambas as leituras; a dos 60 − 35 = **25** ficheiros actuais entraram no disco entre as duas corridas.
- Hoje (`ls evidence`, 20/11): **134** ficheiros `ah2-mobile2-m5-*.json`. As três leituras não se contradizem — são instantâneos de momentos diferentes — mas nenhuma delas é «o nº de lançamentos da grelha»: a grelha tem 90 células e um ficheiro pode conter várias larguras.
- O conjunto dos 49 de byte antigo é o mesmo nas duas leituras **por contagem**, não por lista: nenhum artefacto desta etapa guarda a relação dos nomes. **NÃO FOI POSSÍVEL VERIFICAR** a identidade dos conjuntos.

## 8. O que este inventário mobile não prova

- **Não prova conteúdo correcto por módulo.** A prédica de coerência exige `abertas > 0`, ou seja, que algum painel abriu; não exige que o painel trouxera dados certos. O que cada módulo faz com dados verdadeiros está no checklist (`02-checklist-dos-modulos.md`), onde **12 de 15** unidades de conteúdo não têm prova de conteúdo no byte servido.
- **Não prova estouro de largura.** As 90 células são de navegação; a régua de estouro (`scripts/ah2-mobile2.mjs:195`, `document.body.scrollWidth > document.documentElement.clientWidth + 1`) é aplicada nas células web.
- **Não mede 430 com a totalidade dos papéis**: quatro células estão `por medir` a 430 (pending, secretary, sports_operator, education_supervisor) e mais três em 390/414 — são as 7 do histograma.
- O `pending@430` é simultaneamente «por medir» no mobile e «BLOQUEADA com causa» no web: são leituras de instrumentos diferentes (p73 vs sm25) sobre a mesma barreira de produto; não são duas verdades que precisem de ser reconciliadas à força.

## 9. Passagem às próximas peças

- Para BU-8 (listas): monitor entra como **defeito com causa** (0 OK em 6 larguras), secretary como **defeito parcial**, sports_operator/education_supervisor/pending@430 como **pendência de medida**, pending como **estado de produto** (não é defeito).
- Para BU-9/BU-10: fechar as 7 `por medir` e as 8 travadas de barra exige **lançar browser** (nada disto se fecha por releitura de artefacto); as 50 `declaradas_sem_banda` exigem ler o condutor que as escreve.
