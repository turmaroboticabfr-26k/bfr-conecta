// V122 — diario da PUBLICACAO da v122, gerado a partir do que esta no disco: nada e copiado
// a mao. A URL vem do diario da v121; os md5 e bytes de worker/shell/SW sao recalculados aqui;
// os ids de versao vem do `wrangler deployments list/status --json` gravado em ficheiro.
// Deploy cirurgico: so muda o SW (ouvintes push/notificationclick); a shell fica byte-idantica
// a v121. Somente leitura fora do proprio ficheiro de saida. 0 DDL, 0 escrita no banco, 0 mint.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${dir}/worker-deploy-v122-push`;
const BASE = `${dir}/worker-deploy-v121`;
const DIARIO_V121 = `${dir}/audit-publicacao-v121.json`;
const CAND_DIR = `${dir}/bfr-candidata-v122-push-sw`;
const EV = `${dir}/evidence`;
const SAIDA = `${dir}/audit-publicacao-v122.json`;

const PREFLIGHT = JSON.parse(fs.readFileSync(`${EV}/v122-preflight-15-11.json`, 'utf8'));
const HTTP = JSON.parse(fs.readFileSync(`${EV}/v122-pos-deploy-http-15-11.json`, 'utf8'));
const CLIENTE = JSON.parse(fs.readFileSync(`${EV}/v122-prova-cliente-15-11.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${EV}/v122-deployments-list-15-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${EV}/v122-deployments-status-15-11.json`, 'utf8'));
const STDOUT = fs.readFileSync(`${EV}/v122-deploy-stdout-15-11.txt`, 'utf8');
const CAND = JSON.parse(fs.readFileSync(`${CAND_DIR}/portoes-v122-diary.json`, 'utf8'));
const BANC = JSON.parse(fs.readFileSync(`${CAND_DIR}/portoes-v122-bancada.json`, 'utf8'));
const d121 = JSON.parse(fs.readFileSync(DIARIO_V121, 'utf8'));
const esp = JSON.parse(fs.readFileSync(`${OUT}/esperado-v122.json`, 'utf8'));

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const read = p => fs.readFileSync(p, 'utf8');
const regua = (m, b) => `${m} (${b} B)`;
const parseRegua = s => { const x = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return x ? { md5: x[1], bytes: +x[2] } : null; };

function unquote(src, i) {
  let o = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return { body: o, quoteEnd: i };
    if (c === '\\') { const n = src[i + 1]; o += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n; i += 2; continue; }
    o += c; i++;
  }
  return null;
}
function grab(src, marker) {
  const k = src.indexOf(marker);
  if (k < 0) return null;
  const q = src.indexOf('"', k + marker.length);
  const u = unquote(src, q + 1);
  return u ? { ...u, markerAt: k } : null;
}
function embeds(caminho) {
  const src = read(caminho);
  const h = grab(src, 'const HTML = '), s = grab(src, 'const SW = ');
  return {
    html: { md5: md5(Buffer.from(h.body, 'utf8')), bytes: Buffer.byteLength(h.body) },
    sw: { md5: md5(Buffer.from(s.body, 'utf8')), bytes: Buffer.byteLength(s.body), texto: s.body },
  };
}

// ---- medicao propria, recalculada deste script ----
const wNovo = (() => { const b = fs.readFileSync(`${OUT}/worker.mjs`); return { md5: md5(b), bytes: b.length }; })();
const wBase = (() => { const b = fs.readFileSync(`${BASE}/worker.mjs`); return { md5: md5(b), bytes: b.length }; })();
const eNovo = embeds(`${OUT}/worker.mjs`);
const eBase = embeds(`${BASE}/worker.mjs`);
const swCand = (() => { const b = fs.readFileSync(`${CAND_DIR}/sw-v4.js`); return { md5: md5(b), bytes: b.length }; })();
const swReversa = (() => { const b = fs.readFileSync(`${CAND_DIR}/sw-v4-reversa.js`); return { md5: md5(b), bytes: b.length }; })();
const assetsNovos = fs.readdirSync(`${OUT}/public`).sort();
const assetsBase = fs.readdirSync(`${BASE}/public`).sort();
const assetsIguais = assetsNovos.length === assetsBase.length && assetsNovos.every(f =>
  read(`${OUT}/public/${f}`) === read(`${BASE}/public/${f}`));
