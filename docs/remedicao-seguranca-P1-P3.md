# Remediação de segurança — P1, P2, P3

Estado em 09/11/2026 (P0) / 08/11/2026 (P1–P3). Antes deste ficheiro, o plano só existia na
conversa; nada em disco descrevia o que era P1/P2/P3. Este documento é a régua.

## Prioridade 0 — token do GitHub no `.git/config` — 2 de 3 passos APLICADOS 09/11

O URL do remote `origin` tinha um **GitHub Personal Access Token clássico embutido em texto puro**,
no formato `https://user:ghp_…@github.com/…`. Varredura completa das cópias
(`scripts/seg-p0-token-sweep.mjs`, 09/11 — só conta, prefixo e comprimento, nunca o valor):

| Onde | Presente? |
|---|---|
| `.git/config` (antes) | **SIM — 1 ocorrência**, prefixo `ghp_…`, comprimento 40, md5 `4dc83e6d…` |
| `.git/config` (depois) | **0** |
| `~/.gitconfig`, config global e system do Git | não |
| Variáveis de ambiente (`GH_TOKEN`, `GITHUB_TOKEN`, `GH_PAT`) | não |
| `~/.config/gh/hosts.yml`, `~/.netrc`, `~/.npmrc`, `~/.git-credentials` | os ficheiros não existem |
| Histórico empurrado (309 blobs de `origin/main`) | **0 ocorrências** |
| Ficheiros tracked | não |

O token **nunca foi commitado nem pushado**. Mas era uma credencial **viva com escopo de escrita**
no único repositório que alimenta o deploy: quem lesse `.git/config` conseguia fazer push de código
arbitário para `bfr-conecta`.

### O que foi executado 09/11, por instrução directa

`scripts/seg-p0-clean-remote.mjs`:

```
antes:   URL leva segredo embutido? SIM (prefixo ghp_…, comprimento 40, md5 4dc83e6d…)
depois:  https://github.com/turmarobiticabfr-26k/bfr-conecta.git
portao 1 — URL limpo ......................... OK
portao 2 — ocorrências de token no .git/config ... 0
```

E `scripts/seg-p0-no-secret-in-docs.mjs` confirma que o registo deste passe não copiou o valor:
**0 ocorrências** de token por extenso no plano, nos 3 scripts do P0 e nas memórias.

O `git remote set-url` é local e reversível; a reversão seria reescrever o URL antigo, que ficou
deliberadamente **sem registo em disco** — copiá-lo para um ficheiro seria criar uma segunda
credencial.

### Custo medido: o push ficou **sem credencial**

Instalar o URL limpo retira o segredo mas não instala um substituto. Medido com a interactividade
desligada (`GCM_INTERACTIVE=never`, `GIT_TERMINAL_PROMPT=0`) para não abrir janelas de login —
`scripts/seg-p0-access-probe.mjs`, 09/11:

```
portao A — URL limpo (sem user:segredo@) ....... OK
portao B — credential fill ..................... FALHA — GCM não devolve nada
           fatal: Cannot prompt because user interactivity has been disabled.
           fatal: could not read Password for 'https://turmarobiticabfr-26k@github.com'
portao D — ls-remote origin .................... FALHA — terminal prompts disabled
portao E — HEAD local / origin/main ............ 3f9e056 / 80c951c
portao F — arvore de trabalho .................. 32 entradas
```

Consequência honesta: `8a93164` e `3f9e056` continuam **locais**, e qualquer push fica bloqueado
por falta de credencial — já não apenas por falta de revogação. É o preço correcto do passe
(o URL antigo valia por uma chave de escrita), mas tem de ser pago antes do próximo deploy
do front que dependa de push. Os portões E/F provam que o conteúdo do repositório não mudou:
só o URL mudou.

### Por que razão a revogação não é minha

Tentei executar: `github.com/settings/tokens` no browser do rig devolve a página
**Sign in to GitHub**. Não há sessão do GitHub nesta máquina, e entrar pede a password da conta
e 2FA — só o dono da conta pode fazê-lo. Fica portanto na lista de passos em baixo.

Nota de honestidade, obrigatória: o valor do token **apareceu por extenso neste chat duas vezes**,
por dois `sed` meus que falharam o casamento — o primeiro assumia `url = ` quando o `git config`
separa por **TAB**; o segundo usava `\0` no substituto, o que reinsere o texto casado.
Resultado: **este token trata-se como comprometido independentemente do repositório**, e a
revogação não é opcional nem pode esperar por um próximo incidente.

