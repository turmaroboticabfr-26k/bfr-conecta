// RM-6.9 / PEN-27 — gera a candidata do Worker e PROVA o comportamento dos dois lados sem publicar
// nada. O defeito medido em 12/11 e re-medido em 14/11: `worker-deploy-v120/worker.mjs:37` chama
// `env.ASSETS.fetch(assetUrl)` com uma STRING; a plataforma exige um Request, pelo que a chamada
// atira uma exceção que é apanhada ANTES do fallback da linha 41 — e qualquer caminho fora das
// 4 rotas fixas e dos 12 assets responde 500 (não só rotas inventadas: `/favicon.ico` e `/aluno`).
// A candidata troca o bloco por `ASSETS.fetch(request)` + 404 explícito. NÃO cria a rota
// `/firebase-messaging-sw.js`: isso é decisão do RM-1.5 e não cabe aqui.
// 0 deploy, 0 DDL, 0 escrita no ar. A única escrita é o diretório novo da candidata e o diário.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const md5 = (b) => createHash('md5').update(b).digest('hex');
// O diário grava «<md5> (<bytes> B)»: retiro o token, não comparo a string anotada.
const regua = (s) => String(s).trim().split(/\s+/)[0];
// O diário anota «(NNNN B)» ou «(NNNN B, CACHE xxx)»: o que interessa é o número depois do «(».
const bytes_da_regua = (s) => Number(String(s).match(/\((\d+) B[,)]/)[1]);
const DIR_BASE = 'worker-deploy-v120';
const DIR_CAND = 'worker-deploy-v120-404';
const CHAVE_BASE = 'worker_deploy_v120/worker.mjs';           // grafia do diário: sublinhado
const out = { em: new Date().toISOString(), tarefa: 'RM-6.9 candidata do 404', metodo: 'geração local + portão comportamental offline',
  base: DIR_BASE, candidata: DIR_CAND, publicado: false, portoes: {}, total: { ok: 0, falha: 0 } };
function checa(nome, valor, esperado) {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  // O diário guarda o veredito, não o ficheiro inteiro: valores de várias megas (as linhas todas da
  // candidata) viram resumo por md5. O passou/false é calculado antes, sobre os valores reais.
  const compacto = (v) => {
    const s = JSON.stringify(v);
    return s.length > 200 ? { md5: md5(Buffer.from(s)), bytes: Buffer.byteLength(s), igual: passou } : v;
  };
  out.portoes[nome] = { valor: compacto(valor), esperado: compacto(esperado), passou };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
}

// 1) A régua: o Worker publicado tem de ser o do diário, senão a candidata nasce de fonte errada.
const diario = JSON.parse(readFileSync('audit-publicacao-v120.json', 'utf8'));
const baseTxt = readFileSync(`${DIR_BASE}/worker.mjs`, 'utf8');
checa('P1_base_e_a_do_diario', md5(Buffer.from(baseTxt)), regua(diario.md5[CHAVE_BASE]));

// 2) O bloco a substituir, linha a linha, sem margem para deduzir indentação.
const LINHAS = baseTxt.split('\n');
const INICIO = 35, FIM = 41;                       // 1-indexado, inclusivo
const esperadoBloco = [
  '    // Static assets (manifest, images, PDFs, JS libs)',
  '    const assetUrl = url.pathname;',
  '    const asset = env.ASSETS ? await env.ASSETS.fetch(assetUrl) : null;',
  '    if (asset) return asset;',
  '',
  '    // Fallback: try to serve from the worker\'s own assets',
  '    return env.ASSETS.fetch(request);',
];
checa('P2_bloco_alvo_e_o_lido_na_base', LINHAS.slice(INICIO - 1, FIM), esperadoBloco);
if (!out.portoes.P2_bloco_alvo_e_o_lido_na_base.passou) {
  out.bloco_real = LINHAS.slice(INICIO - 1, FIM);
  console.error('bloco alvo não casa — aborto antes de escrever seja o que for');
  writeFileSync(new URL('../evidence/rm69-candidata-14-11.json', import.meta.url), JSON.stringify(out, null, 2));
  process.exit(1);
}

