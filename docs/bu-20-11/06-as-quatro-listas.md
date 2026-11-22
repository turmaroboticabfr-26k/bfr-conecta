# BU-8 — As quatro listas (a funcionar / com erros / incompletas / ausentes), como função do estado derivado

Data: 2026-11-20. Estágio 1 do PROMPT BU, **só-leitura**: nada foi publicado, nenhum dado escrito, nenhum código de produto alterado. Este documento não classifica nada à mão — as quatro listas são **re-derivadas** do `estado_derivado` que a BU-5 mediu, com um só rótulo por unidade e sem duplicados.

| Item | Valor | Fonte |
|---|---|---|
| Instrumento | `scripts/bu8-listas-20-11.mjs` | corrida `em=2026-11-20T10:43:23.883Z`, veredicto `BU8_VERDE 9/0` |
| Artefacto | `evidence/bu8-listas-20-11.json` (12 919 B) e `.txt` (11 216 B, md5 `f4493d393506abf27b0a65fc672b20a3`) | campos `regra_de_classificacao`, `listas`, `saidas`, `ausencias_de_prova`, `saidas_de_produto`, `defeitos_de_interface`, `distribuicao` |
| Captura da corrida | fora do repo: `C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296/bu8-run5.txt`, com `node_exit=0` escrito dentro do ficheiro | ídem |
| Origem das unidades | `evidence/bu5-unidades-do-roadmap-20-11.json` (17 unidades), `evidence/bu7-inventarios-20-11.json`, `evidence/p73-cobertura-m5-por-ar-20-11.json` | campo `origem` do artefacto |
| Byte | `index.html` 3 547 458 B, md5 `9e236a23eed978cf7c2a2743d449b307` | campo `ar` do artefacto |
| Distribuição | funcionando 3 · com_erros 9 · incompletas 4 · ausentes 1 = **17** | linha `distribuicao=...` do diário |

## 1. A regra de classificação (e por que é uma função, não uma opinião)

O briefing exige exactamente 7 estados. O mapa estado → lista, lido do campo `regra_de_classificacao`:

| Lista | Estados do briefing que a alimentam |
|---|---|
| a funcionar | `IMPLEMENTADO E TESTADO` |
| com erros | `IMPLEMENTADO COM ERROS` |
| incompletas | `PARCIALMENTE IMPLEMENTADO`, `IMPLEMENTADO, MAS NÃO TESTADO` |
| ausentes | `SOMENTE INTERFACE`, `NÃO IMPLEMENTADO`, `NÃO FOI POSSÍVEL VERIFICAR` |

Três portões garantem que a regra é aplicada e não contornada:

- **`as_quatro_listas_particionam_as_unidades_sem_duplicar_nem_esquecer`** — VERDE com `unidades=17 nas_listas=17 funcionando=3 com_erros=9 incompletas=4 ausentes=1 sem_lista=nenhuma duplicados=nenhum`. Tem fixture que dispara: `fixture_acrescentar_uma_copia_de_5.1=5.1` (uma segunda cópia da mesma unidade é detectada).
- **`a_lista_e_funcao_do_estado_derivado_e_recusa_estado_desconhecido`** — VERDE com `rotulos_no_mapa=7 rotulos_do_briefing=7 fora_dos_sete=nenhum repetidos_no_mapa=nenhum`. Um estado novo que a BU-5 nunca produziu **fica fora** (`fixture_estado_inedito_fica_fora=[ESTADO_QUE_A_BU5_NUNCA_PRODUZ]`) — a lista não tem «outras» nem balde de «vários».
- Consequência directa do briefing: «Não considere uma funcionalidade concluída somente porque aparece na interface» está implementada como regra estrutural — `SOMENTE INTERFACE` pertence à lista de **ausentes**, nunca à de funcionando. A única unidade nesse estado é o M2.

## 2. Lista 1 — A FUNCIONAR (3)

| Unidade | Rótulo | Régua de prova | Prova bateu | Saídas de defeito |
|---|---|---|---|---|
| 5.8 | Secretaria Escolar | conteudo | sim | 0 |
| 5.9 | Supervisão Educacional (Secretaria de Educação) | conteudo | sim | 0 |
| 5.16 | Segurança transversal | banco | sim | 0 |

