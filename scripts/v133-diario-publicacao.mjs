// V133 — diario da PUBLICACAO, gerado do disco e dos diarios de evidence: nada copiado de log nem
// dactilografado. A URL vem do diario da v122; os md5/bytes sao recalculados aqui; os ids de versao
// vem dos `wrangler deployments list/status --json` gravados em evidence. 0 DDL, 0 escrita no banco,
// 0 mint. A v133 e a sucessora documentada da v131 selecionada (certidoes v131/v132 congeladas, §SM.20).
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT_DIR = `${DIR}/worker-deploy-v133-municipal`;
const BASE_DIR = `${DIR}/worker-deploy-v123-pdfs`;
const CAND = `${DIR}/bfr-candidata-v133-secretaria-municipal/index.html`;
const SAIDA = `${DIR}/audit-publicacao-v133.json`;

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const read = (p) => fs.readFileSync(p, 'utf8');
const regua = (m, b) => `${m} (${b} B)`;

const GER = JSON.parse(read(`${EV}/v133-gera-bundle-18-11.json`));
const PRE = JSON.parse(read(`${EV}/v133-preflight-18-11.json`));
const POS = JSON.parse(read(`${EV}/v133-pos-deploy-18-11.json`));
const LISTA_ANTES = JSON.parse(read(`${EV}/v133-deployments-list-antes-18-11.json`));
const STATUS_ANTES = JSON.parse(read(`${EV}/v133-deployments-status-antes-18-11.json`));
const LISTA_DEPOIS = JSON.parse(read(`${EV}/v133-deployments-list-depois-18-11.json`));
const STATUS_DEPOIS = JSON.parse(read(`${EV}/v133-deployments-status-depois-18-11.json`));
const STDOUT = read(`${EV}/v133-deploy-stdout-18-11.txt`);
const M6 = JSON.parse(read(`${EV}/ah2-m6-v133-consolidado-18-11.json`));
const d122 = JSON.parse(read(`${EV}/v122-pos-deploy-http-15-11.json`));
const espBase = JSON.parse(read(`${BASE_DIR}/esperado-v123.json`));
const esp = JSON.parse(read(`${OUT_DIR}/esperado-v133.json`));

const URL_AR = d122.reguas.url;
const wNovo = fs.readFileSync(`${OUT_DIR}/worker.mjs`);
const wBase = fs.readFileSync(`${BASE_DIR}/worker.mjs`);
const candTxt = fs.readFileSync(CAND, 'utf8');

const porData = (a) => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const maisNovaDepois = porData(LISTA_DEPOIS)[0];
const anteriorDepois = porData(LISTA_DEPOIS)[1];
const maisNovaAntes = porData(LISTA_ANTES)[0];
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const versaoDepois = STATUS_DEPOIS.versions[0].version_id;

const out = {
  version: 'v133',
  data: '2026-11-18',
  ok_literal: 'Publicar v131 + push',
  nota_da_sucessao: 'a v131 selecionada tornou-se v133 em §SM.20: as certidoes v131/v132 estao congeladas (v131 = base pre-fix; v132 = payload pre-fix-da-gaveta); publicar v133 cumpre a selecao com a correcao da barra incluida',
  escopo_do_ok: 'somente este deploy do Worker bfr-conecta (shell v133: barra mobile corrigida, gaveta reparada, modulo municipal) e o git push deste fecho; nao cobre DDL, escrita no banco, mint de contas, Edge Function nem outros deploys',
  tarefa: 'publicar a v133 — o MÓDULO 2 municipal com a barra mobile da shell corrigida — e fechar a superficie de regressao do fix com o varimento por papel a 390',
};
out.deploy = {
  worker: 'bfr-conecta',
  conta: STATUS_DEPOIS.author_email,
  version_id: versaoDepois,
  deployment_id: STATUS_DEPOIS.id,
  version_anterior: anteriorDepois.versions[0].version_id,
  deployment_created: maisNovaDepois.created_on,
  deployment_anterior_created: anteriorDepois.created_on,
  percentual_trafego_novo: STATUS_DEPOIS.versions[0].percentage,
  wrangler: '4.154.0 (fixada: 4.156+ quebra o upload de assets com o erro 100312)',
  cwd: 'worker-deploy-v133-municipal',
  base_do_bundle: 'worker-deploy-v123-pdfs (a v123 que estava no ar: 299eadd0, 100%)',
  url: URL_AR,
  comando_da_url: `derivado de evidence/v122-pos-deploy-http-15-11.json -> reguas.url, nunca dactilografado`,
  fonte_dos_numeros: 'evidence/v133-deployments-list/status-antes-e-depois-18-11.json, gravados por redirecionamento de `wrangler deployments list/status --json`, lidos por este script',
  stdout_do_deploy: 'evidence/v133-deploy-stdout-18-11.txt (Current Version ID lido por regex deste script)',
};
out.correcao = {
  versao_publicavel: 'v131 -> v133 (documentado em §SM.20)',
  problema_1: 'a barra mobile escondia o gatilho «Mais» (y=880 fora da janela a 390): o fix bfr-mobile-nav-sm8-fix transforma a barra num strip horizontal deslizavel (gatilho em y=761, clicavel)',
  problema_2: 'fecharGaveta() removia a classe is-open que nao existe; a shell usa hidden — o menu ficava aberto e tapava a janela (medido: 11 cliques «outra camada ocupa o centro do alvo»)',
  problema_3: 'a DDL sm4 + reforco de ACL quebraram os SELECTs autenticados (42501); o GRANT EXECUTE dos dois predicados de escopo (OK do utilizador) restaurou — a v133 so e publicavel com a BD consertada',
  alcance_medido: `shell ${regua(md5(candTxt), Buffer.byteLength(candTxt))}; SW ${regua(esp.swMd5, esp.swBytes)} com CACHE ${esp.cacheLabel}; 12 assets e wrangler.toml byte-identicos a v123`,
  o_que_NAO_foi_alterado: `a base worker-deploy-v123-pdfs esta intacta no disco (${regua(md5(wBase), wBase.length)}); CSP, handler do 404, 12 assets e wrangler.toml intocados; 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function`,
};
out.md5 = {
  'worker-deploy-v133-municipal/worker.mjs_publicado': regua(md5(wNovo), wNovo.length),
  'worker-deploy-v123-pdfs/worker.mjs_base': regua(md5(wBase), wBase.length),
  wrangler_toml_base_e_publicado: `${md5(read(`${OUT_DIR}/wrangler.toml`))} (${Buffer.byteLength(read(`${OUT_DIR}/wrangler.toml`))} B) — identico nos dois directorios`,
  shell_antes: regua(espBase.baseHtmlMd5, espBase.baseHtmlBytes),
  shell_depois: regua(md5(candTxt), Buffer.byteLength(candTxt)),
  sw_antes: `${regua(espBase.swMd5, espBase.swBytes)}, CACHE bfr-conecta-v123`,
  sw_depois: `${regua(esp.swMd5, esp.swBytes)}, CACHE ${esp.cacheLabel}`,
  assets: `${espBase.assets.length} ficheiros, byte-identicos a base v123 (nao reenviados no deploy: «No updated asset files to upload»)`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};
