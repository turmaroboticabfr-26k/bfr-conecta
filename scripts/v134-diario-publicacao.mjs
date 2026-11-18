// V134 — diario da PUBLICACAO, gerado do disco e dos diarios de evidence: nada copiado de log nem
// dactilografado. A URL vem do diario da v133; os md5/bytes sao recalculados aqui; os ids de versao
// vem dos `wrangler deployments list/status --json` gravados por redirecionamento. 0 DDL, 0 escrita
// no banco, 0 mint. O OK deste ciclo e a opcao «Corrigir com v134», cuja descricao declarava o novo
// deploy e o push. O portao G15 e a PROMESSA medida (sidebar escondida), nao um rotulo optimista:
// os vermelhos de conteudo pre-existentes continuam a contar-se e nao se apagam para dar verde.
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const EV = `${DIR}/evidence`;
const OUT_DIR = `${DIR}/worker-deploy-v134-sidebar`;
const BASE_DIR = `${DIR}/worker-deploy-v123-pdfs`;
const CAND_DIR = `${DIR}/bfr-candidata-v134-sidebar-escondida`;
const SAIDA = `${DIR}/audit-publicacao-v134.json`;
if (fs.existsSync(SAIDA)) throw new Error('ABORTA: ' + SAIDA + ' existe — renomeie como ANTERIOR e re-corra');

const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const read = (p) => fs.readFileSync(p, 'utf8');
const regua = (m, b) => `${m} (${b} B)`;

const GER = JSON.parse(read(`${EV}/v134-gera-bundle-18-11.json`));
const PRE = JSON.parse(read(`${EV}/v134-preflight-18-11.json`));
const POS = JSON.parse(read(`${EV}/v134-pos-deploy-18-11.json`));
const M6 = JSON.parse(read(`${EV}/ah2-m6-v134-consolidado-18-11.json`));
const TAB = JSON.parse(read(`${EV}/v134-tabela-varredura-18-11.json`));
const LISTA_DEPOIS = JSON.parse(read(`${EV}/v134-deployments-list-depois-18-11.json`));
const STATUS_DEPOIS = JSON.parse(read(`${EV}/v134-deployments-status-depois-18-11.json`));
const STATUS_ANTES = JSON.parse(read(`${EV}/v133-deployments-status-depois-18-11.json`));
const STDOUT = read(`${EV}/v134-deploy-stdout-18-11.txt`);
const d133 = JSON.parse(read(`${EV}/v133-pos-deploy-18-11.json`));
const espBase = JSON.parse(read(`${BASE_DIR}/esperado-v123.json`));
const esp133 = JSON.parse(read(`${DIR}/worker-deploy-v133-municipal/esperado-v133.json`));
const esp = JSON.parse(read(`${OUT_DIR}/esperado-v134.json`));
const bloco = JSON.parse(read(`${CAND_DIR}/portoes-v134-candidata.json`));

const URL_AR = d133.url;
const wNovo = fs.readFileSync(`${OUT_DIR}/worker.mjs`);
const wBase = fs.readFileSync(`${BASE_DIR}/worker.mjs`);
const candTxt = fs.readFileSync(`${CAND_DIR}/index.html`, 'utf8');
// A shell e 3 548 904 BYTES mas 3 530 845 CARACTERES: chamar «offset de bytes» ao indice de
// `indexOf` e a mesma classe de defeito do `candidata_bytes: html.length`. As duas unidades saem
// medidas daqui, do mesmo ficheiro, e a prosa interpola — nenhum digito de deslocamento e dactilografado.
const txt133 = fs.readFileSync(`${DIR}/bfr-candidata-v133-secretaria-municipal/index.html`, 'utf8');
const buf133 = Buffer.from(txt133, 'utf8');
const desloc = (s) => ({ em_caracteres: txt133.indexOf(s), em_bytes: buf133.indexOf(Buffer.from(s, 'utf8')) });
const OF_BLOCO = desloc('<style id="bfr-mobile-nav-sm8-fix"');
const OF_HEAD = desloc('</head>');
// A régua de ordem so vale se disparar: o fixture negativo e a propria shell da v134, de onde o bloco foi
// cortado. Aplicar-lhe o MESMO predicado tem de dar vermelho (marcador ausente), nao o verde por acaso.
const FIX = (() => { const t = candTxt, b = Buffer.from(t, 'utf8'); const d = (s) => ({ em_caracteres: t.indexOf(s), em_bytes: b.indexOf(Buffer.from(s, 'utf8')) });
  const bloco = d('<style id="bfr-mobile-nav-sm8-fix"'), head = d('</head>');
  return { bloco, head, predicado_daria_vermelho: !(bloco.em_caracteres >= 0 && bloco.em_bytes >= 0 && bloco.em_caracteres > head.em_caracteres && bloco.em_bytes > head.em_bytes) }; })();