### O que falta — passos humanos

1. **Revogar**: `github.com` → avatar → *Settings* → *Developer settings* → *Personal access tokens*
   → *Tokens (classic)* → o token de prefixo `ghp_gXrh…` → **Revoke confirmation**. Se a lista
   for de *fine-grained*, é em *Personal access tokens → Fine-grained tokens*.
2. **Emitir substituto mínimo** — de preferência *fine-grained*: *Contents: Read and write*
   e, em *Repository access*, **Only select repositories** → `bfr-conecta`. Nada de `repo` completo,
   nada de admin, nada de write packages.
3. **Guardar sem voltar ao URL** — duas rotas, escolher uma:
   - escrever o token novo num ficheiro meu (`~/.gh-token`, com `chmod 600`) e dizer-me; eu instalo-o
     no credential manager pelo stdin do `git credential approve` e apago o ficheiro. O valor
     nunca passa pelo comando nem pelo chat.
   - ou correr uma vez `git push` num terminal interactivo e deixar o Git Credential Manager
     guardar a credencial sozinho.
   Em nenhuma das rotas se volta a pôr o token no URL do remote.
4. **Confirmar**: `git ls-remote --heads origin` → deve listar ramos; depois `git push origin main`
   para o que está local (`git log --oneline origin/main..HEAD` é a régua; eram 2 em 09/11 de manhã,
   são 5 depois dos commits do censo e do P0).

Não há mais nada a conferir fora do `.git/config`: a varredura em cima mediu o config global, o
system, o ambiente, `gh/hosts.yml`, `.netrc`, `.npmrc`, `.git-credentials` e os 309 blobs
empurrados — tudo zero ou inexistente.

Nota de honestidade: a memória `bfr-repo-snapshot-v59` dizia «sem remote». É falso — há um
`origin` com push e o P1 foi **pushado** por ele. Corrigido em `bfr-repo-snapshot-v59.md`.

### Portão pré-commit — para o próximo ciclo não voltar a fazer o P1

`scripts/seg-precommit-gate.mjs` corre antes de cada commit e varre o que está prestes a entrar:
PAT (`ghp_`/`github_pat_`/…), JWT com `role=service_role`, chave PEM e — por **md5 contra um corpus
colhido dos próprios scripts de mint** — as senhas hardcoded das contas sintéticas. Nunca imprime
um valor: só contagens, comprimentos e os md5 casados.

Os três controles positivos rodados 09/11, porque um portão sem controle é décor:

| Controle | Resultado |
|---|---|
| `scripts/s20-behavioral.mjs` (senha conhecida no tip) | `senha-conhecida=1` → **BLOQUEIA**, exit 1 |
| PAT sintético num ficheiro fora do repo | `PAT=1` → **BLOQUEIA**, exit 1 |
| Ficheiro que não existe | `INEXISTENTE — FALHA ALTA` + `INSTRUMENTO CEGO`, exit 1 |

A primeira versão do portão tinha **o corpus cego**: colhia as senhas das chaves `*pass*` dos
`*-sessions.json`, onde `weak_password` é `null` — dava `0 senhas` e ainda assim `OK`. É a mesma
família de falha do `not_after` NULL logo abaixo: a extracção não encontrou nada e o veredito
positivo era a ausência do instrumento, não a ausência do segredo. Os dois modos de cegueira
(corpus vazio e ficheiro ignorado em silêncio) passaram a sair com exit 1.

---

## Prioridade 1 — credenciais no versionamento — APLICADO (com lacucha fechada agora)

Commit `80c951c`: 19 ficheiros saíram do tracking (`c2-sessions.json` + 14 scripts com senha
hardcoded + 3 SQL/docs).

**Correção (09/11):** a frase anterior — «a rotação de sessões era mesmo N/A» — **é falsa** e foi
substituída pela secção «Censo do histórico empurrado (`origin/main`)» mais abaixo.
Os JWTs do `c2-sessions.json` são de contas apagadas, mas o mesmo não vale para os ficheiros dos
ciclos seguintes, que também foram pushados.

**A lacucha:** o `.gitignore` listava ficheiros **um a um**. Os ciclos seguintes ao P1 criaram
`s19-sessions.json`, `s20-sessions.json` e `evidence/s18-contas-arquivo.json` com nomes novos,
e esses entraram no tracking sem barulho. Não é hypothetical — aconteceu no mesmo dia.

