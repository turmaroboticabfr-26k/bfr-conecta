// Leitura do campo `estouro_h` nos diários da banda, para a §AI.32 poder dizer quantas células existem e
// quantas deram true — com o predicado degenerado, um 0 em toda a coluna não é evidência de ausência.
import { readdirSync, readFileSync } from 'node:fs';
const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta/evidence';
const anda = (d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? [] : [d + '/' + e.name]).filter(p => /ah2-(mobile|varredura|professor|desktop|home)/.test(p.split('/').pop()) && p.endsWith('.json'));
let fich = 0, cel = 0, verd = 0, fals = 0, outros = {};
const por_ficheiro = [];
for (const p of anda(DIR)) {
  let j; try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
  const achos = [];
  const walk = (x) => { if (!x || typeof x !== 'object') return; for (const [k, v] of Object.entries(x)) { if (k === 'estouro_h') achos.push(v); else if (k !== 'taps_amostra' && k !== 'fontes_amostra') walk(v); } };
  walk(j);
  if (!achos.length) continue;
  fich++;
  const t = achos.filter(v => v === true).length, f = achos.filter(v => v === false).length;
  cel += achos.length; verd += t; fals += f;
  for (const v of achos.filter(v => v !== true && v !== false)) outros[JSON.stringify(v)] = (outros[JSON.stringify(v)] || 0) + 1;
  por_ficheiro.push({ f: p.split('/').pop(), celulas: achos.length, true: t, false: f });
}
console.log(JSON.stringify({ ficheiros_com_a_coluna: fich, celulas: cel, true: verd, false: fals, outros }, null, 1));
console.log('maiores:', por_ficheiro.sort((a, b) => b.celulas - a.celulas).slice(0, 6).map(x => `${x.f}:${x.celulas}(t=${x.true})`).join(' · '));
