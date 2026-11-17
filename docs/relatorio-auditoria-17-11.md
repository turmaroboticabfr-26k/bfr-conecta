# BFR Conecta — relatório do ciclo de 17/11/2026 (gerado)


Gerado por `node scripts/relatorio-14.mjs`. **Não editar à mão**: cada célula vem de um artefacto em
`evidence/`. Uma linha só conta como provada se existir o ficheiro que a mede; o resto diz NÃO TESTADA.

Régua aceite como prova: painel declarado pelo próprio app (`BFR_APP_RUNTIME.activeSection`), persona
reposta por `BFR_APP_RUNTIME.setRole` depois de cada clique, teto de assentamento de 6 s, chamada CDP com
teto de 25 s. Artefactos anteriores a esta régua foram arquivados com `-ANTERIOR-` no nome e não contam.

## Estado da amostra

- células ABRE: **765** · com défice: **120** · NÃO TESTADA: **0**
- bandas com artefacto válido: **75 de 75** (papel × largura; as 5 larguras são 390 e 1280 da varredura original mais 1366/1440/1920 do §6 do briefing)
- telemóvel (§5, 15 perfis × 6 larguras): **79 de 90 células medidas** e **11 NÃO TESTADA**, cada uma com a causa escrita pelo instrumento: conta em análise: barreira de pendência, sem shell nem navegação (estado do produto) × 6 · shell ready sem #bfrMobileBottomNav após rechegar × 5. Nenhuma é buraco de campanha: relançar não muda o estado do produto. Fonte: `ah2-m5-consolidado-consol-r11.json`
- **Reclassificação medida, e é do instrumento não do produto**: as células «painel vazio» do `apoio` foram sondadas no tempo (8 corridas com série preenchida — aee@375: 3001 c aos 1073 ms · aee@390: 3001 c aos 1177 ms · coordinator@390: 3434 c aos 1603 ms · developer@320: 3434 c aos 2657 ms · developer@390: 3434 c aos 3325 ms · secretary@320: 3001 c aos 4712 ms · secretary@390: 3001 c aos 1082 ms · student@320: 2791 c aos 1067 ms). O `#supportView` fica visível com caixa antes de ter texto, e o `MEDIR` do provador sai quando a contagem se repete duas vezes (600 ms × 2, ≈1,8 s): por isso a grelha mediu 0 c onde há 2791-3434. Nas larguras sondadas (320/375/390) o vermelho do `apoio` é defeito de medição; nas outras é suspeita pela mesma prédica, não verde provado.
- **Confirmação medida, e é do produto**: a mesma sonda com o painel por parâmetro foi corrida nas células `chat-interno` que estavam em dúvida (2 corridas — education_supervisor@320 `internalChatView` aberto (activeSection=chat-interno) e a 0 em 50 amostras ≈26 s, 0 pedidos à base, html máximo 49 bytes · education_supervisor@390 `internalChatView` aberto (activeSection=chat-interno) e a 0 em 50 amostras ≈26 s, 0 pedidos à base, html máximo 49 bytes). Ao contrário do `apoio`, aqui o painel abre — `activeSection` fica na rota tocada e o contentor tem caixa — e mesmo assim não produz texto, sem exceção lançada e sem pedido à base na janela. Não é a janela de assentamento: é o render a não produzir conteúdo para este papel, e a linha FALHA da grelha mantém-se, agora com a causa lida em browser e não só no código.
- **E a régua desktop confirma, medida na própria régua**: o rodapé da tabela desktop dizia «estas linhas NÃO foram sondadas», e o re-teste foi corrido com clique de rato confiável e emulação desktop (`deviceScaleFactor:1, mobile:false`, as mesmas alturas do instrumento da grelha), porque uma leitura a 390 px não se pode assinar por uma a 1366. 3 corridas — education_supervisor@1366 `internalChatView` aberto (activeSection=chat-interno) e a 0 em 50 amostras ≈26 s, 0 pedidos à base, html máximo 49 bytes · education_supervisor@1440 `internalChatView` aberto (activeSection=chat-interno) e a 0 em 50 amostras ≈26 s, 0 pedidos à base, html máximo 49 bytes · education_supervisor@1920 `internalChatView` aberto (activeSection=chat-interno) e a 0 em 50 amostras ≈26 s, 0 pedidos à base, html máximo 49 bytes. O painel abre na banda em que a grelha o mediu vazio e não produz texto: a linha FALHA do §6 deixa de ser lista de re-teste e passa a defeito com causa medida nas três larguras.
- o que falta para a amostra estar completa: nada — **esta linha conta apenas as células perfil×largura da régua desktop**, e as NÃO TESTADA dela são 0. A tabela de funcionalidade tem duas outras contas, em duas réguas que não se somam: 11 CÉLULAS papel×largura por medir no consolidado do §5 (`ah2-m5-consolidado-consol-r11.json`) e 25 LINHAS papel×rota de 195 na tabela linha a linha (`scripts/ah2-m5-tabela.mjs`, lidas do rodapé dela). Uma linha da tabela agrega as seis larguras, pelo que 11 células e 25 linhas não são a mesma grandeza nem a mesma pergunta.

## Bandas corridas (o que cada artefacto diz do arranque)

| Perfil | Largura | shell pronto | seções abertas | sem botão no menu | não assentaram em 6 s | erros de app | botões no DOM | nav visível ao abrir | artefacto |
|---|---|---|---|---|---|---|---|---|---|
| parent | 390 px | 2055 ms | 14 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-parent390.json` |
| parent | 1280 px | 967 ms | 14 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-parent1280.json` |
| parent | 1366 px | 832 ms | 14 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1366g1.json` |
| parent | 1440 px | 831 ms | 14 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1440g1.json` |
| parent | 1920 px | 1670 ms | 14 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1920g1.json` |
| student | 390 px | 873 ms | 17 | escola-historia, videos-aprender | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-student390.json` |
| student | 1280 px | 879 ms | 17 | escola-historia, videos-aprender | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-student1280.json` |
| student | 1366 px | 491 ms | 17 | escola-historia, videos-aprender | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1366g1.json` |
| student | 1440 px | 500 ms | 17 | escola-historia, videos-aprender | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1440g1.json` |
| student | 1920 px | 828 ms | 17 | escola-historia, videos-aprender | 0 | 0 | 36 | 17 | `ah2-varredura-17-11-1920g1.json` |
| pedagogical | 390 px | 481 ms | 20 | professor-agenda-hoje, escola-historia | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-ped390.json` |
| pedagogical | 1280 px | 655 ms | 20 | professor-agenda-hoje, escola-historia | 0 | 0 | 36 | 1 | `ah2-varredura-17-11-ped1280.json` |
| pedagogical | 1366 px | 428 ms | 20 | professor-agenda-hoje, escola-historia | 0 | 0 | 36 | 1 | `ah2-varredura-17-11-1366g1.json` |
| pedagogical | 1440 px | 419 ms | 20 | professor-agenda-hoje, escola-historia | 0 | 0 | 36 | 1 | `ah2-varredura-17-11-1440g1.json` |
| pedagogical | 1920 px | 419 ms | 20 | professor-agenda-hoje, escola-historia | 0 | 0 | 36 | 1 | `ah2-varredura-17-11-1920g1.json` |
| coordinator | 390 px | 461 ms | 16 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-coord.json` |
| coordinator | 1280 px | 852 ms | 16 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 14 | `ah2-varredura-17-11-coord1280.json` |
| coordinator | 1366 px | 433 ms | 16 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 6 | `ah2-varredura-17-11-1366g2.json` |
| coordinator | 1440 px | 422 ms | 16 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 6 | `ah2-varredura-17-11-1440g2.json` |
| coordinator | 1920 px | 433 ms | 16 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 6 | `ah2-varredura-17-11-1920g2.json` |
| secretary | 390 px | 503 ms | 9 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-secr390.json` |
| secretary | 1280 px | 494 ms | 9 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-secr1280b.json` |
| secretary | 1366 px | 832 ms | 9 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1366g2.json` |
| secretary | 1440 px | 420 ms | 9 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1440g2.json` |
| secretary | 1920 px | 849 ms | 9 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1920g2b.json` |
| aee | 390 px | 842 ms | 9 | escola-historia | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-aee390b.json` |
| aee | 1280 px | 1264 ms | 9 | escola-historia | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-aee1280.json` |
| aee | 1366 px | 886 ms | 9 | escola-historia | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1366g2b.json` |
| aee | 1440 px | 891 ms | 9 | escola-historia | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1440g3.json` |
| aee | 1920 px | 836 ms | 9 | escola-historia | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1920g3.json` |
| director | 390 px | 1239 ms | 13 | escola-historia, coordenacao-chat | 0 | 0 | 38 | 0 | `ah2-varredura-17-11-director390.json` |
| director | 1280 px | 486 ms | 13 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-director1280.json` |
| director | 1366 px | 482 ms | 13 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1366g3.json` |
| director | 1440 px | 429 ms | 13 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1440g3.json` |
| director | 1920 px | 421 ms | 13 | escola-historia, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1920g3.json` |
| psychology | 390 px | 871 ms | 3 | — | 0 | 0 | 37 | 0 | `ah2-varredura-17-11-psych390.json` |
| psychology | 1280 px | 839 ms | 3 | — | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-psych1280.json` |
| psychology | 1366 px | 430 ms | 3 | — | 0 | 0 | 36 | 2 | `ah2-varredura-17-11-1366g3.json` |
| psychology | 1440 px | 1244 ms | 3 | — | 0 | 0 | 37 | 6 | `ah2-varredura-17-11-1440g3.json` |
| psychology | 1920 px | 423 ms | 3 | — | 0 | 0 | 36 | 2 | `ah2-varredura-17-11-1920g3.json` |
| social_work | 390 px | 841 ms | 3 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-social390.json` |
| social_work | 1280 px | 899 ms | 3 | — | 0 | 0 | 36 | 2 | `ah2-varredura-17-11-social1280.json` |
| social_work | 1366 px | 422 ms | 3 | — | 0 | 0 | 36 | 3 | `ah2-varredura-17-11-1366g3.json` |
| social_work | 1440 px | 426 ms | 3 | — | 0 | 0 | 36 | 3 | `ah2-varredura-17-11-1440g3.json` |
| social_work | 1920 px | 421 ms | 3 | — | 0 | 0 | 36 | 3 | `ah2-varredura-17-11-1920g3.json` |
| sports_operator | 390 px | 470 ms | 4 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-sports390.json` |
| sports_operator | 1280 px | 884 ms | 4 | — | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-sports1280.json` |
| sports_operator | 1366 px | 433 ms | 4 | — | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1366g3.json` |
| sports_operator | 1440 px | 528 ms | 4 | — | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1440g4.json` |
| sports_operator | 1920 px | 877 ms | 4 | — | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1920g4.json` |
| education_supervisor | 390 px | 859 ms | 8 | escola-historia, comunicacao, coordenacao-chat, supervisao | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-edsup390.json` |
| education_supervisor | 1280 px | 856 ms | 8 | escola-historia, comunicacao, coordenacao-chat, supervisao | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-edsup1280.json` |
| education_supervisor | 1366 px | 433 ms | 8 | escola-historia, comunicacao, coordenacao-chat, supervisao | 0 | 0 | 36 | 8 | `ah2-varredura-17-11-1366g3.json` |
| education_supervisor | 1440 px | 464 ms | 8 | escola-historia, comunicacao, coordenacao-chat, supervisao | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1440g4.json` |
| education_supervisor | 1920 px | 421 ms | 8 | escola-historia, comunicacao, coordenacao-chat, supervisao | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1920g4.json` |
| monitor | 390 px | 838 ms | 7 | escola-historia | 0 | 0 | 37 | 0 | `ah2-varredura-17-11-mon390b.json` |
| monitor | 1280 px | 1668 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-monitor1280.json` |
| monitor | 1366 px | 482 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1366g2.json` |
| monitor | 1440 px | 553 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1440g2.json` |
| monitor | 1920 px | 483 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1920g2.json` |
| gatekeeper | 390 px | 426 ms | 7 | escola-historia | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-gate390.json` |
| gatekeeper | 1280 px | 553 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-gate1280.json` |
| gatekeeper | 1366 px | 434 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1366g2.json` |
| gatekeeper | 1440 px | 430 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1440g2.json` |
| gatekeeper | 1920 px | 451 ms | 7 | escola-historia | 0 | 0 | 36 | 4 | `ah2-varredura-17-11-1920g2.json` |
| developer | 390 px | 457 ms | 24 | escola-historia, videos-aprender, admin-crachas, coordenacao-chat | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-dev390.json` |
| developer | 1280 px | 839 ms | 24 | escola-historia, videos-aprender, admin-crachas, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-dev1280b.json` |
| developer | 1366 px | 430 ms | 24 | escola-historia, videos-aprender, admin-crachas, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1366g1.json` |
| developer | 1440 px | 840 ms | 24 | escola-historia, videos-aprender, admin-crachas, coordenacao-chat | 0 | 0 | 36 | 22 | `ah2-varredura-17-11-repro1440.json` |
| developer | 1920 px | 439 ms | 24 | escola-historia, videos-aprender, admin-crachas, coordenacao-chat | 0 | 0 | 36 | 5 | `ah2-varredura-17-11-1920g1.json` |
| pending | 390 px | 859 ms | 0 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-pend390.json` |
| pending | 1280 px | 880 ms | 0 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-pend1280.json` |
| pending | 1366 px | 842 ms | 0 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-1366g1.json` |
| pending | 1440 px | 431 ms | 0 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-1440g1.json` |
| pending | 1920 px | 1650 ms | 0 | — | 0 | 0 | 36 | 0 | `ah2-varredura-17-11-1920g1.json` |

## Défices por classe (as 120 células com défice são 5 famílias, não 120 problemas)

| Classe do défice | Medições afetadas | Quota |
|---|---|---|
| alvo com menos de 44 px | 635 | 82 % das 770 medições |
| texto com menos de 11 px | 433 | 56 % das 770 medições |
| elemento cortado pelo painel | 392 | 51 % das 770 medições |
| seção declarada sem botão de menu | 115 | 15 % das 770 medições |
| painel que abre sem caracteres | 5 | 1 % das 770 medições |

## Painéis vazios e declarações que não batem

Um clique pode abrir um painel com o identificador certo e 0 caracteres, ou abrir um painel enquanto o
próprio app declara outra seção ativa. Os dois são defeitos funcionais e nenhum aparece como «não abriu».

Causa do painel vazio de `chat-interno` no education_supervisor, lida dos bytes servidos (não é hipótese):
o mapa de navegação dá `chat-interno` a este papel (`app/index.html:9018`), mas o módulo do chat decide
abrir só para `STAFF_ROLES` (`:19143` — `pedagogical, aee, coordinator, director, secretary, psychology,
social_work, developer`) ou para as vistas `teacher/coordinator/director/secretary/aee/multiprofessional/
admin` (`:19153`); `education_supervisor` não está em nenhuma das duas listas, por isso `allowed()` é
falso e `open()` devolve `false` em `:19338` SEM injetar o shell. Quem mostra a vista é o router
(`:10060-10063`: des-esconde `#internalChatView` e chama `BFRInternalChat.open()`), e o resultado é
exatamente o que a varredura mede: painel com o id certo, 0 caracteres, 0 erros de consola, reproduzido em
390, 1280, 1366. Remédio é uma linha no `allowed()` do chat (ou tirar `chat-interno` do mapa do papel) —
é decisão de produto, não ambiguidade técnica, por isso fica por aplicar.

