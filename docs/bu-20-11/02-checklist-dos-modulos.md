# BU-5 — Checklist dos módulos do roadmap contra a implementação real

Data: 2026-11-20. Estágio 1 do PROMPT BU (análise, compreensão e documentação). **Nada aqui alterou o projeto**: 0 DDL, 0 escrita no banco, 0 mint, 0 publicação, 0 `git push`, 0 linha modificada no `index.html` servido, em `src/`, em regras de negócio ou em permissões.

**Instrumento:** `scripts/bu5-unidades-do-roadmap-20-11.mjs` (só leitura) → `evidence/bu5-unidades-do-roadmap-20-11.json` + `evidence/bu5-unidades-do-roadmap-20-11.txt`, veredicto `BU5U_VERDE 25/0`, emitido `em=2026-11-20T10:14:21.213Z`. A captura da corrida ficou fora do repositório (`C:/Users/pcmac/Documents/Qoder/2026-11-15/2e9c4296/bu5u-run4.txt`, termina `node_exit=0`). A corrida anterior, com 24 portões e a prova de conteúdo de 5.15 mal atribuída, ficou em `bu5u-run3.txt` e é a §1.7 abaixo.

**O byte que este checklist descreve** é o byte servido: o artefacto declara `ar md5=9e236a23eed978cf7c2a2743d449b307 bytes=3547458`, e o portão `o_md5_do_ar_e_o_mesmo_em_bu5_p73_e_sm25` confronta essa pegada com as pegadas dos artefactos `p73` e `sm25` — os três batem e `celulas_diferentes=0`. Que a comparação tem poder de fogo prova-o `a_falsificacao_do_portao_de_md5_dispara` (corrido contra uma pegada inventada).

**Regra de leitura deste documento:** nenhuma linha abaixo vem de memória ou de inferência. Cada número é (i) um campo do artefacto, (ii) uma linha da tabela que o artefacto imprime, ou (iii) a saída de um comando citado no próprio sítio. Onde a medição não existe, está escrito `NÃO FOI POSSÍVEL VERIFICAR`.

---

## 0. Quantos módulos são, realmente — e por que este checklist tem 17 linhas

O briefing pede a comparação «com cada um dos **14 módulos** do roadmap». O documento de referência (`docs/roadmap-master.md`) não declara 14; declara 16 grupos de inventário e 16 linhas de progresso, e há um módulo servido que não aparece em nenhum dos dois sítios. Medido:

| Sítio do roadmap | O que declara | O que a leitura devolve |
|---|---|---|
| Título da §5 (linha 112) | «INVENTÁRIO COMPLETO DE FUNCIONALIDADES (104 itens)» | 104 linhas de item lidas pelo parser (`o_numero_de_itens_confere_com_o_titulo_da_seccao_quatro_de_cinco :: lidos_do_corpo=104 declarados_no_titulo=104`) |
| Cabeçalhos `### 5.x` (linhas 117 a 312) | grupos do inventário | **16** grupos, cada um com rótulo |
| §15 «Progresso por módulo (IF/total)» | tabela de progresso | **16** linhas de módulo, uma por grupo de §5 |
| MÓDULO 2 — Secretaria Municipal | sem grupo em §5, sem linha em §15 | 1 bloco de código servido (invólucro `data-bfr-municipal-module`, 56 408 chars) + pendências PEN-38/39/41 |

`16 grupos + 1 módulo sem grupo = 17 unidades`. O portão `os_rotulos_das_unidades_batem_com_os_titulos_do_registro` confirma que os 16 rótulos que uso são os do registro, e que o 17.º é o meu (M2 não tem título no registro: `M2:declarado="Secretaria Municipal (módulo 2)" registro="null"`).

**O parser reproduz o histograma do roadmap.** Somando os histogramas por unidade que o artefacto imprime:

```
grep -E '^U ' evidence/bu5-unidades-do-roadmap-20-11.txt | grep -o '"[A-Z][A-Z]*":[0-9]*' \
  | awk -F'":' '{gsub(/"/,"",$1); s[$1]+=$2; t+=$2} END{for(k in s) printf "%s=%d ",k,s[k]; printf "| soma=%d\n", t}'
IF=92 ICP=3 NT=1 PF=3 PI=2 NM=3 | soma=104
```

Isto é exatamente a tabela §15 (92 IF, 3 ICP, 2 PI, 3 NM, 1 NT, 3 PF, 0 NI). Ou seja: a minha leitura do registro não re-inventa o inventário — confunde-se com ele item a item. O que muda são os **estados**, porque §15 publica percentagens de `IF/total` e o briefing pede sete estados com prova.

---

## 1. Método: como um código do registro vira um estado do briefing

### 1.1 As duas legendas, lado a lado

