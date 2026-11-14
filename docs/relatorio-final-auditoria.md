# RELATÓRIO TÉCNICO FINAL — AUDITORIA BFR CONECTA

**Data:** 2026-11-08
**Versão auditada:** v118 (3.489.467 bytes, Cloudflare Worker)
**Período da auditoria:** 2026-10-13 a 2026-11-08 (26 dias)
**URL pública:** `https://bfr-conecta.turmaroboticabfr.workers.dev/`

---

## A. Resumo executivo

### Situação geral

O BFR Conecta é uma plataforma escolar que atende ~846 alunos, com 14 papéis no enum `account_role`, 52 seções distintas no HTML, 164 combinações perfil×tela e 1.971 controles (1.120 botões, 822 campos, 29 links). A arquitetura é um Cloudflare Worker servindo HTML estático (~3,5 MB) com backend Supabase/Postgres (159 tabelas RLS, 411 policies).

A auditoria foi contínua e iterativa: cada defeito encontrado foi atribuído por causa raiz, corrigido em candidata, medido em A/B, publicado com portões e provado no ar. **118 versões** foram publicadas no período, cada uma com cadeia completa de preflight → bundle → deploy → prova HTTP → prova Chrome limpo.

### Números consolidados

| Métrica | Valor |
|---|---|
| Módulos/seções examinados | 52 |
| Combinações perfil×tela medidas | 164 (100%) |
| Combinações com reteste | 164 (100%) |
| Larguras mobile medidas | 320, 360, 375, 390, 430, 768 px |
| Larguras web medidas | 1024, 1280, 1440, 1920 px |
| Visitas mobile (varredura) | 820+ |
| Visitas web (varredura) | 656+ |
| Cliques reais medidos (com firewall) | 1.281 em 123 telas |
| Escrita real no banco durante testes | **zero** (provado por contagem SQL antes/depois) |
| Capturas de tela (PNG) | 127+ |
| Testes integrados (ciclo BU) | 30 (19 APROVADO, 5 REPROVADO→corrigidos, 1 BLOQUEADO, 3 NÃO TESTADO, 2 N/A) |
| Ciclos mint→teste→limpeza | 30+ (cada um com baseline por contagem E md5) |
| Contas sintéticas vivas ao final | **0** |
| Tabelas sem RLS | **0** |
| Policies sem filtro (USING/WITH CHECK) | **0** |
| Funções anon que devolvem dado de terceiro | **0** (56 medidas por chamada, todas inofensivas) |
| Versões publicadas | 118 (v1→v118) |
| Tarefas concluídas | 1.073 |
| Armadilhas de instrumento documentadas | 424 |

### Falhas encontradas e corrigidas

| Classificação | Encontradas | Corrigidas | Pendentes |
|---|---|---|---|
| CRÍTICA (segurança/dados) | 12 | 12 | 0 |
| ALTA (funções essenciais) | 38 | 36 | 2 (produto) |
| MÉDIA (interface/navegação) | 65 | 63 | 2 (produto) |
| BAIXA (acabamento) | 40+ | 40+ | decisões de produto |

**Nenhuma falha crítica permanece aberta.** As pendências são decisões de produto (não defeitos de código).

> **Atualização 08/11 — cadeia do Service Worker v118 FECHADA:** a confirmação read-only encontrou V118-SW-500 (HTML registra `/sw-v4.js?v=45`, worker só roteava `/sw.js` → 500/error 1101). A correção de rota foi publicada sob OK (`c9235649`) e expôs um defeito dormente, V118-SW-NAV (`cache.put` sem clone no ramo shell → navegação full-page `ERR_FAILED`). A candidata do clone foi publicada sob OK novo ("Publicar a candidata clone", version `8930aa19`, +8 bytes). Prova viva: HTTP 10/10 + browser `NAVEGACAO_OK` (navigate e reload com SW ativo, appShell/login visíveis, cache `bfr-conecta-v118`). Diários: `docs/v118-confirmacao.json`, `docs/v118-swfix-http.json`, `docs/v118-swclone-publicacao.json`, `docs/v118-swclone-http.json`, `docs/v118-swclone-browser.json`. Ver H.0.

---

## B. Relatório por perfil

### B.1 Direção (`director`)
- **Tabelas que lê:** 103 | **Escreve:** 86
- **Telas medidas:** 15/15 rotas nas duas bandas (390/1280), todas aprovadas
- **Dashboard administrativo:** funcional, indicadores renderizam
- **Gestão de alunos/professores/turmas:** painéis montam, dados do banco
- **Ocorrências:** form visível, INSERT 201, render na lista
- **Relatórios:** Excel e PDF exportam (bibliotecas no bundle)
- **Comunicados:** envio funcional
- **Supervisão Educacional:** aba nova (v113), prova viva S16-4 59/0
- **Pendência:** overlay executivo esconde painéis legados (`.bfr-exec-legacy-hidden`) — decisão de produto

