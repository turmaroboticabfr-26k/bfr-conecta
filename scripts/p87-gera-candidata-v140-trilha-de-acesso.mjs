#!/usr/bin/env node
// P87 — CANDIDATA v140: O PAINEL PASSA A ASSINAR A PRÓPRIA ABERTURA (21/11, noite). A P82 mediu dois vermelhos
// reais no bundle servido: o banner verde decidia por `sonda.executavel` (consertado na v139, provido na P86)
// e `bfr_municipal_audit` tem 0 linhas porque o ar nunca escreve lá. A política de escrita JÁ ESTÁ APLICADA no
// banco (`bfr_municipal_audit_write … WITH CHECK (actor = auth.uid() AND bfr_is_municipal_authority())`, lida
// do DDL versionado), por isso fechar a trilha é mudança de bundle, não de DDL. Esta peça gera a candidata e
// não escreve em lado nenhum fora dela: 0 publicação, 0 DDL, 0 INSERT — a escrita em si é medida na P88 com o
// cliente local interceptado, e só acontece de verdade se o utilizador autorizar a publicação.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ORIGEM = join(DIR, 'bfr-candidata-v139-sonda-honesta/index.html');
// A certificação da origem não mora na pasta da candidata (o `portoes-v139-candidata.json` da P85 só traz
// origem/destino/substituições): mora no registo da corrida que a gerou. Apontar para o ficheiro errado deu o
// aborto «veredito undefined», que é o aborto correcto — só que a régua certa é esta, e ela liga o md5.
const PORTOES_ORIGEM = join(DIR, 'evidence/p85-gera-candidata-21-11-b.json');
const PARA = join(DIR, 'bfr-candidata-v140-trilha-de-acesso');
const SAIDA = join(PARA, 'index.html');
const PORTOES = join(PARA, 'portoes-v140-candidata.json');
const DDL = join(DIR, 'scripts/sm4-ddl-municipal-candidata.sql');
const AR_PUBLICADO = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const SUF = (process.argv[2] || 'a').trim();
const EV = join(DIR, `evidence/p87-gera-candidata-v140-21-11-${SUF}.json`);
const INVOLUCRO = '<script data-bfr-municipal-module="1">';
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const vezes = (t, x) => t.split(x).length - 1;
const t0 = Date.now();

if (!existsSync(ORIGEM)) throw new Error('ABORTA: origem ' + ORIGEM + ' não existe');
if (!existsSync(PORTOES_ORIGEM)) throw new Error('ABORTA: a origem não tem portões — gerar sobre uma candidata não certificada');
const portoesOrigem = JSON.parse(readFileSync(PORTOES_ORIGEM, 'utf8'));
if (!/OK/.test(String(portoesOrigem.veredito))) throw new Error('ABORTA: portões da origem não estão verdes (' + portoesOrigem.veredito + ')');
const txt0 = readFileSync(ORIGEM, 'utf8');
const MD5_0 = md5(txt0), B0 = statSync(ORIGEM).size;
// Proveniência: o ficheiro que estou a remendar tem de ser BYTE A BYTE a saída certificada daquela corrida, se
// não o portão «origem verde» diria isso de uma candidata que foi alterada à mão depois de gerada.
if (String((portoesOrigem.saida || {}).md5 || '') !== MD5_0) throw new Error('ABORTA: md5 da origem ' + MD5_0 + ' não é o da saída certificada ' + String((portoesOrigem.saida || {}).md5) + ' — a candidata foi tocada depois de gerada, ou o registo é de outra corrida');
if (String((portoesOrigem.saida || {}).pasta || '') !== 'bfr-candidata-v139-sonda-honesta') throw new Error('ABORTA: o registo de origem aponta para outra pasta: ' + String((portoesOrigem.saida || {}).pasta));
if (txt0.indexOf(INVOLUCRO) === -1) throw new Error('ABORTA: a origem não tem o invólucro do módulo municipal');

