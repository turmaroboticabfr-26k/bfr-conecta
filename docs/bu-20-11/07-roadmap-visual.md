# BU-9 — Roadmap visual actualizado: o registro diz 92/104 IF; a medição sustenta 3 unidades

Data: 2026-11-20. Estágio 1 do PROMPT BU, **só-leitura**: 0 DDL, 0 escrita no banco, 0 mint, 0 publicação, 0 `git push`, 0 linha alterada em `index.html`, `src/`, regras de negócio ou permissões.

O briefing exige que «o roadmap deve refletir a realidade do código, não apenas copiar os status da referência». Este documento põe as duas coisas lado a lado e mede a distância entre elas.

| Item | Valor | Fonte |
|---|---|---|
| Instrumento | `scripts/bu9-roadmap-visual-20-11.mjs` | corrida `em=2026-11-20T11:00:03.167Z`, veredicto `BU9_VERDE 11/0` |
| Artefacto | `evidence/bu9-roadmap-visual-20-11.json` (13 960 B) e `.txt` (8 684 B, md5 `05124cf20305b5b31f62248c7e580fb1`) | campos `registro`, `linhas`, `divergencias`, `visual`, `faltas_carregadas` |
| Captura | fora do repo: `C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296/bu9-run3.txt`, `node_exit=0` escrito no ficheiro | ídem |
| Idempotência | re-corrida sem o sufixo `-RUN2`: as duas saídas coincidem caractere a caractere depois de retirar a linha `em=` → `IDEMPOTENTE_sem_em=verdade` | `diff <(sed 's/em=[0-9T:.Z-]*//' …)` |
| Origens | `evidence/bu5-unidades-do-roadmap-20-11.json` (estados medidos), `evidence/bu7-inventarios-20-11.json` (grelhas e FALTAS), `evidence/bu8-listas-20-11.json` (regra de classificação), `docs/roadmap-master.md` §15 (registro) | portão `o_roadmap_visual_declara_um_só_byte…`: `bu5=bu7=bu8=9e236a23eed978cf7c2a2743d449b307 bytes=3547458` |

## 1. O que o registro de referência afirma, re-lido em cada corrida

Nenhum número desta secção foi copiado para o código: a §15 de `docs/roadmap-master.md` é re-parseada a cada corrida.

- **16 linhas** em «Progresso por módulo (IF/total)»; `soma_total=104`, `soma_concluido=92`.
- O histograma declarado da mesma §15 diz `IMPLEMENTADO E FUNCIONANDO | 92 (88,5%)` → `if_declarado=92`. As duas representações independentes batem (portão `as_linhas_de_progresso_do_registro_sao_dezasseis_e_batem_com_o_histograma_declarado`).
- Cada percentagem foi **re-calculada** de `concluido/total` e comparada com a string impressa no registro: `linhas_com_percentual_divergente=nenhuma`, com os formatos que o próprio registro usa (`100%` quando `concluido==total`, senão uma decimal com vírgula — fixtures `7/8 → 87,5%`, `6/6 → 100%`, `11/14 → 78,6%`). Um percentual envelhecido na tabela do registro chumba aqui.

## 2. O mapeamento registro → unidade medida

O registro **não** usa os mesmos nomes que a medição, e a ordem é o único fio condutor; por isso a ordem é conferida, não presumida:

- `o_mapeamento_por_ordem_das_linhas_do_registro_confere_item_a_item_com_a_bu5`, VERDE com `desloques=nenhum unidades_com_registro=16 linhas=16 mapeadas=16`. O predicado compara o `Total` da linha i com os `itens` lidos porBU-5 do corpo `### 5.x`; `mapeadas=16` também fecha uma fuga específica: se o `M2` entrasse no mapa, passaria a 17.
- Falsificado de propósito: `fixture_um_deslocamento_de_linha_detecta=true` — rodar as linhas do registro uma posição produz desloques.
- Nomes: **1 só divergência**, e é nomeada em vez de tolerada por limiar — `5.11: registro="Portaria" medido="Porteiro"`. O fixture acrescenta um par inédito (`Secretaria Escolar` × `Painel de Controlo Remoto`) e exige que a contagem suba exatamente 1 (`fixture_acrescentar_um_par_inedito_muda_a_contagem=true`).

## 3. O roadmap visual

