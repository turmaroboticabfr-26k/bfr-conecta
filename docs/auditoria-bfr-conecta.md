# Auditoria geral — BFR Conecta

**Escopo:** todo o aplicativo — 13 perfis, 52 seções distintas no HTML
(164 combinações perfil×tela do seletor real), 1971 controles no documento
(1120 botões, 822 campos, 29 links).
**Como foi medido:** o `index.html` de 3327643 caracteres que é byte-idêntico ao publicado
(bate com o inventário do parser),
servido localmente com sessão da conta sintética criada para a auditoria, dirigido por CDP (Chrome real,
cliques reais, viewport emulado). Depois das correções locais, a matriz inteira foi re-medida no build
corrigido (164 visitas contra 164 do publicado; o HTML servido hoje tem
3330710 caracteres; as edições conferidas no arquivo: ✓ A — escrita de texto idêntica no KPI removida; ✓ B — observador do appShell coalescido; ✓ C — estado do boot com tentouEm; ✓ D — teto de 30 s na reentrada do refresh()).
Nenhuma gravação em dados reais: nenhum controle com verbo de escrita foi clicado e a rede
foi vigiada durante as provas de botão.

**Quais números deste relatório NÃO são medida de tela** (para ler as tabelas sem se enganar):
* as 260 de 323 linhas da banda web sem alvo resolvido (80%) mediram o **container da view ativa**, não a aba — B e F.16;
* as 323 linhas web teriam uma tarja de "menu sem destaque" que o guard de 900 px mostra ser falsa — F.15;
* as 820 linhas da passada mobile **anterior**, sem portão de assentamento, estão quarantenadas em `audit-sweep-mobile.sem-portao.json` — F.12; as 25 telas do diário publicado que constam como `travaConfirmada` no reteste são **histórico**, não trava nova — a contagem viva é `r.trava`, e dá 0 — F.3;
* todas as 164 combinações perfil×tela têm medição e reteste; sem a passada na URL publicada (seção H) nenhuma linha deste relatório descreve o que o navegador do cliente renderiza no endereço público — descreve o que o harness local mede com os mesmos bytes.

## A. Matriz de cobertura (Perfil × Tela × Resultado)

| Perfil | Tela | Resultado esperado | Observado | Status | Problema | Correção | Reteste |
|---|---|---|---|---|---|---|---|
| parent | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 121 caracteres · 0 controles · 5 nós · 2951 ms até a tela responder | aprovado | nenhum | — | chegou · 121c · 0 ctl · 2004 ms · nenhum defeito novo |
| parent | Aprender | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *279 caracteres · 6 controles · 25 nós · 3363 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s) | — | chegou · 279c* · 6 ctl · 3600 ms · resta: 1 texto cortado |
| parent | Evoluir | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *270 caracteres · 4 controles · 21 nós · 3317 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s) | — | chegou · 270c* · 4 ctl · 3317 ms · resta: 1 texto cortado |
| parent | Escola | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *306 caracteres · 6 controles · 25 nós · 3053 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s) | — | chegou · 306c* · 6 ctl · 2629 ms · resta: 1 texto cortado |
| parent | Meu espaço | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *332 caracteres · 8 controles · 29 nós · 2757 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s) | — | chegou · 332c* · 8 ctl · 3224 ms · resta: 1 texto cortado |
| parent | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 2997 ms até a tela responder | aprovado | nenhum | — | chegou · 145c* · 2 ctl · 2921 ms · nenhum defeito novo |
| parent | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 2691 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2669 ms · resta: 8 alvo <44px, 8 fonte <11px |
| parent | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1094 caracteres · 76 controles · 640 nós · 2735 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1094c* · 70 ctl · 3224 ms · resta: 8 fonte <11px |
| parent | Notas | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1094 caracteres · 76 controles · 650 nós · 2683 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1166c · 70 ctl · 2918 ms · resta: 8 fonte <11px |
| parent | Agenda | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1090 caracteres · 71 controles · 625 nós · 3320 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1094c · 70 ctl · 2600 ms · resta: 8 fonte <11px |
| parent | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *922 caracteres · 20 controles · 93 nós · 2999 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 135px; texto cortado sem rolagem em 1 elemento(s); 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 922c* · 20 ctl · 2918 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| parent | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1094 caracteres · 70 controles · 620 nós · 2894 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1162c · 71 ctl · 3235 ms · resta: 8 fonte <11px |
| parent | Secretaria | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 181 caracteres · 0 controles · 6 nós · 3095 ms até a tela responder | aprovado | nenhum | — | chegou · 181c · 0 ctl · 2911 ms · nenhum defeito novo |
| parent | Ocorrências | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1094 caracteres · 76 controles · 650 nós · 3298 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1094c · 70 ctl · 2635 ms · resta: 8 fonte <11px |
| parent | Chat coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1166 caracteres · 77 controles · 655 nós · 4101 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1094c* · 70 ctl · 2901 ms · resta: 8 fonte <11px |
| parent | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1094 caracteres · 70 controles · 620 nós · 3045 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1094c* · 71 ctl · 3260 ms · resta: 8 fonte <11px |
| student | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 142816 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 1287c · 68 ctl · 7683 ms · resta: 6 fonte <11px |
| student | Aprender | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 27923 ms até a tela responder | reprovado | a aba congela: nenhum comando do navegador recebe resposta; a tela abre sem nenhum conteúdo (0 caracteres); rolagem horizontal na página inteira (590px fora da tela) | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível; renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | parou em inicio · 1287c* · 68 ctl · 33911 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Evoluir | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 145009 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | parou em inicio · 1287c* · 68 ctl · 33792 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Escola | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 117001 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | parou em inicio · 1287c* · 68 ctl · 27162 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Meu espaço | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115226 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | parou em inicio · 1287c* · 68 ctl · 34088 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115862 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 400c* · 3 ctl · 9043 ms · nenhum defeito novo |
| student | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 116982 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 1319c* · 18 ctl · 9389 ms · resta: 8 alvo <44px, 8 fonte <11px |
| student | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115292 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 45176c* · 68 ctl · 9796 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Notas | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 116552 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 183c · 0 ctl · 9659 ms · nenhum defeito novo |
| student | Agenda | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115622 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 393c · 4 ctl · 9990 ms · resta: 4 texto cortado, 4 fonte <11px |
| student | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 116504 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 1675c* · 27 ctl · 8788 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| student | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115232 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 655c · 3 ctl · 9663 ms · resta: 1 alvo <44px |
| student | Jogos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 116815 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 467c · 10 ctl · 9830 ms · resta: 8 fonte <11px |
| student | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115631 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 45196c* · 68 ctl · 7239 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Vídeos aprender | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115219 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 45044c* · 68 ctl · 3943 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115311 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 36c · 0 ctl · 9927 ms · resta: estado vazio |
| student | Biblioteca | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115253 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 40423c* · 294 ctl · 9769 ms · resta: estouro interno 325px, 1 alvo <44px, 8 fonte <11px |
| student | Boletim | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 114925 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 183c · 0 ctl · 2427 ms · nenhum defeito novo |
| student | Resultados e aprendizagem | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 115722 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 1780c* · 18 ctl · 10058 ms · resta: 8 fonte <11px |
| teacher | Início do professor | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 51 controles · 590 nós · 2090 ms até a tela responder | aprovado | nenhum | — | chegou · 374c* · 129 ctl · 8283 ms · nenhum defeito novo |
| teacher | Minhas turmas | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *331 caracteres · 51 controles · 600 nós · 74719 ms até a tela responder | aprovado | nenhum | — | chegou · 331c* · 54 ctl · 2676 ms · nenhum defeito novo |
| teacher | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 55 controles · 648 nós · 3096 ms até a tela responder | aprovado | nenhum | — | chegou · 340c* · 52 ctl · 2927 ms · nenhum defeito novo |
| teacher | Avaliações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *349 caracteres · 51 controles · 709 nós · 26287 ms até a tela responder | aprovado | nenhum | — | chegou · 349c* · 54 ctl · 2970 ms · nenhum defeito novo |
| teacher | Frequência | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *510 caracteres · 51 controles · 590 nós · 3800 ms até a tela responder | aprovado | nenhum | — | chegou · 3418c* · 129 ctl · 9742 ms · nenhum defeito novo |
| teacher | Agenda | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *552 caracteres · 51 controles · 600 nós · 27158 ms até a tela responder | aprovado | nenhum | — | chegou · 29460c* · 129 ctl · 8877 ms · nenhum defeito novo |
| teacher | Agenda de hoje | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 164836 ms até a tela responder | reprovado | a thread da página para: nem um evaluate mínimo responde depois da tela abrir | — | chegou · 5330c* · 129 ctl · 9471 ms · nenhum defeito novo |
| teacher | Biblioteca | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *425 caracteres · 54 controles · 762 nós · 26694 ms até a tela responder | aprovado | nenhum | — | chegou · 547c* · 129 ctl · 9344 ms · nenhum defeito novo |
| teacher | Comunicação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *372 caracteres · 54 controles · 643 nós · 26850 ms até a tela responder | aprovado | nenhum | — | chegou · 494c* · 129 ctl · 9124 ms · nenhum defeito novo |
| teacher | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 25515 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 279c* · 33 ctl · 9514 ms · resta: 1 alvo <44px, 2 fonte <11px |
| teacher | Espaço do professor | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *481 caracteres · 54 controles · 752 nós · 74891 ms até a tela responder | aprovado | nenhum | — | chegou · 724c* · 129 ctl · 9064 ms · nenhum defeito novo |
| teacher | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 54 controles · 643 nós · 2886 ms até a tela responder | aprovado | nenhum | — | chegou · 252c* · 55 ctl · 2342 ms · nenhum defeito novo |
| teacher | Diário | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 51 controles · 719 nós · 27137 ms até a tela responder | aprovado | nenhum | — | chegou · 5330c* · 129 ctl · 9331 ms · nenhum defeito novo |
| teacher | Planejamento | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 168610 ms até a tela responder | reprovado | a thread da página para: nem um evaluate mínimo responde depois da tela abrir | — | chegou · 5330c* · 129 ctl · 9137 ms · nenhum defeito novo |
| teacher | Relatórios | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 51 controles · 590 nós · 26854 ms até a tela responder | aprovado | nenhum | — | chegou · 5330c* · 129 ctl · 9517 ms · nenhum defeito novo |
| teacher | Calendário | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 51 controles · 709 nós · 25983 ms até a tela responder | aprovado | nenhum | — | chegou · 5330c* · 129 ctl · 9044 ms · nenhum defeito novo |
| teacher | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 164256 ms até a tela responder | reprovado | a thread da página para: nem um evaluate mínimo responde depois da tela abrir | — | chegou · 5330c* · 129 ctl · 9492 ms · nenhum defeito novo |
| teacher | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1143 caracteres · 54 controles · 762 nós · 25929 ms até a tela responder | aprovado | nenhum | — | chegou · 1143c* · 55 ctl · 2631 ms · nenhum defeito novo |
| teacher | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *400 caracteres · 3 controles · 26 nós · 10927 ms até a tela responder | aprovado | nenhum | — | chegou · 145c* · 2 ctl · 2682 ms · nenhum defeito novo |
| teacher | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 27267 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 10637 ms · resta: 8 alvo <44px, 8 fonte <11px |
| teacher | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *252 caracteres · 51 controles · 590 nós · 27051 ms até a tela responder | aprovado | nenhum | — | chegou · 252c* · 51 ctl · 2467 ms · nenhum defeito novo |
| teacher | Resultados e aprendizagem | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *385 caracteres · 8 controles · 27 nós · 2782 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1079c* · 8 ctl · 10160 ms · resta: 8 fonte <11px |
| coordinator | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 201 caracteres · 28 controles · 88 nós · 2839 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 2px | — | chegou · 201c · 28 ctl · 4144 ms · resta: estouro interno 2px |
| coordinator | Coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 201 caracteres · 28 controles · 88 nós · 3071 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 2px | — | chegou · 201c · 28 ctl · 2978 ms · resta: estouro interno 2px |
| coordinator | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 698 caracteres · 44 controles · 414 nós · 3567 ms até a tela responder | aprovado | nenhum | — | chegou · 707c · 44 ctl · 2605 ms · nenhum defeito novo |
| coordinator | Cadastro de alunos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 698 caracteres · 44 controles · 414 nós · 3703 ms até a tela responder | aprovado | nenhum | — | chegou · 707c · 44 ctl · 3556 ms · nenhum defeito novo |
| coordinator | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 698 caracteres · 44 controles · 443 nós · 3224 ms até a tela responder | aprovado | nenhum | — | chegou · 1081c · 50 ctl · 3201 ms · resta: 1 alvo <44px, 4 fonte <11px |
| coordinator | Ocorrências | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 698 caracteres · 44 controles · 424 nós · 2739 ms até a tela responder | aprovado | nenhum | — | chegou · 707c · 44 ctl · 3264 ms · nenhum defeito novo |
| coordinator | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *922 caracteres · 20 controles · 93 nós · 3264 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 135px; texto cortado sem rolagem em 1 elemento(s); 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 922c* · 20 ctl · 2941 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| coordinator | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1076 caracteres · 50 controles · 473 nós · 2689 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 4 controle(s) com fonte menor que 11 px | — | chegou · 707c* · 44 ctl · 2652 ms · nenhum defeito novo |
| coordinator | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 2966 ms até a tela responder | aprovado | nenhum | — | chegou · 145c* · 2 ctl · 2653 ms · nenhum defeito novo |
| coordinator | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 3893 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2604 ms · resta: 8 alvo <44px, 8 fonte <11px |
| coordinator | Relatórios | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *165 caracteres · 1 controles · 9 nós · 3337 ms até a tela responder | aprovado | nenhum | — | chegou · 165c* · 1 ctl · 3539 ms · nenhum defeito novo |
| coordinator | Comunicação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 3011 ms até a tela responder | reprovado | a tela abre sem nenhum conteúdo (0 caracteres) | renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | chegou · 0c* · 0 ctl · 3859 ms · resta: em branco |
| coordinator | Fotos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *702 caracteres · 44 controles · 10620 nós · 3057 ms até a tela responder | aprovado | nenhum | — | chegou · 707c* · 44 ctl · 3458 ms · nenhum defeito novo |
| coordinator | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 3058 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 256c* · 19 ctl · 2950 ms · resta: 1 alvo <44px, 1 fonte <11px |
| coordinator | Chat coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *698 caracteres · 44 controles · 414 nós · 2984 ms até a tela responder | aprovado | nenhum | — | chegou · 707c* · 44 ctl · 2625 ms · nenhum defeito novo |
| coordinator | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *220 caracteres · 2 controles · 11 nós · 2702 ms até a tela responder | aprovado | nenhum | — | chegou · 220c* · 2 ctl · 2659 ms · nenhum defeito novo |
| coordinator | AEE | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 36740 ms até a tela responder | reprovado | a aba travou durante a visita e a sonda confirmou a mudez; a navegação não chegou na seção pedida (parou em "null"); a tela abre sem nenhum conteúdo (0 caracteres); rolagem horizontal na página inteira (590px fora da tela) | renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | parou em aee · 8890c · 113 ctl · 50318 ms · resta: parou em "aee", 8 alvo <44px, 8 fonte <11px |
| coordinator | Resultados e aprendizagem | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *586 caracteres · 17 controles · 45 nós · 3764 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 586c* · 17 ctl · 2690 ms · resta: 8 fonte <11px |
| admin | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 151 caracteres · 0 controles · 5 nós · 3189 ms até a tela responder | aprovado | nenhum | — | chegou · 151c · 0 ctl · 3399 ms · nenhum defeito novo |
| admin | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *79985 caracteres · 210 controles · 4338 nós · 62944 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 61px; 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 2 controle(s) sem rótulo acessível | — | chegou · 39216c* · 312 ctl · 2602 ms · resta: 8 alvo <44px, 8 fonte <11px, 2 sem rótulo |
| admin | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 2941 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 256c* · 19 ctl · 2643 ms · resta: 1 alvo <44px, 1 fonte <11px |
| admin | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 2635 ms até a tela responder | aprovado | nenhum | — | chegou · 343c* · 2 ctl · 2602 ms · nenhum defeito novo |
| admin | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 2688 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2818 ms · resta: 8 alvo <44px, 8 fonte <11px |
| admin | Notas | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 232 caracteres · 0 controles · 24 nós · 26000 ms até a tela responder | aprovado | nenhum | — | chegou · 232c · 0 ctl · 9914 ms · nenhum defeito novo |
| admin | Agenda | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 425 caracteres · 13 controles · 46 nós · 26109 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 4 elemento(s); 5 controle(s) com área de toque menor que 44×44 px; 4 controle(s) com fonte menor que 11 px; 5 controle(s) sem rótulo acessível | — | chegou · 425c · 13 ctl · 2709 ms · resta: 4 texto cortado, 5 alvo <44px, 4 fonte <11px |
| admin | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *922 caracteres · 20 controles · 93 nós · 2960 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 135px; texto cortado sem rolagem em 1 elemento(s); 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 922c* · 20 ctl · 2800 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| admin | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 643 caracteres · 3 controles · 117 nós · 2900 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 655c · 3 ctl · 2649 ms · resta: 1 alvo <44px |
| admin | Jogos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 425 caracteres · 13 controles · 46 nós · 2951 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 4 elemento(s); 5 controle(s) com área de toque menor que 44×44 px; 4 controle(s) com fonte menor que 11 px; 5 controle(s) sem rótulo acessível | — | chegou · 425c · 13 ctl · 3008 ms · resta: 4 texto cortado, 5 alvo <44px, 4 fonte <11px |
| admin | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *79860 caracteres · 207 controles · 3526 nós · 3433 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 2 controle(s) sem rótulo acessível | — | chegou · 71232c* · 180 ctl · 2692 ms · resta: estouro interno 61px, 8 alvo <44px, 8 fonte <11px |
| admin | Vídeos aprender | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *37023 caracteres · 175 controles · 1963 nós · 2836 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 70968c* · 176 ctl · 2758 ms · resta: 8 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| admin | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 280 caracteres · 2 controles · 16 nós · 2511 ms até a tela responder | aprovado | nenhum | — | chegou · 280c · 2 ctl · 2875 ms · nenhum defeito novo |
| admin | Ocorrências | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 196 caracteres · 1 controles · 12 nós · 2729 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 196c · 1 ctl · 2823 ms · resta: 1 alvo <44px |
| admin | Coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 32480 ms até a tela responder | reprovado | a aba travou durante a visita e a sonda confirmou a mudez; a navegação não chegou na seção pedida (parou em "null"); a tela abre sem nenhum conteúdo (0 caracteres); rolagem horizontal na página inteira (590px fora da tela) | renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | parou em coordenacao · 2270c · 57 ctl · 50081 ms · resta: parou em "coordenacao", estouro interno 2px |
| admin | Portaria | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 239 caracteres · 1 controles · 14 nós · 26713 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 239c · 1 ctl · 3812 ms · resta: 1 alvo <44px |
| admin | Portaria QR | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 252 caracteres · 3 controles · 13 nós · 2803 ms até a tela responder | reprovado com ressalva | 2 controle(s) com área de toque menor que 44×44 px; 2 controle(s) sem rótulo acessível | — | chegou · 252c · 3 ctl · 4530 ms · resta: 2 alvo <44px, 2 sem rótulo |
| admin | Administração | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 67044 caracteres · 108 controles · 2475 nós · 2702 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 61px; 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 33521c · 108 ctl · 2931 ms · resta: 8 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| admin | Crachás | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 542 caracteres · 10 controles · 73 nós · 3085 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) sem rótulo acessível | — | chegou · 299c · 10 ctl · 3270 ms · resta: 1 alvo <44px, 1 sem rótulo |
| admin | Cadastro de alunos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 801 caracteres · 21 controles · 73 nós · 3176 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 801c · 21 ctl · 3396 ms · resta: 8 alvo <44px, 6 sem rótulo |
| admin | Fotos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *232907 caracteres · 996 controles · 12899 nós · 4707 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 61px; 8 controle(s) com área de toque menor que 44×44 px; 4 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 44069c* · 169 ctl · 3320 ms · resta: 8 alvo <44px, 4 fonte <11px, 6 sem rótulo |
| admin | AEE | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 34729 ms até a tela responder | reprovado | a aba travou durante a visita e a sonda confirmou a mudez; a navegação não chegou na seção pedida (parou em "null"); a tela abre sem nenhum conteúdo (0 caracteres); rolagem horizontal na página inteira (590px fora da tela) | renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | parou em aee · 8890c · 113 ctl · 50324 ms · resta: parou em "aee", 8 alvo <44px, 8 fonte <11px |
| admin | Direção | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 37775 caracteres · 181 controles · 2009 nós · 25800 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 33887c · 110 ctl · 2708 ms · resta: 8 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| admin | Comunicação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *45968 caracteres · 207 controles · 2624 nós · 2935 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 2 controle(s) sem rótulo acessível | — | chegou · 37788c* · 181 ctl · 2601 ms · resta: 8 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| admin | Chat coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *18044 caracteres · 138 controles · 1431 nós · 2724 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 42280c* · 138 ctl · 2669 ms · resta: 8 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| admin | Resultados e aprendizagem | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *586 caracteres · 17 controles · 45 nós · 3020 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 586c* · 17 ctl · 2596 ms · resta: 8 fonte <11px |
| director | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 340 caracteres · 49 controles · 395 nós · 2656 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 4102c · 272 ctl · 7914 ms · resta: 1 alvo <44px |
| director | Direção | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 340 caracteres · 49 controles · 405 nós · 28008 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 4102c · 272 ctl · 10068 ms · resta: 1 alvo <44px |
| director | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 340 caracteres · 49 controles · 405 nós · 4629 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 4102c · 272 ctl · 9765 ms · resta: 1 alvo <44px |
| director | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 405 nós · 26039 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 340c* · 49 ctl · 2727 ms · resta: 1 alvo <44px, 6 sem rótulo |
| director | Coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 395 nós · 4578 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 4102c* · 272 ctl · 9341 ms · resta: 1 alvo <44px |
| director | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 405 nós · 26086 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 340c* · 49 ctl · 2605 ms · resta: 1 alvo <44px, 6 sem rótulo |
| director | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 27064 ms até a tela responder | aprovado | nenhum | — | chegou · 343c* · 2 ctl · 2619 ms · nenhum defeito novo |
| director | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 35807 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2943 ms · resta: 8 alvo <44px, 8 fonte <11px |
| director | Comunicação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 405 nós · 3447 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 3625c* · 272 ctl · 10757 ms · resta: 1 alvo <44px, 6 sem rótulo |
| director | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 2805 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 279c* · 33 ctl · 9173 ms · resta: 1 alvo <44px, 2 fonte <11px |
| director | Chat coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 405 nós · 2790 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 4102c* · 272 ctl · 9928 ms · resta: 1 alvo <44px |
| director | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *340 caracteres · 49 controles · 405 nós · 3586 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 340c* · 49 ctl · 2416 ms · resta: 1 alvo <44px, 6 sem rótulo |
| director | Fotos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *3625 caracteres · 272 controles · 4771 nós · 58095 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 6 controle(s) sem rótulo acessível | — | chegou · 3625c* · 272 ctl · 8640 ms · resta: 1 alvo <44px, 6 sem rótulo |
| director | AEE | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 33429 ms até a tela responder | reprovado | a aba travou durante a visita e a sonda confirmou a mudez; a navegação não chegou na seção pedida (parou em "null"); a tela abre sem nenhum conteúdo (0 caracteres); rolagem horizontal na página inteira (590px fora da tela) | renderizar o painel ou remover a entrada do menu; tela em branco não é estado possível | parou em aee · 8890c · 113 ctl · 50421 ms · resta: parou em "aee", 8 alvo <44px, 8 fonte <11px |
| director | Resultados e aprendizagem | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *586 caracteres · 17 controles · 45 nós · 37035 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 586c* · 17 ctl · 3344 ms · resta: 8 fonte <11px |
| Portaria | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 0 ms até a tela responder | reprovado | a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | chegou · 2979c · 39 ctl · 28058 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| Portaria | Portaria | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 2995 caracteres · 39 controles · 1265 nós · 36079 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s); 4 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 2979c · 39 ctl · 34347 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| Portaria | Ocorrências | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 3008 caracteres · 39 controles · 1265 nós · 37420 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s); 4 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 2979c · 39 ctl · 40731 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| Portaria | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 671 caracteres · 3 controles · 117 nós · 23403 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 655c · 3 ctl · 22766 ms · resta: 1 alvo <44px |
| Portaria | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *3873 caracteres · 46 controles · 1337 nós · 28369 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 78px; texto cortado sem rolagem em 2 elemento(s); 6 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 2979c* · 39 ctl · 34936 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| Portaria | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 37035 ms até a tela responder | aprovado | nenhum | — | chegou · 145c* · 2 ctl · 33967 ms · nenhum defeito novo |
| Portaria | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 46545 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 44070 ms · resta: 8 alvo <44px, 8 fonte <11px |
| Portaria | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *2995 caracteres · 39 controles · 1265 nós · 35720 ms até a tela responder | reprovado com ressalva | texto cortado sem rolagem em 1 elemento(s); 4 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 2979c* · 39 ctl · 32355 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| gatekeeper | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1657 caracteres · 29 controles · 166 nós · 50402 ms até a tela responder | reprovado com ressalva | 4 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 6 controle(s) sem rótulo acessível | — | chegou · 1499c · 32 ctl · 8720 ms · resta: 4 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| gatekeeper | Portaria QR | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 165057 ms até a tela responder | reprovado | a thread da página para: nem um evaluate mínimo responde depois da tela abrir | — | chegou · 1677c · 29 ctl · 2577 ms · resta: 4 alvo <44px, 8 fonte <11px, 6 sem rótulo |
| gatekeeper | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 671 caracteres · 3 controles · 117 nós · 27292 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 655c · 3 ctl · 2974 ms · resta: 1 alvo <44px |
| gatekeeper | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1271 caracteres · 37 controles · 527 nós · 52663 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 1255c* · 37 ctl · 3022 ms · resta: 1 alvo <44px |
| gatekeeper | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1443 caracteres · 40 controles · 1141 nós · 6361 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 1427c* · 40 ctl · 9452 ms · resta: 1 alvo <44px |
| gatekeeper | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 51381 ms até a tela responder | aprovado | nenhum | — | chegou · 400c* · 3 ctl · 9113 ms · nenhum defeito novo |
| gatekeeper | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 52015 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2342 ms · resta: 8 alvo <44px, 8 fonte <11px |
| gatekeeper | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1436 caracteres · 37 controles · 537 nós · 3843 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px | — | chegou · 1427c* · 40 ctl · 10369 ms · resta: 1 alvo <44px |
| secretary | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1936 caracteres · 80 controles · 689 nós · 25548 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3641c · 1042 ctl · 8106 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Secretaria | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 1936 caracteres · 80 controles · 689 nós · 2972 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3641c · 1042 ctl · 9818 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 2101 caracteres · 80 controles · 699 nós · 3291 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3641c · 1042 ctl · 9847 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *2108 caracteres · 80 controles · 699 nós · 10248 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3641c* · 1042 ctl · 9418 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 51967 ms até a tela responder | aprovado | nenhum | — | chegou · 400c* · 3 ctl · 8839 ms · nenhum defeito novo |
| secretary | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 3142 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2361 ms · resta: 8 alvo <44px, 8 fonte <11px |
| secretary | Comunicação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *3628 caracteres · 1042 controles · 6793 nós · 58227 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3641c* · 1042 ctl · 6595 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 2706 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 279c* · 33 ctl · 9343 ms · resta: 1 alvo <44px, 2 fonte <11px |
| secretary | Chat coordenação | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *3628 caracteres · 1042 controles · 6793 nós · 10814 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3628c* · 1042 ctl · 4962 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1936 caracteres · 80 controles · 689 nós · 51882 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 2101c* · 80 ctl · 2419 ms · resta: 1 alvo <44px, 8 fonte <11px |
| secretary | Fotos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *3628 caracteres · 1042 controles · 6793 nós · 6394 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 3628c* · 1042 ctl · 6542 ms · resta: 1 alvo <44px, 8 fonte <11px |
| AEE | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 288 caracteres · 1 controles · 5 nós · 49724 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 8890c · 113 ctl · 7851 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | AEE | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 4919 caracteres · 53 controles · 347 nós · 2702 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 8890c · 113 ctl · 9261 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | Atividades | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *922 caracteres · 20 controles · 93 nós · 2973 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 135px; texto cortado sem rolagem em 1 elemento(s); 1 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1675c* · 27 ctl · 8798 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| AEE | Horários | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 180 caracteres · 1 controles · 6 nós · 51919 ms até a tela responder | aprovado | nenhum | — | chegou · 8890c · 113 ctl · 9536 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | Comunicados | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 4919 caracteres · 53 controles · 347 nós · 2935 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 4923c · 53 ctl · 10946 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | Escola & História | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *4815 caracteres · 51 controles · 341 nós · 3223 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 4923c* · 53 ctl · 8853 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 51839 ms até a tela responder | aprovado | nenhum | — | chegou · 400c* · 3 ctl · 9126 ms · nenhum defeito novo |
| AEE | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 51622 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 10850 ms · resta: 8 alvo <44px, 8 fonte <11px |
| AEE | Meu espaço | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *0 caracteres · 0 controles · 0 nós · 151309 ms até a tela responder | reprovado | medição não completou (medição travou: renderer não respondeu em 45000ms); a aba congela: nenhum comando do navegador recebe resposta | localizar o laço que bloqueia a thread principal (a tela não devolve o controle ao navegador) e limitar a renderização ao painel visível | parou em inicio · 8890c* · 113 ctl · 25802 ms · resta: parou em "inicio", 8 alvo <44px, 8 fonte <11px |
| AEE | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *256 caracteres · 19 controles · 84 nós · 36493 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 256c* · 19 ctl · 2579 ms · resta: 1 alvo <44px, 1 fonte <11px |
| AEE | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *8883 caracteres · 113 controles · 646 nós · 5064 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 8890c* · 113 ctl · 9771 ms · resta: 8 alvo <44px, 8 fonte <11px |
| Psicologia | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 552 caracteres · 18 controles · 45 nós · 2312 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1215c · 27 ctl · 7771 ms · resta: 8 fonte <11px |
| Psicologia | Psicologia | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 552 caracteres · 18 controles · 45 nós · 2906 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 1215c · 27 ctl · 8918 ms · resta: 8 fonte <11px |
| Psicologia | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *856 caracteres · 20 controles · 173 nós · 51970 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 1987c* · 28 ctl · 9076 ms · resta: 8 fonte <11px |
| multiprofessional | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 609 caracteres · 15 controles · 44 nós · 2906 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 609c · 15 ctl · 1642 ms · resta: 8 fonte <11px |
| multiprofessional | Multiprofissional | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 609 caracteres · 15 controles · 44 nós · 52503 ms até a tela responder | reprovado com ressalva | 8 controle(s) com fonte menor que 11 px | — | chegou · 609c · 15 ctl · 2899 ms · resta: 8 fonte <11px |
| multiprofessional | Chat interno | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *856 caracteres · 20 controles · 173 nós · 51982 ms até a tela responder | reprovado com ressalva | 1 controle(s) com área de toque menor que 44×44 px; 1 controle(s) com fonte menor que 11 px | — | chegou · 1888c* · 20 ctl · 9276 ms · resta: 8 fonte <11px |
| sports_operator | Início | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | 151 caracteres · 0 controles · 5 nós · 2247 ms até a tela responder | aprovado | nenhum | — | chegou · 151c · 0 ctl · 5529 ms · nenhum defeito novo |
| sports_operator | Notificações | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *145 caracteres · 2 controles · 10 nós · 3544 ms até a tela responder | aprovado | nenhum | — | chegou · 400c* · 3 ctl · 2968 ms · nenhum defeito novo |
| sports_operator | Conteúdos | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *1319 caracteres · 18 controles · 82 nós · 2623 ms até a tela responder | reprovado com ressalva | 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px | — | chegou · 1319c* · 18 ctl · 2634 ms · resta: 8 alvo <44px, 8 fonte <11px |
| sports_operator | Jogos escolares | abrir, renderizar conteúdo, caber em 390 px, alvos ≥44 px, fonte ≥11 px | *79661 caracteres · 208 controles · 3477 nós · 2715 ms até a tela responder | reprovado com ressalva | conteúdo do painel ultrapassa a largura em 61px; 8 controle(s) com área de toque menor que 44×44 px; 8 controle(s) com fonte menor que 11 px; 2 controle(s) sem rótulo acessível | — | chegou · 42985c* · 381 ctl · 2385 ms · resta: 8 alvo <44px, 8 fonte <11px, 2 sem rótulo |

### A.2 As 25 telas que congelavam a aba no build publicado — par publicado × reteste

Diário publicado: `audit-sweep-funcional.json` (164 visitas). Diário do build corrigido:
`audit-sweep-reteste.json` (164 visitas, as mesmas 164 combinações perfil×tela).
A correção **foi publicada** (deploy `76cc8f58`, conferência de 2026-10-15T11:16) — o HTML que o Worker serve hoje é
byte-idêntico ao local medido (3.330.710 caracteres dos dois lados,
`audit-publicacao.json`), com o `CACHE` do service worker subindo de `bfr-conecta-v33`
para `bfr-conecta-v34`; ver a seção G.

| Perfil | Tela | Observado (build publicado) | Correção aplicada no HTML local | Reteste (build corrigido) |
|---|---|---|---|---|
| teacher | Agenda de hoje | **trava** (morto) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | chegou · 5330c* · 129 ctl · 9471 ms · nenhum defeito novo |
| teacher | Planejamento | **trava** (morto) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | chegou · 5330c* · 129 ctl · 9137 ms · nenhum defeito novo |
| teacher | Notificações | **trava** (morto) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | chegou · 5330c* · 129 ctl · 9492 ms · nenhum defeito novo |
| student | Início | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 1287c · 68 ctl · 7683 ms · resta: 6 fonte <11px |
| student | Aprender | **trava** (Page.navigate não respondeu em 20000ms) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | parou em inicio · 1287c* · 68 ctl · 33911 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Evoluir | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | parou em inicio · 1287c* · 68 ctl · 33792 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Escola | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | parou em inicio · 1287c* · 68 ctl · 27162 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Meu espaço | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | parou em inicio · 1287c* · 68 ctl · 34088 ms · resta: parou em "inicio", 6 fonte <11px |
| student | Notificações | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 400c* · 3 ctl · 9043 ms · nenhum defeito novo |
| student | Conteúdos | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 1319c* · 18 ctl · 9389 ms · resta: 8 alvo <44px, 8 fonte <11px |
| student | Escola & História | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 45176c* · 68 ctl · 9796 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Notas | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 183c · 0 ctl · 9659 ms · nenhum defeito novo |
| student | Agenda | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 393c · 4 ctl · 9990 ms · resta: 4 texto cortado, 4 fonte <11px |
| student | Atividades | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 1675c* · 27 ctl · 8788 ms · resta: estouro interno 135px, 1 texto cortado, 1 alvo <44px |
| student | Horários | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 655c · 3 ctl · 9663 ms · resta: 1 alvo <44px |
| student | Jogos | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 467c · 10 ctl · 9830 ms · resta: 8 fonte <11px |
| student | Jogos escolares | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 45196c* · 68 ctl · 7239 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Vídeos aprender | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 45044c* · 68 ctl · 3943 ms · resta: 3 alvo <44px, 8 fonte <11px |
| student | Comunicados | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 36c · 0 ctl · 9927 ms · resta: estado vazio |
| student | Biblioteca | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 40423c* · 294 ctl · 9769 ms · resta: estouro interno 325px, 1 alvo <44px, 8 fonte <11px |
| student | Boletim | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 183c · 0 ctl · 2427 ms · nenhum defeito novo |
| student | Resultados e aprendizagem | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | C+D — teto de 30 s na reentrada do boot do espaço do aluno (`state.tentouEm`), que impede o `refresh()` de se re-agendar para sempre enquanto o dado não chega a `loaded` | chegou · 1780c* · 18 ctl · 10058 ms · resta: 8 fonte <11px |
| AEE | Meu espaço | **trava** (a aba não respondeu em 5 avaliações segu) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | parou em inicio · 8890c* · 113 ctl · 25802 ms · resta: parou em "inicio", 8 alvo <44px, 8 fonte <11px |
| Portaria | Início | **trava** (visita monitor/inicio não respondeu em 2) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | chegou · 2979c · 39 ctl · 28058 ms · resta: 1 texto cortado, 4 alvo <44px, 8 fonte <11px |
| gatekeeper | Portaria QR | **trava** (morto) · 0c · 0 ctl | A+B — fim da escrita de texto idêntica no KPI da Direção e coalescência (`setTimeout 0` + trava `repassando`) no callback do `MutationObserver` do appShell | chegou · 1677c · 29 ctl · 2577 ms · resta: 4 alvo <44px, 8 fonte <11px, 6 sem rótulo |

### A.3 Regressão: os mesmos critérios medidos nos dois builds

Contagem de **telas** (não de ocorrências) sobre as 164 visitas de cada diário.

| Critério | Build publicado | Build corrigido | Variação |
|---|---|---|---|
| aba congela (mudez confirmada pela sonda) | 25 | 0 | −25 |
| visita que não completou (erro do instrumento) | 23 | 0 | −23 |
| navegação não chegou na seção pedida | 4 | 9 | +5 |
| tela em branco (0 caracteres) | 6 | 1 | −5 |
| lista montada, estado vazio (sem registros para a conta) | 0 | 1 | +1 |
| rolagem horizontal na página inteira | 5 | 0 | −5 |
| conteúdo do painel estoura a largura | 11 | 10 | −1 |
| texto cortado sem rolagem | 14 | 17 | +3 |
| alvo de toque menor que 44×44 px | 73 | 85 | +12 |
| fonte menor que 11 px | 67 | 88 | +21 |
| controle sem rótulo acessível | 25 | 21 | −4 |
| erro de console | 0 | 0 | igual |

* Mediana de `ms` até a tela responder: publicado 6361 ms (163 visitas cronometradas) → corrigido 4530 ms (164); máximo 168610 → 50421 ms. No reteste toda visita cronometrou; no publicado, 1 não chegaram a cronometrar porque a aba já tinha morrido.
* Congelamentos: 25 → 0. Telas que **não** travavam e passaram a travar no build corrigido: 0.
* Nível de medição no reteste: completa: 164; tentativas por visita: 1 tentativa(s): 164 (nenhuma visita precisou reiniciar o navegador).
* `*` = a linha não tem seletor de painel no inventário de alvos (`audit-targets.json`), então o que está contado é o container da view inteira (`.content:not(.hidden)`), não o painel daquela aba. Comparar esses números entre abas do mesmo perfil não é comparação.

As 9 telas que ainda marcam "não chegou" no reteste têm duas naturezas, e a
distinção é a do rig (a chegada exige `view === papel`):

* 4 são armadilha do critério, **não** da tela: a seção pedida está ativa e visível
(`coordinator/AEE → seção ok, view aee, director/AEE → seção ok, view aee, admin/Coordenação → seção ok, view coordinator, admin/AEE → seção ok, view aee`) — o app leva o perfil ao espaço compartilhado de outra view.

* **5 param em Início com a view certa**: student/Aprender, student/Evoluir, student/Escola, student/Meu espaço, AEE/Meu espaço — o painel que fica na tela é o de **Início** (1287c, 1287c, 1287c, 1287c, 8890c). 5 delas apareciam antes como "trava" no build publicado: a aba morria antes de a chegada ser testada. Não é regressão do patch — é o mesmo defeito, agora visível. As 5 são áreas do módulo de plataforma e a causa está no código, com duas naturezas:
  * **4 fora do alcance da identidade de auditoria** (student/Aprender, student/Evoluir, student/Escola, student/Meu espaço): `BFRPlatform.open()` (index.html:12186) só abre para `role()` = `parent`/`student`, e `role()` lê o papel **real** da conta, não a view escolhida por `setRole()` (index.html:8617) — a conta sintética é `developer`. Para um aluno real a tela provavelmente abre; **não dá para afirmar nem com o rig nem por dedução**, e o brief exige: *"Se a autenticação exigir uma senha, código ou confirmação que não esteja disponível, solicite ao responsável que realize o login ou forneça um mecanismo autorizado de acesso temporário."*
  * **1 porta fechada por construção** (AEE/Meu espaço): `roleSectionAccess.aee` (index.html:7742) anuncia `meu-espaco` e o roteador entrega ao módulo de plataforma (index.html:8749-8752), cujo guard rejeita `aee` — o `return false` é silencioso, sem aviso e sem mudar a navegação. **Qualquer** conta real do perfil AEE clicaria numa entrada de menu que não faz nada: é o "botão que só anima" do brief. Sem correção aplicada (ver F.9).

## B. Telas por largura (mobile-first e web)

| Largura | Telas medidas | travadas | em branco | estado vazio | estouro da página | estouro do painel | alvos <44px | fonte <11px | texto cortado | sem rótulo | erro de console |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 320px | 164 | 0 | 0 | 0 | 0 | 14 | 60 | 58 | 16 | 27 | 0 |
| 360px | 164 | 0 | 0 | 1 | 0 | 19 | 85 | 85 | 17 | 26 | 0 |
| 375px | 164 | 0 | 0 | 1 | 0 | 19 | 85 | 87 | 16 | 27 | 0 |
| 390px | 164 | 21 | 6 | 0 | 5 | 11 | 73 | 67 | 14 | 25 | 0 |
| 430px | 164 | 0 | 0 | 1 | 0 | 17 | 89 | 88 | 17 | 27 | 0 |
| 768px | 164 | 0 | 0 | 1 | 0 | 3 | 84 | 92 | 8 | 26 | 0 |
| 1024px | 164 | 0 | 0 | 1 | 0 | 0 | 156 | 89 | 17 | 26 | 0 |
| 1280px | 164 | 0 | 0 | 1 | 0 | 0 | 155 | 89 | 16 | 26 | 0 |
| 1440px | 164 | 0 | 0 | 1 | 0 | 0 | 156 | 88 | 12 | 26 | 0 |
| 1920px | 164 | 0 | 0 | 1 | 0 | 0 | 156 | 89 | 13 | 25 | 0 |

**Leitura obrigatória desta tabela na banda web** (diário `audit-tarjas-web.json`, recalculado de
`audit-sweep-web.json` por `recalcula-tarjas-web.mjs`, 2026-10-15T01:58, 323 linhas em 1024/1280 px):
260 de 323 linhas (80%) **não mediram a tela** — 208 sem alvo declarado no inventário e 52 com alvo que não resolveu; o que foi contado nelas é o container da view ativa inteira. Só 63 mediram no alvo. As colunas de `alvos <44px`, `fonte <11px` e afins somam **dentro do container medido**, então em 260 linhas elas descrevem a view, não a aba. Detalhe em F.16 (a passada web ainda roda: 323 linhas no instante da recomputação de tarjas, 01:58 UTC; 656 no instante deste relatório).

## C. Provas de botão (clique real, efeito medido)

**Esta seção é a passada de 14/10, superada pela seção I.** Ela mediu 148 cliques com o
`audit-clicks.mjs`, que (a) tarjava como escrita todo `<button>` sem atributo `type` — o `el.type` do
HTML devolve `submit` nesse caso — e (b) esperava 1 100 ms no passo de 2 000 ms, então um `morto` daqui
pode ser o loader ainda rodando. Leia as duas listas com essa lente; a passada com firewall, autoteste e
prova de egresso SQL está na seção I.

Cada linha do diário é um clique do navegador (`Input.dispatchMouseEvent`, com hit-test) seguido de
assinatura do DOM, rede e console. Resultados: `efeito` = a tela mudou; `navegou` = trocou de seção;
`dialogo` = abriu alerta/confirmação; `morto` = nada aconteceu; `coberto` = outro elemento estava por
cima do alvo; `GRAVOU` = houve requisição de escrita (estouraria a política de teste).

| Resultado | Cliques |
|---|---|
| fora_da_tela | 65 |
| efeito | 15 |
| navegou | 13 |
| sumiu | 12 |
| morto | 12 |
| efeito_mut | 11 |
| ignorado_escrita | 9 |
| coberto | 7 |
| ignorado_permicao_browser | 2 |
| desabilitado | 1 |
| GRAVOU | 1 |

Total no diário: 148 cliques.

### C.2 A causa medida das telas que congelam (contagem de mutações, não opinião)

Em `probe-mut.mjs` o `MutationObserver` nativo é embrulhado **antes** de qualquer script do app rodar
(`Page.addScriptToEvaluateOnNewDocument`) e cada callback é contado por rótulo; quando a aba congela,
`Debugger.pause` interrompe o laço e os contadores são lidos com o renderer parado. O que segue é a
contagem de uma única abertura de tela, em ~8 segundos:

* **student/notas · producao** — 167611 disparos de callback, 3010 nós na página, 43 callbacks registrados, medidos na cauda da abertura (1 s: 966 → 2063 nós, **+1097 nós/s** e 961 disparos/s). Desse crescimento, o que o `probe-mut` consegue creditar a um callback de observer é **114 nós** — o resto nasce fora de qualquer `MutationObserver` embrulhado (timer, `setTimeout`, `requestAnimationFrame` ou handler de evento), que é exatamente onde este instrumento é cego por construção (item 9 das armadilhas do rig).

* **student/notas · depois** — 75910 disparos de callback, 18093 nós na página, 45 callbacks registrados, medidos na cauda da abertura (7 s: 17677 → 18089 nós, **+58.9 nós/s** e 640 disparos/s). Desse crescimento, o que o `probe-mut` consegue creditar a um callback de observer é **349 nós** — o resto nasce fora de qualquer `MutationObserver` embrulhado (timer, `setTimeout`, `requestAnimationFrame` ou handler de evento), que é exatamente onde este instrumento é cego por construção (item 9 das armadilhas do rig).

* **student/notas · depois-patches** — 7434 disparos de callback, 11895 nós na página, 45 callbacks registrados, medidos na cauda da abertura (7 s: 11895 → 11895 nós, **0 nós/s** e 40 disparos/s). A página não ganha nós (346 atribuídos aos callbacks em 7 s): o que roda é **rotação** — entra e sai — e não vazamento.
  Na primeira medida, quem mais escrevia: `ensure :: function ensure() { const admin = document.getElementById('adminView'); if (!admin || !isDeveloper() || admin.` — 92 escritas em 4630 passadas (15 só de texto).

* **teacher/professor-agenda-hoje · producao** — 96529 disparos de callback, 10433 nós na página, 48 callbacks registrados, medidos na cauda da abertura (4 s: 965 → 6667 nós, **+1425.5 nós/s** e 2325 disparos/s). Desse crescimento, o que o `probe-mut` consegue creditar a um callback de observer é **298 nós** — o resto nasce fora de qualquer `MutationObserver` embrulhado (timer, `setTimeout`, `requestAnimationFrame` ou handler de evento), que é exatamente onde este instrumento é cego por construção (item 9 das armadilhas do rig).

* **teacher/professor-agenda-hoje · depois** — 7348 disparos de callback, 16044 nós na página, 48 callbacks registrados, medidos na cauda da abertura (7 s: 16044 → 16044 nós, **0 nós/s** e 29 disparos/s). A página não ganha nós (346 atribuídos aos callbacks em 7 s): o que roda é **rotação** — entra e sai — e não vazamento.
  Na primeira medida, quem mais escrevia: `anon :: function () { patchWeatherCard(); const panel = document.getElementById('bfrDirectionPanel'); if (panel) { aud` — 4490 escritas em 2499 passadas (4487 só de texto).
  Na última, o maior escritor passou a ser `ensure :: function ensure() { const admin = document.getElementById('adminView'); if (!admin || !isDeveloper() || admin.` — 92 escritas em 173 passadas. A guarda desse callback é `isDeveloper()`: com a conta sintética da auditoria (papel `developer`) ele escreve; um aluno real passa pelo guard e não escreve — essa parte do custo é da identidade medida, não da tela (ver F.8).

* **student/meu-espaco · depois-patches** — 84254 disparos de callback, 19475 nós na página, 45 callbacks registrados, medidos na cauda da abertura (7 s: 19055 → 19471 nós, **+59.4 nós/s** e 646 disparos/s). Desse crescimento, o que o `probe-mut` consegue creditar a um callback de observer é **296 nós** — o resto nasce fora de qualquer `MutationObserver` embrulhado (timer, `setTimeout`, `requestAnimationFrame` ou handler de evento), que é exatamente onde este instrumento é cego por construção (item 9 das armadilhas do rig).
  Na primeira medida, quem mais escrevia: `ensure :: function ensure() { const admin = document.getElementById('adminView'); if (!admin || !isDeveloper() || admin.` — 92 escritas em 2102 passadas (15 só de texto).

Consequência no app publicado: um único callback do patch da Direção reescrevia o texto de um KPI com
`small.textContent = small.textContent.replace(/…/, m => m)` — o `replace` devolve o mesmo texto, mas o
setter **sempre** troca o nó de texto; o observador de `childList` do `appShell` re-dispara o callback,
que re-escreve, sem fim. A aba para de responder a qualquer comando do navegador. Em uma tela do
professor foram contadas 4.487 escritas de texto nesse laço.

## D. Autorização por perfil (o que o banco permite, não o que o botão esconde)

* Tabelas do schema público sem RLS: 0
* Tabelas com RLS mas sem nenhuma policy (nega tudo): 0
* Policies **sem nenhum filtro** (SELECT/DELETE sem USING, INSERT/UPDATE sem WITH CHECK): 0
* Policies alcançáveis com a chave pública do projeto (roles `public`/`anon`): 38
* Funções executáveis por anon: 56 — das quais 15 sem verificação de sessão no corpo

Policies sem filtro:


Funções alcançáveis por anon sem checar sessão no corpo:

* `bfr_collab_can_profile`((uuid)
* `bfr_collab_comment_notification_trigger`(()
* `bfr_collab_is_manager`(()
* `bfr_collab_is_staff`(()
* `bfr_literacy_staff`(()
* `bfr_prevent_duplicate_grade`(()
* `bfr_psychology_schedule_guard`(()
* `bfr_staff_can_message_recipient`((uuid)
* `bfr_staff_is_manager`(()
* `bfr_subject_matches`((text,text)
* `bfr_touch_updated_at`(()
* `family_cpf_is_valid`((text)
* `family_normalize_cpf`((text)
* `family_normalize_name`((text)
* `sports_touch_updated_at`(()

### D.2 Matriz de autorização pelo papel real do banco (`account_role`)

O sujeito da autorização não é o rótulo do seletor: `current_role()` devolve o enum
`account_role`. Medido em 411 policies
(papel=371, vinculo=36, expressao=4).

| Papel | Tabelas que lê | Tabelas que escreve |
|---|---|---|
| `developer` | 129 | 130 |
| `coordinator` | 105 | 90 |
| `director` | 103 | 86 |
| `aee` | 74 | 56 |
| `pedagogical` | 74 | 51 |
| `secretary` | 58 | 47 |
| `social_work` | 14 | 14 |
| `psychology` | 16 | 13 |
| `student` | 14 | 4 |
| `monitor` | 16 | 4 |
| `parent` | 14 | 3 |
| `pending` | 0 | 1 |
| `gatekeeper` | 13 | 1 |

Papéis que o seletor oferece mas **não existem** no enum: `teacher`, `admin`, `multiprofessional`, `sports_operator`.
Nem todo esse nome é uma promessa de acesso: só os que estão em **contexto de papel**
(`sports_role_allowed(ARRAY[…])`, `…role… = | in | = any`) autorizam alguma coisa. O literal
`'teacher'` que aparece em `bfr_lesson_attendance_*` e `bfr_psychology_articulations_*` é **valor de
coluna** (`source = 'teacher'`, `articulation_type <> 'teacher'`), e a comparação de papel ao lado dele
é `current_role() = 'pedagogical'` — não é código morto. Nome morto de verdade:
`sports_operator`.

* `sports_operator` — funções `sports_rebuild_standings [role_allowed(array['developer','director','coordinator','sports_operator']]`, `sports_record_event [role_allowed(array['developer','director','coordinator','sports_operator']]`, `sports_set_match_status [role_allowed(array['developer','director','coordinator','sports_operator']]`; policies `sports_athletes/sports_athletes_read:SELECT [role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'secretary'::text, 'pedagogical'::text, 'ae]`, `sports_match_events/sports_match_events_read:SELECT [role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'sports_operator'::text]]`, `sports_matches/sports_matches_read:SELECT [role_allowed(ARRAY['developer'::text, 'director'::text, 'coordinator'::text, 'secretary'::text, 'pedagogical'::text, 'ae]`

* Policies abertas (`USING (true)`, qualquer perfil autenticado lê): nenhuma

Tamanho medido do que isso expõe hoje — um login de aluno, responsável ou porteiro lê:

| Tabela | Registros líveis | Campos de pessoa/nome |
|---|---|---|
| `bfr_subjects` | 11 | name, normalized_name |
| `bfr_teacher_directory` | 35 | profile_id, source_name, display_name, normalized_name |
| `sports_brackets` | 0 | round_name |
| `sports_championships` | 0 | name |
| `sports_match_statistics` | 0 | athlete_id |
| `sports_standings` | 0 | — |
| `sports_teams` | 0 | name |


**O nome morto tinha duas metades; as duas foram, em dias diferentes.** Diário do LOTE 1: `audit-papel-sports-lote1.json` (`preflight-papeis.mjs --apply --so-lote1`, HTTP 201 em 2026-10-15T01:19); diário da conferência do LOTE 2: `audit-lote2-confere.json` (`sql-confere-lote2.sql`, só catálogo).

* **LOTE 1 — APLICADO 14/10 22:18**: `alter type public.account_role add value if not exists 'sports_operator'`. O cast para `'sports_operator'::account_role` passa a ser aceito (`enumAceitaCast=true`) e o enum tem 14 rótulos: `pending`, `parent`, `student`, `pedagogical`, `developer`, `monitor`, `gatekeeper`, `coordinator`, `secretary`, `aee`, `director`, `psychology`, `social_work`, `sports_operator`.
* **LOTE 2 — APLICADO 15/10**: o `CHECK` de `profiles` (`profiles_role_allowed`) repete a lista do enum **à mão**, então o `add value` sozinho não relaxa nada — a sonda do LOTE 1 gravou exatamente isso (`checkAindaRecusa=true`, erro `23514` na constraint `t_probe_1_role_check`, que é uma `create temp table` recebendo a definição viva copiada do catálogo, `preflight-papeis.mjs:115-118`, ou seja o que ela recusa é o que `profiles` recusaria). O `drop constraint` + `add constraint` rodou com o portão livre e a conferência por catálogo lê hoje `14` rótulos, o `CHECK` vivo com `sports_operator` incluído (true) e `0` conta(s) com o papel em 28 perfis.
* **Prova sem deixar dado**: `sql-prova-lote2-rollback.sql` (`begin` → `savepoint` → grava `sports_operator` na conta sintética → `rollback`) devolve `contas_com_papel_depois_do_rollback = 0` (`probe-corpos-4-funcoes.json`) — o `CHECK` aceita o rótulo e a escola continua com nenhuma conta de operador, que é o estado de partida da tarefa #48.
* Por que uma metade esperou: o LOTE 2 toma **ACCESS EXCLUSIVE em `profiles`**, e no instante do LOTE 1 havia 1 varredura viva (`"C:\Program Files\nodejs\node.exe" audit-sweep2.mjs --modo=web`). O passo estava armado como `ddl-papel-sports` no driver (`roda-medicao-publicada.mjs:81`), com portão que olha **processo**, não porta — o log dele registrou `varredura viva=true` em todo ciclo até a passada de #55/#48 fechar. **Em 15/10 os dois motoristas foram aposentados** e o LOTE 2 foi aplicado à mão, na janela sem medição; o motor vivo (`roda-remedida-alvos.mjs`) não toca no banco.


**Do lado do app, o mesmo nome ainda não tem tela** (diário `audit-sports-operator.json`, lido do diário web): 4 visitas de `sports_operator` (`inicio`, `notificacoes`, `conteudos`, `jogos-escolares` @1024) e **todas** caíram em `view=admin` — o papel não tem `#…View` própria, então `setRole('sports_operator')` deixa a view de `admin` na tela. O painel medido vai de 1319c a 153578c, com alvo declarado em 1 linha(s) e usado em 1: as demais mediram o despejo da view inteira, não uma tela. `teacher` (44 linhas, view teacher) e `multiprofessional` (5 linhas, view multiprofessional) **têm** view própria; `admin` (52 linhas, views admin/coordinator/aee) é view, não papel. **Isto era** o estado do diário web: dar view ao `sports_operator` foi a tarefa #48, aplicada e publicada no shell `bfr-conecta-v34` — o antes/depois medido está em H.6, e o que continua aberto é a ausência de conta real com o papel (`contas_com_papel=0`), que deixa a prova no seletor de preview.


### D.3 Pré-voz das três correções de autorização — aplicadas em 2026-10-14

As três foram medidas antes (pré-voz) e **aplicadas** depois de OK explícito, na mesma data. O texto
abaixo é a medição do pré-voz; a conferência do que o banco devolve **com a correção valendo** está em
D.5. O canal usado é o do painel (`api.supabase.com`), e toda impersonação de papel roda dentro de
`begin; … rollback;` (`set local role authenticated` + `request.jwt.claims`) — nenhuma consulta de
medição escreve.

**1) As 7 policies `SELECT … USING (true)`** (bfr_subjects, bfr_teacher_directory, sports_brackets, sports_championships, sports_match_statistics, sports_standings, sports_teams).
Tamanho real: `bfr_teacher_directory`=35, `bfr_subjects`=11, `bfr_schedule_entries`=594, `bfr_schedule_versions`=1, `sports_teams`=0, `sports_brackets`=0, `sports_standings`=0, `sports_championships`=0, `sports_match_statistics`=0.
Do diretório, 34 de 35 linhas não têm `profile_id`: um filtro
pelo dono da linha não mostraria quase nada a ninguém — o que faz o professor ver a própria disciplina é
o `EXISTS` sobre a grade. E nenhuma outra policy do schema cita `bfr_teacher_directory` ou
`bfr_subjects` no `USING`/`WITH CHECK` (0 linhas na medida 8 do pré-voz),
então estreitar as 7 não muda a predicate de terceiros.
Estreitar não pode quebrar a grade de quem tem direito a ela; por isso a predicate nova usa `EXISTS`
sobre `bfr_schedule_entries`, avaliado SOB a RLS da entrada. Papel por papel:


| Papel | `is_staff` | gestor da grade | diretório hoje → depois | disciplinas hoje → depois | grade hoje → com nome depois |
|---|---|---|---|---|---|
| `aee` | true | false | 35 → 35 | 11 → 11 | 0 → 0 |
| `coordinator` | false | true | 35 → 35 | 11 → 11 | 594 → 594 |
| `developer` | true | true | 35 → 35 | 11 → 11 | 594 → 594 |
| `director` | false | true | 35 → 35 | 11 → 11 | 594 → 594 |
| `gatekeeper` | false | false | 35 → 0 | 11 → 0 | 0 → 0 |
| `monitor` | false | false | 35 → 0 | 11 → 0 | 0 → 0 |
| `parent` | false | false | 35 → 0 | 11 → 0 | 0 → 0 |
| `pedagogical` | true | false | 35 → 35 | 11 → 11 | 10 → 10 |
| `psychology` | false | false | 35 → 0 | 11 → 0 | 0 → 0 |
| `secretary` | false | true | 35 → 35 | 11 → 11 | 594 → 594 |
| `social_work` | false | false | 35 → 0 | 11 → 0 | 0 → 0 |
| `student` | false | false | 35 → 10 | 11 → 10 | 22 → 22 |

Perfil por perfil, só as contas que têm vínculo real (o caso que importa para aluno/responsável):

| Papel | filhos vinculados | nomes na grade antes → depois | resultado |
|---|---|---|---|
| `parent` | 0 | 0 → 0 | mantém ou ganha |
| `parent` | 0 | 0 → 0 | mantém ou ganha |
| `parent` | 0 | 0 → 0 | mantém ou ganha |
| `parent` | 0 | 0 → 0 | mantém ou ganha |
| `student` | 1 | 21 → 22 | mantém ou ganha |
| `student` | 0 | 0 → 0 | mantém ou ganha |
| `student` | 1 | 20 → 22 | mantém ou ganha |
| `student` | 1 | 20 → 22 | mantém ou ganha |
| `student` | 0 | 0 → 0 | mantém ou ganha |

Contas que perderiam nome na grade: **0**. Os 3 alunos com vínculo passam
de 20–21 para 22/22/22 nomes — o `EXISTS` é mais
largo que o caminho de hoje, não mais estreito. Perda real: `monitor`, `psychology`, `social_work` e
`gatekeeper` deixam de listar o diretório inteiro (35 → 0), e a
varredura do código mostra que nenhum dos quatro consulta essa tabela: os leitores diretos medidos no
`index.html` são secretary/developer (`21803`, gate `['secretary','developer']`), pedagogical/aee
(`7809`, `canLinkTeacher`), coordinator/director/developer (`13578`) e director/developer (`25036`,
`allowedRoles`) — todos continuam lendo os 35 registros.
**Limitação honesta:** 4 contas de `parent` no banco têm
**zero filhos** em `guardian_students`, então o responsável com dado real continua sem prova.


**2) `sports_public_*`: a view fura a RLS.** `pg_class` mostra as 5 views com `relkind='v'` e dono
`postgres`, e `pg_roles` dá `rolbypassrls = true` a esse dono; o `relacl` delas tem `SELECT to anon`.
View comum executa o scan da tabela-base com os privilégios do dono, então a policy nova não vale por
ela — e é por ela que o app lê (`index.html:19805-19807). Fechar `sports_teams_read` sozinho é
decorativo. `sql-fechar-views-sports.sql` faz `revoke … from anon, public` e põe o filtro de papel
dentro da view, espelhando as listas que a policy da própria tabela-base já usa. Validado em transação
desfeita (`validar-views-sports.mjs`): com o DDL aplicado, anon recebe
`permission denied for view sports_public_teams` e os papéis leem as 5 views sem erro de predicate;
depois do rollback o `SELECT to anon` volta — nada ficou no banco.

**3) `bfr_resolve_communication_recipients`: a terceira operação aberta.** SECURITY DEFINER, corpo de
3.039 caracteres sem nenhuma referência a `auth.uid()` e sem `raise` (medido no catálogo), executável
por `authenticated`. Por impersonação, o que cada papel resolve com `p_group_types='{all}'`:

| Papel | destinatários hoje | com o guard |
|---|---|---|
| `aee` | 26 | 26 |
| `coordinator` | 26 | 26 |
| `developer` | 26 | 26 |
| `director` | 26 | 26 |
| `gatekeeper` | 26 | 0 — fechado |
| `monitor` | 26 | 0 — fechado |
| `parent` | 26 | 0 — fechado |
| `pedagogical` | 26 | 26 |
| `psychology` | 26 | 26 |
| `secretary` | 26 | 26 |
| `social_work` | 26 | 26 |
| `student` | 26 | 0 — fechado |

O guard nega exatamente `gatekeeper`, `monitor`, `parent`, `student` e não muda nada para os papéis do
único chamador medido no app (composer do módulo multiprofissional, gate
`['psychology','social_work','developer']` em `index.html:19891`, chamada em `20030`). Não virou
`SECURITY INVOKER`: `psychology` lê 12 perfis pela RLS de `profiles` contra
26 que a função resolve hoje — o composer monta grupos a partir da
tabela inteira, e invoker encolheria o envio em silêncio.


**4) O que está nos arquivos é exatamente o que foi medido** (`confere-arquivos-sql.mjs`, 2026-10-14, sem nenhuma
escrita no banco). Não basta medir uma predicate e depois pedir OK sobre outro texto:

* `sql-fechar-leituras-abertas.sql` — 3526 chars, 7 pares drop/create que cobrem 7/7
  policies medidas abertas, nenhuma a mais (nenhuma fora), todas com
  `for select to authenticated`. O bloco `USING` das duas tabelas com dado real é **idêntico**, token por token,
  ao que `preflight-impersonacao.mjs` avaliou (descartado só o alias `d`/`s`): diretório
  `true`, disciplinas `true`. Nenhum `grant`,
  `revoke`, `alter` ou escrita escondida (0 linhas). No catálogo, as 7
  seguem com `qual = true` — o arquivo não foi aplicado.
* `sql-fechar-views-sports.sql` — 4741 chars, 5 views no arquivo — as mesmas medidas em catálogo (`true`), com 5 `revoke … from anon, public` e 1 `grant select … to authenticated`.
  O `validar-views-sports.mjs` que produziu o teste de rollback aplica o corpo lido do próprio arquivo
  (`readFileSync` + `split('begin;')` = `true`), então a validação é do artefato, não de uma cópia.
* `sql-fechar-oraculo-comunicacao.sql` — 6373 chars. O corpo guardado com o qual o antes/depois por papel foi
  medido (`rpc-corpo-guardado.txt`, 2976 chars normalizados) está **literalmente dentro** do arquivo
  (`true`), com o gate presente e os dois comandos de ACL nomeando a função.

Conferência feita **antes** de aplicar: `confere-sem-echo.sql` devolvia `guard_ja_aplicado: false` e
`select_abertas_agora: 7`, e as 7 policies do patch ainda tinham `qual = true` — nada havia sido
escrito quando o pré-voz foi medido. O estado do banco **depois** de aplicar está em D.5.


### D.5 O que o banco devolve COM as quatro correções valendo

Aplicadas em 2026-10-14 com OK explícito, na ordem (c) → (d) → (b) → (e). Cada linha abaixo é o
mesmo instrumento do pré-voz, só que medindo a policy/função **real** do catálogo — não a cópia da
predicate. Os diários são `audit-aplicado-*.json`.

**(c) oráculo de suporte — `bfr_support_request_matches`.** A chamada que antes devolvia `200 / false`
sem nenhum login agora é recusada no plano de dados: HTTP 401 —
"permission denied for function bfr_support_request_matches". O catálogo dá `anon_executa=false`,
`authenticated_executa=true` e a função impersonada como `authenticated` continua executando
(devolve false). O total de funções do schema
public ainda executáveis por `anon` caiu de 57 para **56** — exatamente esta.
As 6 policies que a citam no `USING` rodam como `authenticated` e não foram tocadas.

**(d) as 5 `sports_public_*`.** Nenhuma delas tem mais `SELECT` para `anon` (athletes, match_events, matches, schools, teams → `anon_ainda_tem_select=false`),
anon por REST leva HTTP 401 — "permission denied for view sports_public_teams", e a projeção de cada view
**não perdeu coluna**: athletes 6→6 ok, match_events 10→10 ok, matches 17→17 ok, schools 4→4 ok, teams 9→9 ok.
12 papéis (uma conta viva de cada papel presente em `profiles`) leram as 5 views dentro da própria sessão sem erro de predicate, todos devolvendo
0/0/0/0/0 — as tabelas-base continuam com 0 linhas, então **fechar a view não esvaziou tela nenhuma**.

**(b) as 7 `SELECT … USING (true)`.** Policies abertas no schema inteiro: **0** (eram 7 no pré-voz).
Papel por papel, o que a policy real entrega hoje, comparado ao que o pré-voz previu:
12 de 12 papéis batem exatamente. Nenhum divergiu. 

| Papel | diretório (previsto) | disciplinas (previsto) | grade com nome |
|---|---|---|---|
| `aee` | 35 (35) | 11 (11) | 0 |
| `coordinator` | 35 (35) | 11 (11) | 585 |
| `developer` | 35 (35) | 11 (11) | 585 |
| `director` | 35 (35) | 11 (11) | 585 |
| `gatekeeper` | 0 (0) | 0 (0) | 0 |
| `monitor` | 0 (0) | 0 (0) | 0 |
| `parent` | 0 (0) | 0 (0) | 0 |
| `pedagogical` | 35 (35) | 11 (11) | 10 |
| `psychology` | 0 (0) | 0 (0) | 0 |
| `secretary` | 35 (35) | 11 (11) | 585 |
| `social_work` | 0 (0) | 0 (0) | 0 |
| `student` | 10 (10) | 10 (10) | 21 |

Conta por conta de aluno/responsável — a medição roda **dentro da sessão** do perfil, que é o que a
varredura de tela faz (a primeira versão desta consulta contou fora da sessão e devolveu 585 para todas
as contas; refiz):

| Papel | filhos | nomes na grade antes → depois | diretório hoje | disciplinas hoje |
|---|---|---|---|---|
| `parent` | 0 | 0 → 0 | 0 | 0 |
| `parent` | 0 | 0 → 0 | 0 | 0 |
| `parent` | 0 | 0 → 0 | 0 | 0 |
| `parent` | 0 | 0 → 0 | 0 | 0 |
| `student` | 1 | 21 → 21 | 10 | 10 |
| `student` | 0 | 0 → 0 | 0 | 0 |
| `student` | 1 | 20 → 20 | 9 | 10 |
| `student` | 1 | 20 → 20 | 9 | 10 |
| `student` | 0 | 0 → 0 | 0 | 0 |

Contas que perderam nome: **0**. Correção honesta ao pré-voz: para as 3 contas de aluno com grade própria ele previa
21→22, 20→22, 20→22 (isto é, de +1 a +2 nomes por conta); o banco, com a policy real já aplicada, devolve
21→21, 20→20, 20→20 — **os mesmos números de antes**, ninguém ganha e ninguém perde nome. O acréscimo previsto
era artefato do modelo que escrevi à mão no pré-voz, não da predicate que foi ao ar. Como anon, as duas tabelas com dado
real devolvem HTTP 200 com **0 linhas** (a RLS nega; não há vazamento anônimo).

**(e) `bfr_resolve_communication_recipients`.** O corpo tem 2939 caracteres, `prosecdef=true`,
e agora **cita `auth.uid()` (true) com o gate presente (true)**. Chamando a função real papel por papel com
`p_group_types='{all}'`: 12 de 12 papéis batem com a previsão — continuam resolvendo
aee, coordinator, developer, director, pedagogical, psychology, secretary, social_work; o guard fechou
**gatekeeper, monitor, parent, student** (4 → gatekeeper, monitor, parent, student resolverem 0). Anon por RPC: HTTP 401 — "permission denied for function bfr_resolve_communication_recipients".
A lista de grantees de `EXECUTE` não cresceu com o meu `grant`: os 15 papéis nomeados já estavam
registrados no pré-voz (`audit-preflight-leituras.json`, consulta 10); o que saiu dela foi `anon`/`public`.

**Reversão, ao alcance da mão:** os 7 `USING (true)` literais estão em `backup-all-policies-2026-10-13.sql`
(7 policies recriadas hoje, uma por linha no diário); o corpo original da função de
destinatários está em `rpc-corpo.txt`; e as views voltam com `grant select on <view> to anon, public` + os
5 `create or replace view` de projeção pura que a consulta 9 gravou.

## E. Correções aplicadas durante a auditoria

Nada nesta seção é afirmado por memória: cada linha é uma consulta ao banco vivo ou uma contagem no
`index.html` que o harness serve, executada por `audit-patches-aplicados.mjs` em
2026-10-14 (HTML de 3329418 caracteres).

| # | Correção | Onde | Como foi verificada agora | Medido | |
|---|---|---|---|---|---|
| 1 | policy grades_staff_update | banco | pg_policies por nome | 0 | confirmado |
| 2 | escrita da grade guardada por bfr_is_schedule_manager() (qual E with_check) | banco | pg_policies.%schedule% + pg_get_functiondef | 2 | confirmado |
| 3 | papel docente fora da lista de gestão da grade | banco | lista de papéis de bfr_is_schedule_manager() | 0 | confirmado |
| 4 | nenhuma policy de escrita sem WITH CHECK | banco | pg_policies.with_check null | 0 | confirmado |
| 5 | policies de leitura da grade que alcançam responsável | banco | pg_policies.%schedule% SELECT com vínculo de responsável no qual | 2 | confirmado |
| 6 | bfr_teacher_context sem declarar current_role (colisão com reservada) | banco | pg_get_functiondef sem linhas de comentário | 0 | confirmado |
| 7 | internal_chat_is_staff cobre os papéis do app | banco | pg_get_functiondef, contagem de literais de papel | 5 | confirmado |
| 8 | DELETE de thread guardado a thread vazia | banco | pg_policies.quil de %chat_thread% | 1 | confirmado |
| 9 | escrita de pódio/atividades com guarda de papel no banco | banco | pg_policies de project_results/school_activities | 4 | confirmado |
| 10 | widget de clima dentro do menu (não card duplicado no topo) | front-end | index.html ~ /bfrWeather|BFR_WEATHER/ | 16 | confirmado |
| 11 | BFR_TEACHER_SCHEDULE.entries tem escritor | front-end | index.html ~ /\.entries\s*=/ | 3 | confirmado |
| 12 | aba Plano de ação exposta | front-end | index.html ~ /Plano de a\u00e7\u00e3o/ | 1 | confirmado |
| 13 | export Excel no bundle | front-end | index.html ~ /XLSX|xlsx/ | 22 | confirmado |
| 14 | export PDF no bundle | front-end | index.html ~ /jspdf|jsPDF/ | 5 | confirmado |
| 15 | destaque de rota no menu | front-end | index.html ~ /aria-current/ | 21 | confirmado |
| 16 | service worker com nome de cache versionado | front-end | sw-v4.js | "bfr-conecta-v31" | confirmado |

Confirmadas: 16 de 16 correções.

### E.2 Invariantes reconfirmados e achados ainda abertos (não são correções)

| Item | Tipo | Onde | Medido | Estado |
|---|---|---|---|---|
| funções de autorização presentes | invariante | banco | 3 | ok |
| funções public ainda executáveis por anon | achado | banco | 56 | ok |
| tabelas do plano de ação | invariante | banco | 1 | ok |
| nenhuma tabela pública sem RLS | invariante | banco | 0 | ok |

## F. Pendências e o que ainda não foi medido

1. **Telas sem nenhuma medição: 0 de 164; sem reteste: 0.** nenhuma — as 164 combinações perfil×tela foram medidas no build publicado e re-medidas no build corrigido.
2. **Medições que não completaram** (o renderer do instrumento parou de responder; a tela chegou a abrir): teacher/Agenda de hoje, teacher/Planejamento, teacher/Notificações, student/Início, student/Evoluir, student/Escola, student/Meu espaço, student/Notificações, student/Conteúdos, student/Escola & História, student/Notas, student/Agenda, student/Atividades, student/Horários, student/Jogos, student/Jogos escolares, student/Vídeos aprender, student/Comunicados, student/Biblioteca, student/Boletim, student/Resultados e aprendizagem, AEE/Meu espaço, gatekeeper/Portaria QR no build publicado — no reteste são 0.
3. **Telas que congelam a aba de verdade:** 25 no build publicado (teacher/Agenda de hoje, teacher/Planejamento, teacher/Notificações, student/Início, student/Aprender, student/Evoluir, student/Escola, student/Meu espaço, student/Notificações, student/Conteúdos, student/Escola & História, student/Notas, student/Agenda, student/Atividades, student/Horários, student/Jogos, student/Jogos escolares, student/Vídeos aprender, student/Comunicados, student/Biblioteca, student/Boletim, student/Resultados e aprendizagem, AEE/Meu espaço, Portaria/Início, gatekeeper/Portaria QR). No build corrigido: 0. **A causa é medida** (C.2), a correção está no arquivo e **foi publicada em 2026-10-15** (seção G): os 3330710 caracteres que o Worker serve hoje são byte-idênticos aos que o harness mede. O que a publicação exigia veio depois: uma passada de navegador contra a URL publicada (164 visitas, seção H), então a ausência de trava agora é provada no endereço público e não só no harness local, e um cliente com o cache `bfr-conecta-v33` só troca de shell quando o service worker novo for buscado e ativar.
4. **Larguras ainda não varridas:** todas as 10 larguras do brief foram medidas. Medidas: 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px. As passadas de 320–768 e 1024–1920 deste round foram **quarantenadas** (`audit-sweep-mobile.disputa-9333.json`, `audit-sweep-web.disputa-9333.json`): duas varreduras disputaram a mesma porta CDP e os resultados não são confiáveis. Precisam ser re-medidas uma passada por vez, agora sobre o build corrigido.
4.b **33 visitas da re-passada mobile em 320 px são perda de instrumento, não do app:** índices contíguos com `chegou=false`, `loginVisivel=true` e `reiniciou=true`, cada uma estourando o teto (~110 s). A causa é do rig — `Browser.close` num Chrome envenenado não libera a porta, o `/json/version` velho responde e o reinício reentra no mesmo navegador morto. `reinicio()` agora sobe o porto a cada reinício além do primeiro e arrebenta a cadeia em 5 consecutivos; essas 33 triples (parent/student/secretary/aee/monitor) precisam de repasse antes de entrar como número (tarefa #43). **Nenhuma delas vai contar como defeito de tela.**
5. **Prova de botão — MEDIDA controle a controle** (2026-10-15T20:22): 1281 cliques reais em 123 das 164 combinações perfil×tela, sobre 1971 controles do documento, com **firewall de escrita dentro do navegador** (POST/PATCH/PUT/DELETE barrados antes de sair).
   Escrita no banco durante a passada: **zero — provada por recontagem SQL antes/depois (17:40:39 → 20:22:42)**.
   Diário lido: `audit-clicks-seguro-8240.jsonl + audit-clicks-seguro-8241.jsonl`. **Papéis sem diário nesta passada: parent** — `resumo-cliques-33.mjs` filtra por arquivo existente, então um papel ausente some da contagem sem levantar erro; esta linha é o que impede a passada de parecer completa.
   Resultados: `desabilitado` 4 · `efeito` 183 · `fora_da_tela` 547 · `efeito_mut` 133 · `morto` 3 · `sumiu` 259 · `ignorado_permicao_browser` 8 · `tentou_escrever` 9 · `GRAVOU` 1 · `ignorado_escrita` 74 · `coberto_sem_clique` 33 · `ignorado_impressao` 19 · `navegou` 8.
   O diário antigo de 14/10 (`audit-clicks.jsonl`, 148 cliques, sem firewall) fica na seção J como histórico superado.
6. **Autorização em banco que continua em aberto**, mesmo depois das quatro correções de D.5: 0 SELECT sem USING (eram 7 antes do apply), 56 funções public executáveis por anon (15 sem verificação de sessão de nenhum tipo no corpo; 23 sem citar `auth.uid()`, 17 delas SECURITY DEFINER — ou seja, pulam a RLS por fora). Fechar uma a uma exige pré-voz por função, não um revoke em bloco: as 47 predicates (`is_staff`, `current_role` e afins) devolvem `false` sem sessão e fluxos pré-login dependem delas. **(Fechado em 6.c, 2026-10-19 — a premissa «pré-voz por função» caiu: as 56 foram chamadas como `anon` e nenhuma devolveu dado.)**
6.b **O oráculo de suporte: a fotografia abaixo é o ANTES; ele foi fechado em 2026-10-14.** Fotografia de `audit-oraculo.mjs` em 2026-10-14T17:38:49.405Z: `public.bfr_support_request_matches(uuid, uuid, uuid)` é `security_definer=true`, o corpo **não** checa sessão (`nao_checa_sessao=true`) e `anon_executa=true` — com a chave public do projeto, qualquer um confirmava por tentativa e erro se um par (solicitação de suporte × aluno × profissional) existe, porque a função enxerga além da RLS da `support_requests`. As 6 tabelas que a usam em policy (psychology_referrals (3 policies, alvos authenticated); psychology_articulations (2 policies, alvos authenticated); psychology_meetings (2 policies, alvos authenticated); psychology_returns (2 policies, alvos authenticated); support_messages (2 policies, alvos authenticated); support_appointments (1 policies, alvos authenticated)) são todas `TO authenticated`, o app nunca a chamou por RPC (0 ocorrências no `index.html` servido) e pg_cron/Edge Functions rodam como `postgres`/`service_role`: **o revoke não quebrava nada do que foi medido** — e de fato não quebrou, conferido depois do apply em D.5 (anon por REST: HTTP 401; `authenticated` continua executando).
6.c **A superfície `anon` do item 6 está FECHADA por medida, não por revoke (2026-10-19).** Re-medida pelo mesmo instrumento (`audit-funcoes-anon.mjs`): 56 funções public executáveis por `anon`, 41 com guarda no corpo, 15 sem — o número de 14/10 não mudou, e a fotografia de cima continua sendo o retrato correto do catálogo. A pergunta que o item deixava em aberto («fechar uma a uma exige pré-voz por função, não um revoke em bloco») foi respondida de outro lado: em vez de autorizar função por função, **chamei as 56 como `anon`** (`prova-anon-56.mjs` → `prova-anon-56.json`), cada uma dentro de `begin; set local role anon; …; rollback`, então nenhuma escrita é commitada e as três escritoras do conjunto são todas de trigger. Resultado: `false` 29 · `null` 10 · texto 3 · `true` 1 · recusadas pelo PostgreSQL 13. **Nenhuma devolveu dado de ninguém.** Os três textos são `bfr_staff_role()` devolvendo string vazia (sem sessão não há papel) e os dois normalizadores `family_*`, que só transformam o texto que o próprio chamador enviou; o único `true` é `bfr_subject_matches('','')`, comparação pura de duas strings do chamador, que não lê tabela nenhuma. As entradas `uuid` dos predicados de aluno foram **reais** (um `students.id` e um `profiles.id` de gestão, lidos antes da troca de papel — senão a RLS do próprio probe anularia o teste): `aee_can_access_student` → `null`, `bfr_family_can_view_aee` → `false`, `bfr_staff_can_manage_student_scope` → `false`, `bfr_get_student_photo_path` → `null`.
   As 13 de `RETURNS trigger` nem são alcançáveis: por SQL o PostgreSQL recusa (`ERROR 0A000: trigger functions can only be called as triggers`, nas 13) e por REST elas nem existem no catálogo do PostgREST (`PGRST202`, medido por `prova-anon-chamada-15.mjs` contra `/rest/v1/rpc/` com a chave `anon` extraída do HTML publicado — 3366669 caracteres servidos, chave de 46 caracteres nunca impressa). Ou seja: `has_function_privilege('anon', oid, 'execute')` é verdadeiro no catálogo para elas, mas nenhuma trilha do app as alcança como `anon`. Revogar ali seria risco sem ganho — o ganho medido é zero e o laço de trigger é o que se expõe a quebrar.
   O que derruba a premissa do «sem verificação de sessão»: **6 das 15 delegam**. `bfr_collab_can_profile`, `bfr_collab_is_manager`, `bfr_collab_is_staff`, `bfr_literacy_staff`, `bfr_staff_is_manager` e `bfr_staff_can_message_recipient` têm corpo na forma `select public.bfr_collab_is_staff() and exists (select 1 from profiles p where p.id = alvo and p.role in (…))` — o `auth.uid()` mora na função chamada, e o regex do instrumento (`GUARDA`) olha só o corpo da função que ele lista. Prova adversarial com `set local role anon` e o uuid **real** de uma conta de gestão: `bfr_collab_can_profile(<coordenador real>)` = `false`, `bfr_staff_can_message_recipient(<mesmo uuid>)` = `false`, `bfr_collab_is_staff()` = `false`, `bfr_staff_role()` = `''`. Como o `AND` corta no predicado de sessão, **o resultado não depende do argumento**, então não existe oráculo de tentativa e erro sobre «este perfil existe / é gestão» — que era exatamente o medo do 6.b, na forma geral. (As outras 4 das 15 são `family_cpf_is_valid`, `family_normalize_cpf`, `family_normalize_name`, `bfr_subject_matches`: funções puras sobre o dado que o chamador manda.)
   Conferência lateral feita na mesma passada, para não deixar dúvida onde havia só suspeita: `family_cpf_is_valid` **não** está quebrada. Testada com `529.982.245-63` → `true`, `11144477735` → `true`, `12345678909` → `true`, `52998224500` → `false`, `00000000000` → `false`; o `-00` que circula como exemplo é CPF inválido de verdade, e o corpo usa a formulação equivalente `mod(total*10, 11)` com `check_digit = 10 → 0`.
   **Status do item 6: fechado.** Autorização em banco hoje = 0 SELECT sem USING **e** 0 função executável por `anon` que devolva algo na superfície alcançável. A dívida que continua real é a de processo, não de exposição: o `grant` a `anon` volta a aparecer em toda função nova que for publicada (memória do catálogo), então o `node prova-anon-56.mjs` é a re-verificação depois de qualquer migration nova, e a frase correta para as 56 passou a ser «frouxas no catálogo, medidas como inofensivas» em vez de «frouxas e presumidamente perigosas».
7. **Publicação — APLICADA (deploy `76cc8f58`, `CACHE` `bfr-conecta-v33` → `bfr-conecta-v34`), conferida em 2026-10-15T11:16, com evidência na seção G** (não é mais pendência): o `index.html` com as edições de trava e o patch #50/#51 foi ao ar (3330710 caracteres no ar, idênticos 3330710 do arquivo local; 6 de 6 marcas das edições de 14/10 conferidas **no HTML que o Worker serve**, mais as 4/4 marcas do #50/#51 (`audit-pre-voeu-50-51.json`); `CACHE` do service worker de `bfr-conecta-v33` para `bfr-conecta-v34`; 14 rotas verificadas depois do deploy; reversão = devolver `?`, que é o build que estava no ar, e rodar o mesmo `node deploy-worker.js`).
Os outros quatro itens também **não são mais pendência**: foram aplicados em 2026-10-14 com OK explícito, na ordem (c) → (d) → (b) → (e), e cada um tem conferência própria em D.5 — (b) `sql-fechar-leituras-abertas.sql` recriou as 7 policies SELECT abertas (abertas no schema inteiro hoje: 0); (c) `sql-fechar-oraculo-suporte.sql` tirou `EXECUTE` de `anon` na função-oráculo do suporte, com re-grant nominal a `authenticated`/`service_role`/`postgres` (anon por REST: HTTP 401); (d) `sql-fechar-views-sports.sql` tirou `SELECT` de `anon` das 5 `sports_public_*` e pôs o filtro de papel dentro delas — sem isso o item (b) era decorativo no módulo esportivo (D.3.2); (e) `sql-fechar-oraculo-comunicacao.sql` acrescentou o guard de chamador ao corpo de `bfr_resolve_communication_recipients` e re-nomeou os destinatários do `EXECUTE` (D.3.3). Nenhum dos quatro é irreversível: os 7 `USING (true)` literais estão em `backup-all-policies-2026-10-13.sql`, o corpo antigo da RPC em `rpc-corpo.txt`, e as projeções puras das 5 views na consulta 9 do pré-voz, com o `grant select on <view> to anon, public` que as reabre.
8. **Cascata de mutações que sobrou no perfil aluno:** mesmo sem congelar, a tela `student/notas` ainda mede 7434 disparos de callback por abertura (contra 7348 na tela do professor) distribuídos por 45 callbacks registrados, 6 dos quais realmente escrevem no DOM. O maior escritor é `ensure :: function ensure() { const admin = document.getElem…` (180 passadas, 92 escritas) — e a guarda dele é `isDeveloper()`: **essa escrita é artefato da identidade da conta sintética**, um aluno real passa pelo guard e não escreve. 5 callbacks gateados por papel respondem por 92 das 131 escritas medidas. O que **não** é artefato: `anon :: () => { if (placeWeather()) observer.d…` 3 passadas / 2 escritas; `anon :: () => ensure()…` 178 passadas / 8 escritas; `anon :: () => addCommandPanels(document.getEle…` 39 passadas / 13 escritas — ou seja, o custo residual é o **número de observers rodando a cada mutação** (o maior disparo isolado é `normalize :: function(){document.querySelector…`, 554 passadas quase sem escrever), não o conteúdo que a conta developer vê. Não é mais uma trava — é latência e CPU de celular. A causa estrutural, contada no próprio arquivo: 55 `MutationObserver` registrados, 22 deles sobre `document.body` e 14 sobre o `appShell` (3 no `documentElement`) — cada escrita em qualquer lugar da página reacende dezenas de callbacks de document inteiro, e é isso que os 45 contadores do diário mostram disparando em conjunto. Cortar exige um dispatcher único por subtree, o que é refactor do laço de observação de todo o shell: não foi feito e não cabe num patch de quatro linhas. **Re-medido 15/10 com os patches do #50/#51/#53 no arquivo** (`audit-mut.json`, chaves `· depois-patches`): `student/notas` cai de 75910 para 7434 disparos, e a tela que continua crescendo é `student/meu-espaco` (que na medida assenta em `sec=inicio` — é o caso #39, não a tela pedida) com 84254 disparos: 45 callbacks respondendo e 128 escritas atribuídas. A trilha da cauda diz o resto: 19055 → 19471 nós em 7 s, ou seja **+59.4 nós/s e 646 disparos/s**, enquanto a soma do ganho de nós que o `probe-mut` consegue creditar a algum callback é 296 nós. Na mesma passada, `student/notas` está plana (0 nós/s, 40 disparos/s) — a cascata de observers daquela tela foi cortada. **A leitura correta não é "fan-out de invocação sem escrita": é escrita que não nasce de `MutationObserver`** (timer, `setTimeout`, `requestAnimationFrame` ou handler de evento), e nessa metade o `probe-mut` é cego por construção — ele só embrulha observer. Quem escreve: medido por pilha (`probe-empilha.mjs` → `audit-empilha-student-inicio.json`, 2026-10-15T22:08): 13989 nós inseridos contra 0 removidos em 70 s, ou seja 13989 nós que ficam. Maiores pilhas: `Error` +1702 nós em 4 chamadas; `Error` +852 nós em 2 chamadas; `Error` +850 nós em 1 chamadas. Recipientes que só crescem: `div#bfr-staff-badges-collapsible-content>div.bfr-collapsible-inner>div.badge-controls>sele` (entra 906, sai 0); `section#studentAccountLinkPanel>form.publish-form>label>select` (entra 858, sai 0); `section.panel>form.growth-form>label>select` (entra 857, sai 0). Na `student/notas`, o mesmo instrumento mede 18941 inseridos / 0 removidos em 70 s. Por leitura do arquivo, os candidatos óbvios já caem: os `ensure*` do módulo de evolução do aluno (index.html:17000-17172) são guardados por `view.querySelector('[data-bfr-evo-*]')`, o `styles()` do clima (19246) e o `enhanceAll()` (19292) têm guarda por id do `<style>`, e `sync()` roda a cada 900 ms (17171) sem escrever quando os painéis já existem — ou seja, **a causa do crescimento está em aberto** — **fechado em 8.c, 2026-10-19: o «crescimento» era o instrumento contando só entradas; re-medido no publicado com o `probe-empilha-2.mjs` dá 0 nós/s, e o escritor periódico que sobra tem nome (`navButton`, index.html:18671, no `setInterval(syncNav, 1200)` de index.html:18929)**. O que foi provado na época é o mecanismo (escrita fora dos observers), não o culpado; o menu continua montando (o destaque dele é o #55, medido à parte).
8.c **O «crescimento real de nós» deste item era o instrumento, não o app — re-medido no publicado em 2026-10-19: 0 nós/s, e o escritor periódico agora tem nome, linha e taxa.** A frase que ficou em aberto («a causa do crescimento está em aberto, o que foi provado é o mecanismo») apoiava-se em duas contas que não valem, e as duas são do `probe-empilha.mjs`:
   **Defeito 1 — o gancho de `innerHTML` só somava entrada.** `probe-empilha.mjs:96-103` embrulha o setter assim: `const qtd = … (String(v).match(/<[a-z]/gi)||[]).length + 1; marca(null, this, 1, qtd);` — a direção é fixa em `+1` e o que o recipiente perdia naquela atribuição nunca era contado. Então «13989 nós inseridos contra 0 removidos em 70 s» não é uma descoberta sobre o app: é **exatamente o que esse gancho devolve para qualquer re-render por `select.innerHTML = …`**, e os «recipientes que só crescem» que o item lista são todos `<select>` (`…>div.badge-controls>sele` entra 906 sai 0; `section#studentAccountLinkPanel>form.publish-form>label>select` 858; `section.panel>form.growth-form>label>select` 857), com as duas maiores pilhas sendo `renderPersonalBadgeOptions` (index.html:5400) e `renderStaffBadgeOptions` (index.html:5329) — e as duas linhas são substituição pura: `select.innerHTML = items.length ? items.map(…).join('') : '<option value="">Nenhum aluno encontrado</option>'`. Nenhum dos dois acrescenta um nó ao documento.
   **Defeito 2 — a taxa foi contada do boot ao fim, num harness, com identidade que não é a do aluno.** `ganho_por_s` no v1 é `(para_n - de_n)/segundos` com `de_n=39`, lido um segundo depois do `Page.navigate`: os 169,1/s são a rampa de montagem do shell dividida pela janela, e o diário da própria v1 desmente o crescimento — das 12 amostras que ele guardou, **as 12 têm `n:11706`** (t=58..69) enquanto `ins` sobe de 13676 a 13989 com `rem=0`; documento parado com contador de inserção subindo é a assinatura de destruir-e-recriar, não de vazar. Além disso aquele `audit-empilha-student-inicio.json` tem `base=http://localhost:8240` (harness, 2026-10-15T22:08), e os painéis que ele nomeia como vazando (`studentAccountLinkPanel`, `coordinationRestrictionPanel`, `bfr-staff-badges-collapsible-content`) são painéis de **gestão** montados porque a conta sintética tinha o papel que monta isso — a mesma concessão que o item já fazia para os `ensure*` gateados por `isDeveloper()`. A segunda passada da v1 (`audit-empilha-student-inicio-conta-real.json`) nem mediu o app: `shell=false`, `nonce=null` e pilhas saindo de `chrome-error://chromewebdata/`.
   **O instrumento corrigido** (`probe-empilha-2.mjs`) conta líquido no subtree inteiro do recipiente (`getElementsByTagName('*').length` antes e depois de cada uma das cinco pias: `appendChild`, `insertBefore`, `removeChild`, `replaceChildren`, setter de `innerHTML`, mais `insertAdjacentHTML`, que a v1 nem embrulhava), abre a janela só depois de shell pronto + nonce batendo + `n` estável três sondas, zera os contadores nesse instante, e não grava diário se a página for tela de login, erro do Chrome ou `about:blank`. Portão de consistência: `|Σlíquido − Δdocumento| ≤ max(20, 20% do Δ)`.
   **Medido no publicado (v45, `/` md5 `2a7b7290`), conta sintética de aluno, @390 px, três passadas** — `audit-empilha2-student-inicio.json` (60 s), `audit-empilha2-student-notas-depois.json` (60 s) e `audit-empilha2-student-inicio-lento.json` (140 s): `n 2983 → 2983`, **Δ 0 nós, 0/s**; na janela longa as 140 amostras de `n` têm **1 valor distinto**, líquido somado 0 em cada amostra, `bruto +330/−330`, portão de consistência OK, 0 erros, 0 recipientes caros, e **nenhum recipiente com líquido > 20**. `student/notas` deu o mesmo (`2983 → 2983`). Conferência de que os 2983 são a tela montada de verdade e não um shell pela metade: os diários de varredura já gravados (`audit-sweep-mobile-v44.json`, `audit-sweep-web-v44.json`, `audit-sweep-mobile.json`, `audit-sweep-aluno.json`) registram para `student/inicio` `nosPainel=1304`, `controles=69`, `painelChars=1259` — 1304 dos 2983 nós do documento estão dentro do painel medido.
   **O que é real e periódico, com nome e linha:** 258 escritas em 140 s = 1,84/s, todas de líquido 0, e 236 delas são dois blocos de 118 — as duas pilhas `navButton` dos chamadores `index.html:18695` (`document.querySelectorAll('.bfr-platform-nav').forEach`) e `index.html:18696` (`.mobile-more-grid`). `syncNav()` está em `setInterval(syncNav, 1200)` (index.html:18929), e 118 ciclos em 140 s são 1,19 s por ciclo: **é o timer, medido**. Dentro de `navButton`, a linha `index.html:18671` faz `button.innerHTML = '<span class="nav-icon">📷</span>Fotos dos alunos'` **sem guarda nenhuma** — a guarda que existe logo abaixo (`if (!button.dataset.photoNavReady)`, 18672) cobre só o `addEventListener` do clique. Resultado: a cada 1,2 s, em toda tela onde os dois hosts existem (`.bfr-platform-nav` e `.mobile-more-grid` — medido nas duas telas do aluno), um `<span>` é destruído e recriado na nav de desktop e na gaveta «Mais» do celular. O alcance é de código, não de sorte: `init()` roda em `DOMContentLoaded` sem guarda de papel (index.html:18929-18930) e o `allowed()` de `syncNav` só alterna a classe `hidden` do botão (18697-18699) — quem filtra é o `forEach` sobre os hosts, então em papel sem esses hosts o ciclo não escreve. Isto é precisamente a metade que o item dizia ser invisível ao `probe-mut` («escrita que não nasce de `MutationObserver`: timer, `setTimeout`, `requestAnimationFrame` ou handler de evento») — só que era duas nós por ciclo, não um vazamento.
   **Candidata (nada aplicado, nada publicado):** mover a atribuição de `index.html:18671` para dentro do `if (!button.dataset.photoNavReady)` que já existe quatro linhas abaixo. O rótulo nunca muda, então a escrita é redundante do primeiro ciclo em diante; o ganho medido é ~1,7 escrita/s de invalidação de layout em toda tela, e o risco é zero para o clique (mesmo bloco guarda o listener). Antes de aplicar, medir A/B no harness como qualquer outra candidata. **Prova de que os quatro trechos citados estão no ar e não só no `patched`** (`confere-navbutton-publicado.mjs`, que busca por conteúdo nos bytes servidos porque as linhas do `bfr-conecta-patched/index.html` não são as do publicado): `/` devolve 3.366.669 caracteres e cada um dos quatro aparece **1×** — `button.innerHTML = '<span class="nav-icon">📷</span>Fotos dos alunos'` offset 2260321, `if (!button.dataset.photoNavReady)` 2260396, os dois chamadores `navButton` 2261356 e 2261441, `setInterval(syncNav, 1200)` 2284824. Ou seja: as linhas citadas são as do arquivo de trabalho, o código é o servido.
   **O que sobra do item 8:** o fan-out estrutural (55 `MutationObserver`, 22 sobre `document.body`, 14 sobre o `appShell`) e os disparos/s atribuídos em #86 — latência e CPU de celular, e cortar isso continua sendo refactor do laço de observação do shell, não patch de quatro linhas. **O que não sobra:** «+59,4 nós/s», «13989 nós que ficam», «recipientes que só crescem» e a cláusula «a causa do crescimento está em aberto». Status do item 8: **fechado** — crescimento de nós no perfil aluno = 0 nós/s medido no publicado; escritor periódico identificado e com candidata pronta; nenhuma escrita no banco, nada publicado. Armadilha de rig registrada na memória (88: contador que soma só entrada transforma toda re-render em vazamento, e taxa primeiro-último transforma boot em taxa).
9. **As quatro áreas de plataforma (Aprender, Evoluir, Escola, Meu espaço): medidas com identidade certa, corrigido o que era defeito.** Na varredura padrão elas constam como "não chegaram" (4 linhas em 4 seções), e a causa está no arquivo: `BFRPlatform.open()` (index.html:12186) só abre quando `role()` devolve `parent`/`student`, e `role()` lê o papel **real** da conta (index.html:12158) — não a view trocada por `setRole()` (index.html:8617), que mexe apenas em `activeView`. A conta da auditoria é `developer` (medido em `public.profiles` por `confer-papel-sessao.mjs`: 2d78d057… role=`developer`), então **o rig não alcançava essas telas** — e o brief não me autoriza a deduzir que passariam. Com a conta sintética autorizada em 14/10 (`cria-conta-sintetica.mjs`, papel real de aluno e de responsável, senha aleatória mantida só no processo, reversível por `apaga-conta-sintetica.mjs`), as **4 telas do aluno e 4 do responsável abrem**, cada uma com o painel assentado antes de medir: aluno/Aprender 1032c/7ctl (1447ms para assentar); aluno/Evoluir 1021c/4ctl (1447ms para assentar); aluno/Escola 723c/14ctl (1433ms para assentar); aluno/Meu espaço 223c/0ctl (1583ms para assentar). resp./Aprender 279c/6ctl; resp./Evoluir 270c/4ctl; resp./Escola 306c/6ctl; resp./Meu espaço 332c/8ctl. **Limitação que continua em aberto:** nenhuma das duas contas tem vínculo com um registro de aluno (`students`/`guardian_students`), e o app mostra o estado vazio honesto — em `aluno/meu-espaco` o texto medido é *"Ainda não encontramos um aluno vinculado a esta conta. Fale com a secretaria para conferir seu cadastro."* (223 caracteres, 0 controles). Ou seja: **a rota, o shell e o guard estão provados; o conteúdo populado dessas telas continua sem prova**, e vincular a conta sintética a um aluno real esbarraria na regra do brief de não alterar nem expor dados reais de estudantes. **O que era defeito e está corrigido:** `roleSectionAccess.aee` (index.html:7742) anunciava `meu-espaco`, o roteador entregava ao módulo (index.html:8749-8752) e o guard recusava `aee` com `return false` silencioso — entrada de menu que não executa nada, o caso explícito do brief. A escolha do responsável foi **(a)**: `meu-espaco` saiu de `roleSectionAccess.aee` e o botão ganhou guarda declarativa pelo papel real (`syncAreaNav()`). **Medido depois da correção** (`confere-guards.mjs`, `probe-drawer.mjs` @390): a gaveta "Mais" do perfil AEE **não** lista `meu-espaco` (re-medição estruturada pendente em `audit-gaveta.json`); ao pedir `meu-espaco` direto por URL o shell fica em `inicio` com o painel do AEE visível (8.465 caracteres, 1 painel visível) — não há mais tela em branco nem item morto. Para aluno e responsável a gaveta lista as quatro áreas, então **não** são função principal escondida no celular. O `data-parent-nav` continua sem esconder a nav de plataforma na sidebar (as regras `.bfr-platform-nav-item[data-platform-area="aprender"]:not(.hidden){display:flex!important}` valem para qualquer view): em 390 px a sidebar está oculta por CSS e a prova disso é da passada web, 1024+.
10. **A tela em branco de `coordinator/comunicacao`: corrigida e medida.** Causa lida no arquivo: o roteador escondia **todas** as `.content` do shell (index.html:8780) *antes* de chamar `window.BFRCommunication?.open?.()`, e esse módulo vive num bloco `text/plain data-bfr-auth-deferred` (index.html:19864-20123) que só é executado pelo loader serial (index.html:10315-10340) — clicando antes de o bloco rodar, `?.` resolvia em `undefined`, nenhuma view voltava a ficar visível e a tela ficava em branco sem erro de console. Depois das duas edições, medidas em 5 larguras desta mesma passada: 320px 2796c/55ctl, 360px 2796c/55ctl, 375px 2796c/55ctl, 430px 2796c/55ctl, 768px 2796c/55ctl. As edições aplicadas foram: (i) **rig** — o bootstrap do harness agora espera `window.__BFR_AUTH_MODULES_PROMISE` e re-aplica `?open=` até o módulo existir (audit-harness.mjs; reversão em `audit-harness.mjs.bak-modulos`), sem o que a medição registrava falso negativo; (ii) **app** — o ramo de `comunicacao` não esconde mais as views às cegas: captura quem estava visível e a `activeSection`, chama o módulo e, se nada ficou visível, restaura as views, sincroniza a navegação e devolve `false` em vez de deixar tela em branco (reversão em `index.html.bak-comunicacao`). Os 97 blocos de script foram conferidos bloco a bloco depois das edições (`confere-sintaxe-html.mjs`, 0 erros).
11. **Estado vazio não é tela em branco.** `student/comunicados` mede 36 caracteres no alvo `.notice`: a lista está montada e mostra a própria frase de "sem registros" — medido com a conta sintética de aluno, que não tem vínculo com nenhum comunicado. A tela **populada** do perfil aluno continua sem prova (item 9).
12. **O diário mobile anterior media painel pela metade — a passada foi regravada com portão.** `ir()` devolvia no instante em que `activeSection` batia e o `MEDIR()` rodava em cima de um painel que ainda montava: na passada anterior (820 visitas) **208 linhas** ficaram com painel visivelmente menor que o mesmo painel em outra largura, em 68 telas distintas (o diário antigo está preservado como `audit-sweep-mobile.sem-portao.json`). A prova de que é o instrumento, não o app, veio de `probe-larg.mjs` em navegador limpo: secretary/escola-historia @320px = 2110c/80ctl em 6s; secretary/escola-historia @360px = 3637c/1042ctl em 10s. O rig agora espera `caracteres + controles + nós` pararem de mudar por duas sondas (`assenta()`, teto de 30 s) e grava `assentou`/`msAssentamento` em cada linha: nesta passada, 679 de 820 assentaram; 84 não assentaram (motivos no diário); o mais lento foi `teacher/conteudos` @320px em 33653ms. Consequência metodológica registrada: os contadores de `tap<44`, `fonte<11`, `cortado` e `estouro` da passada anterior **não** valeiam para as telas lentas, e o teto da visita subiu de 210 s para 300 s porque o portão come parte dele.
13. **A única "trava" da passada mobile não se reproduziu fora do rig.** `secretary/escola-historia` @360px estourou o teto de 210 s da visita e o registro diz `ABA TRAVOU mesmo após reinício do navegador` — mas nas outras quatro larguras da mesma passada a tela chegou (320px 2.776ms/2.106c, 375px 5.859ms/3.630c, 430px 6.689ms/3.630c, 390px no reteste 9.418ms/3.641c), e em navegador limpo com a thread principal sondada a cada 2 s a mesma tela @360px montou em 10s com **0 sondas perdidas** e o `Runtime.evaluate` respondendo em no máximo 159ms (1042 controles, 16423 nós). A varredura estava rodando **junto** com probes na mesma máquina, o que já é causa conhecida de falso congelamento (memória do rig, item 8). Portanto: registrada como **não confirmada**, não como defeito do app; o item 12 remove o gatilho mais provável (medição em painel pela metade) e a reincidente volta como achado.
14. **Do que não assentou, o que é medida e o que é defeito do app.** Das 820 visitas desta passada, 84 terminaram com `assentou:false` e o diário traz `motivo:"teto esgotado"` em todas (o portão girou os 30 s inteiros sem ver duas sondas iguais; mediana de `msAssentamento` entre as que falharam = 30356 ms, custo total **42.6 min** do tempo da passada). Comparando cada uma dessas linhas com o MESMO painel assentado em outra largura (`debito-do-portao.mjs` → `audit-portao-debito.json`): **59 têm painel final** (≥85% dos caracteres de referência), **10 continuam suspeitas** e **15 não têm referência** porque a tela nunca assentou em nenhuma largura — são 3 telas: `coordinator/aee`, `director/aee`, `admin/aee`. A razão está na sonda: ela compara `chars` e `controles` do painel **e `document.getElementsByTagName('*').length`, que é do documento inteiro** — um painel já definitivo convive com o resto da página mutando e o portão não libera. Por isso as 59 primeiras valem como medida e as 10 suspeitas ficam devendo re-medição com portão restrito ao painel. O achado de app que sobe daí é o AEE para os papéis de gestão: `coordinator/aee`, `director/aee`, `admin/aee`, que não assenta **em nenhuma das cinco larguras**, e ainda assim o painel é o mesmo em todas — diretor: 320=8881c/113ctl/646nos · 360=8876c/113ctl/646nos · 375=8883c/113ctl/646nos · 430=8883c/113ctl/646nos · 768=8894c/113ctl/646nos — variação de dezenas de caracteres numa série de 8,9 mil. Ou seja: quem não para de mudar **não é o painel da tela, é outra coisa no documento**, e essas telas são a assinatura mensurável do item 8 (laço de mutação) num papel que ainda não tinha sido apontado. A causa não foi encontrada: nenhuma pilha amostrada por `Debugger.pause` cobre o AEE, e o diário não registra QUÉM escreve fora do painel. Detalhe separado e real: em `coordinator/aee` @430px o painel medido no ato da medição tinha **288 caracteres, 1 controle, 5 nós** contra os ~8.9 mil das outras larguras — ali o portão não estava medindo o painel do AEE, e essa linha não entra como medida da tela.
15. **A tarja "SEM DESTAQUE NO MENU MOBILE" da passada web era do instrumento, não do app — e o diário foi consertado sem rerodar a varredura.** O emissor (`audit-sweep2.mjs:412-430` antes do patch) concluía "sem destaque" de `navVisiveis` filtrado sem olhar a largura, mas a barra de baixo (`#bfrMobileBottomNav`, montada por `bfr-responsive-presentation.js`) **só existe abaixo de 900 px**: em 1024/1280 ela vem vazia por projeto de tela. Consequência medida: 323 de 323 linhas da passada web sairiam tarjadas com um defeito de menu que não existe — ou seja, 100% do diário. O guard aplicado é `const emMenu = Number(r.largura) < 900` nas duas tarjas de menu; ele só vale para os processos que sobem depois do patch (o Node já tinha compilado o módulo do processo em curso, PID 28344), e é por isso que a correção entrou **recomputando** as tarjas a partir dos campos gravados (`recalcula-tarjas-web.mjs` → `audit-tarjas-web.json`) em vez de jogando a rodada fora — a banda em si **não é persistida** no diário, ela só existia no `.log`, o que é em si uma razão para nunca tomar o `.log` como fonte. Com o guard, a passada web tem **0 defeito de menu** em 323 linhas. As tarjas reais de 2026-10-15T01:58 são: `tap<44` 307, `fonte<11` 175, `ALVO NÃO ACHADO` 52, `semNome` 51, `rolavel` 41, `cortado` 33, `NÃO CHEGOU` 10, `PAINEL VAZIO` 2; 11 linhas saíram limpas. Dessas sobram dois conjuntos que **são** achados e já estão no relatório: 10 linhas "não chegaram", em 5 telas (student/aprender, student/evoluir, student/escola, student/meu-espaco, aee/meu-espaco — o caso do guard de papel real do módulo de plataforma, F.9) e 2 "painel vazio" (`student/comunicados@1024px 36c 4n alvo=.notice assentou=true`; `student/comunicados@1280px 36c 4n alvo=.notice assentou=true`) — que o item 11 já explica ser **estado vazio medido no alvo `.notice`**, não tela em branco. (a passada web ainda roda: 323 linhas no instante da recomputação de tarjas, 01:58 UTC; 656 no instante deste relatório)
16. **O que a passada web mediu, e o que ela não mediu.** No snapshot de 2026-10-15T01:58 (323 linhas, larguras 1024, 1280) (a passada web ainda roda: 323 linhas no instante da recomputação de tarjas, 01:58 UTC; 656 no instante deste relatório): **208 linhas sem alvo declarado** no inventário e **52 com alvo que não resolveu** — 260 de 323 caindo no fallback `.content:not(.hidden)` e portanto contando o despejo da view ativa inteira; só 63 mediram no painel pedido. Concentração por papel, do lado "sem alvo": `teacher` 44, `student` 24, `coordinator` 22, `director` 22, `admin` 22, `parent` 20, `secretary` 16, `aee` 14, `gatekeeper` 10, `monitor` 8, `sports_operator` 3, `psychology` 2, `multiprofessional` 1 — o professor está inteiro nesse lote porque as telas dele são abas dentro de `#teacherView`, sem selector próprio no `audit-targets.json` antigo; do lado "alvo não achado": `parent` 10, `coordinator` 8, `director` 8, `aee` 8, `secretary` 6, `monitor` 6, `admin` 4, `student` 2. Uma parte dos "não achados" é o próprio alvo errado, lido no arquivo: `.notice`, `.secretary-hero`, `.aee-hero` são **classe de card filho**, não o container — resolvem em 36–288 caracteres. O mapa de alvos por rota foi **montado, validado e aplicado** (15/10, depois da passada publicada): prova-no-diario 27 · view-do-papel 35 · view-global-do-app 87 · tela-do-professor 15 · conservado 56 em 220 rotas de 13 papéis (candidato em `audit-targets-2.json`, decisões e origens em `audit-mapa-alvos-2.json`, gerador `monta-mapa-alvos.mjs`), com 138 alvos trocados e **0** seletor sem lastro no HTML (`confere-candidato-alvos.mjs`). Replay do candidato contra as 1307 linhas já gravadas dos três diários de varredura (`replay-mapa-alvos.mjs`, diário `audit-replay-mapa.json`): **PISO 510/1307** com prova forte (alvo com prova no diário 216 + alvo de view do papel cuja `viewReal` bate 294), **TETO 1290** somando os 780 alvos de módulo/atributo cuja visibilidade é de runtime e **não têm prova estática** — hoje resolvem 63 de 323. Os 17 que ainda cairiam têm `viewReal` nulo — são as linhas que não chegaram, não telas com alvo errado. Aplicação: `aplica-mapa-alvos.mjs` tem dois portões (nenhuma varredura viva; e nada de aplicar antes da passada publicada, porque o diário publicado e o do harness têm de medir o mesmo escopo para `compara-publicado.mjs` significar alguma coisa) — e foi **aplicado** em 2026-10-15T05:27 com os dois OK (`audit-targets.2026-10-15T05-27-55-329Z.bak.json` é o mapa de antes, 6/6 checagens verdes, `audit-targets.json` re-lido byte a byte): as 260 linhas ficam devendo re-medida com o mapa aplicado (tarefa #52, re-medida no item 16.b). Enquanto isso, nenhum número de painel de linha sem alvo pode ser citado como medida da tela.

16.b **A re-medida dos pares que só mediam o fallback, com o mapa aplicado: 242 linhas, 170 no alvo, 72 ainda no fallback.** Diário `audit-sweep-web-alvos.json` (larguras 1024/1280), conferência `audit-tarjas-web-alvos.json` de 2026-10-15T06:03; mapa aplicado por `aplica-mapa-alvos.mjs` em 2026-10-15T05:27, backup `audit-targets.2026-10-15T05-27-55-329Z.bak.json`, 27 rotas trocadas. Das 242 linhas que têm a MESMA visita no diário da passada mãe, **170 resolveram no alvo pedido** — e dessas 64 mediram MENOS que antes, exatamente porque deixaram de contar a view inteira: mediana 1319c → 1319c. Os maiores engodos desmontados: `admin/fotos@1024` 284993c → 154297c no alvo `#adminView`; `admin/fotos@1280` 284993c → 154297c no alvo `#adminView`; `admin/direcao@1024` 153578c → 154297c no alvo `#adminView`; `admin/direcao@1280` 153578c → 154297c no alvo `#adminView`; `student/biblioteca@1024` 40423c → 40437c no alvo `#readingLibraryView`; `student/biblioteca@1280` 40423c → 40437c no alvo `#readingLibraryView`. Tarjas da re-medida: `tap<44` 233, `fonte<11` 134, `ALVO NÃO ACHADO` 72, `rolavel` 34, `semNome` 30, `cortado` 20; 8 linhas limpas. Da lista de 121 pares que nunca mediram no alvo (`audit-fallback-pares.json`), ficaram de fora desta re-medida 0; e as larguras não re-medidas continuam sendo despejo de view, não tela. Do que **sobrou** no fallback nesta re-medida (72 linhas com alvo declarado que não resolveu), 72 têm `painelSeletor` igual ao `alvo` — o container existe no documento mas não tinha altura na rota, então o número gravado nelas é o da view, não o da tela, e a tarja `ALVO NÃO ACHADO` é quem avisa. Container dividido por mais de uma rota do mesmo papel: coordinator/#coordinatorView em 6 rotas com o mesmo painel (2054c); parent/#parentView em 6 rotas com o mesmo painel (1162c); secretary/#secretaryView em 5 rotas com o mesmo painel (3619c); director/#directorView em 4 rotas com o mesmo painel (3627c). Dos 170 que **resolveram** no alvo, 56 têm como alvo a raiz da view do papel (`#coordinatorView` e irmãs): mediana 3333c / 71 ctl contra 586c / 18 ctl dos 114 alvos finos — nessas o mapa mudou o NOME do contador, não a granularidade, e a maior é `admin/fotos@1024` com 154297c. O retrato honesto da re-medida é, portanto, este: 170 linhas com escopo declarado, das quais 114 contam uma tela e 56 contam uma view; e as 72 que sobram no fallback cabem em 11 chaves de rota (escola-historia, coordenacao-chat, comunicacao, jogos-escolares, videos-aprender, professor-conteudos, professor-diario, professor-planejamento, professor-relatorios, professor-calendario, professor-notificacoes) repetidas entre papéis — indício de rota sem container próprio, não de seletor errado, e é isso que a sonda de alvos tem de responder no DOM antes de qualquer mapa novo.

16.c **O repasse das 33 linhas @320 que o item 4.b deixava em dívida (#43).** Aquelas linhas não medem 32 telas: medem uma janela. `Browser.close` num Chrome envenenado não libera a porta, o `/json/version` velho responde e o reinício reentra no **mesmo** navegador morto (`audit-sweep2.mjs:77-81`), então cada visita paga o teto de ~110 s contra um browser inexistente. A prova está no diário mãe: as 33 saem com `chegou=false`, `loginVisivel=true`, `reiniciou=true` e o **mesmo** painel medido em todas — 2717c de caracteres, que é o despejo da tela de login. Nada disso entra em contagem de tela, e o que se perde com isso é a **largura**: 320 px é onde estouro de layout e alvo de toque apertado aparecem, e essa largura ficou sem medida. O lote é lido do diário por `monta-lista-320.mjs` (`audit-fallback-320.json`, 33 pares; contagem e painel idêntico em `audit-lista-320.json`), e o passo `re-medida-320` do motor `roda-remedida-alvos.mjs` mede de novo esses pares **@320 com o mapa aplicado**, em diário próprio (`audit-sweep-mobile-alvos.json`) e **porto 9372** — nunca a 9333, que é justamente a fonte do veneno — com o porto conferido antes de abrir e "ocupado" gravando o passo como não rodado. **Re-medido** (conferência `audit-tarjas-mobile-alvos.json` de 2026-10-15T06:14): 33 linhas @320, 32 chegaram, 22 resolveram no alvo pedido, 1 não chegaram, 0 ABA TRAVADA, 0 presas no login; tarjas: `fonte<11` 30, `tap<44` 29, `MENU DESTACA` 18, `SEM DESTAQUE NO MENU MOBILE` 12, `rolavel` 12, `ALVO NÃO ACHADO` 11, `estouroPainel` 5, `cortado` 4; 2 limpas. O achado próprio da largura: 5 linhas com estouro de layout e 28 com toque <44 px — comparadas par a par contra a MESMA tela @360 do diário mãe: `aee/horarios` painel +8701c, estouro +0px, tap +8; `aee/comunicados` painel +8663c, estouro +0px, tap +8; `student/comunicados` painel +45114c, estouro +0px, tap +4; `student/boletim` painel +44983c, estouro +0px, tap +4. Exemplo do que hoje é medida real: parent/atividades 1675c; student/atividades 1675c; student/horarios 645c.
17. **Os dois lados do `sports_operator`: fechados — e a prova que faltava foi feita em 17.b, que abriu um defeito de rota.** Banco: os dois lotes aplicados — o LOTE 1 em 14/10 (`audit-papel-sports-lote1.json`) e o LOTE 2 em 15/10 na janela sem varredura viva, conferido por catálogo e por rollback em D.2 (`audit-lote2-confere.json`, `contas_com_papel=0`). O passo `ddl-papel-sports` do driver **não disparou** (o driver foi aposentado em 15/10 exatamente porque o passo 0 dele aplicava o LOTE 2 sem OK; ver D.2). App: 4 visitas de `sports_operator` no diário web antigo, todas em `view=admin` com o despejo da admin (153578c); a tarefa #48 deu view própria ao papel e o antes/depois medido — local e no endereço público, shell `bfr-conecta-v34` — está em H.6. O que estava sem prova era o caso de uso inteiro: **não existia conta com o papel no banco**, então tudo que se media era o seletor de preview (`?role=`), não um operador logado — e a armadilha 32 valia para qualquer número de menu nessa linha. **Isso foi pago em 19/10** com conta real do enum, medida nas duas bandas da URL publicada: ver 17.b, que além da prova traz um defeito novo, e 17.c, que corrigiu o rig do papel, re-mediu as 4 rotas e **substituiu a causa do defeito** (não é a restauração de navegação; é o roteador não conhecer o papel). **17.d mediu o gesto**: pelo toque os jogos ABREM, e a tela que fica em branco é a do `inicio`. **17.e fez o A/B da candidata**: a primeira era código morto (hunk dentro do `if` do coordenador), a segunda — no idioma de tela-cheia do próprio arquivo — **mostra os jogos no `inicio` pelo canal programático e não muda nada pelo toque**, porque o toque não escreve classe em painel nenhum nem dispara `bfr:navigation`; a convergência dos dois canais que 17.c havia afirmado está refutada por medida. Remaining re-medida: 260 linhas ainda medem o fallback com o mapa de #52 aplicado. **17.f leu a PILHA do gesto e fechou a causa: o hunk do roteador firea também pelo toque e mostra os jogos, mas 6 ms depois o interceptor de clique do painel do responsável (`:15117` → `setHomeMode`) põe `hidden` em todo `#appShell .content` sem olhar o papel — provado por negação A/B/A com o id do `parentView` trocado. A candidata 3 (roteador + guard de papel) fecha a tela do operador pelo gesto e abre dois painéis no coordenador; decisão de projeto em aberto, nada aplicado.** **[17.g: decidida por medida — a candidata 4 (roteador + guard `activeView !== 'sports_operator'`, +270 chars, reversível) fecha o `inicio` do operador nas duas bandas e é IDÊNTICA ao publicado no coordenador @390/@1024 e na Direção @1024; falta o papel `parent` (sem credencial) e o A/B no ar exige OK explícito.]**
17.b **A prova que faltava foi feita com conta real — e ela abriu um defeito de rota que o preview não mostrava.** Conta sintética criada em 19/10 com OK explícito (`node cria-sessao-audit.mjs sports_operator`), papel validado contra `enum_range(null::account_role)` e não contra lista à mão: `profiles.role='sports_operator'` real, id `aaadabbc-bc1b-49d3-92b4-76214417a96b`, sessão em `bfr-audit-session-sports_operator.json` e credencial em `bfr-sintetica-cred-sports_operator.json` (reversível por `apaga-contas-auditoria.mjs`). Todas as medidas abaixo saem da **URL publicada v45 com sessão logada**, não do seletor `?role=` — é a armadilha 32 finalmente paga. **Banda web @1024** (`prova-operador--web.json`): as 4 rotas assentam em 1,15–1,32 s, `activeView=sports_operator` em todas (o papel TEM view própria desde #48), painéis `#schoolGamesView` 1206c/13ctl/147nós, `#bfrNotificationsView` 458c/2ctl, `#bfrContentHubView` 1124c/14ctl, `#schoolGamesView` 1206c/13ctl, `estouroDoc` 0, **0 erros de console**. **Banda mobile @390** com o estado de navegação alinhado à rota (`prova-operador--aquecido.json`, aquecimento `AQUECER=1`; a passada sem aquecimento está em `prova-operador-live.json`): mesmas 4/4 em 1,11–1,18 s com os mesmos painéis (1206/445/1124/1206), estouro 0, 0 erros. As tarjas do instrumento de varredura nessas 4 linhas (`audit-sweep-operador390.json`): `tapMenores` 0, `fontesBaixas` 0, `semNome` 0, `truncados` 0, `estouroDoc` 0. **Barra de baixo real, lida com a conta do papel:** 4 itens — 🏠 Início, 🏆 Jogos, 🔔 Avisos, ⋯ Mais — e em `jogos-escolares` o destaque é `aria-current="page"` no 🏆 Jogos. `conteudos` não tem item na barra (existe só no drawer "Mais"), então a tarja `SEM DESTAQUE NO MENU MOBILE` daquela linha pede destaque de um item que não está na barra: comportamento correto, não achado. **O achado novo, reproduzido três vezes em Chrome limpo** (`sonda-operador-sequencia-{inicio,notificacoes,conteudos}.json`): ao abrir a rota `jogos-escolares` num documento novo **quando o estado persistido guarda outra seção**, o app mostra a seção guardada e deixa o painel dos jogos montado, preenchido e oculto — `#schoolGamesView` com `class="content hidden"`, altura 0, 0 controles visíveis e 1031 caracteres dentro, enquanto `bfrNotificationsView` (460c) ou `bfrContentHubView` (1138c) continua na tela; `activeSection` = `jogos-escolares` e a barra marca 🏆 Jogos: **o menu diz uma tela e a tela mostra outra**, estável por 14–18 amostras seguidas (≤19 s), sem erro de console. Vem do rodapé do boot — confere nos bytes servidos (1× cada, `confere-operador-servido.mjs` sobre os 3.366.669 caracteres do `/` publicado): `:9133-9134` lê o estado persistido e `canRestoreSavedNavigation = savedNavigation?.role === role && savedNavigation?.section`, `:9135/:9140` decide `if (previousView !== role && !canRestoreSavedNavigation) { …navigateToSection('inicio') } else restoreNavigationState()`. **ESTA ATRIBUIÇÃO FOI REFUTADA NO MESMO DIA — ver 17.c.** A chave é por conta: `bfr-active-navigation-v2:aaadabbc-bc1b-49d3-92b4-76214417a96b` = `{role:'sports_operator', section:'<última visitada>'}`, medida nas três passadas. O ramo de `:9269` foi lido como "próprio e íntegro" na pressa de 19/10 e **também estava errado**: ele está dentro de `if (activeView === 'coordinator')`, ou seja, não serve ao operador (`:9269 if (section === 'jogos-escolares' && typeof window.BFRSchoolGames?.open === 'function') { window.BFRSchoolGames.open(); return true; }`). O módulo está montado (`temSchoolGames=true` nas 12 visitas das três passadas); **o clique não foi testado no ar** — varredura de clique roda no harness local com firewall e o 8240 está desligado desde #119. É primo do #39 (rota que não executa) com causa oposta: aqui executa e é sobrescrita; e é o vizinho indesejado do #9 ("voltar continua onde parou"), que restaura rolagem — aqui a restauração de seção engole a rota. **Mais três coisas que só a conta real mostrou:** (i) `inicio` e `jogos-escolares` são a **mesma tela** nas duas bandas (1206c/13ctl/147 nós, `#schoolGamesView`) — o papel declara 4 rotas e tem 3 telas; (ii) na banda web o item "🏆 Jogos Escolares" aparece **duas vezes** na sidebar visível, ambas com `aria-current=page`, e no `inicio` quem leva o destaque é Jogos enquanto Início fica `aria-current="false"` — o mecanismo do #55 com papel real; (iii) o breadcrumb do operador é escrito por dois caminhos que divergem no ar (`:9132` põe o rótulo do papel, `:9288` o da seção; os dois existem 1× no publicado): em Notificações e Conteúdos o cabeçalho continua dizendo "Jogos escolares". **Nada foi aplicado no app.** Correções de **instrumento** feitas: `cria-sessao-audit.mjs:42` zerava o manifesto e gravava só o run — na mint de 19/10 ele reduziu 4 contas vivas a 1; agora mescla por papel e confere cada e-mail contra `auth.users` antes de gravar, e `reconstroi-manifesto-contas.mjs` reescreveu as 4 com `papel` correto (o arquivo do coordenador não tinha o campo). `remint-live.mjs` não conhecia coordenador nem operador e estourava em credencial ausente — passou a listar os dois e a pular arquivo inexistente. Ficou em aberto no item 17: (a) as 260 linhas de fallback, que pedem o 8240 religado (não autorizado nesta rodada); (b) a prova do caminho de clique para (i)-(iii); (c) a linha `inicio` do sweep, marcada `NÃO CHEGOU (esgotou 50 s)` porque `VIEW_ESPERADA` (`audit-sweep2.mjs:106`) e o `audit-targets.json` ainda tratam o operador como view `admin`, leitura de 14/10 superada pelo #48 — defeito do rig, não do app. **(b) e (c) foram pagos: (c) em 17.c e (b) em 17.d, que mediu o clique executado e trocou o diagnosis de lugar.**
17.c **O rig corrigido re-medeu as 4 rotas — e a re-medida refutou a causa que 17.b havia proposto.** Três consertos de **instrumento**, todos validados antes de medir (`node --check` nos dois `.mjs`, `JSON.parse` no mapa: 13 papéis, e `#adminView` só sobra em `admin`): (1) `audit-sweep2.mjs:106` tinha `VIEW_ESPERADA = { sports_operator: 'admin' }` — leitura de 14/10 superada pelo #48; com o papel devolvendo `activeView='sports_operator'`, o gate de `:124` exigia uma view que não existe e, como `'inicio'` está excluído do ramo "seção certa em view errada", a linha nunca assentava. Virou `{}` (sem entrada, o gate pede `activeView === papel`). (2) `audit-targets.json` dava `#adminView` ao `inicio` do operador → `#schoolGamesView`. (3) novo no `bootstrap-publicado.mjs`: `AUDIT_LIMPA_NAV=1` apaga as chaves `bfr-active-navigation-v2:*` no `addScriptToEvaluateOnNewDocument` (antes de qualquer script do app) e grava `window.__AUDIT_NAV_LIMPA`. **Desligado por padrão** de propósito: as diárias já gravadas (323 web, 248 mobile, 164 funcional) mediram com o estado acumulado e precisam continuar comparáveis. Sessão remintada antes de medir (`bfr-audit-session-sports_operator-live-v45.json`, `exp=2026-10-19T20:46:49Z`) porque a mint da tarde expira em 14 min — é a dívida de higiene "passada depois de o token expirar". **Re-medida @390** (`audit-sweep-operadorfix.json`, URL publicada, porto 9384, `AUDIT_LIMPA_NAV=1`): `inicio` 5.948 ms `#schoolGamesView` 1210c/15ctl/1677px `usouAlvo=true`, `notificacoes` 4.541 ms `#bfrNotificationsView` 447c/3ctl/784px true, `conteudos` 4.616 ms `#bfrContentHubView` 1125c/15ctl/2073px true, `jogos-escolares` 3.750 ms **`usouAlvo=false`** e painel medido 1138c/2073px — que é o hub de conteúdos, não os jogos. Ou seja: **o `NÃO CHEGOU (esgotou 50 s)` era mesmo defeito do rig (dívida (c) paga) e, corrigido, 3 das 4 linhas passam a medir a própria tela.** **Controle**: a mesma rota sozinha em Chrome novo (`--so=jogos-escolares`, `audit-sweep-operadorsojogo.json`) mede `#schoolGamesView` 1210c/15ctl/1677px `usouAlvo=true` em 7.952 ms. **@1024** (`audit-sweep-operadorwebfix.json`): mesmo desenho (1210/447/1125 no alvo, `jogos` cai no hub 1138c/1104px) e, de brinde, a **primeira contagem de alvo de toque no papel medida na tela certa**: `tap<44` 8 / 2 / 8 / 8, `fonte<11` 0, `semNome` 0, `estouroDoc` 0 — resíduo da classe #89 (banda web), não achado novo de fonte. **A refutação**: a sonda de cadeia rodou com a chave apagada e imprimiu `navLimpa=1` (uma chave `bfr-active-navigation-v2:<uuid>` removida no início do documento) e **o defeito continuou idêntico** — `#schoolGamesView` com `class="content hidden"`, altura 0, 1031 chars dentro, 0 controles visíveis, enquanto `#bfrContentHubView` seguiu o único `.content` visível (1138c) por 6,8 s a 18,9 s, `activeSection=jogos-escolares` e a chave reescrita pelo app com `section:"jogos-escolares"`. Logo a restauração de navegação **não** é a causa; 17.b propôs aquilo com uma leitura de código e a medida de hoje a derrubou. **A causa, provada nos bytes servidos** (`confere-causa-operador.mjs`, status 200, 3.366.669 chars, nada navegado): o ramo que abre os jogos dentro de `navigateToSection` está **guardado pelo papel errado** — `if (activeView === 'coordinator') {` aparece 1× e o ramo `section === 'jogos-escolares' … BFRSchoolGames.open(); return true;` está 51 caracteres **dentro** dele; o mapa `const view = { parent:parentView, … }[activeView]` (`:9277`) tem **12 chaves e nenhuma `sports_operator`**, e não cita `schoolGamesView`; o mapa `targets` (`:9251`, 3.938 chars) não tem `sports_operator` nem `jogos-escolares`. Consequência mecânica: para o operador `targetView` é `undefined`, então `:9284 targetView?.classList.remove('hidden')` e o `setTimeout` de `:9285` não fazem nada — **o roteador não mostra painel nenhum nem esconde o anterior**, enquanto o breadcrumb (`:9288`) e o evento `bfr:navigation` (`:9289`) continuam disparando: daí "o menu diz uma tela e a tela mostra outra". O que mostra os painéis do operador são os próprios módulos (`#bfrNotificationsView`, `#bfrContentHubView`) e, só para os jogos, o rodapé do boot (`:9130`, 1×) — por isso a rota funciona sozinha e falha depois de outra rota. **A cadeia completa em uma aba, sem nenhuma flag (o que o usuário vê)** `sonda-operador-cadeia.json`: `inicio` → só `schoolGamesView` 1677px; `notificacoes` → `bfrNotificationsView` 784px visível, jogos `content hidden` alt 0 com 1158c dentro; `conteudos` → hub 2073px visível, notificações hidden (459c), jogos hidden (1031c); `jogos-escolares` → **hub continua visível 1138c/2073px e os jogos seguem `content hidden` alt 0**. Exatamente uma das quatro rotas não mostra o próprio painel, e é a rota que dá o nome ao papel. **Dívida (b) paga por caminho de código, não por clique executado**: o toque na barra de baixo cai em `bfr-responsive-presentation.js:511-516 → navigate(route)`, e essa função (`:460-464`) ou clica no item visível `#appShell [data-section]` (→ handler `index.html:9292-9294` → `navigateToSection`) ou chama `window.BFR_APP_RUNTIME?.navigate?.(route)`, que `:16004` define como `navigate: section => navigateToSection(section)`. Os dois caminhos convergem na MESMA função medida falhando, então o `?open=` desta passada exercita a mesma entrada do toque; **um clique executado continua precisando do harness local com firewall (8240 desligado desde #119)** e não foi feito. **Nada foi aplicado no app e nada foi publicado**; as 260 linhas de fallback da banda web continuam devendo o 8240 religado. **[17.d: o clique executado aconteceu, sobre os bytes publicados, e a conclusão deste parágrafo precisa de correção — pelo gesto o painel dos jogos ABRE; a tela que fica em branco é a do `inicio`, e a cadeia da 17.c não se reproduz em perfil limpo.]**
17.d **O clique executado foi feito — e ele muda de figura: o toque em Jogos ESCONDE a causa e abre uma tela em branco nova.** Primeiro o instrumento, porque a dívida pedia o harness **sobre os bytes do ar**: `audit-harness.mjs` ganhou `AUDIT_DIR` (padrão inalterado = `bfr-conecta-patched/`), e montei `bfr-publicado-servido/` baixando do próprio origin cada arquivo que o `/` publicado referencia. Conferência byte a byte dos 13 arquivos: **só `index.html` e `bfr-responsive-presentation.js` diferem** do patched (md5 publicados `2a7b7290…`/`a2cacc7e…`; os 22 linhas de diferença do JS são `font-size` 9→11px do backlog #104–#110 e a tabela de ícones — nada no roteador). O harness 8243 serve o index publicado (3.366.669 chars, batido no log de boot) com o mesmo bootstrap de sessão e o **mesmo firewall** do `audit-clicks-seguro.mjs`. Sessão remintada antes (a da tarde expira em 14 min e estava a 5 min de morrer — armadilha 44). Toque de verdade = `Input.dispatchMouseEvent` no centro da caixa com `elementFromPoint` confirmado antes de clicar. **Resultado 1 — o toque funciona, e a 17.c não media isso:** partindo de Avisos (@390, `sonda-operador-clique-390.json`), o toque em 🏆 Jogos **mostra** `#schoolGamesView` (classe `content`, altura 1677, 1210c) nas 3 tentativas (passos 1, 3, 4; 7/7 amostras de cada passo), e em @1024 (`sonda-operador-clique-1024-sidebar.json`) o toque na sidebar idem, 2/2, altura 997. **Resultado 2 — a tela em branco que nenhuma varredura viu:** o toque em 🏠 Início deixa **zero `.content` visíveis** (`sonda-operador-clique-390-partirdafalha.json`, passo 2: `visiveis=[]` em 7/7 amostras por ~10 s), com os jogos `content hidden` alt 0 e 1158c dentro, `activeSection=inicio`, barra destacando Início e o breadcrumb lendo "Visão geral / Início". Todas as outras telas do operador medidas até aqui foram alcançadas por deep-link de boot, onde o rodapé `:9130` chama `BFRSchoolGames.open()` e pinta a tela; **pelo gesto do usuário o roteador é a única coisa em jogo, e ele não tem view para o papel** — a causa da 17.c, agora provada por clique e não por inferência. **Resultado 3 — por que os canais divergem:** `index.html:20425` tem um listener de **captura** no `window` que, para qualquer `[data-section="jogos-escolares"]`, faz `preventDefault(); stopImmediatePropagation(); setTimeout(open, 0)` sem guard de papel. Ele atropela o resto do roteador e do módulo de apresentação, então o painel abre pelo caminho particular do módulo de jogos e **ninguém atualiza o estado**: depois do toque em Jogos, `activeSection` ficou `notificacoes` (e `inicio` no passo 3) e o `aria-current` da barra ficou no item antigo (`jogos:"false"`, `avisos:"page"`) com a tela mostrando os jogos; o breadcrumb, escrito por outro caminho, acompanha o toque e por isso em @390 passou o passo 2 inteiro dizendo "Jogos Escolares" enquanto a tela era a de Avisos. O `início` não tem esse interceptador — e é justamente ele que fica em branco. **Refinação da 17.c (honesta, medida hoje):** com perfil de Chrome novo (sem estado acumulado), o boot `?open=jogos-escolares` **assentou** com `#schoolGamesView` visível — a cadeia que falhava em `sonda-operador-cadeia.json` depende de o documento já ter navegado antes na mesma aba; e um toque em Jogos recupera a tela em qualquer dos estados. O que **não** se recupera é o `inicio` por toque. **Custo:** 0 erros de console nas três passadas e a única escrita barrada foi `POST /cdn-cgi/rum?` (telemetria do Cloudflare, não do app) — `barradas=1` em cada diário. PNGs `operador-clique-390-*.png`, `operador-clique-1024-*.png`. **Nada foi aplicado no app e nada foi publicado**; a candidata para o roteador do operador (dar `sports_operator` ao mapa de views + tirar o ramo dos jogos do `if (activeView==='coordinator')`, ou deixar o `início` do papel apontar para a tela que existe) ainda precisa de A/B neste mesmo harness e de OK explícito.
17.e **A primeira candidata era código morto, a segunda conserta o canal programático e NÃO conserta o gesto — medido.** Começa pelo instrumento, porque a rejeição de 17.d estava errada. `gera-candidata-operador-roteador.mjs` insere **depois** da âncora, e a âncora escolhida era a linha `if (activeView === 'coordinator') {` — o hunk caiu para **dentro** do bloco do coordenador, onde `activeView === 'sports_operator'` não pode ser verdadeiro: prova por balanceamento de chaves (`function navigateToSection` existe 1× no documento, corpo entre os offsets 1.110.047 e 1.126.278; o hunk da candidata 1 está em 1.116.330, mas dentro do `if` do coordenador) e `md5sum` dos dois diretórios servidos (`index.html` `2a7b7290…` vs `4ab10dc2…`, **+193 chars**, e `bfr-responsive-presentation.js` **idêntico** `a2cacc7e…` nas duas bases). Consequência: a candidata 1 e o publicado **não diferem em comportamento nenhum**, e o `barraExiste:false` medido nela (`sonda-operador-barra-8245-jogos-escolares.json` × publicado `barraExiste:true, alturaBarra:72, itens:[inicio,jogos-escolares,notificacoes,more]`) **não pode ser efeito do hunk** — é o rig: `bfr-responsive-presentation.js:584-586`, o `sync()` chama `document.getElementById('bfrMobileBottomNav')?.remove()` enquanto `#appShell` não tem a classe `ready`, e o módulo é o debounce com teto da família #16/#37. **A "regressão do menu" com que 17.d rejeitou a candidata 1 é retirada.** O gerador ganhou três portões: recusa âncora que termina em `{` (a classe exata do defeito), confere que a linha de antes é a âncora e a de depois é um ramo vizinho, e o `new Function` em cada bloco `<script>` do resultante (98 blocos, 0 erros de sintaxe).
   A candidata 2 (`bfr-candidata-operador-roteador-2/`, 3.366.879 chars = +210, reversível byte a byte) põe o ramo no **idioma que o próprio arquivo usa para tela-cheia**, como irmão de `:9239 alimentacao`/`:9240 biblioteca`/`:9241 atividades`: `if (activeView === 'sports_operator' && (section === 'inicio' || section === 'jogos-escolares') && typeof window.BFRSchoolGames?.open === 'function') { window.BFRSchoolGames.open(); return true; }` na linha 9242, antes do `const view = {…}[activeView]` (`:9277`, 12 chaves, nenhuma do papel). **A/B pelo toque, @390, harness 8243=publicado × 8245=candidata, firewall de escrita instalado por `addScriptToEvaluateOnNewDocument`, boot em Avisos, sequência Início→Avisos→Jogos→Início** (`sonda-operador-clique-390-pub-17e.json`, `sonda-operador-clique-390-cand2.json`): os passos 1 e 4 dão **`visiveis=NENHUM` nas duas bases** — a candidata **não fecha a tela em branco**. A divergência existe e é outra: no publicado o passo 1 deixa o breadcrumb em `Visão geral / Início`; na candidata fica `Visão geral / Jogos Escolares` (ou seja, o `:9288` do fim da função deixou de rodar para o `inicio`, marca de que algo mudou de caminho).
   O desempate foi por log de escrita, não por estado final — as duas leituras anteriores não podiam ver o `open()` escrever porque **partiam de os jogos já estarem na tela**, e a primeira versão da sonda instalou o observer com os três painéis ainda fora do DOM (`sonda-operador-hunklog-cand2.json` e o diário do primeiro `desempate`: `SEM schoolGamesView`, `SEM bfrNotificationsView`, `SEM bfrContentHubView`, passada inteira sem leitura). Corrigido o portão (espera os três elementos existirem + `#appShell.ready` + `activeSection` do boot), `sonda-operador-desempate-cand2.json` dá, na candidata: referência Avisos `visiveis=bfrNotificationsView` → **calibração** `BFRSchoolGames.open()` à mão `visiveis=schoolGamesView` (prova de que o observer vê o `open()` escrever) → `navigate('notificacoes')` devolve Avisos → **`navigate('inicio')` pelo runtime: `sec=inicio`, `visiveis=schoolGamesView`, `navs=0`** — o hunk FIREA no canal programático e por `return true` antes do `:9289`, que é justamente por que o evento não sai → **toque em 🏠 Início: `sec=inicio`, `visiveis=NENHUM`, nenhum evento, e o log não registra UMA escrita de classe depois do toque**. Custos das três passadas: 0 erros de console e a única escrita barrada continuou `POST /cdn-cgi/rum?` (`barradas=1` em cada diário). Sessões: mint das 20:52Z, expira 21:52:24Z (`exp=1792446744`), todas as medidas acima dentro da janela.
   **O que fica provado e o que fica aberto.** Provado: (i) o roteador do operador responde pelo canal programático — dar o ramo ao papel mostra os jogos no `inicio` e nenhum painel fica na tela; (ii) **o toque não chega nesse ponto**: ele não escreve classe em painel nenhum e não dispara `bfr:navigation`, enquanto a MESMA chamada pelo runtime escreve — logo a afirmação de 17.c de que "os dois caminhos convergem na mesma função" era inferência de leitura e **está refutada por medida**; (iii) a peça que faltava está entre o handler do toque e o corpo de `navigateToSection`, e o único candidato visível no DOM é a seleção do módulo de apresentação (`:452-455`): `#appShell [data-section="inicio"]` tem **2 nós, ambos `button.nav-item`, ambos com retângulo `[0,0,0,0]` e `visivel:false`** (@390; `sonda-operador-toque-nav-cand2.json`), e o filtro do RPJS só exclui quem tem a CLASSE `hidden` — o `canonical.click()` vai num botão que não está na tela. Aberto, na ordem: descobrir onde o gesto retorna (o `return false` de `:9160 canLeaveAdminStudentForm`, o fallback de `:9182`, ou o clique que não chega ao handler de `:9292`), e só então re-gerar a candidata contra o **canal do toque**, não contra o `navigate()` do runtime. **Nada foi aplicado no app e nada foi publicado**; o harness 8243 (publicado) e o 8245 (candidata 2) continuam ligados, e a sessão do operador morre às 21:52:24Z. **[17.f: as duas frases sublinhadas acima — "o log não registra UMA escrita de classe depois do toque" e "o toque não chega nesse ponto" — são defeito do INSTRUMENTO e estão retiradas. O observador de mutação lê `el.className` dentro do callback, que é um microtask rodado depois do script síncrono: as 57 linhas do diário dizem todas o MESMO estado final. Pela pilha, o toque dispara o hunk e o `open()` escreve sim — e 6 ms depois um terceiro código embaralha a tela.]**
17.f **A pilha do toque entregou o culpado, a negação o provou, e a candidata que fecha o operador abre um rastro no coordenador.** Primeiro o instrumento, porque a leitura anterior estava cega: o `MutationObserver` entrega o callback como microtask **depois** do script síncrono, então `el.className` dentro dele devolve o estado final do nó, não o de cada escrita — as 57 linhas de `sonda-operador-desempate-cand2.json` são o mesmo valor repetido, e foi isso que produziu o "zero escritas" de 17.e (família das armadilhas 85/88: instrumento que parece ler e não lê). `sonda-operador-pilha.mjs` então embrulha `DOMTokenList.prototype.add/remove/toggle` na página (nada é escrito no app) e, no `Element.prototype.classList` (getter), associa cada tokenlist ao nó dono num `WeakMap`; cada escrita num `.content` sai com a pilha crua. **Atribuição, candidata 2, @390, boot em Avisos** (`sonda-operador-pilha-cand2-fresh.json`): pelo runtime — `17802ms rm schoolGamesView [hidden] via Object.open < navigateToSection < navigate < app.navigate`, tela limpa; pelo **toque** — `21037ms rm schoolGamesView [hidden] via Object.open < navigateToSection < HTMLButtonElement.<anônimo> < navigate (bfr-responsive-presentation.js?v=13:455:30)` **e o hunk firea, os jogos ficam visíveis**, 6 ms depois `21043ms add <em> [hidden] via <anônimo>:95:245 < setHomeMode < HTMLDocument.<anônimo>:100:751` — um `forEach` que põe `hidden` em TODOS os `#appShell .content` e não mostra nenhum. `setHomeMode` é `index.html:15112` e quem o chama sem pedir papel é o **último ramo do listener de clique do painel do RESPONSÁVEL** (`:15117`): `const nav = event.target.closest('.bfr-legacy-nav .nav-item[data-section],.bfr-platform-nav-item'); if (nav && root()) setHomeMode(nav.dataset.section === 'inicio' || nav.dataset.platformArea === 'inicio')`, com `root() = getElementById('parentView')` (`:15020`) — nó que existe no DOM em todo papel. Com `inicio`, a função esconde tudo menos o `parentView`; como o `parentView` já estava escondido, o líquido é **nada na tela**, e é a última escrita do gesto. **Negação (armadilha 91 paga): A/B/A na mesma aba, só trocando o id do nó** — `sonda-operador-negacao-cand2.json`: A toque com o interceptor no lugar `visiveis=NENHUM`; B `parentView` → `parentView-NEGADO`, mesmo gesto `visiveis=schoolGamesView` `content|alt1677|1210c`; C id restaurado `visiveis=NENHUM` outra vez. **Causa provada por escrita, por pilha e por reversão.** **Escopo medido no PUBLICADO com conta real do coordenador** (harness 8247, `sonda-operador-negacao-coord-pub.json`): lá o toque pousa (`A visíveis=coordinatorView`) e a negação deixa **dois** painéis (`B coordinatorView+bfrNotificationsView`) — o hide-all do interceptor é, hoje, a limpeza de palco de quem não é responsável; o efeito visível da escrita é específico do operador, a escrita em si não é. **Candidata 3** (`gera-candidata-operador-roteador-3.mjs`, `bfr-candidata-operador-roteador-3/`, 3.366.930 chars = **+261** sobre os bytes publicados, reversível byte a byte, 2 hunks: linha 9242 o mesmo ramo do roteador, linha **15117** o guard `&& window.BFR_APP_RUNTIME?.activeView === 'parent'`): **no operador ela fecha a tela pelo gesto** — `sonda-operador-negacao-cand3-op.json` A/B/C todos `visiveis=schoolGamesView` `content|alt1677|1210c` (o painel do responsável continua `hidden`, 7.550c dentro). **E abre o débito no coordenador** — `sonda-operador-negacao-cand3-coord.json`: A/B/C todos `coordinatorView+bfrNotificationsView` onde o publicado dá **um só** painel. **Estado honesto: a candidata 3 resolve a tela do operador e regride a do coordenador no mesmo gesto; a decisão de projeto é qual dos dois hide-alls é o dono da limpeza** — (a) guard por papel no interceptor + o roteador esconde o que sobrou (conserta o operador, mas hoje o coordenador fica com dois painéis), (b) o guard só para o papel que não tem `targetView` no mapa (`:9277`), que é mais estreito e não toca o coordenador, ou (c) o `setHomeMode` esconder "todos exceto a view do papel ativo" em vez de "todos exceto o `parentView`". Nada foi medido para o **papel responsável** porque não há credencial sintética dele (`pulado bfr-sintetica-cred-parent.json: arquivo de credencial não existe`), então o risco de regressão em `parent` está **aberto e não quantificado**. **Nada foi aplicado no app e nada foi publicado.** Harnesses ligados: 8243 publicado+operador (sessão velha), 8245 candidata 2+operador (sessão velha), 8246 candidata 2+operador, 8247 publicado+coordenador, 8248 candidata 3+operador, 8249 candidata 3+coordenador — sessões remintadas às 21:37Z com expiração 22:37:13Z. Custo das quatro passadas deste parágrafo: `node --check` nos três `.mjs`, 0 erros de console, escrita barrada apenas `POST /cdn-cgi/rum?`. PNGs `operador-pilha-cand2.png`, `operador-negacao-*.png`.
17.g **As três saídas viraram uma pergunta medida, e a de menor raio venceu: guard de UM papel fecha o operador nas duas bandas sem mover coordenador nem Direção.** Instrumento primeiro, porque as dívidas de higiene cobram juros: as sessões relembradas às 21:37Z **morreram às 22:37:13Z** e relembrar não basta — o harness assa a sessão nos bytes servidos (armadilha 96), então cada porta foi refeita com a mint nova das 22:46Z (`exp=2026-10-19T23:46:08Z`): 8243 publicado+operador, 8244 candidata+operador, 8245 publicado+coordenador, 8246 candidata+coordenador, 8247/8248 o par da Direção, com o `index.html servido` impresso no boot conferindo a base (3.366.669 × 3.366.939 chars). **Por que não a variante "tem container no mapa":** lida em código, a predicate `getElementById(activeView+'View')` reproduz as 12 chaves de `:9277` (os 12 ids existem no arquivo, nenhum `sports_operatorView`) e parece inocente — mas o `developer` **também** não tem chave, e a leitura de quem é `activeView` dele foi desfeita por medida (abaixo: é `admin`, via `?role=`). Retirar o hide-all do developer por inferência é mexer na banda da Direção, que está FECHADA com 15/15 rotas. Ficou a candidata 4 (`gera-candidata-operador-roteador-4.mjs` → `bfr-candidata-operador-roteador-4/`, **+270 chars, reversível byte a byte**): o mesmo hunk de roteador da candidata 3 e, no interceptor `:15117`, `window.BFR_APP_RUNTIME?.activeView !== 'sports_operator'` — uma conjunção que é verdadeira em todo papel exceto o único com a tela aberta. O portão de sintaxe foi conferido **contra a origem** e diz menos do que parece: `108 blocos <script>, 8 erros na origem, 8 na candidata` — o que ele prova é "nenhum bloco novo inválido", não "o arquivo compila". **Medida (@390, toque real na barra de baixo, `sonda-operador-clique-390-{pub,cand4}-17g.json`):** no publicado os passos 1 e 5 (toque em 🏠 Início vindo de Avisos) dão `visiveis=NENHUM`; na candidata dão `schoolGamesView` `content|alt 1677|1210c`, um painel só, nos 3 passos em que o gesto chega ao roteador; os passos 2 e 4 (Avisos, Jogos) são **idênticos nas duas bases**. `conteudos` não é clicável na barra @390 em nenhuma das duas (`alvo_nao_encontrado`) — limitação do desenho da barra, não da candidata. **Medida (@1024 pela sidebar `.bfr-platform-nav [data-section=…]`, que tem as quatro rotas do papel):** publicado `NENHUM` nos passos 1 e 5 × candidata `schoolGamesView alt 997`, e passos 2/3/4 idênticos (avisos `bfrNotificationsView`, conteúdos `bfrContentHubView`, jogos `schoolGamesView`). **Regressão que a candidata 3 tinha: sumida** — coordenador @390 (`sonda-operador-negacao-{17g-pub,17g-cand4}-coord.json`, A/B/A com a negação por id) dá as MESMAS três leituras nas duas bases (`coordinatorView` / `coordinatorView+bfrNotificationsView` / `coordinatorView`), e coordenador @1024 idem passo a passo. **O defeito de instrumento que quase passou por achado:** `sonda-operador-clique.mjs:96` fixava `?role=sports_operator` e a variável `ROLE` que eu passei no env não existia; as duas primeiras passadas "developer" mediram, portanto, **a persona do operador sobre a sessão do developer**, e a candidata mostrou `schoolGamesView alt 1536, 1870c` onde o publicado mostrava `NENHUM`. Corrigido o instrumento (`ROLE` de verdade + `role:` gravado no diário), o par re-medido dá `adminView` → `bfrNotificationsView` → `adminView` **idêntico nas duas bases**. Duas coisas ficam dessa confusão, e nenhuma é cosmética: (i) o `activeView` é escolhido pelo **param da URL**, independente da sessão — sessão de developer com `?role=developer` dá `activeView=admin`, com `?role=sports_operator` faz o ramo do operador fire — o que abre a pergunta de escalonamento pelo lado inverso e virou **item 25**; (ii) o hunk que eu achava inerte para todo papel exceto o operador **não é inerte para a sessão de outro papel pedindo a persona do operador**, exatamente porque os dois lêem a mesma variável. **Sobram abertos, medidos e não resolvidos:** o desync de estado do toque em Jogos (fica `sec=conteudos`/`notificacoes` e o `aria-current` em `jogos:"page"` mesmo quando o toque foi no Início — é o listener de captura `:20425` de 17.d, que a candidata 4 não toca), e o papel `parent`, que continua **impossível de medir** porque não há credencial sintética de responsável. **Nada foi aplicado no app e nada foi publicado**; a candidata 4 está pronta para A/B no ar só com OK explícito, e as 6 portas continuam ligadas com sessão até 23:46:08Z.
18. **Os dois defeitos de tela que têm decisão do responsável e patch pronto (#50 FAB, #51 chip) — e o que ainda não tinha sensor.** #51 primeiro, porque a causa é lida no arquivo e agora tem diário (`audit-escritores-chip.mjs`): o "Atualizando dados…" mora em 4 escritores de index.html, dos quais **3 vivos** e 1 morto (bfr-coordination-command:14050 — bloco `data-bfr-auth-deferred-disabled`, o engano de cópia morta desta auditoria). O único escritor vivo cujo estado ocioso é `null` é bfr-coordination-ux:1032, no script `bfr-coordination-ux`, e a guarda dele é `if(update&&updatedText&&…)`: **texto nulo não limpa a tela**, então o que foi escrito durante a carga fica para sempre. Os outros dois vivos (:522, :22640) já usam `'Aguardando dados'` e escrevem no MESMO atributo `[data-coord-updated]` (6 ocorrências no documento) — qual texto vence na tela é pergunta de runtime, não de leitura. A decisão aplicada no candidato é a do idioma que o próprio app já usa: **rótulo neutro "Aguardando dados"** quando não há consulta em voo, mais a guarda síncrona do `periodMeta()` (única chamada antes do `try` do `load()`: se ela lança, o `finally` nunca roda, `state.loading` fica `true` e nenhum request está em voo — é literalmente o "Atualizando" sem carga). E o débito de prova: a caçada anterior ao chip estava **vazia** — ela procurava texto em `painelAmostrado`, que os diários de varredura gravam como booleano; o diário `audit-caca-atualizando.json` agora diz isso em vez de fingir contagem: audit-sweep-mobile.json=820 linhas, sensores NENHUM · audit-sweep-funcional.json=164 linhas, sensores NENHUM · audit-sweep-web.json=434 linhas, sensores NENHUM. Ou seja, **não existia número** de telas com o chip preso antes da sonda.
   **linha de base** (2026-10-15T03:54, 6 larguras 320/360/375/390/430/768, 5 com retângulo lido e 1 sem medida (@320)): menu desenhado com altura máxima **72px** e faixa reservada pelo shell de **100px** (`--bfr-nav-piso` não está definido no elemento, então o `calc()` usa o fallback de 108 px) · **FAB ou LIA dentro da faixa reservada em 5/5 larguras, penetração máxima 12px: @360 FAB 88px→dentro 12px, LIA 96px→dentro 4px; @375 FAB 88px→dentro 12px, LIA 96px→dentro 4px; @390 FAB 88px→dentro 12px, LIA 96px→dentro 4px. Contra o retângulo do menu `sobrepoe` é false nas duas geometrias — a faixa reservada é a grandeza que diagnostica o defeito. Chip da Coordenação no tempo: **1 largura ainda em "Atualizando dados…" aos 7 s/12 s com o shell pronto** — 768px: 2000ms/4000ms/7000ms. Detalhe por linha em `audit-fab-geometria-antes.json`, deriva da faixa em `audit-fab-reserva.json`. #50: o patch **aplicado** sobe os dois botões para `calc(var(--bfr-nav-piso, 108px) + 8px + env(safe-area-inset-bottom))` (e +58px para a LIA minimizada, que vira bola de 54 na mesma coluna do botão de aluno) — os 16 px de folga medida são exatamente 108+8, i.e. o `calc()` caiu no fallback de 108 porque a variável não está definida no elemento. Se o menu um vez passar de 108 px em alguma largura, o valor real tem de vir do `ResizeObserver` de `bfr-responsive-presentation.js`, e isso exige `?v=12` no HTML e na `PRECACHE_PATHS` do sw.
   Estado da aplicação: `index.html` em 2026-10-15T03:46, modo **aplicação**, 4/4 alvos (`CSS — LIA acima do piso do menu` aplicado; `CSS — botão "Cadastrar aluno" acima do piso` aplicado; `APP — chip de status com estado neutro` aplicado; `APP — guarda síncrona do periodMeta no load()` aplicado), reversão nos backups `index.html.bak-fab-piso-1` e `index.html.bak-status-voo-1`. Relido depois: 4 escritores, 3 vivos, **0 vivo com fallback `null`** (antes: 1), 1 morto(s). **depois do patch** (2026-10-15T03:50, 6 larguras 320/360/375/390/430/768, 5 com retângulo lido e 1 sem medida (@320)): menu desenhado com altura máxima **72px** e faixa reservada pelo shell de **100px** (`--bfr-nav-piso` não está definido no elemento, então o `calc()` usa o fallback de 108 px) · **FAB e LIA FORA da faixa reservada nas 5 larguras, folga mínima 16px (FAB) e 16px (LIA). Contra o retângulo do menu `sobrepoe` é false nas duas geometrias — a faixa reservada é a grandeza que diagnostica o defeito. Chip da Coordenação no tempo: nenhuma largura com o chip preso em "Atualizando" aos 7 s ou 12 s com o shell pronto. Detalhe por linha em `audit-fab-geometria-depois.json`, deriva da faixa em `audit-fab-reserva.json`. A 6ª largura do brief, no build corrigido e com o portão de painel + mapa novo (#42): 164 linhas @390 em `audit-sweep-pos-alvos.json`: assentaram **159**, ficaram em "teto esgotado" 0, mediram no alvo pedido 119; tarjas `audit-tarjas-pos-alvos.json`: 4 limpas, `tap<44` 96, `fonte<11` 94, `SEM DESTAQUE NO MENU MOBILE` 82, `MENU DESTACA` 69, `ALVO NÃO ACHADO` 45, `rolavel` 32. **Este patch foi publicado**: deploy `76cc8f58`, `CACHE` `bfr-conecta-v33` → `bfr-conecta-v34`, e as 4/4 marcas das edições #50/#51 conferidas como literal no HTML que o Worker serve hoje (`audit-pre-voeu-50-51.json` + `audit-publicacao.json`).

19. **O portão de assentamento media o documento onde devia medir o painel (#49).** A sonda de
   assentamento de `audit-sweep2.mjs` já tirava chars e controles do `.content` visível, mas a terceira
   peça da tripla era `document.getElementsByTagName('*').length` — contagem do documento inteiro. Uma
   injeção fora da view (LIA, barra de baixo, badges, folhas de estilo) muda esse número, a igualdade por
   duas sondas seguidas nunca fecha e a tela é registrada como "teto esgotado" mesmo com o painel pronto.
   O débito medido nos diários que existem: **87** das 820 linhas da passada mobile
   tiveram pelo menos uma sonda "teto esgotado" (`84` terminaram sem
   assentar e o `debito-do-portao.mjs` julga 59 aproveitáveis e 10 duvidosas) e **170** das 656 da passada web em curso. `audit-sweep-funcional.json` (o lote @390 anterior ao portão) não tem campo de assentamento, então não entra nessa conta.
   Agrava o quadro: o diário gravava só `{assentou, ms, motivo, ctl}`, então **nenhuma dessas linhas é
   diagnosticável depois** — não dá para dizer se chars/controles estavam estáveis e só a contagem de nós
   do documento mudava. Isso é ausência de sensor, não achado do app, e foi tratado como tal.
   Estado do conserto (muda o instrumento, não o app): diário `audit-patch-portao.json` em modo **aplicação**, 6/6 edições aplicadas + `node --check` OK, backup `bak-portao-1-audit-sweep2.mjs`, varredura viva no momento da corrida: false. As duas correções — `n` do painel (o total
   do documento continua gravado como `nosDoc`, não comparado) e a série das últimas 14 sondas no diário —
   entram na cauda **antes** de `aplica-mapa-alvos`, de propósito: a passada mãe e a publicada ficam com o
   portão velho e as re-medidas com o novo, e nenhuma comparação entre os dois grupos pode ser lida como
   diferença do app.

20. **O que a chave publishable alcança sozinha (#32, superfície `anon`).** Medido no catálogo e por
   `GET` de REST — nenhuma escrita, nenhum registro exibido. **Funções:** 56 funções
   `public` executáveis por `anon`, 41 com verificação de sessão no
   próprio corpo e 15 sem — e essas se decompõem em 5
   *trigger functions* (não são chamáveis por ninguém), 4 funções puras (normalizador de
   CPF/nome e `bfr_subject_matches`, que não lê tabela) e 6 predicados booleanos que
   delegam para `bfr_staff_role()`, cujo corpo devolve string vazia quando `auth.uid()` é nulo
   (conferido em `audit-is-developer.json`). **Risco de oráculo:
   0** (função que recebe uuid do chamador, lê tabela e não tem guarda
   direta nem delegada) e **0** funções alcançáveis por
   `anon` e não por `authenticated`. Os dois predicados que aceitam uuid
   (`bfr_collab_can_profile(uuid)`, `bfr_staff_can_message_recipient(uuid)`) gateiam pelo papel do
   CHAMADOR e não pelo argumento, então não enumeram terceiros. **Privilégios:**
   159 tabelas em `public`, 156 com privilégio de
   escrita para `anon` antes do revoke (padrão do Supabase) e **22 depois** —
   as 22 restantes são exatamente as que têm policy para `anon`/`public`;
   **0 sem RLS** e
   **0 expostas** — a barreira é a RLS em todas.
   **Policies:** 38 policies em 22 tabelas
   valem para `anon`/`public`; **0** policy de
   UPDATE/DELETE/ALL sem `USING`. Teste decisivo por REST com a chave publishable nas
   22 tabelas com SELECT para `anon`:
   **0 devolvem linha**
   (todas 0 linhas); access_requests → HTTP 401 (permission denied for function is_developer).
   O 401 é negação, não tela quebrada: das 51 funções citadas em policies,
   **0** são inexecutáveis por `authenticated` e
   17 por `anon`.

20.b **Duas armadilhas que o #32 deixou documentadas, e o endurecimento agora aplicado.** (1) As 5 views
   `sports_public_*` **não** têm `security_invoker` (sports_public_athletes: opções=(nenhuma); sports_public_match_events: opções=(nenhuma); sports_public_matches: opções=(nenhuma); sports_public_schools: opções=(nenhuma); sports_public_teams: opções=(nenhuma)) — rodam com os privilégios do dono
   `postgres`, que tem BYPASSRLS, então a RLS da tabela-base não as protege; o que as fecha é o
   `revoke select … from anon` aplicado em 14/10, conferido agora como `anon_select=false` nas 5. Já
   `support_professionals_directory` tem `{security_invoker=true}` e por isso devolve
   0 linhas para `anon`, enquanto a leitura como `postgres` vê
   2 registros (1
   ativo). A view é segura **por causa da opção**. O grant de escrita que a tabela-base carregava para
   `anon` foi revogado em 15/10 com o lote de 134, mas o risco continua sendo o de recriar a view sem
   `security_invoker`: aí ela passaria a ler como dono e exporia nome, foto, horário e localização dos
   profissionais de apoio.
   (2) Endurecimento **APLICADO 15/10** com OK explícito e varredura morta: `sql-revoke-anon-escrita.sql`
   (`monta-revoke-anon.mjs`) revogou escrita de `anon` em **134**
   tabelas — exatamente as que não têm nenhuma policy para `anon`/`public`, onde o grant é peso morto —
   e manteve intactas as 22 que têm, entre elas
   `access_requests`, cuja policy de INSERT `to public` é o fluxo público de solicitar acesso. Relido no
   catálogo: a escrita de `anon` caiu de 156 para
   **22 tabelas**, o conjunto das 22
   com policy para `anon`/`public` permanece **idêntico** ao de antes
   (`audit-anon-escrita.pre-revoke.json` × `audit-anon-escrita.json`), 0 tabelas sem RLS e 0 expostas.
   Não muda comportamento nenhum hoje — quem já impedia a escrita era a RLS — e a reversão está, grant a
   grant, em `audit-revoke-anon.json`.

20.c **O número que parecia ruim e é projeto.** `audit-anon-escrita.json` lista 56-59 policies de
   escrita "sem USING"; `confere-usings.mjs` quebra isso por comando (`audit-usings.json`):
   ALL 106 policies / 0 sem USING; DELETE 18 policies / 0 sem USING; INSERT 59 policies / 59 sem USING; SELECT 185 policies / 0 sem USING; UPDATE 43 policies / 0 sem USING.
   INSERT não tem `USING` em Postgres — tem `WITH CHECK` — então os 59 sem USING são todos INSERT.
   **0** policies de UPDATE/DELETE/ALL
   sem `USING` valendo para um papel real, conferido tabela por tabela.

21. **A passada no ar abriu um defeito novo, e ele entrou como medida — não como susto (#53).** Com a
   conta sintética de aluno/responsável no endereço público (35 visitas em
   `audit-sweep-publicado-aluno.json`), o probe de reentrada chamou `navigate('meu-espaco')` na tela que
   já estava no espaço do aluno: 1 de 1 tentativa(s) lançaram
   `RangeError` —
   `Maximum call stack size exceeded`. O caminho está lido no
   arquivo: `index.html:19089` embrulha `BFRPlatform.open` para `meu-espaco`+aluno e chama `open()`,
   e `open()` em `index.html:19075` chama
   `window.BFR_APP_RUNTIME?.syncNavigation?.('meu-espaco')`, que volta a abrir o espaço —
   `open → syncNavigation → navigateToSection → open`. Consequência para a pergunta original: o teto de
   30 s da reentrada **não chegou a ser testado** nessa tela, porque o segundo `navigate()` morre na
   pilha antes de os estados `antes`/`depois` serem comparáveis (H.4). A tela em si chegou — o defeito é
   a reentrada, não a rota. **Patch aplicado no diretório local** em 2026-10-15T07:28 (backup `index.html.bak-reentrada-1`, re-leitura idêntica à candidata, sintaxe viva OK). A prova do lado de depois é `audit-reentrada-aluno-53-depois-local.json`, gravado no harness da conta sintética de aluno (porta 8241, `chegada.perfil = student`): 4 entradas do ciclo (true/true/true/true), 0 exceção, todas terminando com sec=meu-espaco e `state.abrindo` devolvido a falso no `finally`, re-rodado depois por caminho independente: 4 entradas, 0 exceção. **Não existe "antes" local**: as corridas do motor 1 rodaram no 8240, que serve a conta developer da auditoria, onde `open()` devolve `false` no guard de papel antes de qualquer recursão — o instrumento agora recusa essa configuração e grava o motivo no diário em vez de escrever "0 exceções de 0 tentativas". O único antes medido é o do ar, logo acima. **O ar continua no shell sem a guarda**: publicar é passo à parte e pede OK explícito.
   Armadilha do instrumento registrada junto: sem o `try/catch` do lado da página a exceção subia pelo CDP
   e matava o probe, deixando diário de uma linha — formato que se lê como "não medido" mas aparecia como
   se fosse contagem.

22. **O resíduo de alvos (#52) perguntado ao DOM, não ao arquivo (#54):** 45 sondas em 45 pares, 40 com a tela assentada antes de medir, 0 travadas. **44 alvos declarados chegam com altura zero na rota.** Esconderijo citado: #platformSchoolView · class hidden 11×, #schoolGamesView · class hidden 10×, #internalChatView · class hidden 5×, #bfrCommunicationView · class hidden 3×. Alvos mais repetidos entre as sondas: #platformSchoolView 11 · #schoolGamesView 10 · #internalChatView 5 · #bfrCommunicationView 3 · #platformLearnView 3. Alguma #platform*View / #schoolGamesView / #internalChatView ficou viva na rota em 0 sondas. Candidato real dentro da view ativa (elemento com id e >200 caracteres) apareceu em **17** pares e **não** apareceu em **20**. Concentração por chave de rota: escola-historia 10, jogos-escolares 10, coordenacao-chat 5, comunicacao 3, videos-aprender 2, horarios 2, meu-espaco 2, professor-conteudos 1, professor-diario 1, professor-planejamento 1, professor-relatorios 1, professor-calendario 1, professor-notificacoes 1, comunicados 1, secretaria 1, aprender 1, evoluir 1, escola 1. Enquanto um par não tem candidato, a frase correta é "essa rota não tem painel próprio nesse papel", e NÃO "a tela tem N caracteres" — o número dessas linhas continua sendo despejo de view. Nenhum mapa novo é aplicado antes de ler esta sonda.

23. **A causa do destaque errado na barra de baixo (#55) está lida no arquivo e conferida no runtime.** `activeRoute()` consultava primeiro `#appShell .sidebar .nav-item.active[data-section]:not(.hidden)` — a sidebar do DESKTOP. Em 390 px ela está oculta por media query ( `display:none` no próprio elemento, sem a classe `hidden`), então o `:not(.hidden)` não a filtra e o `.active` parado nela vence o `runtime.activeSection`. A mesma função decide o destaque da gaveta (`bfr-responsive-presentation.js:178`) e o da barra (:593): um ponto conserta as duas superfícies. Contagem nos diários mobile já gravados (168 linhas @390+@320, `audit-menu-baixo.json`): `ok` 14, `DESTACA_OUTRA_ROTA_DA_BARRA` 68, `rota fora da barra (sem item a destacar)` 56, `destaque fora da barra` 7, `SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA` 23. As 7 + 23 que estavam fora do alvo do patch ficaram registradas como decisão de produto (`quickRoutes` fixa quatro itens por papel), não como defeito. Sonda runtime em 18 visitas @390 (motor 2, antes do patch): 10 traziam item de sidebar com `.active` e `visivel:false`, 9 destacavam rota diferente da ativa, 0 travadas. Exemplo lido do diário: em `coordinator/coordenacao` a barra marcava `inicio` (`aria-current="page"`) com `secAtiva=coordenacao`, e a gaveta marcava o mesmo `inicio`. **Patch aplicado localmente** (`bfr-responsive-presentation.js.bak-destaque-55`, delta 587 chars, checagens 9/9 verdes): `activeRoute()` passa a exigir altura do item destacado e cai no `runtime.activeSection`. Regressão @390: 86 linhas re-medidas (`audit-sweep-pos-55.json`), recontadas como `ok` 9, `SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA` 34, `rota fora da barra (sem item a destacar)` 37, `DESTACA_OUTRA_ROTA_DA_BARRA` 6. Comparação no MESMO conjunto de pares @390 (`compara-destaque-55.mjs`, 86 pares da lista de regressão): antes `ok` 11, `DESTACA_OUTRA_ROTA_DA_BARRA` 50, `destaque fora da barra` 7, `SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA` 18 · depois `ok` 9, `SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA` 34, `rota fora da barra (sem item a destacar)` 37, `DESTACA_OUTRA_ROTA_DA_BARRA` 6 · 40 pares mudaram de caso. Confundidor declarado: entre a passada de origem (06:43 UTC) e a de regressão (08:15 UTC) o `index.html` também mudou às 07:28 (o guard do #53, +471 chars), então esta diferença é de dois patches; o que isola o #55 é a sonda de mecanismo acima, rodada às 07:54 já com aquele index.html. O `?v=11` de `index.html:26403` só muda no passo de publicação (em local o harness responde `no-store`, então o efeito é imediato); sem o bump, o Worker devolve o script antigo com o destaque velho para quem já tem cache.

24. **Item de backlog de produto — o coordenador tem a rota "Cadastro de alunos" na sua lista de acesso e o roteador a recusa por papel** (medido com conta real do papel sobre o build no ar `v45`).
   A contradição está em dois lugares do mesmo arquivo. `roleSectionAccess.coordinator` (`index.html:8141`, objeto aberto em `index.html:8137`) **inclui** `cadastro-alunos` entre as 18 rotas do papel, e o mapa de alvos do roteador (`index.html:9254`) aponta essa rota para `#adminStudentDirectoryPanel` — ou seja, a rota existe no papel e tem alvo declarado. Mas `navigateToSection()` abre com um guard de **papel real da conta** antes de qualquer outra verificação (`index.html:9161-9165`): `if (section === 'cadastro-alunos' && currentProfile?.role !== 'developer')` → `syncActiveNavigation('inicio')`, `persistNavigationState('inicio')`, `return false`. O allow-list de `index.html:9171` usa `activeView`; o guard de 9161 usa `currentProfile.role`. Para uma conta de papel `coordinator` o guard vence e a pessoa volta ao Início **sem mensagem e sem erro de console** — é exatamente a assinatura do "item de menu que não executa nada" que o brief pede para apontar.
   O painel nomeado pelo alvo também não pertence ao papel: o markup (`index.html:4435`) se anuncia como *"Cadastro escolar · acesso administrativo"* com a tira `● ADMIN` e declara no próprio texto que *"Endereço e telefone ficam restritos ao administrador"*; e o único injetador dele, `ensureAdminStudentDirectoryView()` (`index.html:7720-7728`, exposto como `window.bfrPrepareAdminStudentDirectory`), é chamado pelo roteador **só quando `activeView === 'admin'`** (`index.html:9234`). Na view do coordenador nada o injeta, então o alvo existe no mapa e não existe no DOM. O atalho de cardápio é escondido para quem não é developer (`index.html:9561`), e o único ponto de entrada que hoje funciona é o botão de ação rápida administrativa (`index.html:7409`, `data-admin-quick-section="cadastro-alunos"`).
   **Medição** — conta sintética de papel real `coordinator` (`b4dbaa51-2521-45ff-a034-d0fdf1d8efd9`, criada por `cria-coord-sintetica.mjs`, SQL 201), sobre o `/` publicado (`md5 2a7b72906752e311b4a207ccc7c7f6b8`, `CACHE bfr-conecta-v45`). 9 visitas a `cadastro-alunos` (5 larguras mobile + 4 web; `audit-sweep-mobile.json` + `audit-sweep-web.json` filtrados por `papel === 'coordinator'`, extraídas por `confere-cadastro-coord.mjs`): **2 chegam** com `secAtiva=cadastro-alunos` — 320px 702c/59ctl/11052 nós assentado em 4342 ms · 768px 1076c/65ctl/11082 nós em 5092 ms — e **7 não chegam** com `secAtiva=inicio` e `desistiu=true` (360, 375, 430, 1024, 1280, 1440, 1920). As duas chegadas são do boot por deep link com o bootstrap do harness, que grava a seção pedida antes de o guard rodar; a prova do caminho do clique é independente: `prova-coord-rotas.mjs` em navegador limpo, 320 px, mesmo dia, devolve `secAtiva=inicio`, 44 controles visíveis do Início, 0 erros de console. Consequência para a leitura dos números: o painel medido nessas linhas é `#coordinatorView` inteiro (`painelSeletor="#coordinatorView"`, `usouAlvo=true`), **não** um painel de cadastro — então os 2667–4637 caracteres das 7 linhas recusadas são conteúdo do Início e **não existe "tela de cadastro do coordenador" a medir**.
   **A decisão é de produto, não de tela.** Dois caminhos, e um deles cabe num patch: **(a)** tirar `cadastro-alunos` de `roleSectionAccess.coordinator` (`index.html:8141`) e do mapa de alvos (`index.html:9254`) — a rota deixa de existir para o papel, o guard de 9161 fica redundante e a entrada some sem item morto; **(b)** dar ao coordenador uma **view própria** de cadastro com escopo de leitura do aluno, o que é feature e não patch: o formulário atual escreve endereço, telefone e foto, e o escopo exigiria RPC/policy dedicada (o padrão de escopo já existe no banco — `bfr_staff_can_manage_student_scope`, usado para notas), então precisa de pré-voz por função/policy antes de qualquer apply.
   **Status (20/10): FECHADO em candidata local medida — decisão (b), nada publicado.** A linha acima permaneceu como o registro do backlog; a resolução, os números do A/B contra os bytes do ar v49 e os controles (developer, idempotência, escrita) estão no **item 32**.
25. **FECHADO (19/10) — a persona NÃO vem do `?role=` da URL na produção: o param é gancho do harness e `setRole` recusa em silêncio** (achado de instrumento da 17.g, medido por `sonda-persona-por-url.mjs`, diários `sonda-persona-por-url-item25-admin-v2.json` e `sonda-persona-por-url-item25-coord-aee-v2.json`).
   O que foi medido, nos bytes publicados servidos no harness: a MESMA sessão de developer (`auditoria-sintetica-developer-…`, `bfr-audit-session-dev-live-v44.json`) pedindo `?role=developer` dá `BFR_APP_RUNTIME.activeView = 'admin'` e o toque no Início mostra `adminView`; pedindo `?role=sports_operator` a mesma sessão renderiza a barra e os painéis do operador, e o hunk de roteador da candidata — guardado por `activeView === 'sports_operator'` — **fire** (`schoolGamesView` visível, `alt 1536`, 1870 chars). Ou seja: `activeView` vem do param, e todo guard escrito em função dele (`:9239-9242`, `:9277`, o `ensure()` do painel do responsável em `:15113`, o `data-parent-nav` de `:15122`) é uma barreira de **interface**, não de autorização.
   **O que a 17.g leu errado.** O `?role=` que produz essas trocas de chrome **não existe na produção**: ele é lido pelo harness (`audit-harness-com-dir.mjs:28,33,55,67` → `rt.setRole(PAPEL)`, além de `n=` virar `window.__AUDIT_NONCE`). No `index.html` publicado nada lê o param da URL para escolher papel — a única ocorrência de `'role'` em `:8179` é um campo de `FormData` do login, e quem define a persona é o modal de login (`:9755/9790`, `loginRoleStorageKey`). Restava a pergunta de lado inverso, que é a que importa para segurança: **uma sessão de papel baixo consegue assumir persona alta pela URL?**
   **Medida (19/10, sessão real do operador, porta 8243 = bytes publicados, firewall de escrita ligado, duas passadas na mesma aba, só o `?role=` mudando).** `sonda-persona-por-url.mjs`, diário `sonda-persona-por-url-item25-admin-v2.json`:
   * baseline `?role=sports_operator` → `activeView=sports_operator`, `sec=inicio`, 1667 chars, **19 chamadas** de API, 1 delas com linhas (`profiles`=1).
   * `?role=admin` com a MESMA sessão → `activeView` continua **`sports_operator`**, 456 chars, **0 chamadas de API**, 0 escritas, 0 erros novos. A recusa é silenciosa: `setRole` (`index.html:9039-9040`) confronta a persona pedida com o **papel real** do perfil (`admin ⇐ developer`, `sports_operator ⇐ sports_operator|developer`, `aee ⇐ aee|coordinator|director|developer`, `parent ⇐ parent|developer`) e faz `if (!allowed) return;`. Nenhum dado de admin chega ao token do operador — não porque a RLS negou, mas porque **a consulta nem foi feita**.
   * O único erro de console do baseline é o `sendObjectBeacon` do Cloudflare Insights (`static.cloudflareinsights.com`) barrado pelo firewall do teste — instrumento, não app.
   **A RLS discrimina (controle obtido, sem ele "18 de 19 vazias" não provaria nada).** Censo `sql-item25-censo-leituras-operador.sql` (SELECT puro como `postgres`): o banco tem `classes`=27, `project_photos`=32, `projects`=5, `announcements`=1; o token do operador recebeu 200 `[]` dessas 18 tabelas. Zero aqui é filtro de política, não tabela vazia nem "toda persona recebe 0".
   **Escalonamento legal medido no par coordenador → AEE** (diário `sonda-persona-por-url-item25-coord-aee-v2.json`, porta 8245): o papel `coordinator` **pode** assumir `aee` por design do allow-list, e a persona monta (`view=aee`, 9076 chars, 120 chamadas). `tokensIguais=true` (impressão digital `1a5c5ac7d9` nas duas passadas — a comparação é entre o mesmo token, não entre contas). A persona AEE pede **15 endpoints que o baseline do coordenador nunca pede** e **todos os 15 voltaram 200 com 0 linhas**. O passo que faltava para essa frase valer alguma coisa era o censo de linhas (`sql-item25-censo-linhas-aee.sql`, mesma channel, BYPASSRLS): 13 das 15 estão zeradas no banco — para essas, "0 linhas" **não** é prova de proteção — mas **`project_photos` tem 32 linhas e `bfr_specialized_audit_log` tem 4**, e nenhuma das duas chegou ao token do coordenador. Essa é a negação real de leitura. Nota de alcance: `aee_student_roster` (40 linhas) aparece no **baseline** do coordenador com as 40, então a leitura do roster não é vazamento — é o que o papel já faz sem persona nenhuma.
   **Conclusão que substitui a formulação antiga do item:** os guards escritos em função de `activeView` (`:9239-9242`, `:9277`, `:15113`, `:15122`) continuam sendo barreira de **interface**, e isto vale para a produção também — mas a superfície que eles controlam só é alcançável por persona se o **papel real** da conta estiver no allow-list, e mesmo nesse caso o dado obedece à RLS do token. Consequência operacional para os diários antigos: qualquer linha colhida com `?role=` trocado mede **chrome de outro papel com dados do papel real**, e por isso a #33/#34 não pode ser lida como "o papel X viu a tela Y com os dados de Y". **Nada aplicado, nada publicado; nenhuma escrita tentada fora do firewall.** Os 12 erros de console da passada AEE não são do escalonamento: são o achado novo abaixo.
   **E o `parent`, que estava "imensurável", foi medido pelo caminho que não exige credencial** (19/10, porta 8247 = publicado + sessão do developer, `sonda-persona-por-url-dev-parent.json`, @390): o allow-list de `setRole` aceita `parent ⇐ parent|developer`, então a conta developer **pode** assumir a persona do responsável. Resultado: `?role=parent` monta (`activeView=parent`, `#parentView` visível com `content` e `alt 1824`, 1.196 chars na tela, `#aeeView`/`#adminView` escondidos), 95 chamadas de API, **0 escritas**, **0 erros de console**. Leitura correta do número: o token é o do **developer**, então as linhas que chegam (`students`=848, `gate_badges`=843, `school_documents`=226, `grades`=112, `bfr_schedule_entries`=594…) **não são vazamento do papel responsável** — são o que o developer sempre pôde ler; o que esta passada prova é o **chrome** (a tela do responsável monta, tem altura e conteúdo) e não a autorização. Consequência prática para a 17.g: o risco de regressão em `parent` agora tem número de referência no publicado (`parentView alt 1824 / 1.196c`), mas continuar **imensurável é a autorização do papel real** — e para isso falta credencial sintética de `parent` (escrita no banco = OK explícito). Detalhe do mesmo diário que confirma o item 26 abaixo: na persona `parent` o `student_reading_levels` foi chamado e **não** deu 400 (0×400 nas duas passadas) — porque `readingState.students` sob responsável são os 3 filhos vinculados (`guardian_students`=3), não os 848; o teto de URL morde só nas personas que carregam a coorte inteira. Ressalva de instrumento: a linha `role=developer` saiu `montou=false` porque o portão compara `activeView` com o **nome da persona** e o developer mapeia para `view=admin` (família da armadilha 90) — não é defeito do app, e os 71 `chamadas`/155.015 chars do baseline continuam valendo.
26. **ACHADO NOVO (19/10) — o painel de leitura assistida nunca carrega com a coorte inteira: `student_reading_levels` devolve HTTP 400 e o erro é engolido em silêncio** (`loadReadingAssistUsage`, `index.html:12088`).
   Sintoma medido do lado de fora do navegador (`replica-400.mjs` com o caminho capturado no diário, `caminho-400.txt`): o app emite `GET /rest/v1/student_reading_levels?select=student_id,assist_progress,assist_seconds,assist_updated_at&student_id=in.(…848 uuids…)`, uma URL de **33 190 chars**, e recebe **HTTP 400** com corpo de 11 bytes — `"Bad Request"`, texto puro, sem o `{code,hint}` do PostgREST: quem recusa é o proxy na frente, não a consulta. Aparece 1× no baseline do coordenador e 18× na passada AEE, e os 12 erros de console daquela passada são exatamente esses 400.
   **As duas hipóteses foram separadas, não escolhidas a dedo** (`diag-400-comprimento.mjs`): com 3 ou 20 alunos, **com e sem aspas** nas UUIDs, os quatro casos dão 200 `[]` — então `in.(uuid,uuid,…)` sem aspas é sintaxe aceita e **não** é a causa. A causa é comprimento (`diag-400-teto.mjs`, busca binária com `maxHeaderSize` elevado): **último lote que passa = 634 alunos / 24 844 chars (200); primeiro que falha = 635 alunos / 24 883 chars (400)**. A coorte real tem 848 alunos, sempre acima do teto.
   **Armadilha de instrumento paga no caminho** (vai para a seção das armadilhas): entre 400 e 600 alunos o *meu cliente Node* falhava com `UND_ERR_HEADERS_OVERFLOW` e eu lia isso como "o servidor também quebra". Não quebra — ele responde 200, e o PostgREST ecoa a query inteira no header `Content-Location` (24 486 bytes de cabeçalho em 600 alunos), que estoura o teto de 16 KB do undici. Um `fetch` comum não consegue nem ler a resposta; a medição só ficou correta com `https.request({maxHeaderSize: 2097152})`. Sem isso o teto sairia escrito como ~250 alunos.
   **Por que é um defeito de tela, não só de rede:** o chamador faz `if (result.error) return;` dentro de `try { … } catch {}` — o 400 não produz mensagem, não produz estado de erro e não produz tentativa nova; o painel simplesmente fica como se não houvesse uso de leitura assistida. O conserto é do lado do app (lote de ids abaixo do teto — com 634 alunos/24 844 chars medidos, um lote de ~400 ids dá margem — ou agregação por RPC em vez de `IN` list); **nada aplicado**.  **O que a pessoa vê hoje é nada — e isso reduz a severidade, não o achado.** No caminho do 400, `readingState.assisted` fica `[]` e `renderReadingAssistUsage()` (`:12087`) imprime a linha `<td colspan="5" class="bfr-reading-empty">Nenhum uso remoto da Leitura Assistida foi registrado ainda.</td>`. Como o censo por `postgres` mede **`student_reading_levels` = 0 linhas no banco**, uma consulta que funcionasse imprimiria a mesma frase: **nenhum usuário vê diferença hoje**, e por isso a medição de tela foi dispensada (não há estado visual a comparar — o que há é um erro mascarado). O defeito é (i) uma falha real que nunca chega à tela nem ao console do usuário, e (ii) o painel nasce **cego por construção** para todo dado futuro: no dia em que houver registros de uso, a coorte inteira (848 ids) continua estourando o teto e a frase "nenhum uso registrado" continua mentindo com cara de vazio legítimo. É este segundo ponto que torna o lote de ids necessário antes de qualquer uso real da feature.
   **O próprio arquivo já sabe lotar, e essa é a parte incômoda do achado.** Dois sítios do mesmo `index.html` publicado fazem o `for` de chunking antes de chamar `.in()`: `:5156` `for (let index = 0; index < ids.length; index += 80) batches.push(ids.slice(index,index + 80))` (perfis escolares) e `:7998-7999` `index += 300` com `ids.slice(index,index + 300)` (filiações). O `loadReadingAssistUsage` de `:12088` é o que passa o vetor **inteiro** (`readingState.students.map(...)` direto no `.in()`), e por isso é o que estoura. Alcance medido: nas duas passadas de 19/10 (baseline do coordenador + persona AEE) **nenhum outro** 400 apareceu — 1× e 18×, todos em `student_reading_levels` — então hoje o teto morde só este chamador; os outros `.in()` com vetor cheio (ex.: `:8657` `gate_checkins`, `:4763/:4769` notas/presença por turma do professor) ficam **não quantificados** para coortes maiores que ~634 e entram como suspeita, não como achado.

### 26.bis Fechamento do item 26 por medida (20/10): o teto é de bloco de cabeçalho, o alcance é 1 de 102 sítios, e a candidata de lote está gerada e A/B-ada — nada aplicado

**O teto medido acima (24.844 / 634 alunos) era com o bearer curto do service role e não é a unidade que importa.** Refeito com busca binária no mesmo endpoint (`mede-teto-bytes2.mjs` → `audit-teto-url-bytes.json`), variando **só** o comprimento do `Authorization`: **25.174 chars de path com o bearer de 219 chars, 24.875 com o bearer de 826 chars da sessão** — ou seja, a fronteira corre no **bloco de cabeçalhos da requisição**, não na linha de requisição, e sobe/desce com o tamanho do token (−299 chars para +607 de bearer). Consequência prática: o teto **do app** é o segundo número, 24.875, e um navegador real (headers próprios a mais) só pode reduzir. Teto de trabalho adotado: **24.875**.
**A unidade do custo também saiu medida, não assumida:** o postgrest-js serializa por `URLSearchParams`, então `,`→`%2C` e parênteses viram `%28/%29`; cada uuid num `in.()` custa **exatamente 39 chars**. O modelo reproduz a URL real do app **byte a byte** (coorte de 848: real 33.194 × modelo 33.194). O "33 190" do texto acima era contagem anterior; o path é 33.194 (URL completa 33.234, com a origem de 40).
**Alcance: 102 sítios `.in()` no publicado, e o break-even é o mesmo para quase todos.** Inventário por caminhada de cadeia com balanceamento de parênteses a partir de cada `.from(` e inclinação medida por amostragem (1 id × 2 ids), não suposta (`mede-inventario-in.mjs`, `mede-teto-por-site.mjs` → `audit-teto-por-site-item26.json`): o `select`/filtro base de cada sítio mede **40–300 chars**, logo **630–636 ids** para qualquer vetor de uuid — `:8657` e `:4763/:4769` estourariam, mas nunca foram vistos acima de 3.377 chars.
**Trafego real, não teoria:** garimpei `obj.url` de **334 diários** autenticados (`mede-urls-reais.mjs` → `audit-urls-reais-item26.json`; 59 URLs com `in.`). Só **`student_reading_levels` cruza o teto** (33.194c = 133 % do teto, 848 ids, 20/20 HTTP 400). A segunda maior path observada é **3.377c (14 % do teto)** e é justamente o `student_school_profiles` que **já** fatia em 80. Vetores de turma (27), de perfil (28) e literais de papel/status/categoria ficam a ordens de grandeza do teto. Ressalva honesta: os diários de varredura de clique **não** gravam URL, então "só um ofensor" é prova sobre o tráfego capturado pela sonda, não sobre todo caminho de clique.
**Exposição estrutural para o futuro (por isso o lote é necessário antes de qualquer uso real):** dos **56 carregadores de `from('students')`** no publicado, o caso dominante não tem `.limit()` nem `.range()` (`mede-origem-dos-vetores.mjs` → `audit-carregadores-students-item26.json`) — o default do PostgREST entrega a coorte inteira (848 < 1.000). Qualquer `.in()` alimentado por um deles está a uma coorte do mesmo 400.
**Censo que fecha a severidade:** `student_reading_levels` tem **0 linhas** e os **848** alunos estão 848/848 sem linha (`sql-item26-leitura-contagem.sql`, SELECT puro). Ou seja: uma consulta que funcionasse imprimiria hoje a mesma frase de vazio — o ganho de hoje é o erro deixar de ser mascarado, não uma tela nova.
**Candidata (novo diretório, nada no patchado, nada publicado):** `gera-candidata-leitura-lote.mjs` → `bfr-candidata-leitura-lote/index.html`, `LOTE=300` (o idiom do próprio arquivo para o mesmo tipo de vetor, `:7998`), substituindo o `.in('student_id',ids)` por `for (let index = 0; index < ids.length; index += 300)` com `ids.slice(index,index + 300)` e acumulando em `linhas`, preservando o `if (resultado.error) return;` silencioso que já existia. Portões: âncora 1×, texto substituído único, **reversibilidade byte a byte** (`replace(TROCA,BUSCA) === origem`), paridade de `new Function()` por bloco `<script>` **contra a origem** (108 blocos, 8 erros nos dois — os 8 já são do publicado), e guarda nova: nenhuma referência sobra a `result.` depois do hunk. Origem `2a7b729067…` (3.366.669) → candidata `cbbb71d19b…` (3.366.804, **+135 chars**). Predição: 848 alunos → 3 requisições, maior path **11.822 chars** (48 % do teto).
**A/B no harness, sessão do coordenador real (`b4dbaa51…`), uma porta por diretório × papel, persona `aee` @390, firewall de escrita:** `8250` = publicado, `8251` = candidata, mesma sessão remintada nos dois (`sonda-lote-leitura-ab.mjs` → `sonda-lote-leitura-{publ2,publ3,cand,cand2}.json`).

| Medida (2 amostras por braço) | Publicado | Candidata |
|---|---|---|
| Chamadas a `student_reading_levels` | 66 e 74 | 4 e 136 |
| HTTP 400 | **33 e 37** | **0 e 0** |
| Maior path | 33.194c (848 ids) | **11.822c (300 ids)** |
| Erros de console (teto do corte = 10) | ≥10, todos os 400 | **0** |
| Painel `#aeeView` (alt/chars) | 784/508 · 4.587/4.552 | 7.416/4.228 · 784/508 |
| Escritas no banco | 0 | 0 |

**Como ler a última linha sem se enganar:** altura e chars do painel variaram **para os dois lados**, passando para 784/508 inclusive no braço publicado — é o estágio assíncrono já documentado (altura que cai sozinha não é regressão), não efeito do lote. O que o A/B prova é: **o 400 acaba (33→0 e 37→0), o path cai de 133 % para 48 % do teto, e os erros de console do painel somem**, com as duas amostras concordando nos três números.
**APLICADO E PUBLICADO (20/10) — v46, junto com a candidata 4 do operador, por OK explícito «as duas juntas no v46».** O lote entrou no bundle cirúrgico `build-surgical-46.js` (fonte = `ar-html-v45-live.html` + 3 hunks extraídos por diferença de conjuntos de linhas; `worker-surgical-46/`), com portões: `novasEmC4.length === 2`, cada âncora 1× no resultante, `v46 sem os 3 hunks === AR` byte a byte, literais antigos 0×, paridade de sintaxe por bloco `<script>` contra a origem, `rp.js` = `a2cacc7e…` intacto e SW mudando **só** o `CACHE`. Deploy `wrangler deploy` com `CLOUDFLARE_API_TOKEN` desmarcado (OAuth guardado): **Version ID `6ff453b9-de59-4192-a07b-90cc4467c6a8`**, `/` = **3.367.074 chars, md5 `225934b73cf69b922d0c79e0255c4717`**, SW `const CACHE = 'bfr-conecta-v46';`, `bfr-responsive-presentation.js` `a2cacc7e…` («No updated asset files» — e isso não prova nada por si, por isso o md5 do `/` foi conferido).

**Prova no ar, só GET e boot, zero clique, sessão real re-mintada** (`confere-v46-no-ar.mjs` → `confere-v46-ar.json`; `sonda-ar-v46-leitura.mjs` → `audit-ar-v46-leitura-{coordinator,sports_operator}-*.json`):
- bytes do público **idênticos** aos do build (md5 igual, mesma contagem de chars); literais `1×` para os 3 hunks e `0×` para as 2 regras antigas; `manifest.json`, logo e PDFs todos 200.
- **tráfego real de produção** na tabela alvo, @390 e @1024, coordenador autenticado: `student_reading_levels` entrou em **lotes de 300 + 300 + 248 = os 848 alunos**, todos **HTTP 200**, maior path **11.822 chars** (48 % do teto de 24.875), **0× HTTP 400** — antes da correção a mesma visita mandava 33.194 chars e colhia 400 do proxy em todas as cargas.
- `#coordinatorView` montada e visível nas duas bandas (alt 3.403 @390 / 2.728 @1024); **0 escritas do app**; a **única** falha HTTP das quatro passadas foi `POST /cdn-cgi/rum` → 404, artefato do HTML salvo e não do app.
- severidade confirmada no ar: as 200s devolvem **0 linhas** (`student_reading_levels` tem 0 linhas no banco), exatamente como no censo — o ganho de hoje é o erro mascarado acabar, não um painel novo.

**Resíduo medido nesta prova, que fica aberto (item 28, causa já provada abaixo — FECHADO no v47, publicado 20/10):** o **boot** do operador no v46 (`?role=sports_operator&open=inicio`, @390 e @1024) continua com **zero `.content` visíveis** (`visiveis=NENHUM`, `chars=737`, `total_chamadas=24`, `chamadas_foco=0` — o papel não carrega o painel de leitura). A 1ª hipótese, "o boot cai no mesmo `setHomeMode(true)` de 17.f por outro autor", **foi refutada por estática**: os bytes servidos (v45 e v46, idênticos nesse ponto) já trazem `<div class="content hidden" id="schoolGamesView">` e `<div class="content" id="parentView">`, e não existe container `sports_operator` — logo `parentView` sem `hidden` a altura 0 é o **estado padrão do documento**, não um hide-all. Ver item 28.
**Custo medido, que vira decisão de projeto:** a candidata **triplica o número de requisições** enquanto durar a tempestade de recarga do próprio painel — e a tempestade **não é causada pelo 400**: o publicado fez 33 e 37 cargas numa única passada assentada, a candidata fez 1 e 34. O loader de leitura assistida re-dispara dezenas de vezes por boot em qualquer dos braços (família do #86/#16), então hoje o lote paga ~3× requisições por recarga. Alternativas registradas, não escolhidas: `LOTE=630` fica em 2 requisições mas a 213 chars do teto (margem de 0,9 %, e o teto encolhe com bearer maior) — **300 é escolha de margem, não de ajuste fino**; a agregação por RPC resolveria as duas coisas (1 requisição curta) mas exige escrita no banco e portanto OK explícito.
**Armadilhas de instrumento pagas nesta rodada** (vão para a seção das armadilhas, números 97–100): (97) gravar o path truncado em 160 chars cega o medidor de comprimento — a sonda de persona tinha `caminho.slice(0,160)` e não podia, por construção, responder ao item 26; (98) o enchimento de uma busca de teto tem de ser **predicado parseável** pelo PostgREST — `&pad=aaaa` devolve 400 `PGRST100` em todo comprimento e mede o parser, não o proxy; (99) janela fixa de 400 chars ao redor da âncora mistura construtores irmãos e **apaga** o `.in()` do próprio sítio (saíram 132.804c e ~200c absurdos) — o caminho é caminhar a cadeia com balanceamento de parênteses a partir de cada `.from(` e medir a inclinação por amostragem; (100) painel menor em um braço não é regressão se o outro braço também oscila: repetir antes de atribuir.

27. **ACHADO NOVO (20/10) — o carregador da Leitura Assistida re-dispara dezenas de vezes numa única visita assentada** (medido de passagem no A/B do item 26, `sonda-lote-leitura-{publ2,publ3,cand2}.json`): entre o boot e a calmaria de 6 s, `student_reading_levels` foi chamado **33 e 37** vezes no publicado e **34** vezes na candidata — cada carga já fatia em 3, logo 136 requisições no segundo braço. Não é efeito do 400 (os dois braços têm a mesma tempestade) e não é o rig: as chamadas caem no mesmo `requestId`-stream de uma única aba, sem clique nenhum. Entra como pendência na mesma família de #86 (mutações/s) e #16 (debounce sem teto): o autor de cada re-disparo ainda **não foi atribuído** — o instrumento para isso já existe (`pilha por escrita`, armadilha 94) e a pergunta é se quem chama é o `MutationObserver` do painel ou o `renderReadingAssistUsage` que se substitui a si mesmo (`panel.replaceWith(...)` → re-render → re-carga). Nada aplicado.

28. **ACHADO (20/10, prova do v46) — o `sports_operator` não tem caminho de BOOT para o próprio painel: uma recarga limpa em `inicio` rende zero `.content` visíveis.** Medido no ar (`audit-ar-v46-leitura-sports_operator-sports_operator.json`: `visiveis=NENHUM`, `chars=737`, `total_chamadas=24`, 0× `student_reading_levels` — o papel não está na lista de papéis do painel de leitura) e reproduzido como **NÃO-reprodução** no harness: `sonda-operador-boot-ab-a.mjs` (8260 = bytes v45, 8261 = bytes v46, mesma sessão sintética, mesma URL, A/B/A @390 e @1024) deu `visiveis=schoolGamesView` (alt 1677 @390 / 997 @1024) **nos seis braços** — `boot_consertado=false`, `v45_instavel=false`: o v46 não piorou nem melhorou o boot. A divergência harness×ar é de rig: `audit-harness-com-dir.mjs:56` e `:68` chamam `rt.navigate(OPEN)` depois do boot e depois dos módulos adiados, e o app publicado **não tem gancho de `?open=`** (mesma família do item 25, `?role=`).
   **Causa provada por estática nos bytes servidos** (v45 e v46 idênticos neste ponto, lidos com `indexOf` + janela de 90 chars): o markup de origem já traz `<div class="content hidden" id="schoolGamesView">` e `<div class="content" id="parentView">`, e **não existe container `sports_operator`** (`id="sportsOperatorView"` = AUSENTE nos dois ficheiros). Logo o que o ar mediu — `parentView` sem `hidden`, altura 0, todo o resto `hidden` — **é o estado padrão do documento**, e a hipótese inicial "o boot cai no `setHomeMode(true)` de 17.f por outro autor" está refutada. O painel do papel só abre por `window.BFRSchoolGames.open()`, que tem **3 pontos de chamada** no v46: `:9130` (dentro de `setRole`, guardado por `if (role === 'sports_operator')`), `:9242` (o RAMO publicado da candidata 4) e `:9270` (o ramo antigo `jogos-escolares` do coordenador) — os dois últimos **dentro de `navigateToSection`**, que no boot ninguém invoca para esse papel. Consequência prática: o operador só vê conteúdo depois de **tocar** num item da barra, o caminho medido em 17.f/17.g (3/3 @390 e 2/2 @1024).
   **CAUSA DO BOOT DECIDIDA POR MEDIDA (20/10, `sonda-operador-boot-cru.mjs` + `gera-candidata-operador-boot-1.mjs`): o `?.` de `:9130` engole em silêncio porque a linha roda ANTES de `window.BFRSchoolGames` existir (`:20428`, módulo adiado).** O instrumento é o boot **cru**: URL só com `?n=<nonce>`, **sem** `?role`/`?open`, para que nenhum gancho do rig navegue (armadilha 106); um `defineProperty` em `window.BFRSchoolGames` instalado antes de todo script grava o instante de criação, embrulha `open` e guarda a pilha de cada chamada; um ouvinte de `bfr:app-ready` dá o t0 do boot. Resultados, mesma sessão sintética do operador, 4 portas separadas por (dir × papel):
   - **Publicado v46** (`bfr-candidata-v46/`, 3.367.074c, md5 `225934b7`) em 5 passadas (@390 ×3, @1024 ×2): `visiveis=NENHUM` **em todas**, `jogos={alt:0, oculto:true}`, `criação=BFRSchoolGames@942–2224ms` sempre **antes** de `app-ready@1288–2571ms`, e **`abertos=0`** — ou seja, depois de o objeto existir ninguém chama `open()`. Como a linha `:9130` roda dentro de `setRole`, que precede o próprio `bfr:app-ready`, as duas coisas juntas só se conciliam com "a linha passou antes da criação": é a hipótese (a), e a (b) (alguém esconde depois) morre com `abertos=0`.
   - **Candidata 1** (`bfr-candidata-operador-boot-1/`, 3.367.362c, md5 `76de427b`, **+288 chars**, mesmo conjunto de 12 assets ao lado, `diff` de listagem vazio): `visiveis=schoolGamesView` **@390 alt 1677 e @1024 alt 997**, `chars` do corpo 737→1.836, `abertos=1` com pilha `at v.open | at abrirJogosDoBoot (<anonymous>:4783:244)` e o `open()` **11 ms depois da criação** (criação@1185 → aberto@1196, `app-ready@1670`) — a amostra que prova que a linha é alcançada no boot e que só faltava esperar o módulo. `api=17` vs `12` do publicado (os 5 pedidos do `loadData()` do próprio painel), **0 escritas, 0 erros de console, firewall ativo** nos dois braços.
   - **Controle de regressão no coordenador** (mesma candidata, sessão `coordinator`, portas 8265/8266, @390 e @1024, A/B/A): `visiveis=coordinatorView` **idêntico nos 6 braços**, `abertos=0` nos dois braços, `api=41` exato em todos, 0 escritas, 0 erros. Era de esperar — o hunk vive dentro de `if (role === 'sports_operator')` — mas ficou medido, não lido.
   - **Capturas** (`boot-cru-operador-pub-v46-390.png` × `boot-cru-operador-cand-boot1-390.png`): o publicado é cabeçalho + corpo cinza **vazio**; a candidata mostra o herói "Jogos Escolares.", a busca e os três filtros.
   **O que a candidata NÃO resolve:** o `aria-current`/`activeSection` continuam em `inicio` enquanto o painel de jogos está no ar (item 28 × item 153 — o mesmo desync já medido no toque em `:20425`), e a barra de baixo não foi lida nesta passada porque o sensor de `.nav-item` voltou vazio (`barra=[]` em 3/3 braços; o modal de primeiro acesso estava no caminho). **Nada aplicado, nada publicado** — publicar v47 pede OK explícito.

   **Gravidade e escopo:** limitada por um fato do banco — **zero contas reais** com `sports_operator` (1 sintética de auditoria). É a 3ª vez que o mesmo buraco aparece por ângulos distintos: o mapa de views sem a chave do papel (item 48), o roteador sem ramo (17.c) e agora o boot sem invocação.
   **Candidata construída, medida e ainda não aplicada** — `gera-candidata-operador-boot-1.mjs` substitui a linha única `if (role === 'sports_operator') window.BFRSchoolGames?.open?.();` por um `abrirJogosDoBoot(tentativa)` que (i) sai se `activeView !== 'sports_operator'`, (ii) chama `open()` quando a função existir **e** `activeSection === 'inicio'`, (iii) senão re-tenta por até 40×120 ms (4,8 s de teto). Portões da casa, todos no diário `gera-candidata-operador-boot-1.json`: âncora **1×** na fonte e o `DEPOIS` ausente; **reversão byte a byte** `saida.replace(DEPOIS,ANTES) === fonte` = `true`; paridade de sintaxe 19 blocos → 19, recusados 0 → 0; contagem literal RAMO 1× / GUARD 1× / LOTE 2× (fonte 2 = saída 2) / BOOT antes 0× → depois 1×. Arquivo **novo** em `bfr-candidata-operador-boot-1/`; os bytes vivos (`bfr-candidata-v46/`, `bfr-conecta-patched/`) não foram tocados.
   **FECHADO — APLICADO E PUBLICADO 20/10 no v47, por OK explícito.** O bundle cirúrgico `build-surgical-47.js` parte dos **bytes baixados do ar** (`ar-html-v46-live.html`, md5 `225934b7` conferido na descida) e aplica **um único** hunk **extraído por diferença de linhas** entre o ar e a candidata (nada é re-digitado): o portão exige que exatamente 1 linha suma e 1 linha entre, que a sumida seja literalmente o ponto de boot medido, que `ar + hunk === candidata` **byte a byte** e que a reversão devolva o ar. Saída: `225934b7 (3.367.074c) → 76de427b (3.367.362c, +288)`, paridade de sintaxe **108 blocos / 8 recusados nos dois braços** (o publicado já recusa 8 — armadilha 98), marcadores dos builds anteriores vivos (RAMO, GUARD, `ids.slice(index,index + 300)`, `bfrPnIsSkipped`, rp `?v=13`), SW do ar com **só** o `CACHE` mudando `v46 → v47`, `public/rp.js` = `a2cacc7e…`. Deploy `wrangler deploy` com `CLOUDFLARE_API_TOKEN` desmarcado (OAuth guardado): **Version ID `38081d94-34e8-44e6-96a8-abf3c326db3b`**; conferência no ar: `/` = **3.384.664 bytes em disco, md5 `76de427bce25bf518990b659a378f7f5`** (idêntico à candidata) e `/sw-v4.js` com `const CACHE = 'bfr-conecta-v47'` — «No updated asset files» outra vez, o que não prova nada por si, por isso o md5 do `/` foi conferido.
   **Prova no ar (`sonda-ar-v47-boot.mjs` → `sonda-ar-v47-boot-sports_operator.json`; boot cru, URL `?provaboot=<nonce>`, sem `?role`/`?open`, sem clique; o único script injetado é o sensor de leitura, que embrulha `open()` e **delega**):** **3/3 passadas com `visiveis=schoolGamesView`** (alt **1677 @390 ×2** e **997 @1024**), corpo `chars` 737 → **1.836/2.406**, `abertos=1` com pilha `at abrirJogosDoBoot (<anonymous>:4783:244)` e o `open()` entre **1 e 32 ms depois da criação** (`criação@1156/869/749ms` → `aberto@1188/870/784ms`), `app-ready@1532/1227/1123ms`. **0 escritas ao banco** nas três passadas: o histograma de métodos é `GET 36–37 · OPTIONS 2–17 (pré-flight CORS) · POST 1`, e o único POST é `https://bfr-conecta.turmaroboticabfr.workers.dev/cdn-cgi/rum` (404, artefato do HTML servido, já conhecido do v46) — os `erros=2–6` de console são todos essa mesma linha de 404. **Controle de não-regressão no ar com o coordenador** (`sonda-ar-v47-boot-coordinator.json`): `visiveis=coordinatorView`, **`abertos=0`** (o hunk de boot não alcança outro papel), `GET 57 / OPTIONS 41 / HEAD 4 / POST 1 (= cdn-cgi/rum)`, **0 escritas ao banco**. Capturas: `ar-v47-boot-sports_operator-{390-1,390-2,1024-3}.png` × `ar-v47-boot-coordinator-390-1.png`.
   **O que continua aberto depois do v47:** o **item 153** — no boot do operador a barra de baixo continua marcando `inicio` (`sec=inicio` no diário) enquanto o painel de Jogos está no ar, e o `aria-current` não acompanha; é o mesmo desync já medido no toque em `:20425`, agora visível também sem toque. E o `parent` segue imensurável (sem credencial sintética).

29. **ITEM 153 FECHADO EM CANDIDATA LOCAL MEDIDA (20/10) — causa do churn atribuída por autor + negação, dois hunks, e a montagem da barra atribuída por medida com o sensor desligado. Nada aplicado, nada publicado.**
   **Causa do churn de 66 mutações/s, provada por AUTORIA e por NEGAÇÃO** (`probe-160-autor-breadcrumb.mjs` → `probe160-autor-8272-inicio.json`, `probe160-autor-v47.log`): o ramo `jogos-escolares` de `syncNavigationA11y` (`index.html:25399-25407`, ativo só com `#schoolGamesView` visível) escreve `document.querySelector('.breadcrumb b').textContent = 'Jogos Escolares'` **sem guarda de valor** (`:25405-25406`) dentro de um `requestAnimationFrame` que **ele próprio re-arma** pelo `MutationObserver` do módulo de auditoria de UX (`:25459`, `attributeFilter:['class','hidden']` + `childList`). Cada escrita substitui o nó de texto ⇒ 1 mutação ⇒ 1 novo quadro. Medido com o `textContent` embrulhado (pilha crua, armadilha 94): **58-61 escritas/s, 634 de 638 (=99 %) com o MESMO valor**; a negação (desprezar só as escritas iguais, sem tocar no app) derruba o churn para **3-6 mutações/s**. Pilha das últimas escritas: `at syncNavigationA11y (<anonymous>:120:46)`, 26/26 amostras.
   **Candidata** `bfr-candidata-item160/` (`gera-candidata-item160.mjs`, diário `bfr-candidata-item160.json`): **1 hunk novo por arquivo, só nos dois sítios medidos** — B (guarda de valor na escrita do breadcrumb, `index.html`) e C (o interceptor de `:20426` passa a chamar `syncActiveNavigation('jogos-escolares')` + `persistNavigationState('jogos-escolares')` logo depois de `open()`, no MESMO `setTimeout`, guardados por `typeof … === 'function'`). `index.html` **76de427b → 8432ad73, +243 chars (3.367.362 → 3.367.605)**; **`bfr-responsive-presentation.js` fica byte-idêntico ao publicado (`a2cacc7e`, delta +0)**; 13 arquivos, os demais copiados. Portões da casa no diário: âncora 1× e `DEPOIS` ausente na fonte; **reversão byte a byte `true`**; paridade de sintaxe 19 blocos → 19, recusados 0 → 0; marcas RAMO 1 / GUARD 1 / LOTE 2 / BOOT 1 preservadas.
   **A montagem da barra do mobile é atribuída por medida SEM SENSOR, e isso obrigou a tirar um hunk da candidata.** `probe-153-portao-barra.mjs` não injeta nada na página, e foi ele que decidiu: @390, `open=inicio`, sessão do operador, 7 amostras/15 s — **publicado `nav=false apresent=null appbar=false` em 7/7**; **B+C (rp.js intacto) `nav=true nRoute=4 apresent=mobile` já em 2,6 s**; **só-A também monta** (3,1 s) mas deixa o churn correr. Logo **B cura a montagem sozinho** — a fome era o churn do breadcrumb — e o hunk A (forçar `sync()` no tique do teto, `rp.js:624`) foi **retirado**: mexeria num módulo de apresentação compartilhado por todos os papéis para curar um defeito que a causa já cura. (116) **Armadilha paga:** com o sensor leve do `ab-item160.mjs` (MutationObserver + embrulho de `textContent`/`fetch`) o **publicado monta aos 4,5 s** — o instrumento desloca a corrida de 60 ms do `rp.js:629-630` e **inverte o resultado**. A comparação de montagem só vale sem sensor; a de estado (sec/barra/guarda) não depende dela.
   **O desync do toque, A/B com toque REAL (`Input.dispatchMouseEvent`) e firewall, @390, aberto em Avisos, 3 toques (Jogos → Avisos → Jogos):** publicado (`ab160-toque-pub47-390-…json`) em **3/3 toques** mostra o painel (`visiveis=schoolGamesView`, alt 1677) e deixa `sec=notificacoes`, `guarda=notificacoes/sports_operator`, `barra=… jogos-escolares=false notificacoes=page`; candidata (`ab160-toque-cand160BC-390-…json`) em **3/3** fica `sec=jogos-escolares`, `guarda=jogos-escolares/sports_operator`, `barra=jogos-escolares=page notificacoes=false`, inclusive na volta e no ida-e-volta. Escritas ao `.breadcrumb b`: **61/s → 0/s**; mutações **55-78/s → 3-17/s**; **0 erros de console, 0 escritas de rede** nos dois braços. O modal de primeiro acesso (`#preferredNameModal`) voltou a cobrir a barra inteira no 1º toque (armadilha 92); o instrumento agora fecha-o com um clique REAL no "Agora não" antes de medir e grava `modalAberto` por amostra.
   **ACHADO NOVO QUE A PASSADA ABRIU — o desync não é do papel:** no **coordenador** @1024, pelo mesmo gesto na sidebar (`CANAL=item`, `ab160-toque-coord-toque-8282/8285-coordinator-1024.json`), o publicado também mostra os jogos (`alt 866`) com `sec=notificacoes` e `guarda=notificacoes/coordinator` nos 3 toques, e a candidata fica coerente nos 3 (`sec=jogos-escolares`, guarda idem). Regressão medida no mesmo papel: **boot @390 `coordinatorView` idêntico nos dois braços** (mesma barra, mesmo `crumb`, mesma montagem aos 4.517 ms, mutações menores na candidata: 945 vs 1.024 na mesma amostra), 0 erros, 0 escritas. As `barradas=7` do braço candidata são **todas `POST/BEACON /cdn-cgi/rum`** (artefato do HTML salvo, armadilha 112) — nenhum outro método não-GET apareceu em nenhum braço.
   **Resíduo honesto, NÃO introduzido pela candidata (idêntico nos dois braços):** ao voltar de Jogos para Avisos o `.breadcrumb b` fica "Jogos Escolares" — o ramo só escreve quando os jogos estão visíveis e nunca restaura o rótulo da seção. E o `sidebarAtiva=jogos-escolares+jogos-escolares` (dois `.nav-item` do mesmo `data-section`, nav antiga + nav de plataforma) é decorativo e pré-existente.
   **Portas do rig desta rodada** (uma por dir × papel, armadilha 96): 8272 publicado×operador, 8283 `item160-so-b` (B+C) ×operador, 8284 `item160-so-a` (só A) ×operador, 8282 publicado×coordenador, 8285 candidata×coordenador. Capturas `ab160-toque-*.png`, `probe153-portao-{8283-soBC,8284-soA,8280-cand,8272-hoje}.json`. **Aplicar e publicar (v48) pede OK explícito**, e a candidata do item 27 (`bfr-candidata-item27-ancora/`, md5 `577f7808`, +67 chars) continua na mesma fila — as duas são hunks de arquivos diferentes e podem subir juntas. *(nota de 20/10: a candidata do item 24 entrou na mesma fila — ver item 32.)*
   **FORMA DE BOOT DO MESMO DESYNC, E O HUNK D (20/10, rodada 2).** Além do toque, o hunk do v47 (`:9130`) mostra o painel de Jogos deixando o estado em `inicio`; às cegas isso ficaria aberto. Instrumento novo `sonda-boot-estado.mjs` (amostrador de 50 ms instalado por `addScriptToEvaluateOnNewDocument`, só LÊ `BFR_APP_RUNTIME.activeSection` + o `section` do guarda de localStorage + a barra; `escritas_rede` por `p.rede()`; zero cliques; URL só com `?n=`): **publicado 3/3 termina em `sec=inicio`** (última transição 818–1.023 ms, barra ausente), **candidata com D 3/3 faz `inicio → jogos-escolares` aos ~1,0 s** com o guarda acompanhando (`jogos-escolares/sports_operator`) e a barra recém-montada já destacando Jogos (`rotas=inicio=false jogos-escolares=page`), **0 escritas de rede nos dois braços**. Hunk D = dentro de `abrirJogosDoBoot`, `{ window.BFRSchoolGames.open(); syncActiveNavigation('jogos-escolares'); persistNavigationState('jogos-escolares'); }` (+88 chars).
   **CANDIDATA ENTREGUE AGORA É `bfr-candidata-item160-BCD/`**: `index.html` **76de427b → d70453f3, +331 chars (3.367.362 → 3.367.693)**, rp.js byte-idêntico ao publicado (`a2cacc7e`), 13 arquivos com os 12 demais idênticos (conferido por `md5sum * | sort`), portões no diário `bfr-candidata-item160-BCD.json` (âncora 1× e DEPOIS ausente, **reversão byte a byte `true`**, paridade 19 blocos→19 / recusados 0→0, RAMO 1 / GUARD 1 / LOTE 2 / BOOT 1). Braços de atribuição conservados: `bfr-candidata-item160-soB` (só B, `58620698`, +48c) e `…-soC` (só C, `e9ea989f`, +195c).
   **Atribuição da montagem refeita com braços PUROS, sem sensor** (`probe153-atrib-{pub,soB,soC}-*.json`, @390, 3 rodadas cada, harness sem `?open=`): publicado `nav=false` **3/3** · **só B `nav=true nRoute=4 appbar=true drawer=true` aos 2,6 s** · **só C `nav=false` 3/3**. É o B, sozinho, que devolve a janela de calma ao `schedule()` do rp.js; o C não toca no churn — como se esperava, mas ficou medido. Uma passada avulsa inverteu os braços (armadilha 105): a conclusão é dos 3/3 repetidos, não de uma amostra.
   **Controle de regressão no coordenador com a candidata final** (portas 8289 publicado×coord, 8290 BCD×coord; @390 e @1024): `visiveis=coordinatorView`, `nav=true nRoute=5`, `rotas=inicio=page coordenacao=false horarios=false ocorrencias=false more=false`, `apresentacao=mobile`/`tablet` e `sec=inicio/coordinator` **idênticos nos dois braços nas quatro combinadas**, 0 erros (`probe153-coord-*.json`). Portas da rodada 2: 8286 sóB×oper, 8287 sóC×oper, 8288 BCD×oper, 8289/8290 coordenador; sessões remintadas às 05:22Z por `remint-live.mjs`.
   **Armadilhas novas pagas nesta rodada (118–120 da coleção do rig):** (118) `return` no topo do literal injetado → o `addScriptToEvaluateOnNewDocument` morre em `SyntaxError` e o diário devolve `null`, que se leria como "o estado nunca mudou"; o `new Function` do portão NÃO pega (corpo de função aceita return) — o conserto da casa é compilar modo `script` com `new vm.Script`, feito em `confere-sonda-sintaxe.mjs`. Inverso: `p.avaliar()` embute em função, então exige `return` (IIFE sem return devolve `undefined`). (119) com `?open=` vazio, `audit-harness-com-dir.mjs:65` comparava `activeSection !== ''` e re-chamava `rt.navigate('')` a cada 500 ms — o rig apagava o estado que a edição escrevia; portão agora `pronto && OPEN && …`. (120) `?role=` no URL chama `setRole` por fora, que re-executa a restauração para `inicio`: as duas primeiras leituras do boot diziam `sec=inicio` por causa do rig, não do app.

30. **v48 PUBLICADO (20/10) e a prova no ar abriu o item 29 — o RE-CARREGAMENTO do operador fica em tela vazia. Causa medida nos dois braços, candidata `boot-e` gerada, gateada e provada localmente; v49 construído e NADA publicado.**
   **O que subiu no v48** (`build-surgical-48.js`, dois conjuntos de hunks já medidos em cima dos bytes do ar v47): item 160 **B/C/D** + item 27 **H1/H2** — contra a nota antiga de que eram "arquivos diferentes", **os dois conjuntos mexem no MESMO `index.html`**, e por isso a fila virou um bundle só. Portões de `build-v48-diario.json`: `76de427b (3.367.362c) → cac0f7ad (3.367.760c, +398)`; cinco identidades de composição byte a byte (`v48 sem H1+H2 == candidata 160`, `v48 sem B+C+D == candidata 27`, `v48 sem tudo == ar`, e as duas aplicações diretas sobre o ar); paridade de sintaxe **108 blocos / 8 recusados** nos dois lados (armadilha 98); marcas RAMO 1 / GUARD 1 / LOTE 2 / BOOT 1 / B 1 / C 1 / D 1 / H1 1 / H2 1. **Deploy `070e5c58-7511-4163-a4ae-51f0d468308d`** (wrangler com `CLOUDFLARE_API_TOKEN` desmarcado, OAuth guardado); conferência no ar por `confere-v48-no-ar.mjs`: `/` = 3.367.760 chars, md5 `cac0f7ad343dd3f1ebeb7102ad2fe050` **idêntico ao build**, `CACHE='bfr-conecta-v48'`, `rp.js` `a2cacc7e`. Detalhe que virou portão: a stringa `if (!anchor) return;` **já existia 2× no ar v47**, então a marca do H2 só é única na forma composta `if (!anchor) return;\n                  if (anchor) {` — o verificador pedia 1× da stringa nua e acusava "ERRO 3×" sem nenhum defeito no produto (família da armadilha 110).
   **Prova no ar do boot (`sonda-ar-v48-boot.mjs` → `sonda-ar-v48-boot-sports_operator.json`, @390/@390/@1024, URL só com `?provaboot=`, sem `?role`/`?open`, sem clique):** `3/3` com `sec=jogos-escolares`, `3/3` com a barra montada, `3/3` com o guarda em `jogos-escolares` — os três campos que C/D deviam escrever, escritos. **Mas só `1/3` com painel visível:** a 1ª passada dá `schoolGamesView alt 1677`; a 2ª e a 3ª dão `VISÍVEIS=NENHUM`, `jogos={alt:0, oculto:true}`, `abertos=0`. O 1/3 se explica sozinho: a 1ª passada é a primeira vez que o guarda existe (nasce `inicio`); ao gravar `jogos-escolares`, o hunk D **muda o caminho do próximo boot** — e esse caminho não estava medido.
   **Atribuição por A/B com o guarda SEMEADO antes do boot** (`probe-v48-recarga.mjs`; uma porta por dir × papel, armadilha 96: 8291 v48×oper, 8293 v47×oper, 8294 v48+E×oper, 8296 v48×coord, 8295 v48+E×coord; sem clique, sensor só de leitura):

   | braço | guarda semeado | @390 | @1024 |
   |---|---|---|---|
   | v47 publicado | `jogos-escolares` | **0/3** NENHUM, `abertos=0` | **0/2** NENHUM |
   | v48 publicado | `jogos-escolares` | **0/3** NENHUM, `abertos=0` | — |
   | **v48 + hunk E** | `jogos-escolares` | **3/3** `schoolGamesView alt 1677`, `abertos=1`, 0 erros | **2/2** alt **997** |
   | v48 publicado | `inicio` | 3/3 alt 1677 | — |
   | v48 + hunk E | `inicio` | 3/3 alt 1677 (idêntico) | — |
   | v48 publicado | `notificacoes` | 0/3 NENHUM (mesma leitura no v47) | — |

   **Causa — e não é um defeito do v48 em si:** `restoreNavigationState` (`:4536-4537`) chama `navigateToSection(section)`, e o ramo do operador (`:9242`) exige `typeof window.BFRSchoolGames?.open === 'function'` **no instante em que roda**; no boot o módulo nasce aos 610–1.058 ms (medido) e a restauração roda antes, o ramo não vale, e o `hide-all` de `:9238` já escondia todo `#appShell .content` ⇒ `visiveis=[]`. O único ponto com re-tenta é o `abrirJogosDoBoot` do v47 (`:9130`), condicionado a `activeSection === 'inicio'` — exatamente a condição que a restauração torna falsa. **O v47 tem o mesmo buraco** (0/3 @390 e 0/2 @1024 com o guarda semeado): o que o v48 mudou foi passar a **gravar** `jogos-escolares`, e assim o segundo carregamento de uma sessão real caiu nesse caminho. É a família do item 28 vista pela outra ponta, e vale como regra de casa: **corrigir o estado de boot cria um caminho de boot** (armadilha 121).
   **Hunk E** (`gera-candidata-item161-boot-e.mjs` → `bfr-candidata-v48-boot-e/index.html`, `cac0f7ad → d9374fb5`, **+76 chars**, portões no diário do mesmo nome: âncora 1× e DEPOIS 0×, **reversão byte a byte `true`**, paridade 19→19 blocos / 0→0 recusados, 9 marcas preservadas + E 1×): dentro do mesmo `abrirJogosDoBoot`, `else if (activeSection === 'jogos-escolares') window.BFRSchoolGames.open();`. Deliberadamente **sem** `syncActiveNavigation`/`persistNavigationState` nesse ramo — medido `aria=page` e `section":"jogos-escolares"` já corretos na restauração; chamar de novo só duplicaria `history`. E é a **negação** que fecha a cadeia (armadilha 111): mesmo instrumento, mesmo guarda, 0/3 → 3/3, com `abertos` de 0 → 1.
   **Controle de regressão no coordenador** (`probe-controle-coord-v48e.mjs`, 8296 vs 8295, @390, 3 amostras pareadas após 12 s de calmaria): `sec=inicio`, `visiveis=coordinatorView`, `barra=true`, `painel alt 5063` **idênticos nas 3 amostras dos dois braços**, `guarda={role:"coordinator",section:"inicio"}`, **0 escritas de rede** (`p.rede()` com carimbo de alvo, armadilha 99). A primeira versão do controle devolvia `identico=false` porque comparava a leitura do *instante em que o portão abriu* (barra `true`×`false`, alt 1.925×3.388): estágio assíncrono, não estado (armadilha 105). Os 3–4 "erros" dos dois braços são `404` de recurso no harness local, presentes dos dois lados.
   **O que o hunk E NÃO fecha (fica aberto, pré-existente ao v48):** recarregar com o guarda em **qualquer outra seção** do operador (`notificacoes` medido: 0/3 `NENHUM` no v48 e igual no v47). O papel não tem container no mapa de views (17.g) nem ramo no roteador para as outras seções, então restaurar para elas não tem o que mostrar — cair em Jogos é decisão de produto (fallback), não hunk de 76 chars. E a banda web do operador continua sem `.content` próprio: o que E entrega ali é o painel de Jogos (alt 997), não uma view do papel.
   **v49 construído e parado no portão** (`build-surgical-49.js` baixa o AR **agora**, exige `cac0f7ad` na descida, extrai o hunk por diferença de linhas e confere `ar + hunk == candidata` e a reversão): `cac0f7ad (3.367.760c) → d9374fb5 (3.367.836c, +76)`, sintaxe 108/8 nos dois lados, 12 marcas conferidas (RAMO/GUARD/LOTE/BOOT/B/C/D/H1/H2/E/`bfr-route-scroll-v1`/rp `?v=13`), SW com **só** `CACHE: v48 → v49` (reversível), `public/` 12 arquivos com `rp.js` = `a2cacc7e`. **Nada publicado** — o deploy do v49 pede OK explícito, e a prova no ar depois dele é o mesmo `probe-v48-recarga` contra o público (2 recargas seguidas com painel visível).
   **Portas desta rodada:** 8291 v48×oper, 8292 v48×coord, 8293 v47×oper, 8294 boot-e×oper, 8295 boot-e×coord, 8296 v48×coord (controle). Sessões remintadas às 04:04Z por `remint-live.mjs` (exp 06:04:31Z). Diários: `probe-v48-recarga-8291-v48-jogos-390.json`, `probe-v48-recarga-8293-v47-{jogos-390,jogos-1024}.json`, `probe-recarga-8294-bootE-{jogos-390,jogos-1024,inicio-390}.json`, `probe-recarga-8291-v48-{inicio,notif}-390.json`, `probe-controle-coordinator-v48-vs-bootE-390.json`, `build-v49-diario.json`. Capturas `v48-recarga-*.png`, `controle-coordinator-*.png`.

31. **v49 PUBLICADO (20/10, OK explícito) e o item 29 FECHADO no ar por prova — 6/6 documentos com painel, recarga natural 3/3, negação local medida, coordenador sem regressão, 0 escritas ao banco.**
   **Deploy `cc5a666e-2292-4a39-94fe-a0fec92f24f8`** (`build-surgical-49.js` + wrangler com `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` desmarcados, grant OAuth; 12 assets lidos, "No updated asset files to upload" porque `public/` não mudou — o HTML mora no `worker.mjs`). Conferência no ar em 3 descidas: `/` md5 `d9374fb5f30aee479642a3f0fc1b6e11` nas três, **`cmp` byte a byte idêntico à candidata** `bfr-candidata-v48-boot-e/index.html`; `/sw-v4.js` = `6199d37a…` com `const CACHE = 'bfr-conecta-v49'`; `public/bfr-responsive-presentation.js` `a2cacc7e`. Armadilha de casa que virou nota: o `/` servido mede **3.385.138 bytes** contra **3.367.836 chars** do build (acentos UTF-8), por isso a comparação é por md5/`cmp`, nunca por comprimento.
   **A prova não finge a recarga** (`sonda-ar-v49-recarga.mjs`, modo `natural`): o boot escreve o próprio guarda (`persistNavigationState` do hunk D), então a **2ª navegação da mesma aba É o cenário do item 29** — sem semear, sem clique, sensor só de leitura. Cada rodada mede BOOT e RECARGA e imprime `sonda.abertos`, a marca do hunk E. @390/@390/@1024 → `sonda-ar-v49-operador-natural.json`: **6/6 com `schoolGamesView` visível** (alt 1.677 @390, 997 @1024), **6/6 com `abertos=1`** (`open()` 41–168 ms depois da criação, pilha em `abrirJogosDoBoot`), 6/6 `sec=jogos-escolares` e `aria=page`, **0 escritas ao banco** (o único não-GET é `cdn-cgi/rum`; a única falha HTTP é o 404 desse mesmo beacon, presente em todos os documentos), `erros_console` únicos = 1 (o mesmo 404). **Ressalva honesta: a barra mobile montou em 5/6** — a recarga da 1ª rodada @390 deu `nav=false` (chars 1.836 vs 1.922). É o sintoma do item 160/B (o `schedule()` do rp.js debitado pelo churn), não do E: o campo não toca o ramo corrigido e aparece em 1 de 6, quando no v48 aparecia em praticamente todos.
   **Negação com o mesmo instrumento** (`BASE=` num knob novo, armadilha 122): porta **8291** (v48 sem E, marca `grep -c` do ramo = 0) → `sonda-neg-v48-local.json` **0/2** com painel, `abertos=0`, `VISÍVEIS=NENHUM`, chars 711; porta **8294** (v48+E, marca = 1) → `sonda-neg-bootE-local.json` **2/2**, `abertos=1`, alt 1.677. Mesma URL de prova, mesma sementeira, mesma calmaria: o que muda é só o byte publicado. Detalhe que não se pode ler como "escrita": no braço de 8291 apareceram **2 `POST /auth/v1/token?grant_type=refresh_token`** — o app reemalar a sessão mintada perto do fim do token. É rotação de credencial, não escrita de dados; nos outros três diários não ocorreu porque a sessão era mais nova. Quem contar "0 escritas" precisa distinguir `refresh_token` de `rest/v1/*`.
   **Controlo no ar com o coordenador** (`PAPEL=coordinator MODO=semeado SECAO=inicio` → `sonda-ar-v49-controle-coordenador.json`): BOOT e RECARGA **2/2 `coordinatorView` visível**, barra montada, guarda `coordinator/inicio`, **`abertos=0`** (o ramo dos Jogos nem é alcançado por outro papel), 0 escritas, mesmo 404 de beacon.
   **Porta parada no fim:** 8291/8292/8293/8294/8295/8296 desligadas depois desta prova (as seis portas devolvem `000`); portas CDP 9475–9479 encerrados pelos próprios probes. Capturas: 10 PNGs `ar-v49-{boot,recarga}-*.png`, **mas os dois braços locais escreveram o MESMO nome** — o molde do ficheiro não levava o `BASE`, só `PAPEL/MODO/largura` — e as 2 PNGs `-sports_operator-semeado-390-1` são de porta indeterminada (8291 e 8294 corridas em paralelo; braço da armadilha 109). **A evidência da negação são os diários JSON, que têm `ARQ` distinto** (`sonda-neg-v48-local.json` vs `sonda-neg-bootE-local.json`); quem precisar de PNG por braço tem de meter o porto no nome. **Continuam abertos e escritos noutro lado:** recarga do operador noutra seção (`notificacoes`, decisão de produto) e `parent` sem credencial sintética.



32. **ITEM 24 FECHADO EM CANDIDATA LOCAL MEDIDA (20/10) — decisão (b): o coordenador passa a ter superfície própria de cadastro, só de leitura, montada com os dados que a sessão dele já carrega. Candidata gerada, gateada, A/B-ada contra os bytes do ar e com três controles; NADA publicado *(até o item 33: esta candidata é o v50 no ar)*.**

**A remeidação nos bytes do ar (`v49`, md5 `d9374fb5…`) piorou o registro do item, e é isso que define o conserto.** No mobile o nó existe na gaveta, é descoberto e tocável (`♙ Cadastro de alunos`), o roteador recusa no guard de papel (`:9161`) e a pessoa volta ao Início sem mensagem — `probe-item24-ar-v49d-1024x390.json` @390: `toque → sec=inicio`, `painel=ausente`. Na banda web **não há entrada alcançável nenhuma**: o chrome visível é `.bfr-platform-nav` (que não tem o item) e o nó legado tem rect real mas está sob outro pintor — `probe-item24-cobridor.mjs` (`probe-item24-cobridor-1024.json`, `item24-cobridor-1024.png`): item `[14,475,158,56]`, `elementFromPoint` devolve `DIV.nav-label.bfr-legacy-label`, `dentro=false`. O instrumento então **recusou tocar** e gravou `TOQUE NÃO EXECUTADO` (armadilha 92) — correct: tocar coordenada que não é o item não prova nada. Logo "@1024 toque=AUSENTE painel=ausente" é o estado real do ar, não falha de medição.

**Por que a opção (b) não encosta no banco.** A sessão do coordenador **já** carrega tudo o que a tela mostra: `coordinatorState.students` = 848 alunos com projeção `id,official_name,class_id` (`active=true`) e `coordinatorState.classes` = 27 turmas, e a policy `"staff manage student records"` já dá SELECT ao papel `coordinator` (D.2). A superfície nova lê esse estado em memória e **não emite consulta nova** — por isso o item é feat de interface e não exige RPC/policy, e por isso endereço/telefone/foto/observações de inclusão continuam só na Administração. A busca é client-side sobre os 848 já carregados (evento `input` sintético, rotulado como tal no diário).

**A candidata** — `bfr-candidata-item24-coord-cadastro/index.html`, md5 `01055151d7eaa00ee9d8c69df18bb960`, em cima dos bytes do ar (`d9374fb5…`, 3.367.836c → 3.374.199c, **Δ +6.363**), gerada por `gera-candidata-item24-coord-cadastro.mjs` com os portões em `bfr-candidata-item24-coord-cadastro.json`. Cinco hunks: **H1** o guard de `:9161` aceita `['developer','coordinator']`; **H2** bloco novo `coordinatorDirectoryState / coordinatorDirectoryMarkup / coordinatorDirectoryRows / renderCoordinatorStudentDirectory / ensureCoordinatorStudentDirectory`, que injeta `<section class="panel hidden" data-coordinator-student-directory>` com eyebrow *"Cadastro escolar · consulta da coordenação"*, h2 *"Alunos da lista oficial"*, contador `[data-coordinator-directory-count]`, `[data-coordinator-directory-search]` ("Buscar aluno pelo nome"), `select[data-coordinator-directory-class]` ("Todas as turmas" + as 27), `[data-coordinator-directory-list] role=list`, status *"N aluno(s) na lista oficial ativa · K turma(s)"* e o aviso *"Incluir, editar e desativar aluno continuam na Administração. Aqui a coordenação consulta nome e turma da lista ativa."*; o `ensure` tem guard de papel (`currentProfile?.role !== 'coordinator' → return`), é idempotente pelo `host.dataset.coordinatorDirectoryReady` e injeta **uma entrada por superfície** em `.bfr-platform-nav` e `.mobile-more-grid` (`data-coordinator-directory-nav`), cujo clique delega no item legado que o app já bindou em `:9293`; **H3** revela/re-esconde dentro de `if (activeView === 'coordinator')` pelo mesmo idioma do `[data-schedule-panel]` (marca `dirRevealed`); **H4** o alvo do coordenador sai de `#adminStudentDirectoryPanel` e passa a `[data-coordinator-student-directory]` (só a linha do coordenador); **H5** `ensureCoordinatorStudentDirectory()` depois de `renderCoordinatorView()` + `bfrCoordinationDashboard?.render()`. Portões: **reversão byte a byte `true`**, paridade de sintaxe **19 blocos, 0 recusados nos dois lados** (armadilha 98), e as marcas do ar preservadas com contagem (RAMO 1 / GUARD 1 / LOTE 2 / BOOT 1 / B 1 / C 1 / D 1 / H1 1 / E 1 / GUARD_24 1 / PAINEL_24 7 / NAV_24 1) com `ALVO_ADMIN_RESTANTE` **4 → 3**. Achaado de gerador pago no caminho: o `grep` da stringa `'cadastro-alunos':'#adminStudentDirectoryPanel'` dá **4** no fonte, não 2 — o portão que exigia 2 abortou a 1ª geração antes de escrever qualquer arquivo.

**A/B com o MESMO instrumento, MESMA limpeza de guarda, MESMAS bandas** (`probe-item24.mjs`, diários `probe-item24-ar-v49d-1024x390.json` × `probe-item24-coord-cadastro-3-1024x390.json`). Guarda de navegação limpa em **localStorage e sessionStorage** antes do boot — o `readNavigationState` (`:4477-4479`) tem fallback em `:4462-4464`, e sem limpar os dois a 2ª banda herdava a rota da 1ª (armadilha 121; `guarda_limpa=2` nos dois braços, boot `sec=inicio` nos dois):

| braço | @1024 | @390 |
|---|---|---|
| **AR v49** | `toque=AUSENTE` (cobridor≠item), `painel=ausente`, 0 escritas | `toque→sec=inicio`, `painel=ausente`, 0 escritas |
| **Candidata** | `sec=cadastro-alunos`, crumb *"Cadastro de alunos"*, painel **700px / 848 linhas**, `#adminStudentDirectoryPanel` **ausente**, fuga → `alt=0 oculto=true` | idem com painel **691px / 848 linhas**, fuga → `alt=0 oculto=true` |

Filtro medido na candidata (as duas bandas): `abigail` **848 → 1**, 1ª linha *"ABIGAIL GONZAGA DE FARIAS 9º ano A"*; `zzzqx` → a lista fica com **1 nó**, que é o `.coordinator-empty` *"Nenhum aluno encontrado com estes filtros."* (contar filhos da lista ≠ contar alunos — armadilha 85); limpo → **848**. Primeira linha nome + turma, sem qualquer campo pessoal.

**Controle 1 — developer, AR × candidata, portas separadas por dir × papel (armadilha 96: 8300 = ar×dev, 8299 = candidata×dev), @1024** (`probe-item24-controle2.mjs`, linhas `probe-item24-controle2-0612.json.log`; o JSON do run **não foi escrito** — o braço B do mesmo ficheiro rebentou num `Assignment to constant variable`, e o que ficou como evidência é o diário de console; a forma composta dos números está aqui): o `rt.navigate('cadastro-alunos')` (caminho do harness, reportado à parte do toque — armadilha 106) monta `#adminStudentDirectoryPanel` **idêntico nos dois braços**: `alt 1377 · larg 757 · chars 77.387 · visivel=true`. Na candidata, `n_painel=0` e `n_nav=0` no boot **e** depois da navegação ⇒ a superfície do coordenador **nunca é injetada fora do papel**. Ressalvas honestas: (i) `total_chamadas=0` nos dois braços ⇒ o sensor de rede não colheu nada naquela aba (armadilha 99/107), então **este braço não prova "0 escritas"** — prova não-regressão do painel admin; (ii) `nos` 15.462 (AR) vs 17.710 (candidata) **não é** painel extra: o portão de assentamento do AR parou em `shell` sem papel/carregado, é estágio de carregamento (armadilha 105); (iii) o toque no item **não chegou** em nenhum dos dois braços (`plat=null`, legado com `cobridor=null` porque o centro cai fora da janela — `rect [14,1087,158,56]` / `[14,1382,158,56]` com `vh=900`): o developer **também** não tem entrada clicável de cadastro na banda web. Isso é pré-existente e igual nos dois braços, portanto não-regressão por medida; e fica registrado como achado de chrome **fora** do escopo do item 24.

**Controle 2 — idempotência @1024, 3 ciclos cadastro ↔ início** (`probe-item24-final.mjs` → `probe-item24-final-0609.json`): `n_painel` **1/1/1**, `n_nav` **2/2/2** (um por superfície — não é duplicação), linhas **848/848/848**, saída `alt=0 oculto=true` nos três, nós dentro `16.914 → 19.466 → 19.466` e fora `19.277 → 19.277 → 19.277`: o salto é o **primeiro** despejo das 848 linhas, e a partir daí a curva é plana — re-visitar a rota não adiciona painel nem nó.

**Controle 3 — idempotência @390 pela gaveta real** (`probe-item24-ciclos390.mjs` → `probe-item24-ciclos390-0614.json`, `item24-ciclos390-{1,2,3}-dentro.png`): o ciclo 1 não rodou porque o botão *Mais* da barra estava coberto por `P.publish-status` (`cobridor=P.publish-status`, `fora=false`) — modal de primeiro acesso no caminho, armadilha 92 — e o instrumento outra vez **recusou tocar**. Ciclos 2 e 3, pelo caminho de verdade (barra → *Mais* → item da gaveta com hit-test `cobridor=SPAN` dentro do próprio item): `sec=cadastro-alunos`, crumb *"Cadastro de alunos"*, painel **691px / 848 linhas / 32.386c**, `n_painel=1`, `n_nav=2`, nós **19.623 → 19.626**; saída em `inicio` com painel `alt=0 oculto=true` e 30.656c, nós 19.435 → 19.438. **Escrita:** as 10 chamadas não-GET deste braço são `POST /cdn-cgi/rum` **contra o próprio harness** (beacon da Cloudflare, armadilha 112); `rest/storage/rpc` = **0** em todos os diários, 0 erros de console.

**O que fica aberto depois desta rodada:** (i) publicar é v50 e **pede OK explícito** — a candidata está na fila com as demais **(resolvido no item 33: publicado e provado no ar em 20/10)**; (ii) `n_nav=2` é por design (web + grade mobile), mas a banda web de 1024 só precisa de uma — se a Direction preferir um único ponto de entrada, é um `if (largura)` no gerador, não um defeito; (iii) a entrada de cadastro do **developer** na banda web continua inalcançável por toque (achado novo, pré-existente, medido no Controle 1); (iv) a superfície não paginada despeja as 848 linhas dentro de um scroller de `min(58vh,520px)` — aceitável porque a linha não é interactiva, e um filtro por turma já reduz o conjunto; se algum dia a linha virar botão, isso vira tarefa de acessibilidade/performance.

33. **ITEM 24 PUBLICADO (v50) E PROVADO NO AR (20/10) — o coordenador já tem o cadastro só de leitura nos bytes publicados, nas duas bandas, por toque real, com 0 escritas ao banco.**

**O deploy.** OK explícito na conversa → `build-surgical-50.js` → `npx wrangler deploy`. **Deploy `a73bb0bc-87a7-4958-b17b-f51b331731fb`, criado `2026-10-20T06:26:29.525Z`** (lido de `wrangler deployments list` dentro de `worker-surgical-50/`, ordenado por `Created` — o `list` vem do mais antigo para o mais novo). Conferência `confere-v50.mjs` → `confere-v50-diario.json`, 3 fetches de `/`: md5 **`01055151d7eaa00ee9d8c69df18bb960`** nos três, `Buffer.compare` contra a candidata = 0 nos três, 3.391.514 **bytes** / 3.374.199 **chars** (acentos; é por isso que comparo md5, nunca comprimento). `/sw-v4.js` md5 `8ba3036df857f8e890f7ce9b63ec08f0` com `const CACHE = 'bfr-conecta-v50';`. `bfr-responsive-presentation.js` **`a2cacc7e00986b2e87fcaae3cbce4faa`**, 51.306 bytes — o mesmo asset do v49, porque o item 24 só mexe no `index.html`. Reversão: `ar-html-v49-live.html` (`d9374fb5`) + `ar-sw-v49-live.js` (`bfr-conecta-v49`) no mesmo pipeline cirúrgico.

**O bundle não redigita nada.** `build-surgical-50.js` lê os **cinco hunks do próprio gerador** (`gera-candidata-item24-coord-cadastro.mjs`, extraídos por `vm` entre `const I =` e `const fontes = {}`, com portão `HUNKS.length === 5`) e exige, sobre o `/` baixado naquela hora: `ar` byte-idêntico ao `bfr-candidata-v48-boot-e/index.html` (a fonte local da candidata); cada âncora **1×** no ar e cada forma nova **0×**; `ar + os 5 hunks == candidata` **byte a byte**; reversão em ordem inversa `== ar` **byte a byte**; paridade de sintaxe com o ar (108 blocos / 8 recusados — portão medido por paridade, armadilha 98); as 18 marcas de v46/v47/v48/v49 vivas com a contagem certa, as 6 marcas do item 24 a nascer com 0 no ar, e `ALVO_ADMIN_RESTANTE` **4 → 3**; `sw` muda só o `CACHE` (verificado desfazendo a troca); `public/` copiado do `worker-surgical-49` com o rp conferido por md5. Diário: `build-v50-diario.json`.

**A prova no ar com gesto real — `prova-ar-v50-item24c.mjs`, diário `prova-ar-v50-item24c.json` (+ `.json.log`), CDP 9533, `VISITAS=2`, nada injetado na página.** Sessões mintadas por `grant_type=password` nas contas sintéticas do papel, semeadas no `localStorage` da origem real, e a guarda de navegação limpa em localStorage **e** sessionStorage antes de cada boot (`limpa_guarda=2` nos três braços).

| braço | entrada por toque | dentro | filtro | saída | rede |
|---|---|---|---|---|---|
| **coord @1024** (visita 1 e 2) | `.bfr-platform-nav [data-coordinator-directory-nav]` tocado | `sec=cadastro-alunos`, crumb *"Cadastro de alunos"*, painel **alt 700 × 848 linhas**, `contagem="848 ALUNO(S)"`, `admin=sem nó`, `n_painel=1` | `ABIGAI`→**1**, `zzzqñ`→**0** + *"Nenhum aluno encontrado com estes filtros."*, limpo→**848** | `sec=inicio`, painel **alt 0, `oculto=true`** | **0 escritas em tabela**, 0 RPC não-GET, 0 rotação de sessão |
| **coord @390** (visita 1 e 2) | barra → *Mais* (344,809) → drawer aberto (`is-open`, 17 rotas) → `[data-bfr-drawer-route="cadastro-alunos"]` tocado em **172,422** | idem, painel **alt 691 × 848 linhas**, 32.386c | idem (1 / 0 com mensagem / 848) | `sec=inicio`, **alt 0, `oculto=true`** | **0 / 0 / 0** |
| **dev @1024** (controle) | toque **recusado** (cobridor `DIV.nav-label.bfr-legacy-label` — pré-existente, item 32) → roteador do app (`navigate`, caminho do instrumento, armadilha 106) | `sec=cadastro-alunos`, **`#adminStudentDirectoryPanel` VISÍVEL / 1377px**, `n_painel=0`, `n_nav=0` | — | `sec=inicio` | 0 escritas; 2 RPC não-GET (aniversários, ver item 34) |

Os erros de console dos três braços são **todos** o `POST /cdn-cgi/rum` a devolver 404 (beacon da Cloudflare, armadilha 112); não há nenhum outro. As duas visitas do coordenador são **idênticos** em cada banda (painel, contagem, linhas, estado de saída) e o `n_painel` não passa de 1 — a não-duplicação que o Controle 2 local já media volta a verificar-se no ar.

**A prova mobile custou dois defeitos MEUS de instrumento, e é justo gravá-los.** (a) `prova-ar-v50-item24.mjs` (v1) e depois o braço `coord390` do `item24b` tocavam `.mobile-more-grid [data-coordinator-directory-nav]` e colhiam `zero:true`. `sonda-gaveta-v50.mjs` mediu o porquê: a 390 existem **duas** cópias injetadas e **nenhuma** delas é a que a pessoa vê — a da `.bfr-platform-nav` está em `ASIDE.bfr-web-sidebar` com `display:none`, a da `.mobile-more-grid` está dentro de `DIV.mobile-more-menu.hidden`; o que abre é o **drawer do rp.js** (`#bfrMobileDrawer`, `is-open`, 17 `[data-bfr-drawer-route]`), que **herdou a rota `cadastro-alunos`** dos itens do papel — ou seja, o item 24 também funciona no mobile sem nada ter de ser acrescentado ao rp.js. (b) O *Mais* da barra tem o centro coberto quando o modal de primeiro nome está aberto (`elementFromPoint` → `DIV.modal-card.account-tool-card.preferred-name-card`, armadilha 92); o `item24b` já fechava o modal e por isso o *Mais* passou, mas a sonda (que não o fechava) mostrou o cobridor. Acrescentei `tocarGrade()`: varre 9 pontos do rect e só toca onde o hit-test **é** o próprio nó — o gesto continua a ser clique em coordenada, sem `element.click()` e sem script na página.

**O que fica aberto depois desta vaga:** (i) `n_nav=2` por design (item 32(ii)); (ii) o developer não tem entrada **clicável** de cadastro na banda web (item 32(iii), pré-existente); (iii) ~~item 34~~ — um RPC do painel do developer rebentava sempre, descoberto por esta passada e **fechado no banco mais tarde no mesmo dia**, ver o item 34.


34. **ITEM 34 FECHADO NO BANCO (20/10): `bfr_list_staff_birthdays` devolvia HTTP 400 em TODAS as chamadas; agora devolve 200. Foram precisos dois degraus — o primeiro erro tapava o segundo — e cada um foi ensaiado com `rollback` antes de tocar no estado.**

**Visto no ar, não inferido.** O braço `dev1024` de `prova-ar-v50-item24c.json` colheu `POST /rest/v1/rpc/bfr_list_staff_birthdays → 400` (e o mesmo no `prova-ar-v50-item24.json`, o v1 do mesmo par). Não é do hunk do item 24: acontece no painel do **developer**, por um chamador que os cinco hunks não tocam.

**Causa medida por chamada de leitura** (`sonda-rpc-birthdays.mjs` → `sonda-rpc-birthdays.json`; sessão real mintada, chave publishable lida do HTML publicado, nada impresso): com a mesma chave e token do **developer** e do **coordenador**,
`POST /rest/v1/rpc/bfr_list_staff_birthdays {target_month:10}` → **400 `{"code":"42702","message":"column reference \"role\" is ambiguous","details":"It could refer to either a PL/pgSQL variable or a table column."}`**, enquanto `POST /rest/v1/rpc/list_current_month_birthdays` → **200** com alunos. O catálogo (`sql-anon-bfr-list-staff-birthdays.json`) diz que a função existe (`target_month integer`), é de dono `postgres`, `authenticated` tem EXECUTE e `anon` **não** tem — logo não é falta de grant nem função ausente. O corpo (`sql-corpo-bfr-list-staff-birthdays.json`) explica: `RETURNS TABLE(profile_id uuid, full_name text, **role text**, birthday_day integer)` declara `role` como parâmetro de saída (variável plpgsql) e o guard interno escreve `and role in ('pedagogical',…)` **sem qualificar** contra `public.profiles` — a mesma família da armadilha já registrada de `declare current_role text`. **Negação parcial lida no mesmo instante** (`sql-negacao-role-ambiguo.sql`): o MESMO predicado fora da função não levanta nada e devolve contagens; a ambiguidade só existe dentro, onde o `role` do `RETURNS TABLE` vive.

**Efeito no app.** `index.html:11887` chama a RPC dentro de `if (staffRoles.includes(role()))` e faz `if (!staffResult.error) staff = …` — o erro é **engolido em silêncio**, sem mensagem e sem log. Para as 6 funções de equipe, a lista de aniversários mostra só alunos; a metade "Professor/equipe" está morta desde sempre.

**Censo que dimensiona o dano (`sql-negacao-role-ambiguo.json`):** 28 perfis, **13** com papel de equipe, **0** com `birth_date` preenchido, **0** aniversários em outubro em toda a tabela. Ou seja: corrigir o qualificador é uma linha (`and public.profiles.role in (…)`), mas **enquanto `profiles.birth_date` estiver vazio o ecrã não muda de aspecto** — o que se ganha é o fim do 400 permanente e a garantia de que a funcionalidade existe quando a Direção preencher as datas. **Fechado por medida, com OK em duas pernadas.** A usuária autorizou primeiro o protocolo *ensaio com rollback → aplicar* e, depois de o primeiro degrau revelar um segundo erro, autorizou o segundo `CREATE OR REPLACE`. Os ficheiros ficaram gravados e nada foi re-digitado: `gera-item34-perna2.mjs` lê o statement da perna 1 e dele fabrica a perna 2, a negativa e o ensaio.

**Perna 1 — o qualificador.** `sql-corrigir-item34-staff-birthdays.sql` (md5 `c301b8f3…`) é **byte-idêntico ao corpo vivo, mudando uma linha**: `and role in (…)` → `and profiles.role in (…)` (mais o `;` do statement). Ensaio `begin; …; select count(*) …; rollback;` → HTTP 201 `linhas_ensaio: 0`; conferência de que o rollback não deixou nada → `ainda_sem_o_qualificador: true · ja_qualificado: false`. Só então apliquei, e conferi: `ja_qualificado: true`, `acl {postgres=X, authenticated=X, service_role=X}` **sem `anon`**, dono `postgres`, `security_definer` — a mesma assinatura, logo sem re-grant e sem publicar nada.

**O 42702 tapava um 42804.** Depois de aplicar, a prova real (`sonda-rpc-birthdays.mjs` com sessões mintadas → `sonda-rpc-birthdays-pos-item34.json`) deixou de dar 42702 e passou a dar **`400 · 42804 · Returned type account_role does not match expected type text in column 3`** nos dois papéis. O catálogo fechou a causa: `profiles.role` é `USER-DEFINED / account_role` (`sql-item34-tipos-e-uid.log`) e o `RETURNS TABLE` declara `role text`. Era invisível antes porque o erro de ambiguidade rebentava na linha 3 (`at IF`) e a execução nunca chegava ao `RETURN QUERY`.

**Lição de instrumento (armadilha 131): um ensaio sem JWT não ensaia nada.** O primeiro `begin; …; select count(*) …; rollback;` devolveu `0` **sem erro** mesmo com o corpo ainda quebrado, porque no canal SQL `auth.uid()` é nulo, o guard faz `return` cedo e o `RETURN QUERY` nunca é verificado. Para o ensaio valer alguma coisa tem de se semeiar a claim do JWT dentro da transacção — `select set_config('request.jwt.claim.sub', '<id da conta de equipe>', true);` — e foi assim que as duas metades ficaram medidas **sem tocar no estado**: `sql-item34-negativa-42804.sql` com o corpo da perna 1 → **HTTP 400 / 42804, `line 10 at RETURN QUERY`**; `sql-item34-ensaio-v2.sql` com o cast → **HTTP 201, `linhas: 0`**, sem erro.

**Perna 2 — o cast.** `sql-corrigir-item34-staff-birthdays-v2.sql` (md5 `a0910bfc…`) = perna 1 + `p.role::text` na coluna 3 do `return query` (Δ **+6 caracteres**; assinatura, nomes de saída e `$function$` preservados — o app lê `role` por spread em `index.html:11888`, por isso continua sem publicar). Conferência pós-aplicação (`sql-item34-confere-cast.log`): `cast_no_corpo: true · guard_qualificado: true · assinatura_igual: true · n_sobrenomes: 1`. Nota de higiene: `apply-sql.mjs` **imprime** no stdout e não escreve diário JSON — os `.log` desta seção são redirecionamento do console das consultas de leitura, re-executáveis porque são só `SELECT`.

**Prova no PostgREST, o mesmo pedido que o app faz** (`sonda-rpc-birthdays.json` × `sonda-rpc-birthdays-pos-cast.json`, mesmo instrumento, mesmas sessões):

| papel · RPC | antes (07:10) | depois (20:46) |
|---|---|---|
| developer · `bfr_list_staff_birthdays` | **400** `42702` | **200** `[]` |
| coordinator · `bfr_list_staff_birthdays` | **400** `42702` | **200** `[]` |
| developer · `list_current_month_birthdays` | 200 com alunos | 200 com alunos (sem regressão) |
| coordinator · `list_current_month_birthdays` | 200 `[]` | 200 `[]` (sem regressão) |

**O ecrã não muda de aspecto — e é preciso dizê-lo.** O censo continua `equipe=13 · equipe_com_data=0`, então a lista de aniversários da equipe volta **vazia por falta de dado**, não por falta de código. Por escolha explícita da usuária **não escrevi `birth_date` em perfil nenhum** (nem no sintético): o que fechou aqui é o erro permanente, e o preenchimento é tarefa da escola. O ar está inalterado: `/` md5 `01055151d7eaa00ee9d8c69df18bb960`, 3.391.514 bytes, conferido depois do DDL.

**Observação medida, causa ATRIBUÍDA em 20/10 (virou item 35, abaixo):** o coordenador recebe `200 []` do `list_current_month_birthdays` **antes e depois** desta mudança, enquanto os 848 alunos lhe chegam no cadastro só de leitura do item 24. A hipótese que escrevi aqui na hora — "a divergência está na projection/RLS do `birth_date` dos alunos" — **é falsa**, e o item 35 mede o motivo real.

35. **ITEM 35 ABERTO (20/10) — o painel "Aniversários do mês" está vazio para 6 papéis porque `coordinator`, `director`, `secretary`, `sports_operator`, `psychology` e `social_work` não estão em `is_approved()`. Causa atribuída por medida nos dois lados; NADA aplicado — é decisão sua, e o raio de impacto está medido.**

**A causa, lida no catálogo (`sda-obs-35-corpo.sql`, `sda-obs-35-censo.sql`).** `list_current_month_birthdays(target_month)` é `LANGUAGE sql STABLE SECURITY DEFINER`, `SET search_path TO ''`, e o predicado é `where auth.uid() is not null and public.is_approved() and s.active = true and sp.birth_date is not null and extract(month from sp.birth_date) = target_month`. Ela lê `student_school_profiles.birth_date` — **não** `profiles.birth_date`, que é onde mora o censo de 0 datas da equipe do item 34. O `acl` é `{postgres, authenticated, service_role}`, ou seja **qualquer sessão autenticada chama**, e o único portão é o `is_approved()`.

**O dado existe, então não é falta de preenchimento:** `alunos_ativos: 848 · linhas_sp: 848 · sp_com_data: 842 · sp_em_outubro: 67`.

**`is_approved()` = `current_role() in ('parent','student','pedagogical','aee','monitor','gatekeeper','developer')`** — seis papéis do app ficam fora. Medido com o método validado (papel assumido + claim do JWT dentro de `begin; …; rollback;`, `sda-obs-35-coord.sql` / `sda-obs-35-dev.sql`, duas tacadas separadas):

| braço | `current_role()` | `is_approved()` | aniversários em outubro | em setembro |
|---|---|---|---|---|
| coordenador real (`b4dbaa51…`) | `coordinator` | **false** | **0** | 0 |
| developer sintético (`7bf6e64b…`) | `developer` | true | **67** | 72 |

Zero linhas com o predicado `false` e 67 com o mesmo predicado `true`, na mesma função, na mesma tacada, sem escrever nada: a divergência **não** é de projection nem de RLS do `birth_date`, é a lista de papéis.

**Por que eu não resolvo isto com uma linha.** `is_approved()` sustenta **9 policies de SELECT** (medido em `sda-obs-35-raio.sql`): `announcements.announcements_read`, `photos.photos_read`, `poll_options.poll_options_read`, `polls.polls_read`, `project_photos.project_photos_read`, `project_results.project_results_read`, `projects.projects_read`, `school_activities.school_activities_read`, `school_events.events_read`. Acrescentar `coordinator` a essa função entregaria ao coordenador a leitura de murais, fotos, enquetes, projetos, atividades e eventos — não só os aniversários. E a alternativa de mexer só na função (guardar por `is_approved() or bfr_is_schedule_manager()`, onde `bfr_is_schedule_manager()` = `developer, coordinator, director, secretary`) também é ampliação, porque sendo `SECURITY DEFINER` ela **fura a RLS**: entregaria a esses três papéis a data de nascimento dos 848 alunos, com nome e turma, por chamada anônima de política. É capacidade nova no servidor, e a casa não me autoriza a escolher isso pela escola.

**As três saídas, com o que cada uma custa (aguardando a sua escolha):** (a) alargar `is_approved()` → simples, mas dá leitura de 9 tabelas a mais; (b) dar ao painel de aniversários um predicado próprio (ex. `bfr_is_schedule_manager()`) → só aniversários, mas publica data de nascimento de aluno para coordenação/direção/secretaria; (c) deixar como está e registrar que a função existe para 7 papéis e não existe para 6 — hoje a Direção **não** vê aniversários nenhum, o que contradiz o painel que ela tem na tela. Nota de contexto: a família é a do `project_results`/`is_staff()` (item 32 de 13/10, em [[bfr-rls-delete-audit]]) e a do achado `project_photos`=32 que não chegava no par coordenador→AEE (item 25).

35.1 **OPÇÃO (b) PREPARADA EM 20/10 — candidata ensaiada nos seis braços, NADA APLICADO *(até o OK do item 35.2, que a aplicou)*.** O pedido foi
"prepara o código", então o entregável é o arquivo pronto com o ensaio corrido, não o banco mexido.

- **Aplicação:** `sql-item35b-predicado-aniversarios.sql` (3.049 caracteres, md5
  `22bbb49f51ce3fc4bf788b42be96b078`). Cria `public.bfr_can_view_student_birthdays()`
  (= `is_approved() OR public.current_role()::text in ('coordinator','director','secretary')`,
  `SECURITY DEFINER`, `SET search_path TO ''`, com `revoke … from public, anon` + `grant … to authenticated,
  service_role` porque o Supabase abre função nova a PUBLIC — veja o `proacl` vivo de
  `bfr_is_schedule_manager`: `{=X/postgres,postgres=X,authenticated=X,service_role=X}`) e reescreve
  `list_current_month_birthdays` trocando **só** o guard. Não toca `is_approved()` nem nenhuma das 9 policies.
- **Rollback:** `backup-item35b-list-current-month-birthdays.sql` — o `pg_get_functiondef` verbatim colhido
  por `dump-funcao-sql.mjs`. (O `corpo` impresso nos diários do `apply-sql.mjs` **não** serve de backup: o
  impressor amassa o espaço, e um rollback reconstruído a partir dele não é byte do original.)
- **Portão de fidelidade:** `diff-guard-35b.mjs` mede os corpos token a token com o espaço normalizado —
  56 × 56 tokens, 34 comuns à esquerda e 21 à direita, e o meio é exatamente
  `public.is_approved()` → `public.bfr_can_view_student_birthdays()`. Diário `diff-guard-35b.log`.
- **Ensaio (escreve nada):** `gera-ensaio-35b.mjs` embute o DDL **byte-idêntico** ao arquivo de aplicação
  (md5 conferido por braço, `porta-ddl *: IDÊNTICO`) dentro de `begin; … ; rollback;` com papel assumido e
  claim do JWT semeada. Duas tacadas por braço (`ensaio-35b-antes.log`, `ensaio-35b-depois.log`), só
  contagens, nenhum nome de aluno impresso:

  | braço | papel | `is_approved()` | antes (out/set) | `pode` depois | depois (out/set) |
  |---|---|---|---|---|---|
  | coord | `coordinator` (real) | false | **0 · 0** | true | **67 · 72** |
  | dir | `director` | false | **0 · 0** | true | **67 · 72** |
  | sec | `secretary` | false | **0 · 0** | true | **67 · 72** |
  | dev | `developer` | true | 67 · 72 | true | 67 · 72 (sem regressão) |
  | aluno | `student` | true | 67 · 72 | true | 67 · 72 (sem regressão) |
  | operador | `sports_operator` | false | 0 · 0 | **false** | **0 · 0** (controlo negativo) |

- **Prova de que nada persistiu:** depois dos rollback, o dump do `pg_get_functiondef` ao vivo é
  byte-idêntico ao backup (`diff` sem saída, `confere-pos-ensaio-35b.log`) e a função nova conta **0**.
- **O que a (b) NÃO resolve sozinha, e é do app:** `ensureBirthdays()` tem gate próprio no HTML do ar
  (`ar-v50-fetch-3.html:12079`): `role() === 'director'` e `role() === 'parent'` saem fora, e `coordinator`
  só corre com `activeSection === 'experiencias'`. Com o banco consertado, a Direção passa a ver aniversários
  na aba **Experiências → Aniversariantes** (`loadExperienceBirthdays :6565`, painel injetado em 8 views por
  `ensureExperienceViews :6576`, sem gate de papel) — mas continua sem o painel injetado. Fechar isso no
  `director` exige editar JS e publicar, e não está nesta candidata.
- **Instrumento de conferência já escrito e validado:** `sql-item35b-confere.sql` (um só `select`, porque o
  canal devolve só as linhas da última statement). Rodado **agora** contra o banco vivo
  (`sql-item35b-confere-ANTES.log`): `funcao_nova: 0 · guard_novo_pos: 0 · guard_antigo_pos: 827 ·
  policies_is_approved: 9 · policies_lista_nova: 0 · acl_funcao: postgres=X authenticated=X service_role=X`
  (sem `anon`, sem PUBLIC). Depois de aplicar, o mesmo ficheiro deve dar `1 · >0 · 0 · 9 · 0`; e a prova dos
  papéis é re-correr os seis `ensaio-35b-antes-*.sql` **sem** o DDL, que passam a medir o estado real.
- **Falta para fechar:** (1) o seu OK para o `--apply` deste ficheiro; (2) prova no ar com sessão real de
  coordenador/diretor, porque o ensaio mede o servidor, não a tela. **— os dois vieram: (1) no OK de
  20/10 ("Aplica a mudança da opção b") e (2) na passada de tela de `prova-tela-35b.mjs`, que está no item
  35.2 e abriu o item 36.**


35.2 **OPÇÃO (b) APLICADA EM 20/10 COM OK EXPLÍCITO — quatro camadas provadas (catálogo, banco vivo, HTTP do
app, tela). As três de dados fecham o item 35; a de tela mostra efeito zero no coordenador por causa
diferente, que vira item 36.**

- **Aplicação:** `node apply-sql.mjs sql-item35b-predicado-aniversarios.sql --apply` → `HTTP 201`
  (`sql-item35b-APLICA.log`). O ficheiro aplicado é o mesmo ensaiado: md5 `22bbb49f51ce3fc4bf788b42be96b078`,
  3.049 caracteres, e o portão `porta-ddl *: IDÊNTICO` do item 35.1 garante que o DDL dentro do `begin; … ;
  rollback;` era byte-idêntico ao que foi enviado.
- **Catálogo** (`sql-item35b-confere-DEPOIS.log`, um só `select`): `funcao_nova: 1 · guard_novo_pos: 619 ·
  guard_antigo_pos: 0 · policies_is_approved: 9 · policies_lista_nova: 0` e `acl_helper:
  postgres=X authenticated=X service_role=X` (sem `anon`, sem PUBLIC). As 9 policies de `is_approved()`
  seguem as mesmas 9 — é exatamente o que a (b) prometia: nenhum mural, foto, enquete, projeto, atividade ou
  evento mudou de leitor.
- **Banco vivo, 6 braços sem rollback** (`sql-item35b-NO-AR-6bracos.log`): coordenador/diretor/secretaria
  `67 · 72` · developer/aluno `67 · 72` (sem regressão) · `sports_operator` `0 · 0` (controlo negativo).
  Idênticos ao ensaio, agora como estado real.
- **Caminho do app** (`prova-app-35b.mjs` → `prova-app-35b.log`): `POST /rest/v1/rpc/list_current_month_birthdays`
  com JWT mintado de cada conta sintética → coordenador, developer e aluno `HTTP 200 · content-range: 0-66/67`;
  `sports_operator` `*/0`; e as duas funções chamadas **sem** sessão dão `401 · "code":"42501 permission denied
  for function"`. Nenhum nome de aluno foi lido nem impresso: `Prefer: count=exact` e só o `content-range` sai
  no diário (o `sonda-rpc-birthdays.mjs` antigo imprimia o corpo — não foi usado).
- **Rollback:** `backup-item35b-list-current-month-birthdays.sql` (`pg_get_functiondef` verbatim do estado
  anterior, colhido por `dump-funcao-sql.mjs`). Basta `node apply-sql.mjs backup-item35b-….sql --apply` para
  desfazer; a função auxiliar `bfr_can_view_student_birthdays()` ficaria órfã e o `drop` dela é a segunda
  linha do mesmo ficheiro de retorno, se a dona quiser o banco como estava.
- **Camada 4, a tela** (`prova-tela-35b.mjs`, 5 braços na URL publicada; bytes conferidos antes por md5 —
  `01055151d7eaa00ee9d8c69df18bb960`, 3.374.199 caracteres = o shell v50 do item 33 —, Chrome novo por braço,
  zero cliques, entrada só por `?role=…&open=…`; diário `prova-tela-35b-passada2.log` + `prova-tela-35b.json`):

  | braço | `view` | `sec` | `[data-bfr-birthdays]` | `total` | cartões | rondas |
  |---|---|---|---|---|---|---|
  | aluno/inicio | `student` | inicio | **1** (altura 0) | **67** | **72** | 2 |
  | coordenador/inicio | `coordinator` | inicio | **0** | — | — | 20 (~24 s) |
  | coordenador/experiencias | `coordinator` | **inicio** | 0 | — | — | a seção nunca chegou (58 tentativas / 70 s) |
  | developer/inicio | `admin` | inicio | **0** | — | — | 20 |
  | operador/inicio | `sports_operator` | inicio | **0** (1 painel de Experiências, aba `music`, 0 cartões) | — | — | 20 |

- **O braço do aluno é o controle positivo do instrumento**: a mesma função que a (b) abriu aparece no DOM com
  67 entradas, portanto a ausência nos outros quatro braços não é cegueira da sonda nem sessão morta
  (`login=false`, `shell=true`, `papel` lido do perfil em todos os braços).
- **Limites desta camada, registrados para não virar prova a mais do que é:** (i) `rede()` devolveu vazio
  porque o domínio Network está desligado por padrão no `cdp.mjs` (armadilha do rig) — a alegação "0 escritas"
  aqui é estrutural (nenhum clique, só `select`/RPC de leitura), não medida pelo instrumento; (ii) os 2 `erros`
  por braço são dois `404` de recurso, idênticos nos cinco braços e alheios a este item; (iii) o `total=67` do
  aluno foi lido num painel com **altura 0** — `[data-bfr-birthdays]` está na lista `FOREIGN_PANELS` (`:732`)
  do despejo de painéis, então "67 no DOM" não declara "67 visíveis na tela do aluno".
- **Estado do item 35:** **fechado no banco e na API** (causa confirmada, três papéis ampliados, dois controles
  sem regressão, anônimo recusado). **Aberto de novo como item 36 no app**, porque a superfície onde o
  coordenador veria os aniversários não é alcançável hoje.


36. **A SEÇÃO `experiencias` É INALCANÇÁVEL NOS 13 PAPÉIS — medida no app publicado, não por leitura de código.
Enquanto isso, o painel de aniversários não aparece para coordenador, developer, diretor nem operador.**

- **Causa:** `roleSectionAccess` (`ar-v50-fetch-3.html:8177-8192`) não lista `'experiencias'` em nenhum papel, e
  `navigateToSection` (`:9222-9227`) faz `if (!allowedSections.includes(section)) { syncActiveNavigation(
  allowedSections[0] || 'inicio'); persistNavigationState(…); return false; }` — cai no primeiro item da lista.
- **Medida ao vivo, não inferida:** `window.BFR_APP_RUNTIME.roleSectionAccess` é exposto (`:16057`), então a
  sonda leu o censo na própria página: `parent, student, teacher, coordinator, admin, director, monitor,
  gatekeeper, secretary, aee, psychology, multiprofessional, sports_operator` todos com
  `inclui('experiencias') = false`, nos 5 braços (`prova-tela-35b.json · acessoExperiencias`). `itensNavExp = 2`
  e `navExpVisivel = 0` — os dois `[data-section="experiencias"]` do documento existem mas estão ocultos na
  tela do papel.
- **Consequências, cada uma com a linha:** o painel compacto do coordenador exige `activeSection ===
  'experiencias'` (`:12079`) e nunca é injetado; a developer está em `adminView` e o laço de 1,2 s só chama
  `ensureBirthdays()` `if (!isAdminShell)` (`:12287`), então a view admin nunca recebe o painel; a aba
  Aniversariantes do painel de Experiências só renderiza com `slug === 'birthdays'` (`:6552-6558`), o que exige
  toque na aba — sem a seção, não há caminho. Os atalhos que apontam para `experiencias` (`:12755`, `:13167`,
  `:14690`, `:14902`) todos caem no mesmo `return false` do roteador.
- **O que isto muda no item 35:** a (b) tratava da causa no **banco** — abriu o direito de coordenador, diretor
  e secretaria, provado nas três camadas de dados. O **zero na tela** desses papéis tem causa diferente e mora
  no app. Nada publico: se `experiencias` entra nas listas de quais papéis, ou se o painel do coordenador passa
  a ser injetado em `coordenacao`/`inicio`, é decisão sua.
- **Porta de saída quando houver decisão:** candidata no `index.html` (a linha de `roleSectionAccess` do papel
  e, se preciso, o gate de `:12079`), A/B no harness com firewall de escrita — é lá que se clica na aba, não no
  ar — e só então publicação com bump de `CACHE` e prova na URL publicada. O mesmo protocolo dos itens 31 a 33.

36.1 **CANDIDATAS 36-A / 36-B / 36-C PREPARADAS E MEDIDAS NO RIG (21/10) — a superfície do coordenador e a da
Direção existem e enchem com 67 aniversários; NADA publicado, NADA aplicado no ar.**

A porta de saída do item 36 foi feita em três braços, cada um rejeitando o anterior por medida, não por
palpite. Todos partem dos bytes exatos do ar v50 (`index.html` md5 `01055151d7eaa00ee9d8c69df18bb960`,
3.374.199 caracteres), cada um com os quatro portões da casa (fonte == ar, âncora 1×, reversão byte a byte,
paridade de blocos `<script>`, contagem de marcas por classe).

* **36-A — só abrir o portão de papel: INJETAVA NADA, e foi preciso medir para descobri-lo.**
  `gera-candidata-item36-aniversarios-36a.mjs` tirava a conjunção `(role() === 'coordinator' && section !==
  'experiencias')` de `ensureBirthdays()` (`:12079`). O A/B/A no harness com a conta **real** do coordenador
  (`sonda-item36-aniversarios-ab.mjs`, braços 8280 → 8281 → 8280) deu `painel=false` nos três braços: ar
  estável e candidata igual. O `diag-item36-modulo.mjs` mostrou por quê: o módulo
  `bfr-product-enhancements` está vivo (`SCRIPT`, não `text/plain`), `currentProfile.role='coordinator'`, a
  view visível é `coordinatorView` — mas `ancora_coordinator=false` e `birthdays no documento: []`. A causa
  **não era o portão**: a âncora do coordenador é escolhida por seleção direta
  (`? view.querySelector('[data-bfr-coordination-command]')`, `:12082`) e esse nó só nasce no módulo
  `bfr-coordination-dashboard-v3`, que está `data-bfr-auth-deferred-disabled` (morto — família do
  [[bfr-dead-deferred-modules]]). O `.coordinator-welcome` da tela só é consultado no ramo **inverso** do
  ternário. `if (!anchor) return;` (`:12084`) saía em silêncio. Diário: `bfr-candidata-item36-aniversarios-36a.json`.
* **36-B — H1 portão + H2 âncora + H3 guard do painel de direção + H4 marca de revelação.**
  H2 mantém a seleção original e acrescenta o hospedeiro real (`[data-coordination-central]`, `:14591`) como
  alternativa; H3 limpa a autocontradição `role() === 'director' || !['developer','director'].includes(role())`
  de `:12268` (para `director` a 1ª cláusula sempre era verdadeira ⇒ o guard nunca deixava o diretor construir;
  para `developer` as duas eram falsas ⇒ só ele passava); H4 põe `data-exec-revealed="true"` na raiz do
  `#bfrDirectionPanel`, seguindo o precedente da casa (`:9307` documenta a medição 9375 e `:9308` aplica
  `painel.dataset.execRevealed`). Saída: `01055151` → `740dd4e0`, Δ −4 caracteres, portão 2 `true`, portão 3
  paridade `true`, 24 marcas conferidas.
  **Medida no coordenador (@1024, `sonda-item36-36b-ab.json` + `diag-item36-vertodos-cand-b.json`):** ar
  `painel=false/false/itens=null` nos dois braços de ar (estável), candidata `painel=true`, compacto **visível**
  com 3 `li` (`Hoje:0 · Próximos:3`), "Ver todos" troca pelo completo e o completo vem **cheio**:
  `total=67`, `pessoas=67`, `semanas=5`, filtros `Todos/Alunos/Professores/Equipe` e busca. Escritas: **zero**,
  com as duas únicas chamadas non-GET sendo as RPCs nomeadas `list_current_month_birthdays` e
  `bfr_list_staff_birthdays`. **A 36-B NÃO abriu a Direção** — medida nos dois braços
  (`sonda-item36-36b-diretor.json`, primeira passada): o painel de aniversários nasce em `#directorView` já
  populado (`total=67`, `pessoas=67`, 3.826 caracteres) e **não** é removido pelo `trimDirectorExtras`
  (`ainda_birthdays=1` — o que a 36-A afirmava estar errado), mas o overlay executivo (`:26173`) marca-o com
  `.bfr-exec-legacy-hidden` e ele sai `disp:"none"`, `ocultoPor=["bfr-enhancement-panel[display:none][exec-legacy-hidden]"]`.
  O H4 só salvava a raiz do painel de direção; o nó de aniversários é outro.
* **36-C — H5a/H5b: a mesma marca no painel de aniversários, completo e compacto.**
  `gera-candidata-item36-aniversarios-36c.mjs`; saída `01055151` → `3c5587d3`, 3.374.247 caracteres (Δ +48),
  reversão byte a byte `true`, paridade `true`, 27 marcas nos quatro portões (as duas formas antigas morrem
  `1→0`, as duas novas nascem `0→1`, tudo o publicado mantém o número do ar).
  **Medida na Direção (@1024, persona `?role=director`, conta real do developer):** ar `visivel=false`,
  `disp:"none"`, `ocultoPor=[…exec-legacy-hidden…]` → candidata `visivel=true`, `disp:"block"`, `alt=6169`,
  **`ocultoPor=[]`**, `total=67`, `pessoas=67`, texto visível da view de 5.219 → 9.491 caracteres. Zero escritas.
  **Regressão do coordenador na 36-C** (`diag-item36-36c-coord.json`, harness 8290 com a sessão do coordenador):
  idêntica à 36-B — `li=3` compacto visível, `ver-todos` → `total=67 pessoas=67 semanas=5`, formulário presente.
  O atributo é inerte fora de `#directorView` porque o único leitor de `[data-exec-revealed]` é o seletor do
  overlay, que só corre `if (target.id === 'directorView')`.
* **Três armadilhas de instrumento abertas nesta passada (valem para qualquer painel alimentado por RPC):**
  (1) **o firewall rígido da casa barra a leitura que se quer medir** — o PostgREST executa RPC como
  `POST /rest/v1/rpc/<nome>` e `firewall-audit.mjs` recusa todo non-GET, pelo que todo painel de RPC nasce com
  o texto de vazio e "itens=0" passa a significar "o teste barrou a leitura", indistinguível de "a autorização
  devolve zero linhas". Viveiro novo: `firewall-leitura.mjs` abre **uma lista nominal** de RPCs e registra cada
  passe em `window.__FW_leitura`; com ele a superfície encheu. (2) **`vis()` da casa é falso-negativo em
  `position:fixed`** — decide por `offsetParent!==null`, que é `null` em fixo: o `preferredNameModal` era dado
  por fechado (`aberto:false`) enquanto cobria a tela toda e contaminava todo `elementFromPoint`. A remoção do
  modal é limpeza de rig, não conserto (o skip persistente é o item #1, publicado no v45). (3) **crase dentro
  do template `LER` passa no `node --check` e rebenta em runtime** — `// comentário com \`backtick\`` termina a
  template string e o texto vira código (`ReferenceError`). O portão que pega é compilar o corpo:
  `new Function(m[1])` sobre o trecho entre as crases.
* **Onde a superfície fica, medido e não escondido.** A 36-B/C injeta no coordenador dentro de
  `.bfr-coord-shelf > .bfr-coord-shelf-body`: a 1024 a prateleira vem expandida (`display:grid`,
  `aria-expanded=true`) e o painel está a 2.800 px do topo de uma `MAIN` de 3.699 px — alcançável com rolagem.
  A 390 a prateleira vem **colapsada** (`display:none`, botão `+` com `aria-expanded=false`) e fica no fim de
  uma `#coordinatorView` de **45.483 px** (o vazamento de DOM pré-existente da seção D): a superfície existe,
  mas exige abrir a prateleira e rolar dezena de milhar de pixels. O painel completo do "Ver todos" tem
  6.235 px de altura e traz `data-bfr-staff-birthday-form` (13 opções de equipe + placeholder): abrir o portão
  também expõe um caminho de **escrita** que hoje é inalcançável no papel — decisão de produto, não meu palpite.
* **Limite honesto.** Não existe conta sintética de diretor nem de secretário (só `developer`, `student`,
  `coordinator`, `sports_operator`), e `?role=` chama `rt.setRole` (`:9079`) que troca `activeView` sem tocar
  em `currentProfile.role` (`:9080`) — `role()` no módulo lê o papel **real** da conta. Portanto o ramo
  literal `role()==='director' ? directorView : adminView` (`:12270`) continua provado por código e pela regra
  do overlay, **não por toque**; o que foi tocado é a metade que decide a visibilidade (injeção, população,
  overlay) com a persona do diretor montada sobre a conta do developer. A autorização SQL/HTTP do diretor e da
  secretaria já está provada nas camadas de dados (item 35.2).
* **Estado: as três candidatas existem em disco e nada foi publicado.** O ar segue `01055151` (v50, deploy
  `a73bb0bc`). Antes de qualquer v51 precisa da sua decisão sobre: (i) publicar a 36-C (coordenador **e**
  Direção com superfície visível), (ii) se a 36-C isolada chega — a 390 o painel fica atrás da prateleira
  colapsada e da rolagem de 45.483 px, (iii) o formulário de escrita de aniversário de equipe passar a ser
  alcançável pelo coordenador, (iv) os 6.169 px do mês completo dentro da view executiva, (v) a secretária,
  que não é tocada por nenhuma das três (âncora própria inexistente, `:12083`/`#secretaryView` vazio em `:3002`).

### 36.2 — decisão tomada e o bloqueio que apareceu na hora de publicar (21/10, 04:44Z)

> **⚠ CORRIGIDO em 36.6 — este item está inteiro errado e a culpa é do instrumento.** O hostname usado em
> todas as sondas daqui — `turmarobiticabfr.workers.dev`, com um `i` na posição 8 onde a API devolve `o`
> (16 caracteres nos dois lados, diferença de **um** só, medida por `confere-grafia-hostname.mjs`) — **não é** o
> hostname do app. O certo é `turmaroboticabfr.workers.dev` — lido da própria API (`/workers/subdomain`), da CSP embutida no HTML implantado e do
> diário `prova-tela-35b.json`. Um `getaddrinfo` de nome inexistente devolve NXDOMAIN **para sempre**, o que
> produziu a ilação de "queda de conta inteira". **O app nunca esteve fora do ar e nenhuma definição de conta
> foi tocada.** O texto abaixo fica como registro da medição mal orientada, não como fato.

A dona decidiu: **publicar a 36-C como v51**, com o `data-bfr-staff-birthday-form` **deixado exposto** (o caminho
de escrita já existe no papel, só estava inalcançável). A publicação **não foi feita** e o motivo é anterior ao
deploy — é um incidente de produção, medido assim:

* O hostname publicado `bfr-conecta.turmarobiticabfr.workers.dev` devolve **NXDOMAIN**: `8.8.8.8` duas vezes
  (`Status 3`, 04:44Z e 04:44Z+8 s), `1.1.1.1` por DoH (`Status 3`), `nslookup` no sistema apontado ao Google
  (`Non-existent domain`). Os três vieram do authority SOA de `workers.dev` (`clyde.ns.cloudflare.com`), não de
  cache local; sem entrada hostil em `drivers/etc/hosts`. `curl` direto: `code=000`, exit 6.
* **É conta inteira, não o script:** os 6 workers listados por API (`bfr-app`, `bfr-conecta`, `bfr-conecta-aee`,
  `bfr-conecta-novo`, `bfr-conecta-teacher-scope`, `bfr-library-media`) estão **todos** NXDOMAIN.
* A conta e o script continuam vivos pelo lado da API: `GET /accounts/…/workers/subdomain` →
  `{"subdomain":"turmarobiticabfr"}` (200); `GET …/workers/scripts/bfr-conecta/settings` → 200;
  `wrangler deployments list` → último deploy `a73bb0bc-87a7-4958-b17b-f51b331731fb`, criado 2026-10-20T06:26:31Z
  (= v50). `routes: []`, `custom_domains: []`, sem rota própria — o único ponto de entrada do app **é** o
  preview `workers.dev`, hoje sem registro.
* Era vivo há 3 h 42: o diário `prova-tela-35b.json` (`em: 2026-10-21T01:02:31Z`) mediu na URL publicada com
  `base: https://bfr-conecta.turmarobiticabfr.workers.dev`. Então o registro caiu entre 01:02Z e 04:44Z de 21/10.
* Não confundir as duas coisas: **o `~/.cf-token` expirou** (`10000 Authentication error` no probe) e quem está
  servindo é o grant OAuth do wrangler (`deploy-worker.js --check` ✅). Isso afeta a *credencial*, não a DNS.

**Por que eu não publiquei mesmo assim.** O procedimento da casa exige conferir o md5 do ar **antes e depois**
do deploy; com o hostname sem resolução não existe "antes" nem "depois" — eu publicaria às cegas dentro de uma
queda, e um `wrangler deploy` bem-sucedido não provaria nada para a dona. Segundo: se a causa é o preview URL
desabilitado na conta, publicar não conserta nada; o conserto é de painel/conta, e é decisão dela.

**Candidata pronta para quando o hostname voltar.** `bfr-candidata-item36-aniversarios-36c/` é o caminho cirúrgico
já verificado: é o ar `01055151` + exatamente os 6 hunks, com os demais arquivos copiados byte a byte da fonte
do v50 — importante porque `bfr-conecta-patched/` **não** é o ar (`index.html` = `3a5c99e0…`, carrega backlog não
publicado) e `build-worker-bundle.js:4` tem `SRC` fixado no patched, então `node deploy-worker.js` **do jeito que
está** publicaria o patched, não a candidata. O `worker-deploy/worker.mjs` hoje embute HTML `68e8d79f…` (stale),
o que confirma que a única fonte confiável é a candidata.
### 36.3 — A 36-C foi publicada como v51 pelo canal sem DNS (21/10, 05:00Z)

O bloqueio do item 36.2 não se levantou, então a publicação **foi feita trocando o portão**, não pulando-o: o
"md5 do ar antes/depois", que a casa mede por HTTP, passou a ser medido **pela API** — `curl` em
`GET /accounts/…/workers/scripts/bfr-conecta` (multipart de 7.446.987 bytes) → `worker.js.map` →
`sourcesContent[0]` = o `worker.mjs` que subiu no deploy, de onde se desce o literal `const HTML = "…"`. Prova
de que o instrumento mede mesmo o ar: **re-construí o bundle do v50 a partir dos bytes extraídos e ele bate
byte a byte com a fonte implantada** (`f98977f1…`, 3.449.421 chars, 27 linhas, mesmas rotas) — o `115d2609…` que
eu tinha anotado antes era o md5 da mesma fonte lida como latin1, sem o de-escopo `latin1→utf8`.

* **"Antes"**: HTML do ar `01055151d7eaa00ee9d8c69df18bb960` (3.374.199 chars / 3.391.514 bytes) e SW
  `8ba3036d…` com `const CACHE = 'bfr-conecta-v50';`. Conferido em 21/10 ~04:52Z, minutos antes do deploy.
* **Fonte do deploy**: `bfr-item36c-deploy-v51/` = a candidata medida `bfr-candidata-item36-aniversarios-36c/`
  (13 arquivos, `index.html` = `3c5587d3…`) **+ `sw-v4.js`**. A candidata não tinha `sw-v4.js` (o gerador só
  escreve HTML), e o `sw-v4.js` do `bfr-conecta-patched/` está **atrás do ar**: é `efc75162…` com
  `CACHE='bfr-conecta-v39'` e `?v=12` no PRECACHE. Publicar por ele teria rebaixado o service worker. O SW do
  v51 é o do ar com **uma** linha alterada (`diff` = só o literal `CACHE`), md5 `698888dc…`.
* **O portão de que os 12 assets não mudam** veio de duas direções: os 12 md5s do `public/` batendo com os da
  candidata/patched/fonte do v50, e o próprio wrangler — `No updated asset files to upload`, ou seja, a conta já
  tinha aqueles bytes.
* **Deploy**: `build-worker-bundle-cand.js` (variante com `SRC`/`OUT` por argv, porque `build-worker-bundle.js:4`
  tem `SRC` fixado no patched — item 36.2) → `worker-deploy-v51/` → `wrangler deploy`. Version
  `f1eb0bae-df09-4670-a441-9bcf3303c2b3`, criada **2026-10-21T05:00:53.767Z**; anterior `a73bb0bc-…`
  (2026-10-20T06:26:31Z = v50). Login pelo grant OAuth do wrangler (`turmarobiticabfr@gmail.com`,
  `workers_scripts (write)`); o `~/.cf-token` continua expirado e não foi usado.
* **"Depois"**, pela API: HTML **`3c5587d394b3b371565fac7d079429ba`** (3.374.247 chars / 3.391.562 bytes,
  Δ+48 como medido na candidata), SW `698888dc…` com `CACHE = 'bfr-conecta-v51'`. Os 6 hunks conferidos no HTML
  que está no ar: o portão `role() === 'coordinator' && section !== 'experiencias'` **ausente**, o guard
  autocoordenado `role() === 'director' || !['developer','director']` **ausente**, 3× `data-exec-revealed="true"`.
  Diário: `ar-implantado-v51.json`; instrumento: `confere-implantado.mjs` (lê `oauth_token` do config do wrangler,
  entrega o header a um `curl -H @arquivo` temporário e apaga o arquivo — nada de credencial na linha de comando).

**O que o v51 ainda NÃO tem: prova de navegador na URL publicada.** *(este parágrafo foi desmentido em 36.6 —
o hostname sempre esteve no ar; a grafia da sonda é que não era a do app)*
`bfr-conecta.turmarobiticabfr.workers.dev`
continua **NXDOMAIN** (re-sonda às 05:0xZ: DoH `Status 3`, `curl` `code=000` / "Could not resolve host") — o
incidente do item 36.2 e da tarefa #169 está aberto e é de conta, não do script. Portanto a re-medida do
coordenador e da persona do diretor na tela (item 36.1media: painel `visivel=true`, `disp=block`, altura 6.169 px
no harness) **está pendente do hostname voltar**; o que está provado agora é que os bytes certos estão implantados.

**Reversão**, se a dona quiser: o bundle do v50 está intacto em `worker-deploy/` (exceto o `worker.mjs` stale
`68e8d79f…` anotado em 36.2) e os bytes exatos do ar anterior em `ar-implantado-v50.html` / `ar-implantado-v50.js`;
`node build-worker-bundle-cand.js bfr-reproducao-v50 <OUT> && wrangler deploy` reproduz o v50 (md5 do bundle já
conferido acima).
### 36.4 — Diagnóstico fechado do incidente: não é DNS, é provisionamento do hostname (21/10, ~05:2xZ)

> **⚠ CORRIGIDO em 36.6.** Todo este item é o diagnóstico detalhado de um hostname que **não existe**: a sonda
> de TLS pino, o `/zones → []` e o `audit_logs → 403` foram todos gastos contra `turmarobiticabfr…`, e a
> conclusão "o edge não serve o nome" é verdadeira **para esse nome**. O app, no nome certo, responde HTTP 200
> em 0,85 s com certificado `CN=turmaroboticabfr.workers.dev` nos três IPs de edge. Continua válido e eu não
> retiro: o `PATCH {"wildcard_host": true}` **não foi executado** e nenhuma definição de conta foi tocada.

Depois do v51 eu tentei **todos** os caminhos que ainda eram só-leitura. Os dois novos instrumentos mudam a
conclusão do item 36.2 — e fecham a porta que eu ainda não tinha fechado: dá para provar que o hostname não é
servido **nem pelo edge**, então não existe gambito de resolver o nome localmente.

* **Sonda de TLS contra o IP do edge** (`--resolve` / `tls.connect` com `servername`, IPs anycast
  `104.16.2.189`, `104.19.193.29`, `162.159.140.220`): `bfr-conecta.turmarobiticabfr.workers.dev` morre no
  handshake — `ERR_SSL/TLS_ALERT_HANDSHAKE_FAILURE` no OpenSSL do Node e `SEC_E_ILLEGAL_MESSAGE` no schannel do
  `curl`. **Controle positivo do instrumento:** o mesmo truque com um hostname vivo pinado a um IP de edge
  estrangeiro (`speed.cloudflare.com` → `104.19.193.29`) completa o TLS e devolve **HTTP 403** — ou seja, o
  método funciona e o que falta é o outro lado aceitar o SNI. Significado: o edge não tem certificado nem
  virtual host para aquele hostname. Não é propagação de zona, não é o nosso resolvedor, não é a rede da casa —
  e por isto **`hosts`/`--host-resolver-rules` não reanimam o app**, nem para a passada de navegador.
* **Não existe caminho alternativo de hostname:** `GET /zones?account.id=37f5c136…` → **`[]`** (a conta não tem
  zona), `GET /accounts/…/registrar/domains` → 403 (o grant do wrangler não tem esse escopo) e
  `GET /accounts/…/workers/bfr-conecta/routes` → `10404 No route for that URI`. Com `routes: []` e
  `custom_domains: []` medidos antes, sobra **um único** ponto de entrada: o wildcard da conta.
* **Quem virou a chave não é recuperável por mim:** `GET /accounts/…/audit_logs` (com e sem `direction=desc`) →
  **403 `10000 Authentication error`** — o grant OAuth do wrangler tem `workers_scripts (write)` mas não lê o
  audit log (e o endpoint é de plano superior). Diário: `audit-log-conta.json` (as duas tentativas falhas) e
  `zones-conta.json`.
* **A causa mais provável continua a ser a mesma de 36.2:** `wildcard_host:false` em
  `GET /accounts/…/workers/settings` — re-lido **depois** do deploy, continua `false` com
  `enabled/multiscript/free_tier` true. A página de status da Cloudflare não lista incidente de
  Workers/workers.dev/DNS nas últimas 24 h, o que descarta a hipótese "queda deles".

**O que eu NÃO fiz, e por quê.** `PATCH /accounts/…/workers/settings {"wildcard_host": true}` é a ação que
devolve o app ao ar, e está a uma chamada de distância do grant que já usa. Não executei: é **escrita numa
definição de conta**, que **reexpõe publicamente os 6 workers** da conta (`bfr-app`, `bfr-conecta`,
`bfr-conecta-aee`, `bfr-conecta-novo`, `bfr-conecta-teacher-scope`, `bfr-library-media`), e eu não consigo
atribuir quem desligou aquilo — se foi a dona escondendo o app durante a auditoria, ligar de volta desfaz uma
intenção dela; se foi a Cloudflare por política, re-ligar por API é discutir com a conta. O OK que eu tinha era
de publicação de bytes, não de superfície pública. Se a palavra for «liga o wildcard», é uma chamada e eu re-sondo
DoH + HTTP na sequência.

**Transferência de prova (o que ainda vale sem o navegador).** Os bytes do `/` implantado são **byte-idênticos**
aos que o harness serviu na medida da 36-C (`3c5587d3…`), então as medições de tela daquele item — painel do
coordenador `li=3 total=67 pessoas=67 semanas=5`, persona do diretor `visivel=true disp=block alt=6169`,
`escritas=0` — **sobre os mesmos bytes do v51**. O que falta e não é substituível é o comportamento **na origem
publicada**: CSP real, registro do `sw-v4.js` num cliente que já tem o cache v50, e o CORS do Supabase por origem.
Isso fica com a tarefa #169.


### 36.5 — varredura dos 6 workers da conta (21/10, 05:20Z)

A pedido da dona, medi o estado dos **seis** workers por dois canais independentes na mesma passada.
Instrumento: `estado-6-workers.mjs` → diário `estado-6-workers.json`, carimbado `em: 2026-10-21T05:20:12Z`.
Canal (a) API: listagem + `settings` + `deployments` + `versions` por script. Canal (b) borda: consulta DoH
`type=A` para `{nome}.turmarobiticabfr.workers.dev` e handshake TLS pinado aos três IPs de edge de 36.4 com
`servername` no SNI.

> **⚠ As duas colunas de borda desta tabela medem `Status 3` / `falha ×3` para um nome que não existe** — a
> string do subdomínio veio do erro de grafia de 36.2, reproduzido aqui sem re-ler o `/workers/subdomain` que a
> própria linha de cima tinha acabado de consultar. O canal (a) API está correto e vale: os 6 scripts estão
> vivos, com as implantações e bindings que seguem. Ver 36.6.

| script | modificado em | criado em | API (settings/deployments/versions) | DoH A | TLS nos 3 IPs |
|---|---|---|---|---|---|
| `bfr-app` | 2026-09-21T06:52:40Z | 2026-09-20T08:05:51Z | 200 / 200 / 200 | `Status 3` | falha ×3 |
| `bfr-conecta` | **2026-10-21T05:00:58Z** | 2026-09-19T20:18:39Z | 200 / 200 / 200 | `Status 3` | falha ×3 |
| `bfr-conecta-aee` | 2026-09-25T05:28:37Z | 2026-09-11T13:47:08Z | 200 / 200 / 200 | `Status 3` | falha ×3 |
| `bfr-conecta-novo` | 2026-09-20T07:57:27Z | 2026-09-20T06:58:03Z | 200 / 200 / 200 | `Status 3` | falha ×3 |
| `bfr-conecta-teacher-scope` | 2026-09-20T07:45:44Z | 2026-09-20T07:45:36Z | 200 / 200 / 200 | `Status 3` | falha ×3 |
| `bfr-library-media` | 2026-09-21T03:36:41Z | 2026-09-20T21:59:46Z | 200 / 200 / 200 | `Status 3` | falha ×3 |

* **Nenhum dos seis está acessível** — e nenhum está *morto*: os seis respondem 200 na API com código e
  implantações intactos, e os seis falham idêntico no mesmo ponto (SNI recusado no edge). Cinco deles não são
  tocados há ~30 dias (`modificado_em` entre 20/09 e 25/09), ou seja, **não é o deploy do v51 que quebrou os
  outros** — a queda é anterior e é comum, o que reforça 36.4: um único flag de conta (`wildcard_host:false`,
  re-lido às 05:04Z continua `false` com `enabled/multiscript/free_tier` true) serve os seis hostnames.
* **O v51 está firmemente no ar do lado do script.** A cadeia de `bfr-conecta` tem 10 implantações e a de topo é
  `a5d81cf4-5dd5-4404-8e1e-9a57e84918be`, `source: wrangler`, criada `2026-10-21T05:00:53.767842Z`, com a versão
  `f1eb0bae` a **100%**; a anterior é `36ebcdb8` → `a73bb0bc` (v50, 20/10 06:26:31Z). `modificado_em` do script
  (`05:00:58.43Z`) bate com o deploy. Nada ficou em rollout parcial.
* **Assinatura do `bfr-conecta` distingue-o dos outros cinco:** `bindings: [{"name":"ASSETS","type":"assets"}]`,
  `compatibility_date: 2026-10-11`, flags `["nodejs_compat"]`, `triggered_by: version_upload` — é o único worker
  com assets, como o bundle da casa emite. Os cinco restantes têm `bindings: []` e `triggered_by: upload` (dash),
  exceto `bfr-conecta-novo` que é `quick_editor` e tem `observability.enabled: true` com amostragem 1.
* `versions` devolve **HTTP 200 com `result: null`** nos seis: o `/deployments` já traz a cadeia, então não é
  contradição nem evidência de exclusão — só o formato dessa rota para plano *free*. Não conto como falha.
* Consequência prática para #169: reativar o hostname é **uma** decisão com **um** efeito sobre os seis — volta o
  app e, junto, voltam à superfície pública `bfr-app`, `bfr-conecta-aee`, `bfr-conecta-novo`,
  `bfr-conecta-teacher-scope` e `bfr-library-media`, que hoje ninguém alcança. Se a dona quiser o app de volta sem
  reexpor os outros cinco, o caminho é o painel dela (wildcard é por conta, não por script) ou uma zona/rotas que
  a conta não tem (36.4).

### 36.6 — O "incidente de conta inteira" era a grafia do meu probe: o app nunca esteve fora do ar (21/10, ~05:4xZ)

A dívida que eu tinha aberto em 36.2/36.4 era um erro de instrumento, e ela é minha. Ao conferir a CSP do HTML
implantado para o item 36, reparei que o hostname escrito dentro de `script-src`/`connect-src` não era o hostname
que eu vinha sondando. Comparei os dois **programaticamente** (`confere-grafia-hostname.mjs`) em vez de por olho:

| fonte | hostname lido | caracteres |
|---|---|---|
| API `GET /accounts/…/workers/subdomain` (36.2, lido e **não usado**) | `turmaroboticabfr` | 16 |
| CSP `<meta>` do HTML implantado (offset 169) | `bfr-conecta.turmaroboticabfr.workers.dev` | — |
| diário `prova-tela-35b.json` (campo `base`) | `https://bfr-conecta.turmaroboticabfr.workers.dev` | — |
| **todas as minhas sondas de 36.2 / 36.4 / 36.5** | `turmarobiti**c**abfr` | 16 |

Diferença de **um** caractere, na posição 8 (`o` → `i`), mesmo comprimento. Não é DNS, não é propagação, não é a
Cloudflare: um `getaddrinfo` de um nome que nunca existiu devolve `NXDOMAIN` em qualquer resolvedor e o TLS pino
morre no handshake porque **aquele SNI** não está no certificado de ninguém. O controle positivo que citei em 36.4
(`speed.cloudflare.com` no mesmo IP) provava que o método funcionava — e eu não vi que o sujeito da frase era
errado. Re-sonda com o nome certo (`re-sonda-hostname.mjs` → `re-sonda-hostname.json`, `em 2026-10-21T05:45:59Z`):

* DoH `type=A` → **`Status 0`** com `104.21.48.29`, `172.67.176.37`; `nslookup` do sistema bate igual.
* TLS pinado aos três IPs de edge de 36.4 → **`ok:true` nos três**, `CN=turmaroboticabfr.workers.dev`.
* `GET /` → **HTTP 200 em 0,847712 s**. O app está no ar desde sempre; a janela "caiu entre 01:02Z e 04:44Z" de
  36.2 **não existe**.

**Consequências que se apagam sozinhas.** (i) `wildcard_host:false` **não** é a causa nem um portão: re-lido
depois do v51 continua `false` e os hostnames servem — a chave que eu suspeitava ter sido virada contra a conta
não controla estes nomes, e **ninguém virou nada**. (ii) A discussão de 36.4/36.5 ("ligar o wildcard reexpõe os
6 workers") perdeu o objeto: não há o que ligar.Continua válido, e eu continuo sem tocar: o `PATCH
{"wildcard_host": true}` **nunca foi executado** por mim, em nenhum momento. (iii) As rotas alternativas que eu
declarei inexistentes (zona, domínios, audit log) são verdadeiras como leitura de API, mas eram irrelevantes — o
único ponto de entrada do app **estava funcionando**. (iv) A tarefa #169 deixa de ser incidente e passa a ser
registro de armadilha.

**E o que eu tinha dito que não era substituível sem a origem publicada, agora é medido nela.** O portão de
antes/depois foi pago por HTTP real (`confere-origem-certa-v51.mjs` → `confere-origem-certa-v51.json`):

* `GET /` → 200 em 0,502928 s, `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=0,
  must-revalidate`, corpo **md5 `3c5587d394b3b371565fac7d079429ba`** / 3.374.247 chars / 3.391.562 bytes =
  **byte-idêntico à candidata 36-C**. Sem cabeçalho de CSP; a CSP é a `<meta>` do documento (lida no DOM vivo
  também, com as 12 diretivas e a origem publicada dentro).
* `GET /sw-v4.js` → 200 em 0,154737 s, md5 `698888dc16d6e4c425f6cce6150c0e2c`, 3.582 chars, primeira linha
  `const CACHE = 'bfr-conecta-v51';`, `cache-control: no-cache`.
* **CORS do Supabase não trava nada:** preflight `OPTIONS` em `rpc/bfr_list_staff_birthdays`,
  `rpc/list_current_month_birthdays` e `auth/v1/token`, cada um com três `Origin` (a publicada, a minha antiga
  grafia errada e `null`) → **200 com `access-control-allow-origin: *`** nos nove, sem
  `allow-credentials`. *Confesso aqui um second-order do mesmo erro: o diário anterior
  (`confere-csp-cors-v51.json`) rodou os preflights com o `Origin` **errado** — o `*` vale também para o certo,
  e é o deste item que fica como prova.*
* **Service worker registrado no navegador real** (`sw-e-csp-no-navegador-v51.mjs` →
  `sw-e-csp-no-navegador-v51.json`): `escopo https://bfr-conecta.turmaroboticabfr.workers.dev/`, script ativo
  `/sw-v4.js?v=45`, `estado: activated`, `navigator.serviceWorker.controller` apontando para ele e
  **`caches.keys() = ["bfr-conecta-v51"]`** — um único cache, o do v51. Limite honesto: o perfil é novo a cada
  execução (`mkdtemp`), então isto prova o cliente do zero, **não** o upgrade de um cliente que já tinha o cache
  `bfr-conecta-v50`; esse caso fica por medir.

**Armadiçanha nova (armadilha 143).** `ligarChrome({cabeca:true})` monta `--headless=new`
e **não** passa `--window-size` — o argumento só entra no ramo `cabeca:false`. Todo braço que não chama
`p.viewport()` antes do `navigate` roda a **762×484**, não na largura do roteiro, e 762 cai do lado errado do
único `matchMedia` que importa para a Coordenação (`shelfWanted = innerWidth>800`, `:736`). É isto que estava por
trás de `paineisVisiveis=0` nos braços ditos "1280" de `prova-tela-v51.mjs` — ver 36.7.

### 36.7 — O item 36 medido no navegador, na origem publicada: a superfície existe, mas nasce COLAPSADA (21/10, ~05:5xZ)

Com o hostname certo (36.6) a passada que estava em #169/#172 ficou possível. Instrumento:
`prova-tela-v51.mjs` → `prova-tela-v51.json` + diário de console `harness-9361-v51-live.log`; Chrome novo por
braço (profile `mkdtemp`), bootstrap de sessão real semeado antes do `navigate`, gate de `nonce`, **zero cliques**
(`?role=&open=` aplicados pelo próprio app). Seis braços:

| braço | papel / seção | painel `[data-bfr-birthdays]` | marcas `data-exec-revealed` | `li` | colunas |
|---|---|---|---|---|---|
| aluno/inicio | `student` / `inicio` | 1, `disp:none`, alt 0, `total=67`, cartões 67 | **1** | 0 | — |
| coordenador/coordenacao | `coordinator` / `coordenacao` | 1, `disp:block`, alt 0 | **1** | **3** | `Hoje:0 · Próximos:3` |
| coordenador/coordenacao@390 | idem, 390 emulado | 1, `disp:block`, alt 0 | **1** | **3** | `Hoje:0 · Próximos:3` |
| coordenador/inicio | `coordinator` / `inicio` | 1, `disp:block`, alt 0 | **1** | **3** | `Hoje:0 · Próximos:3` |
| developer/inicio | `developer` (view `admin`) / `inicio` | **0** | **0** | — | — |
| operador/inicio | `sports_operator` / `inicio` | **0** | **0** | — | — |

O que já fica **provado no ar**, e não só no harness: a injeção do v51 acontece na origem publicada, o painel
chega populado por RPC (`li=3`, `Hoje:0 · Próximos:3`, hoje = nenhum aniversário no dia), a âncora
`[data-coordination-central]` e as marcas `data-exec-revealed="true"` existem no DOM vivo (1 por view onde o
painel existe, 0 no developer e no operador — o hunk não vaza para quem não deve), `escondidasPeloOverlay=0` em
todos os braços e `acessoExperiencias=false` nos **13** papéis lidos de `BFR_APP_RUNTIME.roleSectionAccess`
(o item 36 fecha o `experiencias` por removê-lo do gate, não por abri-lo — nada neste build libera a rota).
**Limites honestos:** (i) os seis braços devolveram `rede_gravacao=[]`; com a armadilha 99 isso **não** prova
"zero escritas", prova que o sensor de rede não colheu nada naquele alvo — a única contagem de escrita que vale
é a das passadas locais com `firewall-leitura.mjs` (36.1); (ii) o `disp:none` do painel do aluno é do **próprio**
nó, não de ancestral, e pertence ao território do item 35(b), não ao 36.

**Mas `paineisVisiveis=0` em todos os braços do coordenador — e aí havia duas causas sobrepostas, uma do rig e
outra do app.** Separei-as com `causa-altura-zero-aniversarios-v51.mjs` (duas subidas, uma sem emulação, outra
com `Emulation.setDeviceMetricsOverride` antes do `navigate`) e `confere-colapso-aniversarios-v51.mjs` (portão
de assentamento **nas linhas**, porque a primeira rodada já mostra as duas colunas com o nó "-vazio" e é
justamente esse instante que o motor de colapso usa para decidir):

* **Causa de rig (armadilha 143 de 36.6):** sem `p.viewport()`, o braço dito "1280"/bootou a
  **`innerWidth = 762`**. A 762 a prateleira `.bfr-coord-shelf` nasce fechada por decisão do app
  (`shelfWanted = innerWidth>800`, `:736`) → `data-open:"false"` → `display:none` no corpo → **5 painéis**
  escondidos (Horários, Conversas com responsáveis, Visão agregada, **Aniversariantes**, Leitura dos alunos),
  `contagem=5`, botão `+`/`aria-expanded=false`. Ou seja: o `alt=0` dos braços "1280" não era defeito do v51.
* **A 1280 de verdade** (viewport aplicado antes do navigate, medido com as linhas assentadas):
  `prateleira.dataOpen="true"`, corpo `display:grid`, altura 1.369 px → **a prateleira está aberta e o painel
  está no fluxo visível** (`visiveis=1/1`). O painel, porém: `classes =
  "bfr-coord-birthday-compact is-collapsed is-empty"`, **altura 68 px**, `conteudoHidden=true` (altura do
  conteúdo 0), cabeçalho genérico **"Aniversariantes"** com sinal `+` e `aria-expanded=false` — e as
  **3 `li` medidas com altura 0** (`li=3, visíveis 0, alturas [0,0,0]`). A 390: prateleira fechada **e** painel
  colapsado → nada aparece.
* **Causa, lida no ar (`ar-implantado-v51.html`), com número de linha:** o painel compacto é montado em `:12061`
  com a coluna "Hoje" a renderizar `list(today,'Nenhum aniversário hoje.')` — um nó `.bfr-coord-birthday-empty`.
  `hasEmptyState` (`:23574`) aceita essa classe; `hasUsefulContent` (`:23578`) só reconhece
  `article,table,form,canvas,iframe,input,select,textarea,[data-coord-metrics],.bfr-coord-quick-grid,
  .bfr-coord-profile-metrics` — e o compacto é feito de `div/ul/li`, nenhum deles. Logo
  `defaultOpen` (`:23585`) devolve `false` → `flag(container,'is-collapsed',!open)` (`:23600`) e o
  `content.hidden` do próprio painel. Como "Hoje" quase sempre é 0, **o painel de aniversariantes nasce
  colapsado para sempre, independentemente de quantos aniversários há nos "Próximos"**; o `is-empty` que ele
  carrega é mentira com `li=3` na tela.

**Veredito do item 36 (mudou de estado, não foi fechado).** O objetivo — *superfície visível para o coordenador
na URL publicada* — **não foi alcançado** pelo v51: o caminho de injeção, a autorização e os dados estão provados
no ar, mas o que o coordenador vê é um cabeçalho "Aniversariantes +" dentro de uma "Painéis complementares" que,
em ≤800 px, também precisa de um toque para abrir. O conserto cabe em uma linha (`hasUsefulContent` reconhecer
`.bfr-coord-birthday-columns`, ou `hasEmptyState` do compacto perguntar "as DUAS colunas estão vazias" em vez de
"alguma"), e é **candidata nova + OK seu** — eu não editei byte nenhum do ar. Fica aberto como **item 36.8** na
lista de pendências.

36.8 **ITEM 36.8 ABERTO (21/10) — o painel compacto de aniversariantes nasce COLAPSADO mesmo com dados na tela (medido a 1280), e o `is-empty` que ele carrega é mentira.** Medido na origem publicada com `viewport()` aplicado antes do `navigate`
(prateleira aberta a 1280, corpo `display:grid` 1.369 px): o painel `.bfr-coord-birthday-compact` está no fluxo
visível mas com `classes="… is-collapsed is-empty"`, altura 68 px, conteúdo `hidden` a 0 px, cabeçalho
"Aniversariantes" com sinal `+` e `aria-expanded=false`, e as **3 `li` reais medindo altura 0** — `li=3, visíveis=0`.
Causa lida no ar: `hasEmptyState` (`:23574`) aceita o placeholder `.bfr-coord-birthday-empty` da coluna "Hoje",
`hasUsefulContent` (`:23578`) não reconhece `div/ul/li` → `defaultOpen=false` (`:23585`) → `flag(container,
'is-collapsed', !open)` (`:23600`). Como "Hoje" é 0 na maior parte dos dias, o painel está fechado **independentemente
do que existe nos "Próximos"**. Não confundir com a causa de instrumento (armadilha **143**: headless sem
`--window-size` boota a 762 px e a `shelfWanted = innerWidth>800` (`:736`) fecha a prateleira por decisão do app
— isso é do rig, não do produto). **Estado: APLICADO no ar como v52 (21/10 06:38:28Z) — ver 36.10.** O conserto
foi a linha prevista (candidata nova, A/B no rig nas duas bandas, OK explícito antes de publicar); a decisão de
produto tomada pelo hunks é **abrir por padrão quando há linha de aniversário**, porque `.bfr-coord-birthday-columns ul`
entrar em `hasUsefulContent` casa exatamente com `li>0` — e a incoerência que abria o caminho para o rótulo
mentiroso (`is-empty` com `li>0`) desaparece: com as duas colunas vazias não há `<ul>`, o painel continua
colapsado e o "+" passa a ser honesto. **Andamento na mesma hora: veja 36.9 —
a candidata existe, o A/B foi medido e ela abre o painel (68→301 px, li visíveis 0→3); falta só o seu OK para
publicar.**

36.9 **CANDIDATA DO 36.8 GERADA E A/B-MEDIDA NO RIG (21/10, ~06:3xZ) — a linha funciona; NADA publicado.**
`gera-candidata-item36-8-colapso-compacto.mjs` → `bfr-candidata-item36-8-colapso-compacto/` (fonte = os bytes
EXATOS do ar v51, `3c5587d3…`; saída `554c3120…`, **Δ+31 caracteres**, um hunk só: `.bfr-coord-birthday-columns ul`
entra na lista de `hasUsefulContent`). Portões: âncora 1× e a forma nova 0× na fonte; **reversão byte a byte
`true`**; paridade de sintaxe `true` (19 blocos, 0 recusados nos dois lados); censo de marcas 11 publicadas
inalteradas + 1 nova 0→1 + 1 velha 1→0 (`bfr-candidata-item36-8-colapso-compacto.json`).

A/B no harness autenticado com a conta REAL do coordenador (`audit-harness-com-dir.mjs` servindo o controle na
8301 e a candidata na 8302, mesmo bootstrap, mesmo Chrome headless, `viewport(1280,900)` **antes** do `navigate`,
zero cliques, `ab-item36-8-colapso.mjs` → `ab-item36-8-colapso-1280.json` e `ab-item36-8-colapso-1280-b.json`):

| o que o coordenador vê @1280 | controle (ar v51) | candidata |
|---|---|---|
| classes do painel | `bfr-coord-birthday-compact is-collapsed is-empty` | `bfr-coord-birthday-compact` |
| altura do painel | **68 px** (só o cabeçalho) | **301 px** |
| `content.hidden` / altura do conteúdo | `true` / **0 px** | `false` / **203 px** |
| cabeçalho | sinal `+`, `aria-expanded=false` | sinal `—`, `aria-expanded=true` |
| colunas | Hoje:0 (vazio) · Próximos:3 | Hoje:0 (vazio) · Próximos:3 |
| `li` reais na tela | 3, **visíveis 0**, alturas `[0,0,0]` | 3, **visíveis 3**, alturas `[14,22,22]` |
| painéis collapsibles / colapsados | 11 / **3** | 11 / **2** |
| marcas `[data-exec-revealed]` / ocultas pelo overlay | 1 / 0 | 1 / 0 |

Regressão: o censo de collapsibles é **idêntico (11)** e o único que muda de estado é o de aniversariantes
(3→2 colapsados). Repeti a corrida com uma segunda leitura 4 s depois da ruptura do portão porque a 1ª deram
`outros=11` no controle e `10` na candidata — é montagem assíncrona, não efeito da candidata (armadilha do
estágio assíncrono); na 2ª corrida os dois braços dão 11. Escritas: o firewall não barrou nada além de
`POST /cdn-cgi/rum` (beacon da Cloudflare, não dado); as duas RPCs de leitura passaram.

**A 1ª corrida desta passada foi INVÁLIDA e fica registrada como tal:** injetei o firewall de escrita sem a
lista nominal de leitura, e como `rpc()` é **POST** no supabase-js, ela matou `list_current_month_birthdays` e
`bfr_list_staff_birthdays`. O painel montou com `Hoje:0 / Próximos:0` e `li=0` nos DOIS braços, e o portão de
assentamento (`totalLi > 0`) nunca rompeu — as 4 linhas rodaram até o teto medindo o esqueleto vazio. É a
armadilha conhecida ("um firewall que também barra as RPCs de leitura") reproduzida por mim outra vez, agora com
o `barradas`/`permitidas` no diário para não repetir.

**O que a candidata NÃO cobre (e não finge cobrir):** @390 a prateleira continua nascendo fechada por decisão do
app (`shelfWanted = innerWidth>800`) — a candidata abre o painel **dentro** da prateleira, não a prateleira; e a
banda 390 com dados não foi re-medida nesta vaga porque a sessão sintética do coordenador expirava às 06:48Z. O
caso "as duas colunas vazias" (que a lógica diz continuar colapsado) não tem medição: não há como forjar hoje=0
e próximos=0 com os dados reais deste mês. **Portão final da vaga (medido, não afirmado):** re-baixei o `/` da
origem publicada depois de tudo — `md5 = 3c5587d394b3b371565fac7d079429ba`, byte-idêntico ao v51 implantado, ou
seja nada desta passada tocou o ar. **Publicação: não. Precisa de OK seu** — o caminho é
`build-worker-bundle-cand.js` + o `sw-v4.js` do AR com `CACHE` bumpado para `bfr-conecta-v52`, portão de
md5 antes/depois por HTTP na origem certa (`turmaroboticabfr`), e a mesma passada de navegador depois.
**Andamento na mesma hora: veja 36.10 — publicado como v52, 21/10 06:38:28Z, com as duas bandas re-medidas no ar.**

### 36.10 — A CANDIDATA DO 36.8 FOI PUBLICADA COMO v52 (21/10, 06:38:28Z) E O PAINEL É VISTO NO AR

A dona respondeu à pergunta de escopo com **"Publicar como v52 agora"**. Nada aqui usa OK de outra rodada: o
portão do item 36.9 era "precisa de OK seu" e o OK veio, nomeado, antes do `wrangler deploy`.

* **Antes, por HTTP na origem certa** (`https://bfr-conecta.turmaroboticabfr.workers.dev`, 06:3xZ, minutos antes):
  `/` = **`3c5587d394b3b371565fac7d079429ba`** / 3.391.562 bytes e `/sw-v4.js` = **`698888dc16d6e4c425f6cce6150c0e2c`**
  / 3.585 bytes com `const CACHE = 'bfr-conecta-v51'` — os dois byte-idênticos ao que o v51 implantou. É a
  reafirmação de que a vaga do 36.9 não tinha tocado o ar, lida outra vez no instante do deploy.
* **Fonte do deploy** = `bfr-candidata-item36-8-colapso-compacto/` (a mesma que deu o A/B: `index.html`
  **`554c3120b93ac8c6c9a96e9736d124d2`**, 3.374.278 chars) **+ um `sw-v4.js` que NÃO veio da candidata** — o
  gerador só escreve HTML, então o SW é o **do ar** (`sw-do-ar-v52-base.js`, `698888dc…`) com **uma** linha
  trocada; `diff` = só `const CACHE = 'bfr-conecta-v51';` → `'bfr-conecta-v52';`, md5 **`e2ec178a1dbfade484dc8d7ee5493d43`**.
  Nenhum `?v=` foi bumpado: o PRECACHE do ar já batia com o HTML (`?v=13` / `?v=2`) e o re-instalador é o nome
  do CACHE (o handler de `install` apaga todo cache com prefixo `bfr-conecta-`).
* **Portão do bundle antes de subir** (`confere-bundle-v52.mjs`): o literal `const HTML` dentro de
  `worker-deploy-v52/worker.mjs` **é** a candidata (`554c3120…`, 3.374.278 chars, igualdade byte a byte `true`) e o
  `const SW` **é** o `sw-v4.js` da candidata (`e2ec178a…`, `true`); `bfr-conecta-v51` não aparece no HTML embutido.
  Os 12 assets do `public/` batem com os da candidata (0 diferentes) e o wrangler confirmou por fora:
  `No updated asset files to upload. Proceeding with deployment...`.
* **Deploy**: `node build-worker-bundle-cand.js bfr-candidata-item36-8-colapso-compacto worker-deploy-v52` →
  `wrangler deploy` dentro de `worker-deploy-v52/`. Total 3.361,28 KiB / gzip 752,46 KiB, startup 1 ms, binding
  `env.ASSETS`. **Version `f96189d8-25da-4048-987c-3f4261a0c38b`**, deployment `2fbc47fd-7cbd-498e-802d-087bb24e96a1`,
  criado **2026-10-21T06:38:28.056051Z** (lido do `wrangler deployments list --json` por
  `acha-version-deploy.mjs`, não lembrado). Anterior: `f1eb0bae-…` / `a5d81cf4-…` / 05:00:53.767Z (v51).
  Login pelo grant OAuth do wrangler (`turmaroboticabfr@gmail.com`, `workers_scripts (write)`); `~/.cf-token`
  continua expirado e não foi usado; nenhuma credencial em linha de comando.
* **Depois, por HTTP**: `/` = **`554c3120b93ac8c6c9a96e9736d124d2`** / 3.391.593 bytes (Δ+31 em relação ao v51,
  exatamente o delta da candidata) e `/sw-v4.js` = **`e2ec178a1dbfade484dc8d7ee5493d43`** / 3.585 bytes,
  `const CACHE = 'bfr-conecta-v52'`, `cache-control: public, max-age=0, must-revalidate`. Os dois md5 batem com
  os bytes que entraram no bundle — portão de identidade `true` nos dois lados.

**O que o coordenador vê na URL publicada, sem toque, com a conta real do papel**
(`prova-v52-colapso-1280.json`, `prova-v52-colapso-390.json`; SÓ leitura, zero `Input.*`):

| | v51 no ar (controle do A/B @1280) | **v52 @1280** | **v52 @390** |
|---|---|---|---|
| classes do painel | `… is-collapsed is-empty` | `bfr-coord-birthday-compact` | `bfr-coord-birthday-compact` |
| altura / conteúdo | 68 px / `hidden=true`, 0 px | **301 px** / `false`, **203 px** | **502 px** / `false`, **406 px** |
| cabeçalho | `+`, `aria-expanded=false` | `—`, `aria-expanded=true` | `—`, `aria-expanded=true` |
| colunas | Hoje:0 (vazio) · Próximos:3 | Hoje:0 (vazio) · Próximos:3 | Hoje:0 (vazio) · Próximos:3 |
| `li` visíveis | 0 de 3, alturas `[0,0,0]` | **3 de 3**, `[14,22,22]` | **3 de 3**, `[38,46,46]` |
| escritas na rede | — | **nenhuma** | **nenhuma** |

**O @390 com dados, que o 36.9 dizia não cobrir, está coberto** — e sem tocar em nada: `shelveForeignPanels()`
`:770` decide a prateleira por `saved===null ? shelfWanted() : saved==='1'`, ou seja a chave
`localStorage['bfr-coord-shelf-v1']` manda **antes** da largura. Semear `'1'` por
`Page.addScriptToEvaluateOnNewDocument` é portão do instrumento (é a mesma decisão que a casa já honra quando a
pessoa abriu a prateleira antes), não mudança de produto: a 390 a prateleira continua nascendo fechada para quem
não a abriu. A 390 o painel não estoura a largura (`right > innerWidth` = `false`, 362 px dentro de 390) e os
colapsíveis da view são 6 com 1 colapsado.

**O que NÃO está provado (e não se afirma estar):** (a) o caso "as duas colunas vazias" não tem medição — os
dados reais deste mês dão `Próximos:3` e forjar hoje=0/próximos=0 exigiria interceptar as duas RPCs de leitura,
que é exatamente o instrumento que a armadilha 135 condena para decidir "o painel está vazio"; a lógica do
código basta aqui e fica registrada como lógica: `list()` só emite `<ul>` quando `items.length`, então sem `ul` o
`hasUsefulContent` continua falso e o painel continua colapsado com `is-empty` — comportamento correto, não
defeito. (b) Nenhum cliente real com CACHE `v51` foi observado re-instalando: a prova é de bytes servidos mais
navegador limpo no rig.

Diários desta publicação: `audit-publicacao-v52.json` (escrito por `diario-publicacao-v52.mjs`, que remonta
antes/depois, bundle, version e as duas passadas de navegador a partir dos arquivos, sem número digitado de
memória), `confere-bundle-v52.mjs`, `prova-v52-colapso-1280.json`, `prova-v52-colapso-390.json`,
`worker-deploy-v52/dep-list.json`.



**Duas publicações, o mesmo diário por cima.** `audit-publicacao.json` é reescrito a cada rodada do
`confere-publicacao.mjs`, então hoje ele descreve o deploy `76cc8f58`
(CACHE `bfr-conecta-v33` → `bfr-conecta-v34`, `?v=` `?v=11` → `?v=12`) e não o anterior (`004077c9`).
O par de versões vem do `deployments list` do wrangler (`confere-versao-no-ar.mjs` →
`audit-versao-no-ar.json`): é GET, e o token de API em `~/.cf-token` **não** alcança o endpoint REST de
deployments (medido hoje: HTTP 401), por isso o caminho é o mesmo grant OAuth do deploy. Consequência de
metodologia que tem de ficar escrita: as seções H.1–H.5 foram colhidas no shell anterior, e o que prova o
shell atual é H.6 — um título de seção que dissesse só "o build publicado" mentiria por uma versão.


Fechando o item (a) de F.7. Feito com OK explícito, na ordem: pré-voz de leitura (o delta medido antes
de encostar no ar), bump do `CACHE`, deploy, conferência por fora. Diário: `audit-publicacao.json`,
gerado por `confere-publicacao.mjs`, que só faz `GET` — não precisa de credencial e não escreve nada.
Instrumento da comparação: `confere-publicar.mjs` (baixa o HTML do ar e o `sw-v4.js`) e
`git diff --no-index` entre o instantâneo de antes e o arquivo local.

O que **este** deploy levou, atribuído por literal antes e depois de encostar no ar
(`pre-voeu-50-51.mjs` → `audit-pre-voeu-50-51.json`): 4/4 marcas do patch #50/#51 com contagem idêntica no ar e no local, e a literal antiga zerada onde a edição a substituiu.

| O que foi conferido | Antes do deploy | Depois | Como |
|---|---|---|---|
| HTML servido em `…/workers.dev/` | ? caracteres | **3330710** (byte-idêntico ao local de 3330710) | `GET` com `cache-control: no-cache` |
| Blocos de diferença local × ar | `?` (instantâneo de antes não passado nesta corrida) | **? hunks (não medido nesta corrida)** | `git diff --no-index --unified=0` antes e depois |
| `CACHE` do service worker | `bfr-conecta-v33` | `bfr-conecta-v34` | linha 1 de `/sw-v4.js` lida no ar |
| As travas e correções no HTML **do ar** | — | 6/6 marcas ✓ (✓ A ✓ B ✓ C ✓ D ✓ E ✓ F) | expressões das edições procuradas no bytes baixados |
| Assets atrás do Worker | — | 14 rotas em 200, MIME certo | `verify-deploy.js` (roda sozinho, sem credencial) |
| Upload | — | 3.18 MB de script, assets sem alteração ("No updated asset files to upload") | saída do `wrangler deploy`, versão `76cc8f58-ca78-4674-87a4-d196995b9cfd`, lida depois por `confere-versao-no-ar.mjs` |

**Por que o bump do `CACHE` não é burocracia:** o service worker é *cache-first* para `/` e `/index.html`
(`PRECACHE_PATHS` inclui `/`, e `cacheable()` aceita navegação do shell). Sem trocar o nome, o cliente
que já tem `bfr-conecta-v33` continuaria servindo o HTML antigo do cache mesmo com o Worker
novo no ar. Com o nome trocado, o `install` apaga toda cache com o prefixo `bfr-conecta-` (linhas 23-26 do
`sw-v4.js`) antes de reprecargar.

**O que isto NÃO prova (e fica como pendência explícita, item G.1):**

1. **Este item caiu.** A passada de navegador contra a URL publicada foi rodada depois do deploy: 164 visitas @390px, diário `audit-sweep-publicado.json`, com o cache de cada visita gravado junto (`bfr-conecta-v33`). As 25 telas que congelavam estão provadas sem trava **também no ar** — ver a seção H.
2. Um cliente com `bfr-conecta-v33` instalado só vê o shell novo depois que o `sw-v4.js`
   for buscado (ele é servido com `Cache-Control: no-cache`) e o worker novo ativar — a troca de cache é
   no `install`, não no exato instante do deploy.
3. `index.html` publicado não é o banco: os quatro itens SQL de D.5 continuam valendo independentes, e a
   publicação não re-tocou policy nenhuma.

**Reversão, arquivo por arquivo.** O build que estava no ar antes deste deploy é `bfr-conecta-patched/index.html.bak-operador-48b`
(delta medido na candidatura: 75 caracteres), e os dois outros patch publicados têm backup próprio —
`bfr-responsive-presentation.js.bak-destaque-55` para o #55 e `index.html.bak-reentrada-1` para o #53. Devolver o index e o
`.js` e rodar `node deploy-worker.js` restaura os bytes; **isso não devolve o `CACHE`** — sem re-bump
(`bfr-conecta-v34` → `bfr-conecta-v33`) o cliente continua no nome novo e re-baixa o shell
recém-restoreado, que é o efeito desejado, mas o nome em si fica trocado. O diário de publicação anterior
foi sobrescrito por esta conferência (o instrumento escreve um arquivo só), por isso as células "antes"
desta tabela vêm dos diários de bump e de `deployments list`, não de um instantâneo de 14/10.

37. **ITEM 37, ABERTO EM 21/10 E FECHADO NO BANCO NO MESMO DIA pela #190 (ver 37.1, §37.14 e §37.15) — as 112 notas históricas não têm categoria, e isso é o que trava a média, não o peso.** Medido em `simula-forma-regra-187.mjs` (§37.12, rollback, zero escrita): as três formas de regra que *fecham* em 100% — peso 100 único, 50/50 e 20/20/40/20 — dão **0 médias** nos bimestres 1 e 2, porque `lancamentos_que_casam_com_regra = 0` (o join é `g.category = r.category` e 112/112 linhas estão com `category NULL`). O controle positivo prova que a função devolve número (`9.0` com uma linha classificada), e o braço misto achou o risco: **classificar só parte não trava — a média sai só sobre as classificadas e o histórico fica fora do cálculo sem erro nem aviso.** Falta, portanto, uma decisão de dado da escola antes dos pesos: **classificar as 112 lançamentos antigos** em `comportamento`/`atividades`/`prova`/`trabalho` (ou no eixo que a Direção escolher) — é `UPDATE` em `grades`, **arquivo novo + OK novo**, e hoje não existe superfície no app para classificar retroativamente (a v53.1 só classifica o que for lançado dali para frente). Enquanto isso, **a regra está cadastrada** (21/10: #187 APLICADA com `prova`=100 e as outras três `applies=false`,
§37.13) e a média continua `null` — agora por falta de categoria nas notas, não por falta de peso.

37.1 **Atualizado ainda em 21/10 (ordem "rodar a tarefa 190 para classificar o histórico") — a classificação estava candidata, validada e NÃO aplicada.** Medido em `censo-classificar-190.mjs` e validado braço a braço em `classificar-historico-190.mjs` (§37.14): as 112 linhas são **um instrumento por bimestre por aluno** (112 pares distintos, 0 duplicados), o componente é um só (`História`) e o selo das linhas continua `ecad7423466a764adf93fcb743496fb0`. O controle positivo finalmente existe: classificando dentro da transação, `bfr_term_average` passa de `null` para **`2.5`** e o boletim de 0 para **4 de 16 células com média**. Descoberta que muda o enquadramento: **`grades` não tem policy de `UPDATE` nenhuma** — o `UPDATE` como diretora autenticada casou **0 de 112** linhas (sem erro, silêncio de RLS) e só o dono do canal casa as 112; o app, lido nos bytes do candidato v53.1, apenas **insere**. Logo isto é backfill de legado pelo canal administrativo, não superfície de produto. O travesso que resta **não é decisão nem mecanismo, é o OK de escrita**: `node classificar-historico-190.mjs --apply` faz o `UPDATE` com portão de contagem, e `rollback-classificar-historico-190.sql` (112 ids congelados em `retrato-antes-190.json`, escrito antes de aplicar) desfaz exatamente. Nada foi publicado e nada foi gravado nesta passada — selo conferido depois de cada braço.
 **Depois, no mesmo dia, o OK chegou ("OK") e o `--apply` rodou: as 112 estão em `prova`, o selo `id:score` continua `dd8f0ebd…`, 112/112 pares com média viva e o publicado byte a byte igual — estado e conferência independente em §37.15.**

38. **ITEM 38 PUBLICADO EM 21/10 (ordem "Aplica a 182") — a tela de lançamento por bimestre e categoria está nos bytes do ar; o que fica aberto é a prova com o papel real, não a publicação.** A candidata v53.1 foi ao ar como **v53** (`deployment 3f9e034f…`, `version 2525fabb-e8fa-4aa0-b987-27d346f17792`, 21:02:51Z) depois de cinco portões de pre-voeu e do portão do bundle — `/` 3.408.900 bytes md5 `f08374b1258064a82d8503d08bff37e9` (três fetches idênticos), `CACHE='bfr-conecta-v53'`, +17.307 bytes sobre o v52, 12/12 assets byte-idênticos, linhagem reprodutível a partir do ar, 0 marcadores perdidos. A troca de shell no cliente está provada em Chrome limpo: única cache `bfr-conecta-v53` e o `/` guardado nela é a candidata. Selo e números completos em §37.16, diário `audit-publicacao-v53.json`.
 **Aberto por medida, não por suspeita:** a tela ainda não foi vista renderizando para um professor de verdade na URL pública — forçando a persona `teacher` do próprio app sobre sessão de developer, `BFR_SECURE_TEACHER_SCOPE` não carrega (`loaded:false · turmas 0`) e o loader que injeta a aba não roda, então `tabs` ficam as duas antigas e `celulas 0`. Falta **conta sintética do papel `pedagogical`**, e mintar escreve em `auth`: **OK próprio** — *mintada no mesmo dia na sequência do "OK" (item 39): a conta era necessária e não bastou; a causa medida é outra.* A alternativa v52.1 (só filtro, 3.391.963 bytes, md5 `f6cf492f…`) continua em disco e **não** publicada — o OK escolheu a v53.1. Reversão congelada em `ar-html-v52-live.html` + `ar-sw-v52-live.js`.
39. **ITEM 39 ABERTO EM 21/10 (conta `pedagogical` real mintada com OK e medida no ar) — a aba de notas não monta por causa do portão da grade publicada, não por falta de conta.** Com o papel real, `BFR_SECURE_TEACHER_SCOPE` passa a carregar (`loaded:true`, antes `false`), mas aborta em `loadScopedSchedule()`: a `bfr_schedule_versions` de 2026 publicada **existe** (`2026/published=1`, 594 entries), porém a policy `bfr_schedule_versions_read` só a mostra a `bfr_is_schedule_manager()` (`developer/coordinator/director/secretary` — **não** `pedagogical`) ou a quem tem entry na versão/responsável de aluno de turma com entry. A conta sintética não tem `bfr_teacher_directory` vinculado: REST **HTTP 200 com `[]`** (filtro de RLS, não recusa), o `maybeSingle()` cai em `'Grade publicada não encontrada.'`, `secure.error` é pintado e `ensureAcademicUi()` nunca roda — a aba "Notas por categoria" fica ausente e `celulas 0`, com 0 escritas. A `bfr_teacher_context()` da #185 está inocente: HTTP 200, `error:null`, zero rows por vínculo. Cadeia completa, scripts e limitações em §37.17; diários `prova-ar-v53-pedagogical.json`, `prova-ar-v53-modulo-pedagogico.json`, `sonda-escopo-pedagogical.json`, `ler-manager-grade.json`, `ler-policy-versions-read.json`. **Para ver a tela no ar é preciso uma destas três, cada uma com OK próprio:** (a) credencial do professor real (não é nossa e não será mintada); (b) escrever vínculo — 1 linha em `bfr_teacher_class_subjects` (turma/História com as 62 notas) **e** abrir o portão da grade por 1 linha em `guardian_students` ou 1 entry na versão publicada, o que dá à credencial de teste escopo de escrita sobre notas reais de 62 alunos; (c) desacoplar o módulo do portão da grade no código (candidata de interface, não escrita em banco) — caminho que a casa recomenda se a intenção for "professor lança nota mesmo sem grade publicada".
40. **ITEM 40 PUBLICADO EM 21/10 (ordem "Publicar a candidata v54") — a v54 desacopla o módulo de notas da grade publicada e está nos bytes do ar.** O deploy `cd21c909-8a93-43cf-abc1-5affa42c806a` (version `74cc2f8f-b4a8-4ecf-9c59-17a53d8735a8`, 23:09:50Z) pôs no ar `/` 3.409.714 bytes md5 `a2fce2599e04433a93bb954a95286e93` (três fetches idênticos), `CACHE='bfr-conecta-v54'` com **1** linha de diferença no SW, **12/12 assets** intactos, **15/15 rotas** 200 e o shell novo provado em Chrome limpo (única cache `bfr-conecta-v54`, body de `/` md5 `a2fce259…`; só 404 de `/cdn-cgi/rum`, beacon da Cloudflare). Antes: preflight 8/8 (ar v53 `f08374b1…` era o esperado, linhagem reprodutível, 0 marcadores perdidos), SRC 4/4 e bundle verde. **Aberto por medida:** o banco não foi tocado e a conta `pedagogical` não tem vínculo em `bfr_teacher_class_subjects`, então a URL pública com essa conta ainda mostra a recusa original; ver a tela com vínculo real e rodar os 14 cenários do brief §8 exige linha de vínculo para professor real (OK separado). Detalhe, prova e reversão em §37.19; A/B e armadilha 167 em §37.18; diário `audit-publicacao-v54.json`.

41. **ITEM 41 FECHADO EM 22/10 (v60 PUBLICADA e D3 APLICADO no banco) — D1, D2 e D4 da suite v59 consertados na v60, provados em A/B no harness nas duas larguras e agora nos bytes do ar; o D3 (atividade escolar 403) foi aplicado no banco em passada separada.** Deploy cirúrgico 22/10 21:12Z, Version ID `79112a32-8953-4947-9893-73f88aa2132e`: `/` md5 `36feaad4fb5a033a2f011de336a4667e` (3.481.301 B), SW `042670477d613d3044b4e4298a891db4` com `CACHE bfr-conecta-v60` (única linha trocada do SW do ar), rp.js `a83f77ba…` e 12/12 assets intocados. Portões verdes: preflight (ar == v59 `2e403607`, diff byte-igual ao congelado, 5/5 assinaturas), confere-bundle (HTML == SRC, SW == SRC com 1 linha de dif do ar, marcas v59 preservadas + v60 presentes), HTTP (3 fetches iguais) e cliente em Chrome limpo (cache única `bfr-conecta-v60`, SW activated/controlado, body cacheado byte-igual, só 404 de `/cdn-cgi/rum?`). O D3 foi aplicado antes do deploy (`node apply-sql.mjs sql-d3-school-activities-insert.sql --apply` → HTTP 201) e provado por catálogo + dry-run transacional (ANTES 42501 → DEPOIS id retornado; 0 linhas escritas; reversão congelada); E2E pelo caminho real TESTADO 22/10 (OK próprio): conta sintética `pedagogical` mintada para o teste — POST positivo 201, SELECT própria visível, negativos 42501×3 e anon 401, PATCH/DELETE casam 0 linhas (seguem fechados para `pedagogical`, fora do escopo do D3), baseline de 7 tabelas restaurada por md5 e conta apagada no fim do ciclo (§37.23, diário `d3-e2e-postgrest.json`). As 4 células do A/B (`mede-v60-ab-d1d2d4.json`, v59/v60 × 390/1280): D1 inbox visível na Frequência e na volta na v60 (193/187px); D2 painel de leitura regenerado após a corrida (anos 6 e 7; @1280 nem trava); D4 '1 de 1 lançamento(s) salvos.' mantido (defeito de exibição — a escrita já existia nas duas bandas); #240 modal de correção abre nas 4 células (gap do rig fechado, armadilha #174). Sobram como material de item próprio: primeiro clique na aba notas engolido a 390 (item 42) e o churn de command-cards da v59 (eliminado de fato na v60, mecanismo não atribuído). Reversão da publicação: devolver index v59 (`2e403607`) + SW v59 (`0d5294f7`) e redeploy — requer OK novo. Detalhe e portões em §37.23; diário `audit-publicacao-v60.json`.

## H. A URL publicada medida no navegador (shell v33 nas seções H.1–H.5; o deploy seguinte e a passada sobre ele estão em H.6)

Passada @390 px no endereço público `https://bfr-conecta.turmaroboticabfr.workers.dev/`, com o mesmo instrumento do harness (`audit-sweep2.mjs` com `AUDIT_LIVE=1`, diário `audit-sweep-publicado.json`): 164 visitas, 159 chegaram, 0 trava(s), 0 presa(s) no login, 1 painel(is) com <40 caracteres, 7 sem nenhum controle, mediana de 7.5s por visita.

| passada | visitas | chegaram | travas | presas no login | painéis <40c | mediana |
|---|---|---|---|---|---|---|
| publicado (URL pública, shell v33) | 164 | 159 | 0 | 0 | 1 | 7.5s |
| reteste (harness, build corrigido) | 164 | 155 | 0 | 0 | 2 | 4.5s |
| antes (harness, build sem correção) | 164 | 139 | 21 | 0 | 5 | 6.4s |

**De qual cache cada tela veio** (o service worker real é cache-first para `/` e `/index.html`; linha servida pelo cache velho não é evidência do shell novo): `bfr-conecta-v33` ×164 · frame controlado pelo service worker em 164 de 164 visitas.
**Marca de código no documento executado** — as chaves de `window.BFRPlatform` gravadas em cada visita: `__bfrParentNavigationV2,__studentSpaceInstalled,awardXp,open,renderHomeDock,state,storageKey,syncAreaNav` ×164. `syncAreaNav` presente é o hunk 12202 rodando no ar (ele não existia no v31).

**Delta publicado × reteste** (mesma largura, mesmo instrumento, telas fora de 200c/15% ou 8 controles, ou chegada diferente): `coordinator/coordenacao` 1844c vs 201c (+1643, +23ctl); `coordinator/horarios` 702c vs 707c (-5, +15ctl); `coordinator/cadastro-alunos` 702c vs 707c (-5, +15ctl); `coordinator/comunicados` 702c vs 1081c (-379, +9ctl); `coordinator/ocorrencias` 702c vs 707c (-5, +13ctl); `coordinator/atividades` 1675c vs 922c (+753, +7ctl); `coordinator/escola-historia` 702c vs 707c (-5, +15ctl); `coordinator/comunicacao` 2796c vs 0c (+2796, +55ctl); `coordinator/fotos` 702c vs 707c (-5, +15ctl); `coordinator/chat-interno` 279c vs 256c (+23, +14ctl); `coordinator/coordenacao-chat` 702c vs 707c (-5, +15ctl); `coordinator/jogos-escolares` 1093c vs 220c (+873, +12ctl) — 50 outras no JSON.
**Leitura obrigatória deste delta:** o diário de reteste (164 linhas, `audit-sweep-reteste.json`) **não tem campo de assentamento** — foi rodado antes de o portão #49 entrar no instrumento, que passou a esperar o painel assentar antes de contar. Esses 62 deltas misturam, portanto, "a tela mudou neste deploy" com "a medição mudou de momento". É triagem para escolher o que re-medir, não prova de regressão; a comparação de instrumento com instrumento só existe a partir de `audit-sweep-mobile.json`, `audit-sweep-web.json` e desta passada publicada.

### H.1 Os dois sintomas que a publicação tinha de encerrar

| tela | motivo | antes (harness) | reteste (harness) | publicado |
|---|---|---|---|---|
| `coordinator/comunicacao` | tela em branco — hunk 8781 | 0c/0ctl chegou=true | 0c/0ctl chegou=true | 2796c/55ctl chegou=true |
| `aee/meu-espaco` | área fora de roleSectionAccess.aee — hunk 7742 | 0c/0ctl chegou=false | 8890c/113ctl chegou=false | 8881c/113ctl chegou=false |

### H.2 Prova por hunk no navegador público (4 tela(s), `probe-hunks-publicado.mjs`, identidade `bfr-audit-session-live.json`)

Leitura antes de usar qualquer número desta lista: o probe mede `.content:not(.hidden)`, o *fallback* do instrumento, e **não** o alvo declarado da rota que a varredura usa. Então um painel aqui não é o mesmo sensor que o painel da seção H.1 — `aee/inicio` e `coordinator/inicio` darem o mesmo valor é consequência do sensor, não das duas telas serem iguais. O que este probe prova é o comportamento por hunk (chegada, `syncAreaNav` definido, mutações em 4 s), não o tamanho do painel.
- `aee/inicio` — chegou=true; painel 7352c/92ctl; `BFRPlatform`=__bfrParentNavigationV2,__studentSpaceInstalled,awardXp,open,renderHomeDock,state,storageKey,syncAreaNav; `syncAreaNav`=function; áreas visíveis: nenhuma; mutações em 4 s: 298
- `aee/meu-espaco` — chegou=false; painel 8867c/113ctl; `BFRPlatform`=__bfrParentNavigationV2,__studentSpaceInstalled,awardXp,open,renderHomeDock,state,storageKey,syncAreaNav; `syncAreaNav`=function; áreas visíveis: nenhuma; mutações em 4 s: 155
- `coordinator/comunicacao` — chegou=true; painel 1091c/29ctl; `BFRPlatform`=__bfrParentNavigationV2,__studentSpaceInstalled,awardXp,open,renderHomeDock,state,storageKey,syncAreaNav; `syncAreaNav`=function; áreas visíveis: nenhuma; mutações em 4 s: 149
- `coordinator/inicio` — chegou=true; painel 7358c/92ctl; `BFRPlatform`=__bfrParentNavigationV2,__studentSpaceInstalled,awardXp,open,renderHomeDock,state,storageKey,syncAreaNav; `syncAreaNav`=function; áreas visíveis: nenhuma; mutações em 4 s: 389

### H.3 As telas de papel real, no ar com a conta sintética (`audit-sweep-publicado-aluno.json`)

Identidade de conta real (student + parent): 35 visitas, 31 chegaram, 0 trava(s), 0 presa(s) no login, 1 painel(is) com <40 caracteres, mediana 4.6s. Cache das visitas: `bfr-conecta-v33` ×35.

| tela | publicado com a conta REAL | publicado com a conta da auditoria (developer + seletor) | harness local com a conta real |
|---|---|---|---|
| `student/inicio` | 1265c/69ctl chegou=true | 1287c/74ctl chegou=true | 1281c/69ctl chegou=true |
| `student/aprender` | 1032c/7ctl chegou=true | 1287c/68ctl chegou=false | 1032c/7ctl chegou=true |
| `student/evoluir` | 1021c/4ctl chegou=true | 1287c/74ctl chegou=false | 1021c/4ctl chegou=true |
| `student/escola` | 723c/14ctl chegou=true | 1287c/68ctl chegou=false | 723c/14ctl chegou=true |
| `student/meu-espaco` | 223c/0ctl chegou=true | 1287c/74ctl chegou=false | 223c/0ctl chegou=true |
| `student/notificacoes` | 400c/3ctl chegou=true | 400c/3ctl chegou=true | — |
| `student/conteudos` | 1319c/18ctl chegou=true | 1319c/18ctl chegou=true | — |
| `student/escola-historia` | 11165c/69ctl chegou=true | 45161c/68ctl chegou=true | — |
| `student/notas` | 183c/0ctl chegou=true | 183c/0ctl chegou=true | 183c/0ctl chegou=true |
| `student/agenda` | 393c/4ctl chegou=true | 393c/4ctl chegou=true | — |
| `student/atividades` | 1695c/26ctl chegou=true | 1675c/27ctl chegou=true | — |
| `student/horarios` | 644c/3ctl chegou=true | 645c/3ctl chegou=true | — |
| `student/jogos` | 467c/10ctl chegou=true | 467c/10ctl chegou=true | — |
| `student/jogos-escolares` | 11165c/69ctl chegou=true | 45150c/68ctl chegou=true | — |
| `student/videos-aprender` | 11165c/69ctl chegou=true | 45150c/68ctl chegou=true | — |
| `student/comunicados` | 36c/0ctl chegou=true | 36c/0ctl chegou=true | 36c/0ctl chegou=true |
| `student/biblioteca` | 39689c/269ctl chegou=true | 40437c/294ctl chegou=true | — |
| `student/boletim` | 183c/0ctl chegou=true | 183c/0ctl chegou=true | — |
| `student/resultados-aprendizagem` | 439c/2ctl chegou=true | 1780c/18ctl chegou=true | — |
| `parent/inicio` | 1265c/69ctl chegou=false | 1162c/71ctl chegou=true | 1193c/68ctl chegou=true |
| `parent/aprender` | 1032c/7ctl chegou=true | 279c/6ctl chegou=true | 279c/6ctl chegou=true |
| `parent/evoluir` | 1021c/4ctl chegou=true | 270c/4ctl chegou=true | 270c/4ctl chegou=true |
| `parent/escola` | 723c/14ctl chegou=true | 306c/6ctl chegou=true | 306c/6ctl chegou=true |
| `parent/meu-espaco` | 223c/0ctl chegou=true | 332c/8ctl chegou=true | 332c/8ctl chegou=true |
| `parent/notificacoes` | 400c/3ctl chegou=true | 400c/3ctl chegou=true | — |
| `parent/conteudos` | 1319c/18ctl chegou=true | 1319c/18ctl chegou=true | — |
| `parent/escola-historia` | 11165c/69ctl chegou=true | 1162c/71ctl chegou=true | — |
| `parent/notas` | 11165c/69ctl chegou=true | 1162c/71ctl chegou=true | — |
| `parent/agenda` | 173c/1ctl chegou=true | 1162c/71ctl chegou=true | — |
| `parent/atividades` | 1695c/26ctl chegou=true | 1675c/27ctl chegou=true | — |
| `parent/comunicados` | 10800c/63ctl chegou=true | 1127c/72ctl chegou=true | — |
| `parent/secretaria` | 1265c/69ctl chegou=false | 181c/0ctl chegou=true | — |
| `parent/ocorrencias` | 1265c/69ctl chegou=false | 1162c/77ctl chegou=true | — |
| `parent/coordenacao-chat` | 1265c/69ctl chegou=false | 1162c/77ctl chegou=true | — |
| `parent/jogos-escolares` | 11166c/69ctl chegou=true | 1162c/71ctl chegou=true | — |

### H.4 O teto de 30 s da reentrada, medido como aluno de verdade

Chaves do diário, para não ler sensor como tela: `estado_chegada` é o estado do espaço do aluno **na chegada**, `aluno.depois` é o mesmo estado **depois** do segundo `navigate()`, e `aluno.contador_mutacoes_4s` é o contador de mutações (não é estado). A reentrada só é testada em `student/meu-espaco`; nas outras telas o campo `reentrada` é nulo porque o probe não navegou.
- `student/inicio` — chegada `{"installed":false,"loading":true,"loadedFor":"","tentouEm":0}`; reentrada não testada nesta tela; mutações em 4 s: 135
- `student/meu-espaco` — chegada `{"installed":false,"loading":false,"loadedFor":"","tentouEm":0}`; após `navigate('meu-espaco')` imediato `{"installed":false,"loading":false,"loadedFor":"","tentouEm":0}` → **não coalesceu: `navigate()` lançou `RangeError` — `Maximum call stack size exceeded`** (recursão `BFRPlatform.open` → `open()` → `syncNavigation` → `navigateToSection` → `open`; a embrulhada está em `index.html:19089` e o `syncNavigation` que ela mesma dispara está em `index.html:19075`); mutações em 4 s: 21

### H.5 O que a passada no ar abriu como frente nova

1. **Identidade, não rota.** 4 tela(s) que a passada da auditoria (conta developer + seletor) registrou como "não saiu de `inicio`" chegaram normalmente com a **conta real de aluno**: `student/aprender`, `student/evoluir`, `student/escola`, `student/meu-espaco`. Isso estreita a tarefa #39: o sintoma é o guard do módulo de plataforma lendo o papel da conta, e a tela em si funciona.
2. **Responsável sem filho, no ar:** 4 visita(s) de `parent` não chegaram (`inicio` view=student desistiu=true, `secretaria` view=student desistiu=true, `ocorrencias` view=student desistiu=true, `coordenacao-chat` view=student desistiu=true), com o painel de 1265c em todas. A conta sintética de responsável tem zero filhos em `guardian_students`, então isto continua sendo o caso sem dado real — não é prova de defeito de tela, é ausência de cenário.
3. **Reentrada do espaço do aluno arrebenta a pilha** *(este item é o achado no shell v33; a correção está publicada e re-medida em H.6)*: 1 de 1 tentativa(s) de `navigate('meu-espaco')` imediato lançou `RangeError` — `Maximum call stack size exceeded`. O caminho está no arquivo: `index.html:19089` embrulha `BFRPlatform.open` e chama `open()`, que em `index.html:19075` chama `syncNavigation('meu-espaco')`, que volta a `open`. O diário tem 1 entrada(s) de tentativa de reentrada; a corrida anterior do mesmo probe, sem o `try/catch` do lado da página, morreu no mesmo `RangeError` e deixou o diário com uma linha só — que é o formato de "não medido", não de "medido e limpo".

### H.6 O segundo deploy no ar (`76cc8f58`) e a passada por cima dos patches #53, #55 e #48

Publicado com OK explícito, na mesma ordem da primeira vez: bump, deploy, conferência por fora, passada de navegador. `bump-versoes-publicacao.mjs` → `audit-bump-versoes.json`: `CACHE` `bfr-conecta-v33` → `bfr-conecta-v34` e `?v=` `?v=11` → `?v=12`, checagens 8/8 verdes, portão "nenhuma medição viva no harness" = true (livre). `confere-publicacao.mjs` → `audit-publicacao.json`: **3330710** caracteres no ar contra 3330710 do local, `identico_ao_local: true`, `CACHE` lido no ar = `bfr-conecta-v34`, 14 rotas em 200 (reconferidas agora por `verify-deploy.js`), 6/6 marcas das edições presentes. `confere-versao-no-ar.mjs` → `audit-versao-no-ar.json`: a versão no ar é `76cc8f58` (criada 09:18 UTC) e a anterior `004077c9` — é o par v33 → v34, lido do `deployments list` do wrangler, não da memória do deploy.

1. **#53 — a reentrada do espaço do aluno no shell novo.** `probe-hunks-publicado.mjs` com a conta sintética de **aluno** (`bfr-audit-session-student-live.json`) em 2 tela(s) @390: 1 tentativa(s) de `navigate('meu-espaco')` imediato, **0 exceção(ões)**. O mesmo probe no shell `bfr-conecta-v33` (`audit-publicado-hunks-aluno.json`) lançou `RangeError` — `Maximum call stack size exceeded` na mesma tela. Leitura honesta do resultado novo: a `depois` do estado é idêntica à `chegada` (mesmo `tentouEm`), mas o estado lido é o **vazio** (`installed:false, loading:false, tentouEm:0`, campo `hoje` do estado = `12456`) — cai o `RangeError`, **não** se prova aqui que a segunda naveração recarrega o espaço; isso continua medido no harness local (`audit-reentrada-aluno-53-depois-local.json`).
2. **#55 — destaque da barra de baixo, no ar.** Varredura `audit-sweep-publicado-55.json`: 87 visitas @390 no endereço público, caches `bfr-conecta-v34` (ou seja: o navegador executou o shell novo), 0 trava(s), 0 presa(s) no login. **A contagem por linha, porém, não é comparável ao antes/depois local**: `navVisiveis` vem **vazio** em 75 de 87 visitas, e o contador (`conta-menu-baixo.mjs` → `audit-menu-baixo-publicado.json`) classifica 87 linhas como ok 8 · SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA 36 · rota fora da barra (sem item a destacar) 39 · DESTACA_OUTRA_ROTA_DA_BARRA 4. Das 12 em que o sensor viu item, 8 destacavam a rota pedida. Sobre isso pesa a armadilha 32 (`?role=` não troca a conta): as 10 visitas de `audit-sonda-destaque-ar-55.json` rodam com a sessão `developer` e a barra medida é sempre a do `developer` (`monitor/inicio` e `sports_operator/jogos-escolares` com `nBarra=0`), enquanto as 8 de `audit-sonda-destaque-ar-55-aluno.json` têm `roleReal=student` e aí a barra é a do aluno com 5 itens e **4/4** rotas próprias destacadas corretamente (`inicio, boletim, agenda, jogos`). O delta do patch continua sendo o medido no MESMO conjunto de pares local (86 pares: antes ok 11, DESTACA_OUTRA_ROTA_DA_BARRA 50, destaque fora da barra 7, SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA 18 → depois ok 9, SEM_DESTAQUE_E_A_ROTA_ESTA_NA_BARRA 34, rota fora da barra (sem item a destacar) 37, DESTACA_OUTRA_ROTA_DA_BARRA 6); o que a passada no ar acrescenta é a confirmação de que o script `?v=12` é o que roda no público, e não número novo de destaque.
3. **#48 — o `sports_operator` ganhou painel.** Candidata aplicada localmente (`audit-candidata-operador-painel-48b.json`): delta 75 caracteres, checagens 8/8, reversão em `index.html.bak-operador-48b`. Antes (`audit-sonda-operador-48-antes.json`) as 5 rotas do papel mediam `view=admin/coordinator` com o despejo da admin (`154302c`); depois, no harness (`audit-sonda-operador-48-depois-local.json`) cada uma tem painel próprio: inicio schoolGamesView=1867c · jogos-escolares schoolGamesView=1854c · notificacoes bfrNotificationsView=1161c · conteudos bfrContentHubView=2080c · coordenacao schoolGamesView=1867c. No ar, as 4 visitas de `sports_operator` em `audit-sweep-publicado-55.json` medem inicio 1854c (view=admin) · notificacoes 1161c (view=sports_operator) · conteudos 2080c (view=sports_operator) · jogos-escolares 1854c (view=sports_operator) — contra as 4 visitas do mesmo papel no shell `v33` (`audit-sweep-publicado.json`), todas com `viewReal=admin` e painel `inicio 151c, notificacoes 400c, conteudos 1319c, jogos-escolares 153581c`: `jogos-escolares` media o despejo da view admin inteira. **O que continua sem prova:** não existe conta com o papel no banco (`contas_com_papel=0` em `audit-lote2-confere.json`), então `?role=sports_operator` é só o seletor de view; `audit-sonda-appbar-48-aluno.json` mostra que com a sessão de aluno a rota nunca sai de `view=student` (`chegou_em=student`) e que `monitor/inicio` morre em `navigate travou`. `navVisiveis=0` nas linhas do operador é o mesmo sensor do item 2, não um menu ausente — a sonda de chrome leu `appbar=true` com 5 itens.
4. **#47 — o LOTE 2 está aplicado.** `preflight-papeis.mjs --apply` levou os dois lotes (HTTP 201 cada) e a conferência por catálogo (`sql-confere-lote2.sql` → `audit-lote2-confere.json`) lê hoje `14` rótulos no enum, o `CHECK` vivo de `profiles` com `sports_operator` incluído, `0` conta(s) com o papel e 28 perfis. A prova de que o `CHECK` aceita sem escrever em produção foi `sql-prova-lote2-rollback.sql` (`begin` → salvar o papel da conta sintética → `rollback`): `contas_com_papel_depois_do_rollback = 0` em `probe-corpos-4-funcoes.json`, i.e. o dado voltou a zero. Rodou com o portão livre (nenhum `audit-sweep2` vivo), porque `drop/add constraint` toma ACCESS EXCLUSIVE em `profiles`.

Limites desta seção: a passada com a conta real de aluno/responsável está medida (H.3), nenhum clique foi disparado (o probe e a varredura só navegam e leem, conforme a regra de não gravar dados no ambiente real); e o cache medido é o de um perfil Chrome novo, que é o caso do cliente que nunca abriu o app — um cliente com bfr-conecta-v33 já instalado só troca ao ativar o sw novo.


## I. Prova de botão a botão (#33) — 1281 linhas em 123 telas · escrita real no banco: zero
Instrumento: `audit-clicks-seguro.mjs` (candidata nova; o `audit-clicks.mjs` de 14/10 ficou intacto
para as duas passadas serem comparáveis). Clique real por hit-test de CDP em cada controle
`button,a[href],[role=button]` do painel, com **firewall de escrita instalado antes do boot do app**
(`Page.addScriptToEvaluateOnNewDocument`): `fetch`/`XHR`/`sendBeacon`/`requestSubmit` de
POST/PATCH/PUT/DELETE são barrados na página e anotados como `tentou_escrever`. O autoteste gravado no
diário (`audit-clicks-seguro-8240.jsonl + audit-clicks-seguro-8241.jsonl`) registra GET 200 e POST/DELETE barrados antes do primeiro clique.

| O que a varredura mede | Número do diário |
|---|---|
| resultados por classe | `desabilitado` 4 · `efeito` 183 · `fora_da_tela` 547 · `efeito_mut` 133 · `morto` 3 · `sumiu` 259 · `ignorado_permicao_browser` 8 · `tentou_escrever` 9 · `GRAVOU` 1 · `ignorado_escrita` 74 · `coberto_sem_clique` 33 · `ignorado_impressao` 19 · `navegou` 8 |
| escrita TENTADA e barrada pelo firewall (não saiu do navegador) | 9 |
| `GRAVOU` que é só beacon de telemetria, não escrita do app | 1 — `coordinator/comunicacao · Voltar para a Home · POST /c` |
| egresso comprovado no banco (contagem SQL antes/depois) | nenhuma das 121 tabelas mudou (linhas de hoje: profiles=2) |
| tarjados como escrita e não clicados | 78 |
| pulados por estar fora da tela | 547 — 375 com tamanho zero (escondido de verdade) e 172 com tamanho real fora da viewport, em 42 telas; 66 acima do topo, 106 abaixo da dobra) |
| sumiu antes do clique (índice perdido no re-render daquele painel) | 259 — 21% concentrados em `coordinator/conteudos` 11, `director/conteudos` 11, `secretary/conteudos` 11 |
| pulados por sobreposição | 33 |
| MORTOS (clique sem efeito em ~7 s) | 3 |
| por papel | coordinator 181, director 163, admin 297, secretary 123, aee 111, psychology 36, gatekeeper 81, monitor 12, multiprofessional 36, sports_operator 32, teacher 197, student 12 |

Alcance — (probe de alcance ainda não rodado — `node probe-fora-tela.mjs`)
**Dois defeitos do instrumento antigo, corrigidos aqui, que limitam a leitura do diário de 14/10.**
(a) Todo `<button>` **sem** atributo `type` devolve `el.type === 'submit'` por definição do HTML — 132 dos 1120 botões do `index.html` — e a regra `c.tipo === 'submit'` do `audit-clicks.mjs` tarjava como *escrita* controles de leitura. Medido no próprio `audit-clicks.jsonl` (2026-10-15, 148 linhas): dos 9 controles tarjados como *escrita*, **9 não têm verbo de escrita nenhum no rótulo** — "Ver atividades", "🔴 Pendentes 3", "⚠️ Vence hoje 1", "📅 Próximas 0", "🔎 Explorar livros" — todos com `tipo= submit` e sem atributo. Não foi o vocabulário que os pulou; foi o `type` default. A candidata só pula submit de verdade: atributo explícito, ou default com `<form>` dono. (b) A janela
de espera do "depois" era `espera(t===700?700:t===900?900:1100)`, que para o passo de 2 000 ms esperava
1 100 — 2,7 s no total, contra o teto de 6 s do loader serial da Coordenação: um botão que Carrega podia
sair `MORTO`. Agora são 5 passos somando ~6,7 s.

**Sobreposição**: 33 controles ficaram cobertos por outro nó no momento do clique — os primeiros: `Nova conversa` ← SMALL.; `+ Novo grupo` ← SELECT.; `Nova conversa` ← SMALL.; `＋ Cadastrar aluno` ← bfrMobileBottomNav; `+ Novo grupo` ← SELECT.; `Nova conversa` ← SMALL.. Aqui o instrumento tenta fechar o que cobre
(`LIMPAR`), re-mede o alvo e só então decide; quando persiste, grava `coberto_sem_clique` e **não clica**.
É a regra que veio do diário antigo, onde o alvo `student/biblioteca · "🎮 Jogar"` estava coberto por `BUTTON.lia-suggestion`, o ponto caiu naquele nó e o rastro registrou `POST https://yyzqoxlkcvqpessypfjo.supabase.co/functions/v1/lia-chat` com `1` modal aberto — o clique não ia no controle medido, ia no
que estava por cima.
Conferência SQL daquilo que o POST do `lia-chat` teria gravado: `internal_chat_messages` 0, `internal_chat_threads` 0, `internal_chat_message_reactions` 0, `aee_messages` 0, `gate_messages` 0, `secretary_request_messages` 0, `staff_message_attachments` 0, `bfr_coordination_messages` 0 (linha criada desde 2026-10-15 00:00 no filtro do próprio SQL; 8 tabelas; `probe-lia-contagens-pos-33.json (recontagem do fim da passada)`). O POST saiu do navegador e não virou linha.
Egresso: `nenhuma das 121 tabelas mudou (linhas de hoje: profiles=2)`. A palavra `GRAVOU` neste diário é reclamação do gancho de página
(`__REDE` vê o método antes do firewall barrar) — não prova que uma linha saiu do navegador. O que
prova é a contagem SQL das tabelas com `created_at`, rodada antes e depois da passada.
**9** controles clicados tentaram gravar e foram barrados dentro do navegador — é a medida de que a escrita existe naquele ponto, feita sem escrever. Lista no fim da seção.
**Limitação do instrumento**: o firewall barra todo POST, e o supabase-js chama função de LEITURA por POST — `list_current_month_birthdays` são `stable`/`immutable` no catálogo e mesmo assim foram cortadas. Nas telas onde isso acontece, o painel mostra erro de rede em vez dos dados: o que a linha mede ali é o instrumento, não o app.

MORTOS, por tela:
- `coordinator/inicio` — **Ocorrências** (`button`)
- `admin/jogos-escolares` — **— Recolher seção** (`button.bfr-collapsible-toggle`)
- `admin/administracao` — **— Recolher seção** (`button.bfr-collapsible-toggle`)

Controles que tentaram gravar e foram barrados, linha por linha:
- `coordinator/conteudos` — Limpar busca → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/rpc/li`
- `director/chat-interno` — + Nova conversa → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/intern`
- `aee/chat-interno` — + Nova conversa → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/intern`
- `psychology/chat-interno` — Atualizar dados → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/intern`
- `psychology/chat-interno` — Central → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/auth/v1/token?`
- `psychology/chat-interno` — Demandas → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/auth/v1/token?`
- `psychology/chat-interno` — Agenda → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/auth/v1/token?`
- `multiprofessional/chat-interno` — Atualizar dados → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/intern`
- `teacher/chat-interno` — + Nova conversa → `POST https://yyzqoxlkcvqpessypfjo.supabase.co/rest/v1/intern`

## J. O que o usuário vê (#34) — 127 PNGs de 127 visitas em 2 passadas
Instrumento: `fotos-telas.mjs` — navegador próprio por passada, não clica, não escreve. Navega no
harness autenticado, espera o shell `ready` e o `activeSection` baterem com a seção pedida, e captura.
A lista de telas não é escolha minha: é a união da tela de entrada de cada papel com as telas que os
diários já haviam marcado (`fotos-extras-34.json`, gerado por `gera-extras-fotos.mjs` sobre
`audit-sweep-mobile.json`, `audit-sweep-web.json` e `audit-cliques-33-resumo.json`).

| Passada | Visitas | PNGs | chegaram na seção pedida | não chegaram / não capturaram |
|---|---|---|---|---|
| @390 no harness do papel (14 entradas + as telas marcadas nos diários) | 108 | 108 | 0 | 108 |
| @390 com a conta sintética real de ALUNO (8241) | 19 | 19 | 0 | 19 |

Telas onde a foto **não** mostra o que foi pedido — cada uma já tem causa nas seções anteriores; a foto serve para não discutir abstração:
- `student/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `parent/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `teacher/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `coordinator/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `director/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `monitor/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `gatekeeper/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `psychology/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `social_work/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `sports_operator/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `developer/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `admin/inicio` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/aee` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/atividades` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/chat-interno` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/comunicados` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/conteudos` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/escola-historia` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/horarios` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/jogos-escolares` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/meu-espaco` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `aee/notificacoes` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `parent/atividades` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/chat-interno` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/comunicacao` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/comunicados` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/conteudos` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/coordenacao-chat` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/escola-historia` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/fotos` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/jogos-escolares` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/notificacoes` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `secretary/secretaria` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `student/aprender` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `student/atividades` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `student/biblioteca` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `student/boletim` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
- `student/comunicados` (@390 no harness do papel (14 entradas + as telas marcadas nos diários)) → ativa: `null`, sem barra de baixo
… e mais 87 nos manifests.

## K. O papel que não tinha conta — `sports_operator` com sessão real (#58)

O banco não tinha **nenhuma** conta com o papel: 12 papéis com conta em
`_sql-contas-por-papel.sql` (contagem só de leitura, 15/10), e `sports_operator` não é um deles — soma de
`contas` = 28. Enquanto isso, toda medida
da view do operador nesta auditoria veio de `?role=sports_operator` no harness, que troca a **view** mas
deixa a **sessão** sendo outra conta (armadilhas 1 e 32 do rig): o que o app decide por `profile.role` —
guard de módulo, `quickRoutes[role()]` da barra de baixo — nunca foi exercido por esse papel.

* **Conta criada e conferida:** `sports_operator` com
  1 conta(s) em `profiles`
  (`audit-contas-pos-58.json`, o mesmo SQL de leitura depois da escrita). Reversão:
  `node apaga-conta-sintetica.mjs sports_operator`, que só apaga id presente no manifesto
  `bfr-audit-contas.json`.
* **Varredura @390 com a sessão real:** 4 visitas em `audit-sweep-operador.json` — 3
  chegaram na seção pedida, 4 com painel de altura > 0, 0 com trava de
  renderer, 0 caindo na tela de login (= sessão errado,
  medir isso seria medir outra conta).
  Views realmente montadas: `sports_operator`.
* **Fotos:** 1 PNGs de 1 visitas @390px em `fotos-operador-390/`.


## L. A aba do Professor e o lançamento por bimestre e categoria (brief de 21/10)

Fonte desta seção, toda medida e nada deduzido: `ar-implantado-v52.html` (md5
`554c3120b93ac8c6c9a96e9736d124d2`, 3.391.593 bytes = o `/` do ar conferido por HTTP na hora),
`rp-v52.js` (md5 `a2cacc7e00986b2e87fcaae3cbce4faa` = o `bfr-responsive-presentation.js?v=13` do ar) e
o catálogo do banco `yyzqoxlkcvqpessypfjo` (PostgreSQL 17.6) lido pelo canal de SQL **só com SELECT** —
diário `sonda-notas-catalogo.json`, 14 consultas. As linhas citadas são linhas desse ficheiro do ar.
O vídeo de referência do brief **não chegou** como ficheiro nesta rodada; a interface foi auditada pelos
bytes publicados, que são a mesma coisa que o vídeo mostraria, com a vantagem de ter número de linha.

### 37.1 O que já existe e funciona — preservar

* **O módulo que manda na aba é `bfr-professor-secure.js`**, bloco #55, aberto na linha :16077 com
  `type="text/plain" data-bfr-auth-deferred`. Dos 103 blocos de `<script>` do ar, 99 rodam (convertidos
  pelo bootstrap por `data-bfr-core` / `data-bfr-auth-deferred` / `data-bfr-deferred`) e 4 não. O censo
  está em `inventario-notas-v52.json`.
* **Já há tela de notas** (`data-teacher-screen="avaliacoes"`, :4403) com o botão `#teacherOpenGrade`
  "+ Lançar nota", e **já há lançamento com autorização no cliente**: :17430 valida aluno escopado
  (`authorizedStudent`), disciplina da turma (`subjectAllowed`), nota 0–10 e bimestre inteiro 1–4 antes
  de gravar; :17441 insere `{student_id, subject, assessment, score, term, entered_by}`.
* **Já há correção com rastro**: :16737 trava componente/avaliação/bimestre e só deixa mudar o valor, e a
  trilha `bfr_grade_audit` (colunas `grade_id, assessment, term, old_score, new_score, changed_by, reason`)
  existe com policy de INSERT `changed_by = auth.uid()` + escopo + `length(trim(reason)) >= 8`. Ou seja, o
  item 4 do brief ("histórico com usuário, data e valores anterior e posterior") **já está pago no banco** —
  é reutilizar, não construir.
* **Não há UPDATE direto possível**: `grades` ficou sem nenhuma policy de UPDATE (medido em 13/10 e
  reconfirmado hoje: as 6 policies são 2×SELECT, 1×INSERT-`a`, 1×DELETE-`d`, e as duas da auditoria).
* **Boletim do responsável já existe** (:9947-9968): tabela `Componente | 1º bim | 2º bim | 3º bim | 4º bim |
  Média`, com `—` quando não há lançamento (`gradeDisplay(null)`) e "Nenhuma nota lançada pela escola." /
  "A escola ainda não lançou notas" (:10037). Logo, "campo vazio não é zero" **já vale hoje**; o defeito é outro (§37.2.1).
* **Validação no servidor já cobre a escala**: `grades_score_check` (0–10) e `grades_term_bimestre_check`
  + `grades_term_check` (1–4), FK `student_id`→`students`, FK `entered_by`→`profiles`, e o trigger
  `bfr_prevent_duplicate_grade` (BEFORE INSERT OR UPDATE, `tgtype` 23) que casa
  (student, subject, assessment, term) — que é exatamente a chave do lançamento por categoria.
* **Relatórios por bimestre já existem** (:16192, CSV + imprimir, filtro `data-bfr-report-term` 1–4).

### 37.2 O que o brief pede e não existe — com a prova

1. **As quatro categorias não existem no dado nem na interface.** `grep -o '\bpeso\b'` no ar = **0**.
   `assessment` dos 112 lançamentos reais = **`'NOTA GERAL'` em 100% dos casos** (SQL: 112 lançamentos,
   1 rótulo distinto), repartidos por `term` 1 (61), 2 (40), 3 (11), e **uma única disciplina em uso:
   `História`**. O campo "Nome da avaliação" (:16712) é texto livre, então a tela permite a categoria,
   mas nada a impõe nem a discrimina: o boletim :9966 **faz a média aritmética de tudo o que existir no
   bimestre** e a tabela de lançamento (:17281) mostra `História: 8,5 · História: 7,0` sem dizer o que é quê.
2. **Não há lançamento em lote.** Os dois únicos INSERT de `grades` no ar inteiro (:7346 e :17441) são
   `.single()`, um aluno por formulário, modal a modal. Não existe salvar vários, navegar Enter-a-Enter
   entre células, nem rascunho.
3. **Não há regra de média configurável.** A única "regra" é `window.BFR_SCHOOL_CRITERIA` na **linha 12 do
   HTML**, hardcoded `{ minFrequency: 85, minCoverage: 30, minAverage: 6 }`, usada em 8 sítios como
   *nota de corte de alerta* (:16889, :4702, :25588…), nunca como pesos de composição. No catálogo não há
   tabela de regra: `tabelas_de_config` devolve só `learning_indicator_settings` (1 linha, faixas de
   indicador, **com `school_year`, `updated_by` e `updated_at`**) e `student_avatar_configs`. Essa é a
   forma a imitar, não a reusar.
4. **Não existe estado rascunho/salvo/publicado para nota.** `grades` tem 8 colunas e nenhuma de status,
   `updated_at` ou `published_at`. Os precedentes de publicação no banco são `bfr_schedule_versions.status`
   (`'published'`, usado por `bfr_teacher_can_manage_student`) e a booleana `school_documents.published`.
   Criar um segundo mecanismo seria o que o brief proíbe; a decisão é do dono (§37.4).
5. **"Não se aplica" não tem onde viver.** `grades.score` é `NOT NULL` com CHECK 0–10: não há
   representação honesta para "categoria não se aplica" sem uma coluna/tabela de regra. Fictício seria
   inventar um score. Fica pendente e casado com o item 3 (a regra diria quais categorias aplicam).
6. **Identificação da avaliação está incompleta.** Não há coluna de data, de valor máximo nem de
   observação pedagógica em `grades`. `learning_assessments` (title, `assessment_type`, source,
   `applied_on`, class_id, subject_name, total_questions) e `learning_assessment_results`
   (correct/total/percent) **existem mas têm 0 linhas** e modelam avaliação diagnóstica por habilidade —
   são outro objeto, e ligar o bimestre a elas seria segundo mecanismo errado.
7. **No celular, o lançamento está escondido.** A barra de baixo do professor em
   `rp-v52.js` é `teacher:['professor-inicio','professor-turmas','professor-frequencia','professor-agenda']`
   — **4 itens, e "Notas/Avaliações" não é um deles**; fica a dois toques, no ⋯. Já a tabela
   `#academicTable` é convertida em cartões por CSS (:2156-2163, `td::before{content:attr(data-label)}`),
   então o padrão de mobile existe e é aproveitável.
8. **Nada avisa sobre edição não salva.** `beforeunload` aparece **1 vez no ficheiro inteiro** e não é da
   trilha de notas. Trocar de bimestre/aluno/tela com valor digitado e não gravado perde o valor calado.
9. **Ano letivo, transferência e ingresso não são representáveis.** `students` tem 6 colunas
   (`id, official_name, observation, class_id, active, created_at`) — sem ano de ingresso, sem turma
   anterior; `grades` não tem `school_year` nenhum. Hoje um aluno que mudou de turma ou repetiu o ano
   tem as notas de anos diferentes misturadas no mesmo boletim. Isso é decisão de esquema (§37.4), não de tela.
10. **Disciplina é texto livre sem FK.** `bfr_subjects` tem 11 nomes (e um lixo: `Componente não
    identificado`), `grades.subject` não tem FK nenhuma; o select da tela nasce das disciplinas já
    lançadas, então disciplina sem lançamento não aparece para o professor lançar a primeira nota.
11. **Casas decimais não travam no servidor.** `score numeric` sem scale: o banco aceita `8.567` hoje; o
    cliente oferece `step="0.1"`. E há **dois CHECK idênticos** em `term` (`grades_term_check` e
    `grades_term_bimestre_check`) — cosmético, mas é a prova de que a escala precisa de decisão explícita.

### 37.3 Por que os 14 testes do brief §8 ainda não podem rodar

* Contas sintéticas vivas no manifesto `bfr-audit-contas.json` (21/10): `developer`, `student`,
  `coordinator`, `sports_operator`. **Nenhuma `pedagogical`, nenhuma `parent`.** O módulo seguro só executa
  com `profile()?.role === 'pedagogical'` (guard em :16077+), e o guard lê o papel **real** da conta
  (armadilha 32). As linhas `papel:"teacher"` de `audit-sweep-publicado.json` têm `alvo:null` em todas as
  seções `professor-*` — mediram a tela de fallback com sessão de outra conta, não a aba do Professor.
* A escola tem **1 conta `pedagogical`** (`_contas-por-papel.json`, e a única ficha do diretório com
  perfil vinculado); eu não tenho nem vou inventar credencial dela.
* Para lançar nota de teste sem tocar em dado de aluno é preciso escrever em produção: (a) conta
  `pedagogical` sintética, (b) **uma linha em `bfr_teacher_class_subjects`** ligando-a a uma turma e
  disciplina — é exatamente isso que `bfr_pedagogical_can_manage_student` consulta, e sem ela a policy de
  INSERT barra; (c) um aluno em `students` marcado como de teste. Os três são reversíveis (apagar linha +
  apagar conta pelo manifesto), mas são escritas: **pedem OK novo**.
* O que dá para provar **sem** escrever: a camada de banco inteira, pelo ensaio `begin; <DDL>; set local
  role authenticated; set_config('request.jwt.claim.sub', …); <medição>; rollback;` com conferência de
  `count(*)`+`md5(string_agg(...))` antes e depois (método validado em 13/10), e o `PATCH` direto que deve
  continuar casando 0 linhas.

### 37.4 O que a direção precisa definir antes de qualquer média aparecer na tela

1. Os **pesos** de Comportamento e participação / Atividades / Prova / Trabalho por bimestre — ou a
   média aritmética explícita. Enquanto isso não existir, a interface mostra média **provisória rotulada
   como não definitiva**, nunca um número sem dono.
2. Se **composição entra na nota acadêmica** ou é registro apartado (o brief proíbe punição arbitrária).
3. Casas decimais admitidas e o que acontece com 3 lançamentos na mesma categoria no mesmo bimestre
   (o trigger atual **não permite** dois lançamentos com o mesmo rótulo — ou se usa rótulo distinto por
   atividade, ou a regra precisa de sub-avaliações).
4. Nota mínima para a escola (o valor 6 hoje é só corte de alerta do app).
5. Se existe **publicação por bimestre** e quem publica — decisão que define se `grades` ganha coluna de estado.
6. Categoria "não se aplica" existe como regra institucional? Se sim, é a regra que diz, não o professor.

### 37.5 Candidata de banco: a regra da escola, e o portão que não deixa média nascer sozinha

Arquivo `migration-bfr-grading-rules-candidata.sql` (21/10). **Não aplicado** — cada fase foi
ensaiada com `begin; <DDL>; <medição>; rollback;` pelo canal de gestão; o diário é
`sda-notas-dryrun.json` (10 fases, 201 em todas). O que a candidata é, e o que o ensaio mediu:

* **`public.bfr_grading_rules`** — uma linha por (school_year, subject, category), com
  `applies`, `weight` (0..100), `max_score` (≤ 10, porque o CHECK vivo de `grades.score` é
  0..10), `decimals`, `min_passing` **nulo por default** e `updated_by -> profiles` com
  `on delete set null`. A chave é `school_year`, medido: `bfr_schedule_versions` tem **1**
  versão, `school_year=2026`, `status='published'`, 594 aulas. `classes.year` (6..9) é o ano
  **escolar do aluno**, não o ano-calendário, e por isso não serve de chave.
* **`category` entra em `grades` como coluna nova, nula, com CHECK das quatro**; as 112 linhas
  reais ficam `null` = "não classificado" e **nada é reescrito**. O gatilho
  `bfr_prevent_duplicate_grade` (student, subject, assessment, term) **não foi tocado**: cada
  categoria escreve o seu próprio `assessment`, então continuar uma linha por instrumento por
  bimestre e as linhas atuais continuam válidas.
* **A média passa a ser conta do servidor**: `bfr_term_average`, `bfr_boletim_componente`,
  `bfr_grading_rules_for`, `bfr_grading_rule_complete`, `bfr_term_unclassified`,
  `bfr_current_school_year`. Todas **SECURITY INVOKER** com `search_path='public'`, de
  propósito: é o que faz o RLS de `grades` valer por dentro da função. Grants com
  `revoke ... from public, anon` antes do `grant ... to authenticated` (armadilha de 13/10).
* **Tabela de regra imita o precedente da casa** (`learning_indicator_settings`): leitura
  aberta a `authenticated` (dado institucional, não pessoal — a família precisa ver a regra no
  boletim), escrita só com `bfr_learning_is_manager()` = coordinator|director|developer, e
  `WITH CHECK` exigindo `updated_by = auth.uid()`, que é a trilha de quem definiu a regra.
* **O portão, medido.** Sem regra: `regra_completa=false`, `bfr_term_average=null` e as 16
  células do boletim em `sem_regra`. Regra com 3 categorias: `false` ("faltam categorias").
  Regra completa com pesos 10/20/50/20 e nada lançado: `true` e **média ainda `null`**, 16
  células `aguardando_lancamento` — ausência de nota não virou zero. Pesos 10/20/50/10 (não
  fecham 100): `false`, média `null`. Categoria com `applies=false`: 4 células
  `nao_se_aplica`, `weight` 0, e a regra segue completa.
* **Aritmética provada com linhas de ensaio** (aluno sintético criado dentro da transação,
  desfeito no rollback; nenhum aluno real usado): pesos 10/20/50/20, comportamento 10,
  atividades 6, **dois instrumentos** em prova (7 e 8 → 7,5), trabalho 9, mais uma linha
  legada sem categoria. `bfr_term_average` = **7.8** = `(10·10 + 20·6 + 50·7,5 + 20·9)/100`
  arredondado a 1 decimal, e `bfr_term_unclassified` = 1 — o legado fica visível como
  pendência e **fora** da conta. Bimestre sem lançamento: `aguardando_lancamento`, média `null`.
* **Vazamento entre famílias procurado e não encontrado.** Com `set local role authenticated`
  e a conta de um responsável real (4e15b3ad…, aluno a694eaf4…, 3 lançamentos): as 3 notas
  próprias são visíveis por dentro do RPC, `bfr_boletim_componente` de **outro** aluno devolve
  as 16 células com `launches = 0` em todas, e `bfr_term_unclassified` do outro aluno = 0.
  Sem erro, sem voo, sem nota alheia — o `SECURITY INVOKER` fez o `grades_family_read` trabalhar.
* **Conferência de que nada ficou:** depois do rollback, `to_regclass('bfr_grading_rules')` =
  nada, funções novas = 0, coluna `category` = 0, `grades` = **112** linhas com md5
  `80e20e7fa7ac61ca30247ee0279e0554` e `students` = **848** com md5
  `752878ecd38128dc54edb9b61aab3cfa` — os mesmos selos medidos antes de qualquer fase.

### 37.6 Candidata de interface e o teste que não precisou de navegador

`gera-candidata-notas-v53.mjs` lê `ar-implantado-v52.html`, aplica **13 hunks de casamento-exato**
(cada um precisa casar 1 vez, senão o gerador aborta sem escrever) e escreve
`ar-candidato-v53-notas.html` — os bytes vivos não são tocados. Portão de sintaxe: o bloco #55
inteiro (118.446 caracteres) continua parseando em `new Function`. Saída: +15.094 bytes,
diário `candidata-notas-v53.json`.

A tela nova é uma **aba injetada em runtime** dentro do módulo que já é o último pintor do
`#academicTable` (precedente: a aba Acompanhamento, `:16653`), e não uma segunda máquina no mesmo
nó. Corpo da grade: aluno × 4 categorias; célula editável **só onde ainda não há lançamento** —
onde já existe nota fica o pill "Corrigir", que exige motivo e deixa o valor anterior em
`bfr_grade_audit`; rascunho por célula em `secure.gradeDraft`; aviso "N edição(ões) ainda não
salvas" + `beforeunload` condicionado a rascunho; salvar em lote com validação de escala, casas
decimais da regra e escopo de aluno **antes** de qualquer envio; e o texto honesto quando falta
disciplina, bimestre ou regra.

O teste de lógica (`sda-notas-logica.mjs`, **32/32** em `sda-notas-logica.json`) extrai o trecho
novo do candidato e exercita regra, média, escala, lote e o HTML gerado com stubs — sem navegador.
Ele provou de passagem que um rascunho do bimestre errado não viaja no lote, e pegou um bug de
instrumento (o stub sem `.select()` fazia o caminho de sucesso cair na mensagem de falha).

**O que continua não testado:** render e clique da aba. Precisam de sessão `pedagogical`
(armadilha 32) e da tabela aplicada — os dois, escritas em produção com OK. O relatório de 10 itens
do brief está em `relatorio-notas-professor-21-10.md`.

### 37.7 Estado desta frente

**APLICADO 21/10 com OK** — a candidata de banco (`migration-bfr-grading-rules-candidata.sql`,
md5 `ce9e7abbffc41d535251d40038c7170d`) foi executada por `aplica-notas-ddl.mjs --apply` em uma
única transação com `set local lock_timeout = '20s'`, seguida de `notify pgrst, 'reload schema'`
(201). A de interface **foi publicada no mesmo dia, depois desta linha** — pelo OK "Aplica a 182":
`/` passou de `3.391.593`/`554c3120b93ac8c6c9a96e9736d124d2` (v52) para **`3.408.900` bytes md5
`f08374b1258064a82d8503d08bff37e9`** com `CACHE='bfr-conecta-v53'` — portões, deploy e prova de
navegador em §37.16 e no item 38 da seção F.

Criados no catálogo: `bfr_grading_rules` (2 policies, trigger `bfr_grading_rules_touch_updated_at`,
**0 linhas**), `grades.category` (nullable + CHECK de 4 valores + índice
`grades_student_subject_term_category_idx`) e 6 funções com `prosecdef=false` e `proacl` só em
`postgres`/`authenticated`/`service_role`.

Dado intacto, medido na mesma chamada antes e depois: `grades` 112 linhas com
`md5(string_agg(g.id::text,'' order by g.id))` = `44d917a12af23c8d7072bc4331aea2b8`, `md5` das **8
colunas originais por linha** = `80e20e7fa7ac61ca30247ee0279e0554`, `students` 848 /
`5964c75a7579803e8f222f0b4d725035`, policies de `grades` 4, `bfr_prevent_duplicate_grade` 1,
`bfr_grade_audit` 0. **Armadilha nova paga:** o selo tem de declarar as 8 colunas originais; com
`g::text` a coluna recém-criada entra na conta e o selo muda sem que nada tenha sido escrito —
falso positivo de "escreveu".

Provas pelo caminho real, todas em `begin; …; rollback;` (`prova-notas-pos-aplicacao.mjs`,
`prova-notas-media-live.mjs`, `prova-notas-rest.mjs` + diários `.json`/`.log`):

* sem sessão: 401/`42501` nas 6 RPCs e 401/`42501 permission denied for table` em
  `bfr_grading_rules`; `GET /grades?select=category` anon dá 200 `[]` — a coluna está no cache do
  PostgREST e o RLS nega linha a linha;
* com sessão autenticada: `2026`, `rule_complete=false`, `rules_for=[]`, `term_average=**null**`,
  `unclassified=1`, `boletim_componente` 16 linhas `sem_regra`, `GET /grades?category=is.null` 200;
* responsável dentro do RLS: 3 notas próprias, 16 células `sem_regra`, **0 lançamentos** e média
  `NULL` no aluno de outra família;
* escrita: responsável → `42501`; gerente com `updated_by` de terceiro → `42501`; gerente com o
  próprio uid → passa;
* aritmética com pesos fechando 100: **7,7** e **7,4**, os dois iguais à conta feita à mão, com
  dois instrumentos agregados na mesma categoria e uma casa `nao_se_aplica`; pesos 40/30/20 com uma
  casa fora (soma 90) → `regra_completa=false` e média `NULL`;
* legado: regra completa em `História` sobre as 112 linhas sem categoria → média `NULL` e
  `unclassified=1` visível.

Nenhum número apareceu para aluno ou família, e é assim mesmo: `bfr_grading_rules` está vazia até
a Direção cadastrar os pesos. Reversão escrita **antes** de aplicar em
`rollback-bfr-grading-rules-candidata.sql`, que recusa desfazer se já houver regra cadastrada ou
lançamento com categoria. Regressão no ar descartada por leitura: as 24 chamadas a `from('grades')`
no HTML publicado usam lista de colunas explícita, nenhuma `select('*')`.

Resta, cada item com o próprio OK: publicar a tela (v53, com a barra mobile em `rp.js`), mintar
conta `pedagogical` + vínculo em `bfr_teacher_class_subjects` + aluno de ensaio, e só então rodar os
14 cenários do brief — que até ontem não tinham chão; hoje o chão existe, falta a sessão do papel.

### 37.8 Ensaio da v53 no harness local — render, clique e caminho de gravação, com 0 escritas

Medido em 21/10 (11:00–12:00 UTC) com `audit-harness-notas.mjs` na porta 8262 servindo
**`ar-candidato-v53-notas.html`** (3.406.687 bytes em disco, 3.389.306 caracteres lidos, 3.410.494
bytes no fio depois de injetar o gancho) e `FIREWALL_LEITURA` montado por
`Page.addScriptToEvaluateOnNewDocument` antes de qualquer script da página. Rota
`?role=teacher&open=professor-frequencia&fx=<braço>`. Nada foi publicado; nenhuma linha foi escrita
no banco (as escritas aparecem no diário como **barradas**, não como executadas).
Diários: `ensaio-v53-notas.json`/`.log` (bandas A–F, @1280 e @390), `sonda-reset-disciplina.json`,
`sonda-regra-parcial.json` (braços G e H), `sonda-correcao-nota.json`, `sonda-clamp-nota.json`,
`sql-validacao-servidor-notas.txt`, capturas `ensaio-v53-*.png`.

**Funcional, provado por clique no candidato:** grade aluno × 4 categorias com o peso no cabeçalho
(`Prova · 40%`); célula editável **só** onde não há lançamento, e onde há lançamento o pill
`Corrigir <instrumento>`; `2 instrumentos` quando há duas provas na mesma categoria; média retida
até fecharem as categorias ("Aguardando: 1 de 4"); média ponderada **7,3** =
0,1·9 + 0,3·7 + 0,4·7 + 0,2·7,5, igual à conta feita à mão, tanto @1280 como @390; sem regra
cadastrada a tela diz "A escola ainda não definiu a regra deste componente. Nenhuma média é
apresentada." com **0** células editáveis (braço B, tabela real vazia — a média não nasce sozinha);
escala e casas são recusadas **antes** de qualquer envio (12 e 7,25 não geraram POST); nota válida
gera o `POST /rest/v1/grades?columns=…` real, que o firewall barra e a tela confessa;
"Descartar edições" limpa o rascunho; as abas Notas (legado) e Frequência seguem intactas; @390 as
células dão 146×44 e não há estouro horizontal.

**Correção com histórico, medida nesta passada** (exigiu consertar o mock — armadilhas 146 e 147):
o clique em `Corrigir Comportamento · 1º bimestre` abre o formulário com componente, avaliação e
bimestre travados, o valor anterior no campo (`9`, `min=0 max=10 step=0.1`) e o histórico vindo de
`bfr_grade_audit` renderizado ("4,0 → 7,0 · 10/06/2026, 11:05", "7,0 → 8,0 · …"). As guardas
rejeitam, **sem POST**, motivo de 6 caracteres ("Informe o motivo da correção com pelo menos 8
caracteres.") e valor igual ao registrado. Com motivo longo e valor novo, o app **tenta**
`POST /rest/v1/rpc/bfr_correct_grade` — barrado — e a tela diz
"A correção não foi confirmada (…BFR-AUDIT: POST barrado pelo firewall do teste). A nota continua
com o valor anterior — confira a lista antes de tentar de novo." Ou seja: o caminho de gravação da
correção é RPC `SECURITY DEFINER` com trilha; o do lançamento em lote é REST direto sob RLS +
CHECKs (`grades_score_check`, `grades_category_check`, `grades_staff_insert` com
`bfr_staff_can_manage_student_scope` e `entered_by = auth.uid()`, trigger
`bfr_prevent_duplicate_grade`), medidos no catálogo em `sql-validacao-servidor-notas.txt`.

**Defeitos abertos, com causa** (nenhum corrigido — a passada era de ensaio):

1. **Filtro de disciplina/bimestre inerte.** Causa provada por espião do setter de `.value` com
   pilha: `secureAcademicSetup()` chama `ensureUi()` **antes** de ler o `<select>`, e `ensureUi()`
   re-hidrata o `<select>` a partir do estado velho (`hydrateAcademicScope` `:2020104` força
   `value='all'` quando o estado ainda está vazio). `handleChange` `:2050871` nunca escreve o valor
   no estado — só re-rodinha o setup. A mesma função tem corpo idêntico no `index.html` publicado
   (offset 2043828), então **é defeito do ar, pré-existente à v53**, e bloqueante: sem filtro, a
   grade só aparece por atalho de estado.
2. **Barra de controles `[hidden]` aparece na tela.** `[data-bfr-grade-controls]` mede
   `hidden:true` e `visivel:true` porque `#teacherView .bfr-secure-toolbar{display:grid!important}`
   vence o `[hidden]` do UA (precedente da cascata: memória das folhas em runtime).
3. **Categoria que não se aplica ainda fala errado.** No braço G o cabeçalho mostra
   "Trabalho · 0%" em vez de "não se aplica", e o status diz "as quatro categorias têm lançamento"
   quando só três se aplicam.
4. **Guarda `peso !== 100` derruba a tela se a escola não redistribuir pesos.** Em G (trabalho
   `applies:false` conservando peso 20) a grade some. Não é atingível no banco real: o CHECK
   `bfr_grading_rules_applies_weight_check (applies OR weight = 0)` torna esse cadastro ilegal.
   Fica registrado como **risco de cadastro** — a Direção precisa fechar os pesos vivos em 100 — e
   o braço H (50/30/20 com trabalho fora) prova que a tela funciona nesse modelo.
5. **Nota sem categoria fica invisível no payload do RPC.** No braço D (payload fiel de
   `bfr_teacher_context()`, sem `g.category`) as 5 notas existentes somem da grade sem nenhum aviso;
   `bfr_term_unclassified` e "sem categoria" não aparecem uma vez sequer no candidato. Falta a
   `category` na projeção da RPC para o estado ficar visível ao professor.
6. **Pills de correção pequenos na banda web:** 182×28 e 185×28 @1280 (Prova 1 / Prova 2 na célula
   empilhada); os outros dois dão 43 px.
7. **Rótulos `::before` da tabela empilhada a 10 px @390**, abaixo do piso de 11 px publicado.
8. **Validação nativa esconde a mensagem do app e deixa a anterior na tela.** Com o campo em 12, o
   `input type="number" max="10" required` faz o browser cancelar o submit **antes** do JS: nenhum
   POST, nenhuma mensagem, e o texto do attempt anterior ("O valor informado é o mesmo já
   registrado") continua visível — medido em `sonda-clamp-nota.json`: `checkValidity()=false`,
   `erro=""` novo. A causa é de ordem: `saveSecureGradeCorrection` só limpa `#gradeFormError` depois
   de passar pelas guardas. Consequência: a guarda própria "A nota corrigida precisa ser um número
   entre 0 e 10." é inalcançável por clique, e quem lê a tela recebe uma frase que não descreve o
   que digitou. O lado bom medido: o `required` fecha a porta de "campo vazio = nota 0".

**Armadilhas novas pagas neste ensaio** (146 harness sem `AUDIT_SESSAO`, 147 mock que não honra
`eq()` e `+` como espaço, 148 submit cancelado pela validação nativa) estão numeradas na memória do
rig. Regra que fica do item 1: **nenhuma medição de filtro é confiável sem espião no setter** — sem
a pilha, "o clique não faz nada" seria atribuído à aba nova em vez do `ensureUi()` legado.

Estado da frente: a candidata está ensaiada e com defeitos atribuído causa por causa, **continua não
publicada** (`/` segue `3.391.593` bytes md5 `554c3120b93ac8c6c9a96e9736d124d2`) e `bfr_grading_rules`
segue com 0 linhas. Os 8 defeitos acima têm de virar candidata nova sobre `ar-implantado-v52.html`
(como em 37.6) antes de qualquer OK de publicação; os 14 cenários do brief seguem travados da mesma
forma de antes — sessão `pedagogical` real com vínculo.

**Armadilha de comparabilidade declarada:** as bandas A–F foram diariadas com o mock **anterior** a
esta passada. O que mudou no `audit-harness-notas.mjs` são dois ramos — `GET /rest/v1/grades` com
`assessment=eq.` e `GET /rest/v1/bfr_grade_audit` — e nenhum deles existe no caminho das bandas A–F
(o loader normal filtra por `student_id=in.(…)`). A condição que o ramo da trilha altera é
`secure.gradeAudit.available`, e ela já era `true` nas bandas antigas: os pills "Corrigir" aparecem no
diário A–F, o que só acontece com a trilha disponível. As 6 bandas continuam comparáveis; o que a
passada nova acrescenta é a medição do clique, não uma re-leitura das anteriores.

**Prova de 0 escritas, medida depois do ensaio** (`sql-confere-zero-escrita.mjs`, SELECT puro):
`grades` **112** linhas com selo `44d917a12af23c8d7072bc4331aea2b8` (igual ao selo de antes de
aplicar a DDL), `students` **848** com `5964c75a7579803e8f222f0b4d725035`, `bfr_grade_audit` **0** e
`bfr_grading_rules` **0**. O `POST /rest/v1/grades` do lote e o `POST /rest/v1/rpc/bfr_correct_grade`
da correção morreram no firewall do harness, como declarado.

### 37.9 Candidata v53.1 — os 8 defeitos do ensaio aplicados e re-medidos por clique, com 0 escritas

Gerada por `gera-candidata-notas-v53-1.mjs` **sobre** `ar-candidato-v53-notas.html` (a v53 fica
intacta para a passada ser comparável): 12 hunks, todos casando exatamente 1 vez, portão de sintaxe
`new Function(bloco #55)` passado (120.646 caracteres) e portão de âncoras (4 frases que o §37.8
provou certas não podem sumir). Saída: **`ar-candidato-v53-1-notas.html`** — 3.408.900 bytes em disco,
md5 `f08374b1258064a82d8503d08bff37e9`, 3.412.707 bytes no fio servidos pelo rig. Diário
`candidata-notas-v53-1.json`. Nada foi publicado; nada foi escrito no banco.

Medida em 21/10 com o mesmo rig (porta 8262, `AUDIT_SESSAO=bfr-audit-session-dev-live-v44.json`,
`AUDIT_INDEX=ar-candidato-v53-1-notas.html`, `FIREWALL_LEITURA` montado antes de qualquer script da
página). Sondas: `sonda-v53-1.mjs` (braços A @1280, B @390, C `regra-parcial-cem`, D `regra-parcial`,
E `professor-real`), `sonda-v53-1-regressao.mjs` (lote + abas vizinhas) e `sonda-v53-1-lote.mjs`
(rascunho com ponto decimal). Diários `ensaio-v53-1.{json,log}`, `ensaio-v53-1-regressao.{json,log}`,
`ensaio-v53-1-lote.{json,log}`; capturas `ensaio-v531-*.png`.

| # | defeito do §37.8 | o que a v53.1 faz | medido agora |
|---|---|---|---|
| 1 | filtro de disciplina/bimestre inerte | `secureAcademicSetup()` captura `value` dos `<select>` **antes** de `ensureUi()` re-hidratá-los, e usa a captura | `<select>` por `value`+`change` (sem tocar em estado): `pediu "História" ficou "História"`, grade com 3 linhas e cabeçalhos; bimestre `1` → 9 células + 4 pills. @390 idem |
| 2 | barra de controles `[hidden]` visível | `#teacherView .bfr-secure-toolbar[hidden]{display:none!important}` na folha do bloco #55 | aba Notas por categoria: `hidden:false display:flex` visível; aba "Notas" legado: `hidden:true visivel:false display:none` |
| 3 | "Trabalho · 0%" e "as quatro categorias" | cabeçalho usa `aplica[categoria]` → `· não se aplica`; status conta `viveis.length` | braço C: `["…","Comportamento e participação · 20%","Atividades · 30%","Prova · 50%","Trabalho · não se aplica","…"]` e "as **3** categorias que se aplicam têm lançamento" |
| 4 | guarda `peso !== 100` derrubava a tela sem dizer por quê | mensagem nova `regraIndisponivel(subject)` distingue regra ausente de regra inconsistente (a guarda continua de pé) | braço D: corpo da tabela = "Os pesos cadastrados deste componente somam **80%**, não 100%. Nenhuma média é apresentada até a escola fechar a regra." |
| 5 | nota sem categoria somia da grade | aviso contado no status (`current.grades` sem `category`). **A raiz continua SQL**: `bfr_teacher_context()` não projeta `g.category` | braço E: "5 lançamento(s) deste bimestre chegaram sem categoria e não entram na média." com 12 células editáveis; C: 1; A: 1 |
| 6 | pills de correção de 28 px @1280 | `min-height:44px` + `inline-flex` centralizado na banda web; volta do piso mobile de 36 → 44 px (a própria CSS_NOVO da v53 o tinha baixado) | @1280: 189×51, 153×51, 190×44, 193×44. @390: 146×71, 146×55×3 (quebra de linha, todos ≥44) |
| 7 | rótulo `::before` da tabela empilhada a 10 px | `font-size:11px` na regra do lote publicado | `getComputedStyle(td,'::before').fontSize` = **11px** @1280 e @390 |
| 8 | validação nativa escondia a mensagem do app | `#gradeFormError` limpo **antes** das guardas + listener de `invalid` em captura, só no `#gradeScore`, que fala a frase do app | campo 12 → "A nota corrigida precisa ser um número entre 0 e 10."; campo vazio → "Informe a nota corrigida. O campo não pode ficar vazio."; valor igual → "O valor informado é o mesmo já registrado…"; motivo de 6 caracteres → "…pelo menos 8 caracteres." **Sem POST em nenhum dos quatro.** Com valor válido, o `POST /rest/v1/rpc/bfr_correct_grade` é tentado, barrado, e a tela confessa |

Regressão do que já estava provado, refeita depois dos hunks (o hunk 1 mexe na ordem do setup, que é
o caminho por onde as outras abas passam): `rascunho=1` com `8.5` na célula de Trabalho, média da
linha pintando **7,5** = 0,1·9 + 0,3·7 + 0,4·7 + 0,2·8,5 igual à conta à mão, status "1 edição(ões)
ainda não salvas.", `Salvar lançamentos` → `POST /rest/v1/grades?columns=…` **barrado** com a frase de
"gravação não confirmada", `Descartar edições` volta o rascunho para 0, célula com `12` é recusado
**antes** de qualquer envio ("1 célula(s) fora da escala…"), estouro horizontal 0 nas duas bandas, e as
abas Frequência (3 linhas, corpo de presença), Notas legado (cabeçalhos próprios) e Acompanhamento
seguem os seus próprios corpos — `console: {"erros":[]}` e `warnings: []`.

**Artefato novo, pago nesta passada:** a primeira sonda de lote digitou `8,5` (vírgula) e mediu
"rascunho 0, nada pendente" como se fosse falha da candidata. `<input type="number">` devolve
`value === ''` para entrada inválida no Chrome do rig (locale en-US), e o `handleInput` apaga o
rascunho quando lê vazio — ou seja, a medição era do **instrumento**, não do app. Repetido com ponto,
o rascunho entra e a média pinta. Consequência registrada: o `String(valor).replace(',', '.')` das
guardas nunca vê vírgula num `type=number`; em pt-BR o próprio navegador normaliza, mas isso é
comportamento de locale, não do app. Fica como armadilha 149 na memória do rig.

Ficam abertos, por causa, fora do alcance desta candidata: (a) a projeção `g.category` em
`bfr_teacher_context()` — SQL, precisa de OK; (b) o cadastro de `bfr_grading_rules` com os pesos
fechados em 100% por componente, que é decisão da Direção; (c) o mesmo `secureAcademicSetup()` do
**ar publicado** (`index.html`, offset 2043828) continua com a ordem antiga — a correção só existe na
candidata até a publicação; (d) os 14 cenários do brief ainda travam por falta de sessão
`pedagogical` real com vínculo.

**Prova de 0 escritas, medida depois desta passada** (`sql-confere-zero-escrita.mjs` rodado 21/10 às
12:0x UTC, SELECT puro): `grades` **112** / selo `44d917a12af23c8d7072bc4331aea2b8`, `students` **848**
/ `5964c75a7579803e8f222f0b4d725035`, `bfr_grade_audit` **0**, `bfr_grading_rules` **0** — os quatro
idênticos ao baseline do §37.8. URL publicada `https://bfr-conecta.turmaroboticabfr.workers.dev/` →
HTTP 200, **3.391.593** bytes, md5 `554c3120b93ac8c6c9a96e9736d124d2`, byte a byte o `ar-implantado-v52.html`.
Os `POST` contados nos diários são o beacon `POST /cdn-cgi/rum?` (de terceiro, não do app) e as duas
escritas barradas pelo firewall. Rig desligado, porta 8262 sem `LISTENING` (só 4 `TIME_WAIT` do lado
do cliente).

### 37.10 As três frentes que fecharam sem pedir OK: a projeção SQL, o filtro cirúrgico e o cadastro de pesos

O §37.9 terminou com quatro itens abertos e dois deles não precisavam de decisão nenhuma para
chegar até a beirada do "pronto, medido, aguardando OK": eram trabalho de instrumento. Esta passada
fecha **(a)**, **(b)** e **(c)** do parágrafo final — nenhuma publicação, nenhum DDL aplicado, nenhuma
escrita. O selo do fim da seção prova.

**(a) #185 — projetar `g.category` dentro de `bfr_teacher_context()`** (`sql-projecao-category-notas.sql`,
md5 `f294c387ff47462ede729b2106676a3d`, reversão `sql-projecao-category-notas.rollback.sql`
md5 `8c5a5aed4f8320184f17db6142781d94`). A função viva foi lida antes de qualquer caneta
(`sql-ler-contexto-professor.mjs` → `sql-contexto-professor-vivo.sql`): 2.935 caracteres, SECURITY
DEFINER, `search_path=public`, md5 `126636656b05c4b0bad35c0776f56adb`, e uma única linha relevante —
`select g.student_id, g.subject, g.assessment, g.score, g.term, g.created_at`. O gerador
(`gera-sql-projecao-category.mjs`) é o da casa: um hunk literal que casa exatamente 1 vez, portão de
selo (`SELO_ESPERADO` = o md5 lido do ar, aborta se a função viva for outra), `CREATE OR REPLACE` em vez
de drop+create para **conservar o `proacl` vivo** (o Supabase dá `EXECUTE` a `anon` em função nova —
armadilha paga em 13/10), e `revoke`/`grant` nominal + `notify pgrst`.

O validador (`valida-projecao-category.mjs`) é **A/A**: a mesma sonda roda primeiro contra a função
viva, depois contra a candidata dentro de `begin … rollback`, chamada como o docente real
(`c3abaa3a…`, "raull Gomes", 5 vínculos, 112 notas no escopo). Medido:

| | linhas de `grades` no payload | com a chave `category` | chave ausente | valor `null` | chaves por objeto |
|---|---|---|---|---|---|
| ANTES (função viva) | 112 | 0 | 112 | 0 | `assessment, created_at, score, student_id, subject, term` |
| DEPOIS (candidata na transação) | 112 | 112 | 0 | 112 | as mesmas **+ `category`** |

Delta: ganhou `["category"]`, perdeu `[]`; `assignments 5 · classes 5 · students 145 · attendance 25`
inalterados; `ok=true`. Depois do rollback, selo `126636656b…` **igual** e `proacl` **igual** — a
função do banco é a que estava lá. O limite honesto está escrito no diário: as 112 linhas históricas
têm `category` NULL no banco, então a chave chega `null` e o aviso "sem categoria" da tela **continua**
até a escola classificar. A candidata destrava o caminho, não o dado.

**(c) #186 — a candidata cirúrgica do filtro, sobre os bytes do ar** (`ar-candidato-v52-1-filtro.html`,
3.391.963 bytes = +370 sobre o v52, md5 `f6cf492f5effa67bc3a488607f11cca1`, diário
`candidata-v52-1-filtro.json`). Causa relida nos bytes publicados: `secureAcademicSetup()`
(`ar-implantado-v52.html:17153`) chama `ensureUi()` e **depois** lê os `<select>`; `ensureUi()` dispara
`hydrateFormScopes()` (`:16602`) → `hydrateAcademicScope()` (`:16668`–`:16681`), que reescreve
`subjectSelect.innerHTML` e devolve `.value` a partir do estado anterior. Quem lê depois nunca vê o
clique. Dois hunks, nada além disso: a captura dos `value` antes de `ensureUi()` e o uso da captura nas
duas linhas de leitura. Portões: cada hunk casa 1×; `new Function(bloco #55)` passou (103.786
caracteres); 5 âncoras do v52 não podem sumir; e um portão **cirúrgico** — o arquivo não pode conter
`renderGradeGrid`, `bfr_grading_rules`, `data-bfr-grade-cell` nem `gradeDraft`, para garantir que esta
candidata não arrasta a v53.1 junto.

Medido **por clique**, em duas portas ao mesmo tempo (8264 = v52 do ar, 8265 = v52.1), com
`FIREWALL_LEITURA` montado antes de qualquer script da página (`sonda-v52-1-filtro.mjs`, diário
`ensaio-v52-1-filtro.json`):

| braço | pediu | ficou | coluna "Nota" no 2º bimestre |
|---|---|---|---|
| v52 do ar | `História` | **`all`** | `["História: 8,0 · …","História: 5,0","Não lançada"]` — o filtro mentiu |
| v52.1 | `História` | `História` | — |
| v52.1 | bimestre `2` | `2` | `["Não lançada","Não lançada","Não lançada"]` — obedeceu |
| v52.1 | de volta `all` | `all` | `["História: 8,0 · 6,0 · 7,0 · 9,0","História: 5,0","Não lançada"]` |

`cura_medida: true`, `volta_a_todos_funciona: true`, assentamento 3.567 ms / 2.940 ms, estouro
horizontal 0 nas duas portas, escritas: só o beacon `POST /cdn-cgi/rum?`. **Instrumento corrigido no
caminho:** a primeira sonda leu `st.academicState.subject/term/grades` para decidir o veredito e esses
caminhos não existem no painel legado — devolviam `""`/`0` nos dois braços, ou seja, um "nada mudou"
falso. O veredito foi recalculado a partir do DOM (`veredito-v52-1-filtro.mjs`); os campos envenenados
continuam no diário, marcados como não citáveis (armadilha 151).

**(b) #187 — o cadastro dos pesos, com os pesos em NULL de propósito**
(`sql-cadastro-regras-direcao-candidata.sql`, md5 `698c718e5fba5bb0f70148010c14ae6e`; reversão
`sql-cadastro-regras-direcao.rollback.sql`, md5 `c8f48dc51c867352ff86651e1293f433`; validador
`valida-cadastro-regras-187.mjs`, diário `valida-cadastro-regras-187.{json,log}`; censo
`sql-censo-regras-187.txt`). Antes de escrever qualquer coisa, o censo mediu o chão:
`bfr_grading_rules` viva com **10 constraints** e **0 linhas**; `bfr_current_school_year() = 2026`;
`bfr_grading_rule_complete(2026,'História') = false`; média `NULL`; boletim do 1º bimestre = 4 células
`sem_regra`; e **um único componente no banco inteiro** — `História` (112 linhas em `grades`, 5 vínculos
docentes ativos, 1 docente). Por isso o cadastro **deriva** os componentes de `grades ∪
bfr_teacher_class_subjects(ativas)` em vez de listar disciplinas no arquivo: listar seria inventar
matriz curricular.

A decisão de peso continua sendo da Direção, e isso está blindado no SQL: o bloco de decisão vem com
`applies`/`weight` em `NULL` e o primeiro guard aborta enquanto houver NULL. Os 11 portões do validador,
todos verdes, cada um medido dentro de `begin … rollback` chamado como a Direção autenticada
(`cc005f8c…`):

```
recusou_sem_decisao true          (decisao-da-direcao-ausente: 4 linha(s) sem applies/weight/…)
recusou_sem_sessao true           (sem-sessao-autenticada: updated_by ficaria NULL e a policy não vale)
todos_os_guards_abortaram true    (soma 90 · soma 110 · aplica=false com peso · nenhuma aplicada ·
                                   categoria repetida · nome fora das quatro · max_score>10 · corte>teto)
cadastrou_4_linhas_idempotente true (upsert 2× na mesma transação: regras continuam 4)
portao_fecha_com_regra true       (bfr_grading_rule_complete = true com pesos fechando 100)
media_continua_null_sem_classificacao true (regra ok, média NULL: 0 lançamentos por categoria)
um_unico_par_aluno_bimestre true  quatro_aplicadas_sao_impossiveis_hoje true
aritmetica_prova true             ((10,00×60% + 5,00×40%) = 8,00, igual à conta à mão)
rls_vale_dentro_da_funcao true    (4 identidades, abaixo)
nada_ficou_no_banco true          (selo do braço 8)
```

O achado que a Direção precisa ver **junto** com os pesos, e que nenhum texto de brief dizia: em
`grades` cada par (aluno, bimestre) tem **exatamente 1 linha** — censo `112 pares, todos com n=1`,
100% `assessment = 'NOTA GERAL'`, e o trigger `bfr_prevent_duplicate_grade` casa
`(student, subject, assessment, term)`. Consequência medida no braço 5: com as quatro categorias
aplicadas (20/20/40/20), `bfr_grading_rule_complete` **fecha** e mesmo assim a média é `NULL` para todo
mundo, com as 4 células em `aguardando_lancamento` para sempre. Ou a escola deixa **uma** categoria
aplicada com peso 100, ou primeiro divide o instrumento — e isso mexe na chave do trigger e na história
das 112 linhas, ou seja, é outra candidata, com outro OK.

O portão de leitura, medido por identidade com claims reais sobre o mesmo fixture (aluno `af1033cc…`,
1ª bimestre): `diretora escopo=true media=8.0 lançamentos=2` · `coordenador escopo=true media=8.0` ·
`secretaria escopo=true media=8.0` · `perfil 1f718252 (guardian de OUTRO aluno) escopo=false media=NULL
lançamentos=0`. É o `SECURITY INVOKER` da candidata de banco fazendo o que se prometeu no §37.5: a
função devolve a média do que a RLS da pessoa deixa ler, não a média de outra família. (Armadilha 152:
a mesma chamada feita **sem** `request.jwt.claims` devolve `false` para todos os papéis — o primeiro
censo de escopo saiu errado por isso, não por falta de direito do coordenador.)

Limitação medida, não escondida: o **esquema** aceita regra para um componente que não tem nota
(`Matemática` inserida direto: `bfr_grading_rule_complete = true`, média `NULL`). A restrição "só
componentes que existem" mora nos guards da candidata, não no banco.

**Selo das três frentes** (`selo-fechamento-185-187.mjs`, 21/10, rodado depois de tudo): URL publicada
`https://bfr-conecta.turmaroboticabfr.workers.dev/` → 3.391.593 bytes, md5
`554c3120b93ac8c6c9a96e9736d124d2`, byte a byte o `ar-implantado-v52.html`; `bfr_teacher_context()` com
md5 `126636656b05c4b0bad35c0776f56adb` e `proacl` `{postgres, authenticated, service_role}` — a
candidata #185 **não** foi aplicada; banco `regras 0 · grades 112 · com_categoria 0 · linhas_de_sonda 0
· anon_pode_chamar 0`; o bloco de decisão da #187 continua com as 4 linhas em `null`. Harnesses 8264 e
8265 desligados por PID (24140, 16724), nada em `LISTENING`.

---

### 37.11 #185 APLICADA no banco (21/10, ordem "aplica a correção #185 no banco de dados"): a projeção `g.category` está viva, e nada foi publicado

O OK foi lido no escopo exato: **só a #185**. A #187 (pesos) continua sem aplicar — as 4 linhas de decisão
seguem `null, null` — e nenhuma candidata de tela foi publicada.

**Aplicação** (`aplica-projecao-category-185.mjs`, arquivo `sql-projecao-category-notas.sql`, md5
`f 2 9 4 c 3 8 7 f f 4 7 4 6 2 e d e 7 2 9 b 2 1 0 6 6 7 6 a 3 d `): um único lote `begin; … commit;` com o
`CREATE OR REPLACE FUNCTION public.bfr_teacher_context()`, o `revoke … from public, anon` + `grant … to
authenticated` idênticos ao baseline e `notify pgrst, 'reload schema'`. Antes de enviar, o portão de
comparabilidade: o corpo vivo tinha que ter o selo `126636656b05c4b0bad35c0776f56adb` — tinha. A sonda do
`rollback` do próprio validador falhou na primeira tacada com `42601 syntax error at or near "rollback"`
(faltava `;` no meu `select … from (…) c`), e o `commit` do DDL já tinha acontecido: **a aplicação ocorreu, a
prova não**. Em vez de reenviar, o script ganhou modo de re-entrada — detecta `g.category` no corpo vivo,
pula o `CREATE OR REPLACE`, refaz a difa contra o backup em disco e só confere. Isso é a armadilha **154**.

**O que a difa programática mediu** (76 → 76 linhas, **1** linha diferente):

```
:45  ANTES   select g.student_id, g.subject, g.assessment, g.score, g.term, g.created_at
     DEPOIS  select g.student_id, g.subject, g.assessment, g.score, g.term, g.category, g.created_at
```

**Conferência depois do `commit`** — tudo por SELECT, `selo-pos-aplicacao-185.mjs`:

- função: selo novo `5563df3a2fb7d04dbdd71ea49de745b8` (≠ baseline, como esperado), `proacl`
  `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}` **igual ao de antes**, `proconfig`
  `{search_path=public}` igual, `prosecdef=true` igual. O `CREATE OR REPLACE` preservou os grants — que é
  justamente por que não se pode fazer `drop` + `create` aqui (a casa paga essa dívida em 13/10).
- dado: `grades 112 · com_categoria 0 · students 848 · auditoria 0 · regras 0`, com selo de conteúdo
  `ecad7423466a764adf93fcb743496fb0` **idêntico antes e depois** da aplicação. Zero linha de aluno alterada.
- **pelo caminho do app** (`prova-caminho-real-185.mjs`, `POST /rest/v1/rpc/bfr_teacher_context`): `anon` →
  HTTP **401 · 42501 permission denied** (o `revoke` sobreviveu ao replace e o PostgREST recarregou); as
  sessões reais de `developer`, `coordinator`, `student` e `sports_operator` → HTTP **200 · `{"error":"forbidden"}`
  · 22 bytes**, ou seja, o portão de papel não mudou e nada de dado vaza para quem não é docente. Na primeira
  tacada as quatro sessões deram 401 — mas `PGRST303 JWT expired`, que é instrumento velho, não veredito
  (armadilha **155**); remintadas por `remint-live.mjs` (login puro, 0 escritas) e re-medidas.
- **a chave nova está na resposta**: chamado com `set local role authenticated` + claims do perfil
  `pedagogical` real (Raull Gomes, 5 vínculos ativos, 112 notas no escopo), dentro de `begin … rollback`, o RPC
  devolve `linhas=112 · com_chave_category=112 · valor_null=112` e chaves
  `["assessment","category","created_at","score","student_id","subject","term"]` — **presente com `null`**, que
  é o estado honesto das 112 linhas antigas e o que a v53.1 precisa para não confundir "sem categoria" com
  "não lançado". Limitação registrada: não há sessão mintada de `pedagogical` nesta máquina, então a chave
  nova só é provada por HTTP sob impersonação de banco, não por navegador.
- consumidores no ar: 3 chamadas de `bfr_teacher_context` no `index.html` publicado e **0** `Object.keys` sobre
  o objeto-nota — a mudança é aditiva e o app do ar nem lê a chave.
- reversão: `sql-projecao-category-notas.rollback.sql` (md5 `8c5a5aed4f8320184f17db6142781d94`) tem corpo de 67
  linhas **idêntico linha a linha** ao backup do pré-aplicação (`sql-contexto-professor-vivo.json`, selo
  `126636656b…`), conferido sem executar.

**Selo da passada**: `SELO #185 APLICADO: funcao=true · anon barrado=true · dado intacto=true ·
ar inalterado=true · reversao confiavel=true` (`selo-pos-aplicacao-185.txt`). O ar continua
3.391.593 bytes, md5 `554c3120b93ac8c6c9a96e9736d124d2`. O parágrafo de selo do §37.10 descreve a hora em que
foi rodado — antes desta ordem — e não é reescrito.

Diários: `aplica-projecao-category-185.json` (`aplicada:true`, `selo_aplicado`, difa, dados antes/depois),
`prova-caminho-real-185.json` (as cinco chamadas por REST, `sessoes_rejeitadas_por_expiracao: []`).

### 37.12 Medido sem OK novo (ordem "FACA O QUE FOR NECESSARIO"): que FORMA de regra dá média hoje — e o risco que a resposta revelou

Nenhuma escrita, nenhuma publicação, nenhum DDL nesta passada. Duas coisas foram feitas: (1) re-confirmar que o
estado pós-#185 não deriva, e (2) medir o fato que faltava para a Direção decidir — porque o §37.10 só tinha
medido **uma** forma de regra (as 4 aplicadas 20/20/40/20).

**1) O selo pós-aplicação continua de pé.** `selo-pos-aplicacao-185.mjs` re-rodado:
`SELO #185 APLICADO: funcao=true · anon barrado=true · dado intacto=true · ar inalterado=true · reversao confiavel=true`
(ar em 3.391.593 bytes, md5 `554c3120b93ac8c6c9a96e9736d124d2`; função viva com o selo da candidata;
`grades` 112 / 0 com categoria; `bfr_grading_rules` 0).

**2) A matriz de formas — `simula-forma-regra-187.mjs`** (`1928fde207abeb5f98c30f1d5679823e`; diário
`simula-forma-regra-187.json` `5a6cb34315889c574c1841ee1f4237e1`, transcrição `.log` `73940de997378c239f88c4afbfbe2949`).
Cinco formas de regra inseridas **dentro de `begin … rollback`**, uma chamada por forma, sempre um único `select`,
e conferência de zero depois de cada passada. 63 alunos com lançamento em História, 61 lançamentos no bimestre 1:

| forma | `bfr_grading_rule_complete` | Σ pesos aplicados | com média t1 | com média t2 | lançamentos que casam com a regra |
|---|---|---|---|---|---|
| uma aplicada, peso 100 | `true` | 100 | **0** | **0** | **0** |
| duas aplicadas, 50/50 | `true` | 100 | **0** | **0** | **0** |
| quatro aplicadas, 20/20/40/20 | `true` | 100 | **0** | **0** | **0** |
| nenhuma aplicada | `false` | 0 | 0 | 0 | 0 |
| soma não fecha (30+50) | `false` | 80 | 0 | 0 | 0 |

**Não é decisão de peso.** As três formas que *fecham* em 100% dão exatamente o mesmo resultado: nenhuma média.
A causa está medida na última coluna — `lancamentos_que_casam_com_regra = 0`, porque o join é
`g.category = r.category` e **nenhuma das 112 notas tem categoria** (censo: `category NULL` em 112/112).

**3) O controle positivo, que é o que mudou a resposta.** Sem ele, "0 média em 5 formas" poderia ser instrumento
quebrado. Três braços com **uma linha sintética marcada** (`SONDA #188 (rollback, nunca publica)`, nota 9,00,
categoria `prova`) dentro do mesmo rollback — nenhuma linha real de aluno foi alterada:

* **puro** (aluno sem nenhum lançamento de História + só a sonda classificada): média **9.0**,
  `status=lancada`, não classificadas 0 → a função sabe devolver número; o instrumento está vivo.
* **misto** (aluno real que já tinha 1 lançamento histórico **sem categoria** no t1 + a sonda classificada):
  média **9.0** com `nao_classificadas_t1 = 1` e a coorte passando de 0 a 1 aluno com média.
* **zero** (o mesmo aluno real, só a regra, sem linha nova): média `null`, status `aguardando_lancamento`.

**O achado que a Direção precisa ouvir antes de decidir:** classificar **só parte** das notas não trava nada —
a média sai calculada apenas sobre as linhas classificadas e o histórico fica **fora do cálculo sem erro e sem
aviso na função** (só o contador de não classificadas denuncia). Ou seja, a decisão mínima não é "quais pesos":
é **classificar as 112 notas antigas** em uma das quatro categorias — um `UPDATE` em `grades`, arquivo novo,
**OK novo** — ou a média continuará `null` em qualquer configuração de pesos; e se a escola classificar só as
notas novas, a média exibida passa a ignorar o histórico silenciosamente.

**Conferência de zero escrita** (depois dos oito braços): `regras_agora 0 · grades 112 · sondas_188_vivas 0 ·
selo_grades ecad7423466a764adf93fcb743496fb0 · 3 funções vivas · contexto ainda com o selo da #185` →
`voltou ao estado anterior = CONFIRMADO`. Armadilha paga no caminho (nova **156**): o selo de `grades` tem de
usar **a mesma expressão** do aplicador — `string_agg(g::text)` sobre a *derived table* de uma coluna casa o ROW
inteiro, com parênteses; `string_agg(x)` sem parênteses dá outro md5 na **mesma base**
(`ecad7423…` vs `f8a4841d…`) e lê como divergência de dado. A primeira versão do diário também tinha um veredito
`true` **vazio**: `.every()` sobre a lista de braços que falharam (0 itens) devolve `true` — o portão agora exige
todos os braços medidos **e** controle positivo vivo antes de qualquer afirmação (armadilha **157**).

### 37.13 #187 APLICADA no banco (21/10, ordem "aplicar #187 primeiro" + decisão "prova = 100, resto não aplicado" + "Sim, aplicar mesmo assim")

**O que a Direção decidiu e o que foi gravado.** A candidata parada `sql-cadastro-regras-direcao-candidata.sql`
**não foi editada** (md5 continua `698c718e5fba5bb0f70148010c14ae6e`, 12.123 bytes, bloco com `null/null` — o
arquivo de referência existe para a comparação de antes/depois). Foi criada a cópia preenchida
`sql-cadastro-regras-prova100-187.sql` (13.286 bytes) com o bloco assim:

| categoria | applies | weight | max_score | decimals | min_passing |
|---|---|---|---|---|---|
| `prova` | **true** | **100** | 10 | 1 | `NULL` |
| `comportamento` | false | 0 | 10 | 1 | `NULL` |
| `atividades` | false | 0 | 10 | 1 | `NULL` |
| `trabalho` | false | 0 | 10 | 1 | `NULL` |

`min_passing` ficou `NULL` **de propósito**: a escola não definiu ponto de corte, e um corte inventado aqui faria a
tela julgar aprovado/reprovado sem decisão. `max_score 10` e `decimals 1` são os que a candidata já trazia.

**Como foi aplicado** (`aplica-cadastro-regras-187.mjs`, transação única, `set local lock_timeout='20s'`, sessão
`authenticated` com claims reais da **diretora** `cc005f8c…` — `role=director`, `bfr_learning_is_manager()=true`,
ano letivo 2026 lido de `bfr_current_school_year()`, não do relógio):

1. **baseline**: `regras 0 · grades 112 · com_categoria 0 · selo_grades ecad7423466a764adf93fcb743496fb0 · contexto 5563df3a2fb7d04dbdd71ea49de745b8 · selo_acl_das_5_funções a9041948d7881729968998ded5ac37b5` — tudo igual ao medido em §37.11/§37.12. Sem esse casamento o script aborta antes de falar de escrita.
2. **controle negativo do guard, com o arquivo preenchido**: rodando sem claim, o corpo recusa — `sem-sessao-autenticada: rode como um papel manager…`. Ou seja, o `updated_by` só existe porque houve sessão de manager; applying como `postgres` teria gravado rastro vazio.
3. **dry-run com `rollback`**: `regras 4 · aplicadas 1 · soma_pesos 100 · componentes ["História"] · quem_cadastrou [cc005f8c…] · portao_completo true · media_t1 null · statuses ["aguardando_lancamento","nao_se_aplica"] · celulas_com_media 0 · lancamentos_que_casam 0`.
4. **conferência de zero escrita depois do rollback**: `voltou ao estado anterior = CONFIRMADO`.
5. **`--apply` com `commit`** + `notify pgrst, 'reload schema'`.

**O que está no banco agora** (medido, não declarado): as 4 linhas por componente derivado dos dados (`História`),
`updated_by = cc005f8c-fa2c-414f-8b04-73e828ec8216` em todas, selo das regras `d28f675382bfd832e49905b5e83fbd89`.
`bfr_grading_rule_complete(2026,'História') = true`. **As notas não mudaram**: `grades 112`, `com_categoria 0`,
selo `ecad7423466a764adf93fcb743496fb0` inalterado; selo da função da #185 inalterado; ACL das 5 funções inalterada
e `anon` continua sem poder chamar nenhuma (`anon_pode_chamar = 0`).

**Prova pelo caminho do app** (`prova-regra-187-rest.mjs`, PostgREST com sessão autenticada real de `coordinator`,
remintada por login puro — `grant_type=password`, nenhuma escrita): `GET /bfr_grading_rules` → HTTP 200 com as 4
linhas e `updated_by` da diretora; `rpc/bfr_grading_rule_complete` → `true`; `rpc/bfr_term_average` → `null`;
`rpc/bfr_term_unclassified` → `1`; `rpc/bfr_boletim_componente` → HTTP 200 com **16 células**, statuses
`["nao_se_aplica","aguardando_lancamento"]`, `com_media = 0`.

**Nada foi publicado**: a URL do ar mede 3.391.593 bytes com md5 `554c3120b93ac8c6c9a96e9736d124d2`, igual a
`ar-implantado-v52.html`, e não contém as strings `bfr_grading_rule_complete` nem `bfr_boletim_componente` — o
shell em produção nem sabe que a regra existe, então a tela não mudou de nada com este apply.

**Consequência aceita com prova, e é o que a Direção precisa ver junto com os pesos**: com peso único 100 o portão
fecha, mas a média continua `null` porque nenhum dos 112 lançamentos tem categoria — o join
`g.category = r.category` casa **0** linhas (§37.12). O item **37** passa a ser o único travesso: classificar o
histórico é `UPDATE` em `grades`, **arquivo novo + OK novo**. Reversão documentada no próprio SQL:
`delete from public.bfr_grading_rules where school_year = 2026 and category in (…)` devolve `complete=false`.

Armadilha paga nesta passada (nova **158**): a assinatura de `bfr_boletim_componente` é
`(p_student_id uuid, p_subject text, p_school_year int)` — **não tem** parâmetro de bimestre, então passá-la `1`
pediu "school_year 1" e devolveu vazio silenciosamente em vez de erro; `bfr_term_average` exige o 3º argumento como
`smallint` (`1` puro dá `42883 function does not exist` porque `integer` não unifica com `unknown`). Antes de
afirmar uma contagem de célula, `pg_get_function_arguments` é o portão, não a memória.

---

### 37.14 #190 medida e validada SEM escrever (ordem "rodar a tarefa 190 para classificar o histórico"): o histórico é classificável, o travesso é de escrita, não de decisão

A #189 deixou a pergunta em aberto porque não existia forma de regra que produzisse média. Esta passada mede o
universo, o caminho de escrita e a consequência — e para antes do `UPDATE`, que pede OK novo.

**Censo (`censo-classificar-190.mjs`, só SELECT + braços `begin;…rollback;`)**: `112` linhas · `112` sem categoria ·
`0` com categoria · `63` alunos · **1 componente** (`História`) · **1 instrumento** (`NOTA GERAL`) · bimestres `1..3`
· `112` pares `(aluno,componente,bimestre)` **distintos** e **0** pares com mais de uma linha. O selo vivo das linhas
é `ecad7423466a764adf93fcb743496fb0`, igual ao congelado na #185/#187 — ou seja, nada se moveu desde então. A
decisão "um instrumento por bimestre" que restava da #187 já está tomada pelos próprios dados: é o que existe.

**Catálogo que manda no formato da escrita**: `grades` tem `1` trigger (`bfr_prevent_duplicate_grade`,
`BEFORE INSERT OR UPDATE`, chaveada em `(student_id, subject, assessment, term)` com `existing.id is distinct from
new.id`) — como os pares medidos são únicos, um `UPDATE` que só toca `category` não pode dispará-lo; e os CHECKs
aceitam exatamente as quatro categorias (`grades_category_check`), `score` entre 0 e 10, `term` 1..4. `entered_by` é
FK para `profiles` e **não foi tocado** pela candidata: quem lançou a nota continua sendo quem lançou.

**O travesso real é de permissão, e foi medido de duas formas** (armadilha: sob RLS um `UPDATE` que casa menos não
levanta erro — casa menos em silêncio; a única medição honesta é `UPDATE … RETURNING`, não `SELECT count`):

| caminho | linhas tocadas |
|---|---|
| `UPDATE` como **diretora autenticada** (`cc005f8c…`, claims reais) | **0 de 112** |
| `UPDATE` como **dono do canal** (sem trocar de papel) | **112 de 112** |

Causa, lida direto de `pg_policy`: `grades` tem **4 policies — `[a]` insert, `[d]` delete, `[r]` leitura de staff,
`[r]` leitura de família — e nenhuma de UPDATE**. O app só insere (grep no candidato `ar-candidato-v53-1-notas.html`:
3 × `from('grades').insert`, 0 update/patch) e o instrumento legado `NOTA GERAL` não existe no módulo novo. Logo:
isto é **backfill de dado anterior ao módulo pelo canal administrativo** — o mesmo por onde #185 e #187 passaram —
e não um caminho a abrir no produto.

**Controle positivo que a #189 não podia dar**: classificando dentro da transação, o aluno `0b1e67ef…` componente
`História` bimestre 1 passou de `bfr_term_average = null` para **`2.5`** (nota `2.50`, peso único 100), o boletim
passou de 0 para **4 de 16 células com média** e `bfr_term_unclassified` de `1` para `0`. Sem classificar, continua
`null`. O travesso era mesmo só a categoria.

**Candidata (`sql-classificar-historico-190-candidata.sql`, corpo 3.927 caracteres md5 `f5721545edd89ab91713747a31e3e37d`)**
— `UPDATE public.grades SET category='prova' WHERE category IS NULL` com guardas all-or-nothing: **G1** alvo dentro do
CHECK; **G2** exatamente 1 categoria aplicada na regra viva **e** ela é o alvo; **G3** censo inalterado (112 total e
112 sem categoria); **G4** cada linha pertence a componente com regra aplicada naquela categoria; **G5** selo
`md5(id:score)` = `dd8f0ebd3dc4fc5d979db68d32d39d07` (prova de que só a categoria muda); portão
`GET DIAGNOSTICS row_count = 112`; **POST1** zero linha sem categoria; **POST2** zero par parcialmente classificado;
**POST3** selo `id:score` igual depois; **POST4** nenhuma linha classificada com média `null`.

**Validação (`classificar-historico-190.mjs`, cada braço `begin;…rollback;`)**: os 4 braços de guarda abortaram pela
guarda certa — alvo `trabalho` → `G2: a categoria aplicada não é o alvo trabalho`; censo declarado 111 →
`G3: o censo mediu 111 linhas e hoje há 112`; selo zerado → `G5`; alvo `prova2` → `G1`. Ensaio da candidata real:
`{"media":"2.5","celulas_com_media":4,"ainda_sem_categoria":0}` e, **depois do rollback**, `selo_linhas igual = true`,
`sem_categoria = 112`, `policies = 4`, `triggers = 1`, `anon_pode_chamar = 0`. Braço de reversibilidade (classifica
e desfaz na mesma transação): `voltou_sem_categoria = 112` e o selo volta exatamente a `ecad7423…`. **Nada foi
escrito** — a prova disso é o selo conferido depois de cada braço, não a promessa.

**Reversão escrita ANTES de aplicar**: `rollback-classificar-historico-190.sql` (6.662 bytes) gerado por
`gerar-rollback-190.mjs` a partir dos 112 ids congelados em `retrato-antes-190.json` (md5 do retrato
`16bb08b473cfd623a3e760b82fe999c7`). Não é `set category = null where category='prova'` — isso apagaria lançamentos
legítimos futuros; a reversão devolve `NULL` **somente** nos ids congelados e recusa desfazer se alguma linha hoje
tiver categoria diferente, ou se algum id tiver sumido.

**Nada publicado, medido de novo** (`selo-fechamento-185-187.mjs`, agora com os artefatos da #190 na lista): URL
3.391.593 bytes md5 `554c3120b93ac8c6c9a96e9736d124d2` = `ar-implantado-v52.html`; função com a #185 aplicada
`5563df3a2fb7d04dbdd71ea49de745b8`; `regras 4 · grades 112 · com_categoria 0 · linhas_de_sonda 0 · anon 0`;
candidata PARADA intacta (`698c718e5fba5bb0f70148010c14ae6e`); diário da #190 diz `aplicada=false publicada=false`.

**O que faltava, com as palavras exatas à época**: não faltava decisão nem mecanismo — faltava **o OK de escrita**. Rodar
`node classificar-historico-190.mjs --apply` classifica as 112 em `prova`, e o mesmo script então confere score
intacto, regra/contexto/policies/triggers intocados, `anon` fechado e a média viva. Sem esse OK a tarefa #190
termina aqui: candidata validada, guardas provadas por dentro, reversão medida, zero rastro.

Armadilha paga nesta passada (nova **159**): reescrever um selo já congelado muda o resultado sem mudar o dado. O
aplicador da #187 calcula `md5(string_agg(g::text,…))` sobre um subselect **apelidado `g`**, onde `g::text` é a
**linha inteira**; dar nome à coluna e outro alias à tabela produz `f8a4841d…` sobre as mesmas 112 linhas — um
falso "o banco mudou". Regra da casa: selo de conferência é copiado byte a byte de quem o emitiu, nunca recriado de
memória. Segundo achado da mesma família: `pg_class.relfiredtrigger` não existe (`42703`) e `pg_policy` não tem
coluna `relid` (é `polrelid`); catálogo se lê com o nome da coluna vigente, não com o de outra versão.

### 37.15 #190 **APLICADA** no banco (21/10, ordem "OK" depois do portão): as 112 notas históricas estão classificadas, e o score não se moveu

A ordem que faltava chegou. `node classificar-historico-190.mjs --apply` rodou na casa, na ordem já validada —
baselina conferida (112/112 sem categoria, selos iguais aos diários, 1 regra aplicada, `anon` 0), as quatro guardas
provadas por dentro (G1/G2/G3/G5 abortaram cada uma pela própria mensagem), ensaio com rollback, reversibilidade
medida, e só então o `commit`. Diário completo em `aplica-classificar-historico-190.{json,log}`; o portão do apply
fechou `score intacto=true · 112 no alvo=true · regra/contexto/policies/triggers intocados=true · média viva=2.5 → OK`.

**Conferência independente** — `pos-aplicar-190.mjs` não reusa uma linha do aplicador; refez as consultas do zero e
salvou `pos-aplicar-190.txt`:

- `linhas 112 · sem_categoria 0 · com_prova 112`; selo das linhas virou `375cad8e23bd80813b4ae8444776f4f3` e o
  **selo `id:score` continua `dd8f0ebd3dc4fc5d979db68d32d39d07`** — exatamente a garantia desenhada: só `category` mudou.
- Distribuição por bimestre: `História` b1 61 notas (1,50–10,00), b2 40 (0,00–10,00), b3 11 (8,00–10,00) — todas com `prova`.
- **Efeito real no boletim**: `112/112` pares aluno×componente×bimestre agora devolvem média (`bfr_term_average`),
  contra zero antes. Amostra: LAVÍNIA b1 `2.5`, GRAZIELA b1 `7.5` / b2 `9.0`, AMANDA b1/b2/b3 `5.0/6.0/8.0`; as
  células do boletim sobem de 0 para 4, 8 ou 12 de 16 conforme o número de bimestres com lançamento, e
  `bfr_term_unclassified` = 0 em todas.
- **A reversão continua exata**: os 112 ids congelados em `retrato-antes-190.json` ainda existem, todos com `prova`,
  `fora_do_retrato=0`, `novas_sem_categoria=0`. Rodar `rollback-classificar-historico-190.sql` devolve o estado de antes.
- Nada mais se moveu: `selo_contexto` `5563df3a…`, policies 4, triggers 1, `anon` 0, e o **publicado byte a byte
  igual** — 3.391.593 bytes, md5 `554c3120b93ac8c6c9a96e9736d124d2`. A tela de notas por bimestre continua **fora do ar**:
  o dado está pronto, a interface é a #182, que pede OK próprio.

Armadilhas pagas nesta conferência (novas **160** e **161**): (160) uma constante de selo só vale para a **projeção
que a gerou** — conferir as regras com a projeção longa do diário da #187 (`d28f6753…`) contra a constante da projeção
curta do aplicador (`869484…`) produziu um "MUDARAM!!" falso sobre dado idêntico; o reparo é emitir as duas projeções
na mesma consulta e comparar cada uma com sua própria origem. (161) `res.text().length` em Node conta **unidades
UTF-16**, não bytes: uma página com 17.315 caracteres acentuados devolve 3.374.278 contra os 3.391.593 do diário, e o
md5 bate. Comprimento de HTML se compara com `Buffer.byteLength`, nunca com `.length` — e o portão continua sendo o md5.

### 37.16 #182 **PUBLICADA** (21/10, ordem "Aplica a 182"): a aba de notas por bimestre e categoria está nos bytes do ar, com linhagem provada antes do deploy e shell novo medido no navegador do usuário

O OK foi lido no escopo exato: **só publicar a candidata v53.1**. Ele não autorizou publicar a alternativa
v52.1 (filtro cirúrgico, 3.391.963 bytes, md5 `f6cf492f…`, continua em disco sem tocar) nem mintar conta
alguma — e é justamente a falta de conta do papel `pedagogical` que limita a prova de tela (§ abaixo).
Diário completo da vaga: `audit-publicacao-v53.json`; pré-voeu em `preflight-v53.txt`; conferência do bundle
em `confere-bundle-v53.json`; Chrome limpo em `prova-sw-v53.mjs`; personas no ar em `prova-ar-v53-notas.json`
e `prova-ar-v53-teacher.json`.

**Portões antes de escrever qualquer coisa** — nada disso é rotina herdada, foi medido naquele minuto:

| portão | medido | veredito |
| --- | --- | --- |
| A · o ar é o esperado | `/` 3.391.593 bytes md5 `554c3120b93ac8c6c9a96e9736d124d2`; `/sw-v4.js` 3.585 bytes md5 `e2ec178a1dbfade484dc8d7ee5493d43` com `CACHE='bfr-conecta-v52'` | CONFIRMADO, e os dois snapshots foram salvos (`ar-html-v52-live.html`, `ar-sw-v52-live.js`) **antes** da escrita |
| B · a candidata bate com o diário | os diários das geradoras gravam `bytes_entrada/bytes_saida` e **não** gravam md5 | conferido por bytes nas duas pontas: 3.391.593 → 3.406.687 (`5bd3474a…`) → 3.408.900 (`f08374b1…`), `igual=true` nos dois degraus |
| C · linhagem reproduzível | as duas geradoras rerodadas com `SAIDA`/`DIARIO` redirecionados para `tmp-linhagem-v53{,-1}.html` — **sem sobrescrever a candidata em disco** (`preflight-v53.mjs:39-58`) | regenerada = 3.408.900 bytes md5 `f08374b1258064a82d8503d08bff37e9`, igual à candidata: "SIM — a candidata é reprodutível a partir do v52 do ar"; se não batesse, o veredito seria `*** NÃO: alguém editou a candidata à mão ***` |
| D · nenhum marcador perdido | censo dos marcadores do v52 na candidata | `marcadores perdidos: 0` |
| E · o diff é do tamanho do desenho | 285 linhas adicionadas / **7** removidas em 19 hunks | cada uma das 7 removidas está substituída dentro do próprio hunk (`::before` de `#academicTable`, o pill de 12px, o `Promise.all` do carregador, os dois `query('grades'…)`/`learning_student_progress` condicionais e os dois `const subject`/`const term` lidos do DOM) |

`bfr-conecta-patched/` **não foi usado** (memória [[bfr-patched-nao-e-producao]]): ele carrega o backlog #104–#110
e regrediria v41–v52. O SRC publicado (`bfr-candidata-v53-1-notas/`) foi montado do ar + a candidata por
`prepara-src-v53.mjs`, com portão de ocorrência (`ocorrencias !== 1` aborta) na linha do `CACHE`, e a saída
conferida por `confere-bundle-v53.mjs`, que **relê** o `const HTML`/`const SW` de dentro do `worker.mjs` gerado:
`html_igual_a_candidata true`, `sw_dif_do_ar_linhas 1` (só `const CACHE = 'bfr-conecta-v52'` → `'bfr-conecta-v53'`),
`?v=13` igual nos dois lados do PRECACHE, e **12/12 assets byte-idênticos ao ar e ao SRC do v52** (irmã de `rp.js`
continua `a2cacc7e00986b2e87fcaae3cbce4faa`).

**O deploy.** `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID npx --no-install wrangler deploy` com o grant
OAuth do wrangler — `~/.cf-token` está expirado e **nenhuma credencial** entrou em linha de comando ou chat.
3.378,44 KiB enviados (gzip 756,69), 11,99 s, `deployment 3f9e034f-6620-4bc5-8b8a-deb10ca2aad6` criado às
21:02:51,725Z, **`version 2525fabb-e8fa-4aa0-b987-27d346f17792`**; anterior no ar: `f96189d8…` / `2fbc47fd…` (v52).
O `No updated asset files to upload` do wrangler **não** prova nada sozinho — a prova é o md5 do `/` abaixo.

**Depois, medido por HTTP três vezes:** `/` 3.408.900 bytes md5 `f08374b1258064a82d8503d08bff37e9` nos três fetches
(`todos_iguais=true`), `/sw-v4.js` 3.585 bytes md5 `65382f27bffcc55b98f87b22a77d43ee` com
`const CACHE = 'bfr-conecta-v53'`, `/bfr-responsive-presentation.js` inalterado. Delta publicado **+17.307 bytes**.
As marcas do módulo apareceram no ar onde antes eram **0**: `renderGradeGrid 2 · bfr-grade-grid 4 ·
data-bfr-grade-cell 2 · bfr_grading_rules 2 · data-academic-tab="notas" 2`; as três marcas do v52/anteriores
(`bfr-coord-birthday-columns ul 2`, `bfrPnIsSkipped 2`, `bfr-route-scroll-memory 1`) continuam nos mesmos números.
Não houve bump de `?v=` porque o `PRECACHE` do ar já pedia `rp.js?v=13` e o HTML já era servido com esse sufixo;
só o nome do `CACHE` muda, e o `install` do service worker apaga todo cache com prefixo `bfr-conecta-`.

**A prova que vale para quem já tinha o app aberto** — Chrome limpo, `prova-sw-v53.mjs`: registro `ativo=activated`,
`script …/sw-v4.js?v=45`, `caches.keys()` = **só** `["bfr-conecta-v53"]`, e o corpo de `/` guardado dentro dessa
cache tem 3.391.506 caracteres e md5 `f08374b1258064a82d8503d08bff37e9` = a candidata. O hash foi computado **fora**
da página (Node): WebCrypto não tem MD5. No censo de boot (12 recursos) o único não-200 continua sendo o beacon
`cdn-cgi/rum?` 404, que já era assim no v52 — nenhuma URL do app passou a falhar.

**O que NÃO foi possível provar no ar, com a causa medida — não é suposição.** Com a sessão real que existe
(developer, `bfr-audit-session-live.json`), o boot na URL publicada cai em `view=admin`, `secao=inicio`,
`profileRole=developer`, `#academicPanel` ausente; `?role=teacher` na URL **não** vence o boot do ar. Forçando o
controle de persona do próprio app (`[data-preview-role="teacher"]`, `prova-ar-v53-teacher.mjs`) a tela do professor
monta — `view=teacher`, `secao=professor-inicio`, `#academicPanel=true` — mas as abas continuam sendo as duas
originais (`grades:Notas`, `attendance:Frequência`), **a aba nova não aparece**, `celulas 0`, e o escopo docente
mede `loaded:false · turmas 0 · alunos 0 · notas 0 · regra.checada:false`. A causa é a que o ensaio local já tinha
apontado e agora está confirmada no ar: **sem escopo carregado, o loader que chama `ensureAcademicUi()` não roda**,
e o módulo é do papel `pedagogical` real — que não existe entre as contas sintéticas. `rede()` registrou **0
escritas**; @390 a tabela antiga segue sem estouro horizontal (`medida_390` do diário, rerodado às 21:26:48Z com
`boot_inicial` e a banda mobile gravados em arquivo, não só no console: `linhas 40 · estouro 0 · cabecalhos
Aluno · Média · Última avaliação · Bimestre · celulas 0`). Cinco erros de console sobraram desta passada (3×404,
2×400) e **não foram atribuídos a URL nenhuma**: o `Log.entryAdded` do CDP os registra e o `Network.responseReceived`
vinha vazio, então `respostas_400_ou_pior` ficou `{}` — fica registrado como limite do instrumento, não como
"sem erros". Por isso a evidência de render/clique desta tela continua sendo a do **harness local com os
mesmos bytes** (#183 v53, #184 v53.1 com os 8 defeitos corrigidos; `ensaio-v53-1.json` cita
`ar-candidato-v53-1-notas.html`, e o md5 do `/` é o md5 daquela candidata). Provar a tela com professor de verdade
pede conta do papel: **mintar escreve em `auth` e é OK próprio**.

**Reversão congelada:** devolver `ar-html-v52-live.html` (3.391.593, md5 `554c3120…`) e `ar-sw-v52-live.js`
(`CACHE='bfr-conecta-v52'`, md5 `e2ec178a…`) no mesmo SRC e rodar o mesmo builder + `wrangler deploy`.

**Selo da passada** (`node selo-fechamento-185-187.mjs`, rerodado depois do deploy):
`publicado=v53.1 (#182 publicada, CACHE bfr-conecta-v53) · funcao=com a #185 aplicada · notas=112 linhas, 112
classificadas pela #190, score com o selo legado dd8f0ebd… (intacto), 0 linhas de sonda · regra cadastrada=true ·
anon fechado=true`. Nenhum DDL nesta vaga; os 12 assets e o banco estão como estavam.

Armadilhas pagas nesta vaga (novas **162**, **163**, **164** e **165**, registro em [[bfr-audit-rig-traps]]):
(162) somar caminho a um
`URL_AR` que já termina em `/` produz `//sw-v4.js`, e o Worker responde **200 com o HTML** em vez de 404 — o selo
leu `CACHE='?'` silenciosamente e não houve erro nenhum para avisar; monta-se URL com `new URL('sw-v4.js', base)` e
confere-se o `content-type` antes de extrair a linha. (163) `avaliar()` do `cdp.mjs` embrulha a expressão em
`(async()=>{ … })()`: sem `return` explícito, ou passando a **função** em vez de chamá-la, o resultado é
`undefined` e a leitura parece "controle morto" — duas linhas do rig pareceram falsas até virar `return espia()`.
(164) `'' + new Set(x).size === 1` imprime `false` porque a concatenação roda antes da comparação: um portão de
"as três leituras bateram" gritou divergência sobre três md5 **idênticos**; portão se calcula em variável e só
depois se imprime. (165) `Log.entryAdded` e `Network.responseReceived` não são o mesmo observador: o primeiro
registrou os 5 erros de rede, o segundo veio vazio, e um diário que só lista `respostas_400_ou_pior` diria
"0 respostas ruins" sobre uma tela com 5 — as duas fontes têm de ser impressas lado a lado, com a atribuição
falhando explícita quando falha.

### 37.17 Conta `pedagogical` real mintada e medida (21/10, ordem "OK" sobre a lista do §37.16): a conta era necessária e **não é suficiente** — o módulo está preso ao portão da grade publicada

**Escrita feita:** uma conta sintética no papel real do módulo. `node cria-sessao-audit.mjs pedagogical` →
`auth.users` + `public.profiles` (`0e3404ab…`, `auditoria-sintetica-pedagogical-823b31ec@bfr-conecta.test`, senha
gerada e gravada em `bfr-sintetica-cred-pedagogical.json`, nunca impressa), manifesto `bfr-audit-contas.json` agora
com **5 contas vivas** (developer, student, coordinator, sports_operator, pedagogical). Conferência por SELECT
(`ler-contas-vivas.json`): as 5 com `auth=true` e `tem_senha=true`. O papel foi validado contra o enum real antes
da mint (`ler-preflight-pedagogical.json`): `account_role` tem 14 valores e inclui `pedagogical`; a base tinha
**exatamente 1** perfil `pedagogical` real (uid `c3abaa3a…`, dono dos 5 vínculos de `bfr_teacher_class_subjects`) —
nenhuma credencial dele foi tocada nem mintada.

**Medida no ar com o papel real — `prova-ar-v53-pedagogical.json` (porta 9391, 22:12Z):** o loader do módulo **roda**,
o que a persona nunca conseguiu: `view=teacher`, `profileRole=pedagogical`, `#academicPanel=true`,
`teacherScope.loaded=true` (antes: `loaded:false`). Mas `teacherScope.error` = *"Não foi possível confirmar as turmas
vinculadas a este professor."*, `turmas 0 · alunos 0 · notas 0`, `academicStatus="Dados das turmas indisponíveis"`,
abas ainda as duas originais, **aba "Notas por categoria" ausente**, `escopo=false`, `celulas 0`, `0 escritas`,
`0 respostas >= 400`, 3 erros de console 404 sem atribuição de URL (limite do instrumento, armadilha 165).

**Causa, medida e não deduzida — a cadeia inteira (`sonda-escopo-pedagogical.mjs` + `ler-manager-grade.json` +
`ler-policy-versions-read.json`):** o abortamento não vem da `bfr_teacher_context()` da #185. Com a sessão da conta,
o RPC responde **HTTP 200** e devolve `{grades,classes,students,attendance,assignments}` todos zerados, `error: null`
— a projeção da #185 está viva e autorizada. Quem aborta é `loadScopedSchedule()`
([ar-candidato-v53-1-notas.html:16397-16401](file:///C:/Users/pcmac/.kiro/crew/uploads/ar-candidato-v53-1-notas.html#L16397)):
ele exige uma linha visível em `bfr_schedule_versions` com `school_year=2026` e `status='published'`. A linha **existe**
(censo: `2026/published=1`, `entries=594`, todos na versão publicada), mas pela policy
`bfr_schedule_versions_read` um `authenticated` só a enxerga se for `bfr_is_schedule_manager()` — que é
`current_role() in ('developer','coordinator','director','secretary')`, **sem `pedagogical`** — ou se tiver entry na
versão via `bfr_current_teacher_id()`, ou for responsável de aluno de turma com entry. A conta sintética não tem
`bfr_teacher_directory` vinculado (`directory_com_profile=1`, e o único vínculo é o do professor real, com 10 entries)
nem `guardian_students`: o REST responde **HTTP 200 com `[]`** (não 401 — não é recusa, é filtro de RLS), o
`maybeSingle()` devolve `data:null` sem `error`, a linha 16399 cai em `{error:'Grade publicada não encontrada.'}` e a
16456 pinta `secure.error`; `ensureAcademicUi()` nunca roda, logo a aba não é injetada. Medido também por clique no
handler delegado do próprio app (`#teacherOpenGrade`, :17036, com botão injetado e removido na mesma expressão,
`prova-ar-v53-modulo-pedagogico.json`): **o módulo não monta por esse caminho enquanto o escopo estiver em erro** —
`aba notas AUSENTE mesmo apos montar`, `escopo=false`, `0 escritas`.

**Consequência de produto, registrada como achado (não como decisão):** o lançamento de notas por categoria está
**acasalado ao portão da grade publicada**. Um professor com vínculo em `bfr_teacher_class_subjects` mas sem entry na
versão 2026 publicada — ou sem linha em `bfr_teacher_directory` apontando para o perfil — não abre a tela nunca,
independentemente de ter turmas e notas. Isso é uma escolha de código (`loadScopedSchedule` antes do `ensureAcademicUi`),
não um defeito de banco, e é o motivo pelo qual a prova de render no ar continua em aberto.

**Armadilha nova paga nesta passada (166):** usar o `access_token` como `apikey` num pedido direto ao PostgREST dá
**401 "Invalid API key"** em *todas* as queries e parece RLS fechada; o `apikey` é a publishable key pública que o
próprio HTML define (`SUPABASE_KEY = 'sb_publishable_…'`, lida do ficheiro e nunca impressa). Com o header errado a
sonda teria concluído "o professor não lê a grade" quando a verdade medida é "a policy deixa ler e devolve zero
linhas por vínculo".

### 37.18 Candidata v54 — o desacople do módulo de notas da grade publicada, medido em A/B no harness local (21/10, ordem "implementar a solução de código desacoplada"); publicação no §37.19

**O que foi feito:** a opção (c) do §37.17 virou candidata de código, sem tocar no ar nem no banco.
`gera-candidata-v54-desacople.mjs` aplica **dois hunks** sobre os bytes exatos do ar (v53.1, 3.408.900 bytes,
md5 `f08374b1…`) e prova o diff por invertibilidade (o inverso de cada hunk casa 1 vez e recompõe o original byte a
byte; diário `candidata-v54-desacople.json`, `linhas_dos_hunks 18 removidas / 20 novas` — texto dos hunks; o diff
real (`-U0`) tem **12 removidas / 14 adicionadas em 3 hunks**, porque as linhas comuns aos dois lados não entram):
(1) `escopo-pelo-vinculo-nao-pela-grade` — em `loadScopedSchedule()` o erro da grade deixa de abortar
(`scheduleEntries = scheduleResult?.error ? [] : …`) e as turmas/disciplinas passam a sair de
`bfr_teacher_class_subjects` filtrado por `profile_id = userId()` e `active = true`, com a grade publicada como
fallback quando não há vínculo legível; (2) `rotulo-de-disciplinas-do-vinculo` — o rótulo do perfil passa a listar as
disciplinas do vínculo (`secure.classSubjects`) em vez de ficar vazio. Candidata:
`ar-candidato-v54-desacople.html`, **3.409.714 bytes, md5 `a2fce2599e04433a93bb954a95286e93`** (27.675 linhas),
`node --check` do script e das duas cópias do bundle aprovado; **não aplicada ao patched e não publicada**.

**A/B na mesma fixture, 6 braços (`prova-candidata-v54-desacople.{json,log}`, harness 8271, conta `pedagogical`
real, 0 escritas):**

| braço | bytes | vínculo | grade publicada | resultado medido |
|---|---|---|---|---|
| A | ar (v53.1) | sim | **não** | bloqueia: *"Não foi possível confirmar as turmas vinculadas…"*, `turmas 0`, sem aba `notas`, 0 células |
| B | cand v54 | sim | **não** | monta: `turmas 1 · alunos 3 · notas 3`, aba presente, `linhas 3 · células 1`, pesos `100% + 3× não se aplica`, médias `8,0 / 5,0 / Aguardando: 1 de 1`, delta 0 |
| C | cand v54 @390 | sim | **não** | idêntico a B na largura mobile: `linhas 3 · células 1`, delta 0 |
| D | ar (v53.1) | sim | **sim** | referência de regressão: mesmo render de B |
| E | cand v54 | sim | **sim** | **paridade** com D: mesmas médias, mesmos pesos, mesmas linhas, `error:""` |
| F | cand v54 | **não** | não | controle de autorização: *"Nenhuma turma foi vinculada…"*, `turmas 0`, 0 células |

A célula editável é **1**, não 3, porque dois dos três alunos da fixture já têm lançamento de prova (span `8,0`/`5,0`
+ pill `Corrigir`) e só o terceiro recebe `input[data-bfr-grade-cell]` — os portões do ensaio foram corrigidos para a
forma real do DOM (linhas 3, células 1, 3 médias, 4 pesos). A consulta de vínculo foi capturada na rede com
`profile_id=eq.0e3404ab…&active=eq.true`; as consultas de `bfr_schedule_versions`/`entries` do braço sem grade foram
ao banco real **e voltaram zero por RLS** — é o estado do defeito, não fixture. O braço F prova que o desacople não
inventa turma: sem vínculo, o loader segue recusando com a mensagem original. Nenhum POST de escrita em nenhum braço
(o único POST barrado é o beacon `/cdn-cgi/rum?`; 0 erros de console não-rede). **Os 8 portões do ensaio estão verdes**
na re-execução que gerou o diário em disco: defeito reproduzido no ar, candidata renderiza com vínculo e sem grade,
@390 sem estouro, paridade com grade publicada, controle sem vínculo, filtro por `profile_id`+`active`, zero escrita,
zero erro próprio.

**Armadilha nova paga aqui (167):** `bfr_schedule_entries.teacher_id` referencia `bfr_teacher_directory.id`, **não**
`profiles.id`; a primeira fixture semeou o uid do perfil e o app continuou lendo `entries=0` (o embed é
`teacher_directory!inner(display_name, profile_id)` e a comparação é com `directory.profile_id`), o que por horas
reforçou a hipótese de "grade não publicada". Ver [[bfr-audit-rig-traps]].

**Estado:** conserto **medido e pronto em disco**, nada publicado nesta seção — a publicação veio depois, com OK próprio ("Publicar a candidata v54"), e está no §37.19; depois do deploy, os 14 cenários do brief §8 na URL pública continuam sendo o teste que falta. Arquivos:
`gera-candidata-v54-desacople.mjs`, `ar-candidato-v54-desacople.html`, `candidata-v54-desacople.json`,
`audit-harness-desacople.mjs`, `prova-candidata-v54-desacople.{mjs,json,log}`, capturas
`prova-v54-{air,cand}-{vinculo,vinculo-grade,espio}-{1280,390}.png`.

---

### 37.19 v54 **PUBLICADA** (21/10, ordem "Publicar a candidata v54"): o desacople está nos bytes do ar, com cinco portões verdes e o shell novo provado num Chrome limpo

**Antes (medido, nunca presumido).** O ar era o v53.1: `/` 3.408.900 bytes md5 `f08374b1258064a82d8503d08bff37e9`,
`/sw-v4.js` 3.585 bytes md5 `65382f27bffcc55b98f87b22a77d43ee` com `CACHE='bfr-conecta-v53'` (deploy `3f9e034f-6620-4bc5-8b8a-deb10ca2aad6`,
version `2525fabb-e8fa-4aa0-b987-27d346f17792`). O preflight baixou o ar três vezes, gravou os instantâneos de reversão
`ar-html-v53-live.html` + `ar-sw-v53-live.js`, regenerou a candidata a partir desses bytes e exigiu md5 igual ao de disco —
**8/8 verde** (`preflight-v54.txt`): linhagem reprodutível, **0 marcadores perdidos**, diff real `-U0` de **12 removidas / 14
adicionadas em 3 hunks**. O SRC cirúrgico (`prepara-src-v54.mjs`, **4/4 verde**) ficou com o index da candidata
(`a2fce259…`), o SW **baixado do ar** com **uma única linha trocada** (`CACHE` v53→v54, md5 `0e6902a900f77e033e1e98a7bacc20bb`) e
**12/12 assets byte-idênticos ao ar** (e ao SRC do v53). O portão do bundle (`confere-bundle-v54.mjs`) achou o HTML embutido
byte-idêntico à candidata, o SW embutido com exatamente 1 linha de diferença do ar e **nenhum `bfr-conecta-v53` sobrando** no
HTML ou no SW — **VERDE**.

**O deploy.** `wrangler deploy` dentro de `worker-deploy-v54/`, com `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` removidos do
ambiente para valer o grant OAuth: **deployment `cd21c909-8a93-43cf-abc1-5affa42c806a`, version
`74cc2f8f-b4a8-4ecf-9c59-17a53d8735a8`, 2026-10-21T23:09:50Z**; upload de 3.379,25 KiB (gzip 757,03 KiB), 12 arquivos de
assets lidos, "No updated asset files to upload".

**Depois (portão do ar, `confere-ar-v54.mjs`, VERDE).** Três `GET /` com `cache:no-store` devolveram **os três**
3.409.714 bytes md5 `a2fce2599e04433a93bb954a95286e93`, idênticos à candidata em disco; `/index.html` devolve os mesmos bytes.
`/sw-v4.js` 3.585 bytes md5 `0e6902a900f77e033e1e98a7bacc20bb`, `CACHE='bfr-conecta-v54'`, `Cache-Control: no-cache`, e **1**
linha de diferença contra o SW do v53 (só o `CACHE`). **12/12 assets** byte-idênticos e **15/15 rotas** em 200
(`/`, `/index.html`, `/sw-v4.js`, `manifest.json`, logo, avatares e os três PDFs/PNGs/JS). Marcadores publicados intactos:
modal do nome 2×, rolagem 1×, `rp.js?v=13` 1×, aniversários/colapso 2×, roteador 20× e o vínculo 1×. O rótulo
"cadastro só-leitura (v50)" do censo mede `ALVO_ADMIN_RESTANTE` **0× também no ar v53** — é rótulo impreciso do script de
censo, não regressão desta publicação.

**Cliente (`prova-sw-v54.mjs`, VERDE).** Chrome headless com perfil temporário limpo: o SW registra, ativa e controla a
página; `caches.keys()` devolve **só `bfr-conecta-v54`**; o body de `/` guardado na cache tem **md5 `a2fce259…`**, igual à
candidata, e continua igual depois do reload (activate → claim → navigate). Os únicos erros de console são **2–3 404 de
`/cdn-cgi/rum?`**, beacon de Web Analytics injetado pela borda da Cloudflare — não é recurso do app, o Worker não serve
`/cdn-cgi/*`; **0 erro de aplicação**. Diário `prova-sw-v54.json`.

**O que esta publicação não prova (e não foi autorizado).** O banco **não foi tocado** nesta passagem (0 escritas). A conta
sintética `pedagogical` continua **sem linha em `bfr_teacher_class_subjects`**, então abrir a URL pública com ela ainda cai na
recusa original *"Nenhuma turma foi vinculada…"* — o desacople está publicado, mas a tela ao vivo com vínculo real exige
**linha de vínculo para um professor real** (OK separado) ou a credencial do professor; os 14 cenários do brief §8 na URL
pública seguem sendo a medição que falta. Item 179 (notas do responsável) e a limpeza das contas sintéticas continuam
pendentes.

**Reversão congelada.** `ar-html-v53-live.html` + `ar-sw-v53-live.js` + os 12 assets do SRC do v54 (inalterados): montar um
SRC com esses bytes, `node build-worker-bundle-cand.js <SRC> worker-deploy-v53-reversao`, conferir o bundle e
`wrangler deploy` — volta a `/` md5 `f08374b1…` e `CACHE='bfr-conecta-v53'`. **Requer OK próprio.** Selo e números completos
em `audit-publicacao-v54.json` (diários: `preflight-v54.txt`, `prepara-src-v54.txt`, `confere-ar-v54.txt`, `prova-sw-v54.json`).

*Gerado por `audit-relatorio.mjs` sobre os diários: 164 medidas @390 no harness (build da época), 164 re-medidas @390 no build corrigido, 164 medidas @390 **na URL publicada** (`audit-sweep-publicado.json`), 820 @mobile (portão de assentamento; a versão anterior, com 208 linhas de painel pela metade, está em `audit-sweep-mobile.sem-portao.json`), 656 @web, 7 com a conta sintética de **aluno** (`audit-sweep-aluno.json`), 5 com a de **responsável** (`audit-sweep-pai.json`), 4 com a de **operador esportivo** (`audit-sweep-operador.json`, harness 8243), 6 medições de `probe-larg.mjs` em navegador limpo, 148 cliques no diário antigo de 14/10 (`audit-clicks.jsonl`, ler com a lente da seção I) + 1281 cliques na passada com firewall (`audit-clicks-seguro-824{0,1,2}.jsonl`), 13 perfis.*
Telas ainda sem medição: 0 de 164; sem reteste: 0 de 164.

---

### 37.20 v55 **PUBLICADA** (22/10 00:30Z, ordem "Publica a v55 agora"): LIA única, drawer canônico e três defeitos de texto nos bytes do ar

Deploy `de834a20-3321-4387-863a-fa130f3df2d3`, version `6ba78bf9-6c98-466b-819c-991b7314ecc7`. `/` **3.409.668 bytes md5
`d5075fa520154cadb55809822478afc5`** (três fetches iguais e igual à candidata em disco); `/sw-v4.js` md5
`d472d7966e5ac7ce5d639ba26e2a01cd` com `CACHE='bfr-conecta-v55'` e `PRECACHE ?v=14`; **12/12 assets** e **15/15 rotas 200**.
Cliente em Chrome limpo: SW ativo/controlador, cache única `bfr-conecta-v55` com o `/` byte-idêntico, 1 acesso à LIA em 390 e
1 em 1280, drawer com 13 rotas, barra de 5 atalhos e textos corrigidos — portões A/B/C/D verdes. Reversão congelada
(`ar-html-v54-live.html` + `ar-sw-v54-live.js` + assets do SRC v54) exige OK próprio. Diário `audit-publicacao-v55.json`.

### 37.21 Item #179 **FECHADO** (22/10): o boletim do responsável visto na URL pública v55, com conta `parent` real e RLS

A tela só existia medida estaticamente porque a conta sintética de responsável fora apagada em 18/10 e `BFRPlatform.open()`
lê o papel real da conta. Conta temporária `parent` `fd0163d2…` criada com o rig e vinculada por uma linha temporária em
`guardian_students` ao aluno real `a694eaf4…` (MARIA GRAZIELLY SANTOS VIEIRA, 6º ano G, 3 notas). Pré-voo REST com a sessão
temporária (`prova-179-rest.{mjs,json}`): perfil parent=1, vínculo=1, alunos=1, notas=3 (10/9/8), outro aluno=0 notas/0
linhas — a RLS isola a família. Sonda na URL pública v55 (`sonda-179-responsavel.mjs`, Chrome limpo,
`sonda-179-responsavel.json` + 3 PNGs): @390 e @1280 com `papel=parent`, `#parentView` visível e as views de staff ocultas,
filho e turma corretos, seletor com 1 opção, card **"9,0 · 3 lançamentos no boletim"**, boletim com uma linha
`História 10,0 9,0 8,0 —` e média 9,0, zero nome de outra família no DOM, **0 escrita** em `/rest/v1` ou `/rpc`, 0 exceção de
aplicação. Portões A–E verdes. O primeiro run deu falso vermelho só no portão C porque o regex `^História\b` não casa
`História10,0…` (a→1 não é fronteira de palavra); corrigido o instrumento, o mesmo dado passou. Depois da medida, o vínculo
temporário foi removido e a conta apagada (§37.22). Nada do app foi alterado.

### 37.22 Limpeza das contas sintéticas (22/10): 6 apagadas, 0 restos, dado real intacto

`apaga-contas-2026-10-21.mjs` apagou as 5 do rig — coordinator `b4dbaa51…`, developer `7bf6e64b…`, sports_operator
`aaadabbc…`, student `2fdff15c…`, pedagogical `0e3404ab…` — e o responsável temporário do #179 `fd0163d2…`: cada um com
e-mail `@bfr-conecta.test` reconferido, vínculo/`profiles` removidos e `auth DELETE HTTP 200`; restos
`auth:0/profiles:0/guardian:0` em todas. O inventário prévio (`limpa-contas-2026-10-21-ler.*`) mostrou que a única referência
além do vínculo do #179 era 1 linha efêmera em `internal_chat_presence` (CASCADE). Conferência final
(`confere-pos-limpeza-2026-10-21.json`): contas e perfis com e-mail de teste **0**, referências restantes **[]**, 24 perfis no
total (a conta de QA `bfr.qa.email` segue existindo e oculta pela policy; não foi pedido apagá-la), **112 notas**, aluno-alvo
com **3 notas**, **3 vínculos** de responsável. **17 artefatos locais** (11 sessões + 6 credenciais) foram apagados só após
decodificar o `sub`/`id` e confirmar que cada um apontava para uma das 6 contas mortas
(`audit-limpeza-artefatos-2026-10-21.json`); o manifesto `bfr-audit-contas.json` ficou `[]`. Diários:
`audit-limpeza-contas-2026-10-21.json`, `limpa-contas-2026-10-21-ler.json`.

### 37.23 Candidata v60 — D1, D2 e D4 consertados, D3 aplicado no banco e v60 PUBLICADA (22/10)

**Os defeitos (suite v59 no harness, tarefas #233/#234):** D1 o inbox de recados fica invisível na Frequência — a regra
`#teacherView > :not([data-teacher-professional]):not([data-bfr-reading-panel]):not([data-bfr-reading-assist-usage]):not([data-teacher-aee-bridge]) { display:none !important }`
vale especificidade (1,4,0) e o painel do inbox não tem nenhum dos atributos da whitelist. D2 corrida do painel de Leitura
Assistida: o rebuild do scopeKey roda sem guarda e o painel morre na corrida (medido `travou:true`, `regenerou:false`,
`posChegada` vazio). D4 o texto de confirmação do salvamento é pintado por cima: o ciclo
`saveSecureGradeBatch → gradeGridStatus(confirmacao) → setTeacherState → renderAll → renderGradeGrid` repinta
'Regra da escola: …' sobre a confirmação. D3 (atividade escolar 403) é banco, não código — candidata SQL pronta, ver adiante.

**A candidata:** v60 = v59 + **exatamente 5 hunks** (diff provado byte a byte): 2072 whitelist ganha `:not([data-teacher-inbox])`;
5579 a navegação chama `syncTeacherInboxVisibility?.()`; 11047-11054 + 11073 a função nova de sincronização; 12996-13003
guarda do scopeKey do painel de leitura; 18314-18319 repaint da confirmação depois do ciclo do D4.

**O instrumento:** `mede-v60-ab-d1d2d4.mjs` (portas 8263=v59 / 8265=v60, larguras 390/1280, `AUDIT_GRADES_WRITE_OK=1` para
ecoar as escritas): D1 estado do inbox em 3 telas (frequência/início/volta), D2 corrida congelar→regenerar, #240 clique no pill
de correção com settle da rolagem suave (armadilha #174: esperar o scrollY assentar e re-verificar o hit no instante do
disparo), D4 abas com retry, statusAntes/Depois, `ehConfirmacao`/`ehRegra`. Diário consolidado `mede-v60-ab-d1d2d4.json`
(partes `-390`/`-1280` por banda).

**Resultado das 4 células** (v59/v60 × 390/1280):

| célula | D1 frequência/volta | D2 corrida | D4 status depois de salvar | #240 modal |
| --- | --- | --- | --- | --- |
| v59@390 | `display:none`, 0px | travou, não regenera (`['']`) | 'Regra da escola: Prova 100%…' (`ehRegra`) | abre, conteúdo correto |
| v59@1280 | `display:none`, 0px | travou, não regenera (`['']`) | 'Regra da escola: Prova 100%…' (`ehRegra`) | abre, conteúdo correto |
| v60@390 | `display:block`, **193px** | travou e **regenerou** (anos `['','6','7']`) | **'1 de 1 lançamento(s) salvos.'** | abre, conteúdo correto |
| v60@1280 | `display:block`, **187px** | **nem travou** (regenerou) | **'1 de 1 lançamento(s) salvos.'** | abre, conteúdo correto |

- **D1:** a v59 esconde o inbox nas três telas; a v60 mostra na Frequência e na volta (193/187px). Em Início ele segue oculto
  por classe própria (`hiddenClasse:true`) — desenho, não defeito; a v59 o escondia em todo lugar pela whitelist.
- **D4 é defeito de exibição, não de gravação:** o `fx` das duas bandas termina em `echo POST grades` — a escrita acontece
  na v59 também; o que a v59 perde é a confirmação (o status volta a ser a regra).
- **#240:** o modal 'Corrigir nota' abre nas **4 células** com conteúdo idêntico e correto (eyebrow 'Correção de nota · NOTA
  GERAL', 2º bimestre, ALUNO ENSAIO 6A UM, nota 8; aluno/disciplina/avaliação/bimestre travados). O gap anterior era do
  próprio rig: com `scroll-behavior:smooth` o clique disparado antes da rolagem assentar caía em coordenada à deriva
  (armadilha #174); corrigido, o caminho de correção funciona nas duas bandas — a suite fica fechada como gap de instrumento.

**Achados compartilhados (não são regressão da v60):**
- *Primeiro clique engolido na aba notas:* a 390 as duas bandas engolem o primeiro clique verificado (`tent1` → tab fica
  'grades', `tent2` ~1,3s depois → 'notas'); a 1280 não ocorre (`tentativas=1` nas duas). Pré-existente, material de item
  próprio (42), não tocado pela v60.
- *Churn da v59 nos command-cards:* ~300 muts/s em `.bfr-teacher-command-card/.bfr-teacher-command-pending` (4758/15s,
  persistente); a v60 tem 0. A hipótese "a whitelist do D1 causa o loop" foi **refutada** por `sonda-loop-lia8.mjs`
  (desocultação forçada do inbox com `inline !important` → churn continua igual); mecanismo não atribuído — fica como
  observação v59-only que a v60 elimina de fato.
- *404-storm da v60@390* (102 erros de console, 99× `lia-avatar.png`): exclusivo do ambiente de fixture — o harness não
  serve a imagem e produção serve 200 (medido por curl). Mecanismo: o Chromium re-dispara o fetch quando um `img.src` é
  re-atribuído ao mesmo valor após falha; a v59 tem churn denso (52 muts/s) que cai na dedupe de request em voo, a v60 tem
  rajadas esparsas (~1/s) que escapam da janela. Sem efeito em produção.

**Estado:** PUBLICADA. Deploy cirúrgico 22/10 21:12Z, Version ID `79112a32-8953-4947-9893-73f88aa2132e` (log `deploy-v60.log`).
`/` md5 `36feaad4fb5a033a2f011de336a4667e` (3.481.301 B), SW md5 `042670477d613d3044b4e4298a891db4` com `CACHE bfr-conecta-v60`,
rp.js `a83f77ba…` inalterado desde a v59, 12/12 assets iguais. Portões da casa, todos verdes: preflight (`preflight-v60.json`,
ar == v59 `2e403607`, diff do index byte-igual ao congelado `diff-v60-esperado.txt`, 5/5 assinaturas novas, diff do SW = a única
linha do CACHE); confere-bundle (`confere-bundle-v60.json`, HTML embutido == SRC `36feaad4`, SW == SRC com 1 linha de diferença
do ar, marcas v59 preservadas + marcas v60 presentes, seedItems/sample 0); HTTP (`prove-v60-no-ar.json`, 3 fetches de `/` com o
mesmo md5); cliente em Chrome limpo (`prova-sw-v60.json`, cache única `["bfr-conecta-v60"]`, SW activated e controlado, body
cacheado byte-igual à candidata, 2 erros de console = só beacons `/cdn-cgi/rum?`). A autenticação do deploy usou o grant OAuth
do wrangler com `CLOUDFLARE_API_TOKEN/API_KEY/ACCOUNT_ID` apagados do ambiente — o token de `~/.cf-token` responde 10000 (sem
escrita no worker, medido). Diário completo: `audit-publicacao-v60.json`.

**D3 APLICADO NO BANCO 22/10 (OK "Aplicar o SQL"):** `node apply-sql.mjs sql-d3-school-activities-insert.sql --apply` →
HTTP 201. Prova de aplicação por leitura do catálogo (`d3-ler-policy-pos.sql`, HTTP 201): `polname school_activities_staff_insert`,
`polcmd *`, `using NULL::boolean`, `with_check ((bfr_is_schedule_manager() OR (is_aee() AND bfr_teacher_can_manage_class_subject(class_id, subject)) OR ((("current_role"())::text = 'pedagogical'::text) AND bfr_teacher_can_manage_class_subject(class_id, subject))) AND (published_by = auth.uid()))`
— o `"current_role"()` entre aspas é o deparser do `pg_get_expr` desambiguando a função do app da `pg_catalog.current_role`
(prova comportamental: o INSERT do dry-run passou com `set local role authenticated`, o que a função do catálogo — que devolve
'authorized…/authenticated' — nunca aprovaria). Prova comportamental transacional ANTES/DEPOIS (método da casa para policy de
INSERT, sem escrever nada): ANTES (`d3-dryrun-antes.sql`) `HTTP 400 · 42501 new row violates row-level security` — defeito
confirmado; DEPOIS (`d3-dryrun-depois.sql`, drop+create dentro de `begin`, claims locais do perfil pedagogical real
`c3abaa3a-…` com o vínculo vivo `(class_id 5e6d0744-…, subject História)`): `HTTP 201 · id d3908c41-…` — o braço novo aprova.
Conferência pós-aplicação (`d3-pos-dryrun-conferencia.sql`): `atividades_total 0`, `sonda_restos 0`, `pos_pedagogical 136` —
os dry-runs gravaram zero e a policy viva contém o braço. Reversão congelada em `sql-d3-school-activities-insert-reversao.sql`.
**E2E TESTADO 22/10 (OK próprio "teste o E2E do D3 com conta sintética"):** conta sintética `pedagogical` mintada
(`auditoria-sintetica-pedagogical-5335019d@bfr-conecta.test`, id `c573fdfe-…`), baseline de 7 tabelas congelada antes
(`d3-e2e-baseline.json`). Pelo caminho real — PostgREST `/rest/v1/school_activities` com JWT de sessão da conta: POST **antes
do vínculo** `42501` (recusa); vínculo por fixture transacional (versão publicada de ano **2027** — o 2026 está tomado pela
UNIQUE `bfr_one_published_schedule_year` e o app só lê 2026, então a fixture não aparece em tela nenhuma; + diretório + entry
Matemática/9Z); POST positivo **201** (id `a5fdf176-6608-42f9-bb43-4f155c987062`); SELECT da própria linha 200 com 1 linha;
negativos recusados: classe alheia `42501`, matéria alheia `42501`, `published_by` alheio `42501`, anon `401/42501`; PATCH e
DELETE próprios casaram **0 linhas** (UPDATE/DELETE seguem fechados para `pedagogical` — fora do escopo do D3; implicação: o
UPDATE de anexo pós-INSERT do app casaria 0 linhas, "anexo não foi associado"). Cleanup: DELETE da atividade + fixture + conta
(auth admin 200), baseline das 7 tabelas idêntica por md5, 0 contas sintéticas vivas, manifesto `[]` e artefatos locais
removidos. Diário `d3-e2e-postgrest.json`. Reversão da publicação: devolver `bfr-candidata-v59-professor/index.html`
(md5 `2e403607`) como index.html e `ar-assets-v59-live/sw-v4.js` (md5 `0d5294f7`, CACHE v59) como sw-v4.js ao SRC, rebuild e
`wrangler deploy` — restaura o v59 byte a byte; requer OK novo. Diários desta seção: `mede-v60-ab-d1d2d4.json`, partes
`mede-v60-ab-d1d2d4-*-390.json` / `-1280.json`, `sonda-loop-lia8.mjs`, `sonda-404-v60.mjs`, `mede-v60-ab-v59-1280-final.log`,
`mede-v60-ab-v60-1280-final.log`, `d3-aplicacao.log`, `d3-ler-policy-pos.log`, `d3-pos-aplicacao-conferencia.log`,
`preflight-v60.json`, `diff-v60-esperado.txt`, `confere-bundle-v60.json`, `prove-v60-no-ar.json`, `prova-sw-v60.json`,
`deploy-v60.log`, `deploy-list-v60.json`, `audit-publicacao-v60.json`; E2E do D3: `d3-e2e-baseline.json`, `d3-e2e-postgrest.json`,
`_q_d3_e2e_estrutura.*`, `_q_d3_e2e_constraints.*`.

### 37.24 E2E-2 no ar (22/10): frequência, chat interno, nota pelo modal e Biblioteca testados de ponta a ponta na v60, com fixture sintética e limpeza provada por contagem e md5

**Autorização e método.** OK "faca os testes que precisam" (22/10), com o mesmo ciclo do E2E do D3 (§37.23): mintar
contas sintéticas → fixture 100% sintética → testar na URL pública → apagar tudo e provar a volta à baseline. Contas:
`pedagogical` `e92eb283…` (`auditoria-sintetica-pedagogical-f669f4aa@bfr-conecta.test`) e `coordinator` `a69e92e1…`
(`auditoria-sintetica-coordinator-c441df06@bfr-conecta.test`). Fixture (`e2e2-fixture.mjs`, `e2e2-fixture.json`): turma
**9ZY** matutino (`1e7c1122…`) + 2 alunos + vínculo História + diretório + **entrada de aula na versão REAL publicada de
2026** (`430db726…` — único jeito de o app e a RLS enxergarem a aula; a UNIQUE `bfr_one_published_schedule_year` impede uma
versão própria) + thread de grupo "E2E-2 grupo sintético" com os 2 membros. Baseline de **19 tabelas** congelada antes
(`e2e2-baseline.json`, 22:17Z): md5 por tabela + contagens (profiles 24, classes 27, students 848, grades 112,
`bfr_lesson_attendance` 149, audit 0, chat 1 thread/2 mensagens/6 membros, presence 6, documents 226, auth 24) +
`conta_testes_vivas 0`. O que a UI grava é provado **pelo banco** (SQL do canal postgres), não só pelo texto da tela.

**1. Frequência APROVADO** (`e2e2-frequencia.json`): turma 9ZY → aula "Aula 1 · História · 07:00–07:50" → 2 marcas
(present/absent) → salvar → "2 registro(s) da aula salvos." (468 ms) → correção (late/absent, motivo "Correção do teste
E2E-2") → "1 registro(s) da aula salvos." → banco: **2 linhas em `bfr_lesson_attendance` + 1 linha em
`bfr_lesson_attendance_audit`** (present→late, `changed_by` = pedagogical).

**2. Chat interno APROVADO nas duas bandas** (`e2e2-chat.json`): a 1280 o pedagogical abre a sala (composer habilitado,
título correto), envia e o balão nasce com o texto + reações e "✓ Enviada" (as anteriores "✓✓ Lida"); banco: linha em
`internal_chat_messages` com `sender_id` = pedagogical. A 390 o **coordinator** abre pelo caminho real — barra de baixo →
`more` → drawer `[data-bfr-drawer-route="chat-interno"]` (a sidebar tem todos os itens 0×0 e o `#mobileMoreMenu` nunca abre
a 390 — armadilha #175) — e vê os balões; banco: `last_read_at` dos **2 membros ≥ `created_at`** da mensagem.

**3. Nota pelo modal APROVADO** (`e2e3-nota-modal.json`): Avaliações → "Lançar nota" → modal preenchido (aluno UM,
História, "Prova E2E-3 …", nota 8,5, 1º bimestre) → Salvar → "Nota registrada no Supabase. A turma já pode consultar o
lançamento." → banco: **exatamente 1 linha** em `grades` (`score 8.5`, `entered_by` = pedagogical), **112→113**.

**4. Biblioteca APROVADO** (`e2e4-biblioteca.json`): Biblioteca → "📚 Biblioteca virtual" → catálogo com **162 botões
"Abrir livro"** visíveis → clique no primeiro (8º ano Extraordinário, R. J. Palacio) → **aba nova com URL assinada**
`/storage/v1/object/sign/school-documents/…` em 1.063 ms → `fetch` da URL: **HTTP 200, `application/pdf`, 1.448.452 B**;
o botão ficou "Abrindo..." (disabled) e nunca "Acesso indisponível". Fluxo só de leitura: 0 escritas em `/rest/v1` ou
`/rpc`.

**Limpeza (`e2e2-limpeza.json`, veredito LIMPO):** guarda de e-mail `@bfr-conecta.test` por conta; delete em **ordem
FK-safe** num único multi-statement (mensagens → membros → thread → presence → audit → frequência → nota → entry da
grade → diretório → vínculo → alunos → turma → profiles); `auth DELETE` admin **HTTP 200 ×2**; re-medida com o **mesmo SQL
da baseline**: 19/19 tabelas idênticas por contagem **e md5** (`diferencas {counts:{}, md5:{}}`), versão publicada de 2026
intacta; manifesto `bfr-audit-contas.json` → `[]`; artefatos locais de sonda removidos. **0 contas `@bfr-conecta.test`
vivas.**

**Nada do ar nem do banco mudou:** nenhum hunk de código, nenhuma policy, nenhuma linha real — só a fixture sintética,
integralmente removida. Resta **NÃO TESTADO: os 14 cenários do brief §8 com conta real de professor** — a dependência é
a credencial de um professor real com vínculo vivo em `bfr_teacher_class_subjects` (ou OK para vínculo temporário em
conta real); sem ela, as telas populadas da aba do Professor seguem sem prova com papel real.

Diários desta seção: `e2e2-baseline.json`, `e2e2-fixture.json`, `e2e2-frequencia.json`, `e2e2-chat.json`,
`e2e3-nota-modal.json`, `e2e4-biblioteca.json`, `e2e2-limpeza.json`; scripts `e2e2-baseline.mjs`, `e2e2-fixture.mjs`,
`e2e2-teste-*.mjs`, `e2e3-teste-nota-modal.mjs`, `e2e4-teste-biblioteca.mjs`, `e2e2-limpeza.mjs`.