«Prova bateu» não é sinónimo de «há qualquer registo». O portão **`toda_saida_de_funcionando_tem_prova_que_bateu_na_sua_propria_regua`** exige que a corrida apareça dentro do campo `corridas[u.regua_de_prova]` da própria unidade, com a prédica certa por classe:

- régua `conteudo` → exige `existe && classe === 'no_ar_servido'` (a prova tem de estar no byte servido, `9e236a23eed978cf7c2a2743d449b307`);
- régua `banco` → exige `existe` (a prova é uma contagem em banco, que não tem pegada de byte);
- qualquer outra régua → `false`.

Os quatro fixtures deste portão disparam todos na direcção certa: `fixture_conteudo_so_noutro_ar=false`, `fixture_banco_sem_pegada=true`, `fixture_banco_ficheiro_em_falta=false`, `fixture_regua_desconhecida=false`. Ou seja, a 5.16 entra com prova de banco; uma unidade de conteúdo medida **noutro byte** não entraria, e uma régua que a casa não conhece devolve `false` em vez de `true` por omissão.

Leitura honesta da lista: são 3 de 17. A 5.9 tem 2 corridas de conteúdo — uma `no_ar_servido` e uma `noutro_ar`; foi a primeira que a contou. A 5.16 e o M2 são as duas únicas unidades de régua `banco`.

## 3. Lista 2 — COM ERROS (9)

| Unidade | Rótulo | Saídas de defeito |
|---|---|---|
| 5.1 | Autenticação e sessão | 1 |
| 5.2 | Navegação e estrutura | 1 |
| 5.4 | Responsáveis | 0 |
| 5.5 | Professor | 1 |
| 5.6 | Coordenação | 1 |
| 5.10 | Monitor (transporte) | 1 |
| 5.11 | Porteiro | 1 |
| 5.13 | Jogos Escolares | 1 |
| 5.14 | Comunicação e plataforma | 1 |

Estas 9 unidades têm o código no ar e um comportamento que **falha contra a própria régua medida** — não é «está feio», é contradição provada. A coluna «Saídas de defeito» conta apenas `contradicoes[].tipo === 'defeito'`; 5.4 aparece aqui com 0 saídas desse tipo porque o seu estado vem de `IMPLEMENTADO COM ERROS` medido como **prova ausente** (P.01: 1 linha em `guardian_students`, passada com conta real não reproduzível no parque actual de contas), registada na tabela §5 como `prova_ausente`.

O portão **`uma_saida_de_funcionando_nao_pode_ao_mesmo_tempo_ter_saida_de_defeito`** — VERDE com `funcionando_com_defeito=nenhum` — é o que impede a casa de colocar uma unidade em «a funcionar» com um defeito aberto por baixo.

## 4. Lista 3 — INCOMPLETAS (4)

| Unidade | Rótulo | Estado derivado | O que «incompleta» quer dizer aqui |
|---|---|---|---|
| 5.3 | Área do aluno | PARCIALMENTE IMPLEMENTADO | falta funcionalidade |
| 5.7 | Direção | PARCIALMENTE IMPLEMENTADO | falta funcionalidade (prova de conteúdo bateu no byte servido) |
| 5.12 | AEE / Psicologia / Serviço Social | IMPLEMENTADO, MAS NÃO TESTADO | a funcionalidade existe, falta-lhe prova |
| 5.15 | Desenvolvedor / equipe técnica | IMPLEMENTADO, MAS NÃO TESTADO | idem |

Portão **`as_incompletas_dividem_se_entre_parciais_e_sem_teste`**, VERDE com a nota explícita: *«um PARCIAL e um MAS NAO TESTADO sao coisas diferentes: o primeiro tem funcionalidade que falta, o segundo tem funcionalidade sem prova»*. Agrupar as quatro num único «incompleto» seria exactamente o erro que o briefing manda não cometer.

## 5. Lista 4 — AUSENTES (1)

