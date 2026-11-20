// P36-B2 — verificador estatico do instrumento p36b2-navegador-supervisao.mjs, antes de gastar um boot.
// Regra da casa: verificar por re-parsing, nao por olho. O `node --check` do ficheiro nao ve dois
// defeitos que ja me pegaram nesta familia: (a) um corpo injectado em template literal que e JS VALIDO
// no ficheiro mas partido quando o page-code o recebe (parentese a mais/menos, como o `({...})()` que
// acabei de escrever na linha 180); (b) colidade de identificador de topo, que o `--check` tampouco ve.
// Entao: extrai cada corpo injectado, resolve ${estado} de verdade, neutraliza os outros ${...} com um
// placeholder e compila com node:vm. A grelha de assercao e composta em tempo de execucao (nao dactilo-
// grafada) para que o proprio verificador nao se torne o ofensor da varredura de escrita.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ALVO = `${REPO}/scripts/p36b2-navegador-supervisao.mjs`;
const SERVIDO = `${REPO}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const OUT = `${REPO}/evidence/p36b2-verifica-instrumento-19-11.json`;
const BT = String.fromCharCode(96);
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const src = readFileSync(ALVO, 'utf8');
const out = { alvo: ALVO, bytes: Buffer.byteLength(src), linhas: src.split('\n').length };

// (1) node --check do ficheiro inteiro, em comando proprio, sem tubo.
const chk = spawnSync(process.execPath, ['--check', ALVO], { encoding: 'utf8' });
out.node_check = { exit: chk.status, stderr: (chk.stderr || '').split('\n').slice(0, 3).join(' | ').slice(0, 400) };

// (2) Corpos injectados: spans delimitedos por backtick simples que comecam por `(` — o formato do page-code.
//       Evito regex com backtick literico (o delimitador dentro de string ja me partiu um literal).
function corpos(txt) {
  const res = [];
  let i = 0;
  while (i < txt.length) {
    if (txt[i] === BT) {
      const fim = txt.indexOf(BT, i + 1);
      if (fim < 0) { res.push({ ok: false, motivo: 'backtick nao fechado', desde: i, trecho: txt.slice(i, i + 120) }); break; }
      res.push({ ok: true, desde: i, corpo: txt.slice(i + 1, fim) });
      i = fim + 1;
    } else i++;
  }
  return res;
}
const todos = corpos(src);
out.spans_backtick = todos.length;
out.spans_abertos = todos.filter((s) => !s.ok);

// O const estado = `(function(){...})`;  e injectado por ${estado}; resolvo-o de verdade.
const estadoSpan = todos.find((s) => s.ok && /^\s*\(function \(/.test(s.corpo) && s.corpo.includes('elementFromPoint'));
out.estado_encontrado = !!estadoSpan;

// (3) Compila cada corpo de page-code. Assercao = o corpo compila SEM interpolacao pendurada.
function resolve(corpo) {
  let t = corpo;
  const agulhaEstado = '$' + '{estado}';
  if (estadoSpan && t.includes(agulhaEstado)) t = t.split(agulhaEstado).join('(' + estadoSpan.corpo + ')');
  t = t.replace(/\$\{[^{}]*\}/g, '"Z"');
  t = t.replace(/\$\{[^{}]*\}/g, '"Z"');
  return t;
}
const pagina = todos.filter((s) => s.ok && /^\s*[\(]/.test(s.corpo));
out.corpos_pagina = pagina.length;
out.compilados_vermelhos = [];
pagina.forEach((s, k) => {
  const corpo = resolve(s.corpo);
  try { new vm.Script(corpo, { filename: 'corpo#' + k + '@char' + s.desde }); }
  catch (e) {
    const linha = src.slice(0, s.desde).split('\n').length;
    out.compilados_vermelhos.push({ linha_src: linha, erro: String(e.message).slice(0, 200), trecho: s.corpo.slice(0, 140) });
  }
});

// (4) Colidade de identificador de topo (o `--check` nao ve).
const topos = {};
src.split('\n').forEach((l, i) => {
  const m = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(l) || /^function\s+([A-Za-z_$][\w$]*)/.exec(l) || /^async\s+function\s+([A-Za-z_$][\w$]*)/.exec(l);
  if (m) (topos[m[1]] = topos[m[1]] || []).push(i + 1);
});
out.colisoes_topo = Object.entries(topos).filter(([, ls]) => ls.length > 1).map(([n, ls]) => ({ nome: n, linhas: ls }));

// (5) Censo dos selectores que o instrumento alega, lido dos bytes servidos — nada aqui e gate, e nome.
const agulhas = ['#mobileMoreMenu', 'bfrMobileBottomNav', 'data-bfr-mobile-route', 'bfrMobileDrawer', 'data-bfr-drawer-route',
  'data-mobile-more', 'data-secretary-central', 'data-sec-tab', 'data-sec-supervision-filter', 'data-sec-supervision-school-filter',
  'data-sec-supervision-query', 'data-section="secretaria"', 'data-teacher-nav-tab'];
const servido = readFileSync(SERVIDO, 'utf8');
out.selectores_no_servido = {};
for (const a of agulhas) { const n = servido.split(a).length - 1; out.selectores_no_servido[a] = { ocorrencias: n, no_instrumento: src.split(a).length - 1 }; }
out.regua_de_prova = {
  corpo_positivo: '(() => { return 1; })',
  corpo_negativo: '(() => { return 1; })(',
};

// (6) FIXTURE: a grelha tem de disparar. Compilo o negativo declarado acima e exijo um vermelho.
let fixture_disparou = false;
try { new vm.Script(out.regua_de_prova.corpo_negativo); } catch { fixture_disparou = true; }
try { new vm.Script(out.regua_de_prova.corpo_positivo); } catch { out.regua_inutil = 'o positivo tambem falhou — grelha sem valor'; }
out.fixture = { negativo_disparou: fixture_disparou, vermelho_no_alvo: out.compilados_vermelhos.length };

const falhas = [];
if (out.node_check.exit !== 0) falhas.push('node --check exit ' + out.node_check.exit);
if (out.spans_abertos.length) falhas.push('span de backtick aberto: ' + out.spans_abertos.length);
if (!out.estado_encontrado) falhas.push('const estado nao encontrado — resolucao de ${estado} nao provada');
if (out.compilados_vermelhos.length) falhas.push('corpos de page-code partidos: ' + out.compilados_vermelhos.map((v) => v.linha_src).join(','));
if (out.colisoes_topo.length) falhas.push('colisoes de topo: ' + out.colisoes_topo.map((c) => c.nome).join(','));
if (!out.fixture.negativo_disparou) falhas.push('a grelha nao dispara no fixture partido — verde sem valor');
if (out.regua_inutil) falhas.push(out.regua_inutil);
const mudos = Object.entries(out.selectores_no_servido).filter(([, v]) => v.ocorrencias === 0 && v.no_instrumento > 0).map(([k]) => k);
out.selectores_alegados_sem_ocorrencia_no_servido = mudos;
console.log('node_check_exit=' + out.node_check.exit + ' · spans=' + out.spans_backtick + ' · corpos_pagina=' + out.corpos_pagina
  + ' · corpos_vermelhos=' + out.compilados_vermelhos.length + ' · colisoes_topo=' + out.colisoes_topo.length
  + ' · fixture_negativo_disparou=' + out.fixture.negativo_disparou);
for (const v of out.compilados_vermelhos) console.log('  PARTIDO linha ' + v.linha_src + ': ' + v.erro + ' :: ' + v.trecho);
for (const c of out.colisoes_topo) console.log('  COLISAO ' + c.nome + ' linhas=' + c.linhas.join(','));
console.log('  mudos_no_servido=' + (mudos.length ? mudos.join(',') : 'nenhum'));
for (const [k, v] of Object.entries(out.selectores_no_servido)) console.log('  ' + k + ' servido=' + v.ocorrencias + ' instrumento=' + v.no_instrumento);
out.veredito = falhas.length ? 'P36B2_VERIFICA_VERMELHO' : 'P36B2_VERIFICA_VERDE';
out.falhas = falhas;
out.em = new Date().toISOString();
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(out.veredito + (falhas.length ? ' · ' + falhas.join(' · ') : ''));
console.log('  registo ' + OUT);
process.exit(falhas.length ? 1 : 0);
