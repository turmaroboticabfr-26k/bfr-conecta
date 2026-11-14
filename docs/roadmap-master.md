# ROADMAP MASTER — BFR CONECTA

**Documento central de referência do projeto.** Mapa completo do sistema: funcionalidades, módulos, perfis, integrações, banco de dados, navegação, segurança, notificações, testes, pendências e roadmap de desenvolvimento por fases.

| Campo | Valor |
|---|---|
| Data de elaboração | 12/11/2026 |
| Versão auditada no ar | v120 (Cloudflare Worker, 3.489.649 bytes, md5 `a9a76d0e338c2a539135bccce23111b4`, publicada 13/11 às 06:49Z) + SQL aplicadas até 11/12. Até 13/11 às 06:49Z o ar era a v119 (3.489.474 B, `a1969cdf023042e7d2a91e7ed9333a05`) e antes a v118 (3.489.467 B, `ae59d35346b685b2fbf9d18ade4fa5cd`) |
| URL pública | `https://bfr-conecta.turmaroboticabfr.workers.dev/` |
| Método | Análise do código publicado, catálogo do banco (censo read-only de 12/11 04:07Z), diários de medição, relatório final da auditoria e ciclos de prova S16–S20, C2/C2R, C7, BU |
| Evidências | `docs/relatorio-final-auditoria.md`, `docs/auditoria-bfr-conecta.md` (seções A–P), `evidence/*.json`, `docs/*-diario.md`, `evidence/roadmap-censo-db.json` |
| Regra deste documento | Nada é declarado funcional sem prova registrada; nenhuma escrita no banco foi feita nesta etapa |

---

## 1. VISÃO GERAL DO BFR CONECTA

Plataforma escolar integrada que atende **848 alunos** (censo vivo), com **15 papéis** no enum `account_role`, **52 seções** distintas de interface, **164 combinações perfil×tela** medidas e **1.971 controles** (1.120 botões, 822 campos, 29 links). Arquitetura: **Cloudflare Worker** servindo SPA estática (~3,5 MB) + **Supabase/Postgres** (176 tabelas, todas com RLS) + Edge Functions (envio de notificações, Proteção Familiar) + FCM push + Realtime (75 tabelas publicadas).

**Histórico:** auditoria contínua de 2026-10-13 a 2026-11-08 (26 dias), **120 versões publicadas** (v1→v120), 1.073+ tarefas, 30+ ciclos de prova mint→teste→limpeza com baseline por contagem E md5. **Nenhuma falha crítica permanece aberta**; pendências são decisões de produto, dívidas técnicas e validações pendentes (seção 12).

**O que o BFR Conecta é hoje:** um sistema em produção com autenticação Google/email, área do aluno e do responsável completas, módulo do professor funcional ponta a ponta, Coordenação/Direção/Secretaria operacionais, portaria com QR e câmera, transporte com notificação ao responsável, Proteção Familiar com GPS e push, Supervisão Educacional com isolamento por escola, e segurança de dados auditada (RLS 100%, 0 policies sem filtro).

---

## 2. ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (SPA ~3,5 MB)                        │
│  index.html (52 seções) + bfr-responsive-presentation.js + sw-v4.js │
│  Cache: bfr-conecta-v120 (Service Worker registra /sw-v4.js?v=45)   │
└───────────────┬─────────────────────────────────────────────────────┘
                │ HTTPS (CSP aplicada — P2/P3)
┌───────────────▼─────────────────────────────────────────────────────┐
│               CLOUDFLARE WORKER (worker-deploy-v120)                 │
│  Serve HTML estático + SW + assets · wrangler 4.154.0 · OAuth próprio│
└───────┬───────────────────────────────────┬─────────────────────────┘
        │ PostgREST (REST/RLS)             │ Edge Functions