| Unidade | Rótulo | Estado derivado | Régua | Prova bateu |
|---|---|---|---|---|
| M2 | Secretaria Municipal (módulo 2) | SOMENTE INTERFACE | banco | sim |

O M2 tem a interface no ar e a prova de banco bate, mas nenhum dos seus estados de conteúdo foi medido no byte servido; por regra de casa, interface sem prova de operação pertence a **ausentes**. Nota de proveniência: este estado convive com a v137 candidata (remendo PEN-40), que **não foi publicada** — o byte avaliado aqui é a v136.

**Adendo 21/11, medido e não lembrado.** A última frase deste parágrafo envelheceu no dia em que a cadeia avançou até à v142, e por duas razões distintas que não se devem colar. (1) «O byte avaliado aqui é a v136» já não é verdade: o byte servido hoje é `3 556 664 B` com md5 `0e22e78fe1e0ce929ec4717f86365ad9`, igual ao `htmlMd5` do certificado da v142 (`worker-deploy-v142-painel-na-troca/esperado-v142.json`). (2) A v137 continua sem ter existido como versão publicada — é literalmente verdade — mas o **módulo** que ela produziu está no ar: `scripts/p118-modulo-no-ar-e-o-remendo-v137.mjs` (3 525 B, `0e6093e1beb80ba8bf47d74d8dd33037`) → `evidence/p118-modulo-no-ar-e-o-remendo-v137-21-11.json` (1 239 B, `0708a1c7e2ef109f3e58105869e3e3cd`) serve `/bfr-responsive-presentation.js?v=14` e confronta os bytes por três mãos — ar, `bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js` e o `moduleMd5` do certificado da v142 — todos `52 532 B` / `b83b4c2666fc909d50a358b86b99de05`, veredicto `P118_MODULO_NO_AR_E_O_REMENDO_V137_OK`. Acresce que os dois agregados municipais da PEN-39 **são invocados** nesse byte, por cadeia resolvida e não por agulha de literal: `scripts/p119-agregados-no-ar.mjs` → `evidence/p119-agregados-no-ar-21-11-B.json` (2 240 B, `f41e0ed895ef72f1f6e163a806595e3b`), `P119_AGREGADOS_PEN39_SAO_CHAMADOS_NO_AR 2/2`. Nada disto move o M2 para fora desta lista, e a razão é a que a própria linha dá: invocar um RPC no byte não é provar que o estado de conteúdo aparece num ecrã com sessão; essa passada não foi corrida na v142, e interface sem prova de operação pertence a **ausentes** por regra de casa.

## 6. As 12 saídas registadas, com causa textual e artefacto

Portão **`cada_saida_tem_causa_textual_e_o_artefacto_que_a_nomeia_existe_em_disco`**, VERDE com `contradicoes=12 defeito=8 prova_ausente=3 numero_desactualizado=1 sem_causa=nenhum artefactos_em_falta=nenhum`. Cada linha aponta para um ficheiro que foi verificado existir.

