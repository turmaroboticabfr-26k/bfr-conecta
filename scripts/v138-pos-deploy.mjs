// V138-POS-DEPLOY — a prova de fecho da publicação da v138, escrita ANTES da publicação.
//
// O modelo é `scripts/v137-pos-deploy.mjs`, e a diferença é de natureza, não de número: a v138 muda a SHELL (o
// painel municipal passa a chamar os agregados da PEN-39) e não muda o módulo de apresentação. Por isso as duas
// cláusulas que a v137 invertia invertem-se aqui: C2 afirma que a shell servida DEIXOU de ser a da v136/v137, e
// C4 afirma que o módulo servido CONTINUA byte a byte o remendo da PEN-40. Copiar a v137 à letra daria vermelho
// legítimo sobre uma publicação correcta — é o mesmo motivo pelo qual o desenho teve de ser pensado, não adaptado.
//
// As agulhas não são dactilografadas: os dois nomes de RPC lêem-se de `scripts/p73-pen39-ddl-candidata.sql` (o
// mesmo DDL já aplicado no banco) e as pegadas esperadas lêem-se de `worker-deploy-v138-painel-municipal/esperado-v138.json`,
// `bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json` e `esperado-v137.json`. O antecessor da cadeia
// de reversão também se deriva do disco — `audit-publicacao-vNNN.json` + o seu `deployments-status-depois` — porque
// não se sabe se a v137 será publicada antes: se for, o antecessor é a v137; se não for, é a v136. Fixar um número
// seria prometer uma história de publicações que ainda não aconteceu.
//
// Sem as três saídas do passo de publicação (stdout do `wrangler deploy` e as duas listagens do servidor) a peça
// recusa ANTES de qualquer fetch e não escreve registo. É por isso que o `--selfteste` corre offline e que a recusa
// de hoje é capturada em stdout em vez de virar artefacto no índice.
//
// 0 DDL, 0 escrita no banco, 0 mint: só HTTP GET e leitura de disco.
// Uso: node scripts/v138-pos-deploy.mjs --selfteste   (offline: 0 HTTP, 0 escrita)
//      node scripts/v138-pos-deploy.mjs               (só depois do deploy autorizado por OK literal próprio)
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ESP138_PATH = `${DIR}/worker-deploy-v138-painel-municipal/esperado-v138.json`;
const ESP137_PATH = `${DIR}/worker-deploy-v137-remendo-pen40/esperado-v137.json`;
const ESP136_PATH = `${DIR}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`;
const BASE123_PATH = `${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`;
const CAND_PATH = `${DIR}/bfr-candidata-v138-painel-municipal/index.html`;
const PORT_CAND_PATH = `${DIR}/bfr-candidata-v138-painel-municipal/portoes-v138-candidata.json`;
const DDL39_PATH = `${DIR}/scripts/p73-pen39-ddl-candidata.sql`;
const DIARIO_AR_PATH = `${DIR}/evidence/v135-pos-deploy-19-11.json`;
const MOD_BASE_PATH = `${DIR}/worker-deploy-v137-remendo-pen40/public/bfr-responsive-presentation.js`;
const OUT = `${DIR}/evidence/v138-pos-deploy-20-11.json`;
const MODULO = 'bfr-responsive-presentation.js';
const NOME_ESCRITA = 'bfr_school_set_municipality';
const PUB = [`${DIR}/evidence/v138-deploy-stdout-20-11.txt`, `${DIR}/evidence/v138-deployments-list-depois-20-11.json`, `${DIR}/evidence/v138-deployments-status-depois-20-11.json`];
const EXIGE = [ESP138_PATH, ESP137_PATH, ESP136_PATH, BASE123_PATH, CAND_PATH, PORT_CAND_PATH, DDL39_PATH, DIARIO_AR_PATH, MOD_BASE_PATH];
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const emFalta = (sonda) => EXIGE.filter((p) => !sonda(p));
const faltamPublicacao = (sonda) => PUB.filter((p) => !sonda(p));