const porData = (a) => [...a].sort((x, y) => y.created_on.localeCompare(x.created_on));
const maisNovaDepois = porData(LISTA_DEPOIS)[0];
const anteriorDepois = porData(LISTA_DEPOIS)[1];
const anterior2Depois = porData(LISTA_DEPOIS)[2];
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
const versaoDepois = STATUS_DEPOIS.versions[0].version_id;
const novasTotal = TAB.papais.reduce((s, l) => s + (l.novas || []).length, 0);
const preExistenteTotal = TAB.papais.reduce((s, l) => s + (l.preexistentes || []).length, 0);

const out = {
  version: 'v134',
  data: '2026-11-18',
  ok_literal: 'Corrigir com v134',
  nota_do_ok: 'opcao selecionada na pergunta de remediacao; a propria opcao declarava «gerador/preflight/deploy/pos-deploy novos e re-varredura» e «precisa de OK literal para o novo deploy e push». Nao cobre DDL, escrita no banco, mint de contas nem outros deploys.',
  escopo_do_ok: 'somente este deploy do Worker bfr-conecta (shell v134) e o git push deste fecho',
  tarefa: 'retirar da shell publicada o bloco <style id="bfr-mobile-nav-sm8-fix"> que violava o contrato mobile da app, conservando o MÓDULO 2 municipal e o fix JS da gaveta',
};
out.deploy = {
  worker: 'bfr-conecta',
  conta: STATUS_DEPOIS.author_email,
  version_id: versaoDepois,
  deployment_id: STATUS_DEPOIS.id,
  version_anterior_v133: anteriorDepois.versions[0].version_id,
  version_anterior2_v123: anterior2Depois.versions[0].version_id,
  deployment_created: maisNovaDepois.created_on,
  percentual_trafego_novo: STATUS_DEPOIS.versions[0].percentage,
  wrangler: '4.154.0 (fixada: 4.156+ quebra o upload de assets com o erro 100312)',
  cwd: 'worker-deploy-v134-sidebar',
  base_do_bundle: 'worker-deploy-v123-pdfs (a base de embeds nunca mudou; o ar estava na v133 de82cec5)',
  url: URL_AR,
  comando_da_url: 'derivado de evidence/v133-pos-deploy-18-11.json -> url, nunca dactilografado',
  fonte_dos_numeros: 'evidence/v134-deployments-list/status-depois-18-11.json (redirecionamento de `wrangler deployments list/status --json`) e evidence/v134-deploy-stdout-18-11.txt',
  estado_antes_deste_deploy: { versao: STATUS_ANTES.versions[0].version_id, percentual: STATUS_ANTES.versions[0].percentage, em: STATUS_ANTES.created_on },
};
out.correcao = {
  o_que_a_v133_quebrou: `o bloco sm8-fix pedia \`#appShell.ready .sidebar{display:flex!important}\` dentro da shell; o asset bfr-responsive-presentation.js pedia \`#appShell.ready>.sidebar{display:none!important}\` (linha 236, tambem 364); as duas regras tem a MESMA especificidade (1,2,0) e as duas sao !important, por isso o empate decide-se pela ordem do documento — o estilo do asset e anexado ao <head> em runtime (bfr-responsive-presentation.js:382 \`document.head.append(style)\`) e o bloco da shell vive no <body> (a tag de abertura comeca no caractere ${OF_BLOCO.em_caracteres} / byte ${OF_BLOCO.em_bytes} da shell v133, e o </head> fecha no caractere ${OF_HEAD.em_caracteres} / byte ${OF_HEAD.em_bytes}): o bloco fica depois e ganhou, ressuscitando a barra do desktop em <=800 px contra a decisao da propria app. As quatro posicoes sao medidas por este script com \`indexOf\` nas duas unidades (esta shell tem ${buf133.length} bytes mas ${txt133.length} caracteres, por isso a unidade e sempre nomeada)`,
  prova_do_empate: 'A/B medido no mesmo instrumento e na mesma largura, sem mais nenhum byte alterado na shell: os true da v133 estao contados em evidence/v133-tabela-varredura-18-11.json e a corrida da v134 em evidence/v134-tabela-varredura-18-11.json; o portao G15 deste diario e que diz se a promessa se cumpriu, com o valor medido copiado do consolidado',
  posicao_medida_da_ofensora: { bloco: OF_BLOCO, head_fecha: OF_HEAD,
    nota: 'indexOf corrido por este script sobre a candidata v133; -1 diria «o marcador nao esta la», por isso o portao G13f exige as duas presencas e a ordem nas duas unidades',
    fixture_negativo_shell_v134: FIX },
  porque_a_v133_o_fazia: 'resposta a uma sonda errada: o sm7 media [data-mobile-more]/#mobileMoreMenu, que e markup do desktop; a barra do telefone e #bfrMobileBottomNav/[data-bfr-mobile-route] com o «Mais» dentro da gaveta #bfrMobileDrawer — a armadilha ja documentada no cabecalho do instrumento ah2-mobile2',
  o_que_a_v134_faz: `corte de um unico bloco <style> por marcador e fecho </style>: ${bloco.bloco_removido.bytes} B removidos (${regua(bloco.bloco_removido.md5, bloco.bloco_removido.bytes)}), ${bloco.bloco_removido.regras} regras, 0 alteracao em qualquer outro byte (C6/C7 do gerador da candidata)`,
  conservado: { safe_area_fix: 'bfr-mobile-nav-safe-area-fix permanece (1 ocorrencia)', gaveta_js: 'fecharGaveta (2) — o reparo do is-open/hidden',
    municipal: 'data-bfr-municipal-nav (3), bfrMunicipalView (50), mun-tab (8)', sw: 'sw-v4.js?v=45 (3) e a etiqueta de cache bfr-conecta-v134' },
  alcance_medido: `shell ${regua(md5(candTxt), Buffer.byteLength(candTxt))}; SW ${regua(esp.swMd5, esp.swBytes)} com CACHE ${esp.cacheLabel}; worker ${regua(md5(wNovo), wNovo.length)}; 12 assets e wrangler.toml byte-identicos a base v123`,
  o_que_NAO_foi_alterado: `a base worker-deploy-v123-pdfs esta intacta no disco (${regua(md5(wBase), wBase.length)}); CSP, handler do 404, 12 assets e wrangler.toml intocados; 0 DDL, 0 escrita no banco, 0 mint, 0 Edge Function`,
};
out.md5 = {
  'worker-deploy-v134-sidebar/worker.mjs_publicado': regua(md5(wNovo), wNovo.length),
  'worker-deploy-v123-pdfs/worker.mjs_base': regua(md5(wBase), wBase.length),
  shell_antes_v133: regua(esp133.htmlMd5, esp133.htmlBytes),
  shell_depois_v134: regua(md5(candTxt), Buffer.byteLength(candTxt)),
  delta_shell_bytes: Buffer.byteLength(candTxt) - esp133.htmlBytes,
  delta_worker_bytes_vs_base_v123: esp.deltaWorkerBytes,
  sw_antes_v133: `${regua(esp133.swMd5, esp133.swBytes)}, CACHE ${esp133.cacheLabel}`,
  sw_depois_v134: `${regua(esp.swMd5, esp.swBytes)}, CACHE ${esp.cacheLabel}`,
  assets: `${espBase.assets.length} ficheiros byte-identicos a base v123 (nao reenviados: «No updated asset files to upload»)`,
  emissao: 'md5 e bytes recalculados do disco por este script; nada neste bloco foi copiado de um log',
};
out.medicao = {
  gerador_do_bundle: { em: GER.em, veredito: GER.veredito, total: `${GER.total.ok}/${GER.total.falha}`, dir: OUT_DIR.split('/').pop() },
  preflight_no_ar: { em: PRE.em, veredito: PRE.veredito, total: `${PRE.total.ok}/${PRE.total.falha}`, url: PRE.url,
    // O artefacto do preflight guarda tambem o TEXTO integral da shell que estava no ar (os bytes estao
    // em `shell_antes_no_ar` abaixo, lidos do proprio artefacto), byte-a-byte iguais a
    // `bfr-candidata-v133-secretaria-municipal/index.html`, provado por md5 neste script. Esse ficheiro
    // de evidence fica fora do indice por causa do tamanho; o que ele prova passa para aqui, medido: a
    // ofensora estava mesmo na shell servida antes deste deploy.
    prova_de_que_a_ofensora_estava_no_ar: PRE.portoes.B3_a_ofensora_esta_mesmo_na_shell_servida.ocorrencias_na_shell_v133,
    shell_antes_no_ar: { bytes: PRE.medido_antes.shell.bytes, md5: PRE.medido_antes.shell.md5 },
    texto_antes_igual_a_candidata_v133_versionada: md5(buf133) === PRE.medido_antes.shell.md5 },
  stdout_do_deploy: { version_id: versaoNoStdout, bytes_no_stdout: /Total Upload:\s*([\d.]+) KiB/.exec(STDOUT)?.[1] },
  pos_deploy: { em: POS.em, veredito: POS.veredito, total: `${POS.total.ok}/${POS.total.falha}`,
    rotulo_sw_no_ar: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v134.medido?.rotulo,
    ocorrencias_do_bloco_ofensor_na_shell_servida: POS.portoes.C3_o_bloco_ofensor_saiu_dos_bytes_servidos.ocorrencias_na_shell_servida,
    versoes_na_cadeia: { v134: POS.portoes.C10_servidor_concorda_com_o_deploy.stdout, v133: POS.portoes.C11_cadeia_de_reversao_na_lista.anterior_v133, v123: POS.portoes.C11_cadeia_de_reversao_na_lista.anterior_anterior_v123 } },
  varredura_mobile_390: { em: M6.em, veredito: M6.veredito, promessa: M6.promessa, totais: M6.totais, shells_medidas: M6.shells_medidas },
  tabela_da_varredura: { em: TAB.em, veredito: TAB.veredito, contagens: TAB.contagens, novas: novasTotal, preexistentes: preExistenteTotal,
    papeis_sem_banda_390: TAB.papais.filter((l) => l.v134a !== 'com_banda').map((l) => `${l.papel}:${l.v134a}`) },
};
out.portoes = {
  gerador: `${GER.total.ok}/${GER.total.falha} - evidence/v134-gera-bundle-18-11.json (${GER.veredito})`,
  preflight: `${PRE.total.ok}/${PRE.total.falha} - evidence/v134-preflight-18-11.json (${PRE.veredito})`,
  pos_deploy: `${POS.total.ok}/${POS.total.falha} - evidence/v134-pos-deploy-18-11.json (${POS.veredito})`,
  varredura_mobile: `${M6.totais.coerentes}/${M6.totais.papeis} coerentes, ${M6.totais.faltas} faltas, ${M6.totais.vermelhos} vermelhos - ${M6.veredito}`,
  deste_diario: 'ainda nao calculado',
  total_da_cadeia: GER.total.ok + PRE.total.ok + POS.total.ok + M6.totais.coerentes,
  vermelhos: GER.total.falha + PRE.total.falha + POS.total.falha + M6.totais.vermelhos,
  falhas_deste_diario: {},
};
const G = (n, esperado, valor) => {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes.falhas_deste_diario[n] = { valor, esperado, passou };
};
G('G1_url_vem_do_diario_da_v133', URL_AR, out.deploy.url);
G('G2_a_versao_no_ar_e_a_deste_diario', versaoDepois, versaoNoStdout);
G('G2b_a_lista_do_servidor_concorda_com_o_status', maisNovaDepois.versions[0].version_id, versaoDepois);
G('G3_a_versao_anterior_e_a_v133_e_a_precedente_a_v123',
  { anterior: anteriorDepois.versions[0].version_id, anterior2: anterior2Depois.versions[0].version_id, antes_deste_deploy: STATUS_ANTES.versions[0].version_id },
  { anterior: 'de82cec5-6422-47ce-b34b-a499fd2a2a17', anterior2: '299eadd0-2b57-4149-a9ab-bb2f253f0649', antes_deste_deploy: 'de82cec5-6422-47ce-b34b-a499fd2a2a17' });