| Tipo | Unidade | Registro citado | Medido | Artefacto |
|---|---|---|---|---|
| defeito | 5.1 | A.06 IF | aprovação medida com clique real, mas o estado `pending` é inalcançável; o próprio veredicto reescreve o item como IMPLEMENTADO COM PROBLEMAS | `evidence/rm12-veredito.json` |
| defeito | 5.2 | N.02 ICP (abarca quem?) | a barra mobile não montou em 6 de 6 larguras do papel `monitor` e em 5 de 6 do `pending` | `evidence/p73-cobertura-m5-por-ar-20-11.json` |
| prova_ausente | 5.4 | P.01 IF vínculo com alunos | existe 1 linha em `guardian_students`: a passada com conta real não é reprodutível com o parque de contas | `evidence/bu2-censo-catalogo-20-11.json` |
| defeito | 5.5 | T.05 IF diário de aula | o papel `pedagogical` não tem caminho de leitura nem de escrita em `bfr_teacher_diary` | `evidence/bu2c-caminhos-de-autorizacao-20-11c.json` |
| defeito | 5.6 | C.01 a C.09 IF/PI | 4 regiões do papel estão desativadas no bundle vivo e 2 dos 3 RPCs que elas chamam não existem no catálogo | `evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json` |
| defeito | 5.10 | M.01 a M.04 IF | as 6 larguras do papel `monitor` estão TRAVADAS (barra mobile não montou), logo nenhuma porta do monitor foi medida no ar actual | `evidence/p73-cobertura-m5-por-ar-20-11.json` |
| defeito | 5.11 | G.01 IF leitor QR, evidência T79/v102-v103 | o destino servido chama `register_gate_checkin_v2`, que dá 0 em `pg_proc` e 404/PGRST202 pelo fio; calendário com `dia_letivo_confirmado:false` | `evidence/p73-rm52-estado-calendario-20-11.txt` |
| prova_ausente | 5.11 | T79 E2E (§CR/§CV) | nenhum artefacto com o identificador T79 existe em `evidence/` nem `scripts/`; a citação só vive na prosa do registro | `docs/roadmap-master.md` |
| prova_ausente | 5.12 | A2.03 IF realtime 4 canais, evidência V71C/V71D | nenhum artefacto com esse identificador em `evidence/`; as ocorrências são 2 documentos de prosa e 1 lista de defeitos | `docs/relatorio-final-auditoria.md` |
| defeito | 5.13 | SP.01 IF jogos escolares | `sports_operator` escreve 0 tabelas e lê 3; as 5 mesas de gestão dos jogos estão fora do papel | `evidence/bu2c-caminhos-de-autorizacao-20-11c.json` |
| defeito | 5.14 | CM.04 IF push/FCM/Edge | cadeia partida no recetor do service worker (`RM13_CADEIA_PARTIDA 8/14`), medida noutro ar | `evidence/rm13-rotas.json` |
| numero_desactualizado | 5.16 | SC.01 RLS em 176/176 · SC.02 475/475 policies | 183/183 com RLS activo, 177 com política, 6 sem política nenhuma e 495 políticas lidas | `evidence/bu4-digestao-para-documentacao-20-11.json` |

A última linha é o exemplo limpo da doutrina: o número do registro estava desactualizado, e corrigi-lo **baixa** a afirmação para a medição de hoje em vez de herdar o verde antigo.

## 7. A lacuna de prova: 12 de 17 — e o que essa concordância vale

O diário emite uma contagem de falta, não um portão:

```
LACUNA_DE_PROVA_POR_REGUA 12 de 17 :: 5.1:conteudo,5.2:conteudo,5.3:conteudo,5.4:conteudo,
5.5:conteudo,5.6:conteudo,5.10:conteudo,5.11:conteudo,5.12:conteudo,5.13:conteudo,
5.14:conteudo,5.15:conteudo | contagem da falta, nao um portao
```

Comparado programaticamente com o portão da BU-5 `nenhuma_unidade_de_regua_banco_fica_sem_prova`, cujo detalhe carrega `sem_prova_de_conteudo_no_ar=[5.1,5.2,5.3,5.4,5.5,5.6,5.10,5.11,5.12,5.13,5.14,5.15] de 15 unidades de conteudo` (medida: `olhar-bu8-conjuntos.mjs` → `bu5_n=12 bu8_n=12 conjuntos_iguais=true`).

**Dois avisos sobre o alcance dessa concordância**, ambos medidos:

1. Ela **não é uma segunda medição independente**. A cláusula extra da BU-8 (repercorrer `corridas[regua_de_prova]`) coincide com o campo `prova_bateu` da BU-5 em todas as 17 unidades: `DIVERGENCIA_PROVA_BATEU_VS_REGUA=nenhuma de 17` (`olhar-bu8-duas-clausulas.mjs`). A cláusula continua não degenerada — os fixtures mostram que ela **pode** divergir (conteúdo só em `noutro_ar` → `false`) — mas hoje não acrescenta informação, logo o que há é um teste de consistência entre dois leitores do mesmo artefacto.
2. As 12 faltas **não são todas o mesmo tipo de falta**. Lendo `corridas.conteudo` de cada unidade: **3** (5.1, 5.10, 5.11) têm 1 corrida de conteúdo cuja classe é `sem_pegada_de_ar` — ou seja, existe medida, mas não no byte servido (foram corridas noutro ar); **9** (5.2, 5.3, 5.4, 5.5, 5.6, 5.12, 5.13, 5.14, 5.15) têm `n=0` — nenhuma corrida de conteúdo registada. Fechar as primeiras exige re-corrida no ar actual; fechar as segundas exige primeiro **construir** a prova.

