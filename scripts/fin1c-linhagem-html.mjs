// FIN-1c — SOMENTE LEITURA: linhagem do HTML embutido. Decodifica o literal `const HTML` de cada
// worker-deploy-* em disco e conta a bateria de marcas EM CADA LITERAL, em vez de contar no ar com
// marcadores dactilografados da memória (a falha do FIN-1b: `schools(name)` casa dentro de
// `sports_schools(name)`, e `pintaSozinho` foi REMOVIDO de propósito pela a1c da v111).
// Artefacto: evidence/fin1c-linhagem-html.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const md5 = (s) => createHash('md5').update(typeof s === 'string' ? Buffer.from(s, 'utf8') : s).digest('hex');
const conta = (t, re) => (t.match(re) || []).length;

// Marcas DERIVADAS: cada uma é a string exata que o diário/a candidata da vaga correspondente emitiu.
const MARCAS = {
  'i85 v107: def loadSchoolContent': [/async function loadSchoolContent/g],
  'i85 v107: schoolContent.loading': [/schoolContent\.loading/g],
  'i86 v108: displayName(': [/displayName\(/g],
  'i91 v109: partialMsg': [/partialMsg/g],
  'i91 v109: if (state.loading) return;': [/if\s*\(\s*state\.loading\s*\)\s*return\s*;/g],
  'i91 v109: (!state.loaded || !state.linked)': [/\(\s*!state\.loaded\s*\|\|\s*!state\.linked\s*\)/g],
  'v114 embed: schools(name) nu (sem o prefixo sports_)': [/(?<![a-z_])schools\(\s*name\s*\)/g],
  'v115 embed: sports_schools(name)': [/sports_schools\(\s*name\s*\)/g],
  'v116 mobile: bindTrigger': [/bindTrigger/g],
  'v116 mobile: dispatchEvent(new MouseEvent': [/dispatchEvent\(\s*new MouseEvent\(/g],
  'i77 a1c v111: observe(': [/function observe\(|const observe\s*=/g],
  'item 77: bfr:app-ready': [/bfr:app-ready/g],
  'push: addEventListener(push)': [/addEventListener\(\s*['"]push['"]/g],
};

const r = await fetch(AR + '/', { headers: { 'cache-control': 'no-cache' } });
const arBuf = Buffer.from(await r.arrayBuffer());
const out = { em: new Date().toISOString(), tarefa: 'FIN-1c linhagem do HTML embutido',
  metodo: 'somente leitura', ar: { http: r.status, bytes: arBuf.length, md5: md5(arBuf) }, vagas: [] };

const dirs = readdirSync('.').filter((d) => /^worker-deploy-v\d+/.test(d)).sort();
for (const d of dirs) {
  const w = readFileSync(`${d}/worker.mjs`, 'utf8');
  const linha = w.split('\n').find((l) => /^\s*const\s+HTML\s*=/.test(l));
  const rec = { dir: d, tem_const_HTML: !!linha };
  if (!linha) { out.vagas.push(rec); continue; }
  const expr = linha.replace(/^\s*const\s+HTML\s*=/, '').replace(/;\s*$/, '').trim();
  let html = null;
  for (const tentativa of [expr, expr.replace(/^(['`])/, '"').replace(/(['`])$/, '"')]) {
    try { html = JSON.parse(tentativa); break; } catch { /* outro delimitador */ }
  }
  if (html === null) { rec.decodificado = false; rec.cabe = expr.length; rec.inicio = expr.slice(0, 60); out.vagas.push(rec); continue; }
  const b = Buffer.from(html, 'utf8');
  rec.decodificado = true; rec.bytes = b.length; rec.md5 = md5(b); rec.igual_ao_ar = md5(b) === out.ar.md5;
  rec.marcas = Object.fromEntries(Object.entries(MARCAS).map(([k, res]) => [k, res.reduce((a, re) => a + conta(html, re), 0)]));
  const swLinha = w.split('\n').find((l) => /^\s*const\s+SW\s*=/.test(l));
  let swTxt = null; try { swTxt = JSON.parse(swLinha.replace(/^\s*const\s+SW\s*=/, '').replace(/;\s*$/, '').trim()); } catch {}
  rec.sw_embedido = swTxt ? { bytes: Buffer.byteLength(swTxt, 'utf8'), md5: md5(swTxt),
    cache: (swTxt.match(/CACHE\s*=\s*['"]([^'"]+)['"]/) || [, null])[1],
    push: conta(swTxt, /addEventListener\(\s*['"]push['"]/g),
    notificationclick: conta(swTxt, /addEventListener\(\s*['"]notificationclick['"]/g),
    importScripts: conta(swTxt, /importScripts\s*\(/g) } : null;
  out.vagas.push(rec);
}

// O mesmo censo sobre os bytes SERVIDOS, para a linha final ficar na mesma régua.
out.ar.marcas = Object.fromEntries(Object.entries(MARCAS).map(([k, res]) => [k, res.reduce((a, re) => a + conta(arBuf.toString('utf8'), re), 0)]));

const comLiteral = out.vagas.filter((v) => v.decodificado);
out.veredito = {
  literais_decodificados: comLiteral.length, de: out.vagas.length,
  alguma_vaga_igual_ao_ar: comLiteral.some((v) => v.igual_ao_ar),
  vagas_iguais_ao_ar: comLiteral.filter((v) => v.igual_ao_ar).map((v) => v.dir),
  sw_com_push: out.vagas.filter((v) => v.sw_embedido && v.sw_embedido.push > 0).map((v) => v.dir),
  sports_schools_name_por_vaga: Object.fromEntries(comLiteral.map((v) => [v.dir, v.marcas['v115 embed: sports_schools(name)']])),
  schools_nu_por_vaga: Object.fromEntries(comLiteral.map((v) => [v.dir, v.marcas['v114 embed: schools(name) nu (sem o prefixo sports_)']])),
};
writeFileSync('evidence/fin1c-linhagem-html.json', JSON.stringify(out, null, 2) + '\n');

console.log(`ar: HTTP ${out.ar.http} ${out.ar.bytes} B md5 ${out.ar.md5}`);
for (const v of out.vagas) {
  if (!v.decodificado) { console.log(`  ${v.dir}: HTML ${v.tem_const_HTML ? 'literal não decodificado' : 'AUSENTE'}`); continue; }
  console.log(`  ${v.dir}: ${v.bytes} B md5 ${v.md5} igual_ao_ar=${v.igual_ao_ar} · SW ${v.sw_embedido ? `${v.sw_embedido.bytes} B cache ${v.sw_embedido.cache} push ${v.sw_embedido.push} nclick ${v.sw_embedido.notificationclick} importScripts ${v.sw_embedido.importScripts}` : '-'}`);
}
console.log('marcas no ar:', JSON.stringify(out.ar.marcas));
console.log('veredito:', JSON.stringify(out.veredito, null, 1));