G('G4_o_que_foi_publicado_e_o_bundle_gateado', { md5: esp.workerMd5, bytes: esp.workerBytes }, { md5: md5(wNovo), bytes: wNovo.length });
G('G5_base_v123_inalterada_no_disco', { md5: espBase.workerMd5, bytes: espBase.workerBytes }, { md5: md5(wBase), bytes: wBase.length });
G('G6_shell_servida_no_ar_igual_a_candidata_v134', { md5: esp.htmlMd5, bytes: esp.htmlBytes },
  { md5: POS.portoes.C1_shell_no_ar_e_a_candidata_v134.medido.md5, bytes: POS.portoes.C1_shell_no_ar_e_a_candidata_v134.medido.bytes });
G('G7_sw_servido_no_ar_igual_ao_embed', { md5: esp.swMd5, rotulo: esp.cacheLabel },
  { md5: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v134.medido.md5, rotulo: POS.portoes.C2_sw_no_ar_e_o_novo_com_etiqueta_v134.medido.rotulo });
// O esperado nao e o numero dactilografado do ciclo anterior: e o tamanho do bloco que a candidata
// regista ter cortado. Assim o portao afirma a identidade «a shell encolheu exactamente o bloco».
G('G8_delta_da_shell_igual_ao_bloco_removido', -bloco.bloco_removido.bytes, Buffer.byteLength(candTxt) - esp133.htmlBytes);
G('G9_csp_intacta_com_supabase_no_ar', true, POS.portoes.C6_csp_no_ar_intacta_com_supabase.passou);
G('G10_os_12_assets_nao_regridiram', { total: 12, desvios: 0 },
  { total: POS.portoes.C9_12_assets_no_ar_identico_a_base_v123.total, desvios: POS.portoes.C9_12_assets_no_ar_identico_a_base_v123.desvios.length });