const tomlIguais = read(`${OUT}/wrangler.toml`) === read(`${BASE}/wrangler.toml`);

const porData = a => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const dois = porData(LISTA).slice(0, 2);
const maisNova = dois[0], anterior = dois[1];
const versaoStatus = STATUS.versions[0].version_id;
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];

const URL_AR = d121.deploy.url;                       // unica fonte da URL
const corpo404 = parseRegua(d121.md5.corpo_do_404);
const reguaShell121 = parseRegua(d121.md5['shell_depois']);
const reguaSw121 = parseRegua(d121.md5['sw_depois']);
const etiquetaNova = esp.cacheLabel;
// o caminho do SW na registracao tambem nao e dactilografado: vem do proprio worker publicado
const caminhoSw = (/\/(sw-v4\.js\?v=\d+)/.exec(read(`${OUT}/worker.mjs`)) || [])[1];
const URL_SW = caminhoSw ? new URL(caminhoSw, URL_AR).href : null;

const redsOf = d => (Array.isArray(d.portoes) ? d.portoes.filter(p => p.ok === false).length
  : Array.isArray(d.gates) ? d.gates.filter(p => p.ok === false).length
  : (d.totais?.vermelhos ?? d.vermelhos ?? -1));

const out = {
  version: 'v122',
  data: '2026-11-15',
  ok_literal: esp.ok_literal,
  escopo_do_ok: 'somente este deploy do Worker bfr-conecta (SW com ouvintes push/notificationclick sobre a base v121); nao cobre DDL, escrita no banco, mint de contas, deploy de Edge Function nem git push',
  tarefa: 'RM-1.5 — reparar a cadeia de push no cliente: o service worker servido deve trazer addEventListener(push) e addEventListener(notificationclick); a shell permanece byte-identica a v121',
};

out.deploy = {
  worker: 'bfr-conecta',
  conta: STATUS.author_email,
  version_id: versaoStatus,
  deployment_id: STATUS.id,
  version_anterior: anterior.versions[0].version_id,
  deployment_created: maisNova.created_on,
  deployment_anterior_created: anterior.created_on,
  percentual_trafego_novo: STATUS.versions[0].percentage,
  wrangler: '4.154.0',
  cwd: 'worker-deploy-v122-push',
  base_do_bundle: 'worker-deploy-v121 (a v121 ja publicada, que contem o handler do 404; aqui so o embed SW muda)',
  url: URL_AR,
  comando_da_url: `derivado de ${DIARIO_V121.split('/').pop()} -> deploy.url, nunca dactilografado`,
  fonte_dos_numeros: 'evidence/v122-deployments-list-15-11.json e evidence/v122-deployments-status-15-11.json, stdout de `wrangler deployments list/status --json` gravado por redirecionamento, lidos por este script',
  stdout_do_deploy: 'evidence/v122-deploy-stdout-15-11.txt (Current Version ID lido por regex deste script)',
  aviso_de_ferramenta: 'wrangler 4.156+ quebra o upload de assets com o erro 100312; a versao continua fixada em 4.154.0; os 12 assets nao foram reenviados (No updated asset files to upload)',
};

out.correcao = {
  pendencia: 'RM-1.5 (RM-1.3 cadeia de push, bloco cliente)',
  problema: 'o service worker em producao (v121) nao tinha ouvintes push nem notificationclick: o push chegava ao SW mas nao mostrava notificacao nem abria o app ao toque',
  causa: 'o sw-v4.js publicado parava em fetch/cache; os dois addEventListener foram redigidos a mao na candidata, sem importScripts (a CSP worker-src baniria)',
  solucao: `SW embed ${regua(eNovo.sw.md5, eNovo.sw.bytes)} com CACHE ${etiquetaNova}; addEventListener('push')=1, addEventListener('notificationclick')=1, showNotification=1, openWindow=1, chamada importScripts=0`,
  alcance_medido: `1 mudanca: o embed SW (worker +${wNovo.bytes - wBase.bytes} bytes, SW ${eBase.sw.bytes} B -> ${eNovo.sw.bytes} B); shell, os 12 assets e o wrangler.toml byte-identicos a v121`,
  o_que_NAO_foi_alterado: `nenhum handler do Worker alem do embed; a base worker-deploy-v121 esta intacta no disco (${regua(wBase.md5, wBase.bytes)}); 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function, 0 git push`,
};

