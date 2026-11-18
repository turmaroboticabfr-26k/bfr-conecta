#!/usr/bin/env node
// SM-22 (peca 9, SOMENTE LEITURA, ZERO REDE): conferencia das cifras que vao para o §SM.22 e para
// as 36 linhas PEN do roadmap. Nada aqui re-sonda o ar: os numeros sao lidos dos artefactos ja
// gravados nesta tranche e confrontados com os ficheiros em disco. O proposito e nao escrever na
// auditoria uma cifra lembrada de memoria — cada linha impressa da origem ao ficheiro que a contem.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const OUT = join(REPO, 'evidence/sm22-conferencia-cifras-18-11.json');
if (existsSync(OUT)) throw new Error(`ABORTA: ${OUT} existe — correr com outro nome, nao por cima`);
const rd = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));
const md5 = (b) => createHash('md5').update(b).digest('hex');

const vivo = rd('evidence/sm22-varre-vivo-pen-18-11b.json');
const strut = rd('evidence/sm22-varre-estrutura-18-11b.json');
const timers = rd('evidence/sm22-varre-timers-18-11d.json');
// DOIS ficheiros de higiene, duas datas: `fin2-higiene-rm62.json` e o censo de 12/11 (147 funcoes,
// EXECUTE a anon em 57); `sm22-higiene-catalogo-18-11.json` e a re-corrida de hoje (158/65) e foi
// esse que a primeira versao desta peca rotulou de «12-11», o que teria escrito uma data falsa na
// auditoria. Os dois nomes ficam no artefacto para que a etiquetagem se possa contradizer.
const hig18 = rd('evidence/sm22-higiene-catalogo-18-11.json');
const hig12 = rd('evidence/fin2-higiene-rm62.json');
const view = rd('evidence/sm22-varre-view-municipal-18-11.json');
const formas = rd('evidence/sm22-varre-formas-pen-18-11.json');
const rpc = rd('evidence/sm22-varre-rpc-anon-18-11.json');
const causa = rd('evidence/sm22-varre-causa-fk-rpc-pending-18-11.json');
const gat = rd('evidence/sm22-varre-gatilho-pending-18-11.json');
const esperado = rd('worker-deploy-v134-sidebar/esperado-v134.json');