Fechado em `8a93164`: entradas por ficheiro trocadas por padrões (`*-sessions.json`,
`*-contas*.json`), e os 3 ficheiros desanexados (ficam no disco). Re-censo: **0 JWT vigente tracked**.

## Prioridade 2-1 — escopo por escola em `profiles_read` e `gate_badges_staff_manage` — APLICADO

Dry-run transacional (ler antes → aplicar → ler dentro da transação → rollback) provou o texto novo
sem escrever; aplicação HTTP 201; conferência de catálogo confirmou a persistência. Reversão pronta
em `sql/p2-1-escopo-escola-candidate.sql`.

- `profiles_read`:5 ramos — perfil próprio, developer, staff da mesma escola (via `staff_schools`),
  alunos da escola do staff, responsáveis desses alunos.
- `gate_badges_staff_manage`: developer **ou** staff cuja escola casa o `students.school_id` do crachá.

## Prioridade 2-2 — `bfr_pf_notify_location()` SECURITY DEFINER — MITIGADO, sem ação

Medido no catálogo em 08/11 (`scripts/p2-2-verify.mjs`):

| Fato | Valor |
|---|---|
| `prosecdef` | `true` (necessário — lê o Vault) |
| dono | `postgres` |
| linguagem | `plpgsql` |
| `search_path` | fixo em `'public','pg_temp'` dentro da função |
| `proacl` | `postgres=X/postgres`, `service_role=X/postgres` — **sem `anon`, sem `authenticated`, sem `public`** |
| segredo | `vault.decrypted_secrets` nome `pf_emissor_service_role`, nunca literal no corpo |

É o padrão correto: SECURITY DEFINER com superfície de chamada fechada ao service_role e segredo
fora do texto da função. Nada a mudar.

## Prioridade 2-3 — CSP `unsafe-inline` — ABERTO, exige decisão de produto

Medido nos bytes publicados (`scripts/p23-p3-measure.mjs`):

```
CSP vive num <meta http-equiv>, não como header HTTP do Worker
script-src: 'self' 'unsafe-inline' https://…workers.dev https://cdn.jsdelivr.net
            https://static.cloudflareinsights.com https://www.gstatic.com
<script> total .............. 108   (5 externos, 103 inline)
innerHTML que cria <script> ... 0
eval()  ....................... 0
new Function() ................ 0
<style> blocos ............... 49
atributos style="" .......... 286
```

O zero em `eval`/`new Function`/injeção de script é o que torna a opção viável: não há código
dinamicamente compilado que um `strict-dynamic` precise deixar passar.

Custo real de cada rota:

1. **Nonce do Worker** — o Worker serve o HTML, então pode gerar um nonce por request, injetá-lo
   em cada um dos 103 `<script>` e publicar `script-src 'nonce-…'` como header. É a única rota que
   sobrevive a um deploy novo sem trabalho extra. Risks: o Service Worker guarda o shell em cache —
   um HTML com nonce fixo no cache fica invalido em requests seguintes, o que pode partir o boot
   offline. exige mexer no PRECACHE da v118.
2. **Hash por script** — 103 hashes recalculados a **cada** bump de versão. O pipeline de candidata
   já é determinístico por md5, então dá para automatizar, mas um só byte mudado num script invalida
   o CSP inteiro. Frágil para o ritmo deste projeto.
3. **Ficheiros externos** — mover 103 blocos para `.js` é a mudança mais limpa e a única que também
   destrava `style-src`, mas é uma reescrita do bundle e um risco de regressão de grandeza fora do
   perfil de «ajuste de segurança».

**`style-src` não tem saída fácil em nenhuma das três:** 286 atributos `style=""` exigem
`'unsafe-inline'` ou a reescrita de todos eles. Fechar `script-src` e deixar `style-src` aberto é
ganho parcial honesto — dizer o contrário seria vender mais do que é.

Recomendação: opção 1 (nonce no Worker) **ou** aceitar o risco documentado e fechar primeiro só
`object-src`/`base-uri`/`frame-ancestors` como header HTTP, que um `<meta>` não cobre. Nenhuma
delas apliquei — é alteração ao caminho de entrega publicado.

## Prioridade 3-A — «credenciais para variáveis de ambiente» — FALSO POSITIVO

O plano original pedia mover chaves para env vars. Medido: não há segredo privado no repositório.

