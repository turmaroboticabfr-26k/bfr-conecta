// V137 — gerador do bundle do Worker para a candidata v137 (remendo PEN-40, NÃO publicada): o
// worker publicado da v136 (worker-deploy-v136-secretaria-de-educacao) recebe (a) o módulo
// bfr-responsive-presentation.js remendado (bfr-candidata-v137-remendo-pen40/) no public/ e
// (b) o bump da etiqueta do SW de bfr-conecta-v136 para bfr-conecta-v137 — a etiqueta tem o mesmo
// comprimento (15 caracteres), o fetch é network-first e o bump força a reinstalação do SW, que
// re-precacheia o módulo remendado. O embed HTML, CSP, FRAME_GUARD, NOFOUNDR e _headers ficam
// byte a byte. 0 deploy, 0 DDL, 0 escrita no ar. Única escrita: worker-deploy-v137-remendo-pen40
// (abort-if-exists => verifica byte a byte) e esperado-v137.json. A PUBLICAÇÃO exige OK literal novo.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v136-secretaria-de-educacao`;
const NOVO = `${DIR}/worker-deploy-v137-remendo-pen40`;
const MOD_CAND = `${DIR}/bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v137-remendo-pen40/portoes-v137-remendo-pen40.json`, 'utf8'));
const ESP136 = JSON.parse(readFileSync(`${BASE}/esperado-v136.json`, 'utf8'));
const EV_OUT = `${DIR}/evidence/v137-gera-bundle-20-11.json`;
const EV_TXT = `${DIR}/evidence/v137-gera-bundle-20-11.txt`;
const EV_OUT_V = `${DIR}/evidence/v137-gera-bundle-20-11-VERMELHO.json`;
const EV_TXT_V = `${DIR}/evidence/v137-gera-bundle-20-11-VERMELHO.txt`;
if ([EV_OUT, EV_TXT, EV_OUT_V, EV_TXT_V].some((f) => existsSync(f)))
  throw new Error('ABORTA: artefacto de evidência já existe — renomeie como ANTERIOR e re-corra');
const MODULO_NAO_PUBLICAR = '(sem OK literal — candidata pronta; a publicacao exige OK literal novo)';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const n = (t, x) => t.split(x).length - 1;
const out = { em: new Date().toISOString(), gerador: 'scripts/v137-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v136-secretaria-de-educacao (a v136 publicada 19/11 com o nome «Secretaria de Educação»)',
  candidata: 'bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js',
  ok_literal: MODULO_NAO_PUBLICAR,
  nota_ok_literal: 'bundle de candidata: NÃO publica nada. A publicação (deploy) exige OK literal novo, à semelhança da v136',
  portoes: {}, total: { ok: 0, falha: 0 } };
const checa = (nome, valor, esperado, extra) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { passou, ...(extra || {}) };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
};
const falhou = () => {
  const linhas = [`VERMELHOS: ${Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ')}`];
  writeFileSync(EV_OUT_V, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(EV_TXT_V, linhas.join('\n') + '\nnode_exit=1\n');
  console.error(linhas[0]);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);

// ---- 1) a base e exactamente o worker publicado como v136 ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_o_publicado_v136', md5(Buffer.from(baseTxt)), ESP136.workerMd5,
  { bytes: Buffer.byteLength(baseTxt), esperado_bytes: ESP136.workerBytes });

// ---- 2) extrai os embeds da base ----
const extrai = (src, marcador) => {
  const j = src.indexOf(marcador);
  if (j < 0) return null;
  const q = src.indexOf('"', j + marcador.length);
  let k = q + 1;
  while (true) {
    const c = src.indexOf('"', k);
    if (c < 0) return null;
    let bs = 0, i = c - 1;
    while (src[i] === '\\') { bs++; i--; }
    if (bs % 2 === 0) return { ini: q, fim: c + 1, corpo: JSON.parse(src.slice(q, c + 1)) };
    k = c + 1;
  }
};
const eHtml = extrai(baseTxt, 'const HTML = ');
const eSw = extrai(baseTxt, 'const SW = ');
if (!eHtml || !eSw) { console.error('ABORTO: embeds nao extraiveis da base'); process.exit(1); }
checa('S2_embed_html_da_base_e_a_shell_publicada', md5(Buffer.from(eHtml.corpo)), ESP136.htmlMd5,
  { bytes: Buffer.byteLength(eHtml.corpo), esperado_bytes: ESP136.htmlBytes });
