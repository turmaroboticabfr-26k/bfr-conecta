// Sonda somente-leitura: o que existe DENTRO do PDF de horário publicado em disco
// e como o shell referencia cada ficheiro. Nada é escrito além do diário argv[2].
import fs from 'node:fs';
import crypto from 'node:crypto';

const BUNDLE = 'worker-deploy-v122-push/public';
const CAND = 'bfr-candidata-v122-horarios-pdf';
const SAIDA = process.argv[2];
if (!SAIDA) { console.error('falta o destino do diário (argv[2])'); process.exit(1); }
if (fs.existsSync(SAIDA)) { console.error(`não sobrepõe: ${SAIDA} já existe`); process.exit(1); }

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const alvos = {};
for (const [rotulo, p] of [
  ['ar_matutino', `${BUNDLE}/horario-matutino-2026.pdf`],
  ['ar_vespertino', `${BUNDLE}/horario-vespertino-2026.pdf`],
  ['ar_calendario', `${BUNDLE}/calendario-letivo-2026.pdf`],
  ['cand_matutino', `${CAND}/horario-matutino-2026.pdf`],
  ['cand_vespertino', `${CAND}/horario-vespertino-2026.pdf`],
]) {
  const b = fs.readFileSync(p);
  alvos[rotulo] = { caminho: p, bytes: b.length, md5: md5(b), magica: b.subarray(0, 8).toString('latin1') };
}

function estrutura(buf) {
  const s = buf.toString('latin1');
  const conta = re => (s.match(re) || []).length;
  const numeros = re => { const o = []; let m; const g = new RegExp(re, 'g'); while ((m = g.exec(s))) o.push(m[1]); return o; };
  return {
    versao: (s.match(/^%PDF-[\d.]+/) || [''])[0],
    paginas: conta(/\/Type\s*\/Page[^s]/g),
    recursos_pagina: conta(/\/Type\s*\/Pages/g),
    imagens: conta(/\/Subtype\s*\/Image/g),
    filtros: [...new Set(numeros(/\/Filter\s*\/([A-Za-z0-9]+)/g))],
    larguras: numeros(/\/Width\s+(\d+)/g).map(Number),
    alturas: numeros(/\/Height\s+(\d+)/g).map(Number),
    espacos_cor: [...new Set(numeros(/\/ColorSpace\s*\/\(?([A-Za-z0-9]+)/g))],
    bpc: [...new Set(numeros(/\/BitsPerComponent\s+(\d+)/g))].map(Number),
    obj_stm: conta(/\/Type\s*\/ObjStm/g),
    xref: /startxref/.test(s),
    fluxos: (s.match(/stream/g) || []).length,
  };
}

const estrutura_medida = {};
for (const [rotulo, a] of Object.entries(alvos)) estrutura_medida[rotulo] = estrutura(fs.readFileSync(a.caminho));

// Referências no shell: contexto à volta de cada ocorrência de horario-*.pdf
const worker = fs.readFileSync('worker-deploy-v122-push/worker.mjs', 'utf8');
function contextos(alvo) {
  const out = [];
  let i = -1;
  while ((i = worker.indexOf(alvo, i + 1)) !== -1) {
    out.push(worker.slice(Math.max(0, i - 130), i + alvo.length + 40).replace(/\s+/g, ' '));
  }
  return out;
}
const refs = {};
for (const f of ['horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf', 'calendario-letivo-2026.pdf']) {
  refs[f] = { ocorrencias: contextos(f).length, janelas: contextos(f).slice(0, 4) };
}

const diário = {
  em: new Date().toISOString(), escrita: 'somente o diário argv[2]', ddl: 0, mint: 0,
  alvos, estrutura_medida, refs,
  igualdades: {
    ar_matutino_igual_ar_vespertino: alvos.ar_matutino.md5 === alvos.ar_vespertino.md5,
    ar_matutino_igual_cand_matutino: alvos.ar_matutino.md5 === alvos.cand_matutino.md5,
    ar_vespertino_igual_cand_vespertino: alvos.ar_vespertino.md5 === alvos.cand_vespertino.md5,
  },
};
fs.writeFileSync(SAIDA, JSON.stringify(diário, null, 2));
console.log(JSON.stringify(diário, null, 2));
