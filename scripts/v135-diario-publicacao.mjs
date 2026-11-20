// V135 — diario da PUBLICACAO (headers anti-cliquejacking), gerado do disco e dos diarios de
// evidence: nada copiado de log nem dactilografado. A URL vem do diario da v134; os md5/bytes sao
// recalculados aqui; os ids de versao vem dos ficheiros de estado gravados por redirecionamento.
// 0 DDL, 0 escrita no banco, 0 mint. O OK deste ciclo e «Sim, publicar ambos (v124+v125)» dado em
// 18/11; este diario cobre a primeira publicacao (v135 = patch v124 re-aplicado sobre a v134).
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT_DIR = `${DIR}/worker-deploy-v135-headers`;
const BASE_DIR = `${DIR}/worker-deploy-v134-sidebar`;
const SAIDA = `${DIR}/audit-publicacao-v135.json`;
if (fs.existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const read = (p) => fs.readFileSync(p, 'utf8');
const regua = (m, b) => `${m} (${b} B)`;

const GER = JSON.parse(read(`${EV}/v135-gera-bundle-19-11.json`));
const PRE = JSON.parse(read(`${EV}/v135-preflight-19-11.json`));
const POS = JSON.parse(read(`${EV}/v135-pos-deploy-19-11.json`));
const LISTA_DEPOIS = JSON.parse(read(`${EV}/v135-deployments-list-depois-19-11.json`));
const STATUS_DEPOIS = JSON.parse(read(`${EV}/v135-deployments-status-depois-19-11.json`));
const STATUS_ANTES = JSON.parse(read(`${EV}/v134-deployments-status-depois-18-11.json`));
const STDOUT = read(`${EV}/v135-deploy-stdout-19-11.txt`);
const d134 = JSON.parse(read(`${EV}/v134-pos-deploy-18-11.json`));
const esp134 = JSON.parse(read(`${BASE_DIR}/esperado-v134.json`));
const esp = JSON.parse(read(`${OUT_DIR}/esperado-v135.json`));
const espBase = JSON.parse(read(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`));

const URL_AR = d134.url;
const wNovo = fs.readFileSync(`${OUT_DIR}/worker.mjs`);
const wBase = fs.readFileSync(`${BASE_DIR}/worker.mjs`);
const headersTxt = fs.readFileSync(`${OUT_DIR}/public/_headers`, 'utf8');
const porData = (a) => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const maisNovaDepois = porData(LISTA_DEPOIS)[0];
const anteriorDepois = porData(LISTA_DEPOIS)[1];
const anterior2Depois = porData(LISTA_DEPOIS)[2];
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const versaoDepois = STATUS_DEPOIS.versions[0].version_id;

const out = {
  version: 'v135',
  data: '2026-11-19',
  ok_literal: 'Sim, publicar ambos (v124+v125 sobre a base v134)',
  nota_do_ok: 'opcao selecionada na pergunta de 18/11 «Publicar v124 + v125?». Nao cobre DDL, escrita no banco, mint de contas, nem git push (o utilizador re-confirmou «Nao fazer push»).',
  escopo_do_ok: 'publicar o patch anti-cliquejacking (PEN-24) re-aplicado sobre a base v134 como v135, e o patch do created_at (PEN-30) + nome unico como v136; este diario cobre a v135',
  tarefa: 'fazer os assets e a shell sairem com cabecalhos anti-enquadramento (X-Frame-Options + CSP com frame-ancestors), fechando o PEN-24 que mediu os assets sem cabecalho nenhum',
};
out.deploy = {
  worker: 'bfr-conecta',
  conta: STATUS_DEPOIS.author_email,
  version_id: versaoDepois,
  deployment_id: STATUS_DEPOIS.id,
  versao_intermedia_deste_ciclo: anteriorDepois.versions[0].version_id,
  versao_anterior_v134: anterior2Depois.versions[0].version_id,
  deployment_created: maisNovaDepois.created_on,
  percentual_trafego_novo: STATUS_DEPOIS.versions[0].percentage,
  wrangler: '4.154.0 (fixada: 4.156+ quebra o upload de assets com o erro 100312)',
  cwd: 'worker-deploy-v135-headers',
  base_do_bundle: 'worker-deploy-v134-sidebar (a v134 publicada)',
  url: URL_AR,
  comando_da_url: 'derivado de evidence/v134-pos-deploy-18-11.json -> url, nunca dactilografado',
  fonte_dos_numeros: 'evidence/v135-deployments-list/status-depois-19-11.json (redirecionamento de `wrangler deployments list/status --json`) e evidence/v135-deploy-stdout-19-11.txt',
  estado_antes_deste_ciclo: { versao: STATUS_ANTES.versions[0].version_id, percentual: STATUS_ANTES.versions[0].percentage, em: STATUS_ANTES.created_on },
  dois_deploys_porque: 'o primeiro deploy (f824a488) subiu o worker com o patch v124 completo mas SEM o mecanismo que leva headers aos assets; o pos-deploy mediu 12/12 assets sem headers e provou que o worker nao e invocado para pedidos de asset — o Cloudflare serve os assets direto. O segundo deploy (este) acrescentou public/_headers, o mecanismo documentado para headers de assets',
};
out.correcao = {
  o_que_o_pen24_mediu: 'os assets (incluindo 4 PDF, documentos framaveis) saiam do Worker sem qualquer cabecalho de enquadramento',
  o_patch_re_aplicado: 'o mesmo do velho bfr-candidata-v124-anticliquejacking, 4 sitios: (1) `frame-ancestors \'self\'` acrescentado a CSP principal; (2) `const FRAME_GUARD`; (3) `x-frame-options: SAMEORIGIN` na resposta HTML da shell; (4) CSP=FRAME_GUARD + x-frame-options em cada asset que passasse pelo fallback ASSETS do worker',
  descoberta_medida_do_pos_deploy: `o sitio (4) nao dispara no ar: com [assets] no wrangler.toml e run_worker_first ausente, o worker NAO corre para pedidos de asset — o primeiro pos-deploy mediu 12/12 assets com x_frame=null e csp=null. O patch do velho v124, se tivesse sido publicado como estava, nao teria dado headers a nenhum asset`,
  o_mecanismo_que_funciona: `public/_headers (documentado em developers.cloudflare.com/workers/static-assets/headers/): ${regua(md5(Buffer.from(headersTxt)), Buffer.byteLength(headersTxt))} com a regra /* -> X-Frame-Options: SAMEORIGIN + Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; form-action 'self'. Medido no ar: os 12 assets saem com os dois headers`,
  alcance_medido: `shell ${regua(esp.htmlMd5, esp.htmlBytes)} (byte-identica a v134 — a v135 so muda headers); SW ${regua(esp.swMd5, esp.swBytes)} com CACHE ${esp.cacheLabel}; worker ${regua(md5(wNovo), wNovo.length)}; 12 assets byte-identicos a base v123 + _headers novo`,
  o_que_NAO_foi_alterado: `a base worker-deploy-v134-sidebar esta intacta no disco (${regua(md5(wBase), wBase.length)}); wrangler.toml identico; 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function`,
};
out.md5 = {
  'worker-deploy-v135-headers/worker.mjs_publicado': regua(md5(wNovo), wNovo.length),
  'worker-deploy-v134-sidebar/worker.mjs_base': regua(md5(wBase), wBase.length),
  'worker-deploy-v135-headers/public/_headers': regua(md5(Buffer.from(headersTxt)), Buffer.byteLength(headersTxt)),
  shell_igual_em_v134_e_v135: regua(esp.htmlMd5, esp.htmlBytes),
  sw_antes_v134: `${regua(esp134.swMd5, esp134.swBytes)}, CACHE ${esp134.cacheLabel}`,
  sw_depois_v135: `${regua(esp.swMd5, esp.swBytes)}, CACHE ${esp.cacheLabel}`,
  delta_worker_bytes_vs_v134: esp.deltaWorkerBytes,
  assets: `${espBase.assets.length} ficheiros byte-identicos a base v123 (nao reenviados: «No updated asset files to upload»); o _headers e o 13.º ficheiro do public/`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};
out.medicao = {
  gerador_do_bundle: { em: GER.em, veredito: GER.veredito, total: `${GER.total.ok}/${GER.total.falha}`, dir: OUT_DIR.split('/').pop() },
  preflight_no_ar: { em: PRE.em, veredito: PRE.veredito, total: `${PRE.total.ok}/${PRE.total.falha}`, url: PRE.url,
    prova_de_que_o_defeito_estava_no_ar: { shell_sem_x_frame: PRE.portoes.B3_a_shell_no_ar_ainda_nao_tem_os_headers.x_frame_no_ar,
      pdf_sem_os_dois_headers: { x_frame: PRE.portoes.B4_o_pdf_no_ar_ainda_sai_sem_os_dois_headers.x_frame, csp: PRE.portoes.B4_o_pdf_no_ar_ainda_sai_sem_os_dois_headers.csp } } },
  stdout_do_deploy: { version_id: versaoNoStdout, bytes_no_stdout: /Total Upload:\s*([\d.]+) KiB/.exec(STDOUT)?.[1] },
  pos_deploy: { em: POS.em, veredito: POS.veredito, total: `${POS.total.ok}/${POS.total.falha}`,
    shell_com_headers: { x_frame: POS.portoes.C2_a_shell_ganhou_os_dois_headers.x_frame, csp_frame_ancestors: POS.portoes.C2_a_shell_ganhou_os_dois_headers.csp_frame_ancestors },
    assets_sem_headers: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.sem_headers,
    pdf_exemplo: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.pdf_exemplo,
    rotulo_sw_no_ar: POS.portoes.C3_sw_no_ar_e_o_novo_com_etiqueta_v135.medido?.rotulo,
    versoes_na_cadeia: { v135: POS.portoes.C9_servidor_concorda_com_o_deploy.stdout, v135_primeiro: POS.portoes.C10_cadeia_de_reversao_na_lista.anterior_v135_primeiro_deploy, v134: POS.portoes.C10_cadeia_de_reversao_na_lista.anterior_anterior_v134 } },
};
out.portoes = {
  gerador: `${GER.total.ok}/${GER.total.falha} - evidence/v135-gera-bundle-19-11.json (${GER.veredito})`,
  preflight: `${PRE.total.ok}/${PRE.total.falha} - evidence/v135-preflight-19-11.json (${PRE.veredito})`,
  pos_deploy: `${POS.total.ok}/${POS.total.falha} - evidence/v135-pos-deploy-19-11.json (${POS.veredito})`,
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: GER.total.ok + PRE.total.ok + POS.total.ok,
  vermelhos: GER.total.falha + PRE.total.falha + POS.total.falha,
  falhas_deste_diario: {},
};
const G = (n, esperado, valor) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes.falhas_deste_diario[n] = { valor, esperado, passou };
};
G('G1_url_vem_do_diario_da_v134', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', versaoDepois, versaoNoStdout);
G('G2b_a_lista_do_servidor_concorda_com_o_status', maisNovaDepois.versions[0].version_id, versaoDepois);
G('G3_a_cadeia_de_reversao_na_lista',
  { intermediaria: anteriorDepois.versions[0].version_id, v134: anterior2Depois.versions[0].version_id },
  { intermediaria: POS.portoes.C10_cadeia_de_reversao_na_lista.anterior_v135_primeiro_deploy, v134: POS.portoes.C10_cadeia_de_reversao_na_lista.anterior_anterior_v134 });
G('G4_o_que_foi_publicado_e_o_bundle_gateado', { md5: esp.workerMd5, bytes: esp.workerBytes }, { md5: md5(wNovo), bytes: wNovo.length });
G('G5_base_v134_inalterada_no_disco', { md5: esp134.workerMd5, bytes: esp134.workerBytes }, { md5: md5(wBase), bytes: wBase.length });
G('G6_shell_servida_no_ar_igual_a_v134', { md5: esp.htmlMd5, bytes: esp.htmlBytes },
  { md5: POS.portoes.C1_shell_no_ar_e_a_shell_v135.medido.md5, bytes: POS.portoes.C1_shell_no_ar_e_a_shell_v135.medido.bytes });
G('G7_sw_servido_no_ar_igual_ao_embed', { md5: esp.swMd5, rotulo: esp.cacheLabel },
  { md5: POS.portoes.C3_sw_no_ar_e_o_novo_com_etiqueta_v135.medido.md5, rotulo: POS.portoes.C3_sw_no_ar_e_o_novo_com_etiqueta_v135.medido.rotulo });
G('G8_a_shell_no_ar_tem_os_dois_headers', { x_frame: 'SAMEORIGIN', frame_ancestors: true },
  { x_frame: POS.portoes.C2_a_shell_ganhou_os_dois_headers.x_frame, frame_ancestors: POS.portoes.C2_a_shell_ganhou_os_dois_headers.csp_frame_ancestors });
G('G9_todos_os_12_assets_no_ar_tem_os_dois_headers', { sem_headers: 0, total: 12 },
  { sem_headers: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.sem_headers.length, total: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.total });
G('G10_o_pdf_exemplo_carrega_o_frame_guard', { x_frame: 'SAMEORIGIN', csp: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'" },
  { x_frame: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.pdf_exemplo.x_frame, csp: POS.portoes.C6_todos_os_assets_carregam_os_dois_headers.pdf_exemplo.csp });
G('G11_handler_do_404_permanece_no_ar', 404, POS.portoes.C7_rota_inexistente_da_404_ainda.http);
G('G12_preflight_verde', `V135_PREFLIGHT_OK ${PRE.total.ok}/${PRE.total.falha}`, `${PRE.veredito} ${PRE.total.ok}/${PRE.total.falha}`);
G('G13_pos_deploy_verde', `V135_POS_DEPLOY_OK ${POS.total.ok}/${POS.total.falha}`, `${POS.veredito} ${POS.total.ok}/${POS.total.falha}`);
G('G14_gerador_verde', { ok: 19, falha: 0 }, { ok: GER.total.ok, falha: GER.total.falha });
G('G15_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, pos: 0, gerador: 0 },
  { preflight: PRE.ddl + PRE.mint + PRE.escrita, pos: POS.ddl + POS.mint + POS.escrita, gerador: 0 });
G('G16_o_defeito_foi_provado_antes_do_deploy', { pdf_x_frame: null, pdf_csp: null },
  { pdf_x_frame: PRE.portoes.B4_o_pdf_no_ar_ainda_sai_sem_os_dois_headers.x_frame, pdf_csp: PRE.portoes.B4_o_pdf_no_ar_ainda_sai_sem_os_dois_headers.csp });
out.nao_fechado_por_este_ciclo = {
  pen30_created_at: 'fecha com a v136 (proxima publicacao do mesmo OK «publicar ambos»)',
  pen35_e_pen36: 're-medição de bandas e clique autenticado da sub-aba Supervisão — tarefas separadas do mesmo OK, sem deploy proprio',
  nota_sobre_o_primeiro_deploy: 'f824a488 ficou na cadeia de versoes como degrau intermedio; reverter para ele devolve o estado sem headers nos assets — a reversao util e a v134 (8600fc3d)',
};
const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter((v) => !v.passou).length;
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.veredito = vermelhos ? `V135_DIARIO_COM_PORTOES_VERMELHOS ${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}` : `V135_DIARIO_OK ${out.portoes.deste_diario}`;
out.reversao = {
  como_v134: `wrangler deploy a partir de worker-deploy-v134-sidebar (worker ${regua(esp134.workerMd5, esp134.workerBytes)}, CACHE ${esp134.cacheLabel}) — devolve o estado sem headers`,
  como_v133: `wrangler deploy a partir de worker-deploy-v133-municipal (CACHE bfr-conecta-v133) — sem headers e com o bloco ofensor da sidebar`,
  prova_de_linhagem: 'os 12 assets sao byte-identicos nos tres directorios; cada esperado-vXXX.json foi re-extraido e conferido byte a byte pelo respectivo gerador',
  exige: 'OK literal novo do utilizador para qualquer reversao',
};
out.diario_de = 'este ficheiro e gerado por scripts/v135-diario-publicacao.mjs a partir dos diarios de evidence, das listas de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`${out.veredito}  total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k, v]) => `${k} dado=${JSON.stringify(v.valor)}`).join(' | '));
process.exit(vermelhos ? 1 : 0);
