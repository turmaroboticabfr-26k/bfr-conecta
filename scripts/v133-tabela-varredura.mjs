// V133 — tabela da varredura por papel a 390 px depois da publicação. Compara cada artefacto
// v133b com TODAS as corridas m5 do mesmo papel que têm banda 390 e separa, entre as falhas do
// topo, as NOVAS das pré-existentes. Não re-meide nada: lê os artefactos que já estão em disco.
// Só-leitura; escreve apenas o seu próprio artefacto de evidência.
import fs from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const SAIDA = `${EV}/v133-tabela-varredura-18-11.json`;
if (fs.existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' existe — rode com outro nome');

const PAPEIS = ['director', 'gatekeeper', 'coordinator', 'psychology', 'monitor', 'pending', 'parent',
  'student', 'pedagogical', 'developer', 'secretary', 'aee', 'social_work', 'sports_operator', 'education_supervisor'];
const norm = (s) => String(s).replace(/^390px:\s*/, '').split('|')[0].trim();
const todos = fs.readdirSync(EV).filter((f) => /^ah2-mobile2-m5-/.test(f)).map((f) => JSON.parse(fs.readFileSync(`${EV}/${f}`, 'utf8')));

const linhas = [];
for (const p of PAPEIS) {
  const arNow = `${EV}/ah2-mobile2-v133b-${p}.json`;
  const bases = todos.filter((j) => j.papel === p);
  const b390 = bases.filter((j) => j.bandas && j.bandas['390']);
  const baseSet = new Set();
  for (const j of bases) for (const f of (j.falhas || [])) baseSet.add(norm(f));
  const linha = { papel: p, baselines_total: bases.length, baselines_com_banda_390: b390.length };
  if (!fs.existsSync(arNow)) { linha.v133b = 'sem_artefacto'; linhas.push(linha); continue; }
  const j = JSON.parse(fs.readFileSync(arNow, 'utf8'));
  const b = j.bandas['390'];
  linha.v133b = b ? 'com_banda' : 'sem_banda';
  if (b) linha.censo = { presentation: b.censo.presentation, sidebar_caixa: b.censo.sidebar_caixa,
    barra_existe: b.censo.barra_existe, gaveta_aberta_a_toque: b.gaveta_aberta_a_toque === true };
  linha.abertas = b ? b.abertas : null;
  linha.novas = (j.falhas || []).map(norm).filter((f) => !baseSet.has(f));
  linha.preexistentes = (j.falhas || []).map(norm).filter((f) => baseSet.has(f));
  linhas.push(linha);
}

const out = {
  version: 'v133', data: '2026-11-18', ciclo: 'AH-7b-MOBILE (re-varredura 390 px pos-publicacao)',
  metodo: 'linha de base = todas as corridas m5 do mesmo papel; NOVO = falha que nenhuma corrida m5 '
    + 'registou; pre-existente = falha ja vista em pelo menos uma corrida m5 (mesmo sem banda 390, '
    + 'porque a lista de falhas vive no topo do artefacto). Shell medida: md5 da candidata v133 publicada.',
  shell_v133b_md5: linhas.length ? JSON.parse(fs.readFileSync(`${EV}/ah2-mobile2-v133b-director.json`, 'utf8')).md5_shell : null,
  shell_m5_md5: JSON.parse(fs.readFileSync(`${EV}/ah2-mobile2-m5-director-1.json`, 'utf8')).md5_shell,
  papais: linhas,
  contagens: {
    com_banda_390: linhas.filter((l) => l.v133b === 'com_banda').length,
    sem_banda_390: linhas.filter((l) => l.v133b === 'sem_banda').length,
    sem_artefacto: linhas.filter((l) => l.v133b === 'sem_artefacto').length,
    sidebar_caixa_true: linhas.filter((l) => l.censo && l.censo.sidebar_caixa === true).length,
    sidebar_caixa_false: linhas.filter((l) => l.censo && l.censo.sidebar_caixa === false).length,
  },
  tipos_de_novo: Object.fromEntries((() => {
    const m = new Map();
    for (const l of linhas) for (const f of (l.novas || [])) m.set(f, (m.get(f) || 0) + 1);
    return [...m];
  })()),
  em: new Date().toISOString(),
};
fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
for (const l of linhas) {
  console.log(`${l.papel.padEnd(20)} ${String(l.v133b).padEnd(11)} abertas=${String(l.abertas).padStart(3)} `
    + `novas=${(l.novas || []).length} pre=${(l.preexistentes || []).length} `
    + `sidebar=${l.censo ? l.censo.sidebar_caixa : '-'}`);
  for (const f of (l.novas || [])) console.log('   NOVO: ' + f.slice(0, 90));
}
console.log('contagens:', JSON.stringify(out.contagens));
console.log('TABELA_OK');
