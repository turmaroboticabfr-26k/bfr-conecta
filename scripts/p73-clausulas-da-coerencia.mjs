// P73-D — dissecciona a predica de coerencia celula a celula, por ar. A tabela `p73-cobertura-v136.mjs` deu
// `coerentes=0` sobre os 49 ficheiros do ar anterior ao mesmo tempo que dava 6/6 no ar actual. Um vermelho
// que e zero em todos os ficheiros velhos e a mesma forma do defeito que ja me pegou: o leitor, nao o
// produto. Aqui cada clausula e avaliada e imputada por nome, e diz-se tambem se a chave existe no objecto
// artefacto. Nada de ilacoes sobre o que nao esta no artefacto. So-leitura, 0 escrita fora do registo.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${REPO}/evidence`;
const DRIVER = `${REPO}/scripts/ah2-m5-driver.mjs`;
const OUT = `${REPO}/evidence/p73-clausulas-da-coerencia-19-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');

const dsrc = readFileSync(DRIVER, 'utf8');
const linhaCoerencia = dsrc.split('\n').findIndex((l) => /const coerente = !!b\.censo/.test(l)) + 1;
if (!linhaCoerencia) throw new Error('ABORTA: a linha da predica nao esta no condutor');
const EXPRESSAO = dsrc.split('\n')[linhaCoerencia - 1].replace(/^\s*const coerente =\s*/, '').replace(/;\s*$/, '');
const eh_coerente = new Function('b', 'return (' + EXPRESSAO + ');');

const clausulas = {
  'b.censo existe': (b) => !!b.censo,
  'censo.barra_existe !== false': (b) => b.censo && b.censo.barra_existe !== false,
  'alguma barra com w>0 e h>0': (b) => Array.isArray(b.censo?.barra) && b.censo.barra.some((x) => x.w > 0 && x.h > 0),
  'b.abertas > 0': (b) => (b.abertas || 0) > 0,
};
const md5 = (s) => createHash('md5').update(Buffer.from(s)).digest('hex');
const diario = readdirSync(REPO).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const URL_APP = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(readFileSync(`${REPO}/${diario}`, 'utf8')) || [])[0] + '/';
const AR_MD5 = md5(await (await fetch(URL_APP, { headers: { 'cache-control': 'no-cache' } })).text());

const por_ar = {};
let amostra_forma = {};
for (const f of readdirSync(EV)) {
  if (!/^ah2-mobile2-m5-.*\.json$/.test(f)) continue;
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  const ar = j.md5_shell || 'SEM_MD5_SHELL';
  const p = (por_ar[ar] = por_ar[ar] || { ficheiros: 0, celulas: 0, coerentes: 0, chaves_ausentes: {}, primeira_falha: {}, formas: {} });
  p.ficheiros++;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    if (b.pela_praga) continue;
    p.celulas++;
    const ok = eh_coerente(b);
    if (ok) { p.coerentes++; continue; }
    let nomeada = false;
    for (const [nome, fn] of Object.entries(clausulas)) {
      let v = false; try { v = !!fn(b); } catch { v = false; }
      if (!v) { p.primeira_falha[nome] = (p.primeira_falha[nome] || 0) + 1; nomeada = true; break; }
    }
    if (!nomeada) p.primeira_falha['todas passam mas a expressao da linha ' + linhaCoerencia + ' nao'] = (p.primeira_falha['todas passam mas a expressao da linha ' + linhaCoerencia + ' nao'] || 0) + 1;
    const forma = Object.keys(b).sort().join(',');
    p.formas[forma] = (p.formas[forma] || 0) + 1;
    if (!amostra_forma[ar]) amostra_forma[ar] = { ficheiro: f, largura: w, chaves: Object.keys(b), censo_chaves: b.censo ? Object.keys(b.censo).slice(0, 14) : null, abertas: b.abertas === undefined ? 'AUSENTE' : b.abertas, barra_n: Array.isArray(b.censo?.barra) ? b.censo.barra.length : 'n/a', barra_primitiva: Array.isArray(b.censo?.barra) ? b.censo.barra.slice(0, 2).map((x) => ({ w: x.w, h: x.h, rotulo: x.rotulo || x.texto || null })) : null };
  }
}
const saida = { programa: 'scripts/p73-clausulas-da-coerencia.mjs', em: new Date().toISOString(), ar_atual: AR_MD5, linha_da_predica_no_condutor: linhaCoerencia, expressao: EXPRESSAO, por_ar, amostra_forma };
writeFileSync(OUT, JSON.stringify(saida, null, 2) + '\n');
for (const [ar, p] of Object.entries(saida.por_ar)) {
  console.log('AR ' + ar.slice(0, 12) + (ar === AR_MD5 ? ' (ATUAL)' : '') + ': ficheiros=' + p.ficheiros + ' celulas_sem_praga=' + p.celulas + ' coerentes=' + p.coerentes);
  console.log('  primeira_clausula_que_falha: ' + Object.entries(p.primeira_falha).map(([k, v]) => k + '=' + v).join(' · '));
  console.log('  formas_de_banda_distintas: ' + Object.keys(p.formas).length + ' · ' + Object.entries(p.formas).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => v + 'x[' + k + ']').join(' | '));
  const a = saida.amostra_forma[ar];
  if (a) console.log('  amostra ' + a.ficheiro + ' @' + a.largura + ' chaves=' + a.chaves.join(',') + ' | abertas=' + a.abertas + ' | barra_n=' + a.barra_n + ' | censo_chaves=' + (a.censo_chaves || []).join(','));
}
console.log('registo ' + OUT);
