// V137-POS-DEPLOY — FALTA-1: a prova de fecho da publicação da v137, escrita ANTES da publicação.
//
// O modelo é `scripts/v136-pos-deploy.mjs`, e a diferença é de natureza, não de número: a v137 não muda a
// shell. Muda só o módulo de apresentação responsiva (o remendo PEN-40). Por isso a primeira asserção desta
// peça é que a shell servida continua byte-a-byte a da v136 — e uma peça que copiasse o C1b da v136 («a shell
// deixou de ser a anterior») daria vermelho legítimo sobre uma publicação correcta. O desenho tinha de inverter
// essa cláusula, não adaptá-la.
//
// As agulhas PEN-40 não são dactilografadas aqui: lêem-se de `evidence/v137-remendo-pen40-20-11.json`
// (`remendo.de` / `remendo.para`), que é o texto que o próprio remendo substituiu. Se o remendo mudar de agulha
// esta peça muda com ele ou dá vermelho — nunca fica a prometer um remendo que já não é aquele.
//
// Sem as três saídas do passo de publicação (stdout do `wrangler deploy` e as duas listagens do servidor) a
// peça recusa ANTES de qualquer fetch e não escreve registo: não há verde possível contra um ar que ainda serve
// a v136, e um ficheiro de «vermelho» aqui seria indistinguível de uma candidata partida. É por isso que o
// `--selfteste` corre offline e que a recusa de hoje é capturada em stdout em vez de virar artefacto no índice.
//
// 0 DDL, 0 escrita no banco, 0 mint: só HTTP GET e leitura de disco.
// Uso: node scripts/v137-pos-deploy.mjs --selfteste    (offline: 0 HTTP, 0 escrita)
//      node scripts/v137-pos-deploy.mjs                (só depois do deploy autorizado por OK literal próprio)
import fs from 'node:fs';
import crypto from 'node:crypto';

const DIR = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ESP137_PATH = `${DIR}/worker-deploy-v137-remendo-pen40/esperado-v137.json`;
const ESP136_PATH = `${DIR}/worker-deploy-v136-secretaria-de-educacao/esperado-v136.json`;
const BASE123_PATH = `${DIR}/worker-deploy-v123-pdfs/esperado-v123.json`;
const REMENDO_PATH = `${DIR}/evidence/v137-remendo-pen40-20-11.json`;
const LEITOR_PATH = `${DIR}/evidence/p73-leitor-bancada-pen40-20-11e.json`;
const DIARIO_AR_PATH = `${DIR}/evidence/v135-pos-deploy-19-11.json`;
const ST136_PATH = `${DIR}/evidence/v136-deployments-status-depois-19-11.json`;
const ST135_PATH = `${DIR}/evidence/v135-deployments-status-depois-19-11.json`;
const MOD_CAND_PATH = `${DIR}/bfr-candidata-v137-remendo-pen40/bfr-responsive-presentation.js`;
const MOD_BASE_PATH = `${DIR}/worker-deploy-v136-secretaria-de-educacao/public/bfr-responsive-presentation.js`;
const OUT = `${DIR}/evidence/v137-pos-deploy-20-11.json`;
const MODULO = 'bfr-responsive-presentation.js';
// As três saídas do passo de publicação. Não existem porque o passo não foi autorizado, e é isso que a recusa
// abaixo afirma — não são nomes lembrados: são o que esta peça exige para ter um ar novo a conferir.
const PUB = [`${DIR}/evidence/v137-deploy-stdout-20-11.txt`, `${DIR}/evidence/v137-deployments-list-depois-20-11.json`, `${DIR}/evidence/v137-deployments-status-depois-20-11.json`];
const EXIGE = [ESP137_PATH, ESP136_PATH, BASE123_PATH, REMENDO_PATH, LEITOR_PATH, DIARIO_AR_PATH, ST136_PATH, ST135_PATH, MOD_CAND_PATH, MOD_BASE_PATH];
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const n = (t, x) => t.split(x).length - 1;
const emFalta = (sonda) => EXIGE.filter((p) => !sonda(p));
const faltamPublicacao = (sonda) => PUB.filter((p) => !sonda(p));
const semPublicacao = () => {
  console.log(`V137_POS_DEPLOY_NAO_PUBLICADA · nada foi conferido porque o ar ainda serve a v136`);
  console.log('FALTAM ' + JSON.stringify(faltamPublicacao((p) => fs.existsSync(p)).map((p) => p.replace(DIR + '/', ''))));
  console.log('nota · esta peça não escreve registo em modo de recusa: um vermelho sem ar novo seria indistinguível dum bundle partido');
  console.log('exit 2 · recusa autorizada, não falha de verificação');
  process.exit(2);
};

