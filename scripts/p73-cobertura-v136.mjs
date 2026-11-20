// P73 — tabela de cobertura da grelha m5 POR AR, para fechar a PEN-35. O condutor antigo media a cobertura
// sem perguntar a que ar cada ficheiro pertencia: com os 49 `ah2-mobile2-m5-*` do ar anterior em disco, ele
// diria «86 células cobertas» quando no ar de hoje há 0 medidas. Esta tabela separa as duas coisas e nomeia
// a razão de cada célula não-coerente (sem censo / barra inexistente / caixa zero / zero abertas / praga),
// porque «não coberta» sem causa é a mesma coisa que silêncio.
// Papéis e larguras leem-se do condutor, não desta linha; a prédica de coerência é copiada do condutor e a
// sua posição é citada aqui para o leitor conferir. Só-leitura: 0 escrita fora do próprio registo.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const DRIVER = `${REPO}/scripts/ah2-m5-driver.mjs`;
const SUF = (process.argv[2] || '19-11').trim();
const OUT = `${EV}/p73-cobertura-m5-por-ar-${SUF}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(DRIVER, 'utf8');
const dlines = dsrc.split('\n');
const linhaLarguras = dlines.findIndex((l) => /^const LARGURAS = \[/.test(l)) + 1;
const LARGURAS = (() => { const m = /const LARGURAS = \[([^\]]*)\]/.exec(dsrc); if (!m) throw new Error('ABORTA: li LARGURAS do condutor'); return [...m[1].matchAll(/(\d+)/g)].map((x) => parseInt(x[1], 10)); })();
// A prega do papel E o ponto onde o condutor DERIVA a lista (`const PAPEIS = [...m[1].matchAll(...)]`), nao
// `const TODOS =` -- essa cadeia so existe dentro do regex que o condutor corre no codigo da varredura, por
// isso a agulha antiga dava 0 e a tabela abortava. O enum em si continua lido de ah2-varredura.mjs.
const linhaPapeis = dlines.findIndex((l) => /^const PAPEIS =/.test(l)) + 1;
const PAPEIS = (() => { const v = readFileSync(`${REPO}/scripts/ah2-varredura.mjs`, 'utf8'); const m = /const TODOS\s*=\s*\[([^\]]*)\]/.exec(v); if (!m) throw new Error('ABORTA: enum de perfis não lido'); return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]); })();
const linhaCoerencia = dlines.findIndex((l) => /const coerente = !!b\.censo/.test(l)) + 1;
if (!linhaLarguras || !linhaPapeis || !linhaCoerencia) throw new Error('ABORTA: pregas do condutor não encontradas (larguras=' + linhaLarguras + ' papeis=' + linhaPapeis + ' coerencia=' + linhaCoerencia + ')');
// O predicado de coerência NÃO é reimplementado aqui: extrai-se a expressão do condutor e compila-se.
// Um leitor derivado que reescreve a regra do produtor é como o painel que fabricava linhas (ah2-mobile2.mjs:357).
const EXPRESSAO = dlines[linhaCoerencia - 1].replace(/^\s*const coerente =\s*/, '').replace(/;\s*$/, '');
const eh_coerente = new Function('b', 'return (' + EXPRESSAO + ');');
if (typeof eh_coerente({ censo: { barra_existe: true, barra: [{ w: 10, h: 10 }] }, abertas: 1 }) !== 'boolean') throw new Error('ABORTA: o predicado lido do condutor não devolve booleano');
// A régua só vale se discriminar. O positivo e o negativo diferem numa só clausula (`abertas`), porque foi
// exatamente essa a clausula que partiu a contagem anterior: um predicado que devolve o mesmo para os dois
// nao pode dar «84 celulas por medir» com honestidade, e aqui isso aborta em vez de tabelar.
const FIX_POSITIVO = { censo: { barra_existe: true, barra: [{ w: 40, h: 44 }] }, abertas: 1 };
const FIX_NEGATIVO = { censo: { barra_existe: true, barra: [{ w: 40, h: 44 }] }, abertas: 0 };
if (eh_coerente(FIX_POSITIVO) !== true || eh_coerente(FIX_NEGATIVO) !== false) throw new Error('ABORTA: o predicado copiado do condutor não discrimina no fixture — régua sem dentes');

const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const diario = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${diario}`, 'utf8')) || [])[0] + '/';
const AR_MD5 = md5(await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text());

const predicado = (b) => {
  if (eh_coerente(b)) return { coerente: true, porque: null };
  const censo = b && b.censo;
  const porque = !censo ? 'sem_censo' : censo.barra_existe === false ? 'barra_inexistente'
    : !(censo.barra || []).some((x) => x.w > 0 && x.h > 0) ? 'barra_caixa_zero' : !(b.abertas > 0) ? 'zero_abertas' : 'outro';
  return { coerente: false, porque };
};

