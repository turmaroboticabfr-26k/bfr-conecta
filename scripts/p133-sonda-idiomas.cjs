// Sonda de vocabulario: conta, nas 48 celulas Estado do ledger, cada candidato a idiom de estado,
// com o numero de ocorrencias e o numero de linhas distintas. A regua do p133 construe-se com estes
// numeros a vista; nenhum idiom entra por memoria.
const fs = require('node:fs');
const RAIZ = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/';
const ESC = String.fromCharCode(92) + '|';
const CAND = [
  ['FECHO: palavra de fecho + data', /\b(FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?)\b[^.]{0,12}(1[0-9]|2[0-9])\/1[12]/],
  ['FECHO: palavra de fecho sem data', /\b(FECHAD[OA]S?|APLICAD[OA]S?|PUBLICAD[OA]S?|CANCELAD[OA]S?|ATENDID[OA]S?)\b/],
  ['ABERTO: continua + estado', /\bcontinua (abert|pendente|por|sem prova|em aberto|nao)/],
  ['ABERTO: esta linha nao se fecha', /nao se fecha|n\xe3o se fecha/],
  ['ABerto: ainda nao testad', /ainda (nao|n\xe3o) testad/],
  ['ABERTO: por provar', /por provar/],
  ['ABERTO: palavra pendente', /\bpendente\b/],
  ['ABERTO: comeco Abert', /(^|\|\s\*\*)\*\*[Aa]bert/],
  ['ABERTO: abreviatura ICP/NT/PF/NM/NI/PI', /(^|\|\s\*\*)\*\*(ICP|NT|PF|NM|NI|PI)\b/],
  ['RUIDO: aberta/o a anon (superficie)', /(fun|cont|mesa|entrad|op\u00e7|porta)[^\n]{0,30}\babert/],
];
const linhas = fs.readFileSync(RAIZ + 'docs/roadmap-master.md', 'utf8').split('\n');
const celulas = [];
for (const linha of linhas.filter((x) => /^\| PEN-\d+ \|/.test(x))) {
  const c = linha.split(ESC).join('@@').split('|');
  celulas.push({ id: c[1].trim(), e: (c[5] || '').trim().replace(/\s+/g, ' ') });
}
console.log('celulas=' + celulas.length);
for (const [nome, re] of CAND) {
  let occ = 0; const ids = [];
  for (const c of celulas) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m, n = 0;
    while ((m = g.exec(c.e)) !== null) { n++; if (m.index === g.lastIndex) g.lastIndex++; }
    if (n) { occ += n; ids.push(c.id.replace('PEN-', '') + ':' + n); }
  }
  console.log(nome + ' | ocorrencias=' + occ + ' | linhas=' + ids.length + ' | ' + ids.join(' '));
}
