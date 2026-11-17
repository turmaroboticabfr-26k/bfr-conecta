// Duas coisas que §AI.26 afirma e que dependem de todos os artefactos, não só dos seis novos: (i) que há 8
// corridas do apoio com série preenchida e que as larguras sondadas são 320/375/390; (ii) que `chat-interno`
// enche para oito papéis e nunca para o education_supervisor. Só-leitura. Uso: node scripts/ah2-confere-ai26b.mjs
import { readFileSync, readdirSync } from 'node:fs';
const EV = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const fich = readdirSync(EV).filter((f) => /^ah2-sonda-apoio-tempo-.*\.json$/.test(f)).sort();
let com_serie = 0; const larguras = new Set(); const sem_serie = [];
for (const f of fich) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { sem_serie.push(f + ' (ilegível)'); continue; }
  const s = j.serie || [];
  const p = s.find((x) => x && x.c > 0);
  if (!s.length) { sem_serie.push(f + ` (papel=${j.papel}@${j.largura}, 0 amostras, veredito="${String(j.veredito).slice(0, 70)}")`); continue; }
  if (p) { com_serie++; larguras.add(j.largura); console.log(`  PREENCHE ${j.papel}@${j.largura}: ${p.c} c @ ${p.t_ms_apos_toque} ms (${f})`); }
  else sem_serie.push(f + ` (papel=${j.papel}@${j.largura}, ${s.length} amostras sempre a 0)`);
}
console.log(`\nartefactos do apoio: ${fich.length} · com série preenchida: ${com_serie} · larguras sondadas: ${[...larguras].sort((a, b) => a - b).join('/')}`);
console.log('sem série preenchida:\n  ' + (sem_serie.join('\n  ') || 'nenhuma'));

// A comparação entre papéis: mesma rota, mesma grelha, conteúdo existe ou não existe — não tempos.
const L = [320, 360, 375, 390, 414, 430];
const grelha = readdirSync(EV).filter((f) => /^ah2-mobile2-m5-.+\.json$/.test(f)).sort();
const por_papel = {};
for (const f of grelha) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  for (const [w, b] of Object.entries(j.bandas || {})) {
    const v = (b.seccoes || {})['chat-interno']; if (!v || !v.painel) continue;
    (por_papel[j.papel] = por_papel[j.papel] || {})[+w] = `${v.painel.id || '?'}=${v.painel.c}c`;
  }
}
console.log(`\nchat-interno por papel × largura (${grelha.length} artefactos da grelha):`);
for (const p of Object.keys(por_papel).sort()) console.log(`  ${p.padEnd(22)} ` + L.map((w) => String(por_papel[p][w] ?? '-').padStart(22)).join(''));
