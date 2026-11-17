// §5/§6 exigem saber que larguras estao medidas de verdade, nao o que eu acho que lancei. A varredura
// escreve um ficheiro por (conjunto de papeis, banda, rotulo) com stages[papel][banda]; o unico resumo
// honesto e somar celulas de todos eles. Ficheiros com ANTERIOR/calibracao no nome sao do instrumento a
// calibrar-se a si proprio (regua do painel, gaveta, colheita) — contam-se a parte, nunca como medida.
// Uso: node scripts/ah2-censo-bandas.mjs [prefixo]
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const FILTRO = process.argv[2] || 'ah2-varredura-17-11';
// A lista de papeis le-se do instrumento, nao daqui: se o varredura ganhar um papel, o censo passa a
// exige-lo sem mais um passo meu. O enum real e pending/parent/student/pedagogical/... — «teacher»,
// «family» e «read_only» nunca la estiveram, por isso o denominador vem da fonte.
const SRC = readFileSync(`${DIR}/../scripts/ah2-varredura.mjs`, 'utf8');
const PAPEIS = (SRC.match(/const TODOS = \[([^\]]+)\]/) || [, ''])[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
if (PAPEIS.length < 10) throw new Error('ABORTA: nao li a lista de papeis do varredura (obtive ' + PAPEIS.length + ')');

const todos = readdirSync(DIR).filter((f) => f.startsWith(FILTRO) && f.endsWith('.json')).sort();
const fich = todos.filter((f) => !/ANTERIOR|calibracao/.test(f));
const do_instrumento = todos.length - fich.length;
const celulas = new Map();
const porBanda = new Map();
const vereditos = {};
for (const f of fich) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')); } catch (e) { console.log(`ILEGIVEL ${f}: ${e.message}`); continue; }
  const bandas = j.bandas || [];
  vereditos[f] = { veredito: j.veredito || '?', portoes: j.portoes ?? null, falhas: (j.falhas || []).length, md5: (j.md5_shell || '').slice(0, 8) };
  for (const [papel, st] of Object.entries(j.stages || {})) {
    for (const banda of bandas) {
      if (!st[banda]) continue;
      if (!porBanda.has(banda)) porBanda.set(banda, { papeis: new Set(), fich: new Set() });
      porBanda.get(banda).papeis.add(papel);
      porBanda.get(banda).fich.add(f);
      for (const texto of j.falhas || []) {
        const nome = String(texto).split(' | ')[0];
        if (nome.includes(papel) && nome.includes(banda)) {
          const k = `${papel}@${banda}`;
          if (!celulas.has(k)) celulas.set(k, { falhas: [], limpas: [] });
          celulas.get(k).falhas.push({ f, nome });
        }
      }
      // A mesma célula pode ter sido corrida duas vezes (um chunk incompleto, outro completo). O que vale
      // para o relatório é a última leitura, não a primeira que tropeçou: guardo também os ficheiros limpos.
      if (!(j.falhas || []).some((t) => String(t).split(' | ')[0].includes(papel) && String(t).split(' | ')[0].includes(banda))) {
        const k = `${papel}@${banda}`;
        if (!celulas.has(k)) celulas.set(k, { falhas: [], limpas: [] });
        celulas.get(k).limpas.push({ f });
      }
    }
  }
}
const ordem = [...porBanda.keys()].sort((a, b) => Number(a) - Number(b));
console.log(`ficheiros: ${fich.length} de medida + ${do_instrumento} de calibracao do instrumento (${FILTRO}*)`);
console.log(`md5_shell por ficheiro: ${[...new Set(Object.values(vereditos).map((v) => v.md5))].join(',')}`);
for (const banda of ordem) {
  const b = porBanda.get(banda);
  const emfalta = PAPEIS.filter((p) => !b.papeis.has(p));
  console.log(`\n${banda}: ${b.papeis.size}/${PAPEIS.length} papeis em ${[...b.fich].length} fich`);
  console.log(`   em_falta: ${emfalta.length ? emfalta.join(',') : 'NENHUM'}`);
}
console.log('\nCELULAS COM FALHA:');
if (!celulas.size) console.log(' (nenhuma falha apontada a uma celula papel/banda)');
for (const [chave, l] of [...celulas].sort()) console.log(` - ${chave}: ${[...new Set(l.map((x) => x.nome))].join('; ')}`);
console.log('\nPOR FICHEIRO:');
for (const f of fich) console.log(` ${f.replace(/^ah2-varredura-17-11-/, '').replace(/\.json$/, '')}: ${JSON.stringify(vereditos[f])}`);
console.log(`\nAH2_CENSO_BANDAS · completas=[${ordem.filter((b) => porBanda.get(b).papeis.size === PAPEIS.length).join(',')}] · faltam=[${ordem.filter((b) => porBanda.get(b).papeis.size !== PAPEIS.length).join(',')}]`);