| Classe | Em ficheiros tracked | Veredito |
|---|---|---|
| Firebase `AIza…` ×2 | sim | **pública por design** — vai no cliente de qualquer app Firebase; a barreira é o referrer allowlist da consola, não o segredo |
| Supabase `sb_publishable_…` ×2 | sim | **pública por design** — é a publishable key, idêntica à anon; protegida por RLS |
| JWT de sessão | 2 ficheiros | **URLs assinados de download do Storage** (`scope=download`), expirados |
| `service_role` | **0** | nunca esteve aqui; vive no Vault (`pf_emissor_service_role`) e no `~/.supabase-pat` fora do repo |
| `.env` | não commitado | só um placeholder com valor vazio |

Retirar estas chaves para env vars não melhoraria a postura de segurança: elas já são entregues ao
navegador de qualquer visitante, por definição. O que fecha Firebase é a allowlist de domínios na
consola — por isso `.gitignore`/env não são a barreira aqui.

## Prioridade 3-B — «padronizar chaves de localStorage» — JÁ CONFORME

Censo em `scripts/p3b-localstorage-census.mjs`: **7 chaves distintas**, não as dezenas que um
arquivo de 3,4 MB sugere.

| Chave | Onde | Uso |
|---|---|---|
| `bfr-direction-note` | localStorage | rascunho |
| `bfr-food-progress` | localStorage | preferência |
| `bfr-weather-collapsed` | localStorage | preferência |
| `bfr-login-role` | sessionStorage | dica de papel pré-login |
| `bfr-admin-student-draft` | sessionStorage | rascunho |
| `bfr-admin-student-import-draft` | sessionStorage | rascunho |
| `sb-yyzqoxlkcvqpessypfjo-auth-token` | localStorage | **do SDK**, não nossa |

As 6 chaves da casa já partilham o prefixo `bfr-`. A sétima pertence ao supabase-js e renomeá-la
significa trocar o `storageKey` do cliente — possível, mas sem ganho de segurança.

O ponto que **vale** discussão de produto, e que o plano original não nomeou: a sessão
(access + refresh token) está em `localStorage`, que é legável por qualquer XSS, em vez de memória
ou `sessionStorage`. É o default do SDK e mexer nisso toca o boot, o Service Worker e o re-login
silencioso. É item de arquitetura, não de padronização de nomes.

## Censo do histórico empurrado (`origin/main`) — 09/11

O P1 limpou a **ponta** do tronco (`git rm --cached`), mas o `git push` tinha levado os objetos
alcançáveis. `origin/main` = `80c951c`; o censo percorreu os **309 blobs alcançáveis** desse ref e
classificou por camadas (`scripts/seg-pushed-history-scan.mjs`). Um primeiro passe devolveu
«nenhuma credencial viva» — era **cegueira do instrumento**: o padrão exigia que o `refresh_token`
começasse por `eyJ`, e os reais são opacos de 12 caracteres. Corrigido o padrão e o veredicto.

| Camada | O que é | No histórico empurrado |
|---|---|---|
| **A — credencial de servidor** | `service_role`, `ghp_`, `github_pat_`, PEM privado | **0** — o PAT do GitHub vive só no `.git/config`, nunca foi objeto nem pushado |
| **B — credencial de sessão** | `access_token` + `refresh_token` dos diários de ciclo | **12 pares** em `c2-sessions.json`, `s19-sessions.json`, `s20-sessions.json` |
| **C — chave pública de cliente** | `AIza…` do Firebase (11 caminhos), anon do Supabase (2) | não são segredo; a barreira é a allowlist de domínios |
| **B′ — senha de conta sintética** | literais `password = '…'` | **4 senhas**, em `scripts/s20-behavioral.mjs`, `test-gap3-func.mjs`, `test-gap3-minimal.mjs` |

### O que a camada B + B′ deixa em aberto

Medido em `auth.*` via canal de SQL (status 201, só leitura), cruzando os `sub` **extraídos dos
próprios blobs pushados** (`scripts/seg-map-sub-state.mjs`, `scripts/seg-s20-session-detail.mjs`,
`scripts/seg-password-radius.mjs`):

