# Plano de reescrita do histórico — blob `badge_token`

**Estado: EXECUTADO 10/11 sob «autorizo, faz o force-push».** Force-push feito, repo principal
realinhado, censo 0. Rollback: bundle apagado 11/11 sob «apaga o bundle de rollback».

## Factos medidos (10/11, censo por valor)

Instrumento: `scripts/seg-badge-history-census.mjs` — lê o valor do fixture do disco
(`docs/c2-fixtures.json`, untracked), varre **só os blobs alcançados pelas refs** (o que um
clone/fetch transfere) e nunca imprime o valor. Aceita caminho do fixture como argumento para
correr dentro da clone de reescrita.

- Valor: len=36, md5 `e65446b050668e3d1a2a0f4e811728e4`.
- **1 único blob portador**: `f2bac991bec0822357944040f7463dbc7110b478` (431 B, md5
  `6d7d0a022ed8c1a0fe13865d5555ff37`), caminho `docs/c2-fixtures.json`.
- Entra em `d26b4fa` ("congela os ciclos C2/C7/C7-GAP-FIX"), sai em `b1d5c49` (git rm --cached);
  presente em **27 trees**. Nenhum outro ficheiro empurrado contém o valor (diaries/scripts só
  citam o nome; o nome `badge_token` no app é feature legítima e NÃO sai).
- Alcance da reescrita: **36 commits** (`d26b4fa` + 35 descendentes, até `c1ca925`); os **14
  anteriores ficam intactos**. Total actual: 50 commits em `origin/main`.
- Tags `v59` (`be65eda`) e `v60` (`672f619`) são **locais e anteriores** a `d26b4fa` → não tocadas.
- Remedo: `git ls-remote origin` mostra **só `refs/heads/main`** — sem tags remotas, sem PRs.
- O token está **MORTO** (diário §21: 0/843 com controle positivo server-side). A reescrita é
  higiene de histórico, não resposta a incidente vivo.
- `git filter-repo`, `python` e `pip` **ausentes** nesta máquina → ferramenta escolhida:
  `git filter-branch --index-filter` (embutida no Git, zero instalação). Alternativa filter-repo
  exigiria instalar Python primeiro (OK separado).

## Portões pré-execução (todos obrigatórios, no dia)

1. OK explícito do dono para reescrita **+ force-push a main**.
2. Árvore limpa e `HEAD == origin/main` (re-medir; hoje `c1ca925`).
3. Censo re-corrido == 1 blob (se o estado mudou, o plano é reavaliado).
4. `git ls-remote origin` exit 0 (credencial GCM viva).
5. Bundle de backup criado e `git bundle verify` OK.

## Execução (na clone, nunca no repo de trabalho)

```bash
# 0. backup no repo principal (contém o blob morto — guardar fora do repo)
git bundle create ../bfr-badge-pre-rewrite-2026-11-10.bundle --all
git bundle verify ../bfr-badge-pre-rewrite-2026-11-10.bundle

# 1. clone local para pasta irmã e remover a remote-tracking (senão o censo vê a história velha)
git clone bfr-conecta bfr-rewrite-badge
cd bfr-rewrite-badge
git remote remove origin

# 2. reescrita: remove o caminho de todas as trees do range; sem --prune-empty
#    (d26b4fa congela muito mais do que o fixture — nenhum commit fica vazio; 50 ↔ 50)
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
  --index-filter 'git rm --cached --ignore-unmatch docs/c2-fixtures.json' \
  -- d26b4fa^..main
```

### Portões na clone (antes de qualquer push)

```bash
# a. conteúdo do tip byte-idêntico ao actual (o fixture já não existe no tip)
git diff refs/original/refs/heads/main main        # → vazio
# b. mesma contagem e mesmas mensagens
test "$(git rev-list --count main)" = 50
diff <(git log --format=%s refs/original/refs/heads/main) <(git log --format=%s main)   # → vazio
# c. os 14 commits anteriores intactos
diff <(git rev-list refs/original/refs/heads/main | tail -14) <(git rev-list main | tail -14)  # → vazio

# d. eliminar refs/original + reflog + gc, depois censo → 0 blobs
git for-each-ref --format='%(refname)' refs/original/ | while read r; do git update-ref -d "$r"; done
git reflog expire --expire=now --all && git gc --prune=now
node ../bfr-conecta/scripts/seg-badge-history-census.mjs ../bfr-conecta/docs/c2-fixtures.json
# → CENSO_OK (0 blobs)
```

### Push e realinhamento (só depois de todos os portões verdes)

```bash
# na clone; token nunca em comando — GCM serve a credencial (provada pelo push c1ca925)
git remote add origin https://turmaroboticabfr-26k@github.com/turmaroboticabfr-26k/bfr-conecta.git
git push --force origin main

# no repo principal: árvore estava limpa; reset --hard não toca untracked/ignored
git fetch origin
# conferir programaticamente: rev-parse origin/main == tip da clone
git reset --hard origin/main
node scripts/seg-badge-history-census.mjs          # → CENSO_OK (0 blobs alcançados)
```