Legenda declarada na linha 114 do roadmap: `IF` = IMPLEMENTADO E FUNCIONANDO · `ICP` = IMPLEMENTADO COM PROBLEMAS · `PI` = PARCIALMENTE IMPLEMENTADO · `NI` = NÃO IMPLEMENTADO · `NT` = NECESSITA DE TESTES · `NM` = NECESSITA DE MELHORIAS · `PF` = PLANEJADO PARA O FUTURO.

Tabela de tradução fixa (campo `CODIGO_PARA_ESTADO` do instrumento):

| Código do registro | Estado do briefing |
|---|---|
| IF | IMPLEMENTADO E TESTADO (piso — só se confirma se a régua de prova bater) |
| ICP | IMPLEMENTADO COM ERROS |
| PI | PARCIALMENTE IMPLEMENTADO |
| NM | PARCIALMENTE IMPLEMENTADO |
| NT | IMPLEMENTADO, MAS NÃO TESTADO |
| PF | NÃO IMPLEMENTADO |
| NI | NÃO IMPLEMENTADO |
| *(sem código)* | SOMENTE INTERFACE e NÃO FOI POSSÍVEL VERIFICAR só existem por medição, não no registro |

### 1.2 A escada de decisão (a ordem importa)

Aplicada por unidade, de cima para baixo, na mesma ordem em `scripts/bu5-unidades-do-roadmap-20-11.mjs:202-210`:

1. **SOMENTE INTERFACE** — a unidade tem regiões identificadas, **0** mesas citadas, pelo menos 1 RPC chamado, **todos** os RPCs chamados são predicados de autorização (conjunto de 63 nomes lidos de `evidence/bu2c-caminhos-de-autorizacao-20-11c.json`), e pelo menos 1 porta própria aparece no censo de destinos medidos no ar. Dispara em M2.
2. **NÃO FOI POSSÍVEL VERIFICAR** — o registro não tem nenhum item para a unidade e não se cumpre o degrau 1. Não dispara em nenhuma das 17 (M2 é apanhada antes, pelo degrau 1).
3. **NÃO IMPLEMENTADO** — só quando o registro afirma explicitamente zero itens com código de implementação. Não dispara em nenhuma unidade (`nao_implementado_so_e_emitido_quando_o_registro_nao_afirma_codigo_nenhum :: com_NAO_IMPLEMENTADO=nenhuma`).
4. **PARCIALMENTE IMPLEMENTADO** — fração de itens implementados abaixo de 0,5. Não dispara (o mínimo medido é 0,60 em 5.11).
5. **IMPLEMENTADO COM ERROS** — existe contradição tipada `defeito` entre o registro e a medição, **ou** o registro tem ICP.
6. **PARCIALMENTE IMPLEMENTADO** — tem PI ou NM.
7. **IMPLEMENTADO E TESTADO / IMPLEMENTADO, MAS NÃO TESTADO** — conforme a régua de prova da unidade bater ou não.

### 1.3 Porque existe o degrau 5 antes da prova (a regra antiga não tinha caso positivo)

A formulação anterior derivava o estado **só** do histograma de códigos. Como a fração de implementados é função desse mesmo histograma, uma unidade com 5 de 6 itens IF e 1 PF podia cair em `NÃO IMPLEMENTADO` enquanto o caminho dela estava medido a funcionar. Foi exatamente o que aconteceu: o portão `a_regra_antes_de_3_era_degenerada_em_pelo_menos_uma_unidade` devolve `5.9@frac0.83,5.11@frac0.6`, e `nenhuma_unidade_com_item_implementado_recebe_NAO_IMPLEMENTADO` publica os pares `regra_antes_de_3 > estado_derivado` de cada unidade em que as duas regras divergem — 10 pares nesta corrida, contados na própria linha do portão, incluindo os dois `NÃO IMPLEMENTADO` que a regra velha emitia (5.9 e 5.11) e que hoje são `IMPLEMENTADO E TESTADO` e `IMPLEMENTADO COM ERROS`. A coluna `regra_antes_de_3` está no artefacto linha a linha para comparação, por unidade.

### 1.4 Duas réguas de prova, uma por classe de afirmação

| Régua | Aplica-se a | Critério | Unidades |
|---|---|---|---|
| **conteúdo** | a afirmação é «esta função existe no ar que está servido» | pelo menos uma corrida de conteúdo cuja pegada é a do byte servido (classe `no_ar_servido`) | 15 unidades |
| **banco** | a afirmação é de catálogo (policies, funções, alcance) | pelo menos uma corrida de banco que existe em disco e traz data `2026-11-20` | 5.16 e M2 |

O portão `nenhuma_unidade_de_regua_banco_fica_sem_prova` verifica os dois casos e, no caminho, publica o rol de unidades de conteúdo **sem** prova no byte servido: `sem_prova_de_conteudo_no_ar=[5.1,5.2,5.3,5.4,5.5,5.6,5.10,5.11,5.12,5.13,5.14,5.15] de 15 unidades de conteudo`. Isto é a §5 deste documento, não um detalhe.

