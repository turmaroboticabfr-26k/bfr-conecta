# RELATÓRIO FINAL DE AUDITORIA — UNIESCO (26/11)

> Relatório obrigatório do `PROMPT MESTRE DEFINITIVO` (§17), escrito com os números lidos dos artefactos
> versionados (diário `docs/auditoria-bfr-conecta.md`, registos `evidence/`, corridas `sm75`–`sm82`), nunca da
> memória. Onde nenhum instrumento produz um agregado, isso está dito — o número não é inventado.
> Regra fundamental do briefing respeitada: nenhuma funcionalidade criada, removida, simplificada ou substituída;
> nenhum byte do produto mudou fora das publicações autorizadas em ciclos anteriores.

## 1. Resumo executivo

Auditoria técnica, funcional, visual, estrutural e de segurança executada em ciclos (§SM.51 a §SM.81, 80 blocos de
diário), sobre o ar publicado **v144c** (`573de00016fe2d9b87e671bb84d21559`, 3 557 197 B). Estado medido hoje
(`p133` `sm82a`, 28/0): **39 pendências abertas · 10 fechadas · 0 divergentes** num ledger de 49 linhas PEN.
A identidade UNIESCO está publicada e **0 referências visíveis** da marca antiga chegam ao utilizador.
**A homologação não está concluída**: existem erros conhecidos sem resolução, a limpeza final das contas de teste
não foi executada, e 9 de 15 papéis têm uma divergência de permissões que só o dono pode decidir.

## 2. Quantidade de abas identificadas

**55** nomes distintos de navegação, **250** ocorrências, lidos do `index.html` servido (2 536 tokens, 29 406
linhas) pela peça versionada `p186` (`sm75e`, `P186_INVENTARIO_MEDIDO 24/24`; §SM.75 item 4).

## 3. Quantidade de funcionalidades identificadas

**104** itens em **17** unidades, lidas do checklist versionado; estado por unidade (§SM.75 item 4):
IMPLEMENTADO COM ERROS **9** · PARCIALMENTE IMPLEMENTADO **2** · IMPLEMENTADO E TESTADO **3** ·
IMPLEMENTADO MAS NÃO TESTADO **2** · SOMENTE INTERFACE **1**.

## 4. Quantidade de testes executados

Não existe um único artefacto que agregue «total de testes»; as contas por superfície, todas com produtor
versionado, são:
- **Matriz de permissões** (FASE 3, §SM.76): universo de **60** tokens × **13** papéis com censo válido; agregado
  lido dos registos pelo `p188`: **161** portas autorizadas · **138** pintadas · **8** em excesso · **31** em falta,
  `CENSO INCOMPLETO = []` em todos os papéis.
- **Mobile**: 6 bandas (320/360/375/390/414/430) × 15 perfis (AG-7), re-varreduras na banda 390.
- **Web**: bandas 1280/1440/1920 re-medidas com a régua do produtor.
- **Toque**: 8 células de excesso tocadas com o destino classificado por tráfego (§SM.77).
- **Regressão**: rituais de portão por ciclo (80 rondas), com 2 corridas vermelhas próprias preservadas em disco.

## 5. Quantidade de testes aprovados

Matriz: **138** células pintadas e autorizadas (a face positiva), censos completos 13/13; `p186` 24/24;
inventário `p133` 28/0 em todas as rondas desta semana; bancadas A/B das candidatas (ex.: 23/0 na v126, §AH.5).

## 6. Quantidade de erros encontrados

O ledger tem **49** linhas PEN, das quais **39 abertas**. Causas medidas (não só sintomas): dois **grants mortos**
(`escola-historia`, `coordenacao-chat` — confirmados por duas vias independentes, banco e matriz), chat-interno
vazio para perfis inscritos, RM-2.1 sem resultado confirmado no destino, barra mobile do monitor, caixa 0×0 da
vista teacher, painel municipal aberto na troca de vista, teto de assentamento excedido em `developer/1440`
(uma leitura, n=1, sem confirmação por repetição), e **9 de 15** papéis com divergência entre o documento de
perfis e o mapa servido pelo próprio aplicativo.

## 7. Quantidade de erros corrigidos

**10** linhas PEN fechadas por medição (classe FECHADA do `p133`). Publicações com diário na cadeia:
v133, v134, v135, v136, v141, v142 e **v144c** (`p137` `sm75`: 31 candidatas, 25 versões, **0** acima da
publicada). Exemplos com causa e correção: headers de segurança (v135), `created_at` e nome único (v136),
caixa 0×0 da vista teacher (v141), painel municipal (v142), identidade UNIESCO completa (v144c), DDL municipal
com calendário e semente RM-5.2 (aplicado com pré-voo e conferência), REVOKE dos nomes municipais fora do alvo
da PEN-48 (aplicado), função de confirmação do calendário A1 (aplicada).

