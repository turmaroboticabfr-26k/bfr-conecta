# BFR Conecta — relatório do briefing (§14): Funcionalidade × Perfil × Resultado

_Gerado por `scripts/ah2-relatorio-14.mjs` em 2026-11-17T12:26:40.263Z, a partir dos artefactos em `evidence/`. Nenhum resultado desta tabela foi escrito à mão: os números vêm dos consolidadores, e o que não foi medido aparece como tal._

## O que cobre e com que instrumentos

| Bloco do briefing | Instrumento | Cobertura medida nesta execução | Linhas na tabela |
| --- | --- | --- | --- |
| §6 desktop (1366/1440/1920) | `scripts/ah2-desktop-tabela.mjs` sobre `ah2-varredura-*.json` | 15 perfis com banda útil | 177 |
| §5 telemóvel (320/360/375/390/414/430 × 15 perfis) | `scripts/ah2-m5-tabela.mjs` sobre `ah2-mobile2-m5-*.json` | 79/90 células com banda coerente | 195 |

_Shells medidas: md5 d418e7fc917f1fbb1437054b7b531f9b. A grelha mobile está em corrida; enquanto o condutor não imprimir `M5_GRELHA_COMPLETA_COM_TRAVAS`, as células por medir continuam listadas como NÃO TESTADA — não desaparecem numa média._

## Definições (para o vermelho e o cinzento não se confundirem)

- **OK** — a porta existe no telemóvel/desktop do perfil, o toque/clique abriu um painel com conteúdo e o conteúdo assentou dentro do teto.
- **PARCIAL** — abriu em algumas larguras e noutras não foi medido de forma coerente; o número diz quantas.
- **FALHA** — medido no alvo: painel vazio, conteúdo que não assenta, toque sem efeito, diálogo sem saída tocável ou alvo de toque abaixo de 44 px.
- **NAO TESTADA** — não há porta (a rota não existe na navegação do perfil) ou não há banda coerente. Não é aprovação nem reprovação.
- **PENDENTE DE CAUSA** — a porta aparece no censo da gaveta mas o elemento já não existia no instante do toque; a causa provável é o instrumento (`renderDrawer` só reconstrói a lista quando o assinatura muda — `bfr-responsive-presentation.js:184`), por isso não é contado como defeito do produto.

As causas provadas (código lido dos bytes servidos, não inferida do sintoma) estão no §AI de `docs/auditoria-bfr-conecta.md`, com o número da linha de cada fonte.
## §6 Desktop — 1366 × 1440 × 1920

