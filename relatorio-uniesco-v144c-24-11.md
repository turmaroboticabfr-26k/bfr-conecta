# RELATÓRIO — Renomeação BFR CONECTA → UNIESCO e nova identidade visual (v144c)

**Data:** 24/11/2026 · **Estado:** **publicada a 24/11 17:45Z** — deploy `c14026e7-9c54-4169-810f-17815c936daf` a 100 % do tráfego, conferida no ar (diário `audit-publicacao-v144.json`)
**Base:** v142 no ar antes do deploy (`audit-publicacao-v142.json`) · **Sucessora:** v144c (`worker-deploy-v144c-uniesco/`), cadeia v144 → v144b → v144c

---

## 1. Resumo executivo

O aplicativo existente foi atualizado de BFR CONECTA para UNIESCO com a marca oficial fornecida (logotipo, paleta azul/verde/branco, slogan). **Nenhum aplicativo novo foi criado**: a candidata deriva byte-a-byte da v142 com substituições pontuais auditadas; banco, tabelas, usuários, senhas, perfis, permissões, rotas, APIs, integrações e identificadores técnicos estão intactos. A prova local (login anónimo servido em disco, duas bandas) confirma: **0 ocorrências visíveis do nome antigo, 9 do novo** em cada banda. A varredura final por todas as variações do nome (p156) confirma **0 visíveis / 0 em código / 0 nomes de download com o nome antigo** fora dos identificadores técnicos preservados por regra do brief.

Dois achados depois da primeira candidata: (a) 13 ocorrências visuais residuais que a substituição delimitada não apanhava (fechadas na v144b, p154); (b) **10 nomes de ficheiro de download** gerados no cliente com `-bfr-` colado — `boletim-bfr-` ×2, `cracha-bfr-` ×3, `qr-bfr-` ×1, `relatorio-secretaria-bfr-` ×1, `secretaria-bfr-` ×1, `frequencia-chegada-bfr-` ×2 — fechados na v144c (p157) com régua própria de fronteira.

## 2. Arquivos modificados / criados

| Caminho | Natureza |
|---|---|
| `bfr-candidata-v144c-uniesco/index.html` | candidata final, 3 557 197 B, md5 `573de00016fe2d9b87e671bb84d21559` |
| `worker-deploy-v144c-uniesco/worker.mjs` | bundle final, 3 622 362 B, md5 `278a9c1e64e7ecc15421a2d96c1e2dd0` |
| `worker-deploy-v144c-uniesco/public/manifest.json` | nome/ícones/tema UNIESCO (id, scope, start_url, display inalterados) |
| `worker-deploy-v144c-uniesco/public/bfr-app-logo.png` | **conteúdo** = lockup oficial UNIESCO 800 (252 879 B, md5 `1a05424a…`); nome de ficheiro preservado (ver §8) |
| `worker-deploy-v144c-uniesco/public/uniesco-icon-{192,180,512}.png` | ícones novos (PWA, favicon, apple-touch) |
| `marca-uniesco/` | activos derivados do logo oficial (p150, 7/0) + registo |
| `scripts/p150…p158` | instrumentos da campanha (extracção de marca, gerador, derivações v144b/v144c, bundles, prova local, varredura do nome) |
| `scripts/p159…p161` | pré-voo contra o ar, pos-deploy e diário da publicação (padrão v133–v142) |
| `scripts/p162`, `scripts/p163` | sonda de classificação dos PDFs servidos (streams inflados) e conferência dos materiais fora do bundle |
| `uniesco-fora-do-bundle/` | material pronto a colar para as pendências §9 itens 2 a 5 (5 templates de e-mail, payload FCM de exemplo, textos das duas lojas) |
| `docs/uniesco-aplicacao-fora-do-bundle-24-11.md` | guião de aplicação dos quatro itens (onde colar, assuntos propostos, tetos medidos, PDFs por documento) |
| `evidence/p15[0-8]-*` | registos e provas de cada corrida, incl. vermelhos preservados |
| `bfr-candidata-v144{,b}-uniesco/`, `worker-deploy-v144{,b}-uniesco/` | cadeia intermédia (mantida como registo da derivação) |

Os restantes 12 ficheiros públicos do bundle (`_headers`, `wrangler.toml`, PDFs, avatares, módulos JS) são **byte-idênticos** à v142 — verificado pelo portão do gerador (p158, gate de activos).

