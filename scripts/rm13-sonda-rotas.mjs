// RM-1.3 / achado de rotas — SOMENTE LEITURA: que URLs o HTML do ar referencia, o que responde, e onde a
// cadeia de push se parte. Mecanismo em estudo: worker-deploy-v118-csp/worker.mjs:37 chama
// `env.ASSETS.fetch(assetUrl)` com uma STRING; as linhas 12 e 22 são os únicos ramos antes disso.
// 0 escrita, 0 deploy, 0 DDL. Artefato: bfr-conecta/evidence/rm13-rotas.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const AR = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const noCache = { headers: { 'cache-control': 'no-cache' } };
const md5 = (s) => createHash('md5').update(s).digest('hex');

// O corpo do 500 é a página "Worker threw exception" (error 1101) da Cloudflare — o detetor antigo
// procurava "Error 1101|Internal Server Error" e dava erroCF=false para um erro confirmado.
const PAGINA_CF = /Worker threw exception|Error 1101|cloudflare/i;

const out = { em: new Date().toISOString(), tarefa: 'RM-1.3 rotas + cadeia push', ar: AR, metodo: 'somente leitura',
  portoes: {}, total: { ok: 0, falha: 0 } };
function checa(nome, valor, esperado) {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { valor, esperado, passou };
  out.total[passou ? 'ok' : 'falha'] += 1;
  return passou;
}

// Um só pedido por URL: o md5 é dos BYTES (senão PNG/PDF nunca bateriam com o disco) e o texto só
// é lido quando o content-type anuncia texto — é nele que a página da Cloudflare se reconhece.
// HIGIENE DO ARTEFATO: o corpo (3,49 MB de shell) NÃO vai para o JSON — só as medidas. `corpo:true`
// devolve o texto ao chamador para medir, e `semCorpo` garante que ele nunca é serializado.
const semCorpo = ({ texto, ...m }) => m;
const resposta = async (p, { corpo = false } = {}) => {
  const r = await fetch(AR + p, noCache);
  const b = Buffer.from(await r.arrayBuffer());
  const ct = String(r.headers.get('content-type') || '');
  const texto = /text|json|javascript|xml/i.test(ct) ? b.toString('utf8') : '';
  const cf = r.status >= 500 && PAGINA_CF.test(texto);
  const meta = { http: r.status, ct, bytes: b.length, md5: md5(b), erroCF: cf, trecho: texto.slice(0, 300),
    titulo: (texto.match(/<title>([^<]{0,80})/i) || [, ''])[1] };
  if (corpo) meta.texto = texto;
  return meta;
};

// 1) As rotas fixas, com o detetor corrigido
const shell = await resposta('/', { corpo: true });
const html = shell.texto;
if (html.length < 100000) { console.error('shell troppo pequeno para ser o app:', html.length); process.exit(2); }
out.html_chars = html.length;
out.html_bytes = Buffer.byteLength(html);
out.html_md5 = shell.md5;

const rotas = ['/', '/index.html', '/sw-v4.js', '/sw.js', '/firebase-messaging-sw.js',
  '/manifest.webmanifest', '/manifest.json', '/favicon.ico', '/robots.txt', '/sitemap.xml',
  '/?notifications=1', '/aluno', '/coordenacao', '/qualquer-rota-inexistente-zz'];
out.rotas = {};
for (const p of rotas) out.rotas[p] = await resposta(p);
checa('R1_shell_200', out.rotas['/'].http, 200);
checa('R2_sw_200', out.rotas['/sw-v4.js'].http, 200);
checa('R3_manifest_json_200', out.rotas['/manifest.json'].http, 200);
checa('R4_rota_fcm_existe', out.rotas['/firebase-messaging-sw.js'].http, 200);
checa('R5_rota_inexistente_e_404_nao_500', out.rotas['/qualquer-rota-inexistente-zz'].http, 404);
checa('R6_erro_cf_detectado_no_corpo', out.rotas['/aluno'].erroCF, true);

// 2) O bundle em disco — o que o ASSETS.fetch PODERIA servir
const bundleDir = 'worker-deploy-v118-csp/public';
out.bundle_disco = existsSync(bundleDir)
  ? readdirSync(bundleDir).map((f) => '/' + f).sort()
  : null;