## 8. Problemas ainda existentes

As **39** linhas PEN abertas (lista completa no registo `evidence/p133-inventario-das-pendencias-abertas-22-11-sm82a.json`),
agrupadas por quem as fecha (`p171` `sm82b`, 5/0): publicação **26**, DDL **20**, mint/rotação **10**, decisão
humana **23** (grupos sobrepõem-se de propósito). Nomes mais concretos: os dois grants mortos, RM-2.1
(`NAO_SE_VERIFICA`), a divergência dos 9 de 15 papéis, a barreira `pending` (16 células não alcançáveis por
desenho), a candidata v126 de acessibilidade não publicada, a candidata de otimização do Home não aplicada.

## 9. Auditoria de segurança

Superfície anónima fechada (vistas `sports_public_*` para authenticated, DDL aplicado), RLS com GRANT EXECUTE dos
predicados de escopo, REVOKE aplicado, contas de teste isoladas, censo de portadores fora do índice **0**
(`p125` 6/0). Nos bytes servidos: **2** ocorrências do padrão de chave de API de cliente, ambas em classe de
configuração, **0** visíveis; **0** tokens de bearer e **0** segredos opacos (§SM.75 item 8). Risco a confirmar
pelo dono: uma chave de cliente viaja no bundle — a sua **restrição de domínio no provedor** é o que decide se
isso é aceitável. Análise LGPD para crianças/adolescentes registada; nenhuma senha, token ou dado pessoal foi
exposto nas evidências (corpos de resposta nunca capturados, por regra anti-PII).

## 10. Auditoria mobile

Experiência própria, não espelho da web: 6 bandas × 15 perfis, barra inferior corrigida (390/430), régua de
estouro por família; limitações medidas — o monitor continua com a barra por montar (defeito real, com causa),
e a candidata v126 de acessibilidade (alvos 44 px, fontes 12 px) está **pronta e não publicada**.

## 11. Auditoria web

Bandas 1280/1440/1920 re-medidas; o painel mais lento é o do `developer` (uma leitura acima do teto de 6 s em
n=1, sem repetição — registada como limitação, não como sentença).

## 12. Auditoria visual

Aderência da identidade por módulo medida (§SM.48, `p149`); identidade institucional UNIESCO aplicada
(nome, significado, cores azul e verde, splash, títulos) na v144c; 164 ocorrências da marca nova no ar,
**15** em classe visível.

## 13. Auditoria de desempenho

Causa real da demora do Home medida (AG-8); candidata de otimização preparada com bancada e **não aplicada**
(nenhuma otimização foi feita à custa de funcionalidade).

## 14. Resultado dos testes de integração

RM-2.1 **não se verifica**: o toque foi medido (toque→paint de 516 a 1 333 ms no menu móvel) mas o resultado no
destino não foi confirmado. Nas 8 células de excesso, o tráfego mostra **7** respostas com corpo de dados a
perfis que o mapa não autoriza e **1** sem tráfego registado (§SM.77). Limitação declarada: os corpos não foram
capturados (regra anti-PII), logo sabe-se que chegou conteúdo, não se sabe qual.

## 15. Resultado dos testes de permissões

Matriz 13 papéis: **8** células em excesso (ar pinta o que o mapa não autoriza), **31** em falta (10
`escola-historia` + 5 `coordenacao-chat` com causa provada; o resto escondido por classe, com atribuição medida
por `p189`). **9 de 15 papéis divergem** entre o documento `03-perfis-e-permissoes.md` e o mapa servido — a
decisão de qual coluna é a intenção é do dono (documento = edição local; mapa = candidata e publicação).

## 16. Resultado da limpeza das contas de teste

**Parcial.** A batelada AH-1 foi limpa (4 contas + 9 linhas de resíduo, respeitando chaves estrangeiras);
as bateladas posteriores permanecem criadas porque o trabalho não acabou. A **listagem final passou a existir**
como censo em leitura (§SM.89): 28 contas no total, 19 removíveis por domínio de teste, 9 reais intocáveis, e como
o Admin API não transporta papel, a classificação vem de `profiles`. A **exclusão** (FASE 15) não foi executada:
exige OK literal e, antes dele, o censo de chaves estrangeiras por conta — «removível por domínio» é uma classe
medida, não um plano de exclusão. O portão `INVENTARIO_PRONTO_PARA_O_DESMONTADOR` diz que o censo existe, não autoriza apagá-lo.

