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

`scripts/seg-precommit-gate.mjs` corre antes de cada commit e varre o que está prestes a entrar.
Nunca imprime um valor: só contagens, comprimentos e os md5 casados.

O portão cobre três camadas e diz qual delas bateu:

| Camada | O que é | O que o portão faz |
|---|---|---|
| **A — credencial de servidor** | PAT (`ghp_`/`github_pat_`/…), JWT com `role=service_role`, chave PEM | **BLOQUEIA**, exit 1 |
| **B — segredo do utilizador** | senha hardcoded do corpus; token de sessão/refresh opaco; JWT cujo papel não é `anon` nem `service_role`; `Bearer <opaco>`; literal `*token*`/`*secret*`/`*credential*`/`*authorization*`/`*passw*` com forma de credencial | **BLOQUEIA**, exit 1 |
| **C — chave pública de cliente** | JWT com `role=anon` | **conta** (`anon-JWT=n`), não bloqueia |

A camada B foi acrescentada 09/11 porque a primeira versão só via A e as senhas do corpus: os
tokens opacos — refresh tokens das contas sintéticas, `access_token` gravado nos diários — passavam
todos. A cobertura de B vem de três sondas sobre o mesmo texto:

1. **JSON estrutural**: percorre chaves e valores, marca o valor se o nome bater
   `token|secret|credential|authorization|passw` **e** o valor tiver forma de credencial
   (`^[A-Za-z0-9._~+/=-]{16,}$`).
2. **Literal de código**: mesma regra sobre `nome: '…'` / `nome = "…"` em qualquer ficheiro.
3. **Cabeçalho**: `Bearer <opaco>`, com os JWT `anon` já descontados para não contar a chave pública.

As duas excepções medidas, que não são descuido:

- `secretar[a-z]*` é riscado do nome antes de testar, porque `secretary_uid` **contém** `secret` e
  dar-lhe fogo seria travar a casa toda. O corte é só letras, por isso `secretary_token` reduz a
  `_token` e continua a bloquear. (`\b` depois de `secretary` **não** serve: `_` é caractere de
  palavra, não há fronteira antes de `_uid`.)
- A forma é obrigatória. Sem ela, `audit-publicacao-v115.json` dava `authorization` len 186 e
  `credential` len 103 — prosa com espaços, não credenciais.

Binários não são cobertos por scanner de texto e o portão diz isso em vez de dar OK: `.png`/`.pdf`/
`.woff2`/… ou qualquer ficheiro com byte NUL nas primeiras 8 KiB saem `BINARIO <n> B — NAO COBERTO`
e **BLOQUEIA**. A escape é humana e deliberada: `--ack-binario`, para quando a imagem foi vista à mão.
Foi exactamente assim que as duas capturas do login (`docs/v118-*.png`) entraram no commit `0969781`
depois de inspeccionadas, e não por um OK automático.

Os controles positivos rodados 09/11, porque um portão sem controle é décor:

| Controle | Resultado |
|---|---|
| `scripts/s20-behavioral.mjs` (senha conhecida no tip) | `senha-conhecida=1` → **BLOQUEIA**, exit 1 |
| PAT sintético num ficheiro fora do repo | `PAT=1` → **BLOQUEIA**, exit 1 |
| Ficheiro que não existe | `INEXISTENTE — FALHA ALTA` + `INSTRUMENTO CEGO`, exit 1 |
| JSON com `refresh_token`, `access_token` e `tokens[]` | `tier-B=3` → **BLOQUEIA**, exit 1 |
| Código com `REFRESH_TOKEN = '…'` e `Authorization: 'Bearer …'` | `tier-B=2` → **BLOQUEIA**, exit 1 |
| Ficheiro com apenas a JWT `anon` | `tier-B=0 anon-JWT=1` → **OK**, exit 0 |
| JWT `service_role` | `service_role-JWT=1` → **BLOQUEIA**, exit 1 |
| PNG sem `--ack-binario` / com ela | exit 1 `NAO COBERTO` / exit 0 com `NOTA` |
| Ficheiro só com nomes da casa (`secretary_uid`, `secretaria_*`) e um `secretary_token` | `tier-B=1`, e o único hit é `secretary_token` |

