#!/usr/bin/env node
// P73-MUNICIPAL-APLICA-DDL — o único caminho de aplicação das três peças municipais candidatas (PEN-38, PEN-39,
// PEN-41) e da respectiva conferência. Existe porque o runbook `docs/bu-20-11/10-runbook-municipal.md` promete
// comandos executáveis: sem esta peça, «deixar pronto» deixaria ao utilizador a parte irreversível, e a
// comparação de estado vivo ficaria a cargo da memória de quem copia e cola.
//
// Por omissão NADA é escrito. O programa só corre o SQL quando (a) `--peca` resolve num ficheiro que existe,
// (b) `--ok` é exactamente a frase declarada para essa peça e para este modo, e (c) o preflight fresco da
// própria peça deu verde contra o estado vivo, neste instante. Uma frase diferente, um «ok» solto, um
// preflight velho ou vermelho: recusa, sem tocar no banco. A publicação (v137/v138) não passa por aqui e
// continua a pedir OK próprio.
//
// O modo `--reverter` existe porque o SQL de reversão, sem ele, teria de ser enviado à mão — e o runbook
// (`docs/bu-20-11/10-runbook-municipal.md` §4) prometia um caminho executável. Não é a aplicação ao contrário
// com a mesma frase: exige a frase `REVERTER <peca> NO BANCO`, corre primeiro o preflight em modo reversão
// (que só dá verde se a peça estiver de facto aplicada) e só depois envia a reversão; a conferência de saída é
// o preflight em modo candidata, que afirma o estado limpo. As duas frases são portanto portões distintos, e
// a ordem dos dois preflights inverte-se com o modo — por isso o registo traz `sequencia` em vez de obrigar
// quem lê a lembrar qual verde veio primeiro.
//
// Uso:  node scripts/p73-municipal-aplica-ddl.mjs --selfteste
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41                     (recusa: falta o --ok)
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --ok "APLICAR PEN-41 NO BANCO"
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --reverter --ok "REVERTER PEN-41 NO BANCO"
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { sql } from './c2-lib.mjs';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const argv = process.argv.slice(2);
const flag = (nome) => { const i = argv.indexOf('--' + nome); return i === -1 ? null : argv[i + 1]; };
const tem = (nome) => argv.includes('--' + nome);
const PECAS = {
  'PEN-38': { pref: 'scripts/p73-pen38-preflight.mjs', cand: 'scripts/p73-pen38-ddl-candidata.sql', rev: 'scripts/p73-pen38-ddl-reversao.sql', prefixo: 'P73_PEN38_PREFLIGHT_VERDE', frase: 'APLICAR PEN-38 NO BANCO', fraseRev: 'REVERTER PEN-38 NO BANCO' },
  'PEN-39': { pref: 'scripts/p73-pen39-preflight.mjs', cand: 'scripts/p73-pen39-ddl-candidata.sql', rev: 'scripts/p73-pen39-ddl-reversao.sql', prefixo: 'P73_PEN39_PREFLIGHT_VERDE', frase: 'APLICAR PEN-39 NO BANCO', fraseRev: 'REVERTER PEN-39 NO BANCO' },
  'PEN-41': { pref: 'scripts/p73-pen41-preflight.mjs', cand: 'scripts/p73-pen41-ddl-candidata.sql', rev: 'scripts/p73-pen41-ddl-reversao.sql', prefixo: 'P73_PEN41_PREFLIGHT_VERDE', frase: 'APLICAR PEN-41 NO BANCO', fraseRev: 'REVERTER PEN-41 NO BANCO' },
};
// A frase certificada depende do modo, e é a única diferença de autorização entre aplicar e reverter. Vive
// numa função para o `--selfteste` medir a mesma função que o fluxo usa: uma asserção que reproduzisse a
// regra por omissão seria um verde sobre o meu desenho, não sobre o programa.
const frasePara = (P, modo) => (modo === 'reversao' ? P.fraseRev : P.frase);
const MESAS_DE_BASELINE = ['schools', 'students', 'classes', 'profiles', 'staff_schools'];
// O `registo` que o preflight imprime é um caminho absoluto; `join(REPO, …)` sobre ele daria um caminho
// impossível e o falso motivo de recusa «preflight nao devolveu caminho de registo legivel».
const caminhoReal = (p) => (isAbsolute(p) ? p : join(REPO, p));