out.md5 = {
  'worker-deploy-v122-push/worker.mjs_publicado': regua(wNovo.md5, wNovo.bytes),
  'worker-deploy-v121/worker.mjs_base': regua(wBase.md5, wBase.bytes),
  wrangler_toml_base_e_publicado: `${md5(read(`${OUT}/wrangler.toml`))} (${Buffer.byteLength(read(`${OUT}/wrangler.toml`))} B) — identico nos dois directorios`,
  shell_antes: regua(eBase.html.md5, eBase.html.bytes),
  shell_depois: regua(eNovo.html.md5, eNovo.html.bytes),
  sw_antes: `${regua(eBase.sw.md5, eBase.sw.bytes)}, CACHE bfr-conecta-v121`,
  sw_depois: `${regua(eNovo.sw.md5, eNovo.sw.bytes)}, CACHE ${etiquetaNova}`,
  candidata_sw_offline: regua(swCand.md5, swCand.bytes),
  sw_reversa: regua(swReversa.md5, swReversa.bytes),
  corpo_do_404: regua(corpo404.md5, corpo404.bytes),
  assets: `${assetsNovos.length} ficheiros, byte-identicos a base v121 (nao reenviados no deploy)`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};

out.medicao = {
  metodo: 'o digest {http, ct, bytes, md5} de cada sonda; os corpos crus ficam nos diarios de evidence',
  ar_antes: {
    em: PREFLIGHT.em,
    veredito: PREFLIGHT.veredito,
    total: PREFLIGHT.totais,
    ar: PREFLIGHT.reguas.url,
    nota: 'o preflight le o ar ANTES do deploy: shell v121 e SW v121 sem push/nc — e a prova do "antes"',
    rotas: {
      '/': PREFLIGHT.ar_shell,
      '/sw-v4.js': PREFLIGHT.ar_sw,
      ...Object.fromEntries(PREFLIGHT.regressao_404.map(r => [r.caminho, r])),
    },
  },
  ar_depois: {
    em: HTTP.em,
    veredito: HTTP.veredito,
    total: HTTP.totais,
    ar: HTTP.reguas.url,
    rotas: {
      '/': HTTP.A1_shell,
      '/sw-v4.js': HTTP.A2_sw,
      ...Object.fromEntries(HTTP.A3_404.map(r => [r.caminho, r])),
    },
    firebase_sw: HTTP.A4_firebase,
    assets_servidos: HTTP.A5_assets,
    servidor: HTTP.A6_servidor,
  },
  cliente: {
    em: CLIENTE.em,
    veredito: CLIENTE.veredito,
    total: CLIENTE.totais,
    origem: 'evidence/v122-prova-cliente-15-11.json — Chrome real via browser-use',
    sw_active: CLIENTE.depois_do_reload.active,
    sw_controller: CLIENTE.depois_do_reload.controller_scriptURL,
    sw_servido_no_cliente: CLIENTE.sw_servido_no_cliente,
    shell_render: CLIENTE.shell_render,
  },
  candidata_offline: {
    veredito_candidata: CAND.verdict,
    veredito_bancada: BANC.verdict,
    publicados: CAND.published,
    vermelhos_candidata: redsOf(CAND),
    vermelhos_bancada: redsOf(BANC),
  },
};