const SELFTESTE = process.argv.includes('--selfteste');
if (SELFTESTE) {
  const le = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const E137 = le(ESP137_PATH), E136 = le(ESP136_PATH), B123 = le(BASE123_PATH), RE = le(REMENDO_PATH), LR = le(LEITOR_PATH);
  const cand = fs.readFileSync(MOD_CAND_PATH, 'utf8'), base = fs.readFileSync(MOD_BASE_PATH, 'utf8');
  const modBase = (lista) => lista.assets.find((a) => a.arquivo === MODULO).md5;
  const modBaseBytes = (lista) => lista.assets.find((a) => a.arquivo === MODULO).bytes;
  const DE = RE.remendo.de, PARA = RE.remendo.para;
  const passaAgulha = (t) => n(t, PARA) === 1 && n(t, DE) === 0;
  const casos = [];
  const c = (nome, verde) => casos.push({ nome, verde: !!verde });
  c('as_fontes_de_espera_resolvem_em_disco', emFalta((p) => fs.existsSync(p)).length === 0);
  // A régua das agulhas só vale se tiver positivo E negativo possíveis: a mesma prédica tem de ser verdadeira na
  // candidata e falsa na base publicada. Um `n(PARA, cand) > 0` isolado seria verdade sobre quase qualquer ficheiro.
  c('a_agulha_do_remendo_distingue_candidata_de_base', passaAgulha(cand) && !passaAgulha(base) && n(base, DE) === 1 && n(base, PARA) === 0 && n(cand, DE) === 0);
  c('os_md5_medidos_batem_com_os_declarados_pelo_remendo_e_pelo_leitor',
    md5(fs.readFileSync(MOD_CAND_PATH)) === LR.identidade_esperada.modulo_cand_md5 && md5(fs.readFileSync(MOD_CAND_PATH)) === RE.saida.md5
      && md5(fs.readFileSync(MOD_BASE_PATH)) === LR.identidade_esperada.modulo_base_md5 && md5(fs.readFileSync(MOD_BASE_PATH)) === RE.origem.md5
      && md5(fs.readFileSync(MOD_BASE_PATH)) === modBase(B123));
  // O delta de 790 bytes é a razão pela qual a shell não muda: é a única promessa que a v137 faz sobre o que
  // NÃO muda, por isso mede-se nos ficheiros e não só se declara.
  c('a_regra_do_delta_bate_com_os_bytes_e_com_a_declaracao',
    Buffer.byteLength(cand, 'utf8') - Buffer.byteLength(base, 'utf8') === RE.delta_bytes && RE.delta_bytes === E137.moduleBytes - modBaseBytes(B123));
  c('a_shell_da_v137_e_a_da_v136_sem_ambiguidade', E137.htmlMd5 === E136.htmlMd5 && E137.htmlBytes === E136.htmlBytes && E137.headersMd5 === E136.headersMd5);
  c('o_sw_da_v137_mudou_de_etiqueta_sem_mudar_de_tamanho', E137.swMd5 !== E136.swMd5 && E137.swBytes === E136.swBytes && /v137$/.test(String(E137.cacheLabel)));
  // A prova de que a recusa existe, sem tocar no disco real: a mesma função, com um sistema de ficheiros falso,
  // tem de devolver as três saídas quando nenhuma existe e zero quando todas existem. Sem isto, «recusa» pode
  // ser um predicado morto.
  c('a_recusa_de_publicacao_tem_positivo_e_negativo_possiveis',
    faltamPublicacao(() => false).length === PUB.length && faltamPublicacao(() => true).length === 0
      && faltamPublicacao((p) => !/v137-deploy/.test(p)).length === PUB.length);
  c('o_url_do_ar_e_derivada_do_diario_e_nao_inventada', /^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(le(DIARIO_AR_PATH).url)));
  // O conjunto de assets a comparar byte-a-byte: a base traz 12 e a v137 muda exactamente um — o módulo. Se
  // este censo se calasse (excluir tudo), a peça passaria a «provar» que nada mudou, que é o verde cortês.
  const onze = B123.assets.filter((a) => a.arquivo !== MODULO);
  c('a_lista_de_controlo_exclui_s_o_o_modulo_remendado', onze.length === B123.assets.length - 1 && !onze.some((a) => a.arquivo === MODULO));
  const boas = casos.filter((x) => x.verde).length;
  const out = { programa: 'scripts/v137-pos-deploy.mjs', selfteste: true, em: new Date().toISOString(),
    http: 0, escrita_no_banco: 0, ddl: 0, publicacao: 0, casos,
    agulhas_lidas_do_remendo: { de_bytes: Buffer.byteLength(DE, 'utf8'), para_bytes: Buffer.byteLength(PARA, 'utf8'),
      de_no_modulo_base: n(base, DE), para_no_modulo_base: n(base, PARA), de_no_modulo_candidata: n(cand, DE), para_no_modulo_candidata: n(cand, PARA) },
    modulos: { base: { md5: md5(fs.readFileSync(MOD_BASE_PATH)), bytes: Buffer.byteLength(base, 'utf8') }, candidata: { md5: md5(fs.readFileSync(MOD_CAND_PATH)), bytes: Buffer.byteLength(cand, 'utf8') } },
    saidas_de_publicacao_exigidas: PUB.map((p) => p.replace(DIR + '/', '')),
    estado_das_saidas_de_publicacao_agora: PUB.map((p) => fs.existsSync(p)),
    veredito: boas === casos.length ? `V137_POS_DEPLOY_SELFTESTE_OK ${casos.length}/0` : `V137_POS_DEPLOY_SELFTESTE_VERMELHO ${casos.length - boas}` };
  console.log(JSON.stringify(out, null, 1));
  console.log('selfteste: 0 HTTP, 0 escrita; o registo desta corrida e o stdout capturado por redireccionamento');
  process.exit(boas === casos.length ? 0 : 1);
}

