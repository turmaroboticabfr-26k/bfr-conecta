// V134 — gerador do bundle do Worker para a PUBLICACAO da v134 (a correcao do defeito aberto em
// §SM.21: o bloco sm8-fix da v133 forcou a sidebar do desktop visivel em <=800px contra
// `#appShell.ready>.sidebar{display:none!important}` do asset de apresentacao, e o varrimento
// por papel marcou o portao «a app declarou-se em apresentacao mobile» em 12/12 bandas).
// A candidata v134 e a v133 SEM o bloco <style id="bfr-mobile-nav-sm8-fix"> (8/0 em
// scripts/v134-gera-candidata.mjs): modulo municipal, fecharGaveta e safe-area fix intactos.
// 0 deploy, 0 DDL, 0 escrita no ar. A unica escrita e worker-deploy-v134-sidebar (abort-if-exists
// no directorio => verifica byte a byte) e o esperado-v134.json. A base do bundle e
// worker-deploy-v123-pdfs (a base de embeds que nunca mudou); o que esta no ar e a v133
// (de82cec5, lido de evidence/v133-deployments-status-depois-18-11.json).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v123-pdfs`;
const NOVO = `${DIR}/worker-deploy-v134-sidebar`;
const CAND = `${DIR}/bfr-candidata-v134-sidebar-escondida/index.html`;
const MD5_CAND_ESPERADO = 'b272fd4f3a737c518e888250ab8167f1';
const ESP_BASE = JSON.parse(readFileSync(`${BASE}/esperado-v123.json`, 'utf8'));
const EV_OUT = `${DIR}/evidence/v134-gera-bundle-18-11.json`;
if (existsSync(EV_OUT)) throw new Error('ABORTA: ' + EV_OUT + ' existe — renomeie como ANTERIOR e re-corra');
const OK_LITERAL = 'Corrigir com v134'; // a opcao selecionada, cuja descricao incluia o novo deploy e o push

const md5 = (b) => createHash('md5').update(b).digest('hex');
const regua = (m, b) => `${m} (${b} B)`;
const out = { em: new Date().toISOString(), gerador: 'scripts/v134-gera-bundle.mjs', publicado: false,
  base: 'worker-deploy-v123-pdfs (base de embeds; o ar esta na v133 de82cec5 — evidence/v133-deployments-status-depois-18-11.json)',
  candidata: 'bfr-candidata-v134-sidebar-escondida/index.html',
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

// ---- 1) a base de embeds e exatamente a publicada como v123 ----
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
checa('S1_base_worker_e_a_publicada_v123', md5(Buffer.from(baseTxt)), ESP_BASE.workerMd5);

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
checa('S2_embed_html_da_base_e_a_shell_v123', md5(Buffer.from(eHtml.corpo)), ESP_BASE.htmlMd5);
checa('S3_embed_sw_da_base_tem_etiqueta_v123_uma_vez', (eSw.corpo.match(/bfr-conecta-v123/g) || []).length, 1);
checa('S3b_sw_da_base_sem_as_etiquetas_novas', (eSw.corpo.match(/bfr-conecta-v13[34]/g) || []).length, 0);

// ---- 3) a candidata v134 ----
const candTxt = readFileSync(CAND, 'utf8');
checa('S4_candidata_v134_e_a_gateada', md5(Buffer.from(candTxt)), MD5_CAND_ESPERADO,
  { medido: regua(md5(Buffer.from(candTxt)), Buffer.byteLength(candTxt)) });
checa('S4b_candidata_sem_o_bloco_sm8_fix', (candTxt.match(/bfr-mobile-nav-sm8-fix/g) || []).length, 0);
checa('S4c_candidata_conserva_o_que_nao_e_o_bloco', { safe_area: (candTxt.match(/bfr-mobile-nav-safe-area-fix/g) || []).length,
  fecharGaveta: (candTxt.match(/fecharGaveta/g) || []).length, nav_municipal: (candTxt.match(/data-bfr-municipal-nav/g) || []).length },
  { safe_area: 1, fecharGaveta: 2, nav_municipal: 3 });
checa('S5_candidata_registra_sw_v4_com_v45', (candTxt.match(/sw-v4\.js\?v=45/g) || []).length >= 1, true,
  { ocorrencias: (candTxt.match(/sw-v4\.js\?v=45/g) || []).length });
checa('S5b_candidata_sem_etiquetas_de_cache_antigas', (candTxt.match(/bfr-conecta-v1[23][0-9]/g) || []).length, 0);

// ---- 4) cirurgia ----
const novoHtml = JSON.stringify(candTxt);
const novoSw = eSw.corpo.replace("'bfr-conecta-v123'", "'bfr-conecta-v134'");
checa('S6_sw_novo_com_etiqueta_v134_uma_vez', (novoSw.match(/bfr-conecta-v134/g) || []).length, 1);
checa('S6b_sw_novo_sem_etiqueta_v123', (novoSw.match(/bfr-conecta-v123/g) || []).length, 0);
checa('S6c_so_a_etiqueta_mudou_no_sw', Buffer.byteLength(novoSw) === Buffer.byteLength(eSw.corpo), true,
  { bytes_antes: Buffer.byteLength(eSw.corpo), bytes_depois: Buffer.byteLength(novoSw) });
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim))
  .replace(/const SW = "const CACHE = 'bfr-conecta-v123';/, `const SW = "const CACHE = 'bfr-conecta-v134';`);

// ---- 5) compila e re-extrai ----
const tmp = `${DIR}/worker-deploy-v134-sidebar.worker-check.tmp.mjs`;
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
checa('S9_sw_embutido_re-extraido_bate_com_o_novo', swNovoExtrai ? md5(Buffer.from(swNovoExtrai.corpo)) : null, md5(Buffer.from(novoSw)));
checa('S10_um_unico_embed_de_cada', { html: (workerNovo.match(/const HTML = /g) || []).length, sw: (workerNovo.match(/const SW = /g) || []).length },
  { html: 1, sw: 1 });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('S11_csp_intacta_e_permite_supabase',
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo,
    supabase_connect: /\*\.supabase\.co/.test(eCspNovo ? eCspNovo.corpo : '') },
  { csp_igual: true, supabase_connect: true });

if (out.total.falha) falhou();

// ---- 6) escreve (ou verifica) o diretorio novo ----
const reguaDeltaEsperada = Buffer.byteLength(novoHtml) - Buffer.byteLength(baseTxt.slice(eHtml.ini, eHtml.fim));
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of readdirSync(`${BASE}/public`).sort()) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const assets = readdirSync(`${BASE}/public`).sort();
checa('S12_12_assets_copiados_byte_a_byte', assets.every((f) => existsSync(`${NOVO}/public/${f}`) && readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`))), true,
  { total: assets.length, lista: assets });
