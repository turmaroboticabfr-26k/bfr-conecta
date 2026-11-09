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
3. **Guardar sem voltar ao URL** — o token vive só em `~/.gh-token`, escrito pelo dono. Em
   PowerShell, sem que o valor passe pelo histórico nem pela impressão:
   ```powershell
   $t = Read-Host "cola o token" -AsSecureString
   $t | ConvertFrom-SecureString -AsPlainText | Set-Content -NoNewline "$env:USERPROFILE\.gh-token"
   ```
   Depois instala-se com `scripts/seg-p0-install-credencial.mjs`, que lê esse ficheiro, deriva
   `host` e `username` do `remote.origin.url` (o username que o GCM pede é o dono do path:
   `turmarobiticabfr-26k`), envia o valor **por stdin** para `git credential approve` e confere com
   `git ls-remote origin`. `--dry-run` mostra o payload com `password=REDACTED` e não escreve em
   nada; `--token-file=` é para teste. Nunca imprime o token: só `len` e os 12 hex do md5, e o
   substituto da redacção é **texto fixo** (a regra que vem das duas falhas de `sed` acima).
   Alternativa: correr uma vez `git push` num terminal interactivo e deixar o GCM guardar sozinho.
   Em nenhuma das rotas se volta a pôr o token no URL do remote.
4. **Confirmar**: o passo 3 já confere (`ls-remote` com exit 0 = credencial instalada); depois
   `git ls-remote --heads origin` → deve listar ramos; e só então `git push origin main`
   para o que está local (`git log --oneline origin/main..HEAD` é a régua; eram 2 em 09/11 de manhã,
   são 5 depois dos commits do censo e do P0).

Não há mais nada a conferir fora do `.git/config`: a varredura em cima mediu o config global, o
system, o ambiente, `gh/hosts.yml`, `.netrc`, `.npmrc`, `.git-credentials` e os 309 blobs
empurrados — tudo zero ou inexistente.

Nota de honestidade: a memória `bfr-repo-snapshot-v59` dizia «sem remote». É falso — há um
`origin` com push e o P1 foi **pushado** por ele. Corrigido em `bfr-repo-snapshot-v59.md`.

### Portão pré-commit — para o próximo ciclo não voltar a fazer o P1

`scripts/seg-precommit-gate.mjs` varre o que está prestes a entrar. Medido 09/11: **não há hook
instalado** — `core.hooksPath` está vazio e `.git/hooks` só tem ficheiros `.sample`, por isso o portão
corre **quando se lhe chama**, à mão, antes de cada `git commit`. Ligar o `pre-commit` ao repo é
decisão do dono e não foi tomada aqui.
Nunca imprime um valor: só contagens, comprimentos e os md5 casados.

O portão cobre quatro camadas e diz qual delas bateu:

| Camada | O que é | O que o portão faz |
|---|---|---|
| **A — credencial de servidor** | PAT (`ghp_`/`github_pat_`/…), JWT com `role=service_role`, chave PEM | **BLOQUEIA**, exit 1 |
| **B — segredo do utilizador** | senha hardcoded do corpus; token de sessão/refresh opaco; JWT cujo papel não é `anon` nem `service_role`; `Bearer <opaco>`; literal `*token*`/`*secret*`/`*credential*`/`*authorization*`/`*passw*` com forma de credencial | **BLOQUEIA**, exit 1 |
| **C — chave pública de cliente** | JWT com `role=anon` | **conta** (`anon-JWT=n`), não bloqueia |
| **D — registos fora do repo** | senha do corpus **por extenso** na memória do projecto (`~/.qoder/projects/<slug>/memory`), onde nenhum path staged chega | **BLOQUEIA**, exit 1 — delegada no `seg-fin-mem-varredura.mjs` |

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

