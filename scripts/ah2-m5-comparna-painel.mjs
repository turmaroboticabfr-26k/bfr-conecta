// A conclusão de §AI.26 depende de uma comparação que tem de ser lida do disco, não lembrada: se o
// `internalChatView` enche para OUTROS papéis na mesma largura sondada, então o 0 do education_supervisor é
// do papel e não do painel. Este programa imprime por papel, para as rotas pedidas, a maior leitura de
// painel e o tempo — só números, extraídos dos mesmos artefactos `ah2-mobile2-m5-*.json` da grelha.
// Uso: node scripts/ah2-m5-comparna-painel.mjs <rota> [mais rotas]
import { readFileSync, readdirSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ROTAS = process.argv.slice(2);
if (!ROTAS.length) throw new Error('ABORTA: passe uma ou mais rotas');
const fich = readdirSync(`${DIR}/evidence`).filter((f) => /^ah2-mobile2-m5[^/]*\.json$/.test(f)).sort();
// melhor[papel][rota] = {c, ms, id, larguras:Set}
const melhor = {};
for (const f of fich) {
  let j; try { j = JSON.parse(readFileSync(`${DIR}/evidence/${f}`, 'utf8')); } catch { continue; }
  if (j.ciclo !== 'AH-7b-MOBILE') continue;
  for (const [w, b] of Object.entries(j.bandas || {})) {
    for (const rota of ROTAS) {
      const v = (b.seccoes || {})[rota];
      if (!v || !v.painel) continue;
      const m = (melhor[j.papel] = melhor[j.papel] || {});
      const c = (m[rota] = m[rota] || { c: -1, amostras: 0, ids: new Set(), larguras_c: new Map() });
      c.amostras++;
      c.ids.add(v.painel.id);
      c.larguras_c.set(+w, v.painel.c);
      if (v.painel.c > c.c) { c.c = v.painel.c; c.ms = v.ms; c.largura = +w; }
    }
  }
}
for (const rota of ROTAS) {
  console.log(`\n=== ${rota}`);
  for (const papel of Object.keys(melhor).sort()) {
    const c = melhor[papel][rota];
    if (!c) { console.log(`  ${papel}: sem leitura desta rota`); continue; }
    const por_largura = [...c.larguras_c.entries()].sort((a, b) => a[0] - b[0]).map(([w, x]) => `${w}=${x}`).join(' ');
    console.log(`  ${papel}: maior ${c.c} c (${[...c.ids].join('/')}) aos ${c.ms} ms em ${c.largura} px · ${c.amostras} leituras · ${por_largura}`);
  }
}
