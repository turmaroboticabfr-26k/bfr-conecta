// PDF-HOR-1: preflight SOMENTE-LEITURA do estado publicado dos horários.
// O alvo é DERIVADO do diário argv[3] (reguas.url) — nunca dactilografado.
// Escreve apenas o diário argv[2]; recusa sobrescrever.
import fs from 'node:fs';
import crypto from 'node:crypto';

const [SAIDA, DIARIO_URL, BUNDLE] = [process.argv[2], process.argv[3], process.argv[4] || 'worker-deploy-v122-push'];
if (!SAIDA || !DIARIO_URL) { console.error('uso: node pdf-hor-1-preflight.mjs <saida.json> <diario-com-reguas.url> [bundle]'); process.exit(1); }
if (fs.existsSync(SAIDA)) { console.error(`não sobrepõe: ${SAIDA} já existe`); process.exit(1); }

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const url_base = JSON.parse(fs.readFileSync(DIARIO_URL, 'utf8')).reguas.url;
if (!/^https:\/\//.test(url_base)) { console.error(`url derivado inválido: ${url_base}`); process.exit(1); }

const FICHEIROS = [
  'horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf', 'calendario-letivo-2026.pdf',
  'horario-matutino-2026.png', 'horario-vespertino-2026.png',
];

async function colher(caminho) {
  const r = await fetch(new URL(caminho, url_base).href, { cache: 'no-store' });
  const b = Buffer.from(await r.arrayBuffer());
  return {
    caminho, status: r.status, bytes: b.length, md5: md5(b),
    magica: b.subarray(0, 8).toString('latin1'),
    content_type: r.headers.get('content-type') || '',
    eh_pdf: b.subarray(0, 5).toString('latin1') === '%PDF-',
    comecabytes_html: /^<!doctype html/i.test(b.subarray(0, 40).toString('latin1')),
  };
}

const no_ar = {};
for (const f of FICHEIROS) no_ar[f] = await colher(`/${f}`);
const shell = await colher('/');

const em_disco = {};
for (const f of FICHEIROS) {
  const p = `${BUNDLE}/public/${f}`;
  const b = fs.readFileSync(p);
  em_disco[f] = { bytes: b.length, md5: md5(b), magica: b.subarray(0, 8).toString('latin1') };
}

const CAND = 'bfr-candidata-v122-horarios-pdf';
const candidatas = {};
for (const f of ['horario-matutino-2026.pdf', 'horario-vespertino-2026.pdf']) {
  const b = fs.readFileSync(`${CAND}/${f}`);
  candidatas[f] = { bytes: b.length, md5: md5(b), magica: b.subarray(0, 8).toString('latin1'), eh_pdf: b.subarray(0, 5).toString('latin1') === '%PDF-' };
}

const portoes = [];
const P = (id, ok, medido) => portoes.push({ id, ok: !!ok, medido });

P('url_derivado_do_diario', true, url_base);
P('ar_matutino_igual_ar_vespertino_defeito_presente_no_ar', no_ar['horario-matutino-2026.pdf'].md5 === no_ar['horario-vespertino-2026.pdf'].md5,
  { matutino: no_ar['horario-matutino-2026.pdf'].md5, vespertino: no_ar['horario-vespertino-2026.pdf'].md5 });
P('ar_horarios_nao_sao_pdf_magica', !no_ar['horario-matutino-2026.pdf'].eh_pdf && !no_ar['horario-vespertino-2026.pdf'].eh_pdf,
  { matutino: no_ar['horario-matutino-2026.pdf'].magica, vespertino: no_ar['horario-vespertino-2026.pdf'].magica });
P('ar_horarios_devolvidos_com_content_type_pdf', /application\/pdf/i.test(no_ar['horario-matutino-2026.pdf'].content_type) && /application\/pdf/i.test(no_ar['horario-vespertino-2026.pdf'].content_type),
  { matutino: no_ar['horario-matutino-2026.pdf'].content_type, vespertino: no_ar['horario-vespertino-2026.pdf'].content_type });
P('pseudo_pdf_diferente_do_shell_servido_ate_bytes', no_ar['horario-matutino-2026.pdf'].md5 !== shell.md5,
  { pseudo: no_ar['horario-matutino-2026.pdf'].bytes, shell: shell.bytes });
P('pseudo_pdf_sem_doctype_e_shell_com_doctype', !no_ar['horario-matutino-2026.pdf'].comecabytes_html && shell.comecabytes_html,
  { pseudo_comeca_por: no_ar['horario-matutino-2026.pdf'].magica, shell_comeca_por: shell.magica });
P('ar_igual_disco_ate_bytes_12_assets', FICHEIROS.every(f => no_ar[f].md5 === em_disco[f].md5 && no_ar[f].bytes === em_disco[f].bytes),
  FICHEIROS.map(f => ({ f, ar: no_ar[f].md5.slice(0, 8), disco: em_disco[f].md5.slice(0, 8), igual: no_ar[f].md5 === em_disco[f].md5 })));
P('candidatas_sao_pdf_validos_distintos', candidatas['horario-matutino-2026.pdf'].eh_pdf && candidatas['horario-vespertino-2026.pdf'].eh_pdf &&
  candidatas['horario-matutino-2026.pdf'].md5 !== candidatas['horario-vespertino-2026.pdf'].md5, candidatas);
P('candidatas_diferem_do_estado_publicado', !FICHEIROS.slice(0, 2).some(f => candidatas[f].md5 === no_ar[f].md5),
  FICHEIROS.slice(0, 2).map(f => ({ f, publicado: no_ar[f].md5, candidata: candidatas[f].md5 })));
P('calendario_e_pdf_valido_e_fica_intacto', no_ar['calendario-letivo-2026.pdf'].eh_pdf &&
  no_ar['calendario-letivo-2026.pdf'].md5 === em_disco['calendario-letivo-2026.pdf'].md5,
  { md5: no_ar['calendario-letivo-2026.pdf'].md5, bytes: no_ar['calendario-letivo-2026.pdf'].bytes });
P('pngs_distintos_e_fora_do_alcance', no_ar['horario-matutino-2026.png'].md5 !== no_ar['horario-vespertino-2026.png'].md5,
  { matutino: no_ar['horario-matutino-2026.png'].md5, vespertino: no_ar['horario-vespertino-2026.png'].md5 });
const shell_esperado = JSON.parse(fs.readFileSync(DIARIO_URL, 'utf8')).A1_shell.md5;
P('shell_do_ar_bate_com_o_diario_v122', shell.md5 === shell_esperado, { medido: shell.md5, esperado_no_diario: shell_esperado, bytes: shell.bytes });

const falhas = portoes.filter(p => !p.ok);
const diário = {
  em: new Date().toISOString(), ciclo: 'pdf-hor-1-preflight', escrita: 'somente o diário argv[2]',
  ddl: 0, mint: 0, deploy: 0, url_base, bundle_medido: BUNDLE,
  no_ar, em_disco, candidatas, portoes: { total: portoes.length, falhas: falhas.length }, detalhe: portoes,
  veredito: falhas.length === 0 ? 'PREFLIGHT_PDF_HOR_OK' : 'PREFLIGHT_PDF_HOR_VERMELHO',
};
fs.writeFileSync(SAIDA, JSON.stringify(diário, null, 2));
console.log(`url=${url_base}`);
for (const p of portoes) console.log(`${p.ok ? 'verde  ' : 'VERMELHO'} ${p.id}`);
console.log(`portoes ${portoes.length} falhas ${falhas.length} — ${diário.veredito}`);