if (fs.existsSync(OUT)) throw new Error('ABORTA: ' + OUT + ' existe — renomeie como ANTERIOR e re-corra');
const emFaltaAgora = emFalta((p) => fs.existsSync(p));
if (emFaltaAgora.length) console.log('AVISO · faltam fontes de espera, os portoes que as usam vao dar vermelho: ' + JSON.stringify(emFaltaAgora.map((p) => p.replace(DIR + '/', ''))));
if (faltamPublicacao((p) => fs.existsSync(p)).length) semPublicacao();

const le = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const E137 = le(ESP137_PATH), E136 = le(ESP136_PATH), B123 = le(BASE123_PATH), RE = le(REMENDO_PATH), LR = le(LEITOR_PATH);
const STDOUT_DEPLOY = fs.readFileSync(PUB[0], 'utf8');
const LISTA = le(PUB[1]);
const STATUS = le(PUB[2]);
const ST136 = le(ST136_PATH), ST135 = le(ST135_PATH);
const URL_AR = le(DIARIO_AR_PATH).url;
if (!/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(String(URL_AR))) throw new Error(`URL nao derivada do diario: ${URL_AR}`);
const DE = RE.remendo.de, PARA = RE.remendo.para;
const modBaseV123 = B123.assets.find((a) => a.arquivo === MODULO);
const FRAME_GUARD_ESPERADO = "frame-ancestors 'self'; base-uri 'self'; form-action 'self'";

const out = { ciclo: 'V137-POS-DEPLOY', em: new Date().toISOString(), escrita_no_banco: 0, ddl: 0, mint: 0, publicacao: 0,
  origem: { diario_ar: DIARIO_AR_PATH.replace(DIR + '/', ''), esperado_v137: ESP137_PATH.replace(DIR + '/', ''), esperado_v136: ESP136_PATH.replace(DIR + '/', ''),
    base_v123: BASE123_PATH.replace(DIR + '/', ''), remendo: REMENDO_PATH.replace(DIR + '/', ''), leitor_bancada: LEITOR_PATH.replace(DIR + '/', ''), stdout_deploy: PUB[0].replace(DIR + '/', '') },
  url: URL_AR, agulhas_lidas_do_remendo: { de_bytes: Buffer.byteLength(DE, 'utf8'), para_bytes: Buffer.byteLength(PARA, 'utf8') },
  portoes: {}, total: { ok: 0, falha: 0 } };
