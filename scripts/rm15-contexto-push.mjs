// RM-1.5 passo 1 — SOMENTE LEITURA: ler dos bytes SERVIDOS o contexto das chamadas que compõem a
// cadeia de push, para separar os dois modos de falha que a medição de 12/11 deixou em aberto:
//   (a) o getToken recusar porque o SW registrado (/sw-v4.js) não tem handler de push, ou
//   (b) o push ser entregue e não haver quem o exiba.
// A distinção é estrutural: se o código passa {serviceWorkerRegistration} ao getToken, o destinatário
// do push é o SW do app; se não passa, o SDK tenta registrar /firebase-messaging-sw.js sozinho.
// HIGIENE: nenhum valor de credencial é impresso — literais longos viram <VALOR:len=N>.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const reg = JSON.parse(readFileSync('audit-publicacao-v120.json', 'utf8'));
const AR = reg.deploy.url;
const md5 = (b) => createHash('md5').update(b).digest('hex');
const shell = await (await fetch(AR + '/', { headers: { 'cache-control': 'no-cache' } })).text();
const servedSw = await (await fetch(AR + '/sw-v4.js?c=' + Date.now(),
  { headers: { 'cache-control': 'no-cache' } })).text();

// Máscara: qualquer sequência de 20+ caracteres de chave vira marca por comprimento.
const mascara = (s) => s.replace(/[A-Za-z0-9_-]{20,}/g, (m) => `<VALOR:len=${m.length}>`);
const janela = (re, antes = 160, depois = 260, max = 8) =>
  [...shell.matchAll(re)].slice(0, max).map((m) =>
    mascara(shell.slice(Math.max(0, m.index - antes), m.index + m[0].length + depois)).replace(/\s+/g, ' '));

const out = { em: new Date().toISOString(), ar: AR, shell_bytes: Buffer.byteLength(shell),
  shell_md5: md5(Buffer.from(shell)),
  chaves_de_config: {}, chamadas: {}, perguntas: {} };

// 1) As chaves do objeto de configuração do Firebase, SÓ por nome e comprimento do valor.
for (const chave of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId',
  'appId', 'measurementId', 'databaseURL']) {
  const re = new RegExp(`\\b${chave}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1).)*)\\1`, 'g');
  const m = [...shell.matchAll(re)];
  out.chaves_de_config[chave] = m.length
    ? { ocorrencias: m.length, tipo: /apiKey|appId|messagingSenderId|projectId/.test(chave) ? 'config' : 'config',
        len_valor: m[0][2].length, prefixo: mascara(m[0][2]).slice(0, 0) || null,
        valor_impresso: 'NAO (mascarado por forma)' }
    : { ocorrencias: 0 };
}
// VAPID: sem chave pública web-push o getToken do FCM de browser não aceita inscrição.
for (const chave of ['vapidKey', 'applicationVapidKey', 'vapid_key', 'VAPID']) {
  const re = new RegExp(`\\b${chave}\\b\\s*[:=]?`, 'gi');
  const m = [...shell.matchAll(re)];
  out.perguntas['vapid_' + chave] = m.length
    ? { ocorrencias: m.length, contexto: janela(new RegExp(`\\b${chave}\\b[\\s\\S]{0,200}`, 'gi'), 40, 200, 3) }
    : { ocorrencias: 0 };
}

