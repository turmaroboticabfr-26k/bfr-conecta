const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const root = __dirname;

function extractSw(dir) {
  const txt = fs.readFileSync(path.join(root, dir, 'worker.mjs'), 'utf8');
  return vm.runInNewContext(txt.split('\n')[1] + '\nSW;', {}, { timeout: 5000 });
}

// Mock fiel: caches.put consome o corpo (como o CacheStorage real faz ao armazenar).
async function runShell(swSource, label) {
  const handlers = {};
  const store = new Map();
  const origin = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
  const cacheObj = {
    async put(req, resp) { const buf = await resp.arrayBuffer(); store.set(typeof req === 'string' ? req : req.url, buf); },
    async match(req) { const k = typeof req === 'string' ? req : req.url; if (store.has(k)) return new Response(store.get(k), { status: 200 }); return undefined; },
    async addAll() {}
  };
  const sandbox = {
    URL, Response, Request, console,
    fetch: async (req) => new Response('<!doctype html><html><body>SHELL-' + label + '</body></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    caches: { async open() { return cacheObj; }, async keys() { return [...store.keys()]; }, async delete() { return true; } },
    self: {
      location: { origin },
      addEventListener: (ev, fn) => { handlers[ev] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {}, matchAll: async () => [] }
    }
  };
  sandbox.self.addEventListener = (ev, fn) => { handlers[ev] = fn; };
  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { timeout: 5000 });
  // disparar install para popular (opcional) e depois fetch navigate
  const req = new Request(origin + '/', { method: 'GET' });
  Object.defineProperty(req, 'mode', { value: 'navigate', configurable: true });
  let responded;
  const event = { request: req, respondWith: p => { responded = p; } };
  handlers.fetch(event);
  const resp = await responded;
  const out = { label, status: resp.status, bodyUsedBeforeRead: resp.bodyUsed };
  try { const t = await resp.text(); out.readOk = true; out.bodyLen = t.length; out.bodySnippet = t.slice(0, 40); }
  catch (e) { out.readOk = false; out.readErr = String(e); }
  return out;
}

(async () => {
  const swSrc = extractSw('worker-deploy-v118-swfix');   // buggy (sem clone no shell)
  const swFixed = extractSw('worker-deploy-v118-swclone'); // corrigido
  const before = await runShell(swSrc, 'ANTES');
  const after = await runShell(swFixed, 'DEPOIS');
  const gates = [
    { name: 'antes_corpo_consumido', ok: before.bodyUsedBeforeRead === true && before.readOk === false, detail: before },
    { name: 'depois_corpo_intacto', ok: after.bodyUsedBeforeRead === false && after.readOk === true, detail: after },
    { name: 'depois_body_correto', ok: after.readOk === true && after.bodySnippet.includes('SHELL-DEPOIS'), detail: after.bodySnippet }
  ];
  const allOk = gates.every(g => g.ok);
  const report = {
    ciclo: 'v118-swclone-bancada',
    data: '2026-11-08',
    metodo: 'handler fetch do SW em sandbox vm; caches.put mock consome o corpo como o CacheStorage real; pedido navigate /',
    sw_src_md5: md5(Buffer.from(swSrc)),
    sw_fixed_md5: md5(Buffer.from(swFixed)),
    antes: before,
    depois: after,
    gates_total: gates.length,
    gates_ok: gates.filter(g => g.ok).length,
    verdict: allOk ? 'AB_OK' : 'AB_FALHOU',
    gates
  };
  fs.writeFileSync(path.join(root, 'docs', 'v118-swclone-bancada.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!allOk) process.exit(1);
})();