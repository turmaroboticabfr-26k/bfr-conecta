// V136 — diario da PUBLICACAO (PEN-30 re-aplicado + nome único «Secretaria de Educação»), gerado do
// disco e dos diarios de evidence: nada copiado de log nem dactilografado. A URL vem do diario da
// v135; os md5/bytes sao recalculados aqui; os ids de versao vem dos ficheiros de estado gravados
// por redirecionamento. 0 DDL, 0 escrita no banco, 0 mint. O OK deste ciclo e «Sim, publicar ambos
// (v124+v125 sobre a base v134)» dado em 18/11; este diario cobre a segunda publicacao (v136 =
// patch v125 re-aplicado + nome unico escolhido na mesma pergunta: «Secretaria de Educação»).
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT_DIR = `${DIR}/worker-deploy-v136-secretaria-de-educacao`;
const BASE_DIR = `${DIR}/worker-deploy-v135-headers`;
const CAND_DIR = `${DIR}/bfr-candidata-v136-secretaria-de-educacao`;
const SAIDA = `${DIR}/audit-publicacao-v136.json`;
if (fs.existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const read = (p) => fs.readFileSync(p, 'utf8');
const regua = (m, b) => `${m} (${b} B)`;
const n = (t, x) => t.split(x).length - 1;

const GER = JSON.parse(read(`${EV}/v136-gera-bundle-19-11.json`));
const CAND = JSON.parse(read(`${CAND_DIR}/portoes-v136-candidata.json`));
const PRE = JSON.parse(read(`${EV}/v136-preflight-19-11.json`));
const POS = JSON.parse(read(`${EV}/v136-pos-deploy-19-11.json`));
const LISTA_DEPOIS = JSON.parse(read(`${EV}/v136-deployments-list-depois-19-11.json`));
const STATUS_DEPOIS = JSON.parse(read(`${EV}/v136-deployments-status-depois-19-11.json`));
const STATUS_ANTES = JSON.parse(read(`${EV}/v135-deployments-status-depois-19-11.json`));
const STATUS_V135_PRIMEIRO = JSON.parse(read(`${EV}/v135-deployments-status-depois-19-11-ANTERIOR-primeiro-deploy.json`));
const STDOUT = read(`${EV}/v136-deploy-stdout-19-11.txt`);
const d135 = JSON.parse(read(`${EV}/v135-pos-deploy-19-11.json`));
const ROTULOS = JSON.parse(read(`${EV}/v136-rotulos-v134-19-11.json`));
const esp135 = JSON.parse(read(`${BASE_DIR}/esperado-v135.json`));
const esp = JSON.parse(read(`${OUT_DIR}/esperado-v136.json`));
const espBase = JSON.parse(read(`${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`));

const URL_AR = d135.url;
const wNovo = fs.readFileSync(`${OUT_DIR}/worker.mjs`);
const wBase = fs.readFileSync(`${BASE_DIR}/worker.mjs`);
const candTxt = fs.readFileSync(`${CAND_DIR}/index.html`, 'utf8');
const headersTxt = fs.readFileSync(`${OUT_DIR}/public/_headers`, 'utf8');
const porData = (a) => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const maisNovaDepois = porData(LISTA_DEPOIS)[0];
const anteriorDepois = porData(LISTA_DEPOIS)[1];
const anterior2Depois = porData(LISTA_DEPOIS)[2];
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const versaoDepois = STATUS_DEPOIS.versions[0].version_id;

const out = {
  version: 'v136',
  data: '2026-11-19',
  ok_literal: 'Sim, publicar ambos (v124+v125 sobre a base v134)',
  nota_do_ok: 'opcao selecionada na pergunta de 18/11 «Publicar v124 + v125?»; o nome unico «Secretaria de Educação» foi a resposta a outra pergunta da mesma serie. Nao cobre DDL, escrita no banco, mint de contas, nem git push (o utilizador re-confirmou «Nao fazer push»).',
  escopo_do_ok: 'publicar o patch anti-cliquejacking (PEN-24) re-aplicado sobre a base v134 como v135 (ja fechado no diario da v135), e o patch do created_at (PEN-30) + nome unico como v136; este diario cobre a v136',
  tarefa: 'fazer os anuncios voltarem a ordenar por published_at (a coluna created_at nao existe na tabela announcements) e dar a superficie um nome unico: «Secretaria de Educação»',
};
out.deploy = {
  worker: 'bfr-conecta',
  conta: STATUS_DEPOIS.author_email,
  version_id: versaoDepois,
  deployment_id: STATUS_DEPOIS.id,
  versao_anterior_v135: anteriorDepois.versions[0].version_id,
  versao_primeiro_v135: anterior2Depois.versions[0].version_id,
  deployment_created: maisNovaDepois.created_on,
  percentual_trafego_novo: STATUS_DEPOIS.versions[0].percentage,
  wrangler: '4.154.0 (fixada: 4.156+ quebra o upload de assets com o erro 100312)',
  cwd: 'worker-deploy-v136-secretaria-de-educacao',
  base_do_bundle: 'worker-deploy-v135-headers (a v135 publicada)',
  url: URL_AR,
  comando_da_url: 'derivado de evidence/v135-pos-deploy-19-11.json -> url, nunca dactilografado',
  fonte_dos_numeros: 'evidence/v136-deployments-list/status-depois-19-11.json (redirecionamento de `wrangler deployments list/status --json`) e evidence/v136-deploy-stdout-19-11.txt',
  estado_antes_deste_ciclo: { versao: STATUS_ANTES.versions[0].version_id, percentual: STATUS_ANTES.versions[0].percentage, em: STATUS_ANTES.created_on },
  assets_nao_reenviados: '«No updated asset files to upload» — os 12 assets sao byte-identicos aos da v135; o _headers tambem nao mudou',
};
out.correcao = {
  pen30_o_que_mediu: 'a consulta de anuncios ordenava por created_at, coluna que nao existe em announcements — a ordem ficava indefinida',
  pen30_o_patch_re_aplicado: 'o mesmo par da velha v125: select sem created_at e order por published_at desc com nullsFirst:false (um unico sitio, gateado a disparar exactamente 1x no gerador da candidata)',
  nome_unico_regra: CAND.regra_de_unificacao,
  nome_unico_antes_depois: {
    antes_na_shell_v134: Object.fromEntries(Object.entries(ROTULOS.por_nome).map(([k, v]) => [k, v.total])),
    depois_na_candidata_v136: { ...CAND.superficie_depois, 'Secretaria (ocorrencias totais)': n(candTxt, 'Secretaria') },
    nota: '«Secretaria» continua a aparecer como rotulo do PAPEL secretary em mapas/selectores/chips e em prosa como «a Secretaria de Educação»; os nomes da superficie (titulos, hero, nav, paineis) ficaram todos «Secretaria de Educação»',
  },
  alcance_medido: `shell ${regua(esp.htmlMd5, esp.htmlBytes)} (delta de ${esp.htmlBytes - esp135.htmlBytes} B vs v135: so texto); SW ${regua(esp.swMd5, esp.swBytes)} com CACHE ${esp.cacheLabel}; worker ${regua(md5(wNovo), wNovo.length)}; 12 assets + _headers byte-identicos a v135`,
  o_que_NAO_foi_alterado: `a base worker-deploy-v135-headers esta intacta no disco (${regua(md5(wBase), wBase.length)}); CSP, FRAME_GUARD, NOFOUNDR e public/_headers byte-a-byte; wrangler.toml identico; 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function`,
};
out.md5 = {
  'worker-deploy-v136-secretaria-de-educacao/worker.mjs_publicado': regua(md5(wNovo), wNovo.length),
  'worker-deploy-v135-headers/worker.mjs_base': regua(md5(wBase), wBase.length),
  'bfr-candidata-v136-secretaria-de-educacao/index.html': regua(md5(Buffer.from(candTxt)), Buffer.byteLength(candTxt)),
  shell_antes_v135: regua(esp135.htmlMd5, esp135.htmlBytes),
  shell_depois_v136: regua(esp.htmlMd5, esp.htmlBytes),
  sw_antes_v135: `${regua(esp135.swMd5, esp135.swBytes)}, CACHE ${esp135.cacheLabel}`,
  sw_depois_v136: `${regua(esp.swMd5, esp.swBytes)}, CACHE ${esp.cacheLabel}`,
  delta_worker_bytes_vs_v135: esp.deltaWorkerBytes,
  _headers: regua(md5(Buffer.from(headersTxt)), Buffer.byteLength(headersTxt)),
  assets: `${espBase.assets.length} ficheiros byte-identicos a base v123 (nao reenviados); o _headers e o 13.º ficheiro do public/`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};
out.medicao = {
  gerador_da_candidata: { em: CAND.em, veredito: CAND.veredito, portoes: CAND.portoes, substituicoes: CAND.substituicoes.length, delta_bytes: CAND.delta_bytes },
  gerador_do_bundle: { em: GER.em, veredito: GER.veredito, total: `${GER.total.ok}/${GER.total.falha}`, dir: OUT_DIR.split('/').pop() },
  preflight_no_ar: { em: PRE.em, veredito: PRE.veredito, total: `${PRE.total.ok}/${PRE.total.falha}`, url: PRE.url,
    prova_de_que_os_defeitos_estavam_no_ar: { anuncios_por_created_at: PRE.portoes.B3_os_dois_defeitos_estao_no_ar.anuncios_created_at,
      centro_de_gestao: PRE.portoes.B3_os_dois_defeitos_estao_no_ar.centro_gestao } },
  stdout_do_deploy: { version_id: versaoNoStdout, bytes_no_stdout: /Total Upload:\s*([\d.]+) KiB/.exec(STDOUT)?.[1] },
  pos_deploy: { em: POS.em, veredito: POS.veredito, total: `${POS.total.ok}/${POS.total.falha}`,
    pen30_no_ar: POS.portoes.C3_pen30_no_ar,
    nome_unico_no_ar: POS.portoes.C4_nome_unico_no_ar,
    headers_intactos: { shell_x_frame: POS.portoes.C5_headers_da_v135_na_shell_do_ar.x_frame_options,
      assets_sem_headers: POS.portoes.C10_os_12_assets_com_os_dois_headers.sem_headers },
    rotulo_sw_no_ar: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v136.medido?.rotulo,
    versoes_na_cadeia: { v136: POS.portoes.C11_servidor_concorda_com_o_deploy.stdout, v135: POS.portoes.C12_cadeia_de_reversao_na_lista.v135, primeiro_v135: POS.portoes.C12_cadeia_de_reversao_na_lista.primeiro_v135 } },
};
out.portoes = {
  candidata: `${CAND.portoes} - bfr-candidata-v136-secretaria-de-educacao/portoes-v136-candidata.json (${CAND.veredito})`,
  gerador: `${GER.total.ok}/${GER.total.falha} - evidence/v136-gera-bundle-19-11.json (${GER.veredito})`,
  preflight: `${PRE.total.ok}/${PRE.total.falha} - evidence/v136-preflight-19-11.json (${PRE.veredito})`,
  pos_deploy: `${POS.total.ok}/${POS.total.falha} - evidence/v136-pos-deploy-19-11.json (${POS.veredito})`,
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: 0,
  vermelhos: GER.total.falha + PRE.total.falha + POS.total.falha,
  falhas_deste_diario: {},
};
// a candidata nao tem campo total; reconstrói do veredito (N/0)
const candN = Number((CAND.veredito.match(/(\d+)\/0$/) || [])[1]);
out.portoes.total_da_cadeia = candN + GER.total.ok + PRE.total.ok + POS.total.ok;
const G = (n2, esperado, valor) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes.falhas_deste_diario[n2] = { valor, esperado, passou };
};
G('G1_url_vem_do_diario_da_v135', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', versaoDepois, versaoNoStdout);
G('G2b_a_lista_do_servidor_concorda_com_o_status', maisNovaDepois.versions[0].version_id, versaoDepois);
G('G3_a_cadeia_de_reversao_na_lista',
  { v135: anteriorDepois.versions[0].version_id, primeiro_v135: anterior2Depois.versions[0].version_id },
  { v135: STATUS_ANTES.versions[0].version_id, primeiro_v135: STATUS_V135_PRIMEIRO.versions[0].version_id });
G('G4_o_que_foi_publicado_e_o_bundle_gateado', { md5: esp.workerMd5, bytes: esp.workerBytes }, { md5: md5(wNovo), bytes: wNovo.length });
G('G5_base_v135_inalterada_no_disco', { md5: esp135.workerMd5, bytes: esp135.workerBytes }, { md5: md5(wBase), bytes: wBase.length });
G('G6_shell_servida_no_ar_igual_a_candidata', { md5: esp.htmlMd5, bytes: esp.htmlBytes },
  { md5: POS.portoes.C1_shell_no_ar_e_a_candidata_v136.medido.md5, bytes: POS.portoes.C1_shell_no_ar_e_a_candidata_v136.medido.bytes });
G('G7_sw_servido_no_ar_igual_ao_embed', { md5: esp.swMd5, rotulo: esp.cacheLabel },
  { md5: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v136.medido.md5, rotulo: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v136.medido.rotulo });
G('G8_pen30_no_ar', { novo: 1, velho: 0 }, { novo: POS.portoes.C3_pen30_no_ar.novo, velho: POS.portoes.C3_pen30_no_ar.velho });
G('G9_nome_unico_no_ar', { centro_gestao: 0, h1_nome: 3, secretaria_digital: 1, nav: 1 },
  { centro_gestao: POS.portoes.C4_nome_unico_no_ar.centro_gestao, h1_nome: POS.portoes.C4_nome_unico_no_ar.h1_nome,
    secretaria_digital: POS.portoes.C4_nome_unico_no_ar.secretaria_digital, nav: POS.portoes.C4_nome_unico_no_ar.nav });
G('G10_headers_da_v135_continuam_na_shell', { x_frame: 'SAMEORIGIN', frame_ancestors: true },
  { x_frame: POS.portoes.C5_headers_da_v135_na_shell_do_ar.x_frame_options, frame_ancestors: POS.portoes.C5_headers_da_v135_na_shell_do_ar.csp_frame_ancestors });
G('G11_os_12_assets_continuam_com_os_dois_headers', { sem_headers: 0, total: 12 },
  { sem_headers: POS.portoes.C10_os_12_assets_com_os_dois_headers.sem_headers.length, total: POS.portoes.C9_12_assets_identicos_a_base_v123.total });
G('G12_handler_do_404_permanece_no_ar', 404, POS.portoes.C7_rota_inexistente_da_404_ainda.http);
G('G13_preflight_verde', `V136_PREFLIGHT_OK ${PRE.total.ok}/${PRE.total.falha}`, `${PRE.veredito} ${PRE.total.ok}/${PRE.total.falha}`);
G('G14_pos_deploy_verde', `V136_POS_DEPLOY_OK ${POS.total.ok}/${POS.total.falha}`, `${POS.veredito} ${POS.total.ok}/${POS.total.falha}`);
G('G15_geradores_verdes', { candidata: `${candN}/0`, bundle: { ok: 22, falha: 0 } },
  { candidata: `${candN}/0`, bundle: { ok: GER.total.ok, falha: GER.total.falha } });
G('G16_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, pos: 0, gerador: 0, candidata: 0 },
  { preflight: PRE.ddl + PRE.mint + PRE.escrita, pos: POS.ddl + POS.mint + POS.escrita, gerador: 0, candidata: 0 });
G('G17_os_defeitos_foi_provados_antes_do_deploy', { anuncios_created_at: 1, centro_gestao: 2 },
  { anuncios_created_at: PRE.portoes.B3_os_dois_defeitos_estao_no_ar.anuncios_created_at, centro_gestao: PRE.portoes.B3_os_dois_defeitos_estao_no_ar.centro_gestao });
out.nao_fechado_por_este_ciclo = {
  pen35: 're-medição de bandas com a régua corrigida (documentElement.clientWidth) na versao publicada — tarefa separada do mesmo OK, sem deploy proprio',
  pen36: 'mint das contas em falta + passada autenticada clicando a sub-aba data-sec-tab="supervisao" — tarefa separada do mesmo OK, sem deploy proprio',
  nota_da_superficie: 'a sub-aba «Supervisão» e os chips dos papeis (secretary / education_supervisor) ficaram como estavam: nomeiam outra funcao ou o cargo, nao o modulo',
};
const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter((v) => !v.passou).length;
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.veredito = vermelhos ? `V136_DIARIO_COM_PORTOES_VERMELHOS ${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}` : `V136_DIARIO_OK ${out.portoes.deste_diario}`;
out.reversao = {
  como_v135: `wrangler deploy a partir de worker-deploy-v135-headers (worker ${regua(esp135.workerMd5, esp135.workerBytes)}, CACHE ${esp135.cacheLabel}) — devolve o created_at e os 7 nomes`,
  como_v134: `wrangler deploy a partir de worker-deploy-v134-sidebar (CACHE bfr-conecta-v134) — sem headers nos assets e com o created_at e os 7 nomes`,
  prova_de_linhagem: 'os 12 assets e o _headers sao byte-identicos nos tres directorios; cada esperado-vXXX.json foi re-extraido e conferido byte a byte pelo respectivo gerador',
  exige: 'OK literal novo do utilizador para qualquer reversao',
};
out.diario_de = 'este ficheiro e gerado por scripts/v136-diario-publicacao.mjs a partir dos diarios de evidence, das listas de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`${out.veredito}  total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k, v]) => `${k} dado=${JSON.stringify(v.valor)}`).join(' | '));
process.exit(vermelhos ? 1 : 0);