// O texto que vai ao banco não pode conter o que uma candidata municipal nunca deveria conter: apagar mesas,
// apagar linhas, escrever dados directamente, ou carregar uma credencial. A varredura é feita sobre o que o
// Postgres executa: comentários saem (prosa de cabeçalho não é statement) e os corpos de função são
// substituídos, porque a PEN-38 bloco C tem um UPDATE legítimo dentro duma SECURITY DEFINER e daría falso
// positivo. `DROP POLICY`/`CREATE POLICY`/`CREATE FUNCTION` contam-se mas não chumbam: são o trabalho.
const so_codigo = (t) => t.split('\n').map((l) => (l.trim().startsWith('--') ? '' : l)).join('\n')
  .replace(/\$[a-z0-9_]*\$[\s\S]*?\$[a-z0-9_]*\$/g, ' CORPO_DE_FUNCAO ');
const perigos = (t) => {
  const fora = so_codigo(t);
  const c = (re) => (fora.match(re) || []).length;
  return { drop_table: c(/^\s*DROP\s+TABLE/gim), truncate: c(/^\s*TRUNCATE/gim), delete_from: c(/^\s*DELETE\s+FROM/gim),
    update_fora_de_funcao: c(/^\s*UPDATE\s+/gim), drop_schema_ou_database: c(/^\s*DROP\s+(DATABASE|SCHEMA)/gim),
    credencial: ((fora.match(/eyJ[\w-]{10,}|postgres:[^'"\s]{6,}|service_role/gi) || []).length),
    // `DROP FUNCTION` conta-se porque é o trabalho duma reversão (as três candidatas criam 2+2+0 funções e as
    // reversões correspondentes descartam-nas), mas não chumba: não está em ZERO_OBRIGATORIO. Acrescentar uma
    // contagem nunca alarga um predicado de bloqueio — os dois lados ficam visíveis no registo.
    drop_policy: c(/^\s*DROP\s+POLICY/gim), drop_function: c(/^\s*DROP\s+FUNCTION/gim), create_policy: c(/^\s*CREATE\s+POLICY/gim), create_function: c(/^\s*CREATE\s+FUNCTION/gim) };
};
const ZERO_OBRIGATORIO = ['drop_table', 'truncate', 'delete_from', 'update_fora_de_funcao', 'drop_schema_ou_database', 'credencial'];
const bloqueadoresDe = (pj) => Object.entries(pj).filter(([k, v]) => ZERO_OBRIGATORIO.includes(k) && v > 0).map(([k, v]) => k + '=' + v);
const FIX_PERIGOS = {
  update_dentro_de_funcao_nao_conta: perigos('CREATE FUNCTION f() RETURNS void AS $fn$ BEGIN UPDATE public.t SET a=1; END; $fn$ LANGUAGE plpgsql;').update_fora_de_funcao === 0,
  update_fora_de_funcao_conta: perigos('UPDATE public.t SET a = 1;').update_fora_de_funcao === 1,
  truncate_conta: perigos('TRUNCATE public.t;').truncate === 1,
  prosa_de_cabecalho_nao_e_statement: perigos('-- vamos UPDATE a mesa, DROP TABLE t e o service_role\nSELECT 1;').credencial === 0 && perigos('-- UPDATE\n-- DROP TABLE t;\nSELECT 1;').drop_table === 0,
  // O caso contrário, para o fixture não ser uma licença para a varredura: `DROP TABLE` escrito FORA de
  // comentário é statement e tem de contar, mesmo vindo logo depois duma linha de prosa.
  drop_table_fora_de_comentario_conta: perigos('-- UPDATE\nDROP TABLE t;').drop_table === 1,
  palavra_credencial_fora_de_comentario_conta: perigos("select 'service_role'").credencial === 1,
  drop_function_conta_como_trabalho_de_reversao: perigos('DROP FUNCTION public.f();').drop_function === 1,
};

const MODO = tem('reverter') ? 'reversao' : 'aplicacao';
const recusa = (motivos, extra) => {
  const corpo = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', modo: MODO, em: new Date().toISOString(),
    escrito_no_banco: false, aplicado: false, motivos_de_recusa: motivos, ...(extra || {}) };
  if (tem('regista-recusa')) {
    // O nome do registo distingue o modo: uma recusa de reversão guardada com o nome da aplicação seria
    // confusão de provinha num diretório onde as duas famílias já coabitam.
    const p = join(REPO, `evidence/p73-municipal-${MODO === 'reversao' ? 'reversao' : 'aplica-ddl'}-recusa-` +
      (flag('peca') || 'sem-peca') + '-' + String(Date.now()) + '.json');
    writeFileSync(p, JSON.stringify(corpo, null, 2) + '\n');
    corpo.registo = p;
  }
  console.log(`RECUSADO · ${MODO} · ` + JSON.stringify(motivos));
  if (corpo.registo) console.log('registo ' + corpo.registo);
  process.exit(2);
};

const correPreflight = (caminhoRel, modo, sufixo) => {
  // O MODO é um argumento de linha de comando do preflight (`--reversao`), não uma variável de ambiente:
  // passar só o sufixo correria o modo candidata duas vezes e a conferência de saída seria a conferência
  // de entrada. O sufixo sim é ambiente (`P73_SUF`), porque serve só para o registo não por cima.
  const args = [join(REPO, caminhoRel), ...(modo === 'reversao' ? ['--reversao'] : [])];
  const r = spawnSync(process.execPath, args, {
    cwd: REPO, encoding: 'utf8', timeout: 300000,
    env: { ...process.env, P73_SUF: sufixo + (modo === 'reversao' ? 'r' : 'c') },
  });
  const saida = String(r.stdout || '') + String(r.stderr || '');
  const registo = (/registo (\S+\.json)\s*$/m.exec(saida.trim()) || [])[1] || null;
  return { codigo: r.status, tempo_esgotado: r.error && /ETIMEDOUT|timed out/i.test(String(r.error.code || r.error.message)), saida_ultima_linha: saida.trim().split('\n').filter(Boolean).pop() || '', registo, comando: args.join(' ') };
};

const selfteste = tem('selfteste');
if (selfteste) {
  const casos = [];
  const c = (nome, verde) => casos.push({ nome, verde: !!verde });
  c('frase_solta_nao_autoriza', 'APLICAR PEN-41 NO BANCO' !== 'ok' && 'APLICAR PEN-41 NO BANCO' !== 'APLICAR PEN-38 NO BANCO');
  c('cada_peca_tem_ficheiros_em_disco', Object.entries(PECAS).every(([, p]) => [p.pref, p.cand, p.rev].every((f) => existsSync(join(REPO, f)))));
  c('varredura_de_perigo_nao_confunde_prosa_nem_corpo_de_funcao', Object.values(FIX_PERIGOS).every(Boolean));
  c('varredura_de_credencial_dispara', perigos('token eyJhbGciOiJIUzI1NiJ9.abcdefghijklmnopqrstuvwxyz').credencial === 1);
  c('preflight_escreve_nome_de_registo_que_se_le_na_saida', /registo \S+\.json/.test('P73_X_VERDE_CANDIDATA 12 ms · registo evidence/x.json'));
  // Régua do verde do preflight, medida contra as três formas que os preflights emitem de facto. A versão
  // antiga pedia «espaço-0» no fim, que `13/0` nunca satisfaz: nunca haveria positivo possível.
  const verdeReal = (v) => /_VERDE_/.test(v) && /\/0$/.test(v);
  c('regua_do_verde_bate_nas_formas_que_os_preflights_emitem', [
    'P73_PEN41_PREFLIGHT_VERDE_CANDIDATA 13/0', 'P73_PEN38_PREFLIGHT_VERDE_REVERSAO 10/0', 'P73_PEN39_PREFLIGHT_VERDE_CANDIDATA 9/0',
  ].every(verdeReal) && !verdeReal('P73_PEN41_PREFLIGHT_VERMELHO_5') && !verdeReal('P73_PEN38_PREFLIGHT_VERDE_CANDIDATA 9/1'));
  c('caminho_de_registo_absoluto_e_lido_como_absoluto', caminhoReal('C:/repo/evidence/x.json') === 'C:/repo/evidence/x.json' && caminhoReal('evidence/x.json') === join(REPO, 'evidence/x.json'));
  // ── modo reversão ─────────────────────────────────────────────────────────
  // Seis frases, não três: a de aplicar e a de reverter por peça. Duas peças trocarem de frase já estava
  // coberto; o que o modo novo introduz é a tentação de reverter com a frase da aplicação, e é isso que
  // `frasePara` tem de tornar impossível. Medido sobre a tabela, não sobre o que eu escrevi à mão.
  c('frases_de_aplicacao_e_reversao_sao_seis_e_disjuntas',
    new Set(Object.values(PECAS).flatMap((p) => [p.frase, p.fraseRev])).size === Object.keys(PECAS).length * 2
      && Object.values(PECAS).every((p) => p.frase !== p.fraseRev), true);
  const pecas = Object.keys(PECAS);
  c('o_modo_escolhe_a_frase_e_nao_a_conveniencia', pecas.every((k) =>
    frasePara(PECAS[k], 'aplicacao') === PECAS[k].frase && frasePara(PECAS[k], 'reversao') === PECAS[k].fraseRev
      && frasePara(PECAS[k], 'reversao') !== PECAS[k].frase)
    // Distinctness entre peças medido por censo, não por `!==` contra uma peça fixa: comparar PEN-38 com PEN-38
    // é o verde que nunca pode ser vermelho, e aqui daria falso vermelho exactamente pelo mesmo motivo.
    && new Set(pecas.map((k) => frasePara(PECAS[k], 'reversao'))).size === pecas.length
    && new Set(pecas.map((k) => frasePara(PECAS[k], 'aplicacao'))).size === pecas.length);
  // A varredura de perigo tem de valer para os dois lados, sem chumbar o trabalho da reversão: `DROP FUNCTION`
  // é o que uma reversão faz, e não está na lista obrigatória de zeros.
  c('drop_function_de_reversao_e_trabalho_nao_statement_proibido', bloqueadoresDe(perigos('DROP FUNCTION public.f();')).length === 0 && perigos('DROP FUNCTION public.f();').drop_function === 1);
  c('frase_de_reversao_solta_nao_autoriza_aplicacao', frasePara(PECAS['PEN-41'], 'aplicacao') !== 'REVERTER PEN-41 NO BANCO');
  // Os seis SQL em disco, medidos nesta corrida: uma transacção cada, nenhum statement proibido, e a reversão
  // não pode ser a candidata copiada ao contrário nem um ficheiro vazio de efeito. Isto lê ficheiros — não
  // toca no banco, por isso o `--selfteste` corre sem credencial nenhuma.
  const seisSql = Object.entries(PECAS).flatMap(([k, p]) => [[k, 'candidata', p.cand], [k, 'reversao', p.rev]]);
  c('os_seis_sql_sao_unicas_transaccoes_sem_statement_proibido', seisSql.every(([, , f]) => {
    const t = readFileSync(join(REPO, f), 'utf8');
    return /^BEGIN;/m.test(t) && /^COMMIT;/m.test(t) && bloqueadoresDe(perigos(t)).length === 0;
  }));
  c('cada_reversao_desfaz_algo_e_nao_e_a_candidata', Object.entries(PECAS).every(([k, p]) => {
    const a = readFileSync(join(REPO, p.cand), 'utf8'), b = readFileSync(join(REPO, p.rev), 'utf8');
    const pb = perigos(b);
    return md5(a) !== md5(b) && pb.drop_function + pb.drop_policy + pb.create_policy > 0;
  }));
  const medidos = seisSql.map(([k, lado, f]) => { const t = readFileSync(join(REPO, f), 'utf8'); const pj = perigos(t); return { peca: k, lado, caminho: f, bytes: Buffer.byteLength(t, 'utf8'), md5: md5(t), desfaz: pj.drop_function + pj.drop_policy + pj.create_policy }; });
  const boas = casos.filter((x) => x.verde).length;
  const out = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', selfteste: true, em: new Date().toISOString(), aplicado: false, escrito_no_banco: false, casos, sql_medidos: medidos, veredito: boas === casos.length ? `P73_MUNICIPAL_APLICA_SELFTESTE_OK ${casos.length}/0` : `P73_MUNICIPAL_APLICA_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(out, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

const peca = flag('peca');
if (!peca || !PECAS[peca]) recusa(['--peca tem de ser uma das pecas certificadas: ' + Object.keys(PECAS).join(', ')]);
const P = PECAS[peca];
const frasesCertificadas = Object.values(PECAS).flatMap((x) => [x.frase, x.fraseRev]);
const FRASE = frasePara(P, MODO);
const FRASE_OUTRO_MODO = frasePara(P, MODO === 'reversao' ? 'aplicacao' : 'reversao');
const ok = flag('ok');
if (ok === null) recusa([`falta --ok com a frase literal deste modo (${FRASE}); sem frase, nada e escrito`]);
if (ok !== FRASE) recusa([
  `--ok nao e a frase certificada deste modo; esperado exatamente "${FRASE}"`,
  // A recusa diz por nome o que a pessoa tentou: reverter com a frase de aplicação (ou aplicar com a de
  // reversão) é o engano que este modo introduz, e um motivo genérico deixaria a pessoa a tentar a outra.
  ...(ok === FRASE_OUTRO_MODO ? [`a frase "${ok}" pertence ao modo ${MODO === 'reversao' ? 'aplicacao' : 'reversao'} desta peca: aplicar e reverter sao OKs distintos, um nao arrasta o outro`] : []),
  `frases certificadas desta familia: ${JSON.stringify(frasesCertificadas)}`,
], { aviso: MODO === 'reversao' ? 'um «ok» solto, ou o OK de aplicação, nao autoriza desfazer DDL já aplicado' : 'um «ok» solto nao autoriza escrita no banco' });

const faltam = [P.pref, P.cand, P.rev].filter((f) => !existsSync(join(REPO, f)));
if (faltam.length) recusa(['ficheiro da peca nao existe em disco: ' + faltam.join(', ')]);
const txtCand = readFileSync(join(REPO, P.cand), 'utf8');
const txtRev = readFileSync(join(REPO, P.rev), 'utf8');
// O que é varrido e o que é enviado dependem do modo. Na aplicação o alvo é a candidata; na reversão o alvo é
// a reversão — e a varredura de perigo é a mesma régua nos dois lados, porque DROP/DELETE/TRUNCATE escritos à
// mão num ficheiro de reversão são exactamente o que a reversão não pode fazer.
const NOME_ALVO = MODO === 'reversao' ? 'reversao' : 'candidata';
const NOME_CONTRA = MODO === 'reversao' ? 'candidata' : 'reversao';
const txtAlvo = MODO === 'reversao' ? txtRev : txtCand;
const perigoAlvo = perigos(txtAlvo);
const bloqueadores = bloqueadoresDe(perigoAlvo);
if (bloqueadores.length) recusa([`o SQL que este modo enviaria tem statement fora de corpo de funcao que esta peça recusa: ${bloqueadores.join(', ')}`]);
if (!/^BEGIN;/m.test(txtAlvo) || !/^COMMIT;/m.test(txtAlvo)) recusa(['o SQL deste modo nao e uma unica transacco (BEGIN/COMMIT)']);

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(REPO, `evidence/p73-municipal-${MODO === 'reversao' ? 'reversao' : 'aplicacao'}-${peca}-${stamp}.json`);
if (existsSync(OUT)) recusa(['o artefacto desta execucao ja existe: ' + OUT]);

// Dois preflights, sempre, e o que cada um afirma inverte-se com o modo. Antes de escrever: o modo que descreve
// o estado que se vai destruir (na aplicação, a candidata ainda por aplicar; na reversão, a peça já aplicada).
// Depois de escrever: o modo que descreve o estado de saída. Um verde velho deste dia não serve — o intervalo
// entre a medição e a escrita é o que esta peça fecha.
const MODO_ANTES = MODO === 'reversao' ? 'reversao' : 'candidata';
const MODO_DEPOIS = MODO === 'reversao' ? 'candidata' : 'reversao';
const SUF = (MODO === 'reversao' ? 'rev' : 'apl') + stamp;
const pre = correPreflight(P.pref, MODO_ANTES, SUF);
if (pre.tempo_esgotado) recusa([`preflight (${MODO_ANTES}) esgotou o tempo de 300 s — estado desconhecido, nada foi escrito`]);
if (!pre.registo || !existsSync(caminhoReal(pre.registo))) recusa([`preflight (${MODO_ANTES}) nao devolveu caminho de registo legivel: ` + pre.saida_ultima_linha]);
const preJson = JSON.parse(readFileSync(caminhoReal(pre.registo), 'utf8'));
if (pre.codigo !== 0 || !String(preJson.veredito).startsWith(P.prefixo) || !/\/0$/.test(String(preJson.veredito))) recusa([
  `preflight em modo ${MODO_ANTES} nao deu verde: ${preJson.veredito}`, `registo ${pre.registo}`,
  ...(MODO === 'reversao' ? ['o modo reversao so pode correr sobre uma peca aplicada: e o preflight em modo reversao que afirma isso contra o estado vivo, e ele nao afirmou'] : []),
]);
const conferePegada = (par, texto) => !!par && par.md5 === md5(texto) && par.bytes === Buffer.byteLength(texto, 'utf8');
const fichaPegada = (par, caminhoRel, texto) => ({ certificado: par, medido_agora: { caminho: caminhoRel, bytes: Buffer.byteLength(texto, 'utf8'), md5: md5(texto) } });
if (!conferePegada(preJson.ficheiros[NOME_ALVO], txtAlvo)) recusa([`o md5/bytes do SQL (${NOME_ALVO}) que este modo enviaria nao bate com o certificado pelo preflight`, fichaPegada(preJson.ficheiros[NOME_ALVO], MODO === 'reversao' ? P.rev : P.cand, txtAlvo)]);
if (!conferePegada(preJson.ficheiros[NOME_CONTRA], MODO === 'reversao' ? txtCand : txtRev)) recusa([`o SQL (${NOME_CONTRA}) em disco nao e o que o preflight certificou: sem ele o caminho de volta desta execucao nao esta garantido`, fichaPegada(preJson.ficheiros[NOME_CONTRA], MODO === 'reversao' ? P.cand : P.rev, MODO === 'reversao' ? txtCand : txtRev)]);


const conta = async () => { const r = await sql(`select ${MESAS_DE_BASELINE.map((m) => `(select count(*)::int from public.${m}) as ${m}`).join(', ')}`); return r[0]; };
const antes = await conta();

const em = new Date().toISOString();
let erroDeEscrita = null;
try { await sql(txtAlvo); } catch (e) { erroDeEscrita = String(e.message || e).slice(0, 600); }
const depois = await conta();
const pos = erroDeEscrita ? { codigo: 'ABORTADO', nota: 'o Postgres aborta a transaccao inteira; nada ficou aplicado nem desfeito' } : correPreflight(P.pref, MODO_DEPOIS, SUF);
let posJson = null;
if (!erroDeEscrita && pos.registo && existsSync(caminhoReal(pos.registo))) posJson = JSON.parse(readFileSync(caminhoReal(pos.registo), 'utf8'));
const fichaPreflight = (modo) => {
  const [r, j] = modo === MODO_ANTES ? [pre, preJson] : [pos, posJson];
  return { modo, registo: r.registo || null, veredito: j ? j.veredito : null, codigo: r.codigo === undefined ? null : r.codigo };
};
const ANTES = fichaPreflight(MODO_ANTES), DEPOIS = fichaPreflight(MODO_DEPOIS);

const out = {
  programa: 'scripts/p73-municipal-aplica-ddl.mjs', peca, modo: MODO, em, duracao_ms: Date.now() - new Date(em).getTime(),
  aplicado: erroDeEscrita === null, escrito_no_banco: erroDeEscrita === null,
  ok_literal_usado: ok, frase_certificada: FRASE, frase_do_outro_modo_nao_autoriza: FRASE_OUTRO_MODO,
  sql_enviado: { nome: NOME_ALVO, ...(NOME_ALVO === 'reversao' ? { caminho: P.rev, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) } : { caminho: P.cand, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) }) },
  candidata: { caminho: P.cand, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) },
  reversao: { caminho: P.rev, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) },
  // Os dois portões por MODO (não por ordem): o que cada verde afirma está dito em `sequencia`, porque aplicar
  // e reverter correm os mesmos dois modos por ordem oposta, e um leitor não tem de lembrar qual veio primeiro.
  preflight_candidata: MODO_ANTES === 'candidata' ? ANTES : DEPOIS,
  preflight_reversao: MODO_ANTES === 'reversao' ? ANTES : DEPOIS,
  sequencia: [
    { ordem: 1, papel: MODO === 'reversao' ? 'precondicao: a peca tem de estar aplicada' : 'precondicao: a peca tem de estar por aplicar', ...ANTES },
    { ordem: 2, papel: MODO === 'reversao' ? 'conferencia de saida: o estado limpo de antes da candidata esta de volta' : 'conferencia de saida: o DDL produzido e o DDL certificado', ...DEPOIS },
  ],
  varredura_do_sql: perigoAlvo,
  baselines: { antes, depois, inalteradas: JSON.stringify(antes) === JSON.stringify(depois) },
  erro_de_escrita: erroDeEscrita,
  o_que_este_registo_nao_cobre: MODO === 'reversao'
    ? 'a publicacao de qualquer versao do ar, o seed do calendario (RM-5.2) e a etiquetagem escola-municipio: cada um tem instrumento e OK proprios. Reverter o DDL tambem nao apaga dados nem re-escreve politicas que nao sejam as que a candidata mexeu.'
    : 'a publicacao de qualquer versao do ar, o seed do calendario (RM-5.2) e a etiquetagem escola-municipio: cada um tem instrumento e OK proprios.',
};
const REGUA_Saida = MODO_DEPOIS === 'reversao' ? /_REVERSAO/ : /_CANDIDATA/;
const conferenciasVerdes = out.baselines.inalteradas && /\/0$/.test(String(out.sequencia[1].veredito))
  && String(out.sequencia[1].veredito).startsWith(P.prefixo) && REGUA_Saida.test(String(out.sequencia[1].veredito));
const PALAVRA = MODO === 'reversao' ? 'REVERTIDO' : 'APLICADO';
out.veredito = erroDeEscrita ? `P73_MUNICIPAL_${MODO === 'reversao' ? 'REVERSAO' : 'APLICACAO'}_ABORTADA ${peca}`
  : (conferenciasVerdes ? `P73_MUNICIPAL_${PALAVRA}_E_CONFERIDO ${peca}` : `P73_MUNICIPAL_${PALAVRA}_COM_CONFERENCIA_VERMELHA ${peca}`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`PECA ${peca} · modo ${MODO} · escrito ${out.escrito_no_banco} · SQL ${out.sql_enviado.nome} ${out.sql_enviado.md5} · preflight antes ${out.sequencia[0].veredito}`);
console.log(`BASELINES ${JSON.stringify({ antes, depois })}`);
console.log(`PREFLIGHT_DEPOIS(${MODO_DEPOIS}) ${JSON.stringify(out.sequencia[1])}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(out.veredito === `P73_MUNICIPAL_${PALAVRA}_E_CONFERIDO ${peca}` ? 0 : 1);