| Célula | Painéis que abrem vazios | Clique × declaração do app | artefacto |
|---|---|---|---|
| sports_operator @ 390 px | — | inicio→jogos-escolares | `ah2-varredura-17-11-sports390.json` |
| sports_operator @ 1280 px | — | inicio→jogos-escolares | `ah2-varredura-17-11-sports1280.json` |
| sports_operator @ 1366 px | — | inicio→jogos-escolares | `ah2-varredura-17-11-1366g3.json` |
| sports_operator @ 1440 px | — | inicio→jogos-escolares | `ah2-varredura-17-11-1440g4.json` |
| sports_operator @ 1920 px | — | inicio→jogos-escolares | `ah2-varredura-17-11-1920g4.json` |
| education_supervisor @ 390 px | chat-interno (null) | fotos→jogos-escolares | `ah2-varredura-17-11-edsup390.json` |
| education_supervisor @ 1280 px | chat-interno (null) | fotos→jogos-escolares | `ah2-varredura-17-11-edsup1280.json` |
| education_supervisor @ 1366 px | chat-interno (null) | fotos→jogos-escolares | `ah2-varredura-17-11-1366g3.json` |
| education_supervisor @ 1440 px | chat-interno (null) | fotos→jogos-escolares | `ah2-varredura-17-11-1440g4.json` |
| education_supervisor @ 1920 px | chat-interno (null) | fotos→jogos-escolares | `ah2-varredura-17-11-1920g4.json` |
| developer @ 390 px | — | direcao→administracao | `ah2-varredura-17-11-dev390.json` |
| developer @ 1280 px | — | direcao→administracao | `ah2-varredura-17-11-dev1280b.json` |
| developer @ 1366 px | — | direcao→administracao | `ah2-varredura-17-11-1366g1.json` |
| developer @ 1440 px | — | direcao→administracao | `ah2-varredura-17-11-repro1440.json` |
| developer @ 1920 px | — | direcao→administracao | `ah2-varredura-17-11-1920g1.json` |

## Ciclos fora da varredura

| Verificação | Resultado | Onde |
|---|---|---|
| RM-1.2 · clique real de developer no painel «Contas e cargos» | CORRIDA COM BLOQUEIO | `ah2-cliques-17-11-17-11.json` · o painel abriu com sessão real e a linha do próprio developer vem desabilitada; a escrita não aconteceu porque a conta-alvo é sintética e a política RESTRITIVA `profiles_hide_test_accounts` esconde-a do developer (10 de 24 perfis visíveis) — precisa de decisão, ver §notas |
| RM-2.7 · vistas do professor com vínculo real | AH2_PROFESSOR_POPULADO | `ah2-professor-17-11-17-11b.json` · 0 falhas declaradas |
| §5 · telemóvel a toque nas larguras do briefing (320/360/375/390/414/430 × 15 perfis) | 79/90 celulas medidas · 7 classes de defeito · 11 por medir | `ah2-m5-consolidado-consol-r11.json` · 7 classes de defeito · 11 NÃO TESTADA com causa · md5 d418e7fc917f1fbb1437054b7b531f9b · tabela linha a linha em `scripts/ah2-m5-tabela.mjs` |
| §6 · causa da demora do clique em Home | sem veredito no ficheiro | `ah2-home-causa-17-11.json` · 0 falhas declaradas |
| §6 · censo de nós: vazamento ou troca depois de 12 cliques em Home | AH2_HOME_NODOS_MEDIDO | `ah2-home-nodos-17-11b.json` · 0 falhas declaradas<br>TROCA: o platô de ~2 s vem de re-construir a vista de coordenação a cada clique (enhanceSection + observer), não de rede nem de DOM acumulado. |
| §6 · bandas desktop 1366/1440/1920 | CORRIDAS: 1366 px (15 perfis), 1440 px (15 perfis), 1920 px (15 perfis) | mesma régua da varredura, `node scripts/ah2-varredura.mjs TODOS <rótulo> <banda>` |

## Candidatas prontas em disco e não publicadas

| Candidata | Worker comparado à base publicada | Portões da candidata | Estado | Conteúdo |
|---|---|---|---|---|
| bfr-candidata-v124-anticliquejacking | `worker.mjs` md5 bd2b2d6c1333… — worker ≠ base | — portões / — falhas · `sem portões` | publicado: **desconhecido** | 14 ficheiros |
| bfr-candidata-v125-announcement-created-at | `worker.mjs` md5 7d5fbbe71971… — worker ≠ base | — portões / — falhas · `sem portões` | publicado: **desconhecido** | 16 ficheiros |
| bfr-candidata-v126-a11y-secretaria | `worker.mjs` md5 cf006723c681… — worker ≠ base | 23 portões / 0 falhas · `portoes-v126-bancada.json` | publicado: **não** | 18 ficheiros |

O shell medido nesta régua tem md5 `d418e7fc917f1fbb1437054b7b531f9b` e o `worker.mjs` da base publicada tem
md5 `7044c8c02368…`. `worker ≠ base` quer dizer
que a correção dessa candidata **não está** no que o utilizador vê: publicar é decisão à parte, não
consequência desta tabela.

## Rede: o que os painéis pedem e não recebem

Do censo das 30 células com artefacto válido (amostra de 6 entradas por célula; 0 células teriam mais):

| URL | HTTP | Perfis que o pedem | Bandas |
|---|---|---|---|
| `/cdn-cgi/rum` | 404 | aee, coordinator, developer, director, education_supervisor, gatekeeper, monitor, parent, pedagogical, pending, psychology, secretary, social_work, sports_operator, student | 1280 + 390 |
| `/rest/v1/bfr_school_calendar_days` | 404 | gatekeeper | 1280 + 390 |
| `/rest/v1/bfr_school_shift_settings` | 404 | gatekeeper | 1280 + 390 |

GET directo ao PostgREST com a chave anónima lida dos bytes servidos (`ah2-sonda-rest-17-11b.json`) — é o que distingue tabela em falta de falta de privilégio:

| Relação | HTTP | Código / mensagem |
|---|---|---|
| `bfr_school_shift_settings` | 404 | PGRST205 Could not find the table 'public.bfr_school_shift_settings' in the schema cache |
| `bfr_school_calendar_days` | 404 | PGRST205 Could not find the table 'public.bfr_school_calendar_days' in the schema cache |
| `bfr_school_calendar_month_targets` | 404 | PGRST205 Could not find the table 'public.bfr_school_calendar_month_targets' in the schema cache |
| `gate_checkins` | 200 |   |
| `students` | 200 |   |

`/cdn-cgi/rum` é telemetria da própria Cloudflare, não do app; fica listado porque o portão conta tudo o que
falha. As relações `bfr_school_shift_settings`, `bfr_school_calendar_days` e
`bfr_school_calendar_month_targets` são pedidas pelo bloco `app/index.html:15088-15091` e nunca foram criadas:
a correção é DDL, está preparada em `scripts/ah2-ddl-calendario-candidata.sql` e **não foi aplicada**.

## Bloqueios que precisam de decisão do utilizador

Nada disto é «falta de tempo»: são três pontos em que continuar exige autorização porque o passo seguinte
escreve em dados reais, publica para a escola, ou corre DDL.

1. **RM-1.2 (clique real a mudar um cargo).** A política RESTRITIVA `profiles_hide_test_accounts` esconde
   do developer qualquer conta `%@bfr-conecta.test`: a sessão de developer vê 10 dos 24 perfis
   (`content-range: 0-9/10`, provado em `evidence/ah2-sonda-limite-17-11e.json`), e as minhas contas de
   teste estão todas fora dessa janela. Para fechar o teste é preciso **(a)** mudar o cargo de uma conta
   real e reverter, ou **(b)** criar uma conta sintética fora do domínio escondido — que passaria a ser
   visível no painel da escola — e apagá-la no fim. Não escolho por ti porque as duas alternativas tocam
   no que a primeira protegia.
2. **Item 35 (Aniversários da secretaria)** e o **calendário/turnos em falta** pedem DDL. As três relações
   nunca existiram (`404 PGRST205`, ver a secção de rede acima) e a candidata está escrita em
   `scripts/ah2-ddl-calendario-candidata.sql` com reversão em `scripts/ah2-ddl-calendario-reversao.sql`;
   não foi aplicada.
3. **Publicar v124 / v125 / v126.** As candidatas estão prontas em disco com os portões delas; nenhuma está
   no ar (`worker ≠ base` na tabela das candidatas). Publicar é um ato à parte, e «finalize tudo» não é
   autorização para ele.

## Funcionalidade × perfil