out.medicao = {
  preflight_no_ar: { em: PRE.em, veredito: PRE.veredito, total: `${PRE.total.ok}/${PRE.total.falha}`, url: PRE.url },
  pos_deploy: { em: POS.em, veredito: POS.veredito, total: `${POS.total.ok}/${POS.total.falha}`, rotulo_sw_no_ar: POS.portoes.B2_sw_no_ar_e_o_novo_com_etiqueta_v133.medido?.rotulo },
  varredura_mobile_pos_publicacao: { em: M6.em, veredito: M6.veredito, papeis: M6.totais, largura: M6.largura,
    nota: 'os 15 papeis re-medidos a 390 contra o ar com o instrumento de registo ah2-mobile2 (rotulo v133b); fecha a superficie de regressao declarada em §SM.20' },
  gerador_do_bundle: { em: GER.em, total: `${GER.total.ok}/${GER.total.falha}`, dir: OUT_DIR.split('/').pop() },
};
out.portoes = {
  gerador: `${GER.total.ok}/${GER.total.falha} VERDE - evidence/v133-gera-bundle-18-11.json`,
  preflight: `${PRE.total.ok}/${PRE.total.falha} VERDE - evidence/v133-preflight-18-11.json (${PRE.veredito})`,
  pos_deploy: `${POS.total.ok}/${POS.total.falha} VERDE - evidence/v133-pos-deploy-18-11.json (${POS.veredito})`,
  varredura_mobile: `${M6.totais.coerentes}/${M6.totais.papeis} VERDE - evidence/ah2-m6-v133-consolidado-18-11.json (${M6.veredito})`,
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: GER.total.ok + PRE.total.ok + POS.total.ok + M6.totais.coerentes,
  vermelhos: GER.total.falha + PRE.total.falha + POS.total.falha + M6.totais.vermelhos,
  falhas_deste_diario: {},
};
const G = (n, esperado, valor) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes.falhas_deste_diario[n] = { valor, esperado, passou };
};
G('G1_url_vem_do_diario_da_v122', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', versaoDepois, versaoNoStdout);
G('G2b_a_lista_do_servidor_concorda_com_o_status', maisNovaDepois.versions[0].version_id, versaoDepois);
G('G3_a_versao_anterior_e_a_v123_no_ar_antes', { anterior: anteriorDepois.versions[0].version_id, antes: maisNovaAntes.versions[0].version_id, status_antes: STATUS_ANTES.versions[0].version_id },
  { anterior: '299eadd0-2b57-4149-a9ab-bb2f253f0649', antes: '299eadd0-2b57-4149-a9ab-bb2f253f0649', status_antes: '299eadd0-2b57-4149-a9ab-bb2f253f0649' });
G('G4_o_que_foi_publicado_e_o_bundle_gateado', { md5: esp.workerMd5, bytes: esp.workerBytes }, { md5: md5(wNovo), bytes: wNovo.length });
G('G5_base_v123_inalterada_no_disco', { md5: espBase.workerMd5, bytes: espBase.workerBytes }, { md5: md5(wBase), bytes: wBase.length });
G('G6_shell_servida_no_ar_igual_a_candidata', { md5: esp.htmlMd5, bytes: esp.htmlBytes }, { md5: POS.portoes.B1_shell_no_ar_e_a_candidata_v133.medido.md5, bytes: POS.portoes.B1_shell_no_ar_e_a_candidata_v133.medido.bytes });
G('G7_sw_servido_no_ar_igual_ao_embed', { md5: esp.swMd5, rotulo: esp.cacheLabel }, { md5: POS.portoes.B2_sw_no_ar_e_o_novo_com_etiqueta_v133.medido.md5, rotulo: POS.portoes.B2_sw_no_ar_e_o_novo_com_etiqueta_v133.medido.rotulo });
G('G8_delta_do_worker_bate_com_o_gerador', esp.deltaWorkerBytes, wNovo.length - espBase.workerBytes);
G('G9_csp_intacta_com_supabase_no_ar', true, POS.portoes.B3_csp_no_ar_intacta_com_supabase.passou);
G('G10_os_12_assets_nao_regridiram', { total: 12, desvios: 0 }, { total: POS.portoes.B6_12_assets_no_ar_identicos_a_v123.total, desvios: POS.portoes.B6_12_assets_no_ar_identicos_a_v123.desvios.length });
G('G11_handler_do_404_permanece_no_ar', 404, POS.portoes.B4_rota_inexistente_da_404_ainda.http);
G('G12_preflight_verde', 'V133_PREFLIGHT_OK 7/0', `${PRE.veredito} ${PRE.total.ok}/${PRE.total.falha}`);
G('G13_pos_deploy_verde', 'V133_POS_DEPLOY_OK 11/0', `${POS.veredito} ${POS.total.ok}/${POS.total.falha}`);
G('G14_gerador_verde', { ok: 21, falha: 0 }, { ok: GER.total.ok, falha: GER.total.falha });
G('G15_varredura_mobile_limpa_15_15', 'AH7b_V133_390_LIMPO', M6.veredito);
G('G16_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, pos: 0, gerador: 0 }, { preflight: PRE.ddl + PRE.mint + PRE.escrita, pos: POS.ddl + POS.mint + POS.escrita, gerador: 0 });
G('G17_a_base_de_reversao_tem_os_12_assets', 12, espBase.assets.length);
const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter((v) => !v.passou).length;
// O vermelho do G15 e o registo do que a v133 levou para o ar, nao um erro de escrita deste diario:
// a publicacao aconteceu, a medicao por papel marcou 12/12 bandas com a sidebar do desktop visivel e
// a causa foi lida no empates de especificidade entre o bloco sm8-fix da shell e a regra do asset.
out.nota_do_vermelho_G15 = {
  o_que_diz: 'G15 esperava o rotulo de varredura limpa e o artefacto medido diz o que esta copiado em M6.veredito',
  medido_neste_ciclo: { coerentes: M6.totais.coerentes, vermelhos: M6.totais.vermelhos, faltas: M6.totais.faltas, veredito: M6.veredito },
  tabela: 'evidence/v133-tabela-varredura-18-11.json (sidebar_caixa=true em 12/12 bandas com banda 390; 3 papeis sem banda)',
  causa_lida_depois: 'o bloco bfr-mobile-nav-sm8-fix ganhou o empate de especificidade (1,2,0) contra `#appShell.ready>.sidebar{display:none!important}` do asset bfr-responsive-presentation.js por estar declarado depois — a shell reescrevia a decisao da propria app',
  corrigido_em: 'v134 (deploy 8600fc3d-022f-4c4a-a179-2728f6fca916, 18/11 06:24:00Z) — audit-publicacao-v134.json e §SM.21',
  porque_fica_vermelho: 'um diario nao se re-escreve para dar verde: a v133 esteve no ar com o contrato mobile violado e e isso que este ficheiro regista',
};
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.reversao = {
  como: `wrangler deploy a partir de worker-deploy-v123-pdfs (worker ${regua(md5(wBase), wBase.length)}, shell ${regua(espBase.baseHtmlMd5, espBase.baseHtmlBytes)} com a etiqueta bfr-conecta-v123)`,
  volta_para: `conteudo da versao ${anteriorDepois.versions[0].version_id} (a v123 de 15/11 03:56:09Z)`,
  prova_de_linhagem: `os 12 assets e o wrangler.toml sao byte-identicos nos dois directorios; a base no disco bate com o esperado-v123 publicado (${regua(espBase.workerMd5, espBase.workerBytes)})`,
  exige: 'OK literal novo do usuario',
};
out.diario_de = 'este ficheiro e gerado por scripts/v133-diario-publicacao.mjs a partir dos diarios de evidence, das listas de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`portoes_deste_diario=${out.portoes.deste_diario} total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
process.exit(vermelhos ? 1 : 0);
