// PDF-HOR-5 — prova SOMENTE LEITURA depois do deploy da v123 (substituicao dos 2 PDFs de horario).
// Camada 1 do par obrigator: o Node mede o WORKER. A camada 2 (Chrome com SW a controlar) e outra.
// Todas as réguas sao DERIVADAS de diarios/esperados em disco, nunca dactilografadas.
// 0 DDL, 0 escrita em banco, 0 mint, 0 deploy.
import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/pcmac/Documents/Qoder/2026-10-13/28077d9a/bfr-conecta';
const ESP = `${dir}/worker-deploy-v123-pdfs/esperado-v123.json`;
const BUNDLE = `${dir}/worker-deploy-v123-pdfs`;
const DIARIO_PRESIDIO = `${dir}/evidence/pdf-hor-3-preflight-v123-15-11.json`;
const DIARIO_V121 = `${dir}/audit-publicacao-v121.json`;
const OUT = `${dir}/evidence/pdf-hor-5-pos-deploy-v123-15-11.json`;

const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const bytes = s => Buffer.byteLength(s);
const read = p => fs.readFileSync(p, 'utf8');
const count = (s, t) => (t === '' ? -1 : s.split(t).length - 1);

const esp = JSON.parse(read(ESP));
const presidio = JSON.parse(read(DIARIO_PRESIDIO));
const d121 = JSON.parse(read(DIARIO_V121));

const URL_AR = presidio.ar_antes?.url;
if (typeof URL_AR !== 'string' || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/.test(URL_AR)) {
  console.error(`ABORTO: URL derivada invalida: ${JSON.stringify(URL_AR)}`); process.exit(1);
}
// a URL tem de ser UMA so: o diario do presidio e o diario do deploy da v122 teem de bater
const urlV122 = JSON.parse(read(`${dir}/${presidio.origem}`)).reguas?.url;
if (urlV122 !== URL_AR) { console.error(`ABORTO: duas URLs na prova: ${JSON.stringify(URL_AR)} x ${JSON.stringify(urlV122)}`); process.exit(1); }
const reguaShellAr = presidio.ar_antes.shell;
const fake = esp.miudoFalso;
if (!/^[0-9a-f]{32}$/.test(String(fake.md5))) { console.error('ABORTO: regua do miudo falso invalida'); process.exit(1); }
const rotas404 = Object.entries(d121.medicao.ar_depois.rotas)
  .filter(([, v]) => v.http === 404).map(([k, v]) => ({ caminho: k, ...v }));
if (rotas404.length < 5) { console.error(`ABORTO: rotas 404 derivadas = ${rotas404.length}`); process.exit(1); }
const corpo404 = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B/.exec(String(d121.md5['corpo_do_404']));
if (!corpo404) { console.error('ABORTO: regua do corpo do 404 nao lida'); process.exit(1); }
const sub = Object.fromEntries(esp.substituidos.map(s => [s.arquivo, s]));
const calendario = JSON.parse(read(`${dir}/evidence/pdf-hor-sonda-15-11.json`)).alvos.ar_calendario;

