// Comparabilidade entre bandas: o portão «0 falhas de rede em /auth/ ou /rest/» só apareceu vermelho no
// gatekeeper a 1440, mas as duas tabelas em falta (bfr_school_shift_settings, bfr_school_calendar_days)
// dão 404 em TODAS as bandas. Ou o portão é novo (e as bandas antigas não o tinham), ou a 404 só é
// registada como falha quando a seção que a pede foi realmente aberta. Este script lê os artefactos e
// imprime, por banda, o valor de falhas_api_rede do gatekeeper e em que campos aparece o nome das
// tabelas — para o relatório não chamar «defeito novo a 1440» a uma coisa que já acontecia a 390.
import { readFileSync, readdirSync } from 'node:fs';

const EV = 'evidence';
const ficheiros = readdirSync(EV).filter((f) => /^ah2-varredura-17-11-.*\.json$/.test(f)).sort();
for (const f of ficheiros) {
  let j; try { j = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch (e) { console.log(`${f} LEITURA_FALHOU ${String(e.message).slice(0, 50)}`); continue; }
  const st = j.stages || {};
  // forma real: stages[<papel>][<banda>] = célula (não «papel/banda»)
  for (const papel of Object.keys(st)) {
    for (const banda of Object.keys(st[papel] || {})) {
      if (banda === 'declaradas' || banda === 'secoes' || banda === 'injecao_1440') continue;
      const c = st[papel][banda];
      if (!c || typeof c !== 'object' || !('falhas_api_rede' in c)) continue;
      const txt = JSON.stringify(c);
      console.log(`${f} | ${papel}/${banda}`);
      console.log(`   falhas_api_rede = ${JSON.stringify(c.falhas_api_rede).slice(0, 220)}`);
      console.log(`   menções: shift_settings=${(txt.match(/bfr_school_shift_settings/g) || []).length} calendar_days=${(txt.match(/bfr_school_calendar_days/g) || []).length} | seções abertas=${Object.keys(c.peca || {}).length}`);
    }
  }
}
console.log('tetos do instrumento: ' + JSON.stringify(JSON.parse(readFileSync(`${EV}/${ficheiros[ficheiros.length - 1]}`, 'utf8')).tetos));