A primeira versão do portão tinha **o corpus cego**: colhia as senhas das chaves `*pass*` dos
`*-sessions.json`, onde `weak_password` é `null` — dava `0 senhas` e ainda assim `OK`. É a mesma
família de falha do `not_after` NULL logo abaixo: a extracção não encontrou nada e o veredito
positivo era a ausência do instrumento, não a ausência do segredo. Os dois modos de cegueira
(corpus vazio e ficheiro ignorado em silêncio) passaram a sair com exit 1, e o binário não coberto
entrou na mesma família.

### Varredura dos 445 ficheiros rastreados (09/11)

Com o portão já em B, correu-o sobre **todo** o tracking para medir o ruído e o que sobra de real.
Saída: 81 bloqueios, dos quais **79 binários** (33 PDF + 46 PNG) e **2 em texto**. Os dois são
verdadeiros, não falsos positivos:

- `docs/c2-fixtures.json` — `badge_token` com 36 caracteres (camada B). Fixture do ciclo C2; o
  valor é de conta sintética já apagada, mas é segredo e entra no portão.
- `reset-supervisor-password.mjs` — rastreado e **presente no tip empurrado**, com 1 senha hardcoded
  de 7 caracteres. Confirmado por md5 contra as 3 contas S20 ainda vivas: **não corresponde a
  nenhuma**, ou seja, não é a credencial de uma conta activa — mas é P1 da mesma classe dos 19
  ficheiros do commit `80c951c` e ficou para trás.

**Fechado (09/11):** `git rm --cached reset-supervisor-password.mjs` (mantém-se no disco, 1068 B
inalterados) + entrada própria no `.gitignore` ao lado das irmãs de mint, em `2a6a351`. A varredura
repetida depois do corte dá **444 ficheiros lidos, 80 bloqueios = 79 binários + 1 texto**
(`docs/c2-fixtures.json`); antes eram 445 e 2. A rotação, essa, **não tem alvo** e foi medida como N/A:
- o `USER_ID a6624c51-8b6e-41cd-b8d1-f227eacb2273` do script **não está** em `auth.users`
  (portão de controlo: a mesma consulta devolve **17** contas, logo o zero é facto e não instrumento cego);
- `bcrypt.compare` da senha de 7 caracteres contra os 17 hashes vivos → **0 contas destrancadas**;
- a senha escrita era literal de 7 caracteres num campo que devia levar hash bcrypt, ou seja o
  script estava quebrado antes de quebrar a conta — e fica invisível ao portão a partir de agora;
- corrida sem `--com-disco` depois do corte, o `seg-p1-senha-viva.mjs` sai com **INSTRUMENTO CEGO:
  zero senhas colhidas** — que é precisamente o veredicto correcto: o tracking já não contém senha
  em claro nenhuma, e o guarda de cegueira recusa-se a emitir «nada encontrado» sem instrumento.
  Re-medido 09/11 depois de `seg-rotacao-8.mjs` entrar no índice: continua **0**, mas só porque o
  predicado passou a filtrar interpolação — ver a armadilha em «P1 item 1».

**Descoberta do mesmo passe — 8 combinações senha-conta que ainda funcionam hoje.** Colhidas com
`seg-p1-senha-viva.mjs --com-disco`, que junta o tracking (1 senha, antes do corte) aos ficheiros
ignorados do disco e compara por bcrypt contra os hashes vivos:
- `scripts/c7-gap-fix-prova.mjs` (len 9) → destranca 4 contas `@test.local` deixadas pelo S19
  (0 sessões) **+** `981fcbb0…@bfr-admin.test` com **1 sessão viva**;
- `scripts/s20-behavioral.mjs` (len 12) → destranca as 3 contas `@bfr.test` do S20, **3 sessões cada**
  = os 9 refresh tokens da pendência 1.

Rodar estas 8 é escrita em `auth` e **não estava** no OK do item 2; fica como acção nova. As 9
contas `@gmail.com` são OAuth-only (sem senha nenhuma) e não se tocam.