const gate = (id, ok, dados) => { out.portoes[id] = { passou: !!ok, ...(dados || {}) }; out.total[ok ? 'ok' : 'falha'] += 1; };
const get = async (p) => {
  const r = await fetch(URL_AR + p, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return { caminho: p, http: r.status, bytes: b.length, md5: md5(b), texto: b.toString('utf8'),
    content_type: r.headers.get('content-type'), csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') };
};

const shell = await get('/');
const notfound = await get('/rota-inexistente-v137-pos');
const firebase = await get('/firebase-messaging-sw.js');
// Os dois caminhos com query lêem-se da shell servida, não desta linha: é a shell que promete que versão de
// asset procura, e uma peça que escrevesse `?v=14` de memória estaria a confirmar a sua própria suposição.
const qMod = (shell.texto.match(/bfr-responsive-presentation\.js\?v=(\d+)/) || [])[1];
const qSw = (shell.texto.match(/sw-v4\.js\?v=(\d+)/) || [])[1];
gate('C0_a_shell_servida_nomeia_o_modulo_e_o_sw_com_query', qMod !== undefined && qSw !== undefined, { modulo_v: qMod, sw_v: qSw });
const modulo = await get(`/${MODULO}?v=${qMod}`);
const sw = await get(`/sw-v4.js?v=${qSw}`);
const headers = await get('/_headers');
const rotuloAr = (sw.texto.match(/const CACHE = '([^']+)'/) || [])[1];

gate('C1_shell_no_ar_bate_com_o_esperado_v137', shell.http === 200 && shell.md5 === E137.htmlMd5 && shell.bytes === E137.htmlBytes,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes }, esperado: { md5: E137.htmlMd5, bytes: E137.htmlBytes } });
gate('C2_shell_e_byte_a_byte_a_shell_da_v136', shell.md5 === E136.htmlMd5 && shell.bytes === E136.htmlBytes,
  { v136: { md5: E136.htmlMd5, bytes: E136.htmlBytes }, ar: { md5: shell.md5, bytes: shell.bytes }, delta_bytes: shell.bytes - E136.htmlBytes,
    nota: 'promessa invertida face a v136: o remendo PEN-40 toca so no modulo, por isso a shell NAO deve ter mudado' });
gate('C3_modulo_no_ar_e_o_remendo_gateado', modulo.http === 200 && modulo.md5 === E137.moduleMd5 && modulo.bytes === E137.moduleBytes,
  { medido: { http: modulo.http, md5: modulo.md5, bytes: modulo.bytes }, esperado: { md5: E137.moduleMd5, bytes: E137.moduleBytes } });
gate('C4_o_modulo_servido_deixou_de_ser_o_da_v136', modulo.md5 !== modBaseV123.md5 && modulo.bytes - modBaseV123.bytes === RE.delta_bytes,
  { ar: modulo.md5, v123_v136_publicado: modBaseV123.md5, delta_bytes_medido: modulo.bytes - modBaseV123.bytes, delta_bytes_do_remendo: RE.delta_bytes });
gate('C5_agulha_pen40_dentro_do_modulo_servido', n(modulo.texto, PARA) === 1 && n(modulo.texto, DE) === 0,
  { para: n(modulo.texto, PARA), de: n(modulo.texto, DE), origem_da_agulha: REMENDO_PATH.replace(DIR + '/', '') });
gate('C6_etiqueta_do_sw_no_ar_e_a_v137', sw.http === 200 && sw.md5 === E137.swMd5 && sw.bytes === E137.swBytes && rotuloAr === E137.cacheLabel,
  { medido: { md5: sw.md5, bytes: sw.bytes, rotulo: rotuloAr }, esperado: { md5: E137.swMd5, bytes: E137.swBytes, rotulo: E137.cacheLabel } });
