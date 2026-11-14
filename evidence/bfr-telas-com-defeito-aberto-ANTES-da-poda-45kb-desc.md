---
name: bfr-telas-com-defeito-aberto
description: BFR Conecta screens audit — realtime: publication em 69 tabelas e 0 canais envenenados (25/10, §V.8) — ar em **v119** desde 13/11 03:45Z (shell 3.489.474 B, md5 `a1969cdf023042e7d2a91e7ed9333a05`, CACHE `bfr-conecta-v119`; delta sobre a v118 = 1 token: o embed volta a ser `sports_schools(name)`, RM-1.6/PEN-31), logo **todas as medições de tela feitas nos bytes v118 continuam válidas** e a única tela que muda é a Supervisão — que ainda não foi pintada logada. Ar anterior **v118** medido 12/11 (shell 3.489.467 B, md5 `ae59d35346b685b2fbf9d18ade4fa5cd`, CACHE `bfr-conecta-v118`, byte-idêntico a `ar-shell.html`; v114–v118 subiram 08/11; a v116 tinha perdido o embed → RM-1.6/PEN-31). Ar anterior **v113** (deployment `c47cd5b4-ec5d-46ed-8743-dfad27cf4160` / version `e769ff4a-e253-4afa-ad8a-a8aa1ef19c3e`, criado 2026-11-05T18:27:41.549675Z — **v113 PUBLICADA §EG**: Brief BU da Supervisão Educacional, **dois corpos embutidos e ZERO assets** (`No updated asset files to upload`), HTML `edd0232e…`/3.459.408 → `b1993940f1c1973300f59e460aab688b`/3.531.006 B (Δ +71.598 = soma dos 9 hunks), SW `647919e9…`/5.990 B com CACHE `bfr-conecta-v113` (1 linha), worker `2a990cbb…`/3.601.210 B (`linhas_mudadas:[0,1]`), rp/FCM/manifest byte a byte os congelados, **677 portões / 0 vermelhos** `V113_PUBLICADA_OK`; prova no cliente em Chrome limpo 87 portões emitidos PELO navegador (armadilha 413), marcos `aba_supervisao` 1 / `deferred` 21 / `dirsup` 96 / `sup_panel` 13, e **no arranque público nenhum módulo adiado executa** (`BFRSecretaryCentral`/`BFRDirectionSupervision` = `undefined`, 413f); **a aba foi pintada autenticada e o ciclo S16 FECHOU 06/11** (§EI: S16-3 SECRE 32/0, S16-4 DIR 59/0, S16-5 SQL 37/0, S16-6 INT 24/0+1 achado, design 88/0, S16-7 BASELINE_RESTAURADA; 2 achados de produto abertos — isolamento por escola no REST e anexo na Direção; relatório §19 em `relatorio-supervisao-v113.md`); ar anterior **v112** (deployment 08fd2ee1-ebd4-413c-9752-639951fa7a75 / version fe23ae56-3c40-4342-b0a1-d6aea2517b1f, criado 2026-11-04T04:18:04.273361Z — **v112 PUBLICADA §EC**: braço h3 do item 77, rp b52434a4…/56.769 B, worker dd7abbbb…, SW e9cf3c3f… com CACHE bfr-conecta-v112, HTML edd0232e… intacto, 180 portões e consolidado 21/21 V112_PUBLICADA_OK; ar anterior v111 (deployment `b44a22e1-b3c0-4afb-9c56-933c1475c9cd` / version `6384a54c-ac61-4efb-8b2a-1214bf2aa22f`, criado 2026-11-03T21:09:21.864963Z — **v111 PUBLICADA §DY + censo vivo RODADO §DZ: o afunilamento `a1c` está no ar e a fome dos 60 ms **cura-se na rua** (`V111L_CENSO_OK` + `CENSO_A1C_OK`: 6/6 boots @390 à primeira, censo do rp `35 observe()/13 nós/1 instância/0 repetições/0 subtree em raiz/4 tardios/0 decorados`, repouso e tick `0/0/0`, `teto 0` contra 6 na v104; **resta PRODUTO**: os descendentes do `.dot` não estão no read-set (`coberto false`, `alvoExiste true`) — (b) prazo fixo × (c) teto de 250 ms como contrato** — sobe **UM** asset, rp `17fef579…`/52.979 → `4223b16411565ec93a35ec3de7ff77e4`/56.467 B (+3.488 B, 2 blocos, 679→741 linhas), SW `9b8a71d7…` CACHE `bfr-conecta-v111` (1 linha, `linhas_fora_sw_mudadas 0`), **HTML byte a byte o da v110** (`edd0232e…`/3.459.408 B, delta 0), worker `adbe32f4…`/3.528.338 B, `V111_PUBLICADA_OK` **209 portões / 6 categorias / 0 vermelhos** (`audit-publicacao-v111.json`), HTTP 32 + cliente 18 (`caches.keys()=["bfr-conecta-v111"]`, 0 erros de app); reversão = republicar `worker-deploy-v110` (`4e7b5ab3…`), exige OK novo); o ar anterior era **v110** (deployment `97389de2-1b02-4ab1-b47b-69616ce5b6e4` / version `f5040a4b-a24d-40af-a8d7-19c2c5f53068`, criado 2026-11-03T12:32:05.697971Z — **v110 PUBLICADA §DU: item 77 frente do TETO no ar, FOME continua aberta** — só o RPJS sobe (`2e16513b…`→`17fef579…`/52.979 B, Δ −1.709 B; `noTeto` chama o `sync()` inteiro e caem `semBarra` + o teto de 3 remontagens), **HTML byte a byte o da v109** (`edd0232e…`/3.459.408 B), SW `f947d7aa…` CACHE `bfr-conecta-v110` (1 linha), worker `4e7b5ab3…`/3.528.338 B (MESMOS bytes do v109, md5 novo), **44 portões / 6 categorias / 0 vermelhos** (`audit-publicacao-v110.json`), HTTP 5/5 com as 20 marcas herdadas + 6 do 91 + 10 do 87 + `gateLegacyMode()` 22 reproduzidas e `PORTÃO DO CLIENTE v110: VERDE` (cache única v110, HTML/rp byte a byte na cache, Front A vivo, login nas duas bandas, 0 erro novo); **NÃO rodado: censo vivo autenticado do churn na v110**; reversão = republicar `worker-deploy-v109` (`63336414…`), exige OK novo); o ar anterior era **v109** (deployment `e5eaf5ad-98ee-48f0-a112-0c9aee145ece` / version `75ae143d-c14b-47f7-a439-763885d6a2c2`, criado 2026-11-03T04:25:41Z — **v109 PUBLICADA §DP: item 91 FECHADO na frente do cliente — a CE com 3 hunks E1/E2/E3 dá ao `load()` do `BFRStudentSpace` uma guarda de voo (`if (state.loading) return;`), condiciona o pintor de erro a `(!state.loaded || !state.linked)` e escapa o banner parcial por `esc()`; `/` `edd0232e…`/3.459.408 B (**+180 B**, script envolvido 27.718→27.898 chars), SW `57f31a70…` CACHE v109 (1 linha), worker `633364146b…`/3.528.338 B, RPJS `2e16513b…` intacto, 6/6 portões (`audit-publicacao-v109.json`), bancada `I91_BANCADA_OK` **9/9** (B7 prova que `load(true)` continua forçando; B8 caminho feliz byte idêntico), `PORTÃO DO CLIENTE v109: VERDE` com **expectativa derivada == assumida**; **censo vivo autenticado com conta `student` RODADO na §DQ (03/11, `I91L_CENSO_OK` 46/46 + `BASELINE_RESTAURADA`, nada publicado): chamador dos voos atribuído por pilha ao bloco 79 `bfr-student-today` (@22763 `refresh()` ← @22781 `sync()` ← @22802 `boot()` ← @22808; 2º chamador = shell `guardianStudentLinksState` @10859/`Promise.race` @10945 em 3 dos 4 braços), lançador do `catch` atribuído @20339 por lançamento síncrono forçado em `school_events`, `Tentar novamente` provado por clique real pelo handler @20409; a E1 barra o voo mas não o chamador (`delta_E1:1` em 3/3 braços)**; reversão = republicar `worker-deploy-v108`); o ar anterior era **v108** (deployment `560e09c3-eb1e-45c9-bde3-e7fc62095a8d` / version `81345f0e-7f4b-4e13-8a29-951abce3127b`, criado 2026-11-03T03:07:40Z — **v108 PUBLICADA §DN: item 86 (D7, nomes por superfície) fechado na frente do nome — C86 com 2 hunks K1/K2 instala `displayName()` (custom → full_name → user_metadata → parte local do e-mail → «pessoa») e faz o dock e o `renderSpace` derivarem igual ao shell; `/` `ab8023e7…`/3.459.228 B (+301 B), SW `5c52f938…` CACHE v108, worker `c769efbf…`, RPJS `2e16513b…` intacto, 6/6 portões (`audit-publicacao-v108.json`), bancada `I86_BANCADA_OK` 3/3 (B3 5/5 braços iguais ao oráculo × controle 4/5), `PORTÃO DO CLIENTE v108: VERDE`; censo vivo autenticado da cadeia `displayName` NÃO rodado; `display_name_custom` sem escritor no fluxo `savePreferredName`; hero/Espaço seguem com A5 `students.official_name` (decisão de produto); `'Família BFR'` 4→2; item 85/87/84/gate intactos; reversão = republicar `worker-deploy-v107`, e a CE saiu na v109); o ar anterior era **v107** (deployment `ca907a89-87ef-42c5-aed2-b8da344b38a3` / version `cc151761-6acc-43ee-b474-f506dafdcb61`, criado 2026-11-03T02:08:18Z — **v107 PUBLICADA §DL: item 85 fechado na frente do conteúdo inventado — Escola, dock e Aprender param os arrays hardcoded e passam a ler `announcements`/`school_events`; `/` `5e7cc19b…`/3.458.927 B (+1.393 B, 8 hunks), SW `e54d1bde…` CACHE v107, worker `c169e7c7…`, 6/6 portões (`audit-publicacao-v107.json`), bancada `D67_BANCADA_OK` 7/7, `PORTÃO DO CLIENTE v107: VERDE`; censo vivo autenticado do carregador novo NÃO rodado; restam do D6 o XP/Trilhas/Atividades/Conquistas do Aprender e a falha silenciosa `@9392` da Home; C86 publicada pela v108 e a CE pela v109 (item 91 fechado na frente do cliente)); o ar anterior era **v106** (deployment `363ecfd8-1606-4460-a2f9-a318a71872dc` / version `1beda208-4c82-4fc7-80df-b3e0e715fc73`, criado 2026-11-02T21:05:09Z — **v106 PUBLICADA §DH: item 87(a) fechado, a Portaria passa a dizer o que o código faz no modo contínuo**; `/` `558ec30e…`/3.457.534 B (+760 B, 12 hunks), SW `0c619199…` CACHE v106, worker `097dad8f…`/3.526.460 B, RPJS `2e16513b…` intacto, 6/6 portões; bancada `I87_BANCADA_OK` 16/16; `PROVA HTTP V106: VERDE` + `PORTÃO DO CLIENTE v106: VERDE`; **§DI (02/11) `I87L_LIVE_OK` + `BASELINE_RESTAURADA`: prova viva na tela AUTENTICADA com `gatekeeper` sintético — 7 textos do contínuo renderizados @1280 (9 velhos ausentes), @390 com as 2 frases do status provadas no textContent cru (barra `display:none` pelo CSS mobile, desenho pré-existente), 6 capturas e E2E do item 79 intacto; resta só câmera real/crachá físico**; (b) turno/calendário real segue projeto de produto); o ar anterior era **v105** (deployment `611d8063-57fd-4f51-b3bd-29dad2c3bef8` / version `31fc926d-92c0-4bec-9977-d60fe08ce0c0`, criado 2026-11-02T20:27:42Z — **v105 PUBLICADA §DF: item 84 fechado, `escola-historia` sai da whitelist dos 10 papéis e o handler do coordenador vai junto**; `/` `4d03c882…`/3.456.774 B (−247 B, 11 hunks), SW `9ce6eb1d…` CACHE v105, worker `fd95fc4d…`/3.525.699 B, RPJS `2e16513b…` intacto, 6/6 portões; bancada `I84_BANCADA_OK` 14/14, 432 probes/72 restaurações; `PROVA HTTP V105: VERDE` + `PORTÃO DO CLIENTE v105: VERDE`); o ar anterior era **v104** (deployment `29dc982e-151c-4bde-a708-1a703c0cd898` / version `f5d03606-d150-4bf7-86cb-c7ed292dcba3`, criado 2026-10-31T03:29:25Z — **v104 PUBLICADA §DB: Front A do item 77, o chrome mobile monta no `bfr:app-ready`, sem esperar o timer**; `/` `3fcccf9b…`/3.457.021 B **intacto**, RPJS `2e16513b…`/54.688 B (+21 B, 1 hunk na linha 697), SW `0ab095dd…` CACHE v104, worker `8b0dc87a…`/3.525.947 B, 6/6 portões; bancada `FRONT_A_BANCADA_OK` 17/17 — monta no mesmo tick 12/12 × 0/12 do controle; **censo vivo V104L §DC `CENSO_V104_OK`: dispatch @1280 provado (`navAntes=false→navDepois=true`, +1 ms, pilha `sync` direto) × timer +78 ms da v99c, mas no @390 o teto (`pintaSozinho`) vence antes do evento 6/6 e os timers de 60 ms seguem disparando 3–4 %**); o ar anterior era **v103** (deployment `91217a55-c9f1-4741-a08b-56a3197cc908` / version `5c096608-1644-48cc-93f8-da43737e4a25`, criado 2026-10-31T01:14:22Z — **v103 PUBLICADA §CU: item 79(ii), o wrapper `registerGateCheckin` passa a repassar `intake_source`/`target_shift`/`exception_reason` à RPC v1 de 6 args**; `/` `3fcccf9b…`/3.457.021 B (+109 B, 1 linha na 25.919), SW `508820a4…` CACHE v103, worker `c0b3e244…`/3.525.947 B, 7/7 portões; bancada `I79C_BANCADA_OK` 34/34 — controle 3 chaves no fio × candidata 6; **leitura viva das 3 colunas FEITA em 30/10 §CV `I79D_LIVE_OK`** (`intake_source='manual'` e `exception_reason` digitado persistidos; `target_shift` NULL; baseline restaurada); faltam só o crachá FÍSICO real e o modo legado permanente (o `source` fixo foi corrigido em 31/10 no §CW, `I79E_APLICADA_OK` + `I79E_VIVO_OK`, sem backfill); a DDL dos 3 metadados foi APLICADA em 30/10 §CS `I79B_APLICADA_OK` — 3 colunas text em `gate_checkins` + RPC de 6 args com defaults, ACL reemitida); o ar anterior era **v102** (deployment `866340d5-779e-4439-82fe-33d0fdc3f0a7` / version `5270c875-f065-4ca3-bf40-eec18fabdb8d`, criado 2026-10-30T18:45:18Z — item 79: a portaria nova passa a chamar a RPC `register_gate_checkin` v1, a v2 `register_gate_checkin_v2` nunca existiu (404 PGRST202), provada viva §CR `T79_E2E_OK`; `/` `1633fef4…`/3.456.912 B (−79 B), SW `6ba9a785…` CACHE v102, worker `22d623dd…`/3.525.838 B, 7/7 portões, bancada 37/37); o ar anterior era **v101** (deployment `77aa64cb-a617-4d1f-9328-266baa26bed6` / version `5b4c4312-f977-4ac3-8f64-2f92c76687e8`, criado 2026-10-30T17:45:17Z — item 77 frente A, o toast «Conquista desbloqueada» para de repetir a cada boot; `/` `aab12ce4…`/3.456.991 B, SW `a021b57e…` CACHE v101, worker `0a2a530f…`/3.525.919 B, 7/7 portões, §CO; bancada 1/0/0 e 4/0/0); o ar anterior era **v100** (deployment `ed75ae23-f6fb-4886-9f57-dfed212f427e` / version `023de8b9-83f5-44c4-82dd-af0cb0c0ff33`, criado 2026-10-30T13:17:00Z — **v100 PUBLICADA: §BZ-3/item 74, o clique em rota do aluno assenta; prova viva 23/23 no §CK (390 127–130 px, 1280 90 px)**; `/` `2bbeb79c…`/3.456.942 B, SW `c38a6bc0…` CACHE v100, worker `c7fd872d…`/3.525.870 B, `AUDIT_V100_8_DE_8`); o ar anterior era **v99** (deployment `676ae943-6192-4789-a237-c5b9af3e0a31` / version `6622fb53-01f8-4ab3-8e66-140bbb7ab3d4`, criado 2026-10-30T08:00:00Z — **v99 PUBLICADA: item 77, guarda de valor no painel da portaria** (§CH): `/` `fd830f35…` 3.455.192 B (+95 B, 2 hunks), SW `115124996a…` cache `bfr-conecta-v99` (só a linha 1), FCM `fcfa8720…`/manifest `68d15518…`/rp `98a4aca7…` intactos, worker.mjs `77e178b2…` 3.524.093 B, 6/6 portões em `audit-publicacao-v99.json`, `PORTÃO DO CLIENTE v99: VERDE`; **censo vivo pós-v99 RODADO em 30/10 (§CI, `CENSO_V99_OK`): 6/6 boots @390 + controle @1280, `childList` sob `#monitorView` e sob a lista/painel da portaria 0/6 no repouso e 0/6 no tique com o tique de 5 s provado, resta só o `class` do toast (decisão de produto) e a fome dos 60 ms, `BASELINE_RESTAURADA`**; o ar anterior era **v98** (deployment `f223f7d7-6060-4855-96b2-8d49d36e48ce` / version `50d04b94-4e7a-45d3-af0b-37c2c1b68a7d`, criado 2026-10-30T06:42:03Z — **v98 PUBLICADA: item 77, guarda de valor no observer inline do logo da LIA** (§CD): `/` `bc95f661…` 3.455.097 B (+182 B, 1 hunk), SW `48845c8a…` cache `bfr-conecta-v98` (só a linha 1), FCM `fcfa8720…`/manifest `68d15518…`/rp `98a4aca7…` intactos, worker.mjs `b0d4a441…` 3.523.997 B, 6/6 portões em `audit-publicacao-v98.json`, `PORTÃO DO CLIENTE v98: VERDE`, guardas 1/1/4/1; bancada offline 24/24 (§CC); **censo vivo em repouso RODADO em 30/10 (§CE, `V98C_CENSO_VIVO_OK`): 6/6 boots @390 + controle @1280, `src`/`alt` 0/6, legado/FAB 0, `BASELINE_RESTAURADA`**; a fome dos 60 ms persiste (t60 1–4 de 96–100) e o item 77 segue aberto só na frente de produto — 1 `childList` sob `#monitorView` em 6/6 e 1 `class` no toast em 3/6, sem autor atribuído). Antes **v97** (deployment `8441a826-ec61-46df-a91d-871bee05a55a` / version `e6972ed0-c4c8-405c-87c4-cc73fc9e0f74`, criado 2026-10-30T05:51:08Z — **v97 PUBLICADA: item 78, aba «Leitor QR — Desenvolvedor»** (§CB): `/` `7bae8d85…` 3.454.915 B (+15.223 B, 8 hunks), SW `8f955561…` cache `bfr-conecta-v97` (só a linha 1), FCM `fcfa8720…`/manifest `68d15518…`/rp `98a4aca7…` intactos, worker.mjs `bb821a47…` 3.523.814 B (+15.476 B), 5/5 portões em `audit-publicacao-v97.json`, `PORTÃO DO CLIENTE v97: VERDE`; as duas opções `[data-section="qr-dev"]` ocultas sem sessão e painel ausente para anônimo; bancada offline `BANCADA_QRDEV4_OK` 18/18 no §CA; 74(a) da v96 segue fechado e não se reabre). Antes **v96** (deployment `493433ea-fcd1-4bd6-8698-2fd93f964531` / version `de54279b-9939-4d5e-b37d-7c27c5f9d182`, criado 2026-10-30T02:25:30Z — **v96 PUBLICADA: item 74(a), alvos do menu do aluno** (§BY): `notas`/`boletim` → Boletim Escolar (`[data-student-report]`), `agenda` → Próximos eventos (`[data-student-events]`), `comunicados` → os 5 avisos (1 no `.notice` + 4 na lista irmã idempotente), CSS `scroll-margin-top` 90/130 px; `/` `f60ce150…` 3.439.692 B (+698 B, 5 hunks), SW `1099c241…` cache `bfr-conecta-v96` (só a linha 1), FCM `fcfa8720…`/manifest `68d15518…`/rp `98a4aca7…` intactos, worker.mjs `a5e620e7…` 3.508.338 B (+707 B), 5/5 portões em `audit-publicacao-v96.json`, `PORTÃO DO CLIENTE v96: VERDE`, bancada offline `V96_BANCADA_OK` 19/19 no §BX; `horarios`/`jogos`/`escola-historia` seguem decisão de produto; ciclo V96L de 30/10 provou com sessão real de aluno o **runtime 4/4** nas duas bandas e o **clique 0/8** por defeito pré-existente do handler — §BZ). Antes **v95** (version `2f27880b-3240-4388-b51d-b8f1080817fc`, criado 2026-10-30T00:44Z — **v95 PUBLICADA: painel do vínculo D2 (secretaria/coordenação/developer) + portão da Virada do 9º ano** (§BU/§BU.1): `/` `0bb6007d…` 3.438.994 B (+2.139 B), SW `128fc5d0…` cache `bfr-conecta-v95`; DDL D2 aplicado antes (2 colunas de auditoria + 4 RPCs); bancada viva **35/35** no painel (3 papéis) e **16/16** na Virada (6º × 9º, 1440 e 390), §BV; as medições de tela da v88 seguem válidas). Antes **v94** (version `d6872029-152c-4175-8aa9-5331799a0945` / deployment `c42ac870-8cac-4aab-8b15-caaa91867eab`, criado 2026-10-29T23:17:40Z — **v94 PUBLICADA: rascunho do cadastro de família** (item 82): `/` `68cb6b97…` 3.436.855 B (+2.543 B), SW `842d5edb…` cache `bfr-conecta-v94`; só o modal de família ganhou as 3 inserções, medições de tela da v88 seguem válidas, §BR/§BR.1). Antes **v93** (version `99908987-b256-485f-9f60-08d24c5d91bb` / deployment `6ac24725-4c15-493a-9ec7-532c6b62b248`, criado 2026-10-29T21:28:35Z — **v93 PUBLICADA: item 81 fechado, a linha do `lastQuery` normalizado no clique da sugestão** (modal de família): `/` `d00d8abb…` 3.434.312 B (+64 B), SW `7ec3226f…` cache `bfr-conecta-v93` (só a linha 1), FCM `fcfa8720…` e rp `98a4aca7…` intactos, 5/5 portões em `audit-publicacao-v93.json`; **nenhuma tela além do modal de família mudou**, logo as medições de tela da v88 seguem válidas). Antes **v92** (version `78cea0cd-21a7-4f7f-8c84-e46440dae153` / deployment `c47ac502-e938-4011-897b-4310340e4e8d`, criado 2026-10-29T21:00:46Z — **v92 PUBLICADA: só a dica do modal de família «2 letras»→«3 letras»** (item 80, cosmético): `/` `2b03c0c1…` 3.434.248 B (**Δ 0 B** — só md5 discrimina, a janela de diferença é de 1 caractere), SW `83544d38…` cache `bfr-conecta-v92` (só a linha 1), FCM `fcfa8720…` e rp `98a4aca7…` intactos, 5/5 portões em `audit-publicacao-v92.json`; **nenhuma tela além do modal de família mudou**, logo as medições de tela da v88 seguem válidas). Antes **v91** (version `eea55fc0-15e5-40e0-84e9-e60cb71bdb08` / deployment `7721c6da-6c3a-472f-b926-a6cbbc230990`, criado 2026-10-29T20:46:46Z — **v91 PUBLICADA: o autocomplete do cadastro de família chama a RPC `search_family_students`** (item 80, camada 2): `/` `31e80945…` 3.434.248 B (−162 B), SW `dfa18ca1…` cache `bfr-conecta-v91` (só a linha 1), FCM `fcfa8720…` e rp `98a4aca7…` intactos, 5/5 portões em `audit-publicacao-v91.json`; **nenhuma tela além do modal de família mudou** — `PROVA_HTTP_V91_OK` e `PORTÃO DO CLIENTE v91: VERDE`, logo as medições de tela da v88 seguem válidas). Antes **v90** (version `929c48f0-ea85-40ca-acf9-6487500588ac` / deployment `6501c7ff-84a7-49c4-be03-d1d2ce05e8f0`, criado 2026-10-29T19:10:32Z — **v90 PUBLICADA: CPF opcional no cadastro de família** (item 80): `/` `1ee3deb2…` 3.434.410 B, SW `48e7cd0a…` cache `bfr-conecta-v90` (só a linha 1), FCM `fcfa8720…` e rp `98a4aca7…` intactos, 6/6 portões em `audit-publicacao-v90.json`; **nenhuma tela além do modal de família mudou** — `PROVA_HTTP_V90_OK` e `PORTÃO DO CLIENTE v90: VERDE`, logo as medições de tela da v88 seguem válidas). Antes **v89** (version `4c563a63-364b-4d8d-833d-5bc10a79a92a` / deployment `4ad140d1-0d06-424e-b6f6-aa542d3a6540`, criado 2026-10-28T10:40:42Z — **v89 PUBLICADA: peças 1+2 de notificação** — handler `push`/`notificationclick` no `/sw-v4.js` servido e rota real `/firebase-messaging-sw.js`; **o HTML é byte a byte o da v88** (`788fc429…` / 3.434.295 B, rp `98a4aca7` intacto), SW `e11fca19…` 5.989 B cache `bfr-conecta-v89`, FCM SW `fcfa8720…` 2.403 B, worker `fee2ed8a…` 3.502.869 B (+5.089 B), 9/9 portões em `audit-publicacao-v89.json` — **nenhuma tela mudou, logo todas as medições de tela da v88 seguem válidas**. Antes **v88** (version `57984e68-d84b-4ea9-a9ee-247cb47ff9e2` / deployment `356b556c-a7cc-491e-b65e-d871d0b0a29c`, criado 2026-10-28T07:44:33Z — **v88 PUBLICADA: desvincular/re-parear pela UI dos dois lados**: `bfr_guardian_unlink_student(uuid)` no cartão do responsável e `bfr_student_unlink_account()` no do aluno, SECURITY DEFINER com ACL sem `anon`/PUBLIC (DDL aplicado antes, `V88_DDL_APLICADO` 15/15); `/` md5 `788fc429…` 3.434.295 B (+6.392 B, 15 hunks A–O no bloco `bfr-pf-family`), SW `e5989e89` cache `bfr-conecta-v88`, rp `98a4aca7` intacto, worker.mjs `38093aca…` 3.497.780 B (+6.537 B, mudam só as constantes `HTML`/`SW`), 9/9 portões em `audit-publicacao-v88.json`; **o fluxo de desvincular/re-parear FOI medido pela tela na v88 publicada em 28/10 (`V88UI_RIG_OK` 43/43, `pf-v88ui-rig.json`, 7 capturas, baseline restaurada, 0 vivas; plano §C.18)**. Antes **v87** (version `4be1bd06-a335-41f0-878f-52d296c818f6` / deployment `64fc9c0e-a41d-407a-88a1-fcea1cc413cd`, criado 2026-10-28T06:38:35Z — **v87 PUBLICADA: repórter `student_app` no cartão do aluno pareado (PF-E)**: `/` md5 `4bcab0fa…` 3.427.903 B (+4.029 B), SW `91b18255` cache `bfr-conecta-v87`, rp `98a4aca7` intacto, worker.mjs `33bf2b8d…` 3.491.243 B (mudam só as constantes `HTML`/`SW`; a rota `/pf/tiles/` fica igual), 9/9 portões em `audit-publicacao-v87.json`; **o clique do repórter na v87 publicada FOI re-medido em 28/10 (§V87A): 22/22 no HTML do ar, com SW ativo, 0 exceções e 0 vivas**. Antes **v86** (version `ed2983f1-b30a-4829-b960-18f7c39533cd` / deployment `39724ee4-a9db-4e52-a627-5e1515735aca`, criado 2026-10-28T05:40:13Z — **v86 PUBLICADA: UI do pareamento dos dois lados (R1–R3) + clique no marcador do mapa do PF (R4)**: `/` md5 `a7905330…` 3.423.874 B (+14.567 B), SW `3295855` cache `bfr-conecta-v86`, rp `98a4aca7` intacto, worker.mjs `baa578d3…` 3.487.143 B (mudam só as constantes `HTML`/`SW`; a rota `/pf/tiles/` fica igual), 9/9 portões em `audit-publicacao-v86.json`; **PFD6b FECHADO no ar** — o clique real no marcador abre o popup, com `preventScroll`; o mapa e o pareamento **autenticados** no HTML publicado ainda não foram re-medidos (exige OK). Antes **v85** (version `83c976b6-a7c9-47fc-8307-3ce69f36c27e` / deployment `97e6ef0e-bda5-4566-8b6c-854472ca02c8`, criado 2026-10-28T04:06:48Z — **v85 PUBLICADA, proxy de tiles no Worker**: rota `/pf/tiles/{z}/{x}/{y}.png` + `handleTile` **antes** do `env.ASSETS`, HTML só com o `TILE_URL` trocado; `/` md5 `52d25426…` 3.409.307 B (−21 B), SW `24bb1a5a` cache `bfr-conecta-v85`, rp `98a4aca7` intacto, worker.mjs `f96043e2…`; 4/4 portões + tile (`audit-publicacao-v85.json`, §C.10) e Chrome limpo com 0 pedido direto ao OSM; **o mapa do PF autenticado na v85 FOI medido em 28/10 (rig D, 9/10): tiles pelo proxy e popup por API corretos, mas o clique real no marcador rola o cartão 424 px — PFD6b consertado na candidata R4 (`a790533032d6a7bb549d3c7d4656411d`, bancada 58/58 + prova viva 32/32) e PUBLICADO na v86**). Antes **v84** (version `26980736-29bc-4b6f-9afa-2a2cfec55258` / deployment `5db98a78-ff79-4949-9bbf-1cfc93ea4f94`, criado 2026-10-28T01:20:17Z — **Proteção Familiar PUBLICADA, só front**: bloco `bfr-pf-family` 28.465 B embutido; `/` md5 `763b84bb…` 3.409.328 B (+28.544 B), SW `89b870ad` cache `bfr-conecta-v84`, rp `98a4aca7` intacto, worker.mjs `ac5b304a…`; 3 portões verdes, `audit-publicacao-v84.json`; as 3 telas do PF medidas no ar em 28/10 — leitura 9/9, escritas pela UI 10/10; o pareamento dos dois lados segue sem UI). Antes **v83** (version `8fa2c6b3-c756-430b-933a-3e13467388c9` / deployment `4578f30f-c1e2-4b73-85e3-0846de2d10b9`, criado 2026-10-27T08:08:14Z — **v83 PUBLICADA**: guardas G1/G2 escrevem `dataset.parentNav` só quando o valor difere; `/` 3.380.784 B md5 `475d91de…` (+135 B), SW `ccacf49b` cache `bfr-conecta-v83`, rp `98a4aca7` intacto, worker.mjs `83cc625c…`; 4/4 portões verdes, `audit-publicacao-v83.json`, §BD; bancada offline 14/14 (`v83-bancada.json`, §BC: repouso 5→0 escritas, correção forçada 2→1); o item 77 segue aberto na frente de produto). Antes **v82** (version `c1ec6193-c744-4c5a-af91-576a350ef7ef` / deployment `47add52f-4002-4aa3-8942-abf3c8e53f5c`, criado 2026-10-27T07:09:36Z — **item 77(b) PUBLICADA em duas guardas de idempotência**: o `hideLegacy()` do Monitor e o `syncAvailability` da LIA só escrevem quando o token falta (`classList.contains` antes do `add`); `/` 3.380.649 B md5 `caf983f2…` (+281 B), SW `8ed5fa88` cache `bfr-conecta-v82`, rp `98a4aca7` intacto, worker.mjs `24619816…`; 4/4 portões verdes, `audit-publicacao-v82.json`, §BA; bancada offline 28/28 (`v82-bancada.json`) e A/B vivo `V82L_VIVO_OK` 14/14 (§AZ — repouso v82 legadas/FAB `0/0` em 6/6 contra `[9,12,9,12,12,12]`/`[3,4,3,4,4,4]` na v81; transição 1×/nó com 0 redundância); **censo vivo pós-deploy FEITO em 27/10 (§BB, `V82C_CENSO_VIVO_OK`, conta `monitor` sintética, 6/6 boots @390 + controle 1280): repouso 1/4/4/4/4/4 mut/s (3/13/13/13/13/12 registros), `aria-current` 0 em 6/6, legadas e `#liaFab` com 0 escrita em 6/6 e 0 redundância, chrome montado 6/6 — mas os timers de 60 ms seguem disparando 8/3/3/4/3/4 de 100/97/97/99/97/95 e a montagem continua por `pintaSozinho` 6/6 → a frente de produto do item 77 segue aberta; console 38/38 rede 404 do beacon `/cdn-cgi/rum`, 0 exceção; baseline restaurada 30 tabelas diffs `[]`, 0 vivas). Antes **v81** (version `5aa59b43-a526-42fe-9ed1-30e7d70bfd9a` / deployment `7babce89-3ff8-45f6-861c-9d9c9cb90169`, criado 2026-10-27T03:49:14Z — **item 77(b) PUBLICADA**: guardas de ação nos osciladores residuais — Fotos 1,2 s, Monitor 1,8 s e observer do clima param com aba/view ocultas, clima coalesce num rAF, classes do `navButton` só na transição real; `/` 3.380.368 B md5 `22fe4330…` (+2.022 B), SW `c93ccd33` cache `bfr-conecta-v81`, rp `98a4aca7` intacto, worker.mjs `666008c4…`; 4/4 portões verdes, `audit-publicacao-v81.json`, §AX; bancada offline 16/16 (§AW, Fotos 104→0); **censo vivo feito em 27/10 (§AY)**: repouso 4–7 mut/s, `aria-current` 0/18 s, botão de Fotos 0/6, mas timers de 60 ms ainda 2–9 de 108–119 e chrome por `pintaSozinho` 6/6 → `V81L_FRENTE_B_APROVADA`, item 77 aberto na frente de produto). Antes **v80** (version `c5466221-40e1-468a-a164-0acc2dd3dbc4` / deployment `c0afb91f-7536-4a55-b64d-0b22077587e2`, criado 2026-10-27T02:19:47Z — **item 77 frente (a) PUBLICADA**: 12 guardas de idempotência no `syncNavigationA11y` e no `render()` do Monitor + D1–D4 do calendário; `/` 3.378.346 B md5 `25048424…` (+883 B), SW `d25f5caf` cache `bfr-conecta-v80`, rp `98a4aca7` intacto, worker.mjs `af9ea559…`; preflight/bundle/HTTP/cliente 4/4 verdes, `audit-publicacao-v80.json`, §AV; `V80_AB_PARCIAL` (repouso 240→30 mut/s, `aria-current` 3.149→36 em 18 s, timers de 60 ms ainda famintos). Antes **v79** (version `016a8444-f8af-4441-b8fb-56e9aaa4209a` / deployment `f7d6a725-cc3f-4661-bf7c-66d4f60cb49c`, criado 2026-10-26T22:14:37Z — **item 70 PUBLICADO**: o `renderHistory()` do `BFRMonitorBusPresence` deixa de re-alimentar o próprio `schedule()` (dedupe de quadro + `innerHTML` só quando a string muda); `/` 3.377.463 B md5 `07232e5b…` (+455 B), SW `6161727a` CACHE v79, rp `98a4aca7` intacto, worker.mjs `1cf945cb…`; preflight/bundle/HTTP/cliente 4/4 verdes, `audit-publicacao-v79.json`, §AR; **PROVADO VIVO em 26/10 com `monitor` sintético — `V79L_LIVE_OK` 17/17 (`audit-v79l.json`, §AS): alvo e lista com 0 mutação em 6/6, guarda preenchida 6/6, chrome 6/6; a fome do debounce NÃO acabou (timers de 60 ms 113–119 agendados / 110–114 limpos / 2–6 disparados, churn 79–139/s, mediana 115 contra 139 na v78) → item 77 ABERTO e **ATRIBUÍDO no V77A (§AT: `syncNavigationA11y` do BFRUXAudit responde por 78–80 % das escritas, negação de `aria-current` 66–82 %; a fome vem de outra família, `class`/`childList`)**). **V80 (§AU/§AV, 26/10): a frente de idempotência foi construída, medida (**12 guardas cortam o churn de repouso de 168–261/s para 29–33/s e o `aria-current` de 3.149 para 36 mutações em 18 s, mas os timers de 60 ms seguem em 3–5 disparados de ~117 e o chrome monta por `pintaSozinho` em 6/6 → `V80_AB_PARCIAL`**) e PUBLICADA às 02:19:47Z (version `c5466221`, deploy `c0afb91f`, SW `d25f5caf` cache `bfr-conecta-v80`, 4/4 portões); item 77 aberto só na frente de produto.** Antes **v78** (version `06ac9553-7e01-47c3-895d-1e216e421c0e` / deployment `1276d501-58a9-4671-abbe-c2ff42303b74`, criado 2026-10-26T16:38:58Z — **D4-d PUBLICADO**: `/` 3.377.008 B md5 `85665f53…` (+254 B sobre a v77), SW `dddb2ef3` CACHE v78, rp `98a4aca7` intacto, 12/12 assets; preflight/bundle/HTTP/Chrome limpo verdes, `audit-publicacao-v78.json`, §AN; **PROVADO VIVO em 26/10 com `student` sintético — `D4D_LIVE_OK`, runtime 5/5 ×2 bandas, `d4d` 0, baseline de 30 tabelas restaurada por contagem E md5, 0 contas vivas, §AO**). Antes **v77** (version `08101297-114c-4af1-8ddb-1f3e7c94cac1` / deployment `7cb4fd6c-f506-4ca6-98ed-d2247b21a77b`, criado 2026-10-26T07:08:58Z — **D4-b + D4-c PUBLICADOS**: `/` 3.376.754 B md5 `ec053ab2…` (+278 B sobre a v76), SW `efb50baf` CACHE v77, rp `98a4aca7` intacto, 12/12 assets; `audit-publicacao-v77.json`, §AL). Antes **v76** (version `4a124dc8-cf94-4a25-9ca5-24d58e8d9328` / deployment `ecf9da59-88a7-4736-bba9-e9c9d603f83e`, criado 2026-10-26T06:15:25Z — **D4 residual do aluno PUBLICADO**: `/` 3.376.476 B md5 `162e60f5…` (−124 B, 2 linhas), SW `9a70db60` CACHE v76, rp `98a4aca7` intacto; HTTP + Chrome limpo verdes, `audit-publicacao-v76.json`, §AI). Antes **v75** (version `0a47375c-db0b-41c9-8199-a38a97d8e0b7` / deployment `886062d5-9f28-496a-9661-bf9afa27ceab`, criado 2026-10-26T04:46:35Z — **item D8 PUBLICADO e provado no ar (estático + vivo)**: `/` 3.376.600 B md5 `b4cec7fbe359f297fa76b398cf20abac`, SW `6be41acd` CACHE v75, rp `98a4aca7` intacto; HTTP + Chrome limpo verdes, `audit-publicacao-v75.json`, §AF; **prova viva do D8 FECHADA em 26/10 05:40Z com `coordinator` e `sports_operator` reais — `D8L_OK`, 4 jobs, baseline restaurada, §AG**). Antes **v74** (version `fe90fc36-3e03-4665-90db-f26019ce5356` / deployment `281d041a-535e-4dc0-9123-f67f88fac061`, criado 2026-10-25T23:41:33Z — **itens 76 e 72 PUBLICADOS e provados no ar com 2 contas sintéticas (aee, coordinator)**: `/` 3.375.798 B md5 `4e48535243f859f4a5407d3ab2ae7f0f`, rp `98a4aca7` inalterado 54.667 B, SW `6c51fa6d` CACHE v74; HTTP + Chrome limpo verdes, `audit-publicacao-v74.json`, §AB; baseline 30 tabelas por contagem E md5, 0 vivas; itens 72 e 76 FECHADOS). Antes **v73** (deploy `9112fb0a-e6d3-4954-97b2-7eb4d232f2da` / version `df099a5d-31f9-447f-968d-105a9b62af24`, criado 2026-10-25T18:30:19Z — **itens 71, 73 e 75b PUBLICADOS e provados no ar com 6 contas sintéticas + fixture**: `/` 3.375.403 B md5 `cbc369f8`, rp `98a4aca7` 54.667 B, SW `651d1d8c` CACHE v73; HTTP + Chrome limpo verdes, `audit-publicacao-v73.json`, §Y; baseline 30 tabelas por contagem **E** md5, 0 vivas; **item 76 tinha bancada (§AA)**; **item 72 ATRIBUÍDO no ciclo 72 (25/10, §Z): candidata `22886398…` verde 6/6 nas duas bandas**). Antes **v72** (deploy `c903048f-cd84-4311-9ea5-0c7398e4032f` / version `f7dcb683-e7bf-43d6-a406-ebcdcab904fe`, criado 2026-10-25T11:42:26Z — **item 70 PUBLICADO**: o ramo do TETO de `pintaSozinho()` monta o chrome mobile sob churn; index inalterado `c7ec5831`/3.373.224 B, SW `88efef97` CACHE v72, rp `be7ac93b` 52.476 B; HTTP + Chrome limpo 1440/390 verdes, `audit-publicacao-v72.json`, §X; chrome do monitor @390 em produção medido no ciclo V74R de 26/10 — barra de 5 itens montada em 10 ms, abridor `[data-bfr-open-drawer]` 44×44, gaveta abre com 7 entradas e fecha, §AC; **ampliado no I70L de 26/10 na v78: 6/6 boots @390 montam, 3 pelo ramo `pintaSozinho` com o timer de 60 ms faminto, `I70L_LIVE_OK`, §AP**). Antes **v71** (deploy `78d27394-f569-40a8-9faf-69674c8c57de` / version `87b75671-973a-42bf-aac8-68137442f9dc`, criado 2026-10-25T09:58:01Z — **links legais do login FECHADOS**: Privacidade/LGPD, Termos e Contato abrem o modal e a navegação Sobre/Termos dentro dele funciona; causa em 3 camadas (núcleo inerte na tela de login, guardas `data-runtime-legal-*` estáticas e CSS ≤520 escondendo `.login-legal-links` no modal); 3 hunks, A/B `ab-legal-v71.json` nas duas bandas antes do deploy); `/` 3.373.224 B md5 `c7ec5831168cfdb744f77dc5f1c0bed3`, SW `10cb6ef6590591f88ddea5b279afe157` CACHE v71, rp.js `a83f77ba`; prova HTTP (3 GETs) + Chrome limpo 1440/390 verdes (`audit-publicacao-v71.json`); varredura V71E de 25/10 (12 papéis, 137 rotas/173 toques, 0 erros) abriu os itens 70–75 — monitor @390 sem chrome mobile, painel executivo da Direção vazio no boot, 3 rotas sem tela, gaveta fora do papel, 7 rotas do aluno no mesmo painel genérico e AEE trocando a view do coordenador). Antes **v70** (deploy `1a2225ad-d4fa-4e33-8bef-0de8730e13fd` / version `4ddc5035-4890-4c57-adcc-04e9184f5cc4`, criado 2026-10-25T07:19:16Z — **item 69: o canal `bfr-school-content-live` perdeu as assinaturas de `school_events`/`school_activities` (fora da publication); item 57 FECHADO pelo teste vivo de 25/10 07:26Z — `v70rt-ws.json` `FRAME_70_OK` 18/18: quadro +1,55 s com `topic` do canal de conteúdo e `ids:[121121574]`, evento nativo no mesmo instante, repintura +2,24 s, 1 GET por janela (insert e reversão), 0 escrita da página; limpeza `LIMPEZA_OK` e `BASELINE_RESTAURADA`**); `/` 3.373.118 B md5 `d29fdad976dc17c83e96aeb9c93849e6`, SW `1658465b322a9043c4b6d99ad295ad03` CACHE v70, rp.js `a83f77ba`; prova HTTP 1ª tentativa + Chrome limpo verdes (`audit-publicacao-v70.json`). Antes **v69** (deploy `7a81c16d-5031-456b-a3bc-fb8f78c725fc` / version `8b3057fc-6fa8-45c5-909f-80c5c3cc0aa9`, criado 2026-10-25T06:42:17Z — **item 69: canal do portal removido e item 57 REGREDIU** (zero frames no ar; sonda crua A–F provou que assinatura em tabela fora de `supabase_realtime` envenena o canal inteiro — ver [[bfr-realtime-assinatura-fora-da-publication]]); `/` 3.373.158 B md5 `52d8d4e7247ff5443558f8dffd157f0b`, SW `c36e75deff30c7f334b1a20a34b36db8` CACHE v69, rp.js `a83f77ba`; correção mínima pronta para OK). Antes **v68** (deploy `940ce5c9-c0f9-4462-af85-5f3a94576a20` / version `ca514397-28c0-4e14-8b6a-43f20000c277`, criado 2026-10-25T05:55:28Z, OK «começa com o preflight de publicação da v68» — **item 57: ouvinte tolerante no cliente PUBLICADO** (lê o quadro cru do socket e roteia por `payload.data.table` com debounce de 400 ms; **frame real medido em 25/10 06:12Z — repintura em 2,19 s, item FECHADO, §S**); `/` 3.373.041 B md5 `288318ff7a1cd28867c1e6fefe5df42a`, SW `207736ab2d84a39687be9e33880ce159` CACHE v68, rp.js `a83f77ba`; A/B offline AB_OK 10/10 antes do deploy, provado por HTTP (3 GETs, 1ª tentativa) e Chrome limpo (cache única v68, marcas v68 1/3/2/1/4/3/0/1, marcas v60–v67 preservadas), diário `audit-publicacao-v68.json`, §R; reversão = devolver index v67 `e025957c` + SW v67 `7ce30116`). Antes **v67** (deploy `8138a89d-c68d-4ddd-ad72-6d5ccc1c6e20` / version `d7089729-65a7-4b9e-82b2-b40c7fe4bdf6`, criado 2026-10-25T04:55:25Z, OK explícito «executar o deploy da v67» — **item 57 corrigido no front**: o canal `bfr-school-content-live` assina depois do `supabaseClient.realtime.setAuth()` (JWT da sessão no join em vez da apikey de 46 chars; frame real no ar ainda NÃO medido); 1 hunk, Δ+297 B; `/` 3.371.465 B md5 `e025957cd44305ea7208096fd19431c0`, SW `7ce30116b40ed3f18e680a8300f4dbd9` CACHE v67, rp.js `a83f77ba`; A/B offline AB_OK 9/9 antes do deploy, provado por HTTP (3 GETs, 1ª tentativa) e Chrome limpo (cache única v67, `v67_setAuth_promessa`=1 / `linha_direta_antiga`=0, marcas v60–v66 preservadas), diário `audit-publicacao-v67.json`, §57.4; reversão = devolver index v66 `9a8b585c` + SW v66 `9ec18e53`). Antes **v66** (deploy `dd374139-298e-4d29-b069-626d859c7200` / version `566021c7-069d-4cca-bb2f-3e6e83d8daa4`, criado 2026-10-25T04:13:45Z, OK explícito «Sim, publique a v66» — **Comunicação do professor e presença do chat FECHADAS no front** (achado do item 53/TPROF: C1 a rota do núcleo chama o loader + C2 o `bfr-professor-secure` expõe `BFR_LOAD_TEACHER_COMMUNICATIONS` e autocarrega no boot + P1 o `visibilitychange` do `bfr-chat-redesign` consome o thenable da presença); 3 hunks, Δ+314 B; `/` 3.371.168 B md5 `9a8b585c2b5699a1d01bac4982975add`, SW `9ec18e530eb51a5671fb94e977f314d5` CACHE v66, rp.js `a83f77baba7453851b287080686c7afb`; A/B offline AB_OK 12/12 antes do deploy, provado por HTTP (3 GETs, 1ª tentativa) e Chrome limpo (cache única v66, marca `v66_P1_thenable`=1 / `v66_P1_antigo`=0, marcas v60–v65 preservadas), diário `audit-publicacao-v66.json`, §O.5; reversão = devolver index v65 `3c6a006a` + SW v65 `b30dd8d2`). Antes **v65** (deploy `e3a6ba8c-5624-4f4b-9bf4-f5c9707c90e1` / version `835500dc-330c-4fc1-8b72-1c1cf55a411e`, criado 2026-10-25T02:43:24Z, OK explícito «Sim, publicar a v65» — **itens 63–68 FECHADOS na Secretaria** (módulo `bfr-secretary-central`: guarda do intervalo de 1,8 s, Comunicar→Comunicações, `purpose` nas Transferências, parar de carregar `grades`/`attendance`, `selected` do status, abrir linha/ficha); 10 hunks no módulo inline, Δ+143 B; `/` 3.370.854 B md5 `3c6a006a7e1d599e58e24d523fce61f8`, SW `b30dd8d2aff2b56267d965bda8cd023e` CACHE v65, rp.js `a83f77ba`; provado por HTTP (3 GETs com retry) e Chrome limpo (cache única v65, marcas v60–v64 + 11 marcas v65), diário `audit-publicacao-v65.json`; reversão = devolver index v64 `d2892c31` + SW v64 `f43e7b74`). Antes **v64** (deploy `e888ae42-75ce-4b26-8023-0e12f0426fe8` / version `aba82f9a-d325-4694-a393-a8123fe9a444`, 23/10 22:54:31Z, OK «ok» — **item 52(b) FECHADO**: painel de portaria visível na Home compacta do responsável; 1 hunk de 2 regras CSS (whitelist `:not([data-parent-entry-live])` na regra compacta + `order:2!important` do painel abaixo do dashboard v3); `/` 3.370.711 B md5 `d2892c31794ae0e402ba455bc62f0092`, SW `f43e7b74a66e884d0aa64d15cfb73b2e` CACHE v64, rp.js `a83f77ba`; provado por HTTP (3 GETs 1ª tentativa) e Chrome limpo (cache única v64, marcas v60–v63 + hunk v64); reversão = devolver index v63 `ea400a7c` + SW v63 `6dc1b249`). Antes **v63** (deploy `e445ff76-b7bc-4bf7-9ee4-13636efa888c` / version `36d6b88a-2d13-4d3b-897b-35eb0e56b64b`, 23/10 09:59:56Z, OK «autoriza a publicação cirúrgica da v63 se o A/B passar, deploy + prova no ar» — **item 42 FECHADO**: 1º clique na aba "Notas por categoria" @390 (hidratação assíncrona movia a aba de y≈215→y≈400 antes do 1º paint; 1 hunk: `ensureAcademicUi();` na 1ª execução do `ensureUi()`, antes dos listeners); A/B no harness APROVADO 4/4 células antes do deploy; `/` 3.370.588 B md5 `ea400a7c1790390b8e1cd462a62f531c`, SW `6dc1b249ccb1d93e520540680efbcb2c` CACHE v63, rp.js `a83f77ba`; reversão = devolver index v62 `ebdfe507` + SW v62 `e8f4fa2d`). Antes **v62** (deploy `fe25dc68-b3b3-48ac-996e-6ee5165b43e7`, 23/10 ~08:15Z, OK «v62 completa» — fechamento do ciclo BU: p52a (Home do responsável repinta no boot), item 47 (script morto `bfr-coordination-command` + wrapper legacy retirados, pill "Registro suspenso"), correção do T6.4 (thenable lazy consumido); `/` 3.370.291 B md5 `ebdfe507542542d36fad88f62b194cd2`, SW `e8f4fa2dbf37ad0d2470d6298adb9cc6` CACHE v62, rp.js `a83f77ba`; reversão = devolver index v61 `d185a4a7` + SW v61 `557f35e4`). Antes **v61** (deploy `af328abb`, 23/10 02:25Z: área do aluno — itens 43/44 FECHADOS e 46 parcial (D4/D5) fechados no ar; `/` 3.483.291 B md5 `d185a4a7`, SW `557f35e4` CACHE v61, rp.js `a83f77ba`; reversão = devolver index v60 `36feaad4` + SW v60 `04267047`). Antes **v60** (deploy `79112a32`, 22/10 21:12Z: D1/D2/D4 da aba do Professor fechados, item 41 FECHADO; reversão = devolver index v59 `2e403607` + SW v59 `0d5294f7`). Antes **v59** (deploy `06f62d38`, 22/10 11:19Z: aba do Professor — 35 hunks no index, rota sincronizada, dados inventados removidos, leitura escopada por turma, frequência 7 dias, `classOpen`; `/` 3.480.118 B md5 `2e403607`, SW `0d5294f7` CACHE v59, rp.js `a83f77ba` inalterado; 14/14 rotas e cliente em Chrome limpo com cache v59; reversível ao v58 devolvendo index `31f209b6` + SW `8000099c`). Antes **v58** (deploy `47356dbc`, 22/10 05:22Z: foto da LIA no botão do topo — rp.js `a83f77ba` 51.742 B, 5 hunks 10+/4−, `<img src="lia-avatar.png">` em `.bfr-mobile-lia` e `.bfr-topbar-lia`, círculo + `object-fit:cover`, aria e `data-lia-open` preservados; index inalterado `31f209b6`, SW `8000099c` CACHE v58; 14/14 rotas e cliente em Chrome limpo com cache v58 e botão 44×44/img 42×42 @390, 42×42/img 40×40 @1280; reversível ao v57 devolvendo rp.js `da98453e` + SW `e919ac93`). Antes **v57** (deploy `c20ecf05`, 22/10 03:23Z: `/` 3.468.610 bytes md5 `31f209b6` = candidata do **visual dos ícones do menu** — um único bloco `<style id="bfr-menu-icons-v57">` (817 linhas, 58.897 B) antes de `</head>`, pastilhas pastel + glifos SVG mascarados, sem tocar layout/rotas/textos/permissões; SW `CACHE bfr-conecta-v57` md5 `e919ac93`; rp.js `da98453e` inalterado; 12/12 assets, 14/14 rotas e cliente provado em Chrome limpo só com a cache v57: bloco 1 regra/58.865 chars, pastilha 29×29 r9 `rgb(232,241,255)`, glifo 16px `rgb(21,88,189)`, normal `filter:none`, ativo `saturate(1.45) brightness(.94)`; remover o bloco devolve o v56 byte a byte; 51 OK/0 falha e contraste 4,58/4,01). Antes **v56** (deploy `e81b1efb`, 22/10 02:05Z: `/` 3.409.668 bytes md5 `16b61fb5` = ícone 🧾 em todas as 6 entradas do Relatórios genérico, `Resultados e aprendizagem` segue 📊; SW `4b5e9e7c`; 14/14 rotas). Antes **v55** (deploy `de834a20`, 22/10 00:30Z: `/` 3.409.668 bytes md5 `d5075fa5` = candidata da Direção/menu/LIA — LIA com um único acesso (FAB oculto mas no DOM), drawer só com as 13 rotas canônicas, barra do diretor com as 5 rotas `director:*`, datas em vez de intervalos, UUID fora da lista de alunos, placeholder SAEB encurtado; SW `CACHE bfr-conecta-v55` md5 `d472d796`, PRECACHE `?v=14`; 12/12 assets, 15/15 rotas e cliente provado em Chrome limpo só com a cache v55). Antes **v54** (deploy `74cc2f8f`, 21/10 23:09Z: `/` 3.409.714 bytes md5 `a2fce259` = candidata do **item 40** — a aba de notas por categoria deixou de depender da grade publicada; SW `CACHE bfr-conecta-v54` md5 `0e6902a9`; 12/12 assets, 15/15 rotas e cliente provado em Chrome limpo só com a cache v54). Antes **v53** (deploy `2525fabb`, 21/10 21:02Z: `/` 3.408.900 bytes md5 `f08374b1` = candidata v53.1 do **item #182** — a aba de notas por bimestre e categoria está publicada; SW `CACHE bfr-conecta-v53` md5 `65382f27`; 12/12 assets idênticos e cliente provado em Chrome limpo só com a cache v53). Antes **v52** (deploy `f96189d8`, 21/10 06:38Z: `/` md5 `554c3120` = candidata do **item 36.8** — o painel de aniversariantes do coordenador deixa de nascer colapsado; SW `CACHE bfr-conecta-v52` md5 `e2ec178a`; provado no ar por HTTP e por navegador @1280 e @390, ver 36.10). Antes **v51** (deploy `f1eb0bae`, 21/10 05:00Z: `/` md5 `3c5587d3` = candidata do **item 36** (aniversários: coordenador sem portão de seção, 3× `data-exec-revealed`, guard do diretor corrigido), SW `CACHE bfr-conecta-v51`; **provado no ar por HTTP real e por navegador** — o "hostname NXDOMAIN" era grafia errada das sondas, ver [[bfr-workers-dev-sem-resolucao]]). Antes **v50** (deploy cirúrgico `a73bb0bc`, 20/10: `/` md5 `01055151` = candidata do **item 24**, SW `CACHE bfr-conecta-v50`, rp.js `a2cacc7e` inalterado). **Item 24 (o coordenador não tinha cadastro de alunos) FECHADO NO AR 20/10**: por toque real nas duas bandas — @1024 pela `.bfr-platform-nav`, @390 pelo drawer do rp.js (`#bfrMobileDrawer.is-open [data-bfr-drawer-route="cadastro-alunos"]`, que herda a rota do papel) — painel só de leitura 848 linhas, filtro 848→1→0 com mensagem, saída re-oculta (alt 0), 0 escritas / 0 RPC / 0 rotação; developer de controlo mantém `#adminStudentDirectoryPanel` 1377px e `n_painel=0`. **Item 34 (achado colateral) FECHADO no banco 20/10, sem publish: `bfr_list_staff_birthdays` dava 400 em TODA a chamada** — primeiro `42702 column "role" is ambiguous` (o `role text` do `RETURNS TABLE` colidia com `profiles.role` no guard) e, morto esse, `42804` (o enum `account_role` devolvido numa coluna declarada `text`); agora devolve 200 `[]` porque nenhum dos 13 perfis de equipe tem `birth_date`. Engolido por `if (!staffResult.error)` em `index.html:11887`. Antes **v49** (deploy `cc5a666e`, 20/10: `/` md5 `d9374fb5` byte-idêntico à candidata `boot-e`, SW `CACHE bfr-conecta-v49`). **Item 29 (re-carregamento do operador em tela vazia) FECHADO NO AR 20/10**: boot + recarga natural da MESMA aba dão `schoolGamesView` alt 1677 / `abertos=1` / 0 escritas, controlo do coordenador idêntico (`coordinatorView`, `abertos=0`) e a negativa local (porta sem o hunk E) dá `VISÍVEIS=NENHUM`/`abertos=0`. Resíduo medido: a barra mobile montou em 5/6 documentos (`nav=false` numa recarga @390, chars 1836 vs 1922) — campo que E não toca, é o churn do item 160/B, e os 6 documentos têm o mesmo sensor injetado. Continua ABERTO mesmo com E: recarga com o guarda noutra seção do operador (`notificacoes` 0/3) = decisão de produto (fallback), não hunk de 76 chars. **ABERTO no v52 e com cura medida, não publicada: o filtro de componente da aba Notas do professor volta para "all" quando troca o bimestre (`hydrateAcademicScope()` reescreve o `select` antes de `secureAcademicSetup()` lê-lo); candidata cirúrgica v52.1, A/B por clique no harness, md5 `f6cf492f`.** **PUBLICADO no v54 (21/10, `/` md5 `a2fce259`): o módulo de notas não depende mais da grade publicada — deriva o escopo de `bfr_teacher_class_subjects` (`profile_id`+`active`) e mantém a grade como fallback; A/B 6 braços com 8 portões verdes antes do deploy, ver §37.18/§37.19.** **ITEM 70 (26/10, §AQ): fonte do churn do `monitor` atribuída ao `BFRMonitorBusPresence.renderHistory()` (`innerHTML` sem comparação dentro do `document.body` observado, `schedule` sem dedupe de quadro); candidata `07232e5b` (+455 B) A/B-ada ao vivo 305/s → 16/s, **PUBLICADA como v79 em 26/10 22:14Z** (deploy `f7d6a725…`, version `016a8444…`, SW `6161727a…` CACHE v79, 4/4 portões verdes, `PORTÃO DO CLIENTE v79: VERDE`); o censo do `monitor` no ar v79 não foi refeito (exige mint/OK novo).**
`bfr-candidata-item160-BCD/` (index md5 `d70453f3`, +331c, rp.js byte-idêntico `a2cacc7e`, 3 hunks
B/C/D, reversível byte a byte). Item 28 (boot do operador com zero `.content` visíveis) FECHADO no ar, prova 3/3 no endereço público. **Item 27 (tempestade do loader de leitura) com causa medida e candidata `577f7808` (Δ+67, reversível) A/B-ada no harness — NADA publicado; v48 pede OK.** Antes **v44** (deploy 3d8e2d23, 17/10: coord24(v43) + 8 hunks CSS do backlog #104–#110). #1 preferredNameModal RESOLVIDO/PUBLICADO (skip "Agora não" em localStorage, coord23 md5 3f852b7d). #9 rolagem RESOLVIDO/PUBLICADO (coord24 md5 6f682c09): restore de `bfr-route-scroll-memory` clampava ao topo contra conteúdo async; fix re-assert o alvo (teto 40 frames) + salva no `[data-bfr-mobile-route]` — provado no endereço público Δ=0 3/3. Armadilha: conta com `display_name_custom` nulo popa o modal e mata o 1º toque. **Backlog #104–#110 PUBLICADO** no v44 (candidata coord25 md5 4b4d2081, reversível byte a byte ao coord24, smoke harness 0 erros). #58 FECHADO COM RESSALVA (chrome mobile do sports_operator provado montado+destacado @390 na passada #86 com a sessão sintética atual — `aria-current` em `.bfr-platform-nav-item`; NÃO é conta com o enum real, e nenhuma escrita no banco). **#34 FECHADA 18/10** (capturas v44 @390: 10 papéis — aluno/responsável/professor/coordinator/director/admin/secretary/monitor/gatekeeper/aee — todas render real verificado; banda web já coberta pela medição #31; staff via `?role` = prova do seletor de view, armadilha 32; `barra=false` do monitor é do design — ele usa as próprias pílulas de aba, não a barra de baixo). Nada aberto das telas. #33/#59 FECHADOS 18/10 no harness v44 com firewall (1.542 cliques × 10 papéis, 0 escrita real, 0 erro de console; 7 `morto` = 2 controles ambos explicados). #30 FECHADA no v44 público (tapMenores=0 em papel×{320,768}) e #31 FECHADA com achados (6 papéis×{1024,1920}, estDoc/erros=0; sobram chip 10px da escola do aluno + distintivo "N atualizações" da secretaria que corta 23px só @1024). #86 mutações/s ATRIBUÍDO e FECHADO (não reproduz: ~140/s, escritor `aria-current` já guardado por valor). **1 tela ABERTA em 19/10: a rota `jogos-escolares` do `sports_operator` não chega quando a navegação persistida guarda outra seção — medido com a conta real do enum no v45 público.** **20/10 item 29: candidata `bfr-candidata-item160/` (index `8432ad73`, Δ+243, rp.js byte-idêntico ao publicado) fecha por medida o desync do toque em Jogos (operador E coordenador) e o churn do breadcrumb (61→0 escritas/s), e isso cura a montagem da barra; NADA publicado — o v48 pede OK e a fila já tem a `577f7808` do item 27.**
metadata:
  type: project
---

**AR MUDOU 13/11 — v119 (OK «publicar v119»): o delta é 1 token e nenhuma tela deste ficheiro foi re-medida.** O shell publicado passou de 3.489.467 B `ae59d353…` (v118) para **3.489.474 B `a1969cdf023042e7d2a91e7ed9333a05`** e o CACHE do SW para `bfr-conecta-v119`; a mudança é a volta do embed `sports_schools(name)` na consulta da aba Supervisão (linha 23684), que a v116 tinha desfeito. Consequência por tela: **só a aba Supervisão Educacional muda de estado** — o `supervision_requests?select=…schools(name)` que dava 400 PGRST200 (e `state.errors=['supervisão']`) agora dá 200 no censo re-emitido sobre os bytes publicados (248 pares: 240×200 / 8 ruins / 0 novas). **Nenhuma outra tela foi tocada, logo todas as medições feitas nos bytes v118 continuam válidas.** O que ainda **não** foi visto: a aba aberta **logada** com o nome da escola pintando — por isso a PEN-31 continua nesta lista como defeito de tela aberto. Cadeia do deploy, régua e reversão (`worker-deploy-v118-csp`, exige OK novo): [[bfr-publicacao-worker]] §25, [[bfr-v114-supervisao-secretaria]].

**DEFEITO ABERTO 12/11 — notificação push não é exibida (RM-1.3, `evidence/rm13-rotas.json` 8/14 + `rm13-aparelho.json` 5/15, somente-leitura).** No ar medido hoje: o SW servido `/sw-v4.js?v=45` é `3fcbc3ad52f1a0491362506466c82596`/3.586 B com **só `install`/`activate`/`fetch`** — `push` 0, `notificationclick` 0, `showNotification` 0, `importScripts` 0, `firebase` 0; `GET /firebase-messaging-sw.js` → **500 `text/html` 4.720 B**; o shell (3.489.467 B, `ae59d353…`) chama `getToken` 2× e registra o `sw-v4.js` 3× mas tem `firebase_messaging_sw` **0**. A SW da **bancada** (`04267047…`/3.585 B) tem as mesmas marcas a zero ⇒ **não é deploy velho: a peça não está na fonte**, e o censo dos `worker-deploy-*` não acha **nenhum** diretório com `rota_fcm` nem handler `push`. Isto **contradiz o bullet da v89 logo abaixo** — ver a correção datada em [[bfr-notificacoes-infra-real]] e o caso completo em [[bfr-rm13-push-cadeia-partida]]. Íntegro e verde: Edge v23 `ACTIVE`/`verify_jwt`, trigger do emissor vivo, segredo no Vault, 4 respostas `net._http_response` 107–110 todas 200 `sent:1` (última 30/10 03:46Z). Fios por provar: `push_subscriptions` **0**, conta-aparelho `19bc8c0e…` **morta**. Reparo = **RM-1.5 + RM-6.9**, nada alterado, exige OK de publicação; a re-prova da exibição exige aparelho físico com perfil Chrome novo e assinatura recriada pela tela.

**v106 — item 87(a) PUBLICADO em 02/11 21:05:09Z (OK «pode publicar como v106») e PROVADO VIVO na tela autenticada em 02/11 (§DI, `I87L_LIVE_OK` + `BASELINE_RESTAURADA`).** Só cliente: **12 substituições textuais** no bloco da Portaria, todas ramo de `gateLegacyMode()`, alinham a tela ao modo contínuo que o código já pratica (as tabelas de turno/calendário não existem e não têm escritor). `/` `558ec30e…` 3.457.534 B (+760 B, 12 hunks), SW `0c619199…` cache `bfr-conecta-v106`, worker `097dad8f…` 3.526.460 B, RPJS `2e16513b…`/FCM `fcfa8720…`/manifest `68d15518…` intactos, deployment `363ecfd8…` / version `1beda208…`, 100%, 6/6 portões (`audit-publicacao-v106.json`), `PORTAO V106: VERDE` + `PORTÃO DO CLIENTE v106: VERDE`, bancada `I87_BANCADA_OK` 16/16. Nenhuma DDL/RPC/conta/escrita na publicação. **Ciclo I87L (§DI):** sessão autenticada de `gatekeeper` sintético no ar v106 — os 7 textos do modo contínuo renderizados @1280 com os 9 velhos ausentes; @390 5/7 renderizados e as 2 frases do status provadas no `textContent` cru (a barra é `display:none` pelo CSS mobile, linha 28583 — desenho pré-existente, armadilha 357); 6 capturas de pixels; E2E do item 79 intacto (token falso → 0 linhas; token real → cartão de conferência sem escrita; confirmação → 1 linha `allowed` com `intake_source='manual'` e `exception_reason` digitado, `target_shift NULL`); conta/fixture/check-in apagados com baseline restaurada por contagem **E** md5. **Ciclo CAM-QR (§DJ, 02/11, `CAM_QR_OK` + `BASELINE_RESTAURADA`):** a última aresta de software da Portaria foi exercitada na v106 com `getUserMedia` falso (stream de canvas 640×480, 1 chamada com `facingMode:'environment'`, track `live`, 174 frames) — QR real decodificado pelo loop do próprio produto → `pending_visual` sem escrita e com pausa própria da câmera → confirmação por cliques reais → **1 linha** `15bbef90…` com `intake_source='qr'` e `source='qr'`; QR falso → **0 linhas**. A conta `gatekeeper` e a fixture ZCAM/TCAM foram apagadas com baseline por contagem **E** md5 **E** censo de ids; o ar não mudou de md5 (nada publicado). **Não há defeito novo nem candidata neste ciclo.** Resta não provado: **hardware** real de câmera (o stream era de canvas — prova o caminho de código, não o sensor), crachá físico impresso, `target_shift` e o ramo de turno. (b) turno real segue projeto de produto. Ver [[bfr-i87-portaria-modo-continuo]].

**v89 — peças 1+2 de notificação PUBLICADAS em 28/10 10:40:42Z (OK «pode publicar a v89»).** **Nenhuma tela mudou:** o HTML do ar continua byte a byte o da v88 (`788fc429f0eeaa75b79706bb0e91068d` / 3.434.295 B) e o rp `98a4aca7…` intacto — logo **todas as medições de tela de v84–v88 seguem válidas**. O que foi ao ar é infraestrutura no Worker: o `/sw-v4.js` ganhou handler de `push`/`notificationclick` (SW `e11fca19…`, 5.989 B, `CACHE` v89) e a rota `/firebase-messaging-sw.js` deixou de devolver o HTML do app (200 `text/html`, 3.434.295 B) para servir um SW mínimo de 2.403 B (`fcfa8720…`, `application/javascript`, `no-cache`, `nosniff`); worker `fee2ed8a…` 3.502.869 B (+5.089 B), deploy `4ad140d1…` / version `4c563a63…`, 100 % do tráfego, 9/9 portões (`audit-publicacao-v89.json`), plano §C.21. **O que não mudou no produto:** `Notification.permission` segue `default` no boot (nada pede permissão), nenhum push real foi entregue e **o PF continua 100 % manual, sem `watchPosition` e sem notificação** — o texto "não rastreia em segundo plano" na tela segue verdadeiro. Ver [[bfr-notificacoes-infra-real]] e [[bfr-publicacao-worker]].

**v88 — desvincular/re-parear pela UI: PUBLICADO em 28/10 07:44:33Z (OK «publica a v88»).** Só front. O responsável vinculado ganha «Desvincular» no cartão do aluno, com confirmação in-band, chamando `bfr_guardian_unlink_student(p_student_id)`; o aluno logado vinculado ganha o espelho e chama `bfr_student_unlink_account()`, que solta o `student_profile_id` para resgatar um código novo do responsável. As duas são SECURITY DEFINER com `search_path=public` e ACL sem `anon`/PUBLIC, **aplicadas antes sob OK próprio** (`V88_DDL_APLICADO` 15/15, `V88_CORPO_IDENTICO`); o front só consome e não envia `p_source`. `/` md5 `788fc429…` 3.434.295 B (+6.392 B, 15 hunks A–O no bloco `bfr-pf-family`), SW `e5989e89…` cache `bfr-conecta-v88`, rp `98a4aca7…` intacto (12/12 assets e 5/5 Leaflet iguais), worker.mjs `38093aca…` 3.497.780 B (+6.537 B), version `57984e68…`, deploy `356b556c…`, 100 % do tráfego, 9/9 portões em `audit-publicacao-v88.json`. **Nenhuma escrita no banco e nenhuma conta mintada** neste ciclo. **Provado pela tela na v88 publicada em 28/10 (§C.18, `V88UI_RIG_OK` 43/43, 7 capturas, 0 vivas):** o responsável desvincula com a pergunta in-band (1 POST `bfr_guardian_unlink_student`, vínculo/posição do outro responsável intactos, A1 não volta ao recarregar), o aluno solta o login (1 POST `bfr_student_unlink_account`), o segundo responsável gera o código (12 caracteres, hash sha256 conferido, 1 POST), o aluno re-pareia digitando em minúsculas (normaliza e 1 POST `bfr_redeem_student_pairing_code`), o segundo unlink é repetível e o código velho é recusado sem parear (tentativa contada); negativos 42501/401 por PostgREST e isolamento por responsável. **Continua não provado:** o ramo `pf.mapFor === id` (inalcançável pela UI), o 42501 **pela tela** e a recusa por **código expirado** (só a de código já usado). Detalhe em [[bfr-pf-candidatas]] e [[bfr-publicacao-worker]].

**PFD6b — clique no marcador do mapa do PF: CONSERTADO E PUBLICADO NA v86 (28/10, OK "Publica R2+R3+R4 como v86"; antes sob OK "corrigir o PFD6b primeiro").** Defeito aberto pelo rig D na v85: o clique real no marcador rolava o cartão 424 px e não abria o popup. Causa (corrigida em relação à 1ª leitura): o `Keyboard._onMouseDown` do Leaflet 1.9.4 lê o scroll do **documento** e chama `window.scrollTo(...)`; o `bfr-global-scroll-bridge` do app intercepta e redireciona para `#appShell.ready > main`, que salta **715 px → 0** no `mousedown` — o `mouseup` cai fora do marcador e o `click` nunca chega. A 390 é imune (o documento é o scroller). Não é o `container.focus()` (armadilha 248 corrigida). **Conserto R4 (preserva acessibilidade):** `kb.disable(); kb._onMouseDown = function(){ if(!this._focused) this._map._container.focus({preventScroll:true}); }; kb.enable();` — setas e `+`/`-` seguem funcionando; os controles de zoom do próprio Leaflet são imunes (`disableClickPropagation`). Candidata `bfr-candidata-pair-r4/index.html` md5 `a790533032d6a7bb549d3c7d4656411d`, 3.423.874 B (+14.567 B sobre a v85), bloco PF `8128ed600a3f975e4927bb5ef92e9052` 43.011 B (1 `kb.disable()`, 1 `preventScroll`). **Bancada offline 58/58** (`pf-pfd6b-bancada.json`: controle @1280 salto 710 / popup 0 × R4 salto 0 / popup 1; 390 verde; teclado 8/8) e **prova viva 32/32** em 4 células na mesma bancada de conta sintética (`pf-pfd6b-live-rig.json`: controle salto 715 e `click` em `SECTION`, R4 salto 0 com popup "há 22 min", tiles pelo proxy, 0 exceção; os 2 404 de console são `/cdn-cgi/rum`, beacon do Worker). A R4 também carrega a UI de pareamento (R2+R3), e **as duas frentes subiram juntas como v86 em 28/10 05:40:13Z** (deployment `39724ee4`, version `ed2983f1`, worker `baa578d3`, SW cache v86, 9/9 portões em `audit-publicacao-v86.json`); desde então o popup do marcador não depende mais de `openPopup()`. Ciclo encerrado com baseline idêntica por contagem E md5 (5 tabelas, 27/3/24/848/848) e 0 contas vivas — ver [[bfr-contas-sinteticas-auditoria]] e [[bfr-pf-candidatas]].

**VARREDURA GERAL V71E NO AR v71 (25/10, OK «Publicar v71 + mintar») — 12 papéis sintéticos, duas bandas, 0 erros de console.** 1440: 137 rotas declaradas, **136 casaram**, 0 erros; POSTs só de leitura/presença (`internal_chat_presence` 1 heartbeat; RPCs de aniversário). 390: **173 toques reais, 158 casaram**, 0 erros, barra de baixo montada em **11/12** papéis (monitor sem barra). Contas e fixture revertidas: 12/12 apagadas (auth HTTP 200, 0 profiles restantes), manifesto 12→0, `v71e-baseline.json` **`BASELINE_RESTAURADA`** em 30 tabelas por contagem **E** md5 (`diffs:[]`, 0 vivas). Seis achados, itens **70–75** da seção F (o item 70 foi medido em §W.5 e **publicado na v72** de 25/10 11:42Z, §X; os itens **71, 73 e 75b foram publicados na v73** de 25/10 18:30Z, §Y; **72 e 76 foram publicados na v74 e estão FECHADOS**; **74 segue decisão de produto**; a prova da v73 abriu o **item 76**, e o ciclo V79L de 26/10 abriu o **item 77**) (seção W da auditoria):
**70** — `monitor` @390 nunca monta o chrome mobile: censo 336 mutações/168 por s, 14 janelas ≥60 ms contra 428/214 por s e 0 janelas do `parent`; sonda com rp em memória dá `sync:0`, `dispara` nunca registrado, `schedule` 296→659 — o `TETO` só repinta o realce, o build vive só no `sync()`. **Ataque 25/10 (§W.5 da auditoria):** candidata de 1 hunk (`be7ac93b…`, +734 B) faz o TETO montar quando o shell está `.ready` e a barra falta; A/B offline na casca v71 — vivo+churn @390 sem nav/appbar/drawer × candidata+churn @390 com 5 itens, montada +432 ms após o `ready`, ☰ 44×44 tocável, gaveta abre; 1280 idêntico e amplificação 300 × 312 mutações/2 s. **Publicada na v72** (deploy `c903048f-cd84-4311-9ea5-0c7398e4032f`, version `f7dcb683-e7bf-43d6-a406-ebcdcab904fe`, 25/10 11:42:26Z; index inalterado `c7ec5831`, rp `be7ac93b`, SW `88efef97` CACHE v72; HTTP + Chrome limpo verdes, diário `audit-publicacao-v72.json`, §X). **Monitor @390 em produção não re-medido** (exige mint, OK separado). **I70L (26/10, v78)** provou 6/6 boots com chrome completo; 3 montaram por `pintaSozinho` (teto) com o timer de 60 ms agendado ~100× e disparado 0×. **Fonte do churn ATRIBUÍDA em 26/10 (§AQ):** `BFRMonitorBusPresence.renderHistory()` grava `innerHTML` sem comparar dentro da própria subárvore observada e `schedule` não deduplica quadro (negação 364→7→163/s; A/B ao vivo ar 305/s × candidata 16/s). Candidata **`07232e5b`** (+455 B) gerada e validada — **PUBLICADA como v79** (26/10 22:14:37Z; `/` `07232e5b` 3.377.463 B, SW `6161727a` CACHE v79, deploy `f7d6a725…`, version `016a8444…`; preflight/bundle/HTTP/cliente 4/4 verdes, gatekeeper 2→1 como esperado). **A Coordenação foi medida no mesmo ciclo e não é segundo autor** (5 mut/s, 61 fps, timers de 60 ms disparando, barra via `dispara`); a linha `~:25327` é o `BFRGatekeeperCentral`, tela não medida — logo a v79 foi sozinha. **V79L (26/10, `monitor` sintético, 6 boots @390×844 + controle @1280×900): a fonte do item 70 está curada no ar** — `[data-bus-presence-history]` com 0 mutação nele e 0 na lista em 6/6, guarda `__bfrHistoryHtml` preenchida 6/6 («Nenhum embarque registrado hoje.»), chrome completa 6/6 — **mas a fome do debounce NÃO**: timers de 60 ms 113–119 agendados / 110–114 limpos / 2–6 disparados, churn 79–139/s (mediana 115 × 139 na v78), montagem por `pintaSozinho` em 5/6 e `dispara` em 1; `V79L_LIVE_OK` 17/17, `BASELINE_RESTAURADA`, 0 vivas; o emissor residual virou o **item 77** (não atribuído). Ver [[bfr-mobile-menu-mutation-starvation]].
**71 — FECHADO na v73 (25/10 18:30Z, hunk E1):** o `renderLoading()` do painel executivo da Direção desenha um esqueleto de 5 linhas no boot e o `render()` real o substitui quando os dados chegam; provado no ar com `director` @1280 (esqueleto em 707 ms, conteúdo em 5.677 ms) e @390 (705 ms / 4.974 ms) — `[data-exec-view="overview"]` deixa de nascer com 0 filhos (`audit-publicacao-v73.json`, §Y).
**72** — três rotas sem tela: **ATRIBUÍDO E COM CANDIDATA VERDE no ciclo 72 (25/10 §Z), aguardando OK de publicação.** Controle de evento: `bfr:navigation` sozinho não muda nada; a mutação é do `navigateToSection` no caminho genérico. Vivo v73 A/B 6 contas × 2 bandas = **live 0/6**: teacher retorna `false` mas **persiste** a seção (recarga presa, `nav_ativa:[]`), student troca a casca da Home (11.667 chars), coordinator/director/secretary/parent persistem a seção e esvaziam o painel (sem chat). Candidata `22886398…` (+307 B, 1 alias no topo do roteador) = **6/6 verde em 1440 e 390**, recarga no destino real; parent cai em `inicio`. Publicar exige OK novo.
**73 — FECHADO na v73 (25/10 18:30Z, hunks P1/P2a/P2b):** a gaveta filtra por `roleSectionAccess` com fallback `viewByRole`, e o primeiro paint espera o `currentProfile` (repinta na troca); medido no ar nas duas bandas — coordinator 13 itens/0 fora do papel, secretary 7/0, psychology 3/0 (era 6), aee 9/0 (era 10), student 16/0 (`audit-publicacao-v73.json`, §Y).
**74** — no aluno @390 sete rotas distintas caíam no **mesmo painel genérico** (hash `3364186b`, 11739 chars): notas, agenda, jogos, horários, comunicados, boletim — família D3 (§M), não regressão da v71. **A opção (a) foi PUBLICADA na v96 (30/10, §BY): notas/boletim → Boletim Escolar, agenda → Próximos eventos, comunicados → os 5 avisos; restam horários/jogos (painéis da Home) e `escola-historia` foi REMOVIDA na v105 (02/11/2026, §DF) — a rota não tinha superfície e era inalcançável.**
**75 — FECHADO na v73 (25/10 18:30Z, hunks C1a/C1b):** ao abrir AEE a partir da Coordenação, o herói do AEE ganha «Voltar à Coordenação» (`aeeReturnBar(origin)`, 208×44, estável 9 s); o clique real devolve `view=coordinator, sec=inicio`, remove a barra e mostra `coordinatorView`, 0 erros de console. Ressalva: **só exercitável a 390** — no desktop a entrada AEE é inalcançável (item 76).
**76 (novo, pré-existente, igual na v72) — AEE sem entrada clicável no desktop; CAUSA MEDIDA e CANDIDATA PRONTA (25/10, §AA):** a linha `data-aee-nav` (index.html:3768) vive num `DIV.bfr-legacy-nav` que colapsa para **h=0**; a causa não é o `.sidebar-foot` — `#appShell.ready .sidebar` é flex column de 100vh (14308–14324) e `.bfr-legacy-nav{max-height:315px;overflow:auto}` (13463) tem altura automática mínima **0**, então absorve toda a folga negativa e clipa os filhos (conteúdo mede 836 px). Bancada offline em 3 bandas (`item76-bancada.json`): base h=0/30/0 e hit ≠ aee em 3/3; com `@media (min-width:801px){#appShell.ready .sidebar > .bfr-legacy-nav{flex:0 0 auto}}` h=315 e **hit=aee 3/3** (cand2, preserva o scroller interno do autor; a variante com `max-height:none` dá h=821). Candidata `bfr-candidata-item76/index.html` md5 `3d4d3eef…` 3.375.491 B (+88 B), prova estrutural `ok:true` (remover o hunk reproduz a base byte a byte). **PUBLICADA como parte da v74** (26/10 04:46Z, version `0a47375c`; +88 B que, somados aos +307 do item 72, fecham o `4e485352` de 3.375.798 B). Regra presente no CSSOM da cache v74 e provada viva com `aee` e `coordinator` nas duas bandas: `.bfr-legacy-nav` h=275/315 com `flex:0 0 auto`, `scrollIntoView` funcionando e clique real levando `view=aee`; baseline restaurada, 0 vivas (§AB).
**77 (ABERTO, ATRIBUÍDO no V77A de 26/10, medido no ar v79; aberto pelo V79L) — o churn residual do `monitor` tem dois emissores distintos: `syncNavigationA11y` domina o volume, a família de classe/childList domina a fome.** O V79L já havia mostrado o item 70 silencioso com churn de `79/119/112/115/115/139 mut/s` e os timers de 60 ms em 113–119 agendados / 110–114 limpos / 2–6 disparados, sem atribuir o emissor. O V77A (6 boots @390×844 com `monitor` sintético `1ecfc88e-…` + controle @1280×900, envoltórios de escrita com `new Error().stack`) mediu **186/166/261/214/260/260 mut/s** (mediana 237; tarde 291/183/250/183/213/214), **618/557/871/708/871/871 escritas capturadas** em 3 s e uma pilha **uniforme nos 7 documentos**: `setAttribute → NodeList.forEach → syncNavigationA11y` do bloco **`BFRUXAudit`** (`index.html` ~25899–25968) — **78–80 %** das escritas, reescrevendo `aria-current` em todo `.nav-item[data-section]` (`=false` 416/364/572/468/572/572, `=page` 16/14/22/18/22/22) mais `aria-pressed` e `aria-live`; descartar só `aria-current` no `setAttribute` reduz o churn em **70/71/66/75/82/82 %** e o efeito é reversível. **Mas o volume não é a fome:** o `schedule()` do `syncNavigationA11y` tem guarda de quadro (é amplificador, não laço) e o observer do rp filtra `class`, então `aria-*` não re-arma o debounce — quem re-arma é o módulo central do Monitor (`setInterval(ensure,1800)`, ~24414/24419/24421), o clima premium (observer de childList → `enhanceAll`, ~20231/20337/20349), `syncModuleNav` (~21668) e `hideLegacy`/`syncNav`/calendário. Resultado: **6/6 boots montaram pelo `pintaSozinho` (teto da v72) e 0/6 pelo timer**, com 127–130 timers de 60 ms agendados, 116–120 limpos e apenas **8–13 disparados**; alvo do item 70 com 0 mutação em 6/6 e guarda preenchida 6/6. O controle 1280×900 repete o mesmo emissor primário (166/s na janela, 218/s depois, 51 itens de sidebar). Diários `v77a-medida.json`/`audit-v77a.json` → **`V77A_ATRIBUIDO_OK`** 11/11, §AT; `BASELINE_RESTAURADA`, 0 contas vivas. **Não atribuído:** papel `parent`, `BFRGatekeeperCentral`, telas com dados, repouso pós-boot, efeito da negação sobre o disparo dos timers. **Fechar pede novo OK**: (a) guarda de idempotência no varredor de `aria-*` (escrever só quando o valor difere) e (b) decisão de produto sobre os osciladores de classe. **V80 (26/10): a frente (a) FOI PUBLICADA** — candidata `25048424` (12 hunks: `writeAttr` em `syncNavigationA11y`, `writeHtml`/`writeText` e strings em cache no `render()` do Monitor, D1–D4 do calendário), A/B `V80_AB_PARCIAL` (§AU) com repouso 240→30 mut/s de mediana e `aria-current` 3.149→36 em 18 s, mas fome intocada (timers 0/6 com maioria, `pintaSozinho` 6/6); deploy `c0afb91f`/version `c5466221`, `/` `25048424` 3.378.346 B, SW `d25f5caf` cache `bfr-conecta-v80`, 4/4 portões verdes e `PORTÃO DO CLIENTE v80: VERDE`, §AV. **O item 77 segue ABERTO exclusivamente pela frente (b)** — a cadência de 1,8 s do `ensure()` do Monitor e o observer do clima —, que exige OK próprio. Nenhuma linha de banco, nenhum mint nessa publicação. **V81 (27/10 03:49Z, §AX): a frente (b) FOI PUBLICADA** — candidata `22fe4330` (+2.022 B, 7 hunks A1/A2/B1/B2/C1/C2/D1) com bancada offline 16/16 (`v81-bancada.json`: Fotos 104→0 registros, `t60` 4→0, Monitor/UX/clima param ocultos, clima 201→44 `enhanceAll`), deploy `7babce89`/version `5aa59b43`, SW `c93ccd33` cache `bfr-conecta-v81`, 4/4 portões e `PORTÃO DO CLIENTE v81: VERDE`; **o item 77 segue aberto até o censo vivo** — a bancada é offline com fixture e não mostra os timers de 60 ms disparando maioria no ar, o que exige conta `monitor` sintética e OK próprios. **CENSO VIVO FEITO (27/10, §AY, `V81L_FRENTE_B_APROVADA`):** com a conta `monitor` (`f7f0c9ca…`), 6/6 boots válidos @390 + 1280 no ar v81, o repouso caiu para **4–7 mut/s** (v80 29–33, v79 168–261), `aria-current` **0 em 18 s**, botão de Fotos **0/6**; mas os timers de 60 ms seguem disparando **2–9 de 108–119** e o chrome monta por `pintaSozinho` em **6/6** (108–253 ms do `ready`) → a fome não mudou, como a bancada previa. Resíduo: `class` 44, `childList` 5, `src/alt` 20/20 e `data-parent-nav` 18 em 6×3 s, com o render de 1,8 s do Monitor e o observer do clima ainda no caminho visível; `data-parent-nav` e `src/alt` sem atribuição por pilha (candidatos estáticos: `dataset.parentNav` em `index.html` 15083/15238). **O item 77 continua ABERTO pela frente de produto** (cadência de 1,8 s do `ensure()` e observer do clima), que exige decisão e OK próprios; limpeza da conta com `BASELINE_RESTAURADA` e 0 vivas. **V82L (27/10, §AZ):** a candidata `caf983f2` (+281 B, 2 hunks: M1 `hideLegacy` do Monitor e L1 `syncAvailability` da LIA) passou na prova viva em A/B com conta `monitor` (`2de8629a…`), 14 boots (6 @390 + 1 @1280 por braço; 2 documentos por boot cand) — **`V82L_VIVO_OK` 14/14**: repouso de 5,6 s com legadas/FAB `[0×6]/[0×6]` na v82 contra `[9,12,9,12,12,12]`/`[3,4,3,4,4,4]` na v81; transição `entrou=3 red=0` em 6/6 e FAB 1/0 em 6/6 (v81 redundante 3–6 e 2–3); t60 na janela 1–3 disparados de 97–101 × 7–10 de 107–120; boot 97–101 agendados × 107–120, chrome por `pintaSozinho` nos dois braços (a fome não é destes hunks). `BASELINE_RESTAURADA`, 0 vivas. **A v82 FOI PUBLICADA em 27/10 às 07:09:36Z** (`caf983f2`/version `c1ec6193`/deploy `47add52f`, SW `8ed5fa88` cache `bfr-conecta-v82`, 4/4 portões, §BA). **CENSO VIVO PÓS-DEPLOY FEITO (27/10, §BB, `V82C_CENSO_VIVO_OK`):** conta `monitor` sintética (`b2704418…`), 6/6 boots válidos @390×844 + 1 controle @1280×900 no ar com `caf983f2` e cache `bfr-conecta-v82` (marcas v82 6/6, v81 6/6); repouso **1/4/4/4/4/4 mut/s** (7,8× menos que a v81, `[4,5,6,7,7,7]`), `aria-current` **0** nas 6 janelas, legadas **0/6** e `#liaFab` **0/6** com **0 redundância** (v81: `[6,3,3,6,6,6]` e `[2,1,1,2,2,2]`), botão de Fotos 0/6, console 38/38 rede 404 do beacon `/cdn-cgi/rum` (sonda crua: 1 URL, 0 exceção, 0 `console.error`); **mas os timers de 60 ms seguem famintos** — boot 8/3/3/4/3/4 disparados de 100/97/97/99/97/95, janela de repouso 0/1/2 disparados, e o chrome montou por `pintaSozinho` em **6/6** (113–230 ms do `ready`, barra visível/única/5 itens 6/6). Resíduo de repouso por tipo (6×3 s): `src` 20, `alt` 20, `data-parent-nav` 18, `childList` 5, `class` 4 — os escritores de `src`/`alt` (imgs de `#liaFab`/`#liaOverlay`/`#liaMessages`/`#parentView`) e de `dataset.parentNav` seguem **sem atribuição por pilha**. Controle 1280: repouso 4/s, legadas/FAB 0, t60 4/95. Portanto **o item 77 continua ABERTO pela frente de produto** (cadência de 1,8 s do `ensure()` do Monitor e observer do clima no caminho visível), que exige decisão e OK próprios; limpeza FK-safe com `BASELINE_RESTAURADA` (30 tabelas, 17 não zeradas, diffs `[]` por contagem **E** md5, enum igual) e **0 contas vivas**. **V83 (27/10, §BC→§BD): candidata `475d91de…` (+135 B, 2 hunks G1/G2 — `syncMode` index:15085 e `ensure` index:15240 escrevem `dataset.parentNav` só quando o valor difere) APROVADA na bancada offline 14/14 (§BC, `v83-bancada.json`: repouso 5,4 s com **5 → 0** escritas de `data-parent-nav` em @390 e @1280, controle positivo com valor forçado corrigido em **1** escrita (v82: 2, uma redundante), 0 no controle sem módulo, reversão byte a byte `caf983f2`) e **PUBLICADA em 27/10 às 08:08:14Z** (§BD): `/` `475d91de` 3.380.784 B, SW `ccacf49b` cache `bfr-conecta-v83`, version `8fa2c6b3`, deploy `4578f30f`, 4/4 portões verdes (`audit-publicacao-v83.json`), sem mint e sem linha de banco; a guarda é **higiene de repouso** (o rp só observa `class`/`childList`, então `data-parent-nav` não re-arma o debounce) — **o item 77 continua aberto na frente de produto** (cadência de 1,8 s do `ensure()` e observer do clima). **v98 (30/10, §CD): o resíduo `src`/`alt` foi atribuído ao observer inline `bfr-lia-logo-component` e a guarda de valor foi PUBLICADA** — `/` `bc95f661` 3.455.097 B (+182 B, 1 hunk), SW `48845c8a` cache `bfr-conecta-v98`, version `50d04b94`, deploy `f223f7d7`, 6/6 portões (`audit-publicacao-v98.json`), `PORTÃO DO CLIENTE v98: VERDE`, bancada 24/24 (§CC); **o censo vivo em repouso RODOU em 30/10 (§CE, `V98C_CENSO_VIVO_OK`): conta `monitor` `8f75466a-…`, 6/6 boots válidos @390 + controle @1280, `src`/`alt` 0/6 e 0/6 — a queda 160→0 da bancada ficou confirmada em sessão autenticada —, legado/FAB 0, repouso 1–2 registros/3 s, marcas H1 6/6; a fome dos 60 ms persiste (t60 1–4 de 96–100, `t60_maioria` 0/6) e o chrome montou 5/6 pelo teto. Resta a frente de produto: 1 `childList` sob `#monitorView` em 6/6 e 1 `class` no `#bfr-platform-toast` em 3/6, não atribuídos; `BASELINE_RESTAURADA` (30 tabelas, `diffs:[]`).** **§CF (30/10, leitura estática): os dois resíduos do V98C foram ATRIBUÍDOS** — o `childList` é o `list.innerHTML` incondicional do `renderGateAlerts()` (tique de 5 s) e o `class` é o `remove('is-visible')` do `showToast` disparado por `boot()→syncAchievements()`, que nunca chamava `save()` (o `first` nascia de `defaultState.xp=180`). **v99 (§CH) PUBLICOU a guarda de valor da portaria** (`fd830f35`, CACHE v99) e o censo §CI deu `#monitorView`/lista/painel **0/6**. **v101 (§CO) PUBLICOU a persistência das conquistas** — `aab12ce4…` (+49 B, `if(changed)save()` em `syncAchievements()`), version `5b4c4312`, deployment `77aa64cb`, CACHE v101, bancada A/B candidata **1/0/0** e **4/0/0** contra 1/1/1 e 4/4/4 do controle, bytes idênticos entregues ao cliente — **frente A do item 77 FECHADA** (a prova viva de 2 boots no mesmo contexto não foi rodada; exige conta sintética com OK novo). **O item 77 continua ABERTO apenas pela fome dos 60 ms (frente de produto).** **v104 (31/10, §DB) PUBLICOU o Front A do item 77** — 1 hunk no RPJS (`98a4aca7…`/54.667 B → `2e16513b…`/54.688 B, +21 B) troca `addEventListener('bfr:app-ready', schedule)` por `() => { sync(); schedule(); }`, então o chrome mobile monta no `bfr:app-ready` sem esperar o timer faminto; HTML do ar **intacto** (`3fcccf9b…`/3.457.021 B), SW `0ab095dd…` CACHE `bfr-conecta-v104`, worker `8b0dc87a…`/3.525.947 B, version `f5d03606…`/deployment `29dc982e…`, 6/6 portões, `PORTÃO DO CLIENTE v104: VERDE` com o hunk novo 1× na cache e 1× no ar (âncora velha 0×/0×), bancada `FRONT_A_BANCADA_OK` 17/17 (candidata monta em 12/12 a 390 × 0/12 do controle); a prova viva com conta `monitor` **não** foi rodada nesta publicação (exige OK novo). **A fome dos 60 ms segue ABERTA**: todo `sync()` posterior ao boot continua refém do timer. **V104L (2/11, §DC, `CENSO_V104_OK`) provou o hunk VIVO, mas só no controle @1280; no @390 o caminho medido continua sendo o teto.** Conta `monitor` sintética `d9db4a20-…`, 6 boots @390×844 + 1 controle @1280×900 no ar v104 (marcas v99/v98/v82/v81 6/6, boot 1.461–1.947 ms, controle 1.830 ms) — 6/6 válidos, 0 falhas. No controle, o instrumento de dispatch (listener de `bfr:app-ready` no document-start + `queueMicrotask`) viu `navAntes=false → navDepois=true` com **+1 ms**, `nav_criacoes:1` e pilha `sync` direto; na v99c o mesmo controle montava por `dispara` **+78 ms** depois do evento. No @390 nada mudou: `teto:6`/`timer:0`/`sync_direto:0`, barra 70–190 ms após o `ready` e 555–1.671 ms **antes** do `bfr:app-ready` — o evento chega tarde e o teto vence primeiro. Guarda da portaria fechada: `childList` de `#monitorView` 0/6 no repouso e 1 só no boot #1 do tick, lista/painel 0/6 nas duas janelas, HTML da lista `len 267`/hash `−529625934` idêntico em 6/6, 1 rodada de `renderGateAlerts` + 1 fetch por tick. Toast `class` 1/boot no repouso (contexto de browser novo por boot — não mede a persistência da v101). **Fome dos 60 ms intacta:** 102–103 agendados, 98–100 limpos, **3–4 disparados (3–4 %)** e janela de tick 1/0/1 só no boot #1; churn de boot 102–153 mut/s (v99c 75–103), repouso 0/s. Console só rede (beacon `/cdn-cgi/rum` 404 cumulativo, armadilha 339), 0 exceção. Limpeza FK-safe (auth HTTP 200, 0 restantes; só a conta-aparelho viva) e `BASELINE_RESTAURADA` (30 tabelas, 17 não zeradas, `diffs:[]` por contagem **E** md5). **O que a prova não cobre:** o único boot @1280 é também o único em que o dispatch chegou antes do teto, então a prova do evento é 1/1, não uma distribuição; os 70–190 ms do @390 são de Chrome headless com emulação mobile. **O item 77 segue ABERTO só pela fome dos 60 ms (produto).**
O que **não** é defeito: `casou:false` das abas internas da Direção é métrica de shell (usar `len`/`hash`), POST de presença não é escrita de conteúdo, e os 0 toques do monitor são consequência do item 70.

**v59 PUBLICADO 22/10 11:19Z (aba do Professor, deployment `06f62d38` / versão `fc1b3648`):** a candidata de 35 hunks
(@3 ctx; 60 com `-U0`, +178/−70) subiu inteira como deploy cirúrgico a partir do AR — `index.html` `31f209b6` (3.468.610 B) →
**`2e403607`** (3.480.118 B), `sw-v4.js` só com a linha `CACHE` trocada (`8000099c` → **`0d5294f7`**, cache `bfr-conecta-v59`) e
`bfr-responsive-presentation.js` **byte-idêntico** (`a83f77ba`), 12/12 assets iguais. O que a v59 muda na tela: `showScreen` do
módulo seguro sincroniza `activeSection`/rota persistida via `BFR_APP_RUNTIME.navigate('professor-…')`, `seedItems()` e
`sample()` (dados inventados) saem, catálogo/atividades leem `school_documents`/`school_activities`, o painel de leitura perde o
portão CSS que o escondia, leitura do perfil `pedagogical` restrita às turmas da sessão segura (lotes de 300, teto 12 s) e
frequência ganha próxima aula em 7 dias + merge diária/aula. Portões antes do deploy: preflight 8/8, SRC 4/4 (14/14),
bundle verde (`node --check` + `wrangler deploy --dry-run` EXIT=0), 3 fetches de `/` com `2e403607`. Depois: 14/14 rotas/MIME,
prova em Chrome limpo com cache única v59 (`activated`, página controlada, corpo cacheado `2e403607`, rp.js `a83f77ba`, marcas
`readingTeacherScope=3`/`dailyKeys=6`/`classOpen=6`/`day_entries=3` e `seedItems=0`/`sample_fn=0`, únicos 404 são
`/cdn-cgi/rum?`), 15 telas × {320,390,1280} visíveis com 0 estouro, diário `audit-publicacao-v59.json`. Reversão exige OK novo:
devolver `ar-html-v58-live.html` (`31f209b6`) + `ar-sw-v58-live.js` (`8000099c`, v58) no mesmo pipeline. **ENSAIO E2E MANUAL 22/10 (conta `pedagogical` sintética, apagada ao final):** aprovadas correção de nota (auditoria 7,5→8), conteúdos, diário, planejamento, leitura, LIA (HTTP 200) e CSV/print; parciais em nota (grava sem confirmar), recado (grava, painel invisível) e chat (só leitura); **REPROVADO** publicar atividade (403 do PostgREST, `school_activities` 0). **Defeitos abertos:** **D1** `[data-teacher-inbox]` `display:none`/0×0 pela regra CSS 2072; **D2** painel de leitura abre com anos `[""]` (corrida antes de `BFR_SECURE_TEACHER_STATE.classes`, cache de escopo vazio e sem reinjeção); **D3** `school_activities_staff_insert` exige `bfr_is_schedule_manager()`/`is_aee()` e nega `pedagogical`; **D4** `secureAcademicSetup()` sobrescreve a confirmação de “Salvar lançamentos”. Nenhum corrigido sem OK novo. **22/10 (mesmo dia): candidata v60 = v59 + 5 hunks (whitelist `:not([data-teacher-inbox])`, sync de visibilidade na navegação, guarda do scopeKey da leitura, repaint da confirmação) medida em A/B de 4 células no harness (v59/v60 × 390/1280, diário `mede-v60-ab-d1d2d4.json`) — D1/D2/D4 fechados na candidata; #240 era gap do RIG (scroll suave × clique, armadilha #174) e o modal de correção abre nas 4 células com conteúdo idêntico; D3 segue banco — **APLICADO NO BANCO 22/10** (OK "Aplicar o SQL", `apply-sql.mjs` HTTP 201; policy viva `school_activities_staff_insert` com braço `"current_role"()::text = 'pedagogical'` no WITH CHECK, dry-run transacional ANTES 42501 / DEPOIS id de volta, conferência 0 linhas gravadas; **E2E PostgREST TESTADO 22/10** — conta `pedagogical` sintética mintada com OK e apagada ao fim, vínculo por versão publicada 2027 (invisível ao app, que só lê 2026), POST positivo 201 / SELECT própria 200 / negativos 42501×3 + anon 401/42501, PATCH e DELETE próprios casam 0 linhas (UPDATE/DELETE seguem fechados para `pedagogical`), baseline de 7 tabelas restaurada por md5, diário `d3-e2e-postgrest.json`). v60 **PUBLICADA 22/10 21:12Z** (OK "Publicar agora"): deploy cirúrgico, version `79112a32-…`, `/` md5 `36feaad4…` 3.481.301 B, SW `04267047…` `CACHE='bfr-conecta-v60'` (1 linha), rp.js `a83f77ba` + 12 assets intocados; portões preflight (ar == v59 `2e403607`, diff byte-igual ao congelado, 5/5 assinaturas) / confere-bundle (HTML == SRC, SW 1 linha do ar) / HTTP (3 fetches) / Chrome limpo (cache única `bfr-conecta-v60`, body cacheado `36feaad4`, marcadores v59 + v60, só 404 `/cdn-cgi/rum?`) todos verdes; D1/D2/D4 fechados no ar (item 41 FECHADO, §37.23). Reversão: devolver index v59 (`bfr-candidata-v59-professor/index.html` `2e403607`) + SW v59 (`ar-assets-v59-live/sw-v4.js` `0d5294f7`) e redeploy — requer OK novo. Diário `audit-publicacao-v60.json`.** Achados compartilhados: primeiro clique na aba notas engolido a 390 nas duas bandas (item 42 — **CAUSA ATRIBUÍDA 23/10:** `ensureAcademicUi()` só roda depois dos dados assíncronos e injeta a toolbar de escopo + as abas Acompanhamento/Notas por categoria **após o primeiro paint**, movendo a aba de y≈215 para y≈400; o 1º clique mira a coordenada pré-hidratação e cai na aba Notas; o binding é delegado (`[data-academic-tab]` no handleClick, index.html:17187), por isso o 2º clique funciona; @1280 não ocorre. **ITEM 42 FECHADO EM 23/10 (v63 PUBLICADA 23/10 09:59:56Z, OK «autoriza a publicação cirúrgica da v63 se o A/B passar, deploy + prova no ar»):** candidata = 1 hunk, `ensureAcademicUi();` na 1ª execução do `ensureUi()`, antes de registrar os listeners; md5 `ea400a7c1790390b8e1cd462a62f531c`, gate de sintaxe 97/0, `diff-v63-hunks.txt` com 1 hunk; A/B no harness **APROVADO 4/4 células** (diário `mede-v63-ab-item42-diario.json`, baseline 19 tabelas); `/` público `ea400a7c` 3.370.588 B, SW `6dc1b249` CACHE v63, deploy `e445ff76…` version `36d6b88a…`; portões preflight/prepara-src/confere-bundle/HTTP/Chrome limpo verdes; reversão = `ar-html-v62-live.html` + `ar-assets-v62-live/sw-v4.js`); churn ~300/s da v59 nos command-cards com causa não atribuída (hipótese whitelist refutada por `sonda-loop-lia8.mjs`; v60 tem 0); 404-storm de `lia-avatar.png` na v60@390 é só fixture (produção serve 200). NÃO TESTADO: frequência (falta grade publicada + `bfr_teacher_directory`), envio no chat, salvar pelo modal de nota, abrir obra na Biblioteca e conta real de professor. Diário: `manual-v59-2026-10-22.md`. **E2E-2 22/10 (OK "faca os testes que precisam", ciclo mint→teste→limpeza): os 4 fluxos pendentes TESTADOS no ar (v60) com fixture sintética** — frequência APROVADO (2 marcas salvas e corrigidas, 2 linhas `bfr_lesson_attendance` + 1 audit, diário `e2e2-frequencia.json`); envio no chat APROVADO nas duas bandas (pedagogical envia a 1280; coordinator RECEBE a 390 via barra de baixo → `more` → drawer `[data-bfr-drawer-route="chat-interno"]` — a 390 a sidebar tem todos os itens 0×0 e o `#mobileMoreMenu` nunca abre, armadilha #175 —; linha no banco + `last_read_at` do membro ≥ created_at da mensagem, diário `e2e2-chat.json`); salvar nota pelo modal APROVADO (exatamente 1 linha em `grades`, 112→113, confirmação "Nota registrada no Supabase…", diário `e2e3-nota-modal.json`); abrir obra na Biblioteca APROVADO (botão `[data-teacher-library="virtual"]` → catálogo `[data-bfr-unified-catalog]` → `[data-library-open-doc]` → aba nova com URL assinada de `school-documents` + HTTP 200 `application/pdf` 1.448.452 B, diário `e2e4-biblioteca.json`). Limpeza FK-safe em ordem, baseline de 19 tabelas restaurada por contagem **e md5** (`e2e2-limpeza.json`, dif vazio), contas apagadas (auth admin 200×2), manifesto `[]`, artefatos de sonda removidos. Segue NÃO TESTADO: **conta real de professor** — FECHADO 23/10 pelo ciclo TPROF (item 53 da auditoria): telas populadas do professor medidas no ar v64 com conta sintética `pedagogical` (papel real no `account_role`) + fixture viva (turma 9ZY, 3 alunos, vínculo História, 6 notas/2 bimestres, frequência, leitura, recado, atividade), 390/1280, **55/56 checks por banda** (`tprof-teste.json`), portões verdes (writes = só 4 RPCs whitelistadas de leitura), limpeza `tprof-limpeza.json` = `BASELINE_RESTAURADA` (24 categorias, diffs `[]` por contagem E md5, 0 vivas). **Achado novo (aberto):** a tela Comunicação do professor fica `idle/0 "Nenhum comunicado novo."` com 1 comunicado publicado no banco — a rota legada `setProfessionalTeacherSection` (10026) não chama `loadTeacherCommunications`, que só existe em `showScreen('comunicacao')` (16625) sem entry point na UI (16283); severidade média, candidata natural de front-end. Dois achados de design anotados: Avaliações mostra só o bimestre mais recente (agrupa por `assessment|subject|student`, last-wins); evidência da portaria nos selects vem de `gate_checkins` ("Sem entrada registrada · não define falta" = correto). **T4.6 FECHADO em 23/10 no ar v64 (item 54 da auditoria, ciclo mint→teste→limpeza `t46-pre.json`→`t46-teste.json`→`t46-limpeza.json`):** pill vira "⚠ Portaria offline" com `is-warning` nas duas bandas (~0,8 s), leitura manual offline falha graciosa ("Sem conexão…") com **0 escritas no banco**, pill recupera na reconexão e o controle positivo online cria linha `entry/allowed` — APROVADO 9/9 com cliques reais provados por `elementFromPoint` (`noPonto:'proprio'`); limpeza `BASELINE_RESTAURADA` por contagem E md5 (8 tabelas, diffs `[]`), 0 contas vivas. **Não resta nenhum item NÃO TESTADO.** **CICLO F52B 23/10 (OK «ok», no ar v63, mint→teste→limpeza com baseline de 27 tabelas por contagem E md5 — `f52b-pre.json` → `f52b-limpeza.json` = `BASELINE_RESTAURADA`, 0 contas vivas):** (1) **52(b) REPROVADO no ar** (`f52b-t52b.json`) — check-in não gera frame no canal `bfr-parent-gate-{uid}` mesmo com a RLS do item 49 destravada: **`gate_checkins` não está na publication `supabase_realtime`** (prova por `pg_publication_tables`; entre as tabelas de portaria só `gate_entry_alerts` está publicada); a repintura do painel do parent vem só do poll de 15 s e a Home padrão (dashboard v3) oculta o painel legado por CSS; correção em 2 degraus com OK próprio (item 52(b), §N.5): **DDL APLICADO 23/10** no ciclo R64 (`f52b-pub-ddl.json`, `pg_publication_tables` 53→54, rollback congelado) e **candidata v64 PRONTA e verificada** (1 hunk CSS, md5 `d2892c31…`, §N.6 — banda ar com o DDL já recebe o frame em 818 ms; banda candidata: painel visível na Home compacta 1280/390, frame 498 ms, repaint 665 ms sem reload) — **PUBLICADA 23/10 22:54:31Z** (OK «ok» ao pedido «OK de publicação da v64»; `/` md5 `d2892c31794ae0e402ba455bc62f0092`, SW `f43e7b74` CACHE v64, deploy `e888ae42`; provada por HTTP 3 GETs e Chrome limpo cache única v64, diário `audit-publicacao-v64.json`; 52(b) FECHADO). (2) **Ocorrências — superfície viva de escrita TESTADA e APROVADA** (`f52b-ocorrencias.json`): a central oficial (`#bfrOccurrencesView`, módulo `BFRDirectionOperations`, guard `developer/director/coordinator`) abre pela aba Alertas → `[data-coord-open-occurrences]`; o form **existe e funciona** (INSERT pela UI **201** em 982 ms + render na lista) — o `bfr-coordination-central` com form+ack é módulo MORTO. Fatos medidos: a tabela `occurrences` **não tem coluna `channel`** (42703 provado) e o INSERT retenta sem ela apendando «Canal sugerido: …» à descrição (fallback do ar funcionando); `created_by` nasce `null`; a lista avisa «Nenhum responsável vinculado a este aluno.» sem vínculo; PATCH/DELETE próprios casam 0 linhas (silencioso, confirmado via PostgREST); a superfície viva **não expõe «Marcar em análise»** (`acknowledged_at` só existe no módulo morto) — **achado de produto** registrado no item 48 e em §N.5. (3) **T6.5 APROVADO** (`f52b-t65.json` + sondas `f52b-t65-probe-reply.json`/`f52b-t65-probe-sala.json`) — sem duplicação na rajada (3/3 únicos = banco) e na recuperação REST (4/4 = banco), reconexão provada por `phx_reply` ok em primeiro plano; ver [[bfr-bu-t6-tempo-real]].

**v58 PUBLICADO 22/10 05:22Z (foto da LIA no botão do topo, deployment `47356dbc` / versão `842ee0db`):** o pedido do usuário
sobre a captura do coordenador @02:05 — o chip de texto "LIA" no appbar vira a foto. Um asset mudou: `bfr-responsive-presentation.js`
`da98453e` (51.407 B) → **`a83f77ba`** (51.742 B, 5 hunks, 10+/4−) — o appbar passa a `<img src="lia-avatar.png">` dentro de
`.bfr-mobile-lia` e o `ensureDesktopLia()` cria o mesmo `<img>` em `.bfr-topbar-lia`, ambos com `border-radius:50%`,
`overflow:hidden` e `object-fit:cover`; `aria-label="Abrir a LIA"` e `data-lia-open` intactos. O `index.html` ficou **byte a byte**
no v57 (`31f209b6`, 3.468.610 B) e o `sw-v4.js` só trocou a linha `CACHE` (`8000099c`, v58); 11 assets idênticos.
Portões: preflight 8/8, SRC 4/4 (14/14), bundle verde, 3 fetches de `/` com `31f209b6`, 14/14 rotas/MIME, prova em Chrome limpo
(cache única v58, SW `activated` controlando, rp.js na cache `a83f77ba`; @390 botão **44×44** e img 42×42 — o piso de toque do
CSS do app, não o 38 do documento mínimo — @1280 42×42/img 40×40, ambos com `lia-avatar.png` natural 1254×1254 e recorte
circular; únicos 404 são `/cdn-cgi/rum?`). Reversão congelada em `ar-js-v57-live.js` (`da98453e`) + `ar-sw-v57-live.js`
(`e919ac93`, CACHE v57); o index é comum. Diário `audit-publicacao-v58.json`; armadilha de medição: o CSS do app impõe piso de
44 px ao botão, então o gate do cliente não pode exigir os 38 px do documento mínimo (lá não há esse CSS).

**v57 PUBLICADO 22/10 03:23Z (visual dos ícones do menu, deploy `c20ecf05` / versão `1db70a67`):** só dois arquivos mudaram —
`index.html` ganhou o bloco `<style id="bfr-menu-icons-v57">` (817 linhas, 58.897 B; 39 máscaras SVG, 50 rotas com paleta,
pastilha 29×29 r9 no desktop / 28×28 no drawer / 23×23 na barra) e `sw-v4.js` trocou a linha do `CACHE` para
`bfr-conecta-v57`; rp.js e os 12 assets byte-idênticos. Portões: preflight 8/8, SRC 4/4 (14/14), bundle verde, `/` e
`/index.html` 3.468.610 B md5 `31f209b6`, 14/14 rotas/MIME, prova em Chrome limpo (cache única v57, SW controlando,
bloco parseado com 1 regra, pastilha/glifo/ativo medidos, `inicio` estático como controlo positivo do ativo, únicos 404 são
`/cdn-cgi/rum?`). Reversão congelada em `ar-html-v56-live.html` (`16b61fb5`) + `ar-sw-v56-live.js` (`4b5e9e7c`), exige OK novo.
Diário `audit-publicacao-v57.json`; armadilha nova: medir "normal" num item que já nasce com classe `.active` devolve o
estado ativo — escolha um item não ativo e use o `.active` como controlo positivo.

**Item 29 FECHADO NO AR (v49, 20/10, medido por `sonda-ar-v49-recarga.mjs`).** Cada rodada mede DOIS
documentos da MESMA aba — `BOOT` e `RECARGA` — porque o próprio boot escreve o guarda
`bfr-active-navigation-v2:<uid>` (hunk D do v48); a 2ª navegação É o cenário, sem clique nem fingimento
(armadilha 122). Medido no público v49 (`d9374fb5`, diário `sonda-ar-v49-operador-natural.json`, resume
programático em `resume-v49.mjs`): **6/6 documentos** (3 boots + 3 recargas, @390/@390/@1024) com
`schoolGamesView` visível — alt **1677** @390, **997** @1024 — **6/6 com `abertos=1`** (pilha em
`abrirJogosDoBoot`, `open()` 41–168 ms depois da criação), 6/6 `sec=jogos-escolares` + `aria=page`,
**0 escritas ao banco** (o único não-GET é `cdn-cgi/rum`, e a única falha HTTP é o 404 desse beacon em
todos os 6). Coordenador de controlo: `coordinatorView` nos 2 documentos, `abertos=0`, 0 escritas (o ramo
dos Jogos nem é tocado por outro papel). **Negação local do MESMO instrumento via o knob novo `BASE=`**
(8291 = v48 **sem** E, confirmado por `grep -c` da linha do hunk no `/` servido = 0) → **0/2** documentos,
`abertos=0`, chars 711; 8294 (marca = 1) → **2/2**, alt 1677. Nos 2 documentos de 8291 apareceram ainda
**2 `POST /auth/v1/token?grant_type=refresh_token`** = rotação da sessão que eu mintei (armadilha 123),
não escrita de dados. Dois resíduos honestos: (a) a barra mobile montou em **5/6** — a recarga da 1ª rodada
@390 deu `nav=false` (chars 1836 vs 1922); os seis documentos têm o MESMO sensor injetado, então isto é
variação dentro do braço, não comparação proibida pela 116: é o sintoma do item 160/B (o `schedule()` do
rp.js debitado pelo churn), 1 ocorrência em 6 quando no v48 era a regra; (b) recarga com o guarda
noutra seção do operador (`notificacoes`) continua 0/3 porque o papel não tem container de view —
decisão de produto (fallback para Jogos), não hunk de 76 chars.

**Estado em 2026-10-14, medido no rig da auditoria (conta sintética, CDP).** Os quatro itens de **banco**
foram aplicados neste dia com OK explícito, cada um com diário de conferência próprio
(`audit-aplicado-*.json`). O `index.html` **também foi publicado** em 14/10 (`node deploy-worker.js`,
versão `7fb0f389…`, `CACHE` do sw `bfr-conecta-v31` → `v32`): o HTML no ar é byte-idêntico ao local
medido, 6/6 marcas das edições presentes, 14 rotas em 200 — diário `audit-publicacao.json`
(`confere-publicacao.mjs`, só GET, sem credencial). O que ainda **não** existe é uma passada de navegador
contra a URL pública (a varredura mobile segurava a porta 9333 no momento do deploy), e um cliente com
`v31` só troca de shell quando o `sw-v4.js` for buscado e o worker novo ativar. Ver
[[bfr-supabase-dashboard-access]] para o canal SQL.

**Deploy CIRÚRGICO em v41 (17/10, versão `6cd632b2-4319-4869-ab36-0c7f01b5865b`) — tela da Coordenação.**
Os 9 pedidos das capturas da Coordenação foram resolvidos por dois candidatos validados no harness 8252 e
publicados **a partir dos bytes do AR** (não do `bfr-conecta-patched/`, que carrega o backlog #104–#110 ainda
não autorizado — ver [[bfr-patched-nao-e-producao]]): `build-surgical-coord21.js` monta `worker-surgical/`
só trocando 2 ficheiros. O `wrangler` devolveu **"Found 1 new or modified static asset"**
(`/bfr-responsive-presentation.js`) + "11 already uploaded" — a prova de cirurgicalidade. Aplicado:
**#7** ícones coloridos na barra de baixo (`🏠 Início · 🎯 Coordenação · 🕐 Horários · ⚠️ Ocorrências · ⋯ Mais`,
swap do mapa `icons` no `bfr-responsive-presentation.surgical-cores.js`, md5 `a2cacc7e`);
**#3/#4** removidos os 2 cartões mortos (Privacidade `#privacidade`, Guia `#conteudos`);
**#2** "Abrir atendimento" retarget `#secretaria` → `#comunicados`; **#5** "Horários das aulas"
de `href:'horario-matutino-2026.png'` (só matutino) → `#horarios` (os dois turnos na view);
**#8/#5** handler de cartão reescrito para `BFR_APP_RUNTIME.navigate(target.slice(1))` em vez de
`querySelector('[data-section=X]').click()` (o `.click()` num nó hidden corria com o navigate e exigia 2º
toque — mesmo mecanismo do clique-in-progress de [[bfr-coordination-dead-button-idioms]]). Índice final
`index-surgical-coord22.html` md5 `01358462d9c08bb1334700b8f0567661`, sw `CACHE bfr-conecta-v40 → v41` +
`?v=12 → 13`. **Provado no `/` público autenticado** como coordenador real @390 (`render-live-coord22.mjs`):
boot `role=coordinator`, 6 cartões, todas as `#rotas` chegam num único toque, modal de jogos abre, 0 erros de
console. **Duas armadilhas de medição que este lote abriu:** (a) o `?open=` do harness re-navega para a seção
pedida depois do boot e arranca a rota do cartão — a falsa "horários quebrado" vinha daí, mede **sem**
`?open=`; (b) `desligar(cdp, proc)` precisa de `proc.processo` como 2º argumento ou o porto CDP fica zumbi.
**#1 RESOLVIDO, validado por A/B e PUBLICADO em v42 (deploy `3d2d9b17-82ee-4ac5-ae3f-79c9f9ea30ff`, 17/10).** Causa lida no arquivo: o `onAuthStateChange`
(INITIAL_SESSION, uma vez por carga) chama `openPreferredNameModal()` sempre que `profile.display_name_custom`
está vazio — a conta coordenadora sintética `741325a3…` tem `null` — e o overlay `role=dialog aria-modal`
cobria o app e interceptava o 1º toque. O "Agora não" só gravava o skip em memória (`preferredNameState.skippedUserId`),
perdido a cada recarga → **re-nag em todo acesso novo**. **Decisão do usuário via pergunta: "Persistir 'Agora não'"**
(onboarding continua no 1º acesso, mas o skip passa a ir para `localStorage['bfr-pn-skipped:<id>']`; salvar o
nome limpa a chave). Candidata `index-coord23-pn-candidata.html` md5 `3f852b7d…`, gerada por `gerar-coord23-pn.mjs`
a partir dos bytes EXATOS do AR (origem coord22 md5 `01358462…`), delta +466, 4 edições de âncora única,
98 blocos de script / 0 erros. **A/B no navegador @390** (`valida-pn-coord23.mjs`, harness 8261 servindo o AR vs
8262 a candidata, rp.js `a2cacc7e` nos dois, só clique em "Agora não" — zero escrita no banco): coord22 → após
dispensar `skipLS=null` e modal **volta** no reload (o bug reproduzido); coord23 → `skipLS="1"` e modal **nem é
criado** no reload (corrigido); carga 1 abre o modal nas duas (onboarding preservado); 0 erros de console.
Bundle cirúrgico `worker-surgical-42/` (`build-surgical-coord23.js`): trocou **só** o `index.html` e fez bump
`CACHE v41 → v42` (fonte `ar-sw-v41.js`); rp.js inalterado. **V42 PUBLICADO com OK explícito** (17/10, versão
`3d2d9b17-82ee-4ac5-ae3f-79c9f9ea30ff`, "No updated asset files to upload" = só o worker.mjs mudou).
**Prova no AR conferida por bytes:** `/` público md5 `3f852b7dbbfaa11f632dc704c28143ac` = candidata
byte-idêntica; `sw-v4.js` `const CACHE = 'bfr-conecta-v42'`; `bfr-responsive-presentation.js` ainda
`a2cacc7e…`. Leitura honesta: o comportamento foi medido no navegador **sobre estes mesmos bytes** no
harness; não rodei uma passada de navegador nova contra o endereço público nesta vaga — o md5 idêntico é o
que garante que o cliente executa o artefato medido. Reversão = devolver coord22 + `ar-sw-v41.js` (v41) e
republicar.
**Armadilha de medição que este achado deixa:** qualquer passada autenticada de render/toque com uma conta de
`display_name_custom` nulo popa `#preferredNameModal` sobre o app e mata o 1º toque — dispense o modal (ou use
conta com nome) antes de concluir "botão morto"; no build v41 o "Agora não" **não** sobrevive ao reload, então
um teste que recarrega o reabre.
**#9 RESOLVIDO, validado por A/B e PUBLICADO em v43 (deploy cirúrgico `a415666c-08fb-490f-b1ae-9dfc01524e82`, 17/10).** A nota antiga
dizia que `restoreNavigationState` só preservava rolagem sob `isDeveloper()` — **errado**: esse par
`remember/restoreScrollPosition` é só do módulo de lista de alunos. Existe um mecanismo GERAL e **não**
gated, `<script id="bfr-route-scroll-memory">` (vivo desde o v40), que salva em `sessionStorage` por
`view:section` e restaura em `bfr:app-ready`/`pageshow`/`visibilitychange`. **Causa real do "às vezes vai
pro topo":** o `restorePosition` faz **UMA** escrita em `requestAnimationFrame(()=>requestAnimationFrame(...))`
e corre contra o conteúdo assíncrono da seção — se o painel ainda não atingiu a altura do alvo no instante
da escrita, `scrollTop` clampa (muitas vezes a 0 = topo) e **nada reaplica** quando o conteúdo cresce
depois; quando chega a tempo, restaura. Reproduzido por A/B no harness @390 (`valida-s9.mjs`, andaime de
medida que encolhe o conteúdo, dispara a volta ao app e o re-cresce ~160 ms depois): alvo salvo `1198`;
v42 parou em `838` (o teto do conteúdo curto no instante, sem perseguir a chegada); coord24 subiu a `1198`
(recuperou); 0 erros de console. **Candidata** `index-coord24-s9-candidata.html` md5 `6f682c09cc7288cdcb3fa2c924bcbc27`,
gerada por `gerar-coord24-s9.mjs` dos bytes EXATOS do AR (origem v42 `3f852b7d`), delta +562, 2 edições de
âncora única, 103 blocos / 0 erros: **E1** restore reafirma o alvo com `behavior:'instant'` em loop de
rAF até o scroller segurar (teto `tentativa<40` ≈650 ms) em vez de uma única escrita; **E2** o listener de
captura que salva passa a casar também `[data-bfr-mobile-route]` (a barra de baixo mobile não tem
`data-section`, então sair por ela nunca gravava a posição). **Não mexe no #80** (tocar a aba já ativa
ainda rola ao topo: o restore só dispara nos eventos de retorno ao app, não no toque de navegação).
Bundle cirúrgico `worker-surgical-43/` (`build-surgical-coord24.js`): trocou **só** o `index.html` e fez bump
`CACHE v42 → v43` (fonte `ar-sw-v42.js`); rp.js `a2cacc7e` inalterado. **V43 PUBLICADO com OK explícito**
(17/10, deploy `a415666c-08fb-490f-b1ae-9dfc01524e82`, "No updated asset files to upload" = só o worker.mjs).
**Prova por bytes no AR:** `/` público md5 `6f682c09cc7288cdcb3fa2c924bcbc27` = candidata byte-idêntica;
`sw-v4.js` `const CACHE = 'bfr-conecta-v43'`; rp.js ainda `a2cacc7e…`; as 2 edições presentes no `/` publicado
(1 ocorrência cada: `tentativa < 40` e `[data-bfr-mobile-route]')) savePosition`).
**Prova de navegador NO ENDEREÇO PÚBLICO** (`live-s9-prova.mjs`, @390, coordenador real, sessão semeada na
origem workers.dev, mesma técnica do A/B): `navKeys=[inicio,coordenacao,horarios,ocorrencias,more]` (confirma o
alvo do E2), o listener `hidden` do app publicado gravou `{"coordinator:ocorrencias":<alvo>}`, no instante do
restore (conteúdo encolhido) o scroll clampou a **838** — o mesmo teto do v42 — e depois do re-grow a alça de
re-assert do fix perseguiu o alvo: **Δ=0 em 3/3 amostras (alvos 1198/998/1397), 0 erros de console**; diário
`audit-s9-prova-publicada.json`. Leitura honesta: a condição do bug (conteúdo que chega depois do restore) é
criada por andaime de medição (colapsar/re-crescer os filhos da view); o que se prova é que o código restaurado
no AR persegue o alvo, enquanto o v42 parava no clamp. Reversão = devolver coord23 + `ar-sw-v42.js` (v42).

**A passada ao ar FOI RODADA em 15/10, e o resultado não é "tudo limpo".** `audit-sweep-publicado.json`
tem 164 visitas @390 no endereço público (159 chegaram, **0 travas**, 0 presas no login, cada linha com
`publicado.caches = ["bfr-conecta-v33"]` e `syncAreaNav` nas chaves de `window.BFRPlatform` — a prova de
que o navegador executou o shell novo, não o cache velho), mais `audit-sweep-publicado-aluno.json` com 35
visitas na conta sintética real. O que ela abriu:

- **Reentrada do espaço do aluno = pilha estourada.** `navigate('meu-espaco')` numa tela que já está no
  espaço do aluno lança `RangeError: Maximum call stack size exceeded` (medido no ar,
  `audit-publicado-hunks-aluno.json`, campo `telas[].reentrada`). Causa lida no arquivo: `index.html:19089`
  embrulha `BFRPlatform.open` para `meu-espaco`+aluno e chama `open()`, e `open()` chama
  `syncNavigation('meu-espaco')`, que reentra em `open`. Efeito colateral na metodologia: **o teto de 30 s
  da reentrada nunca foi testado nessa tela** — o segundo `navigate()` morre antes de os estados
  `antes`/`depois` serem comparáveis.
  **Status 15/10: guarda `state.abrindo` APLICADA local** (`index.html.bak-reentrada-1`, delta 587 chars no
  outro patch) e **provada no harness do aluno** — `audit-reentrada-aluno-53-depois-local.json` e
  `audit-reentrada-local-53-rerodada.json`, dois diários independentes, base `http://localhost:8241`,
  `chegada.perfil = student`, 4 entradas do ciclo (`BFRPlatform.open`, `BFRStudentSpace.open`,
  `runtime.syncNavigation`, a reentrada composta `open → BFRPlatform.open`) com `ret=true`, `sec=meu-espaco`
  e `state.abrindo` devolvido a falso, **0 exceções**. Não existe "antes" local: as corridas no 8240 abortam
  no guard de papel (ver [[bfr-audit-rig-traps]] item 28). **O ar continua em v33 sem a guarda** — publicar
  (v33 → v34) é o passo que fecha o item.
- **Destaque errado na barra de baixo (#55) — APLICADO local, causa provada no runtime.** `activeRoute()`
  consultava a sidebar do desktop, `.nav-item.active:not(.hidden)`; em 390 px ela está com `display:none` no
  próprio elemento (sem a classe `hidden`), então o `.active` parado nela vence `runtime.activeSection`. A
  sonda (`audit-sonda-destaque-antes.json`, 18 visitas @390 antes do patch) mediu **10** visitas com item de
  sidebar `.active` e `visivel:false`, **9** com a barra destacando rota diferente da ativa, **0** travadas; a
  gaveta (`bfr-responsive-presentation.js:178`) sofre do mesmo ponto. Patch com `comAltura()` + fallback no
  `runtime.activeSection` aplicado em `bfr-responsive-presentation.js` (backup
  `bfr-responsive-presentation.js.bak-destaque-55`, checagens 9/9), regressão de 86 pares @390 em
  `audit-sweep-pos-55.json`. Ficam de propósito FORA: as 56 linhas "rota fora da barra" (`quickRoutes` fixa
  4 itens por papel = decisão de produto) e a fixação de `previousDirectorRoute`. `?v=11 → ?v=12` é passo de
  publicação.
- **As 5 rotas que "não saem de `inicio`" são identidade, não rota.** Com a conta real de aluno,
  `student/aprender|evoluir|escola|meu-espaco` chegaram no ar. O guard que lê o papel real da conta é o
  sintoma; a tela funciona.
- **Responsável sem filho continua sem cenário:** 4 visitas de `parent` no ar ficaram em `inicio`
  (`viewReal:"student"`, `desistiu:true`) com painel de 1265c — a conta sintética tem zero filhos em
  `guardian_students`, então isto é ausência de dado, não defeito provado.

**Como está o ar hoje (15/10, v34).** Os três patches que estavam aplicados só em local **foram publicados
e medidos no endereço público**. Ordem e diários: `bump-versoes-publicacao.mjs --apply` → 8/8 verdes,
`CACHE` `bfr-conecta-v33 → bfr-conecta-v34` e `?v=11 → ?v=12` (`audit-bump-versoes.json`);
`node deploy-worker.js` → versão **`76cc8f58-ca78-4674-87a4-d196995b9cfd`** criada 09:18Z;
`confere-publicacao.mjs` → **3.330.710** caracteres no ar = local, `identico_ao_local: true`,
6/6 marcas A–F presentes, `CACHE` lido no ar = `bfr-conecta-v34` (`audit-publicacao.json`);
`verify-deploy.js` → 14/14 rotas em 200 com MIME certo. A prova da versão no ar não é memória do deploy:
`confere-versao-no-ar.mjs` lê o `deployments list` do wrangler e grava `audit-versao-no-ar.json`
(`76cc8f58` atual, `004077c9` anterior).

- **#53 no ar: o `RangeError` caiu.** `probe-hunks-publicado.mjs` com a sessão nova do aluno
  (`bfr-audit-session-student-live.json`, reemalada por `reemala-sessao.mjs` porque o refresh velho estava
  queimado — armadilha 31) devolve em `audit-publicado-hunks-aluno-v34.json` `reentrada.chamado=true`,
  `sec=meu-espaco`, **0 exceções**, e o estado `depois` idêntico ao de `chegada`. O mesmo probe no shell
  `v33` lançava `RangeError: Maximum call stack size exceeded`. Leitura honesta: o que se prova no ar é a
  **ausência da exceção**; o estado lido é o vazio (`installed:false, loading:false, tentouEm:0`), então a
  coalescência com recarga continua medida só no harness local.
- **#55 no ar: o script novo roda, e a contagem por papel não vale.** `audit-sweep-publicado-55.json` =
  87 visitas @390 com `caches=["bfr-conecta-v34"]`, 0 travas, 0 presas no login. `conta-menu-baixo.mjs`
  classifica `ok 8 · SEM_DESTAQUE 36 · rota fora da barra 39 · DESTACA_OUTRA 4` — mas `navVisiveis` vem
  **vazio em 75 das 87**, porque com a sessão `developer` a barra medida é sempre a do `developer`
  (armadilha 32). A prova de usuário veio com a sessão do próprio papel: `audit-sonda-destaque-ar-55-aluno.json`,
  `roleReal=student`, barra `[Início, Boletim, Agenda, Jogos, Mais]`, **4/4** rotas do aluno destacadas.
  O delta que vale continua sendo o do MESMO conjunto de pares local (`audit-compara-destaque-55.json`:
  `DESTACA_OUTRA_ROTA_DA_BARRA` 50 → 6 em 86 pares).
- **#48 no ar: o operador tem painel.** Antes (harness): 5 rotas em `view=admin` com despejo de 154.302c.
  Depois local: `inicio`/`jogos-escolares` `#schoolGamesView` 1867/1854c, `notificacoes` 1161c,
  `conteudos` 2080c, `coordenacao` → fallback. No ar (`audit-sweep-publicado-55.json`): 1854/1161/2080c.
  **Continua aberto:** `contas_com_papel=0` no banco, então não existe sessão de operador para medir — só
  preview; e `monitor/inicio` morre em `navigate travou` na sonda de chrome com a sessão de aluno
  (`audit-sonda-appbar-48-aluno.json`).
- **#47 fechado:** LOTE 1 + LOTE 2 aplicados, catálogo em `audit-lote2-confere.json` (14 rótulos, CHECK
  com `sports_operator`, 0 contas), prova por `begin/rollback` em `probe-corpos-4-funcoes.json`.

**Como o relatório conta isso agora:** `compara-publicado.mjs` ganhou a seção **H.6** (deploy novo + as
quatro provas acima, tudo lido dos diários) e rotula H.1–H.5 pelo cache **das visitas** (`v33`), não pelo
`cache_no_ar` do diário de publicação — que é vaga única e foi sobrescrito pelo confere do v34
(armadilha 33). `audit-relatorio.mjs` lê `audit-bump-versoes.json` e `audit-versao-no-ar.json` para o par
de versões, `audit-lote2-confere.json` para o LOTE 2, e a seção G passou a descrever o deploy `76cc8f58`.

Armadilha de redação que nisto esbarra: o rodapé do relatório dizia "*164 medidas @390 no build
publicado*" para `audit-sweep-funcional.json`, que é uma passada do **harness**. Diário medido em
`localhost:8240` não pode ser rotulado de "publicado"; hoje o rodapé distingue as duas origens. Sempre
que uma linha do relatório depender de qual endereço foi medido, amarre a frase ao arquivo de diário, não
à memória de quem rodou.

* **Trava a aba inteira** (nenhum `Runtime.evaluate` responde, e persiste depois de reiniciar o Chrome
  com profile novo). Não é o canal CDP: `Debugger.pause` interrompe o laço e amostra a pilha, e
  `probe-mut.mjs` conta os disparos. **Causa medida — dois ciclos de mutação auto-alimentados:**
  1. Callback do patch da Direção (`patchWeatherCard(); … auditDirectionKpis(); patchDecisionArea();
     patchNoteForm()`, observado em `childList` do `#appShell`): `auditDirectionKpis()` fazia
     `small.textContent = small.textContent.replace(/cadastro oficial|ano letivo atual/i, m => m)` para
     todo KPI com valor `0`. O `replace` devolve o mesmo texto, mas o setter de `textContent` **sempre**
     troca o nó de texto → o observador re-dispara o callback → laço sem fim. Medido em
     `teacher/professor-agenda-hoje`: 96.529 disparos de callback e 4.487 escritas de texto em ~8 s,
     com o DOM crescendo de 3.4k para 14k nós antes de a aba morrer.
  2. `bfr-student-today.js`: `boot()` está ligado a `new MutationObserver(boot).observe(document.body,
     childList/subtree)` **e** a `setInterval(boot, 1200)`; `refresh()` só sai pela guarda quando
     `data.loaded` vira `true`, então um login de aluno sem registro vinculado reentra para sempre
     (cada `host.innerHTML` é a mutação que chama de novo). Medido em `student/notas`: 167.611 disparos.
     As escritas dessa tela caem na continuação `async`, fora da atribuição síncrona do contador — ver
     [[bfr-audit-rig-traps]] item 9.
  Por isso congela *tela do professor* e *tela do aluno*: os painéis de outros perfis continuam no DOM
  (hidden) e os observadores varrem o documento inteiro, não a view ativa.
* **`coordinator/comunicacao` abria vazia** — 0 caracteres, 0 nós no painel, com a entrada destacada na
  gaveta. **CORRIGIDO 14/10** (`patch-comunicacao.mjs`, aplicado): o ramo da Coordenação escondia todas
  as `.content` sem restaurar nada; agora mede 2.796 caracteres no diário novo.
* **`student/comunicados` "PAINEL VAZIO" na passada web NÃO é tela em branco** — é o alvo: o mapa
  declarava `.notice`, classe de card, que resolve e mede 36 caracteres / 4 nós. Antes de abrir
  qualquer frente de "estado vazio faltando" a partir de uma tarja `PAINEL VAZIO`, confira se o `alvo`
  da linha é container ou folha (ver [[bfr-audit-rig-traps]] itens 18 e 20). O que a passada web de
  14/10 **confirmou** como defeito real são as 5 rotas que não saem de `inicio` em 1024 (student ×4 +
  aee ×1), a mesma lista do achado da tarefa #39.
* **FAB global `"Cadastrar aluno"` + bolinha da LIA — APLICADO e medido 15/10** (decisão do usuário:
  *"Subir o FAB acima do menu"*). A causa é geometria do bloco de override do próprio app: o piso
  reservado é `#appShell.ready{padding-bottom:calc(108px+env())}` mas os FABs sentavam em **96 px (LIA)
  e 88 px (aluno)** — dentro da faixa reservada. Patch (`patch-fab-e-status.mjs`, 4 âncoras) colocado em
  15/10 03:46 com `index.html` de `ef00273d…` → `99e87273…`, reversão em `index.html.bak-fab-piso-1` e
  `index.html.bak-status-voo-1`; 97 blocos de script, 0 erros (`confere-sintaxe-html.mjs`).
  **Par antes/depois medido** (`mede-fab.mjs`, porto 9361/9363; o "antes" foi recriado restaurando o
  backup, conferido pelo md5 idêntico ao pré-patch, e medido — depois o patchado foi restaurado e o hash
  conferido de novo): antes, FAB a 88 px e LIA a 96 px, **dentro da faixa reservada em 5/5 larguras**,
  penetração máxima **12 px** (FAB) e 4 px (LIA); depois, ambos a **116 px** (= 108 do fallback + 8),
  **0/5 dentro da faixa**, folga mínima **16 px** nos dois. `--bfr-nav-piso` não está definido no
  elemento, então o `calc()` cai no fallback de 108 — se o menu um dia passar disso, o valor real tem de
  vir do `ResizeObserver` de `bfr-responsive-presentation.js` (`?v=12` + bump de `CACHE`).
  @320 **não mediu** nas duas passadas: a sonda da rota `coordinator/horarios` não devolve retângulo
  nessa largura (o chip, na mesma largura e sessão, responde) — condição do instrumento, não veredito do
  app. Armadilha de métrica: `fabVsNav.sobrepoe` é `false` **nos dois builds** (menu desenhado com 72 px
  dentro da faixa de 100 px reservada); quem diagnostica o defeito é a comparação com a **faixa
  reservada** (`conferereserva-fab.mjs` → `audit-fab-reserva.json`), não o rect pintado.
* **`coordinator/inicio` ficava em "ATUALIZANDO DADOS…" — APLICADO e medido 15/10.** Mecanismo: o
  escritor do chip caía em `null` sem `updatedAt` e o `if(update&&…)` seguinte **nunca limpa** o texto já
  impresso; e `periodMeta()` tinha throw síncrono fora do `try` do `load()`, o que orfava
  `state.loading=true`. As duas edições entraram no mesmo lote. Conferência arquivo-a-arquivo
  (`audit-escritores-chip.mjs`): 4 escritores, 3 vivos, **1 vivo com fallback `null` → 0**, rótulo
  ocioso agora `Aguardando dados` nos três. Conferência de campo (`mede-fab.mjs`, série `chipPorTempo`):
  antes, **1 largura (@768) ainda em "Atualizando dados…" aos 7 s com o shell pronto**; depois, nenhuma
  largura presa aos 7 s ou 12 s — `null` → `Atualizando dados…` (2-4 s, requests em voo) →
  `Atualizado às HH:MM` (7 s/12 s). A série do chip **não existia** antes de 15/10: a `SONDA` devolve
  `JSON.stringify(...)` e o laço do tempo descartava string (`typeof v === 'string' ? {}`), gravando
  `chip: undefined` para uma tela que estava sendo lida. Ver [[bfr-rig-diagnostico-pos-falha]].
* **Escrita de `anon` revogada em 15/10** (`sql-revoke-anon-escrita.sql`, 134 tabelas sem nenhuma policy
  para `anon`/`public`; `apply-sql.mjs --apply` → HTTP 201): **156 → 22** tabelas com privilégio de
  escrita, e o conjunto das 22 com policy permanece idêntico (`audit-anon-escrita.pre-revoke.json` ×
  `audit-anon-escrita.json`). SELECT de `anon` intacto; `access_requests` continua com INSERT público.
  O `support_professionals` estava nesse lote — a view `support_professionals_directory` só é segura por
  `security_invoker=true`, e recriá-la sem a opção volta a ler como dono.
* **Banco: as 7 policies `SELECT` para `authenticated` sem nenhum USING** — `bfr_teacher_directory`
  (35 registros com `profile_id` + nome), `bfr_subjects` e 5 tabelas `sports_*`. **APLICADO 14/10**
  (`sql-fechar-leituras-abertas.sql`, `begin;/commit;`, conferência em
  `audit-aplicado-leituras-abertas.json`): abertas no schema inteiro hoje **0**, 12/12 papéis batem com
  a previsão do pré-voz, 0 contas perdem nome, anon por REST leva 200 com **0 linhas**.
  **A previsão de ganho não se materializou**: o pré-voz mediu os 3 alunos vinculados subindo de 20–21
  para 22 nomes na grade; o banco aplicado devolve 21→21, 20→20, 20→20 — igual ao antes. O +1/+2 era
  artefato do modelo escrito à mão na predicate da sondagem, não da policy que foi ao ar (ver
  [[bfr-audit-rig-traps]] item 12: sonda a definição real do catálogo, nunca a cópia). Pré-voz por
  impersonação em `audit-preflight-impersonacao.json` + `audit-preflight-vinculos.json`; leitores
  diretos do diretório no app: secretary/developer (`index.html:21803`, gate
  `['secretary','developer']`), pedagogical/aee (`7809`, `canLinkTeacher`), coordinator/director/developer
  (`13578`) e director/developer (`25036`) — todos mantêm os 35. As 4 contas de `parent` do banco têm
  **zero filhos** em `guardian_students`, então o caso responsável continua sem prova com dado real.
  Reversão: os 7 literais `USING (true)` estão em `backup-all-policies-2026-10-13.sql`.
* **`bfr_resolve_communication_recipients(text[], uuid[], uuid[])` — APLICADO 14/10**
  (`sql-fechar-oraculo-comunicacao.sql`; corpo agora com 2.939 caracteres, `auth.uid()` citado e o gate
  de papel presente; conferência em `audit-aplicado-oraculo-comunicacao.json`: 12/12 papéis batem,
  `gatekeeper/monitor/parent/student` caem a 0, anon por RPC = HTTP 401). Antes: SECURITY DEFINER com
  corpo sem vírgula de checagem de sessão, e **aluno, responsável, monitor e gatekeeper resolviam os 26
  perfis da escola** com `p_group_types='{all}'`. O único chamador no app é o composer do módulo
  multiprofissional, gateado em `['psychology','social_work','developer']` (`index.html:19891`, chamada
  em `20030`). Guard validado papel a papel com rollback (`guardar-rpc-comunicacao.mjs`); corpo antigo
  em `rpc-corpo.txt`. Não virar `SECURITY INVOKER`: `psychology` lê só 12 perfis pela RLS de `profiles`
  (`audit-preflight-perfis-rls.json`) e o composer resolve grupos inteiros — invoker encolheria o envio
  em silêncio.
* **As 5 views `sports_public_*` — APLICADO 14/10** (`sql-fechar-views-sports.sql`; ver
  [[bfr-views-bypass-rls]]): nenhuma tem mais `SELECT` de `anon`, anon por REST = HTTP 401
  "permission denied for view", as 5 projeções mantêm a mesma lista de colunas (9/4/6/17/10) e 12 papéis
  leram as views dentro da própria sessão devolvendo 0/0/0/0/0 — as tabelas-base têm 0 linhas, então
  fechar a view não esvaziou tela nenhuma.
* **`bfr_support_request_matches(uuid, uuid, uuid?)` — APLICADO 14/10**
  (`sql-fechar-oraculo-suporte.sql`; anon agora leva HTTP 401 "permission denied for function" e
  `authenticated` continua executando; conferência em `audit-aplicado-oraculo-suporte.json`). Antes:
  SECURITY DEFINER, EXECUTE liberado para `anon`, corpo sem verificação de sessão → oráculo de
  enumeração de `support_requests` (200/`false` para uuids aleatórios com a chave publishable). Funções
  public executáveis por `anon`: **57 → 56**; 41 checam sessão no corpo e as demais são triggers,
  normalizadores de CPF/nome ou delegam a `bfr_staff_role()`.
* **Papéis que o app oferece e o banco não tem.** `current_role()` devolve o enum `account_role`
  (pending, parent, student, pedagogical, developer, monitor, gatekeeper, coordinator, secretary, aee,
  director, psychology, social_work). O seletor do app usa 13 nomes e quatro **não estão no enum**:
  `teacher`, `admin`, `multiprofessional`, `sports_operator` — e não há um perfil sequer com esses
  valores. Só um deles é código morto de autorização: `sports_operator` aparece nas listas de
  `sports_role_allowed(ARRAY[…])` (que compara `profiles.role::text = any(...)`) em
  `sports_matches/athletes/match_events_read` e nas funções `sports_record_event`,
  `sports_set_match_status`, `sports_rebuild_standings` — ou seja, operador de placar não existe para o
  banco e o módulo esportivo fica inacessível a quem o app apresenta essa opção.
  **Cuidado com o falso achado:** os `'teacher'` de `bfr_lesson_attendance_insert/_update` e
  `bfr_psychology_articulations_insert/_read` são **valores de coluna** (`source = 'teacher'::text`,
  `articulation_type <> 'teacher'::text`), não comparação de papel — a comparação ao lado é
  `current_role() = 'pedagogical'`. Contar literal entre aspas como papel fez o relatório publicar
  "professor nunca marca frequência por essa path", que é falso; `papeisCitados()` agora só aceita
  literal em contexto de papel (`role_allowed(…)` / `…role… = | in | = any`).
* **Contagem de autorização por papel real (411 policies, remedida depois do apply):** 371 decidem por
  papel, 36 por vínculo (`auth.uid()`), 4 por expressão de dados, **0 abertas** e 0 tabelas sem RLS.
  No `bfr_teacher_directory`, **34 das 35 linhas têm `profile_id` nulo**, então o disjunto "dono" não
  salva quase nada — quem depende da lista é salvaguardado pelo `EXISTS` em `bfr_schedule_entries`.
  `developer` escreve 130 tabelas, `coordinator` 90, `director` 86, `aee` 56,
  `pedagogical` 51, `secretary` 47, `psychology` 13, `social_work` 14, `student` 4, `monitor` 4,
  `parent` 3, `gatekeeper` 1, `pending` 1.

**Como está o ar hoje (15/10, v34).** `node bump-versoes-publicacao.mjs --apply` subiu `bfr-conecta-v33
→ v34` e `bfr-responsive-presentation.js?v=11 → ?v=12` (8/8 verdes), `deploy-worker.js` publicando
script+assets juntos (Versão `76cc8f58…`, 15/15 rotas em 200) e `confere-publicacao.mjs` conferindo
`no ar 3330710c · local 3330710c · idêntico: true`, 6/6 marcas A–F. As três provas no endereço público
depois do deploy:
- **#53** — `audit-publicado-hunks-aluno-v34.json` (`AUDIT_ARQ_SESSAO=bfr-audit-session-student-live.json`,
  @390): `student/meu-espaco` → `reentrada {chamado:true, sec:"meu-espaco", view:"student"}` **sem
  exceção**, estado idêntico antes/depois do segundo `navigate()` (12456c). O "antes" no ar é o
  `audit-publicado-hunks-aluno.antes-v33.json` com `RangeError: Maximum call stack size exceeded`.
- **#55** — `audit-sweep-publicado-55.json` (87 visitas @390, 0 presas no login, 2 não chegaram:
  `student/aprender` e `aee/meu-espaco`, ambas explicadas pelo guard de papel real / pela remoção
  deliberada de `meu-espaco` do mapa do AEE) + `audit-menu-baixo-publicado.json`: destaque errado
  caindo de 50 para **4** com `sidebar_coincide 0/4`. A leitura de usuário foi medida com a **sessão do
  próprio papel** (`audit-sonda-destaque-ar-55-aluno.json`): as 4 rotas do aluno saem destacadas **4/4**;
  sob `?role=` de preview a barra é sempre a da conta real (armadilha 32 de [[bfr-audit-rig-traps]]).
- **#48** — `patch-operador-painel-48b.mjs --apply` (8/8, backup `index.html.bak-operador-48b`) e as
  quatro trocas do #48 no ar: as 4 rotas do operador mediram painel com conteúdo (1854/1854/1161/2080
  caracteres) na passada publicada, e o controle `coordenacao` cai no fallback do mapa. **Aberto:** o
  chrome mobile do operador não monta — `sports_operator` e `monitor` são os únicos papéis com
  `esperaMenu=6000` e `navVisiveis=0`; a sonda `audit-sonda-destaque-ar-55.json` acha `appbar=false`,
  `nBarra=0`, `nGaveta=0` nas visitas que não travaram (uma delas, `monitor/inicio`, com
  `navigate travou`), enquanto `student/inicio` monta 5 botões em 3,8 s na mesma sessão. `quickRoutes`
  dos dois existe no arquivo (:19, :22), então a causa não é a lista.
- **#47** — LOTE 1 **e** LOTE 2 aplicados com o portão livre; catálogo com 14 rótulos e o
  `profiles_role_allowed` incluindo `sports_operator`; a prova do CHECK foi feita em
  `begin/rollback` sobre a conta sintética (UPDATE aceito, 0 contas com o papel depois do rollback).
  Continua não existindo conta real de operador (28 perfis, 0 com o papel), e por isso o painel do
  operador só é alcançável em preview de desenvolvedor.

**Defeito pré-existente aberto achado em 15/10 no ar (v35, não criado pelo patch de rolagem).** No painel
do ciclo de plano de ação (`#resultsLearningView`, aba Direção → Resultados e Aprendizagem) em **1440 px**,
os 6 rótulos "1. Diagnosticar" … "6. Replanejar" precisam de 121 px e a grade `.bfr-results-cycle`
(`repeat(6, 1fr)`) entrega colunas de 113,2 px — `scrollWidth > clientWidth` nos seis. Só ficou visível
porque a passada do ar pegou o painel no estado **carregado** (1.780 chars) enquanto as passadas locais
pegavam o de carregamento (586). Provado pré-existente pelo A/B dos dois builds no MESMO estado: antes =
6 cortes + 11 elementos fora da borda + `nav.bfr-results-tabs` rolável; depois = 6 cortes + 0 + 0. Ficou
como pendência deliberada (mexer na largura da coluna seria mudança estética, não correção de rolagem).

**Estado do ar em 15/10 (v35, deploy `5bf07a97-4440-4d80-a875-66a9abee8554`)**: a correção de rolagem
horizontal da aba Direção está publicada e medida no endereço público — 56 visitas das 7 seções
(`audit-sweep-publicado-v35.json`) e 28 visitas das 7 abas internas do executivo × 4 larguras
(`sonda-abas-ar-v35.json`), todas com `caches: ["bfr-conecta-v35"]`, `rolaveis` 0, `estourados` 0, `erros`
0, colunas e ações das tabelas intactas. Duas coisas que continuam **sem** prova no ar, e não devem ser
anunciadas como resolvidas: nenhuma tela foi medida com sessão de um diretor real (a conta é a sintética
`auditoria.qoder.teste@bfr-conecta.test`, `?role=director` só seleciona a view), e nada foi clicado
**dentro** das abas (abrir perfil de aluno, baixar PDF). Ver
[[bfr-rolagem-direcao-armadilhas]] e [[bfr-publicacao-worker]].

**Estado do ar em 16/10 (v36, lote das 14 capturas da Direção)**: `index.html` vivo
`8f8d2bc9223e9f0be44353f2c6450e17` / 3.349.761 chars, 98 blocos, HTML do ar byte-idêntico ao local,
`const CACHE = 'bfr-conecta-v36'`. O item 13 (foto de perfil) está **fechado e medido pela interface real**
na URL publicada: arquivo no `<input>` → handler do app → prévia com `<img>` de 256 px, avatar de par
pintado pela URL assinada, `remover()` devolvendo a coluna a `null` com 0 objetos no balde. Continua sem
prova: o rótulo "Atualizar" do acompanhamento individual (caixa 0x0 na sintética) e os diálogos
+Equipe/+Atleta/+Partida (sem escopo de jogos) — os dois exigem conta real. E continuam **decisão dela**,
não código: quantas portas da LIA ficam, remover ou manter o "Voltar para a Home", e Horários como aba do
painel executivo. Detalhe em `direcao-rolagem/RELATORIO-LOTE-DIRECAO-CAPTURAS.md`.

**Estado do ar em 16/10 (v37, deploy `22820b4c-ee48-4e26-bc13-f15e0b0ef1c9` criado 18:12:22Z):** os dois
consertos que estavam só no disco foram publicados com OK explícito — o vazamento do colapsável no
`index.html` (`8f8d2bc9…` → `95eab79c…`, +361 chars) e o teto do debounce + ouvinte `bfr:navigation` no
`bfr-responsive-presentation.js` (`14d21afb` → `05d42485`, único asset novo no upload), com o
`PRECACHE_PATHS` do sw alinhado ao `?v=12`/`?v=2` que o HTML pede. Provas: os três ficheiros do ar
byte-idênticos ao local (`ar-depois-v37.*`), `CACHE = bfr-conecta-v37` lido no ar, 14/14 rotas em 200,
`audit-publicacao.bfr-conecta-v37.json` com o delta medido contra o instantâneo `ar-antes-v36.*`. No
navegador do endereço público: Coordenação/início com **1 cabeçalho, 9 colapsáveis, 19.866 nós estável
(+0/s do meio ao fim), rAF 720, 0 exceções** e `caches = ["bfr-conecta-v37"]` (`sonda-ar-v37.mjs`, porto
9423); barra do operador montada com `jogos-escolares=page` nas 6 leituras, botões de 61 px (`sonda-ar-nav.mjs
--emu=1`, porto 9427). Fica **encerrado** o item "#48 aberto: o chrome mobile do operador não monta": era
o rig — `window.resizeTo` não faz o `matchMedia` de 800 px casar e uma leitura isolada apanha a aba no
reload que o `activate` do sw impõe (itens 56 e 57 de [[bfr-audit-rig-traps]]). Continua aberto, e agora é
só decisão dela: `conteudos` não tem botão na barra (acender o "Mais"?).

**A campanha de telas (lote 44px/fonte/tiras/cortados) está APLICADA LOCAL e PROVADA por medida em 16/10.**
Seis escritas em `bfr-conecta-patched/index.html`, cada uma por gerador de candidata com portão de md5 e
contagem de ocorrências, cada uma conferida com `confere-sintaxe-html.mjs` (98 blocos de script, 0 erros):
`95eab79c…` (estado do ar v37) → `bcd037c2` (+2424, folha `bfr-telas-a11y-1` antes do `</head>`: 44×44 em
≤800px, as tiras que enrolavam, 24 seletores a 11px) → `d0191f30` (+1446) → `908ed4ee` (+885) → `36636d9f`
(+780) → `3479ce8d` (+82) → **`e874ecfd` atual**. A prova é o par de diários da MESMA matriz de 14 pares
@390, sem tocar o vivo entre as duas passadas: `audit-sweep-telas-antes.json` × `audit-sweep-telas-final.json`,
comparados por `direcao-rolagem/confere-telas-44.mjs`:

- **`fontesBaixas` 80 → 0** (teto de 8 por tela, então 80 era o teto em 10 telas; nenhum resíduo).
- **`tapMenores` 33 → 1.** O 1 que sobra é um `input[type=checkbox]` de 16×16 dentro de `label.bfr-gate-auto`
  — a área de toque neles é o rótulo, critério deliberadamente fora do piso (decisão, não esquecimento).
- **`rolaveis` 3 → 0** (as tiras `overflow:auto` agora enrolam ≤800px).
- **`truncados` 3 → 1.** O resíduo é o `::before` decorativo do painel de aniversários com `right:-90px`
  num contêiner de 360 — 450−360 bate exato; é pseudo-elemento, não texto cortado.
- **`semNome` 6 → 6, e não são defeito do app:** todos os 6 têm `fechado=true`, ou seja, estão dentro de
  `<details>` fechado — `content-visibility:hidden` dá rect cheio (362×44) com `innerText` vazio. 3 têm
  `textContent` e 2 têm `labels`. A sonda `acha-sem-nome.mjs` (que só casa `for=`) rotulou 264 controles
  como mudos por isso; ver [[bfr-audit-rig-traps]] itens 58 e 59.

A cascata foi o obstáculo real: a primeira folha escrita com `#appShell …` não surtiu efeito porque as
folhas injetadas em runtime vêm **depois** do `</head>` e empatam por ordem. Só `html #appShell …` (1,1,2)
vence sem `!important`; e as duas linhas `font: 700 10px … !important` do CSS próprio tiveram de ser
editadas na própria declaração. Detalhe em [[bfr-css-cascade-traps]] itens 4 e 5.

**PUBLICADO 16/10 às 20:15Z — `CACHE` subiu para `bfr-conecta-v38`, deploy `98ba5b61-9ea4-40ba-814d-
-211ede9106f7`. Os oito lotes de tela estão no endereço público.**

**A faixa web fecha o resto em 16/10, com o lote WEB1/WEB2 aplicado (md5 local `790cdacd`,
delta +167).** Comparável dos mesmos 12 pares × 2 larguras (`audit-sweep-web-alvos.json` ×
`audit-sweep-corte-web2.json`, por `direcao-rolagem/confere-corte.mjs`): **`fonte<11` 118 → 0**,
`rolaveis` 9 → 5 (só `nav.bfr-monitor-tabs`, que enrola ≤800 por decisão) e os 36 `truncados` com
**zero perda de conteúdo** — a varredura passou a gravar `precisa` (largura do texto por `Range`, que não
inclui pseudo-elemento) e `perda`, e cada resíduo bate com o deslocamento do pseudo da própria folha: ciclo
de melhoria `div 68/76` (+8 = `::after{content:'→';right:-8px}`), herói do responsável `770/858` (+88 =
`right:-88px`), aniversários `755/845` (+90 = `right:-90px`). O que mexeu no app foi `.bfr-communication-tabs
button` (único controle ainda a 10px na faixa web) e a quebra de texto do botão de ação rápida do Monitor,
que saiu de dentro do `@media(max-width:800px)` — a 1024 o `<strong>` ainda era nowrap e cortava o botão
174×69 de `monitor/ocorrencias`.

A passada **@1440 com a Direção dentro** (`audit-sweep-corte-1440.json`, 17 pares, incluindo
`director/inicio`, `director/direcao` e `director/resultados-aprendizagem`) encerra as duas pendências do
lote das capturas: `fonte<11` 0 e `perda:false` nos 15 cortes — os "6 rótulos cortados a 1440" nunca foram
corte de texto, eram o '→' do ciclo; e a subida para 11px não abriu corte novo na Direção. Os 12 `semNome`
de `director/inicio`/`director/direcao` são todos `fech:true` com `textContent` ("Buscar aluno",
"Crachás", "Boletins", "Nova ocorrência", "Novo comunicado", "Nova reunião") — `<details>` fechado,
armadilha 58 de [[bfr-audit-rig-traps]]. O único achado que continua aparecendo é `tap<44` (118 @1440):
decisão documentada, o piso tátil vale ≤800px e a interface densa da Direção não é operada por dedo.

**Restos reais, fora das telas:** a rota `conteudos` sem botão na barra mobile (decisão de produto: acender
o "Mais"?), e a limpeza das 6 contas sintéticas, que precisa de OK por ser destrutiva. A publicação
foi feita e provada — ver a seção "Prova no ar (v38)" abaixo.

**coord26 PUBLICADA como v45 18/10 (deploy cirúrgico `4ab010ff-b84c-4cc3-b718-767e6d8c271b`).** `build-coord26.mjs` gera `index-coord26-telas31-candidata.html` (md5 `2a7b7290`, delta 23 bytes, **reversível byte a byte** à coord25 `4b4d2081`) com os 2 hunks dos achados da #31: (a) `.bfr-subnav button` `font-size:10px→11px` (abas da escola do aluno; `.bfr-subnav` é usado só em `renderSchool`, então o bump não vaza); (b) `.bfr-secretary-list strong` `+overflow-wrap:anywhere` (o grid `24px minmax(0,1fr) auto` dá ~66px à coluna e o token longo "atualização(ões)" clipa; quebrar a palavra resolve sem mexer em layout). **Validação = fixture de componente, não sweep do app**: as contas sintéticas foram apagadas ([[bfr-contas-sinteticas-auditoria]]), então não há sessão para boot autenticado. `fixture-31.html` via browser-use (`audit-coord26-fixture31.json`): tabs 6×fs10→0×fs11; chip `cw66 sw84 perda:true` → `cw66 sw66 perda:false`. **Build cirúrgico `build-surgical-coord26.js` → `worker-surgical-45/`**: fonte do index = coord26 validada, SW = `ar-sw-v44-live.js` com `CACHE bfr-conecta-v44 → v45` (só o CACHE muda, provado byte a byte), rp.js `a2cacc7e` inalterado. `wrangler deploy` (CLOUDFLARE_API_TOKEN desmarcado → OAuth guardado) → versão `4ab010ff`, "No updated asset files to upload" (só worker.mjs). **Prova no AR (cache-buster):** `/` md5 `2a7b7290` = coord26 byte-idêntica; hunk(a) `color:#64748b;background:#fff;font-size:11px;font-weight:700}` = 1; hunk(b) `color:#203a63;font-size:11px;overflow-wrap:anywhere}` = 1; regra antiga `font-size:10px` desse bloco = 0; `/sw-v4.js` `const CACHE = 'bfr-conecta-v45';`. **Leitura honesta:** as duas correções foram provadas por *bytes no ar* e por *fixture de componente* — não por re-medida do app autenticado no endereço público, o que exigiria recriar uma sessão sintética (escrita pequena no banco). Reversão = devolver coord25 + `ar-sw-v44.js` (v44) e republicar.

**RE-MEDIDA AUTENTICADA NO PÚBLICO FEITA 18/10 (sessões developer+student recriadas, `sonda-ar-v45.mjs` + `sonda-secretaria2.mjs`, diários `audit-ar-v45-prova.json`/`audit-ar-v45-secretaria2.json`, endereço workers.dev, 0 escrita no banco — só GET+navegação+computed style). Os 2 hunks agora provados em TELA REAL com dado real:**
- **(a) escola do aluno:** as 6 abas `.bfr-subnav button` renderizam **6/6 a 11px** (era 10px), `fsBaixo:0` em @320/@390/@1024; `.bfr-subnav` é `overflow:auto` por design (a tira rola, não corta rótulo). Boot `role=student`, `sec=escola`.
- **(b) chip da secretaria:** a conta developer em preview (`data-preview-role=secretary` + aba `data-sec-tab=overview`; `navigate('secretaria')` do runtime NÃO monta — armadilha nova) carregou dados reais da escola e havia **1 atualização cadastral viva** → o chip "1 atualização(ões) cadastral(is)" sentou na **coluna central `minmax(0,1fr)` de 66px @1024** (a exata que clipava). Agora `overflowWrap: anywhere` nos 4 `.bfr-secretary-list strong`, `cw66 sw66 perda:false` — antes do v45 era `cw66 sw84 perda:true` (os 23px que o fixture reproduzia). @390 a coluna é 192px (sem corte, como sempre). 0 erros de console. **A ressalva "só fixture" está encerrada.**

**Why:** são os achados que a varredura produziu com o instrumento já corrigido (ver
[[bfr-audit-rig-traps]]); os anteriores a essa correção mediram a view admin para todos os perfis e
não valem nada.

**How to apply:** as travas e as correções de banco **já foram consertadas, medidas e publicadas**
— não reabra essas frentes sem um motivo novo. FAB e chip foram aplicados **e publicados** em 15/10
(deploy `004077c9`, `CACHE` `bfr-conecta-v32` → `v33`, 14 rotas em 200, HTML do ar byte-idêntico ao local,
4/4 marcas do patch no ar com a literal antiga zerada) e a passada de navegador no endereço público foi
rodada depois disso — ver [[bfr-publicacao-worker]] para a mecânica e o parágrafo acima para o resultado.
A ordem que o responsável fixou em 14/10 continua valendo para qualquer edição: **primeiro fecha a
campanha de medida, depois se encosta em `bfr-conecta-patched/`**, porque esse diretório é o que o harness
serve e o que vai ao ar. A cauda velha (`roda-encerramento.mjs`) foi aposentada: ela tinha um passo 0 que
aplica o LOTE 2 de DDL em `profiles.role` sem OK, e passos de patch que já foram aplicados. O motor vivo
é `roda-remedida-alvos.mjs` (só navegador: re-medida das 121 rotas de fallback @1024/1280, as 33 @320 de
#43, a matriz @390 de #42 com o mapa novo, portas 9371/9372/9373, diários novos). As geometrias do par
antes/depois do FAB foram copiadas para `audit-fab-geometria-*.protegido.json` para sobreviver a uma
sobrescrita. O que continua sem prova: @320 na rota da Coordenação (a sonda do FAB não devolve retângulo
nessa largura), o `sports_operator` sem view no app (#48), os 4 papéis fora do enum `account_role` com
LOTE 2 no portão (#47), e as telas populosas do perfil aluno/responsável. A matriz completa fica em
`auditoria-bfr-conecta.md`, gerada por `audit-relatorio.mjs` a partir dos diários JSON (seção G = a
publicação; seção H = a passada no endereço público, H.1–H.5; D.5 = o banco depois do apply; itens 18 e
18.b = FAB e chip com o par antes/depois; itens 20, 20.b e 20.c = a superfície `anon` e o revoke aplicado;
item 21 = o `RangeError` da reentrada).


## Prova no ar — v38 (16/10, 20:15Z, deploy `98ba5b61-9ea4-40ba-814d-211ede9106f7`)

GET sem credencial: `/sw-v4.js` devolve `const CACHE = 'bfr-conecta-v38';` na linha 1 e `/` devolve
md5 `790cdacdc417638cf4e35d06c2b727f3` = exatamente o `bfr-conecta-patched/index.html` local, 3.373.203
bytes dos dois lados. `confere-versao-no-ar.mjs` confirmou a versão criada 2026-10-16T20:15:26Z.

Passada `AUDIT_LIVE=1` nos 12 pares da faixa web @1024 (`audit-sweep-ar-v38.json`, sessão sintética
`bfr-audit-session-corte-web2.json`, porto CDP 9451), comparável de `audit-sweep-corte-web2.json` lado a
lado: **`fonte<11` 0, `semNome` 0 (70 controles nomeados por `<label>` implícito), 14 `truncados` todos
com `perda:false`, 4 tiras roláveis, `tap<44` 78** — e 10 dos 12 pares batem idênticos com o local.
Os 2 que divergem **não são melhoria**: `coordinator/resultados-aprendizagem` assentou com 45 nós (local
111) e `monitor/jogos-escolares` com 441 (local 1265) — painel em estágio mais raso no ar, e o corte que
sumiu morava no conteúdo que ainda não tinha chegado. Portão de assentamento `true` nos dois, então o
instrumento não avisou: comparação de contagem só vale com `nosPainel` compatível.

Sonda do lote (`sonda-ar-v38.mjs` porto 9452, `sonda-ar-v38b.mjs` porto 9453, só leitura):
· WEB1 provada no ar — os 3 `button.bfr-communication-tabs` de `coordinator/comunicacao`@1024 medidos a
  `fs=11`, sem corte (`cw==sw`), folha `#bfr-telas-a11y-1` presente.
· WEB2 provada no ar, mas **no par errado**: `.bfr-monitor-quick` só existe em `monitor/inicio` (1 no
  documento; 0 em ocorrencias/comunicacao). Em inicio os quatro botões ("Registrar acompanhamento",
  "Registrar ocorrência", "Buscar aluno", "Enviar comunicação") estão `white-space: normal`,
  `cw170/sw170/tw156` → sem corte. O `button` 174×69 que cortava em `monitor/ocorrencias@1024` (diário
  `audit-sweep-corte-web.json`) era o MESMO markup de `overviewMarkup` (index.html:23630) renderizado
  naquele painel — a seleção de aluno é que muda qual markup aparece, não a CSS.

### Prosa abaixo de 11px: fechado LOCAL em 16/10 com sete lotes (ar continua v38, publicar pede OK)

O instrumento antigo só olhava `button,a[href],input,select,textarea,[role=button]`; texto não-interativo
abaixo de 11px nunca tinha entrado na conta. Com a coluna `prosaNos/prosaFam/prosaMin` corrigida
(censa o painel inteiro, teto próprio de 6.000 nós com bandeira `prosaCortou` — ver
[[bfr-audit-rig-traps]]), os números comparáveis por mesma impressão digital de painel:

- banda web, 12 pares @1024: **440 → 5 nós** (degrau PROSA5). O lote 6/7 levou a **1 nó por tela do
  Monitor**, que é só o clima.
- banda do AEE, 11 seções × 390 e 1024 (22 visitas): **1.829 → 12 nós**, mínimo 8px → 8px (só clima),
  `fonte<11` 2→0 nos botões "Anterior"/"Próxima" do paginador da biblioteca (9px, 63×44), `tap` 1→0,
  e **`perda` de conteúdo 0** em todas as passadas. Regressão web contra a linha de base pré-prosa
  (`audit-sweep-corte-web2.json`) e contra o degrau anterior: **0 linhas piores**.
- Diários: `audit-sweep-prosa2-antes/depois`, `-prosa3-*`, `-prosa4-cand2`, `-prosa5-cand3`,
  `-prosa6-cand4`, `-prosa8-cand5`, `-aee-antes`, `-prosa6-aee-depois`, `-prosa7-aee-depois`,
  `-prosa6-web-depois`, `-prosa7-web-depois` (todos em `.kiro/crew/uploads`).
- Geradores portão-a-portão em `direcao-rolagem/candidata-prosa-{1..7}.mjs` + `aplica-prosa-2a5.mjs`;
  conferência `confere-prosa-por-painel.mjs` (diários como argv) e `confere-aee.mjs`.
- Estado do vivo local: `bfr-conecta-patched/index.html` = **`fc0081e9089fd1d591708a7fed4a9a5e`** (PROSA1..9
  aplicados, 3.365.708 chars; reversão do lote 9 em `index.html.bak-prosa9-1` = `a3874108…`; degrau PROSA1..8
  = `a3874108…`; pré-prosa = `index.prosa-antes.html` = `790cdacd…`; o arquivo medido no A/B é byte-idêntico
  ao vivo — conferido por md5 dos dois depois do apply).
  **Publicar = v38 → v39 + bump do `CACHE`, só com OK.**

**O lote 8 mudou de método, e isso é o que explica o tamanho do ganho.** Em vez de empilhar seletores de
piso `html #appShell …` (cascata), ele **edita a declaração de origem** (9px→11px no próprio `font`/
`font-size`), por recorte de posição byte-a-byte com portão de md5, aplicado de trás para frente, só
dígitos, sem inserir nem remover nada. Consequência: funciona até onde a cascata não alcançava, e a prova
de integridade passou a ser "as contagens de `<style>`/`<script>`/`!important` não mudaram" (3 das 108
trocas já eram `!important` na própria declaração — editar ali é permitido, adicionar não). Resultado nos
164 pares @390 (`audit-sweep-prosa-390-vivo.json` × `audit-sweep-prosa8-cand-390.json`):
**prosa 4.824 → 1.388 nós** (−2.541 nos 114 pares de painel idêntico), **`perda` de conteúdo 9 → 0**,
cortado 18 → 9, controles `fonte<11` 76 → 10, `confere-regressao` com **0 linhas de piora real**; a única
linha "piorou" é `coordinator/relatorios 0→29` com painel mudou (estágio, não dano). **Banda web provada
antes de aplicar** (`audit-sweep-corte-web2.json` × `audit-sweep-prosa8-cand-web.json`, 12 pares @1024 e
@1280): 0 linhas com piora real nas duas larguras e `corte` nunca subiu (em duas telas caiu 6→0) — o medo
de subir 9→11px em 108 regras criar corte horizontal novo não se materializou. Atenção: a linha de base
`audit-sweep-corte-web2.json` **não tem coluna de prosa** (schema pré-censo), então o A/B de prosa na banda
web não tem "antes"; só os controles, corte e toque são comparáveis ali.

Resta **um** resíduo aberto, e ele é de decisão de produto, não de lote: o widget de clima
(`div.weather-details` 9px @1024 / 8px @390 e o `span` de `div.bfr-weather-copy` em 10px) é `!important`
na folha do próprio app — `font:9px…!important` na posição 2369313 e
`@media(max-width:430px){font-size:8px!important}` em 2371730 (prova em `tmp-where-important.mjs` e
`audit-sonda-prosa-final.json`). Piso sem `!important` não alcança, e `!important` novo está proibido.

Armadilha de leitura da sonda: `<strong>`/`<span>` inline têm `clientWidth 0`, então `perda` calculada
contra `cw` dá `true` falso. Só `cortado` (que exige `clientWidth`) é confiável em elemento inline.

### Os três números da censo de 164 visitas @390, atribuídos por par

- **`semNome` 66 → 0 mudos.** Todos os 66 têm `<details>` fechado (`fechado=true`): rect cheio com
  `innerText` vazio. Falso positivo do instrumento, não do app.
- **`tap<44` 40 → 34 falsos + 1 defeito real.** Os 34 são `input[type=checkbox|radio]` nativos de 16 px
  dentro de um `label` com `min-height:44px` — a área de toque é o rótulo. O real são **6 botões de
  148×40 em `admin/notas`**, abaixo do piso de 44; fica aberto como edição pontual.
- **`perda` 9 → 1 causa, e a causa era minha.** O `chip` que o meu próprio CSS de 16/10 do herói injeta:
  `compactHero(app)` (`kicker.append(chip)`, pos 152332) empurra o chip para dentro de um kicker
  `display:flex` de linha única — 425 px de conteúdo em 338 px de container. Aparece em
  `coordinator/inicio`, `coordinator/coordenacao`, `admin/coordenacao`. Consertado no lote 8 com
  `flex-wrap: wrap; row-gap: 3px` no kicker do herói da Coordenação (prova: `perda 9 → 0`).

**Resíduo do lote 8 → o que os lotes 9, 10 e 10b fecharam (16/10, tudo LOCAL, ar continua v38).**

- **LOTE 9 APLICADO no vivo** (`candidata-prosa-9.mjs --aplicar=1 --md5=a3874108…`: 26 trocas de dígitos +
  o piso tátil `min-height:40px!important → 44px` na própria declaração): `a3874108…` → **`fc0081e9…`**.
  Medida nos 164 @390 (`audit-sweep-prosa8-cand-390.json` × `audit-sweep-prosa9-cand-390.json`):
  **prosa 1.387 → 472 nós**, famílias 24 → 16, `perda` 0 → 0, `tap` 40 → 34, 120/164 com mesma impressão
  digital de painel; banda web (24 visitas @1024/1280): **prosa 5 → 0** e nenhuma tela pior.
- **#99 FECHADO por medida**: os 6 botões de 148×40 de `admin/notas` saíram da lista `tap<44` (34 itens,
  todos checkbox/radio de 16 px dentro de `label` de 44 px — armadilha 73).
- **#97 FECHADO para o painel medido** + prova de geometria (`sonda-clima.mjs` →
  `audit-clima-geometria-lote{8,9}.json`): a caixa 332×28 é idêntica antes/depois e o estouro de
  `div.bfr-menu-weather` (sw 333 / cw 309) **já existia antes do patch**. O resto do clima fora do painel
  medido ficou aberto como **#101**, e a razão é decisão, não dígito: a regra que segura Those cópias é o
  override de tela do professor `#appShell.ready:has(#teacherView … :not([data-teacher-screen="inicio"]))
  #weatherWidget .bfr-weather-location{max-width:125px; font-size:8px!important}` (com o `.bfr-weather-meta`
  da mesma tela a `9px!important`) — subir o dígitos corta "Limoeiro de Anadia" nos 125 px. Fechar #101 exige
  decidir a largura do chip, não editar número. **DECIDIDO 16/10 pelo usuário: deixar como está** (pergunta
  explícita entre "manter", "alargar o chip e ir a 11px" e "encurtar o texto"). #101 está fechado como
  **aceito com causa provada**, não como pendência de acessibilidade — não reabrir sem o usuário pedir
  mudança de layout.
- **LOTE 10 medido, NÃO aplicado — e não se mexe nele.** `index.prosa10-candidata.html` md5 `8ee965af5019c5abe02217866ad80307`
  (3.365.718 chars, 34 trocas, delta +10, 0 `!important`): @390 **472 → 179 nós**, famílias 16 → 10,
  `perda` 0 → 0, `tap` 34 → 34, controles `fonte<11` 11 → 10, `confere-regressao.mjs` com **0 linhas de
  piora real**, 122/164 mesmo painel. Foi deixado intacto de propósito: os diários `audit-sweep-prosa10-cand-*`
  são a comparação dele, e regravar o arquivo quebraria a comparabilidade (a builds intermediária `4c49a3d4`
  do 10b teve o mesmo destino — substituída **antes** de qualquer censo consumi-la).
- **LOTE 10b candidata FINAL** — `index.prosa10b-candidata.html` md5 **`350c2f21dec396ead53e1293f006b761`**,
  3.365.723 chars, **42 trocas**, delta **+15**, 0 `!important` novos, `<style>` 48→48, `<script>` 108→108,
  98 blocos de script / 0 erros. Servida no harness **8315** com `AUDIT_SESSAO=bfr-audit-session-prosa9.json`
  (comprimento servido conferido = arquivo + 4267). Passo 4 do gerador agora tem uma **âncora literal** além
  das trocas por posição — o contador escrito por script
  (`display:block;text-align:right;color:#a0aec0;font-size:9px;margin-top:4px`, 1 ocorrência no documento
  inteiro) — e o portão de `esperado` **precisa somar o delta da âncora** ao dos `trocas`, senão `delta 15`
  morre contra `esperado 14`.
- Como os 179 nós restantes se distribuem (diário `audit-sweep-prosa10-cand-390.json`, agregado por
  `fam`+`pai`) — **todos atribuídos**: `td@10px` 54 + `tr@10px` 28 + `strong@10px` 28 + `thead@10px` 1 =
  **111 nós todos por herança de `.bfr-direction-table{font-size:10px}`**; `small@9px` 28 = `.bfr-private-book small`
  (vencedora medida, folha `#bfr-reading-integration-style`); `span@9px` **27** = UMA ocorrência de template
  ``<span style="color:#71809a;font-size:9px">Professor oficial da grade</span>`` no byte **@1007789** (linha 8168),
  renderizada 3× por tela em 9 telas de `admin` — e aqui a leitura anterior estava **errada**: eu anotei que esses
  27 só cairiam com `!important`, mas o `9px` é estilo **inline escrito pelo próprio template**, então abaixa
  editando a string do script, sem força nenhuma. É o lote 11 (com `.bfr-routine-empty{font-size:10px}`, linha
  13252, que sustenta o último `strong@10px`); `small@10px` 9 em `admin/notas` = `.bfr-direction-list
  small{font-size:10px !important}` na posição 295568 + a cópia sem força em 1391866 (markup
  `article>div>small`, "848 aluno(s) ainda sem registro"); `time@10px` 1 = `.bfr-parent-dashboard-card time`
  (folha `#bfr-parent-dashboard-v3-style`); `.bfr-routine-private` + `.bfr-routine-count` 1+1; e 1 `small@9px`
  do contador inline do parágrafo acima.
- **Duas atribuições que o navegador não devolve e o grep devolve.** (a) `admin/notas`: o deep-link frio
  `?role=admin&open=notas` assenta com `sec:"notas"`, `#adminView` a 6.732 nós **e nenhuma
  `.bfr-direction-table`** (47 s, `ndir:0`), enquanto o censo mede 7.183 nós com a tabela — ou seja, a cadeia
  vencedora daquela tela **não é alcançável por sonda**, e o caminho rápido é o campo `exemplo` do censo
  (`prosaFam[].exemplo`) + grep no arquivo. Ver [[bfr-audit-rig-traps]] itens 74 e 75.
  (b) `.bfr-direction-table th`: o grep estático mostra o seletor dentro de um grupo de 11px em 311919 **e**
  sozinho em 1652146; quem vence é o `font:9px 'DM Mono',monospace` de 1652146 **por ordem de folha**, não por
  especificidade. Atribuir por selector sem olhar a posição relativa das folhas erra o veredito.
- **LOTE 10b APLICADO no vivo (16/10, ~22:4x).** O censo fechou com **164 visitas** em
  `audit-sweep-prosa10b-cand-390.json` e o pareamento contra `audit-sweep-prosa9-cand-390.json`
  (`audit-prosa10b-regressao.txt`) deu **0 linhas com piora real**: `perda (truncados) 0 → 0`,
  `tap<44 34 → 34`, `controles <11px 11 → 10`, e **prosa <11px 472 → 28 nós** (famílias 16 → 2;
  `td@10px`, `tr@10px`, `span.teacher-pro-status@10px`, `div.teacher-pro-class-stats@10px`, `p@10px`
  e `span@10px` sumiram do mapa — `audit-prosa10b-residuo.txt`, lista por tela em
  `audit-prosa10b-residuo-telas.txt` com `lista-residuo-prosa.mjs`). As duas linhas com `prosaCortou`
  novo (`secretary/comunicados`, `secretary/fotos`) **não são corte de conteúdo**: `prosaCortou` é a
  bandeira `TETO-6000` da janela de amostra (`brutos.length > 6000`), o `trunc` delas é 0 e o painel
  mudou de identidade (699 → 6.793 nós), então o par não é comparável por fingerprint. Banda web
  (24 visitas, `audit-sweep-prosa10b-cand-web.json` × `audit-sweep-prosa9-cand-web.json`):
  **0 pioras em 1024 e em 1280**, `perda 0 → 0`, `tap 78 → 78`, `controles<11px 0 → 0`
  (`audit-prosa10b-web1024.txt`, `-web1280.txt`, `-web-residuo.txt`). Aplicação: backup
  `index.html.bak-prosa10-1` = `fc0081e9…` conferido antes, `node candidata-prosa-10.mjs --aplicar=1
  --md5=fc0081e9…` → vivo **`350c2f21dec396ead53e1293f006b761`**, 3.365.723 chars, md5 do vivo ==
  md5 da candidata medida (comparado programaticamente), `confere-sintaxe-html.mjs` no vivo =
  **98 blocos / 0 erros**.
- **LOTE 11 APLICADO e PUBLICADO como v39 (16/10, 23:5xZ).** As duas âncoras (o `span` inline do template
  em @1007750 e `.bfr-routine-empty` em @1683262) fecharam a campanha: censo @390 com 164 visitas
  (`audit-sweep-prosa11-cand-390.json`) → **prosa <11px 28 → 0 nós, famílias 2 → 0**, `perda 0 → 0`,
  `tap 34 → 34`, `controles<11px 10 → 10`, `prosaCortou 32 → 26`, **0 linhas com piora real**
  (`audit-prosa11-regressao.txt`, `audit-prosa11-residuo.txt`). Banda web refeita do zero (24 visitas,
  `audit-sweep-prosa11-cand-web.json`): 1024 com **1** linha vermelha e 1280 com **0**, e a de 1024 é
  `admin/resultados-aprendizagem` `corte(perda) 0(0)→6(0)` com **perda 0** — o painel dela oscila entre
  `1786c/111n` e `588c/45n` nas três passadas (9: 1786/111 · 10b: 588/45 · 11: 1786/111) e o pareamento
  10b×9 tinha o **espelho exato** `6(0)→0(0)` na mesma tela. Estado assíncrono pré-existente, não lote 11.
  Aplicação: backup `index.html.bak-prosa11-1` = `350c2f21…` conferido, `candidata-prosa-11.mjs
  --aplicar=1 --md5=350c2f21…` → vivo **`1b88e7b76889c6b53d931ffc2c763eb0`**, 3.365.724 chars (delta +1),
  reversível byte a byte, 98 blocos / 0 erros.
- **O que o v39 levou ao ar** (diário `audit-v39-carrega.txt`, feito por `o-que-o-v39-carrega.mjs`): 89 pares
  de linha alterados, 34 fragmentos distintos, todos dígitos de fonte (`0→1` 34× = `10px→11px`, `9→11` 21×)
  mais um bloco de comentário CSS e um `0→4` de altura de alvo; `!important` **1919 → 1919**,
  `<style>` 48→48, `<script>` 108→108, `</script>` 103→103, delta 9.817 chars sobre o build anterior.
- **Prova no ar (v39).** `bump-versoes-publicacao.mjs --apply` = 8/8 verdes (`bfr-conecta-v38 → v39`,
  `bfr-responsive-presentation.js?v=12 → 13`); `node deploy-worker.js` → versão
  **`c5bc1702-3bb1-44de-8aa3-2e098784efff`**, 14 rotas 200. `confere-publicacao.mjs --antes=
  index.html.bak-v38-no-ar.html` (md5 `790cdacd…`, lido do ar ANTES do deploy): ar **3.365.724c == local**,
  `idêntico: true`, CACHE `v38 → v39`, 6/6 marcas. `md5` do ar == `68e8d79f…` == local. Navegador no
  endereço público (`sonda-ar-v37.mjs --lote=v39`, porto 9501, 25 s): assentou, **`caches =
  ["bfr-conecta-v39"]`**, scripts `bfr-responsive-presentation.js?v=13` + `bfr-teacher-arrivals.js?v=2`,
  1 cabeçalho, 0 nós/s do meio pro fim. Censo `AUDIT_LIVE=1` @390 em 7 telas (`--so=comunicacao,notas,
  inicio,direcao`, porto 9502): **0 nós de prosa <11px em todas**, `perda 0`, `fontes<11 0`; pareado contra
  a candidata local medida, **0 pioras**, e `admin/notas` 3 → 0. As três linhas `admin/*` têm
  `prosaCortou=SIM` = teto de 6.000 da janela de amostra sobre painel de 6.732 nós, ou seja o zero cobre
  ~89% do painel — o zero autoritativo é o censo local de 164 visitas.
- **Campanha de prosa FECHADA.** Não resta nó de prosa <11px medido no censo @390 nem na banda web. Os
  únicos <11px que continuam no app são os presos por `!important` do chip de clima (#101, decisão da
  usuário: **deixar como está**) e os 10 controles `fontesBaixas` que o censo sempre contou separados.

**Banda 320 fechada em 17/10, local à frente do ar (lotes 12→16, ainda NÃO publicados).** `index.html`
local `6983d102d5d3b3454b588027f0b7c79b` (3.365.842 chars, 98 blocos de script / 0 erros),
`bfr-responsive-presentation.js` `7c837178f84b271055debcb346694550`. O ar continua em **v39**; publicar
v40 = lotes 12+13+13b+14+14b+15+16 e **pede OK explícito**.
- **Lote 15** (6 trocas, `fontesBaixas` de controle): Biblioteca `fontesBaixas 7→0` @320 com
  `painelChars 40420` idêntico; cluster AEE `estouroInterno 8→4`; `director/aee 8→0`; contagem
  `font-size:10px` 470→465. Diário `audit-sweep-lote15.json` (29 rotas @320) pareado com
  `audit-sweep-r320.json`.
- **Instrumento**: `tap<44` de checkbox/radio passou a medir o `<label>`-alvo do dedo (ver
  [[bfr-audit-rig-traps]] item 79) ⇒ `tapMenores 8→0` em coordinator/director/admin/secretary
  `comunicacao` sem tocar no app. Não era defeito de tela.
- **Lote 16**: os 4 px residuais do `#aeeView` @320 eram a armadilha de especificidade da faixa
  ≤560 px (ver [[bfr-css-cascade-traps]] itens 8 e 9) — cards `.bfr-ops-kpi` de 64 px cujo rótulo não
  cabia. Conserto: 1 seletor (`#aeeView .bfr-ops-kpis,.bfr-ops-kpis`), sem `!important`.
  Prova `audit-sweep-aee3.json` × `audit-sweep-aee16.json`: `estouroInterno 4→0`, `painelChars 8879`
  idêntico, altura 7473→7558 (+85 px = as duas linhas de cards, ganho vertical aceitável).
- **Sobra conhecida**: `aee/horarios`, `aee/comunicados`, `aee/escola-historia` e `aee/meu-espaco` caem
  em `ALVO NÃO ACHADO` e medem o `.content:not(.hidden)` mais antigo do documento (digital idêntica à
  de `aee/aee`). O mapa de alvos do próprio app (`navigateToSection`, index.html:9261) pede
  `[data-aee-section="schedule|library|family"]`, atributo que nenhum módulo emite, e
  `#platformSchoolView`/`#platformSpaceView` continuam sem âncora.

**#86 ATRIBUÍDO e FECHADO como "não reproduz no v43 + escritor já guardado" (17/10, medição no endereço PÚBLICO).**
O diário de 16/10 (`audit-sonda-ar-nav-monta-passada-1/2.json`) mediu **7.504–7.647 registros de MutationObserver/s**
em `sports_operator/jogos-escolares` @390, DOM plano em 1.741 nós. Re-medido hoje contra o v43 com a sessão do
operador re-mintida (`bfr-audit-session-operador-live.json`, refresh de uso único → `--saida` próprio):
**~140 registros/s** no estado estacionário, DOM plano em 1.595 nós, 0 erros de console, `erroObs=null` e
**controle positivo contou** (append + 2× setAttribute + remove ⇒ >0) — ou seja o instrumento está vivo e o
surge **não está**. Atribuição da sobra (`sonda-mut86.mjs`, diário `audit-mut86-atribuicao.json`): 87% dos
registros são `aria-current @ button.nav-item` (realce de rota da barra de baixo, rp.js) + um fio de `img.src/alt`
e `aria-live` de status (poll de dados). O escritor de `aria-current` **já tem guarda de valor**:
`setAttr = (node,name,value)=>{ if(node && node.getAttribute(name)!==value) node.setAttribute(name,value) }`
(bfr-responsive-presentation.js:39), com comentário em :32 dizendo que é para o `sync()` não se escutar — é
exatamente o antídoto do ciclo auto-alimentado que gerava os 7,5k/s. **Decisão: sem patch** — 140/s com DOM
plano e 0 erros é repintura legível por poll, não laço descontrolado. Leitura honesta: não consegui separar
"o guard + #55 activeRoute consertaram" de "a conta do operador tem menos dados ao vivo hoje" (1.741→1.595 nós);
o que provo é o estado atual, não a curva antes→depois. **Armadilha de instrumento (nova):** o `MutationObserver`
injetado via `addScriptToEvaluateOnNewDocument` **não pode** usar `document.documentElement` como alvo (é `null`
no start do documento → `observe` lança "parameter 1 is not of type Node" e o contador fica 0, fingindo
"tela quieta"); observe `document` (Node sempre) + controle positivo obrigatório. E os wrappers que capturam
`Error().stack` por escrita **desaceleram o laço rAF** e subcontam a taxa — meça o número honesto com o
observador puro (`MUT_STACK=0`), deixe os stacks só para atribuir o escritor.
  `#platformSchoolView`/`#platformSpaceView` existem mas chegam com altura 0. É pergunta de app
  (a seção troca a tela?) que precisa do censo de `.content` visíveis — `probe-conteudos.mjs`.

**#58 FECHADO COM RESSALVA (17/10, decisão autorizada do usuário: "Aceitar prova com a sessão atual" — nenhuma escrita no banco).** O pedido original era provar o chrome mobile do `sports_operator` com uma **conta real** do papel. Isso é impossível hoje: `select role, count(*) from profiles group by role` não lista `sports_operator` — **0 contas** carregam o enum ([[bfr-papeis-vs-enum-account-role]]). O que se prova vem da passada #86 no **endereço público** com a sessão sintética do operador re-mintida (`audit-mut86-atribuicao.json`, 17/10, `jogos-escolares` @390): boot `role=sports_operator`, barra de baixo montada e **realce de rota gravado** — `aria-current` escrito em `.nav-item`/`.bfr-platform-nav-item` pelo realce guardado do rp.js (598/391/230 ocorrências por seletor), `porSeg 140`, `mut_pos_controle 213`, `erros_console []`. A leitura anterior de 16/10 (`audit-sonda-ar-nav-sports_operator-jogos-escolares.json`: `navExiste:false botoes:[]`) era pré-correção do #55/#48 e ficou superada. **Ressalva honesta:** o papel vem de sessão sintética, não de uma conta com o enum real, então isto prova que o **código renderiza e destaca** a barra do operador, não que existe um usuário assim em produção. Reverter para "prova com conta real" exigiria `cria-conta-sintetica.mjs sports_operator` + reverter — **não feito** por escolha do usuário. Armadilha [[bfr-audit-rig-traps]] 32 continua valendo: `role()` do menu lê o papel da SESSÃO, então contagem de destaque por papel em preview mede a barra da conta injetada.

**Banda mobile #30 + web #31 re-medidas no v44 PÚBLICO (17/10 → 18/10 00:4xZ, endereço workers.dev, sessão re-mintida por `grant_type=password` via `remint-live.mjs`).** `remint-live.mjs` é o instrumento novo que resolve a vaga única de `renova-sessao-live.mjs`: emite developer/student/parent cada um no próprio `bfr-audit-session-<p>-live-v44.json` (refresh de uso único, armadilha 31/44). Toda linha dos diários traz `publicado.caches=["bfr-conecta-v44"]` — prova de que o navegador executou o shell publicado (md5 do `/` conferido `4b4d2081` = candidata). **Armadilha de execução:** `--recomecar` sem `=` NÃO limpa (a leitura `arg('recomecar','')` devolve `''`, `!''` é true e o driver recarrega os 820 pares velhos e salta tudo); tem de `rm` o diário antes — os antigos estão congelados em `audit-sweep-{mobile,web}.json.pre-v44`. Resumo consolidado em `audit-v44-bandas-resumo.json`, diários em `audit-sweep-mobile-v44.json` (136 visitas) / `audit-sweep-web-v44.json` (74).
- **#30 FECHADA.** `tapMenores` é **0 em todo o papel × {320,768}** (coordenador/diretor/aluno/responsável) — exatamente o piso tátil de 44 px que o backlog #104–#110 publicado visava; `estouroDoc` 0, `erros` 0. Sobram só condições **já documentadas**: `estouroInterno=4` (2 px de arredondamento border/padding em `inicio`/`coordenacao`, não é scroll percebível), `semNome=54` no diretor (armadilha 72: controles dentro de `<details>` fechado), `ALVO NÃO ACHADO` = os furos de mapa conhecidos (`horarios`/`escola-historia`/`coordenacao-chat`), e `parent/ocorrencias nao-chegou` (conta sem filho, condição de dado ausente). Único achado **novo e real**: as **abas da `escola` do aluno** (`Visão geral/Mural/Agenda/Projetos/Momentos/Vida Escolar`) são `button` 44×44 com **rótulo de 10 px** (fontesBaixas=6×2 larguras) e o rótulo `Visão geral` **trunca com `perda:true` @320** — fora do censo de prosa porque é controle interativo. Ficou registrado, **não patcheado** (patch = candidata + OK; nada de escrita unilateral).
- **#31 FECHADA com achados (cobertura: 6 papéis × {1024,1920} no v44 público; `audit-sweep-web-v44.json`, 202 visitas).** Coordenador/diretor/professor/secretaria (via sessão developer + `?role`) e aluno/responsável (sessões próprias): `estouroPainel` 0, `estouroDoc` 0, `erros` 0, `presLogin` 0 em todo papel×largura; `nao-chegou` só no `parent` (conta sem filho). Dois achados **reais, estreitos, NÃO patcheados**: (a) abas da `escola` do aluno = `button` 44×44 com rótulo 10px (mesmo de #30); (b) um **distintivo de status compartilhado da secretaria** `"N atualização(ões) cadastrada(s)"` preso em `<div>`/`<strong>` de **66px** que precisa de **89px** → 23px perdidos **só @1024** (`truncPerda=14` = 7 seções × 2 nós do MESMO chip), limpo @1920 (`truncPerda=0`). O `tap<44` alto (101–109) do coordenador **não é defeito** — alvo de mouse em desktop. **Cobertura honesta:** não rodei admin/monitor/gatekeeper/psychology/multiprofissional/aee/operador na web nem 1280/1440; esses papéis reusam as mesmas bandas CSS já publicadas. Para marcar 100% faltaria essa cauda.

**#33 varredura de clique controle-a-controle no build v44 (18/10, harness LOCAL com firewall de escrita, NUNCA contra o endereço público — um clique pode dar POST real, armadilha 30 de [[bfr-audit-rig-traps]]).** O `audit-clicks-seguro.mjs` barra POST/PATCH/PUT/DELETE via fetch/XHR/sendBeacon ANTES de qualquer clique e autodispensa-se: o self-test devolve `{GET:200, POST:{passou:false}, DELETE_XHR:{passou:false}}` em cada boot. Passada 1 (`audit-clicks-seguro-v44.jsonl`, 658 linhas) cobriu **coordinator 183 · admin 281 · director 156 · teacher 36** com o dev-token válido — **zero escrita real**: a única linha com `gravou` não-vazio é `["POST /cdn-cgi/rum?"]`, a telemetria do Cloudflare (armadilha 42), não um write do app; as outras 82 `gravou:[]` são vazias. **Armadilha de proveniência que esta passada abriu e eu corrigi na hora:** os harnesses 8281/8282 "aquecidos" serviam o build **banda-320 patched** (`index.html` md5 6983d102, 3.365.842 bytes), NÃO o v44 — a linha 120 do `audit-harness-antes.mjs` imprime sempre o comprimento do `index.html` padrão de `DIR`, enganando a conferência; o que importa é o `AUDIT_INDEX`. Reiniciei 8280/8281/8282 com `AUDIT_INDEX=<abs>\index-coord25-backlog-candidata.html` (md5 `4b4d2081`) e confirmei que a raiz servida = 3.388.253 bytes = candidata + bootstrap. **Sessões remintadas por `remint-live.mjs`** (exp 02:43Z). Passada 2 limpa em curso sobre o candidata confirmado: `audit-clicks-staff-v44b.jsonl` (8280, coordinator→secretary), `audit-clicks-student-v44.jsonl` (8281, nunca medido) e `audit-clicks-parent-v44.jsonl` (8282), três sweepers em portos CDP separados (9382/9383/9384 — armadilha 11/77 proíbe só dois no MESMO porto). **#33 FECHADA (read-only) — 1.542 cliques controle-a-controle em 10 papéis / 153 pares (papel,seção) sobre o candidata v44 confirmado, no harness com firewall: `GRAVOU_real 0` (só o beacon `cdn-cgi/rum`) e `erros_console 0` em TODOS** (consolidado em `audit-clicks-v44-CONCLUSAO.json`, diários `audit-clicks-{staff-v44b,student-v44,parent-v44,roles-v44c}.jsonl`). Distribuição: efeito 151 · fora_da_tela 706 · efeito_mut 101 · sumiu 259 · coberto_sem_clique 185 · ignorado_escrita 90 (verbos de escrita pulados proativamente) · navegou 10 · tentou_escrever 3 (os "Atualizar"/"Atualizar dados" de teacher/secretary, que o firewall barrou) · **morto 7**. Os 7 `morto` são **2 controles distintos**, ambos explicados e **não** defeitos: (1) `button.bfr-ops-student.active` "ANA CECILIA … 6º ano" — tocar o chip do aluno **já `.active`** (re-seleção) é no-op intencional; aparece 6× porque a mesma linha do aluno repete nas seções do AEE. (2) `button.bfr-admin-quick-action` "＋ Cadastrar aluno" em `admin/administracao` — chama `navigateToSection('cadastro-alunos')`, que em `index-coord25:9161` é **gated a `currentProfile.role==='developer'`** e sob o preview `?role=admin` (activeView=admin, sessão=developer) cai no mismatch e não navega (armadilha 32): **artefato da prévia, não provado defeito em produção** (a conta real de admin seria roteada a `inicio` pelo guard, decisão de produto). #33 e #59 fechados pela MESMA passada limpa (as sessões foram remintadas e nenhum clique correu após a expiração 02:43Z — sem cauda envenenada, armadilha 44). **Fica só #34** (capturas de tela; bandas já cobertas pela tarefa #82).

**Armadilha nova de janela:** mintei developer+student+parent todos com o mesmo `expires_in` e o `audit-sweep2`/clicks ao vivo abre um Chrome por porto em série; duas contas emendadas no mesmo comando em background (student→parent) fazem a segunda morrer sem gravar (nenhuma linha `parent` no diário web, nenhum chrome no porto). Ao fatiar várias contas, uma por chamada com porto próprio e verificar contagem depois de **cada** uma, não emendá-las. O harness horneia a sessão no boot (`readFileSync` linha 16): remintar o ficheiro **não** hot-swap — tem de reiniciar o harness para a passada pegar o token novo, senão a cauda corre com token expirado (armadilha 44: resultado falso).

**ABERTO (19/10, medido com a conta REAL do papel na URL publicada v45; causa corrigida no mesmo dia em 17.c):** a rota `jogos-escolares` do
`sports_operator` não mostra o próprio painel quando outra rota do papel foi visitada antes na mesma sessão. O
`#schoolGamesView` fica montado e preenchido (1031 caracteres) mas com `class="content hidden"`, altura 0 e
0 controles visíveis, enquanto a tela na mão do usuário é a da rota anterior (Avisos 460c / Conteúdos 1138c)
— e `activeSection=jogos-escolares`, com 🏆 Jogos marcado `aria-current="page"` na barra de baixo.
Estável por 14–18 amostras (≤19 s), 0 erros de console, nas duas bandas.
**A causa NÃO é `restoreNavigationState()` nem a chave `bfr-active-navigation-v2:<conta>`** — isso foi hipótese
de 17.b e foi refutada: apagando a chave no `addScriptToEvaluateOnNewDocument` (`AUDIT_LIMPA_NAV=1`, impresso
como `navLimpa=1`) o defeito continua idêntico. Causa provada nos bytes servidos (`confere-causa-operador.mjs`,
3.366.669 chars): o ramo `if (section === 'jogos-escolares' … BFRSchoolGames.open(); return true;)` de
`navigateToSection` (`:9269`) está **dentro** de `if (activeView === 'coordinator')` (51 chars depois do guard,
ambos 1×), e o mapa `const view = {…}[activeView]` (`:9277`, 12 chaves) **não tem `sports_operator`** nem
`schoolGamesView`; `targets` (`:9251`) também não. Então para o operador `targetView` é `undefined`,
`:9284/:9285` não mostram nada e nada é escondido, enquanto breadcrumb (`:9288`) e `bfr:navigation` (`:9289`)
seguem disparando. Quem mostra os painéis do papel são os próprios módulos e, só para os jogos, o rodapé do
boot (`:9130`) — por isso a rota funciona sozinha (medida: 1210c/15ctl/1677px, `usouAlvo=true`) e falha depois
de outra. Cadeia em uma aba sem flag (`sonda-operador-cadeia.json`): inicio ✓, notificacoes ✓ (esconde jogos),
conteudos ✓ (esconde avisos), jogos ✗ (hub permanece). **Caminho de clique coberto por código**: a barra de
baixo (`bfr-responsive-presentation.js:511-516 → navigate() :460-464`) ou clica no `.nav-item[data-section]`
(→ `index.html:9292-9294`) ou chama `BFR_APP_RUNTIME.navigate` (`:16004` = `navigateToSection`) — a mesma
função medida falhando; um clique executado ainda pede o harness 8240 (desligado desde #119).
**17.d (mesmo dia) PAGOU o clique e trocou o diagnóstico de lugar.** Harness novo na porta 8243 com
`AUDIT_DIR=bfr-publicado-servido/` (clone baixado do origin: só `index.html` `2a7b7290` e o RPJS `a2cacc7e`
diferem do patched; os 22 linhas do JS são `font-size`/ícones do backlog, nada de roteador) + firewall do
`audit-clicks-seguro.mjs` + toque confiável com hit-test. Pelo gesto: **🏆 Jogos ABRE o painel** (3/3 @390
alt 1677/1210c, 2/2 @1024 alt 997, 7/7 amostras por passo) — o que a 17.c media era o deep-link/`rt.navigate`,
não o toque; **🏠 Início por toque deixa a tela EM BRANCO** (`visiveis=[]` 7/7 por ~10 s, jogos `content hidden`
alt 0 com 1158c dentro, barra e breadcrumb corretamente em "Início") porque o roteador não tem view do papel e o
início não tem interceptador próprio; e o `index.html:20425` (captura, `preventDefault` +
`stopImmediatePropagation` + `setTimeout(open,0)`, sem guard de papel) é o que salva os jogos — atropelando o
estado, tanto que depois do toque em Jogos `activeSection` ficou `notificacoes`/`inicio` e o `aria-current` da
barra ficou no item anterior. Em perfil de Chrome limpo o boot `?open=jogos-escolares` **assentou** (hub não
ficou na tela): a cadeia da 17.c depende de a aba já ter navegado antes. 0 erro de console; única escrita
barrada `POST /cdn-cgi/rum?`. Diários `sonda-operador-clique-390.json`,
`sonda-operador-clique-1024-sidebar.json`, `sonda-operador-clique-390-partirdafalha.json`,
`sonda-operador-cobridor-390.json` + PNGs `operador-clique-*.png`. **Tela ABERTA agora = `operador/inicio` em
branco por toque.** Nada aplicado.
Chave envolvida (medida, mas não causal):
`bfr-active-navigation-v2:<id-da-conta>` = `{role, section}`. Do mesmo papel, três achados de chrome que o
preview não mostrava: `inicio` e `jogos-escolares` são a MESMA tela (1210c/15ctl/1677px) — 4 rotas declaradas,
3 telas; na banda web o item "🏆 Jogos Escolares" aparece **2×** na sidebar visível, ambos destacados, e no
`inicio` quem leva `aria-current=page` é Jogos enquanto Início fica `"false"` (família #55); o breadcrumb do
operador é escrito por dois caminhos que sobrevivem no publicado (`:9132` rótulo do papel vs `:9288` rótulo da
seção), então em Notificações e Conteúdos o cabeçalho diz "Jogos escolares". **Nada aplicado no app.**
Veredito do item 17 em `auditoria-bfr-conecta.md` 17.b e 17.c; diários `prova-operador-live.json` (fria),
`prova-operador--aquecido.json` (@390), `prova-operador--web.json` (@1024), `audit-sweep-operador390.json`
(tarjas do rig velho) e, depois do rig corrigido, `audit-sweep-operadorfix.json` (@390),
`audit-sweep-operadorwebfix.json` (@1024, `tap<44` 8/2/8/8 — primeira contagem na tela certa),
`audit-sweep-operadorsojogo.json` (controle de rota única) e 16+ PNGs `operador-*.png`. Armadilhas de rig pagas
no caminho: [[bfr-audit-rig-traps]] 89 (deep-link herda a rota anterior), 90 (exceção de view assentada no build
antigo fabrica "NÃO CHEGOU" de 50 s) e 91 (causa lida em código sem teste que a refute).

**19/10 22:00Z — 17.f: a causa da tela em branco do operador está PROVADA e a candidata boa ainda não existe.**
Pilha por escrita (`sonda-operador-pilha.mjs`, armadilha 94) no toque @390: o hunk do roteador firea TAMBÉM
pelo gesto (`rm schoolGamesView [hidden] via Object.open < navigateToSection < navigate (RPJS:455)`) e 6 ms
depois `add <em> [hidden] via setHomeMode < HTMLDocument.<anônimo>` — ou seja `index.html:15117`, o último ramo
do listener de clique do painel do RESPONSÁVEL, `if (nav && root()) setHomeMode(nav.dataset.section==='inicio'…)`,
com `root()=getElementById('parentView')` (`:15020`), **sem guard de papel**: `setHomeMode(true)` esconde todo
`#appShell .content` exceto o próprio `parentView` (que já estava escondido) → líquido = nada na tela.
Negação A/B/A trocando o id do nó (`sonda-operador-negacao-cand2.json`): em branco / `schoolGamesView` visível /
em branco. Escopo no PUBLICADO com conta real do coordenador (8247): lá o hide-all é a limpeza de palco — A dá
`coordinatorView` sozinho e B (sem interceptor) dá **dois** painéis. Candidata 3 = `bfr-candidata-operador-roteador-3/`
(3.366.930 chars, +261, 2 hunks: linha 9242 roteador + linha 15117 guard `window.BFR_APP_RUNTIME?.activeView === 'parent'`,
gerador `gera-candidata-operador-roteador-3.mjs` com portões de âncora única / âncora-que-abre-bloco / reversibilidade
byte a byte): **fecha o operador pelo gesto** (8248: A/B/C = `schoolGamesView` `content|alt1677|1210c`) e
**regride o coordenador** (8249: A/B/C = `coordinatorView+bfrNotificationsView`, publicado dá um só).
Decisão de projeto pendente: (a) guard por papel + roteador esconde o resto, (b) guard só para papel sem
`targetView` no mapa `:9277`, (c) `setHomeMode` esconder "todos exceto a view do papel ativo". Risco aberto:
**nada medido em `parent`** — não existe credencial sintética do responsável (`pulado bfr-sintetica-cred-parent.json`).
Retirada formal: as frases de 17.e "o toque não escreve classe" / "não chega ao roteador" eram a armadilha 93.

**19/10 23:0xZ — 17.g: a decisão foi medida, não escolhida no papo.** `gera-candidata-operador-roteador-4.mjs`
→ `bfr-candidata-operador-roteador-4/` (+270 chars, reversível byte a byte): o hunk do roteador da candidata 3
**mais** o guard apertado para UM papel — `window.BFR_APP_RUNTIME?.activeView !== 'sports_operator'` em `:15117`.
Medida por toque, sessões novas (mint 22:46Z, `exp=23:46:08Z`; as de 21:37 morreram às 22:37 e os harnesses
foram relembrados porta por porta): operador @390 publicado `NENHUM` nos passos 1/5 × candidata
`schoolGamesView alt1677 1210c`; operador @1024 pela sidebar `.bfr-platform-nav [data-section]` (que tem as
4 rotas, inclusive `conteudos`) idem, `alt 997`; passos de Avisos/Conteúdos/Jogos **idênticos nas duas bases**
nas duas bandas. Coordenador @390 (A/B/A de negação) e @1024: **idênticos ao publicado** — a regressão da
candidata 3 desapareceu. Direção (developer) @1024: idêntica (`adminView` → `bfrNotificationsView` → `adminView`).
Descartado por medida o guard "papel tem container no mapa `:9277`": `developer` também não tem chave, e o
`activeView` dele medido é `admin` — mexer por inferência ali atingiria a banda FECHADA da Direção.
Abertos honestos: (i) o **chrome** de `parent` foi medido 19/10 pelo atalho do allow-list (`developer` pode
assumir `parent`; porta 8247, `sonda-persona-por-url-dev-parent.json`: `#parentView` visível alt 1824 / 1.196c,
95 chamadas, 0 escrita, 0 erro) — mas é chrome com **token do developer**, não autorização do responsável; a
credencial sintética de `parent` continua em falta (criar = escrita no banco = OK explícito). No mesmo diário,
`student_reading_levels` **não** deu 400 sob `parent` (0×400) porque lá `readingState.students` = os 3 filhos
vinculados, não os 848: o teto de URL morde só nas personas que carregam a coorte inteira; (ii) o toque em Jogos deixa `sec` no item anterior e `aria-current` em `jogos:"page"` mesmo no
toque do Início — é o listener de captura `:20425` de 17.d, intocado pela candidata; (iii) **item 25 FECHADO
19/10**: o `?role=` é **gancho do harness** (`audit-harness-com-dir.mjs:28,33,55,67` → `rt.setRole`), não da
produção, e `setRole` (`index.html:9039-9040`) confronta a persona com o **papel real** e recusa em silêncio —
sessão do operador + `?role=admin` dá `activeView=sports_operator`, 456 chars e **0 chamadas de API** (a consulta
nem acontece; não é "a RLS negou"). Controle obtido: com o token do operador 18 de 19 GETs voltam `200 []` enquanto
o banco tem `classes=27`/`project_photos=32`/`projects=5`/`announcements=1` → a RLS **discrimina**. Escalonamento
legal medido no par coordenador→AEE (`tokensIguais=true`): a persona monta (`view=aee`, 120 chamadas) e pede 15
endpoints que o baseline não pede, todos `200 []`; o censo por `postgres` (`sql-item25-censo-linhas-aee.sql`) diz
que 13 das 15 estão **vazias no banco** (logo não provam nada) mas `project_photos`=32 e `bfr_specialized_audit_log`=4
existem e não chegaram ao token — essa é a negação real. `aee_student_roster`=40 aparece no baseline do coordenador:
leitura de roster é o papel, não vazamento; e **(iv) ACHADO NOVO (item 26)**: `student_reading_levels` cai com
**HTTP 400** porque o app mete os **848 ids numa `in.()` de 33 190 chars** — teto medido por busca binária = 634
alunos/24 844 chars OK, 635/24 883 = 400; com aspas ou não, tanto faz (3 e 20 ids passam com e sem aspas,
`diag-400-comprimento.mjs`). Quem recusa é o proxy (corpo = `Bad Request`, 11 bytes, sem `{code,hint}` do
PostgREST) e a chamada mora em `loadReadingAssistUsage` (`index.html:12088`), que faz `if (result.error) return;`
dentro de `try{}catch{}`: o painel de leitura assistida nunca carrega e nunca avisa. São os 12 erros de console da
passada AEE. **Severidade retificada por prova estática (não por observação):** no caminho do 400 `assisted=[]` e
`renderReadingAssistUsage()` (`:12087`) imprime "Nenhum uso remoto da Leitura Assistida foi registrado ainda." — frase
que uma consulta bem-sucedida também imprimira, porque o censo mede `student_reading_levels` = **0 linhas** no banco.
Diferença visível hoje = zero; o dano é erro mascarado + painel cego por construção quando houver dado. Precedente no
mesmo arquivo: `:5156` (lotes de 80) e `:7998-7999` (lotes de 300) já chunkam antes do `.in()`; `:12088` é o que passa
o vetor inteiro. Nada consertado no app: falta varrer os outros `.in()` de vetor cheio (`:8657`, `:4763/:4769`) contra
o teto e decidir lote (~400 ids dá margem) ou RPC agregada, em candidata NOVA. Nada aplicado, nada publicado; publicar a candidata 4 pede A/B no ar com OK explícito.
Harnesses atuais: 8243 publicado+op, 8244 c4+op, 8245 publicado+coord, 8246 c4+coord, 8247 publicado+dev,
8248 c4+dev.

**Item 26 medido até o fim e CANDIDATA GERADA + A/B-ada (20/10) — nada aplicado, nada publicado.** O teto não é
constante: mora no bloco de cabeçalhos e anda com o bearer (25.174 chars com o service-role de 219c, **24.875** com o
bearer de sessão de 826c); custo por uuid = **39 chars**, validado byte a byte contra a URL real (33.194c de path, não
33.190). Inventário por caminhada de cadeia com parênteses: **102 sítios `.in()`**, intercepto 40–300 chars,
break-even **630–636 ids** para todo vetor de uuid. Garimpo de 334 diários autenticados (`mede-urls-reais.mjs`): só
`student_reading_levels` cruza (133 % do teto, 20/20 400); a 2ª maior path observada é 3.377c e é o `student_school_profiles`
que JÁ fatia em 80. Risco futuro documentado: a maioria dos 56 carregadores de `from('students')` não tem `.limit()`
(default 1.000 ⇒ os 848). Candidata `gera-candidata-leitura-lote.mjs` → `bfr-candidata-leitura-lote/` (`LOTE=300`,
+135 chars, `2a7b729067…` → `cbbb71d19b…`, reversível byte a byte, paridade de sintaxe 108/8 nos dois braços).
A/B no harness com a MESMA sessão do coordenador remintada, uma porta por diretório, persona `aee` @390, firewall
(8250=publicado, 8251=candidata, `sonda-lote-leitura-ab.mjs`): **400 33→0 e 37→0**, maior path **33.194 → 11.822**,
erros de console ≥10 → 0, escritas 0. `#aeeView` oscilou (784/508 ↔ 4.587/4.552) nos DOIS braços → não é regressão.
Custo achado no caminho e aberto como **item 27**: o loader de leitura re-dispara **33–37 cargas** numa única visita
assentada em qualquer braço, então o lote triplica requisições enquanto a tempestade durar (136 chamadas na passada
da candidata). RPC agregada (1 requisição curta) resolveria os dois, mas é escrita no banco = OK explícito.
**→ causa medida e candidata pronta em 20/10, ver o bloco final deste ficheiro; nada publicado.**
`student_reading_levels` continua com **0 linhas** (848/848 alunos sem linha), então nenhum ganho visual é provável hoje.

**APLICADO E PUBLICADO 20/10 (v46) — item 26 FECHADO no ar, junto com a candidata 4 do operador** (deploy
`6ff453b9…`, `/` = 3.367.074c md5 `225934b7…` byte-idêntico a `bfr-candidata-v46/index.html`, SW `CACHE='bfr-conecta-v46'`,
rp.js ainda `a2cacc7e`): os três hunks conferidos 1× na forma nova / 0× na velha no ficheiro baixado do ar. Prova de
tráfego real (`sonda-ar-v46-leitura.mjs`, só GET e boot, zero clique, sessão sintética re-mintada): as 848 ids voltaram
**300+300+248 em três 200**, path máximo **11.822c** (48 % do teto de 24.875 com bearer de 826c), **0× 400**, 0 escritas,
`#coordinatorView` visível nas duas bandas. Correção de gravidade: acabou o erro mascarado, não há painel novo.

**FECHADO no v47 como item 28 — causa provada por medida, candidata medida e PUBLICADA 20/10:** o **boot** do
`sports_operator` no ar fica com `visiveis=NENHUM` (v46 @390: `conteudos=[{parentView, oculto:false, alt:0,
chars:7550}]`, `total_chamadas=24`, 0× `student_reading_levels` — esperado, o operador não está nos papéis do
painel de leitura). **NÃO é `setHomeMode(true)`** (1ª hipótese, refutada por estática): os bytes servidos já trazem
`<div class="content hidden" id="schoolGamesView">` e `<div class="content" id="parentView">`, e não existe
container `sports_operator` no mapa de views — `parentView` não-escondido a altura 0 é o **estado padrão** do
documento. `BFRSchoolGames.open()` tem **3** chamadas no v46: `:9130` (dentro de `setRole`, `if (role ===
'sports_operator')`), `:9242` (RAMO publicado) e `:9270` (ramo antigo do coordenador) — as duas últimas só em
`navigateToSection`, que o boot não invoca para esse papel.
**Causa do boot, decidida por instrumento e não por leitura:** `sonda-operador-boot-cru.mjs` abre o boot **cru**
(URL só `?n=<nonce>`, **sem** `?role`/`?open`, senão a passada prova o rig — armadilha 106) com um
`defineProperty` em `window.BFRSchoolGames` que grava a criação, embrulha `open` e guarda a pilha. Publicado v46
em 5/5 passadas (@390×3, @1024×2): `criação@942–2224ms` **sempre antes** de `app-ready@1288–2571ms` e
**`abertos=0`** ⇒ depois que o objeto existe ninguém chama `open()`; como `:9130` roda dentro de `setRole` (antes
do próprio `bfr:app-ready`), a única conciliação é **a linha passar antes de o módulo adiado de `:20428` existir e
o `?.` engolir em silêncio**. A negativa fecha o argumento: a candidata com re-tenta chama `open()` **11 ms depois
da criação** (criação@1185 → aberto@1196, `app-ready@1670`) com pilha `at abrirJogosDoBoot (:4783)`, provando que
a linha é alcançada no boot.
**Candidata 1 (`gera-candidata-operador-boot-1.mjs` → `bfr-candidata-operador-boot-1/index.html`, md5 `76de427b`,
3.367.362c = +288 sobre o ar `225934b7`, 12 assets idênticos do lado):** `visiveis=schoolGamesView` alt **1677
@390 / 997 @1024**, corpo 737→1.836 chars, `api=17` vs 12 (o `loadData()` do painel), **0 escritas, 0 erros,
firewall ok**; portões: âncora 1×, **reversão byte a byte true**, sintaxe 19→19 blocos / 0→0 recusados, RAMO 1×
GUARD 1× LOTE 2× (fonte=saida) BOOT 0×→1×. **Controle de regressão no coordenador** (sessão `coordinator`, portas
8265/8266, @390 e @1024, A/B/A): `visiveis=coordinatorView` idêntico nos 6 braços, `abertos=0`, `api=41` exato,
0 escritas/erros. **Capturas** `boot-cru-operador-{pub-v46,cand-boot1}-390.png`: corpo cinza vazio × herói "Jogos
Escolares." + busca + 3 filtros.
**PUBLICADO como v47 com OK explícito 20/10 e PROVADO NO AR** (`build-surgical-47.js`, deploy `38081d94-34e8-44e6-96a8-abf3c326db3b`):
`/` md5 `76de427bce25bf518990b659a378f7f5` = candidata byte-idêntica, `sw-v4.js` `const CACHE='bfr-conecta-v47'`, rp.js
ainda `a2cacc7e`; hunk derivado por **diferença de linhas** ar↔candidata (1 nova / 1 sumida, nada re-digitado) com
reversão byte a byte e paridade de sintaxe conferidas no gerador. Prova de boot **cru no endereço público**
(`sonda-ar-v47-boot.mjs`, só `?provaboot=<nonce>`, sem `?role`/`?open`): **3/3 passadas** com `visiveis=schoolGamesView`
(alt 1677 @390 / 997 @1024), `open()` chamado **1–32 ms depois da criação** com pilha `at abrirJogosDoBoot (:4783)`,
**0 escritas ao banco** em todas (`métodos={"GET":36,"OPTIONS":17,"POST":1}` — o POST é o beacon `cdn-cgi/rum`,
armadilha 112). **Controle de regressão no ar com o coordenador real**: `visiveis=coordinatorView`, `abertos=0`,
0 escritas. Diários `sonda-ar-v47-boot-sports_operator.json` / `-coordinator.json`, capturas `ar-v47-boot-*.png`.
**NÃO resolve:** o desync `aria-current`/`activeSection=inicio` com Jogos na tela (#153) — agora visível também no
boot — e o sensor de `.nav-item` voltou `barra=[]` nas 3 passadas com o modal de primeiro acesso no caminho (#92),
então a barra não foi lida. `parent` continua imensurável (sem credencial sintética; criar = escrita no banco = OK
explícito). Gravidade limitada: zero contas reais com o papel (1 sintética).

**Item 27 — CAUSA MEDIDA e CANDIDATA MEDIDA 20/10 (NADA publicado; v48 pede OK).** O re-disparo não é "alguém limpa
o painel" (hipótese refutada: **0** remoções de painel pelo app no sensor de `remove`/`removeChild`/`innerHTML`) nem
vazamento de estado. `#aeeView` (`index.html:3005`, `<div class="content hidden">` vazio) é pintado por **dois
renderizadores que correm em corrida**: **braço A** `setupAeeModule (:94) ← setRole (:4735)` pinta
`section.bfr-fallback-hero aee-hero` etc. — **a âncora existe**; **braço B** `render (:385) ← loadAll (:183)` pinta
`div.bfr-aee-ops` + 3× `section.bfr-evo-panel` (`[data-bfr-evo-today]`/`[data-bfr-evo-coordination]`) +
`section.bfr-aee-ready-library` — **nenhum dos nós escolhidos por `ensureReadingPanel` existe**. `.aee-hero` só nasce
no renderizador de fallback (`:15651`); `.welcome` mora em `parentView`, `.coordinator-welcome` em `coordinatorView`.
`ensureReadingPanel` (`:12096`) lê a âncora em `:12106–12108` **sem fallback e sem `return` antecipado**, logo no
braço B insere zero, o guard `:12099 if (view.querySelector('[data-bfr-reading-panel]')) return;` nunca fica
verdadeiro, e o único motorista — `setInterval(…,1200)` em `:12243` (até 180 tentativas ≈ 216 s) — re-dirige
**4 GETs por passada** para sempre. Custo real por passada = 1 × `student_reading_levels?select=student_id,level,note,updated_at`
(77c) + 3 lotes `in.()` (300/300/248 uuids; 11.822/11.822/9.794c) — é isso que os "33–37" históricos multiplicavam.
**Medidas no harness com os bytes do ar v47** (porta 8270, persona `aee` @390, firewall, `sonda-item27-remocao.mjs`):
braço tempestade **116 leituras em 84 s**, `âncora=null` em **70/70** amostras, `insercoes de painel=0 · leituras=28`
em 18 s (`sonda-item27ins-aee.json`), 40 em 30 s noutra passada; **negação por isca** (painel falso injetado pelo rig)
→ `0 leituras durante / 54 depois`, provando que o guard de presença é o **único** freio. Atribuição feita por escrita
síncrona (`insertAdjacentHTML`/`replaceWith` embrulhados), não por pilha de `fetch` — armadilha 113.
**Candidata** `gerar-item27-ancora.mjs` → `bfr-candidata-item27-ancora/index.html`, md5 **`577f7808b035e0ae3a49b4ee8d9cd6c8`**,
3.367.429c = **Δ+67** sobre o ar, **reversível byte a byte**, 103 blocos de script / 0 recusados (paridade com origem):
H1 dá à âncora o fallback que o próprio arquivo já usa em `ensureAeeRoster :12181` (`|| view.firstElementChild`);
H2 acrescenta `if (!anchor) return;` antes da inserção (idioma de `ensureBirthdays`). **Medida** (porta 8271, mesma
sessão remintada): braço tempestade **8 leituras** (vs 116/40/28), braço âncora `âncora=1 · insercoes de painel=3 ·
leituras=4 · quedas de painel=0 · escritas=0 · erros=0 · REST total=50`; **controle coordenador idêntico publicado ×
candidata** (4 leituras, escritas 2, quedas 0, REST 42). Ressalva medida e assumida: no braço B o único `innerHTML=`
do renderizador por volta de 3,5 s apaga o painel recém-inserido e custa **exatamente 1 passada extra** (4→8); cortá-la
exige consultar `readingState.loaded` depois da inserção = mudar semântica de refresh, deixado fora de propósito.
Portões novos do rig: armadilhas **113/114/115** em [[bfr-audit-rig-traps]]. Harnesses: 8270 = ar v47, 8271 = candidata.


## Item 29 (20/10) — os dois resíduos do #153: candidata local medida, nada publicado

Causa do churn de 66 mutações/s atribuída por **pilha + negação** e não por leitura de código: o ramo
`jogos-escolares` de `syncNavigationA11y` (`index.html:25399-25407`) escreve `.breadcrumb b`.textContent
sem guarda de valor dentro de um rAF que o próprio `MutationObserver` do módulo de UX re-arma
(`:25447-25459`). Medido 58-61 escritas/s, **99 % de valor idêntico**; a negação no sensor (desprezar só as
iguais, app intocado) derruba para 3-6/s. Detalhes de mecanismo em
[[bfr-mobile-menu-mutation-starvation]].

Candidata `bfr-candidata-item160/` (gerador `gera-candidata-item160.mjs`, diário homônimo `.json`): hunk **B**
(guarda de valor na escrita do breadcrumb) + hunk **C** (o interceptor de captura `:20426` passa a chamar
`syncActiveNavigation`/`persistNavigationState` no mesmo `setTimeout`, com guarda `typeof`). `index.html`
`76de427b → 8432ad73`, **+243 chars**; **rp.js inalterado** (um hunk A no `pintaSozinho` do rp.js foi gerado,
medido e **descartado**: montava a barra, mas mexia num módulo de todos os papéis para curar o que a causa já
cura). Portões: âncora 1×, DEPOIS ausente na fonte, reversão byte a byte `true`, paridade 19 blocos/0 recusados,
marcas RAMO/GUARD/LOTE/BOOT preservadas.

Medidas (firewall de escrita ligado em todas):
- **Montagem da barra, SEM sensor** (`probe-153-portao-barra.mjs`, @390 `open=inicio`, operador): publicado
  `nav=false apresent=null appbar=false` em 7/7 até 16,5 s; **B+C** `nav=true nRoute=4 apresent=mobile` aos
  **2,6 s**; só-A monta aos 3,1 s. Armadilha **116**: com o sensor injetado o publicado também monta (4,5 s) —
  comparação de montagem só vale sem script.
- **Desync do toque, operador @390, toque real na barra, 3 toques (Jogos→Avisos→Jogos)** (`ab-item160.mjs`,
  `MODO=toque`): publicado 3/3 com painel no ar (alt 1677) e `sec`/`guarda`/`aria-current` na rota anterior;
  candidata 3/3 coerente (`sec=jogos-escolares`, guarda idem, `jogos-escolares=page`). `<b>` 61→0/s,
  mutações 55-78→3-17/s, 0 erros, 0 escritas de rede (as `barradas` são todas `cdn-cgi/rum`).
- **Coordenador @1024, toque na sidebar**: o publicado tem o MESMO desync (não é do papel) e a candidata
  corrige; boot @390 idêntico ao publicado em todos os campos lidos (mutações menores na candidata).

Abertos que esta rodada deixou vistos: o `.breadcrumb b` **não restaura** o rótulo ao sair de Jogos (idêntico
nos dois braços, pré-existente), `sidebarAtiva` com dois `.nav-item` do mesmo `data-section` (decorativo), e o
`parent` segue imensurável. Portas do rig: 8272 publicado×operador, 8283 B+C×operador, 8284 só-A×operador,
8282 publicado×coordenador, 8285 candidata×coordenador (8270/8271 continuam sendo ar v47 / candidata do item 27).
Publicar v48 = OK explícito; a fila tem dois arquivos compatíveis (item 27 e item 29) que podem subir juntos.

## 20/10 — v48 publicado e a prova no ar abriu o item 29 (re-carregamento do operador)

**v48 no ar:** deploy `070e5c58-7511-4163-a4ae-51f0d468308d`, `/` = `cac0f7ad343dd3f1ebeb7102ad2fe050`
(3.367.760c, +398 sobre o v47), SW `CACHE='bfr-conecta-v48'`, rp.js `a2cacc7e`. São os dois conjuntos medidos
no MESMO `index.html`: item 160 **B/C/D** + item 27 **H1/H2**. Conferência byte a byte por `confere-v48-no-ar.mjs`.

**Item 27 (tempestade da Leitura Assistida) FECHADO com a causa provada:** `ensureReadingPanel` lia 4 âncoras
que não existem em `#aeeView`, então a guarda de presença nunca virava verdadeira e o
`setInterval(…,1200)` re-dirigia 4 GETs para sempre (116 chamadas em 84 s). H1 dá fallback
`|| view.firstElementChild` (o mesmo idiom`ensureAeeRoster` já usava), H2 devolve cedo sem âncora. No ar e no
harness: 116 → 8 chamadas, âncora 4 leituras/3 inserções, 0 escritas, 0 erros.

**Item 160 (B/C/D) aplicado:** B = guarda de valor na escrita do `.breadcrumb b` (61 escritas/s de valor
idêntico → 0; a fome do `schedule()` do rp.js era ela, e sozinho B devolve a barra ao mobile aos 2,6 s);
C = o interceptor de toque dos Jogos passa a chamar `syncActiveNavigation`/`persistNavigationState`;
D = o mesmo par no caminho de BOOT. Medido: barra 3/3 montada, `sec=jogos-escolares` e guarda coerente nos
toques e no boot, ida-e-volta limpo.

**Item 29 — a REGRESSÃO DE RE-CARREGAMENTO que a prova no ar achou (e que a candidata não tinha medido):**
no público, `3/3` com `sec=jogos-escolares` + barra + guarda certos, mas só `1/3` com painel visível; 2ª e 3ª
passadas dão `VISÍVEIS=NENHUM`, `abertos=0`. Atribuído com o guarda de navegação SEMEADO antes do boot
(`probe-v48-recarga.mjs`, sem clique, uma porta por dir × papel):

- v47 publicado, guarda `jogos-escolares`: **0/3 @390 e 0/2 @1024** — o caminho JÁ era quebrado.
- v48 publicado, mesmo guarda: **0/3** — igual.
- v48 + hunk E, mesmo guarda: **3/3 @390 (alt 1677) e 2/2 @1024 (alt 997)**, `abertos=1`, 0 erros.
- guarda `inicio`: v48 e v48+E dão 3/3 idênticos (paridade no caminho que já andava).

Causa: `restoreNavigationState` (`:4536`) chama `navigateToSection`, e o ramo do operador (`:9242`) exige
`typeof window.BFRSchoolGames?.open === 'function'` NA HORA — o módulo nasce aos 610–1.058 ms e a restauração
roda antes; o `hide-all` de `:9238` já escondia tudo. A única re-tenta (`abrirJogosDoBoot`, `:9130`) só cobre
`activeSection === 'inicio'`. **O que o v48 mudou foi gravar `jogos-escolares`, o que cria o segundo
carregamento nesse caminho.** Regra de casa que fica: *corrigir o estado de boot cria um caminho de boot* —
o item 28 voltou pela outra ponta.

**Hunk E** (`gera-candidata-item161-boot-e.mjs` → `bfr-candidata-v48-boot-e/`, `cac0f7ad → d9374fb5`, +76c,
reversão byte a byte, paridade de sintaxe, 9 marcas + E): `else if (activeSection === 'jogos-escolares')
window.BFRSchoolGames.open();` dentro do mesmo `abrirJogosDoBoot`, SEM re-`sync`/`persist` (o estado já está
certo nesse caminho; duplicaria `history`). Controle no coordenador @390 (8296 v48 × 8295 boot-e, 3 amostras
pareadas após 12 s de calmaria): `sec=inicio`, `coordinatorView`, `barra=true`, `alt 5063` idênticos, 0 escritas.

**Fica ABERTO mesmo com E:** recarregar com o guarda em OUTRA seção do operador (`notificacoes` medido: 0/3
NENHUM, igual no v47). O papel não tem container nem ramo de roteador para as outras seções — cair em Jogos
é decisão de produto (fallback), não hunk de 76 chars.

**v49 PUBLICADO 20/10 (deploy `cc5a666e`, `/` md5 `d9374fb5` byte-idêntico à candidata `boot-e`, SW `CACHE='bfr-conecta-v49'`, rp.js `a2cacc7e`) — item 29 endereçado pelo hunk E; a prova no ar da recarga (2 cargas seguidas com painel) estava em curso, não afirmada.**

**Item 24 FECHADO NO AR (v50, 20/10, `prova-ar-v50-item24c.mjs` → `prova-ar-v50-item24c.json`).** A superfície
nova do coordenador é `[data-coordinator-student-directory]` e a entrada é `[data-coordinator-directory-nav]`.
O que a passada prova, por gesto e sem script injetado: @1024 `tocado=true → sec=cadastro-alunos`, crumb
*"Cadastro de alunos"*, painel **alt 700 × 848 linhas**, `contagem="848 ALUNO(S)"`, `admin=sem nó`; @390 o
mesmo por **barra → *Mais* → drawer** (`#bfrMobileDrawer.is-open`, 17 rotas, `cadastro-alunos` tocado em
172,422) com painel **alt 691 × 848**; nas duas bandas o filtro vale `ABIGAI`→1, `zzzqñ`→**0** com a mensagem
*"Nenhum aluno encontrado com estes filtros."*, limpo→848, e a saída re-oculta (`alt 0`, `oculto=true`); as
duas visitas são idênticas e `n_painel` fica em 1. Contas de rede: **0 escritas em tabela, 0 RPC não-GET,
0 rotações de sessão** nos dois braços do coordenador; todos os "erros de console" são o `cdn-cgi/rum` 404.
Controlo do developer: toque recusado (achado pré-existente do item 32(iii)) e, pelo roteador do app,
`#adminStudentDirectoryPanel` **VISÍVEL/1377px** com `n_painel=0 n_nav=0` — a superfície do coordenador não
aparece fora do papel.

**Como aplicar a lição de instrumento (custou duas rodadas).** A 390 há **três** cópias possíveis do item
injetado e a que a pessoa vê não é nenhuma das duas do `index.html`: a `.bfr-platform-nav` está em
`ASIDE.bfr-web-sidebar` com `display:none` e a `.mobile-more-grid` está dentro de `DIV.mobile-more-menu.hidden`
(medido por `sonda-gaveta-v50.mjs`); o que abre é o **drawer do rp.js**, que herda as rotas dos itens do papel.
Logo, para provar um item de navegação mobile: seletores por banda, `#bfrMobileDrawer.is-open
[data-bfr-drawer-route="…"]`, e imprimir as rotas do drawer no `BOOT` — nunca assumir que o injetado no
`index.html` é o visível. E antes de tocar em qualquer coisa da barra de baixo, feche o modal de primeiro nome
ou o `elementFromPoint` devolve `DIV.modal-card.account-tool-card.preferred-name-card`; o `tocarGrade()`
(varre 9 pontos do rect e só aceita o hit-test que **é** o nó) é o substituto do ponto-central quando há
chrome sobreposto. Ver [[bfr-audit-rig-traps]].

**Item 34 fechado no banco, sem publish (20/10).** Dois degraus, cada um ensaiado com `rollback` antes de
aplicar: o qualificador `profiles.role` no guard matou o `42702`, e só a chamada real pelo PostgREST mostrou
o que ele tapava — `42804` porque `profiles.role` é o enum `account_role` e o `RETURNS TABLE` declara
`role text`; o `p.role::text` na coluna 3 fechou. Prova das duas sessões: developer e coordenador passam de
**400 → 200 `[]`**, e o irmão `list_current_month_birthdays` está **inalterado** nos dois braços; `/` do ar
reconferido depois do DDL (`01055151`, 3.391.514 bytes) porque nada no HTML mudou. O ecrã **não** ganha
linhas: 13 perfis de equipe, **0** com `birth_date`, e por escolha da usuária não escrevi dado em perfil
nenhum. Protocolo completo em [[bfr-supabase-dashboard-access]] e a armadilha do ensaio sem JWT na (131) de
[[bfr-audit-rig-traps]].

**Observação medida, CAUSA JÁ ATRIBUÍDA (e a hipótese escrita aqui estava ERRADA):** eu anotei que o
coordenador recebia `200 []` do `list_current_month_birthdays` "por causa da projection/RLS do `birth_date`
dos alunos". Não era: a função é `SECURITY DEFINER` e o guard era `public.is_approved()`, que não lista
`coordinator`/`director`/`secretary` — item 35. Isso foi medido nos dois lados (0×67 com papel assumido) e a
opção (b) foi **APLICADA em 20/10 com OK explícito** (item 35.2): `bfr_can_view_student_birthdays()` + a
mesma função reescrita só no guard; coordenador passa a receber `200 · 67` pelo caminho HTTP do app, sem
tocar nas 9 policies de `is_approved()`. Ver [[bfr-is-approved-role-gap]].

**Item 36, ABERTO e é do app (medido na tela, não por leitura de código):** com o direito aberto no banco,
**nenhum papel vê aniversários novos na tela**, porque a seção `experiencias` não está em
`roleSectionAccess` de nenhum dos 13 papéis (`:8177-8192`) e `navigateToSection` cai em
`allowedSections[0] || 'inicio'` (`:9222-9227`). Medido com `prova-tela-35b.mjs` na URL publicada (v50,
md5 `01055151` conferido antes da passada, 5 braços, zero cliques): `aluno/inicio` injeta
`[data-bfr-birthdays]` com `total=67` e 72 cartões — controle positivo do instrumento; `coordenador/inicio`,
`developer/inicio` (view `admin`, pulada pelo `if (!isAdminShell)` de `:12287`) e `operador/inicio` dão
**painel ausente** em 20 rondas (~24 s); `coordenador/experiencias` nunca saiu de `sec=inicio` em 58
tentativas. O censo veio do próprio app (`BFR_APP_RUNTIME.roleSectionAccess`, exposto em `:16057`), então não
é inferência de código. Resíduo da camada do aluno: o painel medido tinha **altura 0** (está na lista
`FOREIGN_PANELS`, `:732`), então "67 no DOM" ≠ "67 visíveis". Publicar ou não a porta de entrada é decisão da
dona; armadilhas de instrumento desta passada em [[bfr-audit-rig-traps]] (134).

**Item 36 — as três candidatas existem em disco e NADA foi publicado (21/10).** O ar segue `01055151` (v50,
deploy `a73bb0bc`). Cada braço abriu um bloqueio diferente e o anterior continuava injetando nada:
- **36-A** (`bfr-candidata-item36-aniversarios-36a`) — só o portão do papel (H1). Medido: `coordinatorView`
  viva, `ancora_coordinator=false`, `birthdays=[]`, porque `ensureBirthdays()` âncora por
  `[data-bfr-coordination-command]` (`:12082`), nó criado só pelo módulo `bfr-coordination-dashboard-v3`,
  que está `data-bfr-auth-deferred-disabled` (morto). Ver [[bfr-dead-deferred-modules]].
- **36-B** (H1+H2+H3+H4) — H2 acrescenta `[data-coordination-central]` (`:14591`) como hospedeiro; H3 remove a
  conjunção autocontraditória do guard `:12268` (`role()==='director' || !['developer','director'].includes(role())`
  → ninguém além de developer passava); H4 põe `data-exec-revealed="true"` na raiz do `#bfrDirectionPanel` para o
  overlay `:26173` não o esconder. Coordenador medido @1024: `li=3`, `total=67`, `pessoas=67`, `semanas=5`,
  **zero escritas** (só as 2 RPCs de leitura nominadas).
- **36-C** (as 4 + H5a/H5b) — marca `data-exec-revealed` também nas duas raízes de `[data-bfr-birthdays]`
  (completa e compacta). Diretor @1024 (persona `?role=director` na sessão developer): ar
  `visivel=false disp=none alt=0 ocultoPor=["bfr-exec-legacy-hidden"]` → 36-C `visivel=true disp=block alt=6169
  ocultoPor=[]`, chars do documento 5.219 → 9.491, `escritas=0`. Regressão do coordenador: idêntica à 36-B.
  Saída: index `01055151` 3.374.199c → `3c5587d3` 3.374.247c (Δ+48), reversão byte-a-byte true, paridade de
  sintaxe true, 27 marcadores por classe.
- **Correção de uma alegação minha:** a 36-A dizia que `trimDirectorExtras` removia o nó de aniversários em
  `#directorView`. Medido: `ainda_birthdays=1` — quem esconde é o overlay, não a trituração.
- **Limites honestos:** sem conta sintética de diretor/secretário; `?role=director` (`:9079`) troca a view mas
  não `currentProfile.role`, então o ramo do diretor é provado por código + regra do overlay, **não por toque**.
  @390 a superfície do coordenador fica atrás da shelf colapsada e de uma view vazada de 45,483px. O painel
  completo expõe o `data-bfr-staff-birthday-form` (caminho de ESCRITA já existente no papel, hoje inalcançável
  pelo mesmo portão). Cinco decisões da dona antes de qualquer v51 estão em F/36.1 de `auditoria-bfr-conecta.md`.

## v51 publicado (21/10 05:00Z) — item 36 FECHADO nos bytes, ABERTO na tela

A dona decidiu «**Publicar a 36-C**» e «**Deixar exposto**» o `data-bfr-staff-birthday-form`. Deploy `f1eb0bae-…`
(antes `a73bb0bc`), `/` = **`3c5587d394b3b371565fac7d079429ba`** (3.374.247 chars / 3.391.562 bytes), SW
`698888dc…` com `CACHE='bfr-conecta-v51'`, 12 assets byte-idênticos. Os 6 hunks conferidos **no HTML que está no
ar**, descido primeiro pela API do bundle e **depois conferido por HTTP real na origem publicada** (`GET /` →
md5 `3c5587d3…` IGUAL ao ar, `GET /sw-v4.js` → md5 `698888dc…` IGUAL; ver
[[bfr-publicacao-worker]]): portão `role() === 'coordinator' && section !== 'experiencias'` **fora**, guard
`role() === 'director' || !['developer','director']` **fora**, 3× `data-exec-revealed="true"`, âncora
`[data-coordination-central]` como fallback do `[data-bfr-coordination-command]`.

**Estado por papel depois do v51 (o que muda nesta vaga):**

- **Coordenador:** a superfície de aniversários deixa de exigir `section === 'experiencias'` (inalcançável nos 13
  papéis — item 36). No harness medido: painel injetado, `li=3 total=67 pessoas=67 semanas=5`.
- **Diretor (persona sobre conta developer):** era `disp=none alt=0
  ocultoPor=["bfr-exec-legacy-hidden"]` no ar; com a 36-C `visivel=true disp=block alt=6169`, `escritas=0`.
- **Aluno:** inalterado (continha o painel desde sempre).

**Prova de navegador na URL publicada — FEITA 21/10 (`prova-tela-v51.mjs` → `prova-tela-v51.json`, 6 braços
zero-clique).** O app **nunca esteve fora do ar**; as sondas anteriores grafaram `turmarobiticabfr` (posição 8
`i` em vez de `o`) e NXDOMAIN de nome inexistente é garantido — ver [[bfr-workers-dev-sem-resolucao]]. Resultado
na origem real: a superfície do item 36 **existe e tem dados de produção** (coordenador/coordenacao: painel
`.bfr-coord-birthday-compact` injetado, `li=3`, colunas `Hoje:0` / `Próximos:3`, `marcasReveladas=1`,
`escondidasPeloOverlay=0`, `rede_gravacao=[]`), mas **renderiza colapsada** — `disp=block` com altura 0 e
`paineisVisiveis=0`. Duas causas empilhadas, ambas com linha do ar:

- **Causa de instrumento:** `ligarChrome({cabeca:true})` nunca passa `--window-size` (só no ramo `cabeca:false`),
  então o boot cai em `innerWidth 762` — e a regra do app é `shelfWanted = innerWidth > 800`
  ([ar-implantado-v51.html:736](file:///C:/Users/pcmac/.kiro/crew/uploads/ar-implantado-v51.html#L736)); com a
  shelf nascida fechada, `.bfr-coord-shelf-body{display:none}` (:941) esconde os 5 painéis. Chamando
  `p.viewport(1280,900)` **antes** do `navigate`, a shelf abre (`data-open=true`, corpo 1.369 px) e o painel fica
  visível com altura **68 px**. Armadilha **143** em [[bfr-audit-rig-traps]].
- **Causa de produto:** mesmo a 1280 o painel está `is-collapsed is-empty` com o conteúdo a 0 px, porque
  `hasEmptyState()` (:23574) aceita `.bfr-coord-birthday-empty` (o placeholder "Hoje") enquanto
  `hasUsefulContent()` (:23578) só reconhece `article,table,form,canvas,iframe,input,select,textarea,
  [data-coord-metrics],.bfr-coord-quick-grid,.bfr-coord-profile-metrics` — **nenhum `ul`/`li`**. Ou seja: 3 li
  reais = "vazio" = colapsado por decisão do próprio código.

**Consequência na hora da medição: o item 36 NÃO fechou** (fecha depois, com a linha publicada no v52 — ver
36.10). O objetivo ("superfície visível para o coordenador na URL publicada") não
foi alcançado; o conserto cabe em uma linha de seletor e é **candidata nova + OK da dona antes de qualquer
publicação** — nenhum byte do ar foi editado por mim. Fica como **item 36.8** na seção F. Texto completo em
36.6/36.7 de `auditoria-bfr-conecta.md`. Limites que continuam válidos: sem conta sintética de diretor (o ramo
do diretor é provado por código + regra do overlay, não por toque); @390 a superfície fica atrás da shelf
voluntariamente fechada; `rede_gravacao=[]` não prova ausência de escrita (armadilha 99); perfil de cache
provado num profile virgem de `mkdtemp`, caso v50→v51 não coberto.

**36.9 — candidata do 36.8 gerada e A/B-medida no rig (21/10, ~06:3xZ).**
`gera-candidata-item36-8-colapso-compacto.mjs` → `bfr-candidata-item36-8-colapso-compacto/`, fonte os bytes do ar
v51 (`3c5587d3`), saída `554c3120`, Δ+31 chars, um hunk só (`.bfr-coord-birthday-columns ul` em
`hasUsefulContent`); reversão byte-a-byte e paridade de sintaxe `true`. A/B com a conta real do coordenador
servindo controle (8301) e candidata (8302), `viewport(1280,900)` antes do `navigate`: controle
`is-collapsed is-empty`, painel 68 px, conteúdo oculto 0 px, `+`/`aria=false`, **li 3 / visíveis 0**; candidata
sem as duas classes, painel **301 px**, conteúdo **203 px**, `—`/`aria=true`, **li 3 / visíveis 3**
(alturas `[14,22,22]`). Regressão: censo de collapsibles idêntico (11/11), só o de aniversários muda de estado
(3→2 colapsados). A 1ª corrida foi inválida por reincidência da armadilha **135** (firewall novo sem lista
nominal barrou as duas RPCs de leitura → painel medido vazio); diários bons:
`ab-item36-8-colapso-1280.json` e `ab-item36-8-colapso-1280-b.json`.

**36.10 — APLICADO NO AR como v52 (21/10 06:38:28Z, OK explícito "Publicar como v52 agora") — item 36.8
FECHADO com prova de navegador nas duas bandas.** Bundle `worker-deploy-v52` por `build-worker-bundle-cand.js`,
com o `sw-v4.js` **lido do ar** (`698888dc`) e uma linha trocada (`CACHE` → `bfr-conecta-v52`, md5 `e2ec178a`);
nenhum `?v=` bumpado (o PRECACHE já batia com o HTML e o re-instalador é o nome do CACHE). Portão do bundle
`confere-bundle-v52.mjs`: o literal `const HTML` dentro do `worker.mjs` **é** a candidata byte a byte.
Antes por HTTP `/` = `3c5587d3`; depois `/` = **`554c3120`** (3.391.593 bytes, Δ+31) e `/sw-v4.js` = `e2ec178a`
com `CACHE='bfr-conecta-v52'`. Version `f96189d8-25da-4048-987c-3f4261a0c38b`, deployment
`2fbc47fd-7cbd-498e-802d-087bb24e96a1`, lidos do `wrangler deployments list --json`
(`acha-version-deploy.mjs`) — não lembrados. No ar, sem toque, com a conta real do coordenador:
**@1280 painel 301 px, conteúdo 203 px, `—`/`aria=true`, li 3 visíveis 3** (`prova-v52-colapso-1280.json`) e
**@390 painel 502 px, conteúdo 406 px, li 3 visíveis 3 `[38,46,46]`, sem estouro de largura**
(`prova-v52-colapso-390.json`). O @390 foi destravado sem clique: `shelveForeignPanels()` `:770` decide a prateleira
por `saved===null ? shelfWanted() : saved==='1'`, então semear `localStorage['bfr-coord-shelf-v1']='1'` no
`addScriptToEvaluateOnNewDocument` é portão do instrumento, não mudança de produto (armadilha **145**).
Zero escritas nas duas bandas. Continua não provado: o caso "as duas colunas vazias" (sem `<ul>`, a lógica diz
colapsado com `is-empty` honesto; forjá-lo exigiria interceptar as RPCs de leitura, o instrumento que a 135
condena) e cliente real com CACHE v51 re-instalando. Diário: `audit-publicacao-v52.json`
(`diario-publicacao-v52.mjs` remonta tudo a partir dos arquivos, nenhum número digitado de memória).

## ABERTO no ar (v52): o filtro de componente da aba Notas volta para "Todos" sozinho — cura medida, e o v53.1 publicado carrega a MESMA captura antes de `ensureUi()` (21/10, §37.10)

Defeito de tela real, na conta do professor, medido clique a clique (`veredito-v52-1-filtro.mjs`, harness 8264 com
firewall de escrita): escolhendo **"História"** no `#bfrTeacherGradesSubject` e trocando o bimestre, o painel passa a
mostrar a coluna como **"all"** — os lançamentos de História ficam misturados com "Não lançada" das outras
disciplinas. Causa atribuída no código, não por inferência: `ensureUi()` chama `hydrateFormScopes()` →
`hydrateAcademicScope()`, que **reescreve `subjectSelect.innerHTML` e repõe `.value` a partir do estado antigo antes**
de `secureAcademicSetup()` ler o campo; ou seja, o `select` é re-hidratado por cima da escolha do usuário.

Candidata cirúrgica **v52.1** = o `ar-implantado-v52.html` do ar + um hunk (nada do backlog v53): guarda o valor
escolhido e o reaplica depois da re-hidratação. Prova medida no mesmo harness, braço A/B: v52.1 com "História" e
bimestre 2 → `["Não lançada","Não lançada","Não lançada"]` (só História), voltar para "Todos" →
`["História: 8,0 · 6,0 · 7,0 · 9,0","História: 5,0","Não lançada"]`; `cura_medida: true`,
`volta_a_todos_funciona: true`, assentamento 3567/2940 ms, `estouroX 0`, escritas = só o beacon `POST /cdn-cgi/rum?`.
Arquivo `ar-candidato-v52-1-filtro.html` 3.391.963 bytes, md5 `f6cf492f5effa67bc3a488607f11cca1` (espaçado na conversa
antes de citar, nunca por olho). **Estado: candidata pronta e medida; publicar exige OK novo** — é a alternativa
estrita e menor à v53.1 (item #182). Ver [[bfr-notas-por-bimestre-candidatas]].

**Depois do #182 (21/10 21:02Z):** a v52.1 **não** foi a publicada — o OK escolheu a v53.1. Conferido nos bytes por
`confere-hunk-filtro-531.mjs`: as duas linhas velhas (`…?.value || academicState.subject || 'all'`) **não** estão no
ar, e as 5 linhas da cura (`const escolha = {` + as duas leituras + os dois `const subject`/`const term` lidos de
`escolha`) **estão** — o v53.1 tem o mesmo guarda dentro de `secureAcademicSetup()` (:17415), com comentário próprio.
Ou seja: a cura está no ar **por código**, não por re-ensaio; o A/B que provou `cura_medida:true` rodou sobre a v52.1.
Registrar como "não re-medido na banda do painel antigo", e não como fechado com prova.

## AR EM v53 (21/10, 21:02Z, item #182 publicado): o que está no ar e o que continua aberto

`/` = **3.408.900 bytes, md5 `f08374b1258064a82d8503d08bff37e9`** (três fetches idênticos), `/sw-v4.js` 3.585 bytes
md5 `65382f27bffcc55b98f87b22a77d43ee` com `CACHE='bfr-conecta-v53'`, delta **+17.307** sobre o v52, 12/12 assets
byte-idênticos ao v52 (`rp.js` `a2cacc7e…` incluso). Deploy `3f9e034f-6620-4bc5-8b8a-deb10ca2aad6` / version
`2525fabb-e8fa-4aa0-b987-27d346f17792`; anterior `f96189d8`/`2fbc47fd` (v52), reversão congelada em
`ar-html-v52-live.html` + `ar-sw-v52-live.js`. Diário `audit-publicacao-v53.json`, relatório §37.16, selo rerodado em
`selo-fechamento-185-187.txt`.

Marcas que **não existiam** no ar antes e agora existem: `renderGradeGrid 2 · bfr-grade-grid 4 · data-bfr-grade-cell 2 ·
bfr_grading_rules 2 · data-academic-tab="notas" 2`. As três marcas dos lotes anteriores continuam nos mesmos números.

**ABERTO (por medida, e a causa mudou de figura em 21/10): a tela nova nunca foi vista renderizar para um professor
real na URL pública — e agora sabe-se que não é falta de conta.** A conta sintética `pedagogical` foi mintada com OK
(`0e3404ab…`, quinta conta viva) e, com ela, `BFR_SECURE_TEACHER_SCOPE` **carrega** (`loaded:true`, antes `false`) mas
aborta com *"Não foi possível confirmar as turmas vinculadas a este professor."*: `loadScopedSchedule()` exige a
`bfr_schedule_versions` 2026/published, que a policy `bfr_schedule_versions_read` não mostra a um docente sem entry na
versão (REST `200 []`, filtro de RLS, não recusa) → `'Grade publicada não encontrada.'` → `ensureAcademicUi()` não roda
→ aba "Notas por categoria" ausente, `celulas 0`, `academicStatus="Dados das turmas indisponíveis"`. O RPC da #185 está
inocente: `200`, `error:null`, arrays zerados por falta de vínculo. Forçar o handler delegado `#teacherOpenGrade`
também não monta o módulo com o escopo em erro. Cadeia e opções de destravamento em
[[bfr-schedule-manager-narrowing]]; diários `prova-ar-v53-pedagogical.json`,
`prova-ar-v53-modulo-pedagogico.json`, `sonda-escopo-pedagogical.json`, §37.17 / item 39 do relatório; 0 escritas em
todas as passadas. Antes disso, com sessão de developer e persona forçada
(`[data-preview-role="teacher"]`), o `#academicPanel` montava com as **duas abas originais**
(`grades:Notas`, `attendance:Frequência`) e `loaded:false` — diário `prova-ar-v53-teacher.json` (rerodado às
21:26:48Z com `boot_inicial` e `medida_390` gravados: @390 `linhas 40 · estouro 0 · celulas 0`). O render/clique do
módulo continua provado **no harness local com os mesmos bytes** (#183/#184). **Item #179 FECHADO em 22/10**: com conta
`parent` temporária + 1 linha em `guardian_students`, o boletim do responsável foi medido na URL pública v55 nas duas
bandas (História 10,0/9,0/8,0, média 9,0, 0 escrita, 0 exceção); vínculo e conta foram removidos depois (§37.21/§37.22).

## v54 PUBLICADA (21/10, ordem "Publicar a candidata v54"): o desacople do módulo de notas está no ar — deploy `cd21c909`, version `74cc2f8f`, 23:09:50Z

A opção (c) do §37.17 virou código e foi publicada: `ar-candidato-v54-desacople.html` (3.409.714 bytes, md5
`a2fce2599e04433a93bb954a95286e93`), 2 hunks sobre os bytes do ar (`f08374b1…`, v53.1), diff provado por
invertibilidade. O hunk principal faz
`loadScopedSchedule()` não abortar no erro da grade (`scheduleEntries = []`) e derivar turmas/disciplinas de
`bfr_teacher_class_subjects` (`profile_id = userId()`, `active = true`), com a grade publicada como fallback.
Publicação com preflight 8/8, SRC 4/4, bundle verde (HTML embutido `a2fce259…`, SW só com o `CACHE` trocado) e
deploy por OAuth. No ar: `/` **3.409.714 bytes md5 `a2fce259…`** nos três fetches, `/sw-v4.js` `0e6902a9…` com
`CACHE='bfr-conecta-v54'` e **1** linha de diferença do v53, **12/12 assets**, **15/15 rotas 200**; Chrome limpo só
com a cache `bfr-conecta-v54` e o body de `/` nela com md5 `a2fce259…` (únicos 404: beacon `cdn-cgi/rum` da
Cloudflare). Nada foi aplicado ao patched e **0 escritas no banco**. Reversão congelada em `ar-html-v53-live.html`
(`f08374b1…`) + `ar-sw-v53-live.js` (`65382f27…`), exige OK. Diário `audit-publicacao-v54.json`, relatório §37.19.

A/B de 6 braços no harness 8271 com a conta `pedagogical` real (`prova-candidata-v54-desacople.{json,log}`, 0
escritas): **A** ar×vínculo-sem-grade bloqueia (`turmas 0`, sem aba, 0 células); **B** cand×vínculo-sem-grade monta
`turmas 1 · alunos 3 · notas 3`, aba "Notas por categoria", `linhas 3 · células 1`, pesos `100% + 3× não se aplica`,
médias `8,0 / 5,0 / Aguardando: 1 de 1`, delta 0; **C** @390 idêntico e sem estouro; **D/E** paridade exata entre ar e
candidata quando a grade publicada existe; **F** controle sem vínculo segue recusando (`turmas 0`). Consulta de
vínculo na rede filtrada por `profile_id`+`active`; 0 POST de escrita; 0 erro de console não-rede. Os 8 portões do
ensaio estão verdes (a célula editável é **1**, não 3: dois alunos já têm lançamento e recebem span+`Corrigir`).

**O que falta:** a publicação está feita, mas o banco não foi tocado — a conta `pedagogical` **não tem linha em
`bfr_teacher_class_subjects`**, então abrir a URL pública com ela ainda mostra *"Nenhuma turma foi vinculada…"*. Ver a
tela com vínculo real na URL pública exige **linha de vínculo para um professor real** (OK separado) ou a credencial
dele; os 14 cenários do brief §8 na URL pública continuam pendentes (§37.19). Item #179 e a limpeza das contas
sintéticas foram **fechados em 22/10** (§37.21/§37.22) — a conta `pedagogical` citada acima foi apagada, e o que falta
para ver a aba de notas com um professor real continua sendo a linha de vínculo, não a conta. Armadilha nova: 167 em [[bfr-audit-rig-traps]] (`teacher_id` da grade = id de
`bfr_teacher_directory`, não do profile). Detalhe em [[bfr-notas-por-bimestre-candidatas]], §37.18/§37.19 e item 40
do relatório.

## ÁREA DO ALUNO — ciclo de auditoria 22/10 (v61 PUBLICADA 23/10 02:25Z; itens 43, 44 e 46-D4/D5 fechados no ar)

Estudo estático + medição no ar (390/1280) + fixture sintética limpa com baseline provada (28 tabelas, contagem E md5,
`aluno-limpeza.json`, `conta_testes_vivas: 0`). **Defeitos D1–D8 do aluno** (numeração própria do §38, não confundir com
os D1–D4 da suite v59 do professor):

- **D1 (item 43, crítico): boletim e trio `—/—/00` NUNCA nascem.** Corrida: `setRole` (10436) chama
  `setupStudentRealtime()` antes de `BFR_AUTH_MODULES_READY` (10438) rodar os deferred; `window.BFRStudentSpace` só
  existe em 20899 → guard de 10905 devolve erro fixo, sem retry. **FECHADO na candidata por C1 (retry no `.then()` de
  modulesReady) + C6 (pintor do 3º cartão, que não tem escritor nenhum no fluxo do aluno — o único, 7840, é do
  parentView).** Provado: trio `8,2 / 66,7% / 02` na candidata × erro+`—/—/00` no controle, nas duas bandas.
- **D2 (item 44, alto): views de portal vazam sobre a área do aluno.** O hide do roteador (10095) só esconde
  `.bfr-platform-view`; os ramos de notificacoes/conteudos/relatorios (10052) e resultados-aprendizagem (10051)
  retornam antes, `schoolGamesView` abre depois (10127). **FECHADO na candidata por C3 (os 5 IDs no hide).** Provado:
  `inicioDepoisPortal.conteudos` = `studentView` × `studentView,bfrContentHubView` no controle.
- **D3 (item 45, alto, decisão de produto): 8 das 19 rotas do aluno sem tela própria** (notas/boletim caem na mesma
  âncora, agenda abre Projetos, horarios/jogos reutilizam legados, comunicados cai em `.notice`, escola-historia e
  videos-aprender não têm handler). Ausência de superfície — construir telas ou remover rotas é decisão de produto.
- **D4 (item 46): Meu Espaço abre com crumb "Escola" e sidebar destacando Escola** (`BFRStudentSpace.open` 20860-20877
  não mantém `lastArea`/crumb). **FECHADO na candidata por C2 + H4** (guard no boot do BFRPlatform 13543). **Verdade
  medida do H4:** o destino pós-reload é do `restoreNavigationState`, idêntico nos dois braços — H4 só impede a
  reabertura redundante do boot (reload fx 65 cand × 54 controle; o delta é a carga do C1).
- **D5 (item 46): notificacoes/conteudos herdam o crumb anterior** (retorno em 10052 antes do breadcrumb de 10149).
  **FECHADO na candidata** (crumb próprio no retorno antecipado). Provado: `Notificações`/`Conteúdos` × `Meu painel`.
- **D6 (item 46, decisão): Escola mostra eventos fictícios fixos no código (13530)** enquanto comunicados/agenda usam
  dados reais — decidir entre `school_events`/`announcements` reais (hoje 0/1 linha) ou marcar os fixos como exemplo.
- **D7 (item 46, decisão): Central de Atividades cumprimenta com a 1ª palavra de `full_name` (13489)** — slug do
  e-mail em contas sem nome real.
- **D8 (item 46): `syncNavigationA11y` (26656) força crumb "Jogos Escolares" + destaque do nav** enquanto
  `schoolGamesView` está visível — para o aluno o C3 resolve por efeito colateral; para o operador de placar é o
  desenho atual. **FECHADO na v75 (26/10, §AF) e PROVADO VIVO em 26/10 05:38–05:40Z (§AG):** 6 hunks
  (A/B/C/I/R/N), A/B `D8_AB_OK` 216/0, publicado `b4cec7fb…`; na URL pública com 4 jobs (coordinator 390/1280 +
  sports_operator 390/1280) `D8L_OK`, 0 erros — fotos +808/+1851/+3675 ms @1280 e +3770/+4549/+6368 ms @390 com
  crumb «Fotos dos alunos»/`ativos=["fotos"]`, fechar → Início, reload → `jogos-escolares`, operador 147 filhos
  estável. Contas apagadas, baseline 30 tabelas `diffs:[]`, 0 vivas. Ver [[bfr-d8-candidata]].

**Candidata v61-aluno PUBLICADA 23/10 02:25Z (OK explícito «ok», deployment `af328abb-b3e1-4321-be65-31a51e5d3737` /
versão `1e1f5b07-eed4-4c84-892f-2027e5c903dc`):** `bfr-candidata-v61-aluno/index.html` = v60 + 6 hunks
(10052/10095/10439/10922/13545/20878), md5 `d185a4a7a9bc9b78587c909d9bdd6d8b`, +1.982 chars / +1.990 B (8 bytes
multibyte dos acentos), sintaxe verde. **A/B no harness TESTADO 22/10 nas duas bandas** (diários
`mede-v61-aluno-ab-390/1280.json`, zero escritas): os 4 defeitos reproduzidos no controle e consertados na candidata;
regressão 19/19 rotas `erros:[]`, `bloqueios:0`, fx 74×85; nota de consistência — a rota `relatorios` não existe (a
real é `resultados-aprendizagem`), 3º ramo do D5 cai no mesmo fallback nos dois braços. **Publicação provada por HTTP
(3 GETs, md5 `d185a4a7…`) e por Chrome limpo (cache única `bfr-conecta-v61`, corpo em cache md5 `d185a4a7…`, SW
`/sw-v4.js` md5 `557f35e4…` CACHE v61, rp.js `a83f77ba…`, 0 erros não-rede).** Itens 43 e 44 FECHADOS, 46 parcial
(D4/D5 fechados; D6/D7/D8 abertos, decisão de produto). Detalhe em [[bfr-area-aluno-analise]],
§38.5/§38.6/§38.9/§38.10 da auditoria.

**v62 PUBLICADA 23/10 ~08:15Z (OK «v62 completa», Version ID `fe25dc68-b3b3-48ac-996e-6ee5165b43e7`) — fechamento do ciclo BU:** a candidata de 5 hunks subiu inteira como deploy cirúrgico a partir do AR — `index.html` `d185a4a7` (3.483.291 B) → **`ebdfe507542542d36fad88f62b194cd2`** (3.370.291 B), `sw-v4.js` só com a linha `CACHE` trocada (`557f35e4` → **`e8f4fa2dbf37ad0d2470d6298adb9cc6`**, cache `bfr-conecta-v62`), `bfr-responsive-presentation.js` byte-idêntico (`a83f77ba…`), 12/12 assets iguais. Hunks: (A) p52a — `setupLiveContent()` no ramo parent do `setRole` (Home do responsável pinta comunicado+evento no boot); (B) script morto `bfr-coordination-command` removido; (C)+(D) wrapper legacy do `shiftOverviewMarkup` e linha legacy do `gateSystemMessage` removidos (item 47 — pill "Registro suspenso", sem promessa de migração); (E) thenable lazy da linha 11501 consumido (`.then(() => {}).catch(() => {})` — T6.4). 5 portões verdes (`audit-publicacao-v62.json`; janela de propagação ~20 s na 1ª prova-http, re-fetch com `Cache-Control: no-cache`). Ensaio pós-deploy `bu-ensaio-v62.json` VEREDITO APROVADO nas 3 bandas: T6.4 persiste + reload 9→8; p52a repinta sem reload; item47 pill limpo 0 erros. Banco no mesmo dia: policies 48/49/50 APLICADAS e re-testadas APROVADO (`bu-ret-48-49-50.json`). Estado final do ciclo BU em `bu-relatorio-final.md` (seções C–G) e na seção N da auditoria.

**v66 PUBLICADA 25/10 04:13:45Z (OK «Sim, publique a v66», deployment `dd374139-298e-4d29-b069-626d859c7200` / version `566021c7-069d-4cca-bb2f-3e6e83d8daa4`) — Comunicação do professor + presença do chat:** o achado do TPROF está fechado no ar. 3 hunks em 2 módulos + núcleo (C1 rota do núcleo `setProfessionalTeacherSection` chama `window.BFR_LOAD_TEACHER_COMMUNICATIONS?.()` em `key==='comunicacao'`; C2 o `bfr-professor-secure` expõe o loader no `window` e autocarrega no boot se a tela já estiver visível; P1 o `visibilitychange` do `bfr-chat-redesign` consome o thenable do upsert de `internal_chat_presence`). `/` `3c6a006a` (3.370.854 B) → **`9a8b585c2b5699a1d01bac4982975add`** (3.371.168 B, Δ+314), SW só com a linha `CACHE` trocada (`b30dd8d2` → **`9ec18e530eb51a5671fb94e977f314d5`**, cache `bfr-conecta-v66`), rp.js byte-idêntico (`a83f77ba…`), 12/12 assets. A/B offline `v66-ab.json` **AB_OK 12/12** antes do deploy (ar: 0 query do loader e host "Nenhum comunicado novo."; candidata: 1 query `status=eq.published&limit=8` + article renderizado; POST de presença 0→1; 8 rotas do professor idênticas; 0 exceção). Prova pós-deploy: HTTP 3 GETs na 1ª tentativa (sem retry de propagação) e Chrome limpo (cache única v66, corpo em cache `9a8b585c…`, marcas `v66_C2_expose/guarda/C1_rota/P1_thenable`=1 e `v66_P1_antigo`=0; únicos 404 são `/cdn-cgi/rum?`). **Nenhuma escrita no banco.** Reversão = devolver `ar-html-v65-live.html` (`3c6a006a`) + `ar-assets-v65-live/sw-v4.js` (`b30dd8d2`) no mesmo pipeline cirúrgico. Ver [[bfr-v66-candidata]], [[bfr-publicacao-worker]], [[bfr-lazy-thenable-upsert]].

**v67 PUBLICADA 25/10 04:55:25Z (OK «executar o deploy da v67», deployment `8138a89d-c68d-4ddd-ad72-6d5ccc1c6e20` / version `d7089729-65a7-4b9e-82b2-b40c7fe4bdf6`) — item 57 (realtime da Home):** 1 hunk em `setupLiveContent()` — o `startLiveContentUpdates()` passa a rodar depois de `supabaseClient.realtime.setAuth()` (cadeia `Promise.resolve().then(...setAuth...).catch(...).then(start...)`, que sempre chega ao start mesmo se o setAuth lançar). `/` `9a8b585c` (3.371.168 B) → **`e025957cd44305ea7208096fd19431c0`** (3.371.465 B, Δ+297), SW só com a linha `CACHE` trocada (`9ec18e53` → **`7ce30116b40ed3f18e680a8300f4dbd9`**, cache `bfr-conecta-v67`), rp.js byte-idêntico (`a83f77ba…`), 12/12 assets. Causa atribuída antes: o realtime-js 2.50 nasce com `accessTokenValue = apikey`; quem assina antes do primeiro join-ok manda a apikey de 46 chars, a RLS avalia como anon e `announcements` não entrega frame — sobrava o poll de 60 s. A/B offline `v67-ab.json` **AB_OK 9/9** (ar: join 46, 0 `setAuth`; candidata: join 248, setAuth antes do subscribe). Prova pós-deploy: HTTP 3 GETs na 1ª tentativa (12/12 assets) e Chrome limpo (cache única v67, corpo em cache `e025957c`, SW `activated` controlando, marcas v60–v66 + `v67_setAuth_promessa`/`then_start`=1 e `linha_direta_antiga`=0; únicos 404 são `/cdn-cgi/rum?`). **Nenhuma escrita no banco.** **Residual honesto: o frame realtime e a repintura da Home no ar continuam NÃO MEDIDOS** (exigem conta parent sintética + 1 INSERT em `announcements` com limpeza, sob OK novo). Reversão = devolver `ar-html-v66-live.html` (`9a8b585c`) + `ar-assets-v66-live/sw-v4.js` (`9ec18e53`, CACHE v66). Ver [[bfr-v67-realtime-candidata]], [[bfr-publicacao-worker]].

**v68 PUBLICADA 25/10 05:55:28Z (OK «começa com o preflight de publicação da v68», deployment `940ce5c9-c0f9-4462-af85-5f3a94576a20` / version `ca514397-28c0-4e14-8b6a-43f20000c277`) — item 57, ouvinte tolerante, FECHADO AO VIVO:** o frame real chega com `topic` de **outro canal** (`realtime:bfr-portal-upgrades`) e `ids` da binding do canal de conteúdo — o "sem `topic`" do §P era truncamento de diário —, então o realtime-js 2.11.10 o entrega ao canal errado e o `_trigger` não dispara; a v68 anexa um `addEventListener('message')` no `supabaseClient.realtime.conn` (retry 500 ms × 120 até o `conn` nascer), ignora não-string/array/evento ≠ `postgres_changes`, roteia por `payload.data.table` e agenda `setupLiveContent()` / `loadSchoolActivities(true)` com debounce de 400 ms; as três bindings do canal passam a chamar os agendadores e a chamada fica antes do `if (liveContentTimer) return` (reconexão reanexa). `/` `e025957c` (3.371.465 B) → **`288318ff7a1cd28867c1e6fefe5df42a`** (3.373.041 B, Δ+1.576), SW só com a linha `CACHE` trocada (`7ce30116` → **`207736ab2d84a39687be9e33880ce159`**, cache `bfr-conecta-v68`), rp.js byte-idêntico (`a83f77ba`), 12/12 assets. A/B offline `v68-ab.json` **AB_OK 10/10** (ar: 0 repintura/0 GET após o frame; candidata: repinta com exatamente 1 GET a +410 ms). Prova pós-deploy: HTTP 3 GETs na 1ª tentativa (12/12 assets) e Chrome limpo (cache única v68, corpo em cache `288318ff`, SW `activated` controlando, marcas v60–v67 + v68 `1/3/2/1/4/3/0/1`; únicos 404 são `/cdn-cgi/rum?`). **Teste vivo autorizado (§S, 25/10 ~06:12Z): frame a +1,45 s (1.291 chars, `topic` errado, `ids:[121121574]`), repintura a +2,19 s; DELETE → frame +1,49 s, reversão +2,14 s; 0 escritas da página; limpeza e baseline por contagem E md5 (`BASELINE_RESTAURADA`, 0 vivas).** Residual de servidor: o quadro segue misrotulado no envio (tópico do portal), absorvido para conteúdo vivo; corrigir exige OK próprio. Reversão = devolver `ar-html-v67-live.html` (`e025957c`) + `ar-assets-v67-live/sw-v4.js` (`7ce30116`, CACHE v67). Ver [[bfr-v68-ouvinte-tolerante]], [[bfr-v67-realtime-candidata]].

**v69 PUBLICADA 25/10 06:42:17Z (OK duplo: recon read-only + «preflight → SRC → confere-bundle → deploy → teste vivo») — ITEM 57 REGREDIU; item 69 diagnosticado, correção pendente:** deploy `7a81c16d-5031-456b-a3bc-fb8f78c725fc` / version `8b3057fc-6fa8-45c5-909f-80c5c3cc0aa9`; `/` `288318ff` (3.373.041 B) → **`52d8d4e7247ff5443558f8dffd157f0b`** (3.373.158 B, Δ+117), SW só com a linha `CACHE` trocada (`207736ab` → **`c36e75deff30c7f334b1a20a34b36db8`**, cache `bfr-conecta-v69`), rp.js byte-idêntico (`a83f77ba`), 12/12 assets. 2 hunks: o binding de `announcements` do canal de conteúdo passa a disparar `agendaConteudoLive()` + `bfr-announcements-changed`, e o portal **deixa de abrir** `bfr-portal-upgrades`. Portões verdes (`preflight-v69.json`, `ambiente-producao-v69.json` 13/13, `prepara-src-v69`, `confere-bundle-v69.json`, `v69-ab.json` AB_OK 11/11, `prova-http-v69.json` 1ª tentativa, `prova-sw-v69.json` Chrome limpo com `portal_canal:0`/`dispatch_evento:1`). **Teste vivo (`v69rt-ws.json`): ZERO frames** — nenhum `postgres_changes` em 26 s, 0 GET, 0 evento nativo, título parado; veredito cru `SEM_FRAME_NO_SOCKET`, aqui **legítimo**. **Causa (sonda crua A–F, `v69rt-diagnostico.json`):** não há bug de `topic` no servidor — o `topic` é sempre o do canal que recebe; `school_events` e `school_activities` estão **fora da publication `supabase_realtime`** e uma assinatura a tabela não publicada **envenena o canal inteiro** (B/C/F sem quadro; A/D/E entregam em 1,4–1,5 s). A v68 repintava porque o **canal do portal** (1 assinatura válida) recebia e o ouvinte tolerante lia o cru; a v69 removeu esse único caminho → Home voltou ao poll de 60 s. **Correção mínima proposta (v70, front-only, 1 hunk):** manter só `announcements` no canal de conteúdo; **opção B (DDL, OK próprio):** `ALTER PUBLICATION supabase_realtime ADD TABLE school_events, school_activities` (exige RLS por assinante). Limpeza: 6 INSERT/6 DELETE de sonda, `sondas_restantes: 0`, conta apagada, `v69rt-pre` × `v69rt-pos` **0 contagens e 0 md5 divergentes, 0 vivas** → `BASELINE_RESTAURADA`. Diário `audit-publicacao-v69.json`, §T da auditoria. Ver [[bfr-realtime-assinatura-fora-da-publication]].

**v70 PUBLICADA 25/10 07:19:16Z (OK «fazer deploy da v70») — correção da regressão da v69; efeito funcional AINDA NÃO MEDIDO NO AR:** deploy `1a2225ad-d4fa-4e33-8bef-0de8730e13fd` / version `4ddc5035-4890-4c57-adcc-04e9184f5cc4`; `/` `52d8d4e7` (3.373.158 B) → **`d29fdad976dc17c83e96aeb9c93849e6`** (3.373.118 B, Δ−40), SW só com a linha `CACHE` trocada (`c36e75de` → **`1658465b322a9043c4b6d99ad295ad03`**, cache `bfr-conecta-v70`), rp.js byte-idêntico (`a83f77ba`), 12/12 assets. 1 hunk: o canal de conteúdo mantém só `announcements` (com o dispatch de `bfr-announcements-changed` da v69) e perde as inscrições de `school_events`/`school_activities`. Portões: `preflight-v70.json` VERDE, `confere-bundle-v70.json` VERDE, `v70-ab.json` **AB_OK 10/10**, `prova-http-v70.json` 1ª tentativa (3/3 GETs com o md5 novo), `prova-sw-v70.json` Chrome limpo (cache única v70, marcas `announcements 2`/`portal_canal 0`/`escola_no_canal 0`/`atividade_no_canal 0`/`tolerante 1`), diário `audit-publicacao-v70.json`, §U da auditoria. **O item 57 segue ABERTO até o teste vivo** (1 INSERT + DELETE, conta parent sintética) mostrar frame em ~1,4–1,5 s com `topic: realtime:bfr-school-content-live` e repintura da Home — roteiro `v69rt-ws.mjs`, aguardando OK porque escreve linhas. Reversão = devolver `ar-html-v69-live.html` (`52d8d4e7`) + `ar-assets-v69-live/sw-v4.js` (`c36e75de`).

**25/10 (continuação) — realtime por publication: item 57 fechado, psicologia provada e zero canais envenenados.** O teste vivo da v70 fechou o item 57 (`FRAME_70_OK` 18/18, §U). O recon V71 achou 7 canais envenenados no bundle v70 (assinatura a tabela fora de `supabase_realtime` mata o canal inteiro, #195) e dois DDLs aprovados pelo usuário os curaram: primeiro «Só psicologia» (`psychology_returns` + `psychology_referrals`, 54→56, §V.6), com **prova de frame real** em 25/10 07:26–08:05Z (`v71rt-teste.json` `FRAME_RETURNS_PROVADO_E_BASELINE_RESTAURADA`: binding 54609997, INSERT 338 ms, DELETE 1.424 ms, 0 quadros no controle negativo, baseline restaurada por contagem E md5, 0 vivas; **DELETE não é alcançável por papel de app** em `psychology_returns` — sem policy de DELETE); depois as 13 restantes (56→69, §V.8, `v71b-ddl-publicacao.json` `DDL_13_APLICADO_E_ZERO_CANAIS_ENVENENADOS`), zerando os envenenados: sararam `bfr-direction-visuals`, `bfr-coordination-command-live-v2`, `bfr-coordination-central-v2` (que antes não recebia **nem a portaria**, embora `gate_checkins` publicado) e `bfr-aee-operations` — nenhum desses módulos tem polling de reserva. **Resta não provado:** frame dos 4 canais exige contas sintéticas de director/coordinator/aee + escrita real (OK separado). **Nuance de produto:** publicar não entrega linha que o papel não lê — ficam mudos `grades` no canal da Direção (sem policy de director), `bfr_lesson_attendance` (exige `bfr_can_manage_lesson_attendance`) e `bfr_specialized_audit_log` no AEE. Rollbacks congelados nos §V.6/§V.8; desfazê-los reenvenena os canais.

**25/10 (continuação 2) — frame dos 4 canais PROVADO (ciclo V71C, §V.9).** O OK «executar a prova de frame dos 4 canais» foi cumprido sem deploy, sem DDL e sem tocar linha real: 3 contas sintéticas (`director`, `coordinator`, `aee`), fixture turma `V71C` + aluno + vínculo ativo em `aee_student_links`, socket cru por canal com as assinaturas reais. Resultado (`v71c-consolida.json` **`FRAME_4_CANAIS_PROVADO_E_BASELINE_RESTAURADA`**): join aceitou **5/6/8/15** bindings; controle negativo **0 quadros**; INSERT/DELETE entregues com `topic` do próprio canal e `ids` do binding certo — `attendance` `38659311` em direction/command/central (1.176–1.672 ms) e, no AEE, `aee_adaptations` `48633384` **+** `bfr_specialized_audit_log` `82024582` (697/1.354 ms); leitura REST pelo JWT do papel **200 · 1 linha** em todos. Limpeza `LIMPEZA_OK` (1 linha de auditoria), contas apagadas, manifesto podado (psychology 404 era entrada morta), baseline de 8 tabelas diff `[]`, 0 vivas. **Continua fora do medido:** os bindings não exercitados (`grades`, `bfr_lesson_attendance`, etc.) e repintura de DOM — a prova é de entrega de quadro.

## v74 PUBLICADA 25/10 23:41:33Z (OK «Sim, procede com a publicação do v74») — itens 76 e 72 FECHADOS no ar

Version `fe90fc36-3e03-4665-90db-f26019ce5356`, deployment `281d041a-535e-4dc0-9123-f67f88fac061`, 100% do tráfego. Dois hunks no `index.html`: **I76** (`@media (min-width:801px){#appShell.ready .sidebar > .bfr-legacy-nav{flex:0 0 auto}}`) e **I72** (alias `professor-agenda-hoje→professor-agenda`, `videos-aprender→aprender`, `coordenacao-chat→chat-interno` no `navigateToSection`). `/` 3.375.798 B md5 `4e48535243f859f4a5407d3ab2ae7f0f` (+395 B); rp **inalterado** `98a4aca768a49da3a47cbf0b3ed2211e`; SW `6c51fa6df30229d075b3df2df94e2900` CACHE v74 (1 linha).

**Medição antes/depois com as mesmas sessões** (`v74-antes.json` 23:38Z, ar v73 × `v74-depois.json` 23:45Z, ar v74), 1280/1440/390, contas `aee` + `coordinator`:
- **Item 76.** Antes: `.bfr-legacy-nav` h=0/clientH=0/scrollH=275, flex `0 1 auto`; linha AEE com caixa 41 px em y=869 mas `elementFromPoint` devolvia outro item; clique real sem efeito (`sec` ficou `inicio`) nas duas contas. Depois: nav h=275 (aee) / **315** (coordinator), flex `0 0 auto`; a sidebar do coordinator (`scrollH` 1649) rola 725 px até a linha, topo = a própria linha, clique real → `sec=aee`, `view=aee`, `aeeView` visível, crumb «Atendimento Educacional Especializado». **A prova de alcance é o coordinator** — para a conta `aee` o AEE já é a Home de boot.
- **Item 72.** Antes: `navigateToSection('coordenacao-chat')` devolvia `'true'` mas sec/persistida ficavam `coordenacao-chat` e o chat não aparecia. Depois: `chat-interno` nas três bandas, chat visível; controle positivo `chat-interno` funciona nas duas versões.

Ciclo limpo: 2 contas apagadas por id do manifesto (`delete auth HTTP 200`, 0 restantes, manifesto arquivado em `bfr-audit-contas-v74-mortas.json`), sem fixture, baseline de 30 tabelas por contagem **E** md5 `BASELINE_RESTAURADA`/`diffs:[]`/0 vivas. Prova HTTP (3/3, 12/12 assets idênticos) e Chrome limpo (cache única v74, regra do 76 provada no CSSOM) verdes. Detalhe: §AB da auditoria e `audit-publicacao-v74.json`. Seguem abertos: item 74 (decisão de produto) e D3/D6 do aluno — **D8 foi PUBLICADO como v75 em 26/10 04:46:35Z (`b4cec7fb…` +802 B, 6 hunks, A/B `D8_AB_OK` 216/0) e PROVADO VIVO em 26/10 05:40Z (`D8L_OK`, coordinator + sports_operator, §AG)** (ver [[bfr-d8-candidata]]); **D4 PUBLICADO como v76 em 26/10 06:15:25Z (`162e60f5…` −124 B, 2 hunks, reversa byte a byte, HTTP + Chrome limpo verdes) — §AI; o D4-b segue aberto.**

## V74R — ciclo residual 26/10 (OK «executar o ciclo de contas recomendado»): os «não provados» do §AB fechados, sem publicar

Ar inalterado (v74 `4e485352…`). 5 contas sintéticas, uma por papel, sem fixture; ciclo só de navegação e clique. Diário consolidado `v74r-consolida.json`, auditoria §AC.
- **Item 76** — clique real na linha AEE agora provado com `developer` e `director`, 1280 e 1440 (nav `flex:0 0 auto`, h=315/275, linha 41 px, rolagem real do scroller, `view` troca para `aee`, crumb e painel certos). 4/4 ok.
- **Item 72** — `secretary` verde nas três bandas inclusive recarga; `director` verde com **6/6** recargas em `chat-interno` (a leitura `inicio` da 1ª passada era meio do boot — armadilha #212); `parent` devolve `false` e fica em `inicio` (recusa honesta, papel não tem `chat-interno`). **`admin` não existe no enum `account_role`** (é view) — não mintável.
- **Item 70 residual** — chrome do `monitor` @390 medido **em produção**: barra montada em 10 ms com 5 itens, appbar 60 px, abridor 44×44 com hit, gaveta abre (7 entradas, `is-open`) e fecha (classe sai; CSS governa por `visibility` — armadilha #213). A 1ª sonda foi falso negativo por seletor inventado (`#bfrMobileMenuBtn`); o real é `[data-bfr-open-drawer]`. **Ampliado em 26/10 pelo I70L na v78 (6 boots @390, `I70L_LIVE_OK` — seção I70L no fim do ficheiro): 6/6 montam, 3 pelo teto da v72 sob fome de 60 ms. O `10 ms` daquele boot não é típico (60–836 ms).**
- Boots 1,7–4,2 s nos papéis staff e **~16,8 s no `parent` nas duas bandas** — **ATRIBUÍDO em 26/10 (§AD, ciclo BP): é uma ida-e-volta lenta do `SELECT` de `profiles` abaixo do teto de 15 s, não o papel** (`currentProfile` é atribuído em `index.html:10642` antes da consulta de vínculo em 10647; 8 boots novos do `parent` assentaram com `profile` em 0,51–1,91 s; atrasar o `profiles` em 14 s reproduz 14,6 s de boot, atrasar 20 s morre na mensagem de erro sem retry — `bp-lento-14000.json` / `bp-lento-20000.json`, ver [[bfr-boot-profile-timeout]]); 0 erros de console nos 10 contextos. Limpeza 5/5 HTTP 200, manifesto arquivado e zerado, baseline 30 tabelas `diffs:[]`, 0 vivas.

## v75 PUBLICADA 26/10 04:46:35Z (OK «ok») — D8 no ar, provado estaticamente

Version `0a47375c-db0b-41c9-8199-a38a97d8e0b7`, deployment `886062d5-9f28-496a-9661-bf9afa27ceab`, 100% do tráfego. Só o `index.html` mudou: 6 hunks do D8 (`open()` persiste a rota; o bloco forçado só age quando a rota ativa é jogos; fechar Fotos devolve o destaque a `inicio`; `init()` abre na rota persistida; a rota persistida reabre o painel por `roleSectionAccess`; `navButton()` preserva `.active`/`aria-current` contra o rewrite de 1,2 s do `syncNav()`). `/` 3.375.798 B `4e485352…` → **3.376.600 B `b4cec7fb…`** (+802 B); rp **inalterado** `98a4aca7…`; SW `6be41acd…` CACHE v75 (1 linha). Portões: preflight VERDE (ar == v74, snapshot 12 assets, reversão dos 6 hunks byte a byte), bundle VERDE (HTML == SRC, delta +802, módulos professor/chat/secretaria intocados, 9 marcas D8), HTTP 3/3 na 1ª tentativa e 12/12 assets, Chrome limpo (cache única v75, SW `activated` controlando, HTML/rp cacheados com os md5 certos, marcas v60–v75 e regra CSSOM do 76, login vivo 390/1440; únicos 404 são `/cdn-cgi/rum`). Diários `preflight-v75.json`, `confere-bundle-v75.json`, `prova-http-v75.json`, `prova-sw-v75.json`, `audit-publicacao-v75.json`, §AF. **Zero escrita de domínio no ciclo de publicação** (sem mint naquele momento); a **prova viva do D8 com `coordinator`/`sports_operator` reais foi feita em 26/10 05:38–05:40Z** (§AG): `D8L_OK`, 4 jobs, 0 erros, fotos em 3 instantes nas duas bandas, reload reabre jogos, operador 147 filhos; contas apagadas e baseline 30 tabelas `diffs:[]`, 0 vivas. Reversão = devolver `ar-html-v74-live.html` (`4e485352`) + `ar-assets-v74-live/sw-v4.js` (`6c51fa6d`, CACHE v74) com OK novo. Ver [[bfr-d8-candidata]].

## D4 residual do aluno (26/10) — ATRIBUÍDO, A/B verde e PUBLICADO como v76

Ordem «faz o d4 primeiro» e depois «Publicar a D4 agora (Recomendado)». O ar está na **v76** (deploy `ecf9da59-88a7-4736-bba9-e9c9d603f83e`, version `4a124dc8-cf94-4a25-9ca5-24d58e8d9328`, criado 26/10 06:15:25Z): `/` `162e60f5…`/3.376.476 B (−124 B, 2 linhas), SW `9a70db60…` CACHE v76, rp `98a4aca7…` intacto. Portões preflight/bundle/HTTP/Chrome limpo verdes (`audit-publicacao-v76.json`, §AI da auditoria). DDL, banco e mint: zero.

- **Causa.** O wrapper do `BFRStudentSpace.install()` (20129) intercepta `open('meu-espaco')` e chama o `open()` do aluno (20099), que marca `aria-current` só nos `[data-platform-area]` (20115) e **nunca chama `setAreaActive`** (13572). O `.active` anterior sobrevive (Início no boot; Jogos Escolares depois de abrir Jogos) e `syncNavigationA11y` (25887) reescreve o aria a partir dele. Reload é limpo: o defeito é de transição.
- **Candidata (agora v76).** `bfr-candidata-v75-d4/index.html` md5 `162e60f5ed04a6f4ffb957503f000d24`, 3.376.476 B (−124 B), 2 linhas: 13602 expõe `setAreaActive` no `window.BFRPlatform`; 20115 troca o `forEach` de aria por `bp?.setAreaActive?.('meu-espaco')`. rp `98a4aca7…` e sw `6be41acd…` byte-idênticos na candidata; diff só as 2 linhas.
- **A/B offline** 390/1280 (`mede-d4-ab-390/1280.json`, `analisa-d4-ab.mjs`): controle DIRETO `ativos=["inicio","inicio"]` e POS-JOGOS `["jogos-escolares","jogos-escolares"]`; candidata `["meu-espaco"]` nos dois; `ariaArea` migra de `inicio`/`jogos-escolares=page` para `meu-espaco=page`; varredura 19/19 com 0 divergência e 0 erro nas duas bandas; boot e reload idênticos.
- **Publicação (v76).** Preflight provou ar == v75 nos 3 md5 e a reversa byte a byte dos 2 hunks até `b4cec7fb`/`bfr-v75-src`; bundle embutiu o `162e60f5` com SW de 1 linha (`bfr-conecta-v76`) e 12/12 assets; 3 GETs de `/` deram `162e60f5`/3.376.476 B; Chrome limpo ficou com cache única `bfr-conecta-v76`, HTML cacheado `162e60f5`, rp `98a4aca7` e no DOM `d4a_expose=1`, `d4b_chamada=1`, âncoras antigas 0, além de todas as marcas v60–v75.
- **D4-b (pré-existente, não corrigido na v76).** `navigate('inicio')` depois de Meu Espaço deixa `studentView` **e** `platformSpaceView` visíveis (h=2144), `sec=meu-espaco`, crumb «Início»; `syncPlatformNavigation` (14955, tick de 500 ms) regrava a seção. O caminho do clique fica limpo **por acidente**: o `setHomeMode` (15237) do painel do responsável, disparado pelo listener global de clique (15242), esconde todo `.content` exceto `#parentView`. A rota escapa porque o hide do `navigateToSection` (10147-10148) não inclui `platformSpaceView`. **Candidata pronta em 26/10 (não publicada):** `bfr-candidata-d4b/index.html` `4c6bcd38…`/3.376.598 B (Δ+122, 1 linha — o hide-all de 10147 nomeia as 4 platform views, idioma de 9948), portão `d4b-candidata.json` verde (cada id +1; 97 blocos sintáticos; 13 assets). **A/B `mede-d4b-ab-390/1280.json` verde:** controle reproduz o empilhamento na rota `inicio` e no atalho `notas` do Meu Espaço (estável em 2,2 s e 3,5 s), candidata fica em `sec=inicio`/`sec=notas` com só `studentView` (espaço `hidden`, h=0); 4 áreas de plataforma idênticas; 19/19 rotas sem divergência nova; 0 erro nas duas bandas. Captura `d4b-empilhado-390-v76-controle.png` (hero em y=10566 abaixo do crumb «Notas»). **PUBLICADO na v77 (26/10 07:08:58Z, deploy `7cb4fd6c…`/version `08101297…`, §AL).** Os atalhos internos afetados são `notas/agenda/comunicados/jogos` (`data-student-route`).
- **Não provado:** conta real de aluno no ar (nenhum mint autorizado — o comportamento do D4 está provado na bancada offline), 320/768/1440 e revisão visual de pixel. O D4-b foi **publicado na v77** e o resíduo vizinho de `.active` atrasado virou o D4-c, também na v77 (§AL). Diários `probe-d4b-inicio-390.json`, `probe-d4b-quem-esconde-390.json`, `mede-d4b-ab-390/1280.json`; scripts `gera-candidata-v75-d4.mjs`, `mede-d4-ab.mjs`, `analisa-d4-ab.mjs`, `probe-d4b-quem-esconde.mjs`, `gera-candidata-d4b.mjs`, `mede-d4b-ab.mjs`; publicação em `audit-publicacao-v76.json` e `audit-publicacao-v77.json`; D4-b na auditoria §AJ.

## D4-c residual do aluno (26/10) — `.active` atrasado ao sair de «Meu Espaço» pelos atalhos: PUBLICADO como v77

Ordem «proximo» (não era OK de publicação) e depois o OK «ok» ao pacote D4-b + D4-c, publicado como **v77** em 26/10 07:08:58Z (deploy `7cb4fd6c-f506-4ca6-98ed-d2247b21a77b`, version `08101297-114c-4af1-8ddb-1f3e7c94cac1`, 100% do tráfego): o ar saiu de `162e60f5…`/3.376.476 B (v76) para **`ec053ab2…`/3.376.754 B** (+278 B) com SW `efb50baf` CACHE v77, rp `98a4aca7…` e 12/12 assets intactos. Nenhum mint, nenhuma linha de banco. Auditoria §AK (bancada) e §AL (publicação).

- **Sintoma.** Com o D4-b aplicado, os atalhos do painel (`notas/agenda/comunicados/jogos` via `data-student-route`) navegam (sec e crumb certos) mas o pill azul fica em `meu-espaco@plat`. No controle v76 fica mascarado (o atalho não navega e a seção também fica em `meu-espaco`). No 390 a tira `.nav-item` está oculta; a superfície visível é a `#bfrMobileBottomNav`, que pinta por `runtime.activeSection` (`bfr-responsive-presentation.js:132`).
- **Causa.** `BFRStudentSpace.route()` (20069) → `BFR_APP_RUNTIME.navigate` → `navigateToSection` não chama `syncActiveNavigation`/`persistNavigationState`; o clique da navegação (10207–10214) chama. O D4 (20115) só sincronizou o `aria-current` das áreas de plataforma.
- **Candidata.** `bfr-candidata-d4bc/index.html` **`ec053ab22bea4c467c12a7ddaaa6dd46`**, 3.376.754 B (Δ+156 vs D4-b) — D4-b (`4c6bcd38…`) + 1 hunk em `route()`: guarda o retorno de `navigate` e, se `true`, chama `syncActiveNavigation(section)` sob `typeof === 'function'`. Portão `d4bc-candidata.json` (âncora 1×, `syncActiveNavigation(section);` 4→5, 97 scripts OK, 13 assets). Não se toca em `navigateToSection` para não afetar o boot do `sports_operator` provado no D8L.
- **A/B 1280** (`mede-d4c-ab-1280.json`): controle 4 atalhos `sec=meu-espaco`/pill `meu-espaco@plat` (mascarado); D4-b **d4c 4/4** (`sec` certo, pill atrasado); D4-c **0/4** (`notas@legado`/`agenda@legado`/`comunicados@legado`/`jogos@legado`); «Início» clique/legado e 4 áreas de plataforma idênticos; `falhas: []`.
- **A/B 390 + barra** (`probe-d4c-barra-390.json`): `.nav-item` oculto em todas as pernas; na barra, controle fica **sem destaque** (`sec=meu-espaco`, `destacado=[]`), D4-b e D4-c destacam `agenda`/`jogos` corretamente — ou seja, quem conserta o 390 visível é o D4-b; o hunk D4-c é inerte nessa banda e não regride.
- **Fora do escopo / não provado.** O caminho programático (`inicioRuntime`/`notasRuntime`) continuava com pill atrasado na v77 (não foi hunk de publicação) — **corrigido e PUBLICADO na v78** (candidata `85665f53…`, +254 B, §AM/§AN). Sem conta real, sem revisão visual de pixel. O comportamento está provado na bancada offline (§AJ/§AK/§AM); no ar estão provados os bytes, as marcas D4-b/D4-c/D4-d no DOM da cache do SW, o CSSOM do item 76 e o login público 390/1440 (`prova-sw-v77.json`/`prova-sw-v78.json`, §AL/§AN). Reversão = devolver `ar-html-v76-live.html` (`162e60f5`) + `ar-assets-v76-live/sw-v4.js` (`9a70db60`, CACHE v76) com OK novo; da v78, devolver `ec053ab2…`/3.376.754 B + SW `efb50baf` CACHE v77.

## D4-d residual do aluno (26/10) — o pill nos paths de runtime: PUBLICADO como v78

OK «Ok, libera a publicação da v78» sobre o pedido anterior «corrigir o resíduo do pill nos paths de runtime»; publicado em 26/10 16:38:58Z (deploy `1276d501-58a9-4671-abbe-c2ff42303b74`, version `06ac9553-7e01-47c3-895d-1e216e421c0e`, 100% do tráfego): o ar saiu de `ec053ab2…`/3.376.754 B (v77) para **`85665f53…`/3.377.008 B** (+254 B) com SW `dddb2ef3` CACHE v78, rp `98a4aca7…` e 12/12 assets intactos. A publicação não tocou no banco nem mintou conta; a **prova viva veio depois** (OK «vai de prova viva com conta sintética»): `D4D_LIVE_OK` com um `student` real, §AO. Auditoria §AM (bancada), §AN (publicação) e §AO (prova viva).

- **Causa.** `BFR_APP_RUNTIME.navigate`/`.syncNavigation` (16139–16140) são `section => navigateToSection(section)`. O `navigateToSection` persiste a seção, mas só ramos especiais chamam `syncActiveNavigation`; quem pinta `.active`/`aria-current` em toda navegação aceita é o handler de clique (10220–10221). Chamada direta do runtime fica com o destaque anterior — o resíduo que a D4-c não cobriu (ela só tocou `BFRStudentSpace.route()`, 20069).
- **Candidata.** `bfr-candidata-d4d/index.html` **`85665f534fbd7f24d91827b3f33d2bcc`**, 3.377.008 B (**Δ+254**, 2 linhas, 127 cada): `navigate` e `syncNavigation` viram `{ const ok = navigateToSection(section); if (ok === true && typeof syncActiveNavigation === 'function') syncActiveNavigation(activeSection); return ok; }`. Usa `activeSection` (seção efetiva pós-persist — cobre o alias `videos-aprender→aprender` e o `open()` dos jogos que persiste `jogos-escolares`), nunca a `section` crua; gate `ok === true` = padrão D4-c (navegação recusada não pinta). `navigateToSection` intocado → boot do `sports_operator` do D8L preservado. Só o `index.html` difere do SRC (`diff -rq`); SW, rp e 12 assets byte-idênticos.
- **Portão.** `d4d-candidata.json` (md5+tamanho == v77, âncoras 1×/antigas 0×/novas 1×, `syncActiveNavigation(activeSection)` 0→2, linha D4-c 1→1, `function navigateToSection` 1→1, 97 blocos `node --check` OK) e `d4d-reversa.json` (reversa devolve `ec053ab2`/3.376.754 B byte a byte).
- **A/B 1280/390** (`mede-d4d-ab-1280/390.json`, `d4d-ab.json`): braços `v77-controle` (8285) × `d4d-candidata` (8286), harness offline, 0 escrita. Mesmo «antes» (Meu Espaço, `meu-espaco@plat`) e as 5 chamadas retornando `"true"`. No 1280 o controle fica `sec=inicio/notas/agenda` com pill `meu-espaco@plat` (d4d em `inicioRuntime`/`notasRuntime`/`agendaRuntime`/`inicioSync`, estável em 2,4 s e 3,8 s) e a candidata coincide nas cinco (`inicio@plat`/`notas@legado`/`agenda@legado`). No 390 a tira está oculta: o controle mantém o pill velho **no DOM** (`coincide:false`, mascarado — a barra pinta por `runtime.activeSection`) e a candidata fecha `coincide:true`. `aliasVideos` idêntico nos dois. Regressão verde nas duas bandas: cliques `inicioClique`/`inicioLegado`/`atalhoNotas`, 4 áreas de plataforma, clique legado depois de runtime; boot `gate:true`, `syncActiveNavigation` global, **0 erro de console**. **`D4D_AB_OK` 8/8, 0 falha.**
- **A/B 1440/1024/1920/768/320** (`mede-d4d-ab-{1440,1024,1920,768,320}.json`, ordem «fazer testes das resoluções não validadas» + «roda as bandas 1024 e 1920»): o analisador virou band-agnóstico (`node analisa-d4d-ab.mjs [bandas...]`, padrão 7 bandas; diário ausente é falha) e o split fixo de 1000 px virou «controle tem de ter `coincide:false` + pill `meu-espaco@` e defeito **visível** (`d4d:true`) **ou mascarado**». No 1440, 1024 e 1920 o controle reproduz o defeito visível nas 4 rotas e a candidata coincide; no 768 e no 320 a sidebar está oculta (a tira some abaixo de 801 px) — o controle mantém o pill velho só no DOM, `aria-current="page"` incluído (`mascarado:true`), e a barra pinta por `activeSection`, então o D4-d ali é defeito de **estado/acessibilidade**, não de pixel; a candidata fecha `coincide:true` nas cinco. Regressão verde nas cinco bandas; **`D4D_AB_OK` consolidado 28 leituras (7 bandas × 4 rotas), 0 falha**; 0 listener residual em 8285/8286/9385/9386 (só `TIME_WAIT`); ar segue v77.
- **Publicação (v78).** Preflight provou ar == v77 nos 3 md5 e a reversa byte a byte dos 2 hunks até `ec053ab2`/`bfr-v77-src` (`preflight-v78.json`); SRC trocou só a linha do `CACHE` (SW `dddb2ef3`, 3.585 B); bundle embutiu `85665f53`/3.377.008 B com `html_dif_bytes_do_ar = 254`, módulos intactos (professor `0cb4cfac`, chat `b8af7715`, secretaria `8b7a9bbb`) e 12/12 assets (`confere-bundle-v78.json`); `wrangler deploy` OK (`06ac9553`); 3 GETs de `/` deram `85665f53`/3.377.008 B, SW `dddb2ef3` e rp `98a4aca7` (`prova-http-v78.json`); Chrome limpo ficou com cache única `bfr-conecta-v78`, HTML cacheado `85665f53`, `d4d_novo=2`/`d4d_nave_antigo=0`/`d4d_sync_antigo=0`/`d4d_fn=1`/`d4d_sync_active=2`, todas as marcas v60–v77 preservadas, CSSOM do item 76 e login público 1440/390 verdes, 0 erro fora do RUM (`prova-sw-v78.json`); diário `audit-publicacao-v78.json` **4/4 portões verdes**, §AN. Honestidade: `/sw-v4.js` sai `hit:false` na cache (o SW não se precacheia) — igual à v77, não é regressão.
- **Prova viva (26/10, §AO, `D4D_LIVE_OK`).** Com OK «vai de prova viva com conta sintética»: `student` sintético `4a4e3a9c…` (sem fixture), versão provada por bytes+md5+`caches.keys()` (**`bfr-conecta-v78`**) e marcas (`ok === true` 2, `syncActiveNavigation(activeSection)` 2) — `navigate.toString()` **não** serve, os wrappers de ocorrências/módulo sobrescrevem o método. Boot real nas duas bandas (1280: 1.819 ms; 390: 1.780 ms), 0 erro. Runtime **5/5 por banda** (`inicio`, `notas`, `agenda`, alias `videos-aprender→aprender`, `syncNavigation`), `coincide` em 2,4 s **e** 3,8 s, `d4d:false`; plataforma 4/4; `legadoDepoisRuntime` termina em `agenda` coincidente. **Ressalva:** os cliques das bandas saíram `programatico` (hit-test `acerta:false` @1280, `oculto` @390) — os controles provam o handler, não o toque; os casos de runtime não dependem de clique. `atalhoNotas` **não medido** (`SEM-ELEMENTO`: a conta não tem linha em `students`, logo não há `[data-student-route]`). @390 tudo `mascarado` (tira oculta) — prova de DOM, **não** da barra de baixo. Conta apagada (auth HTTP 200, 0 linhas), manifesto arquivado e `[]`, baseline de **30 tabelas** idêntica por contagem **e** md5 (`diffs: []`), 0 vivas antes/depois, artefatos locais apagados após decodificar o dono.
- **Não provado.** Os outros consumidores do runtime (chat, fotos, comunicação, `wrapRuntime` da Direção, `open()` do Portal) herdam o atalho mas não foram medidos (harness é só do aluno); toque real nos controles (ver a ressalva da prova viva); barra de baixo @390; bandas 320/768/1440/1920 e pixel. No log de cada braço `legadoDepoisRuntime` sai `null` por um `?.a24` no resumo (helper corrigido depois); o valor está no JSON — `coincide:true` nos dois.
- **Reversão da v78.** Devolver `ar-html-v77-live.html` (`ec053ab2`, 3.376.754 B) + `ar-assets-v77-live/sw-v4.js` (`efb50baf`, CACHE v77) com OK novo; o rp não muda.
- **Diários/scripts.** `d4d-candidata.json`, `d4d-reversa.json`, `mede-d4d-ab-{1280,390,1440,1024,1920,768,320}.json` (+ logs), `d4d-ab.json`; `gera-candidata-d4d.mjs`, `d4d-reversa.mjs`, `mede-d4d-ab.mjs`, `analisa-d4d-ab.mjs`; publicação `preflight-v78.json`, `prepara-src-v78*`, `monta-worker-v78.json`, `confere-bundle-v78.json`, `prova-http-v78.json`, `prova-sw-v78.json`, `le-deploys-v78.json`, `audit-publicacao-v78.json`.

## I70L (26/10) — item 70 provado vivo na v78: 6/6 boots, 3 deles salvos pelo teto da v72

Ciclo só de medição (OK «Prova viva do item 70»), ar inalterado na **v78** (`85665f53`/3.377.008 B, rp `98a4aca7`, SW `dddb2ef3` cache v78, deploy `1276d501…`): baseline de 30 tabelas → `monitor` sintético (`94e2e9f3-…`, sem fixture) → 6 boots @390×844 + 1 controle @1280×900 → limpeza → baseline restaurada. Veredicto `I70L_LIVE_OK` (17 critérios, `falhas: []`), auditoria §AP.

- **A pergunta do §AC era se a rede de montagem da v72 salvava um boot de produção.** Agora está respondido com pilha, não com inferência: em **3 dos 6** boots a barra nasceu de `pintaSozinho (:682)` — o ramo do TETO de 250 ms — com o debounce de 60 ms **faminto** (`setTimeout` do rp: 104 criados / 103 limpos / **0 disparados** num boot; 120/… e 131/… nos outros); nos **3** restantes nasceu de `dispara (:670)` (timer vivo). Instrumento: setter de `Element.prototype.id` em document-start capturando `new Error().stack` da 1ª atribuição de `bfrMobileBottomNav`, mais contagem de timers de 60 ms cujo stack cita o rp.
- **Chrome 6/6 por boot:** barra única e visível com **5 itens** (72 px), appbar 60 px, abridor `[data-bfr-open-drawer]` **44×44** com hit-test no próprio botão, gaveta abre e fecha (classe `is-open` entra/sai; a visibilidade é governada por `visibility`, armadilha #213), «Mais» abre, barra estável por 3 s. Ready→barra: **80/84/226/241/244/836 ms**; boot #1 é a primeira carga (barra visível só aos 3.414 ms) — não citar o 836 como típico.
- **Controle 1280:** sidebar íntegra (236/51), **0 erro**. `apresentacao:""` e `bfr-web-sidebar:false` ali são pré-existentes e coerentes: o mesmo churn também impede o `sync()` no desktop (a barra web é a estática do HTML) e o hunk é inerte em `!mobile.matches`. Não é regressão do item 70 e não foi tratado neste ciclo.
- **Custo honesto:** 0 erro de console nos 7 contextos; 1 screenshot, sem revisão de pixel; só 390×844 e 1280×900; conta sem linha em `students`/`guardian_students`. O achado positivo é a **fome real em produção** — o emissor do churn segue não identificado, e a v72 continua sendo rede de montagem, não cura da fonte.
- **Limpeza:** presença 0/0, `profiles` antes `[{"role":"monitor"}]`, **auth DELETE HTTP 200**, 0 linhas restantes, manifesto arquivado e `[]`, baseline de 30 tabelas `diffs: []` por contagem **e** md5, artefatos locais apagados após decodificar o `sub`. **Ar e banco inalterados** além da conta e da remoção.
- **Diários/scripts:** `i70l-pre.json`/`i70l-pre.mjs`, `i70l-medida.json` (+ `i70l-medida-r1-churn-invalido.json`, corrida arquivada: censo em `documentElement` = 0), `i70l-mede.mjs`, `i70l-prova-rp.json`, `i70l-pos.json`, `i70l-confere-baseline.json`/`.mjs`, `i70l-limpa-presenca.mjs`, `i70l-arquiva-manifesto.mjs`, `i70l-limpa-artefatos.mjs`/`i70l-limpeza-artefatos.json`, `i70l-contas-arquivo.json`, `i70l-consolida.json`/`i70l-consolida.mjs`, `i70l-390-boot1.png`.

## Não reabrir (parece pendência e não é) — residuais do §AC

Migrado de `bfr-parent-boot-lento.md` em 29/10 (higiene de índice): aquele ficheiro tratava do boot de ~16,8 s do `parent`, hoje atribuído a latência com dose-resposta provada — ver [[bfr-boot-profile-timeout]]. O bloco abaixo é de **fila de telas** e vive aqui.

- **Item 76 a 320/768:** a regra é `min-width:801`, inaplicável por desenho naquela banda. Não é defeito medido, é o instrumento a perguntar numa largura onde a regra não existe.
- **Item 72:** rotas `professor-agenda-hoje`/`videos-aprender` e chrome do `monitor` em banda desktop — paridade do mesmo alias/chrome, sem defeito. O alias em si foi fechado na v74 ([[bfr-item72-candidata]]).
- **Fila real aberta:** item 74 (ATRIBUÍDO na v95 em 30/10, §BW: **7 rotas — 6 de menu + `escola-historia` —, não 8**, porque `videos-aprender` virou alias no v74; `notas`/`boletim` miram `.overview-grid` em vez de `[data-student-report]`, `agenda` abre Projetos em vez de eventos, `comunicados` pinta 1 de 5, `horarios`/`jogos` são painéis da Home — **opção (a) PUBLICADA na v96 em 30/10 02:25Z (§BY): `/` `f60ce150…`/3.439.692 B, SW `1099c241…` CACHE v96, deployment `493433ea…`/version `de54279b…`; `notas`/`boletim` → Boletim Escolar, `agenda` → Próximos eventos, `comunicados` → os 5 avisos, CSS 90/130 px; 5 hunks, bancada offline 19/19 no §BX, portão do cliente verde**; `horarios`/`jogos` seguem painéis da Home e `escola-historia` foi REMOVIDA na v105 (§DF); **o assentamento do clique — o resto do item 74 aberto no §BZ — foi FECHADO na v100 em 30/10 13:17Z (§CK): prova viva 23/23 (390: 127–130 px, 1280: 90 px), #80 e `inicio` intactos, ar `2bbeb79c…`/3.456.942 B, SW `c38a6bc0…` CACHE v100, worker `c7fd872d…`, deployment `ed75ae23…`; `escola-historia` foi REMOVIDA na v105 (§DF)**), item 77 (produto: no censo §CE de 30/10 sobraram 1 `childList` sob `#monitorView` em 6/6 e 1 `class` no toast em 3/6, **atribuídos estaticamente no §CF em 30/10** — o `childList` é o `list.innerHTML` incondicional de `renderGateAlerts()` sobre `[data-gate-alert-list]` (tique de 5 s do painel da portaria, ancorado em `10187` antes do `.ready` em `10647`), e a `class` é o `remove('is-visible')` de 2,6 s do `showToast` disparado por `boot()→syncAchievements()` do `bfr-platform-shell`; ambos **sem pilha**, por escritor único + forma da etiqueta + fase. A guarda de valor do painel **PUBLICADA na v99 em 30/10 08:00Z (§CH: `/` `fd830f35…`/3.455.192 B, SW `115124996a…` CACHE v99, deployment `676ae943…`)**, e o **censo vivo pós-v99 RODADO em 30/10 (§CI, `CENSO_V99_OK`, conta `monitor` sintética, 6/6 boots @390 + controle @1280): `childList` sob `#monitorView` e sob `[data-gate-alert-list]`/painel **0/6 no repouso e 0/6 no tique**, com o tique de 5 s provadamente executando (1 rodada, 1 `fetch` de `gate_entry_alerts`, lista `len` 267/hash −529625934 inalterados) — contra 6/6 no §CE; repouso cai de 9 para 6 mutações/3 s e a composição vira `attributes:class` puro**. O que sobra do item 77 é **só o toast** (`class` 6/6, medido, **não tocado por decisão de produto**) e a **fome dos 60 ms** (0–3 disparados de 93–100), que não é curada por guarda. Em repouso o debounce **não** está faminto (`limposAntes` 0 na janela em 6/6); os antigos `ensure()` 1,8 s e observer do clima mediram 0 escrita no repouso na bancada §CC com fixture vazia) e D6/D7 do aluno — **decisão de produto, não medição pendente** (a atribuição por bytes da §CY foi **substituída por prova de paint no §DK, 03/11**: D6 = 1 superfície viva e 2 de conteúdo fixo, D7 = derivação vencedora por superfície; a C85 foi **PUBLICADA como v107** em 03/11 02:08Z (§DL) e fechou o inventado da Escola/dock/Aprender; a C86 foi **PUBLICADA como v108** em 03/11 03:07Z (§DN) e fechou o nome do dock/Espaço (item 86); a CE foi **PUBLICADA como v109** em 03/11 04:25:41Z (§DP) e fechou o painel apagado do item 91 na frente do cliente — ver os parágrafos finais deste ficheiro) (o D3 residual, item 84, saiu dessa lista: a remoção `4d03c882…` foi **PUBLICADA na v105** em 02/11/2026 20:27Z (§DF, 6/6 portões; 69/69 + bancada `I84_BANCADA_OK` 14/14 no §DE)). **V96L (30/10, §BZ) mediu a v96 no ar com sessão real de aluno e fechou a dúvida do item 74:** runtime **4/4** nas duas bandas (90/130 px, seção e crumb certos); clique **0/8** porque o handler `.nav-item` (index.html:10226-10235) faz `scrollIntoView` com o alvo ainda `display:none` (home mode) **e** termina em `window.scrollTo({top:0,'instant'})` (index.html:10229), que zera o scroller interno — provado A 670→0 × B 670→670 × C 670→4.780. Conserto é no handler, atinge todos os papéis, precisa de OK próprio; **não reabrir o item 74(a)** — o conserto do clique (as duas causas do §BZ) foi **PUBLICADO na v100** e provado vivo 23/23 no §CK. F.3-`inicio` ficou com falso negativo de censo (`.welcome` × `[data-student-today]`), artefato não re-rodado. D8 foi fechado na v75; o **item 81** (modal de família: a lista reabria e disparava RPC extra depois da escolha) foi **FECHADO na v93** — `/` `d00d8abb…`/3.434.312 B, SW `7ec3226f…` cache `bfr-conecta-v93`, `PROVA_HTTP_V93_OK` e `PORTÃO DO CLIENTE v93: VERDE`; rito e não-provados em §BO de `auditoria-bfr-conecta.md`.

**D6 e D7 do aluno medidos por PAINT (03/11, §DK, conta `student` sintética no ar v106, `D67_BANCADA_OK` 7/7; nada publicado neste ciclo — a C85 saiu na vaga seguinte, §DL):** a atribuição que a §CY fazia por leitura de bytes passou a ter prova de tela nas duas bandas + boot de fallback. **D6:** das 3 superfícies de conteúdo fixo, **1 é viva e 2 são inventadas permanentes** — a Home é VIVA (swap 1279/527/1087 ms, todas as leituras HTTP 200 com `n:1`, aviso do banco pinta), a **Escola + dock** é conteúdo fixo (tela 3 × banco 1; agenda 5 × banco 0) e o **Aprender** é conteúdo fixo (Atividades 03, Trilhas 01, XP 120 na tela × `state.xp` 180, Conquistas 1); a ausência de rede dessas duas não é inferida da janela de amostra, é provada **no código**: o bloco platform (`ar-v106-live-558ec30e.html:13807-13860`) não tem uma chamada de rede. **D7:** a derivação vencedora é **por superfície**, não por conta — sidebar/welcome/greeting usam `profiles.display_name_custom` (A1) ou caem no local do e-mail (A4); o dock usa o 1º token de `profiles.full_name` (A2) ou «Família BFR» (A3); o hero e o nome do Espaço usam sempre `students.official_name` (A5). O mesmo aluno vê **3 nomes diferentes na mesma tela**, e o cartão de perfil do Espaço (`espaco_profile_card`) saiu `null` nos 3 boots porque `renderSpace` é pintor perdedor (o painel é reescrito por @20375). Correção da §CY: **dois** escritores do `#bfrHomeDock h2` (@10598 e o `renderHomeDock` de @13849) e `syncAccountIdentity` (@10592-10601) só roda dentro de `savePreferredName` (@10617), nunca no boot. **Achado novo = item 91:** no mobile o Meu Espaço mostra o painel de erro **por cima de um painel já carregado** (`:20375 if (state.error) host.innerHTML = …`) e o `load()` (@20305) não tem guarda de voo — 3 voos de @20312 observados num boot; o lançador do `catch` de @20334 ficou **NÃO ATRIBUÍDO** (armadilha 363). **Candidatas (base sempre `558ec30e…`, linhagem reversa verde):** C85 `5e7cc19b0d79382c56e9f9d7bbe5848c`/3.458.927 B Δ+1.393 B (8 hunks) para o item 85 — **PUBLICADA como v107** em 03/11 02:08Z (§DL abaixo); C86 re-gerada sobre a v107 (§DM, 03/11): `ab8023e72f36e31becd0a0ee0a014b20`/3.459.228 B Δ+301 B (K1/K2, linhagem reversa OK) com bancada `I86_BANCADA_OK` 3/3 para o 86 — **PUBLICADA como v108** em 03/11 03:07Z (§DN abaixo) — e a CE (re-gerada sobre a v108 em §DO → `edd0232eff8ebfa67242b1a38307e061`/3.459.408 B, Δ+180 B, E1/E2/E3) para o 91 foi **PUBLICADA como v109** em 03/11 04:25:41Z (§DP). O que **não** foi provado: escrita no banco, clique real nas rotas do Aprender (foi alcançado por `BFRPlatform.open` programático), releitura dos braços depois do UPDATE do boot B (eco do mint — armadilha 369). Ver [[bfr-area-aluno-analise]], [[bfr-contas-sinteticas-auditoria]] e armadilhas 360–369 em [[bfr-audit-rig-traps]].

**C85 PUBLICADA como v107 (03/11 02:08Z, §DL, OK «publica C85») — item 85 fechado na frente do inventado:** o ar passou de `558ec30e…`/3.457.534 B para **`5e7cc19b0d79382c56e9f9d7bbe5848c`/3.458.927 B (Δ +1.393 B, 8 hunks H1–H8)**, SW **`e54d1bdead41761874de7a78a2eb9d3f`**/5.990 B com `const CACHE='bfr-conecta-v107'` (exatamente 1 linha diferente do ar), worker **`c169e7c765c862ed2d94206f27ede314`**/3.527.855 B (+1.395) sobre a base v106 `097dad8f…`/3.526.460, **RPJS `2e16513bd85d2bb22c53edc55893cb53`/54.688 B intacto** (Front A preservado) e os 12 assets públicos byte-iguais ao snapshot do ar; deployment **`ca907a89-87ef-42c5-aed2-b8da344b38a3`** / version **`cc151761-6acc-43ee-b474-f506dafdcb61`**, 100 % do tráfego, criado `2026-11-03T02:08:18.419947Z` (`Total Upload: 3435.62 KiB / gzip: 763.92 KiB`, `Read 12 files`, 0 assets novos; wrangler 4.154.0). **6/6 portões** em `audit-publicacao-v107.json` (preflight, bundle, bancada `D67_BANCADA_OK` 7/7, deploy, HTTP, cliente) com a bancada conferindo por md5 que mediu os MESMOS arquivos publicados, linhagem nos dois sentidos (ar + 8 hunks == embutido e a reversão do embutido == ar byte a byte) e ΣΔ == +1.393. **O que mudou no conteúdo:** `let announcements=[]` e `let events=[]` passam de 0 a 1, `loadSchoolContent` + a guarda de voo + o `window.BFR_SUPABASE_CLIENT||…BFR_APP_RUNTIME?.client` + o disparo no boot vão de 0 a 1, as duas `select` de `announcements`/`school_events` sobem (4→5 e 1→2) com `eq('status','published')` 1→2, as 4 frases de estado vazio e as 2 repinturas (Escola e dock, via `doc.remove(); renderHomeDock()`) entram, e o inventado sai: `Biblioteca ganhou novos livros`, `Mostra cultural` e `Avaliação de Matemática` caem de 1 a 0. Guardas herdadas verdes: 26 marcas v98–v103, os 10 textos do item 87 a 1× com os 2 literais contraditórios a 0× (medidos de novo no portão e no cliente), `gateLegacyMode()` 22×, contadores do item 84 (`escola-historia` 0, `setupProjects()` 3), 4 pintores inalterados; `node --check`: 98 scripts inline + RPJS, 0 falhas. Prova de Chrome limpo `PORTÃO DO CLIENTE v107: VERDE` — cache única `bfr-conecta-v107`, HTML cacheado `5e7cc19b…` e rp `2e16513b…`, as duas bandas com login vivo, 0 respostas ≥ 400 e os 5 erros de console todos `tipo:"rede"`. **Não provado (registrado no diário):** nenhum censo vivo autenticado do carregador novo (a prova no ar mede os bytes que o cliente recebe; o comportamento veio da bancada offline com oráculo injetado de 1 anúncio e 0 eventos); o churn (+2 leituras por voo e +1 mutação de DOM por boot) e a fome dos 60 ms do item 77 não foram re-medidos; o early-return do `renderHomeDock` fica depois do `doc.remove()`; e do D6 **sobram abertos** o XP/Trilhas/Atividades/Conquistas do Aprender (a C85 zerou só os arrays de avisos/eventos) e a Home com `return` silencioso em `@9392` quando a leitura dá erro. **Reversão = republicar `worker-deploy-v106`** (o CACHE volta a v106), exige OK novo; na vaga seguinte a C86 saiu como v108 (§DN) e só a CE continua pronta e não publicada.

**C86 PUBLICADA como v108 (03/11 03:07Z, §DN, OK «publica C86») — item 86 fechado na frente do nome:** o ar passou de `5e7cc19b…`/3.458.927 B para **`ab8023e72f36e31becd0a0ee0a014b20`/3.459.228 B (Δ +301 B, 2 hunks K1/K2)**, SW **`5c52f93816ea500cc50547e96ba2eea7`**/5.990 B com `const CACHE='bfr-conecta-v108'` (exatamente 1 linha diferente do ar), worker **`c769efbf63f4fa7ae8bc267f5718a77e`**/3.528.157 B (+302) sobre a base v107 `c169e7c7…`/3.527.855, **RPJS `2e16513bd85d2bb22c53edc55893cb53`/54.688 B intacto** (Front A preservado); deployment **`560e09c3-eb1e-45c9-bde3-e7fc62095a8d`** / version **`81345f0e-7f4b-4e13-8a29-951abce3127b`**, 100 % do tráfego, criado `2026-11-03T03:07:40Z` (`Total Upload: 3435.91 KiB / gzip: 764.02 KiB`, `Read 12 files`, 0 assets novos; wrangler 4.154.0). **6/6 portões** em `audit-publicacao-v108.json` (preflight, bundle, bancada, deploy, HTTP, cliente — `todos: true`) com linhagem nos dois sentidos sobre a v107 e ΣΔ == +301. **O que mudou no conteúdo:** K1 troca `firstName=()=>String(profile()?.full_name||'Família BFR').split(/\s+/)[0]` pela cadeia `displayName()` (`display_name_custom` → `full_name` → `user_metadata.full_name`/`name` → local do e-mail → «pessoa») com `firstName=()=>displayName()`; K2 faz o `renderSpace` usar `displayName()` em vez do `full_name` cru. `'Família BFR'` no HTML cai de 4 para 2 (os 2 restantes são legítimos). Bancada offline **`I86_BANCADA_OK` 3/3** (§DM): B1/B2 com as duas superfícies byte-iguais ao ar v107 e B3 com a candidata igual ao oráculo do shell nos 5 braços (A1 ANINHA, A2 ANA, A4 auditoria-d67-aluno, A6 Beta, A3/7 «pessoa») contra o controle que erra 4/5. Prova de Chrome limpo **`PORTÃO DO CLIENTE v108: VERDE`** — cache única `bfr-conecta-v108`, as duas bandas com login vivo, marcas `display_name` 1 / `nome_display_name` 1 / `first_name_antigo` 0 / `nome_antigo` 0, guardas do item 85 (9 chaves exatas), item 87, `gateLegacyMode()` 22× e contadores do item 84 intactos, 0 respostas ≥ 400 e os 4 erros de console todos `tipo:"rede"` (`/cdn-cgi/rum`). **Armadilha nova do ciclo:** o `offset_base` do gerador é medido na **string em evolução e em unidades UTF-16** — o Δ UTF-16 de K1 é **+325**, não +324, porque a `busca` contém `í` (1 unidade / 2 bytes) e a `troca` é ASCII pura; a checagem ingênua por `indexOf` deu `FALHOU: offset de K2 divergente: 1687816 vs 1687491`. **Não provado:** censo vivo autenticado do nome (a prova mede os bytes recebidos pelo cliente; os braços vieram da bancada), `display_name_custom` não tem escritor no fluxo de boot (`savePreferredName` continua teórico) e o hero/Espaço A5 (`students.official_name`) ficou **fora por decisão de escopo** — a unificação global segue item próprio; churn 0 (nada de rede novo). **Reversão = republicar `worker-deploy-v107`**, exige OK novo; a **CE (item 91, painel de erro por cima do Meu Espaço carregado) foi re-gerada sobre a v108 como `edd0232e…` e PUBLICADA na vaga seguinte (§DP)**.

**CE PUBLICADA como v109 (03/11 04:25:41Z, §DP, OK «publica CE») — item 91 FECHADO na frente do cliente:** o ar passou de `ab8023e7…`/3.459.228 B para **`edd0232eff8ebfa67242b1a38307e061`/3.459.408 B (Δ +180 B, 3 hunks E1/E2/E3)**, SW **`57f31a7019275eedf693f30801b8a4e0`**/5.990 B com `const CACHE='bfr-conecta-v109'` (exatamente 1 linha diferente), worker **`633364146bb9fde43deabd27b0c43fdc`**/3.528.338 B (+181) sobre a base v108 `c769efbf…`/3.528.157, **RPJS `2e16513b…`/54.688 B, FCM `fcfa8720…` e manifest `68d15518…` intactos** (Front A preservado), 12 assets byte-iguais e 0 novos; deployment **`e5eaf5ad-98ee-48f0-a112-0c9aee145ece`** / version **`75ae143d-c14b-47f7-a439-763885d6a2c2`** a 100 % (wrangler 4.154.0, 3.436,09 KiB / gzip 764,08 KiB). O que muda no `BFRStudentSpace` (script 27.718 → 27.898 chars): **E1** `if (state.loading) return;` no topo de `load()` — o voo fantasma (3 chamadas de `guardian_students?…limit=2` por boot) deixa de se sobrepor; **E2** o pintor deixa de ser incondicional (`if (state.error)` → `if (state.error && (!state.loaded || !state.linked))`) — um painel já carregado não é mais apagado por um erro tardio; **E3** `partialMsg` escapado por `esc()`. Contadores ar→embutido: guarda **0→1**, `(!state.loaded || !state.linked)` **1→2**, `partialMsg` **0→3**, pintor incondicional **2→1**, `state.loading = false; render();` **8→8**. **Armadilha 370 de novo:** o offset do E2 é **2.374.671 no diário da candidata** e **2.374.784 no portão** — os +113 são o E3, que o portão aplica antes de medir; e o E3 é **170 bytes contra 168 unidades UTF-16**. **Portões 6/6** (`audit-publicacao-v109.json`, `todos_os_portoes:true`): `PORTÃO V109: VERDE` (21 probes, 8 invariantes ar == embutido com `from('guardian_students')` 10, 4 pintores, 26 marcas v98–v103 + 10 textos do 87 + `gateLegacyMode()` 22, itens 84/85, inventados 0, SW 1 linha, 98 scripts inline com `node --check` e 0 falha), **`PROVA HTTP V109: VERDE`** (`/` byte a byte a candidata, as 6 chaves do item 91 em **1/1/1/3/1/1**) e **`PORTÃO DO CLIENTE v109: VERDE`** (Chrome limpo porta 9439, cache única `bfr-conecta-v109`, HTML cacheado `edd0232e…`, **`expectativa_item91.derivado == assumido`**, RPJS Front A 1/0/1, bandas 390/1440, 4 erros todos `tipo:"rede"`, 0 ≥400). **Bancada `I91_BANCADA_OK` 9/9** (`ce-bancada.json`, ciclo CE-3): B1 voo fantasma com erro tardio, B2 os 3 voos de um boot por assinatura de query, B3 pintor com painel carregado, B4 negativos sem regressão, B5 banner parcial inalterado, B6 escape, **B7 a guarda não é cadeado — `load(true)` continua forçando**, B8 caminho feliz **byte idêntico** (4.139 chars nos dois braços), I invariantes. **Não provado:** censo vivo autenticado com conta `student` (**não rodado**; exige OK próprio); o **chamador** dos 3 voos segue no ar — a guarda impede a sobreposição, não o desperdício; o **lançador do `catch` @20334** segue sem atribuição (a bancada o força por roteiro); o `partialMsg` nunca foi produzido no ar; churn não re-medido. Banco intocado: nenhum DDL, nenhuma escrita, nenhuma conta. **Reversão = republicar `worker-deploy-v108`** (`c769efbf…`, SW `5c52f938…`, HTML `ab8023e7…`), exige OK novo.


**Censo vivo autenticado do item 91 RODADO na v109 (03/11 06:00Z, §DQ, conta `student` sintética, `I91L_CENSO_OK` 46/46 + `BASELINE_RESTAURADA`; nada publicado, nenhum DDL):** as três arestas que a §DP deixou abertas **fecharam por pilha no ar**, com o HTML medido conferido por md5 contra `audit-publicacao-v109.json` (`edd0232e…`). **(a) O chamador** dos voos é **produto**: bloco 79 `bfr-student-today` (estado `adiado`, corpo_abs 22636) — `refresh()` **@22763** `if (space()?.load) await space().load(true);` ← `sync()` **@22781** ← `boot()` **@22802** ← `boot()` de topo **@22808**, e o `boot()` é reacendido 3× (`bfr:app-ready` @22805, `MutationObserver` @22806, `setInterval(…,1200)` @22807). **A E1 barra o voo, não o chamador**: em 3/3 braços há 3 chegadas por tick e `delta_E1:1` — o desperdício teórico continua, o voo não. **(b) Segundo chamador** = shell do app, `guardianStudentLinksState` dentro de `withAuthTimeout` **@10859** com `Promise.race` **@10945** (bloco 17) — presente em NAT390/FORCADOS/TENTAR e **ausente em NAT1280** (registrado, não atribuído). **(c) Voos por braço** 2 / 3 / 9 / 5 e **cada um classificado**: produto = 1 via `bfr-student-today` em todos os 4 braços; shell = 1 em 3; botão = 2 no TENTAR; o resto é quadro de instrumento (6 expressões `avaliar` de uma linha + o espião `cli.from (<anonymous>:58:26)` ↔ linha 96 do rig). **(d) O lançador do `catch` foi atribuído** — @20339 no `load()`, provado por **lançamento síncrono forçado** em `school_events` (381 ms, painel, `linked:true`/`loaded:false`); as hipóteses da §DK sobre `rows()`/`loadPhoto()` **refutadas**. **(e) O pintor @20378 é não-destrutivo no ar**: hero persiste, painel 4.301 chars + banner de +81 B, `itens:1`/`metricas:4`, ficha `TI91 ALUNO CINCO` nos 3 braços. **(f) `Tentar novamente` provado por clique real**: botão 967×33 `dentro_erro:true`, +1 voo com pilha pelo handler **@20409**, painel continua em erro com a falha ligada e **recupera em 416 ms** (`loaded`/`linked` `true`) com ela desligada. **(g) O teto de 30 s do `tentouEm` (@22759) nunca foi alcançado** — máx Δ medido **4.023 ms**. **(h) `partialMsg` não é produzível para `student`**: as 11 leituras do oráculo deram **200** e `rows_negadas: []`. **Limpeza**: ordem FK-safe `guardian_students → students → classes → profiles → DELETE /auth/v1/admin/users/<UID>`, 4 DELETEs × 1 linha, auth 200, sobras todas 0 e `vivas:1` (só a conta-aparelho `19bc8c0e…`), baseline pós == pré por **md5 + contagem + censo de ids** nas 7 tabelas + vínculos + comunicados + eventos (`diffs 0`), manifesto 2→1, sessão removida. **Do item 91 não sobra nada aberto**; o que fica fora é o chamador multiplexado (produto: 3 reacensões do `boot()`) e a fome dos 60 ms do item 77. Ver [[bfr-area-aluno-analise]], [[bfr-contas-sinteticas-auditoria]] e armadilhas 374–378 em [[bfr-audit-rig-traps]].

**Item 77 — 3/11, §DR: a frente do TETO existe como candidata medida, a fome continua (nada publicado).**
Bancada offline sobre os bytes do ar v109 (rp `2e16513bd85d2bb22c53edc55893cb53`/54.688 B, HTML
`edd0232eff8ebfa67242b1a38307e061`/3.459.408 B — cópias locais congeladas, produção não re-baixada), duas bandas,
churn de classe a 10 ms, veredito **`aprovado: true` / 60 portões / `falhas: 0`** (`i77-bancada-passada3.json`
`cf89a782cd13ae4542111e02a8731cc8`/111.982 B). Candidata `17fef579100cdb3eee6613a515ff6e39`/52.979 B (Δ **−1.709 B**):
C1 tira `paintHighlight()`, C2 troca `pintaSozinho` por `noTeto = () => { timer = null; desde = Date.now(); sync(); }`
— **sem o predicado `semBarra` e sem o teto de 3 remontagens** —, C3 renomeia a chamada; G1–G5 verdes, reversão byte
a byte. Achados: o ar repara **só** `barra @390` (7 drifts sem conserto, e no `cap` chega a `barra=false, itens=0`
tendo gasto as tentativas) × a candidata repara **7/7**; escrevividade **0** nos dois braços (repouso, 4,2 s de churn,
20 despachos de `bfr:app-ready`); custo **253 quadros em 4/4 braços**, longtask 0/0, `sync()` mediano 0,9–1,1 ms;
**`t60` …/…/0 nos quatro braços** — a candidata não toca o timer, logo o item 77 segue **ABERTO pela fome dos 60 ms**.
As passadas 1–2 ficaram vermelhas em 10 portões de exceção por **premissa falsa do instrumento** (armadilha 379:
`cdp.eventos` cumulativo entre testes/braços/bandas, eventos sem `sessionId`, `slice` antes da classificação) —
corrigido, não afrouxado. **Não medido:** censo vivo com conta sintética, churn real de boot autenticado, telas com
dados, regressão de painéis de conteúdo. **Publicar exige OK novo**; o ar segue v109.

**Item 77 — estado em 03/11 depois da re-verificação (nada publicado).** O bundle `worker-deploy-v110/` da candidata do TETO foi **re-medido a partir dos arquivos** por um conferidor independente (`i77-conferir-v110-disco.mjs`, md5 `12bb662ef19005d2c72a1e488cf9b0eb`) com **42/42 portões verdes** (`V110_DISCO_OK`), e um preflight vivo (`i77-preflight-vivo-v110.mjs`, md5 `17e21acbaf12a39851d2ed3b6a3d5d7b`) baixou as 5 rotas com `cache: 'no-store'`: HTML/SW/rp/FCM/manifest **todos md5-iguais ao v109** → `AR_AINDA_V109_OK`, ou seja a base de linhagem da candidata não se moveu e **nada foi publicado por fora**; o rp vivo ainda tem `pintaSozinho=2` / `noTeto=0`. Diário `i77-reverifica-v110.json` (md5 `ad3f1e03d014fc00db76ed73d9ba8818`, `publicado:false`), com logs, na auditoria §DS.

**Duas premissas falsas de instrumento, corrigidas antes do verde.** (1) O gate do delta lia `prepara.rp.delta_vs_ar`, que não existe — o campo é `prepara.rp.candidata.delta_vs_ar` (−1.709 B); o gate deu VERMELHO com `esperado=undefined`, e a sonda provou que a culpa era o caminho do campo, não os bytes. (2) A contagem de linhas da casa (679/707) desconta o `\n` final: `split('\n').length` cru devolve 680/708 porque os dois arquivos terminam em `);\n` e a cauda vazia entra como linha. Terceiro achado do mesmo tipo: dois gates comparam o diário contra o próprio diário — não eram medições — e foram re-apontados para leitura de disco. Vale armadilha 378: conserta-se o instrumento, nunca o predicado.

**Capturas separadas de propósito.** As baixações desta rodada foram gravadas em `ar-v110-conferencia-*` **novos** em vez de sobrescrever os `ar-v110-atual*` citados na §DS — armadilha 380 ao contrário: nome de snapshot não é conteúdo, e um `atual` já citado não pode virar outra medição. A hostname do preflight foi **comparada por código** com a string extraída do `prepara-src-v110.mjs` antes da primeira requisição (armadilha da grafia `turmarobiticabfr`).

**A decisão pendente FOI TOMADA.** Em 03/11 12:32Z a usuária escreveu **`publica v110`** e a candidata foi ao ar (parágrafo §DU abaixo). **Nada mais está autorizado por aquele comando:** o censo vivo (`roda censo monitor`, que escreve banco) continua pedindo OK próprio, e a **fome dos 60 ms continua ABERTA** — a v110 repara o teto, não o timer.

**Item 77 — 03/11, §DT: a regressão de painéis de conteúdo (o único NÃO PROVADO local da candidata do teto) está MEDIDA e é favorável; a fome dos 60 ms continua e o item segue ABERTO.** Bancada nova `i77-bancada-paneis.mjs` com classificador por dono do nó, triagem real × redundante e contador de `sync()` pelo `toggleAttribute` sem guarda — 16 execuções, `PANEIS_CONSOLIDADO_OK` 54/54, `falhas: []`, `jsN=0` em 16/16: 11 syncs extras por janela custam **0 escritas de painel**, **~1:1 de quadros** (180–182) com **longtask 0/0**, o estado da pessoa sobrevive e o painel novo é decorado **uma vez** sob churn onde o ar não o alcança. Fome re-medida: `t60` 0 disparados em 12/12 janelas de churn. Naquela passada **nada foi publicado** — o bundle v110 (`4e7b5ab3…`/3.528.338 B, rp `17fef579…`) saiu do disco às 12:32Z sob `publica v110`; o censo vivo segue pedindo mint + OK próprio. Ver [[bfr-mobile-menu-mutation-starvation]] para os números da bancada e armadilhas 382–383 em [[bfr-audit-rig-traps]].

**Item 77 — 03/11 12:32Z, §DU: a frente do TETO está PUBLICADA como v110 e provada no ar; o ITEM 77 CONTINUA ABERTO pela fome dos 60 ms.** Sobe **um** asset (`bfr-responsive-presentation.js` `2e16513b…`/54.688 → `17fef579…`/52.979, Δ −1.709 B): o `noTeto` chama o `sync()` inteiro e caem o predicado `semBarra` e o teto de 3 remontagens. O **HTML continua `edd0232e…`/3.459.408 B** — byte a byte o da v109 — com as 6 marcas do 91, as 20 herdadas (incl. `gateLegacyMode()` 22), os 10 textos do 87 e os 3 textos inventados em 0 todos reproduzidos; SW `f947d7aa…`/5.990 B com `CACHE='bfr-conecta-v110'` (1× v110 / 0× v109), worker `4e7b5ab3…`/3.528.338 B (mesmos bytes do v109, md5 novo), version `f5040a4b-a24d-40af-a8d7-19c2c5f53068` a 100 %, deployment `97389de2-1b02-4ab1-b47b-69616ce5b6e4`. Três níveis de prova: tráfego lido, HTTP 5/5 e Chrome limpo (`PORTÃO DO CLIENTE v110: VERDE`: cache única v110 com HTML e rp byte a byte, **Front A da v104 vivo** dentro da candidata, 12 marcas do rp na cache e no ar, 0 divergências de DOM contra o diário da v109, 103 scripts inline, login com modais de privacidade e horários funcionando em 1440 e 390, 0 erro de console fora do `/cdn-cgi/rum`). Consolidação **`V110_PUBLICADA_OK` 44 portões / 6 categorias / 0 vermelhos** (`audit-publicacao-v110.json`). **NÃO PROVADO:** censo vivo autenticado do churn na v110, dados reais, papéis com chrome diferente, banda web com barra oculta, custo em aparelho. Reversão = republicar `worker-deploy-v109` (`63336414…`, SW `57f31a70…`, rp `2e16513b…`) e **exige OK novo**. Armadilhas novas do ciclo em [[bfr-audit-rig-traps]] (384–387). **Re-conferência 03/11 15:58:34Z (`RECONFERE_AR_V110_OK`, somente-leitura):** as 5 rotas seguem byte a byte as da publicação (rp `17fef579100cdb3eee6613a515ff6e39`/52.979 B, html `edd0232e…`/3.459.408 B, sw `f947d7aa…`/5.990 B, fcm `fcfa8720…`/2.403 B, manifest `68d15518…`/484 B, todos 200) e as 8 marcas do rp servido batem com o esperado, com `PISO = 60, TETO = 250` ainda 1× — **o ar da v110 está no lugar e nada muda o veredito: o item 77 segue ABERTO só pela fome dos 60 ms.** Instrumento lê as buscas do próprio `prova-http-v110.mjs` no disco; diário `reconfere-ar-v110.json` `0289bb7994749655fc193ac666157189`/3.246 B, parágrafo na §DU.


**Item 77 — 03/11 17h, §DV: a fome dos 60 ms medida até o fim; o item segue ABERTO só por ela e NADA publicado (`FOME_60MS_ATRIBUIDA_OK`, investigação somente-leitura).** A régua é o rp do ar: `reconfere-ar-v110-rp.bin` md5 `17fef579100cdb3eee6613a515ff6e39`/52.979 B, pareado por ficheiro→md5 contra `prova-http-v110.json` (armadilha 387), com `PISO = 60, TETO = 250` lidos por parse da linha 656 e o observer na 677 do corpo servido. **Bancada offline: 12/12 braços de churn com `disparados = 0`** (agendados 309–338, limpos 308–337, identidade A = L + D + 1 nos 12), vazio médio **12,4–13,6 ms contra um PISO de 60 ms**; com chegadas a cada 10 ms o intervalo livre nunca existe, e um modelo de Poisson com a mesma média ainda preveria ~3,7 disparos — a fome é estrutural, não azar. Custo sob churn: 325–354 registros por braço (todos de `class`, `childList` 0, rp 0), 252–254 quadros, `longtask` 0, `sync()` inteiro mediano 0,8–1,7 ms com **0 escritas de rp**. **Quem pinta hoje é só o teto**: `montou_pelo_teto 6` × `montou_pelo_timer 0` e chrome visível 126–244 ms após o ready; o controle @1280 pinta porque o evento chama `sync()` direto (+1 ms). **O emissor é um só**: um `MutationObserver` sobre o `document.body` inteiro filtrado por `class` (linha 677), `setInterval` 0, `disconnect` 0. Fora do churn o debounce funciona como foi desenhado (repouso 1 agendado / 0 limpos / 1 disparo, alvo `div#bfr-platform-toast`) e o repouso foi ficando quieto censo a censo (11–21 → 3–13 → 1–2 → 1 registro por 3 s), então a fome é **de fase**, não estado permanente. **Três caminhos de desenho identificados e NENHUM adotado** (estreitar o observer; throttle com deadline fixo; aceitar o teto de 250 ms como contrato de defasagem) — escolha da pessoa, não deste ciclo. **NÃO PROVADO:** censo vivo autenticado na v110 (exige mint + OK), se algum caminho elimina a fome, custo em aparelho real, cadência fora do boot com dados reais. Reversão: nada a reverter. Registo após os quatro apêndices da §DV (medição, adendo de conferência, errata da armadilha 389, fecho de artefactos): `auditoria-bfr-conecta.md` md5 `7fb222ecb4c270e705da3bb146379449`/1.473.684 B, apendice-only provado por prefixo nos 1.454.977, 1.467.674, 1.470.253 e 1.472.060 B anteriores; o fecho lista os scripts posteriores ao adendo e os quatro ficheiros de memória tocados. Armadilha nova do ciclo em [[bfr-audit-rig-traps]] (389). Duas auto-correcções da própria §DV, ambas por apêndice no registo: o número era 388 (tomado) e virou 389; e o hash deste ficheiro no fecho de artefactos era da passada anterior (`a76bbf71…`/291.711 B), corrigido na errata do fecho. **Md5 vigente do registo: `071e74b1c0524e72eb6438a7564e9ffc`/1.509.347 B** (relido do disco por este instrumento; passou de `6e58d25c…`/1.507.775 B para este valor por duas corrigendas de transcrição, cada uma provada por md5 das duas metades) (a §DV teve oito apêndices; o ciclo §DX acrescentou **dois** textos ao registo e eles passam a ser o nono e o décimo — a cláusula da seção F do item 77, inserida a meio com as duas metades provadas, e o apêndice §DX no fim do ficheiro. Nada mais foi escrito no registo por esta passada, que só toca nas memórias; os números acima foram lidos do disco por este script, nunca transcritos) — o `7fb222ec…`/1.473.684 B citado acima é o estado de uma passada anterior e fica citado de propósito, porque é a evidência da errata. **Regra de parada da recursão (armadilha 386/390):** cada fecho mede os ficheiros que existem naquele instante e nenhum hash alheio é re-medido depois; quando um apêndice muda um ficheiro já listado, o caso é tratado como errata com prefixo provado, nunca como reescrita, e a linha passa a citar o md5 vigente aqui. Parar é parte do método — continuar a correr atrás do próprio hash é a armadilha. **Declaração 390:** esta linha é a única fonte do md5 vigente do registo; ao corrigi-la, este ficheiro deixa de bater com o `2ba1618c…`/292.849 B que o fecho final lista para ele, e isso é o esperado do método, não um erro a perseguir — o `MEMORY.md` listado no mesmo fecho (`926cf8ae…`/17.590 B) também deixou de bater, quando o gancho das armadilhas passou de 390 para 391: os hashes de memória gravados no fecho final valem como o estado do instante em que o fecho escreveu, nunca como ponteiro vivo — a única fonte do md5 vigente do registo é a frase acima, que é reescrita por instrumento a partir do disco.

**Item 77 — 03/11, apêndice 8 da §DV: o caminho (a) do timer está atribuído sobre os bytes da v110 e NADA publicado (`CAMINHO_A_ATRIBUIDO_OK`, somente-leitura).** O read-set do `sync()` é **34 leituras** (corpo l615..649, fecho prof.2 por 6 funções; `app`/`role` não resolveram, por isso é piso). Dos **628** escritórios de `class` do HTML vivo, **425 FORA / 201 DENTRO / 2 INDET** — heurística de nome, armadilha 392. Os quatro emissores declarados pela V77A caem **todos fora**: toast 2/2, monitor 1/1, clima 10/10, FAB 1/1 → afunilar o observador silencia as re-arms deles. **Preço medido: 30 escrituras na raiz** (`documentElement` 20 + `body` 10), das quais 15 de `auth-restoring` em fase de arranque e 3 que mudam o que o `sync()` pinta (`bfr-exec-lia-minimized`, `bfr-coordination-active`, `bfr-gatekeeper-active`). **Não fecha a escolha**: a pergunta é distributiva (dos 3.218 `mutBoot` da V104L, quantos caem nos 34 nós?) e nenhum diário tem decomposição por alvo — só censo vivo autenticado com sonda por nó, que exige mint + OK. Item 77 **ABERTO** só pelo desenho do timer; (b) e (c) seguem sem medição.


**Item 77 — 03/11, §DX: os três braços afunilados estão construídos e medidos na bancada offline sobre os bytes da v110, NADA publicado (`I77A_BANCADA_OK`, 42/42 @390 + 35/35 @1280, 0 falhas, `jsN`=0 em 44/44 corridas).** A fome dos 60 ms **cura-se**: churn de 3 s com `ar` a `sinc=11, t60=255/254/0` (nunca dispara) contra `a1c`/`a1b`/`a2` a `sinc=1, t60=1/0/1`; `painelReais=0`, quadros 180–182, estado da pessoa intacto, `execHash` final igual ar↔afunilados nas duas bandas. **A previsão «painel nascido fora não é decorado» caiu** — decorado nos 4 braços porque `vigiar()` mora dentro do `sync()` (rp:649) — armadilha 396. **O preço medido é a descendência:** o `.dot` do appbar (escrito por `BFRNotificationState.sync()` em `ar-v110-atual.html:11446`/`:18631`) fica com `t60.agendados=0` nos três afunilados e converge por timer pré-armado (40–44 ms) ou pelo teto (137–140 ms), contra 45 ms do ar; o `a1b` perde também o **ancestral** (`agendados=0`, 164/137 ms) — prova comportamental do duplo `observe()`, armadilha 393. **`a1c` é o braço que cura sem regredir a cascata; `a2` paga +1 sync por painel nascido; `a1b` desqualificado.** Falta cobrir o dot (desenho novo, medição própria), falta censo vivo autenticado (mint + OK), (b)/(c) sem medição. Item 77 **ABERTO** só pelo desenho do timer; ar segue **v110**.

**Item 77 — 03/11 21:09Z, §DY: o afunilamento `a1c` está PUBLICADO como v111; a fome dos 60 ms **cura-se na bancada** e o item continua ABERTO porque a prova viva autenticada ainda não foi rodada (`V111_PUBLICADA_OK`, 209 portões / 6 categorias / 0 vermelhos).** Ordem imperativa: **`publica v111`** — só o asset `bfr-responsive-presentation.js` (`17fef579…`/52.979 → `4223b164…`/56.467, +3.488 B em 2 blocos, 679→741 linhas), SW `9b8a71d7…` com `CACHE = 'bfr-conecta-v111'` (`linhas_fora_sw_mudadas 0`), **HTML `edd0232e…`/3.459.408 B byte a byte o da v110**, worker `adbe32f4…`/3.528.338 B (mesmo comprimento da base v110, md5 novo), version `6384a54c…` a 100 %, deployment `b44a22e1…`. O que o braço faz: `unir()` agrega as famílias de opções por nó num `Map` e emite **um** `observe()` por nó, e `vigiar()` passou a ser recalculado **dentro** do `sync()`; `a1b` ficou de fora pela armadilha **393** (o segundo `observe()` substitui as opções → perdeu o ancestral, `agendados = 0` em 4/4), `a2` não resolve o nascimento tardio. **Bancada (42/42 @390 + 35/35 @1280, 0 falhas):** churn `t60 255/254/0`→`1/0/1` com `sinc 11→1`, idêntico na banda web (252/251/0→1/0/1), `longtask 0`, 181 quadros. **Preço declarado antes de subir:** a descendência do `.dot` — caso `dot_on` a 390, ar 45 ms com 2 timers agendados × `a1c` **140 ms com agendados 0, disparados 0** (o repinte passa a vir do teto de 250 ms); o caso `cascata` só existe a 390, a banda 1280 não tem. **Prova do cliente (32 HTTP + 18 Chrome):** as marcas do braço são **predicados sobre os bytes servidos** (armadilha **395**) — `sites_observe 1`, `new MutationObserver 1`, `const vigiar` 1, `ANCESTRAIS` 1, contador na linha 639, `pintaSozinho`/`paintHighlight` **0** — com `caches.keys() = ["bfr-conecta-v111"]` a provar que o bump pegou, e **0 erros de app no console** (a única mensagem é o `POST /cdn-cgi/rum` 404 do beacon da Cloudflare, provado pré-existente por mtime contra `preflight-v111.json`). **NÃO PROVADO à data desta secção:** censo vivo autenticado na v111 (mint + OK próprios) — **FOI RODADO duas horas depois, no §DZ logo abaixo**, o preço do `.dot` é **aceite, não eliminado** ((b) prazo fixo / (c) teto como contrato seguem sem medição), aparelho real, as 12 rotas autenticadas. Banco: **nada** — sem DDL, RPC, grant ou linha escrita neste ciclo. Reversão = `worker-deploy-v110` + OK novo. Ver [[bfr-mobile-menu-mutation-starvation]] e [[bfr-publicacao-worker]].

**Item 77 — 03/11 23:00Z, §DZ: o censo vivo autenticado FOI RODADO no ar v111 (`V111L_CENSO_OK` + `CENSO_A1C_OK`); o mecanismo está provado na rua e o item passa a depender só de produto.** Ordem imperativa **`roda o censo V111L`**: preflight → baseline por contagem **e** md5 (30 tabelas) → **uma** conta `monitor 7c7ea30a-ffe7-4b07-ba50-145dc94e258c` → 6 boots @390×844 + controle @1280×900 → censo por nó → limpeza FK-safe → `BASELINE_RESTAURADA`. **Validade 6/6 à primeira, 0 inválidos**, barra única e visível com 5 itens em 6/6. **Censo do rp: 35 `observe()` / 13 nós / 1 instância / 0 repetições na mesma geração / 0 `subtree` na raiz / 2 gerações / 4 nós entraram depois do boot / 0 decorados no app-ready / `erroWrap null`** — o `a1c` faz na rua o que a bancada mediu; controle @1280 `31/11/1/0 repetições/2 tardios`. **Fome curada na rua:** boot `agendados [102,103,…]→[73,79,76,75,79,75]` e `disparados [4,4,3,3,3,4]→[1,1,0,1,1,1]`, **repouso e tick `0/0/0` em 6/6** (a v104 re-armava 1 nesses ciclos); montagem `sync direto 6/6` com **`teto 0`** (v104: 6 — armadilha 400: `outro` e `sync_direto` sobrepõem-se, não somam); churn de boot `[96,93,131,130,136,127]` vs `[102,136,135,144,142,153]`; boot `[2149,1730,1645,1613,1758,1776]` ms (controle 1862), `ready→barra [250,174,236,251,177,242]`; console `[2,4,6,8,10,12]`+14 todos `rede`, a mesma assinatura do censo da v104. **O preço continua e está confirmado vivo:** `#bfrMobileBottomNav` **coberto por si**; `#notificationBtn .dot`, `[data-gate-alert-panel]`, `[data-gate-alert-list]`, `#bfrBusPresencePanel` = `alvoExiste true, coberto false` → os ~137–140 ms do `.dot` sem timer pré-armado são o regime real, não bancada. **Ar intocado:** `iguais_ao_pre true`, HTML `edd0232e…`/3.459.408 B, SW `9b8a71d7…`/5.990 B, rp `4223b164…`/56.467 B, as 9 marcas ≡ pré em 6/6 e no controle. **Limpeza:** DELETE com HTTP 200 e `0/0/0` restantes, sobrevive de propósito a conta-aparelho `parent 19bc8c0e-5b1c-4e73-a765-80ea58911315`, 30 tabelas `diffs []` → `BASELINE_RESTAURADA`. **Item 77 — o que resta é PRODUTO, não instrumento:** cobrir os descendentes do `.dot`, e escolher (b) prazo fixo com deadline ou (c) teto de 250 ms como contrato (o ~140 ms de bancada é o que (b)/(c) teriam de cobrir; não quantificado no ar). Armadilhas novas deste ciclo, todas no instrumento: **398–401** em [[bfr-audit-rig-traps]]. Reversão do braço continua `worker-deploy-v110` (`4e7b5ab3…`) + **OK novo**.

**Estado do item 77 depois do §EA (memória):** a opção **(c) — teto de 250 ms como contrato — foi ESCOLHIDA** (ordem «vai com o teto de 250 ms como contrato», 04/11) e é **decisão de desenho, não autorização de publicação**. O §EA provou nos bytes servidos que **a v111 não cumpre esse contrato sozinha**: `TETO = 250` (rp:657) só é avaliado dentro de `schedule()` (rp:661-667), chamado pelo read-set, por evento ou no arranque — escrita fora do read-set não arma prazo (medido: 0 pinturas em 4 amostras com allowlist, 4 timeouts, 0 syncs, `la_nunca_armou: true`). Cumprir ≤250 ms **exige publicar um braço**: **h1** = geral, max 233 ms, 0 estouradas, mas **12 sync por 3 s de repouso**; **h3** = só o `updateIdentity()`, max 169 ms, **zero syncs**; **h2** dominado pelo caminho (arma o PISO em 4/4 com o mesmo custo). Re-atribuído: os ~140 ms da §DX eram a **cadência do laço de 150 ms da identidade**, não o teto do rp. Duas previsões refutadas e registadas (armadilha **402**); rig verde **48/48** às 00:29:00.878Z. Ar intocado e re-conferido por HTTP (**AR_INTEGRAL**, rp `4223b164…`/56.467 B). Candidatas em disco com reversão byte a byte: h1 `52f62a22…`/57.068 B, h2 `53889be3…`/56.668 B, h3 `b52434a4…`/56.769 B. **Registo:** `## EA.` na linha 7198 + cláusula do 77 (linha 1839) acrescida só no fim (+1.081 B); régua do estado **depois** = md5 `5a431aa3b7d6c938333580344b5a870c` / 1.548.682 B / 7.223 linhas (antes: `5ed978a3…` / 1.534.366 / 7.196). **Resta: escolher h1 × h3 e publicar com bundle + OK novos.**

**Ciclo §EA aceite 04/11 com um «ok» pelado — e o «ok» não autoriza nada.** A resposta ao relatório do §EA foi apenas `ok`, que nesta casa aceita e arquiva: o registo fica como está, o ar fica **v111**, e a escolha do braço (h1 geral × h3 estreito), o bundle e o deploy continuam **sem autorização**. **How to apply:** depois de um «ok» destes, o agente não avança para o passo seguinte de publicação nem reabre medição; a única coisa que reabre é um imperativo novo com o braço nomeado.

**§EB (04/11) — o braço foi nomeado («prepara o bundle do h3») e o bundle está pronto, gateado e NÃO publicado.** Escolha = `h3` (o pulso só roda `updateIdentity()`: max 169 ms, 0 estouradas, zero syncs em repouso). Feito localmente: worker `dd7abbbbf7a25e32af8e037f847ac046`/3.528.338 B, SW `e9cf3c3f…` com `CACHE = 'bfr-conecta-v112'`, rp `b52434a40d4bc6f1ad8c5a6d2c54e266`/56.769 B (+302 B), HTML/FCM/cauda intactos da v111, uma só linha do worker mudada (linha 2), reversão byte a byte ao rp do ar; 304 portões na cadeia, 0 falhas, `publicacao.publicada = false` em todos os diários. Registo: `auditoria-bfr-conecta.md` com §EB escrita por aplicador de prefixo — `5a431aa3…`/1.548.682 B/7.223 linhas → `1cdbadf8c873ad551a6afea5efd890f7`/1.554.354 B/7.250 linhas (secções 128 → 129). **O item 77 continua aberto**: falta o deploy (wrangler 4.154.0, **OK novo**) e a prova no ar — HTTP + Chrome limpo + censo vivo do pulso — para dizer que o teto de 250 ms é contrato cumprido na rua.

**§EB.1 (04/11)** não muda esse estado: a cadeia da v112 foi reproduzida do zero e é determinística (304 portões verdes sobre leitura fresca do ar; 28/28 ficheiros idênticos por md5 caminho a caminho), o preflight verde de 55 portões está restaurado em disco, e o registo ganhou a cláusula §EB.1 (`1cdbadf8…`/1.554.354 → `1826b50670022c31f37a8238fe1d196f`/1.557.911 B, secções 129 → 130). Ar segue **v111**; o bundle `worker-deploy-v112` está pronto e `publicada:false`.

**§EB.2 (04/11)** — a régua pós-deploy está escrita e **ensaiada contra o ar vivo**, e o estado do item 77 não muda: `i77-43-prova-http-v112.mjs v111 ensaio` devolveu `REGUA_HTTP_V111_OK` — **74 portões, 0 falhas em 15 rotas** (os 12 assets de `public/` por quatro pernas; HTML/SW/FCM pela perna do literal decodificado do `worker.mjs`, armadilha **405**), com o rp servido `4223b164…`, HTML `edd0232e…`, SW `9b8a71d7…`, `CACHE bfr-conecta-v111` e o marcador do braço `updateIdentity(), TETO` = **0** no ar. Em modo `v112` a mesma régua fecha **73** portões e exige antes `npx wrangler deployments status --json > deployments-status-v112.json`. Registo no `auditoria-bfr-conecta.md`: `1826b506…`/1.557.911 B/7.268 linhas → `cf79e3d545d7f8738e7bc141e5cb2368`/1.563.591 B/7.296 linhas (secções 130 → 131), escrito por aplicador com portão de prefixo. **Ar continua v111, intocado; `worker-deploy-v112` verde nos 304 portões e `publicada:false`.** O que falta para fechar o 77 já não é instrumento, é passo: deploy (wrangler 4.154.0) → esta régua em modo `v112` → Chrome limpo → censo vivo do pulso ≤ 250 ms — todos **só com OK novo**, e o censo precisa de OK próprio porque mintar conta sintética escreve no banco.

## §EC (04/11) — o ar passou a ser a v112; o item 77 continua aberto, mas agora só por falta de censo vivo

- Ar medido depois do §EC: **v112** (rp b52434a4…/56.769 B, worker dd7abbbb…/3.528.338 B, HTML edd0232e…/3.459.408 B intacto, SW e9cf3c3f… CACHE bfr-conecta-v112, version fe23ae56… a 100 %, deployment 08fd2ee1…). Provas: HTTP 73 portões/15 rotas, Chrome limpo 38, consolidado 21/21. Reversão = worker-deploy-v111, exige OK novo.
- **Aberto (77)** — o desenho publicado mudou: braço h3, com o teto de 250 ms como contrato cumprido em BANCADA (máximo 169 ms, zero pinturas fora do prazo, zero sync em 3 s de repouso, i77-41-contrato-teto-p4.json 48/48). O que falta NÃO é o braço, é a prova no ar: o pulso ≤250 ms em sessão autenticada na v112 ainda não foi medido — o censo minta conta e escreve no banco e por isso exige OK novo.
- **Aberto (91, produto)** — o chamador multiplexado: 3 reacensões do boot(); inalterado pela v112.
- Fechados até ao §EC: 70/74/78/80/81/82/83/77A/79/79(ii)/84/85/86/87(a)/91 (frente do cliente).


## Atualização de 04/11 (19:30Z) — item 77: o §EE mediu o serviço do pulso e a latência dominante passou a ser do carregador

Substitui a última linha de «Aberto (77)」 logo acima: a prova no ar do pulso ≤250 ms **foi rodada duas vezes** — §ED (censo de custo, 04/11 17:09Z, `V112L_CENSO_OK`) e §EE (censo de serviço com dados reais, 04/11 17:50–18:45Z, 29 portões verdes / 0 falhas, `BASELINE_RESTAURADA`). Estado medido:

- **O pulso é escritor** na única transição mensurável: `.dot` → espelho do appbar em **40 ms** com 1 disparo no vão (espelho 1 ms depois do disparo). Nos outros 5 boots o unread já existe e o escritor é a mesma tarefa/read-set ⇒ o pulso não é necessário ao boot.
- **O painel da portaria repinta 2.598 ms após o INSERT pelo canal dele** (`gate_entry_alerts`, 17 cargas, gap mediano 4.991 ms), sem o pulso no caminho.
- **A latência que o utilizador vê é do carregador**: `INSERT→growth 28.112 ms`, com a causa do flip (`school_notification_reads`) a terminar 2 ms antes do growth e a repetir-se a cada 57.016 ms. Os 250 ms não são o gargalo.
- **Continua produto, e agora com argumento medido contra o alargamento**: dar prazo por tempo aos três nós fora do read-set (painel, lista da portaria, transporte) não compra latência; o que o prazo garante é pintura sem mutação.
- Não provado, declarado: o ar não foi re-lido no fim do ciclo (só o banco — `pos` do ar em falta); painéis povoados com dados reais (a fixture escreve 1 linha por tabela, `nFilhos 3`); `.dot` com resolução de 40 ms em 5/6 boots; aparelho real; papéis com chrome diferente (censo `monitor`); as 12 rotas autenticadas; `sync()` continua sem contador nos bytes servidos.
- Réguas do registo: `auditoria-bfr-conecta.md` pré `47973b6be230696fd6d2e74e62425ef5`/1.590.625 B → final `93e9b57cd921660b4792cdd6d510abca`/1.605.956 B, 134 secções (diário `ee-registro.json`).

Fechados até ao §EE: 70/74/78/80/81/82/83/77A/79/79(ii)/84/85/86/87(a)/91 (frente do cliente). O 77 mantém-se **aberto como produto**.


## §EG (05/11) — o ar passou a ser a **v113**; a Supervisão Educacional sobe com a aba, mas nenhuma tela dela foi pintada autenticada

- Ar medido depois do §EG: **v113** (HTML `b1993940f1c1973300f59e460aab688b`/3.531.006 B, SW `647919e9b1f5b50472da5b94e9a89d91`/5.990 B CACHE `bfr-conecta-v113`, worker `2a990cbb56aeded490bd1ebc1e86668f`/3.601.210 B, rp `b52434a4…`/FCM `fcfa8720…`/manifest `68d15518…` **byte a byte os da v112**, deployment `c47cd5b4…` / version `e769ff4a…` a 100 %, **0 assets** reenviados). Provas: leitura de deployments 8, HTTP 105 (15 rotas + 71 marcas no corpo servido + linhagem do fio nos dois sentidos), Chrome limpo 87, consolidado 73 → **677 portões / 0 vermelhos** (`V113_PUBLICADA_OK`, `audit-publicacao-v113.json`).
- **Novo na tela (por bytes, não por paint)**: aba `Supervisão Educacional` na Secretaria (13ª aba, `sup_panel` 13) e o corpo do módulo da Direção (`dirsup` 96 ocorrências, 20.742 B recortados, sha256 `9d539846156a…`). Marcos do documento vivo lidos no navegador: `aba_supervisao` 1, `deferred` 21 (`data-bfr-deferred`, era 20), `<script` 108→109, `</script>` 103→104.
- **Fechado na prova (S16, 06/11)** — a frente autenticada da Supervisão: os 10 cartões, os 6 ecrãs, o drill-down, as listas vazias explícitas e o «sem números falsos» estão provados em bytes e na bancada offline. **Pintada autenticada desde a S16-3** (`S16_SECRE_OK` 06/11 03:31Z, 32/0). A S16-4 (DIREÇÃO) **FECHOU** 06/11: `fecho: S16_DIR_OK`, **59 portões / 0 falhas de instrumento** (passada 8), sem `falha_dura`/`falha_no_fecho`, `s16-dir-escritas.json` completo (5 ids, nonce `S16D-77E129`); as quedas das passadas 3–7 foram do instrumento (armadilha 416 e a 417 — repaint adiado do canal a apagar os `required`), não do produto. **2 achados de produto ABERTOS** (exigem OK novo + DDL): o REST do diretor devolve solicitações de TODAS as escolas (policy de linha sem vínculo de unidade; a separação é só do cliente — `filtroEscola` reduz DOM e não o `state`) e a tela não oferece anexo (storage policy não libera o ficheiro à Secretaria). A fixture foi **apagada pela S16-7** (`#1025`) em 06/11: `BASELINE_RESTAURADA`, 11 linhas + 4 profiles + 4 auth (HTTP 200 ×4), censo pós == pré por contagem E md5; ciclo fechado na §EI com relatório §19 em `relatorio-supervisao-v113.md`.
- **Inalterado por esta vaga**: item 77 (aberto como produto, com o gargalo medido no carregador §EE), item 91 (chamador multiplexado), e todas as bandas de chrome medidas nas vagas anteriores — o rp.js não mudou um byte, por isso as medições de apresentação/mobile da v112 continuam válidas sem re-medição.
- Réguas do registo: `auditoria-bfr-conecta.md` `5637297f2c35648572a4a5e8f8ddbf4c`/1.624.671 B/135 secções → `89a027cfd7306db9d018af582b820926`/1.638.949 B/136 secções (diário `_eg-registro.json`, `EG_REGISTRO_OK`, 21 portões, quatro pernas de byte-lineage, cópia do antes `_eg-antes.md`).