`### ROADMAP VISUAL` do artefacto, re-indentado para caber no documento (os campos por linha são os do artefacto; o texto integral, linha a linha, está em `evidence/bu9-roadmap-visual-20-11.txt` e em `OUT.visual`). Comprimento da barra = itens do registro para a unidade; **símbolo = estado medido**, nunca a percentagem.

```
Legenda: `#` a funcionar · `~` com erros · `+` incompleta · `_` ausente.
5.1  Autenticação e sessão              ~~~~~~~~       8 itens  registro 7/8 87,5%   IMPLEMENTADO COM ERROS
5.2  Navegação e estrutura              ~~~~~~         6 itens  registro 5/6 83,3%   IMPLEMENTADO COM ERROS
5.3  Área do aluno                      ++++++++++++++ 14 itens registro 11/14 78,6% PARCIALMENTE IMPLEMENTADO
5.4  Responsáveis                       ~~~~~~~~~       9 itens registro 8/9 88,9%   IMPLEMENTADO COM ERROS
5.5  Professor                          ~~~~~~~~~       9 itens registro 8/9 88,9%   IMPLEMENTADO COM ERROS
5.6  Coordenação                        ~~~~~~~~~       9 itens registro 8/9 88,9%   IMPLEMENTADO COM ERROS
5.7  Direção                            +++++++         7 itens registro 6/7 85,7%   PARCIALMENTE IMPLEMENTADO
5.8  Secretaria Escolar                 ######          6 itens registro 6/6 100%    IMPLEMENTADO E TESTADO
5.9  Supervisão Educacional (…)         ######          6 itens registro 5/6 83,3%   IMPLEMENTADO E TESTADO
5.10 Monitor (transporte)               ~~~~            4 itens registro 4/4 100%    IMPLEMENTADO COM ERROS
5.11 Porteiro                           ~~~~~           5 itens registro 3/5 60,0%   IMPLEMENTADO COM ERROS
5.12 AEE / Psicologia / Serviço Social  ++++++          6 itens registro 6/6 100%    IMPLEMENTADO, MAS NÃO TESTADO
5.13 Jogos Escolares                    ~~              2 itens registro 2/2 100%    IMPLEMENTADO COM ERROS
5.14 Comunicação e plataforma           ~~~~            4 itens registro 4/4 100%    IMPLEMENTADO COM ERROS
5.15 Desenvolvedor / equipe técnica      +++             3 itens registro 3/3 100%    IMPLEMENTADO, MAS NÃO TESTADO
5.16 Segurança transversal              ######          6 itens registro 6/6 100%    IMPLEMENTADO E TESTADO
M2   Secretaria Municipal (módulo 2)     _               0 itens registro sem linha   SOMENTE INTERFACE
```

(Rótulos truncados a 46 colunas pelo emissor; a versão integral está na `### TABELA VISUAL POR UNIDADE` do artefacto, com 17 linhas × 11 colunas.)

A forma de leitura: a **barra** diz o alcance declarado, o **símbolo** diz o que a medição aguenta. Medido sobre as 16 linhas com registro: **14** estão em `≥ 83%` de itens IF e **7** estão a 100 %; no visual, **3** unidades estão na faixa `#` (`node -e` sobre `OUT.registro.linhas`: `total_linhas=16 ge83=14 prontos_100pct=7`).

## 4. As divergências, linha a linha

`DIVERGENCIA_REGISTRO_VS_MEDIDA 5 + 1 de 17` — contagem, não portão:

| Grupo | Registro | Medição | Classe |
|---|---|---|---|
| 5.10 | 4/4 100% | IMPLEMENTADO COM ERROS | `registro_pronto__medicao_nao` |
| 5.12 | 6/6 100% | IMPLEMENTADO, MAS NÃO TESTADO | `registro_pronto__medicao_nao` |
| 5.13 | 2/2 100% | IMPLEMENTADO COM ERROS | `registro_pronto__medicao_nao` |
| 5.14 | 4/4 100% | IMPLEMENTADO COM ERROS | `registro_pronto__medicao_nao` |
| 5.15 | 3/3 100% | IMPLEMENTADO, MAS NÃO TESTADO | `registro_pronto__medicao_nao` |
| 5.9 | 5/6 83,3% | IMPLEMENTADO E TESTADO | `medicao_testada__registro_com_lacuna` |