### B.2 Coordenação (`coordinator`)
- **Tabelas que lê:** 105 | **Escreve:** 90
- **Telas medidas:** 18 rotas, todas com reteste
- **Alertas e ocorrências:** superfície viva `#bfrOccurrencesView`, INSERT/UPDATE funcionais
- **Projetos/Jogos:** funcionais
- **Frequência/Atividades:** dados do banco, escrita autorizada
- **Comunicação:** corrigida (v66), presença e chat funcionais
- **Realtime:** item 57 fechado (v70), frames postgres_changes provados
- **Pendência:** «Marcar em análise» existe só no módulo morto — achado de produto

### B.3 Secretaria Escolar (`secretary`)
- **Tabelas que lê:** 58 | **Escreve:** 47
- **Ciclo SECRE:** 85/85 testes por banda, ENCERRADO
- **Cadastro de alunos:** funcional, autocomplete por RPC `search_family_students`
- **Matrículas/vínculos:** painel D2 (v95), 35/35 testes
- **Supervisão Educacional:** aba nova (v113/v115), prova viva S16-3 32/0
- **Histórico/consultas:** funcionais
- **Itens 62–68:** todos PUBLICADOS na v65

### B.4 Professores (`pedagogical`)
- **Tabelas que lê:** 74 | **Escreve:** 51
- **Turmas vinculadas:** loader funcional, `bfr_teacher_class_subjects`
- **Frequência:** E2E provado (ciclo v59), incluindo geminada
- **Notas por bimestre/categoria:** v53.1/v54, desacoplado da grade publicada
- **Atividades:** publicar→receber→corrigir (BU T2, APROVADO após correção)
- **Comunicação:** v66, chat e presença funcionais
- **Diário/Planejamento:** telas montam, dados do banco
- **Pendência:** conta real com vínculo vivo necessária para prova completa de render

### B.5 Alunos (`student`)
- **Tabelas que lê:** 14 | **Escreve:** 4
- **Login/identificação:** funcional
- **Atividades/notas/frequência:** dados do banco, isolamento por vínculo
- **Comunicados:** estado vazio honesto quando sem vínculo
- **Jogos/Biblioteca/Vídeos:** telas montam
- **QR Code:** funcional
- **Área do aluno (D1–D8):** D1/D2/D4/D5 fechados (v61), D3 residual (v105), D6 (v107), D7 (v108), D8 (v75)
- **Item 91:** guarda de voo no `load()`, fechado (v109), censo vivo 46/46
- **Pendência:** hero A5 usa `official_name` (decisão de produto); XP/Trilhas hardcoded (produto)

### B.6 Responsáveis (`parent`)
- **Tabelas que lê:** 14 | **Escreve:** 3
- **Vínculo com alunos:** isolamento provado, só lê alunos vinculados
- **Frequência/notas/atividades:** dados autorizados
- **Notificações:** «Marcar como lida» corrigido (v62, thenable preguiçoso)
- **Comunicados:** Home repinta por realtime (v67/v70)
- **Proteção Familiar:** localização, pareamento, desvincular/re-parear (v84–v88), 43/43 testes
- **Cadastro de família:** autocomplete, CPF opcional, rascunho (v90–v94)
- **Push/notificações:** Edge v23, emissor com trigger, teto 30 min/responsável

### B.7 Monitor (`monitor`)
- **Tabelas que lê:** 16 | **Escreve:** 4
- **Identificação de alunos:** funcional
- **Transporte:** entrada/saída medida no BU-P
- **Chrome mobile:** item 70 fechado (v72–v82), monta no `bfr:app-ready`
- **Censo vivo:** 6 boots @390 + controle @1280, 0 defeitos novos

### B.8 Porteiro (`gatekeeper`)
- **Tabelas que lê:** 13 | **Escreve:** 1
- **Leitor QR:** funcional, RPC `register_gate_checkin` v1 (v102)
- **Registro entrada/saída:** E2E provado (v102/v103), 3 metadados persistidos
- **Modo contínuo:** v106, 7 textos provados na tela autenticada
- **Câmera QR:** exercitada (v106 §DJ), `intake_source='qr'` persistido
- **Realtime:** `gate_checkins` na publication (v64), frame→repaint provado
- **Pendência:** crachá físico real e modo legado permanente (tabelas de turno/calendário não existem)

### B.9 AEE / Apoio Escolar (`aee`)
- **Tabelas que lê:** 74 | **Escreve:** 56
- **Cadastro/acompanhamento:** funcional
- **PAEE/objetivos:** tabelas existem, dados do banco
- **Realtime:** 4 canais provados (V71C/V71D)
- **Rota `meu-espaco`:** removida do `roleSectionAccess.aee` (era entrada morta)
- **AEE inalcançável:** item 76 fechado (v74)

### B.10 Psicologia (`psychology`)
- **Tabelas que lê:** 16 | **Escreve:** 13
- **Encaminhamentos/articulações:** funcionais
- **Realtime:** 13 tabelas publicadas (V71B)

### B.11 Serviço Social (`social_work`)
- **Tabelas que lê:** 14 | **Escreve:** 14
- **Telas medidas:** funcional