// Os dois nomes de RPC, lidos do DDL aplicado (mesma varredura dos geradores da candidata e do bundle).
function nomesDoDDL(texto) {
  const re = /CREATE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(\s*\)\s*\s*RETURNS\s+TABLE/gi;
  return [...texto.matchAll(re)].map((m) => m[1]);
}
// O antecessor publicado, derivado do disco: a versão mais alta abaixo da v138 que tem diário de publicação E
// listagem de status do servidor. Injecta-se os dois censo para o fixture poder correr offline.
function antecessorPublicado(listar, existe) {
  const versoes = listar(DIR)
    .filter((f) => /^audit-publicacao-v\d+\.json$/.test(f))
    .map((f) => Number(/v(\d+)\.json$/.exec(f)[1]))
    .filter((v) => v < 138)
    .sort((a, b) => b - a);
  for (const v of versoes) {
    const status = listar(`${DIR}/evidence`).some((f) => f.startsWith(`v${v}-deployments-status-depois-`) && existe(`${DIR}/evidence/${f}`));
    if (status) return { versao: v, diario: `audit-publicacao-v${v}.json`, status: `evidence/v${v}-deployments-status-depois-*` };
  }
  return null;
}
const semPublicacao = () => {
  console.log(`V138_POS_DEPLOY_NAO_PUBLICADA · nada foi conferido porque o ar ainda não serve a v138`);
  console.log('FALTAM ' + JSON.stringify(faltamPublicacao((p) => fs.existsSync(p)).map((p) => p.replace(DIR + '/', ''))));
  console.log('nota · esta peça não escreve registo em modo de recusa: um vermelho sem ar novo seria indistinguível dum bundle partido');
  console.log('exit 2 · recusa autorizada, não falha de verificação');
  process.exit(2);
};

