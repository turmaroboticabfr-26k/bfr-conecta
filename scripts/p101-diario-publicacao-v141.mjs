#!/usr/bin/env node
// P101 — DIÁRIO DA PUBLICAÇÃO v141 (21/11, tarde).
// Este ficheiro não publica nada: monta `audit-publicacao-v141.json` só com números LIDOS dos artefactos da
// cadeia (p97 candidata, p98 bundle, stdout do wrangler, status/list do Cloudflare, p99 pos-deploy, p100
// browser). Aborta se alguma peça não estiver verde, se o html servido agora não for o certificado, ou se o
// artefacto já existir. Regras: 0 DDL, 0 escrita no banco, 0 deploy, 0 push.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const SAIDA = `${REPO}/audit-publicacao-v141.json`;
const TXT = `${REPO}/audit-publicacao-v141.txt`;
if ([SAIDA, TXT].some((f) => existsSync(f))) throw new Error('ABORTA: o diario v141 ja existe — nunca se sobrescreve');
const md5 = (b) => createHash('md5').update(Buffer.from(String(b))).digest('hex');
const rd = (p) => JSON.parse(readFileSync(`${REPO}/${p}`, 'utf8'));

const ESP = rd('worker-deploy-v141-caixa-vazia/esperado-v141.json');
const P97 = rd('evidence/p97-gera-candidata-v141-21-11-a.json');
const P98 = rd('evidence/p98-gera-bundle-v141-21-11.json');
const P99 = rd('evidence/p99-pos-deploy-v141-a.json');
const P100 = rd('evidence/p100-caixa-vazia-escondida-no-ar-21-11-b.json');
const ANTES = rd('evidence/p81-pessoa-barra-municipal-21-11-ar-v140-b.json');
const DEPOIS = rd('evidence/p81-pessoa-barra-municipal-21-11-ar-v141-c.json');
const D140 = rd('audit-publicacao-v140.json');
const STDOUT = readFileSync(`${REPO}/evidence/v141-deploy-stdout-21-11.txt`, 'utf8');
const STATUS = rd('evidence/v141-deployments-status-21-11.json');
const LISTA = rd('evidence/v141-deployments-list-21-11.json');
const VER = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT) || [])[1];
if (!VER) throw new Error('ABORTA: sem version id no stdout do deploy — o diario nao poderia nomear a versao');
const porData = [...LISTA].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)));
if (porData.length < 2) throw new Error('ABORTA: ' + porData.length + ' registos na lista de deployments — sem cadeia de reversao');

