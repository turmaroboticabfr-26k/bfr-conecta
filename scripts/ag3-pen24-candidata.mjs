// AG-3 (tranche 2, SEM PUBLICAÇÃO) — candidata v124: fechar a PEN-24 / RM-6.7.
// Base = worker-deploy-v123-pdfs (a versão viva, medida 16/11: shell d418e7fc…, versão 299eadd0…).
// Três mudanças no worker, nenhuma no HTML/SW/assets:
//   1. `; frame-ancestors 'self'` acrescentado ao CSP do shell;
//   2. `x-frame-options: SAMEORIGIN` nos cabeçalhos do shell;
//   3. os DOIS cabeçalhos também injectados nas respostas de asset, porque a medição do ar de 16/11
//      mostrou que /horario-matutino-2026.pdf e /manifest.json saem sem qualquer cabeçalho — e um PDF
//      é um documento framável.
// O valor é 'self'/SAMEORIGIN e não 'none' por motivo medido: `printDocument()` do shell recorre a um
// iframe `srcdoc` (herda a origem do pai) quando o `window.open` é bloqueado — 'none' partia a
// impressão. Nada nesta ficheiro escreve em banco, publica, ou toca no diretório base.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const BASE = join(REPO, 'worker-deploy-v123-pdfs');
const CAND = join(REPO, 'bfr-candidata-v124-anticliquejacking');
const REGISTO = join(REPO, 'evidence/ag3-pen24-candidata-16-11.json');
const md5 = (b) => createHash('md5').update(b).digest('hex');

const falhas = [];
let portoes = 0;
const gate = (nome, dado, esperado) => {
  portoes++;
  const ok = JSON.stringify(dado) === JSON.stringify(esperado);
  if (!ok) falhas.push(`${nome} | dado=${JSON.stringify(dado).slice(0, 240)} | esperado=${JSON.stringify(esperado).slice(0, 240)}`);
  console.log(`${ok ? 'VERDE' : 'VERMELHO'}  ${nome}`);
  return ok;
};

for (const p of [CAND, REGISTO]) if (existsSync(p)) throw new Error(`já existe ${p} — não sobreponho trabalho vivo; use um nome datado`);

const baseWorkerPath = join(BASE, 'worker.mjs');
const baseTxt = readFileSync(baseWorkerPath, 'utf8');
const baseMd5 = md5(readFileSync(baseWorkerPath));

// ── as três substituições, cada uma exigida exactamente uma vez ──────────────────────────────────
const TROCAS = [
  {
    nome: 'csp_com_frame_ancestors',
    de: `form-action 'self' https://accounts.google.com https://*.supabase.co";`,
    para: `form-action 'self' https://accounts.google.com https://*.supabase.co; frame-ancestors 'self'";`,
  },
  {
    nome: 'xfo_no_shell',
    de: `          'content-security-policy': CSP,\n          'x-content-type-options': 'nosniff',`,
    para: `          'content-security-policy': CSP,\n          'x-frame-options': 'SAMEORIGIN',\n          'x-content-type-options': 'nosniff',`,
  },
  {
    nome: 'assets_protegidos',
    de: `    const asset = await env.ASSETS.fetch(request);\n    if (asset.status !== 404) return asset;`,
    para: `    const asset = await env.ASSETS.fetch(request);\n    if (asset.status !== 404) {\n      // PEN-24 (medido 16/11): os assets saíam do Worker sem qualquer cabeçalho, e um PDF é\n      // um documento framável. Preserva status/bytes e só acrescenta os dois cabeçalhos.\n      const h = new Headers(asset.headers);\n      h.set('content-security-policy', FRAME_GUARD);\n      h.set('x-frame-options', 'SAMEORIGIN');\n      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers: h });\n    }`,
  },
  {
    nome: 'frame_guard_definido',
    de: `const NOFOUNDR = {`,
    para: `const FRAME_GUARD = "frame-ancestors 'self'; base-uri 'self'; form-action 'self'";\n\nconst NOFOUNDR = {`,
  },
];

let candTxt = baseTxt;
const aplicadas = [];
for (const t of TROCAS) {
  const n = candTxt.split(t.de).length - 1;
  gate(`ocorrencias_exactamente_uma_${t.nome}`, n, 1);
  if (n !== 1) continue;
  candTxt = candTxt.replace(t.de, t.para);
  aplicadas.push(t.nome);
}
gate('as_quatro_trocas_aplicadas', aplicadas.length, TROCAS.length);