A camada D foi ligada 09/11 e **não duplica o predicado**: o gate chama
`execFileSync('node', ['scripts/seg-fin-mem-varredura.mjs'])` e repassa o stdout dele. Uma segunda
implementação do mesmo teste divergiria da primeira — é o que aconteceu entre o redactor de forma do
§10 e o varredor por corpus do §11, que olharam para o mesmo directório e viram coisas diferentes. Como os registos estão **fora** do repo, nenhum
`--staged` os vê; o caminho da memória é derivado (`path.dirname(REPO)` → slug →
`~/.qoder/projects/<slug>/memory`), conferido byte a byte contra o directório real, e há
`--mem-dir=` para o Negative test. Se o directório não existe ou não tem um único `.md`, o varredor
sai `INSTRUMENTO CEGO` com exit 1 — um portão sobre um corpus que não se leu não pode dar OK.

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

Re-medido 09/11 nos **bytes publicados** (`scripts/p23-csp-live.mjs`, alvo derivado de
`audit-publicacao-v117.json`; diário em `evidence/p23-csp-live.json` e
`evidence/seg-fin-2026-11-09.log`). O `p23-p3-measure.mjs` lia o disco; medido agora nos dois
lados, **disco e ar são byte-idênticos** (`3 489 467` B, md5 `ae59d35346b6`, 108 `<script>`,
103 inline, 286 `style=""` nos dois), por isso as contagens antigas mantêm-se válidas.

O que só se vê no ar:

| Fato medido no ar | Valor |
|---|---|
| headers HTTP de segurança (7 testados: CSP, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, `strict-transport-security`, `cross-origin-opener-policy`) | **AUSENTES nos 7** — o único header de relevo é `server: cloudflare` |
| `frame-ancestors` | **AUSENTE** — não está no `<meta>` (um `<meta>` não pode transportá-la) nem como header → hoje **não há nenhuma protecção anti-cliquejacking declarada** |
| `object-src` | `'none'` — já declarado e já efectivo, ao contrário do que este plano afirmava em §Recomendação |
| `base-uri` | `'self'` — idem |
| `form-action` | `'self' https://accounts.google.com https://*.supabase.co` |
| política completa | `evidence/p23-csp-live.json` → `politicaMetaCompleta` |

```
script-src: 'self' 'unsafe-inline' https://bfr-conecta.turmaroboticabfr.workers.dev
            https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.gstatic.com
<script> total .............. 108   (5 externos, 103 inline)
innerHTML que cria <script> ... 0
eval()  ....................... 0
new Function() ................ 0
atributos on*= ................ 0
<style> blocos ............... 49
atributos style="" .......... 286
```

O zero em `eval`/`new Function`/`on*`/injeção de script é o que torna a opção viável: não há código
dinamicamente compilado que um `strict-dynamic` precise deixar passar.

Custo real de cada rota:

1. **Nonce do Worker** — o Worker serve o HTML, então pode gerar um nonce por request, injetá-lo
   em cada um dos 103 `<script>` e publicar `script-src 'nonce-…'` como header. É a única rota que
   sobrevive a um deploy novo sem trabalho extra. **O risco que este plano declarava estava
   sobrestimado, e agora está medido** (`scripts/seg-fin-sw-shell.mjs`, corpo do SW em
   `evidence/ar-sw-v4-2026-11-09.js`): o `fetch` do SW serve navegações do shell **network-first com
   `cache:'no-store'`** e usa o cache apenas como fallback; e o `cache.put` grava o par
   header+corpo juntos, logo um HTML replicado offline chega com o nonce com que foi gravado. O
   `PRECACHE_PATHS` inclui `'/'`, mas esse é o caminho de fallback, não o caminho de boot normal.
2. **Hash por script** — 103 hashes recalculados a **cada** bump de versão. O pipeline de candidata
   já é determinístico por md5, então dá para automatizar, mas um só byte mudado num script invalida
   o CSP inteiro. Frágil para o ritmo deste projeto.
3. **Ficheiros externos** — mover 103 blocos para `.js` é a mudança mais limpa e a única que também
   destrava `style-src`, mas é uma reescrita do bundle e um risco de regressão de grandeza fora do
   perfil de «ajuste de segurança».

**`style-src` não tem saída fácil em nenhuma das três:** 286 atributos `style=""` exigem
`'unsafe-inline'` ou a reescrita de todos eles. Fechar `script-src` e deixar `style-src` aberto é
ganho parcial honesto — dizer o contrário seria vender mais do que é.

