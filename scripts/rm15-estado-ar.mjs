// RM-1.5 / RM-6.9 passo 0 — SOMENTE LEITURA, em 14/11: qual é o estado VIVO da cadeia de rotas
// do Worker, medido outra vez em vez de citado do diário de 12/11.
// O alvo NÃO é dactilografado: vem de deploy.url do diário de publicação da versão mais alta
// (`audit-publicacao-vN.json`) e a régua do shell vem do próprio worker.mjs dessa versão, extraído
// da linha `const HTML = "..."`. Escreve evidence/rm15-estado-ar-14-11.json e NÃO toca em
// evidence/rm13-rotas.json, que é artefacto citado pelo roadmap.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const md5 = (b) => createHash('md5').update(b).digest('hex');
const cont = (s, re) => (s.match(re) || []).length;

// 1) A versão publicada mais alta, derivada dos diários presentes no disco.
const diarios = readdirSync('.')
  .map((f) => ({ f, m: f.match(/^audit-publicacao-v(\d+)\.json$/) }))
  .filter((x) => x.m)
  .map((x) => ({ n: Number(x.m[1]), f: x.f }))
  .sort((a, b) => b.n - a.n);
if (!diarios.length) { console.error('nenhum diário de publicação'); process.exit(2); }
const reg = JSON.parse(readFileSync(diarios[0].f, 'utf8'));
const AR = reg.deploy.url;
const versao = reg.version;
const dirWorker = `worker-deploy-${versao}`;

// 2) A régua local: o HTML e o SW tal como estão escritos dentro do worker.mjs da versão publicada.
const wsrc = readFileSync(`${dirWorker}/worker.mjs`, 'utf8');
const linha = (nome) => {
  const m = wsrc.match(new RegExp('^const ' + nome + ' = ("(?:[^"\\\\]|\\\\.)*");$', 'm'));
  if (!m) throw new Error(`não encontrei a linha const ${nome} em ${dirWorker}/worker.mjs`);
  return JSON.parse(m[1]);
};
const reguaShell = Buffer.from(linha('HTML'), 'utf8');
const reguaSw = Buffer.from(linha('SW'), 'utf8');
const cspDoWorker = linha('CSP');
const noCache = { headers: { 'cache-control': 'no-cache' } };
const pede = async (p) => {
  const r = await fetch(AR + p, noCache);
  const b = Buffer.from(await r.arrayBuffer());
  const ct = String(r.headers.get('content-type') || '');
  return { http: r.status, ct, bytes: b.length, md5: md5(b),
    texto: /text|json|javascript|xml/i.test(ct) ? b.toString('utf8') : '',
    csp: String(r.headers.get('content-security-policy') || '') };
};

const out = { em: new Date().toISOString(), tarefa: 'RM-1.5/RM-6.9 passo 0 — estado vivo das rotas',
  metodo: 'somente leitura: 0 escrita, 0 DDL, 0 deploy', diario_de_origem: diarios[0].f,
  versao_esperada: versao, ar: AR,
  regua_local: { worker_dir: dirWorker, worker_md5: md5(Buffer.from(wsrc)),
    shell_bytes: reguaShell.length, shell_md5: md5(reguaShell),
    sw_bytes: reguaSw.length, sw_md5: md5(reguaSw),
    shell_no_diario: reg.md5?.shell_depois ?? null, sw_no_diario: reg.md5?.sw_depois ?? null } };
const rotas = ['/', '/index.html', '/sw-v4.js', '/firebase-messaging-sw.js',
  '/qualquer-rota-inexistente-zz', '/manifest.json', '/favicon.ico', '/aluno'];