G('G11_handler_do_404_permanece_no_ar', 404, POS.portoes.C7_rota_inexistente_da_404_ainda.http);
G('G12_preflight_verde', `V134_PREFLIGHT_OK ${PRE.total.ok}/${PRE.total.falha}`, `${PRE.veredito} ${PRE.total.ok}/${PRE.total.falha}`);
G('G13_pos_deploy_verde', `V134_POS_DEPLOY_OK ${POS.total.ok}/${POS.total.falha}`, `${POS.veredito} ${POS.total.ok}/${POS.total.falha}`);
G('G13b_o_bloco_ofensor_nao_esta_nos_bytes_servidos', { ocorrencias: 0, passou: true },
  { ocorrencias: POS.portoes.C3_o_bloco_ofensor_saiu_dos_bytes_servidos.ocorrencias_na_shell_servida, passou: POS.portoes.C3_o_bloco_ofensor_saiu_dos_bytes_servidos.passou });
G('G13c_a_regra_de_esconder_a_sidebar_esta_no_asset_servido', true, POS.portoes.C5_a_regra_que_esconde_a_sidebar_esta_no_asset_servido_e_e_a_da_base.passou);
// A prova de que o preflight nao corria contra uma shell qualquer: a ofensora estava la (1 ocorrencia)
// e o texto que ele mediu e o mesmo da candidata v133 ja versionada — por isso o blob de 3 548 904 B
// pode ficar fora do indice sem que nada deixe de ser verificavel no indice.
G('G13d_a_ofensora_estava_na_shell_servida_antes', 1, out.medicao.preflight_no_ar.prova_de_que_a_ofensora_estava_no_ar);
G('G13e_o_texto_medido_pelo_preflight_e_a_candidata_v133_versionada', { igual: true, md5: PRE.medido_antes.shell.md5 },
  { igual: out.medicao.preflight_no_ar.texto_antes_igual_a_candidata_v133_versionada, md5: md5(buf133) });