// 2) Como o getToken é chamado: com ou sem serviceWorkerRegistration?
out.chamadas.getToken = janela(/\bgetToken\s*\(/g, 220, 320, 6);
out.chamadas.getToken_sem_registro = /\bgetToken\s*\(\s*[A-Za-z_$][\w$.]*\s*,\s*\{\s*(?!.*serviceWorkerRegistration)[^}]{0,200}\}/.test(shell);
out.chamadas.getToken_com_serviceWorkerRegistration = /getToken\([\s\S]{0,240}?serviceWorkerRegistration/.test(shell);
out.chamadas.initializeApp = janela(/\binitializeApp\s*\(/g, 60, 200, 3);
out.chamadas.getMessaging = janela(/\bgetMessaging\s*\(/g, 120, 200, 4);
out.chamadas.serviceWorker_register = janela(/navigator\.serviceWorker\.register\s*\(/g, 120, 200, 6);
out.chamadas.onMessage = janela(/\b(onMessage|setBackgroundMessageHandler)\s*\(/g, 80, 160, 4);
out.chamadas.importScripts = (shell.match(/importScripts/g) || []).length;
out.chamadas.script_src_firebase = [...new Set((shell.match(/["'][^"']*(?:gstatic|firebaseio|firebase)[^"']*["']/gi) || []).map((s) => mascara(s).slice(0, 90)))].slice(0, 10);
// CDN externa que a SDK de messaging precisaria de importar — comparada com o CSP servido.
const cspServido = [...new Set((shell.match(/https?:\/\/[A-Za-z0-9.-]+/g) || []))].sort();
out.perguntas.hosts_esternos_no_shell = cspServido.slice(0, 25);

// 3) A régua do trade-off: se a opção for importar a SDK de messaging no SW do app (importScripts),
//    o CSP publicado tem de permitir o host. Lê-se o CSP de DUAS origens e compara-se: o header que o
//    Worker serve (const CSP em worker-deploy-vN/worker.mjs) e a <meta> dentro do shell.
const wsrc = readFileSync(`worker-deploy-${reg.version}/worker.mjs`, 'utf8');
const linhaCsp = wsrc.match(/^const CSP = ("(?:[^"\\]|\\.)*");$/m);
const cspWorker = linhaCsp ? JSON.parse(linhaCsp[1]) : null;
const cspMeta = (shell.match(/<meta[^>]+Content-Security-Policy[^>]*>/i) || [null])[0];
const diretrizes = (csp) => {
  if (!csp) return null;
  const body = csp.replace(/^.*?Content-Security-Policy["'\s]*(?:content=)?["']/i, '') || csp;
  const mapa = {};
  for (const d of body.replace(/^<meta[^>]*content=["']/i, '').replace(/["'][^>]*>$/, '').split(';')) {
    const t = d.trim().split(/\s+/);
    if (t[0]) mapa[t[0]] = t.slice(1);
  }
  return mapa;
};
const hostsSdk = ['https://www.gstatic.com', 'https://cdn.jsdelivr.net'];
const custaB = (csp, rotulo) => {
  const g = diretrizes(csp);
  if (!g) return { rotulo, lido: false };
  const allow = (dir) => (g[dir] || g['default-src'] || []).some((s) => hostsSdk.some((h) => s.includes(h)));
  return { rotulo, lido: true,
    script_src: (g['script-src'] || g['default-src'] || []).length ? 'herda/tem' : 'ausente',
    worker_src: g['worker-src'] ? 'presente' : 'ausente (cai em default-src)',
    gstatic_em_script_src: allow('script-src'), gstatic_em_worker_src: allow('worker-src'),
    jsdelivr_em_script_src: (g['script-src'] || []).some((s) => s.includes('cdn.jsdelivr.net')),
    directives: Object.keys(g) };
};
out.csp = { do_worker: cspWorker, da_meta_no_shell: cspMeta,
  regras: [custaB(cspWorker, 'header do Worker'), custaB(cspMeta, '<meta> do shell')] };

// 4) Web Push cru vs FCM: se pushManager aparece, haveria caminho sem SW de messaging.
out.perguntas.pushManager_no_shell = (shell.match(/pushManager/g) || []).length;
out.perguntas.notificationclick_no_shell = (shell.match(/notificationclick/g) || []).length;
out.perguntas.notificationclick_no_sw = (servedSw.match(/notificationclick/g) || []).length;
out.perguntas.onNotificationClick_no_shell = (shell.match(/onNotificationClick|useServiceWorker/g) || []).length;

console.log(`\nCSP do worker lido? ${!!cspWorker} | meta no shell? ${!!cspMeta}`);
for (const r of out.csp.regras) console.log(`  ${JSON.stringify(r)}`);
console.log(`pushManager no shell=${out.perguntas.pushManager_no_shell} notificationclick shell=${out.perguntas.notificationclick_no_shell} sw=${out.perguntas.notificationclick_no_sw}`);

console.log(`shell ${out.shell_bytes} B md5 ${out.shell_md5}`);
console.log(`chaves de config: ${JSON.stringify(out.chaves_de_config)}`);
console.log(`getToken com serviceWorkerRegistration? ${out.chamadas.getToken_com_serviceWorkerRegistration}`);
console.log(`getToken sem registro explicito? ${out.chamadas.getToken_sem_registro}`);
for (const k of ['getToken', 'initializeApp', 'getMessaging', 'serviceWorker_register', 'onMessage'])
  console.log(`\n${k} (${out.chamadas[k].length} ocorrencias mostradas):\n  ` + out.chamadas[k].join('\n  '));
console.log(`\nimportScripts no shell: ${out.chamadas.importScripts}`);
console.log(`strings de CDN: ${JSON.stringify(out.chamadas.script_src_firebase)}`);
console.log(`hosts externos no shell: ${JSON.stringify(out.perguntas.hosts_esternos_no_shell)}`);
console.log(`\nvapid: ${JSON.stringify(out.perguntas).slice(0, 1200)}`);

// 5) A RESPOSTA, em texto, para não deixar a próxima leitura deduzir do contexto:
//    a quem o push é entregue. Se getToken recebe {serviceWorkerRegistration: reg} com
//    reg = register('/sw-v4.js?v=45'), o destinatário é o SW do app; a rota
//    /firebase-messaging-sw.js fica fora do caminho nesta build.
out.resposta = {
  sw_registrado_pelo_shell: [...new Set((shell.match(/serviceWorker\.register\(\s*[`"'][^`"']+/g) || [])
    .map((s) => mascara(s.replace(/\$\{[^}]*\}/g, '<ORIGEM>'))))],
  getToken_recebe_registration: out.chamadas.getToken_com_serviceWorkerRegistration,
  sw_servido_md5: md5(Buffer.from(servedSw)), sw_servido_bytes: Buffer.byteLength(servedSw),
  sw_servido_listeners: [...new Set(servedSw.match(/addEventListener\(\s*['"](\w+)['"]/g) || [])],
  sw_servido_push: (servedSw.match(/addEventListener\(\s*['"]push['"]/g) || []).length,
  sw_servido_importScripts: (servedSw.match(/importScripts/g) || []).length,
  sw_servido_showNotification: (servedSw.match(/showNotification/g) || []).length,
};
console.log(`\nRESPOSTA: ${JSON.stringify(out.resposta, null, 2)}`);

// 6) De onde vem a SDK de messaging HOJE: só URLs de <script src> e o seu host. É isto que diz se
//    a opção «importScripts no SW do app» precisa de alargar o CSP (fechado em 13/11) ou não.
out.sdk_fcm = {
  scripts_externos: [...new Set((shell.match(/<script[^>]+\bsrc\s*=\s*["'][^"']+["']/gi) || [])
    .map((s) => s.match(/src\s*=\s*["']([^"']+)["']/i)[1]))].sort(),
  scripts_firebase: [...new Set((shell.match(/<script[^>]+\bsrc\s*=\s*["'][^"']*firebase[^"']*["']/gi) || [])
    .map((s) => s.match(/src\s*=\s*["']([^"']+)["']/i)[1]))].sort(),
  hosts_de_script: [...new Set((shell.match(/<script[^>]+\bsrc\s*=\s*["']https?:\/\/[^/]+/gi) || [])
    .map((s) => (s.match(/https?:\/\/[^/]+/i) || ['?'])[0]))].sort(),
};
console.log(`\nSDK FCM: ${JSON.stringify(out.sdk_fcm, null, 2)}`);

// 7) Se não há <script src> da Firebase, de onde vem `window.firebase`? Sem resposta, a cadeia
//    morre antes do getToken e o conserto não é de SW nenhum — é de carregamento da SDK.
out.firebase_fonte = {
  window_firebase: (shell.match(/window\.firebase/g) || []).length,
  defer_by: (shell.match(/\bfirebase[-.]?(app|messaging|compat)/gi) || []).length,
  firebasejs_url: [...new Set((shell.match(/firebasejs[\w./-]*/g) || []))].slice(0, 6),
  gstatic_urls: [...new Set((shell.match(/https:\/\/www\.gstatic\.com[^"'()\s]*/g) || []))].slice(0, 8),
  atribuicao_window_firebase: [...new Set((shell.match(/window\.firebase\s*=/g) || []))],
  dynamic_import: [...new Set((shell.match(/import\(\s*["'`][^"'`]{0,80}/g) || []).map((s) => mascara(s)))].slice(0, 8),
  createElement_script: (shell.match(/createElement\(\s*['"]script['"]/g) || []).length,
  janela_definicao: janela(/window\.firebase\s*=/g, 120, 260, 4),
  janela_gstatic: janela(/https:\/\/www\.gstatic\.com/g, 200, 260, 5),
  janela_carregamento: janela(/function\s+loadFirebase[\s\S]{0,40}/g, 40, 420, 3),
  // O carregador diferido visto no contexto (`const deferredScriptLoads = new Map()`) é quem
  // traz a SDK. Registo o mapa de loaders por chave, não por URL, e conto os Firebase.
  deferredScriptLoads: (shell.match(/deferredScriptLoads/g) || []).length,
  scriptLoaders_map: [...new Set((shell.match(/["'][\w-]+["']\s*:\s*\[[^\]]{0,240}\]/g) || [])
    .filter((s) => /firebase|gstatic/i.test(s)).map((s) => mascara(s).slice(0, 200)))].slice(0, 6),
  janela_loaders: janela(/const scriptLoaders\s*=/g, 20, 700, 2),
};
console.log(`\nFONTE DO window.firebase: ${JSON.stringify(out.firebase_fonte, null, 2)}`);
writeFileSync(new URL('../evidence/rm15-contexto-push-14-11.json', import.meta.url),
  JSON.stringify(out, null, 2));
console.log(`\nevidence/rm15-contexto-push-14-11.json escrito`);