┌───────▼───────────────────┐   ┌──────────▼────────────┐  ┌──────────────┐
│ SUPABASE / POSTGRES       │   │ send-school-  │ pf-emissor │  FCM / push  │
│ 176 tabelas · RLS 100%    │   │ notification  │ (Edge v23) │  (Firebase)  │
│ 475 policies (0 sem filtro)│   │ (Edge v23)    │ + trigger  │              │
│ 126 funções (115 definer) │   └───────────────┴────────────┴──────────────┘
│ 78 triggers (64 public)   │
│ Realtime: 75 tabelas      │
│ Storage: 9 buckets        │
│ Auth: GoTrue (Google OAuth,│
│   email/senha, JWT 1h)    │
└───────────────────────────┘
```

- **Frente:** SPA única; módulos pesados carregados por loader serial de blocos deferred; Service Worker com cache versionado (cadeia v118 fechada com prova viva `NAVEGACAO_OK`).
- **Meio:** Worker roteia tudo (rotas, SW, assets, CSP); reversão por redeploy do bundle anterior.
- **Fundo:** PostgREST expõe o catálogo sob RLS; autenticação por JWT (papel vem do Bearer, não da apikey); funções SECURITY DEFINER para lógica de vínculo; triggers para auditoria e notificações; Storage com policies por bucket; Realtime por publicação `supabase_realtime`.
- **Dependências:** wrangler 4.154.0 · Supabase/Postgres · Leaflet 1.9.4 (mapas) · postgrest-js v2 · XLSX/jsPDF (export) · FCM (push).

---

## 3. MAPA COMPLETO DOS PERFIS DE ACESSO

**15 papéis no enum** (`censo 12/11`): `pending, parent, student, pedagogical, developer, monitor, gatekeeper, coordinator, secretary, aee, director, psychology, social_work, sports_operator, education_supervisor`. Observação: `admin`, `teacher` e `multiprofessional` são **views de interface**, não papéis do enum.

| Papel | Objetivo | Lê tabelas | Escreve | Escopo/autorização | Estado |
|---|---|---|---|---|---|
| **pending** | Conta recém-solicitada aguardando aprovação | 0 | 1 | Sem acesso a dados; só solicitação de acesso | ICP — fluxo de solicitação IF; **nenhum escritor produz `pending` vivo** (RM12-A1, 12/11) |
| **student** (aluno) | Estudar, acompanhar notas/frequência, QR | 14 | 4 | Isolado ao próprio vínculo | IF — área completa (D1–D8, item 91) |
| **parent** (responsável) | Acompanhar filhos, PF, comunicação | 14 | 3 | Só alunos vinculados; GPS mediante pareamento | IF — PF 43/43; push físico **ICP** (RM-1.3, RM13-A1) |
| **pedagogical** (professor) | Turmas, diário, frequência, notas, atividades | 74 | 51 | Só turmas vinculadas (`bfr_teacher_class_subjects`) | IF — E2E v59; render com conta real NT |
| **monitor** (transporte) | Embarque/desembarque por QR | 16 | 4 | Rotas/veículos próprios; check-in via RPC sancionada | IF — BU-P + C2R jornada 47/0 |
| **gatekeeper** (porteiro) | Entrada/saída por QR e câmera | 13 | 1 | Só `gate_checkins` via `register_gate_checkin` | IF — v102/v103/v106, CAM_QR |
| **coordinator** (coordenação) | Supervisão pedagógica, ocorrências, projetos | 105 | 90 | Escola própria; ocorrências/atividades próprias | IF — 18 rotas; «Marcar em análise» PI |
| **secretary** (secretaria) | Cadastro, matrícula, vínculo conta↔aluno | 58 | 47 | Escola própria; supervisão educacional | IF — SECRE 85/85; Supervisão S16 32/0 |
| **director** (direção) | Gestão administrativa, indicadores | 103 | 86 | Visão da escola; painel executivo | IF — 15/15 rotas; overlay NM |
| **aee** (AEE/aprendizagem) | PAEE, atendimento, evolução | 74 | 56 | Alunos do próprio escopo | IF — realtime 4 canais V71C/V71D |
| **psychology** (psicologia) | Encaminhamentos, articulações | 16 | 13 | Escopo próprio | IF — realtime V71B |
| **social_work** (serviço social) | Acompanhamento social | 14 | 14 | Escopo próprio | IF — telas medidas |
| **sports_operator** (operador esportivo) | Jogos escolares | — | — | View própria `sports_operator` | IF — 4/4 rotas, conta real (v46–v48) |
| **developer** (desenvolvedor/técnico) | Administração técnica, QR Dev | 129 | 130 | Acesso administrativo completo | IF — aba QR Dev v97; `?role=` preview |
| **education_supervisor** (Secretaria de Educação) | Supervisão de unidades escolares | — | — | **Isolado por escola** via `staff_schools` | IF — S16 Fase 0 + S19/S20 21/21+20/20 |

**Verificação de isolamento por papel** (pergunta do brief «cada usuário vê exclusivamente o autorizado»): provada behavioralmente com contas sintéticas e JWT real nos ciclos S19/S20 (matriz RLS 30 portões + 21/21 renovados) e C7 (5 testes cross-role). Gaps encontrados foram **fechados** (10 gaps de policy em 3 lotes, 08/11; 3 gaps C7; 42P17 em 11/12). A autorização é aplicada **no banco (RLS), não apenas na interface**.

---

## 4. MAPA DE TODAS AS ABAS (52 seções)

Distribuição por papel (abas principais; o total de 52 seções cobre 164 combinações perfil×tela, todas varridas em 10 larguras):

| Papel | Abas |
|---|---|
| Aluno | Início, Aprender, Evoluir, Escola, Meu espaço, Notas, Agenda, Atividades, Horários, Jogos, Jogos escolares, Vídeos aprender, Comunicados, Biblioteca, Boletim, Resultados e aprendizagem, Escola & História, Notificações |
| Responsável | Início (Home realtime), Aprender, Evoluir, Escola, Meu espaço, Proteção Familiar (mapa/pareamento), Painel da portaria, Notificações, Cadastro de família |
| Professor | Minhas turmas, Agenda de hoje, Diário, Planejamento, Frequência (com geminada), Notas por bimestre, Atividades, Comunicação, Relatórios, Calendário, Notificações, Conteúdos |
| Coordenação | Visão geral, Alunos, Frequência, Ocorrências/Alertas, Projetos, Jogos, Atividades, Comunicação, Plano de ação, Relatórios, Supervisão Educacional (consulta) |
| Direção | Dashboard executivo (7 abas internas), Gestão de alunos/professores/turmas, Ocorrências, Comunicados, Relatórios, Supervisão Educacional |
| Secretaria | Cadastro de alunos, Matrículas/Vínculos (painel D2), Supervisão Educacional (aba completa), Histórico, Consultas, Documentação |
| Porteiro | Portaria QR (modo contínuo), Início |
| Monitor | Transporte (QR embarque/desembarque), Ocorrências de rota |
| AEE | Acompanhamento, PAEE, Registros de atendimento, Meu espaço (removida — era entrada morta), Comunicação |
| Psicologia | Encaminhamentos, Articulações, Reuniões |
| Serviço social | Acompanhamento social |
| Operador esportivo | Início, Jogos escolares, Avisos, Mais |
| Supervisor educacional | Supervisão de escolas vinculadas (via Secretaria: aba Supervisão Educacional) |
| Desenvolvedor | Todas + Leitor QR Dev (exclusiva, v97) |

---

## 5. INVENTÁRIO COMPLETO DE FUNCIONALIDADES (104 itens)

Legenda de status: **IF** = IMPLEMENTADO E FUNCIONANDO · **ICP** = IMPLEMENTADO COM PROBLEMAS · **PI** = PARCIALMENTE IMPLEMENTADO · **NI** = NÃO IMPLEMENTADO · **NT** = NECESSITA DE TESTES · **NM** = NECESSITA DE MELHORIAS · **PF** = PLANEJADO PARA O FUTURO.
Detalhes de «como funciona / informações que utiliza e registra / dependências» estão nas seções 4, 6 e 7; a coluna Evidência cita o diário/portão que classifica o item.

### 5.1 Autenticação e sessão

| ID | Funcionalidade | Status | Evidência | Observações / critério de conclusão |
|---|---|---|---|---|
| A.01 | Login Google OAuth (cadeia completa) | IF | V93G2 (`V93G2_SESSAO_REAL_OK`) | code→pkce→token→getUser→sessions→appShell provado no ar |
| A.02 | Login email/senha | IF | Relatório final I | Funcional; usado pelas contas sintéticas dos ciclos |
| A.03 | Validação de token expirado no boot | IF | v116 hunk A | `expires_at` validado antes de auth-restoring |
| A.04 | Botões de login no mobile | IF | v116 hunks B/C | `bindTrigger()` + `dispatchEvent(MouseEvent)` |
| A.05 | Cadastro de família (solicitação de acesso) | IF | Itens 80–83: E2E 30/30, §BM, §BO, V94N 16/16+25/25 | Autocomplete (v91), CPF opcional (v90), rascunho (v94) |
| A.06 | Aprovação administrativa de contas (pending→papel) | ICP | RM-1.2 12/11: `evidence/rm12-ciclo3.json` 57 portões/0 falhas + `evidence/rm12-veredito.json` | Caminho B (`rpc/set_profile_role` com JWT de developer) e caminho A (pré-cadastro `approved` em `access_requests`) medidos no ar com contas sintéticas; baseline restaurada por contagem E md5. Problema: o estado `pending` nunca é escrito (RM12-A1) |
| A.07 | Restauração de sessão/navegação por conta | IF | #9, v41+ | Chave `bfr-active-navigation-v2:<uid>` |
| A.08 | Service Worker / PWA | IF | v118: rota `c9235649` + clone `8930aa19`, `NAVEGACAO_OK` | Cache `bfr-conecta-v120` desde 13/11 às 06:49Z (a v120 mudou a etiqueta do `CACHE` e manteve o corpo do SW idêntico, 3.586 B md5 `289f1f1dc82a2eb2e091994916af3e97`); navegação full-page provada com SW ativo na v120 em Chrome limpo (10/10) |

**RM-1.2 medido 12/11 — aprovação administrativa.** O script `scripts/roadmap-rm12-ciclo3.mjs` faz exatamente as chamadas HTTP do painel «Contas e cargos» com JWT real de contas sintéticas criadas pela Auth Admin API:
- **Caminho B (promação no painel):** `POST /rest/v1/rpc/set_profile_role` → HTTP 200 e `true`; o papel vira `pedagogical` e a mesma conta passa a enxergar o directório de staff — a contagem coincide com o oráculo SQL dos 6 papéis.
- **Caminho A (pré-cadastro):** `INSERT` em `access_requests` com `status=approved` e `approved_role=requested_role` **antes** de a conta existir → no 1º login `handle_new_user` lê `approved_role` e o perfil nasce `monitor`.
- **Auto-solicitação:** o solicitante insere o próprio e-mail como `pending` (201); o developer `PATCH` → `approved` (200); o próprio solicitante lê `approved`.
- **Query de listagem do painel** (`index.html:9081`): `GET /rest/v1/profiles?select=id,full_name,email,role&order=full_name.asc` devolve exatamente o oráculo SQL (não-ocultas + a própria linha) e inclui a conta aprovada.
- **4 negativos segurados:** não-developer chamando `set_profile_role` em si mesmo (4xx + guard, nada muda); `approved_role ≠ requested_role`; solicitação por e-mail alheio; conta de controlo no domínio oculto fora da lista.
- **Limpeza:** 4 contas removidas (`GET` auth → 404), 0 resíduo em `profiles`/`access_requests`, `BASELINE_RESTAURADA` por contagem E md5.
- **Limitação do critério «medida na UI»:** PARCIAL por desenho — os HTTP exatos do painel foram medidos; o clique na tela com conta real de developer não foi (domínio de teste é oculto pela policy restrictiva RM12-A2 e não há conta real de developer disponível a este agente).
- **3 achados:** RM12-A1 nada escreve `role='pending'` (os rótulos/portões `pending` da UI são inalcançáveis — `index.html:9002/9048/9349/10601`); RM12-A2 `profiles_hide_test_accounts` é RESTRICTIVE e vale até para o developer; RM12-A3 existe um 3º caminho self-service (`complete_family_registration`) limitado a `parent`/`student` mediante vínculo com a ficha — sem escalonamento.
- **Passadas:** 1ª 39 portões/5 falhas (expectações do instrumento erradas, preservada em `evidence/rm12-ciclo-pass1.json`); 2ª 56/1 (default da coluna é `pending`, não `parent`); 3ª 57/0 `RM12_CICLO3_OK`.

### 5.2 Navegação e estrutura

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| N.01 | Roteador de 52 seções | IF | Varreduras: 164 combinações × 10 larguras, reteste 100% | 0 travadas, 0 em branco no build corrigido |
| N.02 | Menu mobile (barra inferior) | ICP | Item 77 aberto: v111 read-set `a1c`, v112 teto, §ED/§EE | Fome de timers residual medida; produto |
| N.03 | Sidebar web | IF | Varreduras web 1024–1920 | 0 estouro de página |
| N.04 | Breadcrumbs por perfil | IF | Corrigidos por perfil (v34+) | — |
| N.05 | Gaveta «Mais» mobile | IF | D4 (v61); guards declarativos por papel | — |
| N.06 | Scroll ao topo / restaurar rolagem | IF | v41+ (#9) | — |

### 5.3 Área do aluno

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| S.01 | Área Aprender | IF | D1/D2 (v61) | Cartão de atividades com escritor (C6) |
| S.02 | Área Evoluir (XP/Trilhas/Conquistas) | PI | D6: arrays hardcoded | Dados estáticos; versão dinâmica = PF |
| S.03 | Área Escola | IF | v61 | — |
| S.04 | Meu Espaço | IF | D4 (v61); crumb/sidebar corrigidos | — |
| S.05 | Hero com nome do aluno | NM | Item 86: usa `official_name` | Decisão de produto sobre nome exibido |
| S.06 | Home do aluno | NM | Item 85: falha silenciosa `@9392` | Decisão de produto |
| S.07 | Notas/boletim | IF | v53.1/v54, D3 | 112 notas classificadas; regra prova=100 |
| S.08 | Atividades do aluno | IF | BU T2 (publicar→receber→corrigir) | PATCH alheia 42501 corrigido (item 50) |
| S.09 | Frequência do aluno | IF | BU T3 | professor→aluno→responsável provado |
| S.10 | QR Code do aluno | IF | Relatório final B.5 | Crachá com token |
| S.11 | Biblioteca / Leitura assistida | IF | v48 (33–37 re-disparos corrigidos) | — |
| S.12 | Vídeos/Conteúdos/Jogos | IF | Telas medidas, montam | — |
| S.13 | Horários (modal) | IF | v117 (capture phase) + v118 | Botões «Ver/Fechar horários» |
| S.14 | Escola & História | IF | v105 (item 84) | Rota corrigida |

### 5.4 Responsáveis

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| P.01 | Vínculo com alunos | IF | Isolamento provado | Só lê alunos vinculados |
| P.02 | Home repinta por realtime | IF | v67/v70 (`FRAME_70_OK` 18/18) | Comunicados→Home |
| P.03 | Notificações «marcar como lida» | IF | v62 (thenable preguiçoso) | — |
| P.04 | PF: mapa/localização | IF | v85/v86 (Leaflet, tiles por proxy) | — |
| P.05 | PF: pareamento/desvincular/re-parear | IF | v86–v88, 43/43 | UI dos dois lados |
| P.06 | PF: repórter student_app | IF | v87 | — |
| P.07 | PF: teto de emissão 30 min/responsável | IF | §C.39/§C.40 | Trigger + Edge |
| P.08 | Push em aparelho físico | ICP | RM-1.3 12/11: `evidence/rm13-rotas.json` 8 verdes / 6 vermelhos de 14, veredito `RM13_CADEIA_PARTIDA` + `evidence/rm13-aparelho.json` 5/10 | Emissor e Edge íntegros; o **cliente publicado não completa a assinatura** (RM13-A1): o SW registrado não tem handler de push nem `importScripts` e a rota `/firebase-messaging-sw.js` devolve 500. Reparo = RM-1.5 (exige OK novo de publicação) |
| P.09 | Painel da portaria (check-in do filho) | IF | v64 (publication realtime) | frame→repaint provado |

**RM-1.3 medido 12/11 — entrega push em aparelho físico.** Sonda `scripts/rm13-sonda-rotas.mjs` (somente leitura: 0 escrita, 0 DDL, 0 deploy; artefacto `evidence/rm13-rotas.json`). Saída da passada registada: **8 portões verdes / 6 vermelhos de 14**, veredito `RM13_CADEIA_PARTIDA`, exit 1. A tarefa **não** fechou como «emparelho indisponível»: a causa foi localizada e é do próprio cliente publicado. A atribuição sai em três camadas independentes, cada uma com o seu portão:
- **Cliente (medido agora — é aqui que a cadeia se parte).** As 3 chamadas `serviceWorker.register` dos bytes servidos apontam todas para `/sw-v4.js?v=45` (`registra_sw_v4_v45=3`; `app/index.html:9188`, `:12290`, `:19543`), e são exatamente essa registration que é entregue ao FCM: `getToken({ vapidKey, serviceWorkerRegistration: registration })` (`app/index.html:9189` e a irmã `enablePush` do bloco adiado `:19537`–`:19548`). O caminho é o **v8-compat do FCM Web** (`firebase-app-compat.js` + `firebase-messaging-compat.js`, `app/index.html:9174–9178`), que a documentação do Firebase só atende com um service worker de messaging em `/firebase-messaging-sw.js` **ou** importado por `importScripts` no SW registrado. Nenhum dos dois existe: **`firebase_messaging_sw=0` nos 3 489 467 bytes servidos** (portão M3 vermelho), **`importScripts=0`** no SW, e **`pushManager_subscribe=0`** — o app não usa Web Push puro, depende do FCM. Consequência medida no SW servido: `md5 3fcbc3ad52f1a0491362506466c82596`, 3 586 B, 3 ouvintes — `install`, `activate`, `fetch` — e `handler_push=0`, `notificationclick=0`, `showNotification=0`, `firebase=0` (portões S1/S2 vermelhos).
- **Os dois modos de falha NÃO se distinguem sem aparelho — e ambos são fatais à exibição.** (i) `getToken()` recusa por não existir SW de messaging, logo nunca há token nem linha em `push_subscriptions`; (ii) o token sai e o push chega ao SW que tem a registration — que não tem ouvinte de `push` e não mostra nada. A sonda prova a **ausência estrutural** dos dois pré-requisitos; não prova qual ramos dispara primeiro. É por isso que o estado é **ICP com defeito atribuído**, e não NT.
- **Banco (medido):** `push_subscriptions` com **0 linhas** e a conta-aparelho do ciclo §C.24 já não existe (`rm13-aparelho.json`: `A1_conta_aparelho_viva=morta`, `A2_assinatura_presente=0`, `subs_totais=0`) — coerente com as remoções de contas sintéticas de 12/11. Não é prova de que a assinatura nunca funcionou; é prova de que **não há assinante hoje para receber**.
- **Emissor (medido, ÍNTEGRO):** gatilho `bfr_pf_notify_location` vivo e habilitado (`C1=1`, `C2="O"`), segredo do emissor no Vault (`C3=1`), Edge `send-school-notification` **v23 ACTIVE com `verify_jwt:true`** (`E1`/`E2` verdes) e as 4 respostas do canal todas 200 com `"sent":{"push":{"attempted":1,"sent":1,"failed":0,"removed":0}}` (máx. id 110, última 2026-10-30). Ou seja: a aceitação pelo FCM está provada — e, pelo vocabulário da armadilha §C.30, **aceita ≠ exibida**.
- **Rotas do Worker (medido, achado próprio RM13-A2):** das 14 rotas fixas, só `/`, `/index.html`, `/sw.js`, `/sw-v4.js` e os **12/12** ficheiros de `public/` (byte-idênticos ao disco, R7/R8 verdes) resolvem. `/firebase-messaging-sw.js`, `/manifest.webmanifest`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/aluno`, `/coordenacao` e um caminho inexistente devolvem **500 com a página «Worker threw exception»** (4 720 B) em vez de 404 — causa no mecanismo publicado: `worker-deploy-v118-csp/worker.mjs:37` chama `env.ASSETS.fetch(assetUrl)` com uma **string**. Dos **7** diretórios `worker-deploy-v*` em disco, **4** têm esse modo (`worker-deploy-v118`, `-csp`, `-swclone`, `-swfix`); **nenhum** (`com_rota_fcm=[]`, `com_handler_push=[]`) tem rota FCM ou ouvinte de push.
- **Falso achado anterior, corrigido e medido:** a versão inicial da sonda anunciou «17 URLs do HTML que dão 500». Eram **placeholders de template literal** (`/${digits}`, `${escapeHtml(url)}`) apanhados dentro de `<script>`. Com o extrator a remover comentários e os corpos de `script|style|noscript|svg` e a rejeitar valores com `{ } $ \` espaço \`, o número real de referências únicas no HTML é **5**, todas já medidas, e **0** dão 500 por causa própria.
- **Limitações do instrumento (declaradas):** (1) a contagem de chamadas `enablePush` é feita por regex `nome(` — o vínculo real é `addEventListener('click', enablePush)` (`app/index.html:19529`, passa a função por referência), logo «0 chamadas» **não** significa botão desligado; (2) o portão `S4_sw_identico_ao_do_diario` compara linhagens diferentes (md5 do SW v118 `3fcbc3ad…` contra o md5 registado do SW da era v89 `e11fca19…`) — divergência de linhagem, não regressão; (3) o censo de linhagem prova o **estado atual do disco**, não que a rota FCM nunca foi publicada (o diretório v89 já não existe aqui); (4) a prova de exibição exige aparelho físico + perfil de navegador novo com subscription recriada — não é substituível por leitura estática.
- **O que fica registado de §C.21/§C.24/§C.25 (evidência escrita do ciclo Proteção Familiar, não re-medida por esta sonda):** houve candidatas com ouvinte `push`/`notificationclick` no SW (tarefa BGN-P1) e rota real `/firebase-messaging-sw.js` no Worker (BGN-P2), e um aparelho assinante com ciclo de entrega. Nada disso está nos artefactos publicados hoje — o que a sonda mede é a ausência.
- **Reparo:** **RM-1.5** (devolver à cadeia um SW que receba o push — ouvintes `push`/`notificationclick` no SW registrado **ou** `importScripts` da mensagem FCM, com a rota `/firebase-messaging-sw.js` a servir JS) e **RM-6.9** (caminhos fora do bundle devem dar 404, não 500). **Ambos tocam código publicado — exigem OK novo de publicação; nada foi alterado nesta passada.**

### 5.5 Professor

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| T.01 | Turmas vinculadas | IF | `bfr_teacher_class_subjects` (v54) | Estado de carregamento real |
| T.02 | Frequência (incl. geminada) | IF | E2E v59 | — |
| T.03 | Notas por bimestre/categoria | IF | v53.1/v54 desacoplado da grade | Regra de pesos cadastrada |
| T.04 | Atividades publicar→receber→corrigir | IF | BU T2 APROVADO | — |
| T.05 | Diário de aula | IF | E2E v59 (escrita) | — |
| T.06 | Planejamento | IF | Telas medidas, dados do banco | — |
| T.07 | Comunicação/chat/presença | IF | v66 | Chat interno 8 papéis |
| T.08 | Relatórios | IF | Relatório final B.4 | — |
| T.09 | Render completo com conta real vinculada | NT | H.3 linha 3 | Exige `bfr_teacher_directory` + vínculo + grade |

### 5.6 Coordenação

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| C.01 | Ocorrências/alertas | IF | F52B 201 em 982ms; item 48 | INSERT/UPDATE funcionais |
| C.02 | «Marcar em análise» | PI | Módulo morto (superfície viva não tem) | Decisão de produto |
| C.03 | Projetos/Jogos | IF | Relatório final B.2 | — |
| C.04 | Frequência/Atividades (consulta) | IF | Relatório final B.2 | — |
| C.05 | Comunicação | IF | v66 | — |
| C.06 | Realtime | IF | Item 57 fechado (v70) | frames postgres_changes |
| C.07 | Export Excel/PDF | IF | Executados ponta a ponta (tarefa #25) | Bibliotecas no bundle |
| C.08 | Plano de ação | IF | v41+ (entry point) | `learning_action_plans` |
| C.09 | Supervisão Educacional (consulta) | IF | v113/v115 | — |

### 5.7 Direção

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| D.01 | Dashboard executivo | IF | 15/15 rotas nas duas bandas | 7 abas internas |
| D.02 | Gestão de alunos/professores/turmas | IF | Relatório final B.1 | — |
| D.03 | Ocorrências | IF | Relatório final B.1 | Form + INSERT 201 |
| D.04 | Relatórios Excel/PDF | IF | Relatório final B.1 | — |
| D.05 | Comunicados | IF | Relatório final B.1 | — |
| D.06 | Supervisão Educacional (aba) | IF | S16-4 59/0 | — |
| D.07 | Overlay executivo esconde painéis legados | NM | `.bfr-exec-legacy-hidden` | Decisão de produto |

### 5.8 Secretaria Escolar

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| E.01 | Cadastro de alunos | IF | Relatório final B.3; ciclo SECRE 85/85 | — |
| E.02 | Autocomplete família | IF | RPC `search_family_students` (v91) | — |
| E.03 | Matrículas/vínculo conta↔aluno | IF | Painel D2 (v95), 35/35 | 3 RPCs |
| E.04 | Supervisão Educacional | IF | v113/v115; S16-3 32/0 | — |
| E.05 | Anexos (storage secretary-attachments) | IF | S19 (22 portões) + S20 | 4 policies; upload/download/delete |
| E.06 | Histórico/consultas | IF | Relatório final B.3 | — |

### 5.9 Supervisão Educacional (Secretaria de Educação)

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| U.01 | Papel `education_supervisor` | IF | Fase 0 (F0.1–F0.9) | Enum + front |
| U.02 | Isolamento por escola (`staff_schools`) | IF | S19/S20: 21/21 + 20/20; 42P17 fix 11/12 | Enforcement completo |
| U.03 | Solicitações/respostas/planos de ação | IF | S16/S17 (T1–T5) | 6 tabelas |
| U.04 | Anexos de supervisão | IF | S19-5 (22 portões) | Storage RLS por papel |
| U.05 | Alertas/auditoria de supervisão | IF | S16-5 SQL 37/0 | Triggers + auditoria |
| U.06 | Indicadores da rede / relatórios comparativos | PF | Não implementado | Depende de produto multi-escola |

### 5.10 Monitor (transporte)

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| M.01 | Identificação por QR | IF | BU-P (jornada transporte) | — |
| M.02 | Embarque/desembarque | IF | BU-P; C2R jornada 47/0 | Caminho sancionado: RPC |
| M.03 | Notificação ao responsável (ocorrência de rota) | IF | C2R 11/12: trigger `trg_route_incidents_notify_guardian` | `student_messages` nasce, parent lê |
| M.04 | Chrome mobile | IF | Item 70 (v72–v82); censo vivo 6 boots | Monta no `bfr:app-ready` |

### 5.11 Porteiro

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| G.01 | Leitor QR | IF | v102/v103 (RPC v1 de 6 args); T79 E2E (§CR/§CV); câmera §DJ `CAM_QR_OK` | 3 metadados persistidos |
| G.02 | Modo contínuo | IF | v106 (§DI, 7 textos provados) | — |
| G.03 | Realtime→painel do responsável | IF | v64 | frame→repaint |
| G.04 | Modo offline da portaria | PF | T4.6 | Tabelas de turno/calendário não existem |
| G.05 | Turno/calendário real | PF | 87(b) | Depende de hardware e modelagem |

### 5.12 AEE / Psicologia / Serviço Social

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| A2.01 | Cadastro/acompanhamento AEE | IF | Relatório final B.9 | — |
| A2.02 | PAEE/objetivos | IF | Relatório final B.9 (tabelas + dados do banco) | — |
| A2.03 | Realtime AEE (4 canais) | IF | V71C/V71D | frames provados |
| A2.04 | Psicologia: encaminhamentos/articulações | IF | Relatório final B.10; realtime V71B | — |
| A2.05 | Serviço social | IF | Relatório final B.11 | — |
| A2.06 | Plano de aprendizagem | IF | v41+; `learning_action_plans` | — |

### 5.13 Jogos Escolares

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| SP.01 | Jogos escolares (campeonatos/equipes/atletas/partidas) | IF | v46–v48; conta real 4/4 rotas | — |
| SP.02 | Pódio developer-only | IF | Policy corrigida (item 50) | — |

### 5.14 Comunicação e plataforma

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| CM.01 | Chat interno (8 papéis) | IF | Relatório final C.6 | `internal_chat_is_staff()` |
| CM.02 | Presença | IF | v66 | — |
| CM.03 | Comunicados | IF | Relatório final C.6 | — |
| CM.04 | Push/FCM/Edge v23 | IF | Infra provada (§CX janela 107–110, fila vazia) + RM-1.3 12/11: emissor/Edge íntegros, 4/4 respostas 200 com `sent:1` | Entrega ao aparelho está partida no cliente → P.08 **ICP** (RM13-A1), reparo RM-1.5 |

### 5.15 Desenvolvedor / equipe técnica

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| DV.01 | Leitor QR Dev (aba exclusiva) | IF | v97 (§CA/§CB) | Oculta sem sessão |
| DV.02 | Preview de papéis (`?role=`) | IF | Relatório final B.12 | — |
| DV.03 | Gestão administrativa integrada | IF | C7: 5 testes cross-role via JWT | 3 gaps FECHADOS |

### 5.16 Segurança transversal

| ID | Funcionalidade | Status | Evidência | Observações |
|---|---|---|---|---|
| SC.01 | RLS em 176/176 tabelas | IF | Censo 12/11 04:07Z | 0 sem RLS |
| SC.02 | 475/475 policies com filtro | IF | Censo 12/11 | 0 `USING (true)` |
| SC.03 | Superfície anon sem oráculo | IF | F.6.c (56 funções chamadas, 0 dado) | Re-verificação após cada migration |
| SC.04 | Views sem vazamento | IF | F.3 (5 `sports_public_*` corrigidas) | `support_professionals_directory` security_invoker |
| SC.05 | CSP | IF | P2/P3 publicada; camada B 0/12 | — |
| SC.06 | Rotação de credenciais (P0) | IF | 10/11: push `5385066`, token regenerado, censo 0 | badge_token morto |

**Contagens do inventário:** 104 itens · IF 92 · ICP 3 · PI 2 · NT 1 · NM 3 · PF 3 · NI 0 no inventário (itens não implementados estão classificados como PF e listados na seção 12). *Recontado 12/11: A.06 saiu de NT para ICP pelo RM-1.2; P.08 saiu de NT para ICP pelo RM-1.3 (a cadeia de push foi medida e tem causa atribuída — deixou de ser «só falta testar»). A distribuição é a linha `DISTRIB §5 (parser)` que o `scripts/rm-audit-numeros.mjs` imprime ao percorrer as tabelas da seção 5, não uma soma feita à mão.*

---
## 6. MAPA DE INTEGRAÇÃO ENTRE OS MÓDULOS

Verificação dos 8 fluxos do brief contra evidência de prova. **Nenhum fluxo é declarado funcional sem portão medido.**

### FLUXO 1 — ENTRADA NA ESCOLA
`Aluno → QR Code → Porteiro → Registro de entrada → Frequência → Professor → Responsável`
- **Provado:** leitura do QR (T79 E2E, §CR/§CV), persistência com 3 metadados (`intake_source`, `target_shift`, `exception_reason`), realtime `gate_checkins` → repaint no painel do responsável (v64).
- **Não provado:** atualização **automática** do check-in na frequência da turma (elo check-in→attendance). A frequência é registrada pelo professor (FLUXO 3). → **RM-1.1**, fechado 12/11 por decisão de produto (a): permanece manual.
- **RM-1.1 medido 12/11 (read-only):** o elo automático **não existe** em nenhuma camada — 0 triggers sobre `gate_checkins`/`attendance`, nenhuma função escreve attendance a partir de check-in, e no front a única escrita é o upsert manual do professor (index.html:8131/18572). O que existe é ponte de **leitura**: `bfr_teacher_lesson_gate_evidence` (STABLE, index.html:18406) mostra a coluna «Portaria · evidência» na tela de frequência; `bfr_supervision_frequencia` agrega os dois lados lado a lado. Evidência: `evidence/roadmap-rm11-veredito.json`.
- **RM-1.1 FECHADO 12/11 por decisão de produto — opção (a), «manter manual com evidência»** (registro em `evidence/roadmap-rm11-decisao.json`). A frequência continua sendo ato do professor, com a portaria visível na mesma tela; o critério de conclusão («E2E provado **OU** decisão de produto registrada») foi cumprido pela segunda cláusula. **RM-3.1 fica CANCELADO** e **PEN-14** é fechada por decisão, não por implementação. Nada muda no código — o caminho escolhido já é o vivo. Consequência aceita: **nenhum DDL, nenhuma policy nova, nenhuma publicação** de ponte check-in→`attendance`; e o resíduo continua conhecido — o atraso da frequência e o vínculo de confiança ficam no sistema. Reabre com opção (b) (1 clique, só front) ou (c) (automático, exige DDL + OK novo).

### FLUXO 2 — TRANSPORTE ESCOLAR
`Aluno → Embarque → Monitor → QR → Registro → Responsável → Notificação`
- **FECHADO 11/12 (C2R):** jornada viva 47/0 com JWT real — trigger `trg_route_incidents_notify_guardian` escreve `notification_status=sent` + `notified_at`, nasce **1** `student_messages` (destinatário = responsável, remetente = monitor), o parent lê pela API, sem duplicação. **FUNCIONANDO.** *Nota 12/11 (RM-1.3):* o «→ Notificação» deste fluxo é **in-app/realtime** (`student_messages`); não depende do FCM push, que está partido no cliente (RM13-A1).

### FLUXO 3 — FREQUÊNCIA ESCOLAR
`Professor → Registro de presença → Banco → Coordenação → Direção → Responsável`
- **Provado:** E2E do professor (ciclo v59, incluindo frequência geminada); BU T3 (professor→aluno→responsável). Coordenação/Direção leem os dados (painéis medidos). **FUNCIONANDO.**

### FLUXO 4 — COMPORTAMENTO
`Professor → Registro de comportamento → Sistema → Responsável → Coordenação → Relatórios`
- **Provado:** BU T5 (comportamento→coordenação→responsável + canais). **FUNCIONANDO.**

### FLUXO 5 — ATIVIDADES ESCOLARES
`Professor → Publicação → Aluno → Realização → Professor → Acompanhamento do responsável`
- **Provado:** BU T2 (publicar→receber→corrigir, APROVADO após correção do item 50). **FUNCIONANDO.**

### FLUXO 6 — GESTÃO PEDAGÓGICA
`Professor → Informações pedagógicas → Coordenação → Indicadores → Direção`
- **Provado por peça:** indicadores da Coordenação e do painel executivo da Direção renderizam com dados do banco (relatório B.1/B.2); comunicação professor↔coordenação via chat (v66). **FUNCIONANDO** (sem relatório de indicadores automático entre camadas — produto).

### FLUXO 7 — SUPERVISÃO EDUCACIONAL
`Escola → Dados consolidados → Secretaria de Educação → Indicadores da rede → Relatórios`
- **Provado:** toda a infraestrutura (S16 Fase 0 + SQL 37/0), isolamento por escola com JWT real (S19/S20 21/21 + 20/20), fluxo solicitação→resposta→anexo→plano (S16/S17). **Pendente de produto:** indicadores agregados da rede e relatórios comparativos (U.06, PF). **PARCIALMENTE IMPLEMENTADO no elo final.**

### FLUXO 8 — AEE
`Profissional de AEE → Registro de atendimento → Evolução → Coordenação → Responsáveis (informação autorizada)`
- **Provado:** realtime em 4 canais (V71C/V71D); guard de visibilidade ao responsável existe (`bfr_family_can_view_aee` medido `false`/`null` na superfície anon e gateado por vínculo). **FUNCIONANDO.**

### Integrações verificadas como inexistentes / falhas históricas corrigidas
| Integração | Estado |
|---|---|
| Realtime com tabela fora da publication derrubava o canal inteiro | **Corrigido** (v70; memória do censo §V.8–V.10) |
| Thenable preguiçoso do supabase-js (upsert/marcar-lida nunca enviava) | **Corrigido** (v62/v66) |
| Ciclo de policies em `profiles` (42P17) abortava o boot | **Corrigido** (11/12, candidata aplicada, 6/6 sondas) |
| POST direto em `gate_checkins` (sem policy de escrita) | **Desenho:** caminho sancionado é a RPC; antes dava 500/42P17, hoje 403 de desenho |
| Check-in→frequência automática | Não existe — **decidido 12/11 (opção a em RM-1.1):** permanece manual com evidência na tela; RM-3.1 cancelado |
| Semiestado `pending` → promoção administrativa | A promoção **existe e foi medida** (RM-1.2); o `pending` como estado vivo **não existe** — `handle_new_user` nunca escreve `pending` (RM12-A1) |
| Indicadores da rede (supervisão) | Não existe (U.06) |
| Duplicação de informações entre módulos | Nenhuma duplicação de dados identificada nas provas (baselines por contagem+md5 estáveis) |

---

## 7. MAPA DE BANCO DE DADOS E ARQUITETURA

**Censo vivo (read-only, 12/11 04:07Z, `evidence/roadmap-censo-db.json`):**

| Métrica | Valor |
|---|---|
| Tabelas no schema public | 176 |
| Tabelas com RLS | 176 (100%) |
| Policies | 475 — todas com USING/WITH CHECK |
| Funções públicas | 126 (115 SECURITY DEFINER) |
| Triggers | 78 (64 no schema public) |
| Tabelas na publication realtime | 75 |
| Buckets de storage | 9: activity-media, collaboration-files, internal-chat-media, learning-evidence, project-media, school-documents, secretary-attachments, staff-files, student-photos |
| Papéis no enum | 15 |
| Contas/auth | 21 usuários auth, 21 profiles |
| Alunos | 848 |

**Diagrama de relacionamento (entidades principais):**

```
auth.users ──1:1── profiles (role enum, escola via staff_schools)
profiles ──1:N── staff_schools ──N:1── schools
profiles ──1:N── guardian_students ──N:1── students
students ──N:1── classes ──N:1── schools
students ──1:N── grades · attendance · gate_badges · gate_checkins
students ──1:N── school_activities (publicação por pedagogical)
classes ──N:M── profiles (bfr_teacher_class_subjects)
students ──1:N── route_incidents ──trigger── student_messages ──N:1── profiles (parent)
supervision_requests ──1:N── supervision_responses ──1:N── supervision_response_attachments
supervision_requests ──1:N── supervision_action_plans · supervision_alerts · supervision_audit
profiles ──1:N── support_requests ──1:N── support_messages
profiles ──1:N── announcements · occurrences · internal_chat_messages
students ──1:N── learning_action_plans · psychology_referrals/articulations/meetings
students ──1:N── family_* (Proteção Familiar: pareamento, localizações, notificações)
storage.objects (9 buckets) ──FK textual── supervision_response_attachments
```

**Estruturas por domínio:**
- **Identidade/acesso:** `auth.users`, `profiles` (papel + vínculos), `access_requests` (solicitação pública), `guardian_students`, `staff_schools`.
- **Escolar:** `schools` (6), `classes` (27), `students` (848), `grades` (112), `attendance` (25), `school_activities`, `occurrences`, `announcements`, `bfr_grading_rules`.
- **Portaria/transporte:** `gate_badges` (843), `gate_checkins` (193), `route_incidents`, `student_messages`, `gate_entry_alerts`.
- **Supervisão:** 6 tabelas `supervision_*` + `staff_schools`; policies com filtro de escola; triggers de auditoria.
- **Comunicação:** `internal_chat_*`, `announcements`, notificações; realtime 75 tabelas.
- **AEE/apoio:** `learning_action_plans`, `psychology_*`, `support_*`.
- **Esportes:** `sports_*` + 5 views `sports_public_*` (corrigidas).
- **PF:** tabelas de pareamento/localização + trigger de emissão + Edge.

**Achados da análise (integridade e riscos):**
- **Dados duplicados:** não identificados — baselines por contagem E md5 de 12+ tabelas permanecem estáveis entre ciclos.
- **Dados sem relacionamento:** nenhuma linha órfã encontrada nas limpezas FK-safe (ordem de DELETE exercitada nos ciclos).
- **Riscos de inconsistência:** (1) `storage.objects.owner_id` é TEXT, não uuid — filtros por dono exigem literais textuais (armadilha documentada); (2) DELETE direto em storage é bloqueado por trigger `protect_delete()` — caminho único é a Storage API; (3) funções novas ganham EXECUTE a `anon` por padrão do Supabase — re-verificação obrigatória após cada migration; (4) views sem `security_invoker` rodam como dono (BYPASSRLS) — checklist ao criar views.
- **Gargalos:** 55 MutationObservers no shell (22 sobre `document.body`) → latência/CPU mobile (dívida RM-4.1); cascata de mutações residual no menu mobile (item 77).
- **Exposição:** 0 tabelas sem RLS; 0 policies sem filtro; 0 oráculos anon; escrita de `anon` revogada de 156→22 tabelas (as 22 com policy anon legítima). Nenhuma credencial consta deste documento.

---

## 8. MAPA DE NAVEGAÇÃO E DESIGN

### MOBILE (320–768 px) — medido em 6 larguras, 164 telas por largura
| Largura | Travadas | Em branco | Estouro painel | Tap<44 | Fonte<11 | Cortados |
|---|---|---|---|---|---|---|
| 320 | 0 | 0 | 14 | 60 | 58 | 16 |
| 360 | 0 | 0 | 19 | 85 | 85 | 17 |
| 375 | 0 | 0 | 19 | 85 | 87 | 16 |
| 390 | 0 | 0 | 11 | 73 | 67 | 14 |
| 430 | 0 | 0 | 17 | 89 | 88 | 17 |
| 768 | 0 | 0 | 3 | 84 | 92 | 8 |

- Boot @390: ~2–4 s; cascata de mutações: 0 nós/s no publicado (medido com probe corrigido).
- Correções aplicadas: trava do boot (cascata cortada, 167.611→7.434 disparos), FAB/LIA acima do piso do menu, Chrome mobile no `bfr:app-ready`, botões de login (v116), fonte ≥11 px (17 lotes), tap ≥44 px (lotes), menu mobile (v111/v112).
- **Pendências mobile:** item 77 (fome de timers residual — produto, N.02); tap<44 e fonte<11 residuais concentrados em elementos não-interativos/decorativos.

### WEB / DESKTOP (1024–1920 px)
| Largura | Telas | Travadas | Estouro página | Tap<44 | Fonte<11 |
|---|---|---|---|---|---|
| 1024–1920 | 164 | 0 | 0 | 155–156 | 88–89 |

- Boot @1280: ~1–2 s; 0 estouro horizontal; Direção fechada em 15/15 rotas.
- **Notas honestas:** tap<44 na banda web é **deliberado** (alvos de mouse, não touch); fonte<11 em prosa decorativa não afeta usabilidade; 260 de 323 linhas da primeira passada web mediam o container da view e foram re-medidas com o mapa de alvos (138 alvos trocados).

### Problemas de layout identificados e estado
| Problema | Estado |
|---|---|
| Overlay executivo esconde painéis legados (Direção) | Aberto (produto, D.07) |
| Chip «Atualizando dados…» preso sem request em voo | Corrigido (item 51) |
| FAB/LIA sobrepostos ao menu mobile | Corrigido (item 50) |
| Modal de horários não fechava | Corrigido (v117/v118) |
| Tela em branco coordinator/comunicação | Corrigido (item 10) |
| Menu mobile sumido (Coordenação) | Corrigido (v111/v112) |

---

## 9. MAPA DE SEGURANÇA E PRIVACIDADE

| Camada | Estado | Evidência |
|---|---|---|
| **Login Google** | Cadeia completa provada (code→pkce→token→sessão→shell) | V93G2 |
| **Autenticação** | JWT 1 h + refresh; validação de `expires_at` no boot | v116; S20 renovação por refresh_token |
| **Permissões por cargo** | 15 papéis; matriz de autorização aplicada no banco (RLS), não só na UI | S19/S20 matriz RLS; C7 cross-role |
| **Controle de sessão** | Contas sintéticas com protocolo por ciclo (OK explícito, limpeza FK-safe, baseline contagem+md5); 0 contas vivas ao fim de cada ciclo | S16–S20, C2R, BU |
| **Proteção de rotas** | Guards por papel real (não pela view trocada); `roleSectionAccess` por papel | item 9 (áreas de plataforma) |
| **Regras do banco** | 176/176 tabelas RLS; 475/475 policies com filtro; 0 `USING (true)` | Censo 12/11 |
| **Superfície anon** | 56 funções medidas como anon: 0 devolvem dado de terceiro; escrita revogada 156→22 tabelas. **Censo 12/11: 157 relações alcançáveis por `anon` (156 tabelas + 1 view) → 0 devolvem linha; 4 recusadas com 401** | F.6.c; `evidence/rm14-censo-anon.json` |
| **Views** | 6 vistas em `public`: as 5 `sports_public_*` são *definer* (dono `postgres`, BYPASSRLS) **sem SELECT para anon** e autolimitam-se por `sports_role_allowed(...)`; `support_professionals_directory` é `security_invoker=true` | F.3; `evidence/rm14-censo-views.json` |
| **Anti-clique-jacketing** | **Ausente em todas as camadas medidas** — sem `X-Frame-Options`, sem `frame-ancestors` (nem no header CSP nem em `<meta>`), sem `Permissions-Policy`, sem COOP | RM14-A1 (`evidence/rm14-suite.json`) → PEN-24 |
| **Dados pessoais / menores (LGPD)** | Testes 100% com contas `@bfr-conecta.test` sintéticas; 0 dados reais lidos além de contagens; limpeza provada | Relatório F.7 |
| **Localização GPS** | PF: localização só mediante pareamento explícito; desvincular/re-parear; teto de 30 min/responsável | v85–v88; §C.39/C.40 |
| **QR Codes** | Tokens de crachá; badge_token exposto **rodado** (P0, 10/11); censo 0 referências | P0/P2/P3 |
| **Logs** | `supervision_audit`, trilha de notas, `gate_checkins` (histórico), `gate_entry_alerts` | S16-5; item 14 |
| **Acessos administrativos** | developer lê 129/escreve 130; QR Dev exclusivo e oculto sem sessão | v97 |
| **CSP** | Publicada (P2/P3); camada B 0/12 | SEG-FIN-2 |

**Achados LGPD/segurança documentados:** (1) P0 — token de crachá exposto em histórico git → rotação completa executada, purga de histórico solicitada ao GitHub; (2) P1 — 19 arquivos com credenciais removidos do tracking; (3) P2/P3 — CSP + endurecimento; (4) armadilha de processo: `grant` a `anon` reaparece em funções novas → re-verificação após cada migration (portão); **(5) RM14-A1 — nenhuma proteção anti-clique-jacketing em camada alguma do que chega ao browser (PEN-24, prioridade A, aberto)**; **(6) RM14-A2 — `grades`, `attendance`, `access_requests` e `occurrences` estão fechadas ao anon por erro de privilégio dentro da qual da policy (42501 → HTTP 401), não por filtro de RLS: é *fail-closed* por acidente — um `GRANT` futuro abre a tabela sem tocar em nenhuma policy. As funções chamadas pelas quals têm ACL nominal sem `anon` — `public."current_role"()` (colisão com palavra reservada, memória de projeto) e `public.is_developer()`, ambas `prosecdef=true` com `acl={postgres,authenticated,service_role}`; `occurrences` exige ainda `SELECT` em `staff_schools`, que anon não tem (PEN-25)**.

---

## 10. MAPA DE NOTIFICAÇÕES E AUTOMAÇÕES

| # | Evento disparador | Quem recebe | Quando | Canal | Informação transmitida | Configurável | Estado |
|---|---|---|---|---|---|---|---|
| 1 | Comunicado publicado | Responsáveis/alunos (Home) | Imediato (realtime) | Realtime postgres_changes → repaint | Texto do comunicado | Não | IF (v67/v70, `FRAME_70_OK` 18/18) |
| 2 | Check-in na portaria | Responsável (painel da portaria) | Imediato (realtime) | Realtime `gate_checkins` | Entrada/saída do filho | Não | IF (v64) |
| 3 | Ocorrência de rota (transporte) | Responsável | No registro da ocorrência | Trigger `trg_route_incidents_notify_guardian` → `student_messages` | Ocorrência do trajeto | Não | IF (C2R 11/12, jornada 47/0) |
| 4 | Localização PF (reportada) | Responsável | Emissão com teto 30 min/responsável + 5 min/aluno | Trigger `bfr_pf_notify_location` + Edge v23 + FCM push | Posição do aluno | Parcialmente (teto) | IF até à **aceitação** (`sent:1`, medido 12/11); **exibição partida no cliente** → P.08 ICP / RM13-A1 |
| 5 | Notificação geral da escola | Assinantes push | Envio administrativo | Edge `send-school-notification` v23 + FCM | Texto administrativo | Sim (envio) | IF infra (§CX 107–110 todas 200); **0 assinantes hoje** (`push_subscriptions`=0 linhas, medido 12/11) |
| 6 | Mensagem no chat interno | Participantes | Imediato | Realtime + in-app | Mensagem | Não | IF (v66) |
| 7 | Notificação in-app «marcar como lida» | Destinatário | — | In-app | Estado de leitura | Não | IF (v62) |
| 8 | Mudanças nas 75 tabelas publicadas | Papéis autorizados | Imediato | Realtime | Dados da linha | Não | IF (item 57; AEE V71C/D) |

**Duplicadas:** nenhuma duplicação medida (C2R provou que ocorrência já `sent` não re-emite). **Ausentes (planejadas):** notificação automática de frequência/nota ao responsável (hoje o responsável consulta, não é notificado) → RM-3.4. **Enviadas incorretamente:** 0 casos vivos (produtor inativo §DD era silêncio de produtor, não defeito). **Vocabulário obrigatório (armadilha §C.30, re-aplicado 12/11):** *emitida → aceita (`sent:1`) → exibida → vista*; os eventos 4 e 5 estão provados **até à aceitação**; a exibição está bloqueada pelo defeito do cliente (RM13-A1), e hoje não há linha alguma em `push_subscriptions` que a pudesse receber. Os canais 1, 2, 3, 6, 7 e 8 são realtime/in-app e não dependem de push — continuam IF.

---

## 11. TESTES FUNCIONAIS E CENÁRIOS REAIS

### Infraestrutura de teste existente
- Harness CDP autenticado com **firewall de escrita** no navegador; varreduras de 164 telas × 10 larguras; 1.281 cliques reais com hit-test; A/B controle×candidata; ciclos E2E mint→teste→limpeza→baseline (30+); censo vivo 6 boots @390 + controle @1280 por versão; prova HTTP 3 fetches + md5 + Chrome limpo por publicação; 424+ armadilhas de instrumento documentadas.
- **Suite mínima automatizada (RM-1.4, 12/11):** `node scripts/rm14-suite.mjs` — um comando, **somente leitura** (SELECT de catálogo + HTTP GET + uma recusa de login), sai 0/1 e grava `evidence/rm14-suite.json`. 31 portões em 3 blocos: **boot** (HTTP, 3,47 MB de shell, `#appShell`, `createClient`, chave publicável extraível e ≠ `service_role`, zero credencial de serviço nos bytes, CSP/X-Content-Type-Options, rota do SW e a marca `CACHE=bfr-conecta-v118` lida do SW — não há marcador de versão no shell), **login** (GoTrue sano com `apikey`, credencial falsa recusada e sem devolver token), **RLS** (11 tabelas da amostra, amostra validada contra o catálogo antes de sondar, 168/168 tabelas alcançáveis com RLS, vistas definer inalcansáveis a anon + lista conhecida de vistas por `authenticated`, 0 contas `pending`).
- **Estado do veredicto:** `RM14_SUITE_VERDE` — 30 verde, **1 amarelo** (RM14-A1, lacuna registrada com portão próprio: sem proteção anti-clique-jacking), 0 vermelho. O amarelo só existe porque a lacuna tem item no roadmap; um portão vermelho sem lacuna registrada fecha a suite com exit 1.
- **Controle negativo do instrumento (obrigatório, 12/11):** a mesma suite apontada a uma origem que não é o app devolve `RM14_SUITE_VERMELHA` 21/31 com **exit 1** — prova de que a suite sabe falhar. Alvo sempre **derivado do diário mais recente**, nunca dactilografado.
- **Sondas do RM-1.3 (entrega push, 12/11):** `scripts/rm13-sonda-rotas.mjs` — HTTP somente leitura às 14 rotas fixas + os 12 ficheiros do bundle com md5 dos **bytes** (não da string: PNG/PDF nunca bateriam), página de erro da Cloudflare reconhecida no **corpo** (`PAGINA_CF`, porque o detetor antigo dava `erroCF=false` para um 500 confirmado), extração de referências **só do documento** (corpos de `script|style|noscript|svg` removidos — ver o falso achado das «17 URLs» em §5.4), censo de linhagem dos diretórios `worker-deploy-v*` e marcas de push nos bytes servidos. Veredito `RM13_CADEIA_PARTIDA`, **8 verdes / 6 vermelhos de 14**, exit 1; artefacto `evidence/rm13-rotas.json` (20 KB). Complementos: `evidence/rm13-aparelho.json` (estado vivo das 4 camadas: aparelho/banco, emissor, Edge, cliente), `evidence/rm13-alcancabilidade.json`, `evidence/rm13-marcas-shell.json`, `evidence/rm13-sw-disco.json`. Higiene de diário aplicada: o primeiro artefacto pesava 10,7 MB porque cada resposta levava o corpo inteiro; com `resposta(p,{corpo})` + `trecho` truncado ficou nos 20 KB **com os mesmos veredictos** — e o portão do manifesto teve de ser religado a um fetch `{corpo:true}`, senão passaria a apanhar `{erro:…}` em silêncio.
- Sondas auxiliares do ciclo: `scripts/rm14-censo-anon.mjs` (157 relações alcançáveis por anon, 0 vazam linhas), `scripts/rm14-censo-views.mjs` (dono/BYPASSRLS/`security_invoker` + contagem por papel dentro de `begin; set local role …; rollback`), `scripts/rm14-sonda-*.mjs` (atribuição dos vermelhos).
- **Auditoria das cifras deste documento (12/11):** `node scripts/rm-audit-numeros.mjs` — **somente leitura**, confere cada número das seções 9, 11 e 15 e do painel contra o artefacto que o afirma, com a âncora amarrada à própria linha (procurar a cifra em qualquer ponto do ficheiro não é portão: `176/176` existe em três linhas diferentes). As contagens **não se dactilografam nesta linha**: o comando imprime `cifras amarradas: N · módulos do §5 conferidos: M` e `SOMAS MEDIDAS …`, e é essa saída que se cita — um número copiado para a prosa envelhece a cada âncora nova (armadilha da re-contagem), por isso **re-contar, não repetir**. As tarefas RM-x.y e as PEN-xx são recontadas por parser sobre as tabelas. Veredito: `AUDITORIA_VERDE` (exit 0).
- **Controle negativo da auditoria (obrigatório):** `node scripts/rm-audit-controle.mjs` — monta uma bancada descartável, exige `AUDITORIA_VERDE` com o artefacto honesto e depois corrompe **o artefacto** (não o documento) em 3 frentes (`rls_no_catalogo.alcancaveis` 168→167, `portoes` 31→30, `falhas []→[x]`); as três têm de dar exit 1. Resultado medido: `CONTROLE_NEGATIVO_OK positivo verde · N/N artefactos corrompidos foram pegados`, com o N lido da própria saída (re-contar, não repetir). A primeira versão deste portão **falhou em ser portão**: corrompia o documento e passava, porque a cifra esperada vivia dentro do script e a busca era por substring.

### Cenários do brief — resultado medido
| Cenário | Resultado | Evidência |
|---|---|---|
| Aluno entrando na escola (QR→porteiro→registro→responsável) | APROVADO (sem elo automático p/ frequência) | T79 E2E, §CR/§CV; v64 |
| Monitor registrando embarque | APROVADO | BU-P; C2R jornada 47/0 |
| Porteiro lendo QR Code | APROVADO | v102/v103; §DJ `CAM_QR_OK` (câmera) |
| Professor registrando frequência | APROVADO | E2E v59 |
| Professor registrando frequência geminada | APROVADO | E2E v59 |
| Professor enviando atividade | APROVADO | BU T2 |
| Responsável recebendo notificação | APROVADO **no canal in-app/realtime** (v62/v67/v70; transporte via C2R). Push físico: **não aprovado** — cadeia partida no cliente (RM-1.3 12/11) | §CR/C2R; `evidence/rm13-rotas.json` |
| Coordenação consultando ocorrências | APROVADO | F52B 201 em 982ms |
| Direção consultando indicadores | APROVADO | 15/15 rotas |
| Secretaria realizando cadastro | APROVADO | Ciclo SECRE 85/85 |
| Profissional de AEE registrando atendimento | APROVADO | V71C/V71D (realtime) |
| Secretaria de Educação acompanhando indicadores | APROVADO no isolamento; indicadores agregados = PF | S19/S20; U.06 |

### Verificações solicitadas (botões sem ação, erros, permissões)
- **Botões sem ação:** varredura de clique 1.281 cliques → 3 «mortos» + 4 «desabilitados» atribuídos e corrigidos; «Marcar em análise» é o único resíduo (módulo morto, produto).
- **Erros de salvamento/carregamento:** thenable preguiçoso (v62/v66), RPC inexistente na portaria nova (v102), modal horários (v117/v118), boot congelado (v34+) — todos corrigidos e provados.
- **Dados que não atualizam:** realtime corrigido (v67–v70, item 57); assinatura fora da publication derrubava o canal (v70).
- **Sincronização:** 42P17 (ciclo de policies) resolvido 11/12 com prova comportamental 47/0.
- **Permissões incorretas:** 10 gaps de policy fechados em 3 lotes (08/11); 3 gaps C7 fechados; RLS provada behavioralmente com JWT real (S19/S20).
- **Dispositivos móveis:** censo vivo 6 boots @390 + controle @1280 por versão; 0 defeitos novos nas versões finais.
- **Versão web:** 0 estouro de página em 4 larguras; 0 travadas.
- **Ética dos testes:** todas as provas com contas sintéticas `@bfr-conecta.test` em ciclos com OK explícito e limpeza FK-safe; **nenhum dado real de aluno ou funcionário alterado** (prova por baseline contagem+md5).

---

## 12. LISTA DE BUGS E PENDÊNCIAS

Legenda de prioridade: **C** crítica · **A** alta · **M** média · **B** baixa.

| ID | Item | Tipo | Prioridade | Estado |
|---|---|---|---|---|
| PEN-01 | Menu mobile: fome de timers residual (item 77) | Produto/desempenho | M | Aberto — mitigado (v111/v112); RM-2.1 |
| PEN-02 | XP/Trilhas/Conquistas hardcoded (D6) | Produto | B | Aberto — RM-2.9 |
| PEN-03 | Hero do aluno usa `official_name` (item 86) | Produto | B | Aberto — RM-2.4 |
| PEN-04 | Home do aluno: falha silenciosa `@9392` (item 85) | Produto | B | Aberto — RM-2.5 |
| PEN-05 | «Marcar em análise» só no módulo morto | Produto | M | Aberto — RM-2.3 |
| PEN-06 | Overlay executivo esconde painéis legados (Direção) | Produto | M | Aberto — RM-2.2 |
| PEN-07 | Modo offline da portaria (T4.6) | Não implementado | B | PF — RM-5.1 |
| PEN-08 | Turno/calendário real da portaria (87b) | Não implementado | B | PF — RM-5.2 |
| PEN-09 | Crachá físico impresso (teste real) | Hardware | B | PF — RM-5.3 |
| PEN-10 | Câmera de dispositivo real (teste físico) | Hardware | B | PF — RM-5.3 |
| PEN-11 | Push em aparelho físico (entrega real) | Validação | M | ICP — medido 12/11 (RM-1.3, `RM13_CADEIA_PARTIDA`): partida no cliente (PEN-26), não falta de aparelho; reparo RM-1.5, exibição continua por provar |
| PEN-12 | Conta real de professor com vínculo vivo (render completo) | Validação | M | NT — RM-2.7 |
| PEN-13 | Aprovação administrativa de contas (pending→papel) | Produto | A | Medida 12/11 (RM-1.2, 57 portões/0); ICP por RM12-A1 — o estado `pending` nunca é escrito |
| PEN-14 | Elo check-in→frequência automática | Integração | A | FECHADA 12/11 por decisão de produto (a): manual com evidência; RM-3.1 cancelado |
| PEN-15 | Sincronização cruzada da gestão administrativa como cenário único | Validação | M | NT — coberto em parte pelo C7; RM-2.6 |
| PEN-16 | Indicadores da rede / relatórios comparativos (Supervisão) | Não implementado | A | PF — RM-3.2/RM-3.3 |
| PEN-17 | Notificação automática de frequência/nota ao responsável | Não implementado | B | PF — RM-3.4 |
| PEN-18 | 55 MutationObservers no shell (22 sobre body) | Dívida técnica | M | Aberto — RM-4.1 |
| PEN-19 | Escritor periódico `navButton` (1,2 s) — candidata pronta, não publicada | Dívida técnica | B | Aberto — RM-2.8 |
| PEN-20 | Suite de testes não organizada (Playwright/Vitest) | Dívida técnica | M | Aberto — RM-6.1. **Parcialmente fechado 12/11:** a suite mínima boot+login+RLS existe e corre (`scripts/rm14-suite.mjs`, 31 portões, RM14_SUITE_VERDE); falta a suite de produto (UI/papéis) |
| PEN-21 | Load testing nunca executado | Dívida técnica | B | Aberto — RM-4.6/RM-6.4 |
| PEN-22 | `grant` a `anon` reaparece em funções novas (processo) | Higiene | A | Portão de re-verificação criado 12/11 (`scripts/fin2-higiene-rm62.mjs`): censo medido **147 funções · EXECUTE a anon em 57 · a public em 56 · 0 com `proacl` nula** (`evidence/fin2-higiene-rm62.json`) |
| PEN-23 | Views novas exigem `security_invoker` (processo) | Higiene | A | Checklist com número medido 12/11: **6 views em `public` — 1 com `security_invoker` (`support_professionals_directory`) e 5 sem, todas de dono `postgres`** → correm como dono/BYPASSRLS |
| PEN-24 | **RM14-A1 — nenhuma proteção anti-clique-jacketing**: sem `X-Frame-Options`, sem `frame-ancestors` (header ou `<meta>`), sem `Permissions-Policy`, sem COOP nos bytes que chegam ao browser (v118-csp e também 09/11 — não é regressão da CSP) | Segurança | A | Aberto — RM-6.7. Portão AMARELO na suite (`boot.anticlickjacking_deny_or_sameorigin`) |
| PEN-25 | **RM14-A2 — 4 tabelas fechadas ao anon por privilégio, não por RLS** (`grades`/`attendance`→`public."current_role"()`, `access_requests`→`is_developer()`, `occurrences`→`SELECT` em `staff_schools`): fail-closed acidental, um `GRANT` futuro abre sem tocar em policy | Segurança/higiene | A | Aberto — RM-6.8. AVISO impresso a cada execução da suite. **Causa medida 12/11** (não atribuída): `has_function_privilege('anon', public."current_role"()', 'EXECUTE') = FALSO` e a mesma em `authenticated = VERDADEIRO` → o 42501 é do privilégio, exactamente o que um `GRANT` futuro eliminaria (`evidence/fin2-higiene-rm62.json`, portão `pen25_causa_…`) |
| PEN-26 | **RM13-A1 — cadeia de push partida no cliente**: os 3 `serviceWorker.register` apontam `/sw-v4.js?v=45` (`app/index.html:9188`, `:12290`, `:19543`) e essa registration é entregue ao FCM `getToken()` (`:9189`, `:19537–:19548`), mas o SW servido (md5 `3fcbc3ad52f1a0491362506466c82596`, 3 586 B) só tem ouvintes `install`/`activate`/`fetch` — **sem `push`, sem `notificationclick`, sem `importScripts`**; e os 3 489 467 B do shell nunca citam `firebase-messaging-sw` (`firebase_messaging_sw=0`). Logo, mesmo com assinatura criada, o push acorda um SW que não mostra nada | Notificações | A | Aberto — RM-1.5. Portões vermelhos S1/S2/S3/M3 + S4 em `evidence/rm13-rotas.json`; as duas falhas de runtime possíveis (`getToken` recusa × push sem ouvinte) **não se separam sem aparelho** |
| PEN-27 | **RM13-A2 — caminhos fora dos 12 ficheiros do bundle devolvem 500 da Cloudflare em vez de 404**: `worker-deploy-v118-csp/worker.mjs:37` passa a **string** `url.pathname` a `env.ASSETS.fetch()`, que lança. Afetam `/firebase-messaging-sw.js`, `/manifest.webmanifest`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` e qualquer rota (`/aluno`, `/coordenacao`): 6 vermelhos nos 14 portões | Infra/Worker | A | Aberto — RM-6.9. Os 12 ficheiros do bundle servem-se **byte-idênticos** ao disco (12/12); o defeito é só dos caminhos fora dele |

| PEN-28 | **9 formas de consulta do ar falham no PostgREST.** Sobre 248 pares `(origem → select)` extraídos dos bytes vivos (v118), **239 devolvem HTTP 200 e 9 falham**: 5× PGRST201 (embed ambíguo `guardian_students → profiles`), 5× PGRST205 (tabelas inexistentes — PEN-29), 1× 42703 (`announcements.created_at` — PEN-30), 1× PGRST200 (relação `supervision_requests → schools` — PEN-31). Atribuídas a **12 sítios de emissão** no ar: **6 engolidas** por `request()`/`safeQuery()` (os dois corpos têm `catch` e não relançam → painel vazio sem mensagem), **4** pegas no `catch` do próprio `load()`, **2** propagam sem `catch` | Dados/consulta | A | Aberto — criado 12/11 na passada FIN-2 (`evidence/fin2a-censo-embeds.json`, `evidence/fin2b-ruins-catalogo.json` 9 portões/0 falhas, `evidence/fin2c-atribuicao-ruins.json` 8 portões/0 falhas, exit 0). **Re-emitido 13/11 sobre a v119 publicada** (baseline preservada em `evidence/fin2a-censo-embeds-v118.json`): 248 pares, **240 HTTP 200 e 8 ruínas, 0 novas** — saiu exatamente a do PEN-31; restam 3× PGRST201 de `guardian_students → profiles`, 4× PGRST205 das tabelas inexistentes (PEN-29) e 1× 42703 (PEN-30) |
| PEN-29 | **O front consulta 3 tabelas que nunca existiram no banco**: `bfr_school_shift_settings` (2 sítios), `bfr_school_calendar_days` (2), `bfr_school_calendar_month_targets` (1) — todas com PGRST205 «Could not find the table … in the schema cache». O catálogo (`pg_class` em `public`) não tem nenhuma relação com esses nomes, logo não é regressão nem cache vencida: é código que aponta para estruturas nunca criadas (portaria/calendário da §5.2) | Dados/consulta | M | Aberto — PEN-28; RM-5.2 (turno/calendário real) |
| PEN-30 | **`announcements.created_at` é selecionada e não existe** (42703, 1 sítio @linha 21911 do ar). A tabela tem `published_at` e `updated_at`; o `select` da Comunicação pede `created_at` e recebe erro — logo a ordenação/afinação por data de criação nessa consulta nunca viu uma linha | Dados/consulta | M | Aberto — PEN-28 |
| PEN-31 | **Regressão perdida entre a v115 e a v116 — o nome da escola some da Supervisão.** A FK viva é `supervision_requests_school_id_fkey → sports_schools`, e o embed correto é `sports_schools(name)` (probe: 200). O ar vivo tinha **1** ocorrência de `schools(name)` e **0** de `sports_schools(name)` → PGRST200. Conferência por vaga no disco: `worker-deploy-v115` tem os dois (1× `sports_schools(name)`); `worker-deploy-v116`, `-v117`, `-v118`, `-v118-csp`, `-v118-swclone`, `-v118-swfix` têm só `schools(name)`. O conserto do F1.3 existiu publicado e foi desfeito pela linha seguinte | Regressão/Supervisão | A | **FECHADA 13/11 — provada em três camadas sobre a v119 publicada, com JWT real de supervisor (§R do arquivo de auditoria, 52 portões / 0 vermelhos)** · criado 12/11 (PEN-28; `evidence/fin1f-item91-e-schools.json`). **Distinção medida 12/11:** `public.schools` **existe** como tabela (`relkind 'r'`), ao contrário das 3 do PEN-29 — logo o PGRST200 é FK em falta, não relação inexistente (`evidence/fin2-higiene-rm62.json`). **RM-1.6 13/11 — PUBLICADA (v119).** Hunk único linha 23684 `schools(name)` → `sports_schools(name)` (+7 B): shell servido 3.489.474 B md5 `a1969cdf023042e7d2a91e7ed9333a05` com **1** `sports_schools(name)` e **0** `schools(name)`; bundle `worker-deploy-v119` derivado do `worker-deploy-v118-csp` (o que servia o ar) — worker 3.550.715 B md5 `c41eef045d0110124e55d28304a99898`, `CACHE='bfr-conecta-v119'`, SW muda só a etiqueta. Portões re-contados pelo parser: pré-deploy **20/0** (`v119-preflight-diary.json`), HTTP pós-deploy **15/0** (`v119-postdeploy-http-diary.json`), Chrome limpo **10/0** (`v119-chrome-limpo-diary.json`). Deploy wrangler 4.154.0 às `2026-11-13T03:45:52.507Z`: version `6aed50af-a8a1-4c2b-84ae-cb6eaec4770b`, anterior `9c467d0e-d16a-4c20-9e69-50ec3b40f433`, **0 assets reenviados**, 100 % do tráfego. Os 4 headers de segurança continuam só na rota do shell (nenhum no SW e em nenhum dos 12 assets); `caches.keys()==['bfr-conecta-v119']` com 8 entradas e o shell em cache já com o token novo; zero HTTP 400 / zero PGRST200 no tráfego de boot. **Prova autenticada 13/11 (S21):** o select exato extraído do ar (linha 23684, com `sports_schools(name)`) devolve **HTTP 200** com corpo `[]`; o controle negativo com o select antigo reproduz **400 PGRST200**; o **navegador** logado com JWT de `education_supervisor` emite o mesmo select e recebe **200 `[]`**, 0 erros de console, aba abre em 466 ms (`evidence/s21-diary.json` 17/0, `evidence/s21-navegador-b.json` 12/0 `S21_ABA_LOGADA_OK`, PNGs `s21--A-papel-real-v119.png` md5 `709a1d5cfffb7def9c9df8994035f737` e `s21--B-aba-supervisao-v119-logado.png` md5 `9c23a0c8104b46b9d29b5317c4c3ee58`). **Correção ao registro S18:** o JWT de supervisor **lê** `sports_schools` — 200 com 3 das 6 linhas, exatamente as da sua escola; a RLS não recusava. Baseline restaurada por contagem **e** md5 nas 6 tabelas (`evidence/s21-limpeza.json` 23/0 `S21_L_LIMPO`); conta sintética removida com 404 e 0 sessões. Reversão byte-a-byte pronta em `worker-deploy-v118-csp` (3.550.708 B md5 `ae115858d263a02bb777cc474ce17297`) e **pede OK novo** |
| PEN-32 | **O `setRole()` não conhece o papel `education_supervisor` — a aba Supervisão é inalcançável pela conta real.** Lido dos bytes publicados da v119 (`evidence/s21-setrole.json`): `setRole` começa na linha 9901 e tem **12 ramos** no guard `allowed`, **nenhum** deles mirando `education_supervisor`; o papel só entra como *perfil* dentro do ramo `secretary` (`['secretary','education_supervisor','developer']`), nunca como papel de navegação. Consequência medida: com a conta real logada o shell cai em `parentView` com 5 itens de menu e **a aba Supervisão não existe** (estado A); `setRole('secretary')` faz a aba aparecer (estado B). Os mapas que **conhecem** o papel são contraditórios: `roleSectionAccess.education_supervisor` = 12 seções incluindo `supervisao`; `viewIds.education_supervisor = 'secretaryView'` (linha 18733); `if (role === 'education_supervisor') setupSecretaryView();` (linha 9948) está **depois** do guard que retorna → código morto; e o `allowed()` do módulo Supervisão (linha 23632) exige `['secretary','education_supervisor'].includes(role())`, que não se cumpre pelo caminho real. Não é regressão da v119: é estrutura do roteador | Supervisão/navegação | A | **Aberta 13/11 na passada S21 (§R.4 do arquivo de auditoria)** — dona **RM-1.7**; nada foi alterado nesta passada (mint + UPDATE do papel na linha que o próprio trigger criou; **0 escritas em tabelas de produto**). **13/11 — corrigida em CANDIDATA e medida por bancada (§S do arquivo de auditoria):** v120 com 3 hunks no roteador (H1 :9902 ramo do guard, H2 :9926 `secretaryView` deixa de ficar hidden, H3 :10145 `activeView` resolve), **+175 B, 28.661 linhas nos dois lados, só 3 linhas alteradas, linhagem reversa byte-a-byte**, portões **28/0**. Bancada A/B offline v3 **43 portões / 0 vermelhos** (`RM17_BANCADA_V3_OK`): na candidata `activeView='education_supervisor'`, `secretaryView` visível, 13 abas no DOM e a aba `supervisao` com caixa de layout e corpo pintado (563 chars); no controle v119 nada disso acontece e a aba só aparece quando o rig chama `setRole('secretary')` — o achado outra vez. Baseline das 5 tabelas imutável por contagem **e** md5 antes × depois; **0 deploy, 0 mint, 0 DDL, 0 INSERT, 0 escrita no backend** na passada da bancada. **FECHADA 13/11 às 06:49Z pela publicação da v120** sob OK literal «Autorizo, publica a v120» (escopo: só este deploy do Worker; nenhuma DDL, nenhuma escrita em banco, nenhum deploy de Edge): `version_id 8cad1145-a975-4fd6-8a7b-2fd4e9a4209c` a 100 %, anterior `6aed50af-a8a1-4c2b-84ae-cb6eaec4770b`, shell servido 3.489.649 B md5 `a9a76d0e338c2a539135bccce23111b4`, H1/H2/H3 `novo=1 velho=0` no ar, linhagem reversa → v119 byte-a-byte, PEN-31 preservada (`sports_schools(name)`=1 / `schools(name)`=0), cadeia **125 portões / 0 vermelhos** (28 candidata + 43 bancada v3 + 26 preflight + 18 HTTP + 10 Chrome limpo). Fica **pendência nova de produto** o que a v120 não toca: H4 (:10425 item Secretaria no menu) e H5 (:10437 `accountLabels` sem a chave `education_supervisor`) — o rótulo da conta continua «Responsável»; e falta a prova com **conta real** de `education_supervisor` clicando na aba no ar (a S21 foi medida na v119 com o contorno `setRole('secretary')`). Diário `audit-publicacao-v120.json`, §S.5 do arquivo de auditoria. **Correção 13/11 (§T):** dos dois resíduos, **só H5 é pendência** — H4 (item do menu) foi medido e **falsificado**: `syncRoleNavigation` (:10434; definição :11383; re-escrita :11386) roda **depois** do toggle :10425 e re-escreve `hidden` de todos os itens a partir de `roleSectionAccess.education_supervisor` (:9018, 12 seções com `secretaria`); a bancada v2 mede `item_secretaria_sidebar_hidden=false` **e** o item com caixa de layout nas duas bandas a 1280, e na gaveta a 390 nas duas bandas. O rótulo da conta passou a **PEN-33** |

| PEN-33 | **O chip da conta chama «Responsável» a quem é Supervisor(a) de ensino.** Lido dos bytes da v120 (`evidence/h45-medicao-diary.json`, 18 portões/0): `accountLabels` (:10437) tem **12 chaves** (`developer, director, pedagogical, aee, psychology, social_work, sports_operator, monitor, gatekeeper, secretary, student, parent`) e **nenhuma** `education_supervisor`; a linha de uso :10438 é `accountLabels[role] || accountLabels.parent` → cai no **fallback do `parent`**, e a :10440 pinta no chip o **2º** elemento do par (`account[1]`), cujo valor no fallback é «Responsável» (1 uso de `account[1]`, 0 de `account[0]`). O rótulo que o app já dá ao papel existe noutro sítio — `profileRoleOptions` :8987, linha :9001, **`Supervisor(a) de ensino`** — e é de lá que a candidata tira o valor. Não é regressão da v120: é chave que nunca entrou no mapa | Supervisão/rótulo | M | **Candidata v121 PRONTA e NÃO publicada** — criada 13/11 na passada H4/H5 (§T do arquivo de auditoria) a partir da medição `scripts/h45-medicao.mjs`. Candidata: base 3.489.649 B `a9a76d0e…` → **3.489.725 B `d418e7fc917f1fbb1437054b7b531f9b`**, Δ **+76 B**, **1 linha alterada (10437)**, `insert`, rótulos lidos dos bytes (:9001 e o par vizinho do mapa), linhagem reversa **byte-a-byte** à v120, **33 portões / 0 vermelhos** (`ROTULOS_OK`, `published:false`). Bancada A/B offline **v2: 60 portões / 0 vermelhos** (`H45_BANCADA_V2_OK`): controle «Responsável» × candidata **«Supervisor(a) de ensino»** a **1280 e a 390**, linha de nome idêntica nas duas bandas (prova de independência do papel), `0` escrita de tabela, `0` não-GET no backend, POSTs `/rpc/` todos de leitura no `pg_proc`, baseline das 5 tabelas imutável por contagem **e** md5. A v1 (50/6) teve 6 vermelhos **do instrumento**, todos triados e corrigidos na v2 (nome do chip = 1º token pela regra :10320 lida dos bytes; a 390 a sidebar não é a superfície — o predicado do menu é a classe `hidden`, não a caixa de layout). **Publicação = 1 deploy do Worker e pede OK literal novo**; a prova com **conta real** logada no ar continua por correr |

**Histórico de correções críticas já fechadas (referência):** 12 falhas CRÍTICAS encontradas → 12 corrigidas (oráculo de suporte, views BYPASSRLS, pódio indevido, escrita anon, badge_token exposto, CSP, ciclos de RLS 42P17, cadeia do Service Worker, etc.). **Nenhuma falha crítica aberta hoje.**

### 12.1 Insumos medidos para as decisões de produto (FIN-1, 12/11)

As cinco decisões em aberto da Fase 2 deixaram de ser descrições: cada uma tem agora o número extraído **dos bytes que o browser recebe** (HTTP 200, 3 489 467 B, md5 `ae59d35346b685b2fbf9d18ade4fa5cd`, byte-idêntico a `ar-shell.html`, etiqueta derivada do SW `bfr-conecta-v118`). Instrumento e prova: `scripts/fin1-decisoes-produto.mjs` → `evidence/fin1-decisoes-produto.json`, **18 portões verdes / 0 vermelhos**, `FIN1_DECISOES_OK`, exit 0.

| Entrada | O que foi medido no ar | A decisão que resta é entre |
|---|---|---|
| RM-2.2 overlay executivo (Direção) | 3 regras `display:none !important` sobre os painéis legados; a classe `bfr-exec-legacy-hidden` 7× e o escape `data-exec-revealed` 5× (2 toggles por JS) | manter o overlay com escape por rota **ou** expor/remover os painéis legados |
| RM-2.3 «Marcar em análise» | o texto existe 4× (linha 596) mas dentro de `<script id="bfr-coordination-ux" type="text/plain" roles="coordinator,developer">` — módulo morto; há 80 scripts `text/plain` e 5 `deferred-disabled` no shell | reativar o módulo de UX da coordenação **ou** remover os 4 textos órfãos |
| RM-2.4 hero do aluno | o hero é pintado por `applyIdentity()`, que lê `state.student.official_name` (464 usos no ar); o caminho de nome preferido (`preferredDisplayName` 13 / `display_name_custom` 14) alimenta a saudação do topo e o perfil, **não** o espaço do aluno (`bfr-student-hero` 8) | hero obedecer ao nome preferido (paridade com a saudação) **ou** ao oficial |
| RM-2.5 Home do aluno | **19 carregadores `load()`**: 11 com guarda por `state.loading`, 4 por `state.loaded`, **7 sem nenhuma**; 6 setam `state.error`; o silêncio medido está em 2 `catch` de bloco vazio + 7 `.catch(()=>{})` vazios. O carregador do aluno (@offset 2442324) **tem** guarda por `state.loaded` e trata 2 erros de query com painel `error` + «Tentar novamente» — não é silencioso | o residual real é dos 7 sem guarda e dos 9 `catch` silenciosos, não do carregador do aluno |
| RM12-A1 `pending` | nada no cliente escreve `role='pending'` (0 atribuições, `auth.signUp` 0, `/auth/v1/signup` 0); as 66 ocorrências de `'pending'` são check-in/portaria e labels; o cadastro vem das RPCs `complete_family_registration` / `register_gate_checkin(_v2)` (e/ou trigger no banco) | dar ao cadastro um caminho que produza `pending` vivo **ou** aposentar os rótulos/portões «Aguardando aprovação» da UI, hoje inalcançáveis |
| RM-6.7 insumo | `frame-ancestors` **0** no header e **0** no texto, `X-Frame-Options` null, **0** iframe de entrada e **0** `postMessage`; os 2 iframes do shell são de **saída** (visor de obra `bfr-book-frame` e iframe 1×1 do print) e as 13 janelas são `window.open` de mesma origem | **DENY** não quebra nada (não há enquadramento a aceitar); **SAMEORIGIN** só se algum produto vier a embutir o próprio app |

O item **91** foi re-escrito à luz desta medição: a formulação antiga («o carregador do aluno corre sem guarda») é **falsa** contra os bytes vivos e foi retirada. O que fica registado é o conjunto dos 7 carregadores sem guarda + 9 `catch` silenciosos + 6 consultas cuja falha é engolida pelo involuco (PEN-28).

### 12.2 Portão de higiene RM-6.2 — o que PEN-22/23/25/29/30/31 afirmam, re-emitido do catálogo (FIN-2, 12/11)

Instrumento **somente leitura**: `scripts/fin2-higiene-rm62.mjs` → `evidence/fin2-higiene-rm62.json`, **12 portões verdes / 0 falhas**, `FIN2_HIGIENE_VERDE`, exit 0. Nenhum nome foi dactilografado: as 3 tabelas ausentes, as colunas de `announcements` e os nomes das FKs vêm de `evidence/fin2b-ruins-catalogo.json`; os 6 nomes de vistas vêm de `evidence/rm14-censo-views.json` e são conferidos contra `pg_class`. A não-escrita prova-se por pegada do catálogo (contagem + md5 da lista ordenada das 182 relações de `public`): **antes = depois = 182 / `ecf3403210b8091209cb8584a4f1da51`**.

| Veredito | O que o catálogo respondeu | Consequência para o roadmap |
|---|---|---|
| PEN-22 (higiene de `grant`) | **147 funções** em `public`; `has_function_privilege` diz EXECUTE a **anon em 57**, a **public em 56**, a **authenticated em 137**; **0 funções com `proacl` nula** e **90 sem** EXECUTE a anon | O risco §11(3) é real mas **acotado**: 57 funções alcançáveis por JWT anon. O portão de re-verificação existe e emite a lista nominal (`pen22.nomes_com_execute_anon`); é ele que tem de correr depois de qualquer DDL novo |
| PEN-23 (views) | **6 views** em `public`; **1** com `security_invoker=true` (`support_professionals_directory`); **5** sem, todas de dono `postgres` → `sports_public_athletes`, `sports_public_match_events`, `sports_public_matches`, `sports_public_schools`, `sports_public_teams` | Confirma o censo RM-1.4 pelo catálogo (mesmos 6 nomes, portão verde) e deixa o checklist com número: o padrão das 5 é o mesmo da que já foi convertida |
| PEN-25 (causa) | `public."current_role"()`: EXECUTE a **anon = FALSO**, a **authenticated = VERDADEIRO** | A causa está agora **medida**, não atribuída: a qualificação rebenta em 42501 por falta de privilégio, e o `GRANT` de um futuro vizinho abre a tabela sem tocar em policy nenhuma. O portão foi escrito **invertido** na primeira versão e só ficou certo contra esta leitura |
| PEN-29 × PEN-31 | varredura em **todos os esquemas**: `bfr_school_shift_settings`, `bfr_school_calendar_days`, `bfr_school_calendar_month_targets` = **nenhuma relação em qualquer esquema**; mas `public.schools` **existe** (`relkind 'r'`) e `public.sports_schools` **existe** (`relkind 'r'`); as FKs vivas de `supervision_requests` são 3 (`closed_by`/`created_by` → `profiles`, `school_id` → **`sports_schools`**) | Os dois vereditos separam-se por isto: PEN-29 é **estrutura nunca criada**; PEN-31 é **FK em falta para a relação que existe** — o `schools(name)` do ar vivo pergunta por uma relação real sem relação embutível, daí PGRST200 e não PGRST205. O conserto da RM-1.6 é trocar o embed para `sports_schools(name)` (probe: 200), não criar tabela |
| PEN-30 (coluna) | `announcements` tem **13 colunas**: `created_at` **não existe**; `published_at` e `updated_at` existem | Igual ao artefacto `fin2b` (portão verde sobre a lista completa): a ordenação por data de criação nessa consulta nunca viu uma linha |

Armadilhas desta passada, registradas para não repetir: `relkind` é do tipo `"char"` e concatená-lo sem `::text` dá **42725** («operator is not unique»); um `SELECT ... AS tipo` lido em JS como `r.relkind` imprime `public.undefined` e **parece** um veredito válido; a predicate `and A or B` sem parênteses saía da restrição de esquema; e `proacl` lida como texto mente justamente nas funções abertas — só `has_function_privilege` responde.

### 12.3 Candidata RM-6.8 — fail-closed por policy, escrita a partir do texto vivo e **NÃO aplicada** (FIN-3, 12/11)

Duas peças, ambas **somente leitura** — nenhum DDL foi executado nesta passada:

1. **Recon** `scripts/rm68-recon-quals.mjs` → `evidence/rm68-recon-quals.json`, **7 portões verdes / 0 falhas**, exit 0, pegada de catálogo igual antes e depois (182 / `ecf3403210b8091209cb8584a4f1da51`). O texto de cada `USING`/`WITH CHECK` é lido de `pg_policy` com `pg_get_expr(p.polqual, p.polrelid)` — não do `pg_policies`, cujo cast para regclass dependia do search_path. Medido: **23 policies vivas** nas 4 tabelas da PEN-25 (`grades` 5 · `attendance` 8 · `access_requests` 4 · `occurrences` 6), das quais **11 são de papel PUBLIC** (`cardinality(polroles) = 0`) e **12 são de `authenticated`** — e são só as 11 as que um pedido anon chega a avaliar, porque o filtro de papel corre antes do qual. Nas funções: `bfr_staff_can_manage_student_scope()` tem EXECUTE a anon (e é SECURITY DEFINER, por isso o `current_role()` interno corre como dono e não rebenta); `"current_role"()`, `is_developer()` e `is_staff()` **não** têm; `staff_schools` não tem SELECT a anon.
2. **Gerador** `scripts/rm68-gerador-candidata.mjs` → `scripts/rm68-fail-closed-por-policy.sql` (**14 568 B**, md5 `85ccd0927153fbcca4389e9218f1111f`, **102 portões / 0 falhas**, exit 0; emitido duas vezes e o md5 não mudou). A primeira linha útil do ficheiro é `-- >>>>>> NÃO APLICADA. Nenhum DDL foi executado. <<<<<<`.

O que a candidata faz: **3 funções novas** (`bfr_rls_session_role()`, `bfr_rls_is_developer()`, `bfr_rls_director_manages_student(uuid)`), todas `SECURITY DEFINER` com `SET search_path = public, pg_temp`, mais **11 `ALTER POLICY`** que trocam só a *fonte da resposta* — a mesma forma, os mesmos conjunctos, nenhuma expressão sobre dados tocada. Um `GRANT SELECT` futuro em `staff_schools` passa a não abrir tabela nenhuma, porque a porta fecha por lógica (`auth.uid()` NULL → sem papel → `false`) em vez de fechar por 42501. O ficheiro traz DRY-RUN (`BEGIN; … ROLLBACK;`), vereditos esperados comentados, **REVERSÃO byte-a-byte** com o texto vivo de cada uma das 11 policies e as 3 `DROP`s, e a ordem de aplicação: `rm68-recon-quals.mjs` → `rm14-suite.mjs` (o AVISO RM14-A2 tem de ficar vazio com os 30 verdes intactos) → `s20-behavioral.mjs` com JWTs reais.

O que os portões provam, e o que **não** provam. Provam a substituição: os **14 pares de expressão** das 11 policies (8 `USING` + 6 `WITH CHECK`), com os wrappers re-trocados pelos textos originais, voltam **byte-a-byte** ao texto do catálogo, o número de chamadas privilegiadas removidas é igual ao de wrappers introduzidos, as statements da frente não contêm `EXISTS`/`JOIN`/`WHERE` residuais nem saldo de parênteses — 42 portões só desta conferência, dentro dos 102 — e os únicos `GRANT`s do ficheiro são 3× `EXECUTE`, nenhum sobre tabela. **Não provam** equivalência comportamental por papel autenticado: isso só se mede depois de aplicar, com JWT real, porque a mudança é de privilégio e uma vista pode ganhar linhas sem que nenhuma expressão de dados tenha mudado no texto. A candidata está **pronta para revisão**, não aplicada, e a aplicação pede OK novo e explícito.

Armadilhas desta passada, registradas para não repetir: (a) a primeira versão recortava o `EXISTS` com regex preguiçoso, parava no primeiro `))` e deixava `JOIN students … WHERE …` **órfão dentro do `USING`** — SQL inválido que nem o saldo de parênteses da expressão completa nem a ausência de `staff_schools` denunciavam; (b) um portão de ficheiro usava `includes("is_developer()")` e contava como chamada privilegiada o nome do próprio wrapper `bfr_rls_is_developer()` — sem fronteira de palavra, o veredito acusa o conserto; (c) a regex `GRANT (SELECT|…)` apanhou a **frase de comentário** que explica o PEN-25, pelo que os portões de ficheiro passaram a correr só sobre linhas de código; (d) `pg_get_functionident(oid)` **não existe** nesta build (42883) — o nome argumentado tira-se de `pg_get_function_arguments`.


## 13. ROADMAP DE DESENVOLVIMENTO POR FASES

Convenções: **P** prioridade (A/M/B) · **D** dependências · **Cx** complexidade (B/M/A) · Critério = portão mensurável de conclusão.

### FASE 1 — CORREÇÕES CRÍTICAS (validações residuais + 1 regressão medida 12/11; nenhuma falha crítica de segurança aberta)

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-1.1 | Provar/decidir o elo check-in→frequência automática (FLUXO 1) | Portaria×Frequência | A | — | M | **Fechado 12/11 por decisão de produto (a)** — prova read-only + decisão registrada (`evidence/roadmap-rm11-decisao.json`); RM-3.1 cancelado | E2E provado OU decisão de produto registrada **OK** (segunda cláusula) |
| RM-1.2 | Provar aprovação administrativa de contas (pending→papel) | Autenticação | A | — | M | Feito 12/11 com achado (A.06 → ICP) | Baseline restaurada por contagem E md5 **OK**; «medida na UI» PARCIAL — HTTP exatos do painel com JWT real, clique com conta real de developer por medir |
| RM-1.3 | Provar entrega push em aparelho físico | Notificações | M | — | B | **Medido 12/11 com achado — `RM13_CADEIA_PARTIDA`** (8/6 portões; `evidence/rm13-rotas.json` + `evidence/rm13-aparelho.json` 5/10). Causa atribuída ao **cliente**: o SW registrado (`/sw-v4.js?v=45`) não tem ouvinte `push`/`notificationclick` nem `importScripts`, o shell nunca aponta `firebase-messaging-sw` e a rota `/firebase-messaging-sw.js` cai em 500 → P.08 **ICP**. Emissor, Edge v23 e aceitação FCM intactos (4/4 × 200 `sent:1`); `push_subscriptions` = 0 linhas | **NÃO cumprido** — exibição em aparelho físico continua por provar; reparo transferido para RM-1.5 + RM-6.9 |
| RM-1.4 | Suite mínima automatizada (boot+login+RLS) | Qualidade | A | — | M | **Feito 12/11 — `RM14_SUITE_VERDE` 30 verde / 1 amarelo / 0 vermelho, exit 0**; controle negativo provado (21/31, exit 1) | Suite verde em CI local **OK**; o 1 amarelo é a lacuna RM14-A1 (PEN-24), não um portão enfraquecido |
| RM-1.5 | Reparar a cadeia de push no cliente: SW com ouvintes `push` + `notificationclick` (ou `importScripts` do SW de FCM) e shell que registre esse SW, fechando PEN-26 | Notificações | A | RM-6.9 | M | **Aberto, criado 12/11 a partir de RM13-A1** — exige OK novo de publicação; nada foi alterado nesta passada | `rm13-sonda-rotas.mjs` com S1/S2/S3/S4 verdes **e** push exibido num aparelho físico com perfil novo + assinatura recriada |
| RM-1.6 | Repor o embed `sports_schools(name)` da Supervisão, perdido entre a v115 e a v116 (PEN-31): o ar vivo consulta `schools(name)` e recebe PGRST200, logo o nome da escola nunca aparece na aba | Supervisão | A | — | B | **EXECUTADA 13/11 — v119 PUBLICADA** (versão `6aed50af-a8a1-4c2b-84ae-cb6eaec4770b`, deployment `2026-11-13T03:45:52.507Z`, 0 assets reenviados). Cadeia com **79 portões / 0 vermelhos**: candidata 15, bundle 14, preflight 20, HTTP 15, Chrome limpo 10, sonda do par 5. Censo de embeds re-emitido sobre os bytes do ar: 248 pares em 100 tabelas, HTTP 200 **239 → 240**, ruínas **9 → 8**, **0 novas** — a única que saiu é exatamente `supervision_requests … school_id,schools(name)` PGRST200 da linha 23684. Perda original medida por vaga no disco (v115: 1×; v116→v118-swfix: 0). **Andou na tela logado 13/11:** JWT real de `education_supervisor` mintado via Auth Admin API (OK explícito «Autorizo o mint via Auth Admin API»), navegador aberto na v119, select extraído do ar devolve **200 `[]`** e o controle negativo com `schools(name)` devolve **400 PGRST200** — PEN-31 **FECHADA** (`evidence/s21-diary.json` 17/0, `evidence/s21-navegador-b.json` 12/0, `evidence/s21-limpeza.json` 23/0) | **ATENDIDO 13/11** — o censo re-emitido sobre `a1969cdf…` não tem PGRST200 em `supervision_requests` (`evidence/fin2a-censo-embeds.json`) e o par com `sports_schools(name)` devolve HTTP 200 (`evidence/v119-sonda-supervision.json`) |
| RM-1.7 | Dar ao `setRole()` um ramo que aceite o papel `education_supervisor` como papel de navegação (PEN-32 / S21-A1): hoje os 12 ramos do guard ignoram o papel, a conta real cai em `parentView` sem a aba Supervisão e o `setupSecretaryView()` da linha 9948 é código morto porque vem depois do `return` | Supervisão/navegação | A | RM-1.6 | M | **FECHADA 13/11 (v120 PUBLICADA às 06:49Z)** — v120 em `bfr-conecta/bfr-candidata-v120-setrole-supervisor/` (3 hunks do roteador, +175 B, reversão byte-a-byte à v119, 28 portões/0) e bancada A/B offline **43 portões/0** (`RM17_BANCADA_V3_OK`) provando o antes/depois na mesma régua de md5; publicada sob OK literal «Autorizo, publica a v120» com cadeia **125/0** e os 3 hunks conferidos nos bytes servidos. H4 (:10425 item Secretaria do menu) e H5 (:10437 `accountLabels`) foram medidos mas ficaram fora da v120 por decisão registrada — **não é esta tarefa**. **13/11 (§T): H4 foi re-medido e FALSIFICADO** (o `syncRoleNavigation` roda depois do toggle e re-escreve a classe `hidden` do item nas duas bandas e nas duas larguras); H5 saiu desta tarefa e virou **PEN-33 / RM-1.8** | Roteador: conta `education_supervisor` chega ao `secretaryView` e à aba `supervisao` pelo caminho próprio do app, sem `setRole('secretary')` — **PROVADO offline na v120 e publicado**. Falta (outra pendência): a prova viva com conta real |
| RM-1.8 | Dar ao `accountLabels` a chave `education_supervisor` para o chip da conta dizer o papel e não «Responsável» (PEN-33): o mapa :10437 tem 12 chaves sem ela e a linha de uso :10438 cai no `fallback parent`; o valor vem do que o app já usa em `profileRoleOptions` (:9001, «Supervisor(a) de ensino») | Supervisão/rótulo | M | RM-1.7 | B | **Candidata v121 PRONTA, NÃO publicada (13/11, §T do arquivo de auditoria)** — 1 linha alterada (10437), Δ +76 B, md5 `d418e7fc917f1fbb1437054b7b531f9b`, linhagem reversa byte-a-byte à v120 `a9a76d0e…`, portões **33/0** (`ROTULOS_OK`, `published:false`) e bancada A/B offline **60/0** (`H45_BANCADA_V2_OK`) medindo as duas bandas a 1280 **e** a 390. Deploy = 1 Worker e **pede OK literal novo**; 0 DDL, 0 escrita, 0 mint nesta tarefa | Chip do sidebar lê `Supervisor(a) de ensino` com o papel injetado, nas duas bandas e nas duas larguras — **PROVADO offline na v121 (bancada v2)** — **e** o mesmo texto visto no ar com conta real depois da publicação (essa parte continua por correr) |

### FASE 2 — FINALIZAÇÃO DOS MÓDULOS EXISTENTES

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-2.1 | Fechar fome de timers do menu mobile (item 77) | Navegação mobile | M | — | A | Pendente | Censo vivo com 0 escritas periódicas residuais |
| RM-2.2 | Decidir e resolver overlay executivo × painéis legados (Direção) | Direção | M | — | M | Pendente — **insumo medido 12/11** (§12.1: 3 regras `!important`, escape `data-exec-revealed` 5×) | Painéis legados acessíveis ou removidos com OK |
| RM-2.3 | Ligar ou remover «Marcar em análise» | Coordenação | M | — | B | Pendente — **insumo medido 12/11** (§12.1: 4× dentro do módulo morto `bfr-coordination-ux`) | Ação funcional E2E ou item removido com OK |
| RM-2.4 | Hero do aluno com nome oficial (item 86) | Aluno | B | — | B | Pendente — **insumo medido 12/11** (§12.1: `applyIdentity` lê `official_name`; nome preferido não chega ao hero) | Decisão aplicada e provada na tela |
| RM-2.5 | Home do aluno — fechar falha silenciosa `@9392` (item 85) | Aluno | B | — | M | Pendente — **insumo medido e re-escrito 12/11**: o carregador do aluno NÃO é silencioso; o residual é 7 loaders sem guarda + 9 `catch` vazios + 6 falhas engolidas pelo involuco (PEN-28) | Sem erro silencioso nos 7 carregadores sem guarda |
| RM-2.10 | Fechar PEN-28/29/30 — as 9 formas de consulta que falham no ar, as 3 tabelas inexistentes e a coluna `announcements.created_at` | Dados/consulta | A | — | M | **Aberto, criado 12/11 pela FIN-2** — nada foi alterado | 0 consultas ruins no censo re-emitido dos bytes publicados |
| RM-2.6 | Provar gestão administrativa integrada como cenário único | Direção/Coord./Secr. | M | — | M | Pendente | Jornada única cross-role 0 falhas |
| RM-2.7 | Prova de render completo do professor com conta real vinculada | Professor | M | — | M | Pendente | Telas populadas com vínculo real medido |
| RM-2.8 | Publicar candidata do `navButton` (1,2 s→1×) | Desempenho | B | RM-2.1 | B | Pendente | A/B aprovado + publicado sob OK |
| RM-2.9 | XP/Trilhas/Conquistas dinâmicos (D6) | Aluno | B | — | A | Pendente | Dados do banco renderizando (sem arrays hardcoded) |

### FASE 3 — INTEGRAÇÃO GERAL

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-3.1 | Integração check-in×frequência (se aprovada em RM-1.1) | Portaria×Frequência | A | RM-1.1 | M | **CANCELADO 12/11** — RM-1.1 decidido como opção (a), manual com evidência; linha mantida para histórico | Não se aplica; reabre só com decisão nova (b/c) |
| RM-3.2 | Indicadores agregados da rede (Supervisão) | Supervisão | A | RM-2.6 | A | Pendente | Painel multi-escola com dados do banco |
| RM-3.3 | Relatórios comparativos entre escolas | Supervisão | A | RM-3.2 | M | Pendente | Relatório comparativo gerado e conferido |
| RM-3.4 | Notificações automáticas de frequência/nota ao responsável | Notificações | B | — | M | Pendente | Emissão disparada e recebida (in-app) |
| RM-3.5 | Preferências de notificação por responsável | Notificações | B | RM-3.4 | M | Pendente | Configuração persistida e respeitada |

### FASE 4 — MELHORIAS DE EXPERIÊNCIA

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-4.1 | Refactor dos 55 MutationObservers (dispatcher único) | Desempenho | M | — | A | Pendente | A/B com queda mensurável de disparos/s |
| RM-4.2 | Tap≥44 na banda web (avaliar se aplica) | UI web | B | — | M | Pendente | Decisão + A/B por banda |
| RM-4.3 | Resíduos de fonte<11 e cortes em 320–430 | UI mobile | B | — | B | Pendente | Censo com 0 resíduos em texto interativo |
| RM-4.4 | Acessibilidade (nomes acessíveis dos controles) | UI | B | — | M | Pendente | Censo de controles mudos = 0 |
| RM-4.5 | Otimização do boot (alvo <2 s @390) | Desempenho | M | RM-4.1 | M | Pendente | Medição de boot no ar no alvo |
| RM-4.6 | Load testing em ambiente controlado | Qualidade | B | — | M | Pendente | Relatório de carga sem escrita real |

### FASE 5 — NOVAS FUNCIONALIDADES

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-5.1 | Modo offline da portaria | Portaria | B | — | A | Pendente | Check-in offline com fila de sincronização |
| RM-5.2 | Turnos/calendário real da portaria | Portaria | B | RM-5.1 | M | Pendente | Tabelas + UI de turno em produção |
| RM-5.3 | Crachá físico + câmera real (teste de campo) | Portaria | B | — | B | Pendente | Teste com hardware real registrado |
| RM-5.4 | Ferramentas administrativas novas (conforme demanda) | Direção/Secr. | B | — | M | Pendente | Definido com a Direção |
| RM-5.5 | Inteligência de dados (alertas de evasão/desempenho) | Indicadores | B | RM-3.2 | A | Pendente | Indicador automático provado |
| RM-5.6 | Validação push físico em produção piloto | Notificações | M | RM-1.5 | M | Bloqueado — RM-1.3 mediu 12/11 e achou a cadeia partida no cliente; sem reparo não há o que validar em piloto | Piloto com aparelhos reais |
| RM-5.7 | Expansão institucional (novas escolas na rede) | Supervisão | B | RM-3.2 | M | Pendente | Onboarding de escola nova documentado |

### FASE 6 — HOMOLOGAÇÃO E PRODUÇÃO

| ID | Tarefa | Módulo | P | D | Cx | Status | Critério de conclusão |
|---|---|---|---|---|---|---|---|
| RM-6.1 | Suite organizada (Playwright/Vitest) sobre o harness | Qualidade | M | — | A | Pendente | Suite com regressão de boot/RLS/fluxos |
| RM-6.2 | Auditoria de segurança final (re-censo anon, RLS, CSP, storage) | Segurança | A | — | M | **Parcialmente feito 12/11** — o portão de higiene existe e corre verde com um comando (`scripts/fin2-higiene-rm62.mjs`, 12 portões/0 falhas, somente leitura com pegada de catálogo igual antes e depois): PEN-22/23 re-emitidos por número, causa da PEN-25 medida, vereditos PEN-29/30/31 conferidos contra o catálogo (§12.2). Falta o resto da auditoria final: superfície anon por chamada, re-censo de storage e RLS sobre a versão em produção | 0 achados críticos; portões verdes |
| RM-6.3 | Validação dos 15 perfis nas duas bandas | QA | A | — | M | Pendente | 15×2 varreduras com 0 defeitos novos |
| RM-6.4 | Testes de desempenho e carga | QA | B | RM-4.6 | M | Pendente | Relatório aprovado |
| RM-6.5 | Documentação final (manuais por perfil + guia de operação) | Documentação | A | — | M | Pendente | Manuais entregues |
| RM-6.6 | Implantação/rollout com monitoramento | Produção | A | RM-6.1–6.5 | M | Pendente | Go-live com telemetria ativa |
| RM-6.7 | Fechar PEN-24: proteção anti-clique-jacketing (`frame-ancestors` no header CSP + `X-Frame-Options: SAMEORIGIN`, ou DENY se o app não embute nada) | Segurança | A | — | B | **Aberto, lacuna medida 12/11 (RM14-A1) e insumo decidido por medição 12/11**: `frame-ancestors` 0 no header e 0 no texto, XFO null, **0** iframe de entrada e **0** `postMessage`; os 2 iframes do shell são de saída e as 13 janelas são `window.open` de mesma origem → **nenhum enquadramento inbound existe para quebrar** (`evidence/fin1-decisoes-produto.json`) | `boot.anticlickjacking_deny_or_sameorigin` VERDE na suite |
| RM-6.8 | Fechar PEN-25: transformar o fail-closed acidental em fail-closed por policy — dar às quals uma função própria (`anon` não precisa de `SELECT` em `staff_schools` nem de EXECUTE em `"current_role"()`), de modo que um `GRANT` futuro não abra tabela nenhuma | Segurança | A | — | M | **Candidata escrita 12/11 e NÃO aplicada (§12.3)** — `scripts/rm68-fail-closed-por-policy.sql` (14 568 B, md5 `85ccd0927153fbcca4389e9218f1111f`, gerador verde com 102 portões/0 falhas): 3 funções `SECURITY DEFINER` + 11 `ALTER POLICY` sobre as únicas policies de papel PUBLIC das 4 tabelas (23 vivas, 12 são de `authenticated` e o anon nunca as avalia). A aplicação pede OK novo e explícito; a equivalência por papel só se prova depois, com JWT real | `rm68-recon-quals.mjs` sem chamada privilegiada nas 11 PUBLIC **e** AVISO RM14-A2 vazio na suite com os 30 verdes intactos |
| RM-6.9 | Fechar PEN-27: `worker.mjs:37` chama `env.ASSETS.fetch(assetUrl)` com uma **string** (o `url.pathname`), o que lança e devolve a página «Worker threw exception» da Cloudflare — trocar pelo objeto/`request` para que caminho fora do bundle devolva **404** e não 500. Nota: este reparo **não** cria a rota `/firebase-messaging-sw.js`, porque o ficheiro não está entre os 12 do bundle — isso é decisão da RM-1.5 (ficheiro no bundle **ou** `importScripts` no SW registrado) | Infra/Worker | A | — | B | **Aberto, causa localizada 12/11 (RM13-A2)** — exige OK novo de publicação; nada foi alterado nesta passada | `rm13-sonda-rotas.mjs` com R5 verde (rota inexistente = 404, não 500) e `referências únicas no HTML` todas resolvidas |

**Total: 45 tarefas de roadmap** (Fase 1: 8 · Fase 2: 10 · Fase 3: 5 · Fase 4: 6 · Fase 5: 7 · Fase 6: 9). *Recontado 13/11 por parser sobre as linhas das seis tabelas, não por soma manual: entraram RM-1.5 e RM-6.9, criados a partir dos achados RM13-A1/RM13-A2 da prova de push RM-1.3, RM-1.6 (a regressão PEN-31, perdida entre v115 e v116) e RM-2.10 (as 9 consultas ruins PEN-28/29/30), criados pela passada FIN-2, RM-1.7 (o `setRole()` sem ramo para `education_supervisor`, PEN-32), criado 13/11 pela passada S21, e RM-1.8 (a chave `education_supervisor` no `accountLabels`, PEN-33), criado 13/11 pela passada H4/H5. A cifra e a repartição por fase são a linha `tarefas RM-x.y por fase (parser)` que o comando imprime, não a memória. Armadilha registrada na mesma passada: o `scripts/rm-audit-numeros.mjs` percorria o §5 por um intervalo de linhas fixo (`108…311`), que partiu quando o §5.4 ganhou um parágrafo e cortou o §5.16 fora do censo; o intervalo passou a ser derivado dos marcadores `## 5.`/`## 6.`.*

