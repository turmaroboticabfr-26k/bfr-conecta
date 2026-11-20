# BU-1 — Mapa estrutural: arquitetura, tecnologias, componentes compartilhados e regras de negócio

Este documento fecha os quatro pontos da parte 1 do briefing que os outros oito não nomeavam: **arquitetura**, **tecnologias utilizadas**, **componentes compartilhados** e **regras de negócio**. Nada aqui é descrição de intenção: cada número vem da varredura do byte servido ou de um artefacto lido em disco, e o instrumento é `scripts/bu1-mapa-estrutural-componentes-e-regras-20-11.mjs` (só-leitura).

O byte varrido é o mesmo certificado por BU-3 e digestado por BU-4:

```
byte=bfr-candidata-v136-secretaria-de-educacao/index.html md5=9e236a23eed978cf7c2a2743d449b307 bytes=3547458 chars=3529307
segmentacao=aberturas_cruas:109 fechos:104 corpos_com_texto:99 externos:5 textuais:5 sem_fecho:0 chars:3049574 soma_chars:3049476 bytes_utf8:3066790 do_produtor_corpos:104 do_produtor_bytes:2175310
colisoes=276 topo=render:33,db:28,user:27,profile:26,role:24,root:22,styles:21,load:20,runtime:18,ensure:17
classes_css=ocorrencias:6851 distintas:1787 sozinhas:1066 topo=eyebrow:319,panel:159,hidden:150,full:97,primary:83,primary-button:83,text-button:82,tap-target:80,panel-heading:80,nav-icon:77
origens=(mesma_origem),bfr-conecta-escola-2026-r7m4q2.pages.bu.app,cdn.jsdelivr.net,fonts.googleapis.com,fonts.gstatic.com,static.cloudflareinsights.com,www.gstatic.com,yyzqoxlkcvqpessypfjo.supabase.co
```

Portões desta corrida: **BU1_MAPA_VERDE 15/0** (`evidence/bu1-mapa-estrutural-componentes-e-regras-20-11.json -> veredictos`). Quatro corridas vermelhas ficaram versionadas antes dela, e são o registro de que as réguas mudaram por defeito meu, não por sorte:

| Corrida preservada (`.txt` em `evidence/`) | bytes md5 | Veredito | O que estava errado |
|---|---|---|---|
| `bu1-mapa-estrutural-componentes-e-regras-20-11-ANTES-de-quatro-reguas-minhas.txt` | 6 396 `e7c86c3c00608e6ce2b895457c41ec6a` | VERMELHO 7/6 | segmentação que engolia corpos (chars 203 212 092 para 99 corpos), duas relações de soma trocadas, um fixture que media atributos em vez de tokens, e o portão de cobertura ainda com o nome velho |
| `bu1-mapa-estrutural-componentes-e-regras-20-11-REGUAS_CERTAS_FALTAM_DOC_09_E_A_UNIDADE_DE_BYTES.txt` | 5 279 `aebbff1e4385fa60651a694e552ed408` | VERMELHO 13/2 | a régua nova de bytes comparava UTF-8 com a grandeza do produtor; e faltava o documento |
| `bu1-mapa-estrutural-componentes-e-regras-20-11-SO_FALTA_O_DOCUMENTO_09.txt` | 5 276 `87aebf4fe8584e0306c5346508c55d54` | VERMELHO 14/1 | uma só falta: os três pontos do briefing ainda sem documento |
| `bu1-mapa-estrutural-componentes-e-regras-20-11-BASE_PARA_O_DOCUMENTO.txt` | 5 902 `6e9d2983450dbe7b00204c80e6d29ab9` | VERMELHO 14/1 | a mesma corrida com as uniões de mesa acrescentadas ao cruzamento; serve de origem às tabelas de §6 |
| `bu1-mapa-estrutural-componentes-e-regras-20-11.txt` (canónica) | 5 802 `4b318f68581100ede7d8143b97861cfb` | VERDE 15/0 | — |