## 8. As 20 ausências de prova, numeradas

Portão **`as_ausencias_de_prova_sao_numeradas_e_cada_uma_tem_o_medido_que_a_nomeia`**, VERDE com `ausencias=20 web=3 mobile_por_medir=7 lacunas_de_censo=10 ids_duplicados=nenhum`. Falta de prova imprime-se como falta numerada; não se converte em verde nem desaparece.

| ID | Onde | O que falta | Medido que o nomeia | O que exige |
|---|---|---|---|---|
| FALTA-W1 | web | nenhum painel foi aberto em nenhuma célula web | `abertas_soma=0 em 45 celulas` | passada autenticada com clique no container de navegação real do desktop |
| FALTA-W2 | web | as entradas contadas na barra web não têm geometria | `entradas_com_geometria=nenhuma de 177 rotulos_lidos_das_45_celulas` | régua de hit-teste (`elementFromPoint`) sobre o alvo desktop, não sobre `#bfrMobileBottomNav` |
| FALTA-W3 | web | o instrumento de browser não conhece o container de navegação do desktop (`bfr-single-home-navigation` presente no bundle servido) | `aparece_em_ah2-mobile2.mjs=false` | novo selector lido do bundle, nunca dactilografado |
| MED-POR-pending@430 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-secretary@430 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-sports_operator@390 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-sports_operator@414 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-sports_operator@430 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-education_supervisor@414 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| MED-POR-education_supervisor@430 | mobile | célula sem medida | estado lido do p73: `por_medir` | lançar browser nessa célula |
| CENSO-pending@320 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | chegar a shell montado (mesmo defeito/estado já listado) |
| CENSO-pending@360 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-pending@375 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-pending@390 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-pending@414 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-pending@430 | mobile | censo de portas não tem o que contar | estado `por_medir` | idem |
| CENSO-monitor@320 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-monitor@375 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-monitor@390 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |
| CENSO-monitor@414 | mobile | censo de portas não tem o que contar | estado `TRAVADA` | idem |

As 10 linhas `CENSO-*` são as mesmas 10 lacunas da tabela «mobile sem contagem de portas» do documento BU-7 (`04-inventario-mobile.md`), re-emitidas aqui por ID para que a lista de ausências seja auditável sem reler o outro ficheiro. Nota de sobreposição, medida: `pending@430`, `pending@320`, `pending@360` etc. aparecem uma vez como `MED-POR-*` e outra como `CENSO-*` porque nomeiam faltas **diferentes** (a célula não foi medida / a célula medida não tem portas contadas); por isso `ids_duplicados=nenhum` é verde com 20 linhas.

## 9. Erros de produto ≠ estados de produto

Portão **`os_erros_de_produto_separam_se_dos_estados_de_produto_por_causa_textual`**, VERDE com `causas=13 barra_defeito=8[monitor@320,monitor@360,monitor@375,monitor@390,monitor@414,monitor@430,secretary@360,secretary@375] pendencia_estado_de_produto=5[pending@375,pending@390,pending@414,pending@320,pending@360] outras=nenhuma`.

| Célula | Causa |
|---|---|
| pending@320, pending@360, pending@375, pending@390, pending@414 | conta em análise: barreira de pendência, sem shell nem navegação — **estado do produto**, não defeito |

As 5 células `pending` travadas não vão para a lista «com erros»: o produto deliberadamente não monta shell para conta em análise. Tratar isso como defeito fabricaria um erro que não existe; tratá-lo como ausência apaga a evidência de que a barreira funciona. As 8 `barra_defeito` (6 do `monitor`, 2 do `secretary`) são o oposto: a barra devia montar e não montou.

## 10. Como ler as quatro listas

