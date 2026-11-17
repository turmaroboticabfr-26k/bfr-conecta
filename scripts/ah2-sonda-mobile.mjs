// O portão «inalcançável a toque» não diz se a culpa é do dedo ou do medidor. Este leitura imprime o que o
// instrumento registou antes de tocar: contagens de navegação, rótulos visíveis e o veredicto do
// RETANGULO para cada seção. Só-leitura no JSON do ciclo.
// Uso: node scripts/ah2-sonda-mobile.mjs <rotulo>
import { readFileSync } from 'node:fs';
const ROT = process.argv[2] || 'm-coord';
const j = JSON.parse(readFileSync(`C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence/ah2-mobile-${ROT}.json`, 'utf8'));
console.log(`papel=${j.papel} larguras=${j.larguras.join(',')} alt=${j.altura} md5=${j.md5_shell.slice(0, 8)} veredito=${j.veredito}`);
for (const [w, b] of Object.entries(j.bandas)) {
  console.log(`\n=== ${w}px  ready_em=${b.ms_ready}ms abertas=${b.abertas} inalcanceis=${(b.inalcancaveis || []).length}`);
  console.log('  nav_antes:', JSON.stringify(b.nav_antes));
  console.log('  nav_depois:', JSON.stringify(b.nav_depois_do_menu));
  console.log('  toque_em:', JSON.stringify(b.toque_em));
  const tipos = {};
  for (const [s, v] of Object.entries(b.seccoes || {})) {
    const k = v.sem_botao ? 'sem_botao' : v.incalcanavel ? 'incalcanavel' : v.fora_do_ecra ? 'fora_do_ecra:' + JSON.stringify(v.fora_do_ecra) : 'tocou';
    tipos[k] = (tipos[k] || 0) + 1;
  }
  console.log('  desfecho_das_secoes:', JSON.stringify(tipos));
  const exemplo = Object.entries(b.seccoes || {}).find(([, v]) => v.incalcanavel)?.[0];
  if (exemplo) console.log(`  exemplo_incalcanavel(${exemplo}):`, JSON.stringify(b.seccoes[exemplo]));
}