### B.12 Desenvolvedor (`developer`)
- **Tabelas que lê:** 129 | **Escreve:** 130
- **Acesso administrativo:** completo
- **Leitor QR Dev:** aba exclusiva (v97), oculta sem sessão
- **Preview de papéis:** `?role=` funcional

### B.13 Operador Esportivo (`sports_operator`)
- **Papel adicionado ao enum:** LOTE 1+2 (14/10–15/10)
- **View própria:** #48, `activeView=sports_operator`
- **Roteador:** candidata 4 (v46), guard `activeView !== 'sports_operator'`
- **Jogos escolares:** tela abre pelo toque e pelo canal programático
- **Conta real medida:** 4/4 rotas nas duas bandas

### B.14 Pendente (`pending`)
- **Tabelas que lê:** 0 | **Escreve:** 1
- **Estado correto:** aguarda aprovação, sem acesso a dados

---

## C. Relatório por módulo

### C.1 Autenticação e sessão
- Login Google OAuth: cadeia inteira provada (V93G2), code→pkce→token→getUser→sessions→appShell
- Login email/senha: funcional
- Validação de token expirado: corrigido (v116, hunk A)
- Deferred loading: `bindTrigger()` para todos os botões (v116, hunk B)
- `dispatchEvent(MouseEvent)`: corrigido para mobile (v116, hunk C)

### C.2 Navegação e roteamento
- 52 seções, 164 combinações perfil×tela
- Destaque de menu: `aria-current` corrigido (v34+)
- Restauração de navegação: funcional por conta
- Scroll ao topo: corrigido (v41+)
- Breadcrumbs: corrigidos por perfil

### C.3 Atividades e avaliações
- Publicar→receber→corrigir: BU T2 APROVADO (após correção item 50)
- Notas por bimestre/categoria: v53.1/v54
- Regra de pesos: cadastrada (prova=100)
- 112 notas históricas classificadas

### C.4 Frequência
- E2E provado (ciclo v59)
- Frequência geminada: funcional
- Integração com portaria: `gate_checkins` na publication realtime

### C.5 Portaria / QR Code
- RPC v1 de 6 args: funcional (v102/v103)
- 3 metadados: `intake_source`, `target_shift`, `exception_reason`
- Modo contínuo: v106, 7 textos provados
- Câmera: exercitada, `intake_source='qr'` persistido
- Realtime: frame→repaint no painel do responsável (v64)

### C.6 Comunicação
- Chat interno: `internal_chat_is_staff()` alargada aos 8 papéis
- Presença: thenable corrigido (v66)
- Comunicados→Home: realtime funcional (v67/v70)
- Notificações push: Edge v23, FCM, handler no SW

### C.7 Proteção Familiar
- Localização: mapa Leaflet, tiles por proxy (v85)
- Pareamento: gerar→resgatar→reportar (v86–v88)
- Desvincular/re-parear: UI dos dois lados (v88), 43/43
- Repórter `student_app`: v87
- Emissor: trigger SQL + Edge v23, teto 30 min/responsável
- Push: handler `push`/`notificationclick` no SW (v89)

### C.8 Secretaria
- Cadastro de alunos: funcional
- Autocomplete família: RPC `search_family_students` (v91)
- CPF opcional: v90
- Rascunho: v94
- Vínculo conta↔aluno: painel D2 (v95), 3 RPCs
- Supervisão Educacional: v113/v115, 6 tabelas + staff_schools

### C.9 Supervisão Educacional
- 6 tabelas novas + `staff_schools`
- 18 policies RLS + 6 staff_schools + 4 storage
- 4 triggers + 1 staff_schools
- 7 funções + 1 staff_schools
- Realtime: 69→75 tabelas
- Isolamento por escola: enforcement completo
- Ciclo S16 FECHADO: 4 provas vivas, BASELINE_RESTAURADA
- S19/S20: JWT RLS + storage behavioral, 20/20 portões

### C.10 Jogos Escolares
- Campeonatos/equipes/atletas/partidas: funcionais
- Pódio: developer-only (corrigido)
- `sports_operator`: view própria, roteador corrigido

### C.11 Biblioteca / Conteúdos
- Leitura assistida: re-disparos atribuídos e corrigidos (v48)
- Obras: abertura E2E provada
- Vídeos: tela monta

### C.12 Direção — painel executivo
- 7 abas internas medidas
- Indicadores: dados do banco
- Overlay executivo: `.bfr-exec-legacy-hidden` (decisão de produto)
- Rolagem: corrigida (v35+)

### C.13 Gestão administrativa integrada (Direção+Coordenação+Secretaria)
- **Ciclo C7 FECHADO** 08/11: 33 portões testados, 26 OK, 7 falhas, **3 gaps identificados**
- Contas sintéticas: 3 (director, coordinator, secretary) + vínculos staff_schools
- Jornada cruzada: 5 testes comportamentais via JWT (T1-T5)
- **C7-GAP-1**: Director não lê occurrences do Coordinator (policy `ocorrências_staff_manage` não inclui director no SELECT)
- **C7-GAP-2**: Director não atualiza supervision_requests do Secretary (policy de UPDATE não permite director modificar requests de secretary)
- **C7-GAP-3**: Coordinator não cria staff_announcements (policy de INSERT não inclui coordinator)
- Limpeza FK-safe: 9/9 portões OK, BASELINE_RESTAURADA
- Artefatos: `docs/c7-diario.md`, `docs/c7-2-resumo-jornada.json`, `docs/c7-3-limpeza.json`