const ficheiros = readdirSync(EV).filter((f) => /^ah2-mobile2-m5-.*\.json$/.test(f));
const grelha = {}; const por_ar = {}; const travadas = {}; const causas_de_trava = {};
for (const f of ficheiros.sort()) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  const q = String(j.md5_shell || '(sem-md5)');
  // (VERMELHO DO LEITOR, provado por p73-clausulas-da-coerencia.mjs) A contagem de coerencia estava DEPOIS do
  // `if (q !== AR_MD5) continue`, logo os ficheiros do ar anterior eram sempre `coerentes=0` enquanto `celulas`
  // os contava: um 0 estrutural, nao uma medida. Celulas e coerencia contam-se agora para TODOS os ars, com a
  // mesma unidade (banda sem praga dentro das larguras do briefing); a grelha por papel so se povoa no ar actual.
  por_ar[q] = por_ar[q] || { fich: 0, papeis: new Set(), celulas_sem_praga: 0, coerentes: 0, travadas: 0 };
  por_ar[q].fich++; por_ar[q].papeis.add(j.papel); por_ar[q].travadas += (j.bloqueadas || []).length;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const ww = parseInt(w, 10); if (!LARGURAS.includes(ww)) continue;
    if (b.pela_praga) continue;
    por_ar[q].celulas_sem_praga++;
    if (predicado(b).coerente) por_ar[q].coerentes++;
  }
  if (q !== AR_MD5) continue;
  // TRAVADA COM CAUSA nao e «por medir»: o condutor decide por `j.bloqueadas` que relançar não muda o estado
  // do produto (conta em análise, módulo de apresentação que não montou). Um leitor que chama «por medir» a
  // isto infla a pendência — foi o que esta tabela fez na primeira fotografia, 35 quando faltavam 25.
  for (const b of j.bloqueadas || []) { const ww = parseInt(b.largura, 10); if (!LARGURAS.includes(ww)) continue; (travadas[j.papel] = travadas[j.papel] || new Set()).add(ww); if (!causas_de_trava[j.papel + '@' + ww]) causas_de_trava[j.papel + '@' + ww] = String(b.causa || '').slice(0, 170); }
  grelha[j.papel] = grelha[j.papel] || {};
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const ww = parseInt(w, 10); if (!LARGURAS.includes(ww)) continue;
    const p = predicado(b);
    const antes = grelha[j.papel][ww];
    // Uma célula só se dá por não-medida se NENHUM ficheiro do ar a deixou coerente: a melhor tentativa ganha.
    if (!antes || (!antes.coerente && p.coerente)) grelha[j.papel][ww] = { coerente: p.coerente, porque: p.porque, praga: !!b.pela_praga, abertas: b.abertas ?? null, n_barra: (b.censo && b.censo.barra || []).length, barra_existe: b.censo ? b.censo.barra_existe : null, ficheiro: f };
  }
}
const esta_travada = (p, w, TR) => !!(TR[p] && TR[p].has(w));
const rotulo_celula = (p, w, TR = travadas) => { const c = grelha[p] && grelha[p][w]; if (c && c.coerente) return 'OK'; if (esta_travada(p, w, TR)) return 'TRAVADA'; return !c ? 'por_medir' : (c.praga ? 'praga' : c.porque); };
// O conserto de TRAVADA-vs-por-medir só vale se discriminar, por isso a régua é testada contra um par injetado,
// nunca contra a conta agregada do próprio histograma (que nunca teria positivo).
const PAPEL_DE_PROVA = 'papel_de_prova_injetado';
if (PAPEIS.includes(PAPEL_DE_PROVA)) throw new Error('ABORTA: o papel da prova colide com um papel real do enum');
const GRELHA_DE_PROVA = { [LARGURAS[1]]: undefined };
if (!Object.keys(GRELHA_DE_PROVA).length) throw new Error('ABORTA: grelha de prova vazia — larguras do condutor não lidas');
const TR_PROVA = { [PAPEL_DE_PROVA]: new Set([LARGURAS[0]]) };
grelha[PAPEL_DE_PROVA] = GRELHA_DE_PROVA;
if (rotulo_celula(PAPEL_DE_PROVA, LARGURAS[0], TR_PROVA) !== 'TRAVADA' || rotulo_celula(PAPEL_DE_PROVA, LARGURAS[1], TR_PROVA) !== 'por_medir') throw new Error('ABORTA: a distincao travada/por-medir nao discrimina no fixture — o conserto nao vale');
delete grelha[PAPEL_DE_PROVA];
const celulas_coerentes = PAPEIS.reduce((a, p) => a + LARGURAS.filter((w) => grelha[p] && grelha[p][w] && grelha[p][w].coerente).length, 0);
const celulas_travadas = PAPEIS.reduce((a, p) => a + LARGURAS.filter((w) => rotulo_celula(p, w) === 'TRAVADA').length, 0);
const ROTULO_A_MOTIVO = { OK: 'coerente', TRAVADA: 'travada_com_causa', praga: 'pela_praga', por_medir: 'por_medir' };
const motivos = {};
for (const p of PAPEIS) for (const w of LARGURAS) { const k = ROTULO_A_MOTIVO[rotulo_celula(p, w)] || rotulo_celula(p, w); motivos[k] = (motivos[k] || 0) + 1; }
// Proveniência das células, medida nos rótulos: o condutor escreve `m5-<papel>-<n>` e o programa de repetição
// (p73-repete-bloqueadas.mjs) escreve `m5-<papel>-rep<n>w<w>`. Os dois alimentam a mesma contagem porque o
// leitor agrupa por (papel, largura) e a melhor tentativa ganha — um papel que montou NUM processo conta OK.
// Declarar isto é o que impede a tabela de parecer uma grelha de 90 lançamentos quando 21 das suas células
// vieram de processos de repetição cruzada.
const rotulos = ficheiros.map((f) => f.replace(/^ah2-mobile2-m5-/, '').replace(/\.json$/, ''));
const da_repeticao = rotulos.filter((r) => /-rep\d/.test(r));
const out = { programa: 'scripts/p73-cobertura-v136.mjs', em: new Date().toISOString(), ar: { url: URL_APP, md5: AR_MD5 }, grelha: `${PAPEIS.length} papeis × ${LARGURAS.length} larguras = ${PAPEIS.length * LARGURAS.length} celulas`,
  ler_do_condutor: { linha_larguras: linhaLarguras, linha_papeis_da_varredura: linhaPapeis, linha_do_predicado_de_coerencia: linhaCoerencia, predicado_do_condutor: dlines[linhaCoerencia - 1].trim() },
  ficheiros_m5_na_disco: ficheiros.length,
  procedencia_das_celulas: { total_rotulos: rotulos.length, do_condutor: rotulos.length - da_repeticao.length, da_repeticao_p73: da_repeticao.length, rotulos_da_repeticao: da_repeticao, regra: 'o leitor agrupa por (papel, largura) e a melhor tentativa ganha: uma celula que montou num processo de repeticao conta OK no ar atual' }, por_ar: Object.fromEntries(Object.entries(por_ar).map(([k, v]) => [k.slice(0, 12), { fich: v.fich, papeis: v.papeis.size, celulas_sem_praga: v.celulas_sem_praga, coerentes: v.coerentes, travadas_registadas: v.travadas, he_o_ar_atual: k === AR_MD5 }])),
  celulas_coerentes_no_ar_atual: celulas_coerentes, celulas_travadas_com_causa_no_ar_atual: celulas_travadas, causas_de_trava: causas_de_trava,
  total_celulas: PAPEIS.length * LARGURAS.length, motivos,
  tabela: Object.fromEntries(PAPEIS.map((p) => [p, Object.fromEntries(LARGURAS.map((w) => [w, rotulo_celula(p, w)]))])) };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('ar atual md5=' + AR_MD5 + ' · ficheiros m5 em disco=' + ficheiros.length + ' · procedencia: condutor=' + out.procedencia_das_celulas.do_condutor + ' repeticao p73=' + out.procedencia_das_celulas.da_repeticao_p73 + ' (os dois alimentam a mesma contagem, melhor tentativa ganha)');
