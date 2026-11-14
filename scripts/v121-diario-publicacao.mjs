// V121-5 — diario da PUBLICACAO da v121, gerado a partir do que esta no disco: nada e copiado
// a mao. A URL vem do diario da v120-404; os md5 e bytes de worker/shell/SW sao recalculados
// aqui; os ids de versao vem do `wrangler deployments list/status --json` gravado em ficheiro.
// Somente leitura fora do proprio ficheiro de saida. 0 DDL, 0 escrita no banco, 0 mint, 0 push.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = `${dir}/worker-deploy-v121`;
const BASE = `${dir}/worker-deploy-v120-404`;
const DIARIO_404 = `${dir}/audit-publicacao-v120-404.json`;
const DIARIO_V120 = `${dir}/audit-publicacao-v120.json`;
const EV = `${dir}/evidence`;
const SAIDA = `${dir}/audit-publicacao-v121.json`;

const PREFLIGHT = JSON.parse(fs.readFileSync(`${EV}/v121-preflight-14-11.json`, 'utf8'));
const PORTAO = JSON.parse(fs.readFileSync(`${EV}/v121-portao-bundle-14-11.json`, 'utf8'));
const PREDEPLOY = JSON.parse(fs.readFileSync(`${EV}/v121-predeploy-live-14-11.json`, 'utf8'));
const HTTP = JSON.parse(fs.readFileSync(`${EV}/v121-pos-deploy-http-14-11.json`, 'utf8'));
const CLIENTE = JSON.parse(fs.readFileSync(`${EV}/v121-prova-cliente-14-11.json`, 'utf8'));
const SONDA = JSON.parse(fs.readFileSync(`${EV}/v121-sonda-dois-hosts-14-11.json`, 'utf8'));
const LISTA = JSON.parse(fs.readFileSync(`${EV}/v121-deployments-list-14-11.json`, 'utf8'));
const STATUS = JSON.parse(fs.readFileSync(`${EV}/v121-deployments-status-14-11.json`, 'utf8'));
const CAND = JSON.parse(fs.readFileSync(`${dir}/bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json`, 'utf8'));
const d404 = JSON.parse(fs.readFileSync(DIARIO_404, 'utf8'));
const d120 = JSON.parse(fs.readFileSync(DIARIO_V120, 'utf8'));
const esp = JSON.parse(fs.readFileSync(`${OUT}/esperado-v121.json`, 'utf8'));

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
// Desmonta o worker e devolve os dois embeds ja desempacados, medidos a partir do ficheiro.
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
const shellCand = (() => { const b = fs.readFileSync(`${dir}/bfr-candidata-v121-rotulos-supervisor/index.html`); return { md5: md5(b), bytes: b.length }; })();
const assetsNovos = fs.readdirSync(`${OUT}/public`).sort();
const assetsBase = fs.readdirSync(`${BASE}/public`).sort();
const assetsIguais = assetsNovos.length === assetsBase.length && assetsNovos.every(f =>
  read(`${OUT}/public/${f}`) === read(`${BASE}/public/${f}`));
const tomlIguais = read(`${OUT}/wrangler.toml`) === read(`${BASE}/wrangler.toml`);

const porData = a => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const dois = porData(LISTA).slice(0, 2);
const maisNova = dois[0], anterior = dois[1];
const versaoStatus = STATUS.versions[0].version_id;

const URL_AR = d404.medicao.ar_depois.ar;              // unica fonte da URL
const corpo404 = parseRegua(d404.md5.corpo_do_404);
const parNovo = CAND.hunks[0];
const textoPar = `education_supervisor:['${parNovo.rotulo_lido_0}','${parNovo.rotulo_lido_1}']`;
const etiquetaNova = esp.cacheLabel;