## 1. Arquitetura

Quatro camadas, e nenhuma delas é opcional no pedido:

| Camada | O que é | Como se liga à seguinte | Prova |
|---|---|---|---|
| Borda | Cloudflare Worker `bfr-conecta` servindo um HTML único + 12 assets | responde o byte do cabeçalho deste documento | `01` §1, `audit-publicacao-v136.json` |
| Interface | um documento de 3 547 458 B com 99 corpos de script embutidos e 5 externos | chama o bundle do Supabase carregado por CDN | §2, §3 deste documento |
| Dados | Postgres/Supabase: 183 tabelas, 495 políticas de RLS, 158 funções | toda leitura e toda escrita passa por RLS antes da função | `01` §4, §5 deste documento |
| Auth | Supabase Auth, 28 contas, enum de 15 papéis | o papel vive no JWT e é relido por helper no banco | `03`, `bu2c` |

O que a arquitetura *não* tem, medido: nenhum bundler, **nenhum módulo ES próprio** (a única tag `type="module"` do documento é o beacon externo da Cloudflare), nenhum `import()` dinâmico, nenhum web component (`customElements.define` 0, `attachShadow` 0, `<template id>` 0). A aplicação inteira é um documento com scripts embutidos que se ligam por nome global — é por isso que §3 (colisões de nome) é um capítulo de arquitetura, não de estilo.

## 2. Tecnologias utilizadas

A varredura do vocabulário no byte (zero impresso, não suprimido):

```
vocab=script_src_externo:5 script_embutido:104 modulo_es:1 import_dinamico:0 export_topo:0 web_component_define:0 template_id:0 shadow_attach:0 supabase_createClient:3 supabase_js_no_cdn:2 janela_supabase:6 fetch:7 websocket:0 service_worker:7 local_storage:55 session_storage:23 indexed_db:0 crypto:15 intl:42 blob:14 file_reader:1 innerHTML:528 insertAdjacentHTML:173 createElement:220 querySelector:2285 getElementById:452 addEventListener:606 funcao_async:403 setInterval_ou_timeout:198 style_embutido:49 media_query:257 variavel_css_root:10 meta_csp:1 lang_ptbr:3 manifest_link:1
```

Leitura do que os números dizem:

| Classe | Tecnologia | Estado medido |
|---|---|---|
| Runtime | JavaScript de script clássico: 104 tags `<script>` embutidas, 5 externas, **0** `export` de topo e **0** `import()`; a única `type="module"` é o beacon da Cloudflare | 109 aberturas cruas = 104 honradas + 5 textuais dentro de corpo |
| Dados | `@supabase/supabase-js` **2.50.0** em UMD, carregado de `cdn.jsdelivr.net`, exposto como `window.supabase` | 2 ocorrências do pin, 3 de `createClient`, 6 de `window.supabase` |
| Borda | Cloudflare Workers + Cloudflare Insights beacon | `01` §1 |
| Estilo | CSS embutido em 49 blocos `<style>`, 257 `@media`, 10 `:root`; nenhuma folha `.css` externa no bundle | `vocab`, `folhas_e_liga` do artefacto |
| Estado no cliente | `localStorage` 55, `sessionStorage` 23; **nenhum** `indexedDB` | idem |
| Tempo real | Realtime do Supabase por canal nomeado no bundle; **nenhum** `WebSocket` escrito à mão (0) | idem, `01` §5 |
| Render | `innerHTML=` 528, `insertAdjacentHTML` 173, `document.createElement` 220; `querySelector(All)` 2 285, `getElementById` 452 | idem |
| Formato | `Intl.*` 42 (data e numeração em pt-BR), `new Blob` 14, `FileReader` 1, `<canvas>`/`getContext` 5 | idem |
| Offline | registo de service worker próprio: `sw-v4.js?v=45`, com ouvinte `controllerchange` e UI de instalação | 7 ocorrências de `serviceWorker`; **o ficheiro `sw-v4.js` não está no byte varrido** |
| Impressão e exportação | não há biblioteca: o byte contém **4 documentos HTML completos como template literal** (5 tags `<html>` sobre 1 documento servido), um por vista exportada — badge, tabela, documento de actividade | `<!doctype html>` ×4 dentro de `const html = \`…\`` |
| Segurança de carga | 1 meta `Content-Security-Policy` com `'unsafe-inline'` em `script-src`; `lang="pt-BR"` em 3 tags | `vocab.meta_csp`, `vocab.lang_ptbr` |
| Offline | registo de service worker próprio: `sw-v4.js?v=45`, com ouvinte `controllerchange` e UI de instalação | 7 ocorrências de `serviceWorker`; **o ficheiro `sw-v4.js` não está no byte varrido** |
| Segurança de carga | 1 meta `Content-Security-Policy` com `'unsafe-inline'` em `script-src`; `lang="pt-BR"` | `vocab.meta_csp`, `vocab.lang_ptbr` |