for (const [k, v] of Object.entries(out.por_ar)) console.log('  ar ' + k + ': fich=' + v.fich + ' papeis=' + v.papeis + ' celulas_sem_praga=' + v.celulas_sem_praga + ' coerentes=' + v.coerentes + ' travadas=' + v.travadas_registadas + (v.he_o_ar_atual ? '  <= AR ATUAL' : ''));
for (const p of PAPEIS) console.log('  ' + p.padEnd(21) + LARGURAS.map((w) => String(w) + ':' + out.tabela[p][w]).join(' '));
console.log('  motivos=' + JSON.stringify(out.motivos));
for (const [chave, causa] of Object.entries(causas_de_trava)) console.log('  CAUSA ' + chave + ': ' + causa);
console.log('COERENTES NO AR ATUAL: ' + celulas_coerentes + '/' + out.total_celulas + ' · TRAVADAS COM CAUSA: ' + celulas_travadas + ' · POR MEDIR: ' + (out.total_celulas - celulas_coerentes - celulas_travadas));
console.log(celulas_coerentes + celulas_travadas === out.total_celulas ? (celulas_travadas ? 'P73_GRELHA_COMPLETA_COM_TRAVAS' : 'P73_TODAS_LARGURAS_MEDIDAS') : 'P73_GRELHA_INCOMPLETA — relançar o condutor');