const out = {
  version: 'v121',
  data: '2026-11-14',
  ok_literal: 'publicar v121',
  escopo_do_ok: 'somente este deploy do Worker bfr-conecta (shell v121 sobre a base v120-404); nao cobre DDL, escrita no banco, mint de contas, deploy de Edge Function nem git push',
  tarefa: 'PEN-33 / RM-1.8 — o chip da conta logada leia o rotulo do education_supervisor em vez de cair em Responsavel',
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
  cwd: 'worker-deploy-v121',
  base_do_bundle: 'worker-deploy-v120-404 (a v120-404 ja publicada, para levar o handler do 404 adiante)',
  url: URL_AR,
  comando_da_url: `derivado de ${DIARIO_404.split('/').pop()} -> medicao.ar_depois.ar, nunca dactilografado`,
  fonte_dos_numeros: 'evidence/v121-deployments-list-14-11.json e evidence/v121-deployments-status-14-11.json, ambos stdout de `wrangler deployments list/status --json` gravado por redirecionamento, lidos por este script',
  stdout_do_deploy: 'NAO persistido em ficheiro neste ciclo; o registo mecanico da publicacao e a lista de deployments do servidor mais os bytes servidos (evidence/v121-pos-deploy-http-14-11.json)',
  aviso_de_ferramenta: 'wrangler 4.156+ quebra o upload de assets com o erro 100312; a versao continua fixada em 4.154.0',
};

out.correcao = {
  pendencia: 'PEN-33 / RM-1.8 (achado H5 da bancada §T de 13/11)',
  problema: 'o mapa accountLabels nao tinha a chave education_supervisor; o getAccountLabel() caia no default e a conta logada de supervisao aparecia como Responsavel / parentView',
  causa: 'a linha 10437 definia os rotulos dos papeis e o papel criado na Fase 0 nunca foi acrescentado ao mapa; roleSectionAccess (:9018) ja conhecia o papel, por isso a diferenca era so o rotulo',
  solucao: `um unico par acrescentado ao mapa: ${textoPar} (linha ${parNovo.line}, +${CAND.candidate_delta_bytes} bytes na shell)`,
  alcance_medido: `1 linha alterada das ${HTTP.A6_linhagem.linhas_antes} da shell; worker +${wNovo.bytes - wBase.bytes} bytes; SW muda apenas a etiqueta de cache; CSP, os 12 assets e o wrangler.toml byte-identicos`,
  o_que_NAO_foi_alterado: `nenhum handler do Worker alem do embed; a base worker-deploy-v120-404 esta intacta no disco (${regua(wBase.md5, wBase.bytes)}); 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function, 0 git push`,
};

out.md5 = {
  'worker-deploy-v121/worker.mjs_publicado': regua(wNovo.md5, wNovo.bytes),
  'worker-deploy-v120-404/worker.mjs_base': regua(wBase.md5, wBase.bytes),
  wrangler_toml_base_e_publicado: `${md5(read(`${OUT}/wrangler.toml`))} (${Buffer.byteLength(read(`${OUT}/wrangler.toml`))} B) — identico nos dois directorios`,
  shell_antes: regua(eBase.html.md5, eBase.html.bytes),
  shell_depois: regua(eNovo.html.md5, eNovo.html.bytes),
  sw_antes: `${regua(eBase.sw.md5, eBase.sw.bytes)}, CACHE bfr-conecta-v120`,
  sw_depois: `${regua(eNovo.sw.md5, eNovo.sw.bytes)}, CACHE ${etiquetaNova}`,
  candidata_offline: regua(shellCand.md5, shellCand.bytes),
  corpo_do_404: regua(corpo404.md5, corpo404.bytes),
  assets: `${assetsNovos.length} ficheiros, byte-identicos a base do 404`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};