Classes de pegada de corrida (classificador `pegadaDeCorrida`, portão `o_classificador_de_pegada_distingue_ar_actual_de_outro_ar :: ar_actual=no_ar_servido outro_ar=noutro_ar classes_vistas=[no_ar_servido,noutro_ar,sem_pegada_de_ar]`):

- `no_ar_servido` — a corrida cita a pegada do byte atualmente servido;
- `noutro_ar` — cita uma pegada de 32 hex que **não** é a do ar servido (a corrida é real mas descreve outro byte);
- `sem_pegada_de_ar` — não cita pegada nenhuma de arquivo servido;
- `ar_citado_em_prosa` — o nome do ar aparece em prosa, não como campo de pegada;
- `FALTA` — o artefacto citado não existe em disco (portão `os_caminhos_de_corrida_apontam_para_ficheiros_que_existem :: faltas=nenhuma de 55 corridas citadas`).

### 1.5 A banda de alcance no banco exclui o papel de preview — e a exclusão é pagante

O papel `developer` tem porta própria em 15 das 17 unidades e é o único papel com porta em 5.15. Se entrar na banda, toda a coluna fica `L ..165 · W ..144` e deixa de distinguir qualquer unidade. Por isso a banda publicada é calculada sobre `papeis_efetivos = papeis \ {developer}`, e as duas variantes ficam no artefacto (`banda_de_alcance` e `banda_com_preview`). Portão: `a_banda_de_alcance_exclui_o_papel_de_preview_e_a_exclusao_e_portante :: unidades_em_que_developer_tem_porta=15 de 17; leitura maxima muda em=15`.

### 1.6 Unidade de contagem das células

- **célula mobile** = papel × largura **dentro do conjunto de destinos daquela unidade**. A grelha global é `15 papeis × 6 larguras = 90 celulas` com motivos `{travada_com_causa:13, por_medir:7, coerente:70}`; por unidade o total é menor (0 a 84) e as somas coluna a coluna **não** têm de bater 90 nem uns aos outros. Vocabulário por célula: `OK`, `TRAVADA`, `por_medir` (`as_celulas_de_p73_usam_so_o_vocabulario_declarado :: valores_vistos=[OK,TRAVADA,por_medir]`, e `o_vocabulario_de_celulas_rejeita_um_estado_inedito` prova que um estado novo é rejeitado).
- **célula web** = papel × largura desktop; conta-se `MEDIDA_WEB` sobre o total, com o global em `{total:45, medida_web:38, bloqueada:7, falta:0}`.

### 1.7 Uma prova de conteúdo tem de ser do papel da unidade (correção feita a este instrumento)

A primeira versão citava, como prova de conteúdo de **5.15 Desenvolvedor**, o artefacto `evidence/p36-browser-supervisao-director-390-1280px-19-11.json`. A pegada daquele artefacto é a do byte servido, mas a sessão é do papel `director`, lida do próprio artefacto em `unidades[].papel` — não do nome do ficheiro. É a prova certa para 5.7 (Direção) e nenhuma prova para a unidade do desenvolvedor.

Regra fechada no portão `nenhuma_prova_de_conteudo_cita_sessao_de_papel_sem_porta_na_unidade :: fora_da_identidade=nenhuma | fixture_5.15_com_a_sessao_do_director_devolve=[director] | papel_lido_do_artefacto_secretary=secretary`. O par fixture/verde é o que dá poder de fogo ao portão: a combinação que eu acabei de remover continua a ser avaliada e devolve exatamente `director` como violação.

Consequência na tabela: 5.15 passa de `IMPLEMENTADO E TESTADO` para **IMPLEMENTADO, MAS NÃO TESTADO**. As sessões do papel `developer` sobre o byte servido existem (`evidence/ah2-mobile2-m5-developer-11.json`, `evidence/ah2-mobile2-sm25-developer-1280.json`, ambos com `md5_shell` igual ao ar), mas são censo de portas (classe `superficie`), não medição de conteúdo — e estão agora citadas na unidade. Nenhum verde foi herdado pelo conserto: o estado piorou, que é o resultado esperado de corrigir uma atribuição errada.

---

## 2. A tabela derivada (17 unidades)