// A ordem do documento e o que decide o empate, logo a posicao da ofensora e parte da prova — medida nas
// duas unidades, porque `indexOf` devolve caracteres e este projecto ja chamou «bytes» a um length.
G('G13f_a_ofensora_fica_depois_do_head_nas_duas_unidades',
  { bloco_presente: true, head_presente: true, depois_do_head_em_caracteres: true, depois_do_head_em_bytes: true },
  { bloco_presente: OF_BLOCO.em_caracteres >= 0 && OF_BLOCO.em_bytes >= 0,
    head_presente: OF_HEAD.em_caracteres >= 0 && OF_HEAD.em_bytes >= 0,
    depois_do_head_em_caracteres: OF_BLOCO.em_caracteres > OF_HEAD.em_caracteres,
    depois_do_head_em_bytes: OF_BLOCO.em_bytes > OF_HEAD.em_bytes });
G('G13g_a_regua_de_ordem_dispara_no_fixture_negativo', true, FIX.predicado_daria_vermelho);
G('G14_gerador_verde', { ok: 23, falha: 0 }, { ok: GER.total.ok, falha: GER.total.falha });
// A promessa deste ciclo, medida no ar e nao prometida:
G('G15_promessa_sidebar_escondida_em_todas_as_bandas', { cumprida: true, papeis_com_sidebar: [] },
  { cumprida: M6.promessa.cumprida, papeis_com_sidebar: M6.promessa.papeis_que_ainda_mostram_a_sidebar });