const noBundle = (p) => (out.bundle_disco || []).includes(p);
// Cada ficheiro do bundle medido no ar: existe lá, responde 200 aqui?
out.bundle_medido = [];
for (const p of out.bundle_disco || []) {
  const r = await resposta(p);
  const disco = readFileSync(bundleDir + p);
  out.bundle_medido.push({ url: p, http: r.http, ct: r.ct, bytes: r.bytes, disco_bytes: disco.length,
    md5_ar: r.md5, md5_disco: md5(disco), igual_ao_disco: r.md5 === md5(disco) });
}
checa('R7_bundle_do_disco_servido_no_ar',
  (out.bundle_medido || []).filter((m) => m.http === 200).length, (out.bundle_disco || []).length);
checa('R8_bytes_do_ar_iguais_ao_disco',
  (out.bundle_medido || []).filter((m) => m.igual_ao_disco).length, (out.bundle_disco || []).length);

// 3) O que o HTML referencia — SÓ o documento: os corpos de <script>/<style>/<svg> são removidos antes
// de casar href/src. Sem isso, o shell de 3,5 MB devolvia 17 placeholders de template literal
// (/${avatarPath}, ${esc(url)}) que a medição tratava como URLs inexistentes — falso achado.
const doc = html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ');
const escura = (u) => {
  if (/^(data:|javascript:|mailto:|tel:|blob:|about:)/i.test(u)) return false;
  if (/[{}$`\\\s]/.test(u)) return false;               // template literal, concatenação ou espaço
  if (/^\/\/|^(https?:)?\/\//i.test(u) && !/^https?:/i.test(u)) return false; // protocol-relative
  return true;
};
const refs = new Set();
for (const m of doc.matchAll(/(?:href|src)\s*=\s*["']([^"'#?]+)(?:[^"']*)["']/gi)) {
  let u = m[1];
  if (!escura(u)) continue;
  if (/^https?:/i.test(u)) {
    try { const x = new URL(u); if (x.origin !== new URL(AR).origin) continue; u = x.pathname; } catch { continue; }
  }
  if (!u.startsWith('/')) u = '/' + u.replace(/^\.?\//, '');
  if (u.length > 1 && u !== '/') refs.add(u);
}
out.referencias_unicas_no_html = refs.size;
out.referencias_no_html_completo = null; // preenchido abaixo, antes do filtro de <script>
{
  const bruto = new Set();
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"'#?]+)(?:[^"']*)["']/gi)) {
    let u = m[1];
    if (/^(data:|javascript:|mailto:|tel:|blob:|about:)/i.test(u)) continue;
    if (/^https?:/i.test(u)) { try { u = new URL(u).pathname; } catch { continue; } }
    if (!u.startsWith('/')) u = '/' + u.replace(/^\.?\//, '');
    if (u.length > 1 && u !== '/') bruto.add(u);
  }
  out.referencias_no_html_completo = bruto.size;
  out.descartadas_como_template = [...bruto].filter((p) => !refs.has(p)).slice(0, 25);
}
out.manifest_links = [...new Set((html.match(/["'][^"']*manifest[^"']*["']/gi) || []).map((s) => s.slice(0, 60)))].slice(0, 8);

// Mede só o que ainda não foi medido (rotas fixas + bundle) para não repetir pedidos
const ja = new Set(Object.keys(out.rotas).map((p) => p.split('?')[0]).concat(out.bundle_disco || []));
const lista = [...refs].sort().filter((p) => !ja.has(p)).slice(0, 120);
out.referencias_medidas = lista.length;
const medidas = [];
for (const u of lista) {
  const r = await resposta(u);
  medidas.push({ url: u, http: r.http, ct: r.ct, bytes: r.bytes, erroCF: r.erroCF, no_bundle: noBundle(u) });
  process.stderr.write('.');
}
process.stderr.write('\n');
const por = (k) => medidas.filter((m) => m.http === k).length;
out.referenciadas = { total: medidas.length, http200: por(200), http404: por(404), http500: por(500),
  outros: medidas.length - por(200) - por(404) - por(500) };
out.as_500 = medidas.filter((m) => m.http === 500).map((m) => m.url).slice(0, 40);
out.referencias_fora_do_bundle = medidas.filter((m) => !m.no_bundle).map((m) => m.url).slice(0, 40);

// 4) Linhagem: em que versão a rota FCM e o handler push existiram no worker publicado.
// LIMITAÇÃO MEDIDA: em disco só restam os diretórios abaixo — o v89 documentado no plano de
// proteção familiar já não existe aqui, então "nenhum diretório tem rota FCM" prova o estado
// atual do disco, NÃO que a rota nunca foi publicada (isso é evidência escrita, não medida).
const dirs = readdirSync('.').filter((d) => /^worker-deploy-v\d+/.test(d)).sort();
out.linhagem = [];
for (const d of dirs) {
  const f = `${d}/worker.mjs`;
  if (!existsSync(f)) continue;
  const t = readFileSync(f, 'utf8');
  out.linhagem.push({ dir: d, bytes: t.length, md5: md5(t),
    rota_fcm: (t.match(/firebase-messaging-sw/g) || []).length,
    sw_handler_push: (t.match(/addEventListener\(\s*['"]push['"]/g) || []).length,
    sw_notificationclick: (t.match(/notificationclick/g) || []).length,
    sw_showNotification: (t.match(/showNotification/g) || []).length,
    assets_fetch_com_string: /ASSETS\.fetch\(\s*assetUrl/.test(t),
    cache: (t.match(/bfr-conecta-v\d+/g) || []).slice(0, 1) });
}
out.linhagem_resumo = {
  com_rota_fcm: out.linhagem.filter((l) => l.rota_fcm > 0).map((l) => l.dir),
  com_handler_push: out.linhagem.filter((l) => l.sw_handler_push > 0).map((l) => l.dir),
  com_fetch_por_string: out.linhagem.filter((l) => l.assets_fetch_com_string).map((l) => l.dir),
};

// 5) O SW servido: tem mesmo handler de push? (prova textual nos bytes que o ar devolve)
const swr = await resposta('/sw-v4.js?v=' + Date.now(), { corpo: true });
out.sw_servido = { http: swr.http, bytes: swr.bytes, md5: swr.md5, ct: swr.ct,
  handler_push: (swr.texto.match(/addEventListener\(\s*['"]push['"]/g) || []).length,
  notificationclick: (swr.texto.match(/notificationclick/g) || []).length,
  showNotification: (swr.texto.match(/showNotification/g) || []).length,
  palavra_push: (swr.texto.match(/push/gi) || []).length,
  importScripts: (swr.texto.match(/importScripts/g) || []).length,
  addEventListener: (swr.texto.match(/addEventListener/g) || []).length,
  listeners: [...new Set(swr.texto.match(/addEventListener\(\s*['"](\w+)['"]/g) || [])],
  firebase: (swr.texto.match(/firebase/gi) || []).length };
checa('S1_sw_servido_tem_handler_push', out.sw_servido.handler_push >= 1 ? 'tem' : 'nao', 'tem');
checa('S2_sw_servido_tem_notificationclick', out.sw_servido.notificationclick >= 1 ? 'tem' : 'nao', 'tem');
checa('S3_rota_fcm_devolve_js', String(out.rotas['/firebase-messaging-sw.js'].ct).includes('html') ? 'html' : 'js', 'js');

// 6) O manifesto publicado diz que PWA é installável? É o mesmo ficheiro que o HTML aponta?
let man = {};
try { man = JSON.parse((await resposta('/manifest.json', { corpo: true })).texto); }
catch (e) { man = { erro: String(e).slice(0, 120) }; }
out.manifest_json = man;
out.manifest_resumo = { tem_icons: (man.icons || []).length,
  start_url: man.start_url ?? null, scope: man.scope ?? null };

// 7) MARCAS DE PUSH NO SHELL SERVIDO: o app publicado ainda pede um service worker de push?
// É isto que separa "falta a rota no worker" de "o próprio front desistiu de subscrever".
const cont = (s, re) => (s.match(re) || []).length;
const medeMarcas = (t) => ({
  bytes: Buffer.byteLength(t),
  firebase_messaging_sw: cont(t, /firebase-messaging-sw/gi),
  serviceWorker_register: cont(t, /serviceWorker\.register/g),
  pushManager_subscribe: cont(t, /pushManager\.subscribe|PushManager/g),
  Notification_requestPermission: cont(t, /Notification\.requestPermission/g),
  new_Notification: cont(t, /new Notification\(/g),
  getToken_fcm: cont(t, /getToken\s*\(|\bgetMessaging\b|firebase\/messaging/g),
  registra_sw_v4_v45: cont(t, /sw-v4\.js\?v=45/g),
  palavra_push: cont(t, /push/gi),
  subscriptions_url: cont(t, /push_subscriptions/g),
});
out.shell_marcas_ar = medeMarcas(html);
const discoShell = 'app/index.html';
const discoSw = 'app/sw-v4.js';
out.shell_marcas_disco = existsSync(discoShell) ? medeMarcas(readFileSync(discoShell, 'utf8')) : null;
out.shell_igual_ao_disco = out.shell_marcas_disco ? shell.md5 === md5(readFileSync(discoShell)) : null;
out.sw_disco_md5 = existsSync(discoSw) ? md5(readFileSync(discoSw)) : null;
out.sw_disco_marcas = existsSync(discoSw) ? medeMarcas(readFileSync(discoSw, 'utf8')) : null;
checa('M1_shell_servido_e_o_da_bancada', out.shell_igual_ao_disco, true);
checa('M2_shell_tem_caminho_de_push',
  out.shell_marcas_ar.pushManager_subscribe + out.shell_marcas_ar.Notification_requestPermission > 0 ? 'tem' : 'nao',
  'tem');
checa('M3_shell_aponta_sw_de_fcm', out.shell_marcas_ar.firebase_messaging_sw > 0 ? 'tem' : 'nao', 'tem');

console.log('rotas fixas:');
for (const [p, v] of Object.entries(out.rotas))
  console.log(`  ${p.padEnd(30)} ${v.http} ${v.ct.slice(0, 20).padEnd(20)} ${String(v.bytes).padStart(8)}B erroCF=${v.erroCF} titulo="${v.titulo}"`);
console.log(`\nbundle em disco (${(out.bundle_disco || []).length}): ${(out.bundle_disco || []).join(' ')}`);
console.log(`bundle medido no ar: 200=${out.bundle_medido.filter((m) => m.http === 200).length}/${out.bundle_medido.length} byte-idêntico=${out.bundle_medido.filter((m) => m.igual_ao_disco).length}/${out.bundle_medido.length}`);
console.log(`\nreferências únicas no HTML=${out.referencias_unicas_no_html} medidas(novas)=${out.referenciadas.total} 200=${out.referenciadas.http200} 404=${out.referenciadas.http404} 500=${out.referenciadas.http500} outros=${out.referenciadas.outros}`);
console.log(`links de manifest no HTML: ${JSON.stringify(out.manifest_links)}`);
console.log(`as que dao 500 (${out.as_500.length}): ${out.as_500.slice(0, 20).join(' ')}`);
console.log(`fora do bundle (${out.referencias_fora_do_bundle.length}): ${out.referencias_fora_do_bundle.slice(0, 20).join(' ')}`);
console.log(`\nlinhagem em disco: ${out.linhagem.length} diretorios; com_rota_fcm=${JSON.stringify(out.linhagem_resumo.com_rota_fcm)} com_handler_push=${JSON.stringify(out.linhagem_resumo.com_handler_push)}`);
console.log(`fetch por string em ${out.linhagem_resumo.com_fetch_por_string.length}/${out.linhagem.length} diretorios: ${out.linhagem_resumo.com_fetch_por_string.slice(0, 8).join(' ')}`);
console.log(`\nsw servido: ${JSON.stringify(out.sw_servido)}`);
console.log(`sw em disco (app/sw-v4.js): md5=${out.sw_disco_md5} bytes=${out.sw_disco_marcas?.bytes}`);
console.log(`\nmarcas de push no shell SERVIDO: ${JSON.stringify(out.shell_marcas_ar)}`);
console.log(`marcas no shell DA BANCADA   : ${JSON.stringify(out.shell_marcas_disco)}`);
console.log(`shell servado == bancada? ${out.shell_igual_ao_disco}`);
console.log(`descartadas como template (${(out.descartadas_como_template || []).length}): ${(out.descartadas_como_template || []).slice(0, 8).join(' ')}`);
console.log(`manifest: ${JSON.stringify(out.manifest_resumo)}`);
console.log(`\nportoes: ${out.total.ok} verde / ${out.total.falha} vermelho de ${Object.keys(out.portoes).length}`);
for (const [k, v] of Object.entries(out.portoes)) console.log(`  ${v.passou ? 'OK   ' : 'FALHA'} ${k}  valor=${JSON.stringify(v.valor)} esperado=${JSON.stringify(v.esperado)}`);
out.veredito = out.total.falha === 0 ? 'RM13_CADEIA_OK' : 'RM13_CADEIA_PARTIDA';
writeFileSync(new URL('../evidence/rm13-rotas.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`\n${out.veredito}`);
process.exit(out.total.falha === 0 ? 0 : 1);