const agora = await (await fetch(P99.url + '/', { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' })).text();
const md5Agora = md5(agora);

const celulas = P100.celulas;
const visiveisAntes = ANTES.pessoas.filter((p) => p.visiveis > 0).map((p) => p.rotulo);
const passaramAEscondidas = celulas.filter((c) => c.visiveis === 0 && visiveisAntes.includes(c.rotulo)).map((c) => c.rotulo);
const authorizadasAgora = celulas.filter((c) => c.esperado_pelos_bytes === true).map((c) => c.rotulo);

const falhas = [];
const g = (nome, cond, dado) => { const v = cond === true; if (!v) falhas.push(nome + ' | ' + JSON.stringify(dado).slice(0, 300)); console.log(`${v ? 'VERDE' : 'VERMELHO'}  ${nome}`); };
g('D1_candidata_verde', /^P97_CANDIDATA_V141_CAIXA_VAZIA_OK/.test(String(P97.veredito)) && Array.isArray(P97.portoes) && P97.portoes.length >= 10 && P97.portoes.every((p) => p.verde === true) && P97.falhas.length === 0, { veredito: P97.veredito, portoes: Array.isArray(P97.portoes) ? P97.portoes.length : null, vermelhos: P97.portoes.filter((p) => p.verde !== true).map((p) => p.nome) });
g('D2_bundle_verde_e_o_mesmo_worker_registrado', /^P98_BUNDLE_V141_OK/.test(String(P98.veredito)) && P98.veredito.endsWith('30/0') && P98.total && P98.total.falha === 0 && ESP.workerMd5 === P98.esperado.workerMd5, { p98: P98.veredito, total: P98.total, esperado_worker: ESP.workerMd5, p98_worker: (P98.esperado || {}).workerMd5 });
g('D3_pos_deploy_verde', P99.veredito === 'P99_POS_DEPLOY_V141_OK 14/0', { veredito: P99.veredito });
g('D4_browser_verde', P100.veredito === 'P100_CAIXA_VAZIA_ESCONDIDA_NO_AR_OK 16/0', { veredito: P100.veredito, falhas_p100: P100.falhas });
g('D5_o_html_certificado_e_o_html_servido_e_o_html_medido_e_o_html_de_agora', ESP.htmlMd5 === P99.medido.shells[0].md5 && ESP.htmlMd5 === P100.ar.md5_servido && ESP.htmlMd5 === md5Agora && Buffer.byteLength(agora) === ESP.htmlBytes, { certificado: ESP.htmlMd5, p99: P99.medido.shells[0].md5, p100: P100.ar.md5_servido, agora: md5Agora, bytes_agora: Buffer.byteLength(agora), bytes_certificado: ESP.htmlBytes });
g('D6_o_servidor_concorda_com_o_stdout', STATUS.versions[0].version_id === VER && porData[0].versions[0].version_id === VER && STATUS.versions[0].percentage === 100, { stdout: VER, status: STATUS.versions[0], lista: porData[0].versions[0] });
g('D7_a_cadeia_de_reversao_aponta_para_a_v140', porData[1].versions[0].version_id === (D140.deploy || {}).version_id, { anterior: porData[1].versions[0].version_id, v140_no_diario: (D140.deploy || {}).version_id });
g('D8_a_peca_de_browser_percorreu_a_mesma_barra_da_baseline', celulas.length === ANTES.pessoas.length && celulas.length === DEPOIS.pessoas.length && celulas.map((c) => c.rotulo).sort().join('|') === ANTES.pessoas.map((p) => p.rotulo).sort().join('|'), { p100: celulas.length, antes: ANTES.pessoas.length, depois: DEPOIS.pessoas.length });
g('D9_a_mudanca_por_celula_esta_contada_e_bate_com_a_regra', celulas.filter((c) => c.esperado_pelos_bytes === false).length === passaramAEscondidas.length + (celulas.filter((c) => c.esperado_pelos_bytes === false && !visiveisAntes.includes(c.rotulo)).length) && authorizadasAgora.length >= 1 && passaramAEscondidas.length >= 1, { authorizadas_a_mostrar: authorizadasAgora, passaram_a_escondidas: passaramAEscondidas, ja_escondidas_na_v140: celulas.filter((c) => c.esperado_pelos_bytes === false && !visiveisAntes.includes(c.rotulo)).map((c) => c.rotulo) });
g('D10_nenhuma_escrita_de_banco_nesta_publicacao', P99.escrita === 0 && P99.ddl === 0 && P99.mint === 0, { escrita: P99.escrita, ddl: P99.ddl, mint: P99.mint, nota: 'os dados municipais foram escritos pela P92, antes da v140; esta publicacao so mudou apresentacao' });
if (falhas.length) {
  writeFileSync(`${REPO}/evidence/p101-diario-v141-VERMELHO.json`, JSON.stringify({ veredito: 'P101_DIARIO_V141_VERMELHO ' + falhas.length, falhas }, null, 2) + '\n');
  for (const f of falhas) console.log('  FALTA ' + f);
  process.exit(1);
}

const diario = {
  version: 'v141',
  data: '2026-11-21',
  ok_literal: 'a escolha do utilizador na pergunta de escopo: «Esconder a caixa vazia (defensivo) + publicar v141»',
  nota_do_ok: 'cobre construir a candidata, gerar o bundle e PUBLICAR a mudanca de apresentacao. NAO cobre dar a secao «secretaria-municipal» a vista `teacher`, nem revogar as 4 concessoes municipais de contas reais, nem o rpc como porta da visibilidade, nem git push (respondeu «Nao, deixar local»), nem reverter PEN-43/PEN-44, nem rodar senha.',
  escopo_do_ok: 'por `hidden` e `display:none` nas copias 0x0 da entrada municipal que a sessao de teste tornava visiveis em vistas fora do mapa do shell, e levar isso ao ar',
  tarefa: 'fechar o sintoma que o utilizador mostrou: «nao aparece a aba de secretaria municipal, so a secretaria da escola» e a caixa vazia que a P81 mediu a 0x0 na persona Professor',
  porque_esta_versao: 'a cadeia certificada e v138 -> p85 (v139 sonda honesta) -> p87 (v140 trilha) -> p97 (v141 caixa vazia): a v141 traz dentro a sonda honesta e a trilha ja publicadas, e o remendo da PEN-40 continua no bundle (md5 do modulo lido do esperado-v140)',
  origem_dos_numeros: 'stdout do wrangler + deployments status/list + artefactos p97/p98/p99/p100 em disco; nada copiado-colado da conversa',
  deploy: {
    worker: 'bfr-conecta', conta: (D140.deploy || {}).conta, version_id: VER, deployment_id: STATUS.id,
    deployment_created: STATUS.created_on, versao_anterior_v140: (D140.deploy || {}).version_id, url: P99.url,
    reversao: 'devolver o ar a v140 e `wrangler deploy` a partir de worker-deploy-v140-trilha-de-acesso — exige OK literal novo',
  },
  bundle: {
    worker_md5: ESP.workerMd5, worker_bytes: ESP.workerBytes, delta_worker_bytes: ESP.deltaWorkerBytes,
    html_md5: ESP.htmlMd5, html_bytes: ESP.htmlBytes, sw_md5: ESP.swMd5, sw_bytes: ESP.swBytes,
    cache_label_no_ar: ESP.cacheLabel, modulo_pen40_md5: ESP.moduleMd5, assets_copiados: ESP.assetsCopiados,
    base: 'worker-deploy-v140-trilha-de-acesso (o worker que estava no ar)',
  },
  portoes: {
    p97_candidata: P97.veredito, p98_bundle: P98.veredito, p99_pos_deploy: P99.veredito, p100_browser: P100.veredito,
    p100_vermelho_preservado: 'evidence/p100-caixa-vazia-escondida-no-ar-21-11-a-VERMELHO-regua_recebeu_mapa_de_booleanos_como_array.json',
    p81_antes: ANTES.veredito, p81_depois: DEPOIS.veredito,
  },
  conferencia_no_ar: {
    veredito_p99: P99.veredito, duracao_ms_p99: P99.duracao_ms, shells_p99: P99.medido.shells,
    md5_agora: md5Agora, bytes_agora: Buffer.byteLength(agora), h3_regra_velha_fora_dos_bytes: P99.H3_a_correccao_esta_nos_bytes_servidos_e_a_regra_velha_desapareceu,
  },
  medido_no_browser: {
    veredito_p100: P100.veredito, duracao_ms: P100.duracao_ms, banda: P100.banda, copias_por_celula: P100.celulas.map((c) => c.rotulo + '=' + c.copias_no_dom),
    celulas_escondidas: celulas.filter((c) => c.esperado_pelos_bytes === false).map((c) => c.rotulo),
    celulas_visiveis: authorizadasAgora, passaram_a_escondidas_vs_v140: passaramAEscondidas,
    clique_na_authorizada_pintou: { painel: P100.passoAutorizada.depois.painel, hit_teste: P100.passoAutorizada.clique.hit, e_o_proprio: P100.passoAutorizada.clique.e_o_proprio },
    professor_celula_depois: (celulas.find((c) => c.active_view === 'teacher') || {}).celula,
    professor_celula_antes: ((ANTES.pessoas.find((p) => p.rotulo === 'Professor') || {}).leitura || {}).navs,
  },
  observacao_aberta_painel_ja_aberto: {
    medida: P100.passoTroca.saida.painel, texto: 'com o painel municipal aberto, trocar para uma vista fora do mapa esconde a ENTRADA (todas as copias 0x0/hid/none) mas nao fecha o painel: continuou display=block com ' + P100.passoTroca.saida.painel.chars + ' B e ' + P100.passoTroca.saida.painel.abas + ' abas. A sessao de teste e a mesma, logo nao e ganho de acesso; e uma incoerencia de apresentacao.',
    o_que_falta_para_fechar: 'fechar o painel na troca de vista e uma linha no modulo e uma publicacao nova — pede OK literal; nada nesta publicacao o faz.',
  },
  o_que_este_deploy_muda_para_um_usuario_real: {
    contas_cuja_vista_activa_esta_no_mapa: 'nada muda: continuam a ver a entrada (medido em `admin` com clique real e painel pintado)',
    developer_na_barra_de_personas: 'a entrada passa a seguir a vista activa: visivel em Admin, escondida nas outras 9 vistas medidas. Na v140 era visivel em 9 dessas vistas porque a decisao era so o papel da sessao.',
    professor_conta_real: 'a vista `teacher` nao recebe a secao em nenhuma das duas versoes; o que mudou e que a caixa 0x0 que ficava la passou a estar escondida (P81: hidden=false -> P100: hidden=true + display none)',
    nota_de_atingibilidade: 'o que se esconde e a ENTRADA. A decisao de dados continua em `aptoParaSessao()` e nas rpcs com RLS; nenhuma conta ganhou ou perdeu acesso por esta publicacao.',
  },
  o_que_este_diario_nao_autoriza: 'git push (recusado); reverter PEN-43/PEN-44; revogar ou manter as 4 concessoes municipais de contas reais sobre o municipio de exemplo da SM8; tornar `bfr_is_municipal_authority()` a porta da visibilidade (P93 mediu D1=0 e D2=0, logo seria expansao de acesso); acrescentar `secretaria-municipal` ao array estatico de `teacher`; fechar o painel na troca de vista; qualquer DDL ou escrita no banco.',
};
writeFileSync(SAIDA, JSON.stringify(diario, null, 2) + '\n');
writeFileSync(TXT, `P101_DIARIO_V141_OK 10/0\n${SAIDA.replace(REPO + '/', '')} · version=${VER} · html=${md5Agora} (${Buffer.byteLength(agora)} B) · portoes: ${P97.veredito} | ${P98.veredito} | ${P99.veredito} | ${P100.veredito}\nnode_exit=0\n`);
console.log(`P101_DIARIO_V141_OK 10/0 · audit-publicacao-v141.json · version=${VER} · html=${md5Agora} (${Buffer.byteLength(agora)} B)`);
process.exit(0);