| Unidade | Itens (códigos do registro) | **Estado derivado** | Portas próprias no ar | Papéis com porta | Mobile OK / TRAVADA / por medir (células) | Web medidas | Alcance no banco sem preview |
|---|---|---|---|---|---|---|---|
| 5.1 Autenticação e sessão | 8 (IF 7 · ICP 1) | **IMPLEMENTADO COM ERROS** | 0/0 | nenhum | — (0 células) | 0/0 | só o papel de preview tem porta |
| 5.2 Navegação e estrutura | 6 (IF 5 · ICP 1) | **IMPLEMENTADO COM ERROS** | 4/4 | 13 | 64 / 8 / 6 (78) | 35/39 | L 3..133 · W 0..101 (12 papéis) |
| 5.3 Área do aluno | 14 (IF 11 · PI 1 · NM 2) | **PARCIALMENTE IMPLEMENTADO** | 12/12 | 10 | 51 / 8 / 1 (60) | 27/30 | L 15..133 · W 1..101 (9) |
| 5.4 Responsáveis | 9 (IF 8 · ICP 1) | **IMPLEMENTADO COM ERROS** | 7/7 | 8 | 37 / 8 / 3 (48) | 20/24 | L 16..133 · W 3..101 (7) |
| 5.5 Professor | 9 (IF 8 · NT 1) | **IMPLEMENTADO COM ERROS** | 16/16 | 5 | 30 / 0 / 0 (30) | 14/15 | L 17..133 · W 4..101 (4) |
| 5.6 Coordenação | 9 (IF 8 · PI 1) | **IMPLEMENTADO COM ERROS** | 11/11 | 14 | 70 / 8 / 6 (84) | 38/42 | L 3..133 · W 0..101 (13) |
| 5.7 Direção | 7 (IF 6 · NM 1) | **PARCIALMENTE IMPLEMENTADO** | 9/9 | 6 | 27 / 8 / 1 (36) | 15/18 | L 17..133 · W 3..101 (5) |
| 5.8 Secretaria Escolar | 6 (IF 6) | **IMPLEMENTADO E TESTADO** | 6/6 | 8 | 43 / 2 / 3 (48) | 22/24 | L 16..133 · W 3..101 (7) |
| 5.9 Supervisão Educacional | 6 (IF 5 · PF 1) | **IMPLEMENTADO E TESTADO** | 2/2 | 8 | 43 / 2 / 3 (48) | 22/24 | L 16..133 · W 3..101 (7) |
| 5.10 Monitor (transporte) | 4 (IF 4) | **IMPLEMENTADO COM ERROS** | 2/2 | 4 | 18 / 6 / 0 (24) | 9/12 | L 17..133 · W 3..101 (3) |
| 5.11 Porteiro | 5 (IF 3 · PF 2) | **IMPLEMENTADO COM ERROS** | 2/2 | 7 | 36 / 6 / 0 (42) | 18/21 | L 15..133 · W 1..101 (6) |
| 5.12 AEE / Psicologia / Serviço Social | 6 (IF 6) | **IMPLEMENTADO, MAS NÃO TESTADO** | 5/5 | 11 | 61 / 2 / 3 (66) | 31/33 | L 14..133 · W 3..101 (10) |
| 5.13 Jogos Escolares | 2 (IF 2) | **IMPLEMENTADO COM ERROS** | 2/2 | 11 | 52 / 8 / 6 (66) | 29/33 | L 3..133 · W 0..101 (10) |
| 5.14 Comunicação e plataforma | 4 (IF 4) | **IMPLEMENTADO COM ERROS** | 3/3 | 12 | 67 / 2 / 3 (72) | 34/36 | L 14..133 · W 1..101 (11) |
| 5.15 Desenvolvedor / equipe técnica | 3 (IF 3) | **IMPLEMENTADO, MAS NÃO TESTADO** | 1/1 | 1 | 6 / 0 / 0 (6) | 3/3 | só o papel de preview tem porta |
| 5.16 Segurança transversal | 6 (IF 6) | **IMPLEMENTADO E TESTADO** | 0/0 | nenhum | — (0 células) | 0/0 | só o papel de preview tem porta |
| M2 Secretaria Municipal | 0 (sem grupo no registro) | **SOMENTE INTERFACE** | 1/1 | 2 | 10 / 0 / 2 (12) | 5/6 | L 16..16 · W 4..4 (1 papel) |

Distribuição (`os_estados_derivados_nao_sao_todos_o_mesmo_valor :: distribuicao={...}`): **9** IMPLEMENTADO COM ERROS · **3** IMPLEMENTADO E TESTADO · **2** PARCIALMENTE IMPLEMENTADO · **2** IMPLEMENTADO, MAS NÃO TESTADO · **1** SOMENTE INTERFACE · **0** NÃO IMPLEMENTADO · **0** NÃO FOI POSSÍVEL VERIFICAR como estado de unidade (as 3 entradas `prova_ausente` da §5.1 ficam nesse estado a nível de item, não de unidade).

**Nenhuma unidade está em «concluída só porque aparece na interface».** As três colunas centrais separam isso: a coluna *portas* diz o que aparece na interface, a coluna *alcance* diz o que o banco deixa, e o *estado* resulta dos dois mais a prova (§3). As duas unidades com 0 portas próprias (5.1, 5.16) são transversais — não têm destino de menu; existem como caminhos partilhados.

