// RM-1.5 — bancada OFFLINE do SW candidato v122: executa o ficheiro num scope sintetico
// (new Function com self/caches/Response/fetch/URL mocks) e dispara PushEvent/
// NotificationClickEvent fabricados. Nada de browser, nada de rede, nada de banco.
// Controle positivo: o MESMO payload contra o SW base v121 nao produz showNotification
// (o base nao tem ouvinte push — coerente com a medicao do RM-1.3 de 12/11).
// Casos T1..T7 + portoes estruturais. Artefacto: portoes-v122-bancada.json no dir da candidata.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const CAND = `${dir}/bfr-candidata-v122-push-sw/sw-v4.js`;
const REV = `${dir}/bfr-candidata-v122-push-sw/sw-v4-reversa.js`;
const DIARY = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-diary.json`;
const WORKER = `${dir}/worker-deploy-v121/worker.mjs`;
const ESPERADO = `${dir}/worker-deploy-v121/esperado-v121.json`;
const OUT = `${dir}/bfr-candidata-v122-push-sw/portoes-v122-bancada.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const die = m => { console.error(`ABORTO: ${m}`); process.exit(1); };
const count = (s, t) => s.split(t).length - 1;
const gates = [];
const gate = (nome, valor, esperado) => gates.push({ nome, valor, esperado, ok: valor === esperado });

// ---- reguas de entrada (ler, nao dactilografar) ----
const diary = JSON.parse(fs.readFileSync(DIARY, 'utf8'));
if (diary.verdict !== 'V122_SW_ESTRUTURAL_OK' || diary.published !== false) die(`diario nao autoriza (${diary.verdict}, published=${diary.published})`);
const cand = fs.readFileSync(CAND, 'utf8');
const rev = fs.readFileSync(REV, 'utf8');
const exp = JSON.parse(fs.readFileSync(ESPERADO, 'utf8'));
const worker = fs.readFileSync(WORKER, 'utf8');
const m = worker.match(/^const SW = ("(?:[^"\\]|\\.)*");$/m);
if (!m) die('const SW = nao localizada no worker v121');
const swBase = JSON.parse(m[1]);

gate('candidata_md5_e_o_do_diario', md5(cand), diary.candidata.swMd5);
gate('candidata_bytes', Buffer.byteLength(cand), diary.candidata.swBytes);
gate('reversa_e_a_base_v121', md5(rev), exp.swMd5);
gate('base_v121_sem_ouvinte_push', count(swBase, "addEventListener('push'"), 0);
gate('candidata_um_ouvinte_push', count(cand, "addEventListener('push'"), 1);
gate('candidata_um_ouvinte_notificationclick', count(cand, "addEventListener('notificationclick'"), 1);
gate('candidata_sem_chamada_importScripts', count(cand, 'importScripts('), 0);
gate('candidata_uma_showNotification', count(cand, 'showNotification('), 1);
gate('candidata_um_openWindow', count(cand, 'openWindow('), 1);
gate('candidata_etiqueta_v122', count(cand, 'bfr-conecta-v122'), 1);
gate('candidata_sem_etiqueta_v121', count(cand, 'bfr-conecta-v121'), 0);

// ---- scope sintetico ----
function mkScope() {
  const listeners = {};
  const scope = {
    listeners, shown: [], opened: [], navigated: [], focused: 0,
    matchAllResult: [],
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    skipWaiting: () => Promise.resolve(),
    registration: { showNotification: async (t, o) => { scope.shown.push({ t, o }); } },
    clients: {
      claim: () => Promise.resolve(),
      matchAll: async () => scope.matchAllResult,
      openWindow: async (u) => { scope.opened.push(u); },
    },
    location: { origin: 'https://bfr-conecta.turmaroboticabfr.workers.dev' },
  };
  return scope;
}
const cachesMock = {
  keys: async () => [], open: async () => ({ addAll: async () => {}, put: async () => {} }),
  match: async () => undefined, delete: async () => true,
};
const fetchMock = async () => ({ ok: true, status: 200, type: 'basic', clone() { return this; } });
const evalSw = (src) => {
  const scope = mkScope();
  new Function('self', 'caches', 'Response', 'fetch', 'URL', src)(scope, cachesMock, globalThis.Response, fetchMock, globalThis.URL);
  return scope;
};
const fire = async (scope, type, event) => {
  for (const fn of (scope.listeners[type] || [])) { fn.call(scope, event); await Promise.all(event._waits || []); }
  await Promise.resolve(); await Promise.resolve();
};

// ---- eventos sinteticos ----
// PushMessageData real: { json(): payload }. O evento leva o objeto com json(), nao o payload cru.
const mkPush = (payload) => ({ data: { json: () => payload }, _waits: [], waitUntil(p) { this._waits.push(p); } });
const mkClick = (notification) => ({ notification, _waits: [], waitUntil(p) { this._waits.push(p); } });
const fcm = () => ({
  notification: { title: 'Aviso da escola', body: 'Reuniao amanha as 8h', icon: '/bfr-app-logo.png' },
  fcm_options: { link: '/comunicados' },
  data: { extra: 1 },
});

