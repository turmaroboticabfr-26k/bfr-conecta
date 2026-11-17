// O portão «0 falhas de rede» deu vermelho em gatekeeper por dois 404 em /rest/v1/. Uma tabela em falta não
// estraga um perfil: estraga todas as vistas que a consultam. Este censo varre os artefactos da régua válida
// e responde, por (papel, banda), que URLs de rede falharam — para o §14 poder escrever a causa uma vez e
// não quinze. Só lê o que já foi medido; não abre browser nem toca no banco.
// Uso: node scripts/ah2-censo-404.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT = `${EV}/ah2-censo-404-17-11.json`;
if (readdirSync(EV).includes('ah2-censo-404-17-11.json') && !process.argv.includes('--force')) {
  throw new Error('ABORTA: já existe ' + OUT + ' — apague-o ou passe --force');
}
const REGUA_VALIDA = (a) => a && a.tetos && a.tetos.estabilizacao_ms === 6000;
// A varredura guarda `log_rede_erros` (contagem total) mas só 6 amostras por célula. Uma célula truncada
// não prova que os URLs listados sejam os únicos: digo-o em vez de contar o censo como exaustivo.
const AMOSTRA_POR_CELULA = 6;

const fich = readdirSync(EV).filter((f) => /^ah2-varredura-.*\.json$/.test(f) && !f.includes('ANTERIOR'));
// url -> { papeis:Set, bandas:Set, status:Set, exemplos:[] }
const porUrl = new Map();
const porCelula = [];
let lidos = 0;
let truncadas = 0;
const celulas_truncadas = [];
for (const f of fich) {
  let a;
  try { a = JSON.parse(readFileSync(`${EV}/${f}`, 'utf8')); } catch { continue; }
  if (!REGUA_VALIDA(a)) continue;
  for (const [papel, p] of Object.entries(a.stages || {})) {
    for (const [banda, b] of Object.entries(p)) {
      if (!b || !b.log_rede_amostra) continue;
      lidos++;
      if (Number(b.log_rede_erros) > AMOSTRA_POR_CELULA) {
        truncadas++;
        celulas_truncadas.push({ papel, banda, total: b.log_rede_erros, amostra: b.log_rede_amostra.length, ficheiro: f });
      }
      const urls = [];
      for (const e of b.log_rede_amostra) {
        if (!/Failed to load resource|status of [45]/.test(String(e.texto || ''))) continue;
        const st = (String(e.texto).match(/status of (\d+)/) || [])[1] || '?';
        urls.push({ url: e.url, st });
        const k = e.url;
        if (!porUrl.has(k)) porUrl.set(k, { papeis: new Set(), bandas: new Set(), status: new Set(), artefactos: new Set() });
        const v = porUrl.get(k);
        v.papeis.add(papel); v.bandas.add(banda); v.status.add(st); v.artefactos.add(f);
      }
      if (urls.length) porCelula.push({ papel, banda, em: a.em, ficheiro: f, urls });
    }
  }
}

const linhas = [...porUrl.entries()]
  .map(([url, v]) => ({ url, status: [...v.status].join('/'), papeis: [...v.papeis].sort(), n_papeis: v.papeis.size, bandas: [...v.bandas].sort(), artefactos: [...v.artefactos].sort() }))
  .sort((a, b) => b.n_papeis - a.n_papeis || a.url.localeCompare(b.url));

const out = {
  ciclo: 'AH-2-404',
  em: new Date().toISOString(),
  amostra_por_celula: AMOSTRA_POR_CELULA,
  celulas_lidas: lidos,
  celulas_com_falha_rede: porCelula.length,
  celulas_truncadas: truncadas,
  celulas_truncadas_lista: celulas_truncadas,
  urls: linhas,
  por_celula: porCelula,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`celulas_lidas=${lidos} com_falha=${porCelula.length} truncadas=${truncadas} urls_distintos=${linhas.length}`);
for (const l of linhas) console.log(`${l.status.padEnd(4)} ${l.url.padEnd(46)} papeis=${l.n_papeis} ${l.papeis.join(',')}`);
console.log('OUT ' + OUT);