out.grafia_do_host = (() => {
  const host = new URL(URL_AR).hostname;
  // O bloco de correcao cita de proposito a grafia errada; varrer so as mediacoes,
  // exatamente como faz scripts/v121-confere-diario-cliente.mjs.
  const j = JSON.parse(fs.readFileSync(`${EV}/v121-prova-cliente-14-11.json`, 'utf8'));
  const corpo = JSON.stringify({ ...j, correcao_de_grafia_do_host: undefined });
  const divergentes = [...new Set((corpo.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/g) || []))].filter(u => u !== URL_AR);
  return {
    host_publicado: host,
    host_datilografado_na_prova: new URL(SONDA.com_i_datilografado.url).hostname,
    o_que_aconteceu: 'o diario de prova do cliente foi escrito com o host contendo uma vogal trocada; o verificador, que comparava byte a byte, deu vermelho e a diferenca so se viu pelos codigos das char',
    como_se_decidiu: 'evidence/v121-sonda-dois-hosts-14-11.json mede os dois hosts por fetch: o do diario entrega a shell ' + SONDA.com_o_do_diario.raiz.md5 + ' e o dactilografado da ' + SONDA.com_i_datilografado.lookup_erro,
    armadilha_nova: 'dns.resolve4 devolve ECONNREFUSED para qualquer host nesta maquina (o resolvedor directo esta bloqueado); nao serve de portao — o transporte provado e o fetch',
    correcao: 'scripts/v121-corrige-grafia-diario.mjs substituiu por derivacao e gravou o bloco correcao_de_grafia_do_host no proprio diario; a historia nao foi apagada',
    ocorrencias_restantes_fora_do_bloco_de_correcao: divergentes.length,
    contexto_historico: 'a mesma vogal ja tinha causado o falso alarme de 21/10 registado em ## B/## C da auditoria; a org do GitHub e turmarobiticabfr-26k, por isso um grep da string solta conta demais',
  };
})();

out.medicao = {
  metodo: 'as tabelas abaixo sao o digest {http, ct, bytes, md5} de cada sonda; os corpos crus ficam nos diarios de evidence',
  ar_antes: {
    em: PREDEPLOY.em,
    veredito: PREDEPLOY.veredito,
    total: PREDEPLOY.totais,
    ar: PREDEPLOY.reguas.url,
    rotas: {
      '/': { ...PREDEPLOY.ar_shell, csp_igual_ao_diario: undefined },
      '/sw-v4.js': { ...PREDEPLOY.ar_sw },
      ...Object.fromEntries(PREDEPLOY.ar_404.map(r => [r.caminho, r])),
    },
    versoes_do_diario: PREDEPLOY.ar_antes_do_deploy,
  },
  ar_depois: {
    em: HTTP.em,
    veredito: HTTP.veredito,
    total: { portoes: HTTP.totais.portoes, vermelhos: HTTP.totais.vermelhos, blocos_de_evidencia: HTTP.totais.blocos_de_evidencia },
    ar: HTTP.reguas.url,
    rotas: {
      '/': HTTP.A1_shell,
      '/sw-v4.js': HTTP.A2_sw,
      ...Object.fromEntries(HTTP.A3_404.map(r => [r.caminho, r])),
    },
    assets_servidos: { total: HTTP.A4b_assets_servidos_batem_com_o_disco.total, desvios: HTTP.A4b_assets_servidos_batem_com_o_disco.desvios },
    linhagem: { embed: HTTP.A5_linhagem, diff_contra_a_shell_publicada_antes: HTTP.A6_linhagem },
  },
  cliente: {
    em: CLIENTE.em,
    veredito: CLIENTE.veredito,
    total: CLIENTE.totais,
    camada: CLIENTE.camada,
    sw_controlador: CLIENTE.C1_controlador_do_sw,
    navegacao_real: CLIENTE.C4_navegacao_real,
    consola: CLIENTE.C5_consola,
    nao_forjavel: CLIENTE.C6_nao_forjavel_neste_OK,
  },
  candidata_offline: {
    em: PREFLIGHT.em,
    veredito: PREFLIGHT.veredito,
    total: PREFLIGHT.totais,
    origem: 'bfr-candidata-v121-rotulos-supervisor/portoes-v121-diary.json',
    veredito_da_candidata: `${CAND.verdict}, ${CAND.gates.length} portoes em 13/11, nao contado nesta cadeia`,
  },
};