// ——— a mesa de auditoria lê-se do DDL versionado, nunca se dactilografia ———
const ddl = readFileSync(DDL, 'utf8');
const MESAS_AUDITORIA = [...new Set([...ddl.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]*audit[a-z0-9_]*)/g)].map((m) => m[1]))];
if (MESAS_AUDITORIA.length !== 1) throw new Error('ABORTA ' + MESAS_AUDITORIA.length + ' mesas de auditoria lidas do DDL (' + MESAS_AUDITORIA.join(',') + ') — a regex partiu ou há duas');
const MESA = MESAS_AUDITORIA[0];
// A política de escrita tem de ser a que o DDL declara para a mesa, com as duas condições: sem ela o bundle
// escreveria contra uma mesa que o banco nega, e o portão 4 diria «pronto» sobre uma INSERT que sempre falha.
const blocoWrite = (new RegExp('CREATE POLICY [a-z0-9_]*audit[a-z0-9_]*[a-z_]* ON public\\.' + MESA + '\\s*\\n\\s*FOR INSERT[^;]*;', 'i').exec(ddl) || [''])[0];
if (!/WITH CHECK/i.test(blocoWrite) || !/auth\.uid\(\)/i.test(blocoWrite) || !/bfr_is_municipal_authority\(\)/i.test(blocoWrite))
  throw new Error('ABORTA: a política de INSERT de ' + MESA + ' não tem as duas condições esperadas no DDL — o registo é ' + JSON.stringify(blocoWrite.slice(0, 200)));

// ——— as quatro substituições, cada uma contada uma vez na origem ———
const SUBS = [
  {
    nome: 'estado_da_trilha_de_acesso',
    antes: "  const estado = { tab: 'painel', cache: {}, carregando: {}, erros: {}, escola: '', busca: '', ano: '', turno: '' };",
    depois: "  const estado = { tab: 'painel', cache: {}, carregando: {}, erros: {}, escola: '', busca: '', ano: '', turno: '' };\n"
      + "  // Trilha de acesso (§7.442): uma escrita por carregamento de página, e só quando o backend\n"
      + "  // respondeu true. O `detail` leva apenas o separador pedido — nunca nome, e-mail ou identificador de aluno.\n"
      + "  const trilha = { tentada: false, escrita: null, erro: '', acoes: [] };\n"
      + "  let trilhaNestaCarga = false;",
  },
  {
    nome: 'a_funcao_que_assina_a_abertura',
    antes: "  function faixaSonda() {",
    depois: "  async function registrarTrilha(s) {\n"
      + "    if (trilhaNestaCarga) return trilha;\n"
      + "    if (!s || s.autorizada !== true) return trilha;\n"
      + "    const c = client();\n"
      + "    if (!c) { trilha.erro = 'sem cliente'; return trilha; }\n"
      + "    trilhaNestaCarga = true; trilha.tentada = true;\n"
      + "    try {\n"
      + "      const u = await c.auth.getUser();\n"
      + "      const ator = (u && u.data && u.data.user) ? u.data.user.id : null;\n"
      + "      if (!ator) { trilha.erro = 'sem utilizador na sessão'; trilhaNestaCarga = false; return trilha; }\n"
      + "      const { error } = await c.from('" + MESA + "').insert({ actor: ator, action: 'painel_aberto', entity: SECT, detail: { tab: estado.tab } });\n"
      + "      trilha.escrita = !error; trilha.erro = error ? String(error.message || error.code) : '';\n"
      + "      if (!error) trilha.acoes.push('painel_aberto:' + SECT + ':' + estado.tab);\n"
      + "    } catch (e) { trilha.escrita = false; trilha.erro = String((e && e.message) || e); trilhaNestaCarga = false; }\n"
      + "    return trilha;\n"
      + "  }\n"
      + "  function faixaSonda() {",
  },
  {
    nome: 'a_abertura_chama_a_trilha_depois_da_sonda',
    antes: "    sondarBackend().then(pintarSonda);",
    depois: "    sondarBackend().then((s) => { pintarSonda(); return registrarTrilha(s); });",
  },
  {
    nome: 'a_trilha_ficou_medivel_na_consola',
    antes: "  window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aplicarVisibilidade, sondarBackend, sonda, estado, cache, SECT, PAPEIS_MUNICIPAIS };",
    depois: "  window.BFR_MUNICIPAL = { abrir, registar, garantir, aptoParaSessao, aplicarVisibilidade, sondarBackend, sonda, trilha, registrarTrilha, estado, cache, SECT, PAPEIS_MUNICIPAIS };",
  },
];
for (const s of SUBS) {
  const v = vezes(txt0, s.antes);
  if (v !== 1) throw new Error('ABORTA: substituição "' + s.nome + '" casou ' + v + ' vezes na origem (esperado 1)');
}
let txt = txt0;
for (const s of SUBS) txt = txt.replace(s.antes, s.depois);
if (txt === txt0) throw new Error('ABORTA: nenhuma substituição escreveu nada');