---

## 3. As nove perguntas do briefing, por unidade

Legenda das colunas, cada uma ligada a um campo do artefacto:

| # | Pergunta do briefing | O que responde, medido |
|---|---|---|
| Q1 | existe no código? | itens do registro com código de implementação sobre itens do grupo (`frac_implementado`) |
| Q2 | disponível na interface? | `portas_proprias_no_ar` sobre destinos declarados da unidade, contra o censo de 54 destinos medidos no ar |
| Q3 | conectado ao banco? | `tabelas_distintas`, `rpcs`, e `mesas_da_unidade_fora_do_alcance_dos_papeis` (pares papel×mesma citada pela região) |
| Q4 | executa sua ação corretamente? | web medidas/total + células TRAVADA + contradições de tipo `defeito` |
| Q5 | disponível no mobile? | OK sobre células do papel×largura nos destinos da unidade |
| Q6 | disponível no web? | `MEDIDA_WEB` sobre células desktop da unidade |
| Q7 | possui controle de acesso? | banda de leitura/escrita no banco sem o papel de preview, com nº de papéis |
| Q8 | foi testada? | régua (conteúdo/banco) + classe de pegada das corridas citadas |
| Q9 | existem erros conhecidos? | entradas de `CONTRADICOES` com tipo e artefacto em disco |

| Unidade | Q1 código | Q2 interface | Q3 banco | Q4 execução | Q5 mobile | Q6 web | Q7 acesso | Q8 testada | Q9 erros |
|---|---|---|---|---|---|---|---|---|---|
| 5.1 | 8/8 | sem destino próprio | 0 mesas · 0 RPCs · 0 pares fora | 0/0 web, 0 contradições de execução medidas | — | — | sem banda (transversal) | **não** — `rm12-veredito.json` = `sem_pegada_de_ar@2026-11-12` | 1 (`defeito`) |
| 5.2 | 6/6 | 4/4 | 1 mesa · 0 RPCs · 9 pares fora | 35/39 web, 8 TRAVADA | 64/78 | 35/39 | 12 papéis, L 3..133 | **não** — nenhuma corrida de conteúdo | 1 (`defeito`) |
| 5.3 | 14/14 | 12/12 | 15 mesas · 0 RPCs · 74 pares fora | 27/30 web, 8 TRAVADA | 51/60 | 27/30 | 9 papéis, L 15..133 | **não** — nenhuma corrida de conteúdo | 0 declaradas |
| 5.4 | 9/9 | 7/7 | 5 mesas · 0 RPCs · 16 pares fora | 20/24 web, 8 TRAVADA | 37/48 | 20/24 | 7 papéis, L 16..133 | **não** — nenhuma corrida de conteúdo | 1 (`prova_ausente`) |
| 5.5 | 9/9 | 16/16 | 0 mesas próprias · 0 RPCs · 0 pares fora | 14/15 web, 0 TRAVADA | 30/30 | 14/15 | 4 papéis, L 17..133 | **não** — nenhuma corrida de conteúdo | 1 (`defeito`) |
| 5.6 | 9/9 | 11/11 | 18 mesas · 2 RPCs · 144 pares fora | 38/42 web, 8 TRAVADA | 70/84 | 38/42 | 13 papéis, L 3..133 | **não** — nenhuma corrida de conteúdo | 1 (`defeito`) |
| 5.7 | 7/7 | 9/9 | 8 mesas · 0 RPCs · 17 pares fora | 15/18 web, 8 TRAVADA | 27/36 | 15/18 | 5 papéis, L 17..133 | **sim** — `p36-browser-supervisao-director-390-1280px-19-11.json` = `no_ar_servido@2026-11-19` | 0 declaradas |
| 5.8 | 6/6 | 6/6 | 18 mesas · 0 RPCs · 56 pares fora | 22/24 web, 2 TRAVADA | 43/48 | 22/24 | 7 papéis, L 16..133 | **sim** — `p36-browser-supervisao-secretary-390-1280px-19-11.json` = `no_ar_servido@2026-11-19` | 0 declaradas |
| 5.9 | 5/6 (1 PF) | 2/2 | 18 mesas · 1 RPC · 71 pares fora | 22/24 web, 2 TRAVADA | 43/48 | 22/24 | 7 papéis, L 16..133 | **sim** — idem 5.8 pelo supervisor; `s21-diary.json` = `noutro_ar@2026-11-13` | 0 declaradas |
| 5.10 | 4/4 | 2/2 | 9 mesas · 0 RPCs · 14 pares fora | 9/12 web, 6 TRAVADA | 18/24 | 9/12 | 3 papéis, L 17..133 | **não** — `docs/c2r-diario.md` = `sem_pegada_de_ar` | 1 (`defeito`) |
| 5.11 | 3/5 (2 PF) | 2/2 | 0 mesas · 0 RPCs · 0 pares fora | 18/21 web, 6 TRAVADA | 36/42 | 18/21 | 6 papéis, L 15..133 | **não** — `docs/c2r-diario.md` = `sem_pegada_de_ar` | 2 (`defeito` + `prova_ausente`) |
| 5.12 | 6/6 | 5/5 | 8 mesas · 0 RPCs · 37 pares fora | 31/33 web, 2 TRAVADA | 61/66 | 31/33 | 10 papéis, L 14..133 | **não** — nenhuma corrida de conteúdo | 1 (`prova_ausente`) |
| 5.13 | 2/2 | 2/2 | 0 mesas próprias · 0 RPCs · 0 pares fora | 29/33 web, 8 TRAVADA | 52/66 | 29/33 | 10 papéis, L 3..133 | **não** — nenhuma corrida de conteúdo | 1 (`defeito`) |
| 5.14 | 4/4 | 3/3 | 6 mesas · 0 RPCs · 32 pares fora | 34/36 web, 2 TRAVADA | 67/72 | 34/36 | 11 papéis, L 14..133 | **não** — nenhuma corrida de conteúdo | 1 (`defeito`) |
| 5.15 | 3/3 | 1/1 | 16 mesas · 3 RPCs · 0 pares fora | 3/3 web, 0 TRAVADA | 6/6 | 3/3 | só o preview tem porta | **não** — nenhuma corrida de conteúdo; as sessões `developer` no byte servido são censo de portas (§1.7) | 0 declaradas |
| 5.16 | 6/6 | sem destino próprio | 0 mesas · 0 RPCs · 0 pares fora | — | — | — | sem banda (transversal) | **sim**, régua de **banco**: 3 corridas com data `2026-11-20` (as três `sem_pegada_de_ar`, porque a afirmação é de catálogo) | 1 (`numero_desactualizado`) |
| M2 | registro não a cobre | 1/1 | 0 mesas · 1 RPC (só predicado de autorização) · 0 pares fora | 5/6 web, 0 TRAVADA | 10/12 | 5/6 | 1 papel efetivo, L 16..16 | **sim**, régua de **banco** (`p73-politicas-municipais-20-11e.json` com data 2026-11-20) | 0 declaradas |