---

## 14. CRONOGRAMA SUGERIDO

Sugestão por ordem de valor (sem datas fixas — depende de aprovação e de decisões de produto):

| Janela | Fase | Conteúdo |
|---|---|---|
| Semanas 1–2 | Fase 1 + início da 2 | Validações residuais (RM-1.1, RM-1.2 e RM-1.4 fechados 12/11; RM-1.3 medido 12/11 com a causa no cliente — o que falta é o reparo RM-1.5/RM-6.9, que exige OK de publicação, não o aparelho) em paralelo com decisões de produto de baixo risco (RM-2.3, 2.4, 2.5) |
| Semanas 3–5 | Fase 2 | Finalização dos módulos existentes; RM-2.1 e RM-2.7 são as de maior risco (A/B obrigatório) |
| Semanas 6–8 | Fase 3 | Integrações (supervisão multi-escola e notificações); depende das decisões de RM-1.1 |
| Semanas 9–11 | Fase 4 | Experiência: refactor de observers (RM-4.1) isolado com A/B; acessibilidade e boot |
| Semanas 12–16 | Fase 5 | Novas funcionalidades por prioridade da Direção; hardware (RM-5.3) quando disponível |
| Semanas 17–18 | Fase 6 | Homologação completa, auditoria final e implantação |