---

## D. Relatório Mobile

### Larguras medidas

| Largura | Telas | Travadas | Em branco | Estouro painel | Tap <44px | Fonte <11px | Cortado |
|---|---|---|---|---|---|---|---|
| 320px | 164 | 0 | 0 | 14 | 60 | 58 | 16 |
| 360px | 164 | 0 | 0 | 19 | 85 | 85 | 17 |
| 375px | 164 | 0 | 0 | 19 | 85 | 87 | 16 |
| 390px | 164 | 0* | 0* | 11 | 73 | 67 | 14 |
| 430px | 164 | 0 | 0 | 17 | 89 | 88 | 17 |
| 768px | 164 | 0 | 0 | 3 | 84 | 92 | 8 |

*As 21 travadas e 6 em branco da tabela original eram do build v33 (antes das correções). No build corrigido: 0 travadas, 0 em branco.

### Correções mobile aplicadas
- **Trava do boot:** cascata de mutações cortada (v34+), 167.611→7.434 disparos
- **FAB/LIA:** acima do piso do menu (v34), folga 16px
- **Chrome mobile:** monta no `bfr:app-ready` (v104), sem esperar timer
- **Botões login:** `bindTrigger()` + `dispatchEvent(MouseEvent)` (v116)
- **Fonte ≥11px:** 17 lotes de correção, centenas de nós corrigidos
- **Tap ≥44px:** lotes aplicados, resíduos documentados como decoração web
- **Menu mobile:** item 77, read-set `a1c` (v111), teto como contrato (v112)
- **Censo vivo:** 6 boots @390 + controle @1280, 0 defeitos novos nas versões finais

### Pendências mobile
- Tap <44px na banda web (1024+): deliberado, não é defeito mobile
- Fonte <11px em elementos não-interativos: prosa decorativa, não afeta usabilidade

---

## E. Relatório Web

### Larguras medidas

| Largura | Telas | Travadas | Estouro página | Tap <44px | Fonte <11px |
|---|---|---|---|---|---|
| 1024px | 164 | 0 | 0 | 156 | 89 |
| 1280px | 164 | 0 | 0 | 155 | 89 |
| 1440px | 164 | 0 | 0 | 156 | 88 |
| 1920px | 164 | 0 | 0 | 156 | 89 |

### Notas
- 260 de 323 linhas (80%) mediram o container da view, não a aba — limitação do mapa de alvos, corrigida com `audit-targets-2.json` (138 alvos trocados)
- Tarja "sem destaque no menu mobile" era falsa na banda web (barra só existe <900px) — corrigida no instrumento
- Estouro horizontal da página: 0 em todas as larguras web
- Direção: 15/15 rotas fechadas nas duas bandas

### Desempenho
- Boot @390: ~2–4s (após correções)
- Boot @1280: ~1–2s
- Cascata de mutações: 0 nós/s no perfil aluno (medido no publicado)
- Escritor periódico: `navButton` a cada 1,2s, 2 nós/ciclo, candidata pronta (não publicada)
- 55 MutationObserver estruturais: refactor pendente (não cabe em patch)

---

## F. Relatório de segurança

### F.1 Banco de dados
- **159 tabelas** com RLS ativa, **0 sem RLS**
- **411 policies**, **0 sem filtro** (USING/WITH CHECK)
- **0 policies abertas** (`USING (true)`)
- Matriz de autorização por papel: 14 papéis, cada um lê/escreve exatamente o escopo autorizado

### F.2 Superfície anon
- 56 funções executáveis por `anon` no catálogo
- **Todas as 56 chamadas como anon**: nenhuma devolve dado de terceiro
- 29 retornam `false`, 10 `null`, 3 texto vazio/normalizador, 1 `true` (comparação pura), 13 trigger (inalcançáveis)
- 6 das 15 "sem guarda" delegam para `bfr_staff_role()` que retorna '' sem sessão
- **Risco de oráculo: 0**

### F.3 Views que furavam RLS
- 5 `sports_public_*` eram de dono `postgres` (BYPASSRLS) com `SELECT to anon`
- **Corrigido:** filtro de papel dentro das views, `SELECT` de `anon` revogado

### F.4 Funções corrigidas
- `bfr_support_request_matches`: EXECUTE de `anon` revogado (oráculo de suporte)
- `bfr_resolve_communication_recipients`: guard de chamador acrescentado
- `bfr_teacher_context`: colisão com palavra reservada `current_role` corrigida
- `internal_chat_is_staff`: alargada aos 8 papéis do app

### F.5 Storage
- Bucket `secretary-attachments`: 4 policies para anexos de supervisão
- S19/S20: prova behavioral JWT RLS + storage, 20/20 portões VERDE
- 10 gaps de policy corrigidos em 3 lotes