**Notas de leitura da tabela:**

- As unidades 5.5, 5.13 e M2 citam **0 mesas nas suas próprias regiões** sem por isso estarem desligadas do banco: os dados chegam-lhes por regiões partilhadas (`bfr-core-runtime`, exceção declarada) ou por RPC. Foi esta distinção que fez nascer o degrau 1: M2 é `SOMENTE INTERFACE` porque o único RPC que chama é `bfr_is_municipal_authority()` — um predicado, não um caminho de dados. O portão `so_interface_exige_caminho_de_dados_so_de_predicado_e_falsifica_numa_funcao_de_dados` prova os dois lados: `helper=bfr_is_municipal_authority?true funcao_de_dados=register_gate_checkin_v2?false`.
- A coluna Q3 «pares fora» mede o **contrário do que o registro afirma**: são mesas citadas pelas regiões da unidade que nenhum papel com porta naquela unidade consegue alcançar. Os maiores valores (5.6 com 144, 5.3 com 74, 5.9 com 71, 5.8 com 56) significam que a região pede dados a quem não tem porta, ou abre porta a quem não tem dados — as duas leituras são problemas, e a lista par-a-par está no artefacto (`mesas_da_unidade_fora_do_alcance_dos_papeis` por unidade).
- Q8 é **não** em 12 das 15 unidades de conteúdo: nenhuma corrida citada por elas carrega a pegada do byte servido. É §5, não §2.

---

## 4. Cobertura do vocabulário (o que fica de fora, e com que nome)

O inventário só vale se o vocabulário for fechado. Os seis portões de cobertura, com a saída tal como emitida:

| Portão | Saída |
|---|---|
| `a_grelha_do_registro_devolve_cinco_colunas_em_cada_item` | `itens_lidos=104 linhas_com_pipe_escapado_no_documento=1 exemplo_de_split_ingenuo=nenhuma_linha_partida` — o des-escapamento é necessário e não é decorativo: há 1 linha com `\|` no documento |
| `toda_porta_propria_de_unidade_existe_no_censo_de_portas_do_ar` | `portas_declaradas_fora_do_ar=nenhuma \| inventada_case? false` |
| `nenhuma_rota_medida_no_ar_fica_fora_do_vocabulario_das_unidades` | `fora=nenhuma de 54` |
| `nenhuma_regiao_identificada_fica_sem_unidade` | `nomes_inexistentes=nenhum sem_dono=nenhuma regioes=64 atribuidas=59 excecoes_declaradas=5` |
| `os_papeis_das_celulas_mobile_sao_os_do_enum_medido` | `p73=15 bu5=15` |
| `o_alcance_de_banco_e_lido_para_todo_papel_que_tem_porta_propria` | `papeis_sem_numero_de_matriz=nenhum` |