Riscos de cronograma: RM-4.1 (refactor do laço de observação) é a tarefa de maior superfície de regressão; RM-2.1 depende de medição fina (ciclos de censo vivo); decisões de produto pendentes (PEN-02–06) podem reordenar tudo.

---

## 15. INDICADORES DE PROGRESSO

**Calculados do inventário da seção 5 (104 itens, todos com evidência):**

| Indicador | Valor |
|---|---|
| Funcionalidades inventariadas | 104 |
| **IMPLEMENTADO E FUNCIONANDO** | 92 (88,5%) |
| IMPLEMENTADO COM PROBLEMAS | 3 (2,9%) |
| PARCIALMENTE IMPLEMENTADO | 2 (1,9%) |
| NECESSITA DE MELHORIAS | 3 (2,9%) |
| NECESSITA DE TESTES | 1 (1,0%) |
| PLANEJADO PARA O FUTURO | 3 (2,9%) |
| NÃO IMPLEMENTADO (no inventário) | 0 (não implementados classificados como PF) |

**Progresso por módulo (IF/total):**

| Módulo | Concluído | Total | % |
|---|---|---|---|
| Autenticação | 7 | 8 | 87,5% |
| Navegação | 5 | 6 | 83,3% |
| Área do aluno | 11 | 14 | 78,6% |
| Responsáveis | 8 | 9 | 88,9% |
| Professor | 8 | 9 | 88,9% |
| Coordenação | 8 | 9 | 88,9% |
| Direção | 6 | 7 | 85,7% |
| Secretaria | 6 | 6 | 100% |
| Supervisão Educacional | 5 | 6 | 83,3% |
| Transporte (monitor) | 4 | 4 | 100% |
| Portaria | 3 | 5 | 60,0% |
| AEE/Psicologia/Social | 6 | 6 | 100% |
| Jogos Escolares | 2 | 2 | 100% |
| Comunicação | 4 | 4 | 100% |
| Desenvolvedor | 3 | 3 | 100% |
| Segurança transversal | 6 | 6 | 100% |

