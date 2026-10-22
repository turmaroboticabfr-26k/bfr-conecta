# BFR Conecta — estado publicado da v59

Snapshot do estado no ar em 22/10/2026 (v59), congelado para comparação, auditoria e reversão.
`app/` é o conjunto de assets do deployment vigente — nada aqui é uma candidata nova.

## Coordenadas do deployment

| Item | Valor |
|---|---|
| Worker | `https://bfr-conecta.turmaroboticabfr.workers.dev` |
| Deployment | `06f62d38-282d-4ce7-80d8-de4cf1e0f46f` |
| Version | `fc1b3648-7562-4352-a677-ebab223afc78` |
| Publicado | 22/10/2026, 11:19 UTC |
| `/` | 3.480.118 bytes, md5 `2e4036071b6e8a4ad232adab61b1b885` |
| `sw-v4.js` | md5 `0d5294f72d9d8ff41a241c7bfc8aa8b4`, `CACHE='bfr-conecta-v59'` |
| `bfr-responsive-presentation.js` | md5 `a83f77baba7453851b287080686c7afb` |

## Estrutura

- `app/` — assets do deployment (12 assets inalterados + `index.html`, `sw-v4.js` e o JS responsivo alterados na v59).
- `sql/` — escopo de leitura/recados aplicado em 22/10, sua reversão, e os scripts do ensaio E2E (limpeza, estado final, restos, policies de atividade).
- `docs/` — relatório da fase 7, diário do ensaio manual e diário da aplicação do SQL.
- `evidence/` — provas de publicação (rotas, bundle, sintaxe), diff v58→v59 e resultados JSON dos testes E2E.
- `MANIFEST.md` — tamanho e md5 de cada arquivo; regenere com `node scripts/manifest.mjs .`.

## O que a v59 mudou

Rota e estado sincronizados ao abrir a central da turma; dados inventados removidos da Biblioteca e das Atividades; painel de leitura visível; leitura escopada às turmas do professor; rótulos de nota com matéria e bimestre; frequência com próxima aula em 7 dias e merge diária/aula; `classOpen`; busca de aluno só nas abas que filtram; fallback de aba em Resultados.

## Defeitos abertos (exigem OK novo para corrigir)

- **D1** — feedback do lançamento de nota é sobrescrito pelo re-render de `secureAcademicSetup()`.
- **D2** — painel de leitura nasce antes de `BFR_SECURE_TEACHER_STATE.classes` e cacheia escopo vazio.
- **D3** — `school_activities_staff_insert` não aceita o papel `pedagogical` (403 ao publicar).
- **D4** — `[data-teacher-inbox]` é escondido pela whitelist CSS do `#teacherView`.

## Reversão

A v58 está documentada no relatório (`/` md5 `31f209b6a23b878f6fd968a9285bdbad`). Reverter exige montar o SRC com o `index.html` da v58 e o SW da v58, rodar o preflight e publicar — não basta trocar arquivos neste snapshot.