## 3. Telas atualizadas (pontos de contacto com o utilizador)

| Zona | Antes | Depois |
|---|---|---|
| `<title>` do separador | «BFR Conecta \| …» | «UNIESCO \| Escola Benício Ferreira Reis» |
| Tela de login | marca «BFR Conecta» | «UNIESCO» + lockup oficial |
| Splash de carregamento | fundo escuro + marca antiga | fundo branco + lockup centrado, animação discreta (`uniescoSplashIn`, 0,5 s), transição suave; `prefers-reduced-motion` desliga animações |
| Cabeçalho / menu lateral | «BFC» + marca antiga | símbolo UNIESCO + «UNIESCO» |
| PWA / identificação no celular | nome e ícones BFR | nome UNIESCO, ícones novos 192/512 |
| Versão web | título/favicon antigos | título UNIESCO, favicon `uniesco-icon-192.png`, apple-touch `uniesco-icon-180.png` |
| Notificações push (SW) | título fallback «BFR Conecta» | fallback «UNIESCO»; ícone/badge passam a usar o logo novo |
| Textos de protocolo | `BFR-…` na secretaria e nos comunicados | `UNIESCO-…` |
| Mensagem de erro | «…enviar o comunicado BFR.» | «…enviar o comunicado UNIESCO.» |
| Nomes de ficheiro de download (cliente) | `boletim-bfr-…`, `cracha-bfr-…`, `qr-bfr-…`, `relatorio-secretaria-bfr-…`, `secretaria-bfr-…`, `frequencia-chegada-bfr-…` (10 ocorrências) | `…-uniesco-…` (10/10, p157) |
| Monogramas de avatar | «BF»/«BC» | «UN»/«U» |

O layout, a navegação e a experiência de uso foram mantidos («manter a experiência de uso já conhecida»); só identidade visual mudou. Os nomes de download são gerados no cliente (`saveBlob`/`doc.save`) — não são assets servidos; nenhuma ligação partida foi introduzida.

## 4. Elementos substituídos

- **Nome** — todas as variações visíveis (ver tabela de varredura, §7), incluindo os 10 nomes de ficheiro de download.
- **Logotipo** — lockup oficial em login, splash, cabeçalho, menu, PWA, push, documentos. Não esticado nem distorcido: imagem 800 px servida com `min(60vw,38vh) auto` no splash e dimensões próprias nos contentores.
- **Cores** — azul institucional passou de `#10295f` (13,96:1) para `#00399b` (**10,2:1** com branco, AAA). Verde institucional `#3fb80a` mede **2,56:1** — reprovado em AA para texto — por isso o nome e os títulos são azul sólido e o gradiente da marca vive só dentro da imagem do logotipo. `--teal` `#2563eb` mantido.
- **Splash** — novo, com fundo branco compatível, logo centrado, animação discreta e libertação idempotente (`__release`).

## 5. Configurações atualizadas

- `manifest.json`: `name`/`short_name` = UNIESCO, `theme_color` = `#00399b`, `background_color` = `#ffffff`, ícones novos; **inalterados** de propósito: `id`, `scope`, `start_url`, `display`, `display_override`, `lang`.
- Service Worker (dentro do worker): etiqueta de cache `bfr-conecta-v142` → `bfr-conecta-v144` (troca obrigatória para invalidar o cache antigo — etiqueta técnica, ver §8); ícones novos em `PRECACHE_PATHS` e `PUBLIC_ASSETS`; fallback de título de push → UNIESCO.
- `_headers` e `wrangler.toml`: **byte-idênticos** à base.

## 6. Testes e resultados (cadeia certificada)