const NOVO_BLOCO = [
  '    // RM-6.9 / PEN-27: `ASSETS.fetch` exige um Request. A string da v120 atirava uma exceção',
  '    // antes do fallback, por isso qualquer caminho fora das 4 rotas fixas e dos 12 assets dava',
  '    // 500 (Cloudflare 1101) em vez de 404. Aqui: Request, e 404 limpo quando o asset não existe.',
  '    if (!env.ASSETS) return new Response(\'Not found\', { status: 404, headers: NOFOUNDR });',
  '    const asset = await env.ASSETS.fetch(request);',
  '    if (asset.status !== 404) return asset;',
  '    return new Response(\'Not found\', { status: 404, headers: NOFOUNDR });',
];
const NOFOUNDR_LINHAS = [
  'const NOFOUNDR = {',
  "  'content-type': 'text/plain; charset=utf-8',",
  "  'x-content-type-options': 'nosniff',",
  "  'referrer-policy': 'strict-origin-when-cross-origin',",
  "  'strict-transport-security': 'max-age=31536000',",
  "  'cache-control': 'max-age=0, no-cache, no-store',",
  '};',
  '',
];
// Cirurgia por linhas nas POSIÇÕES DA BASE. Nada de substituir substring: `export default {` vive
// dentro do HTML embutido, e um replace à-toa injetaria o cabeçalho no meio do shell.
const I_ED = LINHAS.findIndex((l) => l === 'export default {');
const DESLOC = NOFOUNDR_LINHAS.length;
checa('P2b_ancora_da_injecao',
  [I_ED + 1, LINHAS[I_ED], (baseTxt.match(/^export default \{$/gm) || []).length], [7, 'export default {', 1]);
const CAND_LINHAS = LINHAS.slice(0, I_ED).concat(NOFOUNDR_LINHAS, LINHAS.slice(I_ED, INICIO - 1),
  NOVO_BLOCO, LINHAS.slice(FIM));
const comHeader = CAND_LINHAS.join('\n');
if (I_ED < 0 || I_ED >= INICIO - 1 || !out.portoes.P2b_ancora_da_injecao.passou) {
  console.error('âncora `export default {` não é a linha 7 única da base — aborto antes de escrever');
  writeFileSync(new URL('../evidence/rm69-candidata-14-11.json', import.meta.url), JSON.stringify(out, null, 2));
  process.exit(1);
}

// 3) Escrevo a candidata num diretório NOVO; se já existir, paro (não piso trabalho de outrem).
if (existsSync(DIR_CAND) && readdirSync(DIR_CAND).length > 0) {
  console.error(`${DIR_CAND} já existe e não está vazio — não sobrescrevo`);
  process.exit(2);
}
if (!existsSync(DIR_CAND)) mkdirSync(DIR_CAND, { recursive: true });
if (!existsSync(`${DIR_CAND}/public`)) mkdirSync(`${DIR_CAND}/public`, { recursive: true });
writeFileSync(`${DIR_CAND}/worker.mjs`, comHeader);
const assetsBase = readdirSync(`${DIR_BASE}/public`).filter((f) => statSync(`${DIR_BASE}/public/${f}`).isFile()).sort();
for (const f of assetsBase) copyFileSync(`${DIR_BASE}/public/${f}`, `${DIR_CAND}/public/${f}`);
const tomlBase = readFileSync(`${DIR_BASE}/wrangler.toml`, 'utf8');
writeFileSync(`${DIR_CAND}/wrangler.toml`, tomlBase);

// 4) Reversão byte-a-byte: retiro o bloco NOVO, repõe o da base, e o ficheiro tem de voltar a ser
//    o publicado — mesmo md5. Sem esta prova a candidata não é reversível em 1 comando.
const porLinhas = (() => {
  const semHeader = CAND_LINHAS.slice(0, I_ED).concat(CAND_LINHAS.slice(I_ED + DESLOC));
  return semHeader.slice(0, INICIO - 1).concat(esperadoBloco,
    semHeader.slice(INICIO - 1 + NOVO_BLOCO.length)).join('\n');
})();
checa('P3_reversao_byte_identica_a_base', md5(Buffer.from(porLinhas)), md5(Buffer.from(baseTxt)));
// A candidata só pode diferir da base nos dois pontos de edição. Confiro as cinco janelas por
// posição, o que nenhuma contagem de linhas distingue: nada de uma linha mudar dentro do HTML.
const JANELAS = (() => {
  const b = LINHAS, c = CAND_LINHAS;
  return {
    cabeca: JSON.stringify(c.slice(0, I_ED)) === JSON.stringify(b.slice(0, I_ED)),
    nofoundr: JSON.stringify(c.slice(I_ED, I_ED + DESLOC)) === JSON.stringify(NOFOUNDR_LINHAS),
    meio: JSON.stringify(c.slice(I_ED + DESLOC, INICIO - 1 + DESLOC)) === JSON.stringify(b.slice(I_ED, INICIO - 1)),
    bloco: JSON.stringify(c.slice(INICIO - 1 + DESLOC, INICIO - 1 + DESLOC + NOVO_BLOCO.length)) === JSON.stringify(NOVO_BLOCO),
    cauda: JSON.stringify(c.slice(INICIO - 1 + DESLOC + NOVO_BLOCO.length)) === JSON.stringify(b.slice(FIM)),
  };
})();
checa('P4_candidata_so_muda_os_dois_pontos', Object.values(JANELAS).filter(Boolean).length, 5);
// O que está em disco tem de ser exatamente as linhas que os portões acima gatearam — nem mais um
// byte perdido no writeFileSync.
checa('P4b_disco_igual_as_linhas_gateadas', readFileSync(`${DIR_CAND}/worker.mjs`, 'utf8').split('\n'), CAND_LINHAS);

// 5) Os três corpos publicados têm de continuar idênticos: HTML, SW e CSP.
const corpo = (txt, nome) => {
  const m = txt.match(new RegExp('^const ' + nome + ' = ("(?:[^"\\\\]|\\\\.)*");$', 'm'));
  return m ? JSON.parse(m[1]) : null;
};
for (const nome of ['CSP', 'SW', 'HTML']) {
  const a = corpo(baseTxt, nome), b = corpo(comHeader, nome);
  checa('P5_' + nome + '_inalterado_na_candidata', md5(Buffer.from(b)), md5(Buffer.from(a)));
}
// 6) O corpo HTML da candidata é, byte a byte, o shell que está no ar — a régua é o diário da v120
//    (md5 «a9a76d0e…» gravado como «<md5> (<bytes> B)», por isso passo por `regua`).
checa('P6_HTML_da_candidata_e_o_shell_do_ar',
  [md5(Buffer.from(corpo(comHeader, 'HTML'))), Buffer.byteLength(corpo(comHeader, 'HTML'))],
  [regua(diario.md5.shell_depois), bytes_da_regua(diario.md5.shell_depois)]);
checa('P6b_SW_da_candidata_e_o_sw_do_ar',
  [md5(Buffer.from(corpo(comHeader, 'SW'))), Buffer.byteLength(corpo(comHeader, 'SW'))],
  [regua(diario.md5.sw_depois), bytes_da_regua(diario.md5.sw_depois)]);

// 6) Os 12 assets copiados são byte-idênticos aos da base.
const copiaIdenticia = assetsBase.every((f) =>
  md5(readFileSync(`${DIR_BASE}/public/${f}`)) === md5(readFileSync(`${DIR_CAND}/public/${f}`)));
checa('P7_assets_da_candidata_byte_iguais_a_base', [assetsBase.length, copiaIdenticia], [12, true]);

// 7) O contrato da plataforma, imitado com fidelidade medida: string → exceção; Request → Response
//    (200 se o asset existe, 404 se não). É isto que faz a v120 responder 500 no ar.
const CONHECIDOS = new Set(assetsBase.map((f) => '/' + f));
const mockEnv = (registos) => ({
  ASSETS: { fetch: async (arg) => {
    if (typeof arg === 'string') {
      throw new TypeError('Invalid arguments: The first argument to ASSETS.fetch must be a Request or URL object.');
    }
    const p = new URL(arg.url).pathname;
    registos.push(p);
    if (CONHECIDOS.has(p)) return new Response('asset:' + p, { status: 200, headers: { 'content-type': 'application/octet-stream' } });
    return new Response('Not Found', { status: 404 });
  } },
});
const rota = async (mod, path) => {
  const vistos = [];
  const req = new Request('https://bfr-conecta.test' + path);
  try {
    const res = await mod.default.fetch(req, mockEnv(vistos), { waitUntil() {} });
    return { http: res.status, ct: res.headers.get('content-type') || '', lanca: false, pedidos: vistos };
  } catch (e) {
    return { http: null, ct: '', lanca: true, erro: String(e).slice(0, 120), pedidos: vistos };
  }
};
const BASE = await import(new URL(`../${DIR_BASE}/worker.mjs`, import.meta.url).href);
const CAND = await import(new URL(`../${DIR_CAND}/worker.mjs`, import.meta.url).href);

const CAMINHOS = ['/', '/index.html', '/sw.js', '/sw-v4.js', '/manifest.json', '/favicon.ico', '/aluno',
  '/coordenacao', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/qualquer-rota-inexistente-zz'];
out.censo = { controle: {}, candidata: {} };
for (const p of CAMINHOS) {
  out.censo.controle[p] = await rota(BASE, p);
  out.censo.candidata[p] = await rota(CAND, p);
}
const lancaControle = CAMINHOS.filter((p) => out.censo.controle[p].lanca);
const lancaCandidata = CAMINHOS.filter((p) => out.censo.candidata[p].lanca);
const quinhentos = CAMINHOS.filter((p) => out.censo.candidata[p].http === 500);
const naoQuatroQuatro = CAMINHOS.filter((p) => !['/', '/index.html', '/sw.js', '/sw-v4.js'].includes(p)
  && !CONHECIDOS.has(p) && out.censo.candidata[p].http !== 404);

// 8) Controlo positivo do portão: a sonda tem de REPRODUZIR o 500 no código da v120. Se a base não
//    lançar, o portão está mudo e a candidata não está provada por nada.
checa('P8_controle_reproduz_a_falha_da_base',
  [lancaControle.length, lancaControle.includes('/favicon.ico'), lancaControle.includes('/aluno')], [8, true, true]);
checa('P9_candidata_nunca_lanca', lancaCandidata, []);
checa('P10_caminhos_desconhecidos_dao_404', [quinhentos.length, naoQuatroQuatro], [0, []]);
checa('P11_asset_conhecido_passa_200', out.censo.candidata['/manifest.json'].http, 200);
checa('P12_rotas_fixas_intactas',
  ['/', '/index.html', '/sw.js', '/sw-v4.js'].map((p) => out.censo.candidata[p].http), [200, 200, 200, 200]);
checa('P13_shell_e_sw_da_candidata_sao_os_do_ar',
  [md5(Buffer.from((await CAND.default.fetch(new Request('https://bfr-conecta.test/'), mockEnv([]), {})).headers.get('content-security-policy') || '')),
   (await CAND.default.fetch(new Request('https://bfr-conecta.test/sw-v4.js'), mockEnv([]), {})).headers.get('content-type')],
  [md5(Buffer.from(corpo(comHeader, 'CSP'))), 'application/javascript; charset=utf-8']);

// 9) A candidata NÃO invade o RM-1.5: não acrescenta a rota do SW do FCM nem mexe no handler push.
const textoCand = readFileSync(`${DIR_CAND}/worker.mjs`, 'utf8');
checa('P14_rota_fcm_nao_e_decidida_aqui',
  (textoCand.match(/firebase-messaging-sw/g) || []).length, (baseTxt.match(/firebase-messaging-sw/g) || []).length);
checa('P15_handler_push_nao_e_escrito_aqui', (textoCand.match(/addEventListener\(\s*['"]push['"]/g) || []).length, 0);
checa('P16_string_asets_fetch_desapareceu', /ASSETS\.fetch\(\s*assetUrl/.test(textoCand), false);
checa('P17_asSETS_fetch_com_Request', /await env\.ASSETS\.fetch\(request\)/.test(textoCand), true);

out.ficheiros = { candidata_worker_bytes: statSync(`${DIR_CAND}/worker.mjs`).size,
  candidata_worker_md5: md5(readFileSync(`${DIR_CAND}/worker.mjs`)),
  base_worker_md5: md5(Buffer.from(baseTxt)),
  delta_bytes: statSync(`${DIR_CAND}/worker.mjs`).size - Buffer.byteLength(baseTxt),
  assets: assetsBase.length };

out.veredito = out.total.falha === 0 ? 'RM69_CANDIDATA_PRONTA_NAO_PUBLICADA' : 'RM69_CANDIDATA_COM_FALHA';
console.log(`candidata: ${DIR_CAND}/worker.mjs ${out.ficheiros.candidata_worker_bytes} B md5 ${out.ficheiros.candidata_worker_md5}`);
console.log(`base     : ${DIR_BASE}/worker.mjs   ${Buffer.byteLength(baseTxt)} B md5 ${out.ficheiros.base_worker_md5}  Δ ${out.ficheiros.delta_bytes} B`);
console.log(`\ncontrole (v120) lança em ${lancaControle.length} caminhos: ${lancaControle.join(' ')}`);
console.log(`candidata lança em ${lancaCandidata.length}; 500 em ${quinhentos.length}; não-404: ${JSON.stringify(naoQuatroQuatro)}`);
console.log(`\nportoes: ${out.total.ok} verde / ${out.total.falha} vermelho de ${Object.keys(out.portoes).length}`);
for (const [k, v] of Object.entries(out.portoes))
  console.log(`  ${v.passou ? 'OK   ' : 'FALHA'} ${k}  valor=${JSON.stringify(v.valor).slice(0, 120)} esperado=${JSON.stringify(v.esperado).slice(0, 120)}`);
writeFileSync(new URL('../evidence/rm69-candidata-14-11.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\n${out.veredito}  (nada publicado; ${DIR_CAND} existe só em disco)`);
process.exit(out.total.falha === 0 ? 0 : 1);