Pós: diário + memória com o mapa old→new (todos os 36 SHAs mudam, incluindo `c1ca925`/`5385066`);
as referências antigas nos diaries ficam como registo histórico. Re-correr os dois portões de
memória depois das edições. Apagar a clone. O bundle fica como rollback até OK de fechamento.

## Rollback

- Antes do reset no principal: `git push --force origin c1ca925:main` restaura tudo.
- Depois: clonar o bundle (`git clone bfr-badge-pre-rewrite-2026-11-10.bundle …`) e force-push.

## Resíduo fora do alcance do git

- O GitHub guarda os commits antigos por SHA até GC (cached views podem continuar a renderizar);
  purga definitiva só via support do GitHub — decisão do dono, risco residual baixo (token morto).
- Forks: verificar no dia via API com instrumento que lê `~/.gh-token` (padrão seg-p0-sonda),
  nunca inline. `ls-remote` não mostra PRs.
- Outros clones: só este rig é conhecido; qualquer outro clone teria de ser re-clonado.
- GC local no principal (`reflog expire` + `gc --prune=now`) é passo opcional de higiene final,
  só depois do OK de fechamento — elimina a via de rollback por SHA (fica o bundle).

## Não-objectivos

- Não toca o código vivo do app (o nome `badge_token` é feature legítima; só o VALOR sai).
- Não reescreve diaries nem memórias (registo histórico; só ganha o mapa de SHAs).
- Não publica no Worker, não escreve no banco, não roda nada (o token já está morto).

## Ensaio 10/11 — EXECUTADO sem push, VERDE

- Portões pré: árvore limpa (só os 2 untracked deste ciclo), `HEAD == origin/main == c1ca925`,
  count 0, censo re-corrido = **1 blob** (inalterado).
- Backup: `bfr-badge-pre-rewrite-2026-11-10.bundle` (**6 846 616 B**), `bundle verify` OK,
  6 refs, história completa. Guarda o blob morto — fica fora do repo até OK de fechamento.
- Clone irmã `bfr-rewrite-badge`, `origin` removido antes da reescrita (senão as refs remotas
  mantêm a história velha alcançável). `filter-branch` reescreveu os 36 commits em ~20 s
  (27 trees com `rm` efectivo — bate certo com as 27 trees medidas).
- Portões na clone: (a) `git diff refs/original/… main` **vazio** (tip byte-idêntico);
  (b) **50 ↔ 50** e mensagens idênticas; (c) **14 SHAs anteriores intactos**; (d) refs/original
  apagadas + reflog expire + `gc --prune=now` → censo **CENSO_OK, 0 blobs** (423 = 424 − 1) e
  `git cat-file -t f2bac991…` falha — o blob está fisicamente ido da clone.
- Mapa old→new do tip: `c1ca925` → **`5e37d98306f6df84d5b72522a515805f21c0dde9`**.
- Repo principal **intocado** (`main = c1ca925`). Clone e bundle ficam em disco; o push
  (`--force origin main` a partir da clone, depois fetch+reset no principal) segue a exigir
  OK explícito novo.
- Armadilha de instrumento corrigida no censo: rebentava na clone por assumir `origin/main`
  (linha informativa agora condicional); e a ordem importa — apagar refs/original **antes**
  do censo, senão o blob continua alcançável e o portão dá falso PRESENTE.

## Execução 10/11 — FECHADA (OK «autorizo, faz o force-push»)

- Push a partir da clone, URL derivado do diário (`git remote get-url` no principal, nunca
  dactilografado), credencial servida pelo GCM (token nunca em comando):
  `+ c1ca925...5e37d98 main -> main (forced update)`.
- Principal: `git fetch origin` → `+ c1ca925...5e37d98 main -> origin/main (forced update)`;
  conferência programática `test "$(git rev-parse origin/main)" = "5e37d98306f6df84d5b72522a515805f21c0dde9"` OK;
  `git reset --hard origin/main` (os 2 untracked deste ciclo preservados).
- Censo no principal: **CENSO_OK — 0 blobs** (423 blobs alcançados, 50 commits em `origin/main`).
- Clone irmã `bfr-rewrite-badge` **apagada** (`ls` exit 2).
- Bundle `bfr-badge-pre-rewrite-2026-11-10.bundle` (6 846 616 B) **guardado** fora do repo até
  11/11; **apagado** sob «apaga o bundle de rollback» (medição + remoção confirmada). GC local
  no principal só com OK.

### Mapa old→new (marcos; os 36 commits do range mudaram todos)

| old | new | papel |
|---|---|---|
| `d26b4fa` | `515f889` | entra o fixture (primeiro reescrito) |
| `80c951c` | `43beacc` | P1 — 19 ficheiros fora do tracking |
| `b1d5c49` | `50cd903` | saída do fixture do tip (git rm --cached) |
| `0782736` | `cb0b275` | deployments-list-raw |
| `5385066` | `1bc875e` | push do token novo |
| `c1ca925` | **`5e37d983`** | tip (scripts seg-p0) — HEAD = origin/main |

Os 14 commits anteriores a `d26b4fa` e as tags locais `v59`/`v60` ficaram intactos. As
referências aos SHAs antigos nos diaries/memórias anteriores ficam como registo histórico.