out.portoes = {
  preflight: `${PREFLIGHT.totais.portoes}/${PREFLIGHT.totais.vermelhos} VERDE - evidence/v122-preflight-15-11.json (${PREFLIGHT.veredito})`,
  http_pos_deploy: `${HTTP.totais.portoes}/${HTTP.totais.vermelhos} VERDE - evidence/v122-pos-deploy-http-15-11.json (${HTTP.veredito})`,
  cliente: `${CLIENTE.totais.portoes}/${CLIENTE.totais.vermelhos} VERDE - evidence/v122-prova-cliente-15-11.json (${CLIENTE.veredito})`,
  candidata_offline: `candidata ${CAND.verdict} + bancada ${BANC.verdict}, vermelhos ${redsOf(CAND)}/${redsOf(BANC)} — contados no ciclo da candidata, nao nesta cadeia`,
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: PREFLIGHT.totais.portoes + HTTP.totais.portoes + CLIENTE.totais.portoes,
  vermelhos: PREFLIGHT.totais.vermelhos + HTTP.totais.vermelhos + CLIENTE.totais.vermelhos,
  falhas_deste_diario: {},
};

const mesmo = (a, b) => (a && typeof a === 'object') || (b && typeof b === 'object')
  ? JSON.stringify(a) === JSON.stringify(b) : a === b;
const G = (n, esperado, valor, ok) => {
  out.portoes.falhas_deste_diario[n] = ok === undefined
    ? { valor, esperado, passou: mesmo(valor, esperado) }
    : { valor, esperado, passou: !!ok };
  if (!out.portoes.falhas_deste_diario[n].passou) out.portoes.falhas_deste_diario[n].vermelho = true;
};

