// PDF-HOR-7 — prova do lado do cliente (Chrome real, com o SW a controlar o caminho).
// Lê os artefactos gravados pelo browser-use e confere-os contra o disco e contra o
// diário da camada 1. Não escreve em lado nenhum: só medição.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(dir, p), 'utf8');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const count = (s, sub) => s.split(sub).length - 1;
// O browser-use grava o resultado como uma string JSON: é preciso descascar duas camadas.
const pag = p => JSON.parse(JSON.parse(read(p)));

const esp = JSON.parse(read('worker-deploy-v123-pdfs/esperado-v123.json'));
const camada1 = JSON.parse(read('evidence/pdf-hor-5-pos-deploy-v123-15-11.json'));
const A = pag('evidence/pdf-hor-6-cliente-A.json');
const ANTES = pag('evidence/pdf-hor-6-cliente-antes.json');
const B = pag('evidence/pdf-hor-6-cliente-B.json');
const C = pag('evidence/pdf-hor-6-cliente-C.json');
const D = pag('evidence/pdf-hor-6-cliente-D.json');

const URL_AR = camada1.reguas?.url;
if (typeof URL_AR !== 'string' || !URL_AR.endsWith('.workers.dev')) {
  console.error('ABORTO: URL derivada invalida do diario da camada 1: ' + JSON.stringify(URL_AR));
  process.exit(1);
}
const ROTULO = esp.cacheLabel;
const ALVOS = [...esp.substituidos.map(s => s.arquivo), 'calendario-letivo-2026.pdf'];

// Reguas de disco (sha256): a pagina mediu sha256, a camada 1 mediu md5 — duas funcoes, o mesmo corpo.
const disco = {};
for (const a of ALVOS) {
  const buf = fs.readFileSync(path.join(dir, 'worker-deploy-v123-pdfs/public', a));
  disco[a] = { bytes: buf.length, md5: md5(buf), sha256: sha256(buf) };
}

// Sonda propria ao corpo do SW: explica bytes vs caracteres e conta rotulos sem depender da pagina.
const resSw = await fetch(URL_AR + '/sw-v4.js?v=45');
const bufSw = Buffer.from(await resSw.arrayBuffer());
const txtSw = bufSw.toString('utf8');
const naoAscii = (txtSw.match(/[^\x00-\x7F]/g) || []).length;

const out = {
  ciclo: 'PDF-HOR-7-PROVA-CLIENTE', em: new Date().toISOString(),
  escrita: 0, ddl: 0, mint: 0, deploy: 0, camada: 'navegador com SW a controlar',
  reguas: {
    origem: ['worker-deploy-v123-pdfs/esperado-v123.json', 'evidence/pdf-hor-5-pos-deploy-v123-15-11.json',
      'worker-deploy-v123-pdfs/public (sha256)'],
    url: URL_AR, rotulo_esperado: ROTULO, versao_camada1: camada1.reguas?.versao_deploy,
    miudo_falso: esp.miudoFalso, disco,
    sw_ar: { http: resSw.status, bytes: bufSw.length, chars: txtSw.length, nao_ascii: naoAscii,
      md5: md5(bufSw), rotulo: ROTULO, tem_v122: txtSw.includes('bfr-conecta-v122') },
  },
  pagina: {
    antes: A, depois: B, conteudo: C, script: D.sw,
    cache_antes_keys: A.cacheKeys, cache_depois_keys: B.cacheKeys,
  },
};

const falhas = [];
const portoes = {};
const gate = (id, ok, dados) => { portoes[id] = { passou: !!ok, ...(dados || {}) }; if (!ok) falhas.push(id); };

const semV122 = keys => Array.isArray(keys) && !keys.includes('bfr-conecta-v122');

// C1 — a pagina que mediou e a que a camada 1 mediu sao o mesmo sitio.
gate('C1_a_pagina_e_o_mesmo_ar_da_camada_1',
  !!B.controller && new URL(B.controller.url).origin === new URL(URL_AR).origin,
  { controller: B.controller?.url || null, url: URL_AR });

