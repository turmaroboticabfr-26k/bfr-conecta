// Mede os 7 nomes da superfície da Secretaria na shell v134 actual (bfr-candidata-v134-sidebar-escondida),
// com linha e contexto por ocorrência, para decidir a regra de unificação na v136. So leitura.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${DIR}/evidence/v136-rotulos-v134-19-11.json`;
if (existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe');

const t = readFileSync(`${DIR}/bfr-candidata-v134-sidebar-escondida/index.html`, 'utf8');
const linhas = t.split(/\r?\n/);
const NOMES = ['Secretaria de Educação', 'Secretaria digital', 'Centro de Gestão da Educação', 'Atendimento da escola', 'Supervisão Educacional', 'Supervisão', 'Secretaria'];
const out = {
  programa: 'v136-rotulos-v134.mjs (rascunho de medição, sem versionamento)',
  em: new Date().toISOString(),
  shell: { md5: createHash('md5').update(Buffer.from(t)).digest('hex'), bytes: Buffer.byteLength(t), caracteres: t.length },
  por_nome: {},
};
for (const nome of NOMES) {
  const ocorr = [];
  linhas.forEach((l, i) => {
    let j = -1;
    while ((j = l.indexOf(nome, j + 1)) >= 0) {
      ocorr.push({ linha: i + 1, contexto: l.slice(Math.max(0, j - 90), j + nome.length + 90) });
    }
  });
  out.por_nome[nome] = { total: ocorr.length, ocorrencias: ocorr.slice(0, 60) };
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.por_nome).map(([k, v]) => [k, v.total]))));
console.log('escrito ' + OUT);
