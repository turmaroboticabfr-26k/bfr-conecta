// Só-leitura, sem browser: recorta funções pelo nome das bytes servidas, por casamento de chavetas.
// Serve para responder ao §6 do briefing (por que demora o Home) com o código real em vez de suposição.
// Uso: node scripts/ah2-sonda-func.mjs <nome1,nome2,...>
import { writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const NOMES = (process.argv[2] || 'navigateToSection').split(',');
const URL_APP = 'https://bfr-conecta.turmaroboticabfr.workers.dev/';
const ROTULO = process.argv[3] || '17-11';
const OUT = `C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-sonda-func-${ROTULO}.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — rode com outro rótulo');
const txt = await (await fetch(URL_APP, { headers: { 'Cache-Control': 'no-cache' } })).text();
// Chavetas dentro de strings/templates/comments contam-se como as outras: o recorte pode partir-se.
// Por isso devolve-se também o comprimento e a última linha, para eu ver se o fim é plausível.
const recorta = (nome) => {
  const alvos = [];
  for (const padrao of [`function ${nome}(`, `${nome} = function(`, `const ${nome} = (`, `window.${nome} = (`]) {
    let i = txt.indexOf(padrao);
    while (i !== -1) {
      const abre = txt.indexOf('{', i);
      if (abre === -1) { i = txt.indexOf(padrao, i + 1); continue; }
      let n = 0, j = abre, fim = -1;
      for (; j < txt.length; j++) {
        const c = txt[j];
        if (c === '{') n++;
        else if (c === '}') { n--; if (n === 0) { fim = j; break; } }
        if (j - abre > 60000) break;
      }
      if (fim !== -1) alvos.push({ inicio: i, comprimento: fim - i + 1, corpo: txt.slice(i, fim + 1) });
      i = txt.indexOf(padrao, fim !== -1 ? fim : i + 1);
    }
  }
  return alvos;
};
const out = { em: new Date().toISOString(), chars: txt.length, md5: createHash('md5').update(txt).digest('hex'), funcoes: {} };
for (const n of NOMES) {
  const a = recorta(n);
  out.funcoes[n] = a.length ? a.map((x) => ({ comprimento: x.comprimento, corpo: x.corpo })) : 'NAO_ENCONTRADA';
  const b = a[0]?.corpo || '';
  const pesados = ['await ', 'innerHTML', 'querySelectorAll', 'fetch(', 'from(', 'select(', 'setTimeout', 'render'];
  console.log(`\n### ${n}: ${a.length} ocorrência(s), corpo=${a[0]?.comprimento ?? 0} chars`);
  console.log('  contagens: ' + pesados.map((p) => `${p.trim()}=${b.split(p).length - 1}`).join(' '));
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('\n' + OUT.split('/').pop());