Recomendação corrigida pela medição: o parágrafo anterior mandava fechar `object-src`/`base-uri`/
`frame-ancestors` como header «que um `<meta>` não cobre». Medido: dos três, **só `frame-ancestors`
escapa ao `<meta>`** — `object-src 'none'` e `base-uri 'self'` já estão declarados e já valem. O
passo pequeno e independente do resto é, portanto, publicar **apenas** `frame-ancestors` (e os
outros headers de relevo) como header HTTP do Worker; nada mais fica por decidir para o fechar.
Nenhuma destas rotas apliquei — é alteração ao caminho de entrega publicado, e a escolha entre 1,
2, 3 ou «só headers» é do dono.


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

### O que a camada B + B′ deixa em aberto — **FECHADO por medição em 09/11 (~05:50Z)**

Re-medido com o mesmo canal (`auth.*` via SQL, só leitura), cruzando os 12 `sub` extraídos dos
**blobs alcançáveis** do `origin/main` (`scripts/seg-fin-cruzar-subs-vivas.mjs`; diário em
`evidence/seg-fin-2026-11-09.log` §3):

| Medição | 09/11 ~03:00Z (passe anterior) | 09/11 ~05:50Z (re-medido) |
|---|---|---|
| `sub` vazados com linha em `auth.refresh_tokens` | 9 linhas com `revoked = false` nas 3 contas S20 | **0 de 12** — nenhuma linha, revogada ou não |
| Sessões das 3 contas S20 | 3 cada | **0 cada** (`scripts/seg-fin-censo-s20.mjs`) |
| `auth.sessions` project-wide | — | **2**, ambas de contas `@gmail.com` reais que **não** estão entre os 12 `sub` vazados |

Ou seja: a rotação de sessões das 8 combinações senha-conta (09/11, `evidence/p1-rotacao-8.json`)
matou também as linhas das contas S20. **Não sobrou nenhuma credencial de sessão reutilizável do
histórico pushado** — nem por token, nem por refresh, nem por conta.

Isto também torna **inútil o teste decisivo** que o passe anterior declarava impossível em leitura:
um `POST /token?grant_type=refresh_token` não tem o que reproduzir, porque as 9 linhas deixaram de
existir. A ressalva do `auth.sessions.not_after` NULL continua verdadeira como facto de esquema
(o GoTrue não grava validade nessas colunas), mas deixou de ser um portão em aberto: a pergunta
«estas sessões estão vivas?» foi respondida por contagem directa, não por comparação com NULL.

**A acção nº 1 («apagar as 3 contas S20, exige OK») deixa de existir** — o estado que ela visava
evitar já não acontece. As contas S20 ficam como o que sempre foram: bancada de teste, sem sessão.

Do passe anterior mantém-se, e não é medição minha que fecha:

1. Reescrever o histórico pushado (o `git rm --cached` da ponta não tirou os blobs do remoto) ou
   aceitar que os ficheiros de diário ficam legíveis para quem tem leitura do repo. **A parte de
   credencial utilizável já não existe, e está medida duas vezes**: (a) por `bcrypt.compare` sobre as
   17 contas vivas — as 6 senhas do disco dão `destranca 0` e `TOTAL … que funcionam hoje: 0`
   (`scripts/seg-p1-senha-viva.mjs --com-disco`, diário §7); (b) pelo cruze dos 8 e-mails de conta
   nomeados nos blobs alcançáveis com o passe de rotação — **3 existem e as 3 foram rotacionadas
   (`antigaDestrava=false`, canal `admin-put`)**; as outras 5 (`c7-coordinator/-director/-secretary`,
   `s20-secretary`, `supervisor.synthetic`) já não existem em `auth.users`
   (`scripts/seg-fin-cruzar-s20-rotacao.mjs`, diário §8; `existem e NÃO foram rotacionadas: 0`).
   O que resta da camada B′ é a **divulgação em si**: que aquelas contas sintéticas existiram, com
   que grafia de e-mail e com que padrão de senha. Fecha-se por reescrita do histórico ou por
   aceitação explícita — escolha do dono, não medição.

   *Correcção a este item, que estava escrito ao contrário no passe anterior:* dizia «um login novo
   com essa senha voltaria a criar sessão». Falso — a rotação de 09/11 já trocou a senha das 3
   contas S20 vivas pelo canal admin, pelo que o literal que ficou no histórico não autentica.