| Funcionalidade | Perfil | Resultado | Problema | Correção |
| --- | --- | --- | --- | --- |
| aee | aee | OK |  |  |
| atividades | aee | OK |  |  |
| chat-interno | aee | OK |  |  |
| comunicados | aee | OK |  |  |
| conteudos | aee | OK |  |  |
| escola-historia | aee | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| horarios | aee | OK |  |  |
| inicio | aee | OK |  |  |
| jogos-escolares | aee | OK |  |  |
| notificacoes | aee | OK |  |  |
| aee | coordinator | OK |  |  |
| atividades | coordinator | OK |  |  |
| cadastro-alunos | coordinator | OK |  |  |
| chat-interno | coordinator | OK |  |  |
| comunicacao | coordinator | OK |  |  |
| comunicados | coordinator | OK |  |  |
| conteudos | coordinator | OK |  |  |
| coordenacao | coordinator | OK |  |  |
| coordenacao-chat | coordinator | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| escola-historia | coordinator | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| fotos | coordinator | OK |  |  |
| horarios | coordinator | OK |  |  |
| inicio | coordinator | OK |  |  |
| jogos-escolares | coordinator | OK |  |  |
| notificacoes | coordinator | OK |  |  |
| ocorrencias | coordinator | OK |  |  |
| relatorios | coordinator | OK |  |  |
| resultados-aprendizagem | coordinator | OK |  |  |
| admin-crachas | developer | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| administracao | developer | OK |  |  |
| aee | developer | OK |  |  |
| agenda | developer | OK |  |  |
| atividades | developer | OK |  |  |
| cadastro-alunos | developer | OK |  |  |
| chat-interno | developer | OK |  |  |
| comunicacao | developer | OK |  |  |
| comunicados | developer | OK |  |  |
| conteudos | developer | OK |  |  |
| coordenacao | developer | OK |  |  |
| coordenacao-chat | developer | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| direcao | developer | OK |  |  |
| escola-historia | developer | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| fotos | developer | OK |  |  |
| gate | developer | OK |  |  |
| horarios | developer | OK |  |  |
| inicio | developer | OK |  |  |
| jogos | developer | OK |  |  |
| jogos-escolares | developer | OK |  |  |
| monitor | developer | OK |  |  |
| multiprofissional | developer | OK |  |  |
| notas | developer | OK |  |  |
| notificacoes | developer | OK |  |  |
| ocorrencias | developer | OK |  |  |
| psychology | developer | OK |  |  |
| resultados-aprendizagem | developer | OK |  |  |
| videos-aprender | developer | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| aee | director | OK |  |  |
| chat-interno | director | OK |  |  |
| comunicacao | director | OK |  |  |
| comunicados | director | OK |  |  |
| conteudos | director | OK |  |  |
| coordenacao | director | OK |  |  |
| coordenacao-chat | director | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| direcao | director | OK |  |  |
| escola-historia | director | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| fotos | director | OK |  |  |
| horarios | director | OK |  |  |
| inicio | director | OK |  |  |
| jogos-escolares | director | OK |  |  |
| notificacoes | director | OK |  |  |
| resultados-aprendizagem | director | OK |  |  |
| chat-interno | education_supervisor | FALHA — painel vazio | 1366: ? 0c 1817ms ctl=0 VAZIO · 1440: ? 0c 1820ms ctl=0 VAZIO · 1920: ? 0c 1813ms ctl=0 VAZIO |  |
| comunicacao | education_supervisor | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| comunicados | education_supervisor | OK |  |  |
| conteudos | education_supervisor | OK |  |  |
| coordenacao-chat | education_supervisor | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| escola-historia | education_supervisor | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| fotos | education_supervisor | OK |  |  |
| inicio | education_supervisor | OK |  |  |
| jogos-escolares | education_supervisor | OK |  |  |
| notificacoes | education_supervisor | OK |  |  |
| secretaria | education_supervisor | OK |  |  |
| supervisao | education_supervisor | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| comunicados | gatekeeper | OK |  |  |
| conteudos | gatekeeper | OK |  |  |
| escola-historia | gatekeeper | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| gate | gatekeeper | OK |  |  |
| horarios | gatekeeper | OK |  |  |
| inicio | gatekeeper | OK |  |  |
| jogos-escolares | gatekeeper | OK |  |  |
| notificacoes | gatekeeper | OK |  |  |
| conteudos | monitor | OK |  |  |
| escola-historia | monitor | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| horarios | monitor | OK |  |  |
| inicio | monitor | OK |  |  |
| jogos-escolares | monitor | OK |  |  |
| monitor | monitor | OK |  |  |
| notificacoes | monitor | OK |  |  |
| ocorrencias | monitor | OK |  |  |
| agenda | parent | OK |  |  |
| aprender | parent | OK |  |  |
| atividades | parent | OK |  |  |
| comunicados | parent | OK |  |  |
| conteudos | parent | OK |  |  |
| coordenacao-chat | parent | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| escola | parent | OK |  |  |
| escola-historia | parent | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| evoluir | parent | OK |  |  |
| inicio | parent | OK |  |  |
| jogos-escolares | parent | OK |  |  |
| meu-espaco | parent | OK |  |  |
| notas | parent | OK |  |  |
| notificacoes | parent | OK |  |  |
| ocorrencias | parent | OK |  |  |
| secretaria | parent | OK |  |  |
| chat-interno | pedagogical | OK |  |  |
| conteudos | pedagogical | OK |  |  |
| escola-historia | pedagogical | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| jogos-escolares | pedagogical | OK |  |  |
| notificacoes | pedagogical | OK |  |  |
| professor-agenda | pedagogical | OK |  |  |
| professor-agenda-hoje | pedagogical | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| professor-atividades | pedagogical | OK |  |  |
| professor-avaliacoes | pedagogical | OK |  |  |
| professor-biblioteca | pedagogical | OK |  |  |
| professor-calendario | pedagogical | OK |  |  |
| professor-comunicacao | pedagogical | OK |  |  |
| professor-conteudos | pedagogical | OK |  |  |
| professor-diario | pedagogical | OK |  |  |
| professor-espaco | pedagogical | OK |  |  |
| professor-frequencia | pedagogical | OK |  |  |
| professor-inicio | pedagogical | OK |  |  |
| professor-notificacoes | pedagogical | OK |  |  |
| professor-planejamento | pedagogical | OK |  |  |
| professor-relatorios | pedagogical | OK |  |  |
| professor-turmas | pedagogical | OK |  |  |
| resultados-aprendizagem | pedagogical | OK |  |  |
| chat-interno | psychology | OK |  |  |
| inicio | psychology | OK |  |  |
| psychology | psychology | OK |  |  |
| chat-interno | secretary | OK |  |  |
| comunicacao | secretary | OK |  |  |
| comunicados | secretary | OK |  |  |
| conteudos | secretary | OK |  |  |
| coordenacao-chat | secretary | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| escola-historia | secretary | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| fotos | secretary | OK |  |  |
| inicio | secretary | OK |  |  |
| jogos-escolares | secretary | OK |  |  |
| notificacoes | secretary | OK |  |  |
| secretaria | secretary | OK |  |  |
| chat-interno | social_work | OK |  |  |
| inicio | social_work | OK |  |  |
| multiprofissional | social_work | OK |  |  |
| conteudos | sports_operator | OK |  |  |
| inicio | sports_operator | OK |  |  |
| jogos-escolares | sports_operator | OK |  |  |
| notificacoes | sports_operator | OK |  |  |
| agenda | student | OK |  |  |
| aprender | student | OK |  |  |
| atividades | student | OK |  |  |
| biblioteca | student | OK |  |  |
| boletim | student | OK |  |  |
| comunicados | student | OK |  |  |
| conteudos | student | OK |  |  |
| escola | student | OK |  |  |
| escola-historia | student | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |
| evoluir | student | OK |  |  |
| horarios | student | OK |  |  |
| inicio | student | OK |  |  |
| jogos | student | OK |  |  |
| jogos-escolares | student | OK |  |  |
| meu-espaco | student | OK |  |  |
| notas | student | OK |  |  |
| notificacoes | student | OK |  |  |
| resultados-aprendizagem | student | OK |  |  |
| videos-aprender | student | NAO TESTADA — porta inexistente | 1366: seção declarada sem botão no DOM (36 botões) · 1440: seção declarada sem botão no DOM (36 botões) · 1920: seção declarada sem botão no DOM (36 botões) |  |