G('G15b_a_shell_medida_na_varredura_e_a_publicada', [esp.htmlMd5], M6.shells_medidas);
G('G15c_nenhuma_falha_nova_contra_as_linhas_de_base_m5', 0, novasTotal);
G('G15d_a_gaveta_abre_a_toque_em_todas_as_bandas_medidas', M6.totais.bandas_medidas, M6.totais.gaveta_aberta_a_toque);
G('G16_nada_de_banco_ddl_mint_ou_edge', { preflight: 0, pos: 0, gerador: 0 },
  { preflight: PRE.ddl + PRE.mint + PRE.escrita, pos: POS.ddl + POS.mint + POS.escrita, gerador: 0 });
G('G17_a_base_de_reversao_tem_os_12_assets', 12, espBase.assets.length);
// O que este ciclo NAO fecha, registado para nao se vender como verde:
out.nao_fechado_por_este_ciclo = {
  defeitos_de_conteudo_preexistentes: { total_de_falhas_preexistentes: preExistenteTotal, papeis: TAB.papais.filter((l) => (l.preexistentes || []).length).map((l) => `${l.papel}:${(l.preexistentes || []).length}`),
    nota: 'ja atribuidos em §AI/§AH (grants mortos escola-historia e coordenacao-chat, link apoio sem mapa, chat-interno vazia, tempo de assentamento)' },
  cobertura_de_varredura: { veredito: M6.veredito, coerentes: M6.totais.coerentes, vermelhos: M6.totais.vermelhos, faltas: M6.totais.faltas,
    nota: 'a prédica de cobertura do m5 mantem-se a mesma; bandas sem artefacto contam como FALTA, nao como verde' },
  papeis_sem_banda_390: M6.bloqueados.map((b) => ({ papel: b.papel, artefactos: b.artefactos, causa_lida_no_artefacto: b.causa,
    estado: b.estado, censo: b.censo })),
  leitura_dos_dois_bloqueios: 'nenhum dos dois e deste ciclo, e nenhum e corrida perdida: cada um tem artefacto escrito nas duas '
    + 'tentativas (v134a e v134b) e a causa vem do campo `bloqueadas` do proprio instrumento. pending e estado do produto '
    + '(conta em analise, sem shell nem navegacao); monitor e um defeito real e pre-existente — a shell fica ready mas o '
    + 'modulo de apresentacao nao monta a barra de baixo. Contado a partir do campo `papel` de todos os artefactos em '
    + 'evidence: monitor tem 9 artefactos e pending 10, e 0 deles mediram a banda 390 — nao e por isso uma regressao da v133 para a v134.',
  tentativa_de_varredura: { rondas: ['v134a', 'v134b'], porque_a_2a_existe: 'os dois papeis sem banda na 1.ª tentativa foram re-corridos '
    + 'com instrumento, largura e predica identicos; a 2.ª tentativa confirmou o bloqueio em vez de o levantar',
    papeis_a_sair_da_2a_tentativa: M6.papeis.filter((p) => p.tentativa !== 'v134a').map((p) => p.papel) },
  condutor_m6: 'o condutor ah2-m6-driver-v134.mjs filtra o stdout do filho e por isso dois lançamentos (B e E) pareceram silenciosos '
    + 'quando o filho estava pendurado no cronometro; as corridas dos 7 papeis em falta foram feitas chamando o filho directamente '
    + 'com o stdout todo redirecionado para evidence/.m6-v134-{d,f,g,h,i}-*.txt — os artefactos sao os mesmos do condutor',
};
const vermelhos = Object.values(out.portoes.falhas_deste_diario).filter((v) => !v.passou).length;
out.portoes.deste_diario = `${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}`;
out.veredito = vermelhos ? `V134_DIARIO_COM_PORTOES_VERMELHOS ${Object.keys(out.portoes.falhas_deste_diario).length}/${vermelhos}` : `V134_DIARIO_OK ${out.portoes.deste_diario}`;
out.reversao = {
  como_v133: `wrangler deploy a partir de worker-deploy-v133-municipal (worker ${regua(esp133.workerMd5, esp133.workerBytes)}, shell ${regua(esp133.htmlMd5, esp133.htmlBytes)}, CACHE ${esp133.cacheLabel}) — traz de volta o bloco ofensor`,
  como_v123: `wrangler deploy a partir de worker-deploy-v123-pdfs (worker ${regua(md5(wBase), wBase.length)}, shell ${regua(espBase.baseHtmlMd5, espBase.baseHtmlBytes)}, CACHE bfr-conecta-v123) — tira o modulo municipal inteiro`,
  prova_de_linhagem: 'os 12 assets e o wrangler.toml sao byte-identicos nos tres directorios; cada esperado-vXXX.json foi re-extraido e conferido byte a byte pelo respectivo gerador',
  exige: 'OK literal novo do utilizador para qualquer reversao',
};
out.diario_de = 'este ficheiro e gerado por scripts/v134-diario-publicacao.mjs a partir dos diarios de evidence, das listas de deployments do servidor e do disco; nao foi escrito a mao';
out.qnd = new Date().toISOString();

fs.writeFileSync(SAIDA, JSON.stringify(out, null, 2) + '\n');
console.log(`escrito ${SAIDA}`);
console.log(`${out.veredito}  total_da_cadeia=${out.portoes.total_da_cadeia} vermelhos_da_cadeia=${out.portoes.vermelhos}`);
if (vermelhos) console.log('VERMELHOS: ' + Object.entries(out.portoes.falhas_deste_diario).filter(([, v]) => !v.passou).map(([k]) => `${k} dado=${JSON.stringify(v.valor)}`).join(' | '));
process.exit(vermelhos ? 1 : 0);