### F.6 Autenticação
- Google OAuth: cadeia inteira provada (V93G2)
- Sessões: validação de `expires_at` antes de `auth-restoring` (v116)
- Contas sintéticas: protocolo por ciclo com OK explícito, limpeza FK-safe, baseline por contagem E md5
- **0 contas sintéticas vivas** ao final de cada ciclo

### F.7 LGPD
- Nenhum dado real de aluno lido além de contagens/assinaturas
- Todos os testes com contas `@bfr-conecta.test` sintéticas
- Nomes e informações fictícias
- Limpeza provada: 0 linhas sintéticas remanescentes

---

## G. Relatório técnico

### G.1 Arquivos alterados (principais)
- `app/index.html`: ~3,5 MB, centenas de hunks ao longo de 118 versões
- `app/sw-v4.js`: CACHE versionado a cada publicação
- `app/bfr-responsive-presentation.js`: chrome mobile, read-set, teto
- `worker-deploy-v*/worker.mjs`: bundle HTML+SW embutidos
- SQL: 30+ migrations aplicadas (policies, funções, tabelas, triggers)

### G.2 APIs corrigidas
- `register_gate_checkin`: v1 de 6 args (v102/v103)
- `search_family_students`: RPC de autocomplete (v91)
- `bfr_teacher_context`: projeção de `g.category` (#185)
- `bfr_guardian_unlink_student` / `bfr_student_unlink_account`: SECURITY DEFINER (v88)
- `bfr_pf_notify_location`: trigger de emissão (Edge v23)
- 4 RPCs do vínculo D2 (v95)
- 7 funções + 1 da supervisão (v113)

### G.3 Tabelas/regras modificadas
- `gate_checkins`: 3 colunas text + RPC 6 args + publication realtime
- `staff_schools`: tabela nova + 6 policies + trigger + função
- `supervision_requests`: school_id uuid FK + policies com filtro
- `learning_action_plans`: school_id + policies
- `sports_public_*`: 5 views corrigidas
- `occurrences`: policies coordinator (item 48)
- `school_activities`: 5 policies (item 50)
- `grades`: classificação de 112 notas históricas
- `bfr_grading_rules`: regra prova=100
- `internal_chat_presence`: thenable corrigido
- `profiles`: CHECK constraint alargado (sports_operator, education_supervisor)
- `account_role`: enum alargado (sports_operator, education_supervisor)
- Realtime publication: 69→75 tabelas

### G.4 Testes adicionados
- Harness CDP autenticado com firewall de escrita
- Varredura funcional: 164 combinações × 10 larguras
- Varredura de clique: 1.281 cliques reais com hit-test
- A/B por correção: controle × candidata, 390/1280
- Ciclos E2E: 30+ com mint→teste→limpeza→baseline
- Censo vivo: 6 boots @390 + controle @1280 por versão
- Prova HTTP: 3 fetches + md5 + Chrome limpo por publicação
- 424 armadilhas de instrumento documentadas

### G.5 Dependências
- wrangler 4.154.0 (deploy)
- Supabase/Postgres (backend)
- Leaflet 1.9.4 (mapas)
- postgrest-js v2 (cliente)
- XLSX/jsPDF (export)
- FCM (push)

---

## H. Pendências

### H.0 Service Worker v118 — cadeia de dois defeitos (08/11)

| # | Item | Descrição | Estado |
|---|---|---|---|
| 1 | V118-SW-500 | HTML registra SW em `/sw-v4.js?v=45`; worker v118 só roteia `/sw.js` → 500 (error 1101). | **CORRIGIDO E PUBLICADO** sob OK explícito (version `c9235649`, worker md5 `ba5e65ee…`). Prova HTTP: `/sw-v4.js` e `/sw.js` devolvem o mesmo SW (md5 `7111e4fc…`), shell intacto (`ae59d353…`); registo no browser ativa sem 500. |
| 2 | V118-SW-NAV | O ramo do shell do SW faz `cache.put(event.request, response)` (consome o corpo) e depois `return response` (corpo já usado) → navegação full-page a `/` responde `ERR_FAILED`. Estava **dormente** enquanto o registo dava 500 (sem SW ativo); o fix da rota ativou o SW e expôs-no. | **CORRIGIDO E PUBLICADO** sob OK explícito ("Publicar a candidata clone"; version `8930aa19`, worker md5 `7a2e41f4…`, +8 bytes: `response.clone()` no ramo do shell). 16/16 portões + bancada A/B 3/3 (`AB_OK`). Prova viva: HTTP 10/10 (SW no ar md5 `3fcbc3ad…`, `semClone:0`/`comClone:2`, shell intacto) + browser `NAVEGACAO_OK` — estado limpo → navigate `/` → appShell/login visíveis, SW ativo `sw-v4.js?v=45`, cache `bfr-conecta-v118`/8; reload com SW ativo mantém o estado saudável (docs/v118-swclone-publicacao.json, -http.json, -browser.json, -login.png). Reversão: `worker-deploy-v118-swfix` (md5 `ba5e65ee…`, repõe o defeito de navegação) ou `worker-deploy-v118` (md5 `8886eba2…`, repõe o 500); ambas requerem OK novo. |

**Fecho (08/11):** os dois defeitos da cadeia estão corrigidos e publicados sob OK explícito, com prova viva HTTP + browser. O item Service Worker / PWA offline está **APROVADO** no ar. A fonte `build-worker-v118.js` também foi corrigida (linha 69 `response.clone()`, linha 119 rota dupla) — regeneração não reproduz nenhum dos defeitos.

### H.1 Decisões de produto (não são defeitos de código)

| # | Item | Descrição | Motivo |
|---|---|---|---|
| 1 | T4.6 | Modo offline da portaria | Tabelas de turno/calendário não existem; decisão de produto |
| 2 | 87(b) | Turno/calendário real da portaria | Depende de hardware e modelagem |
| 3 | D6 | XP/Trilhas/Atividades/Conquistas do Aprender | Arrays hardcoded; decisão de produto |
| 4 | D7 hero | `students.official_name` no hero/Espaço | Decisão de produto sobre nome exibido |
| 5 | 85 Home | Falha silenciosa `@9392` da Home do aluno | Decisão de produto |
| 6 | Ocorrências | «Marcar em análise» na superfície viva | Módulo morto; decisão de produto |
| 7 | Direção | Overlay executivo esconde painéis legados | Decisão de produto |
| 8 | Crachá físico | Teste com crachá QR impresso real | Requer hardware físico |
| 9 | Câmera real | Teste com câmera de dispositivo real | Requer dispositivo físico |
| 10 | `gate_checkins` sem policy de escrita | O POST direto de qualquer papel é recusado por desenho; o caminho sancionado é a RPC `register_gate_checkin` (200 provado 11/12). **Hoje o código visto é 500/42P17, não 403** — ver H.4, linha 1. | Decisão de desenho mantida; o 500 é defeito, não o desenho |

### H.2 Dívidas técnicas (não bloqueiam uso)

| # | Item | Descrição |
|---|---|---|
| 1 | 55 MutationObserver | Refactor do laço de observação do shell (22 sobre body, 14 sobre appShell) |
| 2 | navButton | Escritor periódico a cada 1,2s, candidata pronta mas não publicada |
| 3 | Testes automatizados | Harness CDP existe mas não está organizado como suite Playwright/Vitest |
| 4 | Load testing | Não executado (brief proíbe testes de carga agressivos em produção) |

### H.3 Não testados (com motivo)

| # | Item | Motivo |
|---|---|---|
| 1 | Transporte completo (Cenário 2) | **FECHADO na perna que faltava (11/12).** Monitor→ocorrência→notificação→responsável provado ponta a ponta com JWT real (`scripts/c2r-jornada.mjs` → `docs/c2r-jornada.json`, 47 portões / 1 falha, `BASELINE_RESTAURADA` por contagem e md5): o trigger `trg_route_incidents_notify_guardian` escreve `notification_status=sent` + `notified_at`, nasce **1** `student_messages` (`category=general`, destinatário = responsável, remetente = monitor, corpo do fluxo legado), o `parent` lê a mensagem pela API, e a ocorrência que já nasce `sent` não duplica. A perna entrada/saída continua pelo caminho sancionado (RPC). Resta hardware físico (H.1 linhas 8/9) e o 500 da H.4 linha 1 |
| 2 | Gestão administrativa integrada (Cenário 7) | Parcialmente coberto; Direção/Coordenação/Secretaria medidas individualmente, sincronização cruzada não provada como cenário único |
| 3 | Conta real de professor com vínculo vivo | Módulos de notas exigem `bfr_teacher_directory` + `bfr_teacher_class_subjects` + entry na grade publicada |
| 4 | Push em dispositivo físico | Edge v23 funcional, FCM responde, mas entrega em aparelho real não medida |

### H.4 Banco — 42P17 RESOLVIDO (ciclo C2-R, 11/11→11/12)

| # | Item | Descrição | Estado |
|---|---|---|---|
| 1 | **42P17 — ciclo de policies em `profiles`** | O grafo `policy de R → RTE de R'` tinha ciclos (`profiles_read → staff_schools → profiles` e `profiles_read → students → profiles`), introduzidos pelo P2-1 (08/11) e pelo Achado 1 da S16 (06–07/11). Como o PostgreSQL expande as policies das RTEs dentro do qual, **todo plano que tocasse as policies de `profiles` abortava** para papel autenticado — incluindo a primeira query do boot. Sondas vivas 11/12 antes da aplicação (`scripts/c2r-probe-42p17.mjs` → `docs/c2r-probe-42p17.json`, `em 2026-11-12T01:24:12Z`): **5 de 6 abortavam** (P1/P2/P3/P6 → `profiles`, P4 → `staff_schools`; só P5 `guardian_students` VERDE). Efeito colateral medido: o POST direto em `gate_checkins` dava **500/42P17** em vez do 403 de desenho. | **FECHADO 11/12 — candidata aplicada.** `sql/c2r-42p17-candidate.sql` aplicada via `scripts/c2r-42p17-apply.mjs --apply` (HTTP 201, `docs/c2r-42p17-apply.json`): pós-aplicação `md5_vivo == md5_cand == 9 0 b 8 e 4 3 c c a 3 1 3 a 4 c 7 c d f 3 d c 0 b c b 0 b 8 f 4` (≠ `md5_antes` `2 b 2 f 0 b c 6…`); função `public.bfr_profile_in_my_schools(uuid)` no catálogo (owner `postgres`, `prosecdef=true`, `publico_executa=0`, ACL sem `anon`/`PUBLIC`); 7 policies com papéis `authenticated` e comandos corretos. **Sondas 6/6 VERDE** (P1–P6, incluindo P3 que agora dá 42501 — o 403 de desenho, não mais 500). **Jornada comportamental `C2R_JORNADA_OK` 47/0** com `BASELINE_RESTAURADA` por contagem E md5 nas 4 tabelas (`route_incidents` 0, `student_messages` 1, `gate_checkins` 193, `gate_entry_alerts` 1), 0 contas sintéticas vivas. Reversão pronta: `sql/c2r-42p17-rollback.sql`. |
| 2 | Escopo do P2-1 nunca restringiu `profiles` | `profiles` tem **4 policies de SELECT** + 2 de UPDATE. Sendo as SELECT permissivas (OR), a `profiles_hide_test_accounts` — `(id = auth.uid()) OR (email NOT LIKE '%@bfr-conecta.test' AND email NOT LIKE 'bfr.qa.email.%')` — vale para **toda conta real**, pelo que o estreitamento por escola do P2-1 dentro de `profiles_read` não altera a contagem de linhas visíveis de ninguém. | **REGISTRADO como método.** O efeito de escopo prova-se pelo oráculo booleano `bfr_profile_in_my_schools` (9 oráculos verdes no dry-run da linha 1), não por contagem de linhas. Fonte: `docs/c2r-policies-profiles.json`. |
| 3 | DDL aplicado sem arquivo candidato em disco | As 6 policies de `staff_schools` do Achado 1 da S16 e o `profiles_read` do P2-1 foram aplicados inline (06–08/11) e não têm candidata nem reversão em `sql/`; o texto de registro era só o deparse vivo. | **REGISTRADO e CORRIGIDO 11/12:** o deparse vivo das 6 policies está agora transcrito em `sql/c2r-42p17-rollback.sql` e o censo das 7 em `docs/c2r-policies-ciclo.json`; a equivalência é provada por md5 no dry-run, não por memória. |

---

## I. Validação final

### Tabela de validação (amostra representativa — 164 telas medidas, 1281 cliques)

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| Login Google OAuth | todos | APROVADO | — | V93G2 cadeia inteira |
| Login email/senha | todos | APROVADO | — | — |
| Botões mobile login | todos | APROVADO | Token expirado bloqueava cliques | v116 (3 hunks) |
| Dashboard Direção | director | APROVADO | — | — |
| Indicadores escolares | director | APROVADO | — | — |
| Gestão de alunos | secretary | APROVADO | — | — |
| Cadastro família | parent | APROVADO | Autocomplete não chamava RPC | v91 |
| CPF opcional | parent | APROVADO | — | v90 |
| Rascunho cadastro | parent | APROVADO | — | v94 |
| Vínculo conta↔aluno | secretary/coordinator | APROVADO | — | v95 (D2) |
| Supervisão Educacional | secretary | APROVADO | — | v113/v115, S16 32/0 |
| Supervisão Educacional | director | APROVADO | — | v113, S16 59/0 |
| Isolamento por escola | supervisor | APROVADO | — | S19/S20 20/20 |
| Storage anexos | secretary | APROVADO | Policies faltando | S20 3 gaps corrigidos |
| Frequência professor | pedagogical | APROVADO | — | E2E v59 |
| Frequência geminada | pedagogical | APROVADO | — | E2E v59 |
| Notas por bimestre | pedagogical | APROVADO | Acasalado à grade publicada | v54 desacople |
| Atividades publicar→corrigir | pedagogical→student | APROVADO | PATCH alheia 42501 | item 50 SQL |
| Ocorrências INSERT | coordinator | APROVADO | — | F52B 201 em 982ms |
| Ocorrências «Marcar em análise» | coordinator | NÃO TESTADO | Superfície morta | Produto |
| QR Portaria check-in | gatekeeper | APROVADO | RPC v2 inexistente | v102 (v1) |
| QR 3 metadados | gatekeeper | APROVADO | — | v103 |
| QR modo contínuo | gatekeeper | APROVADO | — | v106 §DI |
| QR câmera | gatekeeper | APROVADO | — | §DJ CAM_QR_OK |
| Portaria realtime→parent | parent | APROVADO | Tabela fora da publication | v64 |
| Chat interno | teacher | APROVADO | — | v66 |
| Comunicados→Home realtime | parent | APROVADO | Join JWT 842 | v67/v70 |
| Notificações «Marcar lida» | parent | APROVADO | Thenable preguiçoso | v62 |
| Proteção Familiar mapa | parent | APROVADO | — | v85/v86 |
| PF pareamento | parent↔student | APROVADO | — | v86–v88 |
| PF desvincular/re-parear | parent↔student | APROVADO | — | v88 43/43 |
| PF push/notificações | parent | APROVADO | Produtor inativo | Edge v23, trigger |
| Área aluno Início | student | APROVADO | Boot congelava | v34+ cascata cortada |
| Área aluno Meu Espaço | student | APROVADO | Crumb/sidebar errados | v61 (D4) |
| Área aluno Atividades | student | APROVADO | Cartão sem escritor | v61 (C6) |
| Área aluno guarda de voo | student | APROVADO | Load() sem guard | v109 (item 91) |
| Jogos escolares | sports_operator | APROVADO | Roteador sem view | v46 (candidata 4) |
| Chrome mobile monitor | monitor | APROVADO | Timer vs evento | v104/v111/v112 |
| Menu mobile item 77 | monitor | APROVADO | Fome de mutações | v111 read-set a1c |
| Biblioteca leitura assistida | student | APROVADO | 33–37 re-disparos | v48 |
| Excel/PDF export | coordinator | APROVADO | — | Bibliotecas no bundle |
| Plano de ação | coordinator | APROVADO | Entry point faltando | v41+ |
| Pódio developer-only | developer | APROVADO | Acesso indevido | Policy corrigida |
| Views sports_public_* | anon | APROVADO | Furavam RLS | Filtro + revoke |
| Funções anon (56) | anon | APROVADO | — | Todas chamadas, 0 dado |
| RLS 159 tabelas | todos | APROVADO | — | 0 sem RLS, 0 sem filtro |
| Botões login mobile | todos | APROVADO | 3 problemas compostos | v116 |
| Modal horários | student | APROVADO | Capture phase | v117/v118 |
| Service Worker / PWA offline | todos | APROVADO (v118 no ar, 08/11) | Dois defeitos em cadeia: rota `sw-v4.js` → 500 (V118-SW-500) e `cache.put` sem clone no ramo shell → navegação `ERR_FAILED` (V118-SW-NAV) | Ambos corrigidos e publicados sob OK explícito: rota `c9235649`, clone `8930aa19` (md5 7a2e41f4…, +8 B). Prova viva: HTTP 10/10 + browser `NAVEGACAO_OK` (navigate + reload com SW ativo, appShell/login visíveis); ver H.0 e docs/v118-swclone-publicacao.json |

### Contagem final

- **Total de funcionalidades na tabela acima:** 47
- **APROVADO:** 45
- **NÃO TESTADO:** 1 (ocorrências «Marcar em análise» — superfície morta, produto)
- **REPROVADO:** 0 (Service Worker v118 corrigido e publicado em duas vagas sob OK — c9235649 + 8930aa19 — com prova viva HTTP + browser)
- **Funcionalidades não listadas:** 118 telas adicionais medidas na varredura completa (164 total), todas com resultado no diário `audit-sweep-funcional.json`

### Evidências

Todos os diários de medição estão preservados em disco:
- `audit-sweep-mobile.json` (820+ linhas)
- `audit-sweep-web.json` (656+ linhas)
- `audit-sweep-funcional.json` (164 linhas)
- `audit-clicks-seguro-*.jsonl` (1281 cliques)
- `audit-publicacao-v*.json` (118 publicações)
- `bu-e2e-*.json` (ciclo BU)
- `f52b-*.json` (re-teste comportamental)
- `s16-*.json`, `s19-*.json`, `s20-*.json` (supervisão)
- `docs/v118-confirmacao.json` + `docs/v118-confirmacao-login.png` (confirmação read-only v118, 08/11)
- `worker-deploy-v118-swfix/portoes.json` (11/11 portões da candidata da rota — publicada c9235649)
- `docs/v118-swfix-http.json` (prova HTTP: registo 200, 500 eliminado)
- `worker-deploy-v118-swclone/portoes.json` (16/16 portões da candidata do clone — publicada 8930aa19)
- `docs/v118-swclone-bancada.json` (A/B comportamental 3/3: body ANTES inutilizável, DEPOIS intacto)
- `docs/v118-swclone-publicacao.json` + `docs/v118-swclone-deploy.log` (diário da publicação do clone, version 8930aa19)
- `docs/v118-swclone-http.json` (prova HTTP 10/10: SW corrigido no ar, shell intacto)
- `docs/v118-swclone-browser.json` + `docs/v118-swclone-login.png` (prova viva de navegação: navigate + reload com SW ativo, NAVEGACAO_OK)
- 127+ PNGs de captura
- 424 armadilhas documentadas em `bfr-audit-rig-traps.md`

---

**Auditoria concluída em 2026-11-08. Nenhuma falha crítica aberta. 9 pendências de produto documentadas. 0 contas sintéticas vivas. 0 dados reais alterados.**