- Dos 12 `sub` vazados, **9 já não existem** em `auth.users` → esses tokens morreram com a conta.
- **3 existem** e não estão soft-deleted: `s20-coordinator@bfr.test`, `s20-director@bfr.test`,
  `s20-supervisor@bfr.test`. Cada uma tem 3 sessões e **3 refresh tokens com `revoked = false`**
  → **9 credenciais de sessão reutilizáveis em contas vivas**, e a senha de todas as 4 contas S20
  está no histórico.
- Os 12 `access_token` estão vencidos (o mais recente expirou 08/11 21:42Z; medido em 09/11 ~03:00Z).
- Os refresh tokens dos ficheiros **não estão truncados**: `min(length(token)) = max = 12` nas
  20 linhas de `auth.refresh_tokens`.

### Ressalva de instrumento que invalida um dos portões

`auth.sessions.not_after` está **NULL nas 12 sessões do projeto** (e `tag` também; `refreshed_at`
só tem 2 preenchidos). Portanto a leitura «0 sessões dentro da janela» foi uma **comparação com
NULL**, não prova de expiração. Não existe no banco registo de validade para essas sessões; o único
vencimento medido é o do JWT de acesso. Se o GoTrue ainda aceita um refresh dessas 9 linhas **não é
determinável por leitura** — o teste decisivo é um `POST /token?grant_type=refresh_token`, que
escreve em `auth` e roda token novo. Não executei.

### Ação que fecha isto (exige OK)

1. `DELETE /admin/users/<id>` das 3 contas S20 sobreviventes (ou `PUT /admin/users/<id>` a mudar a
   senha) — apaga as sessões e os 9 refresh tokens por cascade. É escrita em produção da mesma
   bancada onde as contas são usadas por ciclos de teste, por isso precisa de OK novo.
2. Reescrever o histórico pushado (o `git rm --cached` da ponta não tirou os blobs do remoto) ou
   aceitar que os ficheiros de diário ficam legíveis para quem tem leitura do repo — são contas
   sintéticas, mas a senha é a mesma das 4.
3. Deixar de escrever a sessão crua em `*-sessions.json`: guardar só o `sub`, o `role` e o `exp`.
   Nenhum ciclo seguinte precisa do token inteiro em disco.

## Como reproduzir cada medição

```
node scripts/p2-2-verify.mjs        # catálogo: prosecdef, dono, proacl, corpo
node scripts/p23-p3-measure.mjs     # CSP + contagem de scripts inline
node scripts/p3-jwt-classify.mjs    # claims/expiração dos JWT por ficheiro
node scripts/seg-tracked-census.mjs # censo só nos ficheiros tracked (a régua certa)
node scripts/p3b-localstorage-census.mjs

node scripts/seg-pushed-history-scan.mjs    # censo por camadas dos 309 blobs de origin/main
node scripts/seg-map-sub-state.mjs          # cada sub vazado -> conta + estado em auth.*
node scripts/seg-s20-session-detail.mjs     # not_after/refreshed_at/tag: a coluna esta NULL
node scripts/seg-password-radius.mjs        # senha local x historico empurrado x contas vivas
node scripts/seg-check-password-push.mjs    # a senha das 3 contas vivas saiu no push anterior?
node scripts/seg-check-token-death.mjs      # agregado read-only de morte das sessoes

node scripts/seg-p0-token-sweep.mjs         # onde vivem as copias do PAT (so conta/prefixo/comprimento)
node scripts/seg-p0-clean-remote.mjs        # instala o URL limpo + portoes 1/2
node scripts/seg-p0-access-probe.mjs        # custo do push depois do URL limpo (portoes A-F)
node scripts/seg-p0-no-secret-in-docs.mjs   # portao: zero tokens por extenso nos registos e memorias

node scripts/seg-precommit-gate.mjs --staged  # portao de aplicacao: nada de credencial no commit
```

## Em aberto depois deste passe

1. **Remover ou rodar a senha das 3 contas S20 vivas** — fecha os 9 refresh tokens reutilizáveis e a
   senha partilhada que estão no histórico. Escrita em `auth`, precisa de OK.
2. **Revogar o GitHub PAT** — Prioridade 0; o URL limpo já está aplicado, falta só a revogação e
   o substituto no credential manager. Humana (não há sessão do GitHub no browser).
3. **Decisão do CSP** — uma das três rotas, ou aceitar o risco escrito.
4. **Sessão em localStorage** — item de arquitetura, não estava no plano.
5. Push de `8a93164` + `3f9e056` — não feito; agora bloqueado por **falta de credencial**, não só
   pela revogação. Mede-se com o portão D.