// ── o que NÃO pode ter mudado ─────────────────────────────────────────────────────────────────────
const linhasNovas = TROCAS.reduce((s, t) => s + (t.para.split('\n').length - t.de.split('\n').length), 0);
gate('o_crescimento_do_ficheiro_e_mesmo_o_das_trocas', candTxt.split('\n').length - baseTxt.split('\n').length, linhasNovas);
const metaBase = (baseTxt.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*"/g) || []);
const metaCand = (candTxt.match(/<meta http-equiv="Content-Security-Policy" content="[^"]*"/g) || []);
gate('meta_csp_do_html_intacta', md5(metaCand.join('|')), md5(metaBase.join('|')));
gate('meta_csp_nao_recebe_frame_ancestors', /frame-ancestors/.test(metaCand.join('')), false);
gate('etiqueta_cache_do_sw_intacta', /const CACHE = 'bfr-conecta-v123';/.test(candTxt), true);
gate('nenhum_iframe_nenhum_postMessage_novo', [candTxt.split('<iframe').length - 1, candTxt.split('postMessage').length - 1], [baseTxt.split('<iframe').length - 1, baseTxt.split('postMessage').length - 1]);

// ── reversibilidade byte-a-byte: aplicar as trocas ao contrário tem de devolver a base ────────────
let rev = candTxt;
for (const t of [...TROCAS].reverse()) rev = rev.replace(t.para, t.de);
gate('reversao_byte_a_byte_devolve_a_base', md5(Buffer.from(rev, 'utf8')), baseMd5);

// ── materializar a candidata: cópia integral + worker patchado, assets byte-idênticos ─────────────
mkdirSync(CAND, { recursive: true });
cpSync(join(BASE, 'wrangler.toml'), join(CAND, 'wrangler.toml'));
cpSync(join(BASE, 'public'), join(CAND, 'public'), { recursive: true });
writeFileSync(join(CAND, 'worker.mjs'), candTxt);
const publicos = readdirSync(join(BASE, 'public')).sort();
const mesmaPublic = publicos.every((f) => md5(readFileSync(join(BASE, 'public', f))) === md5(readFileSync(join(CAND, 'public', f))));
gate('assets_da_candidata_byte_identicos_a_base', mesmaPublic, true);
gate('worker_da_candidata_bate_com_o_texto_patchado', md5(readFileSync(join(CAND, 'worker.mjs'))), md5(Buffer.from(candTxt, 'utf8')));

const out = {
  em: new Date().toISOString(),
  tarefa: 'AG-3 — candidata v124 anti-clique-jacketing (PEN-24 / RM-6.7), ESCRITA E NÃO PUBLICADA',
  base: { diretorio: 'worker-deploy-v123-pdfs', worker_md5: baseMd5, bytes: Buffer.byteLength(baseTxt) },
  candidata: { diretorio: 'bfr-candidata-v124-anticliquejacking', worker_md5: md5(Buffer.from(candTxt, 'utf8')), bytes: Buffer.byteLength(candTxt) },
  trocas: aplicadas,
  delta_bytes: Buffer.byteLength(candTxt) - Buffer.byteLength(baseTxt),
  insumos_medidos: {
    shell_ao_vivo: 'CSP sem frame-ancestors, X-Frame-Options ausente (medido no ar 16/11)',
    pdf_ao_vivo: '/horario-matutino-2026.pdf 200 sem content-security-policy e sem x-frame-options',
    manifest_ao_vivo: '/manifest.json 200 sem os dois cabeçalhos',
    porque_self_e_nao_none: "printDocument() usa iframe srcdoc (herda a origem do pai) quando window.open é bloqueado; o shell tem 13 window.open e 0 postMessage",
    meta_csp_nao_basta: "a especificação ignora frame-ancestors dentro de <meta http-equiv>: só o cabeçalho vale",
  },
  publicacao: { publicada: false, nota: 'nenhum deploy; promover isto pede OK literal novo e a cadeia de preflight/HTTP/Chrome dos ciclos de publicação' },
  portoes: { portoes, falhas },
};
writeFileSync(REGISTO, JSON.stringify(out, null, 2) + '\n');
console.log(`\ndelta_bytes=${out.delta_bytes} base=${out.base.worker_md5} candidata=${out.candidata.worker_md5}`);
if (falhas.length === 0) { console.log(`AG3_CANDIDATA_VERDE ${portoes} portões / 0 falhas · registo ${REGISTO.replace(REPO + '/', '')}`); process.exit(0); }
console.log(`AG3_CANDIDATA_VERMELHA ${falhas.length} falha(s) de ${portoes} portões`);
for (const f of falhas) console.log('  ' + f);
process.exit(1);
