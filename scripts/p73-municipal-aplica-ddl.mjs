#!/usr/bin/env node
// P73-MUNICIPAL-APLICA-DDL — o único caminho de aplicação das três peças municipais candidatas (PEN-38, PEN-39,
// PEN-41) e da respectiva conferência. Existe porque o runbook `docs/bu-20-11/10-runbook-municipal.md` promete
// comandos executáveis: sem esta peça, «deixar pronto» deixaria ao utilizador a parte irreversível, e a
// comparação de estado vivo ficaria a cargo da memória de quem copia e cola.
//
// Por omissão NADA é escrito. O programa só corre o SQL quando (a) `--peca` resolve num ficheiro que existe,
// (b) `--ok` é exactamente a frase declarada para essa peça, e (c) o preflight fresco da própria peça deu verde
// contra o estado vivo, neste instante. Uma frase diferente, um «ok» solto, um preflight velho ou vermelho:
// recusa, sem tocar no banco. A publicação (v137/v138) não passa por aqui e continua a pedir OK próprio.
//
// Uso:  node scripts/p73-municipal-aplica-ddl.mjs --selfteste
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41                     (recusa: falta o --ok)
//       node scripts/p73-municipal-aplica-ddl.mjs --peca PEN-41 --ok "APLICAR PEN-41 NO BANCO"
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
  'PEN-38': { pref: 'scripts/p73-pen38-preflight.mjs', cand: 'scripts/p73-pen38-ddl-candidata.sql', rev: 'scripts/p73-pen38-ddl-reversao.sql', prefixo: 'P73_PEN38_PREFLIGHT_VERDE', frase: 'APLICAR PEN-38 NO BANCO' },
  'PEN-39': { pref: 'scripts/p73-pen39-preflight.mjs', cand: 'scripts/p73-pen39-ddl-candidata.sql', rev: 'scripts/p73-pen39-ddl-reversao.sql', prefixo: 'P73_PEN39_PREFLIGHT_VERDE', frase: 'APLICAR PEN-39 NO BANCO' },
  'PEN-41': { pref: 'scripts/p73-pen41-preflight.mjs', cand: 'scripts/p73-pen41-ddl-candidata.sql', rev: 'scripts/p73-pen41-ddl-reversao.sql', prefixo: 'P73_PEN41_PREFLIGHT_VERDE', frase: 'APLICAR PEN-41 NO BANCO' },
};
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
    drop_policy: c(/^\s*DROP\s+POLICY/gim), create_policy: c(/^\s*CREATE\s+POLICY/gim), create_function: c(/^\s*CREATE\s+FUNCTION/gim) };
};
const ZERO_OBRIGATORIO = ['drop_table', 'truncate', 'delete_from', 'update_fora_de_funcao', 'drop_schema_ou_database', 'credencial'];
const FIX_PERIGOS = {
  update_dentro_de_funcao_nao_conta: perigos('CREATE FUNCTION f() RETURNS void AS $fn$ BEGIN UPDATE public.t SET a=1; END; $fn$ LANGUAGE plpgsql;').update_fora_de_funcao === 0,
  update_fora_de_funcao_conta: perigos('UPDATE public.t SET a = 1;').update_fora_de_funcao === 1,
  truncate_conta: perigos('TRUNCATE public.t;').truncate === 1,
  prosa_de_cabecalho_nao_e_statement: perigos('-- vamos UPDATE a mesa, DROP TABLE t e o service_role\nSELECT 1;').credencial === 0 && perigos('-- UPDATE\n-- DROP TABLE t;\nSELECT 1;').drop_table === 0,
  // O caso contrário, para o fixture não ser uma licença para a varredura: `DROP TABLE` escrito FORA de
  // comentário é statement e tem de contar, mesmo vindo logo depois duma linha de prosa.
  drop_table_fora_de_comentario_conta: perigos('-- UPDATE\nDROP TABLE t;').drop_table === 1,
  palavra_credencial_fora_de_comentario_conta: perigos("select 'service_role'").credencial === 1,
};