// ——— predicações puras, cada uma com os dois lados provados ———
// O corpo extrai-se pelo FIM do invólucro e pelo FIM da função (terminação literal), nunca por regex do corpo.
const iniCorpo = txt.indexOf(INVOLUCRO) + INVOLUCRO.length;
const corpo = txt.slice(iniCorpo, txt.indexOf('</script>', iniCorpo));
const iniFn = corpo.indexOf('async function registrarTrilha(');
if (iniFn === -1) throw new Error('ABORTA: o corpo gerado não tem registrarTrilha — a substituição escreveu outro texto');
const fimFn = corpo.indexOf('\n  }\n', iniFn);
if (fimFn === -1) throw new Error('ABORTA: não encontrei o fecho de registrarTrilha por terminação — a indentação mudou');
const FUNCAO = corpo.slice(iniFn, fimFn + 4);

// Colunas da mesa lêem-se do mesmo DDL que declara a política: a régua não pode conhecer de memória os campos
// que a mesa tem. E o `detail` só pode nomeiar chaves do próprio `estado` do painel, lidas do módulo — assim um
// `{ email: aluno.email }` fica vermelho sem que eu tenha de lembrar uma lista de campos sensíveis.
const blocoMesa = (new RegExp('CREATE TABLE (?:IF NOT EXISTS )?(?:public\\.)?' + MESA + ' \\(([\\s\\S]*?)\\n\\);', 'i').exec(ddl) || [])[1] || '';
const COLUNAS_DA_MESA = [...new Set([...blocoMesa.matchAll(/^\s*([a-z_][a-z0-9_]*)\s+[a-z]/gmi)].map((m) => m[1]))];
if (COLUNAS_DA_MESA.length === 0) throw new Error('ABORTA: 0 colunas lidas do CREATE TABLE de ' + MESA + ' — o portão do payload ficaria vacuo');
const blocoEstado = (/const estado = \{([^}]*)\}/.exec(corpo) || [])[1] || '';
const CHAVES_DO_ESTADO = [...new Set([...blocoEstado.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]))];
if (CHAVES_DO_ESTADO.length === 0) throw new Error('ABORTA: 0 chaves lidas do `const estado` — a régua do detail ficaria vacua');