_177 linhas · OK 153 · PARCIAL 0 · FALHA 1 · NAO TESTADA 23 · perfis 15/15_
_Larguras do §6: 1366 1440 1920 (as corridas a 1280/390 existem em disco mas não entram aqui porque o briefing pede estas três)_
_Células sem nenhuma corrida desktop: 0_

## §5 Telemóvel — 320/360/375/390/414/430

| Funcionalidade | Perfil | Resultado | Problema | Correção |
| --- | --- | --- | --- | --- |
| aee | aee | OK |  |  |
| apoio | aee | PARCIAL (3/6 larguras) | supportView 0c 1822ms ctl=0 via gaveta · sem medição coerente em 360/430 |  |
| atividades | aee | OK |  |  |
| chat-interno | aee | OK |  |  |
| comunicados | aee | OK |  |  |
| conteudos | aee | OK |  |  |
| escola-historia | aee | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| horarios | aee | OK |  |  |
| inicio | aee | OK |  |  |
| jogos-escolares | aee | OK |  |  |
| notificacoes | aee | OK |  |  |
| aee | coordinator | OK |  |  |
| apoio | coordinator | FALHA — painel vazio | supportView 0c 1856ms ctl=0 via gaveta · supportView 0c 1845ms ctl=0 via gaveta · supportView 0c 1839ms ctl=0 via gaveta · supportView 0c 1863ms ctl=0 via gaveta · supportView 0c 1861ms ctl=0 via gaveta · supportView 0c 1860ms ctl=0 via gaveta |  |
| atividades | coordinator | OK |  |  |
| cadastro-alunos | coordinator | OK |  |  |
| chat-interno | coordinator | OK |  |  |
| comunicacao | coordinator | OK |  |  |
| comunicados | coordinator | OK |  |  |
| conteudos | coordinator | OK |  |  |
| coordenacao | coordinator | OK |  |  |
| coordenacao-chat | coordinator | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| escola-historia | coordinator | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| fotos | coordinator | OK |  |  |
| horarios | coordinator | OK |  |  |
| inicio | coordinator | OK |  |  |
| jogos-escolares | coordinator | OK |  |  |
| notificacoes | coordinator | OK |  |  |
| ocorrencias | coordinator | OK |  |  |
| relatorios | coordinator | OK |  |  |
| resultados-aprendizagem | coordinator | OK |  |  |
| admin-crachas | developer | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| administracao | developer | OK |  |  |
| aee | developer | OK |  |  |
| agenda | developer | OK |  |  |
| apoio | developer | FALHA — painel vazio | supportView 0c 1855ms ctl=0 via gaveta · supportView 0c 1837ms ctl=0 via gaveta · supportView 0c 1831ms ctl=0 via gaveta · supportView 0c 1880ms ctl=0 via gaveta · supportView 0c 1829ms ctl=0 via gaveta · supportView 0c 1846ms ctl=0 via gaveta |  |
| atividades | developer | OK |  |  |
| cadastro-alunos | developer | OK |  |  |
| chat-interno | developer | OK |  |  |
| comunicacao | developer | OK |  |  |
| comunicados | developer | OK |  |  |
| conteudos | developer | OK |  |  |
| coordenacao | developer | OK |  |  |
| coordenacao-chat | developer | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| direcao | developer | OK |  |  |
| escola-historia | developer | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| fotos | developer | OK |  |  |
| gate | developer | PENDENTE DE CAUSA — porta listada, ausente ao toque (6/6) | presente no censo da gaveta, ausente no momento do toque — causa não provada |  |
| horarios | developer | OK |  |  |
| inicio | developer | OK |  |  |
| jogos | developer | OK |  |  |
| jogos-escolares | developer | OK |  |  |
| monitor | developer | PENDENTE DE CAUSA — porta listada, ausente ao toque (6/6) | presente no censo da gaveta, ausente no momento do toque — causa não provada |  |
| multiprofissional | developer | OK |  |  |
| notas | developer | OK |  |  |
| notificacoes | developer | OK |  |  |
| ocorrencias | developer | OK |  |  |
| psychology | developer | PENDENTE DE CAUSA — porta listada, ausente ao toque (6/6) | presente no censo da gaveta, ausente no momento do toque — causa não provada |  |
| relatorios | developer | OK |  |  |
| resultados-aprendizagem | developer | OK |  |  |
| videos-aprender | developer | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| aee | director | OK |  |  |
| chat-interno | director | OK |  |  |
| comunicacao | director | OK |  |  |
| comunicados | director | OK |  |  |
| conteudos | director | OK |  |  |
| coordenacao | director | OK |  |  |
| coordenacao-chat | director | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| direcao | director | OK |  |  |
| director:communication | director | OK |  |  |
| director:overview | director | OK |  |  |
| director:pedagogical | director | FALHA — toque sem efeito | directorView 340c 1826ms ctl=23 via barra · directorView 12461c 4388ms ctl=98 fontes<12=12 via barra · directorView 12461c 4277ms ctl=98 fontes<12=12 via barra · directorView 340c 1831ms ctl=23 via barra · directorView 12461c 3660ms ctl=98 fontes<12=12 via barra · directorView 12461c 3685ms ctl=98 fontes<12=12 via barra |  |
| director:students | director | FALHA — toque sem efeito | directorView 13432c 4255ms ctl=145 fontes<12=12 via barra · directorView 13432c 1912ms ctl=145 fontes<12=12 via barra · directorView 13432c 1843ms ctl=145 fontes<12=12 via barra · directorView 10884c 1865ms ctl=131 via barra · directorView 13432c 1835ms ctl=145 fontes<12=12 via barra · directorView 13432c 1823ms ctl=145 fontes<12=12 via barra |  |
| escola-historia | director | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| fotos | director | OK |  |  |
| horarios | director | OK |  |  |
| inicio | director | OK |  |  |
| jogos-escolares | director | OK |  |  |
| notificacoes | director | OK |  |  |
| relatorios | director | OK |  |  |
| resultados-aprendizagem | director | OK |  |  |
| chat-interno | education_supervisor | FALHA — painel vazio | internalChatView 0c 1820ms ctl=0 via barra · internalChatView 0c 1826ms ctl=0 via barra · internalChatView 0c 1828ms ctl=0 via barra · internalChatView 0c 1829ms ctl=0 via barra |  |
| comunicacao | education_supervisor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| comunicados | education_supervisor | OK |  |  |
| conteudos | education_supervisor | OK |  |  |
| coordenacao-chat | education_supervisor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| escola-historia | education_supervisor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| fotos | education_supervisor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| inicio | education_supervisor | OK |  |  |
| jogos-escolares | education_supervisor | OK |  |  |
| notificacoes | education_supervisor | OK |  |  |
| secretaria | education_supervisor | OK |  |  |
| supervisao | education_supervisor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| comunicados | gatekeeper | OK |  |  |
| conteudos | gatekeeper | OK |  |  |
| escola-historia | gatekeeper | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| gate | gatekeeper | OK |  |  |
| horarios | gatekeeper | OK |  |  |
| inicio | gatekeeper | OK |  |  |
| jogos-escolares | gatekeeper | OK |  |  |
| notificacoes | gatekeeper | OK |  |  |
| conteudos | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| escola-historia | monitor | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação · sem medição coerente em 320/360/375/390/430 |  |
| horarios | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| inicio | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| jogos-escolares | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| monitor | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| notificacoes | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| ocorrencias | monitor | PARCIAL (1/6 larguras) | sem medição coerente em 320/360/375/390/430 |  |
| agenda | parent | OK |  |  |
| apoio | parent | OK |  |  |
| aprender | parent | OK |  |  |
| atividades | parent | OK |  |  |
| comunicados | parent | OK |  |  |
| conteudos | parent | OK |  |  |
| coordenacao-chat | parent | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| escola | parent | OK |  |  |
| escola-historia | parent | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| evoluir | parent | OK |  |  |
| inicio | parent | OK |  |  |
| jogos-escolares | parent | OK |  |  |
| meu-espaco | parent | OK |  |  |
| notas | parent | OK |  |  |
| notificacoes | parent | OK |  |  |
| ocorrencias | parent | OK |  |  |
| secretaria | parent | OK |  |  |
| chat-interno | pedagogical | OK |  |  |
| conteudos | pedagogical | NAO TESTADA | sem medição coerente em 320/360/375/390/414/430 |  |
| escola-historia | pedagogical | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| jogos-escolares | pedagogical | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| notificacoes | pedagogical | NAO TESTADA | sem medição coerente em 320/360/375/390/414/430 |  |
| professor-agenda | pedagogical | OK |  |  |
| professor-agenda-hoje | pedagogical | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| professor-atividades | pedagogical | OK |  |  |
| professor-avaliacoes | pedagogical | OK |  |  |
| professor-biblioteca | pedagogical | OK |  |  |
| professor-calendario | pedagogical | OK |  |  |
| professor-comunicacao | pedagogical | OK |  |  |
| professor-conteudos | pedagogical | OK |  |  |
| professor-diario | pedagogical | OK |  |  |
| professor-espaco | pedagogical | OK |  |  |
| professor-frequencia | pedagogical | OK |  |  |
| professor-inicio | pedagogical | OK |  |  |
| professor-notificacoes | pedagogical | OK |  |  |
| professor-planejamento | pedagogical | OK |  |  |
| professor-relatorios | pedagogical | OK |  |  |
| professor-turmas | pedagogical | OK |  |  |
| resultados-aprendizagem | pedagogical | PARCIAL (5/6 larguras) | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| chat-interno | psychology | OK |  |  |
| conteudos | psychology | FALHA — toque sem efeito | bfrContentHubView 1123c 1823ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1829ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1826ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1825ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1822ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1818ms ctl=14 fontes<12=3 via gaveta |  |
| inicio | psychology | OK |  |  |
| multiprofissional | psychology | FALHA — toque sem efeito | bfrContentHubView 1123c 1824ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1831ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1818ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1832ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1836ms ctl=14 fontes<12=3 via gaveta |  |
| notificacoes | psychology | OK |  |  |
| psychology | psychology | OK |  |  |
| apoio | secretary | FALHA — painel vazio | supportView 0c 1827ms ctl=0 via gaveta · supportView 0c 1835ms ctl=0 via gaveta · supportView 0c 1863ms ctl=0 via gaveta · supportView 0c 1822ms ctl=0 via gaveta · supportView 0c 1918ms ctl=0 via gaveta · supportView 0c 1832ms ctl=0 via gaveta |  |
| chat-interno | secretary | OK |  |  |
| comunicacao | secretary | OK |  |  |
| comunicados | secretary | OK |  |  |
| conteudos | secretary | OK |  |  |
| coordenacao-chat | secretary | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| escola-historia | secretary | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| fotos | secretary | OK |  |  |
| inicio | secretary | OK |  |  |
| jogos-escolares | secretary | OK |  |  |
| notificacoes | secretary | OK |  |  |
| relatorios | secretary | OK |  |  |
| secretaria | secretary | OK |  |  |
| chat-interno | social_work | OK |  |  |
| conteudos | social_work | FALHA — toque sem efeito | bfrContentHubView 1123c 1824ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1825ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1822ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1829ms ctl=14 fontes<12=3 via gaveta · bfrContentHubView 1123c 1818ms ctl=14 fontes<12=3 via gaveta |  |
| inicio | social_work | OK |  |  |
| multiprofissional | social_work | OK |  |  |
| notificacoes | social_work | OK |  |  |
| conteudos | sports_operator | OK |  |  |
| inicio | sports_operator | OK |  |  |
| jogos-escolares | sports_operator | OK |  |  |
| notificacoes | sports_operator | OK |  |  |
| agenda | student | OK |  |  |
| apoio | student | PARCIAL (5/6 larguras) | supportView 0c 1837ms ctl=0 via gaveta |  |
| aprender | student | OK |  |  |
| atividades | student | OK |  |  |
| biblioteca | student | OK |  |  |
| boletim | student | OK |  |  |
| comunicados | student | OK |  |  |
| conteudos | student | OK |  |  |
| escola | student | OK |  |  |
| escola-historia | student | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |
| evoluir | student | OK |  |  |
| horarios | student | OK |  |  |
| inicio | student | OK |  |  |
| jogos | student | OK |  |  |
| jogos-escolares | student | OK |  |  |
| meu-espaco | student | OK |  |  |
| notas | student | OK |  |  |
| notificacoes | student | OK |  |  |
| resultados-aprendizagem | student | OK |  |  |
| videos-aprender | student | NAO TESTADA — porta inexistente | concedida no mapa do papel, sem botão em parte nenhuma da navegação |  |