Depois dos cortes de `secretary` e da exigência de forma, **zero falsos positivos em ficheiros de
texto**.

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
node scripts/seg-precommit-gate.mjs $(git ls-files)   # varredura dos tracked (media original: 445, 79 binarios + 2 reais)
node scripts/seg-precommit-gate.mjs docs/v118-swclone-login.png --ack-binario  # escape humana para binario visto

node scripts/seg-p1-supervisor-recon.mjs      # o USER_ID do reset ainda existe? portao de controlo: 17 contas
node scripts/seg-p1-senha-viva.mjs            # senhas do tracking x hashes vivos por bcrypt (0, com o filtro de interpolacao)
node scripts/seg-p1-senha-viva.mjs --com-disco  # idem + ignorados do disco: mediu as 8 combinacoes vivas; hoje da 0
node scripts/seg-p1-admin-route-probe.mjs     # GET admin por conta: quais existem no GoTrue e quais sao linhas-fantasma
node scripts/seg-rotacao-8.mjs                # preflight somente-leitura dos alvos + canais + sessoes (nao escreve)
node scripts/seg-rotacao-8.mjs --rodar        # A ESCRITA: roda a senha dos alvos e prova por bcrypt antes/depois
node scripts/seg-p1-residuo-pos-rotacao.mjs   # resíduo project-wide de sessoes/refresh depois da rotação
node scripts/seg-gate-hit.mjs scripts/X.mjs    # que linha do ficheiro casa com o corpus do portao (linha, len, md5)
```

## P1 item 1 — rotação das 8 combinações vivas — **EXECUTADA 09/11**

OK do usuário («avança com as 8») sobre a acção nomeada: escrita em `auth`. Instrumento
`seg-rotacao-8.mjs`; diário `evidence/p1-rotacao-8.json`; senhas novas **só** em
`C:/Users/pcmac/.bfr-rotacao-senhas.json` (fora do repo, 8 entradas, nunca impressas — no chat saem
comprimento 32 e md5 de 12 hex).

**Achado que mudou o desenho — 4 das 8 são linhas-fantasma.** O `PUT /auth/v1/admin/users/:id`
devolveu **404 `user_not_found`** nas 4 `@test.local`, e o `GET` da mesma rota confirma: existem em
`auth.users` (SQL) mas **o GoTrue não as lista** — 13 contas listadas vs 17 em SQL. É exactamente a
assinatura já registada do GoTrue não reconhecer contas mintadas por SQL direto: a linha foi criada
por SQL e nunca foi sincronizada.
Colhidas 07/11 às 02:24Z por um ciclo que mintou via SQL. Prova comportamental: login com a senha
vazada numa delas → **HTTP 400 `invalid_credentials`, 0 sessões criadas**. Ou seja, **as 4 nunca
destrancaram nada** — o bcrypt dizia «sim» contra um hash que o serviço não usa.

Canal por conta, medido e não presumido:

| Banda | Contas | Canal | Resultado |
|---|---|---|---|
| GoTrue-listada | 1 `@bfr-admin.test` + 3 `@bfr.test` | `PUT /auth/v1/admin/users/:id` | HTTP 200 ×4 |
| linha-fantasma | 4 `@test.local` | `UPDATE auth.users SET encrypted_password=<bcrypt novo>` | 1 linha ×4, e a visibilidade no GoTrue **não mudou** (404→404, portão) |

Prova por `bcrypt.compare` em cada alvo: a senha vazada **deixa** de destrancar, a nova **destranca**.
Depois, sobre o corpus inteiro: **0 combinações vivas**, pelos dois instrumentos
(`seg-rotacao-8.mjs` [6] e `seg-p1-senha-viva.mjs --com-disco`). Re-medido neste passe, já com o
predicado corrigido: o corpus do disco são **6 senhas reais** (md5 `1425d5d3160a` len 13,
`3eceecd4c712` len 14, `bd43650e6ab5` len 13, `ecc4208a7778` len 9, `480341a0aa25` len 12,
`c0f4701d388c` len 12) × 17 hashes → todas `destranca 0`, `TOTAL … que funcionam hoje: 0`,
com 9 contas sem hash bcrypt (OAuth) entretanto registadas.

**As sessões morreram com a rotação — medido, não assumido.** Antes 10 sessões + 10 refresh tokens
(1 `@bfr-admin.test` + 3×3 `@bfr.test`); depois, nos alvos: **sessões 0, refresh 0**. O PUT do Admin
API apaga as linhas, não só marca `revoked`. Project-wide sobram **2 sessões e 2 refresh vivos**, os
dois de contas reais `@gmail.com` OAuth — **não se tocaram** (`contas @gmail.com intactas: 9`).
Isto fecha a Escada B do censo do histórico empurrado: os 9 refresh tokens reutilizáveis dos 309
blobs de `origin/main` deixaram de valer alguma coisa. O que o push leva consigo a partir de agora é
só o **texto** das senhas (inúteis) e os ficheiros de sessão obsoletos.

Armadilha de instrumento nova: o `seg-p1-senha-viva.mjs` tinha o guarda de cegueira **antes** do
passeio pelo disco, e como o tracking ficou sem senha nenhuma (2a6a351) ele saía com «INSTRUMENTO
CEGO» sem nunca comparar o disco — cegueira produzida pelo próprio conserto. O guarda passou a
avaliar o corpus que vai ser comparado.

Duas correções no `seg-rotacao-8.mjs` depois da escrita, para o próximo ciclo não destruir a prova:
o diário do preflight passou a escrever `evidence/p1-rotacao-8-preflight.json` (antes partilhava o
ficheiro com o da rotação, e um preflight apagaria a evidência), e o campo ambíguo `http` do diário
passou a ser `escrita` + `gotrue_http`. No diário que está aqui, `http: 200` nas 4 `@test.local` é a
confirmação do `UPDATE` (1 linha), **não** visibilidade no GoTrue — essa era 404, medida antes e
depois pelo portão.

Terceira armadilha, esta de **autorreferência do instrumento**: o padrão de colheita
`password\s*[:=]\s*["']…["']` casa SQL/JS interpolado, e a linha do próprio `seg-rotacao-8.mjs`
(`set encrypted_password='${hash}'`) meteu no corpus o literal `${hash}` (len 7). O portão
pre-commit leu-o como «senha conhecida» e **bloqueou o script que continha o seu próprio
placeholder**; o diário registou `senhasColhidas: 7` quando as senhas reais eram 6. Confirmado por
md5 do literal na linha (`649457759e97`), não por olho. Os três colhedores (`seg-precommit-gate.mjs`,
`seg-p1-senha-viva.mjs`, `seg-rotacao-8.mjs`) passaram a descartar tudo o que contenha `${`: um
placeholder de código não é credencial. Consequência que volta a partir deste commit — o tracking
passa a ter `seg-rotacao-8.mjs` com esse literal dentro, e só continua a dar **0** por causa do
predicado; sem ele, o portão bloquearia o próprio guarda.

## Em aberto depois deste passe

1. **Revogar o GitHub PAT** — Prioridade 0; o URL limpo já está aplicado, falta só a revogação e
   o substituto no credential manager. Humana (não há sessão do GitHub no browser).
2. **Decisão do CSP** — uma das três rotas, ou aceitar o risco escrito.
3. **Sessão em localStorage** — item de arquitetura, não estava no plano.
4. Push de `8a93164` + `3f9e056` — não feito; agora bloqueado por **falta de credencial**, não só
   pela revogação. Mede-se com o portão D.
5. **As 4 linhas-fantasma continuam em `auth.users`** — com a hash rodada, mas invisíveis ao GoTrue
   e sem sessão. Apagá-las é outra escrita, irreversível, e não tem OK.

**Fechado neste passe:** as **8 combinações senha-conta vivas foram rodadas** e a régua voltou a 0
(seção acima); `reset-supervisor-password.mjs` saiu do tracking (`git rm --cached`) e entrou
no `.gitignore` junto das irmãs de mint; a rotação do ficheiro foi **medida como N/A** (o `USER_ID`
já não existe em `auth.users` e a senha destranca 0 contas), não presumida.