- As cinco primeiras são o caso que o briefing visa: o registro chama-lhes 100 % e a medição tem uma saída aberta contra elas. 5.10 está TRAVADA nas 6 larguras mobile (nenhuma porta do `monitor` foi medida no ar actual); 5.12 nunca teve prova de conteúdo no byte servido; 5.13 escreve 0 tabelas no papel `sports_operator`; 5.14 tem a cadeia de push partida no service worker; 5.15 está na mesma situação de prova que 5.12.
- A última é a divergência no sentido inverso, e também a assino: o registro conta 5/6 em Supervisão (um item `PF`), mas a unidade tem prova de conteúdo no byte servido (`no_ar_servido`, 2 corridas) — o meu estado é **IMPLEMENTADO E TESTADO** sem inflar nada: o item `PF` não é prometido como feito, é a promessa futura que já estava no registro.

O portão que impede a cópia mecânica: `a_faixa_exibida_nao_e_a_percentagem_do_registro`, VERDE com `se_copiasse_o_registro_diria_pronto_em=7[Secretaria,Transporte (monitor),AEE/Psicologia/Social,Jogos Escolares,Comunicação,Desenvolvedor,Segurança transversal] no_visual_a_funcionar=3[5.8,5.9,5.16] fixture_classificacao_pela_percentagem_diverge=true`. As duas contagens são diferentes **por construção**: se alguém trocar a classificação pela percentagem, o verde desaparece.

## 5. Cobertura medida atrás de cada barra

A tabela visual traz três colunas de realidade por unidade — `Mobile OK/de`, `Web medida/bloq`, `Contradições`. Pontos que o visual não esconde:

- **5.1 e 5.16 não têm cobertura mobile própria** (`sem_cobertura_mobile=5.1,5.16`): nenhuma porta com `papel` atribuído a essas unidades nas 6 larguras, porque a autenticação e a segurança não são painéis de papel. Ficam nomeadas no portão, não omitidas.
- As faixas mobile batem por duas relações independentes: para cada unidade com portas, `mobile_celulas == papeis × 6` (`multiplo_diverge=nenhuma`) e `soma dos estados == mobile_celulas` (`soma_de_estados_diverge=nenhuma`). O fixture que dispara é o modo de falha real — um histograma que perde uma célula (`{OK:5}` para 6 células) → `diverge(true)`.
- O lado web usa só as 3 larguras do briefing (`larguras_vistas=[1280,1440,1920]`) e só as 2 classes do produtor (`MEDIDA_WEB`, `BLOQUEADA`); acrescentar 390 ao conjunto web dispara o fixture (`fixture_acrescentar_390_ao_web=390`). **Lembrete do BU-7**: nenhuma célula web abriu painel — as colunas web deste visual medem shell e estouro, não conteúdo (FALTA-W1/W2/W3).

## 6. O que teria de mudar para mover uma barra

Nada aqui herda verde: uma correção **baixa** o estado até haver prova.

| Barra hoje | Para mudar de símbolo exige | OK necessário |
|---|---|---|
| 5.10 `~` → `#` | barra mobile do `monitor` montada e portas medidas nas 6 larguras no byte servido | nenhum (é passada de browser) |
| 5.12 `+` → `#` | prova de conteúdo dos 6 itens no byte servido (AEE/psicologia/social com conta real) | nenhum |
| 5.13 `~` → `#` | `sports_operator` com escrita nas 5 mesas de gestão (é **DDL de grants**) | **OK novo de DDL** |
| 5.14 `~` → `#` | cadeia de push completa no recetor + exibição em aparelho físico (RM-1.3) | **OK novo de publicação** se exigir reparo no cliente |
| 5.15 `+` → `#` | prova de conteúdo dos 3 itens do painel técnico | nenhum |
| M2 `_` → `+`/`#` | passada autenticada de operação do módulo municipal no ar | **OK novo de publicação** (a candidata v137 não está publicada) |
| 5.16 `#` com asterisco | o registro ainda carrega `SC.01 176/176 · SC.02 475/475` contra os 183/183 e 495 medidos hoje | nenhum (é escrita em documento) |