**Indicadores do sistema (fonte: censo 12/11 + relatório final):**

| Indicador | Valor |
|---|---|
| Versões publicadas | 120 (etiqueta = maior versão no ar; **13/11 06:49:57Z a v120** sob o OK «Autorizo, publica a v120», diário `audit-publicacao-v120.json`. Não é contagem de diários: só `audit-publicacao-v117/v119/v120.json` estão em disco, medido por `ls`) |
| Pendências registradas | 33 (PEN-01…PEN-33; PEN-28…PEN-31 criadas 12/11 pela passada FIN-1/FIN-2; PEN-32 criada 13/11 pela passada S21; PEN-33 criada 13/11 pela passada H4/H5) |
| Tarefas de roadmap | 45 (contadas por parser nas 6 tabelas da seção 13; entraram RM-1.6, RM-2.10, RM-1.7 e RM-1.8) |
| Suite mínima automatizada (RM-1.4) | 31 portões · `RM14_SUITE_VERDE` 30 verde / 1 amarelo (lacuna RM14-A1) / 0 vermelho · exit 0 · controle negativo 21/31 com exit 1 |
| Auditoria das cifras deste documento | `AUDITORIA_VERDE` exit 0 · contagens lidas da saída do comando (`cifras amarradas: N · módulos do §5 conferidos: M`), não copiadas para cá · controle negativo com metade positiva, contagem na linha `CONTROLE_NEGATIVO_OK … N/N` (`scripts/rm-audit-controle.mjs`) |
| Tabelas com RLS | 176/176 (100%) — `evidence/roadmap-censo-db.json`; recorte PostgREST: 168 tabelas alcançáveis por `anon`/`authenticated`, **0 sem RLS** (`rls_no_catalogo` em `evidence/rm14-suite.json`) |
| Policies com filtro | 475/475 (100%) |
| Tabelas realtime | 75 |
| Falhas críticas abertas | 0 |
| Contas sintéticas vivas | 0 por ciclo (protocolo provado) |
| Dados reais alterados em testes | 0 (baseline contagem+md5) |