As 5 exceções declaradas de região: `bfr-core-runtime` (runtime partilhado) e `bfr-lia-image-avatar`, `bfr-lia-logo-asset`, `bfr-lia-logo-component`, `bfr-final-published-asset-fix` (apresentação transversal). Sem elas, 5 das 64 regiões ficariam sem dono e o censo de 104 itens deixaria de ser coberto.

Vocabulário de portas do artefacto: `portas_no_ar=54 declaradas=72`, decompostas em `estaticas=71` âncoras de secção e uma classe de runtime; `por_literal=5`. Os três identificadores de runtime que abrem destinos sem âncora estática estão no campo `vocabulario.identificadores_de_runtime`: `SECTION → resultados-aprendizagem`, `SECT → secretaria-municipal`, `section → null`.

Ledger de pendências, lido do mesmo documento: `pen_no_ledger=42`, com `as_linhas_do_ledger_pen_tem_cinco_colunas_e_prioridade_do_enum :: pen_lidas=42 prioridades={C:0,A:17,M:14,B:11}` e `a_numeracao_das_pen_nao_tem_lacunas :: maior_identificador=PEN-42 linhas=42`. A prioridade **C** está a zero: nenhuma pendência do ledger se autodeclara crítica, e é por isso que o plano de prioridades (BU-10) não pode ser o ledger ordenado.

---

## 5. O que não foi possível verificar, e onde o registro diz outra coisa

### 5.1 Provas que o registro cita e que não existem como artefacto (`prova_ausente`)

| Unidade | O que o registro cita | O que a leitura do disco devolve |
|---|---|---|
| 5.11 | item `G.01 IF leitor QR`, evidência `T79` / `v102-v103` (diário `evidence/p73-rm52-estado-calendario-20-11.txt` para a segunda metade) | nenhum artefacto com o identificador `T79` existe em `evidence/` nem em `scripts/`; a citação só vive na prosa do registro. No mesmo grupo, o destino servido chama `register_gate_checkin_v2`, que dá 0 em `pg_proc` e 404/PGRST202 pelo fio, e o calendário está com `dia_letivo_confirmado:false` |
| 5.12 | item `A2.03 Realtime AEE (4 canais) IF`, evidência `V71C/V71D` (linha 283 do roadmap; §11 linha 537 repete «APROVADO») | nenhum artefacto com esse identificador em `evidence/`; as ocorrências são 2 documentos de prosa e 1 lista de defeitos (`docs/relatorio-final-auditoria.md`) |
| 5.4 | item `P.01 IF vínculo com alunos` | existe **1** linha em `guardian_students` (`evidence/bu2-censo-catalogo-20-11.json`): a passada «com conta real» não é reprodutível com o parque de contas de hoje |

Estado honesto para estes três itens: **NÃO FOI POSSÍVEL VERIFICAR**. Não escrevo «falha» nem «funciona» — escrevo que a prova citada não está em disco.

### 5.2 Contradições medidas entre registro e realidade (`defeito`, 8 entradas)

| Unidade | Registro afirma | Medido | Artefacto |
|---|---|---|---|
| 5.1 | `A.06 IF` | aprovação medida com clique real, mas o estado `pending` é inalcançável; o próprio veredicto reescreve o item como «com problemas» | `evidence/rm12-veredito.json` |
| 5.2 | `N.02 ICP` (abarca quem?) | a barra mobile não montou em 6 de 6 larguras do papel `monitor` e em 5 de 6 do `pending` | `evidence/p73-cobertura-m5-por-ar-20-11.json` |
| 5.5 | `T.05 IF diário de aula` | o papel `pedagogical` não tem caminho de leitura nem de escrita em `bfr_teacher_diary` | `evidence/bu2c-caminhos-de-autorizacao-20-11c.json` |
| 5.6 | `C.01`–`C.09 IF/PI` | 4 regiões do papel estão desativadas no bundle vivo e 2 dos 3 RPCs que elas chamam não existem no catálogo | `evidence/bu3-pegada-de-modulos-20-11e-VERMELHO-de-tres-rpcs-chamados-e-inexistentes.json` |
| 5.10 | `M.01`–`M.04 IF` | as 6 larguras do papel `monitor` estão TRAVADAS (barra mobile não montou), logo nenhuma porta do monitor foi medida no ar actual | `evidence/p73-cobertura-m5-por-ar-20-11.json` |
| 5.11 | `G.01 IF leitor QR` | o destino servido chama `register_gate_checkin_v2`, inexistente no catálogo (0 em `pg_proc`, 404/PGRST202) | `evidence/p73-rm52-estado-calendario-20-11.txt` |
| 5.13 | `SP.01 IF jogos escolares` | `sports_operator` escreve 0 tabelas e lê 3; as 5 mesas de gestão dos jogos estão fora do papel | `evidence/bu2c-caminhos-de-autorizacao-20-11c.json` |
| 5.14 | `CM.04 IF push/FCM/Edge` | cadeia partida no recetor do service worker (`RM13_CADEIA_PARTIDA 8/14`), medida **noutro byte** | `evidence/rm13-rotas.json` |

