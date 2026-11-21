// P98 — BUNDLE DO WORKER PARA A v141, SEM PUBLICAR (21/11, madrugada).
//
// O que está medido e manda aqui:
//  · Cadeia certificada: p85 → v139 (sonda honesta), p87 → v140 (trilha de acesso, PUBLICADA e conferida pela P95),
//    p97 → v141 (caixa vazia). A v141 é gerada sobre a candidata v140 cujo md5 o registo do p87 certifica, pelo
//    que publicar a v141 leva dentro a sonda honesta e a trilha — não é escolha entre versões.
//  · A base do bundle é `worker-deploy-v140-trilha-de-acesso`: é o worker que está no ar, com o módulo remendado
//    da PEN-40 e os `_headers`. Trocar de base perderia o que já foi conferido no ar — regressão.
//  · Esta peça NÃO publica. O `wrangler deploy` é outro passo e já tem OK do utilizador (21/11, peça escolhida).
//
// Regras: 0 deploy, 0 DDL, 0 escrita no banco. Escrita única em worker-deploy-v141-caixa-vazia/ e em evidence/.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = `${DIR}/worker-deploy-v140-trilha-de-acesso`;
const NOVO = `${DIR}/worker-deploy-v141-caixa-vazia`;
const CAND = `${DIR}/bfr-candidata-v141-caixa-vazia/index.html`;
const PORT_CAND = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v141-caixa-vazia/portoes-v141-candidata.json`, 'utf8'));
const CAND140 = `${DIR}/bfr-candidata-v140-trilha-de-acesso/index.html`;
const PORT140 = JSON.parse(readFileSync(`${DIR}/bfr-candidata-v140-trilha-de-acesso/portoes-v140-candidata.json`, 'utf8'));
const ESP = JSON.parse(readFileSync(`${BASE}/esperado-v140.json`, 'utf8'));
const DDL39 = `${DIR}/scripts/p73-pen39-ddl-candidata.sql`;
const DDL4 = `${DIR}/scripts/sm4-ddl-municipal-candidata.sql`;
const DIARIO = readdirSync(DIR).filter((f) => /^audit-publicacao-v\d+\.json$/.test(f)).sort((a, b) => parseInt(/v(\d+)/.exec(a)[1], 10) - parseInt(/v(\d+)/.exec(b)[1], 10)).slice(-1)[0];
const V_PUBLICADA = /v(\d+)/.exec(DIARIO)[1];
const EV = `${DIR}/evidence/p98-gera-bundle-v141-21-11.json`;
const EV_TXT = `${DIR}/evidence/p98-gera-bundle-v141-21-11.txt`;
const EV_V = `${DIR}/evidence/p98-gera-bundle-v141-21-11-VERMELHO.json`;
const EV_V_TXT = `${DIR}/evidence/p98-gera-bundle-v141-21-11-VERMELHO.txt`;
if ([EV, EV_TXT, EV_V, EV_V_TXT].some((f) => existsSync(f))) throw new Error('ABORTA: artefacto de evidência já existe — use nome novo, nunca por cima');

const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const B = (s) => Buffer.byteLength(s);
const out = {
  em: new Date().toISOString(), gerador: 'scripts/p98-gera-bundle-v141.mjs', publicado: false,
  base: 'worker-deploy-v140-trilha-de-acesso (e o worker que esta no ar: modulos PEN-40 + _headers ja conferidos)',
  candidata: 'bfr-candidata-v141-caixa-vazia/index.html',
  cadeia_candidata: 'v138 -> p85 (v139 sonda honesta) -> p87 (v140 trilha, publicada) -> p97 (v141 caixa vazia)',
  ar_no_momento: { diario_mais_novo: DIARIO, versao_publicada: V_PUBLICADA },
  ok_literal: 'peca escolhida pelo utilizador em 21/11: esconder a caixa 0x0 e publicar a v141',
  portoes: {}, total: { ok: 0, falha: 0 },
};
const checa = (nome, passou, detalhe) => { out.portoes[nome] = { passou: passou === true, detalhe }; out.total[passou === true ? 'ok' : 'falha'] += 1; return passou === true; };
const falhou = () => {
  const lista = Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', ');
  out.veredito = `P98_BUNDLE_V141_FALHOU ${out.total.ok}/${out.total.falha}`;
  writeFileSync(EV_V, JSON.stringify(out, null, 2) + '\n');
  writeFileSync(EV_V_TXT, `VERMELHOS: ${lista}\nnode_exit=1\n`);
  console.error(`VERMELHOS: ${lista}`);
  process.exit(1);
};

const jaExistia = existsSync(NOVO);
const baseTxt = readFileSync(`${BASE}/worker.mjs`, 'utf8');
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
if (!eHtml || !eSw) throw new Error('ABORTA: embeds nao extraiveis da base');

// ---- 1) a base é o worker publicado da v140 tal como o seu próprio esperado o registou ----
checa('T1_base_worker_e_o_bundle_v140_do_seu_esperado', md5(baseTxt) === ESP.workerMd5 && B(baseTxt) === ESP.workerBytes,
  { lido: { md5: md5(baseTxt), bytes: B(baseTxt) }, esperado: { md5: ESP.workerMd5, bytes: ESP.workerBytes } });
checa('T2_embed_html_da_base_e_a_candidata_v140_certificada', md5(eHtml.corpo) === ESP.htmlMd5 && B(eHtml.corpo) === ESP.htmlBytes,
  { lido: { md5: md5(eHtml.corpo), bytes: B(eHtml.corpo) }, esperado: { md5: ESP.htmlMd5, bytes: ESP.htmlBytes } });
checa('T3_etiqueta_v140_uma_vez_e_v141_zero_na_base', n(baseTxt, "'bfr-conecta-v140'") === 1 && n(baseTxt, "'bfr-conecta-v141'") === 0,
  { v140: n(baseTxt, "'bfr-conecta-v140'"), v141: n(baseTxt, "'bfr-conecta-v141'") });

// ---- 2) a candidata v141 conferida contra os portões dela e contra a cadeia ----
const candTxt = readFileSync(CAND, 'utf8');
const cand140Txt = readFileSync(CAND140, 'utf8');
checa('T4_candidata_bate_com_a_saida_certificada_do_p97', md5(candTxt) === PORT_CAND.destino.md5 && B(candTxt) === PORT_CAND.destino.bytes,
  { lido: { md5: md5(candTxt), bytes: B(candTxt) }, certificado: PORT_CAND.destino, veredito: PORT_CAND.veredito });
checa('T4b_veredito_da_candidata_ok', String(PORT_CAND.veredito).startsWith('P97_CANDIDATA_V141_CAIXA_VAZIA_OK'), { veredito: PORT_CAND.veredito });
checa('T4c_a_origem_declarada_e_a_v140_que_esta_em_disco_e_esta_certificada',
  PORT_CAND.origem.pasta === 'bfr-candidata-v140-trilha-de-acesso' && md5(cand140Txt) === PORT_CAND.origem.md5 && String(PORT140.veredito).startsWith('P87_CANDIDATA_V140_TRILHA_OK'),
  { pasta_declarada: PORT_CAND.origem.pasta, md5_v140_em_disco: md5(cand140Txt), md5_declarado: PORT_CAND.origem.md5, veredito_v140: PORT140.veredito });
checa('T4d_a_candidata_difere_do_embed_da_base', md5(candTxt) !== ESP.htmlMd5, { base: ESP.htmlMd5, candidata: md5(candTxt), delta_bytes: B(candTxt) - ESP.htmlBytes });

// ---- 3) não-regressão: o que a v140 ganhou, a v141 tem de o manter, byte a byte em contagem ----
const nomes39 = [...readFileSync(DDL39, 'utf8').matchAll(/CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi)].map((m) => m[1]);
if (nomes39.length === 0) throw new Error('ABORTA: 0 funcoes lidas do DDL da PEN-39 — os portoes de regressao ficariam vacuos');
const auditMesas = [...readFileSync(DDL4, 'utf8').matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]).filter((x) => /audit/.test(x));
if (auditMesas.length !== 1) throw new Error('ABORTA: ' + auditMesas.length + ' mesas de trilha no DDL sm4 — a regua nao decidiria');
const MESA_AUDIT = auditMesas[0];
const POR_AUT = 'sonda.autorizada === true';
checa('T5_os_rpc_de_agregado_tem_a_mesma_contagem_em_v140_e_v141_e_estao_presentes',
  nomes39.every((x) => n(candTxt, x) === n(cand140Txt, x) && n(candTxt, x) >= 1), nomes39.map((x) => x + ': v140=' + n(cand140Txt, x) + ' v141=' + n(candTxt, x)));
checa('T5b_a_mesa_de_trilha_nao_ganha_nem_perde_ocorrencias_entre_v140_e_v141', n(candTxt, MESA_AUDIT) === n(cand140Txt, MESA_AUDIT) && n(candTxt, MESA_AUDIT) >= 1,
  { mesa_lida_do_ddl: MESA_AUDIT, v140: n(cand140Txt, MESA_AUDIT), v141: n(candTxt, MESA_AUDIT) });
checa('T6_a_sonda_honesta_da_v139_mantem_a_contagem_na_v141', n(candTxt, POR_AUT) === n(cand140Txt, POR_AUT) && n(candTxt, POR_AUT) >= 1, { v140: n(cand140Txt, POR_AUT), v141: n(candTxt, POR_AUT) });
checa('T7_o_remendo_da_pen40_no_html_mantem_a_contagem_de_entrada', n(candTxt, 'data-bfr-municipal-nav') === n(cand140Txt, 'data-bfr-municipal-nav'), { v140: n(cand140Txt, 'data-bfr-municipal-nav'), v141: n(candTxt, 'data-bfr-municipal-nav') });
// A peça nova, contada: uma função, um consumo, uma exportação — nem mais, nem menos.
checa('T8_a_funcao_nova_aparece_uma_vez_e_a_v140_nao_tinha_uma_vez', n(candTxt, 'function aptoParaVista()') === 1 && n(cand140Txt, 'function aptoParaVista()') === 0 && n(candTxt, 'aptoParaVista();') === 1 && n(candTxt, 'aptoParaVista,') === 1,
  { definicoes: n(candTxt, 'function aptoParaVista()'), chamadas: n(candTxt, 'aptoParaVista();'), exportacoes: n(candTxt, 'aptoParaVista,'), na_v140: n(cand140Txt, 'function aptoParaVista()') });
// Não alargar: a única forma de dar a entrada a mais vistas seria acrescentar chaves ao `concat(SECT)` ou ao
// array de PAPEIS_MUNICIPAIS — as duas contagens têm de ser as da v140.
checa('T9_esta_peca_nao_alarga_a_entrada_a_mais_nenhuma_vista', n(candTxt, 'map[papel].concat(SECT)') === n(cand140Txt, 'map[papel].concat(SECT)') && (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(candTxt) || [''])[0] === (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(cand140Txt) || [''])[0],
  { concat_antes: n(cand140Txt, 'map[papel].concat(SECT)'), concat_depois: n(candTxt, 'map[papel].concat(SECT)'), papeis_v141: (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(candTxt) || [''])[0], igual_a_v140: (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(candTxt) || [''])[0] === (/const PAPEIS_MUNICIPAIS = \[[^\]]*\]/.exec(cand140Txt) || [''])[0] });
const arrTeacher = (t) => ((/teacher:\[([^\]]*)\]/.exec(t) || [])[1] || '');
checa('T10_o_array_estatico_do_teacher_nao_muda_e_continua_sem_a_seccao', arrTeacher(candTxt) === arrTeacher(cand140Txt) && arrTeacher(candTxt).length > 0 && !arrTeacher(candTxt).includes('secretaria-municipal') && !/const PAPEIS_MUNICIPAIS = \[[^\]]*teacher/.test(candTxt),
  { itens_v141: (arrTeacher(candTxt).match(/'/g) || []).length / 2, igual_a_v140: arrTeacher(candTxt) === arrTeacher(cand140Txt), contem_sect: arrTeacher(candTxt).includes('secretaria-municipal'), teacher_em_PAPEIS_MUNICIPAIS: /const PAPEIS_MUNICIPAIS = \[[^\]]*teacher/.test(candTxt) });
if (out.total.falha) falhou();

// ---- 4) cirurgia: embed HTML novo + etiqueta do SW ----
const novoHtml = JSON.stringify(candTxt);
const ancSw = "const SW = \"const CACHE = 'bfr-conecta-v140';";
checa('T11_ancora_da_etiqueta_presente_exatamente_uma_vez', n(baseTxt, ancSw) === 1, { vezes: n(baseTxt, ancSw) });
if (out.total.falha) falhou();
const workerNovo = (baseTxt.slice(0, eHtml.ini) + novoHtml + baseTxt.slice(eHtml.fim)).replace(ancSw, "const SW = \"const CACHE = 'bfr-conecta-v141';");
checa('T12_etiqueta_nova_dentro_e_velha_fora', n(workerNovo, "'bfr-conecta-v141'") === 1 && n(workerNovo, "'bfr-conecta-v140'") === 0, { v141: n(workerNovo, "'bfr-conecta-v141'"), v140: n(workerNovo, "'bfr-conecta-v140'") });

const tmp = `${NOVO}.worker-check.tmp.mjs`;
if (!jaExistia && !existsSync(NOVO)) mkdirSync(NOVO, { recursive: true });
writeFileSync(tmp, workerNovo);
const chk = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
const compila = chk.status === 0;
unlinkSync(tmp);
checa('T13_worker_novo_compila', compila, { erro: compila ? null : String(chk.stderr || chk.stdout || '').trim().slice(0, 300) });
const reExtrai = extrai(workerNovo, 'const HTML = ');
checa('T14_embed_novo_re_extraido_bate_com_a_candidata', !!reExtrai && md5(reExtrai.corpo) === md5(candTxt) && B(reExtrai.corpo) === B(candTxt),
  { re_extraido: reExtrai ? { md5: md5(reExtrai.corpo), bytes: B(reExtrai.corpo) } : null, candidata: { md5: md5(candTxt), bytes: B(candTxt) } });
const swRe = extrai(workerNovo, 'const SW = ');
checa('T15_sw_embutido_com_etiqueta_v141_e_mesmo_comprimento_da_base', !!swRe && n(swRe.corpo, "'bfr-conecta-v141'") === 1 && n(swRe.corpo, "'bfr-conecta-v140'") === 0 && B(swRe.corpo) === ESP.swBytes,
  { v141: swRe ? n(swRe.corpo, "'bfr-conecta-v141'") : null, v140: swRe ? n(swRe.corpo, "'bfr-conecta-v140'") : null, bytes: swRe ? B(swRe.corpo) : null, bytes_da_base: ESP.swBytes });
checa('T16_um_unico_embed_de_cada', n(workerNovo, 'const HTML = ') === 1 && n(workerNovo, 'const SW = ') === 1 && n(workerNovo, 'const CSP = ') === 1,
  { html: n(workerNovo, 'const HTML = '), sw: n(workerNovo, 'const SW = '), csp: n(workerNovo, 'const CSP = ') });
const eCspBase = extrai(baseTxt, 'const CSP = ');
const eCspNovo = extrai(workerNovo, 'const CSP = ');
checa('T17_csp_intacta_e_permite_supabase_e_frame_ancestors', !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo && /\*\.supabase\.co/.test(eCspNovo.corpo) && /frame-ancestors 'self'/.test(eCspNovo.corpo),
  { csp_igual: !!eCspBase && !!eCspNovo && eCspBase.corpo === eCspNovo.corpo });
const esqueleto = (src, spans) => { const ord = spans.slice().sort((a, b) => a.ini - b.ini); let s = '', i = 0; for (const sp of ord) { s += src.slice(i, sp.ini) + '@@' + sp.nome + '@@'; i = sp.fim; } return s + src.slice(i); };
const spBase = [{ nome: 'HTML', ini: eHtml.ini, fim: eHtml.fim }, { nome: 'SW', ini: eSw.ini, fim: eSw.fim }];
const spNovo = [{ nome: 'HTML', ini: reExtrai.ini, fim: reExtrai.fim }, { nome: 'SW', ini: swRe.ini, fim: swRe.fim }];
const esqueletoAntes = md5(esqueleto(baseTxt, spBase));
checa('T18_fora_dos_dois_embeds_o_worker_e_byte_a_byte_e_a_regua_tem_dente',
  md5(esqueleto(workerNovo, spNovo)) === esqueletoAntes && md5(esqueleto(workerNovo + ' /*X*/', spNovo)) !== esqueletoAntes,
  { antes: esqueletoAntes, depois: md5(esqueleto(workerNovo, spNovo)), dente_saburado: md5(esqueleto(workerNovo + ' /*X*/', spNovo)) !== esqueletoAntes });

// ---- 5) escreve (ou verifica) o diretório novo ----
const assets = readdirSync(`${BASE}/public`).sort();
if (!jaExistia) {
  mkdirSync(`${NOVO}/public`, { recursive: true });
  writeFileSync(`${NOVO}/worker.mjs`, workerNovo);
  for (const f of assets) copyFileSync(`${BASE}/public/${f}`, `${NOVO}/public/${f}`);
  copyFileSync(`${BASE}/wrangler.toml`, `${NOVO}/wrangler.toml`);
}
const faltam = assets.filter((f) => !existsSync(`${NOVO}/public/${f}`));
const diferentes = assets.filter((f) => existsSync(`${NOVO}/public/${f}`) && !readFileSync(`${BASE}/public/${f}`).equals(readFileSync(`${NOVO}/public/${f}`)));
checa('T19_assets_do_bundle_todos_presentes_e_byte_a_byte_com_a_base', faltam.length === 0 && diferentes.length === 0 && assets.includes('_headers') && assets.length === ESP.assetsCopiados,
  { total: assets.length, faltam, diferentes, base_declara: ESP.assetsCopiados });
const modNovo = readFileSync(`${NOVO}/public/bfr-responsive-presentation.js`);
checa('T20_modulo_remendado_da_pen40_continua_no_bundle', md5(modNovo) === ESP.moduleMd5 && B(modNovo.toString('utf8')) === ESP.moduleBytes, { lido: { md5: md5(modNovo), bytes: B(modNovo.toString('utf8')) }, esperado: { md5: ESP.moduleMd5, bytes: ESP.moduleBytes } });
checa('T21_headers_com_o_md5_da_base', md5(readFileSync(`${NOVO}/public/_headers`)) === ESP.headersMd5, { lido: md5(readFileSync(`${NOVO}/public/_headers`)), esperado: ESP.headersMd5 });
checa('T22_wrangler_toml_identico_a_base', existsSync(`${NOVO}/wrangler.toml`) && readFileSync(`${NOVO}/wrangler.toml`).equals(readFileSync(`${BASE}/wrangler.toml`)), true);
checa('T23_worker_do_dir_bate_com_o_desta_corrida', existsSync(`${NOVO}/worker.mjs`) && readFileSync(`${NOVO}/worker.mjs`).equals(Buffer.from(workerNovo)), true);
checa('T24_nada_foi_publicado_por_esta_peca', DIARIO === 'audit-publicacao-v140.json' && V_PUBLICADA === '140' && !existsSync(`${DIR}/audit-publicacao-v141.json`),
  { diario_mais_novo: DIARIO, versao: V_PUBLICADA, diario_v141_existe: existsSync(`${DIR}/audit-publicacao-v141.json`) });

const reguas = {
  workerMd5: md5(workerNovo), workerBytes: B(workerNovo),
  swMd5: md5(swRe ? swRe.corpo : ''), swBytes: B(swRe ? swRe.corpo : ''),
  htmlMd5: md5(candTxt), htmlBytes: B(candTxt),
  cacheLabel: 'bfr-conecta-v141',
  baseWorkerMd5: ESP.workerMd5, baseWorkerBytes: ESP.workerBytes, baseSwMd5: ESP.swMd5, baseSwBytes: ESP.swBytes,
  baseHtmlMd5: ESP.htmlMd5, baseHtmlBytes: ESP.htmlBytes,
  headersMd5: ESP.headersMd5, headersBytes: ESP.headersBytes,
  moduleMd5: ESP.moduleMd5, moduleBytes: ESP.moduleBytes,
  deltaWorkerBytes: B(workerNovo) - ESP.workerBytes,
  precacheAlinhado: 0, assetsCopiados: assets.length,
  rpcNoModulo: nomes39, mesaDeTrilha: MESA_AUDIT,
  ar_no_momento: { diario: DIARIO, versao: V_PUBLICADA },
  origemReguas: ['worker-deploy-v140-trilha-de-acesso/esperado-v140.json', CAND, 'bfr-candidata-v141-caixa-vazia/portoes-v141-candidata.json', CAND140, DDL39, DDL4],
};
checa('T25_delta_do_worker_igual_ao_delta_do_embed', reguas.deltaWorkerBytes === B(novoHtml) - B(baseTxt.slice(eHtml.ini, eHtml.fim)),
  { delta: reguas.deltaWorkerBytes, embed_antes: B(baseTxt.slice(eHtml.ini, eHtml.fim)), embed_depois: B(novoHtml) });
if (out.total.falha) falhou();
out.esperado = reguas;
writeFileSync(`${NOVO}/esperado-v141.json`, JSON.stringify({ ...reguas, portoes: out.total.ok, portoesDetalhados: out.portoes }, null, 2) + '\n');
const relido = JSON.parse(readFileSync(`${NOVO}/esperado-v141.json`, 'utf8'));
checa('T26_esperado_re_lido_bate_com_as_reguas_da_corrida', Object.keys(reguas).every((k) => JSON.stringify(relido[k]) === JSON.stringify(reguas[k])), { campos: Object.keys(reguas).length, diferentes: Object.keys(reguas).filter((k) => JSON.stringify(relido[k]) !== JSON.stringify(reguas[k])) });
out.veredito = out.total.falha ? `P98_BUNDLE_V141_FALHOU ${out.total.ok}/${out.total.falha}` : `P98_BUNDLE_V141_OK ${out.total.ok}/${out.total.falha}`;
const linhas = [
  out.veredito,
  `escrito ${NOVO.replace(DIR + '/', '')} — worker=${reguas.workerMd5} (${reguas.workerBytes} B) delta=${reguas.deltaWorkerBytes} html=${reguas.htmlMd5} (${reguas.htmlBytes} B) modulo=${reguas.moduleMd5} etiqueta=${reguas.cacheLabel}`,
  `ar_no_momento=${DIARIO} (v${V_PUBLICADA}) · publicado=${out.publicado} · o deploy e o passo seguinte, ja autorizado pelo utilizador`,
];
if (out.total.falha) falhou();
writeFileSync(EV, JSON.stringify(out, null, 2) + '\n');
writeFileSync(EV_TXT, linhas.join('\n') + '\nnode_exit=0\n');
console.log(linhas.join('\n'));
process.exit(out.total.falha ? 1 : 0);
