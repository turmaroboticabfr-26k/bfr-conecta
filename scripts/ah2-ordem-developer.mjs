// Antes de escrever a sonda do §AI.18, a ordem do varrimento tem de ser lida e não adivinhada: a predição é
// «a primeira rota que chama setRole(...) atira o developer para outra pessoa e as entradas de apoio que vêm a
// seguir desaparecem da gaveta reconstruída» — portanto o que interessa é qual das {gate, monitor, psychology}
// falha primeiro e o que está mesmo antes dela na ordem que o instrumento percorre.
// Só-leitura. Uso: node scripts/ah2-ordem-developer.mjs
import { readFileSync, readdirSync } from 'node:fs';
const EV = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const TRES = ['gate', 'monitor', 'psychology'];
const SUSPEITAS = ['aee', 'psychology', 'secretaria'];
const fich = readdirSync(EV).filter((f) => /^ah2-mobile2-m5-developer.*\.json$/.test(f)).sort();
console.log(`artefactos do developer: ${fich.join(', ')}`);
for (const f of fich) {
  const j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8'));
  for (const [w, b] of Object.entries(j.bandas || {})) {
    if (+w !== 390) continue;
    const gav = (b.censo?.gaveta || []).map((x) => x.route);
    const ordem = Object.keys(b.seccoes || {});
    console.log(`\n${f} @${w} · gaveta=${gav.length} · medidas=${ordem.length} · abertas=${b.abertas}`);
    console.log(`  ordem do censo: ${gav.join(' > ')}`);
    console.log(`  ordem medida:   ${ordem.join(' > ')}`);
    console.log(`  estado das três: ${TRES.map((r) => r + '=' + (b.seccoes[r] ? (b.seccoes[r].painel ? 'painel ' + b.seccoes[r].painel.c + 'c' : (b.seccoes[r].nao_tocavel || b.seccoes[r].gaveta_nao_abriu || 'sem_painel')) : 'AUSENTE')).join(' · ')}`);
    console.log(`  inalcansáveis: ${JSON.stringify(b.inalcancaveis)}`);
    // O que está imediatamente antes da primeira das três a falhar, na ordem medida: é a candidata a ter
    // chamado setRole, se a predição do §AI.18 for vraie.
    const falha = TRES.map((r) => ordem.indexOf(r)).filter((i) => i >= 0).sort((a, c) => a - c)[0];
    const antes = falha == null ? [] : ordem.slice(Math.max(0, falha - 3), falha);
    console.log(`  3 rotas antes da primeira falha: ${antes.join(' > ')} · alguma suspeita de setRole? ${antes.filter((x) => SUSPEITAS.includes(x)).join(', ') || 'nenhuma'}`);
  }
}