Duas coisas têm de ficar escritas como ficaram. Primeira: a régua de bytes que escrevi primeiro dizia `bytes_utf8:3066790` contra `bytes_dos_corpos:2175310` do produtor, e estava errada dos dois lados — o número do produtor chamado `bytes_de_todo_script` (3 049 476) é **contagem de caracteres**, não bytes UTF-8: os meus 3 049 574 caracteres joins são 98 newlines a mais, e 3 049 574 − 98 = 3 049 476 bate exacto. A relação que sustenta o portão é dupla: `soma_chars == bytes_de_todo_script` **e** `bytes_de_todo_script − bytes_sem_identidade == bytes_dos_corpos` (3 049 476 − 874 166 = 2 175 310). Segunda: `script_src_externo` é 5 e o bundle **não é auto-suficiente** — três dos cinco são ficheiros próprios (`bfr-responsive-presentation.js?v=14`, `bfr-teacher-arrivals.js?v=2`, `bfr-teacher-audit.js?v=1`) que vivem ao lado do HTML e não entram no md5 deste byte.

## 3. Componentes compartilhados

Definição usada, porque «compartilhado» sem limiar é gosto: **função declarada no byte e invocada em dois ou mais corpos de script distintos**. A unidade de corpo é a do produtor (`aberturas_honoradas`), não o número de linhas.

```
componentes=distintos:1720 declaracoes:2483 sem_chamada:62 num_corpo:1361 dois_ou_mais:297
mais_usados=observe:50c/59x,esc:48c/1601x,render:34c/319x,db:30c/331x,setInterval:30c/43x,matches:28c/135x,profile:28c/54x,user:27c/273x,load:24c/131x,insert:24c/130x,role:24c/127x,root:22c/114x
```

| Componente | Corpos que o invocam | Invocações | Declarações do mesmo nome |
|---|---|---|---|
| `observe` | 50 | 59 | 2 |
| `esc` | 48 | 1 601 | 1 |
| `render` | 34 | 319 | 33 |
| `db` | 30 | 331 | 28 |
| `matches` | 28 | 135 | 2 |
| `profile` | 28 | 54 | 26 |
| `user` | 27 | 273 | 27 |
| `load` | 24 | 131 | 20 |
| `insert` | 24 | 130 | 1 |
| `role` | 24 | 127 | 24 |
| `root` | 22 | 114 | 22 |
| `normalize` | 19 | 153 | 2 |

As três classes particionam os 1 720 nomes declarados: **62** nunca são invocados no byte, **1 361** só num corpo, **297** em dois ou mais. O `esc` é o componente compartilhado mais usado do aplicativo (1 601 invocações, declarado uma única vez) e é a única barreira medida entre dado do banco e `innerHTML` — a fuga de markup depende dele, o que é um risco de arquitetura, não um elógio.