### 5.3 Números do registro desactualizados face ao catálogo (`numero_desactualizado`, 1 entrada)

5.16: §5 declara `SC.01` RLS em 176/176 e `SC.02` 475/475 policies. O censo de hoje (`evidence/bu4-digestao-para-documentacao-20-11.json`, campos `catalogo.tabelas_rls_ativa`, `catalogo.tabelas_com_politica` e `autorizacao.politicas_lidas`/`autorizacao.tabelas_total`) dá `tabelas_rls_ativa=183 · tabelas_com_politica=177 · politicas_lidas=495 · tabelas_total=183` — ou seja, **6 tabelas com RLS activo e nenhuma política** (`autorizacao.tabelas_sem_politica`: `push_notify_throttle`, `student_location_notify_throttle`, `student_location_report_throttle`, `student_locations`, `student_pairing_attempts`, `student_pairing_codes`), coisa que o par 176/475 não permite ver. **[Correção 21/11 à citação desta linha:]** o campo `banco_medido_hoje` **não existe** em `bu4-digestao-para-documentacao-20-11.json` — existe em `evidence/bu5-unidades-do-roadmap-20-11.json`, que repete os mesmos quatro valores. Os números não mudaram (183/177/495/183 batem nos dois artefactos e a subtracção 183−177=6 bate com o comprimento de `autorizacao.tabelas_sem_politica`); o que estava errado era o nome do campo, lido de memória em vez de `readdir` + parse do artefacto. A classe passou a ter ficha própria no registro como **PEN-47**, porque o KPI do painel reproduz agora `183/183` e `495/495` e os 6 membros precisam de um endereço.

### 5.4 Provas de conteúdo corridas noutro byte ou inexistentes

Das 15 unidades de régua `conteudo`, **3** têm corrida com pegada do ar servido (5.7, 5.8, 5.9) e **12** não têm nenhuma: `sem_prova_de_conteudo_no_ar=[5.1,5.2,5.3,5.4,5.5,5.6,5.10,5.11,5.12,5.13,5.14,5.15]`. Dentro destas 12:

- `docs/c2r-diario.md` e `evidence/rm12-veredito.json` — `sem_pegada_de_ar` (não declaram a pegada do byte que descrevem);
- `evidence/s21-diary.json` — `noutro_ar@2026-11-13` (a corrida é real, descreve outro byte);
- 5.2, 5.3, 5.4, 5.5, 5.6, 5.12, 5.13, 5.14, 5.15 — nenhuma corrida de conteúdo declarada (campo `corridas.conteudo` vazio no artefacto).

Este é o ponto em que o briefing tem razão de desconfiar da interface: **a presença no menu está medida, a execução sobre o byte servido não está**. As três unidades com prova de conteúdo no byte servido (5.7, 5.8, 5.9) são as únicas que posso chamar «testadas no ar de hoje»; 5.16 e M2 estão testadas no catálogo, não no browser.

---

## 6. O que esta secão entrega para as três seguintes

- BU-7 (inventários mobile/web separados): as colunas Q5/Q6 já vêm por unidade com a unidade de contagem declarada; nada de somar células de unidades diferentes.
- BU-8 (listas de funcionando / com erros / incompletas / ausentes): a lista «com erros» é exatamente o conjunto das 9 unidades `IMPLEMENTADO COM ERROS` mais as 8 entradas `defeito` de §5.2; a lista «incompletas» são as 4 unidades entre `PARCIALMENTE IMPLEMENTADO` e `IMPLEMENTADO, MAS NÃO TESTADO`; a lista «ausentes» tem M2 por unidade e as 3 entradas `prova_ausente` de §5.1 por item, não os 3 `PF` do registro.
- BU-9 (roadmap visual): as percentagens `IF/total` da §15 não podem ser copiadas — 5.9 tem 83 % IF e estado `IMPLEMENTADO E TESTADO`, 5.12 tem 100 % IF e estado `IMPLEMENTADO, MAS NÃO TESTADO`. O roadmap visual vai pelo estado derivado.
- BU-10 (plano de prioridades): as 42 PEN têm `{C:0, A:17, M:14, B:11}`; o critério de ordenação terá de vir dos estados derivados e das 12 contradições, porque a coluna de prioridade do ledger nunca está em C.