// (1) identidade do SW: o que a peca 1 mediu no ar contra a pegada gravada no certidao da v134
const swAr = vivo.pen26_sw.md5;
const swEsperado = esperado.swMd5;
const workerBuf = readFileSync(join(REPO, 'worker-deploy-v134-sidebar/worker.mjs'));
const workerTxt = workerBuf.toString('utf8');
// O SW da v134 NAO e um template literal: e uma string de uma linha so, com as aspas escapadas
// (`\'push\'`) e os saltos como `\n`. A primeira versao desta peca procurava o delimitador `\n\`;`
// de template e abortava — aqui isola-se a linha e so depois se despem as aspas escapadas, para
// que a contagem dos ouvintes incida no texto que o browser realmente executa.
const linhaSW = (workerTxt.split(/\r?\n/).find((l) => l.startsWith('const SW = ')) || '');
if (!linhaSW) throw new Error('ABORTA: nenhuma linha `const SW = ` no worker — os ouvintes nao podem ser contados');
const swInlinado = linhaSW.replace(/\\(['"])/g, '$1');
const ouvintes = {};
for (const nome of ['install', 'activate', 'fetch', 'push', 'notificationclick']) {
  ouvintes[nome] = new RegExp("addEventListener\\(\\s*['\"`]" + nome + "['\"`]").test(swInlinado);
}

// (2) PEN-30: quantos sitios `from('announcements')` pedem created_at
const sitios = strut.pen30 || [];
const pedem = sitios.filter((s) => s.pede_created_at === true).length;

// (3) PEN-23/22/28/13: as cifras, cada uma com o ficheiro de origem declarado
// (4) PEN-27: a forma da chamada `ASSETS.fetch` em cada geracao de worker, contada no disco.
//     Nao se dactilografa o veredito de nenhuma geracao — ele sai dos ficheiros.
const geracoes = ['worker-deploy-v115', 'worker-deploy-v116', 'worker-deploy-v117', 'worker-deploy-v118',
  'worker-deploy-v119', 'worker-deploy-v120', 'worker-deploy-v121', 'worker-deploy-v122-push',
  'worker-deploy-v123-pdfs', 'worker-deploy-v133-municipal', 'worker-deploy-v134-sidebar'];
const formaFetch = {};
for (const g of geracoes) {
  const p = join(REPO, g, 'worker.mjs');
  if (!existsSync(p)) { formaFetch[g] = 'sem worker.mjs'; continue; }
  const t = readFileSync(p, 'utf8');
  formaFetch[g] = { pedido_request: (t.match(/ASSETS\.fetch\(request\)/g) || []).length,
    passado_string: (t.match(/ASSETS\.fetch\(assetUrl\)/g) || []).length,
    passado_url_pathname: (t.match(/ASSETS\.fetch\(url\.pathname\)/g) || []).length };
}

const cif = {
  origem: 'cada par (cifra, artefacto) vem do ficheiro listado, nao da memoria',
  sw: { md5_no_ar: swAr, md5_no_esperado_v134: swEsperado, iguais: swAr === swEsperado, bytes_no_ar: vivo.pen26_sw.bytes, ouvintes_no_sw_inlinado: ouvintes, sw_inlinado_bytes: swInlinado.length },
  pen30: { sitios_from_announcements: sitios.length, pedem_created_at: pedem, marcador_no_ar: vivo.marcadores.pen30_select_created_at_do_announcements.no_ar },
  pen29: { shift: vivo.marcadores.pen29_tabela_shift_settings.no_ar, days: vivo.marcadores.pen29_tabela_calendar_days.no_ar, targets: vivo.marcadores.pen29_tabela_month_targets.no_ar, de_vez: formas.pen28.tabela_fantasma_ainda_fantasma },
  pen19: timers.pen19_intervalos_1200,
  pen18: { no_ar: vivo.marcadores.pen18_MutationObserver.no_ar, na_base: vivo.marcadores.pen18_MutationObserver.na_base_v133 },
  pen32: { corpo_bytes: strut.pen32.corpo_bytes, papeis_citados: strut.pen32.papeis_citados_no_corpo.length, education_supervisor_entre_eles: strut.pen32.papeis_citados_no_corpo.includes('education_supervisor'), chaves_de_ramo_extraidas: (strut.pen32.chaves || []).length },
  pen33: { n_pares: strut.pen33.n_pares, education_supervisor_no_mapa: strut.pen33.education_supervisor_no_mapa, rotulo: strut.pen33.rotulo_education_supervisor, ocorrencias_responsavel: strut.pen33.ocorrencias_de_Responsavel },
  pen26: { chamadas_register: strut.pen26.chamadas, caminhos_sw: strut.pen26.caminhos_sw_no_shell },
  pen27: { status_fora_do_bundle: vivo.pen27_fora_do_bundle.status, forma_do_fetch_por_geracao: formaFetch },
  pen34: vivo.pen34_rotas_internas,
  pen22: { hoje_18_11_portoes: hig18.pen22, em_12_11_portoes: hig12.pen22, diff_lido_na_peca4: view.pen22, superficie_rpc_anon: { com_anon_execute: causa.pen22_rpc.funcoes_com_anon_execute, chamaveis_sem_argumentos: causa.pen22_rpc.n_chamaveis_sem_argumentos, devolvem_tabela: causa.pen22_rpc.n_devolvem_tabela }, novas_desde_12_11: view.pen22.novas_com_anon_execute },
  pen23: { views: view.pen23.total_views, sem_invoker: view.pen23.sem_security_invoker, a_vista: view.pen23.a_vista_municipal, hoje_18_11_portoes: hig18.pen23, em_12_11_portoes: hig12.pen23, predicados: formas.pen23_escopo },
  pen25: { causa_medida_hoje: hig18.pen25_causa, causa_medida_em_12_11: hig12.pen25_causa },
  pen28: { por_status: formas.pen28.por_status, formas: formas.pen28.formas.map((f) => `${f.de}${f.alvo_embed ? '→' + f.alvo_embed : ''}:${f.code || f.status}`), caminhos_fk: causa.pen28_caminhos_fk.pares, fixture: causa.pen28_caminhos_fk.fixture, tabelas_com_muitas_fks_para_profiles: causa.pen28_caminhos_fk.tabelas_com_duas_ou_mais_fks_para_profiles.length },
  pen37_rpc_anon: rpc.pen22_rpc_anon.chamadas,
  pen13: { do_ultimo_censo: formas.pen13_pending, assinatura_das_linhas: gat.pending, gatilho: gat.gatilhos_qualificados, default_da_coluna: causa.pen13_causa.default_prole, handle_new_user: causa.pen13_causa.handle_new_user, fora_do_default: gat.fora_do_default },
};

const out = { em: new Date().toISOString(), metodo: 'leitura dos artefactos desta tranche + disco; zero rede; zero escrita', cifras: cif };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const cap = (s, n = 1500) => (s.length > n ? s.slice(0, n) + '…(corte, ver artefacto)' : s);
for (const [k, v] of Object.entries(cif)) console.log(`${k}: ${cap(JSON.stringify(v))}`);
// estas duas linhas imprimem-se inteiras porque vao citadas no §SM.22 e nao podem caber num corte
for (const [g, f] of Object.entries(formaFetch)) console.log(`pen27 ${g}: request=${f.pedido_request} assetUrl=${f.passado_string} url.pathname=${f.passado_url_pathname}`);
for (const f of cif.pen28.formas) console.log(`pen28 forma ${f}`);
console.log(`\nSM22_CONFERENCIA_OK · registo evidence/sm22-conferencia-cifras-18-11.json`);