2. Deixar de escrever a sessão crua em `*-sessions.json`: guardar só o `sub`, o `role` e o `exp`.
   Nenhum ciclo seguinte precisa do token inteiro em disco. (É o que já fazem os instrumentos
   novos deste passe — só imprimem prefixo de uuid, comprimento e md5.)


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
node scripts/seg-p0-install-credencial.mjs --dry-run   # pre-visualizacao do payload (password=REDACTED)
node scripts/seg-p0-install-credencial.mjs  # le ~/.gh-token, approve por stdin, confere com ls-remote
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

node scripts/p23-csp-live.mjs            # CSP medida nos bytes DO AR (derive a URL do diario, nao a digite)
node scripts/seg-fin-sw-shell.mjs        # o SW publicado faz mesmo cache do shell? + nome do cache em uso
node scripts/seg-fin-cruzar-subs-vivas.mjs  # os 12 sub extraidos dos blobs x auth.* vivo (so prefixo de uuid)
node scripts/seg-fin-censo-s20.mjs       # sessoes/refresh das contas S20, um por um
node scripts/seg-fin-cruzar-s20-rotacao.mjs # contas nomeadas nos blobs x passe de rotacao (canal, antiga destrava)
node scripts/seg-censo-chrome-profile.mjs   # o que o .c2-chrome-profile guarda de sessao (so contagens)

node scripts/seg-fin-mem-redact.mjs          # dry-run da redaccao da memoria do P1 (nunca imprime valores)
node scripts/seg-fin-mem-redact.mjs --apply  # A ESCRITA: redige e congela original em %TEMP%
node scripts/seg-fin-mem-conferencia.mjs     # portao: md5 da memoria == corpus do diario S7 (0/0)
node scripts/seg-fin-mem-varredura.mjs       # portao por CORPUS: 97 registos fora do repo x 6 senhas
node scripts/seg-fin-mem-varredura.mjs --ver # contexto mascarado (o valor sai por <VALOR>, nunca por extenso)
node scripts/seg-fin-mem-redact-por-corpus.mjs        # dry-run: so ficheiro:linha, len e md5
node scripts/seg-fin-mem-redact-por-corpus.mjs --apply  # A ESCRITA: redige e congela em %TEMP%\bfr-mem-redact-corpus-*
node scripts/seg-fin-mem-indice.mjs          # portao de INTEGRIDADE do indice: linhas == topic files, 25 000 B
node scripts/seg-fin-mem-controles.mjs       # controlo negativo dos dois portoes: 5 casos com exit E motivo
node scripts/seg-precommit-gate.mjs --staged # camadas A, B, C sobre o staged + camada D delegada
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

## A memória do projecto era uma segunda cópia em claro das senhas — FECHADO 09/11

Ao re-medir a camada B′ descobriu-se uma exposição que **nenhum portão do repo via**: o ficheiro de
memória `bfr-security-remediation-p1.md` listava os 14 scripts com a **senha em claro ao lado do
nome**, no formato `(md5 <hash> len=N)` que era a régua da época. Ou seja, fora do repo, fora do
`seg-precommit-gate`, fora do censo dos 309 blobs de `origin/main` e fora do
`seg-p0-no-secret-in-docs.mjs` — esse portão só procura padrões de *token do GitHub*
(`ghp_`/`github_pat_`…), por isso nunca teria apanhado senhas de contas sintéticas.

Redigido por `scripts/seg-fin-mem-redact.mjs`: cada linha `- \`ficheiro\` (senha)` passou a
`- \`ficheiro\` (md5 <12hex> len=N)`, com o valor **nunca impresso** (só comprimento e md5), cópia
original para `%TEMP%` antes de escrever, e `--apply` obrigatório. O instrumento agora ignora linhas
cujos rótulos já têm a forma redigida, e aborta com `INSTRUMENTO CEGO` (exit 1) se não reconhecer
nenhuma linha — nesse caso específico o exit 1 **é** o veredito positivo.