## 4. Identidade: colisões de nome, `id` repetidos e código morto

| Classe | Medido | Consequência no runtime |
|---|---|---|
| Nomes declarados mais de uma vez | **276** nomes, 763 declarações excedentes (2 483 − 1 720) | em script clássico, a última declaração do nome vence; `render` tem 33, `db` 28, `user` 27, `profile` 26, `role` 24, `root` 22 |
| `id` duplicados no documento | **20** nomes, 21 ocorrências excedentes (320 − 299); pior: `gradeTerm` 3 vezes | `getElementById` (452 chamadas) devolve o primeiro; o segundo elemento fica inalcançável pelo id |
| Funções nunca invocadas no byte | **62**, entre elas `activateApplicationModules`, `scopedLoader`, `refreshAfterAuth`, `syncMode`, `showParentState`, `lancamentos`, `gateAlerts` | ou são chamadas por nome composto em tempo de execução, ou são código morto; o byte não distingue — `01` §2 já mediu 3 identificadores de secção formados em runtime |

Estas três linhas são a razão pela qual o §1 disse que colisão é arquitetura: o aplicativo não tem fronteiras de módulo, tem **nomes globais partilhados por 99 corpos**, e 276 desses nomes são declarados mais de uma vez.

## 5. Regras de negócio no banco

```
politicas={"total":495,"sem_filtro":0,"r_leitura":231,"a_insercao":75,"w_atualizacao":57,"d_exclusao":20,"estrela_tudo":112} funcoes={"total":158,"security_definer":145,"definer_com_search_path":145,"prefixo_bfr":119}
mecanismos=literal_cast:55 literal_nu:143 helper:359 auth_uid:264 jwt_claim:2 join_de_ponte:126 true_total:1 sem_porta_de_papel:2 nenhum:0 soma=952 marca_do_produtor=952
helpers=63 com_cargo=50 sem_cargo=13:bfr_chat_can_access_message,bfr_chat_thread_is_empty,bfr_current_teacher_id,bfr_family_can_view_aee,bfr_pedagogical_can_manage_student,bfr_profile_in_my_schools,bfr_rls_session_role,bfr_school_in_municipal_scope,bfr_school_in_own_school_scope,bfr_staff_role,bfr_support_request_matches,bfr_teacher_can_manage_class_subject,sports_role_allowed topo=internal_chat_can_access_room:8,internal_chat_is_staff:8,bfr_psychology_record_access:7,is_approved:7,bfr_collab_can_profile:6,bfr_collab_can_project:6,bfr_collab_can_task:6,bfr_staff_can_manage_student_scope:6
```

A regra de negócio do BFR Conecta vive em **495 políticas de RLS** sobre 183 tabelas. As cinco classes particionam o total lido (231 + 75 + 57 + 20 + 112 = 495) e `sem_filtro` é 0: nenhuma política do catálogo deixa passar sem condição. A regra mais larga do sistema é `estrela_tudo` — 112 políticas com comando `*`, que dão um único acesso para leitura, escrita e apagamento — e o mecanismo mais estreito é `jwt_claim`, com **2** marcas que lêem o papel directamente do token.

Como a política descobre *quem* é o utilizador (unidade: **marcas de mecanismo**, 952 marcas sobre 495 políticas; 286 políticas usam mais de um mecanismo, campo `politicas_com_varios_mecanismos`):

