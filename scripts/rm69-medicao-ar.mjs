// RM-6.9 / PEN-27 — medição do AR antes e depois do deploy da candidata worker-deploy-v120-404.
// SOMENTE LEITURA: não escreve no banco, não publica nada.
// O alvo NÃO é dactilografado: vem de deploy.url do diário de publicação mais alto no disco.
// Uso: node scripts/rm69-medicao-ar.mjs antes|depois
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const modo = process.argv[2] === 'depois' ? 'depois' : 'antes';
const md5 = (b) => createHash('md5').update(b).digest('hex');

const diarios = readdirSync('.')
  .map((f) => ({ f, m: f.match(/^audit-publicacao-v(\d+)\.json$/) }))
  .filter((x) => x.m)
  .map((x) => ({ n: Number(x.m[1]), f: x.f }))
  .sort((a, b) => b.n - a.n);
if (!diarios.length) { console.error('nenhum diário de publicação'); process.exit(2); }
const reg = JSON.parse(readFileSync(diarios[0].f, 'utf8'));
const AR = reg.deploy.url;
const versaoDiario = reg.version;
const dirBase = `worker-deploy-${versaoDiario}`;
const dirCand = 'worker-deploy-v120-404';
const noCache = { headers: { 'cache-control': 'no-cache' }, redirect: 'manual' };

const wsrcBase = readFileSync(`${dirBase}/worker.mjs`, 'utf8');
const linhaDe = (src, nome) => {
  const m = src.match(new RegExp('^const ' + nome + ' = ("(?:[^"\\\\]|\\\\.)*");$', 'm'));
  return m ? JSON.parse(m[1]) : null;
};
const reguaShell = Buffer.from(linhaDe(wsrcBase, 'HTML'), 'utf8');
const reguaSw = Buffer.from(linhaDe(wsrcBase, 'SW'), 'utf8');

const pede = async (p) => {
  const r = await fetch(AR + p, noCache);
  const b = Buffer.from(await r.arrayBuffer());
  return { http: r.status, ct: String(r.headers.get('content-type') || ''),
    bytes: b.length, md5: md5(b), csp: String(r.headers.get('content-security-policy') || ''),
    texto: /text|json|javascript|xml/i.test(String(r.headers.get('content-type') || '')) ? b.toString('utf8') : '' };
};

const out = { em: new Date().toISOString(), modo, tarefa: 'RM-6.9 / PEN-27 — rotas fora do bundle',
  metodo: 'somente leitura: 0 DDL, 0 escrita em banco, 0 mint', diario_de_origem: diarios[0].f,
  versao_esperada_no_ar: versaoDiario, ar: AR,
  candidatos_em_disco: {}, regua_local: { dir_base: dirBase,
    shell_bytes: reguaShell.length, shell_md5: md5(reguaShell),
    sw_bytes: reguaSw.length, sw_md5: md5(reguaSw) } };

for (const d of [dirBase, dirCand]) {
  const t = readFileSync(`${d}/worker.mjs`, 'utf8');
  out.candidatos_em_disco[d] = { worker_bytes: Buffer.byteLength(t), worker_md5: md5(Buffer.from(t)),
    assets_fetch_argumento: (t.match(/ASSETS\.fetch\(([^)]*)\)/) || [, ''])[1].trim(),
    devolve_404: /return new Response\([^)]*404/.test(t) || /status:\s*404/.test(t) };
}

const rotas = ['/', '/index.html', '/sw-v4.js', '/firebase-messaging-sw.js',
  '/qualquer-rota-inexistente-zz', '/manifest.json', '/favicon.ico', '/aluno',
  '/rota-que-nao-existe-tampouco'];
out.rotas = {};
for (const p of rotas) out.rotas[p] = await pede(p === '/sw-v4.js' ? `/sw-v4.js?v=${Date.now()}` : p);

const sw = out.rotas['/sw-v4.js'];
out.sw_servido = { http: sw.http, bytes: sw.bytes, md5: sw.md5, identico_a_regua: sw.md5 === md5(reguaSw),
  cache: (sw.texto.match(/bfr-conecta-v\d+/) || [''])[0] };
