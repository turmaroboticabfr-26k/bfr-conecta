import fs from 'node:fs';
import { createHash } from 'node:crypto';
const dir = 'evidence';
const nomes = fs.readdirSync(dir).filter((n) => n.startsWith('p131-prova-alcancao-da-gaveta-') && n.endsWith('.json')).sort();
const linhas = [];
for (const n of nomes) {
  const cam = dir + '/' + n;
  const txt = fs.readFileSync(cam);
  let j = null;
  try { j = JSON.parse(txt); } catch { }
  const g0 = (j && (j.gavetas || [])[0]) || {};
  const t = (j && j.teclado) || {};
  linhas.push({
    rotulo: n.replace('p131-prova-alcancao-da-gaveta-', '').replace('.json', ''),
    bytes: Buffer.byteLength(txt),
    md5: createHash('md5').update(txt).digest('hex').slice(0, 8),
    janela: j && j.janela ? j.janela.largura + 'x' + j.janela.altura : '?',
    gates: j && j.portoes ? j.portoes.total + '/' + (j.portoes.falhas === null ? 'null' : j.portoes.falhas) : '?',
    veredito: j && j.veredito ? String(j.veredito).split(' ')[1] : 'SEM_VEREDITO',
    rato: g0.clique ? (g0.clique.tentado === true ? (g0.clique.aberto_depois === true ? 'abriu' : 'nao') : 'nao-disparado') : 'sem-clique',
    causa_rato: g0.causa_do_clique_sem_efeito || '-',
    assentou: g0.assentar ? g0.assentar.estavel + '@' + g0.assentar.centro : '-',
    teclado: typeof t.mudou_por_teclado === 'boolean' ? String(t.mudou_por_teclado) : '-',
    causa_teclado: t.causa_do_teclado_sem_efeito || '-'
  });
}
for (const l of linhas) console.log(Object.entries(l).map(([k, v]) => k + '=' + v).join(' '));
console.log('total_ficheiros=' + nomes.length);