| Mecanismo | Marcas | O que significa em linguagem de negócio |
|---|---|---|
| `helper` | 359 | a política chama uma função `bfr_*`/`*_can_*` que decide o cargo |
| `auth_uid` | 264 | «a linha é minha»: comparação com `auth.uid()` |
| `literal_nu` | 143 | papel escrito à mão dentro da política, sem cast ao enum |
| `join_de_ponte` | 126 | decisão por tabela intermediária (vínculo matrícula/professor/escola) |
| `literal_cast` | 55 | papel escrito com cast ao enum |
| `sem_porta_de_papel` | 2 | política que não nomeia papel nenhum: `instagram_posts\|instagram_posts_public_select\|r` e `support_services\|bfr_support_services_read\|r` |
| `jwt_claim` | 2 | leitura directa da afirmação do token |
| `true_total` | 1 | política cuja condição é sempre verdadeira |
| `nenhum` | 0 | classe vazia, impressa porque vazia |

As **63 funções-helper** nomeadas pelo caminho de autorização são o cérebro da regra: 50 nomeiam cargos explícitos na régua larga e **13 não nomeiam nenhum** — `bfr_staff_role`, `bfr_rls_session_role`, `bfr_current_teacher_id`, `bfr_school_in_municipal_scope`, `bfr_school_in_own_school_scope`, `bfr_profile_in_my_schools`, `bfr_family_can_view_aee`, `bfr_pedagogical_can_manage_student`, `bfr_teacher_can_manage_class_subject`, `bfr_support_request_matches`, `bfr_chat_can_access_message`, `bfr_chat_thread_is_empty`, `sports_role_allowed`. O nome promete um papel que a régua não encontra no corpo (`cargos_por_regua_larga` vazio nos treze): `bfr_family_can_view_aee` e `bfr_pedagogical_can_manage_student` dizem *family* e *pedagogical* e devolvem zero cargos medidos, ou seja a decisão não está onde o nome aponta. As mais largas alcançam 8 papéis (`internal_chat_can_access_room`, `internal_chat_is_staff`), e a profundidade medida mostra o encadeamento real: `bfr_collab_can_task` → `bfr_collab_is_staff`/`bfr_collab_is_manager` → `bfr_staff_role`, três níveis antes de qualquer linha ser lida. `is_approved` (7 papéis, dependente de `current_role`) é a regra que atravessa os fluxos de candidatura.

## 6. Regras de negócio no cliente, e o cruzamento

No byte, o papel é comparado como string literal **1 645** vezes. Por papel (ocorrências do literal em posição de comparação, lista ou igualdade):

```
cliente=comparacoes:1645 portas=pending:19 parent:23 student:16 pedagogical:30 developer:55 monitor:5 gatekeeper:4 coordinator:11 secretary:8 aee:7 director:8 psychology:7 social_work:4 sports_operator:5 education_supervisor:4
cruzamento_por_papel=pending:cliente19/pares2/distintas1 parent:cliente23/pares20/distintas20 student:cliente16/pares21/distintas21 pedagogical:cliente30/pares132/distintas87 developer:cliente55/pares309/distintas166 monitor:cliente5/pares21/distintas19 gatekeeper:cliente4/pares16/distintas16 coordinator:cliente11/pares234/distintas135 secretary:cliente8/pares125/distintas75 aee:cliente7/pares133/distintas83 director:cliente8/pares225/distintas131 psychology:cliente7/pares29/distintas16 social_work:cliente4/pares28/distintas16 sports_operator:cliente5/pares3/distintas3 education_supervisor:cliente4/pares20/distintas16
```

| Papel | Portas no byte | Pares mesa-lado no banco | Mesas distintas no banco |
|---|---|---|---|
| developer | 55 | 309 | 166 |
| pedagogical | 30 | 132 | 87 |
| coordinator | 11 | 234 | 135 |
| director | 8 | 225 | 131 |
| secretary | 8 | 125 | 75 |
| aee | 7 | 133 | 83 |
| psychology | 7 | 29 | 16 |
| student | 16 | 21 | 21 |
| parent | 23 | 20 | 20 |
| education_supervisor | 4 | 20 | 16 |
| monitor | 5 | 21 | 19 |
| gatekeeper | 4 | 16 | 16 |
| social_work | 4 | 28 | 16 |
| sports_operator | 5 | 3 | 3 |
| pending | 19 | 2 | 1 |