const semNichos = (s) => { let out = ''; let d = 0; for (const ch of s) { if (ch === '{') { d++; if (d === 1) { out += ' '; continue; } } if (ch === '}') { d--; if (d === 0) { out += ' '; continue; } } if (d === 0) out += ch; } return out; };
const chavesTopo = (p) => [...semNichos(p).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]);
const chavesNichadas = (p) => [...p.matchAll(/\{([^{}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((x) => x[1]));
const escreveNaMesaDeclarada = (t, mesa) => new RegExp("from\\(\\s*'" + mesa + "'\\s*\\)\\.insert\\(").test(t);
const guardaAntesDaEscrita = (t, guarda) => { const g = t.indexOf(guarda), w = t.search(/\.insert\(/); return g !== -1 && w !== -1 && g < w; };
const semUuidLiteral = (t) => !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t);
// O payload extrai-se por CONTAGEM de chavetas: a regex `[^}]*` cortava no `}` do `detail` e deixava o resto de
// fora, que é o mesmo defeito de delimitador que já me rebentou com um literal de template.
const payloadDoInsert = (t) => {
  const ini = t.indexOf('.insert({');
  if (ini === -1) return '';
  let d = 0;
  for (let i = ini + '.insert('.length; i < t.length; i++) {
    if (t[i] === '{') d++;
    else if (t[i] === '}') { d--; if (d === 0) return t.slice(ini + '.insert({'.length, i); }
  }
  return '';
};
if (payloadDoInsert("x.insert({ a: 1, d: { b: 2 } })") !== ' a: 1, d: { b: 2 } ') throw new Error('ABORTA: payloadDoInsert corta no nicho — lido ' + JSON.stringify(payloadDoInsert("x.insert({ a: 1, d: { b: 2 } })")));
if (payloadDoInsert("x.select({ a: 1 })") !== '') throw new Error('ABORTA: payloadDoInsert inventa payload onde não há insert');
if (escreveNaMesaDeclarada("c.from('outra_mesa').insert({})", MESA) !== false) throw new Error('ABORTA: escreveNaMesaDeclarada aceita outra mesa — o portão seria vacuo');
if (escreveNaMesaDeclarada("c.from('" + MESA + "').select()", MESA) !== false) throw new Error('ABORTA: escreveNaMesaDeclarada conta um select como escrita');
if (guardaAntesDaEscrita("if (x) return;\nawait t.insert()", 'return') !== true) throw new Error('ABORTA: guardaAntesDaEscrita não vê a guarda antes da escrita');
if (guardaAntesDaEscrita("await t.insert();\nreturn;", 'return') !== false) throw new Error('ABORTA: guardaAntesDaEscrita aceita a escrita antes da guarda');
if (chavesTopo('actor: a, detail: { tab: t }').join(',') !== 'actor,detail') throw new Error('ABORTA: chavesTopo não separa o nicho — lidas ' + JSON.stringify(chavesTopo('actor: a, detail: { tab: t }')));
if (chavesNichadas('actor: a, detail: { tab: t, email: e }').join(',') !== 'tab,email') throw new Error('ABORTA: chavesNichadas não vê as chaves do nicho — lidas ' + JSON.stringify(chavesNichadas('actor: a, detail: { tab: t, email: e }')));
if (semUuidLiteral('actor: ator') !== true || semUuidLiteral('actor: "3f2a1b6c-4d5e-6f70-8192-a3b4c5d6e7f8"') !== false) throw new Error('ABORTA: semUuidLiteral não discrimina o uuid literal do identificador lido da sessão');
const faixaHonestaPreservada = (t) => /if \(sonda\.autorizada === true\) return '<div class="mun-ok"/.test(t)
  && /class="mun-danger"/.test(t) && /#bfrMunicipalView \.mun-danger\{/.test(t) && !/if \(sonda\.executavel\) return '<div class="mun-ok"/.test(t);
if (faixaHonestaPreservada("if (sonda.autorizada === true) return '<div class=\"mun-ok\">x';\n<div class=\"mun-danger\">\n'#bfrMunicipalView .mun-danger{") !== true) throw new Error('ABORTA: faixaHonestaPreservada chumba o texto que tem as três marcas');
if (faixaHonestaPreservada("if (sonda.executavel) return '<div class=\"mun-ok\">x';\n<div class=\"mun-danger\">\n'#bfrMunicipalView .mun-danger{") !== false) throw new Error('ABORTA: faixaHonestaPreservada deixa passar o ramo velho');

// ——— compilação do corpo, com o fixture que prova que o portão tem dentes ———
const compila = (t) => { try { new Script(t, { filename: 'modulo-municipal-v140.js' }); return true; } catch (e) { return 'ERRO: ' + String(e.message || e).slice(0, 160); } };
if (compila('const a = 1;') !== true) throw new Error('ABORTA: compila() chumba código válido');
if (compila('const a = 1; function ( {') === true) throw new Error('ABORTA: compila() aceita sintaxe partida — o portão seria vacuo');

if (process.argv.includes('--selfteste')) {
  console.log('P87_SELFTESTE_OK — as predicações (mesa, guarda, chaves de topo e de nicho, uuid literal, faixa honesta, chavetas do payload, compilação) discriminam nos seus fixtures; 0 rede, 0 banco');
  process.exit(0);
}

if (existsSync(SAIDA)) {
  const anterior = readFileSync(SAIDA, 'utf8');
  if (md5(anterior) !== md5(txt)) throw new Error('ABORTA: ' + SAIDA + ' já existe com bytes DIFERENTES — não se sobrescreve; use outro destino');
} else mkdirSync(PARA, { recursive: true });
writeFileSync(SAIDA, txt);

// ——— nada foi publicado: o diário mais novo continua a ser o do ar, e o ar servido é o mesmo de antes ———
const porVersao = (re) => readdirSync(DIR).filter((f) => re.test(f)).sort((a, b) => parseInt(/(\d+)/.exec(a)[1], 10) - parseInt(/(\d+)/.exec(b)[1], 10));
const DIARIO = porVersao(/^audit-publicacao-v\d+\.json$/).slice(-1)[0];
const V_PUBLICADO = /v(\d+)/.exec(DIARIO || 'v0')[1];
const diarioV140 = join(DIR, 'audit-publicacao-v140.json');
let SERVIDO = '';
try { const r = await fetch(AR_PUBLICADO, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(60000) }); SERVIDO = md5(await r.text()); }
catch (e) { SERVIDO = 'fetch_falhou: ' + String(e.message || e).slice(0, 90); }
const txtV136 = readFileSync(join(DIR, 'bfr-candidata-v136-secretaria-de-educacao/index.html'), 'utf8');

const payload = payloadDoInsert(FUNCAO);
if (!payload) throw new Error('ABORTA: não extraí o payload do .insert( por contagem de chavetas — os portões 5 e 6 ficariam cegos');
const topo = chavesTopo(payload);
const nichadas = chavesNichadas(payload);
if (topo.length === 0) throw new Error('ABORTA: 0 chaves de topo lidas do payload — o portão da mesa seria vacuo');
if (nichadas.length === 0) throw new Error('ABORTA: 0 chaves dentro de `detail` — ou o payload mudou de forma, ou a régua do dado pessoal não tem onde cair');

const falhas = []; const portoes = [];
const g = (nome, cond, dado) => { const v = !!cond; portoes.push({ nome, verde: v, dado }); if (!v) falhas.push(`${nome} | ${JSON.stringify(dado).slice(0, 300)}`); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('cada_substituicao_casou_uma_svez_na_origem', SUBS.every((s) => vezes(txt0, s.antes) === 1 && vezes(txt, s.depois) === 1), SUBS.map((s) => s.nome + ':origem=' + vezes(txt0, s.antes) + ',destino=' + vezes(txt, s.depois)));
g('o_corpo_do_modulo_compila', compila(corpo) === true, { bytes_corpo: corpo.length, erro: compila(corpo) === true ? '' : compila(corpo) });
g('a_escrita_vai_a_mesa_de_auditoria_declarada_no_ddl', escreveNaMesaDeclarada(FUNCAO, MESA), { mesa_lida_do_ddl: MESA, bloco_politica: blocoWrite.slice(0, 240) });
g('a_escrita_s_e_tenta_quando_o_backend_responde_true', /s\.autorizada !== true/.test(FUNCAO) && guardaAntesDaEscrita(FUNCAO, 'autorizada !== true'), { funcao_bytes: FUNCAO.length });
g('o_payload_so_usa_colunas_declaradas_na_mesa_do_ddl', topo.every((k) => COLUNAS_DA_MESA.includes(k)) && topo.includes('actor'), { lidas_no_payload: topo, colunas_do_ddl: COLUNAS_DA_MESA, politica: blocoWrite.trim().slice(0, 200) });
g('o_detail_nao_nomeia_nenhuma_chave_fora_do_estado_do_painel', nichadas.every((k) => CHAVES_DO_ESTADO.includes(k)), { lidas_no_detail: nichadas, chaves_do_estado: CHAVES_DO_ESTADO, nota: 'o que é permitido aqui é o que o painel já sabe de si mesmo; um campo de aluno ou de perfil não está entre as chaves do `estado`' });
g('o_actor_veio_da_sessao_e_nao_de_um_uuid_escrito_a_mao', /auth\.getUser\(\)/.test(FUNCAO) && semUuidLiteral(FUNCAO), { tem_getuser: /auth\.getUser\(\)/.test(FUNCAO) });
g('uma_escripta_por_carregamento_de_pagina', /trilhaNestaCarga/.test(FUNCAO) && guardaAntesDaEscrita(FUNCAO, 'trilhaNestaCarga'), { ocorrencias_guarda: vezes(FUNCAO, 'trilhaNestaCarga') });
g('a_faixa_honesta_da_v139_continua_la', faixaHonestaPreservada(corpo), { verde_exige_verdade: /if \(sonda\.autorizada === true\)/.test(corpo), ramo_negacao: /class="mun-danger"/.test(corpo), css: /#bfrMunicipalView \.mun-danger\{/.test(corpo) });
g('a_abertura_chama_a_trilha_depois_da_sonda', /sondarBackend\(\)\.then\(\(s\) => \{ pintarSonda\(\); return registrarTrilha\(s\); \}\);/.test(corpo), { linha: (corpo.split('\n').find((l) => /sondarBackend\(\)\.then/.test(l)) || '').trim().slice(0, 140) });
g('a_trilha_ficou_exposta_para_medir', /BFR_MUNICIPAL = \{[^}]*\btrilha\b/.test(corpo), { linha_export: (corpo.split('\n').find((l) => /window\.BFR_MUNICIPAL =/.test(l)) || '').trim().slice(0, 200) });
g('nada_foi_publicado', !existsSync(diarioV140) && SERVIDO === md5(txtV136), { diario_mais_novo: DIARIO, versao_publicada: V_PUBLICADO, existe_diario_v140: existsSync(diarioV140), md5_servido: SERVIDO, md5_v136: md5(txtV136) });

const out = {
  programa: 'scripts/p87-gera-candidata-v140-trilha-de-acesso.mjs', em: new Date().toISOString(), duracao_ms: Date.now() - t0,
  pergunta: 'o painel municipal pode passar a deixar trilha de quem o abriu sem que ninguém publique nem escreva no banco agora?',
  metodo: 'geração por substituição contada sobre a candidata certificada v139; a mesa e a política de escrita lêem-se de ' + 'scripts/sm4-ddl-municipal-candidata.sql' + ', nunca dactilografadas. 0 publicação, 0 DDL, 0 INSERT executado.',
  origem: { pasta: 'bfr-candidata-v139-sonda-honesta', md5: MD5_0, bytes: B0, veredito_portoes: portoesOrigem.veredito },
  destino: { pasta: 'bfr-candidata-v140-trilha-de-acesso', md5: md5(txt), bytes: statSync(SAIDA).size, delta_bytes: statSync(SAIDA).size - B0 },
  trilha: { mesa_lida_do_ddl: MESA, colunas_do_ddl: COLUNAS_DA_MESA, politica_de_escrita: blocoWrite.trim(), payload, chaves_de_topo: topo, chaves_do_detail: nichadas, chaves_do_estado: CHAVES_DO_ESTADO, funcao_bytes: FUNCAO.length, funcao: FUNCAO },
  publicacao: { diario_mais_novo: DIARIO, versao_publicada: V_PUBLICADO, md5_servido: SERVIDO, md5_v136_local: md5(txtV136) },
  substituicoes: SUBS.map((s) => ({ nome: s.nome, depois_presente: vezes(txt, s.depois) === 1 })),
  o_que_este_verde_nao_autoriza: 'Nada fora do disco. A trilha só escreve quando o ar for publicado (pede OK), e a P88 mede o caminho com o cliente interceptado para não escrever.',
  portoes, falhas,
};
out.veredito = falhas.length === 0 ? 'P87_CANDIDATA_V140_TRILHA_OK ' + portoes.length + '/0' : `P87_CANDIDATA_V140_TRILHA_VERMELHO ${falhas.length}`;
writeFileSync(PORTOES, JSON.stringify(out, null, 2) + '\n');
if (!existsSync(EV)) writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
for (const f of falhas) console.log('  FALTA ' + f);
console.log(`${out.veredito} · ${out.destino.bytes} B (Δ ${out.destino.delta_bytes}) · ${out.destino.md5} · mesa=${MESA} · ${out.duracao_ms} ms`);
process.exit(falhas.length ? 1 : 0);