out.rotas = {};
for (const p of rotas) {
  const r = await pede(p === '/sw-v4.js' ? `/sw-v4.js?v=${Date.now()}` : p);
  out.rotas[p] = { http: r.http, ct: r.ct, bytes: r.bytes, md5: r.md5,
    csp_presente: r.csp.length > 0 ? 'sim' : 'nao', trecho: r.texto.slice(0, 80).replace(/\s+/g, ' ') };
}
const sw = await pede(`/sw-v4.js?v=${Date.now()}`);
out.sw_servido = { http: sw.http, bytes: sw.bytes, md5: sw.md5,
  identico_a_regua: sw.md5 === md5(reguaSw),
  listeners: [...new Set(sw.texto.match(/addEventListener\(\s*['"](\w+)['"]/g) || [])],
  handler_push: cont(sw.texto, /addEventListener\(\s*['"]push['"]/g),
  notificationclick: cont(sw.texto, /notificationclick/g),
  showNotification: cont(sw.texto, /showNotification/g),
  importScripts: cont(sw.texto, /importScripts/g),
  firebase: cont(sw.texto, /firebase/gi), cache: (sw.texto.match(/bfr-conecta-v\d+/) || [''])[0] };
const shell = await pede('/');
out.shell_servido = { http: shell.http, bytes: shell.bytes, md5: shell.md5,
  identico_a_regua: shell.md5 === md5(reguaShell),
  csp_identico_a_regua: shell.csp === cspDoWorker ? 'sim' : 'nao',
  firebase_messaging_sw: cont(shell.texto, /firebase-messaging-sw/gi),
  serviceWorker_register: cont(shell.texto, /serviceWorker\.register/g),
  registra_sw_v4_v45: cont(shell.texto, /sw-v4\.js\?v=45/g),
  getToken_fcm: cont(shell.texto, /getToken\s*\(|\bgetMessaging\b|firebase\/messaging/g),
  pushManager: cont(shell.texto, /pushManager\.subscribe|PushManager/g),
  Notification_requestPermission: cont(shell.texto, /Notification\.requestPermission/g),
  subscriptions_url: cont(shell.texto, /push_subscriptions/g) };

// 3) A causa do PEN-27: quantos worker.mjs em disco ainda passam STRING ao ASSETS.fetch.
out.linhagem = readdirSync('.').filter((d) => /^worker-deploy-v\d+/.test(d)).sort().map((d) => {
  const f = `${d}/worker.mjs`;
  if (!existsSync(f)) return { dir: d, ausente: true };
  const t = readFileSync(f, 'utf8');
  return { dir: d, bytes: Buffer.byteLength(t), md5: md5(Buffer.from(t)),
    assets_fetch_por_string: /ASSETS\.fetch\(\s*assetUrl/.test(t),
    rota_fcm_literal: cont(t, /firebase-messaging-sw/g) };
});
out.linhagem_resumo = {
  com_fetch_por_string: out.linhagem.filter((l) => l.assets_fetch_por_string).map((l) => l.dir),
  sem_fetch_por_string: out.linhagem.filter((l) => l.assets_fetch_por_string === false).map((l) => l.dir),
};

// 4) O que está pronto e NÃO publicado — conferido por bytes, não por memória.
const candidatas = [
  ['bfr-candidata-v121-rotulos-supervisor/index.html', 'v121 (PEN-33/RM-1.8), NÃO publicada'],
  ['scripts/rm68-fail-closed-por-policy.sql', 'RM-6.8 fail-closed, NÃO aplicada'],
];
out.candidatas_em_disco = candidatas.map(([p, nota]) => ({
  caminho: p, nota, existe: existsSync(p),
  ...(existsSync(p) ? { bytes: Buffer.byteLength(readFileSync(p)), md5: md5(readFileSync(p)) } : {}),
}));

const P = {};
const checa = (n, v, e) => { P[n] = { valor: v, esperado: e, passou: JSON.stringify(v) === JSON.stringify(e) }; };
checa('A1_ar_e_a_versao_do_diario', out.shell_servido.identico_a_regua, true);
checa('A2_sw_servido_igual_ao_worker', out.sw_servido.identico_a_regua, true);
checa('A3_rota_inexistente_da_404_nao_500', out.rotas['/qualquer-rota-inexistente-zz'].http, 404);
checa('A4_rota_fcm_devolve_js', String(out.rotas['/firebase-messaging-sw.js'].ct).includes('javascript'), true);
checa('A5_sw_tem_handler_push', out.sw_servido.handler_push >= 1, true);
checa('A6_shell_aponta_sw_de_fcm', out.shell_servido.firebase_messaging_sw > 0, true);
out.portoes = P;
out.total = { verde: Object.values(P).filter((x) => x.passou).length,
  vermelho: Object.values(P).filter((x) => !x.passou).length };
out.veredito = out.total.vermelho === 0 ? 'RM15_ESTADO_OK' : 'RM15_ESTADO_COM_FALHAS';
writeFileSync('evidence/rm15-estado-ar-14-11.json', JSON.stringify(out, null, 2));

console.log(`ar=${AR} versao=${versao} (derivada de ${diarios[0].f})`);
console.log(`regua local: shell ${out.regua_local.shell_bytes} B md5 ${out.regua_local.shell_md5}`);
console.log(`             sw   ${out.regua_local.sw_bytes} B md5 ${out.regua_local.sw_md5}`);
console.log(`diario:      shell ${out.regua_local.shell_no_diario}`);
console.log(`shell servido: ${out.shell_servido.bytes} B md5 ${out.shell_servido.md5} identico_a_regua=${out.shell_servido.identico_a_regua} csp=${out.shell_servido.csp_identico_a_regua}`);
for (const [p, r] of Object.entries(out.rotas))
  console.log(`  ${p.padEnd(32)} ${r.http} ${r.ct.slice(0, 26).padEnd(26)} ${String(r.bytes).padStart(8)} B  "${r.trecho.slice(0, 34)}"`);
console.log(`sw servido: listeners=${JSON.stringify(out.sw_servido.listeners)} cache=${out.sw_servido.cache} push=${out.sw_servido.handler_push} notifclick=${out.sw_servido.notificationclick} importScripts=${out.sw_servido.importScripts}`);
console.log(`marcas de push no shell: ${JSON.stringify(out.shell_servido).slice(0, 400)}`);
console.log(`linhagem: com_fetch_por_string=${out.linhagem_resumo.com_fetch_por_string.length}/${out.linhagem.length}`);
for (const c of out.candidatas_em_disco) console.log(`candidata: ${c.caminho} ${c.bytes} B ${c.md5} (${c.nota})`);
for (const [k, v] of Object.entries(P)) console.log(`  ${v.passou ? 'OK   ' : 'FALHA'} ${k} valor=${JSON.stringify(v.valor)} esperado=${JSON.stringify(v.esperado)}`);
console.log(`\n${out.veredito} ${out.total.verde}/${out.total.vermelho} de ${Object.keys(P).length}  ->  evidence/rm15-estado-ar-14-11.json`);
process.exit(0);