checa('S13_wrangler_toml_identico', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('S13b_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('S13c_dir_ja_existia_ou_foi_escrito_agora', jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora',
  jaExistia ? 'verificado_sem_reescrever' : 'escrito_agora');

const reguas = {
  workerMd5: md5(Buffer.from(workerNovo)), workerBytes: Buffer.byteLength(workerNovo),
  swMd5: md5(Buffer.from(novoSw)), swBytes: Buffer.byteLength(novoSw),
  htmlMd5: md5(Buffer.from(candTxt)), htmlBytes: Buffer.byteLength(candTxt),
  cacheLabel: 'bfr-conecta-v134',
  baseWorkerMd5: ESP_BASE.workerMd5, baseWorkerBytes: ESP_BASE.workerBytes,
  baseSwMd5: ESP_BASE.swMd5, baseSwBytes: ESP_BASE.swBytes,
  baseHtmlMd5: ESP_BASE.htmlMd5, baseHtmlBytes: ESP_BASE.htmlBytes,
  deltaWorkerBytes: Buffer.byteLength(workerNovo) - ESP_BASE.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  ok_literal: OK_LITERAL,
  origemReguas: ['worker-deploy-v123-pdfs/esperado-v123.json', CAND, 'evidence/v133-deployments-status-depois-18-11.json'],
};
checa('S14_regua_do_delta_consistente', reguas.deltaWorkerBytes, reguaDeltaEsperada);
if (out.total.falha) falhou();
out.md5 = Object.fromEntries(Object.entries(reguas).map(([k, v]) => [k, /Bytes$|^delta|^assets|^precache/.test(k) ? v : regua(v, reguas[`${k.replace(/Md5$/, 'Bytes')}`])]));
out.esperado = reguas;
out.portoes_resumo = `${out.total.ok}/${out.total.falha}`;
out.veredito = out.total.falha ? `V134_BUNDLE_FALHOU ${out.total.ok}/${out.total.falha}` : `V134_BUNDLE_OK ${out.total.ok}/${out.total.falha}`;
writeFileSync(`${NOVO}/esperado-v134.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
writeFileSync(EV_OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${NOVO} — ${out.veredito}  worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} sw=${reguas.swMd5} etiqueta=${reguas.cacheLabel}`);
process.exit(out.total.falha ? 1 : 0);