const SELFTESTE = process.argv.includes('--selfteste');
if (SELFTESTE) {
  const le = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const E138 = le(ESP138_PATH), E137 = le(ESP137_PATH), E136 = le(ESP136_PATH), B123 = le(BASE123_PATH), PC = le(PORT_CAND_PATH);
  const cand = fs.readFileSync(CAND_PATH, 'utf8');
  const shellV136 = fs.readFileSync(`${DIR}/bfr-candidata-v136-secretaria-de-educacao/index.html`, 'utf8');
  const nomes = nomesDoDDL(fs.readFileSync(DDL39_PATH, 'utf8'));
  const passaAgulha = (t) => nomes.every((x) => n(t, `'${x}'`) === 1) && n(t, NOME_ESCRITA) === 0;
  const casos = [];
  const c = (nome, verde, dado) => casos.push({ nome, verde: !!verde, ...(dado || {}) });
  c('as_fontes_de_espera_resolvem_em_disco', emFalta((p) => fs.existsSync(p)).length === 0, { faltam: emFalta((p) => fs.existsSync(p)).map((p) => p.replace(DIR + '/', '')) });
  c('os_dois_nomes_sao_lidos_do_DDL_e_distinguem_a_candidata_da_shell_publicada',
    nomes.length === 2 && passaAgulha(cand) && !passaAgulha(shellV136) && nomes.every((x) => n(shellV136, x) === 0),
    { nomes, na_candidata: nomes.map((x) => n(cand, `'${x}'`)), na_shell_v136: nomes.map((x) => n(shellV136, x)) });
  c('a_regua_do_delta_de_shell_bate_com_a_promessa_da_candidata_e_do_bundle',
    PC.delta_bytes === Buffer.byteLength(cand, 'utf8') - E136.htmlBytes && E138.htmlBytes - E137.htmlBytes === PC.delta_bytes,
    { portoes_delta: PC.delta_bytes, medido_candidata_vs_v136: Buffer.byteLength(cand, 'utf8') - E136.htmlBytes, bundle_delta: E138.htmlBytes - E137.htmlBytes });
  c('a_shell_da_v138_difere_da_shell_que_a_v137_ia_servir', E138.htmlMd5 !== E137.htmlMd5 && E138.htmlBytes !== E137.htmlBytes,
    { v137: E137.htmlMd5, v138: E138.htmlMd5 });
  c('o_modulo_da_v138_e_o_mesmo_remendo_que_a_v137_levou', E138.moduleMd5 === E137.moduleMd5 && E138.moduleBytes === E137.moduleBytes
    && md5(fs.readFileSync(`${DIR}/worker-deploy-v138-painel-municipal/public/${MODULO}`)) === E137.moduleMd5
    && md5(fs.readFileSync(MOD_BASE_PATH)) === E137.moduleMd5, { v138_module: E138.moduleMd5, v137_module: E137.moduleMd5 });
  c('o_delta_do_worker_bate_com_a_soma_dos_dos_embeds', E138.workerBytes - E137.workerBytes === E138.deltaWorkerBytes && E138.deltaWorkerBytes > 0,
    { medido: E138.workerBytes - E137.workerBytes, declarado: E138.deltaWorkerBytes });
  c('a_etiqueta_mudou_e_o_sw_continuam_o_mesmo_comprimento', E138.swBytes === E137.swBytes && E138.swMd5 !== E137.swMd5 && /v138$/.test(String(E138.cacheLabel)),
    { sw_bytes_v137: E137.swBytes, sw_bytes_v138: E138.swBytes, rotulo: E138.cacheLabel });
  c('a_recusa_de_publicacao_tem_positivo_e_negativo_possiveis',
    faltamPublicacao(() => false).length === PUB.length && faltamPublicacao(() => true).length === 0
      && faltamPublicacao((p) => !/v138-deploy/.test(p)).length === PUB.length, { saidas: PUB.length });
  c('o_antecessor_derivado_do_disco_escolhe_v137_so_se_a_v137_for_publicada', (() => {
    const doisDiarios = (d) => d === DIR
      ? ['audit-publicacao-v136.json', 'audit-publicacao-v137.json']
      : ['v136-deployments-status-depois-19-11.json', 'v137-deployments-status-depois-20-11.json'];
    const com137 = antecessorPublicado(doisDiarios, () => true);
    const sem137 = antecessorPublicado(doisDiarios, (p) => !/v137/.test(p));
    const soV136 = antecessorPublicado((d) => (d === DIR ? ['audit-publicacao-v136.json'] : ['v136-deployments-status-depois-19-11.json']), () => true);
    return !!com137 && com137.versao === 137 && sem137.versao === 136 && soV136.versao === 136 && antecessorPublicado(() => [], () => true) === null;
  })(), { agora: antecessorPublicado((d) => fs.readdirSync(d), (p) => fs.existsSync(p)) });
  c('o_url_do_ar_e_derivada_do_diario_e_nao_inventada', /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(le(DIARIO_AR_PATH).url)));
  c('a_lista_de_controlo_exclui_s_o_o_modulo', (() => {
    const onze = B123.assets.filter((a) => a.arquivo !== MODULO);
    return onze.length === B123.assets.length - 1 && !onze.some((a) => a.arquivo === MODULO);
  })(), { excluidos: 1 });
  const boas = casos.filter((x) => x.verde).length;
  const reg = { programa: 'scripts/v138-pos-deploy.mjs', selfteste: true, em: new Date().toISOString(),
    http: 0, escrita_no_banco: 0, ddl: 0, publicacao: 0, casos,
    agulhas_lidas_do_ddl: nomes.map((x) => ({ nome: x, ocorrencias_na_candidata: n(cand, `'${x}'`), bytes: Buffer.byteLength(x, 'utf8') })),
    antecessor_agora: antecessorPublicado((d) => fs.readdirSync(d), (p) => fs.existsSync(p)),
    saidas_de_publicacao_exigidas: PUB.map((p) => p.replace(DIR + '/', '')),
    estado_das_saidas_de_publicacao_agora: PUB.map((p) => fs.existsSync(p)),
    veredito: boas === casos.length ? `V138_POS_DEPLOY_SELFTESTE_OK ${casos.length}/0` : `V138_POS_DEPLOY_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(reg, null, 1));
  console.log('selfteste: 0 HTTP, 0 escrita; o registo desta corrida e o stdout capturado por redireccionamento');
  process.exit(boas === casos.length ? 0 : 1);
}

if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const emFaltaAgora = emFalta((p) => fs.existsSync(p));
if (emFaltaAgora.length) console.log('AVISO · faltam fontes de espera, os portoes que as usam vao dar vermelho: ' + JSON.stringify(emFaltaAgora.map((p) => p.replace(DIR + '/', ''))));
if (faltamPublicacao((p) => fs.existsSync(p)).length) semPublicacao();

const le = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const E138 = le(ESP138_PATH), E137 = le(ESP137_PATH), E136 = le(ESP136_PATH), B123 = le(BASE123_PATH), PC = le(PORT_CAND_PATH);
const STDOUT_DEPLOY = fs.readFileSync(PUB[0], 'utf8');
const LISTA = le(PUB[1]);
const STATUS = le(PUB[2]);
const URL_AR = le(DIARIO_AR_PATH).url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const nomes = nomesDoDDL(fs.readFileSync(DDL39_PATH, 'utf8'));
if (nomes.length !== 2) throw new Error(`esperava 2 nomes do DDL, lidos ${nomes.length}`);
const ANTE = antecessorPublicado((d) => fs.readdirSync(d), (p) => fs.existsSync(p));
if (!ANTE) throw new Error('ABORTA: nenhum antecessor publicado derivavel do disco — a cadeia de reversao nao tem origem');
const STATUS_ANTE = le(`${DIR}/evidence/${fs.readdirSync(`${DIR}/evidence`).filter((f) => f.startsWith(`v${ANTE.versao}-deployments-status-depois-`))[0]}`);

const reg = { ciclo: 'V138-POS-DEPLOY', em: new Date().toISOString(), escrita_no_banco: 0, ddl: 0, mint: 0, publicacao: 0,
  origem: { diario_ar: DIARIO_AR_PATH.replace(DIR + '/', ''), esperado_v138: ESP138_PATH.replace(DIR + '/', ''), esperado_v137: ESP137_PATH.replace(DIR + '/', ''),
    esperado_v136: ESP136_PATH.replace(DIR + '/', ''), base_v123: BASE123_PATH.replace(DIR + '/', ''), portoes_candidata: PORT_CAND_PATH.replace(DIR + '/', ''),
    ddl_pen39: DDL39_PATH.replace(DIR + '/', ''), stdout_deploy: PUB[0].replace(DIR + '/', ''), antecessor: ANTE },
  url: URL_AR, agulhas_lidas_do_ddl: nomes, portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { reg.portoes[id] = { passou: !!ok, ...(dados || {}) }; reg.total[ok ? 'ok' : 'falha'] += 1; };
const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const shell = await get('/');
const notfound = await get('/rota-inexistente-v138-pos');
const firebase = await get('/firebase-messaging-sw.js');
const qMod = (shell.texto.match(/bfr-responsive-presentation\.js\?v=(\d+)/) || [])[1];
const qSw = (shell.texto.match(/sw-v4\.js\?v=(\d+)/) || [])[1];
gate('C0_a_shell_servida_nomeia_o_modulo_e_o_sw_com_query', qMod !== undefined && qSw !== undefined, { modulo_v: qMod, sw_v: qSw });
const modulo = await get(`/${MODULO}?v=${qMod}`);
const sw = await get(`/sw-v4.js?v=${qSw}`);
const headers = await get('/_headers');
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];

gate('C1_shell_no_ar_bate_com_o_esperado_v138', shell.http === 200 && shell.md5 === E138.htmlMd5 && shell.bytes === E138.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: E138.htmlMd5, bytes: E138.htmlBytes } });
gate('C2_a_shell_deixou_de_ser_a_da_v136_e_a_da_v137', shell.md5 !== E136.htmlMd5 && shell.md5 !== E137.htmlMd5
  && shell.bytes - E136.htmlBytes === PC.delta_bytes,
  { v136: E136.htmlMd5, v137: E137.htmlMd5, ar: shell.md5, delta_medido_vs_v136: shell.bytes - E136.htmlBytes, delta_da_candidata: PC.delta_bytes,
    nota: 'clausula invertida face a v137: a v138 muda mesmo a shell, por isso a igualdade com a anterior seria o vermelho' });
gate('C3_o_modulo_servido_continua_o_remendo_gateado', modulo.http === 200 && modulo.md5 === E138.moduleMd5 && modulo.bytes === E138.moduleBytes,
  { medido: { http: modulo.http, md5: modulo.md5, bytes: modulo.bytes }, esperado: { md5: E138.moduleMd5, bytes: E138.moduleBytes } });
gate('C4_o_modulo_da_v138_e_byte_a_byte_o_modulo_que_a_v137_ia_levar', modulo.md5 === E137.moduleMd5 && modulo.bytes === E137.moduleBytes,
  { v137: { md5: E137.moduleMd5, bytes: E137.moduleBytes }, ar: { md5: modulo.md5, bytes: modulo.bytes },
    nota: 'empilhar a v138 sobre a base v137 so vale se o remendo PEN-40 continuar la — esta e a prova de que o empilhamento nao o perdeu' });
gate('C5_os_dois_agregados_do_DDL_estao_na_shell_servida_e_a_porta_de_etiquetagem_nao',
  nomes.every((x) => n(shell.texto, `'${x}'`) === 1) && n(shell.texto, NOME_ESCRITA) === 0,
  { ocorrencias: nomes.map((x) => ({ nome: x, no_ar: n(shell.texto, `'${x}'`) })), origem_dos_nomes: DDL39_PATH.replace(DIR + '/', '') });
gate('C6_etiqueta_do_sw_no_ar_e_a_v138', sw.http === 200 && sw.md5 === E138.swMd5 && sw.bytes === E138.swBytes && rotuloAr === E138.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: E138.swMd5, bytes: E138.swBytes, rotulo: E138.cacheLabel } });
gate('C7_sw_mesmos_bytes_da_v137_com_md5_diferente', sw.bytes === E137.swBytes && sw.md5 !== E137.swMd5, { bytes: sw.bytes, v137_bytes: E137.swBytes, v137_md5: E137.swMd5 });
gate('C8_os_dois_headers_na_shell', shell.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp)), { x_frame_options: shell.xfo, csp: shell.csp });
gate('C9_csp_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)), { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
gate('C10_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes });
gate('C11_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const onze = B123.assets.filter((a) => a.arquivo !== MODULO);
const FRAME_GUARD_ESPERADO = "frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
const vivos = [];
for (const a of onze) { const r = await get(`/${a.arquivo}`); vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes, xfo: r.xfo, csp: r.csp }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== onze[i].md5 || v.bytes !== onze[i].bytes);
const semHeaders = vivos.filter((v) => v.xfo !== 'SAMEORIGIN' || v.csp !== FRAME_GUARD_ESPERADO);
gate('C12_onze_assets_byte_a_byte_com_a_base_v123', desvios.length === 0 && vivos.length === onze.length, { total: vivos.length, esperado: onze.length, desvios: desvios.map((d) => d.arquivo) });
gate('C13_os_onze_assets_com_os_dois_headers', semHeaders.length === 0, { sem_headers: semHeaders.map((d) => d.arquivo), esperado: { xfo: 'SAMEORIGIN', csp: FRAME_GUARD_ESPERADO } });
gate('C14_ficheiro_headers_inalterado_desde_a_v136', headers.http === 200 && headers.md5 === E138.headersMd5 && E138.headersMd5 === E136.headersMd5,
  { medido: { http: headers.http, md5: headers.md5, bytes: headers.bytes }, esperado_v138: E138.headersMd5, v136: E136.headersMd5 });
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT_DEPLOY) || [])[1];
const porData = [...LISTA].sort((x, y) => String(y.created_on).localeCompare(String(x.created_on)));
gate('C15_servidor_concorda_com_o_deploy', !!versaoNoStdout && porData[0].versions[0].version_id === versaoNoStdout && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { stdout: versaoNoStdout, lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
gate('C16_cadeia_de_reversao_no_antecessor_derivado_do_disco', porData[1].versions[0].version_id === STATUS_ANTE.versions[0].version_id,
  { antecessor: `v${ANTE.versao}`, esperado: STATUS_ANTE.versions[0].version_id, na_lista: porData[1].versions[0].version_id,
    nota: 'devolver o ar ao antecessor e um `wrangler deploy` a partir do respectivo worker-deploy — exige OK literal proprio' });
gate('C17_identidade_cruzada_entre_portoes_candidata_v137_e_esperado_v138',
  PC.saida.md5 === E138.htmlMd5 && E138.moduleMd5 === E137.moduleMd5 && E138.baseHtmlMd5 === E136.htmlMd5 && /v138$/.test(String(E138.cacheLabel)),
  { portoes_candidata: PC.saida.md5, esperado_html: E138.htmlMd5, modulo_v137: E137.moduleMd5, modulo_v138: E138.moduleMd5,
    base_html_do_bundle: E138.baseHtmlMd5, shell_v136: E136.htmlMd5 });

reg.medido = { shell: { ...shell, texto: undefined }, modulo: { ...modulo, texto: undefined }, sw: { ...sw, texto: undefined }, headers, notfound, firebase, rotuloAr,
  contagens_na_shell_servida: nomes.map((x) => ({ nome: x, no_ar: n(shell.texto, `'${x}'`) })), assets_vivos: vivos };
reg.o_que_esta_peca_prova = 'que o ar serve o bundle da v138 que os portoes da candidata e do gerador gatearam: shell nova com os dois agregados chamados, modulo PEN-40 intacto, SW rotulado v138, assets e headers byte a byte, e a cadeia de reversao ancorada no antecessor que o disco prova. Nao prova o que a tela mostra ao utilizador: isso e uma corrida do browser com conta autenticada depois do deploy.';
reg.veredito = reg.total.falha ? `V138_POS_DEPLOY_COM_DEFEITOS ${reg.total.falha}` : `V138_POS_DEPLOY_OK ${reg.total.ok}/0`;
fs.writeFileSync(OUT, JSON.stringify(reg, null, 2) + '\n');
console.log(`${reg.veredito} · shell ${shell.md5} · modulo ${modulo.md5} · sw ${sw.md5} · rotulo ${rotuloAr}`);
if (reg.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(reg.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
console.log('ESCRITO: ' + OUT.split('/').pop());
