// «banda oca» pode ser duas coisas muito diferentes: (1) o instrumento mediu cedo de mais — o que o matriz
// de execuções prova acontecer, porque coordinator@360 saiu oco numa corrida e coerente noutra; ou (2) o
// produto realmente não monta shell de navegação para aquele papel, que no `pending` (conta em análise) é
// comportamento esperado. A diferença decide se o pending é NÃO TESTADA com causa ou FALHA — e o pending já
// tem leituras nas DUAS famílias de artefactos (mobile e desktop), por isso compara-se os dois sem browser.
// Só-leitura: lê evidence/ e imprime o que cada fonte diz do mesmo papel.
// Uso: node scripts/ah2-pending-sem-shell.mjs [papel=pending]
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const PAPEL = process.argv[2] || 'pending';

console.log('=== MOBILE (ah2-mobile2-*) ===');
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /^ah2-mobile2-m5-/.test(x) && x.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8'));
  if (j.ciclo !== 'AH-7b-MOBILE' || j.papel !== PAPEL) continue;
  console.log(`\n${f} · md5_shell=${j.md5_shell} · declaradas=${(j.declaradas || []).length}`);
  for (const [w, b] of Object.entries(j.bandas || {}).sort((a, c) => a[0] - c[0])) {
    const c = b.censo || {};
    console.log(`  @${w}: barra_existe=${c.barra_existe} gaveta_existe=${c.gaveta_existe} botões_barra=${(c.barra || []).length} botões_gaveta=${(c.gaveta || []).length} abertas=${b.abertas} ms_ready=${b.ms_ready ?? '-'} erros=${JSON.stringify(b.erros || []).slice(0, 160)} diagnostico=${JSON.stringify(b.diagnostico_gaveta || []).slice(0, 200)}`);
  }
  for (const q of j.bloqueadas || []) console.log(`  TRAVADA @${q.largura}: ${q.causa}`);
}

console.log('\n=== DESKTOP (ah2-varredura / stages) ===');
const found = [];
for (const f of readdirSync(`${DIR}/evidence`).filter((x) => /ah2-(varredura|desktop)/.test(x) && x.endsWith('.json')).sort()) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  if (!j.stages || !j.stages[PAPEL]) continue;
  found.push(f);
  console.log(`\n${f}`);
  for (const [banda, d] of Object.entries(j.stages[PAPEL])) {
    console.log(`  ${banda}: abertas=${d.abertas ?? '-'} botoes_no_dom=${d.botoes_no_dom ?? '-'} erro_boot=${JSON.stringify(d.erro_boot ?? '-').slice(0, 160)} sem_botao=${JSON.stringify(d.sem_botao || []).slice(0, 120)} ms_max=${d.ms_max ?? '-'} rotas_medidas=${Object.keys(d.peca || {}).length}`);
    if (d.texto_corpo || d.corpo) console.log('    corpo: ' + String(d.texto_corpo || d.corpo).slice(0, 220));
  }
}
if (!found.length) console.log('  (nenhum artefacto desktop com stages.' + PAPEL + ')');
