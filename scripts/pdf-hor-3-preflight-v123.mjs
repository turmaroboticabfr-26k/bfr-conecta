// PDF-HOR-3 — preflight SOMENTE LEITURA antes do deploy da v123 (substituicao dos PDFs).
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy. So HTTP GET e leitura de disco.
// A URL e a etiqueta do shell no ar sao DERIVADAS do diario pos-deploy da v122, nunca dactilografadas.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const DIARIO_V122 = `${dir}/evidence/v122-pos-deploy-http-15-11.json`;
const BASE = `${dir}/worker-deploy-v122-push`;
const NOVO = `${dir}/worker-deploy-v123-pdfs`;
const OUT = `${dir}/evidence/pdf-hor-3-preflight-v123-15-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;

const reguasV122 = JSON.parse(fs.readFileSync(DIARIO_V122, 'utf8'));
const URL_AR = reguasV122.reguas?.url;
const shellAr = reguasV122.A1_shell?.md5;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) die(`URL nao derivada do diario: ${URL_AR}`);
if (!/^[0-9a-f]{32}$/.test(String(shellAr))) die(`md5 da shell no ar nao derivada do diario: ${shellAr}`);

const espBase = JSON.parse(fs.readFileSync(`${BASE}/esperado-v122.json`, 'utf8'));
const espNovo = JSON.parse(fs.readFileSync(`${NOVO}/esperado-v123.json`, 'utf8'));
if (espNovo.ok_literal !== 'substituir os PDFs de horario') die(`esperado-v123 sem o OK literal certo: ${espNovo.ok_literal}`);
if (espNovo.baseWorkerMd5 !== espBase.workerMd5) die('a base do esperado-v123 nao e o worker-v122 publicado');
if (espNovo.htmlMd5 !== shellAr || espBase.htmlMd5 !== shellAr) die(`htmlMd5 dos esperados nao bate com o ar (${espNovo.htmlMd5}/${espBase.htmlMd5}/${shellAr})`);

const out = { ciclo: 'PDF-HOR-3-PREFLIGHT-V123', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  origem: 'evidence/v122-pos-deploy-http-15-11.json' };
const falhas = [];
const gate = (id, ok, dados) => { out[id] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(id); };

const get = async p => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), magica: b.subarray(0, 8).toString('latin1'),
    content_type: r.headers.get('content-type'), cache_status: r.headers.get('cf-cache-status') };
};

// ---------- ar: estado ANTES ----------
const shell = await get('/');
const sw = await get('/sw-v4.js?v=45');
const m = await get('/horario-matutino-2026.pdf');
const v = await get('/horario-vespertino-2026.pdf');
const cal = await get('/calendario-letivo-2026.pdf');
out.ar_antes = { url: URL_AR, shell, sw, matutino: m, vespertino: v, calendario: cal };

gate('A1_shell_no_ar_igual_a_v122', shell.http === 200 && shell.md5 === shellAr && shell.bytes === reguasV122.A1_shell.bytes, { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, diario: reguasV122.A1_shell });
gate('A2_sw_no_ar_ainda_v122', sw.http === 200 && sw.md5 === espBase.swMd5 && sw.bytes === espBase.swBytes
  && sw.content_type?.includes('javascript'), { medido: { md5: sw.md5, bytes: sw.bytes }, esperado_base: { md5: espBase.swMd5, bytes: espBase.swBytes }, content_type: sw.content_type });
const rotuloAr = (await (await fetch(URL_AR + '/sw-v4.js?v=45', { cache: 'no-store' })).text()).match(/const CACHE = '([^']+)'/)?.[1];
gate('A2b_sw_no_ar_sem_a_etiqueta_nova', rotuloAr === espBase.cacheLabel, { rotulo_no_ar: rotuloAr, esperado_antes: espBase.cacheLabel, novo: espNovo.cacheLabel });

const alvoSonda = JSON.parse(fs.readFileSync(`${dir}/evidence/pdf-hor-sonda-15-11.json`, 'utf8')).alvos;
const fake = alvoSonda.ar_matutino;
gate('A3_defeito_presente_no_ar', m.md5 === fake.md5 && v.md5 === fake.md5 && m.bytes === fake.bytes && !/^%PDF/.test(m.magica) && !/^%PDF/.test(v.magica),
  { matutino: { md5: m.md5, bytes: m.bytes, magica: m.magica }, vespertino: { md5: v.md5, magica: v.magica }, diario: fake });
gate('A4_servido_como_pdf_mas_nao_e_pdf', m.content_type?.includes('application/pdf') && v.content_type?.includes('application/pdf') && !/^%PDF/.test(m.magica),
  { content_type_matutino: m.content_type, content_type_vespertino: v.content_type, magica_matutino: m.magica });
gate('A5_calendario_inalterado_e_pdf_real', cal.md5 === alvoSonda.ar_calendario.md5 && /^%PDF-1/.test(cal.magica), { medido: { md5: cal.md5, bytes: cal.bytes, magica: cal.magica }, diario: alvoSonda.ar_calendario });

// ---------- disco: bundle novo ----------
const wNovo = fs.readFileSync(`${NOVO}/worker.mjs`);
gate('D1_worker_novo_igual_ao_esperado', md5(wNovo) === espNovo.workerMd5 && wNovo.length === espNovo.workerBytes, { medido: { md5: md5(wNovo), bytes: wNovo.length }, esperado: { md5: espNovo.workerMd5, bytes: espNovo.workerBytes } });
const wTxt = wNovo.toString('utf8');
gate('D2_etiqueta_unica_e_nova_no_worker', count(wTxt, espNovo.cacheLabel) === 1 && count(wTxt, espBase.cacheLabel) === 0, { v123: count(wTxt, espNovo.cacheLabel), v122: count(wTxt, espBase.cacheLabel) });
gate('D3_montagem_verde', (espNovo.portoesDetalhados ? Object.values(espNovo.portoesDetalhados).filter(p => !p.passou).length : -1) === 0 && espNovo.portoes === 13, { portoes: espNovo.portoes, vermelhos: espNovo.portoesDetalhados ? Object.values(espNovo.portoesDetalhados).filter(p => !p.passou).map(p => p) : null });
gate('D4_html_nao_muda_entre_v122_e_v123', espNovo.htmlMd5 === espBase.htmlMd5 && espNovo.htmlBytes === espBase.htmlBytes, { md5: espNovo.htmlMd5, bytes: espNovo.htmlBytes });
gate('D5_delta_do_worker_zero', espNovo.deltaWorkerBytes === 0 && espNovo.workerBytes === espBase.workerBytes, { medido: espNovo.deltaWorkerBytes });

const porArquivo = Object.fromEntries(espNovo.assets.map(a => [a.arquivo, a]));
const pdfsTres = ['horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf', 'calendario-letivo-2026.pdf'];
gate('D6_tres_pdfs_com_magic_no_bundle', pdfsTres.every(p => porArquivo[p]?.pdf_ok === true && porArquivo[p]?.eof === true),
  Object.fromEntries(pdfsTres.map(p => [p, porArquivo[p] && { cabecalho: porArquivo[p].cabecalho, bytes: porArquivo[p].bytes }])));
gate('D7_matutino_diferente_do_vespertino_no_bundle', porArquivo['horario-matutino-2026.pdf'].md5 !== porArquivo['horario-vespertino-2026.pdf'].md5, { matutino: porArquivo['horario-matutino-2026.pdf'].md5, vespertino: porArquivo['horario-vespertino-2026.pdf'].md5 });
gate('D8_nenhum_asset_do_bundle_e_o_miudo_falso', espNovo.assets.every(a => a.md5 !== fake.md5), { total: espNovo.assets.length, falso: fake.md5 });
gate('D9_linhagem_da_substituicao_provada', espNovo.substituidos.length === 2 && espNovo.substituidos.every(s => s.md5Antigo === fake.md5 && s.md5Novo !== fake.md5 && s.paginas >= 1 && s.imagens >= 1), { substituidos: espNovo.substituidos.map(s => `${s.arquivo}: ${s.md5Antigo} -> ${s.md5Novo}`) });
gate('D10_wrangler_aponta_para_o_mesmo_worker', (() => { const t = fs.readFileSync(`${NOVO}/wrangler.toml`, 'utf8'); return /name\s*=\s*"bfr-conecta"/.test(t) && /\[assets\][\s\S]*directory\s*=\s*"\.\/public"/.test(t); })(), { toml: fs.readFileSync(`${NOVO}/wrangler.toml`, 'utf8').replace(/\s+/g, ' ').slice(0, 240) });
gate('D11_sw_reverso_disponivel', fs.existsSync(`${NOVO}/sw-${espBase.cacheLabel.replace('bfr-conecta-', '')}-embed.js`) && md5(fs.readFileSync(`${NOVO}/sw-${espBase.cacheLabel.replace('bfr-conecta-', '')}-embed.js`)) === espBase.swMd5, { ficheiro: `sw-${espBase.cacheLabel.replace('bfr-conecta-', '')}-embed.js`, md5: espBase.swMd5 });

out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'PREFLIGHT_V123_OK' : 'PREFLIGHT_V123_VERMELHO';
out.totais = { portoes: Object.keys(out).filter(k => /^(A|D)\d/.test(k)).length, vermelhos: falhas.length };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
for (const k of Object.keys(out).filter(k => /^(A|D)\d/.test(k))) console.log(`${out[k].passou ? 'OK  ' : 'RED '} ${k}${out[k].passou ? '' : ' ' + JSON.stringify(out[k]).slice(0, 300)}`);
console.log(`\nveredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
console.log(`ar_shell=${shell.md5} sw_rotulo=${rotuloAr} matutino_ar=${m.bytes}B ${m.magica.trim()} calendario_ar=${cal.magica.trim()}`);
console.log(`bundle_worker=${md5(wNovo)} etiqueta=${espNovo.cacheLabel} matutino_novo=${porArquivo['horario-matutino-2026.pdf'].bytes}B`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