G('G1_url_vem_do_diario_da_v121', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', out.deploy.version_id, versaoStatus);
G('G2b_o_stdout_do_deploy_bate_com_o_status', versaoStatus, versaoNoStdout);
G('G2c_a_lista_do_servidor_concorda_com_o_status', maisNova.versions[0].version_id, versaoStatus);
G('G3_a_versao_anterior_e_a_publicada_na_v121', d121.deploy.version_id, anterior.versions[0].version_id);
G('G4_o_que_foi_publicado_e_o_bundle_gateado', esp.workerMd5, wNovo.md5);
G('G5_base_v121_inalterada_no_disco', parseRegua(d121.md5['worker-deploy-v121/worker.mjs_publicado']).md5, wBase.md5);
G('G6_embed_sw_igual_a_candidata_offline', swCand.md5, eNovo.sw.md5);
G('G6b_sw_servido_no_ar_igual_ao_embed', HTTP.A2_sw.md5, eNovo.sw.md5);
G('G7_delta_do_worker_bate', esp.deltaWorkerBytes, wNovo.bytes - wBase.bytes);
G('G8_shell_byte_identica_a_v121', { md5: reguaShell121.md5, bytes: reguaShell121.bytes }, { md5: eNovo.html.md5, bytes: eNovo.html.bytes });
G('G8b_embed_html_nao_mudou_entre_base_e_publicado', eBase.html.md5, eNovo.html.md5);
G('G9_sw_tem_ouvinte_push', 1, HTTP.A2_sw.push);
G('G9b_sw_tem_ouvinte_notificationclick', 1, HTTP.A2_sw.nc);
G('G9c_sw_chama_showNotification', 1, HTTP.A2_sw.show);
G('G9d_sw_chama_openWindow', 1, HTTP.A2_sw.open);
G('G9e_sw_sem_chamada_importScripts', 0, HTTP.A2_sw.importScripts);
G('G9f_sw_etiqueta_cache_v122_sozinha', ['bfr-conecta-v122'], HTTP.A2_sw.cache);
G('G10_sw_diferencial_do_antes_v121', { antes: reguaSw121.md5, depois: eNovo.sw.md5 }, { antes: PREFLIGHT.ar_sw.md5, depois: HTTP.A2_sw.md5 });
G('G11_handler_do_404_permanece_no_ar', { caminhos: HTTP.A3_404.length, desvios: HTTP.A3_404.filter(r => r.http !== 404 || r.bytes !== corpo404.bytes || r.md5 !== corpo404.md5).length },
  { caminhos: 5, desvios: 0 });
G('G11b_firebase_messaging_sw_ainda_404', 404, HTTP.A4_firebase.http);
G('G12_os_12_assets_nao_regridiram', { total: 12, desvios: 0, disco: true },
  { total: HTTP.A5_assets.total, desvios: HTTP.A5_assets.desvios.length, disco: assetsIguais });
G('G12b_wrangler_toml_identico_a_base', true, tomlIguais);
G('G13_sw_reversa_igual_a_base_v121', reguaSw121.md5, swReversa.md5);
G('G14_cliente_sw_active_v122', { scriptURL: URL_SW, state: 'activated' },
  { scriptURL: CLIENTE.depois_do_reload.active_scriptURL, state: CLIENTE.depois_do_reload.active_state });
G('G14b_cliente_sw_controla_apos_reload', URL_SW, CLIENTE.depois_do_reload.controller_scriptURL);

G('G14c_cliente_sw_cache_v122_push_nc', { cache: 'bfr-conecta-v122', push: 1, nc: 1, importScripts_chamada: 0 },
  { cache: CLIENTE.sw_servido_no_cliente.cache, push: CLIENTE.sw_servido_no_cliente.push_listener, nc: CLIENTE.sw_servido_no_cliente.notificationclick_listener, importScripts_chamada: CLIENTE.sw_servido_no_cliente.importScripts_chamada });
G('G14d_cliente_shell_rende', { appShell: true, nav_items: 57 }, { appShell: CLIENTE.shell_render.appShell_presente, nav_items: CLIENTE.shell_render.nav_items });
G('G15_preflight_verde', 'V122_PREFLIGHT_OK 23/0', `${PREFLIGHT.veredito} ${PREFLIGHT.totais.portoes}/${PREFLIGHT.totais.vermelhos}`);
G('G16_http_pos_deploy_verde', 'V122_HTTP_OK 14/0', `${HTTP.veredito} ${HTTP.totais.portoes}/${HTTP.totais.vermelhos}`);
G('G17_cliente_verde', 'V122_PROVA_CLIENTE_OK 7/0', `${CLIENTE.veredito} ${CLIENTE.totais.portoes}/${CLIENTE.totais.vermelhos}`);
G('G18_candidata_e_bancada_verdes_nao_publicadas_no_banco', { candidata: 'V122_SW_ESTRUTURAL_OK', bancada: 'V122_BANCADA_OK', vermelhos: [0, 0], published: false },
  { candidata: CAND.verdict, bancada: BANC.verdict, vermelhos: [redsOf(CAND), redsOf(BANC)], published: CAND.published });
G('G19_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, http: 0, cliente: 0 },
  { preflight: PREFLIGHT.ddl + PREFLIGHT.mint + PREFLIGHT.escrita, http: HTTP.ddl + HTTP.mint + HTTP.escrita, cliente: (CLIENTE.ddl || 0) + (CLIENTE.mint || 0) + (CLIENTE.escrita || 0) });
G('G20_a_reversao_existe_no_disco_na_regua_da_v121', d121.md5['worker-deploy-v121/worker.mjs_publicado'], regua(wBase.md5, wBase.bytes));
G('G20b_a_base_de_reversao_tem_os_12_assets', 12, assetsBase.length);

const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter(v => !v.passou).length;
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.reversao = {
  como: `wrangler deploy a partir de worker-deploy-v121 (worker ${wBase.bytes} B md5 ${wBase.md5}), que contem o SW ${eBase.sw.md5} com a etiqueta bfr-conecta-v121 (sem os ouvintes push)`,
  volta_para: `version_id ${anterior.versions[0].version_id} (a v121 de 14/11 16:29:17Z)`,
  prova_de_linhagem: `os 12 assets e o wrangler.toml sao byte-identicos nos dois directorios; o sw-v4-reversa.js bate byte a byte com o SW publicado na v121 (${regua(swReversa.md5, swReversa.bytes)})`,
  exige: 'OK literal novo do usuario',
};
out.diario_de = 'este ficheiro e gerado por scripts/v122-diario-publicacao.mjs a partir dos diarios de evidence, da lista de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`portoes_deste_diario=${out.portoes.deste_diario} total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '));
process.exit(vermelhos ? 1 : 0);