checa('S3_etiqueta_v136_uma_vez_no_texto_do_worker', n(baseTxt, "'bfr-conecta-v136'"), 1);
checa('S3b_worker_base_sem_a_etiqueta_v137', n(baseTxt, "'bfr-conecta-v137'"), 0);

// ---- 3) a candidata do módulo (remendo PEN-40) ----
const modTxt = readFileSync(MOD_CAND, 'utf8');
checa('S4_module_candidato_e_o_gateado_pelo_remendo', md5(Buffer.from(modTxt)), PORT_CAND.saida.md5,
  { medido: regua(md5(Buffer.from(modTxt)), Buffer.byteLength(modTxt)), veredito_do_remendo: PORT_CAND.veredito });
checa('S4b_module_publicado_v136_e_a_origem_do_remendo', md5(readFileSync(`${BASE}/public/bfr-responsive-presentation.js`)), PORT_CAND.origem.md5,
  { medido: regua(md5(readFileSync(`${BASE}/public/bfr-responsive-presentation.js`)), Buffer.byteLength(readFileSync(`${BASE}/public/bfr-responsive-presentation.js`))) });
checa('S4c_pen40_dentro_do_module_candidato', {
  ensureChromeMontado: n(modTxt, 'ensureChromeMontado'),
  bloco_velho: n(modTxt, '  const pintaSozinho = () => { timer = null; desde = Date.now(); paintHighlight(); };'),
  piso_teto: n(modTxt, 'const PISO = 60, TETO = 250;') }, { ensureChromeMontado: 2, bloco_velho: 0, piso_teto: 1 });
checa('S4d_remendo_correu_todo_verde', typeof PORT_CAND.veredito === 'string' && PORT_CAND.veredito.startsWith('V137_REMENDO_OK'), true, { veredito: PORT_CAND.veredito });

// ---- 4) cirurgia: só a etiqueta do SW muda no worker (o HTML fica intocado) ----
const ancSw = "const SW = \"const CACHE = 'bfr-conecta-v136';";
checa('S5_ancora_da_etiqueta_presente_uma_vez', n(baseTxt, ancSw), 1);
const workerNovo = baseTxt.replace(ancSw, "const SW = \"const CACHE = 'bfr-conecta-v137';");
checa('S6_etiqueta_nova_dentro_e_velha_fora', { v137: n(workerNovo, "'bfr-conecta-v137'"), v136: n(workerNovo, "'bfr-conecta-v136'") },
  { v137: 1, v136: 0 });
checa('S6b_embed_html_intocado_byte_a_byte', workerNovo.slice(eHtml.ini, eHtml.fim) === baseTxt.slice(eHtml.ini, eHtml.fim), true);

// ---- 5) compila e re-extrai ----
const tmp = `${DIR}/worker-deploy-v137-remendo-pen40.worker-check.tmp.mjs`;
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
unlinkSync(tmp);
checa('S7_worker_novo_compila', compila, true, { erro: erroCompil });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('S8_embed_html_re-extraido_bate_com_o_publicado', reExtrai ? md5(Buffer.from(reExtrai.corpo)) : null, ESP136.htmlMd5);
const swNovoExtrai = extrai(workerNovo, 'const SW = ');
checa('S9_sw_embutido_re-extraido_com_etiqueta_v137', swNovoExtrai
  ? { v137: n(swNovoExtrai.corpo, "'bfr-conecta-v137'"), v136: n(swNovoExtrai.corpo, "'bfr-conecta-v136'"), bytes: Buffer.byteLength(swNovoExtrai.corpo) }
  : null, { v137: 1, v136: 0, bytes: ESP136.swBytes });