**Histórico de evolução (marcos):** 13/10 início da auditoria → 14–19/10 correções de segurança e trava do boot → 20–30/10 módulos (professor v59, aluno v61, secretaria v65, comunicação v66–v70, PF v84–v89, portaria v102–v106) → 02–08/11 Supervisão Educacional (v113–v115, S16–S20) + transporte (C2/C2R) + gestão administrativa (C7) + PWA (v118) → 10–12/11 segurança P0–P3, rotação de credenciais e 42P17 → 13/11 v119 (`deploy` 03:45Z): embed `sports_schools(name)` reposto na Supervisão, fechando o critério de aceite do RM-1.6 / PEN-31 sem tocar no banco → 13/11 S21: PEN-31 **FECHADA** pela prova autenticada (conta `education_supervisor` mintada via Auth Admin API, aba aberta no navegador com JWT real, 200 `[]`, controle negativo 400 PGRST200, 52 portões/0 e limpeza byte-idêntica) e **PEN-32 aberta** com a tarefa RM-1.7 — o `setRole()` não tem ramo para `education_supervisor`, logo a conta real não alcança a aba pelo menu → 13/11 06:49:57Z v120 (OK literal «Autorizo, publica a v120», diário `audit-publicacao-v120.json`): 3 linhas do roteador (`:9902` guarda do `setRole`, `:9926` toggle do `secretaryView`, `:10145` mapa `viewIds`) dando ramo a `education_supervisor`, **PEN-32 FECHADA**, cadeia 125 portões/0 vermelhos (candidata 28 + bancada A/B 43 + preflight 26 + HTTP 18 + Chrome limpo 10), shell 3.489.649 B md5 `a9a76d0e338c2a539135bccce23111b4` (Δ +175 B, 28.661 linhas nos dois lados), 0 DDL, 0 escrita em banco, 0 conta mintada; o contorno `setRole('secretary')` deixou de ser necessário no ar → 13/11 H4/H5 (OK «medir e preparar candidata H4/H5», §T do arquivo de auditoria): a medição estática dos bytes da v120 (`evidence/h45-medicao-diary.json` 18/0) **falsifica H4** — `syncRoleNavigation` roda depois do toggle :10425 e re-escreve a classe `hidden` do item Secretaria, medido `false` nas duas bandas a 1280 e na gaveta a 390 — e **confirma H5** por leitura (`accountLabels` :10437 com 12 chaves, sem `education_supervisor`; uso :10438 cai no fallback `parent`; o chip pinta `account[1]`). Candidata **v121** pronta em disco (1 linha, Δ +76 B, md5 `d418e7fc917f1fbb1437054b7b531f9b`, reversa byte-a-byte à v120, **33 portões/0** `ROTULOS_OK`) e bancada A/B offline **60 portões/0** (`H45_BANCADA_V2_OK`; a v1, 50/6, tinha 6 vermelhos **do instrumento**). Sai **PEN-33 / RM-1.8**; **0 publicação, 0 DDL, 0 escrita, 0 mint** — o ar continua v120 e a promoção da v121 pede OK literal novo.