**Armadilha nova, a de referência-própria do redactor:** a colheita é
`` /^(\s*-\s*`[^`]+`)\s*\(([^()\n]+)\)\s*$/ `` — «linha de lista com nome em backtick seguida de
parêntesis». O **placeholder** que o próprio script escreve tem exatamente essa forma, por isso
casa no padrão. Um segundo `--apply` sobre o ficheiro já redigido voltou a «encontrar 14 senhas» e
gravou hash-do-placeholder (comprimentos 22–23, quando as senhas reais medem 9–14). O diário §10
registou essa sequência errada e mantém-se; o `10b` anota o que aconteceu. O ficheiro foi restaurado
pela cópia de `%TEMP%` e o guarda de idempotência (linha 32) entrou.

Conferência programática (`scripts/seg-fin-mem-conferencia.mjs`, diário §10b): os md5 do registo
redigido são **exactamente** o corpus que o `bcrypt.compare` testou —

```
memoria do P1: 6 md5 distintos de senha redigida
diario S7:     6 md5 distintos de senha colhida do disco
so na memoria: 0 | so no diario: 0
```

Ou seja, a redacção não inventou nem escondeu nenhuma credencial: 6 senhas reais, 0 delas destrancam
alguma coisa hoje. O que ficou no histórico empurrado continua a ser texto inútil.

### O portão de memória: primeiro por FORMA, e a FORMA era 100 % falso positivo

Escrever um portão para os registos **fora** do repo obrigou a medir o predicado antes de o fiar.
O predicado de forma (linha de lista com parêntesis) casou **24 linhas em 97 ficheiros**, das quais
10 tinham «valor» — e **todas as 10 eram prosa de anotação**: caminhos, `GRANT …`, «id (morto)».
Falso positivo a 100 %, do mesmo género do `${hash}` do bloco 8. O portão passou a ser **por corpus**:
colhe as senhas reais do disco com o predicado de `seg-p1-senha-viva.mjs`
(`password\s*[:=]\s*["']…`, com o filtro `!s.includes('${')`) e procura esses literais.

`scripts/seg-fin-mem-varredura.mjs` (diário §11) encontrou logo o que o portão de forma nunca veria:
uma senha do corpus (`md5 3eceecd4c712 len=14`, a mesma já redigida no registo do P1) **por extenso**
em `bfr-supervisao-fase0-infraestrutura.md:49`, na forma `- **Password**: \`…\`` — que o redactor de
forma não apanhava, porque ali a senha está após dois-pontos, não num parêntesis. Segunda cópia em
claro fora do repo, outra vez sem nenhum gate. Redigida por
`scripts/seg-fin-mem-redact-por-corpus.mjs --apply` (cópias originais em
`%TEMP%\bfr-mem-redact-corpus-2026-11-09\`); re-passada: `PORTAO DE MEMORIA OK`, 0 ocorrências, e o
próprio dry-run re-corrido dá `nada a redigir` — o instrumento não se come a si próprio, ao contrário
do redactor do §10.

## A camada D ligada ao portão pré-commit (09/11, depois do bloco acima)

As três prendas do parágrafo anterior foram as coisas que tiveram de ser resolvidas, e não razões
para adiar:

- **`--staged` não vê o que é fora do repo.** A camada D não passeia pelos paths staged: o gate chama
  `execFileSync('node', ['scripts/seg-fin-mem-varredura.mjs'])` e repassa o stdout. Uma só
  implementação do predicado — o erro original deste ciclo foi justamente ter um redactor de forma e
  um varredor de corpus a olhar para o mesmo directório.
- **O caminho da memória não é uma literal digitada.** Era
  `C:/Users/pcmac/.qoder/projects/C--Users-pcmac-.../memory` fixo no código; passou a derivar
  (`os.homedir()` + slug de `path.dirname(REPO)` com `:`/`\`/`/` → `-`), conferido byte a byte contra
  o directório real antes de qualquer edição que confie nele. Continua a haver `--mem-dir=` para
  teste.
- **Corpus vazio já não dá OK.** Além do `INSTRUMENTO CEGO` do corpus, o varredor passou a abortar se
  o directório não existe (`nao ha registos em <path>`) e se não tem um único `.md` — os dois modos de
  cegueira de uma camada que se lê mas não cobre nada.

Os quatro comportamentos medidos, com o `--mem-dir=` do controle negativo a apontar para um
directório de ensaio em `%TEMP%` (a senha semeada nunca foi impressa: só `len` e os 12 hex do md5;
o artefacto foi destruído no fim):

| Comportamento | Veredito lido |
|---|---|
| varredor sozinho | `PORTAO DE MEMORIA OK` — corpus 6, 97 ficheiros `.md`, exit 0 |
| gate com a camada D (3 ficheiros) | `camada D — registos fora do repo (memoria do projecto):` … `PORTAO PRE-COMMIT OK — zero credenciais nas camadas A, B, C e D`, exit 0 |
| registo semeado com uma senha do corpus | `prova-camada-d.md: senha md5=1425d5d3160a len=13 aparece 1x` → `PORTAO DE MEMORIA FALHA — 1 ocorrencias` → `PORTAO PRE-COMMIT FALHA`, exit 1 |
| `--mem-dir=` inexistente / directório sem `.md` | `INSTRUMENTO CEGO` nos dois casos, exit 1 |

Re-rodados 09/11 (depois do commit da ligação) com o controlo **congelado** em
`scripts/seg-fin-mem-controles.mjs` — diário §14, 6/6 verde, artefactos de ensaio apagados com a
ausência provada. A razão de congelar: na primeira passada o harness chamava `roda(label, args)`
com `(script, args)`, o argumento de alvo foi consumido como caminho do script, e o portão devolveu
`INSTRUMENTO CEGO: nenhum ficheiro para verificar` com **exit 1** — que batia certo com o esperado
dos casos negativos. Dois controles estiveram verdes por um motivo que não era o predicado medido.
Desde aí cada caso afirma `(código, motivo)`: o código só prova que alguém recusou, não o que foi
recusado; e como a cegueira também devolve 1, um harness partido passaria no teste de segurança.

O que a ligação **não** muda: continua a não haver hook instalado, por isso a camada D corre quando
o portão é chamado — ver «Portão pré-commit» acima.

A camada D diz que não há senha na memória; não diz que a memória é lida. `scripts/seg-fin-mem-indice.mjs`
(diário §13) fecha esse lado com três predicados que têm consequência medida — linhas do `MEMORY.md`
== ficheiros `.md`, zero links partidos, e `MEMORY.md` abaixo do tecto de 25 000 bytes do loader, acima
do qual as últimas linhas deixam de ser lidas. Medido 09/11: 96 | 96, 0 partidos, 24 793 B. O primeiro
passe deste instrumento teve de ser corrigido por ter importado o erro do §11 — impus um tecto de 200
caracteres às linhas do índice e 79 das 96 casavam, todas prosa legítima da casa; passou a aviso
informativo. O achado real foi um frontmatter com `type:` solto em vez de debaixo de `metadata:`,
normalizado.

## Em aberto depois deste passe

### Fechado por medição (09/11 ~05:50–06:30Z), sem escrever em nada

- **Camada B (tokens de sessão nos blobs): morta.** 0 de 12 `sub` vazados têm linha em
  `auth.refresh_tokens`; as 3 contas S20 têm 0 sessões cada.
- **Camada B′ (senhas nos blobs): não autentica.** 6 senhas do disco × 17 hashes = 0; das 8 contas
  nomeadas nos blobs, 3 existem e foram rotacionadas, 5 já não existem.
- **`app/sw-v4.js` do repo vs SW servido: divergência medida** (repo `bfr-conecta-v60`,
  md5 `042670477d61`; ar `bfr-conecta-v118`, md5 `3fcbc3ad52f1`), e a consequência para uma reversão
  está registada em `evidence/seg-fin-2026-11-09.log` §5–6 com a cópia do ar congelada em
  `evidence/ar-sw-v4-2026-11-09.js`.
- **CSP nos bytes publicados: medida**, e o retrato é outro do que o plano assumia — zero cabeçalhos
  HTTP de segurança, `object-src`/`base-uri` já efectivos no `<meta>`, `frame-ancestors` ausente
  (secção P2-3 acima).
- O teste decisivo que faltava (`POST /token?grant_type=refresh_token`) passou a ser **inútil**: não
  há linha para reproduzir.
- **A memória do projecto deixou de ser uma segunda cópia em claro** das 6 senhas: redigida para
  `(md5 … len=…)` e conferida contra o corpus do §7, com diferença simétrica 0/0 (seção acima).
  Este item não estava no plano — foi achado por medição, e é também a primeira vez que um registo
  **fora do repo** aparece num portão de credenciais.
- **Segunda exposição fora do repo, achada pelo portão novo e também redigida**: o portão por corpus
  varre os 97 registos da memória contra as 6 senhas do disco e passou de `FALHA — 1 ocorrencias`
  (exit 1) a `OK` (exit 0). O predicado de forma foi medido e rejeitado: 10/10 falsos positivos.

### O que estruturalmente é do dono — escolhas, não medições

1. **Revogar o GitHub PAT e emitir o substituto** — Prioridade 0; o URL limpo já está aplicado. Não
   há sessão do GitHub no browser do rig, por isso a revogação e o fine-grained novo
   (Contents:RW, `Only select repositories` → bfr-conecta) continuam humanos. A **instalação da
   credencial já não é manual**: `node scripts/seg-p0-install-credencial.mjs` lê `~/.gh-token`, deriva
   `host`/`username` do remoto e escreve no credential manager por stdin. O custo de não ter
   credencial mede-se com o portão D de `seg-p0-access-probe.mjs`. Enquanto isso, os **commits
   locais não sobem** — à última medição eram 19 (`8a93164`…`b4131b6`); re-contar com
   `git rev-list --count origin/main..HEAD`, porque cada commit local muda este número.
2. **Decisão do CSP** — hoje não há nenhuma protecção declarada contra clickjacking. As rotas, com
   o que cada uma custa:
   - *só `frame-ancestors` como header HTTP do Worker* — o mínimo que fecha o buraco real; 1 linha no
     `Worker`, sem tocar no `<meta>`, sem risco de quebrar `connect-src`;
   - *política inteira como header HTTP* (+ `<meta>` a encolher) — mais limpo, mas é o diff grande e
     exige re-medir o ar;
   - *endurecer só o `<meta>`* — não consegue pôr `frame-ancestors`, logo não fecha o buraco;
   - *aceitar o risco escrito* — também é uma decisão legítima, desde que registada.
   Nenhuma foi aplicada por mim.
3. **Sessão em `localStorage`** (access + refresh legáveis por XSS) — item de arquitetura do SDK,
   não estava no plano; mexer nisso toca boot, Service Worker e re-login silencioso.
4. **As 4 linhas-fantasma em `auth.users`** — hash rodada, invisíveis ao GoTrue, sem sessão.
   Apagá-las é escrita irreversível e não tem OK.
5. **As 2 sessões `@gmail.com` vivas** — são contas reais, não estão entre as vazadas, e não se
   tocaram. Se alguma delas não deveria ter sessão activa, isso é inventário de contas, decisão sua.
6. **`.c2-chrome-profile` (200 056 KB = 195 MB no disco de trabalho)** — censurado por contagens
   (`scripts/seg-censo-chrome-profile.mjs`, diário §9; o JWT do LevelDB cruzado com o banco em §4):
   **0 cookies, 0 logins**, 1 URL na História, 1 host no Local Storage com 2 ocorrências de
   `sb-*-auth-token` cujo `sub` **não existe** em `auth.users` e cujo `exp` já passou. Não há
   credencial de servidor lá dentro; os 195 MB são sobretudo cache de páginas, não material de
   sessão. Eliminar é irreversível e o rig de teste ainda pode usá-lo, por isso fica como escolha,
   não como limpeza automática.

**Fechado nos passes anteriores:** as **8 combinações senha-conta vivas foram rodadas** e a régua
voltou a 0 (seção acima); `reset-supervisor-password.mjs` saiu do tracking (`git rm --cached`) e
entrou no `.gitignore` junto das irmãs de mint; a rotação do ficheiro foi **medida como N/A** (o
`USER_ID` já não existe em `auth.users` e a senha destranca 0 contas), não presumida.