// C2 — o script do SW que o ar serve hoje ja declara o rotulo novo e nao menciona o velho.
gate('C2_script_do_sw_declara_o_rotulo_novo',
  D.sw?.http === 200 && D.sw?.rotulo === ROTULO && D.sw?.tem_v122 === false
  && count(txtSw, ROTULO) >= 1 && count(txtSw, 'bfr-conecta-v122') === 0,
  { rotulo_pagina: D.sw?.rotulo, v122_no_pagina: D.sw?.tem_v122,
    rotulo_no_corpo_node: count(txtSw, ROTULO), v122_no_corpo_node: count(txtSw, 'bfr-conecta-v122') });

// C3 — o corpo do SW do ar e byte a byte o da camada 1 (md5) e o tamanho bate certo com a regua.
gate('C3_corpo_do_sw_igual_a_regra',
  md5(bufSw) === esp.swMd5 && bufSw.length === esp.swBytes && md5(bufSw) === camada1.sw?.md5,
  { md5: md5(bufSw), esperado: esp.swMd5, bytes: bufSw.length, camada1: camada1.sw?.md5 });

// C4 — havia v122 em cima, ficou so o rotulo novo: a limpeza do install/activate aconteceu no cliente.
gate('C4_cache_antiga_evictada',
  A.cacheKeys.includes('bfr-conecta-v122') && semV122(B.cacheKeys) && semV122(D.cacheKeys)
  && B.cacheKeys.length === 1 && B.cacheKeys[0] === ROTULO && D.cacheKeys[0] === ROTULO,
  { antes: A.cacheKeys, depois_b: B.cacheKeys, depois_d: D.cacheKeys });

// C5 — a atualizacao assentou sozinha: sem waiting nem installing pendurados.
gate('C5_atualizacao_assentou',
  B.waiting === null && B.installing === null && B.active?.state === 'activated'
  && B.controller?.state === 'activated',
  { active: B.active, waiting: B.waiting, installing: B.installing, controlador: B.controller?.state });

// C6 — os tres ficheiros pedidos pela pagina, com o SW no caminho, sao PDFs de verdade.
const c6 = C.medidos.map(m => ({ caminho: m.caminho, http: m.http, magica: m.magica, ct: m.ct }));
gate('C6_os_tres_pedidos_pelo_sw_sao_pdf_validos',
  ALVOS.every(a => { const m = C.medidos.find(x => x.caminho === '/' + a);
    return m && m.http === 200 && /^%PDF-1\./.test(m.magica) && /application\/pdf/i.test(String(m.ct)); }), c6);

// C7 — o sha256 medido no navegador bate com o sha256 do disco (outro hash, o mesmo corpo).
gate('C7_sha256_do_ar_igual_ao_disco',
  ALVOS.every(a => { const m = C.medidos.find(x => x.caminho === '/' + a);
    return m && m.sha256 === disco[a].sha256; }),
  ALVOS.map(a => ({ arquivo: a, ar: C.medidos.find(x => x.caminho === '/' + a)?.sha256, disco: disco[a].sha256 })));

// C8 — os bytes medidos no cliente sao os da regua (tamanho de cada candidato).
gate('C8_bytes_do_cliente_iguais_a_regra',
  ALVOS.every(a => C.medidos.find(x => x.caminho === '/' + a)?.bytes === disco[a].bytes),
  ALVOS.map(a => ({ arquivo: a, cliente: C.medidos.find(x => x.caminho === '/' + a)?.bytes, disco: disco[a].bytes })));

// C9 — nenhum corpo medido pelo cliente e o miudo falso (tamanho ou magia de HTML).
const todos = [...ANTES.medidos, ...C.medidos];
gate('C9_miudo_falso_ausente_do_cliente',
  todos.every(m => m.bytes !== esp.miudoFalso.bytes && !/^<html/i.test(m.magica)),
  { medidos: todos.length, falso_bytes: esp.miudoFalso.bytes });

// C10 — o que fica na cache do cliente (o que uma recarga offline serviria) e o PDF certo.
const naCache = D.emCache?.[ROTULO];
gate('C10_cache_do_cliente_tem_os_tres_pdf_certos',
  !!naCache && ALVOS.every(a => { const i = naCache.alvos.find(x => x.url === '/' + a);
    return i && /^%PDF-1\./.test(i.magica) && i.sha256 === disco[a].sha256 && i.bytes === disco[a].bytes; }),
  naCache ? { total: naCache.total, alvos: naCache.alvos.map(i => i.url + '=' + i.bytes) } : null);