## 17. Resultado da remoção da identidade BFR Conecta

No ar: **11** ocorrências da frase antiga, **0** em classe visível (4 em host/URL, 6 em chave de configuração,
1 em nome de ficheiro de activo); prefixos técnicos (`bfr-`, `bfr_`, `BFR*`) mantidos por serem usados por APIs,
storage e autenticação — a migração desses nomes toca autenticação e cache, não só texto, e fica como decisão
própria do dono. Nenhuma referência antiga visível aos utilizadores.

## 18. Confirmação da identidade UNIESCO

Aplicada e publicada (v144c): `title`, `apple-mobile-web-app-title`, `description`, `theme-color` com a marca
nova; 164 ocorrências no ar. Dois pontos sem prova completa ficam declarados: o manifest e os ícones referenciados
não existem na pasta da candidata (censo de referência, não 404 provado), e o nome do repositório/directório
continua técnico (`bfr-conecta`), não visível ao utilizador.

## 19. Integridade dos dados

**0** exclusão de dados reais; **0** migração destrutiva; backup local em duas formas (bundle git completo + tar
da árvore) com checksum conferido (§SM.74); todas as aplicações de DDL feitas com pré-voo, candidata de reversão
e conferência pós-aplicação; limpezas FK-safe.

## 20. Riscos residuais

1. Chave de cliente no bundle — aceitabilidade depende da restrição de domínio no provedor (decisão do dono).
2. Nomes técnicos com a marca antiga (hosts, chaves de storage e configuração) continuam no ar.
3. A CSP declarada lista um host com o nome antigo — é a origem do worker; mudá-lo é publicação, não edição.
4. `developer/1440` acima do teto em n=1, sem repetição.
5. Injeção de falha testada só no cliente; nenhum teste destrutivo no servidor.
6. Corpos de resposta nunca capturados — «conteúdo chegou» não distingue a ficha de um aluno dum catálogo.
7. A régua de escrita cobre as faixas com positivo e negativo declaradas no `p169`; faixas novas pedem peça nova.

## 21. Pendências e dependências externas

- **Push** dos comites locais — a frase que aqui estava descrevia a ronda em que a palavra foi dada (§SM.82, 26/11),
  quando `head` e `origin_main` resolviam no mesmo objeto, e **não** é estado corrente: hoje a primeira linha de
  `status -sb` mostra `ahead` e os três portões vermelhos de `p174` saem **por construção**
  (`o_hash_final_do_reflog_e_o_head`, `head_e_origin_main_sao_o_mesmo_objeto`, `a_primeira_linha_do_status_nao_mostra_ahead`).
  A cifra dos comites por enviar vive na captura dessa corrida e não neste documento, porque cada comite local
  muda o número — citá-la aqui seria uma régua que se move com aquilo que mede.
- **Publicação** de candidata (v126 a11y e sucessoras) — OK literal.
- **DDL/DML/grants** e **mint/rotação** — OK literal por peça.
- **#277**: decisão do dono sobre os 9 de 15 papéis divergentes.
- **Folha das decisões**: 0 linhas recebidas.
- **#27** (v141, decisão do utilizador), **#243** (re-medição depois de o app gravar turnos), metade humana/CI
  da **PEN-22**, `.gitignore` — cada um com o seu literal.
- Metades de produto das PEN-01/02/04/05/07/13/15/20 — exigem escrita no produto e OK novo por peça.

## 22. Situação final de homologação

**NÃO HOMOLOGADO.** Pelo §16 do briefing, a homologação exige: nenhum erro crítico conhecido sem resolução
(existem: grants mortos, RM-2.1), contas de teste removidas (não foram), regressão final única (não foi feita
uma ronda única — há 80 rondas por ciclo) e as decisões do dono listadas no item 21. Nada disto é simulado:
cada limitação tem a sua corrida ou o seu registo citado acima.

---

## Checklist anexo

O checklist completo, aba por aba e funcionalidade por funcionalidade, vive nos artefactos versionados e é
citado em vez de duplicado: inventário do ar (`p186`, registo `sm75e`), matriz de permissões por papel
(`p187`/`p188`, registos `pp7d`–`pp7g`), atribuição do escondido por classe (`p189`), censo de portadores
(`p125`) e o ledger de pendências (`p133` `sm82a`).