out.portoes = {
  preflight: `${PREFLIGHT.totais.portoes}/${PREFLIGHT.totais.vermelhos} VERDE - evidence/v121-preflight-14-11.json (${PREFLIGHT.veredito})`,
  portao_bundle: `${PORTAO.totais.portoes}/${PORTAO.totais.vermelhos} VERDE - evidence/v121-portao-bundle-14-11.json (${PORTAO.veredito})`,
  predeploy_ao_vivo: `${PREDEPLOY.totais.portoes}/${PREDEPLOY.totais.vermelhos} VERDE - evidence/v121-predeploy-live-14-11.json (${PREDEPLOY.veredito})`,
  http_pos_deploy: `${HTTP.totais.portoes}/${HTTP.totais.vermelhos} VERDE - evidence/v121-pos-deploy-http-14-11.json (${HTTP.veredito})`,
  cliente: `${CLIENTE.totais.portoes_medidos}/${CLIENTE.totais.vermelhos} VERDE + ${CLIENTE.totais.nao_tentados} NAO TENTADO - evidence/v121-prova-cliente-14-11.json (${CLIENTE.veredito})`,
  grafia: 'portoes=0 — a sonda dos dois hosts e bloco de evidencia, nao portao; o portao esta no verificador do diario',
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: PREFLIGHT.totais.portoes + PORTAO.totais.portoes + PREDEPLOY.totais.portoes + HTTP.totais.portoes + CLIENTE.totais.portoes_medidos,
  vermelhos: PREFLIGHT.totais.vermelhos + PORTAO.totais.vermelhos + PREDEPLOY.totais.vermelhos + HTTP.totais.vermelhos + CLIENTE.totais.vermelhos,
  nao_tentados: CLIENTE.totais.nao_tentados,
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

G('G1_url_vem_do_diario_da_v120_404', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', out.deploy.version_id, versaoStatus);
G('G2b_a_lista_do_servidor_concorda_com_o_status', maisNova.versions[0].version_id, versaoStatus);
G('G3_a_versao_anterior_e_a_publicada_no_404', d404.deploy.version_id, anterior.versions[0].version_id);
G('G4_o_que_foi_publicado_e_o_bundle_gateado', esp.workerMd5, wNovo.md5);
G('G5_base_do_404_inalterada_no_disco', d404.md5['worker-deploy-v120-404/worker.mjs_publicado'].split(' ')[0], wBase.md5);
G('G6_embed_html_igual_a_candidata_medida_no_disco', shellCand.md5, eNovo.html.md5);
G('G6b_shell_servida_igual_ao_embed_do_worker', HTTP.A1_shell.md5, eNovo.html.md5);
G('G7_delta_do_worker_bate_com_o_portao', esp.deltaWorkerBytes, wNovo.bytes - wBase.bytes);
G('G8_etiqueta_de_cache_mudou_no_ar', [etiquetaNova, 0], [HTTP.A2_sw.cache[0], HTTP.A2_sw.sobra_da_velha]);
G('G8b_a_unica_mudanca_no_sw_e_a_etiqueta', { antes: eBase.sw.bytes, depois: eNovo.sw.bytes, rotulo_no_sw_novo: (eNovo.sw.texto.match(/bfr-conecta-v\d+/g) || []).length },
  { antes: eBase.sw.bytes, depois: eNovo.sw.bytes, rotulo_no_sw_novo: 1 },
  eBase.sw.bytes === eNovo.sw.bytes && (eNovo.sw.texto.match(/bfr-conecta-v\d+/g) || []).length === 1 && !eNovo.sw.texto.includes('bfr-conecta-v120') && eBase.sw.texto.includes('bfr-conecta-v120'));
G('G9_handler_do_404_permanece_no_ar', { caminhos: HTTP.A3_404.length, desvios: HTTP.A3_404.filter(r => r.http !== 404 || r.bytes !== corpo404.bytes || r.md5 !== corpo404.md5).length },
  { caminhos: 5, desvios: 0 });
G('G9b_os_quatro_caminhos_de_antes_mudaram_de_status', 0, PREDEPLOY.ar_404.filter(r => r.http !== 404).length);
G('G10_os_12_assets_nao_regridiram', { total: 12, desvios: 0, disco: true },
  { total: HTTP.A4b_assets_servidos_batem_com_o_disco.total, desvios: HTTP.A4b_assets_servidos_batem_com_o_disco.desvios.length, disco: assetsIguais });
G('G10b_wrangler_toml_identico_a_base', true, tomlIguais);
G('G11_uma_unica_linha_alterada_na_shell', [parNovo.line], HTTP.A6_linhagem.alteradas);
G('G11b_o_numero_de_linhas_nao_mudou', HTTP.A6_linhagem.linhas_antes, HTTP.A6_linhagem.linhas_agora);
G('G11c_o_par_de_rotulos_ocorre_uma_vez_na_shell_servida', 1, HTTP.A1_shell.ocorrencias_do_par);
G('G12_preflight_verde', 'V121_PREFLIGHT_OK 25/0', `${PREFLIGHT.veredito} ${PREFLIGHT.totais.portoes}/${PREFLIGHT.totais.vermelhos}`);
G('G13_portao_bundle_verde', 'PORTAO_V121_VERDE 24/0', `${PORTAO.veredito} ${PORTAO.totais.portoes}/${PORTAO.totais.vermelhos}`);
G('G14_predeploy_verde', 'V121_PREDEPLOY_VERDE 6/0', `${PREDEPLOY.veredito} ${PREDEPLOY.totais.portoes}/${PREDEPLOY.totais.vermelhos}`);
G('G15_http_pos_deploy_verde', 'V121_HTTP_OK 11/0', `${HTTP.veredito} ${HTTP.totais.portoes}/${HTTP.totais.vermelhos}`);
G('G16_cliente_verde_com_uma_nao_tentada', 'V121_CLIENTE_OK 6/0 nao_tentados=1',
  `${CLIENTE.veredito} ${CLIENTE.totais.portoes_medidos}/${CLIENTE.totais.vermelhos} nao_tentados=${CLIENTE.totais.nao_tentados}`);
G('G17_a_grafia_foi_decidida_por_medicao', 'V121_GRAFIA_DECIDIDA: serve o host do diario; o datilografado nao entrega a shell', SONDA.veredito);
G('G17b_o_diario_do_cliente_sem_host_dactilografado', 0, out.grafia_do_host.ocorrencias_restantes_fora_do_bloco_de_correcao);
G('G18_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, predeploy: 0, http: 0, cliente: 0 },
  { preflight: PREFLIGHT.ddl + PREFLIGHT.mint + PREFLIGHT.escrita, predeploy: PREDEPLOY.ddl + PREDEPLOY.mint + PREDEPLOY.escrita, http: HTTP.ddl + HTTP.mint + HTTP.escrita, cliente: CLIENTE.ddl + CLIENTE.mint + CLIENTE.escrita });
G('G19_a_reversao_existe_no_disco_na_regua_do_diario_404', d404.md5['worker-deploy-v120-404/worker.mjs_publicado'], regua(wBase.md5, wBase.bytes));
G('G19b_a_base_de_reversao_tem_os_12_assets', 12, assetsBase.length);
G('G20_a_linha_da_v120_publicada_consta_na_cadeia', d120.deploy.version_id, d404.deploy.version_anterior);

const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter(v => !v.passou).length;
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.reversao = {
  como: `wrangler deploy a partir de worker-deploy-v120-404 (worker ${wBase.bytes} B md5 ${wBase.md5}), que contem a shell ${eBase.html.md5} com a etiqueta bfr-conecta-v120`,
  volta_para: `version_id ${anterior.versions[0].version_id} (a v120-404 de 14/11 15:24:11Z)`,
  prova_de_linhagem: `os 12 assets e o wrangler.toml sao byte-identicos nos dois directorios; a shell do bundle novo menos o par de rotulos do accountLabels reproduce a shell publicada antes (${HTTP.A6_linhagem.reversa_md5})`,
  exige: 'OK literal novo do usuario',
};
out.diario_de = 'este ficheiro e gerado por scripts/v121-diario-publicacao.mjs a partir dos seis diarios de evidence, da lista de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`portoes_deste_diario=${out.portoes.deste_diario} total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos} nao_tentados=${out.portoes.nao_tentados}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
process.exit(vermelhos ? 1 : 0);