// C11 — censo da cache: nenhum .pdf armazenado falha o teste de magia e o total e o do censo do ANTES.
// Regua do total vem do ANTES (pdf-hor-6-cliente-antes.json): o artefacto A so lista chaves de cache.
const entradas_antes = ANTES.entradasTotais;
gate('C11_zero_pdf_ruim_na_cache_do_cliente',
  !!naCache && naCache.pdfsRuins === 0 && naCache.total === entradas_antes,
  { pdfsRuins: naCache?.pdfsRuins, entradas_antes, entradas_depois: naCache?.total });

// C12 — o script do SW e servido sem cache HTTP: por isso a recarga normal fez a verificacao.
const cc = D.sw?.cabecalhos?.['cache-control'] || '';
gate('C12_sw_servido_sem_cache_http', /no-store/.test(cc), { 'cache-control': cc });

// C13 — o URL com que o shell registra o SW nao mudou entre as duas camadas (?v=45).
// A.controller (antes) vem como string; B.controller (depois) vem como objecto {url,state}.
const url_antes = typeof A.controller === 'string' ? A.controller : A.controller?.url;
const url_depois = typeof B.controller === 'string' ? B.controller : B.controller?.url;
gate('C13_registra_continua_o_mesmo_caminho',
  /\/sw-v4\.js\?v=\d+$/.test(url_depois || '') && /\/sw-v4\.js\?v=\d+$/.test(url_antes || '')
  && url_antes === url_depois,
  { antes: url_antes, depois: url_depois });

out.totais = { portoes: Object.keys(portoes).length,
  vermelhos: falhas.length, falhas,
  notas: {
    porque_o_antes_ja_dava_pdf: 'O ANTES (SW v122 a controlar) tambem ja media os PDFs reais: o '
      + 'handler de fetch e network-first e faz cache.put em todo asset publico. A regua do ANTES '
      + '(cacheKeys=["bfr-conecta-v122"]) e que prova que o bump do rotulo era necessario para '
      + 'limpar a copia falsa de um cliente que nao re-pedisse o ficheiro.',
    bytes_vs_chars: `O ar devolve ${bufSw.length} bytes; a pagina conta ${txtSw.length} caracteres UTF-16 `
      + `do corpo descodificado (${naoAscii} nao-ascii). Nao e divergencia: md5 do buffer bate com a regua (C3).`,
    instrumento: 'Depois da recarga, o separador ficou surdo 60-90 s (evaluate_script, take_screenshot e '
      + 'handle_dialog todos com timeout de 15 s, enquanto list_pages respondia). Causa provavel: arranque '
      + 'do shell de 3,4 MB somado ao clients.navigate() do activate. A medi so assentou quando a pagina '
      + 'voltou a responder - nao ha aqui defeito do SW, ha um instrumento que precisa de esperar.',
  },
};
out.portoes = portoes;
out.veredito = falhas.length === 0 ? 'PDF_HOR_7_CLIENTE_OK' : 'PDF_HOR_7_CLIENTE_VERMELHO';
out.supera = 'evidence/pdf-hor-7-prova-cliente-15-11.json (2 vermelhos eram bug meu: C11 lia A.entradasTotais, '
  + 'que so existe no ANTES, e C13 comparava uma string contra um objecto {url,state})';
fs.writeFileSync(path.join(dir, 'evidence/pdf-hor-7-prova-cliente-v2-15-11.json'), JSON.stringify(out, null, 2));

const m = a => { const x = C.medidos.find(y => y.caminho === '/' + a) || {}; return `${a}=${x.bytes}B ${String(x.sha256).slice(0, 12)}… ${x.magica}`; };
console.log(`veredito=${out.veredito} portoes=${out.totais.portoes} vermelhos=${falhas.length} `
  + `url=${URL_AR} rotulo=${ROTULO} cache_depois=${JSON.stringify(B.cacheKeys)}`);
console.log('cliente_ar: ' + ALVOS.map(m).join(' | '));
console.log(`sw_ar: http=${resSw.status} bytes=${bufSw.length} chars=${txtSw.length} md5=${md5(bufSw)} `
  + `v122_no_corpo=${count(txtSw, 'bfr-conecta-v122')} cache_control="${cc}"`);
if (falhas.length) console.log('FALHAS: ' + falhas.join(', '));