---

## 16. RECOMENDAÇÕES TÉCNICAS

1. **Manter o protocolo de ciclo** (baseline pré por contagem E md5 → fixture sintética → prova → limpeza FK-safe → baseline restaurada) em toda mudança que toque dados.
2. **Portão pós-migration:** re-rodar a prova da superfície `anon` e o censo RLS após qualquer migration nova (o grant a `anon` volta sozinho em funções novas).
3. **Checklist de views:** toda view nova exige `security_invoker` (o padrão sem a opção roda como dono BYPASSRLS).
4. **Publicação:** nunca publicar sem OK explícito; manter a cadeia preflight→bundle→deploy→prova HTTP→Chrome limpo e a reversão byte a byte registrada.
5. **Refactor de observadores (RM-4.1) como projeto isolado**, com A/B de disparos/s antes/depois — é a maior superfície de regressão restante.
6. **Decisões de produto em lote:** PEN-02…PEN-06 têm decisões simples (ligar/remover/adotar padrão) — fechar em uma reunião com a Direção destrava 5 itens de uma vez.
7. **Validações físicas** (push, crachá, câmera) em ambiente piloto controlado antes de anunciar ao usuário final.
8. **LGPD:** manter testes exclusivamente com contas sintéticas e dados fictícios; dados reais só em contagem/assinatura.
9. **Documentação por perfil** antes da implantação (manuais de operação por papel).
10. **Medir antes de afirmar:** todo estado declarado neste documento nasce de portão medido; futuras alterações devem manter o mesmo padrão de evidência.