A última linha é a contradição que **não** foi escondida para obter verde: o portão `as_faltas_numeradas_da_bu7_e_da_bu8_chegam_ao_visual_sem_se_tornarem_verdes` imprime `funcionando_com_saida_de_defeito=nenhuma` **e** `funcionando_com_contradicao_de_numero_desactualizado=5.16`. A regra da casa é por tipo de saída: um número velho não apaga a faixa, mas também não se esconde dela.

## 7. Vermelho intermédio desta corrida (preservado, não apagado)

`BU9_VERMELHO 9/2` na primeira corrida, versionado com o defeito no nome:

- `evidence/bu9-roadmap-visual-20-11-VERMELHO-requisito_de_zero_contradicoes_e_fixture_mobile_sem_pegada.json` (md5 `bced5e20b0ebd3389e0811dd9d777111` do corpo `.json`; o `.txt`-irmão `ee003a61a7b31771c3e172884aea4793`)

Os dois vermelhos eram **meus**, e um deles era um verde à espera de ser falso:

1. `X as_faltas_numeradas…:: … funcionando_com_saida_de_defeito=5.16` — eu tinha escrito «unidade na faixa `funcionando` não pode ter contradição nenhuma». Isso é mais estrito do que a regra da casa (BU-8 proíbe saída do tipo **defeito**) e punia um facto verdadeiro. O predicado foi corrigido **por tipo de contradição**, com fixture que dispara (`fixture_unidade_testada_com_defeito_e_detectada=true`) — e a contradição de 5.16 passou a ser impressa no detalhe em vez de desaparecer. Antes da correção, o código referia `r.contradicoes_defeito`, campo que **não existia** em `LINHAS`: `undefined > 0` seria `false` para tudo, ou seja, o portão ficaria decorativo. O campo foi acrescentado à linha.
2. `X a_cobertura_mobile…:: … fixture_ok5+travada1_para_1_papel=diverge(false)` — o meu fixture somava 5+1=6 contra 6 células esperadas: nunca poderia disparar, o que tornava a asserção `FIX_MOBILE === true` um vermelho garantido e, noutro arranjo, um verde decorativo. Passou a representar o modo de falha real (histograma que perde uma célula).

Também acrescentei, sem precisar de vermelho, o fixture de deslocamento de linhas (§2), porque a asserção de ordem sem controle contrário é a mesma régua que se move com o medido.

## 8. Portões desta corrida (11/11 VERDE)

| Portão | Veredicto |
|---|---|
| `as_linhas_de_progresso_do_registro_sao_dezasseis_e_batem_com_o_histograma_declarado` | V |
| `o_percentual_de_cada_linha_do_registro_e_re_calculado_a_partir_de_concluido_e_total` | V |
| `o_mapeamento_por_ordem_das_linhas_do_registro_confere_item_a_item_com_a_bu5` | V |
| `os_nomes_do_registro_divergem_do_rotulo_medido_so_onde_a_divergencia_ja_foi_escrita` | V |
| `a_faixa_exibida_nao_e_a_percentagem_do_registro` | V |
| `nenhuma_unidade_na_faixa_funcionando_sem_prova_bater_na_sua_propria_regua` | V |
| `a_cobertura_mobile_citada_no_visual_e_multiplo_das_seis_larguras_e_a_soma_dos_estados_bate` | V |
| `a_cobertura_web_do_visual_usa_so_as_tres_larguras_e_as_duas_classes_do_produtor` | V |
| `o_roadmap_visual_declara_um_só_byte_e_ele_bate_com_o_que_bu5_bu7_e_bu8_declaram` | V |
| `as_faltas_numeradas_da_bu7_e_da_bu8_chegam_ao_visual_sem_se_tornarem_verdes` | V |
| `nenhuma_linha_de_tabela_emitada_fica_fora_da_grelha_do_seu_cabecalho` | V (`tabelas=11col,4col,2col linhas_de_tabela=27 fora_da_grelha=nenhuma`) |

## 9. Resumo do roadmap em uma frase

Das 16 linhas que o registro de referência pontua, **7 diriam «tudo IF»**; a medição coloca **3** na faixa «a funcionar», **9** com erros, **4** incompletas (contando as duas sem teste) e, com o M2, **1** ausente. O que separa os dois números não é opinião: é a prova de conteúdo no byte `9e236a23eed978cf7c2a2743d449b307` — 12 de 17 unidades ainda não a têm (BU-8 §7).
