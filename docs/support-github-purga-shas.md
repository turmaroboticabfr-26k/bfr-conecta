# Pedido de purga de dados sensíveis — GitHub Support

> Rascunho preparado em 11/11/2026. **NÃO ENVIADO** — a submissão é decisão do dono
> do repositório. Textos prontos para colar nas secções «PT» e «EN». Nenhum valor de
> credencial é reproduzido neste documento.

## Factos para o pedido

- Repositório: `turmaroboticabfr-26k/bfr-conecta`.
- Dado sensível: credencial (token de acesso) commitada por engano em 10/11/2026 no
  ficheiro `docs/c2-fixtures.json` — blob `f2bac991bec0822357944040f7463dbc7110b478`
  (431 B, presente em 27 árvores do histórico antigo).
- Estado da credencial: **morta** — revogada/regenerada em 10/11/2026; a verificação
  programática devolve 401; varredura de 843 linhas da tabela afetada (`gate_badges`)
  com 0 correspondências.
- Remediação já concluída:
  - 10/11/2026 — reescrita do histórico (`git filter-branch`) + force-push; 36 commits
    reescritos.
  - 11/11/2026 — GC local (`reflog expire --expire=now --all` + `gc --prune=now`);
    objetos antigos fisicamente removidos do clone local.
  - 11/11/2026 — forks verificados via API (`GET /forks`): **0**.
- Estado no GitHub: os 6 commits antigos e o blob ainda são servidos pela API
  (GET 200 em 11/11/2026, sondados por `scripts/seg-p0-sonda-sha-antigo.mjs`) — esperado
  até o GC do lado do GitHub; é a remoção dessas visualizações em cache que se pede.

## Mapa old→new (36 commits reescritos; marcos com SHA completo)

| old (a purgar) | new (no `main` atual) |
|---|---|
| `d26b4fa8c82f6f4997c5dc7fe3093da6174557de` | `515f889acbfcf3c739c7c5b8bafa57c48e9a4b09` |
| `80c951ca28a0644dcd3e33b8953e81e49b07a9db` | `43beacc44c402938a291fb79415f6ed4b83ec611` |
| `b1d5c498698ccbe731ecce4cc6f23fd85cf74536` | `50cd90371bb67d47c45abeb82d723334ed5ead93` |
| `0782736306b068db9ea6fa642bbd1164c990cdbf` | `cb0b275e8fa3c57a79dfbda7242d4d6fc2988db5` |
| `5385066563079656c2d81c3f5cbb6304c99514c1` | `1bc875e0d6c5d498505a2f2e4586711e22d9c1f9` |
| `c1ca925ce219dc6c7d68e9ec2ccd6a3bdf8d7bf4` | `5e37d98306f6df84d5b72522a515805f21c0dde9` |

Os 30 restantes do range reescrito são alcançáveis a partir destes marcos.

---

## PT — texto pronto para colar

**Assunto: Purga de dados sensíveis — histórico reescrito em `turmaroboticabfr-26k/bfr-conecta`**

Olá,

Ao abrigo da política de dados sensíveis do GitHub, peço a purga das visualizações em
cache dos objetos abaixo, no repositório `turmaroboticabfr-26k/bfr-conecta`.

Contexto:

- Em 10/11/2026 uma credencial (token de acesso) foi commitada por engano no ficheiro
  `docs/c2-fixtures.json` — blob `f2bac991bec0822357944040f7463dbc7110b478` (431 B,
  presente em 27 árvores do histórico antigo).
- A credencial já está morta: foi revogada/regenerada no próprio dia 10/11/2026; a
  verificação programática devolve 401; uma varredura de 843 linhas da tabela afetada
  devolveu 0 correspondências. Não reproduzo o valor aqui por segurança.
- Remediação concluída: histórico reescrito com `git filter-branch` e force-push em
  10/11/2026 (36 commits reescritos); GC local executado em 11/11/2026; forks
  verificados via API: 0.

Objetos a purgar (ainda servidos pela API em 11/11/2026 — GET 200):

- blob: `f2bac991bec0822357944040f7463dbc7110b478`
- commits:
  - `d26b4fa8c82f6f4997c5dc7fe3093da6174557de`
  - `80c951ca28a0644dcd3e33b8953e81e49b07a9db`
  - `b1d5c498698ccbe731ecce4cc6f23fd85cf74536`
  - `0782736306b068db9ea6fa642bbd1164c990cdbf`
  - `5385066563079656c2d81c3f5cbb6304c99514c1`
  - `c1ca925ce219dc6c7d68e9ec2ccd6a3bdf8d7bf4`

Obrigado.

---

## EN — text ready to paste

**Subject: Sensitive data purge — rewritten history in `turmaroboticabfr-26k/bfr-conecta`**

Hello,

Under GitHub's sensitive data policy, I request the purge of cached views of the
objects below, in the repository `turmaroboticabfr-26k/bfr-conecta`.

Context:

- On 2026-11-10 a credential (access token) was accidentally committed in
  `docs/c2-fixtures.json` — blob `f2bac991bec0822357944040f7463dbc7110b478` (431 B,
  present in 27 trees of the old history).
- The credential is already dead: it was revoked/regenerated the same day
  (2026-11-10); programmatic verification returns 401; a scan of 843 rows in the
  affected table returned 0 matches. The value itself is not reproduced here.
- Remediation is complete: history rewritten with `git filter-branch` and
  force-pushed on 2026-11-10 (36 commits rewritten); local GC run on 2026-11-11;
  forks checked via API: 0.

Objects to purge (still served by the API as of 2026-11-11 — GET 200):

- blob: `f2bac991bec0822357944040f7463dbc7110b478`
- commits:
  - `d26b4fa8c82f6f4997c5dc7fe3093da6174557de`
  - `80c951ca28a0644dcd3e33b8953e81e49b07a9db`
  - `b1d5c498698ccbe731ecce4cc6f23fd85cf74536`
  - `0782736306b068db9ea6fa642bbd1164c990cdbf`
  - `5385066563079656c2d81c3f5cbb6304c99514c1`
  - `c1ca925ce219dc6c7d68e9ec2ccd6a3bdf8d7bf4`

Thank you.

---

## Submissão

1. Aceder a https://support.github.com/ com a conta dona do repositório.
2. Categoria: remoção de dados sensíveis («Removing sensitive data»).
3. Colar o texto PT (ou EN) e aguardar a confirmação de purga do GitHub.