---

## RESUMO EXECUTIVO DO DIAGNÓSTICO

**O que o BFR Conecta já possui:** plataforma escolar completa em produção (v120) com 15 papéis, 52 seções, autenticação Google/email, módulos do aluno/responsável/professor/coordenação/direção/secretaria, portaria QR com câmera, transporte com notificação, Proteção Familiar com GPS, Supervisão Educacional com isolamento por escola, comunicação em tempo real e PWA offline.

**O que realmente funciona:** 92 das 104 funcionalidades inventariadas (88,5%) — com prova registrada de cada uma (E2E, censo vivo ou matriz RLS).

**O que está incompleto:** XP/Trilhas (dados estáticos), «Marcar em análise» (módulo morto), indicadores agregados da rede (supervisão).

**O que está com defeito:** 4 itens com problema medido, 2 deles localizados por causa em 12/11. (1) Fome de timers do menu mobile — mitigada, aberta como produto. (2) Aprovação administrativa de contas — funciona e foi medida (RM-1.2), mas o estado `pending` do enum nunca é escrito, deixando os rótulos/portões «Aguardando aprovação» da UI inalcançáveis. (3) **Cadeia de push no cliente** (P.08, RM13-A1) — o SW publicado não tem ouvinte `push`/`notificationclick`, não importa o SW do FCM, e a rota `/firebase-messaging-sw.js` não serve esse ficheiro; emissor, Edge v23 e aceitação FCM estão íntegros, portanto a notificação push **não chega a ser exibida** em aparelho nenhum. Não é «falta de aparelho»: é estrutura ausente no cliente. (4) **Worker responde 500 a caminho inexistente** (RM13-A2) — `worker.mjs:37` chama `env.ASSETS.fetch` com uma string, a exceção dispara antes do fallback e o Cloudflare devolve a página de erro; os 12 ficheiros do bundle servem-se byte-idênticos, logo o defeito é só dos caminhos fora dele — um 404 que parece queda.

**O que ainda não existe:** modo offline da portaria, turnos/calendário, crachá/câmera em hardware real, notificações automáticas de frequência/nota, relatórios comparativos da rede, load testing, suite de produto (UI/papéis/fluxos). **Existe desde 12/11:** a suite mínima automatizada de boot+login+RLS (RM-1.4) — um comando, somente leitura, exit 0/1.

**O que precisa ser melhorado:** overlay executivo (Direção), hero/Home do aluno, tap<44 web, refactor de 55 MutationObservers, acessibilidade residual.

**O que depende de outras funcionalidades:** indicadores da rede dependem da gestão administrativa integrada; notificações de frequência (RM-3.4) agora dependem do **registro manual do professor** — a decisão (a) de 12/11 manteve a frequência como ato do professor, então o evento que dispara a notificação é a escrita em `attendance`, não o check-in da portaria; XP dinâmico depende de modelagem de gamificação; o **piloto de push (RM-5.6)** depende do reparo da cadeia no cliente (RM-1.5), que por sua vez depende da rota correta do Worker (RM-6.9) — a cadeia inteira está hoje atrás de um OK de publicação.

**O que deve ser desenvolvido primeiro:** Fase 1 (3 das 5 tarefas fechadas; o que resta é o **reparo da cadeia de push** RM-1.5 + RM-6.9, que exige OK de publicação, e depois a re-prova RM-1.3 com aparelho e assinatura recriada) → Fase 2 (finalizar os módulos existentes, começando pelas decisões de produto em lote e pela prova do professor com conta real).

**Caminho completo até a versão final:** Fase 1 (validação) → Fase 2 (finalização) → Fase 3 (integração) → Fase 4 (experiência) → Fase 5 (novas funcionalidades) → Fase 6 (homologação e produção), total de 44 tarefas com identificadores RM-x.y, prioridades, dependências, complexidade e critérios mensuráveis (seção 13; a contagem é a saída do parser sobre as seis tabelas, não uma soma manual).

---

**ESTADO DESTA ENTREGA (atualizado 12/11):** diagnóstico, inventário e roadmap concluídos e **aprovados**. Fase 1 em curso: **RM-1.1 FECHADO** por prova read-only + **decisão de produto (a)** registrada em `evidence/roadmap-rm11-decisao.json` (frequência continua manual do professor com a evidência da portaria na mesma tela; **RM-3.1 cancelado**, PEN-14 fechada por decisão), **RM-1.2** feito com ciclo de contas sintéticas (`evidence/rm12-ciclo3.json`, 57 portões/0 falhas, `BASELINE_RESTAURADA`) e **RM-1.4 feito** — a suite mínima boot+login+RLS existe, corre com um comando e fecha verde: `RM14_SUITE_VERDE` 30 verde / 1 amarelo / 0 vermelho, exit 0, diário em `evidence/rm14-suite.json`, controle negativo provado (21/31, exit 1). Os dois achados da suite viram itens próprios do roadmap (**RM14-A1** → PEN-24/RM-6.7, **RM14-A2** → PEN-25/RM-6.8); nenhum portão foi enfraquecido para obter o verde. **RM-1.3 foi medida 12/11 e NÃO fechou** — `RM13_CADEIA_PARTIDA` (8 verdes / 6 vermelhos de 14, exit 1; `evidence/rm13-rotas.json` + `evidence/rm13-aparelho.json` 5/10): a causa está localizada no **cliente publicado** (RM13-A1 → PEN-26: o SW registrado não tem ouvinte `push`/`notificationclick`, não importa o SW do FCM e a rota `/firebase-messaging-sw.js` devolve 500) e num defeito próprio do Worker (RM13-A2 → PEN-27: `worker.mjs:37` chama `env.ASSETS.fetch` com string, e todo caminho fora dos 12 ficheiros do bundle devolve 500 em vez de 404). Emissor, Edge v23 e aceitação FCM continuam íntegros (4/4 × 200 `sent:1`) e `push_subscriptions` tem 0 linhas. O reparo entrou como **RM-1.5 + RM-6.9** e **não foi feito nada**: exige OK novo de publicação, e a re-prova da exibição continuará a exigir um aparelho físico com perfil novo e assinatura recriada — a sonda prova a ausência estrutural dos pré-requisitos, não qual dos dois modos de falha dispara primeiro. **Nenhum DDL, nenhuma publicação de versão e nenhum dado real alterado** — as escritas do RM-1.2 foram contas/linhas sintéticas criadas e removidas pelo próprio ciclo, com baseline conferida por contagem E md5 antes e depois; o RM-1.4 é somente leitura.