gate('C7_sw_mesmos_bytes_da_v136_com_md5_diferente', sw.bytes === E136.swBytes && sw.md5 !== E136.swMd5, { bytes: sw.bytes, v136_bytes: E136.swBytes, v136_md5: E136.swMd5 });
gate('C8_os_dois_headers_na_shell', shell.xfo === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(String(shell.csp)), { x_frame_options: shell.xfo, csp: shell.csp });
gate('C9_csp_intacta_com_supabase', /\*\.supabase\.co/.test(String(shell.csp)) && /form-action[^;]*\*\.supabase\.co/.test(String(shell.csp)), { ok: /\*\.supabase\.co/.test(String(shell.csp)) });
gate('C10_rota_inexistente_da_404_ainda', notfound.http === 404, { http: notfound.http, bytes: notfound.bytes });
gate('C11_firebase_messaging_sw_ainda_404', firebase.http === 404, { http: firebase.http });
const onze = B123.assets.filter((a) => a.arquivo !== MODULO);
const vivos = [];
for (const a of onze) { const r = await get(`/${a.arquivo}`); vivos.push({ arquivo: a.arquivo, http: r.http, md5: r.md5, bytes: r.bytes, xfo: r.xfo, csp: r.csp }); }
const desvios = vivos.filter((v, i) => v.http !== 200 || v.md5 !== onze[i].md5 || v.bytes !== onze[i].bytes);
const semHeaders = vivos.filter((v) => v.xfo !== 'SAMEORIGIN' || v.csp !== FRAME_GUARD_ESPERADO);
gate('C12_onze_assets_byte_a_byte_com_a_base_v123', desvios.length === 0 && vivos.length === onze.length, { total: vivos.length, esperado: onze.length, desvios: desvios.map((d) => d.arquivo) });
gate('C13_os_onze_assets_com_os_dois_headers', semHeaders.length === 0, { sem_headers: semHeaders.map((d) => d.arquivo), esperado: { xfo: 'SAMEORIGIN', csp: FRAME_GUARD_ESPERADO } });
gate('C14_ficheiro_headers_inalterado_desde_a_v136', headers.http === 200 && headers.md5 === E137.headersMd5 && headers.bytes === E137.headersBytes && E137.headersMd5 === E136.headersMd5,
  { medido: { http: headers.http, md5: headers.md5, bytes: headers.bytes }, esperado_v137: E137.headersMd5, v136: E136.headersMd5 });
const versaoNoStdout = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(STDOUT_DEPLOY) || [])[1];
const porData = [...LISTA].sort((x, y) => String(y.created_on).localeCompare(String(x.created_on)));
gate('C15_servidor_concorda_com_o_deploy', !!versaoNoStdout && porData[0].versions[0].version_id === versaoNoStdout && STATUS.versions[0].version_id === versaoNoStdout && STATUS.versions[0].percentage === 100,
  { stdout: versaoNoStdout, lista: porData[0].versions[0].version_id, status: STATUS.versions[0].version_id, trafego: STATUS.versions[0].percentage, em: porData[0].created_on });
gate('C16_cadeia_de_reversao_na_lista', porData[1].versions[0].version_id === ST136.versions[0].version_id && porData[2].versions[0].version_id === ST135.versions[0].version_id,
  { v136: porData[1].versions[0].version_id, v135: porData[2].versions[0].version_id,
    nota: 'devolver o ar a v136 e um `wrangler deploy` a partir de worker-deploy-v136-secretaria-de-educacao — exige OK literal proprio, e so faz sentido com o modulo da v136 de volta' });
gate('C17_identidade_cruzada_entre_remendo_leitor_e_esperado',
  RE.saida.md5 === E137.moduleMd5 && LR.identidade_esperada.modulo_cand_md5 === E137.moduleMd5 && RE.origem.md5 === modBaseV123.md5 && LR.identidade_esperada.html_md5 === E137.htmlMd5,
  { remendo_saida: RE.saida.md5, leitor_candidata: LR.identidade_esperada.modulo_cand_md5, esperado_v137: E137.moduleMd5,
    remendo_origem: RE.origem.md5, base_v123_modulo: modBaseV123.md5, leitor_html: LR.identidade_esperada.html_md5, esperado_html: E137.htmlMd5 });

out.medido = { shell: { ...shell, texto: undefined }, modulo: { ...modulo, texto: undefined }, sw: { ...sw, texto: undefined }, headers, notfound, firebase, rotuloAr,
  contagens_no_modulo_servido: { pen40_para: n(modulo.texto, PARA), pen40_de: n(modulo.texto, DE) }, assets_vivos: vivos };
out.o_que_esta_peca_prova = 'que o ar serve o bundle da v137 que os portoes do gerador e do remendo gatearam, com a shell e os assets da v136 intactos. Nao prova o efeito do remendo no browser: isso e a bancada do leitor (evidence/p73-leitor-bancada-pen40-20-11e.json) e, depois do deploy, uma corrida nova dela com as duas pernas no ar.';
out.veredito = out.total.falha ? `V137_POS_DEPLOY_COM_DEFEITOS ${out.total.falha}` : `V137_POS_DEPLOY_OK ${out.total.ok}/0`;
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} · shell ${shell.md5} · modulo ${modulo.md5} · sw ${sw.md5} · rotulo ${rotuloAr}`);
if (out.total.falha) {
  console.log('VERMELHOS: ' + Object.entries(out.portoes).filter(([, v]) => !v.passou).map(([k]) => k).join(', '));
  process.exit(1);
}
console.log('ESCRITO: ' + OUT.split('/').pop());