_195 linhas · OK absoluto 146 · PARCIAL 10 · FALHA 9 · PENDENTE DE CAUSA 3 · NAO TESTADA 27_
_Legenda: «FALHA — inalcansavel» é medida no alvo (invisível, fora do ecrã ou tapado por outro elemento). «PENDENTE DE CAUSA» é o caso em que a porta aparece no censo da gaveta mas o elemento já não existe na hora do toque — como o `renderDrawer` só reconstrói a lista quando o assinatura muda (bfr-responsive-presentation.js:184), a causa provável é o instrumento, não o produto, e por isso não conta como defeito assinado._
_Larguras com banda coerente por papel: aee=320,360,375,390,414,430 | coordinator=320,360,375,390,414,430 | developer=320,360,375,390,414,430 | director=320,360,375,390,414,430 | education_supervisor=320,360,375,390,414,430 | gatekeeper=320,360,375,390,414,430 | monitor=414 | parent=320,360,375,390,414,430 | pedagogical=320,360,375,390,414,430 | pending= | psychology=320,360,375,390,414,430 | secretary=320,360,375,390,414,430 | social_work=320,360,375,390,414,430 | sports_operator=320,360,375,390,414,430 | student=320,360,375,390,414,430_
_Células travadas sem medição possível: monitor@320 [shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra] | monitor@360 [shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra] | monitor@375 [shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra] | monitor@390 [shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra] | monitor@430 [shell ready sem #bfrMobileBottomNav após rechegar — módulo de apresentação mobile não montou a barra] | pending@320 [banda oca: barra mobile não montada com shell ready; conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)] | pending@360 [conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)] | pending@375 [conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)] | pending@390 [conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)] | pending@414 [conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)] | pending@430 [conta em análise: barreira de pendência, sem shell nem navegação (estado do produto)]_
_Travadas numa execução e medidas noutra (a célula não é um bloqueio, é repetição): coordinator@360, director@430, pedagogical@320, pedagogical@360, social_work@390, student@390_

## Pendências e buracos de medição (o «não declare 100 %» do briefing)

1. **Grelha §5 em curso**: 79/90 células com banda coerente; 11 sem medição utilizável. Última síntese: `ah2-m5-consolidado-consol-r11.json` (2026-11-17T12:20:47.315Z).
2. **Chat interno nunca medido com conteúdo**: a base tem 1 sala e 5 membros, nenhum deles conta de teste (medido em `scripts/ah2-sonda-chat-filas.mjs`). Testar o conteúdo exige INSERT em `internal_chat_room_members` — fora do mint autorizado, precisa de OK próprio.
3. **Calendário letivo e turnos**: as relações `bfr_school_calendar_days`, `bfr_school_calendar_month_targets`, `bfr_school_shift_settings` não existem (`404 PGRST205`), logo as vistas que as consultam não têm como passar — fechar isto é DDL ou desligar as vistas, decisão de produto.
4. **Nenhuma candidata de código publicada neste bloco**, e o motivo está em §AI.8: o shell publicado está à frente da árvore local (suporte de `education_supervisor` e o `join` de `sports_schools`), por isso um patch por cima de `app/index.html` regredia o que está no ar. Primeiro é preciso reconciliar a fonte — operação com OK próprio.
5. **Três causas descritas, não corrigidas**: o `allowed()` do chat vs mapa de navegação, os links de `apoio`/`notificacoes`/`conteudos` que o portão nega, e o `×` de 60×32 px do gestor de fotos. Cada uma mexe a gate de produto ou a CSS publicado.

_Portanto: esta entrega não declara 100 % de aprovação. O que está verde foi medido com toque ou clique real e caixa de painel; o que está cinzento não tem porta ou não tem banda; o que está vermelho tem causa escrita._