### parent — Responsável

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | parent @ 390 px | ABRE (parentView, 1161 car., 1821ms) | 1 textos < 11px | por classificar com a evidência |
| inicio | parent @ 1280 px | ABRE (parentView, 1161 car., 1811ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| inicio | parent @ 1366 px | ABRE (parentView, 1161 car., 1820ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| inicio | parent @ 1440 px | ABRE (parentView, 1161 car., 1820ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| inicio | parent @ 1920 px | ABRE (parentView, 1161 car., 1831ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| aprender | parent @ 390 px | ABRE (platformLearnView, 279 car., 1811ms) | 8 elementos cortados | por classificar com a evidência |
| aprender | parent @ 1280 px | ABRE (platformLearnView, 279 car., 1828ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| aprender | parent @ 1366 px | ABRE (platformLearnView, 279 car., 1812ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| aprender | parent @ 1440 px | ABRE (platformLearnView, 279 car., 1818ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| aprender | parent @ 1920 px | ABRE (platformLearnView, 279 car., 1827ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| evoluir | parent @ 390 px | ABRE (platformEvolveView, 270 car., 1820ms) | 6 elementos cortados | por classificar com a evidência |
| evoluir | parent @ 1280 px | ABRE (platformEvolveView, 270 car., 1821ms) | 4 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| evoluir | parent @ 1366 px | ABRE (platformEvolveView, 270 car., 1837ms) | 4 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| evoluir | parent @ 1440 px | ABRE (platformEvolveView, 270 car., 1819ms) | 4 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| evoluir | parent @ 1920 px | ABRE (platformEvolveView, 270 car., 1829ms) | 4 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| escola | parent @ 390 px | ABRE (platformSchoolView, 306 car., 1815ms) | 8 elementos cortados | por classificar com a evidência |
| escola | parent @ 1280 px | ABRE (platformSchoolView, 306 car., 1818ms) | 7 elementos cortados | por classificar com a evidência |
| escola | parent @ 1366 px | ABRE (platformSchoolView, 306 car., 1829ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| escola | parent @ 1440 px | ABRE (platformSchoolView, 306 car., 1824ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| escola | parent @ 1920 px | ABRE (platformSchoolView, 306 car., 1819ms) | 6 alvos < 44px; 7 elementos cortados | por classificar com a evidência |
| meu-espaco | parent @ 390 px | ABRE (platformSpaceView, 332 car., 1822ms) | 10 elementos cortados | por classificar com a evidência |
| meu-espaco | parent @ 1280 px | ABRE (platformSpaceView, 332 car., 1828ms) | 2 alvos < 44px; 9 elementos cortados | por classificar com a evidência |
| meu-espaco | parent @ 1366 px | ABRE (platformSpaceView, 332 car., 1833ms) | 2 alvos < 44px; 9 elementos cortados | por classificar com a evidência |
| meu-espaco | parent @ 1440 px | ABRE (platformSpaceView, 332 car., 1821ms) | 1 alvos < 44px; 9 elementos cortados | por classificar com a evidência |
| meu-espaco | parent @ 1920 px | ABRE (platformSpaceView, 332 car., 1816ms) | 8 alvos < 44px; 9 elementos cortados | por classificar com a evidência |
| notificacoes | parent @ 390 px | ABRE (bfrNotificationsView, 400 car., 1831ms) | — | — |
| notificacoes | parent @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1821ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | parent @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1821ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | parent @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1819ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | parent @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1819ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | parent @ 390 px | ABRE (bfrContentHubView, 1021 car., 1826ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | parent @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1820ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | parent @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1825ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | parent @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1825ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | parent @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1825ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| escola-historia | parent @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | parent @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | parent @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | parent @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | parent @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notas | parent @ 390 px | ABRE (parentView, 1161 car., 1816ms) | 1 textos < 11px | por classificar com a evidência |
| notas | parent @ 1280 px | ABRE (parentView, 1161 car., 1825ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| notas | parent @ 1366 px | ABRE (parentView, 1161 car., 1831ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| notas | parent @ 1440 px | ABRE (parentView, 1161 car., 1823ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| notas | parent @ 1920 px | ABRE (parentView, 1161 car., 1824ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| agenda | parent @ 390 px | ABRE (parentView, 1161 car., 1830ms) | 1 textos < 11px | por classificar com a evidência |
| agenda | parent @ 1280 px | ABRE (parentView, 1161 car., 1828ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| agenda | parent @ 1366 px | ABRE (parentView, 1161 car., 1821ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| agenda | parent @ 1440 px | ABRE (parentView, 1161 car., 1830ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| agenda | parent @ 1920 px | ABRE (parentView, 1161 car., 1831ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| atividades | parent @ 390 px | ABRE (activityCenterView, 1011 car., 1821ms) | — | — |
| atividades | parent @ 1280 px | ABRE (activityCenterView, 1011 car., 1820ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | parent @ 1366 px | ABRE (activityCenterView, 1011 car., 1829ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | parent @ 1440 px | ABRE (activityCenterView, 1011 car., 1823ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | parent @ 1920 px | ABRE (activityCenterView, 1011 car., 1829ms) | 15 alvos < 44px | por classificar com a evidência |
| comunicados | parent @ 390 px | ABRE (parentView, 1126 car., 1818ms) | 1 textos < 11px | por classificar com a evidência |
| comunicados | parent @ 1280 px | ABRE (parentView, 1126 car., 1833ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| comunicados | parent @ 1366 px | ABRE (parentView, 1126 car., 1816ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| comunicados | parent @ 1440 px | ABRE (parentView, 1126 car., 1823ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| comunicados | parent @ 1920 px | ABRE (parentView, 1126 car., 1828ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| secretaria | parent @ 390 px | ABRE (secretaryView, 1359 car., 1824ms) | 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| secretaria | parent @ 1280 px | ABRE (secretaryView, 1359 car., 1822ms) | 9 alvos < 44px; 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| secretaria | parent @ 1366 px | ABRE (secretaryView, 1359 car., 1825ms) | 9 alvos < 44px; 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| secretaria | parent @ 1440 px | ABRE (secretaryView, 1359 car., 1822ms) | 9 alvos < 44px; 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| secretaria | parent @ 1920 px | ABRE (secretaryView, 1359 car., 1827ms) | 9 alvos < 44px; 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| ocorrencias | parent @ 390 px | ABRE (parentView, 1126 car., 1830ms) | 1 textos < 11px | por classificar com a evidência |
| ocorrencias | parent @ 1280 px | ABRE (parentView, 1126 car., 1830ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| ocorrencias | parent @ 1366 px | ABRE (parentView, 1126 car., 1820ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| ocorrencias | parent @ 1440 px | ABRE (parentView, 1126 car., 1830ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| ocorrencias | parent @ 1920 px | ABRE (parentView, 1126 car., 1827ms) | 1 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| coordenacao-chat | parent @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | parent @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | parent @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | parent @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | parent @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| jogos-escolares | parent @ 390 px | ABRE (schoolGamesView, 865 car., 1814ms) | — | — |
| jogos-escolares | parent @ 1280 px | ABRE (schoolGamesView, 865 car., 1827ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | parent @ 1366 px | ABRE (schoolGamesView, 865 car., 1829ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | parent @ 1440 px | ABRE (schoolGamesView, 865 car., 1825ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | parent @ 1920 px | ABRE (schoolGamesView, 865 car., 1837ms) | 8 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-parent390.json`, `ah2-varredura-17-11-parent1280.json`, `ah2-varredura-17-11-1366g1.json`, `ah2-varredura-17-11-1440g1.json`, `ah2-varredura-17-11-1920g1.json`

### student — Aluno

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | student @ 390 px | ABRE (studentView, 1281 car., 1819ms) | 1 elementos cortados | por classificar com a evidência |
| inicio | student @ 1280 px | ABRE (studentView, 1281 car., 1816ms) | 6 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| inicio | student @ 1366 px | ABRE (studentView, 1281 car., 1850ms) | 6 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| inicio | student @ 1440 px | ABRE (studentView, 1281 car., 1829ms) | 6 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| inicio | student @ 1920 px | ABRE (studentView, 1281 car., 1819ms) | 6 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| aprender | student @ 390 px | ABRE (platformLearnView, 1032 car., 1826ms) | 8 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| aprender | student @ 1280 px | ABRE (platformLearnView, 1032 car., 1823ms) | 7 alvos < 44px; 8 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| aprender | student @ 1366 px | ABRE (platformLearnView, 1032 car., 1829ms) | 7 alvos < 44px; 8 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| aprender | student @ 1440 px | ABRE (platformLearnView, 1032 car., 1824ms) | 7 alvos < 44px; 8 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| aprender | student @ 1920 px | ABRE (platformLearnView, 1032 car., 1831ms) | 7 alvos < 44px; 8 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| evoluir | student @ 390 px | ABRE (platformEvolveView, 1021 car., 1817ms) | 18 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| evoluir | student @ 1280 px | ABRE (platformEvolveView, 1021 car., 1839ms) | 4 alvos < 44px; 18 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| evoluir | student @ 1366 px | ABRE (platformEvolveView, 1021 car., 1835ms) | 4 alvos < 44px; 18 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| evoluir | student @ 1440 px | ABRE (platformEvolveView, 1021 car., 1828ms) | 4 alvos < 44px; 18 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| evoluir | student @ 1920 px | ABRE (platformEvolveView, 1021 car., 1832ms) | 4 alvos < 44px; 18 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| escola | student @ 390 px | ABRE (platformSchoolView, 723 car., 1823ms) | 9 elementos cortados | por classificar com a evidência |
| escola | student @ 1280 px | ABRE (platformSchoolView, 723 car., 1825ms) | 14 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| escola | student @ 1366 px | ABRE (platformSchoolView, 723 car., 1812ms) | 14 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| escola | student @ 1440 px | ABRE (platformSchoolView, 723 car., 1823ms) | 14 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| escola | student @ 1920 px | ABRE (platformSchoolView, 723 car., 1818ms) | 14 alvos < 44px; 1 elementos cortados | por classificar com a evidência |
| meu-espaco | student @ 390 px | ABRE (platformSpaceView, 223 car., 1829ms) | 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| meu-espaco | student @ 1280 px | ABRE (platformSpaceView, 223 car., 1848ms) | 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| meu-espaco | student @ 1366 px | ABRE (platformSpaceView, 223 car., 1819ms) | 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| meu-espaco | student @ 1440 px | ABRE (platformSpaceView, 223 car., 1814ms) | 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| meu-espaco | student @ 1920 px | ABRE (platformSpaceView, 223 car., 1830ms) | 1 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| notificacoes | student @ 390 px | ABRE (bfrNotificationsView, 400 car., 1823ms) | — | — |
| notificacoes | student @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1819ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | student @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1816ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | student @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1817ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | student @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1818ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | student @ 390 px | ABRE (bfrContentHubView, 1021 car., 1839ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | student @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1817ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | student @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1817ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | student @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1818ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | student @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1835ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| escola-historia | student @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | student @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | student @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | student @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | student @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notas | student @ 390 px | ABRE (studentView, 11158 car., 1838ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| notas | student @ 1280 px | ABRE (studentView, 11158 car., 1822ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| notas | student @ 1366 px | ABRE (studentView, 11165 car., 1815ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| notas | student @ 1440 px | ABRE (studentView, 11164 car., 1823ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| notas | student @ 1920 px | ABRE (studentView, 11159 car., 1829ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| agenda | student @ 390 px | ABRE (studentView, 11158 car., 1831ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| agenda | student @ 1280 px | ABRE (studentView, 11158 car., 1829ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| agenda | student @ 1366 px | ABRE (studentView, 11165 car., 1833ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| agenda | student @ 1440 px | ABRE (studentView, 11164 car., 1832ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| agenda | student @ 1920 px | ABRE (studentView, 11159 car., 1814ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| atividades | student @ 390 px | ABRE (activityCenterView, 1011 car., 1814ms) | — | — |
| atividades | student @ 1280 px | ABRE (activityCenterView, 1011 car., 1827ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | student @ 1366 px | ABRE (activityCenterView, 1011 car., 1817ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | student @ 1440 px | ABRE (activityCenterView, 1011 car., 1823ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | student @ 1920 px | ABRE (activityCenterView, 1011 car., 1828ms) | 15 alvos < 44px | por classificar com a evidência |
| horarios | student @ 390 px | ABRE (studentView, 11158 car., 1826ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| horarios | student @ 1280 px | ABRE (studentView, 11158 car., 1814ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| horarios | student @ 1366 px | ABRE (studentView, 11165 car., 1816ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| horarios | student @ 1440 px | ABRE (studentView, 11164 car., 1820ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| horarios | student @ 1920 px | ABRE (studentView, 11159 car., 1821ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| jogos | student @ 390 px | ABRE (studentView, 11158 car., 1822ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| jogos | student @ 1280 px | ABRE (studentView, 11158 car., 1822ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| jogos | student @ 1366 px | ABRE (studentView, 11165 car., 1818ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| jogos | student @ 1440 px | ABRE (studentView, 11164 car., 1818ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| jogos | student @ 1920 px | ABRE (studentView, 11159 car., 1815ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| jogos-escolares | student @ 390 px | ABRE (schoolGamesView, 865 car., 1810ms) | — | — |
| jogos-escolares | student @ 1280 px | ABRE (schoolGamesView, 865 car., 1837ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | student @ 1366 px | ABRE (schoolGamesView, 865 car., 1824ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | student @ 1440 px | ABRE (schoolGamesView, 865 car., 1821ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | student @ 1920 px | ABRE (schoolGamesView, 865 car., 1822ms) | 8 alvos < 44px | por classificar com a evidência |
| videos-aprender | student @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | student @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | student @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | student @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | student @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicados | student @ 390 px | ABRE (studentView, 11158 car., 1820ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| comunicados | student @ 1280 px | ABRE (studentView, 11158 car., 1831ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| comunicados | student @ 1366 px | ABRE (studentView, 11165 car., 1811ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| comunicados | student @ 1440 px | ABRE (studentView, 11164 car., 1823ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| comunicados | student @ 1920 px | ABRE (studentView, 11159 car., 1840ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| biblioteca | student @ 390 px | ABRE (readingLibraryView, 55706 car., 1837ms) | 4 textos < 11px; 230 elementos cortados | por classificar com a evidência |
| biblioteca | student @ 1280 px | ABRE (readingLibraryView, 55706 car., 1959ms) | 691 alvos < 44px; 4 textos < 11px; 230 elementos cortados | por classificar com a evidência |
| biblioteca | student @ 1366 px | ABRE (readingLibraryView, 55706 car., 1901ms) | 691 alvos < 44px; 4 textos < 11px; 230 elementos cortados | por classificar com a evidência |
| biblioteca | student @ 1440 px | ABRE (readingLibraryView, 55706 car., 1838ms) | 691 alvos < 44px; 4 textos < 11px; 230 elementos cortados | por classificar com a evidência |
| biblioteca | student @ 1920 px | ABRE (readingLibraryView, 55706 car., 1841ms) | 691 alvos < 44px; 4 textos < 11px; 230 elementos cortados | por classificar com a evidência |
| boletim | student @ 390 px | ABRE (studentView, 11158 car., 1825ms) | 6 textos < 11px; 11 elementos cortados | por classificar com a evidência |
| boletim | student @ 1280 px | ABRE (studentView, 11158 car., 1838ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| boletim | student @ 1366 px | ABRE (studentView, 11165 car., 1818ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| boletim | student @ 1440 px | ABRE (studentView, 11164 car., 1830ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| boletim | student @ 1920 px | ABRE (studentView, 11159 car., 1820ms) | 39 alvos < 44px; 6 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | student @ 390 px | ABRE (resultsLearningView, 445 car., 1827ms) | 1 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | student @ 1280 px | ABRE (resultsLearningView, 445 car., 1837ms) | 2 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | student @ 1366 px | ABRE (resultsLearningView, 445 car., 1828ms) | 2 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | student @ 1440 px | ABRE (resultsLearningView, 445 car., 1828ms) | 2 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | student @ 1920 px | ABRE (resultsLearningView, 445 car., 1835ms) | 2 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-student390.json`, `ah2-varredura-17-11-student1280.json`, `ah2-varredura-17-11-1366g1.json`, `ah2-varredura-17-11-1440g1.json`, `ah2-varredura-17-11-1920g1.json`

### pedagogical — Professor

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| professor-inicio | pedagogical @ 390 px | ABRE (teacherView, 470 car., 1919ms) | — | — |
| professor-inicio | pedagogical @ 1280 px | ABRE (teacherView, 626 car., 3051ms) | 3 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-inicio | pedagogical @ 1366 px | ABRE (teacherView, 626 car., 3033ms) | 3 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-inicio | pedagogical @ 1440 px | ABRE (teacherView, 626 car., 3038ms) | 3 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-inicio | pedagogical @ 1920 px | ABRE (teacherView, 468 car., 1825ms) | 3 alvos < 44px | por classificar com a evidência |
| professor-turmas | pedagogical @ 390 px | ABRE (teacherView, 890 car., 4261ms) | 2 textos < 11px | por classificar com a evidência |
| professor-turmas | pedagogical @ 1280 px | ABRE (teacherView, 890 car., 1833ms) | 8 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-turmas | pedagogical @ 1366 px | ABRE (teacherView, 890 car., 1820ms) | 8 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-turmas | pedagogical @ 1440 px | ABRE (teacherView, 787 car., 1833ms) | 8 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-turmas | pedagogical @ 1920 px | ABRE (teacherView, 888 car., 3025ms) | 8 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-atividades | pedagogical @ 390 px | ABRE (teacherView, 743 car., 1817ms) | 2 textos < 11px | por classificar com a evidência |
| professor-atividades | pedagogical @ 1280 px | ABRE (teacherView, 743 car., 1813ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-atividades | pedagogical @ 1366 px | ABRE (teacherView, 743 car., 1830ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-atividades | pedagogical @ 1440 px | ABRE (teacherView, 743 car., 1834ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-atividades | pedagogical @ 1920 px | ABRE (teacherView, 741 car., 1832ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-avaliacoes | pedagogical @ 390 px | ABRE (teacherView, 752 car., 1815ms) | 2 textos < 11px | por classificar com a evidência |
| professor-avaliacoes | pedagogical @ 1280 px | ABRE (teacherView, 752 car., 1822ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-avaliacoes | pedagogical @ 1366 px | ABRE (teacherView, 752 car., 1823ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-avaliacoes | pedagogical @ 1440 px | ABRE (teacherView, 752 car., 1825ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-avaliacoes | pedagogical @ 1920 px | ABRE (teacherView, 750 car., 1818ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-frequencia | pedagogical @ 390 px | ABRE (teacherView, 1159 car., 1827ms) | 2 textos < 11px | por classificar com a evidência |
| professor-frequencia | pedagogical @ 1280 px | ABRE (teacherView, 1159 car., 1827ms) | 7 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-frequencia | pedagogical @ 1366 px | ABRE (teacherView, 1159 car., 1809ms) | 7 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-frequencia | pedagogical @ 1440 px | ABRE (teacherView, 1169 car., 1819ms) | 7 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-frequencia | pedagogical @ 1920 px | ABRE (teacherView, 1157 car., 1824ms) | 7 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-agenda | pedagogical @ 390 px | ABRE (teacherView, 977 car., 1831ms) | 2 textos < 11px | por classificar com a evidência |
| professor-agenda | pedagogical @ 1280 px | ABRE (teacherView, 977 car., 1830ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-agenda | pedagogical @ 1366 px | ABRE (teacherView, 977 car., 1817ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-agenda | pedagogical @ 1440 px | ABRE (teacherView, 977 car., 1816ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-agenda | pedagogical @ 1920 px | ABRE (teacherView, 975 car., 1819ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-agenda-hoje | pedagogical @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| professor-agenda-hoje | pedagogical @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| professor-agenda-hoje | pedagogical @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| professor-agenda-hoje | pedagogical @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| professor-agenda-hoje | pedagogical @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| professor-biblioteca | pedagogical @ 390 px | ABRE (teacherView, 828 car., 1812ms) | 2 textos < 11px | por classificar com a evidência |
| professor-biblioteca | pedagogical @ 1280 px | ABRE (teacherView, 828 car., 1837ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-biblioteca | pedagogical @ 1366 px | ABRE (teacherView, 828 car., 1840ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-biblioteca | pedagogical @ 1440 px | ABRE (teacherView, 828 car., 1828ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-biblioteca | pedagogical @ 1920 px | ABRE (teacherView, 826 car., 1822ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-comunicacao | pedagogical @ 390 px | ABRE (teacherView, 775 car., 1832ms) | 2 textos < 11px | por classificar com a evidência |
| professor-comunicacao | pedagogical @ 1280 px | ABRE (teacherView, 775 car., 1821ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-comunicacao | pedagogical @ 1366 px | ABRE (teacherView, 775 car., 1830ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-comunicacao | pedagogical @ 1440 px | ABRE (teacherView, 775 car., 1817ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-comunicacao | pedagogical @ 1920 px | ABRE (teacherView, 773 car., 1820ms) | 6 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| chat-interno | pedagogical @ 390 px | ABRE (internalChatView, 279 car., 1818ms) | — | — |
| chat-interno | pedagogical @ 1280 px | ABRE (internalChatView, 738 car., 1849ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | pedagogical @ 1366 px | ABRE (internalChatView, 738 car., 1828ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | pedagogical @ 1440 px | ABRE (internalChatView, 738 car., 1825ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | pedagogical @ 1920 px | ABRE (internalChatView, 738 car., 1815ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| professor-espaco | pedagogical @ 390 px | ABRE (teacherView, 814 car., 1830ms) | 2 textos < 11px | por classificar com a evidência |
| professor-espaco | pedagogical @ 1280 px | ABRE (teacherView, 814 car., 2433ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-espaco | pedagogical @ 1366 px | ABRE (teacherView, 814 car., 1818ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-espaco | pedagogical @ 1440 px | ABRE (teacherView, 814 car., 1828ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-espaco | pedagogical @ 1920 px | ABRE (teacherView, 812 car., 1812ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-conteudos | pedagogical @ 390 px | ABRE (teacherView, 997 car., 1830ms) | 2 textos < 11px | por classificar com a evidência |
| professor-conteudos | pedagogical @ 1280 px | ABRE (teacherView, 997 car., 1815ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-conteudos | pedagogical @ 1366 px | ABRE (teacherView, 997 car., 1827ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-conteudos | pedagogical @ 1440 px | ABRE (teacherView, 997 car., 1833ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-conteudos | pedagogical @ 1920 px | ABRE (teacherView, 995 car., 1830ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-diario | pedagogical @ 390 px | ABRE (teacherView, 843 car., 1831ms) | 2 textos < 11px | por classificar com a evidência |
| professor-diario | pedagogical @ 1280 px | ABRE (teacherView, 843 car., 1808ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-diario | pedagogical @ 1366 px | ABRE (teacherView, 843 car., 1819ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-diario | pedagogical @ 1440 px | ABRE (teacherView, 843 car., 1819ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-diario | pedagogical @ 1920 px | ABRE (teacherView, 841 car., 1814ms) | 9 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-planejamento | pedagogical @ 390 px | ABRE (teacherView, 952 car., 1828ms) | 2 textos < 11px | por classificar com a evidência |
| professor-planejamento | pedagogical @ 1280 px | ABRE (teacherView, 952 car., 1813ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-planejamento | pedagogical @ 1366 px | ABRE (teacherView, 952 car., 1829ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-planejamento | pedagogical @ 1440 px | ABRE (teacherView, 952 car., 1816ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-planejamento | pedagogical @ 1920 px | ABRE (teacherView, 950 car., 1829ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-relatorios | pedagogical @ 390 px | ABRE (teacherView, 999 car., 1826ms) | 2 textos < 11px | por classificar com a evidência |
| professor-relatorios | pedagogical @ 1280 px | ABRE (teacherView, 999 car., 1816ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-relatorios | pedagogical @ 1366 px | ABRE (teacherView, 999 car., 1825ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-relatorios | pedagogical @ 1440 px | ABRE (teacherView, 999 car., 1819ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-relatorios | pedagogical @ 1920 px | ABRE (teacherView, 997 car., 1815ms) | 11 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-calendario | pedagogical @ 390 px | ABRE (teacherView, 750 car., 1817ms) | 2 textos < 11px | por classificar com a evidência |
| professor-calendario | pedagogical @ 1280 px | ABRE (teacherView, 750 car., 1830ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-calendario | pedagogical @ 1366 px | ABRE (teacherView, 750 car., 1823ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-calendario | pedagogical @ 1440 px | ABRE (teacherView, 750 car., 1835ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-calendario | pedagogical @ 1920 px | ABRE (teacherView, 748 car., 1822ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-notificacoes | pedagogical @ 390 px | ABRE (teacherView, 877 car., 1816ms) | 2 textos < 11px | por classificar com a evidência |
| professor-notificacoes | pedagogical @ 1280 px | ABRE (teacherView, 877 car., 1819ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-notificacoes | pedagogical @ 1366 px | ABRE (teacherView, 877 car., 1823ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-notificacoes | pedagogical @ 1440 px | ABRE (teacherView, 877 car., 1830ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| professor-notificacoes | pedagogical @ 1920 px | ABRE (teacherView, 875 car., 1829ms) | 5 alvos < 44px; 2 textos < 11px | por classificar com a evidência |
| escola-historia | pedagogical @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | pedagogical @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | pedagogical @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | pedagogical @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | pedagogical @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | pedagogical @ 390 px | ABRE (bfrNotificationsView, 400 car., 1821ms) | — | — |
| notificacoes | pedagogical @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1833ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | pedagogical @ 1366 px | ABRE (bfrNotificationsView, 400 car., 2430ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | pedagogical @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1814ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | pedagogical @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1838ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | pedagogical @ 390 px | ABRE (bfrContentHubView, 1021 car., 1833ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | pedagogical @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1827ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | pedagogical @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1825ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | pedagogical @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1818ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | pedagogical @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1817ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| jogos-escolares | pedagogical @ 390 px | ABRE (schoolGamesView, 865 car., 1829ms) | — | — |
| jogos-escolares | pedagogical @ 1280 px | ABRE (schoolGamesView, 865 car., 1823ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | pedagogical @ 1366 px | ABRE (schoolGamesView, 865 car., 1826ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | pedagogical @ 1440 px | ABRE (schoolGamesView, 865 car., 1830ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | pedagogical @ 1920 px | ABRE (schoolGamesView, 865 car., 1831ms) | 8 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | pedagogical @ 390 px | ABRE (resultsLearningView, 926 car., 1815ms) | 1 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | pedagogical @ 1280 px | ABRE (resultsLearningView, 926 car., 1816ms) | 7 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | pedagogical @ 1366 px | ABRE (resultsLearningView, 926 car., 1822ms) | 7 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | pedagogical @ 1440 px | ABRE (resultsLearningView, 926 car., 1834ms) | 7 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | pedagogical @ 1920 px | ABRE (resultsLearningView, 926 car., 1840ms) | 7 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-ped390.json`, `ah2-varredura-17-11-ped1280.json`, `ah2-varredura-17-11-1366g1.json`, `ah2-varredura-17-11-1440g1.json`, `ah2-varredura-17-11-1920g1.json`

### coordinator — Coordenação

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | coordinator @ 390 px | ABRE (coordinatorView, 3077 car., 3065ms) | 1 textos < 11px; 10 elementos cortados | por classificar com a evidência |
| inicio | coordinator @ 1280 px | ABRE (coordinatorView, 5261 car., 4978ms) | 26 alvos < 44px; 7 textos < 11px; 20 elementos cortados | por classificar com a evidência |
| inicio | coordinator @ 1366 px | ABRE (coordinatorView, 5267 car., 4983ms) | 27 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| inicio | coordinator @ 1440 px | ABRE (coordinatorView, 5261 car., 4982ms) | 27 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| inicio | coordinator @ 1920 px | ABRE (coordinatorView, 5269 car., 5572ms) | 29 alvos < 44px; 7 textos < 11px; 15 elementos cortados | por classificar com a evidência |
| coordenacao | coordinator @ 390 px | ABRE (coordinatorView, 56433 car., 1912ms) | 500 alvos < 44px; 1 textos < 11px; 10 elementos cortados | por classificar com a evidência |
| coordenacao | coordinator @ 1280 px | ABRE (coordinatorView, 58617 car., 2506ms) | 529 alvos < 44px; 7 textos < 11px; 20 elementos cortados | por classificar com a evidência |
| coordenacao | coordinator @ 1366 px | ABRE (coordinatorView, 58623 car., 1850ms) | 530 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| coordenacao | coordinator @ 1440 px | ABRE (coordinatorView, 58617 car., 1914ms) | 530 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| coordenacao | coordinator @ 1920 px | ABRE (coordinatorView, 58625 car., 2447ms) | 532 alvos < 44px; 7 textos < 11px; 15 elementos cortados | por classificar com a evidência |
| horarios | coordinator @ 390 px | ABRE (coordinatorView, 54162 car., 1874ms) | 500 alvos < 44px; 1 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| horarios | coordinator @ 1280 px | ABRE (coordinatorView, 56151 car., 1830ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| horarios | coordinator @ 1366 px | ABRE (coordinatorView, 56157 car., 1845ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| horarios | coordinator @ 1440 px | ABRE (coordinatorView, 56151 car., 1823ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| horarios | coordinator @ 1920 px | ABRE (coordinatorView, 56159 car., 1840ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| cadastro-alunos | coordinator @ 390 px | ABRE (coordinatorView, 86550 car., 1825ms) | 500 alvos < 44px; 849 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| cadastro-alunos | coordinator @ 1280 px | ABRE (coordinatorView, 88539 car., 1854ms) | 517 alvos < 44px; 855 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| cadastro-alunos | coordinator @ 1366 px | ABRE (coordinatorView, 88545 car., 1820ms) | 517 alvos < 44px; 855 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| cadastro-alunos | coordinator @ 1440 px | ABRE (coordinatorView, 88539 car., 1840ms) | 517 alvos < 44px; 855 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| cadastro-alunos | coordinator @ 1920 px | ABRE (coordinatorView, 88547 car., 1857ms) | 517 alvos < 44px; 855 textos < 11px; 9 elementos cortados | por classificar com a evidência |
| comunicados | coordinator @ 390 px | ABRE (coordinatorView, 54162 car., 1848ms) | 500 alvos < 44px; 1 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| comunicados | coordinator @ 1280 px | ABRE (coordinatorView, 56151 car., 1829ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| comunicados | coordinator @ 1366 px | ABRE (coordinatorView, 56157 car., 1828ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| comunicados | coordinator @ 1440 px | ABRE (coordinatorView, 56151 car., 1846ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| comunicados | coordinator @ 1920 px | ABRE (coordinatorView, 56159 car., 1846ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| ocorrencias | coordinator @ 390 px | ABRE (coordinatorView, 54162 car., 1869ms) | 500 alvos < 44px; 1 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| ocorrencias | coordinator @ 1280 px | ABRE (coordinatorView, 56151 car., 1846ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| ocorrencias | coordinator @ 1366 px | ABRE (coordinatorView, 56157 car., 1850ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| ocorrencias | coordinator @ 1440 px | ABRE (coordinatorView, 56151 car., 1846ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| ocorrencias | coordinator @ 1920 px | ABRE (coordinatorView, 56159 car., 1828ms) | 515 alvos < 44px; 7 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| atividades | coordinator @ 390 px | ABRE (activityCenterView, 1011 car., 1820ms) | — | — |
| atividades | coordinator @ 1280 px | ABRE (activityCenterView, 1011 car., 1840ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | coordinator @ 1366 px | ABRE (activityCenterView, 1011 car., 1845ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | coordinator @ 1440 px | ABRE (activityCenterView, 1011 car., 1827ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | coordinator @ 1920 px | ABRE (activityCenterView, 1011 car., 1844ms) | 15 alvos < 44px | por classificar com a evidência |
| escola-historia | coordinator @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | coordinator @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | coordinator @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | coordinator @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | coordinator @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | coordinator @ 390 px | ABRE (bfrNotificationsView, 400 car., 1854ms) | — | — |
| notificacoes | coordinator @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1831ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | coordinator @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1829ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | coordinator @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1832ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | coordinator @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1820ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | coordinator @ 390 px | ABRE (bfrContentHubView, 1021 car., 1822ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | coordinator @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1817ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | coordinator @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1824ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | coordinator @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1823ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | coordinator @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1830ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| relatorios | coordinator @ 390 px | ABRE (bfrReportsView, 852 car., 3051ms) | 1 textos < 11px | por classificar com a evidência |
| relatorios | coordinator @ 1280 px | ABRE (bfrReportsView, 852 car., 3047ms) | 4 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| relatorios | coordinator @ 1366 px | ABRE (bfrReportsView, 852 car., 3051ms) | 4 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| relatorios | coordinator @ 1440 px | ABRE (bfrReportsView, 852 car., 2440ms) | 4 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| relatorios | coordinator @ 1920 px | ABRE (bfrReportsView, 852 car., 3053ms) | 4 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| comunicacao | coordinator @ 390 px | ABRE (bfrCommunicationView, 1716 car., 1841ms) | 46 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | coordinator @ 1280 px | ABRE (bfrCommunicationView, 1716 car., 1819ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | coordinator @ 1366 px | ABRE (bfrCommunicationView, 1716 car., 1814ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | coordinator @ 1440 px | ABRE (bfrCommunicationView, 1716 car., 1844ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | coordinator @ 1920 px | ABRE (bfrCommunicationView, 1716 car., 1822ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| fotos | coordinator @ 390 px | ABRE (bfrCommunicationView, 1716 car., 1837ms) | 46 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| fotos | coordinator @ 1280 px | ABRE (bfrCommunicationView, 1716 car., 1829ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| fotos | coordinator @ 1366 px | ABRE (bfrCommunicationView, 1716 car., 1834ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| fotos | coordinator @ 1440 px | ABRE (bfrCommunicationView, 1716 car., 1833ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| fotos | coordinator @ 1920 px | ABRE (bfrCommunicationView, 1716 car., 1829ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| chat-interno | coordinator @ 390 px | ABRE (internalChatView, 256 car., 1860ms) | — | — |
| chat-interno | coordinator @ 1280 px | ABRE (internalChatView, 465 car., 1834ms) | 10 alvos < 44px | por classificar com a evidência |
| chat-interno | coordinator @ 1366 px | ABRE (internalChatView, 465 car., 1828ms) | 10 alvos < 44px | por classificar com a evidência |
| chat-interno | coordinator @ 1440 px | ABRE (internalChatView, 465 car., 1864ms) | 10 alvos < 44px | por classificar com a evidência |
| chat-interno | coordinator @ 1920 px | ABRE (internalChatView, 465 car., 1865ms) | 10 alvos < 44px | por classificar com a evidência |
| coordenacao-chat | coordinator @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | coordinator @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | coordinator @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | coordinator @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | coordinator @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| jogos-escolares | coordinator @ 390 px | ABRE (schoolGamesView, 220 car., 1848ms) | — | — |
| jogos-escolares | coordinator @ 1280 px | ABRE (schoolGamesView, 220 car., 1824ms) | 2 alvos < 44px | por classificar com a evidência |
| jogos-escolares | coordinator @ 1366 px | ABRE (schoolGamesView, 220 car., 1845ms) | 2 alvos < 44px | por classificar com a evidência |
| jogos-escolares | coordinator @ 1440 px | ABRE (schoolGamesView, 220 car., 1825ms) | 2 alvos < 44px | por classificar com a evidência |
| jogos-escolares | coordinator @ 1920 px | ABRE (schoolGamesView, 220 car., 1825ms) | 2 alvos < 44px | por classificar com a evidência |
| aee | coordinator @ 390 px | ABRE (aeeView, 6155 car., 1844ms) | 4 elementos cortados | por classificar com a evidência |
| aee | coordinator @ 1280 px | ABRE (aeeView, 6155 car., 1832ms) | 71 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | coordinator @ 1366 px | ABRE (aeeView, 6161 car., 1841ms) | 71 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | coordinator @ 1440 px | ABRE (aeeView, 6155 car., 1820ms) | 71 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | coordinator @ 1920 px | ABRE (aeeView, 6163 car., 1823ms) | 71 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | coordinator @ 390 px | ABRE (resultsLearningView, 588 car., 1844ms) | 1 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | coordinator @ 1280 px | ABRE (resultsLearningView, 588 car., 1818ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | coordinator @ 1366 px | ABRE (resultsLearningView, 588 car., 1830ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | coordinator @ 1440 px | ABRE (resultsLearningView, 588 car., 1845ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | coordinator @ 1920 px | ABRE (resultsLearningView, 588 car., 1821ms) | 17 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-coord.json`, `ah2-varredura-17-11-coord1280.json`, `ah2-varredura-17-11-1366g2.json`, `ah2-varredura-17-11-1440g2.json`, `ah2-varredura-17-11-1920g2.json`

### secretary — Secretaria

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | secretary @ 390 px | ABRE (secretaryView, 3265 car., 2454ms) | 3 elementos cortados | por classificar com a evidência |
| inicio | secretary @ 1280 px | ABRE (secretaryView, 3265 car., 2457ms) | 25 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| inicio | secretary @ 1366 px | ABRE (secretaryView, 3271 car., 1840ms) | 26 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| inicio | secretary @ 1440 px | ABRE (secretaryView, 3265 car., 2440ms) | 26 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| inicio | secretary @ 1920 px | ABRE (secretaryView, 3273 car., 2442ms) | 27 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| secretaria | secretary @ 390 px | ABRE (secretaryView, 56621 car., 1837ms) | 500 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| secretaria | secretary @ 1280 px | ABRE (secretaryView, 56621 car., 1824ms) | 528 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| secretaria | secretary @ 1366 px | ABRE (secretaryView, 56627 car., 1823ms) | 529 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| secretaria | secretary @ 1440 px | ABRE (secretaryView, 56621 car., 1830ms) | 529 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| secretaria | secretary @ 1920 px | ABRE (secretaryView, 56629 car., 1825ms) | 530 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | secretary @ 390 px | ABRE (secretaryView, 56621 car., 1814ms) | 500 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| comunicados | secretary @ 1280 px | ABRE (secretaryView, 56621 car., 1830ms) | 528 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| comunicados | secretary @ 1366 px | ABRE (secretaryView, 56627 car., 1821ms) | 529 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| comunicados | secretary @ 1440 px | ABRE (secretaryView, 56621 car., 1820ms) | 529 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| comunicados | secretary @ 1920 px | ABRE (secretaryView, 56629 car., 1826ms) | 530 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| escola-historia | secretary @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | secretary @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | secretary @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | secretary @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | secretary @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | secretary @ 390 px | ABRE (bfrNotificationsView, 400 car., 1852ms) | — | — |
| notificacoes | secretary @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1847ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | secretary @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1815ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | secretary @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1825ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | secretary @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1825ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | secretary @ 390 px | ABRE (bfrContentHubView, 1021 car., 1840ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | secretary @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1821ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | secretary @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1812ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | secretary @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1820ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | secretary @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1825ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| comunicacao | secretary @ 390 px | ABRE (bfrCommunicationView, 1710 car., 1818ms) | 46 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | secretary @ 1280 px | ABRE (bfrCommunicationView, 1710 car., 1836ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | secretary @ 1366 px | ABRE (bfrCommunicationView, 1710 car., 1829ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | secretary @ 1440 px | ABRE (bfrCommunicationView, 1710 car., 1827ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | secretary @ 1920 px | ABRE (bfrCommunicationView, 1710 car., 1823ms) | 57 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| chat-interno | secretary @ 390 px | ABRE (internalChatView, 279 car., 1853ms) | — | — |
| chat-interno | secretary @ 1280 px | ABRE (internalChatView, 738 car., 1838ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | secretary @ 1366 px | ABRE (internalChatView, 738 car., 1816ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | secretary @ 1440 px | ABRE (internalChatView, 738 car., 2424ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | secretary @ 1920 px | ABRE (internalChatView, 738 car., 1831ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| coordenacao-chat | secretary @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | secretary @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | secretary @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | secretary @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | secretary @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| jogos-escolares | secretary @ 390 px | ABRE (schoolGamesView, 865 car., 1827ms) | — | — |
| jogos-escolares | secretary @ 1280 px | ABRE (schoolGamesView, 865 car., 1848ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | secretary @ 1366 px | ABRE (schoolGamesView, 865 car., 1824ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | secretary @ 1440 px | ABRE (schoolGamesView, 865 car., 1823ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | secretary @ 1920 px | ABRE (schoolGamesView, 865 car., 1820ms) | 8 alvos < 44px | por classificar com a evidência |
| fotos | secretary @ 390 px | ABRE (secretaryView, 56621 car., 1847ms) | 500 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| fotos | secretary @ 1280 px | ABRE (secretaryView, 56621 car., 1847ms) | 528 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| fotos | secretary @ 1366 px | ABRE (secretaryView, 56627 car., 1829ms) | 529 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| fotos | secretary @ 1440 px | ABRE (secretaryView, 56621 car., 1824ms) | 529 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| fotos | secretary @ 1920 px | ABRE (secretaryView, 56629 car., 1831ms) | 530 alvos < 44px; 4 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-secr390.json`, `ah2-varredura-17-11-secr1280b.json`, `ah2-varredura-17-11-1366g2.json`, `ah2-varredura-17-11-1440g2.json`, `ah2-varredura-17-11-1920g2b.json`

### aee — AEE

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | aee @ 390 px | ABRE (aeeView, 6459 car., 3637ms) | 5 elementos cortados | por classificar com a evidência |
| inicio | aee @ 1280 px | ABRE (aeeView, 6459 car., 3648ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | aee @ 1366 px | ABRE (aeeView, 6465 car., 3671ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | aee @ 1440 px | ABRE (aeeView, 6459 car., 3672ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | aee @ 1920 px | ABRE (aeeView, 6467 car., 3647ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | aee @ 390 px | ABRE (aeeView, 6459 car., 1839ms) | 5 elementos cortados | por classificar com a evidência |
| aee | aee @ 1280 px | ABRE (aeeView, 6459 car., 1813ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | aee @ 1366 px | ABRE (aeeView, 6465 car., 1820ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | aee @ 1440 px | ABRE (aeeView, 6459 car., 1822ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| aee | aee @ 1920 px | ABRE (aeeView, 6467 car., 1819ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| atividades | aee @ 390 px | ABRE (activityCenterView, 1011 car., 1816ms) | — | — |
| atividades | aee @ 1280 px | ABRE (activityCenterView, 1011 car., 1819ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | aee @ 1366 px | ABRE (activityCenterView, 1011 car., 1834ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | aee @ 1440 px | ABRE (activityCenterView, 1011 car., 1829ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | aee @ 1920 px | ABRE (activityCenterView, 1011 car., 1822ms) | 15 alvos < 44px | por classificar com a evidência |
| horarios | aee @ 390 px | ABRE (aeeView, 6459 car., 2427ms) | 5 elementos cortados | por classificar com a evidência |
| horarios | aee @ 1280 px | ABRE (aeeView, 6459 car., 2420ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| horarios | aee @ 1366 px | ABRE (aeeView, 6465 car., 2416ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| horarios | aee @ 1440 px | ABRE (aeeView, 6459 car., 2425ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| horarios | aee @ 1920 px | ABRE (aeeView, 6467 car., 2437ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | aee @ 390 px | ABRE (aeeView, 6459 car., 1841ms) | 5 elementos cortados | por classificar com a evidência |
| comunicados | aee @ 1280 px | ABRE (aeeView, 6459 car., 1806ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | aee @ 1366 px | ABRE (aeeView, 6465 car., 1835ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | aee @ 1440 px | ABRE (aeeView, 6459 car., 1812ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | aee @ 1920 px | ABRE (aeeView, 6467 car., 1810ms) | 74 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| escola-historia | aee @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | aee @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | aee @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | aee @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | aee @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | aee @ 390 px | ABRE (bfrNotificationsView, 400 car., 1836ms) | — | — |
| notificacoes | aee @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1811ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | aee @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1824ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | aee @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1839ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | aee @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1826ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | aee @ 390 px | ABRE (bfrContentHubView, 1021 car., 1823ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | aee @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1816ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | aee @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1822ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | aee @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1826ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | aee @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1827ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| chat-interno | aee @ 390 px | ABRE (internalChatView, 279 car., 1820ms) | — | — |
| chat-interno | aee @ 1280 px | ABRE (internalChatView, 738 car., 1821ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | aee @ 1366 px | ABRE (internalChatView, 738 car., 1818ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | aee @ 1440 px | ABRE (internalChatView, 738 car., 1827ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | aee @ 1920 px | ABRE (internalChatView, 738 car., 1820ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| jogos-escolares | aee @ 390 px | ABRE (schoolGamesView, 865 car., 1827ms) | — | — |
| jogos-escolares | aee @ 1280 px | ABRE (schoolGamesView, 865 car., 1826ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | aee @ 1366 px | ABRE (schoolGamesView, 865 car., 1823ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | aee @ 1440 px | ABRE (schoolGamesView, 865 car., 1814ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | aee @ 1920 px | ABRE (schoolGamesView, 865 car., 1823ms) | 8 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-aee390b.json`, `ah2-varredura-17-11-aee1280.json`, `ah2-varredura-17-11-1366g2b.json`, `ah2-varredura-17-11-1440g3.json`, `ah2-varredura-17-11-1920g3.json`

### director — Direção

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | director @ 390 px | ABRE (directorView, 340 car., 1818ms) | — | — |
| inicio | director @ 1280 px | ABRE (directorView, 340 car., 2476ms) | 23 alvos < 44px | por classificar com a evidência |
| inicio | director @ 1366 px | ABRE (directorView, 340 car., 2463ms) | 23 alvos < 44px | por classificar com a evidência |
| inicio | director @ 1440 px | ABRE (directorView, 340 car., 2448ms) | 23 alvos < 44px | por classificar com a evidência |
| inicio | director @ 1920 px | ABRE (directorView, 340 car., 2436ms) | 23 alvos < 44px | por classificar com a evidência |
| direcao | director @ 390 px | ABRE (directorView, 340 car., 1818ms) | — | — |
| direcao | director @ 1280 px | ABRE (directorView, 6072 car., 3692ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| direcao | director @ 1366 px | ABRE (directorView, 340 car., 1814ms) | 23 alvos < 44px | por classificar com a evidência |
| direcao | director @ 1440 px | ABRE (directorView, 6072 car., 4273ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| direcao | director @ 1920 px | ABRE (directorView, 6072 car., 4280ms) | 37 alvos < 44px; 12 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| horarios | director @ 390 px | ABRE (directorView, 986 car., 1817ms) | — | — |
| horarios | director @ 1280 px | ABRE (directorView, 6718 car., 1853ms) | 40 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| horarios | director @ 1366 px | ABRE (directorView, 6717 car., 3046ms) | 40 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| horarios | director @ 1440 px | ABRE (directorView, 6718 car., 1821ms) | 40 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| horarios | director @ 1920 px | ABRE (directorView, 6718 car., 1819ms) | 40 alvos < 44px; 12 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| comunicados | director @ 390 px | ABRE (directorView, 6072 car., 2457ms) | 12 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| comunicados | director @ 1280 px | ABRE (directorView, 6072 car., 1835ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| comunicados | director @ 1366 px | ABRE (directorView, 6072 car., 1834ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| comunicados | director @ 1440 px | ABRE (directorView, 6072 car., 1818ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| comunicados | director @ 1920 px | ABRE (directorView, 6072 car., 1828ms) | 37 alvos < 44px; 12 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| coordenacao | director @ 390 px | ABRE (directorView, 6072 car., 1845ms) | 12 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| coordenacao | director @ 1280 px | ABRE (directorView, 6072 car., 1831ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| coordenacao | director @ 1366 px | ABRE (directorView, 6072 car., 1820ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| coordenacao | director @ 1440 px | ABRE (directorView, 6072 car., 1837ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| coordenacao | director @ 1920 px | ABRE (directorView, 6072 car., 1829ms) | 37 alvos < 44px; 12 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| escola-historia | director @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | director @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | director @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | director @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | director @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | director @ 390 px | ABRE (bfrNotificationsView, 400 car., 1814ms) | — | — |
| notificacoes | director @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1830ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | director @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1829ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | director @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1831ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | director @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1824ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | director @ 390 px | ABRE (bfrContentHubView, 1021 car., 1838ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | director @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1830ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | director @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1822ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | director @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1818ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | director @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1824ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| comunicacao | director @ 390 px | ABRE (bfrCommunicationView, 1811 car., 1822ms) | 48 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | director @ 1280 px | ABRE (bfrCommunicationView, 1811 car., 1825ms) | 59 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | director @ 1366 px | ABRE (bfrCommunicationView, 1811 car., 1828ms) | 59 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | director @ 1440 px | ABRE (bfrCommunicationView, 1811 car., 1830ms) | 59 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| comunicacao | director @ 1920 px | ABRE (bfrCommunicationView, 1811 car., 1820ms) | 59 alvos < 44px; 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| chat-interno | director @ 390 px | ABRE (internalChatView, 279 car., 1823ms) | — | — |
| chat-interno | director @ 1280 px | ABRE (internalChatView, 738 car., 1819ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | director @ 1366 px | ABRE (internalChatView, 738 car., 1841ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | director @ 1440 px | ABRE (internalChatView, 738 car., 1832ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | director @ 1920 px | ABRE (internalChatView, 738 car., 1832ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| coordenacao-chat | director @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | director @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | director @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | director @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | director @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| jogos-escolares | director @ 390 px | ABRE (schoolGamesView, 1093 car., 1821ms) | — | — |
| jogos-escolares | director @ 1280 px | ABRE (schoolGamesView, 1093 car., 1818ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | director @ 1366 px | ABRE (schoolGamesView, 1093 car., 1830ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | director @ 1440 px | ABRE (schoolGamesView, 1093 car., 1819ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | director @ 1920 px | ABRE (schoolGamesView, 1093 car., 1837ms) | 13 alvos < 44px | por classificar com a evidência |
| fotos | director @ 390 px | ABRE (directorView, 6072 car., 1849ms) | 12 textos < 11px; 8 elementos cortados | por classificar com a evidência |
| fotos | director @ 1280 px | ABRE (directorView, 6072 car., 1826ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| fotos | director @ 1366 px | ABRE (directorView, 6072 car., 1831ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| fotos | director @ 1440 px | ABRE (directorView, 6072 car., 1823ms) | 37 alvos < 44px; 12 textos < 11px | por classificar com a evidência |
| fotos | director @ 1920 px | ABRE (directorView, 6072 car., 1834ms) | 37 alvos < 44px; 12 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| aee | director @ 390 px | ABRE (aeeView, 8736 car., 3044ms) | 5 elementos cortados | por classificar com a evidência |
| aee | director @ 1280 px | ABRE (aeeView, 8736 car., 3046ms) | 69 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| aee | director @ 1366 px | ABRE (aeeView, 8742 car., 3060ms) | 69 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| aee | director @ 1440 px | ABRE (aeeView, 8736 car., 3050ms) | 69 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| aee | director @ 1920 px | ABRE (aeeView, 8744 car., 3031ms) | 69 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | director @ 390 px | ABRE (resultsLearningView, 1786 car., 1838ms) | 1 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | director @ 1280 px | ABRE (resultsLearningView, 1786 car., 1826ms) | 17 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | director @ 1366 px | ABRE (resultsLearningView, 1786 car., 1829ms) | 18 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | director @ 1440 px | ABRE (resultsLearningView, 1786 car., 1823ms) | 18 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | director @ 1920 px | ABRE (resultsLearningView, 1786 car., 1824ms) | 18 alvos < 44px; 6 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-director390.json`, `ah2-varredura-17-11-director1280.json`, `ah2-varredura-17-11-1366g3.json`, `ah2-varredura-17-11-1440g3.json`, `ah2-varredura-17-11-1920g3.json`

### psychology — Psicologia

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | psychology @ 390 px | ABRE (psychologyView, 917 car., 1824ms) | 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| inicio | psychology @ 1280 px | ABRE (psychologyView, 917 car., 2435ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| inicio | psychology @ 1366 px | ABRE (psychologyView, 921 car., 2430ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| inicio | psychology @ 1440 px | ABRE (psychologyView, 895 car., 1814ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| inicio | psychology @ 1920 px | ABRE (psychologyView, 903 car., 2431ms) | 18 alvos < 44px; 1 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| psychology | psychology @ 390 px | ABRE (psychologyView, 917 car., 1812ms) | 1 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| psychology | psychology @ 1280 px | ABRE (psychologyView, 917 car., 1841ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| psychology | psychology @ 1366 px | ABRE (psychologyView, 921 car., 1811ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| psychology | psychology @ 1440 px | ABRE (psychologyView, 895 car., 1825ms) | 18 alvos < 44px; 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| psychology | psychology @ 1920 px | ABRE (psychologyView, 903 car., 1820ms) | 18 alvos < 44px; 1 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | psychology @ 390 px | ABRE (internalChatView, 379 car., 1830ms) | 2 elementos cortados | por classificar com a evidência |
| chat-interno | psychology @ 1280 px | ABRE (internalChatView, 838 car., 1827ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | psychology @ 1366 px | ABRE (internalChatView, 844 car., 1830ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | psychology @ 1440 px | ABRE (internalChatView, 838 car., 1828ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | psychology @ 1920 px | ABRE (internalChatView, 846 car., 1823ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-psych390.json`, `ah2-varredura-17-11-psych1280.json`, `ah2-varredura-17-11-1366g3.json`, `ah2-varredura-17-11-1440g3.json`, `ah2-varredura-17-11-1920g3.json`

### social_work — Serviço social

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | social_work @ 390 px | ABRE (multiprofessionalView, 937 car., 2450ms) | 3 elementos cortados | por classificar com a evidência |
| inicio | social_work @ 1280 px | ABRE (multiprofessionalView, 915 car., 2470ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | social_work @ 1366 px | ABRE (multiprofessionalView, 921 car., 1834ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | social_work @ 1440 px | ABRE (multiprofessionalView, 915 car., 1822ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| inicio | social_work @ 1920 px | ABRE (multiprofessionalView, 923 car., 1820ms) | 15 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| multiprofissional | social_work @ 390 px | ABRE (multiprofessionalView, 937 car., 1816ms) | 3 elementos cortados | por classificar com a evidência |
| multiprofissional | social_work @ 1280 px | ABRE (multiprofessionalView, 915 car., 1853ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | social_work @ 1366 px | ABRE (multiprofessionalView, 921 car., 1809ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | social_work @ 1440 px | ABRE (multiprofessionalView, 915 car., 1827ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | social_work @ 1920 px | ABRE (multiprofessionalView, 923 car., 1820ms) | 15 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | social_work @ 390 px | ABRE (internalChatView, 379 car., 1817ms) | 2 elementos cortados | por classificar com a evidência |
| chat-interno | social_work @ 1280 px | ABRE (internalChatView, 838 car., 1820ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | social_work @ 1366 px | ABRE (internalChatView, 844 car., 1831ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | social_work @ 1440 px | ABRE (internalChatView, 838 car., 1827ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| chat-interno | social_work @ 1920 px | ABRE (internalChatView, 846 car., 1812ms) | 11 alvos < 44px; 7 textos < 11px; 3 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-social390.json`, `ah2-varredura-17-11-social1280.json`, `ah2-varredura-17-11-1366g3.json`, `ah2-varredura-17-11-1440g3.json`, `ah2-varredura-17-11-1920g3.json`

### sports_operator — Operador desportivo

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | sports_operator @ 390 px | ABRE (schoolGamesView, 1215 car., 2427ms) | 2 elementos cortados; o app declara seção «jogos-escolares» | por classificar com a evidência |
| inicio | sports_operator @ 1280 px | ABRE (schoolGamesView, 1215 car., 1851ms) | 13 alvos < 44px; 3 elementos cortados; o app declara seção «jogos-escolares» | por classificar com a evidência |
| inicio | sports_operator @ 1366 px | ABRE (schoolGamesView, 1219 car., 1827ms) | 13 alvos < 44px; 3 elementos cortados; o app declara seção «jogos-escolares» | por classificar com a evidência |
| inicio | sports_operator @ 1440 px | ABRE (schoolGamesView, 1207 car., 2452ms) | 13 alvos < 44px; 3 elementos cortados; o app declara seção «jogos-escolares» | por classificar com a evidência |
| inicio | sports_operator @ 1920 px | ABRE (schoolGamesView, 1208 car., 2461ms) | 13 alvos < 44px; 3 elementos cortados; o app declara seção «jogos-escolares» | por classificar com a evidência |
| notificacoes | sports_operator @ 390 px | ABRE (bfrNotificationsView, 443 car., 1817ms) | 2 elementos cortados | por classificar com a evidência |
| notificacoes | sports_operator @ 1280 px | ABRE (bfrNotificationsView, 443 car., 1826ms) | 2 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| notificacoes | sports_operator @ 1366 px | ABRE (bfrNotificationsView, 449 car., 1829ms) | 2 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| notificacoes | sports_operator @ 1440 px | ABRE (bfrNotificationsView, 443 car., 1815ms) | 2 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| notificacoes | sports_operator @ 1920 px | ABRE (bfrNotificationsView, 451 car., 1815ms) | 2 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| conteudos | sports_operator @ 390 px | ABRE (bfrContentHubView, 1121 car., 1832ms) | 3 textos < 11px; 2 elementos cortados | por classificar com a evidência |
| conteudos | sports_operator @ 1280 px | ABRE (bfrContentHubView, 1121 car., 1824ms) | 14 alvos < 44px; 3 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| conteudos | sports_operator @ 1366 px | ABRE (bfrContentHubView, 1127 car., 1817ms) | 14 alvos < 44px; 3 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| conteudos | sports_operator @ 1440 px | ABRE (bfrContentHubView, 1121 car., 1826ms) | 14 alvos < 44px; 3 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| conteudos | sports_operator @ 1920 px | ABRE (bfrContentHubView, 1129 car., 1829ms) | 14 alvos < 44px; 3 textos < 11px; 3 elementos cortados | por classificar com a evidência |
| jogos-escolares | sports_operator @ 390 px | ABRE (schoolGamesView, 1215 car., 1822ms) | 2 elementos cortados | por classificar com a evidência |
| jogos-escolares | sports_operator @ 1280 px | ABRE (schoolGamesView, 1215 car., 1831ms) | 13 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| jogos-escolares | sports_operator @ 1366 px | ABRE (schoolGamesView, 1219 car., 1825ms) | 13 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| jogos-escolares | sports_operator @ 1440 px | ABRE (schoolGamesView, 1207 car., 1822ms) | 13 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| jogos-escolares | sports_operator @ 1920 px | ABRE (schoolGamesView, 1208 car., 1832ms) | 13 alvos < 44px; 3 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-sports390.json`, `ah2-varredura-17-11-sports1280.json`, `ah2-varredura-17-11-1366g3.json`, `ah2-varredura-17-11-1440g4.json`, `ah2-varredura-17-11-1920g4.json`

### education_supervisor — Supervisão de ensino

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | education_supervisor @ 390 px | ABRE (secretaryView, 3130 car., 2496ms) | 3 elementos cortados | por classificar com a evidência |
| inicio | education_supervisor @ 1280 px | ABRE (secretaryView, 3130 car., 2434ms) | 25 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| inicio | education_supervisor @ 1366 px | ABRE (secretaryView, 3136 car., 2425ms) | 26 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| inicio | education_supervisor @ 1440 px | ABRE (secretaryView, 3130 car., 3043ms) | 26 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| inicio | education_supervisor @ 1920 px | ABRE (secretaryView, 3138 car., 2460ms) | 27 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| secretaria | education_supervisor @ 390 px | ABRE (secretaryView, 3130 car., 1832ms) | 3 elementos cortados | por classificar com a evidência |
| secretaria | education_supervisor @ 1280 px | ABRE (secretaryView, 3130 car., 1841ms) | 25 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| secretaria | education_supervisor @ 1366 px | ABRE (secretaryView, 3136 car., 1827ms) | 26 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| secretaria | education_supervisor @ 1440 px | ABRE (secretaryView, 3130 car., 1824ms) | 26 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| secretaria | education_supervisor @ 1920 px | ABRE (secretaryView, 3138 car., 1826ms) | 27 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| comunicados | education_supervisor @ 390 px | ABRE (secretaryView, 3130 car., 1817ms) | 3 elementos cortados | por classificar com a evidência |
| comunicados | education_supervisor @ 1280 px | ABRE (secretaryView, 3130 car., 1822ms) | 25 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| comunicados | education_supervisor @ 1366 px | ABRE (secretaryView, 3136 car., 1809ms) | 26 alvos < 44px; 6 elementos cortados | por classificar com a evidência |
| comunicados | education_supervisor @ 1440 px | ABRE (secretaryView, 3130 car., 1820ms) | 26 alvos < 44px; 5 elementos cortados | por classificar com a evidência |
| comunicados | education_supervisor @ 1920 px | ABRE (secretaryView, 3138 car., 1827ms) | 27 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| escola-historia | education_supervisor @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | education_supervisor @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | education_supervisor @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | education_supervisor @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | education_supervisor @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | education_supervisor @ 390 px | ABRE (bfrNotificationsView, 343 car., 1810ms) | — | — |
| notificacoes | education_supervisor @ 1280 px | ABRE (bfrNotificationsView, 343 car., 1823ms) | 2 alvos < 44px | por classificar com a evidência |
| notificacoes | education_supervisor @ 1366 px | ABRE (bfrNotificationsView, 343 car., 1811ms) | 2 alvos < 44px | por classificar com a evidência |
| notificacoes | education_supervisor @ 1440 px | ABRE (bfrNotificationsView, 343 car., 1820ms) | 2 alvos < 44px | por classificar com a evidência |
| notificacoes | education_supervisor @ 1920 px | ABRE (bfrNotificationsView, 343 car., 1811ms) | 2 alvos < 44px | por classificar com a evidência |
| conteudos | education_supervisor @ 390 px | ABRE (bfrContentHubView, 1021 car., 1814ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | education_supervisor @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1831ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | education_supervisor @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1830ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | education_supervisor @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1824ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | education_supervisor @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1807ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| comunicacao | education_supervisor @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicacao | education_supervisor @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicacao | education_supervisor @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicacao | education_supervisor @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicacao | education_supervisor @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| chat-interno | education_supervisor @ 390 px | PAINEL VAZIO | abriu sem caracteres | por classificar |
| chat-interno | education_supervisor @ 1280 px | PAINEL VAZIO | abriu sem caracteres | por classificar |
| chat-interno | education_supervisor @ 1366 px | PAINEL VAZIO | abriu sem caracteres | por classificar |
| chat-interno | education_supervisor @ 1440 px | PAINEL VAZIO | abriu sem caracteres | por classificar |
| chat-interno | education_supervisor @ 1920 px | PAINEL VAZIO | abriu sem caracteres | por classificar |
| coordenacao-chat | education_supervisor @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | education_supervisor @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | education_supervisor @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | education_supervisor @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | education_supervisor @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| jogos-escolares | education_supervisor @ 390 px | ABRE (schoolGamesView, 865 car., 1821ms) | — | — |
| jogos-escolares | education_supervisor @ 1280 px | ABRE (schoolGamesView, 865 car., 1830ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | education_supervisor @ 1366 px | ABRE (schoolGamesView, 865 car., 1840ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | education_supervisor @ 1440 px | ABRE (schoolGamesView, 865 car., 1818ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | education_supervisor @ 1920 px | ABRE (schoolGamesView, 865 car., 1836ms) | 8 alvos < 44px | por classificar com a evidência |
| fotos | education_supervisor @ 390 px | ABRE (schoolGamesView, 865 car., 1819ms) | o app declara seção «jogos-escolares» | por classificar com a evidência |
| fotos | education_supervisor @ 1280 px | ABRE (schoolGamesView, 865 car., 1839ms) | 8 alvos < 44px; o app declara seção «jogos-escolares» | por classificar com a evidência |
| fotos | education_supervisor @ 1366 px | ABRE (schoolGamesView, 865 car., 1818ms) | 8 alvos < 44px; o app declara seção «jogos-escolares» | por classificar com a evidência |
| fotos | education_supervisor @ 1440 px | ABRE (schoolGamesView, 865 car., 1818ms) | 8 alvos < 44px; o app declara seção «jogos-escolares» | por classificar com a evidência |
| fotos | education_supervisor @ 1920 px | ABRE (schoolGamesView, 865 car., 1819ms) | 8 alvos < 44px; o app declara seção «jogos-escolares» | por classificar com a evidência |
| supervisao | education_supervisor @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| supervisao | education_supervisor @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| supervisao | education_supervisor @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| supervisao | education_supervisor @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| supervisao | education_supervisor @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-edsup390.json`, `ah2-varredura-17-11-edsup1280.json`, `ah2-varredura-17-11-1366g3.json`, `ah2-varredura-17-11-1440g4.json`, `ah2-varredura-17-11-1920g4.json`

### monitor — Monitor

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | monitor @ 390 px | ABRE (monitorView, 7763 car., 4227ms) | 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| inicio | monitor @ 1280 px | ABRE (monitorView, 2934 car., 2931ms) | 39 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| inicio | monitor @ 1366 px | ABRE (monitorView, 7769 car., 3515ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| inicio | monitor @ 1440 px | ABRE (monitorView, 7763 car., 3392ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| inicio | monitor @ 1920 px | ABRE (monitorView, 7771 car., 3511ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| monitor | monitor @ 390 px | ABRE (monitorView, 7763 car., 2275ms) | 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| monitor | monitor @ 1280 px | ABRE (monitorView, 7762 car., 2548ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| monitor | monitor @ 1366 px | ABRE (monitorView, 7769 car., 2175ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| monitor | monitor @ 1440 px | ABRE (monitorView, 7763 car., 2144ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| monitor | monitor @ 1920 px | ABRE (monitorView, 7771 car., 2347ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| ocorrencias | monitor @ 390 px | ABRE (monitorView, 7763 car., 2404ms) | 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| ocorrencias | monitor @ 1280 px | ABRE (monitorView, 7762 car., 2520ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| ocorrencias | monitor @ 1366 px | ABRE (monitorView, 7769 car., 2444ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| ocorrencias | monitor @ 1440 px | ABRE (monitorView, 7763 car., 2320ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| ocorrencias | monitor @ 1920 px | ABRE (monitorView, 7771 car., 2500ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| horarios | monitor @ 390 px | ABRE (monitorView, 7763 car., 2618ms) | 1 textos < 11px; 4 elementos cortados | por classificar com a evidência |
| horarios | monitor @ 1280 px | ABRE (monitorView, 7762 car., 2771ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| horarios | monitor @ 1366 px | ABRE (monitorView, 7769 car., 2523ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| horarios | monitor @ 1440 px | ABRE (monitorView, 7763 car., 2451ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| horarios | monitor @ 1920 px | ABRE (monitorView, 7771 car., 2546ms) | 42 alvos < 44px; 1 textos < 11px; 5 elementos cortados | por classificar com a evidência |
| escola-historia | monitor @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | monitor @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | monitor @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | monitor @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | monitor @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | monitor @ 390 px | ABRE (bfrNotificationsView, 347 car., 2669ms) | — | — |
| notificacoes | monitor @ 1280 px | ABRE (bfrNotificationsView, 400 car., 3246ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | monitor @ 1366 px | ABRE (bfrNotificationsView, 400 car., 3925ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | monitor @ 1440 px | ABRE (bfrNotificationsView, 400 car., 3914ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | monitor @ 1920 px | ABRE (bfrNotificationsView, 400 car., 2478ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | monitor @ 390 px | ABRE (bfrContentHubView, 1021 car., 2774ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | monitor @ 1280 px | ABRE (bfrContentHubView, 1021 car., 2548ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | monitor @ 1366 px | ABRE (bfrContentHubView, 1021 car., 2542ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | monitor @ 1440 px | ABRE (bfrContentHubView, 1021 car., 2523ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | monitor @ 1920 px | ABRE (bfrContentHubView, 1021 car., 2563ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| jogos-escolares | monitor @ 390 px | ABRE (schoolGamesView, 220 car., 2719ms) | — | — |
| jogos-escolares | monitor @ 1280 px | ABRE (schoolGamesView, 220 car., 2694ms) | 2 alvos < 44px | por classificar com a evidência |
| jogos-escolares | monitor @ 1366 px | ABRE (schoolGamesView, 865 car., 4474ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | monitor @ 1440 px | ABRE (schoolGamesView, 220 car., 2558ms) | 2 alvos < 44px | por classificar com a evidência |
| jogos-escolares | monitor @ 1920 px | ABRE (schoolGamesView, 220 car., 2781ms) | 2 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-mon390b.json`, `ah2-varredura-17-11-monitor1280.json`, `ah2-varredura-17-11-1366g2.json`, `ah2-varredura-17-11-1440g2.json`, `ah2-varredura-17-11-1920g2.json`

### gatekeeper — Portaria

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | gatekeeper @ 390 px | ABRE (gatekeeperView, 1433 car., 3033ms) | 1 alvos < 44px; 3 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| inicio | gatekeeper @ 1280 px | ABRE (gatekeeperView, 1703 car., 3042ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| inicio | gatekeeper @ 1366 px | ABRE (gatekeeperView, 1703 car., 2458ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| inicio | gatekeeper @ 1440 px | ABRE (gatekeeperView, 1703 car., 3049ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| inicio | gatekeeper @ 1920 px | ABRE (gatekeeperView, 1703 car., 3052ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| gate | gatekeeper @ 390 px | ABRE (gatekeeperView, 1433 car., 1828ms) | 1 alvos < 44px; 3 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| gate | gatekeeper @ 1280 px | ABRE (gatekeeperView, 1703 car., 1823ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| gate | gatekeeper @ 1366 px | ABRE (gatekeeperView, 1703 car., 1823ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| gate | gatekeeper @ 1440 px | ABRE (gatekeeperView, 1703 car., 1836ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| gate | gatekeeper @ 1920 px | ABRE (gatekeeperView, 1703 car., 1821ms) | 11 alvos < 44px; 4 textos < 11px; 1 elementos cortados | por classificar com a evidência |
| horarios | gatekeeper @ 390 px | ABRE (gatekeeperView, 1311 car., 1830ms) | 2 elementos cortados | por classificar com a evidência |
| horarios | gatekeeper @ 1280 px | ABRE (gatekeeperView, 1311 car., 1821ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| horarios | gatekeeper @ 1366 px | ABRE (gatekeeperView, 1318 car., 1825ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| horarios | gatekeeper @ 1440 px | ABRE (gatekeeperView, 1312 car., 1831ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| horarios | gatekeeper @ 1920 px | ABRE (gatekeeperView, 1320 car., 1828ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| comunicados | gatekeeper @ 390 px | ABRE (gatekeeperView, 1311 car., 1822ms) | 2 elementos cortados | por classificar com a evidência |
| comunicados | gatekeeper @ 1280 px | ABRE (gatekeeperView, 1311 car., 1824ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| comunicados | gatekeeper @ 1366 px | ABRE (gatekeeperView, 1318 car., 1818ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| comunicados | gatekeeper @ 1440 px | ABRE (gatekeeperView, 1312 car., 1825ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| comunicados | gatekeeper @ 1920 px | ABRE (gatekeeperView, 1320 car., 1808ms) | 9 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| escola-historia | gatekeeper @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | gatekeeper @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | gatekeeper @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | gatekeeper @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | gatekeeper @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| notificacoes | gatekeeper @ 390 px | ABRE (bfrNotificationsView, 400 car., 1824ms) | — | — |
| notificacoes | gatekeeper @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1822ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | gatekeeper @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1825ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | gatekeeper @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1831ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | gatekeeper @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1829ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | gatekeeper @ 390 px | ABRE (bfrContentHubView, 1021 car., 1829ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | gatekeeper @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1822ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | gatekeeper @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1823ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | gatekeeper @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1830ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | gatekeeper @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1813ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| jogos-escolares | gatekeeper @ 390 px | ABRE (schoolGamesView, 865 car., 1821ms) | — | — |
| jogos-escolares | gatekeeper @ 1280 px | ABRE (schoolGamesView, 865 car., 1827ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | gatekeeper @ 1366 px | ABRE (schoolGamesView, 865 car., 1835ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | gatekeeper @ 1440 px | ABRE (schoolGamesView, 865 car., 1820ms) | 8 alvos < 44px | por classificar com a evidência |
| jogos-escolares | gatekeeper @ 1920 px | ABRE (schoolGamesView, 865 car., 1828ms) | 8 alvos < 44px | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-gate390.json`, `ah2-varredura-17-11-gate1280.json`, `ah2-varredura-17-11-1366g2.json`, `ah2-varredura-17-11-1440g2.json`, `ah2-varredura-17-11-1920g2.json`

### developer — Developer

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| inicio | developer @ 390 px | ABRE (adminView, 147333 car., 5542ms) | 1 alvos < 44px; 58 textos < 11px; 39 elementos cortados | por classificar com a evidência |
| inicio | developer @ 1280 px | ABRE (adminView, 147328 car., 4933ms) | 309 alvos < 44px; 58 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| inicio | developer @ 1366 px | ABRE (adminView, 147334 car., 4877ms) | 309 alvos < 44px; 58 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| inicio | developer @ 1440 px | ABRE (adminView, 147360 car., 4952ms) | 310 alvos < 44px; 59 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| inicio | developer @ 1920 px | ABRE (adminView, 147328 car., 5001ms) | 309 alvos < 44px; 58 textos < 11px; 24 elementos cortados | por classificar com a evidência |
| escola-historia | developer @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | developer @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | developer @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | developer @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| escola-historia | developer @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| chat-interno | developer @ 390 px | ABRE (internalChatView, 279 car., 1825ms) | — | — |
| chat-interno | developer @ 1280 px | ABRE (internalChatView, 738 car., 1867ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | developer @ 1366 px | ABRE (internalChatView, 738 car., 1843ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | developer @ 1440 px | ABRE (internalChatView, 738 car., 1821ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| chat-interno | developer @ 1920 px | ABRE (internalChatView, 738 car., 1824ms) | 11 alvos < 44px; 7 textos < 11px | por classificar com a evidência |
| notificacoes | developer @ 390 px | ABRE (bfrNotificationsView, 400 car., 1839ms) | — | — |
| notificacoes | developer @ 1280 px | ABRE (bfrNotificationsView, 400 car., 1833ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | developer @ 1366 px | ABRE (bfrNotificationsView, 400 car., 1817ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | developer @ 1440 px | ABRE (bfrNotificationsView, 400 car., 1839ms) | 3 alvos < 44px | por classificar com a evidência |
| notificacoes | developer @ 1920 px | ABRE (bfrNotificationsView, 400 car., 1825ms) | 3 alvos < 44px | por classificar com a evidência |
| conteudos | developer @ 390 px | ABRE (bfrContentHubView, 1021 car., 1827ms) | 3 textos < 11px | por classificar com a evidência |
| conteudos | developer @ 1280 px | ABRE (bfrContentHubView, 1021 car., 1823ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | developer @ 1366 px | ABRE (bfrContentHubView, 1021 car., 1831ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | developer @ 1440 px | ABRE (bfrContentHubView, 1021 car., 1823ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| conteudos | developer @ 1920 px | ABRE (bfrContentHubView, 1021 car., 1820ms) | 14 alvos < 44px; 3 textos < 11px | por classificar com a evidência |
| notas | developer @ 390 px | ABRE (adminView, 150968 car., 1843ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| notas | developer @ 1280 px | ABRE (adminView, 150963 car., 1828ms) | 325 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| notas | developer @ 1366 px | ABRE (adminView, 150969 car., 1840ms) | 325 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| notas | developer @ 1440 px | ABRE (adminView, 150995 car., 1854ms) | 326 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| notas | developer @ 1920 px | ABRE (adminView, 150963 car., 1830ms) | 325 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| agenda | developer @ 390 px | ABRE (adminView, 150968 car., 1860ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| agenda | developer @ 1280 px | ABRE (adminView, 150963 car., 1820ms) | 325 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| agenda | developer @ 1366 px | ABRE (adminView, 150969 car., 1824ms) | 325 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| agenda | developer @ 1440 px | ABRE (adminView, 150995 car., 1832ms) | 326 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| agenda | developer @ 1920 px | ABRE (adminView, 150963 car., 1830ms) | 325 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| atividades | developer @ 390 px | ABRE (activityCenterView, 995 car., 1819ms) | — | — |
| atividades | developer @ 1280 px | ABRE (activityCenterView, 995 car., 1824ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | developer @ 1366 px | ABRE (activityCenterView, 995 car., 1821ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | developer @ 1440 px | ABRE (activityCenterView, 995 car., 1852ms) | 15 alvos < 44px | por classificar com a evidência |
| atividades | developer @ 1920 px | ABRE (activityCenterView, 995 car., 1837ms) | 15 alvos < 44px | por classificar com a evidência |
| horarios | developer @ 390 px | ABRE (adminView, 151614 car., 1840ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| horarios | developer @ 1280 px | ABRE (adminView, 151608 car., 1827ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| horarios | developer @ 1366 px | ABRE (adminView, 151615 car., 1827ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| horarios | developer @ 1440 px | ABRE (adminView, 151651 car., 1861ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| horarios | developer @ 1920 px | ABRE (adminView, 151609 car., 1823ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| jogos | developer @ 390 px | ABRE (adminView, 151614 car., 1821ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| jogos | developer @ 1280 px | ABRE (adminView, 151608 car., 1836ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| jogos | developer @ 1366 px | ABRE (adminView, 151615 car., 1817ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| jogos | developer @ 1440 px | ABRE (adminView, 151651 car., 1822ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| jogos | developer @ 1920 px | ABRE (adminView, 151609 car., 1817ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| jogos-escolares | developer @ 390 px | ABRE (schoolGamesView, 1093 car., 1819ms) | — | — |
| jogos-escolares | developer @ 1280 px | ABRE (schoolGamesView, 1093 car., 1828ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | developer @ 1366 px | ABRE (schoolGamesView, 1093 car., 1820ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | developer @ 1440 px | ABRE (schoolGamesView, 1093 car., 1836ms) | 13 alvos < 44px | por classificar com a evidência |
| jogos-escolares | developer @ 1920 px | ABRE (schoolGamesView, 1093 car., 1825ms) | 13 alvos < 44px | por classificar com a evidência |
| videos-aprender | developer @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | developer @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | developer @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | developer @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| videos-aprender | developer @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| comunicados | developer @ 390 px | ABRE (adminView, 151614 car., 1829ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| comunicados | developer @ 1280 px | ABRE (adminView, 151608 car., 1836ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| comunicados | developer @ 1366 px | ABRE (adminView, 151615 car., 1831ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| comunicados | developer @ 1440 px | ABRE (adminView, 151651 car., 1836ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| comunicados | developer @ 1920 px | ABRE (adminView, 151609 car., 1826ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| ocorrencias | developer @ 390 px | ABRE (adminView, 151614 car., 1824ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| ocorrencias | developer @ 1280 px | ABRE (adminView, 151608 car., 1821ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| ocorrencias | developer @ 1366 px | ABRE (adminView, 151615 car., 1829ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| ocorrencias | developer @ 1440 px | ABRE (adminView, 151651 car., 1820ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| ocorrencias | developer @ 1920 px | ABRE (adminView, 151609 car., 1829ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| coordenacao | developer @ 390 px | ABRE (coordinatorView, 2966 car., 2432ms) | 1 textos < 11px; 10 elementos cortados | por classificar com a evidência |
| coordenacao | developer @ 1280 px | ABRE (coordinatorView, 5149 car., 4284ms) | 20 alvos < 44px; 7 textos < 11px; 20 elementos cortados | por classificar com a evidência |
| coordenacao | developer @ 1366 px | ABRE (coordinatorView, 5156 car., 4273ms) | 21 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| coordenacao | developer @ 1440 px | ABRE (coordinatorView, 5174 car., 4398ms) | 21 alvos < 44px; 7 textos < 11px; 16 elementos cortados | por classificar com a evidência |
| coordenacao | developer @ 1920 px | ABRE (coordinatorView, 5150 car., 4260ms) | 23 alvos < 44px; 7 textos < 11px; 15 elementos cortados | por classificar com a evidência |
| monitor | developer @ 390 px | ABRE (adminView, 151614 car., 1836ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| monitor | developer @ 1280 px | ABRE (adminView, 151608 car., 1829ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| monitor | developer @ 1366 px | ABRE (adminView, 151615 car., 1844ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| monitor | developer @ 1440 px | ABRE (adminView, 151651 car., 1852ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| monitor | developer @ 1920 px | ABRE (adminView, 151609 car., 1835ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| gate | developer @ 390 px | ABRE (adminView, 151614 car., 1848ms) | 1 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| gate | developer @ 1280 px | ABRE (adminView, 151608 car., 1823ms) | 328 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| gate | developer @ 1366 px | ABRE (adminView, 151615 car., 1846ms) | 328 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| gate | developer @ 1440 px | ABRE (adminView, 151651 car., 1829ms) | 329 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| gate | developer @ 1920 px | ABRE (adminView, 151609 car., 1837ms) | 328 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| administracao | developer @ 390 px | ABRE (adminView, 204970 car., 1898ms) | 501 alvos < 44px; 70 textos < 11px; 46 elementos cortados | por classificar com a evidência |
| administracao | developer @ 1280 px | ABRE (adminView, 204964 car., 1897ms) | 831 alvos < 44px; 70 textos < 11px; 90 elementos cortados | por classificar com a evidência |
| administracao | developer @ 1366 px | ABRE (adminView, 204971 car., 1882ms) | 831 alvos < 44px; 70 textos < 11px; 64 elementos cortados | por classificar com a evidência |
| administracao | developer @ 1440 px | ABRE (adminView, 205007 car., 1837ms) | 832 alvos < 44px; 71 textos < 11px; 44 elementos cortados | por classificar com a evidência |
| administracao | developer @ 1920 px | ABRE (adminView, 204965 car., 1846ms) | 831 alvos < 44px; 70 textos < 11px; 26 elementos cortados | por classificar com a evidência |
| admin-crachas | developer @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| admin-crachas | developer @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| admin-crachas | developer @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| admin-crachas | developer @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| admin-crachas | developer @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| cadastro-alunos | developer @ 390 px | ABRE (adminView, 283029 car., 1885ms) | 505 alvos < 44px; 70 textos < 11px; 55 elementos cortados | por classificar com a evidência |
| cadastro-alunos | developer @ 1280 px | ABRE (adminView, 283022 car., 2054ms) | 860 alvos < 44px; 70 textos < 11px; 97 elementos cortados | por classificar com a evidência |
| cadastro-alunos | developer @ 1366 px | ABRE (adminView, 283029 car., 1979ms) | 860 alvos < 44px; 70 textos < 11px; 71 elementos cortados | por classificar com a evidência |
| cadastro-alunos | developer @ 1440 px | ABRE (adminView, 283065 car., 2226ms) | 861 alvos < 44px; 71 textos < 11px; 51 elementos cortados | por classificar com a evidência |
| cadastro-alunos | developer @ 1920 px | ABRE (adminView, 283023 car., 1874ms) | 860 alvos < 44px; 70 textos < 11px; 33 elementos cortados | por classificar com a evidência |
| fotos | developer @ 390 px | ABRE (adminView, 283029 car., 1846ms) | 505 alvos < 44px; 70 textos < 11px; 55 elementos cortados | por classificar com a evidência |
| fotos | developer @ 1280 px | ABRE (adminView, 283022 car., 1850ms) | 860 alvos < 44px; 70 textos < 11px; 97 elementos cortados | por classificar com a evidência |
| fotos | developer @ 1366 px | ABRE (adminView, 283029 car., 1888ms) | 860 alvos < 44px; 70 textos < 11px; 71 elementos cortados | por classificar com a evidência |
| fotos | developer @ 1440 px | ABRE (adminView, 283065 car., 1916ms) | 861 alvos < 44px; 71 textos < 11px; 51 elementos cortados | por classificar com a evidência |
| fotos | developer @ 1920 px | ABRE (adminView, 283023 car., 1857ms) | 860 alvos < 44px; 70 textos < 11px; 33 elementos cortados | por classificar com a evidência |
| aee | developer @ 390 px | ABRE (aeeView, 5230 car., 1853ms) | 3 elementos cortados | por classificar com a evidência |
| aee | developer @ 1280 px | ABRE (aeeView, 5230 car., 1820ms) | 54 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| aee | developer @ 1366 px | ABRE (aeeView, 5236 car., 1836ms) | 54 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| aee | developer @ 1440 px | ABRE (aeeView, 5243 car., 1846ms) | 54 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| aee | developer @ 1920 px | ABRE (aeeView, 5230 car., 1832ms) | 54 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| direcao | developer @ 390 px | ABRE (adminView, 280573 car., 1853ms) | 505 alvos < 44px; 70 textos < 11px; 56 elementos cortados; o app declara seção «administracao» | por classificar com a evidência |
| direcao | developer @ 1280 px | ABRE (adminView, 280566 car., 1857ms) | 795 alvos < 44px; 70 textos < 11px; 98 elementos cortados; o app declara seção «administracao» | por classificar com a evidência |
| direcao | developer @ 1366 px | ABRE (adminView, 280573 car., 1863ms) | 795 alvos < 44px; 70 textos < 11px; 72 elementos cortados; o app declara seção «administracao» | por classificar com a evidência |
| direcao | developer @ 1440 px | ABRE (adminView, 280609 car., 1897ms) | 796 alvos < 44px; 71 textos < 11px; 52 elementos cortados; o app declara seção «administracao» | por classificar com a evidência |
| direcao | developer @ 1920 px | ABRE (adminView, 280567 car., 1870ms) | 795 alvos < 44px; 70 textos < 11px; 34 elementos cortados; o app declara seção «administracao» | por classificar com a evidência |
| comunicacao | developer @ 390 px | ABRE (bfrCommunicationView, 1094 car., 1820ms) | 11 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| comunicacao | developer @ 1280 px | ABRE (bfrCommunicationView, 1094 car., 1848ms) | 22 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| comunicacao | developer @ 1366 px | ABRE (bfrCommunicationView, 1094 car., 1857ms) | 22 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| comunicacao | developer @ 1440 px | ABRE (bfrCommunicationView, 1094 car., 1834ms) | 22 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| comunicacao | developer @ 1920 px | ABRE (bfrCommunicationView, 1094 car., 1853ms) | 22 alvos < 44px; 1 textos < 11px | por classificar com a evidência |
| coordenacao-chat | developer @ 390 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | developer @ 1280 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | developer @ 1366 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | developer @ 1440 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| coordenacao-chat | developer @ 1920 px | SEM BOTÃO | declarada no bundle mas sem button[data-section] | por decidir: retirar do mapa ou ligar o botão |
| resultados-aprendizagem | developer @ 390 px | ABRE (resultsLearningView, 588 car., 1814ms) | 1 elementos cortados | por classificar com a evidência |
| resultados-aprendizagem | developer @ 1280 px | ABRE (resultsLearningView, 588 car., 1841ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | developer @ 1366 px | ABRE (resultsLearningView, 588 car., 1836ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | developer @ 1440 px | ABRE (resultsLearningView, 588 car., 1821ms) | 17 alvos < 44px | por classificar com a evidência |
| resultados-aprendizagem | developer @ 1920 px | ABRE (resultsLearningView, 588 car., 1833ms) | 17 alvos < 44px | por classificar com a evidência |
| psychology | developer @ 390 px | ABRE (psychologyView, 1136 car., 1828ms) | 2 elementos cortados | por classificar com a evidência |
| psychology | developer @ 1280 px | ABRE (psychologyView, 1136 car., 1841ms) | 18 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| psychology | developer @ 1366 px | ABRE (psychologyView, 1142 car., 1844ms) | 18 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| psychology | developer @ 1440 px | ABRE (psychologyView, 1149 car., 1828ms) | 18 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| psychology | developer @ 1920 px | ABRE (psychologyView, 1136 car., 1829ms) | 18 alvos < 44px; 3 elementos cortados | por classificar com a evidência |
| multiprofissional | developer @ 390 px | ABRE (multiprofessionalView, 1193 car., 1857ms) | 3 elementos cortados | por classificar com a evidência |
| multiprofissional | developer @ 1280 px | ABRE (multiprofessionalView, 1193 car., 1820ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | developer @ 1366 px | ABRE (multiprofessionalView, 1199 car., 1834ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | developer @ 1440 px | ABRE (multiprofessionalView, 1206 car., 1834ms) | 15 alvos < 44px; 4 elementos cortados | por classificar com a evidência |
| multiprofissional | developer @ 1920 px | ABRE (multiprofessionalView, 1193 car., 1832ms) | 15 alvos < 44px; 3 elementos cortados | por classificar com a evidência |

Larguras com artefacto válido: 390 + 1280 + 1366 + 1440 + 1920 · ficheiros: `ah2-varredura-17-11-dev390.json`, `ah2-varredura-17-11-dev1280b.json`, `ah2-varredura-17-11-1366g1.json`, `ah2-varredura-17-11-repro1440.json`, `ah2-varredura-17-11-1920g1.json`

### pending — Conta pendente

| Funcionalidade | Perfil | Resultado | Problema | Correção |
|---|---|---|---|---|
| barreira de aprovação antes do shell | pending | NÃO TESTADA | a conta pendente não tem menu: a verificação é a barreira, não as seções | correr a varredura de pending |
