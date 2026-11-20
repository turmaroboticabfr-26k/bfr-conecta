// V136 — gerador do bundle do Worker para a PUBLICACAO da v136: a candidata v136 (PEN-30 re-aplicado
// + nome único «Secretaria de Educação», gateada em scripts/v136-gera-candidata.mjs) entra no embed
// HTML; a etiqueta do SW passa de bfr-conecta-v135 para bfr-conecta-v136. Base: worker-deploy-v135-headers
// (a v135 publicada 19/11 com o mecanismo public/_headers). CSP, FRAME_GUARD, NOFOUNDR e _headers
// ficam byte-a-byte. 0 deploy, 0 DDL, 0 escrita no ar. Única escrita: worker-deploy-v136-secretaria-de-educacao
// (abort-if-exists => verifica byte a byte) e esperado-v136.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v135-headers`;
const NOVO = `${DIR}/worker-deploy-v136-secretaria-de-educacao`;
const CAND = `${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json`, 'utf8'));
const ESP135 = JSON.parse(readFileSync(`${BASE}/esperado-v135.json`, 'utf8'));
const EV_OUT = `${DIR}/evidence/v136-gera-bundle-19-11.json`;
if (existsSync(EV_OUT)) throw new Error('ABORTA: ' + EV_OUT + ' existe — renomeie como ANTERIOR e re-corra');
const OK_LITERAL = 'Sim, publicar ambos (v124+v125 sobre a base v134)';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const n = (t, x) => t.split(x).length - 1;
const out = { em: new Date().toISOString(), gerador: 'scripts/v136-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v135-headers (v135 publicada 19/11; o ar esta na v135 f5c157f2)',
  candidata: 'bfr-candidata-v136-secretaria-de-educacao/index.html',
  ok_literal: OK_LITERAL,
  nota_ok_literal: 'selecionada na pergunta de remediacao de 18/11; a opcao declarava «gerador/preflight/deploy/pos-deploy novos e re-varredura» e «precisa de OK literal para o novo deploy e push» — e esse o ambito deste ciclo',
  portoes: {}, total: { ok: 0, falha: 0 } };
const checa = (nome, valor, esperado, extra) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { passou, ...(extra || {}) };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
};
const falhou = () => {
  writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
  console.error(`VERMELHOS: ${Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ')}`);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);

// ---- 1) a base e exactamente o worker publicado como v135 ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_o_publicado_v135', md5(Buffer.from(baseTxt)), ESP135.workerMd5,
  { bytes: Buffer.byteLength(baseTxt), esperado_bytes: ESP135.workerBytes });

// ---- 2) extrai os dois embeds da base ----
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
checa('S2_embed_html_da_base_e_a_shell_v134', md5(Buffer.from(eHtml.corpo)), ESP135.htmlMd5,
  { bytes: Buffer.byteLength(eHtml.corpo), esperado_bytes: ESP135.htmlBytes });
checa('S3_etiqueta_v135_uma_vez_no_texto_do_worker', n(baseTxt, "'bfr-conecta-v135'"), 1);
checa('S3b_worker_base_sem_a_etiqueta_v136', n(baseTxt, "'bfr-conecta-v136'"), 0);

// ---- 3) a candidata v136 ----
const candTxt = readFileSync(CAND, 'utf8');
checa('S4_candidata_e_a_gateada_v136', md5(Buffer.from(candTxt)), PORT_CAND.saida.index_md5,
  { medido: regua(md5(Buffer.from(candTxt)), Buffer.byteLength(candTxt)), veredito_da_candidata: PORT_CAND.veredito });
checa('S4b_candidata_difere_da_shell_v134', md5(Buffer.from(candTxt)) !== ESP135.htmlMd5, true);
checa('S4c_pen30_dentro_da_candidata', {
  novo: n(candTxt, `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,important,meeting_id').order('published_at',{ascending:false,nullsFirst:false}).limit(100)`),
  velho: n(candTxt, `client.from('announcements').select('id,title,body,message_type,status,published_at,scheduled_at,created_at,important,meeting_id').order('created_at',{ascending:false}).limit(100)`),
  centro_gestao: n(candTxt, 'Centro de Gestão da Educação'),
  h1_nome: n(candTxt, '<h1>Secretaria de Educação.</h1>') }, { novo: 1, velho: 0, centro_gestao: 0, h1_nome: 3 });

// ---- 4) cirurgia: troca o embed HTML e a etiqueta do SW ----
const novoHtml = JSON.stringify(candTxt);
const ancSw = "const SW = \"const CACHE = 'bfr-conecta-v135';";
checa('S5_ancora_da_etiqueta_presente_uma_vez', n(baseTxt, ancSw), 1);
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim))
  .replace(ancSw, "const SW = \"const CACHE = 'bfr-conecta-v136';");