| Instrumento | Veredicto | O que prova |
|---|---|---|
| p150 (marca) | `P150_ACTIVOS_DA_MARCA_UNIESCO_OK 7/0` | activos derivados do logo oficial, contraste medido |
| p151 (candidata v144) | `P151_CANDIDATA_V144_UNIESCO_OK 16/0` | substituição delimitada do nome, 16 portões |
| p152 (bundle v144) | `P152_BUNDLE_V144_OK 18/0` | worker re-emitido, esqueleto byte-idêntico fora dos 3 embeds |
| p154 (deriva v144b) | `P154_DERIVA_V144B_OK 6/0` | fecho das 13 ocorrências visuais residuais (fronteira 13→0), scripts compilam |
| p155 (bundle v144b) | `P155_BUNDLE_V144B_OK 18/0` | bundle v144b, base certificada, sem-publicação confirmada |
| p157 (deriva v144c) | `P157_DERIVA_V144C_OK 7/0` | fecho dos 10 nomes de download `-bfr-` → `-uniesco-` (downloads 10→0), delta +40 B, scripts compilam |
| p158 (bundle v144c) | `P158_BUNDLE_V144C_OK 18/0` | bundle final v144c, base certificada, sem-publicação confirmada |
| p153 (prova local v144c) | `P153_PROVA_LOCAL_OK 12/0` | servido em disco, 390×844 e 1280×900: título/tema/ícones novos, lockup carregado, splash libertado, **0 BFR / 9 UNIESCO** visíveis, screenshots verificadas |
| p156 (varredura do nome) | `P156_VARREDURA_NOME_V144C_OK 5/5` | ver §7 |

**Achado 1 (v144b):** a substituição delimitada inicial deixara 13 ocorrências visíveis (10× «UNIESCO Conecta.», 2× prefixo de protocolo `BFR-`, 1× «comunicado BFR.») — a fronteira do regex excluía `.` e `-`. Corrigido por substituição pontual com âncoras exactas e contagens (p154), não por regex cego.
**Achado 2 (v144c):** a varredura por literais de string revelou 10 nomes de ficheiro de download com `-bfr-` colado que as réguas de palavra não viam (hífens). Régua própria `(?<!data)(?<!-)-[Bb][Ff][Rr]-` mediu 10 → 0 (p157), excluindo os `data-bfr-` e as variáveis CSS `--bfr-` (técnicos).

## 7. Busca por todas as variações do nome antigo (exigência do brief)

Régua: HTML visível (sem script/style) e scripts medidos à parte; delimitação alargada; ocorrência em `bfr-conecta` (hostname Firebase/cache) é identificador técnico, não nome. Fonte: `evidence/p156-varredura-nome-v144c-24-11-a.json`.

| Variação | Visível | Scripts (fora `bfr-conecta`) |
|---|---|---|
| BFR CONECTA / BFR Conecta / bfr conecta | **0** | **0** |
| BFR / Bfr / bFr (isolado) | **0** | **0** |
| Conecta / CONECTA / conecta (isolado) | **0** | **0** |
| BFR- (prefixo de protocolo) | **0** | **0** |
| `-bfr-` colado em nome de download | **0** | — |
| **Total** | **0** | **0** |

**Confirmação: nenhuma ocorrência visível do nome antigo permanece.** UNIESCO visível: 9 ocorrências em cada banda medida.

## 8. Identificadores técnicos preservados (por regra do brief)

| Identificador | Contagem | Porquê |
|---|---|---|
| `window.BFR_*` (APIs internas) | 305 | interface técnica interna; mudar quebraria funcionalidades |
| `.bfr-*` classes CSS/DOM | 8 850 | mesma razão |
| `bfr-app-logo.png` (nome de ficheiro) | 7 | referenciado em SW/HTML; o **conteúdo** é o lockup UNIESCO, logo toda referência antiga mostra a marca nova |
| `bfr-paint-hold` (classe do splash) | 8 | hook técnico do paint-hold |
| `bfr-conecta` (hosts, canonical, Firebase, etiqueta do cache SW) | 26 | hosts e projectId Firebase são integrações — alterar desliga notificações/auth |
| `bfr_*.js` módulos públicos | 5 | rotas de asset estáveis |
| RPC/tabelas `bfr_*` (Supabase) | 112 | banco e API intactos |
| `wrangler.toml` `name = "bfr-conecta"` | 1 | identidade do deployment |

## 9. Pendências

