# GUIÃO — aplicação fora do bundle (pendências §9, itens 2 a 5) · 24/11

**Estado:** os quatro itens têm **material pronto a colar** em `uniesco-fora-do-bundle/`. A aplicação em si é **ação do dono nos painéis** (Supabase, Firebase, Play Console, App Store Connect): nada fora deste repo foi escrito por esta campanha, e este guião não autoriza publicação, `git push`, DDL/DML, outorgas, mint de contas nem rotação de credenciais.

**Como conferir os materiais (instrumentos versionados):**

| Peça | Veredicto medido | O que prova |
|---|---|---|
| `scripts/p163-verifica-materiais-fora-do-bundle.mjs` | `P163_MATERIAIS_FORA_DO_BUNDLE_OK 22/0` | placeholders GoTrue por template, marca (UNIESCO + slogan + `#00399b` + `#3fb80a` + URL do logo), ausência do nome antigo, e os tetos de caracteres das duas lojas |
| `scripts/p162-verifica-pdfs-uniesco.mjs` | `P162_PDFS_CLASSIFICADOS raster=2 texto=1 indeterminado=0` | classificação dos 3 PDFs servidos, por stream FlateDecode inflado, e varredura do texto visível |

Registos: `evidence/p163-materiais-fora-do-bundle-24-11-a.json`, `evidence/p162-pdfs-24-11-c.json`.

---

## 1. Templates de e-mail do Supabase (item 2)

**Onde:** painel Supabase → **Authentication → Email templates** (editor HTML + assunto, por template). Não há deployment: cada template é texto que se cola e se guarda.

| Ficheiro | Template no painel | Assunto proposto | Placeholders usados | Bytes medidos (p163) |
|---|---|---|---|---|
| `uniesco-fora-do-bundle/email-templates/confirm-signup.html` | Sign up confirmation | «Confirme seu e-mail na UNIESCO» | `{{ .ConfirmationURL }}`, `{{ .Email }}` | 1 894 |
| `uniesco-fora-do-bundle/email-templates/invite-user.html` | Invite user | «Você foi convidado para a UNIESCO» | `{{ .ConfirmationURL }}`, `{{ .Email }}` | 1 929 |
| `uniesco-fora-do-bundle/email-templates/magic-link.html` | Magic link | «Seu link de acesso à UNIESCO» | `{{ .ConfirmationURL }}` | 1 880 |
| `uniesco-fora-do-bundle/email-templates/change-email.html` | Change email address | «Confirme seu novo e-mail na UNIESCO» | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` | 1 963 |
| `uniesco-fora-do-bundle/email-templates/reset-password.html` | Reset password | «Redefina sua senha da UNIESCO» | `{{ .ConfirmationURL }}` | 1 966 |

**Detalhes que importam**

- O logotipo é servido pelo worker já publicado (`https://bfr-conecta.turmaroboticabfr.workers.dev/bfr-app-logo.png`); em e-mail, o contentor fixo de 44 px de altura evita esticar a marca.
- Azul `#00399b` nos títulos e no botão (10,2:1 com branco, AAA). O verde `#3fb80a` só aparece na barra decorativa de 4 px — medido 2,56:1, por isso nunca em texto.
- Cada template mantém a linha de URL por extenso debaixo do botão (clientes de e-mail que re-escrevem links).
- Se o painel tiver uma aba separada de **texto simples**, o parágrafo de cada template serve literalmente como corpo.

## 2. Notificações push do lado do servidor (item 3)

**Onde:** o emissor vive no projeto Firebase `bfr-conecta-notificacoes-62bbc` (Cloud Function, script ou extensão do dono) — fora deste repo. A alteração é no conteúdo da mensagem, não no envio.

- Material: `uniesco-fora-do-bundle/fcm/exemplo-payload-fcm-v1.json`, com `notification.title = "UNIESCO"`, `notification.body` = slogan, e `webpush.notification.icon`/`badge` a apontar para `https://bfr-conecta.turmaroboticabfr.workers.dev/uniesco-icon-192.png`.
- O que trocar no emissor: a string do título («BFR Conecta» → «UNIESCO») e, se o payload definir ícone/badge, os dois URLs acima. Tópicos, registos de dispositivos e as credenciais de serviço do emissor não mudam.
- O fallback do service worker **já está publicado** como UNIESCO na v144c: só os payloads montados do lado do servidor ainda dizem BFR até o emissor ser atualizado.
- Conferência depois de aplicar: enviar um comunicado de teste e ler o título/notificação no telefone; o corpo do e-mail não intervém aqui.

## 3. Listagens de loja (item 4)

**Onde:** Play Console → *Presença na loja* → *Principais propriedades*; App Store Connect → a app → *Prévia e informações* (por idioma).