// ---- controle: base v121 com o mesmo payload -> nada acontece ----
const ctrl = evalSw(swBase);
await fire(ctrl, 'push', mkPush(fcm()));
gate('T0_controle_base_sem_showNotification', ctrl.shown.length, 0);

// ---- candidata ----
const sc = evalSw(cand);

// T1: payload FCM completo com fcm_options.link
await fire(sc, 'push', mkPush(fcm()));
{
  const s = sc.shown[0] || {};
  gate('T1_showNotification_uma', sc.shown.length, 1);
  gate('T1_titulo', s.t, 'Aviso da escola');
  gate('T1_body', s.o && s.o.body, 'Reuniao amanha as 8h');
  gate('T1_icon', s.o && s.o.icon, '/bfr-app-logo.png');
  gate('T1_data_url_e_o_link', s.o && s.o.data && s.o.data.url, '/comunicados');
}

// T2: so data.title/body (sem notification)
await fire(sc, 'push', mkPush({ title: 'Direto', body: 'corpo direto' }));
{
  const s = sc.shown[1] || {};
  gate('T2_titulo_do_data', s.t, 'Direto');
  gate('T2_body_do_data', s.o && s.o.body, 'corpo direto');
  gate('T2_data_url_default', s.o && s.o.data && s.o.data.url, '/');
}

// T3: data nao-JSON -> default 'BFR Conecta'
await fire(sc, 'push', mkPush({ json() { throw new Error('nao e json'); } }));
{
  const s = sc.shown[2] || {};
  gate('T3_titulo_default', s.t, 'BFR Conecta');
  gate('T3_body_vazio', s.o && s.o.body, '');
}

// T4: event.data null -> default
await fire(sc, 'push', mkPush(null));
{
  const s = sc.shown[3] || {};
  gate('T4_titulo_default', s.t, 'BFR Conecta');
}

// T5: notificationclick sem clientes -> openWindow(link)
await fire(sc, 'notificationclick', mkClick({ close() { sc.closed = (sc.closed || 0) + 1; }, data: { url: '/comunicados' } }));
gate('T5_openWindow_com_link', sc.opened.length === 1 && sc.opened[0], '/comunicados');
gate('T5_close_chamado', sc.closed, 1);

// T6: notificationclick sem data -> openWindow('/')
await fire(sc, 'notificationclick', mkClick({ close() {}, data: null }));
gate('T6_openWindow_default', sc.opened[1], '/');

// T7: notificationclick com cliente aberto -> navigate+focus, SEM openWindow
{
  const antes = sc.opened.length;
  sc.matchAllResult = [{ navigate: async (u) => { sc.navigated.push(u); }, focus: async () => { sc.focused++; } }];
  await fire(sc, 'notificationclick', mkClick({ close() {}, data: { url: '/direcao' } }));
  gate('T7_navigate_no_cliente', sc.navigated.length === 1 && sc.navigated[0], '/direcao');
  gate('T7_focus_chamado', sc.focused, 1);
  gate('T7_sem_openWindow', sc.opened.length, antes);
}

const falhas = gates.filter(g => !g.ok);
for (const g of gates) console.log(`  ${g.ok ? 'OK' : 'FALHA'}  ${g.nome} valor=${JSON.stringify(g.valor)} esperado=${JSON.stringify(g.esperado)}`);

const totalShown = sc.shown.length;
fs.writeFileSync(OUT, JSON.stringify({
  em: new Date().toISOString(),
  verdict: falhas.length === 0 ? 'V122_BANCADA_OK' : 'V122_BANCADA_COM_FALHAS',
  published: false,
  metodo: 'new Function com scope sintetico (self/caches/Response/fetch/URL); PushEvent/NotificationClickEvent fabricados; offline, sem rede nem banco',
  controle: { base: 'sw v121 (md5 ' + exp.swMd5 + ')', payload: 'fcm completo', showNotification: ctrl.shown.length },
  casos: {
    T1: 'payload FCM completo com fcm_options.link -> titulo/body/icon/data.url',
    T2: 'data.title/body diretos -> titulo do data, link default /',
    T3: 'data nao-JSON -> titulo default BFR Conecta, body vazio',
    T4: 'event.data null -> titulo default',
    T5: 'notificationclick sem clientes -> openWindow(link)',
    T6: 'notificationclick sem data -> openWindow(/)',
    T7: 'notificationclick com cliente -> navigate+focus e SEM openWindow',
  },
  candidata: { showNotification_total: totalShown, opened: sc.opened },
  portoes: gates,
}, null, 2));

if (falhas.length) { console.log(`\nV122_BANCADA_COM_FALHAS ${falhas.length}/${gates.length}`); process.exit(1); }
console.log(`\nV122_BANCADA_OK ${gates.length} portoes / 0 falhas · showNotification=${totalShown} openWindow=${sc.opened.length} navigate=${sc.navigated.length} focus=${sc.focused}`);
console.log(`artefacto ${OUT}`);
