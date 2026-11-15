// RM-1.5 POS-V122 — sonda somente-leitura da cadeia de push no ar, re-emitida DEPOIS de publicar a
// v122. Nao substitui nem sobrescreve o artefacto de 12/11 (evidence/rm13-rotas.json), que e a regia
// do "antes": este script escreve um ficheiro novo e so compara contra o diario da publicacao
// (audit-publicacao-v122.json), nunca contra numeros dactilografados.
// Porque o rm13-sonda-rotas.mjs nao foi rerodado: os portoes R4/R6/M3 desse script esperam a rota
// FCM a dar 200 e a pagina de excecao da Cloudflare, ou seja, codificam a hipotese anterior ao
// RM-6.9 (publicado 14/11) e a decisao PEN-34 = (a) deixar 404. Rerodá-lo daria vermelhos que nao
// sao defeitos. Aqui as mesmas rotas sao MEDIDAS e so os portoes da parcela RM-1.5 sao portoes.
// 0 escrita, 0 DDL, 0 mint, 0 deploy, 0 git.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]+$/, '');
const DIARIO = JSON.parse(readFileSync(`${dir}/audit-publicacao-v122.json`, 'utf8'));
const AR = DIARIO.deploy.url;                          // unica fonte da URL
const noCache = { headers: { 'cache-control': 'no-cache' } };
const md5 = b => createHash('md5').update(b).digest('hex');
const regua = s => { const m = /([0-9a-f]{32})\s*\(\s*(\d+)\s*B\b/.exec(String(s || '')); return m ? { md5: m[1], bytes: +m[2] } : null; };
const swEsperado = regua(DIARIO.md5.sw_depois);
const shellEsperada = regua(DIARIO.md5.shell_depois);
const corpo404 = regua(DIARIO.md5.corpo_do_404);
const etiquetaCache = (/CACHE\s+(bfr-conecta-v\d+)/.exec(DIARIO.md5.sw_depois) || [])[1];


const out = {
  ciclo: 'RM15-POS-V122', em: new Date().toISOString(), ar: AR,
  origem_das_reguas: 'audit-publicacao-v122.json (deploy.url, md5.sw_depois, md5.shell_depois, md5.corpo_do_404)',
  escrita: 0, ddl: 0, mint: 0, deploy: 0,
  metodo: 'fetch com cache-control: no-cache e URL de cache-bust; md5 dos BYTES; texto lido so quando o content-type anuncia texto',
  portoes: {},
};
let ok = 0, falha = 0;
function G(nome, esperado, valor) {
  const passou = JSON.stringify(valor) === JSON.stringify(esperado);
  out.portoes[nome] = { esperado, valor, passou };
  passou ? ok++ : falha++;
  return passou;
}
async function pega(caminho) {
  const r = await fetch(AR + caminho, noCache);
  const b = Buffer.from(await r.arrayBuffer());
  const ct = String(r.headers.get('content-type') || '');
  return { http: r.status, ct, bytes: b.length, md5: md5(b),
    texto: /text|json|javascript|xml/i.test(ct) ? b.toString('utf8') : '' };
}
const cont = (s, re) => (s.match(re) || []).length;
// ARTEFACTO MEDIDO 15/11: o SW servido traz um COMENTARIO que diz "sem importScripts (a CSP
// worker-src...". A regex frouxa sobre o texto cru casa o comentario e devolve 1 — foi o unico
// vermelho da primeira corrida, e era falso. A contagem de CHAMADA passa a correr sobre o texto
// sem comentarios, que e a regua do preflight D3e (procura a literal 'importScripts(') e da prova
// de cliente. O esperado continua 0; o que mudou foi a medida, nao a exigencia. A palavra crua
// continua medida e gravada, para o numero nao parecer limpo por magia.
const semComentarios = t => String(t).replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

// 1) O SW que o shell registra — a parcela que a v122 veio reparar.
const sw = await pega('/sw-v4.js?v=' + Date.now());
out.sw_servido = { http: sw.http, bytes: sw.bytes, md5: sw.md5, ct: sw.ct,
  cache: [...new Set(sw.texto.match(/bfr-conecta-v\d+/g) || [])],
  handler_push: cont(sw.texto, /addEventListener\(\s*['"]push['"]/g),
  notificationclick: cont(sw.texto, /addEventListener\(\s*['"]notificationclick['"]/g),
  showNotification: cont(sw.texto, /showNotification\s*\(/g),
  openWindow: cont(sw.texto, /clients\.openWindow\s*\(/g),
  importScripts_chamada: cont(semComentarios(sw.texto), /importScripts\s*\(/g),
  importScripts_palavra_texto_cru: cont(sw.texto, /importScripts/g),
  importScripts_chamada_texto_cru: cont(sw.texto, /importScripts\s*\(/g),
  listeners: [...new Set(sw.texto.match(/addEventListener\(\s*['"]\w+['"]/g) || [])] };
G('S1_sw_tem_ouvinte_push', 1, out.sw_servido.handler_push);
G('S2_sw_tem_ouvinte_notificationclick', 1, out.sw_servido.notificationclick);
G('S3_sw_chama_showNotification', 1, out.sw_servido.showNotification);
G('S4_sw_chama_clients_openWindow', 1, out.sw_servido.openWindow);
G('S5_sw_sem_chamada_importScripts', 0, out.sw_servido.importScripts_chamada);
G('S6_sw_etiqueta_cache_igual_a_do_diario', [etiquetaCache], out.sw_servido.cache);
G('S7_sw_do_ar_igual_ao_publicado_no_diario', { md5: swEsperado.md5, bytes: swEsperado.bytes },
  { md5: sw.md5, bytes: sw.bytes });

// 2) O recetor e mesmo aquele que o shell registra: o caminho registrado tem de ser o /sw-v4.js
//    medido acima, e o getToken continua a existir nos dois lados da cadeia.
const shell = await pega('/?v=' + Date.now());
out.shell_servida = { http: shell.http, bytes: shell.bytes, md5: shell.md5,
  registracoes_sw_v4: cont(shell.texto, /serviceWorker\.register\(\s*[`'"][^`'"]*\/sw-v4\.js/g),
  registracoes_fcm: cont(shell.texto, /serviceWorker\.register\(\s*[`'"][^`'"]*firebase-messaging-sw/g),
  getToken: cont(shell.texto, /\bmessaging\.getToken\s*\(|\bgetToken\s*\(/g),
  palavra_firebase_messaging_sw: cont(shell.texto, /firebase-messaging-sw/gi) };
G('M1_shell_do_ar_igual_ao_diario', { md5: shellEsperada.md5, bytes: shellEsperada.bytes },
  { md5: shell.md5, bytes: shell.bytes });
G('M2_shell_registra_o_sw_medido', 1, out.shell_servida.registracoes_sw_v4 >= 1 ? 1 : 0);
G('M3_shell_nao_registra_sw_de_fcm', 0, out.shell_servida.registracoes_fcm);
G('M4_o_shell_ainda_pedir_token_de_push', 1, out.shell_servida.getToken >= 1 ? 1 : 0);

// 3) Regressao: o RM-6.9 (404 no lugar do 500) e a decisao PEN-34 = (a) continuam validos.
const rota404 = await pega('/qualquer-rota-inexistente-zz');
const fcm = await pega('/firebase-messaging-sw.js');
out.regressao = {
  rota_inexistente: { http: rota404.http, bytes: rota404.bytes, md5: rota404.md5, ct: rota404.ct },
  firebase_messaging_sw: { http: fcm.http, bytes: fcm.bytes, md5: fcm.md5, ct: fcm.ct },
  pagina_de_excecao_cf: /Worker threw exception|Error 1101|cloudflare/i.test(rota404.texto + fcm.texto),
};
G('R1_rota_fora_do_bundle_continua_404', 404, out.regressao.rota_inexistente.http);
G('R2_corpo_do_404_igual_ao_diario', { md5: corpo404.md5, bytes: corpo404.bytes },
  { md5: out.regressao.rota_inexistente.md5, bytes: out.regressao.rota_inexistente.bytes });
G('R3_rota_fcm_da_404_por_decisao_pen34a', 404, out.regressao.firebase_messaging_sw.http);
G('R4_nenhuma_pagina_de_excecao_da_cloudflare', false, out.regressao.pagina_de_excecao_cf);

// 4) Manifesto: medido, nao portao — a installability fica como esta, a v122 nao mexeu no bundle.
let man = {};
try { man = JSON.parse((await pega('/manifest.json')).texto); } catch (e) { man = { erro: String(e).slice(0, 120) }; }
out.manifest_medido = { icons: (man.icons || []).length, start_url: man.start_url ?? null, scope: man.scope ?? null, display: man.display ?? null };

out.veredito = falha === 0 ? 'RM15_POS_V122_VERDE' : 'RM15_POS_V122_VERMELHO';
out.totais = { portoes: ok + falha, vermelhos: falha };
writeFileSync(`${dir}/evidence/rm15-cadeia-pos-v122.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`${out.veredito} portoes=${out.totais.portoes} vermelhos=${out.totais.vermelhos}`);
for (const [k, v] of Object.entries(out.portoes)) if (!v.passou) console.log('VERMELHO ' + k + '=' + JSON.stringify(v));
process.exit(falha === 0 ? 0 : 1);