**Itens 2 a 5:** o material está **pronto a colar** em `uniesco-fora-do-bundle/`, com instruções em [docs/uniesco-aplicacao-fora-do-bundle-24-11.md](file:///C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/docs/uniesco-aplicacao-fora-do-bundle-24-11.md) e conferência por instrumento (`p163` para os materiais, `p162` para os PDFs). A aplicação nos painéis (Supabase, Firebase, lojas) e a regeneração dos PDFs raster são **ação do dono** — nada fora deste repo foi escrito por esta campanha.

1. **Publicação/deploy da v144c** — executada a 24/11 com o OK literal «resolva o item 1» (só este objeto). Deploy `c14026e7-9c54-4169-810f-17815c936daf` (criado 2026-11-24T17:45:12Z, 100 % do tráfego) em `https://bfr-conecta.turmaroboticabfr.workers.dev`; conferência no ar: nome antigo 0/0/0/0 (visível/scripts/downloads/SW), UNIESCO 9, manifest UNIESCO/#00399b; reversão para `ebe8e698…` (v142) documentada. Diário: `audit-publicacao-v144.json`.
2. **Templates de e-mail do Supabase Auth** — cinco ficheiros em `uniesco-fora-do-bundle/email-templates/` (confirmação de cadastro, convite, magic link, troca de e-mail, recuperação de senha), cada um com o lockup servido pelo worker, azul `#00399b` nos títulos e no botão, verde só na barra decorativa, e o slogan no rodapé. Verificados pelo `scripts/p163-verifica-materiais-fora-do-bundle.mjs` com `P163_MATERIAIS_FORA_DO_BUNDLE_OK 22/0`. Falta só colar no painel (Authentication → Email templates), com os assuntos propostos no guião.
3. **Notificações push do lado servidor** — payload de exemplo pronto em `uniesco-fora-do-bundle/fcm/exemplo-payload-fcm-v1.json` (título «UNIESCO», corpo = slogan, `webpush.notification.icon`/`badge` = `uniesco-icon-192.png` no worker). A mudança é no emissor do projeto Firebase `bfr-conecta-notificacoes-62bbc`, fora do repo; o fallback do service worker já é UNIESCO no ar.
4. **Listagens de loja** — textos em `uniesco-fora-do-bundle/stores/play-store-listing.json` e `…/apple-store-listing.json`, com os tetos conferidos pelo mesmo p163: Play nome 7/30, descrição breve 64/80, completa 202/4 000; Apple nome 7/30, subtítulo 22/30, texto promocional 86/170, descrição 202/4 000. Enviar as alterações é ação do dono nas consolas.
5. **PDFs servidos** — *a alegação anterior estava errada e foi corrigida por medida*: o instrumento novo `scripts/p162-verifica-pdfs-uniesco.mjs` infla os streams FlateDecode e emite `P162_PDFS_CLASSIFICADOS raster=2 texto=1 indeterminado=0` (registo `evidence/p162-pdfs-24-11-c.json`). `calendario-letivo-2026.pdf` (202 349 B, 2 páginas) é **vetorial com texto pesquisável** — 5 539 caracteres extraídos de 2 streams de conteúdo, e **0** ocorrências de BFR, UNIESCO ou CONECTA nesse texto (o cabeçalho medido diz «ESCOLA MUNICIPAL DE EDUCAÇÃO BÁSICA» / «CALENDÁRIO LETIVO 2026»): **não precisa de regeneração por causa da renomeação**. `horario-matutino-2026.pdf` (521 385 B) e `horario-vespertino-2026.pdf` (498 802 B) são **raster** de página inteira (um stream `/Image` cada, 6 039 252 B inflados) — a marca dentro deles não é mensurável sem OCR e regenerar exige os documentos-fonte, a cargo do dono. Nenhum dos três tem `/Encrypt` (medido: `grep -c` = 0 nos três). As duas corridas superadas do p162 ficam registadas: `evidence/p162-pdfs-24-11-a-ANTERIOR-…json` (só crus, declarou os três raster) e a corrida `b`, que apanhou «BT» no ruído de píxeis e saiu do repo em vez de ser versionada (5 786 880 B, md5 `5a0ffefd38552c19033b7006d03ef9f1`).
6. **Prova autenticada por papel** — a prova local cobriu o login anónimo; a passada dos 15 papéis exige cadeias vivas e publicação (ou serve local com login, factível sem publicar).
7. Decisões antigas sem OK: PEN-41/43/44, v141 (#27), mint/rotação — inalteradas por esta campanha.

## 10. Como regenerar e publicar

- Regenerar a cadeia: `node scripts/p154-deriva-v144b-uniesco.mjs <sufixo>` → `node scripts/p157-deriva-v144c-uniesco.mjs <sufixo>` (candidatas) e `node scripts/p158-gera-bundle-v144c-uniesco.mjs <sufixo>` (bundle) — todos com guarda de sobrescrita e portões; a identidade esperada está em `worker-deploy-v144c-uniesco/esperado-v144c.json`.
- Verificar antes de publicar: p153 (prova local, serve em disco: `node scripts/p153-prova-local-v144.mjs <sufixo> v144c`) e p156 (varredura do nome: `node scripts/p156-varredura-nome-v144b.mjs <sufixo> v144c`).
- Publicar (após OK): pré-voo contra o ar → deploy do bundle → pos-deploy → diário de publicação (padrão v133–v142).

## 11. Identidade dos artefactos finais (medida em disco, 24/11)

| Artefacto | Bytes | md5 |
|---|---|---|
| `bfr-candidata-v144c-uniesco/index.html` | 3 557 197 | `573de00016fe2d9b87e671bb84d21559` |
| `worker-deploy-v144c-uniesco/worker.mjs` | 3 622 362 | `278a9c1e64e7ecc15421a2d96c1e2dd0` |
| `public/manifest.json` | — | `61cba0fcc84eecd4053c3ad75b011fd4` |
| `public/bfr-app-logo.png` (lockup UNIESCO) | 252 879 | `1a05424a578aa5340e700274252c3577` |
| `public/uniesco-icon-192.png` | 21 725 | `114493b17b6c8a5843b54d617d7822bc` |
| `public/uniesco-icon-180.png` | 19 789 | `03e9ef9f5fcba8f4c89b40ab5373e871` |
| `public/uniesco-icon-512.png` | 95 834 | `4d41c45d1addde81cc60363a5bee5283` |

Ar no ar desde 24/11 17:45Z: v144c (`audit-publicacao-v144.json`), shell `573de00016fe2d9b87e671bb84d21559` / 3 557 197 B, versão `c14026e7-9c54-4169-810f-17815c936daf` a 100 %. Zero escritas no banco nesta campanha.

## 12. Os materiais fora do bundle (fecho dos itens 2 a 5, 24/11)

Identidade medida em disco dos ficheiros que o dono cola nos painéis. Para os cinco templates, a coluna de bytes é a mesma que o registo `evidence/p163-materiais-fora-do-bundle-24-11-a.json` imprime campo a campo; os restantes três ficheiros são medidos aqui por `wc -c` e `md5sum`.

| Caminho | Bytes | md5 |
|---|---|---|
| `uniesco-fora-do-bundle/email-templates/confirm-signup.html` | 1 894 | `603856b9c35d887cd8f8f07c08af8838` |
| `uniesco-fora-do-bundle/email-templates/invite-user.html` | 1 929 | `3e751c32b3b02f87290729eda614af7d` |
| `uniesco-fora-do-bundle/email-templates/magic-link.html` | 1 880 | `828a85358bce4cc04d24ff0248ac3985` |
| `uniesco-fora-do-bundle/email-templates/change-email.html` | 1 963 | `edb03f26be4e0469fd8a839894637102` |
| `uniesco-fora-do-bundle/email-templates/reset-password.html` | 1 966 | `c9bbb13bc9ef4e6bc0663f1a3ca9e5d6` |
| `uniesco-fora-do-bundle/fcm/exemplo-payload-fcm-v1.json` | 413 | `678badb8b017156f0c8db9bda80cf382` |
| `uniesco-fora-do-bundle/stores/play-store-listing.json` | 578 | `e281d0e7e0753e6d6c8ff2cefbc81807` |
| `uniesco-fora-do-bundle/stores/apple-store-listing.json` | 452 | `f98a1aae39a54bc669ace78211be12eb` |
| `docs/uniesco-aplicacao-fora-do-bundle-24-11.md` (guião) | 8 837 | `791c61fef05b0fbf8a0c9536147617d5` |

- O guião vive em `docs/` e não ao lado dos materiais por uma razão medida: o portão de citações deriva o corpus de `git ls-files -- docs evidence README.md`, e um documento fora dessas pastas não é varrido — a alternativa seria alargar o predicado do portão, o que a casa proíbe.
- Os dois instrumentos deste fecho têm corridas superadas registadas, não apagadas: `evidence/p162-pdfs-24-11-a-ANTERIOR-sonda-media-so-crus-e-classificou-os-3-como-raster.{json,txt}` (verde na versão errada) e a corrida `b` do mesmo p162, que saiu do repo por inflar um artefacto de 5 786 880 B com texto extraído de ruído de píxeis.
- Nada do que está nesta secção foi aplicado em painel algum: os quatro itens aguardam ação do dono, e a única escrita da campanha continua a ser o deploy da v144c (item 1).