- Nada aqui muda o roadmap sozinho: as listas são leitura derivada de `estado_derivado`. Para mover 5.4 de «com erros» para «a funcionar» é preciso **prova de conteúdo no byte servido** para o vínculo com alunos; a correção baixa o estado, nunca herda um verde anterior.
- O M2 só sai de «ausentes» com uma passada autenticada de operação no módulo — e a v137 candidata (PEN-40) não está publicada; publicar exige OK novo e explícito.
- As 3 FALTA-W são o limite de todo o eixo web: enquanto não houver hit-teste no container de navegação do desktop, nenhuma linha de «disponível no web?» pode ser respondida por conteúdo — só estruturalmente (ver `05-inventario-web.md` §4).

## 11. Portões desta corrida (9/9 VERDE)

| Portão | Veredicto |
|---|---|
| `as_quatro_listas_particionam_as_unidades_sem_duplicar_nem_esquecer` | V |
| `a_lista_e_funcao_do_estado_derivado_e_recusa_estado_desconhecido` | V |
| `cada_saida_tem_causa_textual_e_o_artefacto_que_a_nomeia_existe_em_disco` | V |
| `toda_saida_de_funcionando_tem_prova_que_bateu_na_sua_propria_regua` | V |
| `uma_saida_de_funcionando_nao_pode_ao_mesmo_tempo_ter_saida_de_defeito` | V |
| `os_erros_de_produto_separam_se_dos_estados_de_produto_por_causa_textual` | V |
| `as_ausencias_de_prova_sao_numeradas_e_cada_uma_tem_o_medido_que_a_nomeia` | V |
| `as_incompletas_dividem_se_entre_parciais_e_sem_teste` | V |
| `nenhuma_linha_de_tabela_emitada_fica_fora_da_grelha_do_seu_cabecalho` | V (`tabelas=7 linhas_de_tabela=68 fora_da_grelha=nenhuma fixture_cinco_colunas_na_grelha_de_seis_dispara=true`) |

O nono portão existe por um defeito meu, desta casa. Uma versão anterior do emissor fazia `...([...].map(...).join('\n'))`: o spread percorre uma **string**, de modo que cada linha de tabela foi escrita um caractere por linha. Vermelho intermédio versionado, byte a byte igual à captura de sessão `bu8-run2.txt` (md5 `61050e83d86f4a6887b04da4031aa2ad`, 12 354 B):

`evidence/bu8-listas-20-11-VERMELHO-regua_de_conteudo_na_unidade_de_banco_e_tabela_espalhada.txt`

Esse ficheiro carrega os **dois** defeitos da corrida, e o nome diz os dois:

- `X toda_saida_de_funcionando_tem_prova_que_bateu_na_sua_propria_regua :: … 5.16(banco,SEM_PROVA_NO_AR) sem_prova=5.16` — uma régua de conteúdo aplicada a uma unidade cuja `regua_de_prova` é `banco` produzia vermelho sobre um facto verdadeiro. Não se amaciou a régua: separou-se uma prédica por classe de prova (§2) com fixtures próprios.
- tabelas emitidas um caractere por linha. Medida do contraste: **1 404 linhas** nas capturas `bu8-run2.txt`/`bu8-run3.txt` contra **88 linhas** em `bu8-run4.txt`/`bu8-run5.txt`. As três corridas têm as mesmas 4 secções de lista (`grep -c '^### ##'` = 4 em cada) e o mesmo `distribuicao={"funcionando":3,"com_erros":9,"incompletas":4,"ausentes":1}` — o que mudou foi só a forma de emitir. A régua durável é o nono portão acima, que conta colunas por linha e falha de propósito quando uma linha tem 5 colunas numa grelha de 6; na corrida verde ele mede `tabelas=7 linhas_de_tabela=68`, números esse medidos **apenas** onde o portão já existia (run4/run5).

Estado das corridas, lido dos ficheiros: `run1 BU8_VERMELHO 6/2` (fora do repo, não versionado), `run2 BU8_VERMELHO 7/1` (versionado acima), `run3 BU8_VERDE 8/0` (portões verdes, tabelas ainda espalhadas — 1 404 linhas), `run4/run5 BU8_VERDE 9/0` (88 linhas).