const sh = out.rotas['/'];
out.shell_servido = { http: sh.http, bytes: sh.bytes, md5: sh.md5,
  identico_a_regua: sh.md5 === md5(reguaShell), csp_presente: sh.csp.length > 0 };

out.assets = [];
for (const nome of readdirSync(`${dirCand}/public`).sort()) {
  const local = readFileSync(`${dirCand}/public/${nome}`);
  const r = await pede('/' + nome);
  out.assets.push({ nome, bytes_disk: local.length, md5_disk: md5(local),
    http: r.http, bytes_ar: r.bytes, md5_ar: r.md5, identico: r.md5 === md5(local) });
}

const P = {};
const checa = (n, v, e) => { P[n] = { valor: v, esperado: e, passou: JSON.stringify(v) === JSON.stringify(e) }; };
checa('R1_shell_do_diario_no_ar', out.shell_servido.md5, md5(reguaShell));
checa('R2_sw_do_diario_no_ar', out.sw_servido.identico_a_regua, true);
checa('R3_shell_e_200', out.rotas['/'].http, 200);
const inexist = out.rotas['/qualquer-rota-inexistente-zz'];
const esperadoInexistente = modo === 'depois' ? 404 : 500;
checa('R4_tipo_do_caminho_desconhecido', `${inexist.http} ${inexist.ct}`,
  modo === 'depois' ? '404 text/plain; charset=utf-8' : '500 text/html; charset=UTF-8');
checa('R5_rota_inexistente_http', inexist.http, esperadoInexistente);
checa('R6_deep_link SPA_http', out.rotas['/aluno'].http, esperadoInexistente);
checa('R7_rota_fcm_inexistente_http', out.rotas['/firebase-messaging-sw.js'].http, esperadoInexistente);
checa('R8_assets_byte_identicos_ao_disco',
  out.assets.filter((a) => a.identico && a.http === 200).length, out.assets.length);
checa('R9_nenhum_asset_500', out.assets.filter((a) => a.http === 500).length, 0);
out.portoes = P;
out.total = { verde: Object.values(P).filter((x) => x.passou).length,
  vermelho: Object.values(P).filter((x) => !x.passou).length };
out.veredito = out.total.vermelho === 0
  ? (modo === 'depois' ? 'RM69_DEPOIS_VERDE' : 'RM69_ANTES_MEDIDO') : 'RM69_COM_FALHAS';

const arquivo = `evidence/rm69-${modo}-14-11.json`;
writeFileSync(arquivo, JSON.stringify(out, null, 2));

console.log(`modo=${modo} ar=${AR} (derivada de ${diarios[0].f}, versão ${versaoDiario})`);
console.log(`regua local: shell ${out.regua_local.shell_bytes} B md5 ${out.regua_local.shell_md5} | sw ${out.regua_local.sw_bytes} B md5 ${out.regua_local.sw_md5}`);
for (const [d, v] of Object.entries(out.candidatos_em_disco))
  console.log(`disco ${d}: ${v.worker_bytes} B md5 ${v.worker_md5} ASSETS.fetch(${v.assets_fetch_argumento})`);
for (const [p, r] of Object.entries(out.rotas))
  console.log(`  ${p.padEnd(34)} ${String(r.http).padStart(3)} ${r.ct.slice(0, 24).padEnd(24)} ${String(r.bytes).padStart(8)} B  ${r.md5.slice(0, 12)}`);
console.log(`assets: ${out.assets.filter((a) => a.identico && a.http === 200).length}/${out.assets.length} idênticos ao disco e 200; 500=${out.assets.filter((a) => a.http === 500).length}`);
for (const a of out.assets.filter((x) => !(x.identico && x.http === 200))) console.log(`  DIVERGE ${a.nome} ${a.http} ${a.bytes_ar} B ${a.md5_ar}`);
for (const [k, v] of Object.entries(P))
  console.log(`  ${v.passou ? 'OK   ' : 'FALHA'} ${k} valor=${JSON.stringify(v.valor)} esperado=${JSON.stringify(v.esperado)}`);
console.log(`\n${out.veredito} ${out.total.verde}/${out.total.vermelho} de ${Object.keys(P).length}  ->  ${arquivo}`);
process.exit(out.total.vermelho === 0 ? 0 : 1);