checa('S6_etiqueta_nova_dentro_e_velha_fora', { v136: n(workerNovo, "'bfr-conecta-v136'"), v135: n(workerNovo, "'bfr-conecta-v135'") },
  { v136: 1, v135: 0 });

// ---- 5) compila e re-extrai ----
const tmp = `${DIR}/worker-deploy-v136-secretaria-de-educacao.worker-check.tmp.mjs`;
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
const erroCompil = compila ? null : (chk.stderr || chk.stdout || '').trim();
unlinkSync(tmp);
checa('S7_worker_novo_compila', compila, true, { erro: erroCompil });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('S8_embed_novo_re-extraido_bate_com_a_candidata', reExtrai ? md5(Buffer.from(reExtrai.corpo)) : null, md5(Buffer.from(candTxt)));
checa('S8b_embed_novo_e_json_stringify_da_candidata', reExtrai ? (workerNovo.slice(reExtrai.ini, reExtrai.fim) === novoHtml) : false, true);
const swNovoExtrai = extrai(workerNovo, 'const SW = ');
checa('S9_sw_embutido_re-extraido_com_etiqueta_v136', swNovoExtrai
  ? { v136: n(swNovoExtrai.corpo, "'bfr-conecta-v136'"), v135: n(swNovoExtrai.corpo, "'bfr-conecta-v135'"), bytes: Buffer.byteLength(swNovoExtrai.corpo) }
  : null, { v136: 1, v135: 0, bytes: ESP135.swBytes });
checa('S10_um_unico_embed_de_cada', { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') },
  { html: 1, sw: 1, csp: 1 });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S11_csp_intacta_e_permite_supabase_e_frame_ancestors',
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo,
    supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : ''),
    frame_ancestors: /frame-ancestors 'self'/.test(eCspNovo ? eCspNovo.corpo : '') },
  { csp_igual: true, supabase_connect: true, frame_ancestors: true });
checa('S12_cirurgia_v135_preservada_no_worker_novo', {
  frame_guard: n(workerNovo, 'FRAME_GUARD'), x_frame: n(workerNovo, "x-frame-options"), h_set: n(workerNovo, "h.set('content-security-policy', FRAME_GUARD)"),
  frame_ancestors_total: n(workerNovo, 'frame-ancestors') }, { frame_guard: 2, x_frame: 2, h_set: 1, frame_ancestors_total: 2 });

if (out.total.falha) falhou();

// ---- 6) escreve (ou verifica) o diretorio novo ----
const deltaEsperado = Buffer.byteLength(novoHtml) - Buffer.byteLength(baseTxt.slice(eHtml.ini, eHtml.fim));
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of readdirSync(`${BASE}/public`).sort()) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const assets = readdirSync(`${BASE}/public`).sort();
checa('S13_12_assets_e_headers_copiados_byte_a_byte',
  assets.length === 13 && assets.every((f) => existsSync(`${NOVO}/public/${f}`) && readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`))), true,
  { total: assets.length, lista: assets, inclui_headers: assets.includes('_headers') });
checa('S14_headers_com_o_md5_da_v135', md5(readFileSync(`${NOVO}/public/_headers`)), ESP135.headersMd5);
checa('S15_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S16_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S17_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(Buffer.from(workerNovo)), workerBytes: Buffer.byteLength(workerNovo),
  swMd5: md5(Buffer.from(swNovoExtrai ? swNovoExtrai.corpo : '')), swBytes: ESP135.swBytes,
  htmlMd5: md5(Buffer.from(candTxt)), htmlBytes: Buffer.byteLength(candTxt),
  cacheLabel: 'bfr-conecta-v136',
  baseWorkerMd5: ESP135.workerMd5, baseWorkerBytes: ESP135.workerBytes,
  baseSwMd5: ESP135.swMd5, baseSwBytes: ESP135.swBytes,
  baseHtmlMd5: ESP135.htmlMd5, baseHtmlBytes: ESP135.htmlBytes,
  headersMd5: ESP135.headersMd5, headersBytes: ESP135.headersBytes,
  deltaWorkerBytes: Buffer.byteLength(workerNovo) - ESP135.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  ok_literal: OK_LITERAL,
  origemReguas: ['worker-deploy-v135-headers/esperado-v135.json', CAND, 'public/_headers (mecanismo de headers dos assets)'],
};
checa('S18_regua_do_delta_consistente', reguas.deltaWorkerBytes, deltaEsperado);
if (out.total.falha) falhou();
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
out.portoes_resumo = `${out.total.ok}/${out.total.falha}`;
out.veredito = out.total.falha ? `V136_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}` : `V136_BUNDLE_OK ${out.total.ok}/${out.total.falha}`;
writeFileSync(`${NOVO}/esperado-v136.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${NOVO} — ${out.veredito}  worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5}`);
process.exit(out.total.falha ? 1 : 0);