| Campo | Texto | Caracteres (p163) | Teto |
|---|---|---|---|
| Play · nome | `UNIESCO` | 7 | 30 |
| Play · descrição breve | `UNIESCO — Conexão que transforma aprendizado, relações e futuro.` | 64 | 80 |
| Play · descrição completa | ver `uniesco-fora-do-bundle/stores/play-store-listing.json` | 202 | 4 000 |
| Apple · nome | `UNIESCO` | 7 | 30 |
| Apple · subtítulo | `Conexão que transforma` | 22 | 30 |
| Apple · texto promocional | `Aplicativo oficial da UNIESCO — Conexão que transforma aprendizado, relações e futuro.` | 86 | 170 |
| Apple · descrição | ver `uniesco-fora-do-bundle/stores/apple-store-listing.json` | 202 | 4 000 |

- Ícone de 512 px para a loja: `worker-deploy-v144c-uniesco/public/uniesco-icon-512.png` (95 834 B, md5 `4d41c45d1addde81cc60363a5bee5283`).
- O **identificador da app** (package name / bundle id) não muda — é identificador técnico, preservado por regra do brief. Se a loja mostrar o nome interno em *Detalhes técnicos*, esse texto permanece BFR de propósito.
- As capturas de ecrã das lojas são material de marketing: renová-las com a marca nova exige as imagens dos aparelhos, a cargo do dono.

## 4. PDFs servidos (item 5) — a afirmação antiga estava errada e foi corrigida por medida

O relatório v144c dizia que os três PDFs «têm um único fluxo FlateDecode que infla para uma imagem de página inteira (sem texto pesquisável)». **Medido com o p162 (streams inflados, `evidence/p162-pdfs-24-11-c.json`), isso vale para dois dos três:**

| PDF | Bytes | Páginas | Classificação medida | Streams FlateDecode | Texto visível extraído | BFR / UNIESCO / CONECTA no texto |
|---|---|---|---|---|---|---|
| `calendario-letivo-2026.pdf` | 202 349 | 2 | **vetorial com texto** | 8 (2 de conteúdo, com BT e operadores de texto) | 5 539 caracteres | **0 / 0 / 0** |
| `horario-matutino-2026.pdf` | 521 385 | 1 | **raster** | 1 (só `/Image`, 6 039 252 B inflados) | 0 caracteres | 0 / 0 / 0 |
| `horario-vespertino-2026.pdf` | 498 802 | 1 | **raster** | 1 (só `/Image`, 6 039 252 B inflados) | 0 caracteres | 0 / 0 / 0 |

Consequências, por documento:

- **Calendário letivo:** o texto pesquisável existe e **não contém nem o nome antigo nem o novo** — o cabeçalho medido diz «CMEI / ESCOLA MUNICIPAL DE EDUCAÇÃO BÁSICA» e «CALENDÁRIO LETIVO 2026». Não é preciso regenerá-lo por causa da renomeação; se se quiser a marca UNIESCO no cabeçalho, é decisão de conteúdo (dono), não desta campanha.
- **Horários (matutino e vespertino):** raster de página inteira; a marca dentro da imagem não é mensurável sem OCR. Regenerar exige os **documentos-fonte** (planilha/editor), a cargo do dono. Ao regenerar, o critério de aceite é o que o p162 já mede: texto extraído com «UNIESCO» e 0 ocorrências de BFR/CONECTA.
- O `bfr_bruto_latin1 = 1` do vespertino **não é nome**: o contexto guardado no artefacto mostra a sequência `…ÉXPbFr~é{…` dentro dos bytes comprimidos do `/Image` (a varredura é *case-insensitive* sobre ruído binário). O mesmo vale para os 24 `Tj/TJ` crus dos horários: são coincidências nesses bytes, não operadores de conteúdo — por isso a classificação usa os streams **inflados**.
- Não há `/Encrypt` nos três ficheiros.

**As duas corridas superadas deste instrumento ficam registadas, não apagadas:**

- `evidence/p162-pdfs-24-11-a-ANTERIOR-sonda-media-so-crus-e-classificou-os-3-como-raster.json/.txt` — viajava só pelos bytes crus e declarou os três raster.
- O `p162-pdfs-24-11-b` pediu «BT» a qualquer stream inflado e apanhou ruído: o `/Image` do vespertino tem 1 «BT» em 6 MB de pixéis, gerou 382 «pedacos» de lixo (1 294 907 caracteres), classificou um raster como vetorial e inchou o artefacto para **5 786 880 B (md5 `5a0ffefd38552c19033b7006d03ef9f1`)** — por isso **saiu do repo** em vez de ser versionado, e vive no diretório da sessão de 24/11. A régua corrigida exige BT **e** operadores de texto no mesmo stream e exclui ditados `/Image` e `/FontFile`; o positivo prova-se no calendário e o negativo nos horários.

## 5. Como isto se relaciona com o que já está publicado

Nada deste guião muda o ar. A v144c (`c14026e7-9c54-4169-810f-17815c936daf`, diário `audit-publicacao-v144.json`) já serve título, splash, manifest, ícones, logotipo, fallback do service worker e nomes de ficheiro de download como UNIESCO; os identificadores técnicos (`window.BFR_*`, classes `.bfr-*`, rotas `bfr_*`, hosts, nome do worker) ficam intactos por regra do brief. Os quatro itens acima são exatamente os emissores **fora** do bundle.