async function get(caminho) {
  const res = await fetch(URL_AR + caminho, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const buf = Buffer.from(await res.arrayBuffer());
  const texto = buf.toString('latin1');
  return {
    caminho, http: res.status, bytes: buf.length, md5: md5(buf),
    magica: texto.slice(0, 8), content_type: res.headers.get('content-type'),
    cache_status: res.headers.get('cf-cache-status'), csp: !!res.headers.get('content-security-policy'),
    paginas: count(texto, '/Type /Page') - count(texto, '/Type /Pages'), imagens: count(texto, '/Subtype /Image'),
    buf,
  };
}

const out = {
  ciclo: 'PDF-HOR-5-POS-DEPLOY', em: new Date().toISOString(), escrita: 0, ddl: 0, mint: 0, deploy: 0,
  reguas: {
    origem: ['worker-deploy-v123-pdfs/esperado-v123.json', 'evidence/pdf-hor-3-preflight-v123-15-11.json',
      'audit-publicacao-v121.json', 'evidence/pdf-hor-sonda-15-11.json'],
    url: URL_AR, miudo_falso: fake, calendario_esperado: { md5: calendario.md5, bytes: calendario.bytes },
    shell_antes: { md5: reguaShellAr.md5, bytes: reguaShellAr.bytes },
    substituidos: esp.substituidos, versao_deploy: null,
  },
};
const deployTxt = fs.existsSync(`${dir}/evidence/pdf-hor-4-deploy-v123-stdout-15-11.txt`)
  ? read(`${dir}/evidence/pdf-hor-4-deploy-v123-stdout-15-11.txt`) : '';
out.reguas.versao_deploy = (/Current Version ID:\s*([0-9a-f-]{36})/.exec(deployTxt) || [])[1] || null;

const falhas = [];
const portoes = {};
const gate = (id, ok, dados) => { portoes[id] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(id); };

// ---------- R1 shell ----------
const shell = await get('/');
out.shell = { ...shell, buf: undefined };
gate('R1_shell_inalterada_v122', shell.http === 200 && shell.md5 === esp.htmlMd5 && shell.bytes === esp.htmlBytes
  && shell.md5 === reguaShellAr.md5 && shell.bytes === reguaShellAr.bytes && shell.csp,
  { medido: { http: shell.http, md5: shell.md5, bytes: shell.bytes, csp: shell.csp }, esperado: { md5: esp.htmlMd5, bytes: esp.htmlBytes }, ar_antes: reguaShellAr });

// ---------- R2 SW servido ----------
const sw = await get('/sw-v4.js?v=45');
out.sw = { ...sw, buf: undefined };
gate('R2_sw_no_ar_e_o_v123', sw.http === 200 && sw.md5 === esp.swMd5 && sw.bytes === esp.swBytes,
  { medido: { http: sw.http, md5: sw.md5, bytes: sw.bytes }, esperado: { md5: esp.swMd5, bytes: esp.swBytes } });
const textoSw = sw.buf.toString('utf8');
gate('R2b_sw_so_com_a_etiqueta_nova', count(textoSw, `CACHE = '${esp.cacheLabel}'`) === 1
  && count(textoSw, 'bfr-conecta-v122') === 0
  && (textoSw.match(/bfr-conecta-v\d+/g) || []).every(t => t === esp.cacheLabel || t === 'bfr-conecta-'),
  { rotulos: [...new Set(textoSw.match(/bfr-conecta-v\d+/g) || [])], etiqueta_esperada: esp.cacheLabel });
gate('R2c_sw_mantem_os_ouvintes_push', count(textoSw, "addEventListener('push'") === 1
  && count(textoSw, "addEventListener('notificationclick'") === 1 && count(textoSw, 'showNotification(') === 1
  && count(textoSw, 'importScripts(') === 0,
  { push: count(textoSw, "addEventListener('push'"), nc: count(textoSw, "addEventListener('notificationclick'"), show: count(textoSw, 'showNotification('), importScripts: count(textoSw, 'importScripts(') });

// ---------- R3 os caminhos .pdf que a shell realmente pede ----------
// NOTA do instrumento: a shell contem tokens ".pdf" que sao codigo (saved.pdf, form.elements.pdf)
// e nomes de ficheiros que nunca entraram no bundle (aee-*.pdf). Nao sao alvos: o que se prova
// aqui e que os tres ficheiros medidos sao pedidos pelo caminho nu, sem ?v= (senao a caché do
// cliente nao seria a mesma chave).
const textoHtml = shell.buf.toString('latin1');
const tokensPdf = [...new Set(textoHtml.match(/[A-Za-z0-9_./-]*\.pdf/g) || [])];
const nomesTrocados = esp.substituidos.map(s => s.arquivo);
const nomeCalendario = calendario.caminho.split(/[\\/]/).pop();
out.caminhos_pdf_na_shell = tokensPdf;
const alvos = [...nomesTrocados, nomeCalendario].map(n => '/' + n);
gate('R3_a_shell_pedem_os_tres_ficheiros_pelo_caminho_nu',
  [...nomesTrocados, nomeCalendario].every(n => tokensPdf.includes(n) && !new RegExp(n.replace(/\./g, '\\.') + '\\?').test(textoHtml)),
  { procurados: [...nomesTrocados, nomeCalendario], alvos, tokens_pdf: tokensPdf.length });

// ---------- R4/R5/R8 os PDFs no ar, no caminho EXATO que a shell pede ----------
const medidos = [];
let tentativa = 0;
for (;;) {
  tentativa++;
  medidos.length = 0;
  for (const p of alvos) medidos.push(await get(p));
  const prontos = esp.substituidos.every(s => medidos.some(m => m.caminho.split('?')[0].replace(/^\//, '') === s.arquivo && /^\%PDF-1\./.test(m.magica) && m.md5 === s.md5Novo));
  if (prontos || tentativa >= 5) break;
  await new Promise(r => setTimeout(r, 3000));
}
out.tentativas_de_propagacao = tentativa;
out.pdfs_no_ar = medidos.map(m => ({ ...m, buf: undefined }));
esp.substituidos.forEach((s, i) => {
  const m = medidos.find(x => x.caminho.split('?')[0].replace(/^\//, '') === s.arquivo);
  const id = `R${4 + i}_${s.arquivo.replace(/\.pdf$/, '')}_no_ar_e_pdf_valido`;
  gate(id, !!m && m.http === 200 && /^%PDF-1\./.test(m.magica) && m.md5 === s.md5Novo && m.bytes === s.bytesNovo
    && /application\/pdf/i.test(String(m.content_type)) && m.md5 !== fake.md5 && m.paginas >= 1 && m.imagens >= 1,
    { medido: m && { caminho: m.caminho, http: m.http, bytes: m.bytes, md5: m.md5, magica: m.magica, content_type: m.content_type, paginas: m.paginas, imagens: m.imagens }, esperado: s });
});
const mat = medidos.find(m => m.caminho.includes('matutino'));
const ves = medidos.find(m => m.caminho.includes('vespertino'));
gate('R6_matutino_diferente_do_vespertino', !!mat && !!ves && mat.md5 !== ves.md5 && mat.bytes !== ves.bytes,
  { matutino: mat && { md5: mat.md5, bytes: mat.bytes }, vespertino: ves && { md5: ves.md5, bytes: ves.bytes } });
gate('R7_nenhum_pdf_do_ar_e_o_miudo_falso', medidos.every(m => m.md5 !== fake.md5 && !/^<html/i.test(m.magica)),
  { miudo_falso: fake, medidos: medidos.map(m => ({ caminho: m.caminho, md5: m.md5, magica: m.magica })) });
const cal = medidos.find(m => m.caminho.includes('calendario'));
gate('R8_calendario_inalterado_e_pdf_real', !!cal && cal.md5 === calendario.md5 && cal.bytes === calendario.bytes && /^\%PDF-1\./.test(cal.magica),
  cal && { md5: cal.md5, bytes: cal.bytes, magica: cal.magica, esperado: { md5: calendario.md5, bytes: calendario.bytes } });

// ---------- R9 ar == disco do bundle, para todos os assets ----------
const disco = esp.assets.map(a => ({ arquivo: a.arquivo, md5_disco: a.md5, bytes_disco: a.bytes, md5_ar: null, bytes_ar: null, http: null }));
for (const d of disco) {
  const m = await get('/' + d.arquivo);
  d.md5_ar = m.md5; d.bytes_ar = m.bytes; d.http = m.http;
}
out.assets_ar_vs_disco = disco;
gate('R9_ar_byte_identico_ao_disco_do_bundle', disco.every(d => d.http === 200 && d.md5_ar === d.md5_disco && d.bytes_ar === d.bytes_disco),
  { total: disco.length, desvios: disco.filter(d => d.md5_ar !== d.md5_disco || d.bytes_ar !== d.bytes_disco).map(d => `${d.arquivo} ar=${d.md5_ar}/${d.bytes_ar} disco=${d.md5_disco}/${d.bytes_disco}`) });

// ---------- R10 regressao dos 404 ----------
const m404 = [];
for (const r of rotas404) {
  const res = await fetch(URL_AR + r.caminho, { headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
  const t = Buffer.from(await res.arrayBuffer());
  m404.push({ caminho: r.caminho, http: res.status, bytes: t.length, md5: md5(t) });
}
out.regressao_404 = m404;
gate('R10_regressao_dos_404', m404.length === rotas404.length && m404.every(m =>
  m.http === 404 && m.md5 === corpo404[1] && m.bytes === +corpo404[2]),
  { total: m404.length, regua: { md5: corpo404[1], bytes: +corpo404[2] }, desvios: m404.filter(m => m.http !== 404).map(m => `${m.caminho}=${m.http}`) });

// ---------- R11 o miudo falso nao sobrevive em lado nenhum do ar medido ----------
gate('R11_miudo_falso_nao_aparece_em_nada_do_que_foi_medido',
  [shell, sw, ...medidos, ...disco.map(d => ({ md5: d.md5_ar }))].every(x => x.md5 !== fake.md5),
  { medidos: 2 + medidos.length + disco.length, miudo_falso: fake.md5 });

// ---------- R12 linhagem da reversao continua em disco ----------
const reversa = fs.readFileSync(`${BUNDLE}/sw-v122-embed.js`);
const swV122 = JSON.parse(read(`${dir}/worker-deploy-v122-push/esperado-v122.json`));
gate('R12_sw_v122_de_reversao_continua_em_disco', md5(reversa) === swV122.swMd5 && reversa.length === swV122.swBytes,
  { reversa: { md5: md5(reversa), bytes: reversa.length }, regua_v122: { md5: swV122.swMd5, bytes: swV122.swBytes } });

out.portoes = Object.keys(portoes).length;
out.vermelhos = falhas.length;
out.falhas = falhas;
out.veredito = falhas.length === 0 ? 'PDF_HOR_5_PROVA_OK' : 'PDF_HOR_5_PROVA_FALHA';
fs.writeFileSync(OUT, JSON.stringify({ ...out, shell: out.shell, sw: { http: out.sw.http, bytes: out.sw.bytes, md5: out.sw.md5, magica: out.sw.magica, content_type: out.sw.content_type } }, null, 2), 'utf8');
for (const [k, v] of Object.entries(portoes)) console.log(`${v.passou ? 'OK  ' : 'RED '} ${k}${v.passou ? '' : ' ' + JSON.stringify(v).slice(0, 400)}`);
console.log(`\nveredito=${out.veredito} portoes=${out.portoes} vermelhos=${out.vermelhos} tentativas=${tentativa} versao=${out.reguas.versao_deploy}`);
console.log(`matutino_ar=${mat && mat.bytes}B ${mat && mat.md5} ${mat && mat.magica} | vespertino_ar=${ves && ves.bytes}B ${ves && ves.md5} ${ves && ves.magica}`);
console.log(`sw_ar=${sw.bytes}B ${sw.md5} rotulos=${JSON.stringify([...new Set(textoSw.match(/bfr-conecta-v\d+/g) || [])])}`);
console.log(`diario=${OUT}`);
process.exit(falhas.length ? 1 : 0);