checa('S10_um_unico_embed_de_cada', { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') },
  { html: 1, sw: 1, csp: 1 });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S11_csp_intacta_e_permite_supabase_e_frame_ancestors',
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo,
    supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : ''),
    frame_ancestors: /frame-ancestors 'self'/.test(eCspNovo ? eCspNovo.corpo : '') },
  { csp_igual: true, supabase_connect: true, frame_ancestors: true });
checa('S12_cirurgia_v136_preservada_no_worker_novo', {
  frame_guard: n(workerNovo, 'FRAME_GUARD'), x_frame: n(workerNovo, "x-frame-options"), h_set: n(workerNovo, "h.set('content-security-policy', FRAME_GUARD)"),
  frame_ancestors_total: n(workerNovo, 'frame-ancestors') }, { frame_guard: 2, x_frame: 2, h_set: 1, frame_ancestors_total: 2 });

if (out.total.falha) falhou();

// ---- 6) escreve (ou verifica) o diretorio novo ----
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of readdirSync(`${BASE}/public`).sort()) {
    if (f === 'bfr-responsive-presentation.js') continue;
    copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  }
  writeFileSync(`${NOVO}/public/bfr-responsive-presentation.js`, modTxt);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const assets = readdirSync(`${BASE}/public`).sort();
checa('S13_12_assets_byte_a_byte_e_module_remendado',
  assets.length === 13
    && assets.every((f) => existsSync(`${NOVO}/public/${f}`))
    && assets.filter((f) => f !== 'bfr-responsive-presentation.js').every((f) => readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`)))
    && md5(readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`)) === PORT_CAND.saida.md5,
  true,
  { total: assets.length, lista: assets, inclui_headers: assets.includes('_headers'),
    module_novo_md5: md5(readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`)),
    module_novo_esperado: PORT_CAND.saida.md5 });
checa('S14_headers_com_o_md5_da_v136', md5(readFileSync(`${NOVO}/public/_headers`)), ESP136.headersMd5);
checa('S15_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S16_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S17_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(Buffer.from(workerNovo)), workerBytes: Buffer.byteLength(workerNovo),
  swMd5: md5(Buffer.from(swNovoExtrai ? swNovoExtrai.corpo : '')), swBytes: ESP136.swBytes,
  htmlMd5: ESP136.htmlMd5, htmlBytes: ESP136.htmlBytes,
  cacheLabel: 'bfr-conecta-v137',
  baseWorkerMd5: ESP136.workerMd5, baseWorkerBytes: ESP136.workerBytes,
  baseSwMd5: ESP136.swMd5, baseSwBytes: ESP136.swBytes,
  baseHtmlMd5: ESP136.htmlMd5, baseHtmlBytes: ESP136.htmlBytes,
  headersMd5: ESP136.headersMd5, headersBytes: ESP136.headersBytes,
  deltaWorkerBytes: Buffer.byteLength(workerNovo) - ESP136.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  ok_literal: MODULO_NAO_PUBLICAR,
  moduleMd5: PORT_CAND.saida.md5, moduleBytes: Buffer.byteLength(modTxt),
  origemReguas: ['worker-deploy-v136-secretaria-de-educacao/esperado-v136.json', MOD_CAND, 'public/_headers (mecanismo de headers dos assets)'],
};
checa('S18_regua_do_delta_consistente', reguas.deltaWorkerBytes, 0);
checa('S19_module_no_bundle_e_o_candidato', { md5: md5(readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`)), bytes: Buffer.byteLength(modTxt) },
  { md5: PORT_CAND.saida.md5, bytes: PORT_CAND.saida.bytes });
if (out.total.falha) falhou();
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
out.portoes_resumo = `${out.total.ok}/${out.total.falha}`;
out.veredito = out.total.falha ? `V137_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}` : `V137_BUNDLE_OK ${out.total.ok}/${out.total.falha}`;
writeFileSync(`${NOVO}/esperado-v137.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
const linhas = [
  out.veredito,
  `escrito ${NOVO} — worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5} module=${reguas.moduleMd5}`,
  `publicado=${out.publicado} ok_literal=${MODULO_NAO_PUBLICAR}`,
];
writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(`escrito ${NOVO} — ${out.veredito}  worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5} module=${reguas.moduleMd5}`);
process.exit(out.total.falha ? 1 : 0);