Unidade: «pares mesa-lado» conta uma mesa duas vezes se o papel a pode ler **e** escrever (por isso developer chega a 309 num catálogo de 183); «mesas distintas» é a união, e o portão `todo_papel_recebe_uma_classe_de_cruzamento...` obriga a que união ≤ pares ≤ catálogo.

**Leitura honesta do cruzamento:** os 15 papéis caem na classe `nos_dos_lados` e as três classes de exceção (`so_no_cliente`, `so_no_banco`, `em_nenhum_lado`) estão vazias. Isso **não** prova defesa em profundidade: a régua conta o literal do papel no byte, não o efeito de uma porta. O `pending` é o exemplo da diferença — 19 comparações no byte contra 1 mesa no banco; a contagem de portas *reais* por papel no ar é a do censo de browser (`§AI.28`, `evidence/bu5-portas-do-ar-20-11.json`), e onde as duas se contradisserem manda a do browser. A classe vazia que importa está noutro lado: 6 tabelas do catálogo não são alcançáveis por papel nenhum e 2 políticas não têm porta de papel (`01` §3).

## 7. Cobertura dos 12 pontos da parte 1 do briefing

| Ponto do briefing | Onde se esperava | Onde a palavra aparece | Estado |
|---|---|---|---|
| estrutura do projeto | 01, 02 | 01, 02 | COBERTO |
| arquitetura | 09, 01 | 09, 01 | COBERTO |
| tecnologias utilizadas | 09 | 09 | COBERTO |
| banco de dados | 01, 09 | 01, 09 | COBERTO |
| perfis | 03 | 03 | COBERTO |
| rotas | 01, 02 | 01, 02 | COBERTO |
| abas | 01, 05 | 01, 05 | COBERTO |
| módulos | 02 | 02 | COBERTO |
| funcionalidades | 02, 06 | 02, 06 | COBERTO |
| integrações | 01 | 01 | COBERTO |
| componentes compartilhados | 09 | 09 | COBERTO |
| regras de negócio | 09 | 09 | COBERTO |

A régua não foi fechada para dar verde: além dos doze pontos pedidos, o instrumento define um décimo terceiro inventado — uma linha de montagem de artefactos de cobre que não existe em lado nenhum do briefing — e varre os nove documentos à procura da sua agulha, que vive apenas no script (`scripts/bu1-mapa-estrutural-componentes-e-regras-20-11.mjs:236`). Na corrida canónica o resultado é `controlo_negativo_da_cobertura.encontrados = []`. Que a agulha não esteja escrita neste documento é parte da régua, e aprendi-o à custa de um vermelho: esta frase citava a agulha por extenso, e a corrida de confirmação que correu com o documento já fechado deu **VERMELHO 14/1** com `encontrados = ["09"]` — um documento que nomeia a agulha do controlo negativo torna-se o ofensor que o controlo procurava. A corrida ficou versionada como `evidence/bu1-mapa-estrutural-componentes-e-regras-20-11-APÓS-FECHO-DO-DOC-09.txt` (5 883 B md5 `1854049d68dd84c78df0ccf0a70713d7`, JSON 38 475 B md5 `1774368d0e8e1de14a953b6030aa6548`) e a frase foi re-escrita sem a agulha. A re-corrida `evidence/bu1-mapa-estrutural-componentes-e-regras-20-11-CONFIRMA-SEM-AGULHA-NO-DOC.txt` (5 802 B md5 `b2b99d898d86b99899e8751f96ed1fe4`) voltou a dar **VERDE 15/0** com `encontrados = []`, e o seu corpo é idêntico ao da canónica fora dos campos de corrida (19 662 caracteres comparados programaticamente); os dois diários diferem em **uma** linha, a do tempo (`ms=1710` contra `ms=1685`). Uma régua que sabe chumbar o ponto inventado é o que dá valor aos doze COBERTO acima. O portão correspondente é `nenhum_ponto_do_briefing_fica_sem_cobertura_e_o_ponto_inventado_e_chumbado`, e ele mesmo tinha estado VERMELHO na corrida anterior (`evidence/bu1-mapa-estrutural-componentes-e-regras-20-11-SO_FALTA_O_DOCUMENTO_09.txt`, `14/1`): «tecnologias utilizadas», «componentes compartilhados» e «regras de negócio» não tinham documento até esta seção existir.

