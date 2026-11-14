// V121-3 (#1178) — sonda SOMENTE LEITURA ao vivo, colada antes do deploy.
// NAO re-corre o preflight: o portao G8 "destino livre" passou a ser legitimamente
// vermelho depois da montagem, e reescrever um portao ja provado seria ma higiene.
// Aqui so importa provar que NINGUEM publicou por baixo da montagem entre o preflight e o deploy.
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_404 = `${dir}/audit-publicacao-v120-404.json`;
const BUNDLE = `${dir}/worker-deploy-v121`;
const BASE_DIR = `${dir}/worker-deploy-v120-404`;
const OUT = `${dir}/evidence/v121-predeploy-live-14-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const parseRegua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };
const out = { ciclo: 'V121-PREDEPLOY-LIVE', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0 };
const falhas = [];
const gate = (nome, ok, dados) => { out[nome] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(nome); };

const d404 = JSON.parse(fs.readFileSync(DIARIO_404, 'utf8'));
const depois = d404.medicao.ar_depois;
const URL_AR = depois.ar;
const reguaShell = parseRegua(d404.md5.shell_antes_e_depois);
const reguaSw = parseRegua(d404.md5.sw_antes_e_depois);
const reguaWorkerBase = parseRegua(d404.md5['worker-deploy-v120-404/worker.mjs_publicado']);
const cacheLabelAr = (/CACHE (bfr-conecta-v\d+)/.exec(d404.md5.sw_antes_e_depois) || [])[1];
const rotas404 = Object.entries(depois.rotas).filter(([, v]) => v.http === 404).map(([k, v]) => ({ caminho: k, ...v }));
const esp = JSON.parse(fs.readFileSync(`${BUNDLE}/esperado-v121.json`, 'utf8'));
out.reguas = { origem: ['audit-publicacao-v120-404.json', 'esperado-v121.json'], url: URL_AR,
  ar_esperado_agora: { worker: reguaWorkerBase, shell: reguaShell, sw: reguaSw, cache: cacheLabelAr },
  bundle_pronto: { workerMd5: esp.workerMd5, workerBytes: esp.workerBytes, htmlMd5: esp.htmlMd5, swMd5: esp.swMd5, cacheLabel: esp.cacheLabel } };

// ---------- L1 o ar ainda e a v120-404 ninguem publicou por baixo ----------
const noCache = { headers: { 'Cache-Control': 'no-cache' } };
const resp = await fetch(URL_AR + '/', noCache);
const corpo = await resp.text();
out.ar_shell = { http: resp.status, bytes: bytes(corpo), md5: md5(Buffer.from(corpo, 'utf8')),
  csp_igual_ao_diario: resp.headers.get('content-security-policy') === depois.rotas['/'].csp,
  etiquetas: [...new Set(corpo.match(/bfr-conecta-v\d+/g) || [])] };
gate('L1_ar_shell_ainda_a_v120_404', resp.status === 200 && out.ar_shell.md5 === reguaShell.md5
  && out.ar_shell.bytes === reguaShell.bytes && out.ar_shell.csp_igual_ao_diario,
  { esperado: reguaShell, medido: { md5: out.ar_shell.md5, bytes: out.ar_shell.bytes } });

// ---------- L2 SW servido ainda com a etiqueta velha (logo o deploy e que muda) ----------
const respSw = await fetch(URL_AR + '/sw-v4.js?v=45', noCache);
const corpoSw = await respSw.text();
out.ar_sw = { http: respSw.status, bytes: bytes(corpoSw), md5: md5(Buffer.from(corpoSw, 'utf8')), cache: [...new Set(corpoSw.match(/bfr-conecta-v\d+/g) || [])] };
gate('L2_ar_sw_ainda_a_etiqueta_da_ar', respSw.status === 200 && out.ar_sw.md5 === reguaSw.md5 && out.ar_sw.bytes === reguaSw.bytes
  && out.ar_sw.cache.length === 1 && out.ar_sw.cache[0] === cacheLabelAr, { esperado: { ...reguaSw, cache: cacheLabelAr }, medido: out.ar_sw });

// ---------- L3 o handler do 404 continua a servir 404 com o mesmo corpo ----------
const medidos = [];
for (const r of rotas404) {
  const res = await fetch(URL_AR + r.caminho, noCache);
  const t = await res.text();
  medidos.push({ caminho: r.caminho, http: res.status, bytes: bytes(t), md5: md5(Buffer.from(t, 'utf8')) });
}
out.ar_404 = medidos;
gate('L3_quarenta_e_quatro_permanecem', medidos.length === rotas404.length
  && medidos.every((m, i) => m.http === 404 && m.bytes === rotas404[i].bytes && m.md5 === rotas404[i].md5),
  { total: medidos.length, desvios: medidos.filter((m, i) => m.http !== 404 || m.md5 !== rotas404[i].md5).map(m => `${m.caminho}=${m.http}/${m.md5}`) });

// ---------- L4 bundle em disco bate com o esperado e com a base do 404 ----------
const wBuf = fs.readFileSync(`${BUNDLE}/worker.mjs`);
const baseBuf = fs.readFileSync(`${BASE_DIR}/worker.mjs`);
out.bundle = { bytes: wBuf.length, md5: md5(wBuf), delta_vs_base: wBuf.length - baseBuf.length };
gate('L4a_bundle_em_disco_igual_ao_esperado', md5(wBuf) === esp.workerMd5 && wBuf.length === esp.workerBytes, out.bundle);
gate('L4b_base_do_404_inalterada_desde_o_preflight', md5(baseBuf) === reguaWorkerBase.md5 && baseBuf.length === reguaWorkerBase.bytes,
  { esperado: reguaWorkerBase, medido: { md5: md5(baseBuf), bytes: baseBuf.length } });

// ---------- L5 nada do v121 no ar, nada do v120 dentro do bundle pronto ----------
gate('L5_nada_do_v121_no_ar_e_nada_do_v120_no_bundle_pronto',
  !out.ar_shell.etiquetas.includes('bfr-conecta-v121') && !out.ar_sw.cache.includes('bfr-conecta-v121')
  && !corpo.includes('bfr-conecta-v121') && !corpoSw.includes('bfr-conecta-v121'),
  { etiquetas_no_ar: out.ar_shell.etiquetas, sw_no_ar: out.ar_sw.cache });

out.ar_antes_do_deploy = { version_id_do_diario_404: d404.deploy.version_id, version_anterior_do_diario_404: d404.deploy.version_anterior, shell: out.ar_shell.md5, sw: out.ar_sw.md5 };

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'V121_PREDEPLOY_VERDE' : 'V121_PREDEPLOY_VERMELHO';
out.totais = { portoes: Object.keys(out).filter(k => /^L\d/.test(k)).length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of Object.keys(out).filter(k => /^L\d/.test(k))) {
  const g = out[k];
  console.log(`${g.passou ? 'OK  ' : 'RED '} ${k}${g.passou ? '' : ' ' + JSON.stringify(g).slice(0, 400)}`);
}
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`ar=${out.ar_shell.bytes}B ${out.ar_shell.md5} sw=${out.ar_sw.bytes}B ${out.ar_sw.md5} bundle=${out.bundle.bytes}B ${out.bundle.md5} delta=${out.bundle.delta_vs_base}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
