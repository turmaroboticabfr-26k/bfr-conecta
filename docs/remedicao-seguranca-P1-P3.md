# Remediação de segurança — P1, P2, P3

Estado em 08/11/2026. Antes deste ficheiro, o plano só existia na conversa; nada em disco
descrevia o que era P1/P2/P3. Este documento é a régua.

## Portão novo, Prioridade 0 — token do GitHub no `.git/config`

O URL do remote `origin` tem um **GitHub Personal Access Token embutido em texto puro**, no
formato `https://user:ghp_…@github.com/…`. Escopo medido:

| Onde | Presente? |
|---|---|
| `.git/config` | **SIM — 1 ocorrência** |
| Ficheiros tracked (411) | não |
| Histórico de commits (`git log --all -S`) | não |
| Ficheiros fora do git no disco | não |

O token **nunca foi commitado** — vive só em metadados locais do repositório, que nem o `git push`
nem o `git ls-files` expõem. Mas é uma credencial **viva com escopo de escrita** no único repositório
que alimenta o deploy. Quem ler `.git/config` (ou este chat, onde o valor apareceu ao imprimir
`git remote -v`) consegue fazer push de código arbitrário para `bfr-conecta`.

**Ação exigida — é humana, não minha:**
1. Revogar o token em `github.com/settings/tokens` e emitir um novo com escopo mínimo (`repo` só neste repo).
2. Não o voltar a meter no URL. Guardar no credential manager do Git e deixar o remote limpo:
   `git remote set-url origin https://github.com/turmaroboticabfr-26k/bfr-conecta.git`
   (não executei — mexer na config do git está fora do que me foi autorizado).
3. Conferir se `ghp_` aparece noutro lado: `~/.gitconfig`, variáveis de ambiente, scripts de CI.

Nota de honestidade: a memória `bfr-repo-snapshot-v59` dizia «sem remote». É falso — há um
`origin` com push e o P1 foi **pushado** por ele. Corrigido em `bfr-repo-snapshot-v59.md`.

---

## Prioridade 1 — credenciais no versionamento — APLICADO (com lacucha fechada agora)

Commit `80c951c`: 19 ficheiros saíram do tracking (`c2-sessions.json` + 14 scripts com senha
hardcoded + 3 SQL/docs).

**A rotação de sessões era mesmo N/A:** os JWTs do `c2-sessions.json` são de contas sintéticas
apagadas no ciclo C2-4. Verificado por decodificação dos claims — 4 sessões, todas `role=authenticated`,
todas expiradas.

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

## Como reproduzir cada medição

```
node scripts/p2-2-verify.mjs        # catálogo: prosecdef, dono, proacl, corpo
node scripts/p23-p3-measure.mjs     # CSP + contagem de scripts inline
node scripts/p3-jwt-classify.mjs    # claims/expiração dos JWT por ficheiro
node scripts/seg-tracked-census.mjs # censo só nos ficheiros tracked (a régua certa)
node scripts/p3b-localstorage-census.mjs
```

## Em aberto depois deste passe

1. **Revogar o GitHub PAT** do `.git/config` — Prioridade 0, humana.
2. **Decisão do CSP** — uma das três rotas, ou aceitar o risco escrito.
3. **Sessão em localStorage** — item de arquitetura, não estava no plano.
4. Push do commit `8a93164` — não feito; depende da decisão do token.