## 8. O que este documento não prova

- Não executa nada: nenhuma das contagens de componente ou de porta foi observada em runtime; o byte é estático e as 1 645 comparações de papel são texto, não caminhos tomados.
- Não mede a *qualidade* das 495 políticas: mede quantas são, com que comando e por que mecanismo; a lista de tabelas sem política e das 112 `*` está em `01` §4 e no registro das PEN.
- Não cobre o `worker.mjs` além do que `01` §1 mede (version, bytes, headers).
- Os ficheiros externos (`bfr-responsive-presentation.js`, `bfr-teacher-arrivals.js`, `bfr-teacher-audit.js`) não entram no md5 varrido nem nesta varredura: os seus 3 corpos não foram contados nos 99.
- O que o ar mostra com dados verdadeiros por papel continua a ser o que `01` §8 declara em falta: só 3 papéis têm passada autenticada clicada com vínculo real.

## 9. O verificador deste documento

As linhas de diário acima foram copiadas por instrumento (`scripts/confere-bu1-doc-20-11.mjs`, só-leitura), não dactilografadas, e o mesmo instrumento confere o resultado: `A` exige que as treze linhas apareçam uma só vez cada, dentro de bloco de código, byte-a-byte do `.txt`; `B` que o veredito citado seja o medido; `C` que cada número citado no texto resolva num campo do artefacto JSON; `D` que a grelha de todas as tabelas seja constante, contada com o des-escapamento primeiro; `E` que o documento não carregue escrita proibida nem cadeia de ligação; `F` que cada caminho de `evidence/` citado exista em disco; `G` que a corrida `BASE_PARA_O_DOCUMENTO` tenha o mesmo corpo da canónica fora dos campos de corrida e da secção de cobertura; `H` que a tabela de §7 seja o array `cobertura_do_briefing` linha a linha e que o controlo negativo tenha chumbado o ponto inventado; `I` que as cinco linhas da tabela de corridas mostrem os bytes, o md5 e o veredito medidos no ficheiro.

A primeira corrida do verificador deu **CONF_BU1_VERMELHO 8/1**, e a falta era minha: `D_a_grelha_de_todas_as_tabelas_e_constante` contava oito colunas na linha 121, porque as triplas `mesa\|política\|comando` de §5 usavam o caractere de coluna sem escape e partiam a linha. A versão dessa corrida ficou versionada em `evidence/confere-bu1-doc-20-11-VERMELHO-D-grelha.txt`. A segunda corrida voltou a dar **8/1**, agora com defeito na sonda e não no documento: `F` recortava os caminhos citados com uma classe de caracteres sem letras acentuadas, por isso lia `…-20-11-AP` como caminho e queixava-se de um ficheiro que nunca existiu; o regex passou a aceitar as letras com acento e a sonda confirma os seis caminhos citados — os dois com `Ó` e `Ã` resolvem em disco. Um verificador cujo vermelho é dele próprio tem de ser corrigido na régua, nunca no documento. A corrida vermelha da sonda ficou em `evidence/confere-bu1-doc-20-11-VERMELHO-F-caminho_com_acento_partido_pelo_regex.txt`; depois das duas correcções a corrida é **CONF_BU1_VERDE 9/0**, com a captura final guardada fora do repositório (stagear a captura faria o portão do índice varrer-se a si mesmo) e os `9` resultados linha a linha no ficheiro.
