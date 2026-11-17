// O consolidador dá «banda oca: barra_existe=false, abertas=0» como causa do pending e do pedagogical, mas
// isso descreve o INSTRUMENTO (a barra mobile não montou), não o produto: pode ser o app a mostrar um ecrã
// sem navegação (aprovamento pendente, sem vínculo) — comportamento correcto — ou a shell a falhar o arranque.
// O veredicto muda conforme o que a página mostrou, por isso este programa despeja, por célula oca, os campos
// de prova que já existem no artefacto (censo, erros, botões no DOM, texto do corpo se foi gravado).
// Só-leitura. Uso: node scripts/ah2-m5-bandas-ocas.mjs [prefixo=m5] [papel]
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PREFIXO = process.argv[2] || 'm5';
const PAPEL = process.argv[3] || null;
const coerente = (b) => !!b.censo && b.censo.barra_existe !== false && (b.censo.barra || []).some((x) => x.w > 0 && x.h > 0) && (b.abertas || 0) > 0;
const fich = readdirSync(`${DIR}/evidence`).filter((f) => new RegExp(`^ah2-mobile2-${PREFIXO}[^/]*\\.json$`).test(f)).sort();
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || (PAPEL && j.papel !== PAPEL)) continue;
  for (const [w, b] of Object.entries(j.bandas || {}).sort((a, c) => a[0] - c[0])) {
    if (coerente(b)) continue;
    const c = b.censo || {};
    console.log(`\n### ${j.papel}@${w}  (${f})`);
    console.log('  chaves da banda: ' + Object.keys(b).sort().join(','));
    console.log('  censo: ' + JSON.stringify({ barra_existe: c.barra_existe, gaveta_existe: c.gaveta_existe, barra: (c.barra || []).length, gaveta: (c.gaveta || []).length, shell: c.shell, viewport: c.viewport, botao_home: c.botao_home, corpo: c.corpo_txt || c.body_txt || null }).slice(0, 600));
    for (const k of Object.keys(b).sort()) {
      if (k === 'censo' || k === 'seccoes') continue;
      const s = JSON.stringify(b[k]);
      if (s && s !== '[]' && s !== '0' && s !== 'null' && s !== '{}') console.log(`  ${k}: ${s.slice(0, 420)}`);
    }
    const secs = Object.entries(b.seccoes || {});
    if (secs.length) console.log('  seccoes: ' + secs.map(([r, v]) => r + '=' + (v && v.painel ? v.painel.c + 'c' : (v && v.gaveta_nao_abriu ? 'gaveta_nao_abriu' : (v && v.nao_tocavel) || 'sem_painel'))).join(' '));
  }
}
// A matriz é o ponto: se a banda oca seguisse o PAPEL, seria comportamento do produto (ecrã sem navegação);
// se saltar entre execuções do mesmo papel e da mesma largura, é o instrumento a medir antes de a shell
// mobile montar. Por isso se lista cada corrida separadamente, com o ms_ready que ela viu.
console.log('\n===== MATRIZ POR EXECUCAO =====');
const linhas_matriz = [];
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || (PAPEL && j.papel !== PAPEL)) continue;
  const ocas = [], coes = [], pr = [];
  for (const [w, b] of Object.entries(j.bandas || {}).sort((a, c) => a[0] - c[0])) {
    (coerente(b) ? coes : ocas).push(w);
    pr.push(w + ':' + (b.ms_ready == null ? '-' : b.ms_ready));
  }
  if (!ocas.length && !coes.length) continue;
  linhas_matriz.push({ papel: j.papel, rotulo: j.rotulo || f, ocas: ocas.join(','), coes: coes.join(','), prontos: pr.join(' ') });
}
console.log('| papel | execucao | larguras ocas | larguras coerentes | ms_ready |');
console.log('| --- | --- | --- | --- | --- |');
for (const l of linhas_matriz) console.log(`| ${l.papel} | ${l.rotulo} | ${l.ocas || '-'} | ${l.coes || '-'} | ${l.prontos} |`);
const por_papel = {};
for (const l of linhas_matriz) { const a = (por_papel[l.papel] = por_papel[l.papel] || { ocas: new Set(), coes: new Set() }); for (const w of (l.ocas || '').split(',').filter(Boolean)) a.ocas.add(+w); for (const w of (l.coes || '').split(',').filter(Boolean)) a.coes.add(+w); }
console.log('\nLarguras que foram OCAS em pelo menos uma execução e COERENTES noutra do mesmo papel (prova de que não é o papel, é a corrida):');
for (const [p, a] of Object.entries(por_papel).sort()) {
  const ambas = [...a.ocas].filter((w) => a.coes.has(w)).sort((x, y) => x - y);
  console.log(`  ${p}: oca em {${[...a.ocas].sort((x, y) => x - y).join(',')}} · coerente em {${[...a.coes].sort((x, y) => x - y).join(',')}} · AMBAS: {${ambas.join(',')}}`);
}