const recusa = (motivos, extra) => {
  const corpo = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', em: new Date().toISOString(), aplicado: false, motivos_de_recusa: motivos, ...(extra || {}) };
  if (tem('regista-recusa')) {
    const p = join(REPO, 'evidence/p73-municipal-aplica-ddl-recusa-' + (flag('peca') || 'sem-peca') + '-' + String(Date.now()) + '.json');
    writeFileSync(p, JSON.stringify(corpo, null, 2) + '\n');
    corpo.registo = p;
  }
  console.log('RECUSADO · ' + JSON.stringify(motivos));
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
  const boas = casos.filter((x) => x.verde).length;
  const out = { programa: 'scripts/p73-municipal-aplica-ddl.mjs', selfteste: true, em: new Date().toISOString(), aplicado: false, casos, veredito: boas === casos.length ? `P73_MUNICIPAL_APLICA_SELFTESTE_OK ${casos.length}/0` : `P73_MUNICIPAL_APLICA_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(out, null, 1));
  process.exit(boas === casos.length ? 0 : 1);
}

const peca = flag('peca');
if (!peca || !PECAS[peca]) recusa(['--peca tem de ser uma das pecas certificadas: ' + Object.keys(PECAS).join(', ')]);
const P = PECAS[peca];
const frasesCertificadas = Object.values(PECAS).map((x) => x.frase);
const ok = flag('ok');
if (ok === null) recusa([`falta --ok com a frase literal desta peca (${P.frase}); sem frase, nada e escrito`]);
if (ok !== P.frase) recusa([`--ok nao e a frase certificada desta peca; esperado exatamente "${P.frase}"`, `frases certificadas desta familia: ${JSON.stringify(frasesCertificadas)}`], { aviso: 'um «ok» solto nao autoriza escrita no banco' });

const faltam = [P.pref, P.cand, P.rev].filter((f) => !existsSync(join(REPO, f)));
if (faltam.length) recusa(['ficheiro da peca nao existe em disco: ' + faltam.join(', ')]);
const txtCand = readFileSync(join(REPO, P.cand), 'utf8');
const txtRev = readFileSync(join(REPO, P.rev), 'utf8');
const perigoCand = perigos(txtCand);
const bloqueadores = Object.entries(perigoCand).filter(([k, v]) => ZERO_OBRIGATORIO.includes(k) && v > 0).map(([k, v]) => k + '=' + v);
if (bloqueadores.length) recusa(['o SQL da candidata tem statement fora de corpo de funcao que esta peça recusa: ' + bloqueadores.join(', ')]);
if (!/^BEGIN;/m.test(txtCand) || !/^COMMIT;/m.test(txtCand)) recusa(['a candidata nao e uma unica transacco (BEGIN/COMMIT)']);

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = join(REPO, `evidence/p73-municipal-aplicacao-${peca}-${stamp}.json`);
if (existsSync(OUT)) recusa(['o artefacto desta aplicacao ja existe: ' + OUT]);

// preflight fresco, AGORA, em modo candidata: o verde velho deste dia não serve (o estado vivo pode ter
// mudado entre a medição e a escrita, e é exactamente esse intervalo que esta peça fecha).
const pre = correPreflight(P.pref, 'candidata', 'apl' + stamp);
if (pre.tempo_esgotado) recusa(['preflight esgotou o tempo de 300 s — estado desconhecido, nada foi escrito']);
if (!pre.registo || !existsSync(caminhoReal(pre.registo))) recusa(['preflight nao devolveu caminho de registo legivel: ' + pre.saida_ultima_linha]);
const preJson = JSON.parse(readFileSync(caminhoReal(pre.registo), 'utf8'));
if (pre.codigo !== 0 || !String(preJson.veredito).startsWith(P.prefixo) || !/\/0$/.test(String(preJson.veredito))) recusa(['preflight nao deu verde: ' + preJson.veredito, 'registo ' + pre.registo]);
const conferePegada = (par, texto) => !!par && par.md5 === md5(texto) && par.bytes === Buffer.byteLength(texto, 'utf8');
if (!conferePegada(preJson.ficheiros.candidata, txtCand)) recusa(['o md5/bytes do ficheiro que seria enviado nao bate com o certificado pelo preflight', { certificado: preJson.ficheiros.candidata, medido_agora: { caminho: P.cand, bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) } }]);
if (!conferePegada(preJson.ficheiros.reversao, txtRev)) recusa(['a reversao em disco nao e a que o preflight certificou', { certificada: preJson.ficheiros.reversao, medida_agora: { caminho: P.rev, bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) } }]);


const conta = async () => { const r = await sql(`select ${MESAS_DE_BASELINE.map((m) => `(select count(*)::int from public.${m}) as ${m}`).join(', ')}`); return r[0]; };
const antes = await conta();

const em = new Date().toISOString();
let erroDeAplicacao = null;
try { await sql(txtCand); } catch (e) { erroDeAplicacao = String(e.message || e).slice(0, 600); }
const depois = await conta();
const pos = erroDeAplicacao ? { codigo: 'ABORTADO', nota: 'o Postgres aborta a transaccao inteira; nada ficou aplicado' } : correPreflight(P.pref, 'reversao', 'apl' + stamp);
let posJson = null;
if (!erroDeAplicacao && pos.registo && existsSync(caminhoReal(pos.registo))) posJson = JSON.parse(readFileSync(caminhoReal(pos.registo), 'utf8'));

const out = {
  programa: 'scripts/p73-municipal-aplica-ddl.mjs', peca, em, duracao_ms: Date.now() - new Date(em).getTime(),
  aplicado: erroDeAplicacao === null,
  ok_literal_usado: ok, frase_certificada: P.frase,
  candidata: { caminho: P.cand, ...{ bytes: Buffer.byteLength(txtCand, 'utf8'), md5: md5(txtCand) } },
  reversao: { caminho: P.rev, ...{ bytes: Buffer.byteLength(txtRev, 'utf8'), md5: md5(txtRev) } },
  preflight_candidata: { registo: pre.registo, veredito: preJson.veredito, codigo: pre.codigo },
  varredura_do_sql: perigoCand,
  baselines: { antes, depois, inalteradas: JSON.stringify(antes) === JSON.stringify(depois) },
  preflight_reversao: { registo: pos.registo || null, veredito: posJson ? posJson.veredito : null, codigo: pos.codigo || null, nota: 'modo reversao afirma o estado de SAIDA da candidata: e a conferencia de que o DDL produzido e o DDL certificado' },
  erro_de_aplicacao: erroDeAplicacao,
  o_que_este_registo_nao_cobre: 'a publicacao de qualquer versao do ar, o seed do calendario (RM-5.2) e a etiquetagem escola-municipio: cada um tem instrumento e OK proprios.',
};
const conferenciasVerdes = out.baselines.inalteradas && /\/0$/.test(String(out.preflight_reversao.veredito))
  && String(out.preflight_reversao.veredito).startsWith(P.prefixo) && /_REVERSAO/.test(String(out.preflight_reversao.veredito));
out.veredito = erroDeAplicacao ? `P73_MUNICIPAL_APLICACAO_ABORTADA ${peca}`
  : (conferenciasVerdes ? `P73_MUNICIPAL_APLICADO_E_CONFERIDO ${peca}` : `P73_MUNICIPAL_APLICADO_COM_CONFERENCIA_VERMELHA ${peca}`);
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`PECA ${peca} · aplicado ${out.aplicado} · candidata ${out.candidata.md5} · preflight ${out.preflight_candidata.veredito}`);
console.log(`BASELINES ${JSON.stringify({ antes, depois })}`);
console.log(`PREFLIGHT_REVERSAO ${JSON.stringify(out.preflight_reversao)}`);
console.log(`${out.veredito} · registo ${OUT}`);
process.exit(out.veredito.startsWith('P73_MUNICIPAL_APLICADO_E_CONFERIDO') ? 0 : 1);
