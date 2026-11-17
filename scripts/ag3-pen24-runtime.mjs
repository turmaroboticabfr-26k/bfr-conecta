// AG-3 (peça 2, SEM PUBLICAÇÃO) — não basta o texto ter a linha: o portão tem de medir o que o
// handler *emite*. Aqui o worker da base (v123, viva) e o da candidata (v124) são importados e
// chamados com um `env.ASSETS` falso, e os cabeçalhos saem da própria Response. Sem deploy, sem rede.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = join(REPO, 'worker-deploy-v123-pdfs/worker.mjs');
const CAND = join(REPO, 'bfr-candidata-v124-anticliquejacking/worker.mjs');
const REGISTO = join(REPO, 'evidence/ag3-pen24-runtime-16-11.json');
if (existsSync(REGISTO)) throw new Error(`já existe ${REGISTO} — não sobreponho trabalho vivo`);
const md5 = (b) => createHash('md5').update(b).digest('hex');

const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado).slice(0, 200)} | esperado=${JSON.stringify(esperado).slice(0, 200)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

const HOST = 'https://bfr-conecta.turmaroboticabfr.workers.dev';
const PDF = Buffer.from('%PDF-1.4\n% candidato de teste AG-3\n%%EOF\n');
const criarEnv = (log) => ({
  ASSETS: {
    fetch: async (req) => {
      const u = new URL(req.url ?? req);
      log.push(u.pathname);
      if (u.pathname.endsWith('/nao-existe.txt')) return new Response('Not found', { status: 404 });
      return new Response(PDF, {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'cache-control': 'public, max-age=0, must-revalidate' },
      });
    },
  },
});

const carregar = async (caminho) => (await import(pathToFileURL(caminho).href + '?bust=' + md5(caminho))).default;
const cabecalhos = (r) => Object.fromEntries([...r.headers.entries()]);
const pedir = async (mod, caminho, env) => {
  const req = new Request(HOST + caminho);
  const res = await mod.fetch(req, env, { waitUntil: () => {} });
  return { status: res.status, headers: cabecalhos(res), bytes: (await res.arrayBuffer()).byteLength };
};

const out = { em: new Date().toISOString(), tarefa: 'AG-3 peça 2 — emissão real do handler (base v123 × candidata v124), sem deploy', metodos: 'import do worker + env.ASSETS falso; nada toca a rede' };
const vistas = [];

for (const [papel, caminho] of [['base_v123', BASE], ['candidata_v124', CAND]]) {
  const mod = await carregar(caminho);
  const log = [];
  const env = criarEnv(log);
  const shell = await pedir(mod, '/', env);
  const asset = await pedir(mod, '/horario-matutino-2026.pdf', env);
  const sw = await pedir(mod, '/sw.js', env);
  const nao = await pedir(mod, '/nao-existe.txt', env);
  out[papel] = { shell, asset, sw, nao, assets_pedidos: log };
  vistas.push(papel);
  console.log(`\n── ${papel}: shell CSP=${String(shell.headers['content-security-policy'] || '(ausente)').slice(-60)} · XFO=${shell.headers['x-frame-options'] || '(ausente)'}`);
  console.log(`   asset: status=${asset.status} XFO=${asset.headers['x-frame-options'] || '(ausente)'} CSP=${asset.headers['content-security-policy'] || '(ausente)'}`);
}

const b = out.base_v123, c = out.candidata_v124;
// (1) o ar actual, reproduzido em código — o portão vê a falta, não só a presença
gate('base_reproduz_a_lacuna_medida_no_ar', [/\bframe-ancestors\b/.test(b.shell.headers['content-security-policy'] || ''), b.shell.headers['x-frame-options'] || null], [false, null]);
gate('base_deixa_o_pdf_sem_protecao', [b.asset.headers['x-frame-options'] || null, b.asset.headers['content-security-policy'] || null], [null, null]);
// (2) a candidata emite
gate('candidata_emite_frame_ancestors_no_shell', /frame-ancestors 'self'/.test(c.shell.headers['content-security-policy'] || ''), true);
gate('candidata_emite_x_frame_options_no_shell', c.shell.headers['x-frame-options'], 'SAMEORIGIN');
gate('candidata_emite_os_dois_no_asset', [/frame-ancestors/.test(c.asset.headers['content-security-policy'] || ''), c.asset.headers['x-frame-options']], [true, 'SAMEORIGIN']);
// (3) e não partiu o resto do contrato do shell/asset
gate('csp_do_shell_preserva_o_resto', c.shell.headers['content-security-policy'].replace(/; frame-ancestors 'self'/, ''), b.shell.headers['content-security-policy']);
gate('shell_mesmos_bytes_e_mesmo_content_type', [c.shell.bytes === b.shell.bytes, c.shell.headers['content-type']], [true, b.shell.headers['content-type']]);
gate('asset_preserva_status_content_type_cache_e_bytes', [c.asset.status, c.asset.headers['content-type'], c.asset.headers['cache-control'], c.asset.bytes], [b.asset.status, b.asset.headers['content-type'], b.asset.headers['cache-control'], b.asset.bytes]);
gate('sw_continua_sem_cabecalhos_de_documento', [c.sw.headers['x-frame-options'] || null, c.sw.headers['content-type']], [null, b.sw.headers['content-type']]);
gate('caminho_404_inalterado', [c.nao.status, c.nao.headers['content-type'], c.nao.bytes], [b.nao.status, b.nao.headers['content-type'], b.nao.bytes]);
gate('o_handler_continua_a_pedir_o_asset_ao_bindings', c.assets_pedidos, b.assets_pedidos);

// (4) CONTROLE NEGATIVO: retirar a linha do XFO numa cópia ao lado tem de dar vermelho. Um portão que
// não vê a ausência do cabeçalho não é um portão — é decoração.
const mut = readFileSync(CAND, 'utf8').replace(`          'x-frame-options': 'SAMEORIGIN',\n`, '');
gate('mutacao_retira_mesmo_a_linha', mut !== readFileSync(CAND, 'utf8'), true);
const MUT_PATH = join(tmpdir(), 'ag3-pen24-mutante-negativo-16-11.mjs');
writeFileSync(MUT_PATH, mut);
const modMut = await carregar(MUT_PATH);
const envMut = criarEnv([]);
const shellMut = await pedir(modMut, '/', envMut);
const assetMut = await pedir(modMut, '/horario-matutino-2026.pdf', envMut);
gate('controle_negativo_xfo_do_shell_fica_ausente', shellMut.headers['x-frame-options'] || null, null);
gate('controle_negativo_o_portao_morde', [/\bframe-ancestors\b/.test(shellMut.headers['content-security-policy'] || ''), shellMut.headers['x-frame-options'] || null], [true, null]);
gate('controle_negativo_o_asset_continua_protegido_so_por_via_propria', assetMut.headers['x-frame-options'], 'SAMEORIGIN');

out.controle_negativo = { shell_mutante: shellMut, asset_mutante: assetMut, prova: 'a linha do XFO retirada devolve cabeçalho ausente ⇒ asserições 4/5 são comparações reais' };
out.portoes = { portoes, falhas };
writeFileSync(REGISTO, JSON.stringify(out, null, 2) + '\n');
if (falhas.length === 0) { console.log(`\nAG3_RUNTIME_VERDE ${portoes} portões / 0 falhas · ${vistas.join(' × ')} · registo evidence/ag3-pen24-runtime-16-11.json`); process.exit(0); }
console.log(`\nAG3_RUNTIME_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
for (const f of falhas) console.log('  ' + f);
process.exit(1);
