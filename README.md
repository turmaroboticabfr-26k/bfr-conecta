# BFR Conecta — estado publicado da v60

Snapshot do estado no ar em 22/10/2026 (v60), congelado para comparação, auditoria e reversão.
`app/` é o conjunto de assets do deployment vigente — nada aqui é uma candidata nova.

## Coordenadas do deployment

| Item | Valor |
|---|---|
| Worker | `https://bfr-conecta.turmaroboticabfr.workers.dev` |
| Version | `79112a32-8953-4947-9893-73f88aa2132e` |
| Publicado | 22/10/2026, 21:12 UTC |
| `/` | 3.481.301 bytes, md5 `36feaad4fb5a033a2f011de336a4667e` |
| `sw-v4.js` | md5 `042670477d613d3044b4e4298a891db4`, `CACHE='bfr-conecta-v60'` |
| `bfr-responsive-presentation.js` | md5 `a83f77baba7453851b287080686c7afb` (inalterado desde a v58) |

## Estrutura

- `app/` — assets do deployment (12 assets inalterados + `index.html` e `sw-v4.js` alterados na v60).
- `docs/` — relatório e diários manuais da vaga da v59 (mantidos como histórico).
- `evidence/` — diários de publicação e medição da v59 e da v60 (audit-publicacao-v60.json é o diário
  desta publicação; mede-v60-ab-d1d2d4.json é o A/B de 4 células; os sql-d3-* são a candidata aplicada do
  D3 com a reversão congelada).

## Reversão da v60

Devolver `app/index.html` para o v59 (`2e4036071b6e8a4ad232adab61b1b885`, 3.480.118 B — bytes do ar
congelados em `bfr-candidata-v59-professor/index.html` no diretório de trabalho) e `app/sw-v4.js` para o
`0d5294f72d9d8ff41a241c7bfc8aa8b4` (`CACHE='bfr-conecta-v59'`), rebuild e `wrangler deploy`; requer OK próprio.

## Histórico de tags

- `v59` — aba do Professor (deployment `06f62d38`, version `fc1b3648`).
- `v60` — D1/D2/D4 fechados + D3 aplicado no banco (version `79112a32`).
